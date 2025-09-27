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
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
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

// --- Routes ---
// Test route
app.get('/api/auth/test', (req, res) => {
  res.json({ message: 'Auth API is working!' });
});

// Register route
app.post('/api/auth/register', async (req, res) => {
  try {
    const { email, password, name, role = 'employee', department, employeeId } = req.body;

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
      role,
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
        employeeId: user.employeeId
      }
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ success: false, message: 'Server error during login' });
  }
});

app.post('/api/auth/validate-admin-key', (req, res) => {
  const { key } = req.body;

  if (!key) {
    return res.status(400).json({ success: false, message: 'Admin key is required' });
  }

  if (key === process.env.ADMIN_KEY) {
    return res.json({ success: true, message: 'Valid admin key' });
  }

  return res.status(400).json({ success: false, message: 'Invalid admin access key' });
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
        employeeId: 'A0001'
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
        employeeId: 'E0001'
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
