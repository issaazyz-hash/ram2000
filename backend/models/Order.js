/**
 * Order Model
 * Database operations for orders
 */

const pool = require('../db/pool');

class Order {
  /**
   * Find all orders, sorted by newest first
   * @param {Object} options - { status?: string } optional filter
   */
  static async findAll(options = {}) {
    let sql = 'SELECT * FROM orders';
    const params = [];
    if (options.status) {
      params.push(options.status);
      sql += ` WHERE status = $1`;
    }
    sql += ' ORDER BY created_at DESC';
    const result = await pool.query(sql, params);
    
    // Parse product_snapshot JSONB if it's a string (shouldn't happen with pg, but safe guard)
    return result.rows.map(row => {
      if (row.product_snapshot && typeof row.product_snapshot === 'string') {
        try {
          row.product_snapshot = JSON.parse(row.product_snapshot);
        } catch (e) {
          console.warn('Failed to parse product_snapshot for order', row.id);
          row.product_snapshot = {};
        }
      }
      return row;
    });
  }

  /**
   * Find order by ID
   */
  static async findById(id) {
    const result = await pool.query(
      'SELECT * FROM orders WHERE id = $1',
      [id]
    );
    
    if (!result.rows[0]) {
      return null;
    }
    
    const order = result.rows[0];
    
    // Parse product_snapshot JSONB if it's a string (shouldn't happen with pg, but safe guard)
    if (order.product_snapshot && typeof order.product_snapshot === 'string') {
      try {
        order.product_snapshot = JSON.parse(order.product_snapshot);
      } catch (e) {
        console.warn('Failed to parse product_snapshot for order', id);
        order.product_snapshot = {};
      }
    }
    
    return order;
  }

