const express = require('express');
const router = express.Router();
const db = require('../db');
const { requireAuth, requireRole } = require('../middleware/auth');

/**
 * GET /api/items
 * Retrieve items with optional search and filters
 */
router.get('/', async (req, res) => {
  try {
    const { search, categoryid, condition, status, sellerid } = req.query;
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
      conditions.push(`i.status = $${params.length}`);
    }

    if (sellerid) {
      params.push(Number(sellerid));
      conditions.push(`i.sellerid = $${params.length}`);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const queryText = `
      SELECT 
        i.itemid,
        i.title,
        i.description,
        i.startingprice,
        i.itemcondition,
        i.imageurl,
        i.status,
        c.categoryid,
        c.categoryname,
        u.userid AS sellerid,
        u.name AS seller_name,
        a.auctionid,
        a.auctionstatus,
        a.startdate,
        a.enddate,
        a.reserveprice,
        COALESCE(b.highest_bid, i.startingprice) AS current_price,
        COALESCE(b.total_bids, 0) AS total_bids
      FROM item i
      JOIN category c ON i.categoryid = c.categoryid
      JOIN app_user u ON i.sellerid = u.userid
      LEFT JOIN auction a ON i.itemid = a.itemid
      LEFT JOIN (
        SELECT auctionid, MAX(bidamount) AS highest_bid, COUNT(*) AS total_bids
        FROM bid
        GROUP BY auctionid
      ) b ON a.auctionid = b.auctionid
      ${whereClause}
      ORDER BY i.itemid DESC
    `;

    const result = await db.query(queryText, params);
    res.json({ items: result.rows });
  } catch (err) {
    console.error('Error fetching items:', err.message);
    res.status(500).json({ error: 'Failed to retrieve items.' });
  }
});

/**
 * GET /api/items/:id
 * Retrieve details for a specific item
 */
router.get('/:id', async (req, res) => {
  try {
    const itemId = Number(req.params.id);
    if (isNaN(itemId)) {
      return res.status(400).json({ error: 'Invalid item ID.' });
    }

    const queryText = `
      SELECT 
        i.itemid,
        i.title,
        i.description,
        i.startingprice,
        i.itemcondition,
        i.imageurl,
        i.status,
        c.categoryid,
        c.categoryname,
        u.userid AS sellerid,
        u.name AS seller_name,
        a.auctionid,
        a.auctionstatus,
        a.startdate,
        a.enddate,
        a.reserveprice,
        a.winneruserid,
        COALESCE(b.highest_bid, i.startingprice) AS current_price,
        COALESCE(b.total_bids, 0) AS total_bids
      FROM item i
      JOIN category c ON i.categoryid = c.categoryid
      JOIN app_user u ON i.sellerid = u.userid
      LEFT JOIN auction a ON i.itemid = a.itemid
      LEFT JOIN (
        SELECT auctionid, MAX(bidamount) AS highest_bid, COUNT(*) AS total_bids
        FROM bid
        GROUP BY auctionid
      ) b ON a.auctionid = b.auctionid
      WHERE i.itemid = $1
    `;

    const result = await db.query(queryText, [itemId]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Item not found.' });
    }

    res.json({ item: result.rows[0] });
  } catch (err) {
    console.error('Error fetching item details:', err.message);
    res.status(500).json({ error: 'Failed to retrieve item details.' });
  }
});

/**
 * POST /api/items
 * Create a new item listing (Seller / Admin only)
 * Optionally creates an associated auction record atomically
 */
