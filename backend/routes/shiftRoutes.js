const express = require('express');
const router = express.Router();
const {
  getAllShifts,
  getMyShifts,
  assignShift,
  adminUpdateShift,
  updateShiftStatus,
  deleteShift,
  getShiftStats,
  getShiftInfo
} = require('../controllers/shiftController');

// Auth middlewares will be provided by server.js wrappers

// Public
router.get('/info', getShiftInfo);

// Protected (expect wrapping with authenticateToken in server)
router.get('/my', getMyShifts);
router.put('/:id/status', updateShiftStatus);

// Admin
router.get('/all', getAllShifts);
router.post('/assign', assignShift);
router.put('/:id', adminUpdateShift);
router.delete('/:id', deleteShift);
router.get('/stats', getShiftStats);

module.exports = router;



