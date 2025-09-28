const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const User = require('./models/User'); // 👈 Import your User model

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
      employeeId
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
        employeeId: user.employeeId
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
});
