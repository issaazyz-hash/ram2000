/**
 * Search Options Routes
 * Search option CRUD endpoints
 */

const express = require('express');
const router = express.Router();
const SearchOptionController = require('../controllers/searchOptionController');
const asyncHandler = require('../middlewares/asyncHandler');

router.get('/', asyncHandler(SearchOptionController.getAll));
router.get('/:id', asyncHandler(SearchOptionController.getById));
router.post('/', asyncHandler(SearchOptionController.create));
router.delete('/:id', asyncHandler(SearchOptionController.delete));
router.delete('/field-value', asyncHandler(SearchOptionController.deleteByFieldAndValue));

module.exports = router;

