
// controllers/dashboardController.js
const User = require('../models/User');

// @desc    Get admin dashboard data
// @route   GET /api/dashboard/admin
// @access  Private (Admin only)
const getAdminDashboard = async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied. Admin only.' });
    }

    // Get dashboard statistics
    const totalEmployees = await User.countDocuments({ role: 'employee', isActive: true });
    const totalAdmins = await User.countDocuments({ role: 'admin', isActive: true });
    const recentUsers = await User.find({ isActive: true })
      .select('name email role department createdAt')
      .sort({ createdAt: -1 })
      .limit(5);

    res.json({
      success: true,
      data: {
        stats: {
          totalEmployees,
          totalAdmins,
          totalUsers: totalEmployees + totalAdmins
        },
        recentUsers
      }
    });
  } catch (error) {
    console.error('Admin dashboard error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Get employee dashboard data
// @route   GET /api/dashboard/employee
// @access  Private (Employee only)
const getEmployeeDashboard = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({
      success: true,
      data: {
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          department: user.department,
          employeeId: user.employeeId
        },
        stats: {
          // Add employee-specific stats here
          attendanceRate: 95,
          leavesUsed: 3,
          leavesRemaining: 18
        }
      }
    });
  } catch (error) {
    console.error('Employee dashboard error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = {
  getAdminDashboard,
  getEmployeeDashboard
};