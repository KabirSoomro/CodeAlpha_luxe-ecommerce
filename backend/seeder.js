const path = require('path');
const dotenv = require('dotenv');
const mongoose = require('mongoose');

// Load environment variables from backend or root .env
dotenv.config({ path: path.join(__dirname, '.env') });
if (!process.env.MONGO_URI) {
  dotenv.config({ path: path.join(__dirname, '../.env') });
}

const connectDB = require('./config/db');
const User = require('./models/User');
const Product = require('./models/Product');
const Order = require('./models/Order');

// Admin credentials read ONLY from environment variables — no hardcoded fallbacks
const adminEmail = process.env.ADMIN_EMAIL;
const adminPassword = process.env.ADMIN_PASSWORD;
const adminName = process.env.ADMIN_NAME || 'Luxe Administrator';

const sampleUsers = adminEmail && adminPassword ? [
  {
    name: adminName,
    email: adminEmail,
    password: adminPassword,
    role: 'Admin',
  },
] : [];

const sampleProducts = [
  {
    name: 'Rolex Submariner Date',
    image: 'https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?auto=format&fit=crop&w=800&q=80',
    brand: 'Rolex',
    category: 'Watches',
    description: 'The Oyster Perpetual Submariner Date in Oystersteel with a Cerachrom bezel insert in black ceramic and a black dial with large luminescent hour markers. Waterproof to 300 meters.',
    price: 14500.00,
    countInStock: 8,
    rating: 4.9,
    averageRating: 4.9,
    numReviews: 18,
  },
  {
    name: 'Audemars Piguet Royal Oak',
    image: 'https://images.unsplash.com/photo-1547996160-71dfabb1d2a1?auto=format&fit=crop&w=800&q=80',
    brand: 'Audemars Piguet',
    category: 'Watches',
    description: 'Selfwinding watch with date display and centre seconds. Stainless steel case, glareproofed sapphire crystal and caseback, Grande Tapisserie patterned dial, and integrated bracelet.',
    price: 29800.00,
    countInStock: 5,
    rating: 4.9,
    averageRating: 4.9,
    numReviews: 14,
  },
  {
    name: 'Cartier Love Bracelet 18K Yellow Gold',
    image: 'https://images.unsplash.com/photo-1611591475828-57d4a6a57835?auto=format&fit=crop&w=800&q=80',
    brand: 'Cartier',
    category: 'Jewelry',
    description: 'A child of 1970s New York, the LOVE collection remains today an iconic symbol of love that transgresses convention. 18K yellow gold with matching screwdriver.',
    price: 7350.00,
    countInStock: 12,
    rating: 4.8,
    averageRating: 4.8,
    numReviews: 22,
  },
  {
    name: 'Van Cleef & Arpels Vintage Alhambra Pendant',
    image: 'https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?auto=format&fit=crop&w=800&q=80',
    brand: 'Van Cleef & Arpels',
    category: 'Jewelry',
    description: 'Faithful to the very first Alhambra jewel created in 1968, the Vintage Alhambra creations by Van Cleef & Arpels are distinguished by their unique, timeless elegance with guilloché yellow gold.',
    price: 4200.00,
    countInStock: 10,
    rating: 4.8,
    averageRating: 4.8,
    numReviews: 15,
  },
  {
    name: 'Hermès Birkin 30 Togo Leather',
    image: 'https://images.unsplash.com/photo-1584917865442-de89df76afd3?auto=format&fit=crop&w=800&q=80',
    brand: 'Hermès',
    category: 'Leather Goods',
    description: 'Handcrafted from signature grained Togo calfskin with gold palladium hardware. Features double rolled top handles, clochette, lock, and keys.',
    price: 19500.00,
    countInStock: 3,
    rating: 5.0,
    averageRating: 5.0,
    numReviews: 9,
  },
  {
    name: 'Louis Vuitton Keepall Bandoulière 50',
    image: 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?auto=format&fit=crop&w=800&q=80',
    brand: 'Louis Vuitton',
    category: 'Leather Goods',
    description: 'The iconic Keepall 50 duffle bag in signature Monogram Eclipse coated canvas with natural cowhide leather trim and silver-color metallic hardware.',
    price: 2650.00,
    countInStock: 15,
    rating: 4.7,
    averageRating: 4.7,
    numReviews: 27,
  },
  {
    name: 'Tom Ford Snowdon Sunglasses',
    image: 'https://images.unsplash.com/photo-1511499767150-a48a237f0083?auto=format&fit=crop&w=800&q=80',
    brand: 'Tom Ford',
    category: 'Accessories',
    description: 'Bold vintage-inspired square acetate sunglasses featuring the signature metal T detail inserted into the temples. 100% UV protection Barberini tempered mineral glass lenses.',
    price: 495.00,
    countInStock: 20,
    rating: 4.6,
    averageRating: 4.6,
    numReviews: 19,
  },
  {
    name: 'Gucci GG Marmont Reversible Leather Belt',
    image: 'https://images.unsplash.com/photo-1624222247344-550fb60583dc?auto=format&fit=crop&w=800&q=80',
    brand: 'Gucci',
    category: 'Accessories',
    description: 'Reversible smooth Italian leather belt featuring the iconic Double G buckle in antiqued brass hardware. Reversible from black to dusty pink.',
    price: 550.00,
    countInStock: 18,
    rating: 4.8,
    averageRating: 4.8,
    numReviews: 31,
  },
  {
    name: 'Bowers & Wilkins Px8 Wireless Headphones',
    image: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=800&q=80',
    brand: 'Bowers & Wilkins',
    category: 'Accessories',
    description: 'Flagship wireless noise-cancelling headphones crafted from cast aluminium arms and fine Nappa leather. Bespoke 40mm Carbon Cone drive units deliver pristine high-resolution audio.',
    price: 699.00,
    countInStock: 14,
    rating: 4.9,
    averageRating: 4.9,
    numReviews: 42,
  },
];

