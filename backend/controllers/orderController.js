const Order = require('../models/Order');
const Product = require('../models/Product');

// @desc    Create new order with atomic CAS decrement and multi-item rollback
// @route   POST /api/orders
// @access  Private
const addOrderItems = async (req, res) => {
  const decrementedItems = [];
  try {
    const { orderItems, shippingAddress, paymentMethod, totalPrice } = req.body;

    // 1. Validation: ensure non-empty order items array
    if (!orderItems || !Array.isArray(orderItems) || orderItems.length === 0) {
      return res.status(400).json({ message: 'No order items' });
    }

    // 2. Validation: ensure each item has valid positive integer quantity
    for (const item of orderItems) {
      if (
        !item.qty ||
        typeof item.qty !== 'number' ||
        item.qty <= 0 ||
        !Number.isInteger(item.qty)
      ) {
        return res.status(400).json({
          message: 'Invalid item quantity. Must be a positive integer.',
        });
      }
      if (!item.product) {
        return res.status(400).json({
          message: 'Product ID is required for each item.',
        });
      }
    }

    const io = req.app.get('io') || req.io;

    // 3. Concurrency-safe atomic conditional decrement (Compare-And-Swap)
    for (const item of orderItems) {
      const productId = item.product;

      const updatedProduct = await Product.findOneAndUpdate(
        { _id: productId, countInStock: { $gte: item.qty } },
        { $inc: { countInStock: -item.qty } },
        { new: true }
      );

      if (!updatedProduct) {
        // Multi-item compensation rollback: revert all previously decremented items
        for (const rolled of decrementedItems) {
          const restoredProduct = await Product.findOneAndUpdate(
            { _id: rolled.product },
            { $inc: { countInStock: rolled.qty } },
            { new: true }
          );

          if (io && restoredProduct) {
            io.emit('stockUpdate', {
              productId: rolled.product.toString(),
              countInStock: restoredProduct.countInStock,
              newStock: restoredProduct.countInStock,
            });
          }
        }

        return res.status(400).json({
          message: `Insufficient stock for item: ${item.name || productId}. Order cancelled.`,
        });
      }

      decrementedItems.push({
        product: productId,
        qty: item.qty,
        newStock: updatedProduct.countInStock,
        sellerId: updatedProduct.user, // Track seller from product
      });
    }

    // Determine seller from first product (single seller per order for now)
    const sellerIdFromProduct = decrementedItems[0]?.sellerId;

    // 4. Create and save order in MongoDB
    const order = new Order({
      orderItems,
      user: req.user._id,
      seller: sellerIdFromProduct || null,
      shippingAddress: shippingAddress || {
        address: '123 Luxe Blvd',
        city: 'Karachi',
        postalCode: '75500',
        country: 'Pakistan',
      },
      paymentMethod: paymentMethod || 'CashOnDelivery',
      totalPrice: totalPrice !== undefined ? Number(totalPrice) : 0,
      isPaid: true,
      paidAt: Date.now(),
      orderStatus: 'Order Placed',
      statusHistory: [{ status: 'Order Placed', updatedAt: new Date(), note: 'Order successfully placed' }],
    });

    const createdOrder = await order.save();

    // 5. Broadcast real-time stock update for all decremented items
    if (io) {
      for (const dec of decrementedItems) {
        io.emit('stockUpdate', {
          productId: dec.product.toString(),
          countInStock: dec.newStock,
          newStock: dec.newStock,
        });
      }
      // Notify seller of new order
      io.emit('newOrder', {
        orderId: createdOrder._id.toString(),
        sellerId: sellerIdFromProduct ? sellerIdFromProduct.toString() : null,
        orderStatus: 'Order Placed',
      });
    }

    res.status(201).json(createdOrder);
  } catch (error) {
    // If order creation failed after decrement, rollback decremented stock
    const io = req.app.get('io') || req.io;
    for (const rolled of decrementedItems) {
      const restoredProduct = await Product.findOneAndUpdate(
        { _id: rolled.product },
        { $inc: { countInStock: rolled.qty } },
        { new: true }
      );
      if (io && restoredProduct) {
        io.emit('stockUpdate', {
          productId: rolled.product.toString(),
          countInStock: restoredProduct.countInStock,
          newStock: restoredProduct.countInStock,
        });
      }
    }
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get logged in user orders
// @route   GET /api/orders/myorders
// @access  Private
const getMyOrders = async (req, res) => {
  try {
    const orders = await Order.find({ user: req.user._id }).sort({ createdAt: -1 });
    res.json(orders);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get a single order by ID (buyer can see their own, seller/admin can see all)
// @route   GET /api/orders/:id
// @access  Private
const getOrderById = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id).populate('user', 'name email');
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }
    // Allow buyer to see their own orders, admin/seller to see any
    const isOwner = order.user._id.toString() === req.user._id.toString();
    const isAdminOrSeller = req.user.role === 'Admin' || (req.user.role === 'Seller' && req.user.isApproved);
    if (!isOwner && !isAdminOrSeller) {
      return res.status(401).json({ message: 'Not authorized to view this order' });
    }
    res.json(order);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get all orders for the logged-in seller's products
// @route   GET /api/orders/sellerorders
// @access  Private/ApprovedSeller
const getSellerOrders = async (req, res) => {
  try {
    // Find orders where seller field matches OR where any orderItem product belongs to this seller
    const sellerProducts = await Product.find({ user: req.user._id }).select('_id');
    const sellerProductIds = sellerProducts.map(p => p._id);

    const orders = await Order.find({
      $or: [
        { seller: req.user._id },
        { 'orderItems.product': { $in: sellerProductIds } },
      ],
    })
      .populate('user', 'name email')
      .sort({ createdAt: -1 });

    res.json(orders);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Update order status (Seller or Admin)
// @route   PUT /api/orders/:id/status
// @access  Private/ApprovedSeller or Admin
const updateOrderStatus = async (req, res) => {
  try {
    const { status, note } = req.body;
    const validStatuses = ['Order Placed', 'Processing', 'Pack Ready', 'Shipped', 'Out for Delivery', 'Delivered'];

    if (!status || !validStatuses.includes(status)) {
      return res.status(400).json({ message: `Invalid status. Must be one of: ${validStatuses.join(', ')}` });
    }

    const order = await Order.findById(req.params.id);
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    order.orderStatus = status;
    order.statusHistory.push({ status, updatedAt: new Date(), note: note || '' });

    // Auto-set isDelivered when status is Delivered
    if (status === 'Delivered') {
      order.isDelivered = true;
      order.deliveredAt = Date.now();
    }

    const updatedOrder = await order.save();

    // Real-time broadcast to buyer
    const io = req.app.get('io') || req.io;
    if (io) {
      io.emit('orderStatusUpdate', {
        orderId: order._id.toString(),
        orderStatus: status,
        statusHistory: order.statusHistory,
        updatedAt: new Date().toISOString(),
      });
    }

    res.json(updatedOrder);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get all orders
// @route   GET /api/orders
// @access  Private/Admin
const getAllOrders = async (req, res) => {
  try {
    const orders = await Order.find({})
      .populate('user', 'name email')
      .sort({ createdAt: -1 });
    res.json(orders);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Update order to delivered
// @route   PUT /api/orders/:id/deliver
// @access  Private/Admin
const deliverOrder = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);

    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    order.isDelivered = true;
    order.deliveredAt = Date.now();
    order.orderStatus = 'Delivered';
    order.statusHistory.push({ status: 'Delivered', updatedAt: new Date(), note: 'Marked delivered by Admin' });

    const updatedOrder = await order.save();

    // Real-time broadcast
    const io = req.app.get('io') || req.io;
    if (io) {
      io.emit('orderStatusUpdate', {
        orderId: order._id.toString(),
        orderStatus: 'Delivered',
        statusHistory: order.statusHistory,
        updatedAt: new Date().toISOString(),
      });
    }

    res.json(updatedOrder);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  addOrderItems,
  getMyOrders,
  getOrderById,
  getSellerOrders,
  updateOrderStatus,
  getAllOrders,
  deliverOrder,
};
