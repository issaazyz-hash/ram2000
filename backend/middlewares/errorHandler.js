/**
 * Error Handler Middleware
 * Centralized error handling for all routes
 * Standardized JSON error format: { message, code?, details? }
 */

const errorHandler = (err, req, res, next) => {
  // Log error details
  console.error(`[${new Date().toISOString()}] ERROR ${req.method} ${req.path}:`, err.message);
  if (process.env.NODE_ENV === 'development') {
    console.error('Stack:', err.stack);
  }

  // Determine status code
  let statusCode = err.status || err.statusCode || 500;
  let message = 'Internal server error';
  let code = 'INTERNAL_ERROR';
  let details = undefined;

  // Database errors
  if (err.code === '23505') { // Unique violation
    statusCode = 409;
    message = 'This record already exists';
    code = 'DUPLICATE_ENTRY';
  } else if (err.code === '23503') { // Foreign key violation
    statusCode = 400;
    message = 'Referenced record does not exist';
    code = 'FOREIGN_KEY_VIOLATION';
  } else if (err.code === '23502') { // Not null violation
    statusCode = 400;
    const column = err.column || 'field';
    message = `Field '${column}' is required`;
    code = 'REQUIRED_FIELD_MISSING';
  } else if (err.code === '42P01') { // Table does not exist
    statusCode = 500;
    message = 'Database table does not exist';
    code = 'TABLE_NOT_FOUND';
    if (process.env.NODE_ENV === 'development') {
      details = err.message;
    }
  } else if (err.code === '42703') { // Column does not exist
    statusCode = 500;
    message = 'Database column does not exist';
    code = 'COLUMN_NOT_FOUND';
    if (process.env.NODE_ENV === 'development') {
      details = err.message;
    }
  } else if (err.code === 'ECONNREFUSED' || err.code === 'ENOTFOUND') {
    statusCode = 503;
    message = 'Database connection failed';
    code = 'DATABASE_CONNECTION_ERROR';
  } else if (err.code === '28P01') { // Authentication failed
    statusCode = 503;
    message = 'Database authentication failed';
    code = 'DATABASE_AUTH_ERROR';
  } else if (err.code === '3D000') { // Database does not exist
    statusCode = 503;
    message = 'Database does not exist';
    code = 'DATABASE_NOT_FOUND';
  }
  // Multer errors
  else if (err.code === 'LIMIT_FILE_SIZE') {
    statusCode = 400;
    message = 'File size exceeds the maximum allowed size';
    code = 'FILE_TOO_LARGE';
  }
  // Validation errors
  else if (err.name === 'ValidationError' || err.message?.includes('required')) {
    statusCode = 400;
    message = err.message || 'Validation error';
    code = 'VALIDATION_ERROR';
  }
  // Other errors
  else {
    message = err.message || 'Internal server error';
    code = err.code || 'INTERNAL_ERROR';
    
    // In development, include details
    if (process.env.NODE_ENV === 'development') {
      details = err.stack;
    }
  }

  // Send response
  const response = {
    message,
    code
  };

  if (details) {
    response.details = details;
  }

  res.status(statusCode).json(response);
};

module.exports = errorHandler;
