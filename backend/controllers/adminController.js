const Product = require('../models/Product');
const Order = require('../models/Order');

// @desc    Get all products for admin
// @route   GET /api/admin/products
// @access  Private/Admin
const getAdminProducts = async (req, res) => {
  try {
    const products = await Product.find({}).sort({ createdAt: -1 });
    res.json(products);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get all orders for admin
// @route   GET /api/admin/orders
// @access  Private/Admin
const getAdminOrders = async (req, res) => {
  try {
    const orders = await Order.find({})
      .populate('user', 'name email')
      .sort({ createdAt: -1 });
    res.json(orders);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Create a product (admin alias)
// @route   POST /api/admin/products
// @access  Private/Admin
const createAdminProduct = async (req, res) => {
  try {
    const { name, price, description, image, brand, category, countInStock } = req.body;

    const product = new Product({
      user: req.user._id,
      name: name || 'Sample Luxury Product',
      price: price !== undefined ? Number(price) : 0,
      description: description || 'High-end luxury item description.',
      image: image || 'https://images.unsplash.com/photo-1523275335684-37898b6baf30',
      brand: brand || 'LUXE',
      category: category || 'Accessories',
      countInStock: countInStock !== undefined ? Number(countInStock) : 0,
    });

    const createdProduct = await product.save();

    const io = req.app.get('io') || req.io;
    if (io) {
      io.emit('stockUpdate', {
        productId: createdProduct._id.toString(),
        countInStock: createdProduct.countInStock,
        newStock: createdProduct.countInStock,
      });
    }

    res.status(201).json(createdProduct);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get dashboard executive metrics
// @route   GET /api/admin/metrics
// @access  Private/Admin
const getAdminMetrics = async (req, res) => {
  try {
    const totalProducts = await Product.countDocuments();
    const lowStock = await Product.countDocuments({ countInStock: { $lte: 3 } });
    const totalOrders = await Order.countDocuments();
    const paidOrders = await Order.find({ isPaid: true });
    const totalRevenue = paidOrders.reduce((acc, o) => acc + (o.totalPrice || 0), 0);

    res.json({
      totalProducts,
      lowStock,
      totalOrders,
      totalRevenue: Number(totalRevenue.toFixed(2)),
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  getAdminProducts,
  getAdminOrders,
  createAdminProduct,
  getAdminMetrics,
};
