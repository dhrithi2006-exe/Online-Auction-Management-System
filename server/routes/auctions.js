const express = require('express');
const router = express.Router();
const db = require('../db');
const { requireAuth } = require('../middleware/auth');

const formatINR = (n) =>
  '₹' +
  Number(n).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/**
 * GET /api/auctions
 * Browse auctions with search, category, condition, status, price range, and sorting
 */
router.get('/', async (req, res) => {
  try {
    const {
      search,
      categoryid,
      condition,
      status,
      minPrice,
      maxPrice,
      sort = 'newest',
      limit = 50,
      offset = 0,
    } = req.query;

    const conditions = [];
    const params = [];

    if (search) {
      params.push(`%${search.trim()}%`);
      conditions.push(`(i.title ILIKE $${params.length} OR i.description ILIKE $${params.length})`);
    }

    if (categoryid) {
      params.push(Number(categoryid));
      conditions.push(`i.categoryid = $${params.length}`);
    }

    if (condition) {
      params.push(condition);
      conditions.push(`i.itemcondition = $${params.length}`);
    }

    if (status) {
      params.push(status);
      conditions.push(`a.auctionstatus = $${params.length}`);
    }

    if (minPrice !== undefined && minPrice !== '') {
      params.push(parseFloat(minPrice));
      conditions.push(`COALESCE(b.highest_bid, i.startingprice) >= $${params.length}`);
    }

    if (maxPrice !== undefined && maxPrice !== '') {
      params.push(parseFloat(maxPrice));
      conditions.push(`COALESCE(b.highest_bid, i.startingprice) <= $${params.length}`);
    }

    let orderBy = 'a.auctionid DESC';
    if (sort === 'price_asc') {
      orderBy = 'current_price ASC';
    } else if (sort === 'price_desc') {
      orderBy = 'current_price DESC';
    } else if (sort === 'enddate_asc') {
      orderBy = 'a.enddate ASC';
    } else if (sort === 'enddate_desc') {
      orderBy = 'a.enddate DESC';
    } else if (sort === 'bids_desc') {
      orderBy = 'total_bids DESC';
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const queryText = `
      SELECT 
        a.auctionid,
        a.startdate,
        a.enddate,
        a.reserveprice,
        a.auctionstatus,
        a.winneruserid,
        i.itemid,
        i.title,
        i.description,
        i.startingprice,
        i.itemcondition,
        i.imageurl,
        i.status AS item_status,
        c.categoryid,
        c.categoryname,
        u.userid AS sellerid,
        u.name AS seller_name,
        COALESCE(b.highest_bid, i.startingprice) AS current_price,
        b.highest_bid,
        COALESCE(b.total_bids, 0) AS total_bids
      FROM auction a
      JOIN item i ON a.itemid = i.itemid
      JOIN category c ON i.categoryid = c.categoryid
      JOIN app_user u ON i.sellerid = u.userid
      LEFT JOIN (
        SELECT auctionid, MAX(bidamount) AS highest_bid, COUNT(*) AS total_bids
        FROM bid
        GROUP BY auctionid
      ) b ON a.auctionid = b.auctionid
      ${whereClause}
      ORDER BY ${orderBy}
      LIMIT ${Number(limit) || 50} OFFSET ${Number(offset) || 0}
    `;

    const result = await db.query(queryText, params);

    res.json({ auctions: result.rows, total: result.rows.length });
  } catch (err) {
    console.error('Error fetching auctions:', err.message);
    res.status(500).json({ error: 'Failed to retrieve auctions from database.' });
  }
});

/**
 * GET /api/auctions/:id
 * Retrieve single auction with full details
 */
router.get('/:id', async (req, res) => {
  try {
    const auctionId = Number(req.params.id);
    if (isNaN(auctionId)) {
      return res.status(400).json({ error: 'Invalid auction ID.' });
    }

    const queryText = `
      SELECT 
        a.auctionid,
        a.startdate,
        a.enddate,
        a.reserveprice,
        a.auctionstatus,
        a.winneruserid,
        winner.name AS winner_name,
        i.itemid,
        i.title,
        i.description,
        i.startingprice,
        i.itemcondition,
        i.imageurl,
        i.status AS item_status,
        c.categoryid,
        c.categoryname,
        seller.userid AS sellerid,
        seller.name AS seller_name,
        COALESCE(b.highest_bid, i.startingprice) AS current_price,
        b.highest_bid,
        COALESCE(b.total_bids, 0) AS total_bids
      FROM auction a
      JOIN item i ON a.itemid = i.itemid
      JOIN category c ON i.categoryid = c.categoryid
      JOIN app_user seller ON i.sellerid = seller.userid
      LEFT JOIN app_user winner ON a.winneruserid = winner.userid
      LEFT JOIN (
        SELECT auctionid, MAX(bidamount) AS highest_bid, COUNT(*) AS total_bids
        FROM bid
        GROUP BY auctionid
      ) b ON a.auctionid = b.auctionid
      WHERE a.auctionid = $1
    `;

    const result = await db.query(queryText, [auctionId]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Auction not found.' });
    }

    const auction = result.rows[0];

    // Compute eligibility
    const today = new Date().toISOString().split('T')[0];
    const isEnded = auction.enddate < today;
    const isEligibleForBidding = auction.auctionstatus === 'Active' && !isEnded;

    res.json({
      auction: {
        ...auction,
        isEnded,
        isEligibleForBidding,
      },
    });
  } catch (err) {
    console.error('Error fetching auction details:', err.message);
    res.status(500).json({ error: 'Failed to retrieve auction details.' });
  }
});

/**
 * GET /api/auctions/:id/bids
 * Retrieve bid history for a specific auction
 */
router.get('/:id/bids', async (req, res) => {
  try {
    const auctionId = Number(req.params.id);
    if (isNaN(auctionId)) {
      return res.status(400).json({ error: 'Invalid auction ID.' });
    }

    const result = await db.query(
      `SELECT 
        b.bidid,
        b.auctionid,
        b.bidderid,
        u.name AS bidder_name,
        b.bidamount,
        b.bidtime
       FROM bid b
       JOIN app_user u ON b.bidderid = u.userid
       WHERE b.auctionid = $1
       ORDER BY b.bidamount DESC, b.bidtime DESC`,
      [auctionId]
    );

    res.json({ bids: result.rows });
  } catch (err) {
    console.error('Error fetching bids:', err.message);
    res.status(500).json({ error: 'Failed to retrieve bid history.' });
  }
});

/**
 * POST /api/auctions/:id/close
 * Conclude an auction, determine the winning bidder based on reserve price,
 * and update both auction and item statuses.
 * Idempotent: If auction is already closed, returns current status.
 * Authorization: Only Item Seller or Admin.
 */
router.post('/:id/close', requireAuth, async (req, res) => {
  try {
    const auctionId = Number(req.params.id);
    if (isNaN(auctionId)) {
      return res.status(400).json({ error: 'Invalid auction ID.' });
    }

    const result = await db.withTransaction(async (client) => {
      // 1. Fetch auction and item with lock
      const aucRes = await client.query(
        `SELECT a.auctionid, a.itemid, a.auctionstatus, a.reserveprice, a.winneruserid, a.enddate,
                i.sellerid, i.status AS item_status, i.title
         FROM auction a
         JOIN item i ON a.itemid = i.itemid
         WHERE a.auctionid = $1
         FOR UPDATE OF a, i`,
        [auctionId]
      );

      if (aucRes.rows.length === 0) {
        throw new Error('Auction not found.');
      }

      const auction = aucRes.rows[0];

      // 2. Idempotency: If already closed, return current record
      if (auction.auctionstatus === 'Closed') {
        return {
          message: 'Auction is already closed.',
          auction,
          isAlreadyClosed: true,
        };
      }

      // 3. Authorization check: Seller or Admin
      const sellerId = Number(auction.sellerid);
      const currentUserId = Number(req.user?.userid);
      const isSeller = !isNaN(sellerId) && !isNaN(currentUserId) && sellerId === currentUserId;
      const isAdmin = req.user?.role === 'Admin';

      if (!isSeller && !isAdmin) {
        throw new Error('Unauthorized. Only the seller or an administrator can conclude this auction.');
      }

      // 4. Find highest valid bidder
      const bidRes = await client.query(
        `SELECT bidderid, bidamount, bidtime
         FROM bid
         WHERE auctionid = $1
         ORDER BY bidamount DESC, bidtime ASC
         LIMIT 1`,
        [auctionId]
      );

      const hasBids = bidRes.rows.length > 0;
      const highestBid = hasBids ? bidRes.rows[0] : null;
      const reservePrice = auction.reserveprice !== null ? parseFloat(auction.reserveprice) : null;
      const highestBidAmount = highestBid ? parseFloat(highestBid.bidamount) : 0;

      // Reserve price satisfied if reserve is null or highest bid >= reserve
      const reserveMet = reservePrice === null || highestBidAmount >= reservePrice;

      let winnerUserId = null;
      let nextItemStatus = 'Unsold';

      if (hasBids && reserveMet) {
        winnerUserId = Number(highestBid.bidderid);
        nextItemStatus = 'Sold';
      } else {
        // No bids or reserve price not met
        winnerUserId = null;
        nextItemStatus = 'Unsold';
      }

      // 5. Update auction
      const updateAucRes = await client.query(
        `UPDATE auction
         SET auctionstatus = 'Closed', winneruserid = $1
         WHERE auctionid = $2
         RETURNING *`,
        [winnerUserId, auctionId]
      );

      // 6. Update item status consistently
      const updateItemRes = await client.query(
        `UPDATE item
         SET status = $1
         WHERE itemid = $2
         RETURNING *`,
        [nextItemStatus, auction.itemid]
      );

      return {
        message: winnerUserId
          ? `Auction successfully closed. Winning bidder is User #${winnerUserId} at ${formatINR(highestBidAmount)}.`
          : hasBids && !reserveMet
          ? `Auction closed without a winner. Highest bid (${formatINR(highestBidAmount)}) did not meet reserve price (${formatINR(reservePrice)}).`
          : 'Auction closed without bids. Item marked as Unsold.',
        auction: updateAucRes.rows[0],
        item: updateItemRes.rows[0],
        winnerUserId,
        finalPrice: highestBid ? highestBidAmount : null,
      };
    });

    res.json(result);
  } catch (err) {
    console.error('Error closing auction:', err.message);
    res.status(400).json({ error: err.message || 'Failed to close auction.' });
  }
});

module.exports = router;