const pool = require('../db/pool');

class DashboardProduct {
  static async initTable() {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS dashboard_products (
        id SERIAL PRIMARY KEY,
        acha_id INTEGER NOT NULL,
        sub_id TEXT,
        name TEXT,
        price NUMERIC(12,3),
        quantity INTEGER,
        first_image TEXT,
        reference TEXT,
        promotion_percentage NUMERIC DEFAULT 0,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);
    
    // Add promotion_percentage column if it doesn't exist
    try {
      await pool.query(`
        ALTER TABLE dashboard_products 
        ADD COLUMN IF NOT EXISTS promotion_percentage NUMERIC DEFAULT 0
      `);
    } catch (err) {
      // Column might already exist, ignore
    }
    
    // Add sub_id column if it doesn't exist
    try {
      await pool.query(`
        ALTER TABLE dashboard_products 
        ADD COLUMN IF NOT EXISTS sub_id TEXT
      `);
    } catch (err) {
      // Column might already exist, ignore
    }
  }

  static async add(product) {
    await this.initTable();
    
    // Check if product already exists
    const existing = await pool.query(
      `SELECT id FROM dashboard_products WHERE acha_id = $1`,
      [product.acha_id]
    );
    
    if (existing.rows.length > 0) {
      const error: any = new Error('Product already exists in dashboard');
      error.exists = true;
      throw error;
    }
    
    const result = await pool.query(
      `INSERT INTO dashboard_products (acha_id, sub_id, name, price, quantity, first_image, reference, promotion_percentage)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
       RETURNING *`,
      [
        product.acha_id,
        product.sub_id || null,
        product.name,
        product.price,
        product.quantity,
        product.first_image,
        product.reference,
        product.promotion_percentage || 0
      ]
    );
    return result.rows[0];
  }

  static async getAll() {
    await this.initTable();
    const result = await pool.query(
      `SELECT * FROM dashboard_products ORDER BY created_at DESC`
    );
    return result.rows;
  }

  static async delete(id) {
    await this.initTable();
    const result = await pool.query(
      `DELETE FROM dashboard_products WHERE id = $1 RETURNING *`,
      [id]
    );
    return result.rows[0] || null;
  }

  static async update(id, productData) {
    await this.initTable();
    const updates = [];
    const values = [];
    let paramCount = 1;

    if (productData.price !== undefined) {
      updates.push(`price = $${paramCount++}`);
      values.push(Number(productData.price));
    }
    if (productData.promotion_percentage !== undefined) {
      updates.push(`promotion_percentage = $${paramCount++}`);
      values.push(Number(productData.promotion_percentage));
    }
    if (productData.quantity !== undefined) {
      updates.push(`quantity = $${paramCount++}`);
      values.push(Number(productData.quantity));
    }
    if (productData.name !== undefined) {
      updates.push(`name = $${paramCount++}`);
      values.push(productData.name);
    }

    if (updates.length === 0) {
      return await this.findById(id);
    }

    values.push(id);
    const query = `UPDATE dashboard_products SET ${updates.join(', ')} WHERE id = $${paramCount} RETURNING *`;
    
    const result = await pool.query(query, values);
    return result.rows[0] || null;
  }

  static async findById(id) {
    await this.initTable();
    const result = await pool.query(
      `SELECT * FROM dashboard_products WHERE id = $1`,
      [id]
    );
    return result.rows[0] || null;
  }
}

module.exports = DashboardProduct;
