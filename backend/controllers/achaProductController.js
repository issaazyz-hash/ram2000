/**
 * AchaProduct Controller
 * Handles Acha product CRUD operations including quantity and product_references
 * 
 * FIXED: Uses "product_references" instead of "references"
 */

const AchaProduct = require('../models/AchaProduct');
const pool = require('../db/pool');

class AchaProductController {
  /**
   * Get all acha products
   */
  static async getAll(req, res) {
    try {
      const products = await AchaProduct.findAll();
      
      // Disable caching for instant updates
      res.set({
        "Cache-Control": "no-cache, no-store, must-revalidate",
        "Pragma": "no-cache",
        "Expires": "0"
      });
      
      res.status(200).json({
        success: true,
        count: products.length,
        data: products
      });
    } catch (error) {
      console.error('❌ Error in getAll:', error.message);
      res.set({
        "Cache-Control": "no-cache, no-store, must-revalidate",
        "Pragma": "no-cache",
        "Expires": "0"
      });
      res.status(200).json({
        success: true,
        count: 0,
        data: []
      });
    }
  }

  /**
   * Get acha product by ID
   */
  static async getById(req, res) {
    try {
      const { id } = req.params;
      
      // Disable caching for instant updates
      res.set({
        "Cache-Control": "no-cache, no-store, must-revalidate",
        "Pragma": "no-cache",
        "Expires": "0"
      });
      
      if (!id || isNaN(parseInt(id))) {
        return res.status(400).json({
          success: false,
          error: 'Valid product ID is required'
        });
      }
      
      const product = await AchaProduct.findById(id);
      if (!product) {
        return res.status(404).json({
          success: false,
          error: 'Product not found'
        });
      }
      
      res.status(200).json({
        success: true,
        data: product
      });
    } catch (error) {
      console.error('❌ Error in getById:', error.message);
      res.set({
        "Cache-Control": "no-cache, no-store, must-revalidate",
        "Pragma": "no-cache",
        "Expires": "0"
      });
      res.status(404).json({
        success: false,
        error: 'Product not found'
      });
    }
  }

  /**
   * Get or create acha product by sub_id
   * Used when loading the Acha page for a specific product
   * 
   * FIX APPLIED FROM DIAGNOSTIC DOCUMENT: Added decodeURIComponent for special characters
   */
  static async getOrCreate(req, res) {
    try {
      let { subId } = req.params;
      
      // Disable caching for instant updates
      res.set({
        "Cache-Control": "no-cache, no-store, must-revalidate",
        "Pragma": "no-cache",
        "Expires": "0"
      });
      
      // FIX APPLIED FROM DIAGNOSTIC DOCUMENT: Decode URL-encoded characters (apostrophes, accents, etc.)
      subId = decodeURIComponent(subId);
      
      if (!subId) {
        return res.status(400).json({
          success: false,
          error: 'subId is required'
        });
      }
      
      // FIX APPLIED FROM DIAGNOSTIC DOCUMENT: Added logging for debugging
      console.log('📦 Getting or creating product for sub_id:', subId);
      
      const product = await AchaProduct.getOrCreate(subId);
      
      res.status(200).json({
        success: true,
        data: product
      });
    } catch (error) {
      console.error('❌ Error in getOrCreate:', error.message);
      res.set({
        "Cache-Control": "no-cache, no-store, must-revalidate",
        "Pragma": "no-cache",
        "Expires": "0"
      });
      res.status(500).json({
        success: false,
        error: 'Failed to get or create product'
      });
    }
  }

  /**
   * Create a new acha product
   */
  static async create(req, res) {
    try {
      const {
        sub_id,
        name,
        brand_name,
        model_name,
        description,
        price,
        images,
        quantity,
        product_references,
        promotion_percentage,
        promotion_price
      } = req.body;
      
      if (!sub_id) {
        return res.status(400).json({
          success: false,
          error: 'sub_id is required'
        });
      }
      
      // Check if sub_id already exists
      const existing = await AchaProduct.findBySubId(sub_id);
      if (existing) {
        return res.status(409).json({
          success: false,
          error: 'Product with this sub_id already exists'
        });
      }
      
      const product = await AchaProduct.create({
        sub_id,
        name,
        brand_name,
        model_name,
        description,
        price,
        images,
        quantity,
        product_references,
        promotion_percentage,
        promotion_price
      });
      
      // Disable caching for instant updates
      res.set({
        "Cache-Control": "no-cache, no-store, must-revalidate",
        "Pragma": "no-cache",
        "Expires": "0"
      });
      
      res.status(201).json({
        success: true,
        message: 'Product created successfully',
        data: product
      });
    } catch (error) {
      console.error('❌ Error in create:', error.message);
      res.status(500).json({
        success: false,
        error: 'Failed to create product'
      });
    }
  }

