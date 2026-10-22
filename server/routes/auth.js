const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../db');
const { requireAuth, JWT_SECRET } = require('../middleware/auth');

/**
 * POST /api/auth/login
 * Authenticates user via email and password using bcrypt.compare
 */
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required.' });
    }

    // Query user by email (safe parameterized query)
    const result = await db.query(
      `SELECT userid, name, email, phone, address, role, password, registrationdate 
       FROM app_user 
       WHERE LOWER(email) = LOWER($1)`,
      [email.trim()]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    const user = result.rows[0];

    // Compare with bcrypt hash
    const passwordMatches = await bcrypt.compare(password, user.password);
    if (!passwordMatches) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    // Sign JWT
    const token = jwt.sign(
      {
        userid: user.userid,
        email: user.email,
        role: user.role,
        name: user.name,
      },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    // Return safe user object (excluding password)
    res.json({
      message: 'Login successful.',
      token,
      user: {
        userid: user.userid,
        name: user.name,
        email: user.email,
        phone: user.phone,
        address: user.address,
        role: user.role,
        registrationdate: user.registrationdate,
      },
    });
  } catch (err) {
    console.error('Login error:', err.message);
    res.status(500).json({ error: 'An error occurred during sign in.' });
  }
});

/**
 * POST /api/auth/register
 * Register a new user account (defaults to Buyer role)
 */
router.post('/register', async (req, res) => {
  try {
    const { name, email, phone, address, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Name, email, and password are required.' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters long.' });
    }

    // Check duplicate email
    const existing = await db.query(
      'SELECT userid FROM app_user WHERE LOWER(email) = LOWER($1)',
      [email.trim()]
    );

    if (existing.rows.length > 0) {
      return res.status(409).json({ error: 'An account with this email address already exists.' });
    }

    // Hash password with bcrypt
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    const newUser = await db.withTransaction(async (client) => {
      // Allocate next UserID safely
      const nextUserId = await db.getNextId(client, 'app_user', 'userid', 100);

      const insertRes = await client.query(
        `INSERT INTO app_user (userid, name, email, phone, password, address, role, registrationdate)
         VALUES ($1, $2, $3, $4, $5, $6, 'Buyer', CURRENT_DATE)
         RETURNING userid, name, email, phone, address, role, registrationdate`,
        [
          nextUserId,
          name.trim(),
          email.trim().toLowerCase(),
          phone ? phone.trim() : null,
          hashedPassword,
          address ? address.trim() : null,
        ]
      );

      return insertRes.rows[0];
    });

    const token = jwt.sign(
      {
        userid: newUser.userid,
        email: newUser.email,
        role: newUser.role,
        name: newUser.name,
      },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.status(201).json({
      message: 'Account registered successfully.',
      token,
      user: newUser,
    });
  } catch (err) {
    console.error('Registration error:', err.message);
    res.status(400).json({ error: err.message || 'Registration failed.' });
  }
});

/**
 * GET /api/auth/me
 * Retrieve currently authenticated user profile
 */
router.get('/me', requireAuth, (req, res) => {
  res.json({ user: req.user });
});

module.exports = router;
