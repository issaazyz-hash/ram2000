const DashboardProduct = require('../models/DashboardProduct');

class DashboardProductController {
  static async add(req, res) {
    try {
      const product = await DashboardProduct.add(req.body);
      res.status(201).json({ success: true, data: product });
    } catch (err) {
      console.error("Dashboard add error:", err);
      if (err.exists) {
        return res.status(409).json({ 
          success: false, 
          error: "Product already exists in dashboard",
          exists: true 
        });
      }
      res.status(500).json({ success: false, error: "Failed to add product" });
    }
  }

  static async getAll(req, res) {
    try {
      const products = await DashboardProduct.getAll();
      res.status(200).json({ success: true, data: products });
    } catch (err) {
      console.error("Dashboard list error:", err);
      res.status(500).json({ success: false, error: "Failed to load dashboard" });
    }
  }

  static async delete(req, res) {
    try {
      const { id } = req.params;
      if (!id || isNaN(parseInt(id))) {
        return res.status(400).json({ success: false, error: "Valid product ID is required" });
      }
      const product = await DashboardProduct.delete(parseInt(id));
      if (!product) {
        return res.status(404).json({ success: false, error: "Product not found" });
      }
      res.status(200).json({ success: true, message: "Product deleted successfully", data: product });
    } catch (err) {
      console.error("Dashboard delete error:", err);
      res.status(500).json({ success: false, error: "Failed to delete product" });
    }
  }

  static async update(req, res) {
    try {
      const { id } = req.params;
      if (!id || isNaN(parseInt(id))) {
        return res.status(400).json({ success: false, error: "Valid product ID is required" });
      }
      const product = await DashboardProduct.update(parseInt(id), req.body);
      if (!product) {
        return res.status(404).json({ success: false, error: "Product not found" });
      }
      res.status(200).json({ success: true, message: "Product updated successfully", data: product });
    } catch (err) {
      console.error("Dashboard update error:", err);
      res.status(500).json({ success: false, error: "Failed to update product" });
    }
  }
}

module.exports = DashboardProductController;
