const express = require('express');
const router = express.Router();
const db = require('../db');
const { requireAuth, requireRole } = require('../middleware/auth');

/**
 * GET /api/shipping
 * Retrieve shipping details
 */
router.get('/', requireAuth, async (req, res) => {
  try {
    let queryText = `
      SELECT 
        s.shippingid,
        s.paymentid,
        s.shippingaddress,
        s.courier,
        s.shippingstatus,
        s.trackingnumber,
        s.dispatchdate,
        s.deliverydate,
        s.estimateddeliverydate,
        p.amount,
        p.paymentdate,
        p.buyerid,
        buyer.name AS buyer_name,
        i.title AS item_title,
        seller.name AS seller_name,
        seller.userid AS sellerid
      FROM shipping s
      JOIN payment p ON s.paymentid = p.paymentid
      JOIN app_user buyer ON p.buyerid = buyer.userid
      JOIN auction a ON p.auctionid = a.auctionid
      JOIN item i ON a.itemid = i.itemid
      JOIN app_user seller ON i.sellerid = seller.userid
    `;

    const params = [];
    if (req.user.role !== 'Admin') {
      params.push(req.user.userid);
      queryText += ` WHERE (p.buyerid = $1 OR i.sellerid = $1) `;
    }

    queryText += ` ORDER BY s.shippingid DESC `;

    const result = await db.query(queryText, params);
    res.json({ shipments: result.rows });
  } catch (err) {
    console.error('Error fetching shipping:', err.message);
    res.status(500).json({ error: 'Failed to retrieve shipping information.' });
  }
});

/**
 * PUT /api/shipping/:id/status
 * Update shipping status (Seller or Admin)
 */
router.put('/:id/status', requireAuth, requireRole(['Seller', 'Admin']), async (req, res) => {
  try {
    const shippingId = Number(req.params.id);
    const { status } = req.body;

    const validStatuses = ['Processing', 'Shipped', 'Delivered'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: `Shipping status must be one of: ${validStatuses.join(', ')}` });
    }

    const shipRes = await db.query(
      `SELECT s.shippingid, i.sellerid 
       FROM shipping s
       JOIN payment p ON s.paymentid = p.paymentid
       JOIN auction a ON p.auctionid = a.auctionid
       JOIN item i ON a.itemid = i.itemid
       WHERE s.shippingid = $1`,
      [shippingId]
    );

    if (shipRes.rows.length === 0) {
      return res.status(404).json({ error: 'Shipping record not found.' });
    }

    if (req.user.role !== 'Admin' && shipRes.rows[0].sellerid !== req.user.userid) {
      return res.status(403).json({ error: 'Not authorized to update shipment for this item.' });
    }

    let updateQuery = `UPDATE shipping SET shippingstatus = $1`;
    const params = [status, shippingId];

    if (status === 'Shipped') {
      updateQuery += `, dispatchdate = CURRENT_DATE`;
    } else if (status === 'Delivered') {
      updateQuery += `, deliverydate = CURRENT_DATE`;
    }
    updateQuery += ` WHERE shippingid = $2 RETURNING *`;

    const updated = await db.query(updateQuery, params);
    res.json({ message: 'Shipping status updated.', shipment: updated.rows[0] });
  } catch (err) {
    console.error('Error updating shipping status:', err.message);
    res.status(400).json({ error: err.message || 'Failed to update shipping status.' });
  }
});

module.exports = router;
