/**
 * Search Option Model
 * Database operations for search options
 * Auto-creates table if it doesn't exist
 */

const pool = require('../db/pool');

class SearchOption {
  /**
   * Initialize the search_options table if it doesn't exist
   */
  static async initTable() {
    try {
      await pool.query(`
        CREATE TABLE IF NOT EXISTS search_options (
          id SERIAL PRIMARY KEY,
          field TEXT NOT NULL,
          value TEXT NOT NULL,
          created_at TIMESTAMP DEFAULT NOW()
        )
      `);
      console.log('✅ search_options table ready');
      return true;
    } catch (error) {
      console.error('❌ Error creating search_options table:', error.message);
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
          AND table_name = 'search_options'
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

  static async findAll(field = null) {
    try {
      await this.ensureTable();
      
      let query = 'SELECT * FROM search_options';
      const params = [];

      if (field) {
        query += ' WHERE field = $1';
        params.push(field);
      }

      query += ' ORDER BY field, value';

      const result = await pool.query(query, params);
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
        'SELECT * FROM search_options WHERE id = $1',
        [id]
      );
      return result.rows[0] || null;
    } catch (error) {
      console.error('❌ Error in findById:', error.message);
      return null;
    }
  }

  static async create(searchOptionData) {
    await this.ensureTable();
    const { field, value } = searchOptionData;

    const result = await pool.query(
      `INSERT INTO search_options (field, value) 
       VALUES ($1, $2) 
       RETURNING *`,
      [field.trim(), value.trim()]
    );
    return result.rows[0];
  }

  static async delete(id) {
    try {
      await this.ensureTable();
      const result = await pool.query(
        'DELETE FROM search_options WHERE id = $1 RETURNING id',
        [id]
      );
      return result.rows[0] || null;
    } catch (error) {
      console.error('❌ Error in delete:', error.message);
      return null;
    }
  }

  static async deleteByFieldAndValue(field, value) {
    try {
      await this.ensureTable();
      const result = await pool.query(
        'DELETE FROM search_options WHERE field = $1 AND value = $2 RETURNING id',
        [field, value]
      );
      return result.rows;
    } catch (error) {
      console.error('❌ Error in deleteByFieldAndValue:', error.message);
      return [];
    }
  }
}

module.exports = SearchOption;
