const express = require('express');
const {
  addOrderItems,
  getMyOrders,
  getAllOrders,
  deliverOrder,
} = require('../controllers/orderController');
const { protect, admin } = require('../middleware/authMiddleware');

const router = express.Router();

router.route('/')
  .post(protect, addOrderItems)
  .get(protect, admin, getAllOrders);

router.route('/myorders').get(protect, getMyOrders);
router.route('/:id/deliver').put(protect, admin, deliverOrder);

module.exports = router;
