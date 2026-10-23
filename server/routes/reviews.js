const express = require('express');
const router = express.Router();
const db = require('../db');
const { requireAuth } = require('../middleware/auth');

/**
 * GET /api/reviews
 * Retrieve reviews with joined reviewer, reviewee, and auction info
 */
router.get('/', async (req, res) => {
  try {
    const { auctionid, revieweeid, reviewerid } = req.query;
    const conditions = [];
    const params = [];

    if (auctionid) {
      params.push(Number(auctionid));
      conditions.push(`r.auctionid = $${params.length}`);
    }

    if (revieweeid) {
      params.push(Number(revieweeid));
      conditions.push(`r.revieweeid = $${params.length}`);
    }

    if (reviewerid) {
      params.push(Number(reviewerid));
      conditions.push(`r.reviewerid = $${params.length}`);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const queryText = `
      SELECT 
        r.reviewid,
        r.reviewerid,
        reviewer.name AS reviewer_name,
        r.revieweeid,
        reviewee.name AS reviewee_name,
        r.auctionid,
        i.title AS item_title,
        r.rating,
        r.comment,
        r.reviewdate
      FROM review r
      JOIN app_user reviewer ON r.reviewerid = reviewer.userid
      JOIN app_user reviewee ON r.revieweeid = reviewee.userid
      JOIN auction a ON r.auctionid = a.auctionid
      JOIN item i ON a.itemid = i.itemid
      ${whereClause}
      ORDER BY r.reviewdate DESC, r.reviewid DESC
    `;

    const result = await db.query(queryText, params);
    res.json({ reviews: result.rows });
  } catch (err) {
    console.error('Error fetching reviews:', err.message);
    res.status(500).json({ error: 'Failed to retrieve reviews.' });
  }
});

/**
 * POST /api/reviews
 * Submit a review for a completed auction
 */
router.post('/', requireAuth, async (req, res) => {
  try {
    const { auctionid, revieweeid, rating, comment } = req.body;
    const auctionId = Number(auctionid);
    const revieweeId = Number(revieweeid);
    const ratingNum = parseInt(rating, 10);

    if (isNaN(auctionId) || isNaN(revieweeId) || isNaN(ratingNum)) {
      return res.status(400).json({ error: 'Auction ID, reviewee ID, and rating are required.' });
    }

    if (ratingNum < 1 || ratingNum > 5) {
      return res.status(400).json({ error: 'Rating must be an integer between 1 and 5.' });
    }

    if (req.user.userid === revieweeId) {
      return res.status(400).json({ error: 'You cannot write a review for yourself.' });
    }

    const newReview = await db.withTransaction(async (client) => {
      // Check if review already exists for this reviewer & auction
      const existing = await client.query(
        'SELECT reviewid FROM review WHERE reviewerid = $1 AND auctionid = $2',
        [req.user.userid, auctionId]
      );

      if (existing.rows.length > 0) {
        throw new Error('You have already submitted a review for this auction.');
      }

      // Check auction exists
      const auctionRes = await client.query('SELECT auctionid FROM auction WHERE auctionid = $1', [auctionId]);
      if (auctionRes.rows.length === 0) {
        throw new Error('Auction not found.');
      }

      const nextReviewId = await db.getNextId(client, 'review', 'reviewid', 3000);

      const insertRes = await client.query(
        `INSERT INTO review (reviewid, reviewerid, revieweeid, auctionid, rating, comment, reviewdate)
         VALUES ($1, $2, $3, $4, $5, $6, CURRENT_DATE)
         RETURNING *`,
        [
          nextReviewId,
          req.user.userid,
          revieweeId,
          auctionId,
          ratingNum,
          comment ? comment.trim() : null,
        ]
      );

      return insertRes.rows[0];
    });

    res.status(201).json({ message: 'Review submitted successfully.', review: newReview });
  } catch (err) {
    console.error('Error submitting review:', err.message);
    res.status(400).json({ error: err.message || 'Failed to submit review.' });
  }
});

module.exports = router;
