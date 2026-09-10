const express = require('express');
const {
  getProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
  getMyProducts,
  createProductReview,
} = require('../controllers/productController');
const {
  protect,
  admin,
  approvedSeller,
  adminOrApprovedSeller,
} = require('../middleware/authMiddleware');

const router = express.Router();

router.route('/')
  .get(getProducts)
  .post(protect, adminOrApprovedSeller, createProduct);

router.route('/my-products')
  .get(protect, approvedSeller, getMyProducts);

router.route('/:id')
  .get(getProductById)
  .put(protect, adminOrApprovedSeller, updateProduct)
  .delete(protect, adminOrApprovedSeller, deleteProduct);

router.route('/:id/review').post(protect, createProductReview);

module.exports = router;
