/**
 * Acha2 Routes
 * Acha2 product endpoints using fields ending with "2"
 */

const express = require('express');
const router = express.Router();
const Acha2Controller = require('../controllers/acha2Controller');
const asyncHandler = require('../middlewares/asyncHandler');

// Get acha2 product by name
router.get('/', asyncHandler(Acha2Controller.getByName));

// Update acha2 product by name
router.put('/', asyncHandler(Acha2Controller.updateByName));

module.exports = router;

