const express = require('express');
const router = express.Router();
const db = require('../db');
const { requireAuth, requireRole } = require('../middleware/auth');

/**
 * GET /api/users
 * Admin view of all registered users (excluding passwords)
 */
router.get('/', requireAuth, requireRole(['Admin']), async (req, res) => {
  try {
    const result = await db.query(
      `SELECT userid, name, email, phone, address, role, registrationdate
       FROM app_user
       ORDER BY userid ASC`
    );
    res.json({ users: result.rows });
  } catch (err) {
    console.error('Error fetching users:', err.message);
    res.status(500).json({ error: 'Failed to retrieve users.' });
  }
});

/**
 * GET /api/users/:id/profile
 * Public/Safe profile for a seller or buyer
 */
router.get('/:id/profile', async (req, res) => {
  try {
    const userId = Number(req.params.id);
    if (isNaN(userId)) {
      return res.status(400).json({ error: 'Invalid user ID.' });
    }

    const userRes = await db.query(
      `SELECT userid, name, role, registrationdate
       FROM app_user
       WHERE userid = $1`,
      [userId]
    );

    if (userRes.rows.length === 0) {
      return res.status(404).json({ error: 'User not found.' });
    }

    // Get reviews received by this user
    const reviewsRes = await db.query(
      `SELECT r.reviewid, r.rating, r.comment, r.reviewdate, u.name AS reviewer_name
       FROM review r
       JOIN app_user u ON r.reviewerid = u.userid
       WHERE r.revieweeid = $1
       ORDER BY r.reviewdate DESC`,
      [userId]
    );

    res.json({
      user: userRes.rows[0],
      reviews: reviewsRes.rows,
    });
  } catch (err) {
    console.error('Error fetching user profile:', err.message);
    res.status(500).json({ error: 'Failed to retrieve profile.' });
  }
});

module.exports = router;
