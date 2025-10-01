const express = require('express');
const { protect, isAdmin } = require('../middleware/authMiddleware');
const {
  listUsers, updateUser, deleteUser,
  listAllAttendance, updateAttendance, deleteAttendance
} = require('../controllers/adminController');
const {
  getCompanySummary,
  getEmployeeSummary
} = require('../controllers/adminSimpleAnalyticsController');

const router = express.Router();

// 🔒 Protect all admin routes
router.use(protect, isAdmin);

// User management
router.get('/users', listUsers);
router.put('/users/:id', updateUser);
router.delete('/users/:id', deleteUser);

// Attendance management
router.get('/attendance', listAllAttendance);
router.put('/attendance/:id', updateAttendance);
router.delete('/attendance/:id', deleteAttendance);

// Analytics
router.get('/summary', getCompanySummary);
router.get('/employee/:employeeId/summary', getEmployeeSummary);

module.exports = router;
