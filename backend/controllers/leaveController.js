// controllers/leaveController.js
const Leave = require('../models/Leave');
const User = require('../models/User');

const leaveController = {
  // Employee: Create new leave request
  createLeave: async (req, res) => {
    try {
      const { leaveType, startDate, endDate, reason } = req.body;
      const userId = req.user.userId;

      // Validation
      if (!leaveType || !startDate || !endDate || !reason) {
        return res.status(400).json({
          success: false,
          message: 'All fields are required'
        });
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

      // Get employee details
      const employee = await User.findById(userId).select('-password');
      if (!employee) {
        return res.status(404).json({
          success: false,
          message: 'Employee not found'
        });
      }

      // Check for overlapping leave requests
      const overlappingLeave = await Leave.findOne({
        employeeId: userId,
        status: { $in: ['pending', 'approved'] },
        $or: [
          { startDate: { $lte: end }, endDate: { $gte: start } }
        ]
      });

      if (overlappingLeave) {
        return res.status(400).json({
          success: false,
          message: 'You already have a leave request for overlapping dates'
        });
      }

      // Create leave request
      const leave = new Leave({
        employeeId: userId,
        employeeName: employee.name,
        employeeEmail: employee.email,
        department: employee.department,
        leaveType,
        startDate: start,
        endDate: end,
        reason: reason.trim()
      });

      await leave.save();

      res.status(201).json({
        success: true,
        message: 'Leave request submitted successfully',
        leave
      });

    } catch (error) {
      console.error('Error creating leave:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to create leave request'
      });
    }
  },

  // Employee: Get own leave requests
  getEmployeeLeaves: async (req, res) => {
    try {
      const userId = req.user.userId;
      const { page = 1, limit = 10, status } = req.query;

      const filter = { employeeId: userId };
      if (status) filter.status = status;

      const skip = (page - 1) * limit;

      const leaves = await Leave.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit));

      const totalCount = await Leave.countDocuments(filter);

      res.json({
        success: true,
        leaves,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(totalCount / limit),
          totalCount,
          hasNext: skip + leaves.length < totalCount,
          hasPrev: page > 1
        }
      });

    } catch (error) {
      console.error('Error fetching employee leaves:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch leave requests'
      });
    }
  },

  // Employee: Cancel own leave request
  cancelLeave: async (req, res) => {
    try {
      const { id } = req.params;
      const userId = req.user.userId;

      const leave = await Leave.findOne({
        _id: id,
        employeeId: userId,
        status: 'pending'
      });

      if (!leave) {
        return res.status(404).json({
          success: false,
          message: 'Leave request not found or cannot be cancelled'
        });
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
      res.status(500).json({
        success: false,
        message: 'Failed to cancel leave request'
      });
    }
  },

  // Admin: Get all leave requests
  getAllLeaves: async (req, res) => {
    try {
      const { page = 1, limit = 10, status, department, employeeId } = req.query;

      const filter = {};
      if (status) filter.status = status;
      if (department) filter.department = department;
      if (employeeId) filter.employeeId = employeeId;

      const skip = (page - 1) * limit;

      const leaves = await Leave.find(filter)
        .populate('employeeId', 'name email department')
        .populate('reviewedBy', 'name')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit));

      const totalCount = await Leave.countDocuments(filter);

      res.json({
        success: true,
        leaves,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(totalCount / limit),
          totalCount,
          hasNext: skip + leaves.length < totalCount,
          hasPrev: page > 1
        }
      });

    } catch (error) {
      console.error('Error fetching all leaves:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch leave requests'
      });
    }
  },

  // Admin: Update leave status
  updateLeaveStatus: async (req, res) => {
    try {
      const { id } = req.params;
      const { status, rejectionReason } = req.body;
      const adminId = req.user.userId;

      if (!['approved', 'rejected'].includes(status)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid status'
        });
      }

      if (status === 'rejected' && !rejectionReason?.trim()) {
        return res.status(400).json({
          success: false,
          message: 'Rejection reason is required'
        });
      }

      const leave = await Leave.findOne({
        _id: id,
        status: 'pending'
      });

      if (!leave) {
        return res.status(404).json({
          success: false,
          message: 'Leave request not found or already processed'
        });
      }

      // Update leave status
      leave.status = status;
      leave.reviewedBy = adminId;
      leave.reviewedAt = new Date();
      
      if (status === 'rejected') {
        leave.rejectionReason = rejectionReason.trim();
      }

      await leave.save();

      // Populate the updated leave for response
      await leave.populate('reviewedBy', 'name');

      res.json({
        success: true,
        message: `Leave request ${status} successfully`,
        leave
      });

    } catch (error) {
      console.error('Error updating leave status:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update leave status'
      });
    }
  },

  // Admin: Get leave statistics
  getLeaveStatistics: async (req, res) => {
    try {
      const { year, month, department } = req.query;
      
      // Build date filter
      const dateFilter = {};
      if (year) {
        const startYear = new Date(year, 0, 1);
        const endYear = new Date(year, 11, 31);
        dateFilter.createdAt = { $gte: startYear, $lte: endYear };
      }
      if (month && year) {
        const startMonth = new Date(year, month - 1, 1);
        const endMonth = new Date(year, month, 0);
        dateFilter.createdAt = { $gte: startMonth, $lte: endMonth };
      }

      // Build base filter
      const baseFilter = { ...dateFilter };
      if (department) baseFilter.department = department;

      // Get overview statistics
      const overview = await Leave.aggregate([
        { $match: baseFilter },
        {
          $group: {
            _id: null,
            totalRequests: { $sum: 1 },
            pendingRequests: {
              $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] }
            },
            approvedRequests: {
              $sum: { $cond: [{ $eq: ['$status', 'approved'] }, 1, 0] }
            },
            rejectedRequests: {
              $sum: { $cond: [{ $eq: ['$status', 'rejected'] }, 1, 0] }
            },
            cancelledRequests: {
              $sum: { $cond: [{ $eq: ['$status', 'cancelled'] }, 1, 0] }
            },
            totalDaysRequested: { $sum: '$totalDays' }
          }
        }
      ]);

      // Get statistics by leave type
      const byLeaveType = await Leave.aggregate([
        { $match: baseFilter },
        {
          $group: {
            _id: '$leaveType',
            count: { $sum: 1 },
            totalDays: { $sum: '$totalDays' }
          }
        },
        { $sort: { count: -1 } }
      ]);

      // Get statistics by department
      const byDepartment = await Leave.aggregate([
        { $match: baseFilter },
        {
          $group: {
            _id: '$department',
            count: { $sum: 1 },
            pending: {
              $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] }
            },
            approved: {
              $sum: { $cond: [{ $eq: ['$status', 'approved'] }, 1, 0] }
            },
            rejected: {
              $sum: { $cond: [{ $eq: ['$status', 'rejected'] }, 1, 0] }
            }
          }
        },
        { $sort: { count: -1 } }
      ]);

      // Get monthly trends for the current year
      const currentYear = new Date().getFullYear();
      const monthlyTrends = await Leave.aggregate([
        {
          $match: {
            createdAt: {
              $gte: new Date(currentYear, 0, 1),
              $lte: new Date(currentYear, 11, 31)
            },
            ...(department && { department })
          }
        },
        {
          $group: {
            _id: { $month: '$createdAt' },
            count: { $sum: 1 },
            approved: {
              $sum: { $cond: [{ $eq: ['$status', 'approved'] }, 1, 0] }
            }
          }
        },
        { $sort: { _id: 1 } }
      ]);

      res.json({
        success: true,
        statistics: {
          overview: overview[0] || {
            totalRequests: 0,
            pendingRequests: 0,
            approvedRequests: 0,
            rejectedRequests: 0,
            cancelledRequests: 0,
            totalDaysRequested: 0
          },
          byLeaveType,
          byDepartment,
          monthlyTrends
        }
      });

    } catch (error) {
      console.error('Error fetching leave statistics:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch leave statistics'
      });
    }
  },

  // Get leave balance for an employee
  getLeaveBalance: async (req, res) => {
    try {
      const userId = req.user.userId;
      const currentYear = new Date().getFullYear();

      // Calculate used leave days this year
      const usedLeave = await Leave.aggregate([
        {
          $match: {
            employeeId: mongoose.Types.ObjectId(userId),
            status: 'approved',
            startDate: {
              $gte: new Date(currentYear, 0, 1),
              $lte: new Date(currentYear, 11, 31)
            }
          }
        },
        {
          $group: {
            _id: '$leaveType',
            totalDays: { $sum: '$totalDays' }
          }
        }
      ]);

      // Default leave allowances (you can make this configurable)
      const allowances = {
        annual: 21,
        sick: 10,
        personal: 5,
        maternity: 90,
        paternity: 10,
        emergency: 3,
        unpaid: 999 // Unlimited
      };

      const balance = {};
      Object.keys(allowances).forEach(type => {
        const used = usedLeave.find(u => u._id === type)?.totalDays || 0;
        balance[type] = {
          allowed: allowances[type],
          used,
          remaining: allowances[type] === 999 ? 999 : allowances[type] - used
        };
      });

      res.json({
        success: true,
        balance,
        year: currentYear
      });

    } catch (error) {
      console.error('Error fetching leave balance:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch leave balance'
      });
    }
  }
};

module.exports = leaveController;