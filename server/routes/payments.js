const express = require('express');
const router = express.Router();
const db = require('../db');
const { requireAuth } = require('../middleware/auth');

/**
 * GET /api/payments
 * Retrieve payments.
 * Admin sees all; regular users see payments where they are buyer or item seller.
 */
router.get('/', requireAuth, async (req, res) => {
  try {
    let queryText = `
      SELECT 
        p.paymentid,
        p.auctionid,
        p.buyerid,
        buyer.name AS buyer_name,
        p.amount,
        p.paymentdate,
        p.paymentmethod,
        p.paymentstatus,
        p.transactionreference,
        i.title AS item_title,
        s.shippingid,
        s.courier,
        s.shippingstatus,
        s.trackingnumber
      FROM payment p
      JOIN app_user buyer ON p.buyerid = buyer.userid
      JOIN auction a ON p.auctionid = a.auctionid
      JOIN item i ON a.itemid = i.itemid
    `;

    const params = [];
    if (req.user.role !== 'Admin') {
      params.push(req.user.userid);
      queryText += ` WHERE (p.buyerid = $1 OR i.sellerid = $1) `;
    }

    queryText += ` ORDER BY p.paymentdate DESC, p.paymentid DESC `;

    const result = await db.query(queryText, params);
    res.json({ payments: result.rows });
  } catch (err) {
    console.error('Error fetching payments:', err.message);
    res.status(500).json({ error: 'Failed to retrieve payments.' });
  }
});

/**
 * POST /api/payments
 * Complete a simulated payment for a won auction
 */
router.post('/', requireAuth, async (req, res) => {
  try {
    const { auctionid, paymentmethod, shippingaddress, courier } = req.body;
    const auctionId = Number(auctionid);

    if (isNaN(auctionId) || !paymentmethod || !shippingaddress) {
      return res.status(400).json({ error: 'Auction ID, payment method, and shipping address are required.' });
    }

    const validMethods = ['UPI', 'Credit Card', 'Debit Card', 'Net Banking'];
    if (!validMethods.includes(paymentmethod)) {
      return res.status(400).json({ error: `Payment method must be one of: ${validMethods.join(', ')}` });
    }

    const result = await db.withTransaction(async (client) => {
      // 1. Verify auction and buyer entitlement
      const auctionRes = await client.query(
        `SELECT a.auctionid, a.winneruserid, a.auctionstatus, a.reserveprice, i.title, i.startingprice, b.highest_bid
         FROM auction a
         JOIN item i ON a.itemid = i.itemid
         LEFT JOIN (
           SELECT auctionid, MAX(bidamount) AS highest_bid
           FROM bid
           GROUP BY auctionid
         ) b ON a.auctionid = b.auctionid
         WHERE a.auctionid = $1
         FOR UPDATE OF a`,
        [auctionId]
      );

      if (auctionRes.rows.length === 0) {
        throw new Error('Auction not found.');
      }

      const auction = auctionRes.rows[0];

      // Check if payment already exists
      const payCheck = await client.query('SELECT paymentid FROM payment WHERE auctionid = $1', [auctionId]);
      if (payCheck.rows.length > 0) {
        throw new Error('Payment has already been completed for this auction.');
      }

      // Check user is winner
      if (auction.winneruserid !== req.user.userid && req.user.role !== 'Admin') {
        throw new Error('Only the winning bidder can submit payment for this auction.');
      }

      const paymentAmount = auction.highest_bid ? parseFloat(auction.highest_bid) : parseFloat(auction.startingprice);

      // Allocate Payment ID
      const nextPayId = await db.getNextId(client, 'payment', 'paymentid', 1000);
      const txnRef = `TXN${nextPayId}`;

      const payInsert = await client.query(
        `INSERT INTO payment (paymentid, auctionid, buyerid, amount, paymentdate, paymentmethod, paymentstatus, transactionreference)
         VALUES ($1, $2, $3, $4, CURRENT_DATE, $5, 'Completed', $6)
         RETURNING *`,
        [nextPayId, auctionId, req.user.userid, paymentAmount, paymentmethod, txnRef]
      );

      // Automatically create corresponding shipping entry
      const nextShipId = await db.getNextId(client, 'shipping', 'shippingid', 2000);
      const trackingNum = `TRK${nextShipId}`;
      const courierName = courier || 'BlueDart';

      // Estimated delivery 3 days from today
      const shipInsert = await client.query(
        `INSERT INTO shipping (shippingid, paymentid, shippingaddress, courier, shippingstatus, trackingnumber, dispatchdate, deliverydate, estimateddeliverydate)
         VALUES ($1, $2, $3, $4, 'Processing', $5, CURRENT_DATE, NULL, CURRENT_DATE + 3)
         RETURNING *`,
        [nextShipId, nextPayId, shippingaddress.trim(), courierName, trackingNum]
      );

      return { payment: payInsert.rows[0], shipping: shipInsert.rows[0] };
    });

    res.status(201).json({
      message: 'Simulated payment completed successfully.',
      payment: result.payment,
      shipping: result.shipping,
    });
  } catch (err) {
    console.error('Error submitting payment:', err.message);
    res.status(400).json({ error: err.message || 'Payment submission failed.' });
  }
});

module.exports = router;
