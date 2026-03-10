/**
 * Response Formatter Middleware
 * Ensures all responses follow the standard format
 */

const formatResponse = (req, res, next) => {
  // Store original json method
  const originalJson = res.json.bind(res);
  
  // Override json method to wrap responses
  res.json = function(data) {
    // If response already has success field, use as-is
    if (data && typeof data === 'object' && 'success' in data) {
      return originalJson(data);
    }
    
    // Otherwise wrap in standard format
    return originalJson({
      success: true,
      data: data
    });
  };
  
  next();
};

module.exports = formatResponse;

