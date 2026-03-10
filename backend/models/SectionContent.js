/**
 * SectionContent Model
 * Handles section_content table operations
 */

const pool = require('../db/pool');

class SectionContent {
  /**
   * Get section content by sectionType
   */
  static async getByType(sectionType) {
    try {
      const result = await pool.query(
        'SELECT * FROM section_content WHERE section_type = $1 ORDER BY id DESC LIMIT 1',
        [sectionType]
      );
      return result.rows[0] || null;
    } catch (error) {
      console.error('Error in SectionContent.getByType:', error);
      throw error;
    }
  }

  /**
   * Get section content by ID
   */
  static async getById(id) {
    try {
      const result = await pool.query(
        'SELECT * FROM section_content WHERE id = $1',
        [id]
      );
      return result.rows[0] || null;
    } catch (error) {
      console.error('Error in SectionContent.getById:', error);
      throw error;
    }
  }

  /**
   * Create new section content
   */
  static async create(data) {
    try {
      const { sectionType, title, description, content } = data;
      
      const result = await pool.query(
        `INSERT INTO section_content (section_type, title, description, content)
         VALUES ($1, $2, $3, $4)
         RETURNING *`,
        [sectionType, title || null, description || null, content ? JSON.stringify(content) : null]
      );
      
      return result.rows[0];
    } catch (error) {
      console.error('Error in SectionContent.create:', error);
      throw error;
    }
  }

  /**
   * Update section content
   */
  static async update(id, data) {
    try {
      const { title, description, content } = data;
      
      const updates = [];
      const values = [];
      let paramCount = 1;
      
      if (title !== undefined) {
        updates.push(`title = $${paramCount++}`);
        values.push(title);
      }
      if (description !== undefined) {
        updates.push(`description = $${paramCount++}`);
        values.push(description);
      }
      if (content !== undefined) {
        updates.push(`content = $${paramCount++}`);
        values.push(content ? JSON.stringify(content) : null);
      }
      
      if (updates.length === 0) {
        return await this.getById(id);
      }
      
      values.push(id);
      const result = await pool.query(
        `UPDATE section_content
         SET ${updates.join(', ')}, updated_at = NOW()
         WHERE id = $${paramCount}
         RETURNING *`,
        values
      );
      
      return result.rows[0];
    } catch (error) {
      console.error('Error in SectionContent.update:', error);
      throw error;
    }
  }

  /**
   * Ensure section_content table exists
   */
  static async ensureTable() {
    try {
      await pool.query(`
        CREATE TABLE IF NOT EXISTS section_content (
          id SERIAL PRIMARY KEY,
          section_type TEXT NOT NULL UNIQUE,
          title TEXT,
          description TEXT,
          content JSONB,
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW()
        )
      `);
    } catch (error) {
      console.error('Error ensuring section_content table:', error);
      throw error;
    }
  }
}

module.exports = SectionContent;

