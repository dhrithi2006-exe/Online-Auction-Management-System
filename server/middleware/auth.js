const jwt = require('jsonwebtoken');
const db = require('../db');

const JWT_SECRET = process.env.JWT_SECRET || 'college_auction_dbms_fallback_secret_key';

/**
 * Verifies JWT token and attaches user record to req.user
 */
async function requireAuth(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Authentication required. Please sign in.' });
    }

    const token = authHeader.split(' ')[1];
    let decoded;
    try {
      decoded = jwt.verify(token, JWT_SECRET);
    } catch (err) {
      return res.status(401).json({ error: 'Session expired or invalid token. Please sign in again.' });
    }

    // Verify user still exists in app_user (never select password!)
    const userRes = await db.query(
      `SELECT userid, name, email, phone, address, role, registrationdate 
       FROM app_user 
       WHERE userid = $1`,
      [decoded.userid]
    );

    if (userRes.rows.length === 0) {
      return res.status(401).json({ error: 'User account not found.' });
    }

    req.user = userRes.rows[0];
    next();
  } catch (err) {
    console.error('requireAuth middleware error:', err);
    res.status(500).json({ error: 'Internal authentication error' });
  }
}

/**
 * Optional authentication: decodes user if token provided, but doesn't block unauthenticated guests
 */
async function optionalAuth(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      try {
        const decoded = jwt.verify(token, JWT_SECRET);
        const userRes = await db.query(
          `SELECT userid, name, email, role FROM app_user WHERE userid = $1`,
          [decoded.userid]
        );
        if (userRes.rows.length > 0) {
          req.user = userRes.rows[0];
        }
      } catch (err) {
        // Token invalid or expired, continue as guest
      }
    }
    next();
  } catch (err) {
    next();
  }
}

/**
 * Role-based authorization middleware
 * @param {string[]} allowedRoles - e.g. ['Admin'], ['Seller', 'Admin']
 */
function requireRole(allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required.' });
    }
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ 
        error: `Access denied. Requires one of the following roles: ${allowedRoles.join(', ')}` 
      });
    }
    next();
  };
}

module.exports = {
  requireAuth,
  optionalAuth,
  requireRole,
  JWT_SECRET,
};
