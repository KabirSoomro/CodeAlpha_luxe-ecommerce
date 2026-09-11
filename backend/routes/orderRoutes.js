const express = require('express');
const {
  addOrderItems,
  getMyOrders,
  getOrderById,
  getSellerOrders,
  updateOrderStatus,
  getAllOrders,
  deliverOrder,
} = require('../controllers/orderController');
const { protect, admin, adminOrApprovedSeller } = require('../middleware/authMiddleware');

const router = express.Router();

router.route('/')
  .post(protect, addOrderItems)
  .get(protect, admin, getAllOrders);

router.route('/myorders').get(protect, getMyOrders);
router.route('/sellerorders').get(protect, adminOrApprovedSeller, getSellerOrders);
router.route('/:id/deliver').put(protect, admin, deliverOrder);
router.route('/:id/status').put(protect, adminOrApprovedSeller, updateOrderStatus);
router.route('/:id').get(protect, getOrderById);

module.exports = router;
