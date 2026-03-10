/**
 * User Routes
 * User CRUD endpoints (admin only)
 */

const express = require('express');
const router = express.Router();
const UserController = require('../controllers/userController');
const asyncHandler = require('../middlewares/asyncHandler');
const requireAdmin = require('../middlewares/requireAdmin');

// All user management routes require admin access
router.get('/', requireAdmin, asyncHandler(UserController.getAll));
router.get('/:id', requireAdmin, asyncHandler(UserController.getById));
router.post('/', requireAdmin, asyncHandler(UserController.create));
router.put('/:id', requireAdmin, asyncHandler(UserController.update));
router.delete('/:id', requireAdmin, asyncHandler(UserController.delete));

module.exports = router;
