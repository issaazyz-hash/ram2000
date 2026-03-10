/**
 * Vehicles Routes
 * CRUD endpoints for vehicles (catalogue cars)
 */

const express = require('express');
const router = express.Router();
const VehicleController = require('../controllers/vehicleController');
const asyncHandler = require('../middlewares/asyncHandler');

// GET /api/vehicles - Get all vehicles
router.get('/', asyncHandler(VehicleController.getAll));

// GET /api/vehicles/search?q=query - Search vehicles
router.get('/search', asyncHandler(VehicleController.search));

// GET /api/vehicles/:id - Get vehicle by ID
router.get('/:id', asyncHandler(VehicleController.getById));

// POST /api/vehicles - Create new vehicle
router.post('/', asyncHandler(VehicleController.create));

// PUT /api/vehicles/:id - Update vehicle
router.put('/:id', asyncHandler(VehicleController.update));

// DELETE /api/vehicles/:id - Delete vehicle
router.delete('/:id', asyncHandler(VehicleController.delete));

module.exports = router;

