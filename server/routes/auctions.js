const express = require('express');
const router = express.Router();
const db = require('../db');
const { requireAuth } = require('../middleware/auth');

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

module.exports = router;
