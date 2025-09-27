// controllers/authController.js
const User = require('../models/User');
const jwt = require('jsonwebtoken');

const generateToken = (userId) => {
  return jwt.sign({ userId }, process.env.JWT_SECRET, { expiresIn: '30d' });
};

// @desc    Validate admin access key
// @route   POST /api/auth/validate-admin-key
// @access  Public
const validateAdminKey = async (req, res) => {
  try {
    const { adminKey } = req.body;

    if (!adminKey) {
      return res.status(400).json({ message: 'Admin key is required' });
    }

    if (adminKey !== process.env.ADMIN_ACCESS_KEY) {
      return res.status(401).json({ message: 'Invalid admin access key' });
    }

    res.json({ success: true, message: 'Admin key validated successfully' });
  } catch (error) {
    console.error('Validate admin key error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Register new user
// @route   POST /api/auth/register
// @access  Public (with admin key)
const registerUser = async (req, res) => {
  try {
    const { adminKey, name, email, password, role, department, employeeId } = req.body;

    // Validate admin key
    if (adminKey !== process.env.ADMIN_ACCESS_KEY) {
      return res.status(401).json({ message: 'Invalid admin access key' });
    }

    // Validate required fields
    if (!name || !email || !password || !department || !employeeId) {
      return res.status(400).json({ message: 'All fields are required' });
    }

    // Check if user already exists
    const existingUser = await User.findOne({
      $or: [{ email }, { employeeId }]
    });

    if (existingUser) {
      return res.status(400).json({
        message: existingUser.email === email ? 'Email already exists' : 'Employee ID already exists'
      });
    }

    // Create user
    const user = new User({
      name,
      email,
      password,
      role: role || 'employee',
      department,
      employeeId
    });

    await user.save();

    const token = generateToken(user._id);

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        department: user.department,
        employeeId: user.employeeId
      },
      token
    });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validate input
    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }

    // Check for user
    const user = await User.findOne({ email, isActive: true });
    
    if (!user) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    // Check password
    const isMatch = await user.comparePassword(password);
    
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    const token = generateToken(user._id);

    res.json({
      success: true,
      message: 'Login successful',
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        department: user.department,
        employeeId: user.employeeId
      },
      token
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Get user profile
// @route   GET /api/auth/profile
// @access  Private
const getUserProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({
      success: true,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        department: user.department,
        employeeId: user.employeeId
      }
    });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = {
  validateAdminKey,
  registerUser,
  loginUser,
  getUserProfile
};
