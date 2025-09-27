
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { ADMIN_EMAIL } = require('../config/adminConfig');

const protect = async (req, res, next) => {
  const auth = req.headers.authorization || '';
  if (!auth.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Not authorized, no token' });
  }
  const token = auth.split(' ')[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id).select('-password');
    if (!user) return res.status(401).json({ message: 'Not authorized, user not found' });
    req.user = user;
    next();
  } catch {
    return res.status(401).json({ message: 'Not authorized, token invalid' });
  }
};

const isAdmin = (req, res, next) => {
  if (req.user?.email === ADMIN_EMAIL) return next();
  return res.status(403).json({ message: 'Admin only' });
};

module.exports = { protect, isAdmin };
