/**
 * Car Brand Model
 * Database operations for car brands
 * Auto-creates table if it doesn't exist
 */

const pool = require('../db/pool');

class CarBrand {
  /**
   * Initialize the car_brands table if it doesn't exist
   */
  static async initTable() {
    try {
      await pool.query(`
        CREATE TABLE IF NOT EXISTS car_brands (
          id SERIAL PRIMARY KEY,
          name TEXT NOT NULL,
          file TEXT,
          models TEXT[],
          description TEXT,
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW()
        )
      `);
      console.log('✅ car_brands table ready');
      return true;
    } catch (error) {
      console.error('❌ Error creating car_brands table:', error.message);
      return false;
    }
  }

  /**
   * Check if table exists
   */
  static async tableExists() {
    try {
      const result = await pool.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = 'car_brands'
        )
      `);
      return result.rows[0].exists;
    } catch (error) {
      return false;
    }
  }

  /**
   * Ensure table exists before any operation
   */
  static async ensureTable() {
    const exists = await this.tableExists();
    if (!exists) {
      await this.initTable();
    }
  }

  static async findAll() {
    try {
      await this.ensureTable();
      const result = await pool.query(
        'SELECT * FROM car_brands ORDER BY name'
      );
      return result.rows;
    } catch (error) {
      console.error('❌ Error in findAll:', error.message);
      return []; // Return empty array instead of throwing
    }
  }

  static async findById(id) {
    try {
      await this.ensureTable();
      const result = await pool.query(
        'SELECT * FROM car_brands WHERE id = $1',
        [id]
      );
      return result.rows[0] || null;
    } catch (error) {
      console.error('❌ Error in findById:', error.message);
      return null;
    }
  }

  static async findByName(name) {
    try {
      await this.ensureTable();
      const result = await pool.query(
        'SELECT * FROM car_brands WHERE name = $1',
        [name]
      );
      return result.rows[0] || null;
    } catch (error) {
      console.error('❌ Error in findByName:', error.message);
      return null;
    }
  }

  static async create(carBrandData) {
    await this.ensureTable();
    const { name, file, models, description } = carBrandData;

    const result = await pool.query(
      `INSERT INTO car_brands (name, file, models, description) 
       VALUES ($1, $2, $3, $4) 
       RETURNING *`,
      [
        name.trim(),
        file || null,
        models || [],
        description || null
      ]
    );
    return result.rows[0];
  }

  static async update(id, carBrandData) {
    await this.ensureTable();
    const updates = [];
    const values = [];
    let paramCount = 1;

    if (carBrandData.name) {
      updates.push(`name = $${paramCount++}`);
      values.push(carBrandData.name.trim());
    }
    if (carBrandData.file !== undefined) {
      updates.push(`file = $${paramCount++}`);
      values.push(carBrandData.file || null);
    }
    if (carBrandData.models !== undefined) {
      updates.push(`models = $${paramCount++}`);
      values.push(carBrandData.models);
    }
    if (carBrandData.description !== undefined) {
      updates.push(`description = $${paramCount++}`);
      values.push(carBrandData.description || null);
    }

    if (updates.length === 0) {
      return null;
    }

    updates.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(id);

    const query = `UPDATE car_brands SET ${updates.join(', ')} WHERE id = $${paramCount} RETURNING *`;
    const result = await pool.query(query, values);
    return result.rows[0] || null;
  }

  static async delete(id) {
    try {
      await this.ensureTable();
      const result = await pool.query(
        'DELETE FROM car_brands WHERE id = $1 RETURNING id, name',
        [id]
      );
      return result.rows[0] || null;
    } catch (error) {
      console.error('❌ Error in delete:', error.message);
      return null;
    }
  }
}

module.exports = CarBrand;
