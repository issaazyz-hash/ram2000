/**
 * Acha2 Controller
 * Handles Acha2 product CRUD operations using fields ending with "2"
 */

const pool = require('../db/pool');

class Acha2Controller {
  /**
   * Get acha2 product by name (sub_id)
   * Returns product data with fields ending with "2"
   */
  static async getByName(req, res) {
    try {
      const { name } = req.query;
      
      if (!name) {
        return res.status(400).json({
          success: false,
          error: 'Product name is required'
        });
      }

      // Ensure table exists and has acha2 fields
      await pool.query(`
        CREATE TABLE IF NOT EXISTS acha_products (
          id SERIAL PRIMARY KEY,
          sub_id TEXT UNIQUE NOT NULL,
          name TEXT,
          quantity2 INTEGER DEFAULT 0,
          description2 TEXT,
          price2 NUMERIC(12,3) DEFAULT 0.000,
          references2 JSONB DEFAULT '[]'::jsonb,
          images2 JSONB DEFAULT '[]'::jsonb,
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW()
        )
      `);

      // Check and add missing columns if needed
      const columnsCheck = await pool.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'acha_products' 
        AND column_name IN ('quantity2', 'description2', 'price2', 'references2', 'images2')
      `);
      
      const existingColumns = columnsCheck.rows.map(row => row.column_name);
      
      if (!existingColumns.includes('quantity2')) {
        await pool.query(`ALTER TABLE acha_products ADD COLUMN quantity2 INTEGER DEFAULT 0`);
      }
      if (!existingColumns.includes('description2')) {
        await pool.query(`ALTER TABLE acha_products ADD COLUMN description2 TEXT`);
      }
      if (!existingColumns.includes('price2')) {
        await pool.query(`ALTER TABLE acha_products ADD COLUMN price2 NUMERIC(12,3) DEFAULT 0.000`);
      }
      if (!existingColumns.includes('references2')) {
        await pool.query(`ALTER TABLE acha_products ADD COLUMN references2 JSONB DEFAULT '[]'::jsonb`);
      }
      if (!existingColumns.includes('images2')) {
        await pool.query(`ALTER TABLE acha_products ADD COLUMN images2 JSONB DEFAULT '[]'::jsonb`);
      }

      // Find product by name (sub_id)
      const result = await pool.query(
        'SELECT * FROM acha_products WHERE sub_id = $1',
        [name]
      );

      let product;

      if (result.rows.length === 0) {
        // Create new product if it doesn't exist
        const insertResult = await pool.query(
          `INSERT INTO acha_products (sub_id, name, quantity2, description2, price2, references2, images2)
           VALUES ($1, $2, $3, $4, $5, $6, $7)
           RETURNING *`,
          [name, name, 0, '', '0.000', '[]', '[]']
        );
        product = insertResult.rows[0];
      } else {
        product = result.rows[0];
      }

      // Parse JSONB fields
      if (product.references2 && typeof product.references2 === 'string') {
        try {
          product.references2 = JSON.parse(product.references2);
        } catch (e) {
          product.references2 = [];
        }
      }
      if (!Array.isArray(product.references2)) {
        product.references2 = [];
      }

      if (product.images2 && typeof product.images2 === 'string') {
        try {
          product.images2 = JSON.parse(product.images2);
        } catch (e) {
          product.images2 = [];
        }
      }
      if (!Array.isArray(product.images2)) {
        product.images2 = [];
      }

      res.set({
        "Cache-Control": "no-cache, no-store, must-revalidate",
        "Pragma": "no-cache",
        "Expires": "0"
      });

      res.status(200).json({
        success: true,
        data: {
          id: product.id,
          name: product.name || product.sub_id,
          quantity2: product.quantity2 || 0,
          description2: product.description2 || '',
          price2: product.price2 ? parseFloat(product.price2) : 0.000,
          references2: product.references2 || [],
          images2: product.images2 || []
        }
      });
    } catch (error) {
      console.error('❌ Error in getByName:', error.message);
      res.status(500).json({
        success: false,
        error: 'Failed to get product'
      });
    }
  }

  /**
   * Update acha2 product by name (sub_id)
   * Updates only fields ending with "2"
   */
  static async updateByName(req, res) {
    try {
      const { name } = req.query;
      const { quantity2, description2, price2, references2, images2 } = req.body;

      if (!name) {
        return res.status(400).json({
          success: false,
          error: 'Product name is required'
        });
      }

      // Ensure table exists
      await pool.query(`
        CREATE TABLE IF NOT EXISTS acha_products (
          id SERIAL PRIMARY KEY,
          sub_id TEXT UNIQUE NOT NULL,
          name TEXT,
          quantity2 INTEGER DEFAULT 0,
          description2 TEXT,
          price2 NUMERIC(12,3) DEFAULT 0.000,
          references2 JSONB DEFAULT '[]'::jsonb,
          images2 JSONB DEFAULT '[]'::jsonb,
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW()
        )
      `);

      // Check if product exists
      const checkResult = await pool.query(
        'SELECT id FROM acha_products WHERE sub_id = $1',
        [name]
      );

      const updates = [];
      const values = [];
      let paramCount = 1;

      if (quantity2 !== undefined) {
        updates.push(`quantity2 = $${paramCount}`);
        values.push(parseInt(quantity2) || 0);
        paramCount++;
      }

      if (description2 !== undefined) {
        updates.push(`description2 = $${paramCount}`);
        values.push(description2 || '');
        paramCount++;
      }

      if (price2 !== undefined) {
        updates.push(`price2 = $${paramCount}`);
        values.push(parseFloat(price2) || 0.000);
        paramCount++;
      }

      if (references2 !== undefined) {
        updates.push(`references2 = $${paramCount}::jsonb`);
        values.push(JSON.stringify(Array.isArray(references2) ? references2 : []));
        paramCount++;
      }

      if (images2 !== undefined) {
        updates.push(`images2 = $${paramCount}::jsonb`);
        values.push(JSON.stringify(Array.isArray(images2) ? images2 : []));
        paramCount++;
      }

      if (updates.length === 0) {
        return res.status(400).json({
          success: false,
          error: 'No fields to update'
        });
      }

      updates.push(`updated_at = NOW()`);

      if (checkResult.rows.length === 0) {
        // Create new product
        values.unshift(name, name); // sub_id, name
        const insertQuery = `
          INSERT INTO acha_products (sub_id, name, ${updates.map(u => u.split(' = ')[0]).join(', ')})
          VALUES ($1, $2, ${updates.map((_, i) => `$${i + 3}`).join(', ')})
          RETURNING *
        `;
        const result = await pool.query(insertQuery, values);
        
        let product = result.rows[0];
        
        // Parse JSONB fields
        if (product.references2 && typeof product.references2 === 'string') {
          try {
            product.references2 = JSON.parse(product.references2);
          } catch (e) {
            product.references2 = [];
          }
        }
        if (!Array.isArray(product.references2)) {
          product.references2 = [];
        }

        if (product.images2 && typeof product.images2 === 'string') {
          try {
            product.images2 = JSON.parse(product.images2);
          } catch (e) {
            product.images2 = [];
          }
        }
        if (!Array.isArray(product.images2)) {
          product.images2 = [];
        }

        res.status(200).json({
          success: true,
          data: {
            id: product.id,
            name: product.name || product.sub_id,
            quantity2: product.quantity2 || 0,
            description2: product.description2 || '',
            price2: product.price2 ? parseFloat(product.price2) : 0.000,
            references2: product.references2 || [],
            images2: product.images2 || []
          }
        });
      } else {
        // Update existing product
        values.push(checkResult.rows[0].id);
        const updateQuery = `
          UPDATE acha_products 
          SET ${updates.join(', ')}
          WHERE id = $${paramCount}
          RETURNING *
        `;
        const result = await pool.query(updateQuery, values);
        
        let product = result.rows[0];
        
        // Parse JSONB fields
        if (product.references2 && typeof product.references2 === 'string') {
          try {
            product.references2 = JSON.parse(product.references2);
          } catch (e) {
            product.references2 = [];
          }
        }
        if (!Array.isArray(product.references2)) {
          product.references2 = [];
        }

        if (product.images2 && typeof product.images2 === 'string') {
          try {
            product.images2 = JSON.parse(product.images2);
          } catch (e) {
            product.images2 = [];
          }
        }
        if (!Array.isArray(product.images2)) {
          product.images2 = [];
        }

        res.status(200).json({
          success: true,
          data: {
            id: product.id,
            name: product.name || product.sub_id,
            quantity2: product.quantity2 || 0,
            description2: product.description2 || '',
            price2: product.price2 ? parseFloat(product.price2) : 0.000,
            references2: product.references2 || [],
            images2: product.images2 || []
          }
        });
      }
    } catch (error) {
      console.error('❌ Error in updateByName:', error.message);
      res.status(500).json({
        success: false,
        error: 'Failed to update product'
      });
    }
  }
}

module.exports = Acha2Controller;

