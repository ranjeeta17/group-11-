// routes/leaveRoutes.js
const express = require('express');
const router = express.Router();
const leaveController = require('../controllers/leaveController');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

// Apply authentication to all routes
router.use(authenticateToken);

// Employee routes - accessible by all authenticated users
router.get('/my-leaves', leaveController.getEmployeeLeaves);
router.get('/balance', leaveController.getLeaveBalance);
router.post('/', leaveController.createLeave);
router.patch('/:id/cancel', leaveController.cancelLeave);

// Admin routes - requires admin role
router.get('/admin/leaves', requireAdmin, leaveController.getAllLeaves);
router.get('/admin/statistics', requireAdmin, leaveController.getLeaveStatistics);
router.patch('/admin/:id/status', requireAdmin, leaveController.updateLeaveStatus);

module.exports = router;