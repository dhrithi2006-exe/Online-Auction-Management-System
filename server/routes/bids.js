const express = require('express');
const router = express.Router();
const db = require('../db');
const { requireAuth } = require('../middleware/auth');

/**
 * POST /api/auctions/:id/bids
 * Place a bid on an active auction with full server-side validation
 */
router.post('/auctions/:id/bids', requireAuth, async (req, res) => {
  try {
    const auctionId = Number(req.params.id);
    const { amount } = req.body;

    if (isNaN(auctionId)) {
      return res.status(400).json({ error: 'Invalid auction ID.' });
    }

    const bidAmount = parseFloat(amount);
    if (isNaN(bidAmount) || bidAmount <= 0) {
      return res.status(400).json({ error: 'Bid amount must be a valid positive number.' });
    }

    // Execute in Serializable Transaction with Retry handling
    const newBid = await db.withTransaction(async (client) => {
      // 1. Fetch auction details with row lock
      const auctionRes = await client.query(
        `SELECT 
          a.auctionid,
          a.auctionstatus,
          a.enddate,
          i.startingprice,
          i.sellerid,
          i.status AS item_status
         FROM auction a
         JOIN item i ON a.itemid = i.itemid
         WHERE a.auctionid = $1
         FOR UPDATE OF a`,
        [auctionId]
      );

      if (auctionRes.rows.length === 0) {
        throw new Error('Auction not found.');
      }

      const auction = auctionRes.rows[0];

      // 2. Validate auction status
      if (auction.auctionstatus !== 'Active') {
        throw new Error(`Bidding closed. Auction status is '${auction.auctionstatus}'.`);
      }

      // 3. Validate end date
      const today = new Date().toISOString().split('T')[0];
      if (auction.enddate < today) {
        throw new Error(`Auction ended on ${auction.enddate}. No further bids accepted.`);
      }

      // 4. Prevent sellers from bidding on their own item
      if (Number(auction.sellerid) === Number(req.user.userid)) {
        throw new Error('Sellers are not permitted to bid on their own listings.');
      }

      // 5. Fetch current highest bid
      const highestRes = await client.query(
        `SELECT MAX(bidamount) AS highest_bid FROM bid WHERE auctionid = $1`,
        [auctionId]
      );

      const highestBid = highestRes.rows[0].highest_bid ? parseFloat(highestRes.rows[0].highest_bid) : null;
      const startingPrice = parseFloat(auction.startingprice);

      if (highestBid !== null) {
        if (bidAmount <= highestBid) {
          throw new Error(`Your bid of $${bidAmount.toFixed(2)} must be strictly higher than the current highest bid of $${highestBid.toFixed(2)}.`);
        }
      } else {
        if (bidAmount < startingPrice) {
          throw new Error(`First bid must be at least the starting price of $${startingPrice.toFixed(2)}.`);
        }
      }

      // 6. Allocate safe BidID
      const nextBidId = await db.getNextId(client, 'bid', 'bidid', 0);

      // 7. Insert the bid record
      const insertRes = await client.query(
        `INSERT INTO bid (bidid, auctionid, bidderid, bidamount, bidtime)
         VALUES ($1, $2, $3, $4, NOW())
         RETURNING bidid, auctionid, bidderid, bidamount, bidtime`,
        [nextBidId, auctionId, req.user.userid, bidAmount]
      );

      return insertRes.rows[0];
    });

    res.status(201).json({
      message: 'Bid placed successfully.',
      bid: newBid,
    });
  } catch (err) {
    console.error('Error placing bid:', err.message);
    res.status(400).json({ error: err.message || 'Failed to place bid.' });
  }
});

/**
 * GET /api/bids/my-bids
 * Get authenticated user's bidding history across auctions
 */
router.get('/my-bids', requireAuth, async (req, res) => {
  try {
    const result = await db.query(
      `SELECT 
        b.bidid,
        b.bidamount,
        b.bidtime,
        a.auctionid,
        a.auctionstatus,
        a.enddate,
        a.winneruserid,
        i.itemid,
        i.title AS item_title,
        i.imageurl,
        high.highest_bid,
        (high.highest_bid = b.bidamount) AS is_highest_bidder
       FROM bid b
       JOIN auction a ON b.auctionid = a.auctionid
       JOIN item i ON a.itemid = i.itemid
       JOIN (
         SELECT auctionid, MAX(bidamount) AS highest_bid
         FROM bid
         GROUP BY auctionid
       ) high ON a.auctionid = high.auctionid
       WHERE b.bidderid = $1
       ORDER BY b.bidtime DESC`,
      [req.user.userid]
    );

    res.json({ bids: result.rows });
  } catch (err) {
    console.error('Error fetching user bids:', err.message);
    res.status(500).json({ error: 'Failed to retrieve your bids.' });
  }
});

module.exports = router;
