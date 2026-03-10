/**
 * Parts Routes
 * API endpoints for individual parts operations
 */

const express = require('express');
const router = express.Router();
const VehicleModelPartController = require('../controllers/vehicleModelPartController');
const asyncHandler = require('../middlewares/asyncHandler');

// GET /api/parts - Get all parts
router.get('/', asyncHandler(VehicleModelPartController.getAll));

// GET /api/parts/:id - Get part by ID
router.get('/:id', asyncHandler(VehicleModelPartController.getById));

// PUT /api/parts/:id - Update a part
router.put('/:id', asyncHandler(VehicleModelPartController.update));

// DELETE /api/parts/:id - Delete a part
router.delete('/:id', asyncHandler(VehicleModelPartController.delete));

module.exports = router;
