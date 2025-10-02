const Overtime = require('../models/Overtime');
const User = require('../models/User');
const TimeRecord = require('../models/TimeRecord');
const { 
  calculateOvertimeForTimeRecord,
  processOvertimeForDateRange,
  getEmployeeOvertimeSummary,
  getCompanyOvertimeStats
} = require('../services/overtimeCalculationService');

// Get all overtime records for admin
const getAllOvertimeRecords = async (req, res) => {
  try {
    const { status, employeeId, page = 1, limit = 10, fromDate, toDate } = req.query;
    const query = {};
    
    if (status) query.status = status;
    if (employeeId) query.employeeId = employeeId;
    
    if (fromDate && toDate) {
      query.date = {
        $gte: new Date(fromDate),
        $lte: new Date(toDate)
      };
    }

    const records = await Overtime.find(query)
      .populate('employeeId', 'name email department employeeId')
      .populate('approvedBy', 'name email')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Overtime.countDocuments(query);

    res.json({
      success: true,
      records,
      pagination: {
        current: parseInt(page),
        pages: Math.ceil(total / limit),
        total
      }
    });
  } catch (error) {
    console.error('Error fetching overtime records:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch overtime records' });
  }
};

// Get overtime records for specific employee
const getEmployeeOvertimeRecords = async (req, res) => {
  try {
    const employeeId = req.user.id;
    const { status, page = 1, limit = 10, fromDate, toDate } = req.query;
    
    const query = { employeeId };
    if (status) query.status = status;
    
    if (fromDate && toDate) {
      query.date = {
        $gte: new Date(fromDate),
        $lte: new Date(toDate)
      };
    }

    const records = await Overtime.find(query)
      .populate('approvedBy', 'name email')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Overtime.countDocuments(query);

    // Get overtime summary
    const summary = await getEmployeeOvertimeSummary(
      employeeId,
      fromDate ? new Date(fromDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Last 30 days
      toDate ? new Date(toDate) : new Date()
    );

    res.json({
      success: true,
      records,
      summary,
      pagination: {
        current: parseInt(page),
        pages: Math.ceil(total / limit),
        total
      }
    });
  } catch (error) {
    console.error('Error fetching employee overtime records:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch overtime records' });
  }
};

// Update overtime request status (admin only)
const updateOvertimeStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, rejectionReason } = req.body;
    const adminId = req.user.id;

    if (!['approved', 'rejected'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Status must be either approved or rejected'
      });
    }

    const updateData = {
      status,
      approvedBy: adminId,
      approvedAt: new Date()
    };

    if (status === 'rejected' && rejectionReason) {
      updateData.rejectionReason = rejectionReason;
    }

    const overtimeRecord = await Overtime.findByIdAndUpdate(
      id,
      updateData,
      { new: true }
    ).populate('employeeId', 'name email department employeeId')
     .populate('approvedBy', 'name email');

    if (!overtimeRecord) {
      return res.status(404).json({
        success: false,
        message: 'Overtime record not found'
      });
    }

    res.json({
      success: true,
      message: `Overtime request ${status} successfully`,
      record: overtimeRecord
    });
  } catch (error) {
    console.error('Error updating overtime status:', error);
    res.status(500).json({ success: false, message: 'Failed to update overtime status' });
  }
};

// Get overtime statistics
const getOvertimeStats = async (req, res) => {
  try {
    const { fromDate, toDate } = req.query;
    const from = fromDate ? new Date(fromDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const to = toDate ? new Date(toDate) : new Date();

    const stats = await getCompanyOvertimeStats(from, to);

    res.json({
      success: true,
      stats,
      dateRange: { from, to }
    });
  } catch (error) {
    console.error('Error fetching overtime stats:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch overtime statistics' });
  }
};

// Process overtime calculation for a specific time record
const processOvertimeCalculation = async (req, res) => {
  try {
    const { timeRecordId } = req.params;
    
    const timeRecord = await TimeRecord.findById(timeRecordId);
    if (!timeRecord) {
      return res.status(404).json({
        success: false,
        message: 'Time record not found'
      });
    }

    if (!timeRecord.logoutAt) {
      return res.status(400).json({
        success: false,
        message: 'Time record must be completed (logged out) to calculate overtime'
      });
    }

    const result = await calculateOvertimeForTimeRecord(timeRecord);

    res.json({
      success: true,
      result
    });
  } catch (error) {
    console.error('Error processing overtime calculation:', error);
    res.status(500).json({ success: false, message: 'Failed to process overtime calculation' });
  }
};

// Process overtime for a date range
const processOvertimeForDateRangeController = async (req, res) => {
  try {
    const { fromDate, toDate } = req.body;
    
    if (!fromDate || !toDate) {
      return res.status(400).json({
        success: false,
        message: 'fromDate and toDate are required'
      });
    }

    const results = await processOvertimeForDateRange(new Date(fromDate), new Date(toDate));

    res.json({
      success: true,
      message: 'Overtime processing completed',
      results
    });
  } catch (error) {
    console.error('Error processing overtime for date range:', error);
    res.status(500).json({ success: false, message: 'Failed to process overtime for date range' });
  }
};

// Delete overtime request (admin only)
const deleteOvertimeRequest = async (req, res) => {
  try {
    const { id } = req.params;
    const userRole = req.user.role;

    if (userRole !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Only admins can delete overtime records'
      });
    }

    const overtimeRecord = await Overtime.findById(id);
    if (!overtimeRecord) {
      return res.status(404).json({
        success: false,
        message: 'Overtime record not found'
      });
    }

    await Overtime.findByIdAndDelete(id);

    res.json({
      success: true,
      message: 'Overtime record deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting overtime record:', error);
    res.status(500).json({ success: false, message: 'Failed to delete overtime record' });
  }
};

module.exports = {
  getAllOvertimeRecords,
  getEmployeeOvertimeRecords,
  updateOvertimeStatus,
  getOvertimeStats,
  processOvertimeCalculation,
  processOvertimeForDateRangeController,
  deleteOvertimeRequest
};
