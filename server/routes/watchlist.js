const express = require('express');
const router = express.Router();
const db = require('../db');
const { requireAuth } = require('../middleware/auth');

/**
 * GET /api/watchlist
 * Retrieve authenticated user's watchlisted items
 */
router.get('/', requireAuth, async (req, res) => {
  try {
    const result = await db.query(
      `SELECT 
        w.watchlistid,
        w.dateadded,
        i.itemid,
        i.title,
        i.description,
        i.startingprice,
        i.itemcondition,
        i.imageurl,
        i.status AS item_status,
        c.categoryname,
        a.auctionid,
        a.auctionstatus,
        a.enddate,
        COALESCE(b.highest_bid, i.startingprice) AS current_price,
        COALESCE(b.total_bids, 0) AS total_bids
       FROM watchlist w
       JOIN item i ON w.itemid = i.itemid
       JOIN category c ON i.categoryid = c.categoryid
       LEFT JOIN auction a ON i.itemid = a.itemid
       LEFT JOIN (
         SELECT auctionid, MAX(bidamount) AS highest_bid, COUNT(*) AS total_bids
         FROM bid
         GROUP BY auctionid
       ) b ON a.auctionid = b.auctionid
       WHERE w.userid = $1
       ORDER BY w.dateadded DESC, w.watchlistid DESC`,
      [req.user.userid]
    );

    res.json({ watchlist: result.rows });
  } catch (err) {
    console.error('Error fetching watchlist:', err.message);
    res.status(500).json({ error: 'Failed to retrieve watchlist.' });
  }
});

/**
 * GET /api/watchlist/check/:itemId
 * Check if a specific item is watchlisted by the user
 */
router.get('/check/:itemId', requireAuth, async (req, res) => {
  try {
    const itemId = Number(req.params.itemId);
    const result = await db.query(
      `SELECT watchlistid FROM watchlist WHERE userid = $1 AND itemid = $2`,
      [req.user.userid, itemId]
    );

    res.json({ isWatchlisted: result.rows.length > 0 });
  } catch (err) {
    console.error('Error checking watchlist status:', err.message);
    res.status(500).json({ error: 'Failed to check watchlist status.' });
  }
});

/**
 * POST /api/watchlist/:itemId
 * Add item to user's watchlist
 */
router.post('/:itemId', requireAuth, async (req, res) => {
  try {
    const itemId = Number(req.params.itemId);
    if (isNaN(itemId)) {
      return res.status(400).json({ error: 'Invalid item ID.' });
    }

    // Verify item exists
    const itemCheck = await db.query('SELECT itemid FROM item WHERE itemid = $1', [itemId]);
    if (itemCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Item not found.' });
    }

    const added = await db.withTransaction(async (client) => {
      // Check if already in watchlist
      const existing = await client.query(
        'SELECT watchlistid FROM watchlist WHERE userid = $1 AND itemid = $2',
        [req.user.userid, itemId]
      );

      if (existing.rows.length > 0) {
        return existing.rows[0];
      }

      const nextWatchlistId = await db.getNextId(client, 'watchlist', 'watchlistid', 0);
      const insertRes = await client.query(
        `INSERT INTO watchlist (watchlistid, userid, itemid, dateadded)
         VALUES ($1, $2, $3, CURRENT_DATE)
         RETURNING *`,
        [nextWatchlistId, req.user.userid, itemId]
      );

      return insertRes.rows[0];
    });

    res.status(201).json({ message: 'Item added to watchlist.', watchlist: added });
  } catch (err) {
    console.error('Error adding to watchlist:', err.message);
    res.status(400).json({ error: err.message || 'Failed to add item to watchlist.' });
  }
});

/**
 * DELETE /api/watchlist/:itemId
 * Remove item from user's watchlist
 */
router.delete('/:itemId', requireAuth, async (req, res) => {
  try {
    const itemId = Number(req.params.itemId);
    await db.query(
      `DELETE FROM watchlist WHERE userid = $1 AND itemid = $2`,
      [req.user.userid, itemId]
    );

    res.json({ message: 'Item removed from watchlist.' });
  } catch (err) {
    console.error('Error removing from watchlist:', err.message);
    res.status(500).json({ error: 'Failed to remove item from watchlist.' });
  }
});

module.exports = router;
