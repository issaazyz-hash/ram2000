/**
 * Car Brand Controller
 * Handles car brand CRUD operations
 * Returns empty arrays on errors instead of 500
 */

const pool = require('../db/pool');

class CarBrandController {
  /**
   * GET /api/carBrands
   */
  static async getAll(req, res) {
    try {
      const result = await pool.query(
        'SELECT * FROM car_brands ORDER BY name'
      );
      
      res.status(200).json({
        success: true,
        count: result.rows.length,
        data: result.rows
      });
    } catch (error) {
      console.error('❌ carBrandController.getAll error:', error.message);
      
      // Return empty array instead of 500
      res.status(200).json({
        success: true,
        count: 0,
        data: [],
        warning: 'Could not fetch car brands'
      });
    }
  }

  /**
   * GET /api/carBrands/:id
   */
  static async getById(req, res) {
    try {
      const { id } = req.params;
      
      if (!id || isNaN(parseInt(id))) {
        return res.status(400).json({
          success: false,
          error: 'Valid car brand ID is required'
        });
      }
      
      const result = await pool.query(
        'SELECT * FROM car_brands WHERE id = $1',
        [id]
      );
      
      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Car brand not found'
        });
      }
      
      res.status(200).json({
        success: true,
        data: result.rows[0]
      });
    } catch (error) {
      console.error('❌ carBrandController.getById error:', error.message);
      res.status(500).json({
        success: false,
        error: 'Database error',
        message: error.message
      });
    }
  }

  /**
   * POST /api/carBrands
   */
  static async create(req, res) {
    try {
      const { name, model, description, image_url } = req.body;
      
      if (!name) {
        return res.status(400).json({
          success: false,
          error: 'Name is required'
        });
      }
      
      const result = await pool.query(
        `INSERT INTO car_brands (name, model, description, image_url) 
         VALUES ($1, $2, $3, $4) 
         RETURNING *`,
        [name.trim(), model || null, description || null, image_url || null]
      );
      
      res.status(201).json({
        success: true,
        message: 'Car brand created successfully',
        data: result.rows[0]
      });
    } catch (error) {
      console.error('❌ carBrandController.create error:', error.message);
      res.status(500).json({
        success: false,
        error: 'Database error',
        message: error.message
      });
    }
  }

  /**
   * PUT /api/carBrands/:id
   */
  static async update(req, res) {
    try {
      const { id } = req.params;
      const { name, model, description, image_url } = req.body;
      
      if (!id || isNaN(parseInt(id))) {
        return res.status(400).json({
          success: false,
          error: 'Valid car brand ID is required'
        });
      }
      
      // Build update query dynamically
      const updates = [];
      const values = [];
      let paramCount = 1;
      
      if (name !== undefined) {
        updates.push(`name = $${paramCount++}`);
        values.push(name.trim());
      }
      if (model !== undefined) {
        updates.push(`model = $${paramCount++}`);
        values.push(model);
      }
      if (description !== undefined) {
        updates.push(`description = $${paramCount++}`);
        values.push(description);
      }
      if (image_url !== undefined) {
        updates.push(`image_url = $${paramCount++}`);
        values.push(image_url);
      }
      
      if (updates.length === 0) {
        return res.status(400).json({
          success: false,
          error: 'No fields to update'
        });
      }
      
      updates.push(`updated_at = CURRENT_TIMESTAMP`);
      values.push(id);
      
      const query = `UPDATE car_brands SET ${updates.join(', ')} WHERE id = $${paramCount} RETURNING *`;
      const result = await pool.query(query, values);
      
      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Car brand not found'
        });
      }
      
      res.status(200).json({
        success: true,
        message: 'Car brand updated successfully',
        data: result.rows[0]
      });
    } catch (error) {
      console.error('❌ carBrandController.update error:', error.message);
      res.status(500).json({
        success: false,
        error: 'Database error',
        message: error.message
      });
    }
  }

  /**
   * DELETE /api/carBrands/:id
   */
  static async delete(req, res) {
    try {
      const { id } = req.params;
      
      if (!id || isNaN(parseInt(id))) {
        return res.status(400).json({
          success: false,
          error: 'Valid car brand ID is required'
        });
      }
      
      const result = await pool.query(
        'DELETE FROM car_brands WHERE id = $1 RETURNING *',
        [id]
      );
      
      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Car brand not found'
        });
      }
      
      res.status(200).json({
        success: true,
        message: 'Car brand deleted successfully',
        data: { id: result.rows[0].id, name: result.rows[0].name }
      });
    } catch (error) {
      console.error('❌ carBrandController.delete error:', error.message);
      res.status(500).json({
        success: false,
        error: 'Database error',
        message: error.message
      });
    }
  }
}

module.exports = CarBrandController;
