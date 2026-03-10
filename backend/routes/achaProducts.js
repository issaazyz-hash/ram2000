/**
 * AchaProduct Routes
 * Acha product CRUD endpoints including quantity and references management
 */

const express = require('express');
const router = express.Router();
const AchaProductController = require('../controllers/achaProductController');
const asyncHandler = require('../middlewares/asyncHandler');

// Get all acha products
router.get('/', asyncHandler(AchaProductController.getAll));

// Get or create acha product by sub_id (used when loading Acha page)
router.get('/sub/:subId', asyncHandler(AchaProductController.getOrCreate));

// Get acha product by ID
router.get('/:id', asyncHandler(AchaProductController.getById));

// Create new acha product
router.post('/', asyncHandler(AchaProductController.create));

// Update acha product (quantity, references, etc.)
router.put('/:id', asyncHandler(AchaProductController.update));

// Vente hors ligne (decrease quantity by 1)
router.post('/:id/vente-hors-ligne', asyncHandler(AchaProductController.venteHorsLigne));

// Delete acha product
router.delete('/:id', asyncHandler(AchaProductController.delete));

module.exports = router;

