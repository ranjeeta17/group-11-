const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const User = require('./models/User');
const Leave = require('./models/Leave'); // Import Leave model

// Fix mongoose deprecation warning
mongoose.set('strictQuery', false);

const app = express();

// --- Middleware ---
app.use(cors({
  origin: "http://localhost:3000",   // React app
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: true
}));

// Respond to preflight requests
app.options("*", cors());

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Debug requests
app.use((req, res, next) => {
  console.log(`🌐 ${new Date().toISOString()} - ${req.method} ${req.path}`);
  if (req.method === 'OPTIONS') {
    console.log('🔄 OPTIONS request detected');
  }
  next();
});

// JWT Auth middleware
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

// Admin check middleware
const requireAdmin = (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ success: false, message: 'Admin access required' });
  }
  next();
};

// --- Routes ---
// Test route
app.get('/api/auth/test', (req, res) => {
  res.json({ message: 'Auth API is working!' });
});

// Register route
app.post('/api/auth/register', async (req, res) => {
  try {
    const { email, password, name, role, department, employeeId } = req.body;
    console.log("this is the data", req.body);
    
    if (!email || !password || !name || !department || !employeeId) {
      return res.status(400).json({
        success: false,
        message: 'All fields (name, email, password, department, employeeId) are required'
      });
    }

    // Check if user exists
    const existingUser = await User.findOne({ $or: [{ email }, { employeeId }] });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'User already exists with this email or employeeId'
      });
    }

    const user = new User({
      email,
      password, // password will be hashed by pre-save hook
      name,
      role: role || 'employee',
      department,
      employeeId,
      isActive: true
    });

    await user.save();

    // Generate JWT
    const token = jwt.sign(
      { userId: user._id, email: user.email, role: user.role },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '24h' }
    );

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      token,
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        role: user.role,
        department: user.department,
        employeeId: user.employeeId,
        isActive: user.isActive
      }
    });

  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ success: false, message: 'Server error during registration' });
  }
});

// Login route
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email and password are required' });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    // Check if user is active
    if (!user.isActive) {
      return res.status(401).json({ success: false, message: 'Account is deactivated. Please contact administrator.' });
    }

    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    const token = jwt.sign(
      { userId: user._id, email: user.email, role: user.role },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '24h' }
    );

    res.json({
      success: true,
      message: 'Login successful',
      token,
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        role: user.role,
        department: user.department,
        employeeId: user.employeeId,
        isActive: user.isActive
      }
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ success: false, message: 'Server error during login' });
  }
});

// Admin key validation
app.post('/api/auth/validate-admin-key', (req, res) => {
  try {
    console.log('Raw request body:', req.body);
    console.log('Request headers:', req.headers);
    
    const { adminKey } = req.body;
    console.log('Extracted adminKey:', adminKey);

    if (!adminKey) {
      console.log('No adminKey found in request');
      return res.status(400).json({ success: false, message: 'Admin key is required' });
    }

    const validAdminKey = process.env.ADMIN_KEY || 'ADMIN-SECRET-2024';
    console.log('Valid key should be:', validAdminKey);
    
    if (adminKey === validAdminKey) {
      return res.json({ success: true, message: 'Valid admin key' });
    }

    return res.status(400).json({ success: false, message: 'Invalid admin access key' });
  } catch (err) {
    console.log(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Protected profile route
app.get('/api/auth/profile', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId).select('-password');
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    res.json({ success: true, user });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// --- EMPLOYEE MANAGEMENT ROUTES ---

// Get all employees with filters
app.get('/api/auth/employees', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { department, role, isActive } = req.query;
    
    // Build filter object
    const filter = {};
    if (department && department !== '') filter.department = department;
    if (role && role !== '') filter.role = role;
    if (isActive !== '' && isActive !== undefined) filter.isActive = isActive === 'true';

    const employees = await User.find(filter)
      .select('-password')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      employees
    });

  } catch (error) {
    console.error('Error fetching employees:', error);
    res.status(500).json({ success: false, message: 'Server error while fetching employees' });
  }
});

// Add new employee
app.post('/api/auth/employees', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { email, password, name, role, department, employeeId } = req.body;
    
    if (!email || !password || !name || !department || !employeeId) {
      return res.status(400).json({
        success: false,
        message: 'All fields (name, email, password, department, employeeId) are required'
      });
    }

    // Check if user exists
    const existingUser = await User.findOne({ $or: [{ email }, { employeeId }] });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'Employee already exists with this email or employee ID'
      });
    }

    const employee = new User({
      email,
      password, // Will be hashed by pre-save hook
      name,
      role: role || 'employee',
      department,
      employeeId,
      isActive: true
    });

    await employee.save();

    // Return employee data without password
    const employeeData = await User.findById(employee._id).select('-password');

    res.status(201).json({
      success: true,
      message: 'Employee added successfully',
      employee: employeeData
    });

  } catch (error) {
    console.error('Error adding employee:', error);
    res.status(500).json({ success: false, message: 'Server error while adding employee' });
  }
});

// Update employee
app.put('/api/auth/employees/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { email, password, name, role, department, employeeId } = req.body;

    if (!email || !name || !department || !employeeId) {
      return res.status(400).json({
        success: false,
        message: 'Name, email, department, and employee ID are required'
      });
    }

    // Check if email or employeeId conflicts with other users
    const existingUser = await User.findOne({ 
      $and: [
        { _id: { $ne: id } },
        { $or: [{ email }, { employeeId }] }
      ]
    });

    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'Another employee already exists with this email or employee ID'
      });
    }

    const updateData = {
      email,
      name,
      role: role || 'employee',
      department,
      employeeId
    };

    // Only update password if provided
    if (password && password.trim() !== '') {
      updateData.password = password;
    }

    const employee = await User.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    ).select('-password');

    if (!employee) {
      return res.status(404).json({ success: false, message: 'Employee not found' });
    }

    res.json({
      success: true,
      message: 'Employee updated successfully',
      employee
    });

  } catch (error) {
    console.error('Error updating employee:', error);
    res.status(500).json({ success: false, message: 'Server error while updating employee' });
  }
});