  /**
   * Update an acha product
   */
  static async update(req, res) {
    try {
      const { id } = req.params;
      const updateData = req.body;
      
      console.log('📥 Controller.update() received:', {
        id,
        body: req.body,
        promotion_percentage: req.body.promotion_percentage,
        promotion_price: req.body.promotion_price,
        promotion_percentage_type: typeof req.body.promotion_percentage
      });
      
      if (!id || isNaN(parseInt(id))) {
        return res.status(400).json({
          success: false,
          error: 'Valid product ID is required'
        });
      }
      
      // Check if product exists
      const productExists = await AchaProduct.findById(id);
      if (!productExists) {
        return res.status(404).json({
          success: false,
          error: 'Product not found'
        });
      }
      
      console.log('📦 Existing product before update:', {
        id: productExists.id,
        promotion_percentage: productExists.promotion_percentage,
        promotion_price: productExists.promotion_price,
        price: productExists.price
      });
      
      if (updateData.price !== undefined) {
        updateData.price = Number(updateData.price);
        if (isNaN(updateData.price) || updateData.price === '' || updateData.price === null || updateData.price === undefined) {
          updateData.price = 0.000;
        }
      }

      if (updateData.promotion_percentage !== undefined) {
        updateData.promotion_percentage = Number(updateData.promotion_percentage);
        if (isNaN(updateData.promotion_percentage)) {
          updateData.promotion_percentage = 0;
        }
      }

      if (updateData.promotion_price !== undefined) {
        updateData.promotion_price = Number(updateData.promotion_price);
        if (isNaN(updateData.promotion_price) || updateData.promotion_price === '' || updateData.promotion_price === null) {
          updateData.promotion_price = null;
        }
      }
      
      const product = await AchaProduct.update(id, updateData);
      
      res.set({
        "Cache-Control": "no-cache, no-store, must-revalidate",
        "Pragma": "no-cache",
        "Expires": "0"
      });
      
      const fresh = await AchaProduct.findById(id);
      
      res.status(200).json({
        success: true,
        data: fresh
      });
    } catch (error) {
      console.error('❌ Error in update:', error.message);
      console.error('❌ Error stack:', error.stack);
      res.set({
        "Cache-Control": "no-cache, no-store, must-revalidate",
        "Pragma": "no-cache",
        "Expires": "0"
      });
      res.status(500).json({
        success: false,
        error: 'Failed to update product'
      });
    }
  }

  /**
   * Decrease quantity (vente hors ligne)
   */
  static async venteHorsLigne(req, res) {
    try {
      const { id } = req.params;
      
      if (!id || isNaN(parseInt(id))) {
        return res.status(400).json({
          success: false,
          error: 'Valid product ID is required'
        });
      }
      
      // Check if product exists and has quantity > 0
      const productExists = await AchaProduct.findById(id);
      if (!productExists) {
        return res.status(404).json({
          success: false,
          error: 'Product not found'
        });
      }
      
      if (productExists.quantity <= 0) {
        return res.status(400).json({
          success: false,
          error: 'Quantity is already 0'
        });
      }
      
      const product = await AchaProduct.decreaseQuantity(id);
      
      // Also update quantity in dashboard_products if it exists
      try {
        await pool.query(
          `UPDATE dashboard_products 
           SET quantity = $1 
           WHERE product_id = $2`,
          [product.quantity, String(id)]
        );
        console.log('✅ Dashboard product quantity updated for product_id:', id);
      } catch (dashboardError) {
        // Non-critical error - dashboard product might not exist
        console.log('ℹ️ Dashboard product not found or update failed (non-critical):', dashboardError.message);
      }
      
      res.status(200).json({
        success: true,
        message: 'Quantity decreased successfully',
        data: product
      });
    } catch (error) {
      console.error('❌ Error in venteHorsLigne:', error.message);
      res.status(500).json({
        success: false,
        error: 'Failed to decrease quantity'
      });
    }
  }

  /**
   * Delete an acha product
   */
  static async delete(req, res) {
    try {
      const { id } = req.params;
      
      if (!id || isNaN(parseInt(id))) {
        return res.status(400).json({
          success: false,
          error: 'Valid product ID is required'
        });
      }
      
      const product = await AchaProduct.delete(id);
      if (!product) {
        return res.status(404).json({
          success: false,
          error: 'Product not found'
        });
      }
      
      res.status(200).json({
        success: true,
        message: 'Product deleted successfully',
        data: {
          id: product.id,
          sub_id: product.sub_id
        }
      });
    } catch (error) {
      console.error('❌ Error in delete:', error.message);
      res.status(500).json({
        success: false,
        error: 'Failed to delete product'
      });
    }
  }
}

module.exports = AchaProductController;
