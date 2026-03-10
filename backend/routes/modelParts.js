/**
 * Vehicle Model Parts Routes
 * API endpoints for parts CRUD operations
 */

const express = require('express');
const router = express.Router();
const VehicleModelPartController = require('../controllers/vehicleModelPartController');
const asyncHandler = require('../middlewares/asyncHandler');

// Routes for /api/models/:modelId/parts
// GET /api/models/:modelId/parts - Get all parts for a model
router.get('/:modelId/parts', asyncHandler(VehicleModelPartController.getPartsByModel));

// GET /api/models/:modelId/parts/search - Search parts within a model
router.get('/:modelId/parts/search', asyncHandler(VehicleModelPartController.search));

// POST /api/models/:modelId/parts - Create a new part for a model
router.post('/:modelId/parts', asyncHandler(VehicleModelPartController.create));

module.exports = router;
