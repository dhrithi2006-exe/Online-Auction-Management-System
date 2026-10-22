const express = require('express');
const router = express.Router();
const db = require('../db');

/**
 * GET /api/categories
 * Returns all auction categories from CockroachDB
 */
router.get('/', async (req, res) => {
  try {
    const result = await db.query(
      `SELECT categoryid, categoryname, description 
       FROM category 
       ORDER BY categoryname ASC`
    );
    res.json({ categories: result.rows });
  } catch (err) {
    console.error('Error fetching categories:', err.message);
    res.status(500).json({ error: 'Failed to retrieve categories from database.' });
  }
});

module.exports = router;
