const express = require('express');
const {
  getAdminProducts,
  getAdminOrders,
  createAdminProduct,
  getAdminMetrics,
  getAllSellers,
  approveSeller,
  rejectSeller,
} = require('../controllers/adminController');
const { protect, admin } = require('../middleware/authMiddleware');

const router = express.Router();

router.get('/products', protect, admin, getAdminProducts);
router.post('/products', protect, admin, createAdminProduct);
router.get('/orders', protect, admin, getAdminOrders);
router.get('/metrics', protect, admin, getAdminMetrics);

// Seller Management routes (Admin only)
router.get('/sellers', protect, admin, getAllSellers);
router.put('/sellers/:id/approve', protect, admin, approveSeller);
router.put('/sellers/:id/reject', protect, admin, rejectSeller);

module.exports = router;
