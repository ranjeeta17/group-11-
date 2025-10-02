const express = require('express');
const {
  getAllOvertimeRecords,
  getEmployeeOvertimeRecords,
  updateOvertimeStatus,
  getOvertimeStats,
  processOvertimeCalculation,
  processOvertimeForDateRangeController,
  deleteOvertimeRequest
} = require('../controllers/overtimeController');
const { protect, isAdmin } = require('../middleware/authMiddleware');

const router = express.Router();

// Admin routes
router.get('/admin/all', protect, isAdmin, getAllOvertimeRecords);
router.get('/admin/stats', protect, isAdmin, getOvertimeStats);
router.patch('/admin/:id/status', protect, isAdmin, updateOvertimeStatus);
router.delete('/admin/:id', protect, isAdmin, deleteOvertimeRequest);
router.post('/admin/process-date-range', protect, isAdmin, processOvertimeForDateRangeController);

// Employee routes
router.get('/my-overtime', protect, getEmployeeOvertimeRecords);

// Processing routes
router.post('/process/:timeRecordId', protect, processOvertimeCalculation);

module.exports = router;
