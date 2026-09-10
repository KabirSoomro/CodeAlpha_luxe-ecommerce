const User = require('../models/User');
const jwt = require('jsonwebtoken');

const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET || 'luxe_premium_secret_123', {
    expiresIn: '30d',
  });
};

// @desc    Register a new user (Buyer or Seller)
// @route   POST /api/auth/register
// @access  Public
const registerUser = async (req, res) => {
  try {
    const { name, email, password, role, storeName, storeDescription } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ message: 'Please provide name, email, and password' });
    }

    const cleanEmail = email.trim().toLowerCase();
    const cleanName = name.trim();
    const cleanPassword = password.trim();

    const userExists = await User.findOne({
      email: { $regex: new RegExp(`^${cleanEmail}$`, 'i') },
    });

    if (userExists) {
      return res.status(400).json({ message: 'User already exists with this email' });
    }

    // Only allow Buyer or Seller registration via this endpoint (Admin must be set manually)
    const allowedRoles = ['Buyer', 'Seller'];
    const assignedRole = allowedRoles.includes(role) ? role : 'Buyer';

    const userData = {
      name: cleanName,
      email: cleanEmail,
      password: cleanPassword,
      role: assignedRole,
    };

    // If registering as Seller, capture store info
    if (assignedRole === 'Seller') {
      userData.storeName = storeName ? storeName.trim() : `${cleanName}'s Boutique`;
      userData.storeDescription = storeDescription ? storeDescription.trim() : '';
      userData.isApproved = false; // Must be approved by Admin
    }

    const user = await User.create(userData);

    if (user) {
      res.status(201).json({
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        isApproved: user.isApproved,
        storeName: user.storeName,
        token: generateToken(user._id),
      });
    } else {
      res.status(400).json({ message: 'Invalid user data' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Auth user & get token (Robust trimming & case-insensitive matching)
// @route   POST /api/auth/login
// @access  Public
const authUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Please provide both email and password' });
    }

    const cleanEmail = String(email).trim();
    const cleanPassword = String(password).trim();

    // Case-insensitive lookup prevents common mobile / auto-capitalization login rejections
    const user = await User.findOne({
      email: { $regex: new RegExp(`^${cleanEmail}$`, 'i') },
    });

    if (user && (await user.matchPassword(cleanPassword))) {
      res.json({
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        isApproved: user.isApproved,
        storeName: user.storeName,
        storeDescription: user.storeDescription,
        token: generateToken(user._id),
      });
    } else {
      res.status(401).json({ message: 'Invalid email or password' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get user profile
// @route   GET /api/auth/profile
// @access  Private
const getUserProfile = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.json({
      _id: req.user._id,
      name: req.user.name,
      email: req.user.email,
      role: req.user.role,
      isApproved: req.user.isApproved,
      storeName: req.user.storeName,
      storeDescription: req.user.storeDescription,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  registerUser,
  authUser,
  getUserProfile,
  generateToken,
};
