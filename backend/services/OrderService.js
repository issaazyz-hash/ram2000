/**
 * Order Service
 * Business logic for order operations
 * Handles validation, transactions, and business rules
 */

const Order = require('../models/Order');
const pool = require('../db/pool');
const PromotionsStockService = require('./PromotionsStockService');
const SectionContent = require('../models/SectionContent');

class OrderService {
  /**
   * Validate order data
   * @param {Object} orderData - Order data to validate
   * @throws {Error} If validation fails
   */
  static validateOrderData(orderData) {
    // Validate product object (required)
    if (!orderData.product || typeof orderData.product !== 'object') {
      throw new Error('Product object is required');
    }

    // Validate product.name (required)
    if (!orderData.product.name || !orderData.product.name.trim()) {
      throw new Error('Product name is required');
    }

    // Validate product.price (required)
    if (orderData.product.price === undefined || orderData.product.price === null) {
      throw new Error('Product price is required');
    }
    const price = parseFloat(orderData.product.price);
    if (isNaN(price) || price < 0) {
      throw new Error('Product price must be a non-negative number');
    }

    // Required customer fields
    if (!orderData.customer_nom || !orderData.customer_nom.trim()) {
      throw new Error('Customer last name is required');
    }
    if (!orderData.customer_prenom || !orderData.customer_prenom.trim()) {
      throw new Error('Customer first name is required');
    }
    if (!orderData.customer_phone || !orderData.customer_phone.trim()) {
      throw new Error('Customer phone is required');
    }
    if (!orderData.customer_wilaya || !orderData.customer_wilaya.trim()) {
      throw new Error('Customer wilaya is required');
    }
    if (!orderData.customer_delegation || !orderData.customer_delegation.trim()) {
      throw new Error('Customer delegation is required');
    }

    // Validate quantity - must be a valid integer
    const quantity = orderData.quantity;
    if (quantity === undefined || quantity === null) {
      throw new Error('Quantity is required');
    }
    const quantityNum = Number(quantity);
    if (isNaN(quantityNum) || !Number.isInteger(quantityNum) || quantityNum < 1) {
      throw new Error('Quantity must be a positive integer (at least 1)');
    }
  }

