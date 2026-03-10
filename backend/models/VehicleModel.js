/**
 * VehicleModel Model
 * Handles database operations for vehicle_models table
 */

const pool = require('../db/pool');

class VehicleModel {
  /**
   * Find all models for a specific marque
   * @param {string} marque - The marque/brand name
   * @returns {Promise<Array>} Array of vehicle models
   */
  static async findByMarque(marque) {
    try {
      const result = await pool.query(
        'SELECT * FROM vehicle_models WHERE LOWER(marque) = LOWER($1) ORDER BY created_at DESC',
        [marque]
      );
      return result.rows;
    } catch (error) {
      console.error('Error finding models by marque:', error.message);
      throw error;
    }
  }

  /**
   * Find all vehicle models
   * @returns {Promise<Array>} Array of all vehicle models
   */
  static async findAll() {
    try {
      const result = await pool.query(
        'SELECT * FROM vehicle_models ORDER BY marque, model'
      );
      return result.rows;
    } catch (error) {
      console.error('Error finding all models:', error.message);
      throw error;
    }
  }

  /**
   * Find a vehicle model by ID
   * @param {number} id - Model ID
   * @returns {Promise<Object|null>} Vehicle model or null
   */
  static async findById(id) {
    try {
      const result = await pool.query(
        'SELECT * FROM vehicle_models WHERE id = $1',
        [id]
      );
      return result.rows[0] || null;
    } catch (error) {
      console.error('Error finding model by ID:', error.message);
      throw error;
    }
  }

  /**
   * Create a new vehicle model
   * @param {Object} data - Model data { marque, model, description, image }
   * @returns {Promise<Object>} Created vehicle model
   */
  static async create(data) {
    try {
      const { marque, model, description, image } = data;
      
      const result = await pool.query(
        `INSERT INTO vehicle_models (marque, model, description, image)
         VALUES ($1, $2, $3, $4)
         RETURNING *`,
        [marque, model, description || null, image || null]
      );
      
      console.log(`✅ Vehicle model created: ${model} (${marque})`);
      return result.rows[0];
    } catch (error) {
      console.error('Error creating vehicle model:', error.message);
      throw error;
    }
  }

  /**
   * Update a vehicle model
   * @param {number} id - Model ID
   * @param {Object} data - Updated data
   * @returns {Promise<Object|null>} Updated model or null
   */
  static async update(id, data) {
    try {
      const { model, description, image } = data;
      
      const result = await pool.query(
        `UPDATE vehicle_models 
         SET model = COALESCE($1, model),
             description = COALESCE($2, description),
             image = COALESCE($3, image),
             updated_at = NOW()
         WHERE id = $4
         RETURNING *`,
        [model, description, image, id]
      );
      
      if (result.rows[0]) {
        console.log(`✅ Vehicle model updated: ${result.rows[0].model}`);
      }
      return result.rows[0] || null;
    } catch (error) {
      console.error('Error updating vehicle model:', error.message);
      throw error;
    }
  }

  /**
   * Delete a vehicle model
   * @param {number} id - Model ID
   * @returns {Promise<Object|null>} Deleted model or null
   */
  static async delete(id) {
    try {
      const result = await pool.query(
        'DELETE FROM vehicle_models WHERE id = $1 RETURNING *',
        [id]
      );
      
      if (result.rows[0]) {
        console.log(`✅ Vehicle model deleted: ${result.rows[0].model}`);
      }
      return result.rows[0] || null;
    } catch (error) {
      console.error('Error deleting vehicle model:', error.message);
      throw error;
    }
  }
}

module.exports = VehicleModel;

