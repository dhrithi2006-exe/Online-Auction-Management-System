require('dotenv').config();
const express = require('express');
const cors = require('cors');

const authRoutes = require('./routes/auth');
const categoriesRoutes = require('./routes/categories');
const itemsRoutes = require('./routes/items');
const auctionsRoutes = require('./routes/auctions');
const bidsRoutes = require('./routes/bids');
const watchlistRoutes = require('./routes/watchlist');
const paymentsRoutes = require('./routes/payments');
const shippingRoutes = require('./routes/shipping');
const reviewsRoutes = require('./routes/reviews');
const usersRoutes = require('./routes/users');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// API Health Check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'Online Auction Management System API',
  });
});

// Mount Routes
app.use('/api/auth', authRoutes);
app.use('/api/categories', categoriesRoutes);
app.use('/api/items', itemsRoutes);
app.use('/api/auctions', auctionsRoutes);
app.use('/api/bids', bidsRoutes);
app.use('/api', bidsRoutes); // Also handles /api/auctions/:id/bids for posting bids
app.use('/api/watchlist', watchlistRoutes);
app.use('/api/payments', paymentsRoutes);
app.use('/api/shipping', shippingRoutes);
app.use('/api/reviews', reviewsRoutes);
app.use('/api/users', usersRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: `Route not found: ${req.method} ${req.originalUrl}` });
});

// Centralized error handler
app.use((err, req, res, next) => {
  console.error('Unhandled server error:', err);
  res.status(500).json({
    error: 'Internal server error occurred.',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined,
  });
});

app.listen(PORT, () => {
  console.log(`Auction System API running on http://localhost:${PORT}`);
});