const seedDefaultData = async () => {
  try {
    // Remove old demo accounts (cleanup from previous version)
    const oldDemoEmails = [
      'admin@example.com',
      'customer@example.com',
      'seller@example.com',
      'pendingseller@example.com',
    ];
    await User.deleteMany({ email: { $in: oldDemoEmails } });

    if (!adminEmail || !adminPassword) {
      console.log('[Seeder] No ADMIN_EMAIL or ADMIN_PASSWORD provided in .env. Skipping admin seed.');
      return;
    }

    // Upsert real admin account
    const existing = await User.findOne({ email: adminEmail });
    let adminUser;
    if (!existing) {
      adminUser = await User.create({
        name: adminName,
        email: adminEmail,
        password: adminPassword,
        role: 'Admin',
      });
      console.log(`[Seeder] Admin account ${adminEmail} created.`);
    } else {
      // Sync role and password if needed
      let needsSave = false;
      if (existing.role !== 'Admin') {
        existing.role = 'Admin';
        needsSave = true;
      }
      
      const bcrypt = require('bcryptjs');
      const isMatch = await bcrypt.compare(adminPassword, existing.password);
      if (!isMatch) {
        existing.password = adminPassword; // Pre-save hook will hash this
        needsSave = true;
      }
      
      if (existing.name !== adminName) {
         existing.name = adminName;
         needsSave = true;
      }

      if (needsSave) {
        await existing.save();
        console.log(`[Seeder] Admin account ${adminEmail} updated from env vars.`);
      } else {
        console.log(`[Seeder] Admin account ${adminEmail} already up to date.`);
      }
      adminUser = existing;
    }

    // Ensure admin has an accountId
    if (adminUser && !adminUser.accountId) {
      adminUser.accountId = 'Kabeer021';
      await adminUser.save();
    }

    // Populate catalog with luxury sample products if database is empty
    const productCount = await Product.countDocuments();
    if (productCount === 0) {
      const productsWithAdmin = sampleProducts.map((p) => ({
        ...p,
        user: adminUser._id,
      }));
      await Product.insertMany(productsWithAdmin);
      console.log(`[Seeder] Inserted ${productsWithAdmin.length} default luxury products.`);
    } else {
      console.log(`[Seeder] Existing catalog found with ${productCount} products.`);
    }
  } catch (error) {
    console.error(`[Seeder Error] ${error.message}`);
    throw error;
  }
};

const importData = async () => {
  try {
    await connectDB();

    // Clean existing catalog products created by sample names
    const sampleNames = sampleProducts.map((p) => p.name);
    await Product.deleteMany({ name: { $in: sampleNames } });

    // Remove old demo accounts
    const oldDemoEmails = [
      'admin@example.com',
      'customer@example.com',
      'seller@example.com',
      'pendingseller@example.com',
    ];
    await User.deleteMany({ email: { $in: oldDemoEmails } });

    if (!adminEmail || !adminPassword) {
      console.log('[Seeder] No ADMIN_EMAIL or ADMIN_PASSWORD provided in .env. Cannot import data.');
      process.exit(1);
    }

    // Upsert real admin
    let adminUser = await User.findOne({ email: adminEmail });
    if (!adminUser) {
      adminUser = await User.create({
        name: adminName,
        email: adminEmail,
        password: adminPassword,
        role: 'Admin',
      });
    }

    const productsWithAdmin = sampleProducts.map((p) => ({ ...p, user: adminUser._id }));
    await Product.insertMany(productsWithAdmin);

    console.log('✅ Luxe demo data successfully imported into MongoDB Atlas!');
    process.exit(0);
  } catch (error) {
    console.error(`❌ Error importing data: ${error.message}`);
    process.exit(1);
  }
};

const destroyData = async () => {
  try {
    await connectDB();
    await Order.deleteMany();
    await Product.deleteMany();
    await User.deleteMany();
    console.log('🗑️ All data successfully destroyed!');
    process.exit(0);
  } catch (error) {
    console.error(`❌ Error destroying data: ${error.message}`);
    process.exit(1);
  }
};

if (process.argv[2] === '-d') {
  destroyData();
} else if (require.main === module) {
  importData();
}

module.exports = { seedDefaultData, importData, destroyData, sampleProducts, sampleUsers };
