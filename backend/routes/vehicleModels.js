/**
 * Vehicle Models Routes
 * API endpoints for vehicle models CRUD operations
 */

const express = require('express');
const router = express.Router();
const VehicleModelController = require('../controllers/vehicleModelController');
const asyncHandler = require('../middlewares/asyncHandler');

// GET /api/vehicleModels - Get all models
router.get('/', asyncHandler(VehicleModelController.getAll));

// GET /api/vehicleModels/id/:id - Get model by ID
router.get('/id/:id', asyncHandler(VehicleModelController.getById));

// GET /api/vehicleModels/:marque - Get models by marque
router.get('/:marque', asyncHandler(VehicleModelController.getModelsByMarque));

// POST /api/vehicleModels - Create a new model
router.post('/', asyncHandler(VehicleModelController.create));

// PUT /api/vehicleModels/:id - Update a model
router.put('/:id', asyncHandler(VehicleModelController.update));

// DELETE /api/vehicleModels/:id - Delete a model
router.delete('/:id', asyncHandler(VehicleModelController.delete));

module.exports = router;

