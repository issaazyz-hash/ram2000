/**
 * Search Option Controller
 * Handles search option CRUD operations
 * Returns empty arrays on errors instead of 500
 */

const pool = require('../db/pool');

class SearchOptionController {
  /**
   * GET /api/searchOptions
   * GET /api/searchOptions?field=marque
   */
  static async getAll(req, res) {
    try {
      const { field } = req.query;
      
      let query = 'SELECT * FROM search_options';
      const params = [];
      
      if (field) {
        query += ' WHERE field = $1';
        params.push(field);
      }
      
      query += ' ORDER BY field, value';
      
      const result = await pool.query(query, params);
      
      res.status(200).json({
        success: true,
        count: result.rows.length,
        data: result.rows
      });
    } catch (error) {
      console.error('❌ searchOptionController.getAll error:', error.message);
      
      // Return empty array instead of 500
      res.status(200).json({
        success: true,
        count: 0,
        data: [],
        warning: 'Could not fetch search options'
      });
    }
  }

  /**
   * GET /api/searchOptions/:id
   */
  static async getById(req, res) {
    try {
      const { id } = req.params;
      
      if (!id || isNaN(parseInt(id))) {
        return res.status(400).json({
          success: false,
          error: 'Valid search option ID is required'
        });
      }
      
      const result = await pool.query(
        'SELECT * FROM search_options WHERE id = $1',
        [id]
      );
      
      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Search option not found'
        });
      }
      
      res.status(200).json({
        success: true,
        data: result.rows[0]
      });
    } catch (error) {
      console.error('❌ searchOptionController.getById error:', error.message);
      res.status(500).json({
        success: false,
        error: 'Database error',
        message: error.message
      });
    }
  }

  /**
   * POST /api/searchOptions
   */
  static async create(req, res) {
    try {
      const { field, value } = req.body;
      
      if (!field || !value) {
        return res.status(400).json({
          success: false,
          error: 'Field and value are required'
        });
      }
      
      const result = await pool.query(
        `INSERT INTO search_options (field, value) 
         VALUES ($1, $2) 
         RETURNING *`,
        [field.trim(), value.trim()]
      );
      
      res.status(201).json({
        success: true,
        message: 'Search option created successfully',
        data: result.rows[0]
      });
    } catch (error) {
      console.error('❌ searchOptionController.create error:', error.message);
      res.status(500).json({
        success: false,
        error: 'Database error',
        message: error.message
      });
    }
  }

  /**
   * DELETE /api/searchOptions/:id
   */
  static async delete(req, res) {
    try {
      const { id } = req.params;
      
      if (!id || isNaN(parseInt(id))) {
        return res.status(400).json({
          success: false,
          error: 'Valid search option ID is required'
        });
      }
      
      const result = await pool.query(
        'DELETE FROM search_options WHERE id = $1 RETURNING *',
        [id]
      );
      
      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Search option not found'
        });
      }
      
      res.status(200).json({
        success: true,
        message: 'Search option deleted successfully',
        data: { id: result.rows[0].id }
      });
    } catch (error) {
      console.error('❌ searchOptionController.delete error:', error.message);
      res.status(500).json({
        success: false,
        error: 'Database error',
        message: error.message
      });
    }
  }

  /**
   * DELETE /api/searchOptions/field-value
   * Delete by field and value
   */
  static async deleteByFieldAndValue(req, res) {
    try {
      const { field, value } = req.body;
      
      if (!field || !value) {
        return res.status(400).json({
          success: false,
          error: 'Field and value are required'
        });
      }
      
      const result = await pool.query(
        'DELETE FROM search_options WHERE field = $1 AND value = $2 RETURNING *',
        [field, value]
      );
      
      res.status(200).json({
        success: true,
        message: `${result.rows.length} search option(s) deleted successfully`,
        data: { count: result.rows.length }
      });
    } catch (error) {
      console.error('❌ searchOptionController.deleteByFieldAndValue error:', error.message);
      res.status(500).json({
        success: false,
        error: 'Database error',
        message: error.message
      });
    }
  }
}

module.exports = SearchOptionController;
