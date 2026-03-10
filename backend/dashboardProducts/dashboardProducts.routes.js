const express = require("express");
const router = express.Router();

const {
  getAllDashboardProducts,
  addDashboardProduct,
  deleteDashboardProduct,
  updateDashboardProduct
} = require("./dashboardProducts.controller");

router.get("/dashboard-products", getAllDashboardProducts);
router.post("/dashboard-products", addDashboardProduct);
router.put("/dashboard-products/:id", updateDashboardProduct);
router.delete("/dashboard-products/:id", deleteDashboardProduct);

module.exports = router;
