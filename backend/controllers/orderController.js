/**
 * Order Controller
 * Handles order HTTP requests/responses only
 * Business logic is in OrderService
 */

const OrderService = require('../services/OrderService');
const ApiResponse = require('../utils/apiResponse');

class OrderController {
  /**
   * GET /api/orders/pending-by-product?categorySlug=xxx
   * Returns pending order counts per product slug for a category (public, for CAT page).
   */
  static async getPendingByProduct(req, res) {
    try {
      const categorySlug = req.query?.categorySlug;
      const data = await OrderService.getPendingCountByProduct(categorySlug || '');
      return ApiResponse.success(res, data);
    } catch (error) {
      console.error('OrderController.getPendingByProduct error:', error);
      return ApiResponse.serverError(res, 'Failed to fetch pending counts');
    }
  }

  /**
   * GET /api/orders
   * Get all orders (admin only)
   */
  static async getAll(req, res) {
    try {
      const status = req.query?.status;
      const options = status ? { status } : {};
      const orders = await OrderService.getAllOrders(options);

      return ApiResponse.success(res, orders);
    } catch (error) {
      console.error('OrderController.getAll error:', error);
      return ApiResponse.serverError(res, 'Failed to fetch orders');
    }
  }

  /**
   * POST /api/orders
   * Create a new order
   */
  static async create(req, res) {
    try {
      const orderData = req.body;

      // Call service (validation happens in service)
      const order = await OrderService.createOrder(orderData);

      return ApiResponse.success(res, order, 'Order created successfully', 201);
    } catch (error) {
      // Handle validation errors (400 Bad Request)
      if (error.message.includes('required') || 
          error.message.includes('must be') ||
          error.message.includes('must be a') ||
          error.message.includes('Invalid data type') ||
          error.message.includes('Required field missing') ||
          error.message.includes('Invalid product_id') ||
          error.message.includes('Invalid reference')) {
        return res.status(400).json({
          success: false,
          message: error.message || 'Invalid order data'
        });
      }

      // Log full error details
      console.error('❌ OrderController.create error:');
      console.error('   Message:', error.message || 'Unknown error');
      console.error('   Code:', error.code || 'N/A');
      if (error.detail) console.error('   Detail:', error.detail);
      
      // Return sanitized error to frontend
      let errorMessage = 'Failed to create order';
      if (error.code === '22P02') {
        errorMessage = 'Invalid data type: Please check all numeric fields';
      } else if (error.code === '23502') {
        errorMessage = 'Required field missing: ' + (error.column || 'unknown field');
      } else if (error.code === '23503') {
        errorMessage = 'Invalid product_id: product does not exist';
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      return res.status(500).json({
        success: false,
        message: errorMessage
      });
    }
  }

  /**
   * GET /api/orders/:id
   * Get order by ID
   */
  static async getById(req, res) {
    try {
      const { id } = req.params;

      if (!id || isNaN(parseInt(id))) {
        return ApiResponse.error(res, 'Valid order ID is required', 'VALIDATION_ERROR', 400);
      }

      const order = await OrderService.getOrderById(id);

      if (!order) {
        return ApiResponse.notFound(res, 'Order not found');
      }

      return ApiResponse.success(res, order);
    } catch (error) {
      // Handle known errors
      if (error.message.includes('not found')) {
        return ApiResponse.notFound(res, error.message);
      }
      if (error.message.includes('required')) {
        return ApiResponse.error(res, error.message, 'VALIDATION_ERROR', 400);
      }

      console.error('OrderController.getById error:', error);
      return ApiResponse.serverError(res, 'Failed to fetch order');
    }
  }

  /**
   * PATCH /api/orders/:id/accept
   * Accept promo-origin order: decrease promotion stock, set status accepted
   */
  static async accept(req, res) {
    try {
      const { id } = req.params;
      if (!id || isNaN(parseInt(id))) {
        return res.status(400).json({ success: false, message: 'Valid order ID is required' });
      }

      const order = await OrderService.acceptOrder(parseInt(id));
      return ApiResponse.success(res, order, 'Order accepted');
    } catch (error) {
      if (error.message === 'Order not found') {
        return ApiResponse.notFound(res, 'Order not found');
      }
      if (error.message === 'Cannot accept: order already processed' ||
          error.message === 'Order has no product name' ||
          error.message === 'Product not found in catalog' ||
          error.message === 'Produit Cat2 introuvable') {
        return res.status(400).json({ success: false, message: error.message });
      }
      if (error.message === 'Stock not available' ||
          error.message === 'Quantity exceeds available stock' ||
          error.message === 'Not enough stock' ||
          error.message === 'Produit introuvable') {
        return res.status(409).json({ success: false, message: error.message === 'Not enough stock' ? 'Stock insuffisant' : error.message });
      }
      console.error('OrderController.accept error:', error);
      return ApiResponse.serverError(res, 'Failed to accept order');
    }
  }

  /**
   * PATCH /api/orders/:id/reject
   * Reject order: set status rejected
   */
  static async reject(req, res) {
    try {
      const { id } = req.params;
      if (!id || isNaN(parseInt(id))) {
        return res.status(400).json({ success: false, message: 'Valid order ID is required' });
      }

      const order = await OrderService.rejectOrder(parseInt(id));
      return ApiResponse.success(res, order, 'Order rejected');
    } catch (error) {
      if (error.message === 'Order not found') {
        return ApiResponse.notFound(res, 'Order not found');
      }
      if (error.message === 'Cannot refuse: order already processed') {
        return res.status(400).json({ success: false, message: error.message });
      }
      console.error('OrderController.reject error:', error);
      return ApiResponse.serverError(res, 'Failed to reject order');
    }
  }

  /**
   * DELETE /api/orders/:id
   * Delete an order (admin only)
   */
  static async delete(req, res) {
    try {
      const { id } = req.params;

      if (!id || isNaN(parseInt(id))) {
        return ApiResponse.error(res, 'Valid order ID is required', 'VALIDATION_ERROR', 400);
      }

      // Call service
      await OrderService.deleteOrder(id);

      return ApiResponse.success(res, null, 'Order deleted successfully');
    } catch (error) {
      // Handle known errors
      if (error.message.includes('not found')) {
        return ApiResponse.notFound(res, error.message);
      }
      if (error.message.includes('required')) {
        return ApiResponse.error(res, error.message, 'VALIDATION_ERROR', 400);
      }

      console.error('OrderController.delete error:', error);
      return ApiResponse.serverError(res, 'Failed to delete order');
    }
  }
}

module.exports = OrderController;
