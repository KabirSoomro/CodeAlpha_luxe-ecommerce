const express = require('express');
const {
  getAdminProducts,
  getAdminOrders,
  createAdminProduct,
  getAdminMetrics,
} = require('../controllers/adminController');
const { protect, admin } = require('../middleware/authMiddleware');

const router = express.Router();

router.get('/products', protect, admin, getAdminProducts);
router.post('/products', protect, admin, createAdminProduct);
router.get('/orders', protect, admin, getAdminOrders);
router.get('/metrics', protect, admin, getAdminMetrics);

module.exports = router;
