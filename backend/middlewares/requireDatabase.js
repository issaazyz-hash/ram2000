/**
 * Middleware: Require Database
 * Returns 503 if database is unavailable (should not happen in production)
 * Use this to protect routes that require database access
 */

const dbModule = require('../config/database');

function requireDatabase(req, res, next) {
  // Check if database is connected
  if (!dbModule.isConnected()) {
    console.error('[REQUIRE_DB] Database not connected - this should not happen in production');
    return res.status(503).json({
      message: 'Database service unavailable',
      code: 'DATABASE_UNAVAILABLE'
    });
  }
  
  // Database is available, continue
  next();
}

module.exports = requireDatabase;
