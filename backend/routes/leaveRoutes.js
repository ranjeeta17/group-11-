// routes/leaveRoutes.js
const express = require('express');
const router = express.Router();
const Leave = require('../models/Leave');
const User = require('../models/User');

// Middleware to authenticate token (assuming you have this)
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ success: false, message: 'Access token is required' });

  jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key', (err, user) => {
    if (err) return res.status(403).json({ success: false, message: 'Invalid or expired token' });
    req.user = user;
    next();
  });
};

// Get all leave requests (Admin only)
router.get('/admin/leaves', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Admin access required' });
    }

    const { status, department, page = 1, limit = 10 } = req.query;
    const skip = (page - 1) * limit;

    let filter = {};
    if (status) filter.status = status;
    if (department) filter.department = department;

    const leaves = await Leave.find(filter)
      .populate('employeeId', 'name email employeeId department')
      .populate('approvedBy', 'name')
      .populate('coveringEmployee', 'name employeeId')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Leave.countDocuments(filter);

    res.json({
      success: true,
      leaves,
      pagination: {
        current: parseInt(page),
        total: Math.ceil(total / limit),
        count: leaves.length,
        totalRecords: total
      }
    });
  } catch (error) {
    console.error('Error fetching leaves:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Get leave requests for specific employee
router.get('/employee/leaves', authenticateToken, async (req, res) => {
  try {
    const leaves = await Leave.find({ employeeId: req.user.userId })
      .populate('approvedBy', 'name')
      .populate('coveringEmployee', 'name employeeId')
      .sort({ createdAt: -1 });

    res.json({ success: true, leaves });
  } catch (error) {
    console.error('Error fetching employee leaves:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Submit leave request
router.post('/submit', authenticateToken, async (req, res) => {
  try {
    const {
      leaveType,
      startDate,
      endDate,
      reason,
      emergencyContact,
      coveringEmployee,
      handoverNotes
    } = req.body;

    // Get employee details
    const employee = await User.findById(req.user.userId);
    if (!employee) {
      return res.status(404).json({ success: false, message: 'Employee not found' });
    }

    // Validate dates
    const start = new Date(startDate);
    const end = new Date(endDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (start < today) {
      return res.status(400).json({ 
        success: false, 
        message: 'Start date cannot be in the past' 
      });
    }

    if (end < start) {
      return res.status(400).json({ 
        success: false, 
        message: 'End date cannot be before start date' 
      });
    }

    // Check for overlapping leave requests
    const overlapping = await Leave.findOne({
      employeeId: req.user.userId,
      status: { $in: ['pending', 'approved'] },
      $or: [
        { startDate: { $lte: end }, endDate: { $gte: start } }
      ]
    });

    if (overlapping) {
      return res.status(400).json({
        success: false,
        message: 'You have overlapping leave requests for these dates'
      });
    }

    // Get covering employee name if provided
    let coveringEmployeeName = null;
    if (coveringEmployee) {
      const coveringEmp = await User.findById(coveringEmployee);
      coveringEmployeeName = coveringEmp ? coveringEmp.name : null;
    }

    const leave = new Leave({
      employeeId: req.user.userId,
      employeeName: employee.name,
      employeeEmail: employee.email,
      department: employee.department,
      leaveType,
      startDate: start,
      endDate: end,
      reason,
      emergencyContact,
      coveringEmployee,
      coveringEmployeeName,
      handoverNotes
    });

    await leave.save();

    res.status(201).json({
      success: true,
      message: 'Leave request submitted successfully',
      leave
    });
  } catch (error) {
    console.error('Error submitting leave:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Approve/Reject leave request (Admin only)
router.patch('/admin/:leaveId/status', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Admin access required' });
    }

    const { status, rejectionReason } = req.body;
    const { leaveId } = req.params;

    if (!['approved', 'rejected'].includes(status)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Status must be either approved or rejected' 
      });
    }

    const leave = await Leave.findById(leaveId);
    if (!leave) {
      return res.status(404).json({ success: false, message: 'Leave request not found' });
    }

    if (leave.status !== 'pending') {
      return res.status(400).json({ 
        success: false, 
        message: 'Can only approve/reject pending requests' 
      });
    }

    leave.status = status;
    leave.approvedBy = req.user.userId;
    leave.approvedAt = new Date();

    if (status === 'rejected' && rejectionReason) {
      leave.rejectionReason = rejectionReason;
    }

    await leave.save();

    // Populate the response
    await leave.populate('employeeId', 'name email employeeId department');
    await leave.populate('approvedBy', 'name');

    res.json({
      success: true,
      message: `Leave request ${status} successfully`,
      leave
    });
  } catch (error) {
    console.error('Error updating leave status:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Cancel leave request (Employee only)
router.patch('/:leaveId/cancel', authenticateToken, async (req, res) => {
  try {
    const { leaveId } = req.params;

    const leave = await Leave.findOne({
      _id: leaveId,
      employeeId: req.user.userId
    });

    if (!leave) {
      return res.status(404).json({ 
        success: false, 
        message: 'Leave request not found or access denied' 
      });
    }

    if (leave.status === 'cancelled') {
      return res.status(400).json({ 
        success: false, 
        message: 'Leave request is already cancelled' 
      });
    }

    if (leave.status === 'approved') {
      const today = new Date();
      const startDate = new Date(leave.startDate);
      
      // Allow cancellation only if leave hasn't started yet
      if (startDate <= today) {
        return res.status(400).json({ 
          success: false, 
          message: 'Cannot cancel leave that has already started' 
        });
      }
    }

    leave.status = 'cancelled';
    await leave.save();

    res.json({
      success: true,
      message: 'Leave request cancelled successfully',
      leave
    });
  } catch (error) {
    console.error('Error cancelling leave:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Get leave statistics (Admin only)
router.get('/admin/statistics', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Admin access required' });
    }

    const currentYear = new Date().getFullYear();
    const startOfYear = new Date(currentYear, 0, 1);
    const endOfYear = new Date(currentYear, 11, 31);

    const [
      totalRequests,
      pendingRequests,
      approvedRequests,
      rejectedRequests,
      leaveTypeStats,
      departmentStats,
      monthlyStats
    ] = await Promise.all([
      Leave.countDocuments({ createdAt: { $gte: startOfYear, $lte: endOfYear } }),
      Leave.countDocuments({ status: 'pending' }),
      Leave.countDocuments({ status: 'approved', createdAt: { $gte: startOfYear, $lte: endOfYear } }),
      Leave.countDocuments({ status: 'rejected', createdAt: { $gte: startOfYear, $lte: endOfYear } }),
      
      // Leave type statistics
      Leave.aggregate([
        { $match: { createdAt: { $gte: startOfYear, $lte: endOfYear } } },
        { $group: { _id: '$leaveType', count: { $sum: 1 }, totalDays: { $sum: '$totalDays' } } },
        { $sort: { count: -1 } }
      ]),
      
      // Department statistics
      Leave.aggregate([
        { $match: { createdAt: { $gte: startOfYear, $lte: endOfYear } } },
        { $group: { _id: '$department', count: { $sum: 1 }, totalDays: { $sum: '$totalDays' } } },
        { $sort: { count: -1 } }
      ]),
      
      // Monthly statistics
      Leave.aggregate([
        { $match: { createdAt: { $gte: startOfYear, $lte: endOfYear } } },
        {
          $group: {
            _id: { $month: '$createdAt' },
            count: { $sum: 1 },
            totalDays: { $sum: '$totalDays' }
          }
        },
        { $sort: { _id: 1 } }
      ])
    ]);

    res.json({
      success: true,
      statistics: {
        overview: {
          totalRequests,
          pendingRequests,
          approvedRequests,
          rejectedRequests
        },
        leaveTypes: leaveTypeStats,
        departments: departmentStats,
        monthlyTrends: monthlyStats
      }
    });
  } catch (error) {
    console.error('Error fetching leave statistics:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Get employees for covering employee dropdown
router.get('/employees', authenticateToken, async (req, res) => {
  try {
    const employees = await User.find({ 
      role: 'employee',
      _id: { $ne: req.user.userId } // Exclude current user
    }).select('name employeeId department');

    res.json({ success: true, employees });
  } catch (error) {
    console.error('Error fetching employees:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;