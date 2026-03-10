const express = require('express');
const router = express.Router();
const DashboardProductController = require('../controllers/dashboardProductController');

router.post('/', DashboardProductController.add);
router.get('/', DashboardProductController.getAll);
router.put('/:id', DashboardProductController.update);
router.delete('/:id', DashboardProductController.delete);

module.exports = router;
