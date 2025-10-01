// middleware/authMiddleware.js
const jwt = require('jsonwebtoken');
const User = require('../models/User');

const protect = async (req, res, next) => {
  const auth = req.headers.authorization || '';
  if (!auth.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Not authorized, no token' });
  }
  const token = auth.split(' ')[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
    // Our tokens contain { userId, email, role } — not "id"
    const user = await User.findById(decoded.userId).select('-password');
    if (!user) {
      return res.status(401).json({ message: 'Not authorized, user not found' });
    }

    // Attach a normalized user object for downstream routes
    req.user = {
      id: user._id,              // for convenience
      userId: user._id,          // compatibility with existing code using req.user.userId
      email: user.email,
      role: user.role,
      department: user.department,
      name: user.name,
      employeeId: user.employeeId,
      isActive: user.isActive,
    };

    next();
  } catch (err) {
    return res.status(401).json({ message: 'Not authorized, token invalid' });
  }
};

const isAdmin = (req, res, next) => {
  // Prefer role-based check over hard-coding a single admin email
  if (req.user?.role === 'admin') return next();
  return res.status(403).json({ message: 'Admin only' });
};

module.exports = { protect, isAdmin };
