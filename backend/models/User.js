const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
    },
    password: {
      type: String,
      required: true,
    },
    role: {
      type: String,
      enum: ['Admin', 'Seller', 'Buyer', 'Customer'],
      default: 'Buyer',
    },
    // Seller-specific fields
    isApproved: {
      type: Boolean,
      default: false, // Seller must be approved by Admin before listing products
    },
    storeName: {
      type: String,
      default: '',
    },
    storeDescription: {
      type: String,
      default: '',
    },
    approvedAt: {
      type: Date,
    },
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    accountId: {
      type: String,
      unique: true,
      sparse: true,
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

userSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

userSchema.pre('save', async function (next) {
  // Auto-generate concise matching accountId if missing (e.g., Ali021, Kabeer045)
  if (!this.accountId) {
    const rawName = (this.name || 'User').trim().split(/\s+/)[0].replace(/[^a-zA-Z0-9]/g, '');
    const base = (rawName.charAt(0).toUpperCase() + rawName.slice(1).toLowerCase()) || 'User';
    
    let candidate = '';
    for (let i = 0; i < 25; i++) {
      const num = Math.floor(10 + Math.random() * 990); // 010 to 999 (2 to 3 digits)
      const suffix = num < 100 ? `0${num}` : `${num}`;
      candidate = `${base}${suffix}`;
      const existing = await mongoose.models.User.findOne({ accountId: candidate });
      if (!existing) break;
    }
    this.accountId = candidate || `${base}${Math.floor(100 + Math.random() * 900)}`;
  }

  if (!this.isModified('password')) {
    return next();
  }
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

const User = mongoose.model('User', userSchema);
module.exports = User;