  /**
   * Create a new order
   */
  static async create(orderData) {
    const {
      product_id,
      product_name,
      product_image,
      product_price,
      product_references,
      product_snapshot,
      quantity,
      customer_nom,
      customer_prenom,
      customer_phone,
      customer_wilaya,
      customer_delegation,
      promo_id,
      origin,
      status,
      promo_slug,
      brand_name,
      model_name
    } = orderData;

    // Validate required fields with explicit checks
    if (!product_name) {
      throw new Error('product_name is required');
    }
    if (!customer_nom || !customer_nom.trim()) {
      throw new Error('customer_nom is required and cannot be empty');
    }
    if (!customer_prenom || !customer_prenom.trim()) {
      throw new Error('customer_prenom is required and cannot be empty');
    }
    if (!customer_phone || !customer_phone.trim()) {
      throw new Error('customer_phone is required and cannot be empty');
    }
    if (!customer_wilaya || !customer_wilaya.trim()) {
      throw new Error('customer_wilaya is required and cannot be empty');
    }
    if (!customer_delegation || !customer_delegation.trim()) {
      throw new Error('customer_delegation is required and cannot be empty');
    }
    if (!quantity || quantity < 1) {
      throw new Error('quantity must be at least 1');
    }

    // Prepare values with explicit type casting
    // Schema: product_id (INTEGER), product_name (TEXT), product_image (TEXT), 
    //         product_price (NUMERIC), product_references (TEXT[]), product_snapshot (JSONB),
    //         quantity (INTEGER), customer_nom (TEXT), customer_prenom (TEXT), customer_phone (TEXT),
    //         customer_wilaya (TEXT), customer_delegation (TEXT)
    const values = [
      // INTEGER: product_id (nullable, optional)
      (product_id !== undefined && product_id !== null) ? Number(product_id) : null,
      
      // TEXT: product_name (required)
      product_name.trim(),
      
      // TEXT: product_image (nullable)
      product_image || null,
      
      // NUMERIC: product_price (required, default 0)
      product_price !== undefined && product_price !== null ? parseFloat(product_price) : 0,
      
      // TEXT[]: product_references (array, default empty)
      Array.isArray(product_references) ? product_references : [],
      
      // JSONB: product_snapshot (full product object)
      product_snapshot ? JSON.stringify(product_snapshot) : '{}',
      
      // INTEGER: quantity (required, must be >= 1)
      Number(quantity),
      
      // TEXT: customer fields (all required)
      customer_nom.trim(),
      customer_prenom.trim(),
      customer_phone.trim(),
      customer_wilaya.trim(),
      customer_delegation.trim()
    ];

    // Final validation: ensure INTEGER values are actually integers
    if (values[0] !== null && !Number.isInteger(values[0])) {
      throw new Error('product_id must be an integer or null');
    }
    if (!Number.isInteger(values[6])) {
      throw new Error('quantity must be an integer');
    }

    // Debug: Log values before insert (with types) - safe logging
    console.log('📝 Order Model: INSERT VALUES:', {
      product_id: values[0] !== null ? `${values[0]} (${typeof values[0]})` : 'null',
      product_name: values[1]?.substring(0, 50) || 'empty',
      product_price: `${values[3]} (${typeof values[3]})`,
      product_snapshot: values[5] ? 'JSONB object' : 'empty',
      quantity: `${values[6]} (${typeof values[6]})`,
      customer_nom: values[7]?.substring(0, 30) || 'empty',
      customer_prenom: values[8]?.substring(0, 30) || 'empty',
      customer_phone: values[9]?.substring(0, 20) || 'empty',
      customer_wilaya: values[10]?.substring(0, 30) || 'empty',
      customer_delegation: values[11]?.substring(0, 30) || 'empty'
    });

    // 🛡️ SAFE COLUMN DETECTION: Check if legacy columns exist for backward compatibility
    // This prevents NULL constraint violations on old NOT NULL columns
    let existingColumns = [];
    let columnDetectionFailed = false;
    const legacyColumnNames = ['governorate', 'delegation', 'firstname', 'lastname', 'phone'];

    try {
      console.log('🛡️ ORDER MODEL: Checking for legacy columns in orders table...');
      const columnCheck = await pool.query(`
        SELECT column_name
        FROM information_schema.columns
        WHERE table_name = 'orders'
        AND table_schema = 'public'
      `);
      
      existingColumns = columnCheck.rows.map(row => row.column_name.toLowerCase());
      console.log('🛡️ ORDER MODEL: Column detection successful. Found columns:', existingColumns.length);
      
      // Log detected legacy columns
      const detectedLegacyColumns = legacyColumnNames.filter(col => existingColumns.includes(col.toLowerCase()));
      if (detectedLegacyColumns.length > 0) {
        console.log('🛡️ ORDER MODEL: Detected legacy columns:', detectedLegacyColumns.join(', '));
      } else {
        console.log('🛡️ ORDER MODEL: No legacy columns detected. Using new schema only.');
      }
    } catch (columnCheckError) {
      // 🛡️ FALLBACK STRATEGY: If column detection fails, assume ALL legacy columns exist
      // This is the SAFEST approach - better to include unnecessary columns than miss required ones
      columnDetectionFailed = true;
      existingColumns = legacyColumnNames.map(col => col.toLowerCase()); // Assume all exist
      console.error('🛡️ ORDER MODEL: ⚠️ Column detection FAILED:', columnCheckError.message);
      console.log('🛡️ ORDER MODEL: 🛡️ FALLBACK MODE ACTIVATED - Assuming ALL legacy columns exist for safety');
      console.log('🛡️ ORDER MODEL: Will include in INSERT:', legacyColumnNames.join(', '));
    }

    // Build INSERT statement with new columns (always included)
    let insertSQL = `INSERT INTO orders (
      product_id, product_name, product_image, product_price, product_references, product_snapshot,
      quantity, customer_nom, customer_prenom, customer_phone, 
      customer_wilaya, customer_delegation`;
    
    const columnsToAdd = [];
    
    // 🛡️ GUARANTEED INSERT COVERAGE: Include legacy columns if they exist OR if detection failed
    // Check each legacy column (case-insensitive)
    if (columnDetectionFailed || existingColumns.includes('governorate')) {
      insertSQL += ', governorate';
      values.push(customer_wilaya.trim()); // Map customer_wilaya to governorate
      columnsToAdd.push('governorate');
    }
    if (columnDetectionFailed || existingColumns.includes('delegation')) {
      insertSQL += ', delegation';
      values.push(customer_delegation.trim()); // Map customer_delegation to delegation
      columnsToAdd.push('delegation');
    }
    if (columnDetectionFailed || existingColumns.includes('firstname')) {
      insertSQL += ', firstname';
      values.push(customer_prenom.trim());
      columnsToAdd.push('firstname');
    }
    if (columnDetectionFailed || existingColumns.includes('lastname')) {
      insertSQL += ', lastname';
      values.push(customer_nom.trim());
      columnsToAdd.push('lastname');
    }
    if (columnDetectionFailed || existingColumns.includes('phone')) {
      insertSQL += ', phone';
      values.push(customer_phone.trim());
      columnsToAdd.push('phone');
    }

    // Promo fields (for promo-origin orders)
    if (existingColumns.includes('promo_id')) {
      insertSQL += ', promo_id';
      values.push(promo_id != null && Number.isFinite(Number(promo_id)) ? Number(promo_id) : null);
      columnsToAdd.push('promo_id');
    }
    if (existingColumns.includes('origin')) {
      insertSQL += ', origin';
      values.push(typeof origin === 'string' ? origin.trim() || 'normal' : 'normal');
      columnsToAdd.push('origin');
    }
    if (existingColumns.includes('status')) {
      insertSQL += ', status';
      values.push(typeof status === 'string' ? status.trim() || 'pending' : 'pending');
      columnsToAdd.push('status');
    }
    if (existingColumns.includes('promo_slug')) {
      insertSQL += ', promo_slug';
      values.push(typeof promo_slug === 'string' ? promo_slug.trim() || null : null);
      columnsToAdd.push('promo_slug');
    }
    if (existingColumns.includes('brand_name')) {
      insertSQL += ', brand_name';
      values.push(typeof brand_name === 'string' ? brand_name.trim().substring(0, 255) || null : null);
      columnsToAdd.push('brand_name');
    }
    if (existingColumns.includes('model_name')) {
      insertSQL += ', model_name';
      values.push(typeof model_name === 'string' ? model_name.trim().substring(0, 255) || null : null);
      columnsToAdd.push('model_name');
    }

    // Log final INSERT strategy
    if (columnsToAdd.length > 0) {
      console.log('🛡️ ORDER MODEL: ✅ Including legacy columns in INSERT:', columnsToAdd.join(', '));
    }
    console.log('🛡️ ORDER MODEL: Total values for INSERT:', values.length);

    insertSQL += `) VALUES (`;
    for (let i = 1; i <= values.length; i++) {
      insertSQL += `$${i}`;
      if (i < values.length) insertSQL += ', ';
    }
    insertSQL += `) RETURNING *`;

    // Log final SQL (safe logging - no SQL injection risk in logs)
    console.log('🛡️ Order Model: Executing INSERT with', values.length, 'parameters');
    console.log('🛡️ Order Model: SQL prepared statement ready');
    
    // Verify parameter count matches placeholders
    const placeholderCount = (insertSQL.match(/\$\d+/g) || []).length;
    if (placeholderCount !== values.length) {
      throw new Error(`SQL parameter mismatch: ${placeholderCount} placeholders but ${values.length} values`);
    }
    
    try {
      const result = await pool.query(insertSQL, values);
      console.log('🛡️ ORDER MODEL: ✅ Order inserted successfully');
      return result.rows[0];
    } catch (insertError) {
      // Enhanced error logging with full PostgreSQL error details
      console.error('❌ Order Model: INSERT FAILED');
      console.error('   PostgreSQL Code:', insertError.code || 'N/A');
      console.error('   Message:', insertError.message || 'Unknown error');
      if (insertError.detail) console.error('   Detail:', insertError.detail);
      if (insertError.hint) console.error('   Hint:', insertError.hint);
      if (insertError.column) console.error('   Column:', insertError.column);
      if (insertError.table) console.error('   Table:', insertError.table);
      if (insertError.constraint) console.error('   Constraint:', insertError.constraint);
      
      // Enhanced error logging for NULL constraint violations
      if (insertError.code === '23502' || insertError.message.includes('NULL') || insertError.message.includes('NOT NULL')) {
        console.error('🛡️ ORDER MODEL: ❌ NULL CONSTRAINT VIOLATION DETECTED!');
        console.error('🛡️ ORDER MODEL: This should NOT happen with hardened backward compatibility');
        console.error('🛡️ ORDER MODEL: Columns included:', columnsToAdd.length > 0 ? columnsToAdd.join(', ') : 'none');
        console.error('🛡️ ORDER MODEL: Column detection status:', columnDetectionFailed ? 'FAILED (fallback used)' : 'SUCCESS');
      }
      
      // Enhanced error logging for type errors
      if (insertError.code === '22P02') {
        console.error('🛡️ Order Model: ❌ TYPE MISMATCH DETECTED!');
        console.error('🛡️ Order Model: Invalid input syntax for type. Check INTEGER/NUMERIC/JSONB fields.');
        console.error('🛡️ Order Model: product_id type:', typeof values[0], 'value:', values[0]);
        console.error('🛡️ Order Model: quantity type:', typeof values[6], 'value:', values[6]);
        console.error('🛡️ Order Model: product_price type:', typeof values[3], 'value:', values[3]);
        console.error('🛡️ Order Model: product_snapshot type:', typeof values[5]);
      }
      
      throw insertError; // Re-throw to be handled by controller
    }
  }

  /**
   * Update order status
   */
  static async updateStatus(id, status) {
    const result = await pool.query(
      'UPDATE orders SET status = $1 WHERE id = $2 RETURNING *',
      [status, id]
    );
    return result.rows[0] || null;
  }

  /**
   * Delete an order
   */
  static async delete(id) {
    const result = await pool.query(
      'DELETE FROM orders WHERE id = $1 RETURNING id',
      [id]
    );
    return result.rows[0] || null;
  }
}

module.exports = Order;

