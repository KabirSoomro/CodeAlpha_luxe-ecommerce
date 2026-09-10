const Product = require('../models/Product');
const User = require('../models/User');
const Order = require('../models/Order');

// @desc    Get all products for admin
// @route   GET /api/admin/products
// @access  Private/Admin
const getAdminProducts = async (req, res) => {
  try {
    const products = await Product.find({}).populate('user', 'name email role storeName').sort({ createdAt: -1 });
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

// @desc    Get dashboard executive metrics (now includes seller stats)
// @route   GET /api/admin/metrics
// @access  Private/Admin
const getAdminMetrics = async (req, res) => {
  try {
    const totalProducts = await Product.countDocuments();
    const lowStock = await Product.countDocuments({ countInStock: { $lte: 3 } });
    const totalOrders = await Order.countDocuments();
    const paidOrders = await Order.find({ isPaid: true });
    const totalRevenue = paidOrders.reduce((acc, o) => acc + (o.totalPrice || 0), 0);

    // Seller stats
    const totalSellers = await User.countDocuments({ role: 'Seller' });
    const pendingSellers = await User.countDocuments({ role: 'Seller', isApproved: false });
    const approvedSellers = await User.countDocuments({ role: 'Seller', isApproved: true });
    const totalBuyers = await User.countDocuments({ role: 'Buyer' });

    res.json({
      totalProducts,
      lowStock,
      totalOrders,
      totalRevenue: Number(totalRevenue.toFixed(2)),
      totalSellers,
      pendingSellers,
      approvedSellers,
      totalBuyers,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get all sellers (with approval status)
// @route   GET /api/admin/sellers
// @access  Private/Admin
const getAllSellers = async (req, res) => {
  try {
    const sellers = await User.find({ role: 'Seller' })
      .select('-password')
      .sort({ createdAt: -1 });
    res.json(sellers);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Approve a seller
// @route   PUT /api/admin/sellers/:id/approve
// @access  Private/Admin
const approveSeller = async (req, res) => {
  try {
    const seller = await User.findById(req.params.id);

    if (!seller) {
      return res.status(404).json({ message: 'Seller not found' });
    }
    if (seller.role !== 'Seller') {
      return res.status(400).json({ message: 'User is not a Seller' });
    }

    seller.isApproved = true;
    seller.approvedAt = new Date();
    seller.approvedBy = req.user._id;
    await seller.save();

    res.json({
      message: `Seller "${seller.name}" has been approved successfully.`,
      seller: {
        _id: seller._id,
        accountId: seller.accountId,
        name: seller.name,
        email: seller.email,
        storeName: seller.storeName,
        isApproved: seller.isApproved,
        approvedAt: seller.approvedAt,
      },
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Reject / Revoke a seller's approval
// @route   PUT /api/admin/sellers/:id/reject
// @access  Private/Admin
const rejectSeller = async (req, res) => {
  try {
    const seller = await User.findById(req.params.id);

    if (!seller) {
      return res.status(404).json({ message: 'Seller not found' });
    }
    if (seller.role !== 'Seller') {
      return res.status(400).json({ message: 'User is not a Seller' });
    }

    seller.isApproved = false;
    seller.approvedAt = undefined;
    seller.approvedBy = undefined;
    await seller.save();

    res.json({
      message: `Seller "${seller.name}" approval has been revoked.`,
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
  getAllSellers,
  approveSeller,
  rejectSeller,
};
