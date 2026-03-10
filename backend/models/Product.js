/**
 * Product Model
 * Database operations for products
 * Auto-creates table if it doesn't exist
 */

const pool = require('../db/pool');

class Product {
  /**
   * Initialize the products table if it doesn't exist
   */
  static async initTable() {
    try {
      await pool.query(`
        CREATE TABLE IF NOT EXISTS products (
          id SERIAL PRIMARY KEY,
          name TEXT NOT NULL,
          price NUMERIC,
          original_price NUMERIC,
          discount TEXT,
          main_image TEXT,
          all_images TEXT[],
          brand TEXT,
          sku TEXT,
          category TEXT,
          loyalty_points INTEGER DEFAULT 0,
          has_preview BOOLEAN DEFAULT false,
          has_options BOOLEAN DEFAULT false,
          description TEXT,
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW()
        )
      `);
      console.log('✅ products table ready');
      return true;
    } catch (error) {
      console.error('❌ Error creating products table:', error.message);
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
          AND table_name = 'products'
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

  static async findAll(filters = {}) {
    try {
      await this.ensureTable();
      
      let query = 'SELECT * FROM products';
      const params = [];
      const conditions = [];

      if (filters.category) {
        conditions.push(`category = $${params.length + 1}`);
        params.push(filters.category);
      }

      if (filters.brand) {
        conditions.push(`brand = $${params.length + 1}`);
        params.push(filters.brand);
      }

      if (filters.search) {
        conditions.push(`(name ILIKE $${params.length + 1} OR sku ILIKE $${params.length + 1})`);
        params.push(`%${filters.search}%`);
      }

      if (conditions.length > 0) {
        query += ' WHERE ' + conditions.join(' AND ');
      }

      query += ' ORDER BY created_at DESC';

      const result = await pool.query(query, params);
      
      // Map results to ensure all fields are properly formatted
      return result.rows.map(row => ({
        ...row,
        price: row.price ? parseFloat(row.price) : 0,
        promo_price: row.promo_price ? parseFloat(row.promo_price) : null,
        promo_percent: row.promo_percent ? parseInt(row.promo_percent) : null,
        product_references: Array.isArray(row.product_references) ? row.product_references : (row.product_references || []),
        // Backward compatibility: also provide as "references" for old code
        references: Array.isArray(row.product_references) ? row.product_references : (row.product_references || [])
      }));
    } catch (error) {
      console.error('❌ Error in findAll:', error.message);
      return []; // Return empty array instead of throwing
    }
  }

  static async findById(id) {
    try {
      await this.ensureTable();
      const result = await pool.query(
        'SELECT * FROM products WHERE id = $1',
        [id]
      );
      return result.rows[0] || null;
    } catch (error) {
      console.error('❌ Error in findById:', error.message);
      return null;
    }
  }

  static async findBySku(sku, excludeId = null) {
    try {
      await this.ensureTable();
      let query = 'SELECT id FROM products WHERE sku = $1';
      const params = [sku];
      
      if (excludeId) {
        query += ' AND id != $2';
        params.push(excludeId);
      }
      
      const result = await pool.query(query, params);
      return result.rows.length > 0;
    } catch (error) {
      console.error('❌ Error in findBySku:', error.message);
      return false;
    }
  }

  static async create(productData) {
    await this.ensureTable();
    const {
      name,
      price,
      original_price,
      discount,
      main_image,
      all_images,
      brand,
      sku,
      category,
      loyalty_points,
      has_preview,
      has_options,
      description
    } = productData;

    const result = await pool.query(
      `INSERT INTO products (
        name, price, original_price, discount, main_image, all_images,
        brand, sku, category, loyalty_points, has_preview, has_options, description
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      RETURNING *`,
      [
        name ? name.trim() : '',
        price ? parseFloat(price) : null,
        original_price ? parseFloat(original_price) : null,
        discount || null,
        main_image || null,
        all_images || [],
        brand ? brand.trim() : '',
        sku ? sku.trim() : '',
        category ? category.trim() : '',
        loyalty_points || 0,
        has_preview || false,
        has_options || false,
        description || null
      ]
    );
    return result.rows[0];
  }

  static async update(id, productData) {
    await this.ensureTable();
    const updates = [];
    const values = [];
    let paramCount = 1;

    const fields = [
      'name', 'price', 'original_price', 'discount', 'main_image', 'all_images',
      'brand', 'sku', 'category', 'loyalty_points', 'has_preview', 'has_options', 'description'
    ];

    fields.forEach(field => {
      if (productData[field] !== undefined) {
        if (field === 'price' || field === 'original_price') {
          updates.push(`${field} = $${paramCount++}`);
          values.push(productData[field] ? parseFloat(productData[field]) : null);
        } else if (field === 'name' || field === 'brand' || field === 'sku' || field === 'category') {
          updates.push(`${field} = $${paramCount++}`);
          values.push(productData[field] ? productData[field].trim() : '');
        } else {
          updates.push(`${field} = $${paramCount++}`);
          values.push(productData[field]);
        }
      }
    });

    if (updates.length === 0) {
      return null;
    }

    updates.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(id);

    const query = `UPDATE products SET ${updates.join(', ')} WHERE id = $${paramCount} RETURNING *`;
    const result = await pool.query(query, values);
    return result.rows[0] || null;
  }

  static async delete(id) {
    try {
      await this.ensureTable();
      const result = await pool.query(
        'DELETE FROM products WHERE id = $1 RETURNING id, name, main_image, all_images',
        [id]
      );
      return result.rows[0] || null;
    } catch (error) {
      console.error('❌ Error in delete:', error.message);
      return null;
    }
  }
}

module.exports = Product;
