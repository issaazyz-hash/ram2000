const pool = require('../db/pool');

exports.getAllDashboardProducts = async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT * FROM dashboard_products ORDER BY created_at DESC"
    );
    
    // Ensure quantity is always returned as a number (handle NULL values)
    const productsWithQuantity = result.rows.map(row => ({
      ...row,
      quantity: row.quantity !== null && row.quantity !== undefined ? Number(row.quantity) : 0
    }));
    
    res.json({
      success: true,
      count: productsWithQuantity.length,
      data: productsWithQuantity
    });
  } catch (error) {
    console.error("Error fetching dashboard products:", error);
    res.status(500).json({ success: false, error: "Failed to load dashboard products" });
  }
};

exports.addDashboardProduct = async (req, res) => {
  try {
    console.log('📥 POST /api/dashboard-products - Request body:', JSON.stringify(req.body, null, 2));
    
    const { name, price, promo_percent, promo_price, image, references, product_references } = req.body;
    
    // Support both "references" and "product_references" for backward compatibility
    const refsArray = product_references || references;
    
    // Validate required fields
    if (!name || !name.trim()) {
      return res.status(400).json({ 
        success: false, 
        error: "Product name is required" 
      });
    }

    if (price === undefined || price === null) {
      return res.status(400).json({ 
        success: false, 
        error: "Product price is required" 
      });
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Check if product with same name already exists (case-insensitive)
      const existingProduct = await client.query(
        'SELECT * FROM products WHERE LOWER(TRIM(name)) = LOWER(TRIM($1))',
        [name.trim()]
      );

      let product;
      
      if (existingProduct.rows.length > 0) {
        // Product exists, return it
        product = existingProduct.rows[0];
        // Add backward compatibility: also provide as "references"
        if (product.product_references && !product.references) {
          product.references = product.product_references;
        }
        console.log('✅ Product already exists:', product.name);
        
        await client.query('COMMIT');
        return res.json({
          success: true,
          data: product,
          message: "Product already exists"
        });
      }

      // Product doesn't exist, insert it
      const numericPrice = parseFloat(price) || 0;
      const numericPromoPercent = promo_percent !== undefined && promo_percent !== null ? parseInt(promo_percent) : null;
      const numericPromoPrice = promo_price !== undefined && promo_price !== null ? parseFloat(promo_price) : null;
      const productReferencesArray = Array.isArray(refsArray) ? refsArray : (refsArray ? [refsArray] : []);

      const insertResult = await client.query(
        `INSERT INTO products (name, price, promo_percent, promo_price, image, product_references, main_image, all_images)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         RETURNING *`,
        [
          name.trim(),
          numericPrice,
          numericPromoPercent,
          numericPromoPrice,
          image || null,
          productReferencesArray,
          image || null, // Also set main_image for backward compatibility
          image ? [image] : [] // Set all_images array
        ]
      );

      product = insertResult.rows[0];
      // Add backward compatibility: also provide as "references"
      if (product.product_references && !product.references) {
        product.references = product.product_references;
      }
      console.log('✅ Product created:', product.name);

      await client.query('COMMIT');
      
      return res.status(201).json({
        success: true,
        data: product,
        message: "Product created successfully"
      });
      
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
    
  } catch (error) {
    console.error("❌ Error in addDashboardProduct:", error);
    
    // Return clear error message
    let errorMessage = "Failed to add product to dashboard";
    if (error.message) {
      errorMessage = error.message;
    } else if (error.code === '23505') {
      errorMessage = "Product with this name already exists";
    }
    
    return res.status(500).json({ 
      success: false, 
      error: errorMessage 
    });
  }
};

exports.deleteDashboardProduct = async (req, res) => {
  try {
    const id = req.params.id;
    const result = await pool.query("DELETE FROM dashboard_products WHERE id = $1 RETURNING *", [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: "Product not found" });
    }

    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error("Error deleting dashboard product:", error);
    const errorMessage = error.message || "Failed to delete product";
    res.status(500).json({ success: false, error: errorMessage });
  }
};

exports.updateDashboardProduct = async (req, res) => {
  try {
    const id = req.params.id;
    const { name, image, reference, price, quantity } = req.body;

    const quantityValue = quantity !== undefined && quantity !== null ? Number(quantity) : null;

    const result = await pool.query(
      `UPDATE dashboard_products 
       SET name = COALESCE($1, name),
           image = COALESCE($2, image),
           reference = COALESCE($3, reference),
           price = COALESCE($4, price),
           quantity = COALESCE($5, quantity)
       WHERE id = $6
       RETURNING *`,
      [name, image, reference, price, quantityValue, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: "Product not found" });
    }

    // Ensure quantity is returned as a number
    const updatedProduct = {
      ...result.rows[0],
      quantity: result.rows[0].quantity !== null && result.rows[0].quantity !== undefined ? Number(result.rows[0].quantity) : 0
    };

    res.json({ success: true, data: updatedProduct });
  } catch (error) {
    console.error("Error updating dashboard product:", error);
    const errorMessage = error.message || "Failed to update product";
    res.status(500).json({ success: false, error: errorMessage });
  }
};