// Toggle employee status (activate/deactivate)
app.patch('/api/auth/employees/:id/toggle-status', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { isActive } = req.body;

    const employee = await User.findByIdAndUpdate(
      id,
      { isActive },
      { new: true }
    ).select('-password');

    if (!employee) {
      return res.status(404).json({ success: false, message: 'Employee not found' });
    }

    res.json({
      success: true,
      message: `Employee ${isActive ? 'activated' : 'deactivated'} successfully`,
      employee
    });

  } catch (error) {
    console.error('Error toggling employee status:', error);
    res.status(500).json({ success: false, message: 'Server error while updating employee status' });
  }
});

// Delete employee
app.delete('/api/auth/employees/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    // Prevent admin from deleting themselves
    if (id === req.user.userId) {
      return res.status(400).json({
        success: false,
        message: 'You cannot delete your own account'
      });
    }

    const employee = await User.findByIdAndDelete(id);

    if (!employee) {
      return res.status(404).json({ success: false, message: 'Employee not found' });
    }

    res.json({
      success: true,
      message: 'Employee deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting employee:', error);
    res.status(500).json({ success: false, message: 'Server error while deleting employee' });
  }
});

// --- LEAVE MANAGEMENT ROUTES ---

// Helper function to calculate working days
const calculateWorkingDays = (startDate, endDate) => {
  const start = new Date(startDate);
  const end = new Date(endDate);
  let workingDays = 0;
  
  for (let date = new Date(start); date <= end; date.setDate(date.getDate() + 1)) {
    const dayOfWeek = date.getDay();
    if (dayOfWeek !== 0 && dayOfWeek !== 6) { // Not Sunday or Saturday
      workingDays++;
    }
  }
  
  return workingDays;
};

// Employee: Create new leave request
app.post('/api/leaves', authenticateToken, async (req, res) => {
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

    // Calculate working days
    const totalDays = calculateWorkingDays(start, end);

    // Create leave request
    const leave = new Leave({
      employeeId: userId,
      employeeName: employee.name,
      employeeEmail: employee.email,
      department: employee.department,
      leaveType,
      startDate: start,
      endDate: end,
      totalDays,
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
});

// Employee: Get own leave requests
app.get('/api/leaves/my-leaves', authenticateToken, async (req, res) => {
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
});

// Employee: Cancel own leave request
app.patch('/api/leaves/:id/cancel', authenticateToken, async (req, res) => {
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
});

// Employee: Get leave balance
app.get('/api/leaves/balance', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const currentYear = new Date().getFullYear();

    // Calculate used leave days this year
    const usedLeave = await Leave.aggregate([
      {
        $match: {
          employeeId: new mongoose.Types.ObjectId(userId),
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

    // Default leave allowances
    const allowances = {
      annual: 21,
      sick: 10,
      personal: 5,
      maternity: 90,
      paternity: 10,
      emergency: 3,
      unpaid: 999
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
});

// Admin: Get all leave requests
app.get('/api/leaves/admin/leaves', authenticateToken, requireAdmin, async (req, res) => {
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
});

// Admin: Update leave status
app.patch('/api/leaves/admin/:id/status', authenticateToken, requireAdmin, async (req, res) => {
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
});

// Admin: Get leave statistics
app.get('/api/leaves/admin/statistics', authenticateToken, requireAdmin, async (req, res) => {
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
        }
      }
    });

  } catch (error) {
    console.error('Error fetching leave statistics:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch leave statistics'
    });
  }
});

// Logout route
app.post('/api/auth/logout', (req, res) => {
  res.json({ success: true, message: 'Logout successful' });
});

// Health route
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString(), uptime: process.uptime() });
});

// --- Database Connection ---
mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/attendance_system', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(async () => {
  console.log('✅ Connected to MongoDB');
  await createDefaultUsers();
})
.catch(err => console.error('❌ MongoDB connection error:', err));

// --- Create default users ---
async function createDefaultUsers() {
  try {
    const adminExists = await User.findOne({ role: 'admin' });
    if (!adminExists) {
      const admin = new User({
        email: 'admin@company.com',
        password: 'admin123',
        name: 'System Admin',
        role: 'admin',
        department: 'IT',
        employeeId: 'A0001',
        isActive: true
      });
      await admin.save();
      console.log('🔧 Default admin created: admin@company.com / admin123');
    }

    const employeeExists = await User.findOne({ role: 'employee' });
    if (!employeeExists) {
      const employee = new User({
        email: 'employee@company.com',
        password: 'emp123',
        name: 'Default Employee',
        role: 'employee',
        department: 'HR',
        employeeId: 'E0001',
        isActive: true
      });
      await employee.save();
      console.log('🔧 Default employee created: employee@company.com / emp123');
    }
  } catch (err) {
    console.error('Error creating default users:', err);
  }
}

// --- Start Server ---
const PORT = process.env.PORT || 5001;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📍 API available at: http://localhost:${PORT}`);
  console.log(`📋 Leave Management API: http://localhost:${PORT}/api/leaves`);
});