router.post('/', requireAuth, requireRole(['Seller', 'Admin']), async (req, res) => {
  try {
    const {
      title,
      description,
      categoryid,
      startingprice,
      itemcondition,
      imageurl,
      createAuction,
      startdate,
      enddate,
      reserveprice,
    } = req.body;

    if (!title || !categoryid || startingprice === undefined) {
      return res.status(400).json({ error: 'Title, category, and starting price are required.' });
    }

    const priceNum = parseFloat(startingprice);
    if (isNaN(priceNum) || priceNum < 0) {
      return res.status(400).json({ error: 'Starting price must be a non-negative number.' });
    }

    const validConditions = ['New', 'Used', 'Refurbished'];
    if (itemcondition && !validConditions.includes(itemcondition)) {
      return res.status(400).json({ error: `Condition must be one of: ${validConditions.join(', ')}` });
    }

    const result = await db.withTransaction(async (client) => {
      // Allocate next ItemID safely
      const nextItemId = await db.getNextId(client, 'item', 'itemid', 500);

      const itemInsert = await client.query(
        `INSERT INTO item (itemid, sellerid, categoryid, title, description, startingprice, itemcondition, imageurl, status)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'Active')
         RETURNING *`,
        [
          nextItemId,
          req.user.userid,
          Number(categoryid),
          title.trim(),
          description ? description.trim() : null,
          priceNum,
          itemcondition || 'Used',
          imageurl ? imageurl.trim() : null,
        ]
      );

      let auctionRow = null;
      if (createAuction) {
        if (!startdate || !enddate) {
          throw new Error('Start date and end date are required to create an auction.');
        }

        const nextAuctionId = await db.getNextId(client, 'auction', 'auctionid', 0);
        const resPriceNum = reserveprice !== undefined && reserveprice !== '' ? parseFloat(reserveprice) : null;

        const auctionInsert = await client.query(
          `INSERT INTO auction (auctionid, itemid, winneruserid, startdate, enddate, reserveprice, auctionstatus)
           VALUES ($1, $2, NULL, $3, $4, $5, 'Active')
           RETURNING *`,
          [nextAuctionId, nextItemId, startdate, enddate, resPriceNum]
        );
        auctionRow = auctionInsert.rows[0];
      }

      return { item: itemInsert.rows[0], auction: auctionRow };
    });

    res.status(201).json({
      message: 'Item listed successfully.',
      item: result.item,
      auction: result.auction,
    });
  } catch (err) {
    console.error('Error creating item:', err.message);
    res.status(400).json({ error: err.message || 'Failed to create item listing.' });
  }
});

/**
 * PUT /api/items/:id
 * Update an existing item (Only owner or Admin)
 */
router.put('/:id', requireAuth, async (req, res) => {
  try {
    const itemId = Number(req.params.id);
    const { title, description, categoryid, startingprice, itemcondition, imageurl } = req.body;

    // Check ownership
    const existing = await db.query('SELECT sellerid, status FROM item WHERE itemid = $1', [itemId]);
    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'Item not found.' });
    }

    const ownerId = Number(existing.rows[0].sellerid);
    const currentUserId = Number(req.user?.userid);
    if ((isNaN(ownerId) || isNaN(currentUserId) || ownerId !== currentUserId) && req.user?.role !== 'Admin') {
      return res.status(403).json({ error: 'You do not have permission to edit this item.' });
    }

    const priceNum = parseFloat(startingprice);
    if (isNaN(priceNum) || priceNum < 0) {
      return res.status(400).json({ error: 'Starting price must be non-negative.' });
    }

    const updateRes = await db.query(
      `UPDATE item 
       SET title = $1, description = $2, categoryid = $3, startingprice = $4, itemcondition = $5, imageurl = $6
       WHERE itemid = $7
       RETURNING *`,
      [
        title.trim(),
        description ? description.trim() : null,
        Number(categoryid),
        priceNum,
        itemcondition || 'Used',
        imageurl ? imageurl.trim() : null,
        itemId,
      ]
    );

    res.json({ message: 'Item updated successfully.', item: updateRes.rows[0] });
  } catch (err) {
    console.error('Error updating item:', err.message);
    res.status(400).json({ error: err.message || 'Failed to update item.' });
  }
});

module.exports = router;
