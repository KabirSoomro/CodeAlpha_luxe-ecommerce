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
      });
    }

    // 4. Create and save order in MongoDB
    const order = new Order({
      orderItems,
      user: req.user._id,
      shippingAddress: shippingAddress || {
        address: '123 Luxe Blvd',
        city: 'New York',
        postalCode: '10001',
        country: 'USA',
      },
      paymentMethod: paymentMethod || 'CreditCard',
      totalPrice: totalPrice !== undefined ? Number(totalPrice) : 0,
      isPaid: true,
      paidAt: Date.now(),
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

    const updatedOrder = await order.save();
    res.json(updatedOrder);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  addOrderItems,
  getMyOrders,
  getAllOrders,
  deliverOrder,
};
