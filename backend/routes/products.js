/**
 * Product Routes
 * Product CRUD endpoints
 */

const express = require('express');
const router = express.Router();
const ProductController = require('../controllers/productController');
const asyncHandler = require('../middlewares/asyncHandler');
const requireAdmin = require('../middlewares/requireAdmin');

// Public routes
router.get('/equivalents', asyncHandler(ProductController.getEquivalents));
router.get('/', asyncHandler(ProductController.getAll));
router.get('/:id', asyncHandler(ProductController.getById));

// Admin-only routes
router.post('/', requireAdmin, asyncHandler(ProductController.create));
router.put('/:id', requireAdmin, asyncHandler(ProductController.update));
router.delete('/:id', requireAdmin, asyncHandler(ProductController.delete));

module.exports = router;
