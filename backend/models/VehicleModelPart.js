/**
 * VehicleModelPart Model
 * Handles database operations for vehicle_model_parts table
 */

const pool = require('../db/pool');

class VehicleModelPart {
  /**
   * Find all parts for a specific model
   * @param {number} modelId - The model ID
   * @returns {Promise<Array>} Array of parts
   */
  static async findByModelId(modelId) {
    try {
      const result = await pool.query(
        'SELECT * FROM vehicle_model_parts WHERE model_id = $1 ORDER BY created_at DESC',
        [modelId]
      );
      return result.rows;
    } catch (error) {
      console.error('Error finding parts by model ID:', error.message);
      throw error;
    }
  }

  /**
   * Find all vehicle model parts
   * @returns {Promise<Array>} Array of all parts
   */
  static async findAll() {
    try {
      const result = await pool.query(
        'SELECT * FROM vehicle_model_parts ORDER BY created_at DESC'
      );
      return result.rows;
    } catch (error) {
      console.error('Error finding all parts:', error.message);
      throw error;
    }
  }

  /**
   * Find a part by ID
   * @param {number} id - Part ID
   * @returns {Promise<Object|null>} Part or null
   */
  static async findById(id) {
    try {
      const result = await pool.query(
        'SELECT * FROM vehicle_model_parts WHERE id = $1',
        [id]
      );
      return result.rows[0] || null;
    } catch (error) {
      console.error('Error finding part by ID:', error.message);
      throw error;
    }
  }

  /**
   * Create a new part for a model
   * @param {number} modelId - Model ID
   * @param {Object} data - Part data { name, reference, description, price, image_url, category, in_stock }
   * @returns {Promise<Object>} Created part
   */
  static async create(modelId, data) {
    try {
      const { name, reference, description, price, image_url, category, in_stock } = data;
      
      const result = await pool.query(
        `INSERT INTO vehicle_model_parts (model_id, name, reference, description, price, image_url, category, in_stock)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         RETURNING *`,
        [
          modelId,
          name,
          reference || null,
          description || null,
          price || null,
          image_url || null,
          category || null,
          in_stock !== undefined ? in_stock : true
        ]
      );
      
      console.log(`✅ Part created: ${name} for model ${modelId}`);
      return result.rows[0];
    } catch (error) {
      console.error('Error creating part:', error.message);
      throw error;
    }
  }

  /**
   * Update a part
   * @param {number} id - Part ID
   * @param {Object} data - Updated data
   * @returns {Promise<Object|null>} Updated part or null
   */
  static async update(id, data) {
    try {
      const { name, reference, description, price, image_url, category, in_stock } = data;
      
      const result = await pool.query(
        `UPDATE vehicle_model_parts 
         SET name = COALESCE($1, name),
             reference = COALESCE($2, reference),
             description = COALESCE($3, description),
             price = COALESCE($4, price),
             image_url = COALESCE($5, image_url),
             category = COALESCE($6, category),
             in_stock = COALESCE($7, in_stock),
             updated_at = NOW()
         WHERE id = $8
         RETURNING *`,
        [name, reference, description, price, image_url, category, in_stock, id]
      );
      
      if (result.rows[0]) {
        console.log(`✅ Part updated: ${result.rows[0].name}`);
      }
      return result.rows[0] || null;
    } catch (error) {
      console.error('Error updating part:', error.message);
      throw error;
    }
  }

  /**
   * Delete a part
   * @param {number} id - Part ID
   * @returns {Promise<Object|null>} Deleted part or null
   */
  static async delete(id) {
    try {
      const result = await pool.query(
        'DELETE FROM vehicle_model_parts WHERE id = $1 RETURNING *',
        [id]
      );
      
      if (result.rows[0]) {
        console.log(`✅ Part deleted: ${result.rows[0].name}`);
      }
      return result.rows[0] || null;
    } catch (error) {
      console.error('Error deleting part:', error.message);
      throw error;
    }
  }

  /**
   * Search parts by name or reference
   * @param {number} modelId - Model ID
   * @param {string} query - Search query
   * @returns {Promise<Array>} Matching parts
   */
  static async search(modelId, query) {
    try {
      const result = await pool.query(
        `SELECT * FROM vehicle_model_parts 
         WHERE model_id = $1 
         AND (LOWER(name) LIKE LOWER($2) OR LOWER(reference) LIKE LOWER($2))
         ORDER BY name`,
        [modelId, `%${query}%`]
      );
      return result.rows;
    } catch (error) {
      console.error('Error searching parts:', error.message);
      throw error;
    }
  }
}

module.exports = VehicleModelPart;
