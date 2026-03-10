/**
 * Standardized API Response Utility
 * Ensures all API responses follow the same format
 */

class ApiResponse {
  /**
   * Success response
   * @param {Object} res - Express response object
   * @param {*} data - Response data
   * @param {string} message - Optional message
   * @param {number} statusCode - HTTP status code (default: 200)
   */
  static success(res, data = null, message = null, statusCode = 200) {
    const response = {
      success: true,
      data: data,
      error: null
    };

    if (message) {
      response.message = message;
    }

    return res.status(statusCode).json(response);
  }

  /**
   * Error response
   * @param {Object} res - Express response object
   * @param {string|Error} error - Error message or Error object
   * @param {string} code - Optional error code
   * @param {number} statusCode - HTTP status code (default: 400)
   */
  static error(res, error, code = null, statusCode = 400) {
    const errorMessage = error instanceof Error ? error.message : error;
    
    const response = {
      success: false,
      data: null,
      error: {
        message: errorMessage
      }
    };

    if (code) {
      response.error.code = code;
    }

    return res.status(statusCode).json(response);
  }

  /**
   * Not found response
   * @param {Object} res - Express response object
   * @param {string} message - Error message
   */
  static notFound(res, message = 'Resource not found') {
    return this.error(res, message, 'NOT_FOUND', 404);
  }

  /**
   * Unauthorized response
   * @param {Object} res - Express response object
   * @param {string} message - Error message
   */
  static unauthorized(res, message = 'Authentication required') {
    return this.error(res, message, 'UNAUTHORIZED', 401);
  }

  /**
   * Forbidden response
   * @param {Object} res - Express response object
   * @param {string} message - Error message
   */
  static forbidden(res, message = 'Access denied') {
    return this.error(res, message, 'FORBIDDEN', 403);
  }

  /**
   * Internal server error response
   * @param {Object} res - Express response object
   * @param {string} message - Error message
   */
  static serverError(res, message = 'Internal server error') {
    return this.error(res, message, 'INTERNAL_ERROR', 500);
  }
}

module.exports = ApiResponse;


