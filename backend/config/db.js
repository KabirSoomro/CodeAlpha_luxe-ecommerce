const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI);
    console.log(`MongoDB Connected: ${conn.connection.host}`);

    // Auto-seed demo accounts (Admin, Approved Seller, Pending Seller, Buyer) if Admin is missing
    try {
      const User = require('../models/User');
      const adminUser = await User.findOne({ email: 'admin@example.com' });
      if (!adminUser) {
        console.log('🔄 Initializing database: Auto-seeding default luxury accounts & inventory...');
        const { seedDefaultData } = require('../seeder');
        await seedDefaultData();
        console.log('✅ Demo accounts & luxury products successfully initialized in database!');
      }
    } catch (seedErr) {
      console.warn('Auto-seed check note:', seedErr.message);
    }

    return conn;
  } catch (error) {
    console.error(`MongoDB Connection Error: ${error.message}`);
    process.exit(1);
  }
};

module.exports = connectDB;
