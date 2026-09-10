const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI);
    console.log(`MongoDB Connected: ${conn.connection.host}`);

    // System init: ensure real admin exists, accountId backfill, clean old demo users
    try {
      const { seedDefaultData } = require('../seeder');
      await seedDefaultData();
    } catch (seedErr) {
      console.warn('System init note:', seedErr.message);
    }

    return conn;
  } catch (error) {
    console.error(`MongoDB Connection Error: ${error.message}`);
    process.exit(1);
  }
};

module.exports = connectDB;
