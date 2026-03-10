/**
 * Orders Router
 * Handles order creation and management
 */

const express = require('express');
const router = express.Router();
const OrderController = require('../controllers/orderController');
const asyncHandler = require('../middlewares/asyncHandler');
const requireAdmin = require('../middlewares/requireAdmin');

/**
 * GET /api/orders/pending-by-product?categorySlug=xxx
 * Pending order counts per product for a category (public, for CAT page highlighting)
 */
router.get('/pending-by-product', asyncHandler(OrderController.getPendingByProduct));

/**
 * GET /api/orders
 * Get all orders (admin only)
 */
router.get('/', requireAdmin, asyncHandler(OrderController.getAll));

/**
 * GET /api/orders/:id
 * Get order by ID (admin only)
 */
router.get('/:id', requireAdmin, asyncHandler(OrderController.getById));

/**
 * POST /api/orders
 * Create a new order (public - anyone can place an order)
 */
router.post('/', asyncHandler(OrderController.create));

/**
 * PATCH /api/orders/:id/accept
 * Accept promo-origin order (admin only)
 */
router.patch('/:id/accept', requireAdmin, asyncHandler(OrderController.accept));

/**
 * PATCH /api/orders/:id/reject
 * Reject order (admin only)
 */
router.patch('/:id/reject', requireAdmin, asyncHandler(OrderController.reject));

/**
 * DELETE /api/orders/:id
 * Delete an order (admin only)
 */
router.delete('/:id', requireAdmin, asyncHandler(OrderController.delete));

module.exports = router;
