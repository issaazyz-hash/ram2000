/**
 * Vehicle Model
 * Database operations for vehicles (catalogue cars)
 * This is the main table for storing vehicles added from the Catalogue page
 */

const pool = require('../db/pool');

class Vehicle {
  /**
   * Get all vehicles
   * @returns {Promise<Array>} - Array of vehicles
   */
  static async findAll() {
    try {
      const result = await pool.query(
        'SELECT * FROM vehicles ORDER BY created_at DESC'
      );
      return result.rows;
    } catch (error) {
      console.error('❌ Vehicle.findAll error:', error.message);
      // If table doesn't exist, return empty array
      if (error.code === '42P01') {
        console.log('⚠️ vehicles table does not exist, returning empty array');
        return [];
      }
      throw error;
    }
  }

  /**
   * Get vehicle by ID
   * @param {number|string} id - Vehicle ID
   * @returns {Promise<object|null>} - Vehicle object or null
   */
  static async findById(id) {
    try {
      const result = await pool.query(
        'SELECT * FROM vehicles WHERE id = $1',
        [id]
      );
      return result.rows[0] || null;
    } catch (error) {
      console.error('❌ Vehicle.findById error:', error.message);
      return null;
    }
  }

  /**
   * Create a new vehicle
   * @param {object} vehicleData - Vehicle data
   * @returns {Promise<object>} - Created vehicle
   */
  static async create(vehicleData) {
    const { name, brand, model, description, image_url } = vehicleData;

    try {
      // Ensure all required fields have defaults
      const insertSQL = `
        INSERT INTO vehicles (name, brand, model, description, image_url, created_at, updated_at) 
        VALUES ($1, $2, $3, $4, $5, NOW(), NOW()) 
        RETURNING *
      `;
      
      const result = await pool.query(insertSQL, [
        (name?.trim() || '') || '',
        (brand?.trim() || '') || '',
        (model?.trim() || '') || '',
        description?.trim() || null,
        image_url || null
      ]);
      
      console.log('✅ Vehicle created successfully:', {
        id: result.rows[0].id,
        name: result.rows[0].name,
        brand: result.rows[0].brand,
        model: result.rows[0].model
      });
      
      return result.rows[0];
    } catch (error) {
      console.error('❌ Vehicle.create error:', error.message);
      console.error('   SQL Code:', error.code);
      console.error('   Table: vehicles');
      console.error('   Attempted columns: name, brand, model, description, image_url');
      
      // If column doesn't exist, provide helpful error
      if (error.code === '42703') { // Undefined column
        console.error('   ⚠️  Column does not exist. Run: node backend/db/fix_vehicles_table.js');
      }
      
      throw error;
    }
  }

  /**
   * Update a vehicle
   * @param {number|string} id - Vehicle ID
   * @param {object} vehicleData - Updated vehicle data
   * @returns {Promise<object|null>} - Updated vehicle or null
   */
  static async update(id, vehicleData) {
    const updates = [];
    const values = [];
    let paramCount = 1;

    const fields = ['name', 'brand', 'model', 'description', 'image_url'];

    for (const field of fields) {
      if (vehicleData[field] !== undefined) {
        updates.push(`${field} = $${paramCount++}`);
        values.push(vehicleData[field]?.trim?.() || vehicleData[field]);
      }
    }

    if (updates.length === 0) {
      return null;
    }

    updates.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(id);

    try {
      const query = `UPDATE vehicles SET ${updates.join(', ')} WHERE id = $${paramCount} RETURNING *`;
      const result = await pool.query(query, values);
      return result.rows[0] || null;
    } catch (error) {
      console.error('❌ Vehicle.update error:', error.message);
      throw error;
    }
  }

  /**
   * Delete a vehicle
   * @param {number|string} id - Vehicle ID
   * @returns {Promise<object|null>} - Deleted vehicle or null
   */
  static async delete(id) {
    try {
      const result = await pool.query(
        'DELETE FROM vehicles WHERE id = $1 RETURNING *',
        [id]
      );
      return result.rows[0] || null;
    } catch (error) {
      console.error('❌ Vehicle.delete error:', error.message);
      throw error;
    }
  }

  /**
   * Search vehicles by name, brand, or model
   * @param {string} query - Search query
   * @returns {Promise<Array>} - Array of matching vehicles
   */
  static async search(query) {
    try {
      const searchTerm = `%${query}%`;
      const result = await pool.query(
        `SELECT * FROM vehicles 
         WHERE name ILIKE $1 OR brand ILIKE $1 OR model ILIKE $1 
         ORDER BY created_at DESC`,
        [searchTerm]
      );
      return result.rows;
    } catch (error) {
      console.error('❌ Vehicle.search error:', error.message);
      return [];
    }
  }
}

module.exports = Vehicle;

