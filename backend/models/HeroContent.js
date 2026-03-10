const pool = require('../db/pool');

// Default hero content - used as fallback
const DEFAULT_HERO_CONTENT = {
  id: 0,
  title: 'Un large choix de pièces auto',
  subtitle: 'Découvrez des milliers de références pour toutes les marques populaires. Qualité garantie, service fiable.',
  button_text: 'Découvrir le catalogue',
  button_link: '/catalogue',
  images: ['/k.png', '/k2.jpg', '/k3.png'],
  created_at: new Date(),
  updated_at: new Date()
};

// Track if table has been initialized
let tableInitialized = false;

class HeroContent {
  /**
   * Initialize the hero_content table
   */
  static async initTable() {
    try {
      console.log('📦 Creating hero_content table if not exists...');
      await pool.query(`
        CREATE TABLE IF NOT EXISTS hero_content (
          id SERIAL PRIMARY KEY,
          title TEXT DEFAULT 'Un large choix de pièces auto',
          subtitle TEXT DEFAULT 'Découvrez des milliers de références pour toutes les marques populaires. Qualité garantie, service fiable.',
          button_text TEXT DEFAULT 'Découvrir le catalogue',
          button_link TEXT DEFAULT '/catalogue',
          images TEXT[] DEFAULT ARRAY['/k.png', '/k2.jpg', '/k3.png'],
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW()
        )
      `);
      tableInitialized = true;
      console.log('✅ hero_content table ready');
      return true;
    } catch (error) {
      console.error('❌ Error creating hero_content table:', error.message);
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
          AND table_name = 'hero_content'
        )
      `);
      return result.rows[0].exists;
    } catch (error) {
      console.error('❌ Error checking hero_content table:', error.message);
      return false;
    }
  }

  /**
   * Ensure table exists before operations
   */
  static async ensureTable() {
    // Skip if already initialized this session
    if (tableInitialized) return true;
    
    try {
      const exists = await this.tableExists();
      if (!exists) {
        return await this.initTable();
      }
      tableInitialized = true;
      return true;
    } catch (error) {
      console.error('❌ Error ensuring hero_content table:', error.message);
      // Try to create anyway
      return await this.initTable();
    }
  }

  /**
   * Get the hero content (single document pattern)
   * NEVER throws - returns default content on any error
   */
  static async get() {
    try {
      // Ensure table exists first
      await this.ensureTable();
      
      const result = await pool.query('SELECT * FROM hero_content ORDER BY id LIMIT 1');
      
      // If no content exists, create default
      if (result.rows.length === 0) {
        console.log('📝 No hero content found, creating default...');
        return await this.createDefault();
      }
      
      console.log('✅ Hero content fetched from database');
      return result.rows[0];
    } catch (error) {
      console.error('❌ Error getting hero content:', error.message);
      // NEVER throw - return default content instead
      return { ...DEFAULT_HERO_CONTENT };
    }
  }

  /**
   * Create default hero content
   */
  static async createDefault() {
    try {
      await this.ensureTable();
      
      const result = await pool.query(`
        INSERT INTO hero_content (title, subtitle, button_text, button_link, images)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING *
      `, [
        DEFAULT_HERO_CONTENT.title,
        DEFAULT_HERO_CONTENT.subtitle,
        DEFAULT_HERO_CONTENT.button_text,
        DEFAULT_HERO_CONTENT.button_link,
        DEFAULT_HERO_CONTENT.images
      ]);
      
      console.log('✅ Created default hero content');
      return result.rows[0];
    } catch (error) {
      console.error('❌ Error creating default hero content:', error.message);
      // Return in-memory default if database fails
      return { ...DEFAULT_HERO_CONTENT };
    }
  }

  /**
   * Update hero content (upsert pattern - update or insert)
   * @param {Object} data - Content data to update
   */
  static async update(data) {
    try {
      await this.ensureTable();
      
      const { title, subtitle, button_text, button_link, images } = data;
      
      // Check if content exists
      const existing = await pool.query('SELECT id FROM hero_content ORDER BY id LIMIT 1');
      
      if (existing.rows.length === 0) {
        // Create new content
        console.log('📝 No existing hero content, inserting new...');
        const result = await pool.query(`
          INSERT INTO hero_content (title, subtitle, button_text, button_link, images)
          VALUES ($1, $2, $3, $4, $5)
          RETURNING *
        `, [
          title || DEFAULT_HERO_CONTENT.title,
          subtitle || DEFAULT_HERO_CONTENT.subtitle,
          button_text || DEFAULT_HERO_CONTENT.button_text,
          button_link || DEFAULT_HERO_CONTENT.button_link,
          images || DEFAULT_HERO_CONTENT.images
        ]);
        
        console.log('✅ Hero content created');
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
      if (subtitle !== undefined) {
        updates.push(`subtitle = $${paramCount++}`);
        values.push(subtitle);
      }
      if (button_text !== undefined) {
        updates.push(`button_text = $${paramCount++}`);
        values.push(button_text);
      }
      if (button_link !== undefined) {
        updates.push(`button_link = $${paramCount++}`);
        values.push(button_link);
      }
      if (images !== undefined && Array.isArray(images)) {
        updates.push(`images = $${paramCount++}`);
        values.push(images);
      }
      
      // If no updates, return existing
      if (updates.length === 0) {
        return await this.get();
      }
      
      // Always update timestamp
      updates.push(`updated_at = CURRENT_TIMESTAMP`);
      
      // Add the ID for WHERE clause
      values.push(existing.rows[0].id);
      
      const query = `UPDATE hero_content SET ${updates.join(', ')} WHERE id = $${paramCount} RETURNING *`;
      console.log('📝 Updating hero content...');
      const result = await pool.query(query, values);
      
      console.log('✅ Hero content updated in database');
      return result.rows[0];
    } catch (error) {
      console.error('❌ Error updating hero content:', error.message);
      throw error;
    }
  }

  /**
   * Get current images (for cleanup before replacing)
   */
  static async getCurrentImages() {
    try {
      await this.ensureTable();
      const result = await pool.query('SELECT images FROM hero_content ORDER BY id LIMIT 1');
      return result.rows[0]?.images || [];
    } catch (error) {
      console.error('❌ Error getting current images:', error.message);
      return [];
    }
  }
}

module.exports = HeroContent;
