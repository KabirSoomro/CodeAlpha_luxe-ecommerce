const Product = require('../models/Product');

// @desc    Fetch all products with keyword, category, and sort support
// @route   GET /api/products
// @access  Public
const getProducts = async (req, res) => {
  try {
    const keyword = req.query.keyword
      ? { name: { $regex: req.query.keyword, $options: 'i' } }
      : {};

    const category =
      req.query.category && req.query.category.toLowerCase() !== 'all'
        ? { category: req.query.category }
        : {};

    let sortOption = { createdAt: -1 };
    if (req.query.sort === 'price_asc') sortOption = { price: 1 };
    else if (req.query.sort === 'price_desc') sortOption = { price: -1 };
    else if (req.query.sort === 'top_rated') sortOption = { averageRating: -1 };
    else if (req.query.sort === 'newest') sortOption = { createdAt: -1 };

    const products = await Product.find({ ...keyword, ...category })
      .populate('user', 'name storeName')
      .sort(sortOption);
    res.json(products);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Fetch single product by ID
// @route   GET /api/products/:id
// @access  Public
const getProductById = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id).populate('user', 'name storeName');
    if (product) {
      res.json(product);
    } else {
      res.status(404).json({ message: 'Product not found' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Create a product (Admin OR Approved Seller)
// @route   POST /api/products
// @access  Private/Admin or ApprovedSeller
const createProduct = async (req, res) => {
  try {
    const { name, price, description, image, brand, category, countInStock } = req.body;

    const product = new Product({
      user: req.user._id,
      name: name || 'Sample Product',
      price: price !== undefined ? Number(price) : 0,
      description: description || 'Sample luxury description',
      image: image || 'https://images.unsplash.com/photo-1523275335684-37898b6baf30',
      brand: brand || 'LUXE',
      category: category || 'Accessories',
      countInStock: countInStock !== undefined ? Number(countInStock) : 0,
      numReviews: 0,
      averageRating: 0,
      rating: 0,
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

// @desc    Update a product
// @route   PUT /api/products/:id
// @access  Private/Admin or Owner Seller
const updateProduct = async (req, res) => {
  try {
    const { name, price, description, image, brand, category, countInStock } = req.body;
    const product = await Product.findById(req.params.id);

    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    // Sellers can only edit their own products
    if (req.user.role === 'Seller' && product.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'You can only edit your own products' });
    }

    if (name !== undefined) product.name = name;
    if (price !== undefined) product.price = Number(price);
    if (description !== undefined) product.description = description;
    if (image !== undefined) product.image = image;
    if (brand !== undefined) product.brand = brand;
    if (category !== undefined) product.category = category;
    if (countInStock !== undefined) product.countInStock = Number(countInStock);

    const updatedProduct = await product.save();

    const io = req.app.get('io') || req.io;
    if (io && countInStock !== undefined) {
      io.emit('stockUpdate', {
        productId: updatedProduct._id.toString(),
        countInStock: updatedProduct.countInStock,
        newStock: updatedProduct.countInStock,
      });
    }

    res.json(updatedProduct);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Delete a product
// @route   DELETE /api/products/:id
// @access  Private/Admin or Owner Seller
const deleteProduct = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    // Sellers can only delete their own products
    if (req.user.role === 'Seller' && product.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'You can only delete your own products' });
    }

    await Product.deleteOne({ _id: req.params.id });
    res.json({ message: 'Product removed' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get seller's own products
// @route   GET /api/products/my-products
// @access  Private/ApprovedSeller
const getMyProducts = async (req, res) => {
  try {
    const products = await Product.find({ user: req.user._id }).sort({ createdAt: -1 });
    res.json(products);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Create new review
// @route   POST /api/products/:id/review
// @access  Private
const createProductReview = async (req, res) => {
  try {
    const { rating, comment } = req.body;
    const product = await Product.findById(req.params.id);

    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    const alreadyReviewed = product.reviews.find(
      (r) => r.user.toString() === req.user._id.toString()
    );

    if (alreadyReviewed) {
      return res.status(400).json({ message: 'Product already reviewed' });
    }

    const review = {
      user: req.user._id,
      name: req.user.name,
      rating: Number(rating),
      comment: comment || '',
    };

    product.reviews.push(review);
    product.numReviews = product.reviews.length;
    const totalScore = product.reviews.reduce((acc, item) => item.rating + acc, 0);
    product.averageRating = totalScore / product.reviews.length;
    product.rating = product.averageRating;

    await product.save();
    res.status(201).json({ message: 'Review added' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  getProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
  getMyProducts,
  createProductReview,
};
