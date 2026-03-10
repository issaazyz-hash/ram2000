/**
 * AchaProduct Model
 * Database operations for Acha page products
 * Stores quantity, product_references, and other product-specific data
 * 
 * FIXED: Renamed "references" to "product_references" (PostgreSQL reserved keyword)
 */

const pool = require('../db/pool');

class AchaProduct {
  /**
   * Initialize the acha_products table if it doesn't exist
   */
  static async initTable() {
    // DEPRECATED: Tables are now created via db/schema.sql (single source of truth)
    // This method is kept for backward compatibility but does nothing
    return true;
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
          AND table_name = 'acha_products'
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

  /**
   * Find all acha products
   */
  static async findAll() {
    try {
      await this.ensureTable();
      const result = await pool.query(
        'SELECT * FROM acha_products ORDER BY created_at DESC'
      );
      return result.rows;
    } catch (error) {
      console.error('❌ Error in findAll:', error.message);
      return [];
    }
  }

  /**
   * Find by ID
   */
  static async findById(id) {
    try {
      await this.ensureTable();
      const result = await pool.query(
        'SELECT * FROM acha_products WHERE id = $1',
        [id]
      );
      return result.rows[0] || null;
    } catch (error) {
      console.error('❌ Error in findById:', error.message);
      return null;
    }
  }

  /**
   * Find by sub_id (product identifier from URL)
   */
  static async findBySubId(subId) {
    try {
      await this.ensureTable();
      const result = await pool.query(
        'SELECT * FROM acha_products WHERE sub_id = $1',
        [subId]
      );
      return result.rows[0] || null;
    } catch (error) {
      console.error('❌ Error in findBySubId:', error.message);
      return null;
    }
  }

  /**
   * Get or create a product by sub_id
   * If product doesn't exist, create it with default values
   */
  static async getOrCreate(subId) {
    try {
      await this.ensureTable();
      
      // First try to find existing product
      let product = await this.findBySubId(subId);
      
      if (!product) {
        // Create new product with default values
        // FIX APPLIED FROM DIAGNOSTIC DOCUMENT: Added ON CONFLICT for idempotency
        const result = await pool.query(
          `INSERT INTO acha_products (sub_id, name, brand_name, model_name, description, price, images, quantity, product_references, promotion_percentage, promotion_price)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
           ON CONFLICT (sub_id) DO UPDATE SET updated_at = CURRENT_TIMESTAMP
           RETURNING *`,
          [
            subId,
            decodeURIComponent(subId),
            null,
            null,
            'Description du produit (modifiable par l\'administrateur).',
            0.000,
            [],
            0,
            [],
            0,
            null
          ]
        );
        product = result.rows[0];
        console.log('✅ Created new acha_product for sub_id:', subId);
      }
      
      return product;
    } catch (error) {
      console.error('❌ Error in getOrCreate:', error.message);
      throw error;
    }
  }

  /**
   * Create a new acha product
   */
  static async create(productData) {
    await this.ensureTable();
    const {
      sub_id,
      name,
      brand_name,
      model_name,
      description,
      price,
      images,
      quantity,
      product_references,
      promotion_percentage,
      promotion_price
    } = productData;

    let numericPrice = price !== undefined ? Number(price) : 0.000;
    if (isNaN(numericPrice) || numericPrice === '' || numericPrice === null || numericPrice === undefined) {
      numericPrice = 0.000;
    }

    let numericPromotionPercentage = promotion_percentage !== undefined ? Number(promotion_percentage) : 0;
    if (isNaN(numericPromotionPercentage)) {
      numericPromotionPercentage = 0;
    }

    let numericPromotionPrice = promotion_price !== undefined && promotion_price !== null && promotion_price !== '' ? Number(promotion_price) : null;
    if (numericPromotionPrice !== null && isNaN(numericPromotionPrice)) {
      numericPromotionPrice = null;
    }

    const result = await pool.query(
      `INSERT INTO acha_products (sub_id, name, brand_name, model_name, description, price, images, quantity, product_references, promotion_percentage, promotion_price)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       RETURNING *`,
      [
        sub_id,
        name || '',
        brand_name || null,
        model_name || null,
        description || '',
        numericPrice,
        images || [],
        quantity || 0,
        product_references || [],
        numericPromotionPercentage,
        numericPromotionPrice
      ]
    );
    
    return result.rows[0];
  }

  /**
   * Update an acha product
   */
  static async update(id, productData) {
    await this.ensureTable();
    
    if (productData.price !== undefined) {
      productData.price = Number(productData.price);
      if (isNaN(productData.price) || productData.price === '' || productData.price === null || productData.price === undefined) {
        productData.price = 0.000;
      }
    }

    if (productData.promotion_percentage !== undefined) {
      productData.promotion_percentage = Number(productData.promotion_percentage);
      if (isNaN(productData.promotion_percentage)) {
        productData.promotion_percentage = 0;
      }
    }

    if (productData.promotion_price !== undefined) {
      productData.promotion_price = Number(productData.promotion_price);
      if (isNaN(productData.promotion_price) || productData.promotion_price === '' || productData.promotion_price === null) {
        productData.promotion_price = null;
      }
    }

    console.log("🔥 FINAL WRITE:", productData);

    const updates = [];
    const values = [];
    let paramCount = 1;

    const fields = [
      'name',
      'brand_name',
      'model_name',
      'description',
      'price',
      'images',
      'quantity',
      'product_references',
      'promotion_percentage',
      'promotion_price'
    ];

    fields.forEach(field => {
      if (productData[field] !== undefined) {
        updates.push(`${field} = $${paramCount++}`);
        values.push(productData[field]);
      }
    });

    if (updates.length === 0) {
      return await this.findById(id);
    }

    updates.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(id);

    const query = `UPDATE acha_products SET ${updates.join(', ')} WHERE id = $${paramCount} RETURNING *`;
    
    await pool.query(query, values);
    
    const fresh = await this.findById(id);
    return fresh;
  }

  /**
   * Delete an acha product
   */
  static async delete(id) {
    try {
      await this.ensureTable();
      const result = await pool.query(
        'DELETE FROM acha_products WHERE id = $1 RETURNING *',
        [id]
      );
      return result.rows[0] || null;
    } catch (error) {
      console.error('❌ Error in delete:', error.message);
      return null;
    }
  }

  /**
   * Decrease quantity by 1 (for vente hors ligne)
   */
  static async decreaseQuantity(id) {
    try {
      await this.ensureTable();
      const result = await pool.query(
        `UPDATE acha_products 
         SET quantity = GREATEST(0, quantity - 1), updated_at = CURRENT_TIMESTAMP 
         WHERE id = $1 
         RETURNING *`,
        [id]
      );
      return result.rows[0] || null;
    } catch (error) {
      console.error('❌ Error in decreaseQuantity:', error.message);
      return null;
    }
  }
}

module.exports = AchaProduct;
