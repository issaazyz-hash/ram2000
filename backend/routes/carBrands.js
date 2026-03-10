/**
 * Car Brands Routes
 * Car brand CRUD endpoints
 */

const express = require('express');
const router = express.Router();
const CarBrandController = require('../controllers/carBrandController');
const asyncHandler = require('../middlewares/asyncHandler');

router.get('/', asyncHandler(CarBrandController.getAll));
router.get('/:id', asyncHandler(CarBrandController.getById));
router.post('/', asyncHandler(CarBrandController.create));
router.put('/:id', asyncHandler(CarBrandController.update));
router.delete('/:id', asyncHandler(CarBrandController.delete));

module.exports = router;

