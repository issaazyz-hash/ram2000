/**
 * Auth Controller
 * Handles authentication requests/responses only
 * Business logic is in UserService
 */

const UserService = require('../services/UserService');
const ApiResponse = require('../utils/apiResponse');

class AuthController {
  /**
   * POST /api/auth/register
   * Register a new user
   */
  static async register(req, res) {
    try {
      const { name, email, password, phone, address } = req.body;

      // Input validation (basic shape validation)
      if (!name || !email || !password) {
        return ApiResponse.error(res, 'Name, email, and password are required', 'VALIDATION_ERROR', 400);
      }

      // Call service
      const user = await UserService.registerUser({
        name,
        email,
        password,
        phone,
        address
      });

      // Return standardized response
      return ApiResponse.success(res, {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.is_admin ? 'admin' : 'user'
      }, 'User registered successfully', 201);
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

      // Unknown errors
      console.error('AuthController.register error:', error);
      return ApiResponse.serverError(res, 'Failed to register user');
    }
  }

  /**
   * POST /api/auth/login
   * Authenticate user
   */
  static async login(req, res) {
    try {
      const { email, password } = req.body;

      // Input validation (basic shape validation)
      if (!email || !password) {
        return res.status(400).json({
          success: false,
          message: 'Email and password are required',
          code: 'VALIDATION_ERROR',
          data: null
        });
      }

      // Authenticate via service (database only - no demo mode)
      const user = await UserService.authenticateUser(email, password);
      
      if (!user) {
        return res.status(401).json({
          success: false,
          message: 'Invalid email or password',
          code: 'INVALID_CREDENTIALS',
          data: null
        });
      }

      // Return standardized response (consistent format)
      return res.status(200).json({
        success: true,
        message: 'Login successful',
        data: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.is_admin ? 'admin' : 'user'
        }
      });
    } catch (error) {
      console.error('AuthController.login error:', error);
      console.error('Stack:', error.stack);
      
      // Check if it's a database connection error
      if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND' || 
          error.code === '28P01' || error.code === '3D000' ||
          error.message?.includes('Database') || error.message?.includes('pool')) {
        return res.status(503).json({
          success: false,
          message: 'Database connection failed. Please contact administrator.',
          code: 'DATABASE_CONNECTION_ERROR',
          data: null,
          ...(process.env.NODE_ENV === 'development' && { details: error.message })
        });
      }
      
      // Log error details
      console.error('[AUTH] Login error details:', {
        message: error.message,
        code: error.code,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      });
      
      return res.status(500).json({
        success: false,
        message: 'Authentication service unavailable',
        code: 'AUTH_ERROR',
        data: null
      });
    }
  }

  /**
   * GET /api/auth/check-email/:email
   * Check if email is available
   */
  static async checkEmail(req, res) {
    try {
      const { email } = req.params;

      if (!email) {
        return ApiResponse.error(res, 'Email parameter is required', 'VALIDATION_ERROR', 400);
      }

      const available = await UserService.isEmailAvailable(email);

      return ApiResponse.success(res, {
        available: available
      });
    } catch (error) {
      console.error('AuthController.checkEmail error:', error);
      return ApiResponse.serverError(res, 'Failed to check email availability');
    }
  }
}

module.exports = AuthController;
