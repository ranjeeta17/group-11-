// routes/authRoutes.js
const express = require('express');
const {
  validateAdminKey,
  registerUser,
  loginUser,
  getUserProfile
} = require('../controllers/authController');
const authMiddleware = require('../middleware/authMiddleware');

const router = express.Router();

// Public routes
router.post('/validate-admin-key', validateAdminKey);
router.post('/register', registerUser);
router.post('/login', loginUser);

// Private routes
router.get('/profile', authMiddleware, getUserProfile);

module.exports = router;



// Import route modules
const authRoutes = require('./authRoutes');

// Use routes
router.use('/auth', authRoutes);

// Health check route
router.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

module.exports = router;