  /**
   * Create a new order
   * @param {Object} orderData - Order data
   * @returns {Promise<Object>} Created order
   */
  static async createOrder(orderData) {
    // Log received payload
    console.log('📦 OrderService: Received order payload:', {
      product: orderData.product ? { name: orderData.product.name, price: orderData.product.price } : null,
      quantity: orderData.quantity,
      customer_nom: orderData.customer_nom
    });

    // Validate input
    this.validateOrderData(orderData);

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Validate product_id exists in products table if provided
      let validatedProductId = null;
      if (orderData.product.id !== undefined && orderData.product.id !== null) {
        const productIdNum = Number(orderData.product.id);
        if (!isNaN(productIdNum) && productIdNum > 0) {
          // Check if product exists in products table
          const productCheck = await client.query(
            'SELECT id FROM products WHERE id = $1',
            [productIdNum]
          );
          if (productCheck.rows.length > 0) {
            validatedProductId = productIdNum;
          } else {
            console.warn(`⚠️  OrderService: Product ID ${productIdNum} does not exist in products table, setting to null`);
            validatedProductId = null;
          }
        }
      }

      // Create product snapshot from product object
      const productSnapshot = {
        name: orderData.product.name.trim(),
        price: parseFloat(orderData.product.price),
        image: orderData.product.image || orderData.product.product_image || null,
        product_references: Array.isArray(orderData.product.product_references) 
          ? orderData.product.product_references
          : (Array.isArray(orderData.product.references) 
            ? orderData.product.references 
            : []),
        // Backward compatibility: also include as "references"
        references: Array.isArray(orderData.product.product_references) 
          ? orderData.product.product_references
          : (Array.isArray(orderData.product.references) 
            ? orderData.product.references 
            : []),
        id: orderData.product.id || null,
        sub_id: orderData.product.sub_id || null,
        brand_name: orderData.product.brand_name || null,
        model_name: orderData.product.model_name || null,
        description: orderData.product.description || null,
        promotion_percentage: orderData.product.promotion_percentage || null,
        promotion_price: orderData.product.promotion_price || null,
        ...orderData.product // Include any additional product fields
      };

      // Normalize origin from top-level payload first, then fallback to product.source.
      const sourceFromProduct =
        typeof orderData.product?.source === 'string'
          ? orderData.product.source.trim().toLowerCase()
          : '';
      const originFromPayload =
        typeof orderData.origin === 'string'
          ? orderData.origin.trim().toLowerCase()
          : '';
      const normalizedOrigin =
        originFromPayload === 'promotion' || originFromPayload === 'cat3' || originFromPayload === 'cat2'
          ? originFromPayload
          : (sourceFromProduct === 'promotion' || sourceFromProduct === 'cat3' || sourceFromProduct === 'cat2'
            ? sourceFromProduct
            : 'normal');

      // Prepare order data
      const preparedOrderData = {
        // INTEGER: product_id (nullable, optional - validated if provided)
        product_id: validatedProductId,
        
        // TEXT: product_name (required, extracted from product object)
        product_name: orderData.product.name.trim(),
        
        // TEXT: product_image (nullable)
        product_image: orderData.product.image || orderData.product.product_image || null,
        
        // NUMERIC: product_price (required, extracted from product object)
        product_price: parseFloat(orderData.product.price),
        
        // TEXT[]: product_references (array)
        product_references: Array.isArray(orderData.product.product_references) 
          ? orderData.product.product_references
          : (Array.isArray(orderData.product.references) 
            ? orderData.product.references 
            : []),
        
        // JSONB: product_snapshot (full product object)
        product_snapshot: productSnapshot,
        
        // INTEGER: quantity (required, must be >= 1)
        quantity: Number(orderData.quantity),
        
        // Promo / Cat3 / Cat2 origin (promotion | cat3 | cat2 | normal)
        origin: normalizedOrigin,
        promo_id: orderData.promo_id != null && Number.isFinite(Number(orderData.promo_id)) ? Number(orderData.promo_id) : null,
        promo_slug: typeof orderData.promo_slug === 'string' ? orderData.promo_slug.trim() || null : null,
        status: 'pending',
        
        // TEXT: customer fields (all required)
        customer_nom: orderData.customer_nom.trim(),
        customer_prenom: orderData.customer_prenom.trim(),
        customer_phone: orderData.customer_phone.trim(),
        customer_wilaya: orderData.customer_wilaya.trim(),
        customer_delegation: orderData.customer_delegation.trim(),

        // Marque/Modèle snapshot (human-readable names for Admin Commandes table)
        brand_name: (orderData.brandName || orderData.marqueName || orderData.product?.brand_name || null)?.trim().substring(0, 255) || null,
        model_name: (orderData.modelName || orderData.modeleName || orderData.product?.model_name || null)?.trim().substring(0, 255) || null
      };

      // Final validation: ensure INTEGER fields are actually integers
      if (preparedOrderData.product_id !== null && !Number.isInteger(preparedOrderData.product_id)) {
        throw new Error('Product ID must be an integer or null');
      }
      if (!Number.isInteger(preparedOrderData.quantity)) {
        throw new Error('Quantity must be an integer');
      }

      // Log validated payload before creating order
      console.log('📦 OrderService: Validated order payload:', {
        product_name: preparedOrderData.product_name,
        product_price: preparedOrderData.product_price,
        quantity: preparedOrderData.quantity,
        product_snapshot_keys: Object.keys(preparedOrderData.product_snapshot)
      });

      // Create order
      const order = await Order.create(preparedOrderData);

      // PART 2: Auto-register product from order into products table
      // SKIP for promo-origin orders - promotions must not pollute products table
      if (preparedOrderData.origin !== 'promotion') {
      try {
        const productSnapshot = preparedOrderData.product_snapshot;
        
        if (productSnapshot && productSnapshot.name) {
          console.log('📦 OrderService: Auto-registering product from order:', productSnapshot.name);
          
          // Check if product with same name already exists (case-insensitive check)
          const existingProduct = await client.query(
            'SELECT id FROM products WHERE LOWER(TRIM(name)) = LOWER(TRIM($1))',
            [productSnapshot.name.trim()]
          );
          
          if (existingProduct.rows.length === 0) {
            // Product doesn't exist, insert it
            const productImage = productSnapshot.image || 
                                (Array.isArray(productSnapshot.images) && productSnapshot.images.length > 0 
                                  ? productSnapshot.images[0] : null);
            
            // Prepare all_images array
            const allImages = Array.isArray(productSnapshot.images) && productSnapshot.images.length > 0
              ? productSnapshot.images
              : (productImage ? [productImage] : []);
            
            // Extract product_references from snapshot
            const snapshotRefs = productSnapshot.product_references || productSnapshot.references || [];
            const productRefsArray = Array.isArray(snapshotRefs) ? snapshotRefs : [];
            
            try {
              await client.query(
                `INSERT INTO products (name, price, main_image, all_images, description, product_references)
                 VALUES ($1, $2, $3, $4, $5, $6)`,
                [
                  productSnapshot.name.trim(),
                  parseFloat(productSnapshot.price) || 0,
                  productImage || null,
                  allImages,
                  productSnapshot.description || null,
                  productRefsArray
                ]
              );
              
              console.log('✅ OrderService: Product auto-registered from order:', productSnapshot.name);
            } catch (insertError) {
              // If duplicate name error (or any error), skip silently
              // This ensures we don't break order creation if product registration fails
              if (insertError.code === '23505') { // Unique violation (if constraint exists)
                console.log('ℹ️  OrderService: Product with same name already exists, skipping:', productSnapshot.name);
              } else {
                console.warn('⚠️  OrderService: Product registration error (skipping):', insertError.message);
                // Continue - order creation should not fail due to product registration failure
              }
            }
          } else {
            console.log('ℹ️  OrderService: Product already exists in products table, skipping registration:', productSnapshot.name);
          }
        } else {
          console.log('ℹ️  OrderService: No product snapshot or product name, skipping product registration');
        }
      } catch (productRegisterError) {
        // Log error but don't fail order creation - product registration is non-critical
        console.warn('⚠️  OrderService: Failed to auto-register product (non-critical):', productRegisterError.message);
      }
      }

      await client.query('COMMIT');
      return order;
    } catch (error) {
      await client.query('ROLLBACK');
      
      // Re-throw validation errors as-is
      if (error.message.includes('required') || 
          error.message.includes('must be')) {
        throw error;
      }
      
      // Log full PostgreSQL error details
      console.error('❌ OrderService.createOrder error:');
      console.error('   Message:', error.message);
      console.error('   Code:', error.code);
      console.error('   Detail:', error.detail);
      console.error('   Hint:', error.hint);
      console.error('   Where:', error.where);
      console.error('   Stack:', error.stack);
      
      // Provide better error message for PostgreSQL errors
      if (error.code === '22P02') {
        throw new Error('Invalid data type: One or more fields have incorrect type (expected integer/number)');
      } else if (error.code === '23502') {
        throw new Error('Required field missing: ' + (error.column || 'unknown field'));
      }
      
      // Return readable error message
      const errorMessage = error.message || 'Unknown error';
      throw new Error(errorMessage);
    } finally {
      client.release();
    }
  }

  /**
   * Get pending order counts per product for a category (for CAT page highlighting).
   * Matches orders to category_products by product_name, product_id, or product_snapshot slug.
   * @param {string} categorySlug - Category slug (e.g. 'kit-de-distribution')
   * @returns {Promise<{ byProductSlug: Record<string, number> }>}
   */
  static async getPendingCountByProduct(categorySlug) {
    const pool = require('../db/pool');
    if (!categorySlug || typeof categorySlug !== 'string' || !categorySlug.trim()) {
      return { byProductSlug: {} };
    }
    const slug = categorySlug.trim();
    const result = await pool.query(
      `SELECT cp.slug, COUNT(o.id)::int AS pending_count
       FROM orders o
       INNER JOIN category_products cp ON (
         cp.category_slug = $1
         AND (
           LOWER(TRIM(o.product_name)) = LOWER(TRIM(cp.name))
           OR (o.product_id IS NOT NULL AND o.product_id = cp.id)
           OR (
             o.product_snapshot IS NOT NULL
             AND o.product_snapshot->>'slug' IS NOT NULL
             AND LOWER(TRIM(o.product_snapshot->>'slug')) = LOWER(TRIM(cp.slug))
           )
         )
       )
       WHERE LOWER(TRIM(o.status)) = 'pending'
       GROUP BY cp.slug
       HAVING COUNT(o.id) > 0`,
      [slug]
    );
    const byProductSlug = {};
    for (const row of result.rows || []) {
      if (row.slug && row.pending_count > 0) {
        byProductSlug[row.slug] = row.pending_count;
      }
    }
    return { byProductSlug };
  }

  /**
   * Get all orders
   * @param {Object} options - { status?: string } optional filter (e.g. 'pending')
   * @returns {Promise<Array>} List of orders
   */
  static async getAllOrders(options = {}) {
    try {
      const orders = await Order.findAll(options);
      return orders;
    } catch (error) {
      console.error('OrderService.getAllOrders error:', error);
      throw new Error('Failed to fetch orders');
    }
  }

  /**
   * Get order by ID
   * @param {number} orderId - Order ID
   * @returns {Promise<Object|null>} Order or null
   */
  static async getOrderById(orderId) {
    if (!orderId || isNaN(parseInt(orderId))) {
      throw new Error('Valid order ID is required');
    }

    try {
      const order = await Order.findById(orderId);
      return order;
    } catch (error) {
      console.error('OrderService.getOrderById error:', error);
      throw new Error('Failed to fetch order');
    }
  }

  /**
   * Accept order: decrease stock, set status accepted
   * - Promotion orders: decrease promotion stock via PromotionsStockService
   * - Normal orders: decrease category_products.stock_disponible (atomic transaction)
   * @param {number} orderId
   * @returns {Promise<Object>} Updated order + optional newStock
   */
  static async acceptOrder(orderId) {
    if (!orderId || isNaN(parseInt(orderId))) {
      throw new Error('Valid order ID is required');
    }

    const order = await Order.findById(orderId);
    if (!order) throw new Error('Order not found');

    const status = (order.status || 'pending').toLowerCase();
    if (status !== 'pending') {
      throw new Error('Cannot accept: order already processed');
    }

    const snapshot = order.product_snapshot && typeof order.product_snapshot === 'string'
      ? (() => { try { return JSON.parse(order.product_snapshot); } catch (e) { return {}; } })()
      : (order.product_snapshot || {});
    const orderOrigin = typeof order.origin === 'string' ? order.origin.trim().toLowerCase() : '';
    const snapshotSource = typeof snapshot.source === 'string' ? snapshot.source.trim().toLowerCase() : '';
    const origin =
      orderOrigin === 'promotion' || orderOrigin === 'cat3' || orderOrigin === 'cat2'
        ? orderOrigin
        : (snapshotSource === 'promotion' || snapshotSource === 'cat3' || snapshotSource === 'cat2'
          ? snapshotSource
          : 'normal');
    const promoId = order.promo_id != null ? order.promo_id : snapshot.promo_id;
    const qty = parseInt(String(order.quantity), 10);
    const qtySafe = Number.isFinite(qty) && qty >= 1 ? qty : 1;

    console.log('[acceptOrder] orderId=%s origin=%s quantity=%s product_name=%s', orderId, origin, qtySafe, (order.product_name || '').substring(0, 50));
    if (order.product_snapshot) {
      console.log('[acceptOrder] product_snapshot: cat3Id=%s itemId=%s cat2CardId=%s slug=%s source=%s', snapshot.cat3Id, snapshot.itemId, snapshot.cat2CardId, snapshot.slug || null, snapshotSource || null);
    }

    if (origin === 'promotion' && promoId != null && Number.isFinite(Number(promoId))) {
      // Promotion: decrease promotion stock
      try {
        await PromotionsStockService.decreasePromotionStock(Number(promoId), qtySafe);
      } catch (e) {
        if (e.message === 'Not enough stock') {
          throw new Error('Not enough stock');
        }
        throw e;
      }
      const updated = await Order.updateStatus(orderId, 'accepted');
      return updated;
    }

    // Cat3-origin order: resolve stock from section_content cat3_pages, decrement, persist
    // Manual test checklist (Cat3 accept):
    // - Create Cat3 item with stock 44, create order qty 1, accept => stock becomes 43, toast success.
    // - Create order qty 50 => toast "Stock not available", order not accepted.
    // - Accept a Produits 2 order => unchanged behavior (normal path).
    if (origin === 'cat3') {
      const rawCat3Id = snapshot.cat3Id != null ? String(snapshot.cat3Id).trim() : '';
      const cat3IdNum = rawCat3Id ? parseInt(rawCat3Id, 10) : NaN;
      const itemId = snapshot.itemId != null ? parseInt(String(snapshot.itemId), 10) : null;
      if (!rawCat3Id || itemId == null || !Number.isFinite(itemId)) {
        console.warn('[acceptOrder][cat3] Missing or invalid cat3Id/itemId in product_snapshot', { cat3Id: rawCat3Id || null, itemId });
        throw new Error('Produit introuvable');
      }
      const section = await SectionContent.getByType('cat3_pages');
      if (!section || !section.content) {
        console.warn('[acceptOrder][cat3] No section_content for cat3_pages');
        throw new Error('Produit introuvable');
      }
      const content = typeof section.content === 'string' ? JSON.parse(section.content) : section.content;
      const pages = Array.isArray(content) ? content : [];
      const pageIndex = pages.findIndex(
        (p) =>
          p &&
          (
            (Number.isFinite(cat3IdNum) && Number(p.id) === cat3IdNum) ||
            String(p.cardId ?? '') === rawCat3Id ||
            String(p.slug ?? '') === rawCat3Id
          )
      );
      if (pageIndex === -1) {
        console.warn('[acceptOrder][cat3] Cat3 page not found', { cat3Id: rawCat3Id });
        throw new Error('Produit introuvable');
      }
      const page = pages[pageIndex];
      const items = Array.isArray(page.items) ? page.items : [];
      const itemIndex = items.findIndex((i) => i && Number(i.id) === itemId);
      if (itemIndex === -1) {
        console.warn('[acceptOrder][cat3] Cat3 item not found', { itemId });
        throw new Error('Produit introuvable');
      }
      const item = items[itemIndex];
      const currentStock = item.stock != null && item.stock !== ''
        ? parseInt(String(item.stock), 10)
        : 0;
      const currentStockSafe = Number.isFinite(currentStock) && currentStock >= 0 ? currentStock : 0;
      if (qtySafe > currentStockSafe) {
        throw new Error('Stock not available');
      }
      const newStock = Math.max(0, currentStockSafe - qtySafe);
      const updatedItems = items.map((it, idx) =>
        idx === itemIndex ? { ...it, stock: newStock } : it
      );
      const updatedPages = pages.map((p, idx) =>
        idx === pageIndex ? { ...p, items: updatedItems } : p
      );
      await SectionContent.update(section.id, { content: updatedPages });
      const updated = await Order.updateStatus(orderId, 'accepted');
      return { ...updated, newStock };
    }

    // Cat2-origin order: decrease cat2_cards.stock_disponible
    if (origin === 'cat2') {
      const cat2CardId = snapshot.cat2CardId != null ? parseInt(String(snapshot.cat2CardId), 10) : null;
      if (cat2CardId == null || !Number.isFinite(cat2CardId)) {
        console.warn('[acceptOrder][cat2] Missing or invalid cat2CardId in product_snapshot', { cat2CardId });
        throw new Error('Produit Cat2 introuvable');
      }
      const cardResult = await pool.query(
        'SELECT id, stock_disponible FROM cat2_cards WHERE id = $1 FOR UPDATE',
        [cat2CardId]
      );
      if (!cardResult.rows || cardResult.rows.length === 0) {
        console.warn('[acceptOrder][cat2] Cat2 card not found', { cat2CardId });
        throw new Error('Produit Cat2 introuvable');
      }
      const card = cardResult.rows[0];
      const currentStock = parseInt(card.stock_disponible, 10) || 0;
      if (qtySafe > currentStock) {
        console.warn('[acceptOrder][cat2] Stock not available', { cat2CardId, currentStock, qtySafe });
        throw new Error('Stock not available');
      }
      const newStock = Math.max(0, currentStock - qtySafe);
      await pool.query(
        'UPDATE cat2_cards SET stock_disponible = $1, updated_at = NOW() WHERE id = $2',
        [newStock, cat2CardId]
      );
      const updated = await Order.updateStatus(orderId, 'accepted');
      console.log('[acceptOrder][cat2] accepted orderId=%s cat2CardId=%s newStock=%s', orderId, cat2CardId, newStock);
      return { ...updated, newStock };
    }

    // Normal order: decrease category_products.stock_disponible (atomic)
    const productName = (order.product_name || '').trim();
    if (!productName) {
      throw new Error('Order has no product name');
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Find category_product by name and lock row
      const productResult = await client.query(
        `SELECT id, stock_disponible FROM category_products 
         WHERE LOWER(TRIM(name)) = LOWER(TRIM($1)) 
         LIMIT 1 FOR UPDATE`,
        [productName]
      );

      if (!productResult.rows || productResult.rows.length === 0) {
        await client.query('ROLLBACK');
        console.warn('[acceptOrder][normal] Product not found in category_products', { productName: productName.substring(0, 80), orderId });
        throw new Error('Product not found in catalog');
      }

      const product = productResult.rows[0];
      const currentStock = parseInt(product.stock_disponible, 10) || 0;

      if (currentStock <= 0) {
        await client.query('ROLLBACK');
        throw new Error('Stock not available');
      }
      if (qtySafe > currentStock) {
        await client.query('ROLLBACK');
        throw new Error('Quantity exceeds available stock');
      }

      const newStock = Math.max(0, currentStock - qtySafe);
      await client.query(
        `UPDATE category_products SET stock_disponible = $1 WHERE id = $2`,
        [newStock, product.id]
      );
      await client.query(
        `UPDATE orders SET status = $1 WHERE id = $2`,
        ['accepted', orderId]
      );

      await client.query('COMMIT');

      const updated = await Order.findById(orderId);
      return { ...updated, newStock };
    } catch (e) {
      await client.query('ROLLBACK').catch(() => {});
      throw e;
    } finally {
      client.release();
    }
  }

  /**
   * Reject order: set status rejected, do NOT touch stock
   */
  static async rejectOrder(orderId) {
    if (!orderId || isNaN(parseInt(orderId))) {
      throw new Error('Valid order ID is required');
    }

    const order = await Order.findById(orderId);
    if (!order) throw new Error('Order not found');

    const status = (order.status || 'pending').toLowerCase();
    if (status !== 'pending') {
      throw new Error('Cannot refuse: order already processed');
    }

    const updated = await Order.updateStatus(orderId, 'rejected');
    return updated;
  }

  /**
   * Delete order
   * @param {number} orderId - Order ID
   * @returns {Promise<Object>} Deleted order info
   */
  static async deleteOrder(orderId) {
    if (!orderId || isNaN(parseInt(orderId))) {
      throw new Error('Valid order ID is required');
    }

    try {
      const order = await Order.delete(orderId);
      if (!order) {
        throw new Error('Order not found');
      }
      return order;
    } catch (error) {
      // Re-throw not found errors as-is
      if (error.message.includes('not found')) {
        throw error;
      }
      
      console.error('OrderService.deleteOrder error:', error);
      throw new Error('Failed to delete order');
    }
  }
}

module.exports = OrderService;

