/**
 * Auth Routes
 * Authentication endpoints
 */

const express = require('express');
const router = express.Router();
const AuthController = require('../controllers/authController');
const asyncHandler = require('../middlewares/asyncHandler');

router.post('/register', asyncHandler(AuthController.register));
router.post('/login', asyncHandler(AuthController.login));
router.get('/check-email/:email', asyncHandler(AuthController.checkEmail));

// Logout route (localhost only - no session management)
router.post('/logout', (req, res) => {
  res.status(200).json({ success: true, message: 'Logout successful (localhost only)' });
});

// DISABLED: Not implemented for localhost development
// These routes require JWT/session management which is not implemented
router.get('/me', (req, res) => {
  res.status(501).json({
    success: false,
    error: 'Not implemented for localhost development. JWT/session management required.'
  });
});

router.get('/verify-admin', (req, res) => {
  res.status(501).json({
    success: false,
    error: 'Not implemented for localhost development. JWT/session management required.'
  });
});

module.exports = router;
