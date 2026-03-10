/**
 * User Controller
 * Handles user HTTP requests/responses only
 * Business logic is in UserService
 */

const UserService = require('../services/UserService');
const ApiResponse = require('../utils/apiResponse');

class UserController {
  /**
   * GET /api/users
   * Get all users (admin only)
   */
  static async getAll(req, res) {
    try {
      const users = await UserService.getAllUsers();

      return ApiResponse.success(res, users);
    } catch (error) {
      console.error('UserController.getAll error:', error);
      return ApiResponse.serverError(res, 'Failed to fetch users');
    }
  }

  /**
   * GET /api/users/:id
   * Get user by ID
   */
  static async getById(req, res) {
    try {
      const { id } = req.params;

      if (!id || isNaN(parseInt(id))) {
        return ApiResponse.error(res, 'Valid user ID is required', 'VALIDATION_ERROR', 400);
      }

      const user = await UserService.getUserById(id);

      if (!user) {
        return ApiResponse.notFound(res, 'User not found');
      }

      return ApiResponse.success(res, user);
    } catch (error) {
      // Handle known errors
      if (error.message.includes('not found')) {
        return ApiResponse.notFound(res, error.message);
      }
      if (error.message.includes('required')) {
        return ApiResponse.error(res, error.message, 'VALIDATION_ERROR', 400);
      }

      console.error('UserController.getById error:', error);
      return ApiResponse.serverError(res, 'Failed to fetch user');
    }
  }

  /**
   * POST /api/users
   * Create a new user (admin only)
   */
  static async create(req, res) {
    try {
      const { name, email, password, phone, address } = req.body;

      // Basic input validation
      if (!name || !email) {
        return ApiResponse.error(res, 'Name and email are required', 'VALIDATION_ERROR', 400);
      }

      // Call service (password not required for admin-created users)
      const user = await UserService.registerUser({
        name,
        email,
        password: password || null, // Allow creating user without password
        phone,
        address
      }, false); // Don't require password for admin-created users

      return ApiResponse.success(res, user, 'User created successfully', 201);
    } catch (error) {
      // Handle known errors
      if (error.message.includes('already registered') || 
          error.message.includes('Email already')) {
        return ApiResponse.error(res, error.message, 'EMAIL_EXISTS', 409);
      }
      if (error.message.includes('required') || 
          error.message.includes('format') ||
          error.message.includes('length')) {
        return ApiResponse.error(res, error.message, 'VALIDATION_ERROR', 400);
      }

      console.error('UserController.create error:', error);
      return ApiResponse.serverError(res, 'Failed to create user');
    }
  }

  /**
   * PUT /api/users/:id
   * Update user (admin only, or own profile)
   */
  static async update(req, res) {
    try {
      const { id } = req.params;
      const updateData = req.body;

      if (!id || isNaN(parseInt(id))) {
        return ApiResponse.error(res, 'Valid user ID is required', 'VALIDATION_ERROR', 400);
      }

      // Prevent updating admin status through this endpoint
      if (updateData.is_admin !== undefined) {
        return ApiResponse.error(res, 'Cannot update admin status through this endpoint', 'VALIDATION_ERROR', 400);
      }

      // Call service
      const user = await UserService.updateUser(id, updateData);

      return ApiResponse.success(res, user, 'User updated successfully');
    } catch (error) {
      // Handle known errors
      if (error.message.includes('not found')) {
        return ApiResponse.notFound(res, error.message);
      }
      if (error.message.includes('already in use') || 
          error.message.includes('Email already')) {
        return ApiResponse.error(res, error.message, 'EMAIL_EXISTS', 409);
      }
      if (error.message.includes('required') || 
          error.message.includes('format') ||
          error.message.includes('Cannot update')) {
        return ApiResponse.error(res, error.message, 'VALIDATION_ERROR', 400);
      }

      console.error('UserController.update error:', error);
      return ApiResponse.serverError(res, 'Failed to update user');
    }
  }

  /**
   * DELETE /api/users/:id
   * Delete user (admin only)
   */
  static async delete(req, res) {
    try {
      const { id } = req.params;

      if (!id || isNaN(parseInt(id))) {
        return ApiResponse.error(res, 'Valid user ID is required', 'VALIDATION_ERROR', 400);
      }

      // Call service
      const user = await UserService.deleteUser(id);

      return ApiResponse.success(res, {
        id: user.id,
        name: user.name,
        email: user.email
      }, 'User deleted successfully');
    } catch (error) {
      // Handle known errors
      if (error.message.includes('not found')) {
        return ApiResponse.notFound(res, error.message);
      }
      if (error.message.includes('required')) {
        return ApiResponse.error(res, error.message, 'VALIDATION_ERROR', 400);
      }

      console.error('UserController.delete error:', error);
      return ApiResponse.serverError(res, 'Failed to delete user');
    }
  }
}

module.exports = UserController;
