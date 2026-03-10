/**
 * Require Admin Middleware
 * Verifies that the user is an admin by checking the database
 * 
 * This middleware does NOT trust client-provided data.
 * It validates the user ID from the request and checks admin status in the database.
 */

const UserService = require('../services/UserService');
const ApiResponse = require('../utils/apiResponse');

const requireAdmin = async (req, res, next) => {
  try {
    // Get user data from header (frontend may send it)
    const userHeader = req.headers['x-user'];
    
    if (!userHeader) {
      return ApiResponse.unauthorized(res, 'Authentication required');
    }

    // Parse user from header
    let userData;
    try {
      userData = typeof userHeader === 'string' ? JSON.parse(userHeader) : userHeader;
    } catch (parseError) {
      return ApiResponse.unauthorized(res, 'Invalid authentication data');
    }

    // Validate user ID exists
    if (!userData || !userData.id) {
      return ApiResponse.unauthorized(res, 'User ID is required');
    }

    // Get user from database (source of truth)
    const userId = parseInt(userData.id);
    if (isNaN(userId)) {
      return ApiResponse.unauthorized(res, 'Invalid user ID');
    }

    // Verify user exists and is admin in database
    const isAdmin = await UserService.isAdmin(userId);
    if (!isAdmin) {
      return ApiResponse.forbidden(res, 'Admin access required');
    }

    // Get full user data from database and attach to request
    const verifiedUser = await UserService.getUserById(userId);
    if (!verifiedUser) {
      return ApiResponse.unauthorized(res, 'User not found');
    }

    // Attach verified user to request (from database, not client)
    req.user = verifiedUser;
    req.userId = userId;

    next();
  } catch (error) {
    console.error('Error in requireAdmin middleware:', error);
    return ApiResponse.serverError(res, 'Authentication service unavailable');
  }
};

module.exports = requireAdmin;
