const pool = require('../db/pool');

// Default brand images
const DEFAULT_BRAND_IMAGES = {
  id: 0,
  title: 'NOS MARQUES DISPONIBLES',
  images: ['/pp.jpg'],
  created_at: new Date(),
  updated_at: new Date()
};

// Track if table has been initialized
let tableInitialized = false;

class BrandImages {
  /**
   * Initialize the brand_images table
   */
  static async initTable() {
    try {
      console.log('📦 Creating brand_images table if not exists...');
      await pool.query(`
        CREATE TABLE IF NOT EXISTS brand_images (
          id SERIAL PRIMARY KEY,
          title TEXT DEFAULT 'NOS MARQUES DISPONIBLES',
          images TEXT[] DEFAULT ARRAY['/pp.jpg'],
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW()
        )
      `);
      tableInitialized = true;
      console.log('✅ brand_images table ready');
      return true;
    } catch (error) {
      console.error('❌ Error creating brand_images table:', error.message);
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
          AND table_name = 'brand_images'
        )
      `);
      return result.rows[0].exists;
    } catch (error) {
      console.error('❌ Error checking brand_images table:', error.message);
      return false;
    }
  }

  /**
   * Ensure table exists before operations
   */
  static async ensureTable() {
    if (tableInitialized) return true;
    
    try {
      const exists = await this.tableExists();
      if (!exists) {
        return await this.initTable();
      }
      tableInitialized = true;
      return true;
    } catch (error) {
      console.error('❌ Error ensuring brand_images table:', error.message);
      return await this.initTable();
    }
  }

  /**
   * Get brand images (single document pattern)
   * NEVER throws - returns default on any error
   */
  static async get() {
    try {
      await this.ensureTable();
      
      const result = await pool.query('SELECT * FROM brand_images ORDER BY id LIMIT 1');
      
      if (result.rows.length === 0) {
        console.log('📝 No brand images found, creating default...');
        return await this.createDefault();
      }
      
      console.log('✅ Brand images fetched from database');
      return result.rows[0];
    } catch (error) {
      console.error('❌ Error getting brand images:', error.message);
      return { ...DEFAULT_BRAND_IMAGES };
    }
  }

  /**
   * Create default brand images
   */
  static async createDefault() {
    try {
      await this.ensureTable();
      
      const result = await pool.query(`
        INSERT INTO brand_images (title, images)
        VALUES ($1, $2)
        RETURNING *
      `, [
        DEFAULT_BRAND_IMAGES.title,
        DEFAULT_BRAND_IMAGES.images
      ]);
      
      console.log('✅ Created default brand images');
      return result.rows[0];
    } catch (error) {
      console.error('❌ Error creating default brand images:', error.message);
      return { ...DEFAULT_BRAND_IMAGES };
    }
  }

  /**
   * Update brand images
   * @param {Object} data - Data to update
   */
  static async update(data) {
    try {
      await this.ensureTable();
      
      const { title, images } = data;
      
      // Check if content exists
      const existing = await pool.query('SELECT id FROM brand_images ORDER BY id LIMIT 1');
      
      if (existing.rows.length === 0) {
        // Create new
        console.log('📝 No existing brand images, inserting new...');
        const result = await pool.query(`
          INSERT INTO brand_images (title, images)
          VALUES ($1, $2)
          RETURNING *
        `, [
          title || DEFAULT_BRAND_IMAGES.title,
          images || DEFAULT_BRAND_IMAGES.images
        ]);
        
        console.log('✅ Brand images created');
        return result.rows[0];
      }
      
      // Build dynamic update query
      const updates = [];
      const values = [];
      let paramCount = 1;
      
      if (title !== undefined) {
        updates.push(`title = $${paramCount++}`);
        values.push(title);
      }
      if (images !== undefined && Array.isArray(images)) {
        updates.push(`images = $${paramCount++}`);
        values.push(images);
      }
      
      if (updates.length === 0) {
        return await this.get();
      }
      
      updates.push(`updated_at = CURRENT_TIMESTAMP`);
      values.push(existing.rows[0].id);
      
      const query = `UPDATE brand_images SET ${updates.join(', ')} WHERE id = $${paramCount} RETURNING *`;
      console.log('📝 Updating brand images...');
      const result = await pool.query(query, values);
      
      console.log('✅ Brand images updated in database');
      return result.rows[0];
    } catch (error) {
      console.error('❌ Error updating brand images:', error.message);
      throw error;
    }
  }

  /**
   * Get current images (for cleanup)
   */
  static async getCurrentImages() {
    try {
      await this.ensureTable();
      const result = await pool.query('SELECT images FROM brand_images ORDER BY id LIMIT 1');
      return result.rows[0]?.images || [];
    } catch (error) {
      console.error('❌ Error getting current images:', error.message);
      return [];
    }
  }
}

module.exports = BrandImages;

