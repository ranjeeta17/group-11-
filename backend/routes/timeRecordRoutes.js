// routes/timeRecordRoutes.js
const express = require('express');
const router = express.Router();
const { checkIn, checkOut, getMyRecords, adminList,presentTodayCount } = require('../controllers/timeRecordController');

// Reuse your existing middlewares from main server file
const jwt = require('jsonwebtoken');
const User = require('../models/User');

const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ success: false, message: 'Access token is required' });

  jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key', async (err, payload) => {
    if (err) return res.status(403).json({ success: false, message: 'Invalid or expired token' });
    req.user = payload; // { userId, email, role }
    next();
  });
};

const requireAdmin = (req, res, next) => {
  if (req.user?.role !== 'admin') return res.status(403).json({ success: false, message: 'Admin access required' });
  next();
};

// User endpoints
router.post('/check-in', authenticateToken, checkIn);
router.post('/check-out', authenticateToken, checkOut);
router.get('/mine', authenticateToken, getMyRecords);
router.get('/admin/present-today', authenticateToken, requireAdmin, presentTodayCount);


// Admin endpoints
router.get('/admin', authenticateToken, requireAdmin, adminList);

module.exports = router;
