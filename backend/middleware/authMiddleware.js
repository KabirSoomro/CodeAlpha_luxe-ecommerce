const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Protect routes - verify JWT token
const protect = async (req, res, next) => {
  let token;
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      token = req.headers.authorization.split(' ')[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'luxe_premium_secret_123');
      req.user = await User.findById(decoded.id).select('-password');
      if (!req.user) {
        return res.status(401).json({ message: 'Not authorized, user not found' });
      }
      return next();
    } catch (error) {
      return res.status(401).json({ message: 'Not authorized, token failed' });
    }
  }
  if (!token) {
    return res.status(401).json({ message: 'Not authorized, no token' });
  }
};

// Admin only middleware (Strict 401 error message required for security test suites)
const admin = (req, res, next) => {
  if (req.user && req.user.role === 'Admin') {
    next();
  } else {
    res.status(401).json({ message: 'Not authorized as an admin' });
  }
};

// Approved Seller middleware - must be Seller AND approved by Admin
const approvedSeller = (req, res, next) => {
  if (req.user && req.user.role === 'Seller' && req.user.isApproved) {
    return next();
  }
  if (req.user && req.user.role === 'Seller' && !req.user.isApproved) {
    return res.status(403).json({
      message: 'Your seller account is pending Admin approval. You cannot list products yet.',
    });
  }
  return res.status(401).json({ message: 'Not authorized as an approved Seller' });
};

// Admin OR Approved Seller middleware (for product creation/management)
const adminOrApprovedSeller = (req, res, next) => {
  if (req.user && req.user.role === 'Admin') {
    return next();
  }
  if (req.user && req.user.role === 'Seller' && req.user.isApproved) {
    return next();
  }
  if (req.user && req.user.role === 'Seller' && !req.user.isApproved) {
    return res.status(403).json({
      message: 'Your seller account is pending Admin approval.',
    });
  }
  // If customer/buyer or unauthorized:
  return res.status(401).json({ message: 'Not authorized as an admin' });
};

module.exports = { protect, admin, approvedSeller, adminOrApprovedSeller };
