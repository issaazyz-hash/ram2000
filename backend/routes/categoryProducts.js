const express = require('express');
const router = express.Router();
const pool = require('../db/pool');
const requireAdmin = require('../middlewares/requireAdmin');
const asyncHandler = require('../middlewares/asyncHandler');

// Helper function to generate slug from product name
function generateSlug(name) {
  return name
    .toString()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^\w-]+/g, '')
    .replace(/--+/g, '-');
}

// Helper function to ensure unique slug
async function ensureUniqueSlug(baseSlug, pool) {
  let slug = baseSlug;
  let counter = 1;
  
  while (true) {
    const result = await pool.query(
      'SELECT id FROM category_products WHERE slug = $1',
      [slug]
    );
    
    if (result.rows.length === 0) {
      return slug;
    }
    
    slug = `${baseSlug}-${counter}`;
    counter++;
  }
}

/**
 * GET /api/category-products/status-by-category
 * Returns aggregated status per category (for Familles des pièces highlighting).
 * red: any product has stock_disponible <= 0
 * yellow: any product has pending orders (and no red)
 * none: otherwise
 */
router.get('/status-by-category', asyncHandler(async (req, res) => {
  const result = await pool.query(`
    WITH category_red AS (
      SELECT DISTINCT category_slug
      FROM category_products
      WHERE category_slug IS NOT NULL AND TRIM(category_slug) != ''
        AND (stock_disponible IS NULL OR stock_disponible <= 0)
    ),
    category_yellow AS (
      SELECT DISTINCT cp.category_slug
      FROM orders o
      INNER JOIN category_products cp ON (
        cp.category_slug IS NOT NULL AND TRIM(cp.category_slug) != ''
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
    )
    SELECT
      COALESCE(cp.category_slug, r.category_slug, y.category_slug) AS category_slug,
      CASE
        WHEN r.category_slug IS NOT NULL THEN 'red'
        WHEN y.category_slug IS NOT NULL THEN 'yellow'
        ELSE 'none'
      END AS status
    FROM (
      SELECT DISTINCT category_slug FROM category_products
      WHERE category_slug IS NOT NULL AND TRIM(category_slug) != ''
    ) cp
    LEFT JOIN category_red r ON r.category_slug = cp.category_slug
    LEFT JOIN category_yellow y ON y.category_slug = cp.category_slug
  `);
  const byCategorySlug = {};
  for (const row of result.rows || []) {
    if (row.category_slug) {
      byCategorySlug[row.category_slug] = row.status || 'none';
    }
  }
  return res.json({ success: true, data: { byCategorySlug } });
}));

/**
 * PATCH /api/category-products/:slug/stock/decrement
 * Decrement stock_disponible by 1 (Vente hors ligne).
 * Atomic update, requires admin.
 */
router.patch('/:slug/stock/decrement', requireAdmin, asyncHandler(async (req, res) => {
  const { slug } = req.params;
  if (!slug || typeof slug !== 'string' || slug.trim() === '') {
    return res.status(400).json({
      success: false,
      error: 'Slug is required',
      message: 'Stock insuffisant.'
    });
  }
  const decodedSlug = decodeURIComponent(slug.trim());
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const sel = await client.query(
      'SELECT id, stock_disponible FROM category_products WHERE slug = $1 LIMIT 1 FOR UPDATE',
      [decodedSlug]
    );
    if (!sel.rows || sel.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({
        success: false,
        error: 'Product not found',
        message: 'Produit introuvable.'
      });
    }
    const row = sel.rows[0];
    const currentStock = parseInt(row.stock_disponible, 10) || 0;
    if (currentStock <= 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        success: false,
        error: 'Stock insuffisant',
        message: 'Stock insuffisant.'
      });
    }
    const newStock = currentStock - 1;
    await client.query(
      'UPDATE category_products SET stock_disponible = $1 WHERE id = $2',
      [newStock, row.id]
    );
    await client.query('COMMIT');
    return res.json({
      success: true,
      data: { stockDisponible: newStock, id: row.id }
    });
  } catch (e) {
    await client.query('ROLLBACK').catch(() => {});
    throw e;
  } finally {
    client.release();
  }
}));

/**
 * PATCH /api/category-products/:slug/stock
 * Update stock_disponible and/or seuil_alerte by product slug (admin only).
 * Body: { stockDisponible?: number, seuilAlerte?: number }
 */
router.patch('/:slug/stock', requireAdmin, asyncHandler(async (req, res) => {
  const { slug } = req.params;
  const { stockDisponible, seuilAlerte } = req.body;

  if (!slug || typeof slug !== 'string' || slug.trim() === '') {
    return res.status(400).json({
      success: false,
      error: 'Slug is required',
    });
  }

  if (stockDisponible === undefined && seuilAlerte === undefined) {
    return res.status(400).json({
      success: false,
      error: 'At least one of stockDisponible or seuilAlerte is required',
    });
  }

  const updates = [];
  const values = [];
  let paramCount = 1;

  if (stockDisponible !== undefined) {
    const parsed = parseInt(stockDisponible, 10);
    if (!Number.isInteger(parsed) || parsed < 0) {
      return res.status(400).json({
        success: false,
        error: 'stockDisponible must be an integer >= 0',
      });
    }
    updates.push('stock_disponible = $' + paramCount++);
    values.push(parsed);
  }

  if (seuilAlerte !== undefined) {
    const parsed = Math.max(0, parseInt(seuilAlerte, 10) || 0);
    updates.push('seuil_alerte = $' + paramCount++);
    values.push(parsed);
  }

  updates.push('updated_at = NOW()');
  const decodedSlug = decodeURIComponent(slug.trim());
  values.push(decodedSlug);

  const result = await pool.query(
    `UPDATE category_products SET ${updates.join(', ')} WHERE slug = $${paramCount} RETURNING id, slug, stock_disponible, seuil_alerte`,
    values
  );

  if (!result.rows || result.rows.length === 0) {
    return res.status(404).json({
      success: false,
      error: 'Product not found',
    });
  }

  const row = result.rows[0];
  return res.json({
    success: true,
    data: {
      id: row.id,
      slug: row.slug,
      stockDisponible: row.stock_disponible != null ? parseInt(row.stock_disponible, 10) : 0,
      seuilAlerte: row.seuil_alerte != null ? parseInt(row.seuil_alerte, 10) : 0,
    },
  });
}));

/**
 * GET /api/category-products/:slug
 * Get all products for a specific category
 * 
 * Route parameter: slug (from req.params.slug)
 */
router.get('/:slug', asyncHandler(async (req, res) => {
  // STEP 1: Log incoming request
  console.log('========================================');
  console.log('📥 GET /api/category-products/:slug');
  console.log('Request params:', JSON.stringify(req.params, null, 2));
  console.log('Request query:', JSON.stringify(req.query, null, 2));
  console.log('Request headers:', JSON.stringify(req.headers, null, 2));
  
  // STEP 2: Extract and validate slug from req.params
  const { slug } = req.params;
  
  console.log('Extracted slug:', slug);
  console.log('Slug type:', typeof slug);
  console.log('Slug value:', slug);
  
  // Validate slug
  if (!slug) {
    console.error('❌ ERROR: slug is missing from req.params');
    return res.status(400).json({
      success: false,
      error: 'Category slug is required',
      details: 'Missing slug parameter in URL'
    });
  }
  
  if (typeof slug !== 'string') {
    console.error('❌ ERROR: slug is not a string:', typeof slug);
    return res.status(400).json({
      success: false,
      error: 'Invalid category slug type',
      details: `Expected string, got ${typeof slug}`
    });
  }
  
  if (slug.trim() === '') {
    console.error('❌ ERROR: slug is empty string');
    return res.status(400).json({
      success: false,
      error: 'Category slug cannot be empty',
      details: 'Slug parameter is empty'
    });
  }
  
  // Decode URL-encoded slug
  let decodedSlug;
  try {
    decodedSlug = decodeURIComponent(slug.trim());
    console.log('Decoded slug:', decodedSlug);
  } catch (decodeError) {
    console.error('❌ ERROR: Failed to decode slug:', decodeError.message);
    return res.status(400).json({
      success: false,
      error: 'Invalid URL encoding in slug',
      details: decodeError.message
    });
  }
  
  // STEP 3: Verify database pool exists
  if (!pool) {
    console.error('❌ ERROR: Database pool is not initialized');
    return res.status(500).json({
      success: false,
      error: 'Database connection not available',
      details: 'Pool is null or undefined'
    });
  }
  
  console.log('Database pool status: OK');
  
  // STEP 3.5: Extract optional modelId from query params
  const modelId = req.query.modelId ? parseInt(req.query.modelId, 10) : null;
  const isValidModelId = modelId && !isNaN(modelId) && modelId > 0;
  
  if (isValidModelId) {
    console.log('Filtering by modelId:', modelId);
  } else {
    console.log('No modelId filter - returning all products for category');
  }
  
  // STEP 4: Execute database query with full error handling
  try {
    console.log('Executing SQL query...');
    
    // Build query with optional modelId filtering
    // If modelId provided: return products that are either:
    //   (A) explicitly linked to that model in pivot table
    //   OR (B) legacy products with no rows in pivot (global fallback)
    let result;
    let query;
    let params;
    
    if (isValidModelId) {
      // Filter by modelId: products where vehicle_model_ids IS NULL OR empty OR contains modelId
      // NULL or empty array means "global" (visible for all models)
      query = `
        SELECT 
          cp.*,
          a2p.price2
        FROM category_products cp
        LEFT JOIN acha2_products a2p ON cp.name = a2p.name
        WHERE cp.category_slug = $1
          AND (
            cp.vehicle_model_ids IS NULL
            OR COALESCE(array_length(cp.vehicle_model_ids, 1), 0) = 0
            OR $2 = ANY(cp.vehicle_model_ids)
          )
        ORDER BY cp.created_at DESC
      `;
      params = [decodedSlug, modelId];
      console.log('🔍 [FILTER] Filtering products by modelId:', modelId);
      console.log('   SQL: WHERE category_slug = $1 AND (vehicle_model_ids IS NULL OR empty OR $2 = ANY(vehicle_model_ids))');
    } else {
      // No modelId filter: return all products for category
      query = `
        SELECT 
          cp.*,
          a2p.price2
        FROM category_products cp
        LEFT JOIN acha2_products a2p ON cp.name = a2p.name
        WHERE cp.category_slug = $1 
        ORDER BY cp.created_at DESC
      `;
      params = [decodedSlug];
      console.log('ℹ️  [NO FILTER] Returning all products for category (no modelId provided)');
    }
    
    try {
      result = await pool.query(query, params);
      console.log(`✅ [QUERY] Executed successfully, returned ${result?.rows?.length || 0} rows`);
      if (isValidModelId) {
        console.log(`   Filtered by modelId=${modelId}, found ${result?.rows?.length || 0} compatible products`);
      }
    } catch (queryError) {
      // If JOIN fails (e.g., acha2_products doesn't exist), fall back to basic query
      console.warn('⚠️  Could not JOIN acha2_products, using basic query:', queryError.message);
      if (isValidModelId) {
        // For modelId filter, try simpler query without acha2_products join
        query = `
          SELECT cp.*
          FROM category_products cp
          WHERE cp.category_slug = $1
            AND (
              cp.vehicle_model_ids IS NULL
              OR COALESCE(array_length(cp.vehicle_model_ids, 1), 0) = 0
              OR $2 = ANY(cp.vehicle_model_ids)
            )
          ORDER BY cp.created_at DESC
        `;
        try {
          result = await pool.query(query, [decodedSlug, modelId]);
          console.log(`✅ [FALLBACK QUERY] Executed successfully, returned ${result?.rows?.length || 0} rows`);
        } catch (fallbackError) {
          // If vehicle_model_ids column doesn't exist, fall back to returning all products (backward compatibility)
          console.warn('⚠️  vehicle_model_ids column may not exist, falling back to all products:', fallbackError.message);
          query = 'SELECT * FROM category_products WHERE category_slug = $1 ORDER BY created_at DESC';
          result = await pool.query(query, [decodedSlug]);
          console.log(`⚠️  [FALLBACK] Returning all products (backward compatibility mode)`);
        }
      } else {
        query = 'SELECT * FROM category_products WHERE category_slug = $1 ORDER BY created_at DESC';
        result = await pool.query(query, [decodedSlug]);
      }
    }
    
    console.log('Query executed successfully');
    console.log('Result rows count:', result?.rows?.length || 0);
    console.log('Result rows:', JSON.stringify(result?.rows || [], null, 2));
    
    // Map results: prefer prix_neveux (Tarif) over price2 (acha2) for displayed price
    const products = (result?.rows || []).map(row => {
      const prixNeveux = row.prix_neveux != null && row.prix_neveux !== '' 
        ? parseFloat(row.prix_neveux) 
        : null;
      const price2Val = row.price2 !== null && row.price2 !== undefined ? parseFloat(row.price2) : null;
      const priceValue = (prixNeveux != null && Number.isFinite(prixNeveux)) 
        ? prixNeveux 
        : price2Val;
      const stockDisponible = row.stock_disponible != null ? parseInt(row.stock_disponible, 10) : 0;
      const seuilAlerte = row.seuil_alerte != null ? parseInt(row.seuil_alerte, 10) : 0;
      const { price2, ...rest } = row; // Remove price2 from row object
      return {
        ...rest,
        price: priceValue,
        prixNeveux: prixNeveux,
        stockDisponible: Number.isFinite(stockDisponible) ? stockDisponible : 0,
        seuilAlerte: Number.isFinite(seuilAlerte) ? seuilAlerte : 0
      };
    });
    
    console.log(`✅ Success: Returning ${products.length} products for category: ${decodedSlug}`);
    console.log('========================================');
    
    return res.json({
      success: true,
      data: products
    });
    
  } catch (error) {
    // Log full error details
    console.error('========================================');
    console.error('❌ DATABASE ERROR in GET /api/category-products/:slug');
    console.error('Error name:', error.name);
    console.error('Error message:', error.message);
    console.error('Error code:', error.code);
    console.error('Error detail:', error.detail);
    console.error('Error hint:', error.hint);
    console.error('Error position:', error.position);
    console.error('Full error object:', JSON.stringify(error, Object.getOwnPropertyNames(error), 2));
    console.error('========================================');
    
    // Handle specific database errors
    if (error.code === '42P01') {
      // Table does not exist
      return res.status(500).json({
        success: false,
        error: 'Database table not found',
        details: 'The category_products table does not exist. Please run database migration.',
        errorCode: error.code
      });
    }
    
    if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
      return res.status(500).json({
        success: false,
        error: 'Database connection failed',
        details: 'Cannot connect to PostgreSQL database',
        errorCode: error.code
      });
    }
    
    // Generic error response
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch category products',
      details: error.message || 'Unknown database error',
      errorCode: error.code || 'UNKNOWN'
    });
  }
}));

/**
 * POST /api/category-products
 * Create a new category product (admin only)
 * 
 * Expected body:
 * {
 *   category_slug: string (required),
 *   name?: string (optional),
 *   image?: string (optional)
 * }
 */
router.post('/', requireAdmin, asyncHandler(async (req, res) => {
  // API /category-products - POST handler
  // STEP 1: Log incoming request
  console.log('========================================');
  console.log('📥 POST /api/category-products');
  console.log('API /category-products – BODY:', JSON.stringify(req.body, null, 2));
  console.log('Request body:', JSON.stringify(req.body, null, 2));
    console.log('Request headers:', JSON.stringify(req.headers, null, 2));
    console.log('Content-Type:', req.headers['content-type']);
  
  // STEP 2: Validate request body exists
  if (!req.body) {
    console.error('❌ ERROR: Request body is missing');
    return res.status(400).json({
      success: false,
      error: 'Request body is required',
      details: 'No body provided in request'
    });
  }
  
  if (typeof req.body !== 'object') {
    console.error('❌ ERROR: Request body is not an object:', typeof req.body);
    return res.status(400).json({
      success: false,
      error: 'Invalid request body format',
      details: `Expected object, got ${typeof req.body}`
    });
  }
  
  // STEP 3: Extract and validate fields
  const { category_slug, name, image, reference, rating, vehicle_model_ids, prix_neveux, stockDisponible, seuilAlerte,
    prix_achat_brut, remise_achat_percent, net_achat_htva, tva_percent, net_achat_ttc, marge_percent } = req.body;
  // Accept snake_case aliases
  const stockDisponibleVal = stockDisponible ?? req.body.stock_disponible;
  const seuilAlerteVal = seuilAlerte ?? req.body.seuil_alerte;
  
  console.log('Extracted fields:');
  console.log('  category_slug:', category_slug, '(type:', typeof category_slug, ')');
  console.log('  name:', name, '(type:', typeof name, ')');
  console.log('  image:', image, '(type:', typeof image, ')');
  console.log('  reference:', reference, '(type:', typeof reference, ')');
  console.log('  rating:', rating, '(type:', typeof rating, ')');
  console.log('  vehicle_model_ids:', vehicle_model_ids, '(type:', typeof vehicle_model_ids, ')');
  console.log('  prix_neveux (received):', prix_neveux, '(type:', typeof prix_neveux, ')');
  console.log('  stockDisponible (received):', stockDisponibleVal, '(type:', typeof stockDisponibleVal, ')');
  console.log('  seuilAlerte (received):', seuilAlerteVal, '(type:', typeof seuilAlerteVal, ')');
  
  // Validate category_slug (REQUIRED)
  if (!category_slug) {
    console.error('❌ ERROR: category_slug is missing');
    return res.status(400).json({
      success: false,
      error: 'category_slug is required',
      details: 'Missing category_slug field in request body'
    });
  }
  
  if (typeof category_slug !== 'string') {
    console.error('❌ ERROR: category_slug is not a string:', typeof category_slug);
    return res.status(400).json({
      success: false,
      error: 'category_slug must be a string',
      details: `Expected string, got ${typeof category_slug}`
    });
  }
  
  if (category_slug.trim() === '') {
    console.error('❌ ERROR: category_slug is empty');
    return res.status(400).json({
      success: false,
      error: 'category_slug cannot be empty',
      details: 'category_slug is an empty string'
    });
  }
  
  // Validate name (required by database schema - NOT NULL)
  // Note: Database schema requires name, so we make it required in API too
  if (!name) {
    console.error('❌ ERROR: name is missing');
    return res.status(400).json({
      success: false,
      error: 'name is required',
      details: 'Missing name field in request body. Database schema requires name to be NOT NULL.'
    });
  }
  
  if (typeof name !== 'string') {
    console.error('❌ ERROR: name is not a string:', typeof name);
    return res.status(400).json({
      success: false,
      error: 'name must be a string',
      details: `Expected string, got ${typeof name}`
    });
  }
  
  if (name.trim() === '') {
    console.error('❌ ERROR: name is empty');
    return res.status(400).json({
      success: false,
      error: 'name cannot be empty',
      details: 'name is an empty string'
    });
  }
  
  // Sanitize inputs
    const sanitizedSlug = category_slug.trim();
    const sanitizedName = name.trim();
    const sanitizedImage = image && typeof image === 'string' && image.trim() !== ''
      ? image.trim()
      : null;
    const sanitizedReference = reference && typeof reference === 'string' && reference.trim() !== ''
      ? reference.trim()
      : null;
    const sanitizedRating = typeof rating === 'number' && rating >= 0 && rating <= 5 ? rating : null;
    const sanitizedPrixNeveux = (prix_neveux !== undefined && prix_neveux !== null && prix_neveux !== '') 
      ? (typeof prix_neveux === 'number' ? prix_neveux : parseFloat(prix_neveux))
      : null;
    const finalPrixNeveux = (sanitizedPrixNeveux !== null && Number.isFinite(sanitizedPrixNeveux) && sanitizedPrixNeveux >= 0) 
      ? sanitizedPrixNeveux 
      : null;
    const parseNum = (v) => (v != null && v !== '' && Number.isFinite(Number(v)) && Number(v) >= 0) ? Number(v) : null;
    const finalPrixAchatBrut = parseNum(prix_achat_brut);
    const finalRemiseAchat = parseNum(remise_achat_percent);
    const finalNetAchatHTVA = parseNum(net_achat_htva);
    const finalTvaPercent = parseNum(tva_percent);
    const finalNetAchatTTC = parseNum(net_achat_ttc);
    const finalMargePercent = parseNum(marge_percent);
    // Server-side validation: undefined/null => 0, integer >= 0
    const parsedStock = (stockDisponibleVal !== undefined && stockDisponibleVal !== null && stockDisponibleVal !== '')
      ? parseInt(stockDisponibleVal, 10) : NaN;
    const finalStockDisponible = Number.isInteger(parsedStock) && parsedStock >= 0 ? parsedStock : 0;
    const parsedSeuil = (seuilAlerteVal !== undefined && seuilAlerteVal !== null && seuilAlerteVal !== '')
      ? parseInt(seuilAlerteVal, 10) : NaN;
    const finalSeuilAlerte = Number.isInteger(parsedSeuil) && parsedSeuil >= 0 ? parsedSeuil : 0;

    // Generate unique slug from product name
    const baseSlug = generateSlug(sanitizedName);
    const uniqueSlug = await ensureUniqueSlug(baseSlug, pool);

    console.log('Sanitized values:');
    console.log('  category_slug:', sanitizedSlug);
    console.log('  name:', sanitizedName);
    console.log('  slug:', uniqueSlug);
    console.log('  image:', sanitizedImage ? 'provided' : 'null');
    console.log('  reference:', sanitizedReference);
    console.log('  rating:', sanitizedRating);
    console.log('  prix_neveux (stored):', finalPrixNeveux);
    console.log('  stock_disponible (stored):', finalStockDisponible, 'seuil_alerte (stored):', finalSeuilAlerte);
  
  // STEP 4: Verify database pool exists
  if (!pool) {
    console.error('❌ ERROR: Database pool is not initialized');
    return res.status(500).json({
      success: false,
      error: 'Database connection not available',
      details: 'Pool is null or undefined'
    });
  }
  
  console.log('Database pool status: OK');
  
  // STEP 5: Check if table exists (defensive check)
  try {
    console.log('Checking if category_products table exists...');
    const tableCheck = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'category_products'
      );
    `);
    
    const tableExists = tableCheck?.rows?.[0]?.exists || false;
    console.log('Table exists check result:', tableExists);
    
    if (!tableExists) {
      console.error('❌ ERROR: category_products table does not exist');
      return res.status(500).json({
        success: false,
        error: 'Database table not found',
        details: 'The category_products table does not exist. Please run database migration.',
        errorCode: 'TABLE_NOT_FOUND'
      });
    }
    
    console.log('✅ Table exists');
  } catch (tableCheckError) {
    console.error('❌ ERROR: Failed to check table existence:', tableCheckError);
    // Continue anyway - might be a permission issue
    console.warn('⚠️  Warning: Could not verify table existence, proceeding anyway...');
  }
  
  // STEP 6: Validate and sanitize vehicle_model_ids
  let sanitizedVehicleModelIds = null;
  if (vehicle_model_ids !== undefined && vehicle_model_ids !== null) {
    if (!Array.isArray(vehicle_model_ids)) {
      console.error('❌ ERROR: vehicle_model_ids must be an array');
      return res.status(400).json({
        success: false,
        error: 'vehicle_model_ids must be an array',
        details: `Expected array, got ${typeof vehicle_model_ids}`
      });
    }
    
    // Filter and validate: must be array of integers > 0
    const validIds = vehicle_model_ids
      .map(id => {
        const numId = typeof id === 'number' ? id : parseInt(String(id), 10);
        return !isNaN(numId) && numId > 0 ? numId : null;
      })
      .filter(id => id !== null);
    
    if (validIds.length > 0) {
      sanitizedVehicleModelIds = validIds;
      console.log('✅ Validated vehicle_model_ids:', sanitizedVehicleModelIds);
    } else if (vehicle_model_ids.length > 0) {
      // Array provided but all values invalid
      console.warn('⚠️  vehicle_model_ids array provided but all values invalid, storing as NULL (global)');
      sanitizedVehicleModelIds = null;
    } else {
      // Empty array = global product
      console.log('ℹ️  Empty vehicle_model_ids array - product will be global (visible for all models)');
      sanitizedVehicleModelIds = null;
    }
  } else {
    console.log('ℹ️  No vehicle_model_ids provided - product will be global (visible for all models)');
    sanitizedVehicleModelIds = null;
  }

  // STEP 6.5: Build compatible_vehicles from vehicle_model_ids for acha2 Marque/Modèle filtering
  let compatibleVehiclesArr = null;
  if (sanitizedVehicleModelIds && sanitizedVehicleModelIds.length > 0) {
    try {
      const vmResult = await pool.query(
        'SELECT id, marque, model FROM vehicle_models WHERE id = ANY($1) ORDER BY marque, model',
        [sanitizedVehicleModelIds]
      );
      compatibleVehiclesArr = (vmResult.rows || []).map((r) => ({
        brand: String(r.marque || '').trim() || 'Unknown',
        model: String(r.model || '').trim() || ''
      })).filter((v) => v.model);
      if (compatibleVehiclesArr.length === 0) compatibleVehiclesArr = null;
      console.log('✅ Built compatible_vehicles from vehicle_model_ids:', compatibleVehiclesArr?.length || 0);
    } catch (vmErr) {
      console.warn('⚠️  Could not resolve vehicle_model_ids to compatible_vehicles:', vmErr.message);
    }
  }

  // STEP 7: Ensure reference, rating, and vehicle_model_ids columns exist before INSERT
  // This prevents "column not found" errors by auto-creating missing columns
  try {
    console.log('Checking for reference, rating, and vehicle_model_ids columns...');
    const columnCheck = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'category_products' 
      AND column_name IN ('reference', 'rating', 'vehicle_model_ids')
      AND table_schema = 'public'
    `);
    const existingColumns = columnCheck.rows.map(row => row.column_name);
    console.log('Existing columns:', existingColumns);
    
    const needsReference = !existingColumns.includes('reference');
    const needsRating = !existingColumns.includes('rating');
    const needsVehicleModelIds = !existingColumns.includes('vehicle_model_ids');
    
    if (needsReference || needsRating || needsVehicleModelIds) {
      console.warn('⚠️  Warning: Some columns missing. Attempting to add them...');
      
      if (needsReference) {
        console.log('Adding reference column...');
        await pool.query('ALTER TABLE category_products ADD COLUMN IF NOT EXISTS reference TEXT NULL');
        console.log('✅ Added reference column');
      }
      
      if (needsRating) {
        console.log('Adding rating column...');
        await pool.query('ALTER TABLE category_products ADD COLUMN IF NOT EXISTS rating INTEGER NULL');
        // Add constraint for rating range
        try {
          await pool.query('ALTER TABLE category_products DROP CONSTRAINT IF EXISTS check_rating_range');
          await pool.query('ALTER TABLE category_products ADD CONSTRAINT check_rating_range CHECK (rating IS NULL OR (rating >= 0 AND rating <= 5))');
        } catch (constraintError) {
          console.warn('⚠️  Could not add rating constraint (non-fatal):', constraintError.message);
        }
        console.log('✅ Added rating column');
      }
      
      if (needsVehicleModelIds) {
        console.log('Adding vehicle_model_ids column...');
        await pool.query('ALTER TABLE category_products ADD COLUMN IF NOT EXISTS vehicle_model_ids INTEGER[] NULL');
        // Add GIN index for fast array filtering
        try {
          await pool.query(`
            CREATE INDEX IF NOT EXISTS idx_category_products_vehicle_model_ids
            ON category_products USING GIN (vehicle_model_ids)
          `);
          console.log('✅ Added vehicle_model_ids column and GIN index');
        } catch (indexError) {
          console.warn('⚠️  Could not create GIN index (non-fatal):', indexError.message);
          console.log('✅ Added vehicle_model_ids column (index may need manual creation)');
        }
      }
      
      console.log('✅ Successfully ensured all required columns exist');
    } else {
      console.log('✅ reference, rating, and vehicle_model_ids columns already exist');
    }

    // Ensure prix_neveux column exists (Tarif final price)
    try {
      await pool.query('ALTER TABLE category_products ADD COLUMN IF NOT EXISTS prix_neveux NUMERIC(12,3) NULL');
    } catch (pnErr) {
      console.warn('⚠️  Could not ensure prix_neveux column (non-fatal):', pnErr.message);
    }
    // Ensure stock_disponible and seuil_alerte columns exist
    try {
      await pool.query('ALTER TABLE category_products ADD COLUMN IF NOT EXISTS stock_disponible INTEGER NOT NULL DEFAULT 0');
      await pool.query('ALTER TABLE category_products ADD COLUMN IF NOT EXISTS seuil_alerte INTEGER NOT NULL DEFAULT 0');
    } catch (saErr) {
      console.warn('⚠️  Could not ensure stock_disponible/seuil_alerte columns (non-fatal):', saErr.message);
    }
  } catch (columnCheckError) {
    console.error('❌ CRITICAL: Failed to check/create columns:', columnCheckError);
    console.error('Error details:', {
      message: columnCheckError.message,
      code: columnCheckError.code,
      detail: columnCheckError.detail
    });
    // Don't proceed if we can't ensure columns exist - this will cause INSERT to fail
    return res.status(500).json({
      success: false,
      error: 'Database schema error',
      details: `Failed to ensure required columns exist: ${columnCheckError.message}`,
      errorCode: columnCheckError.code,
      hint: 'Please run migration: add_vehicle_model_ids_to_category_products.sql'
    });
  }

  // STEP 8: Execute INSERT query with full error handling
  try {
    console.log('Executing INSERT query...');
    console.log('SQL: INSERT INTO category_products (category_slug, name, slug, image, reference, rating, vehicle_model_ids, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW()) RETURNING *');
    console.log('Parameters:', [sanitizedSlug, sanitizedName, uniqueSlug, sanitizedImage, sanitizedReference, sanitizedRating, sanitizedVehicleModelIds]);
    
    const compatibleVehiclesJson = compatibleVehiclesArr && compatibleVehiclesArr.length > 0
      ? JSON.stringify(compatibleVehiclesArr)
      : null;

    const result = await pool.query(
      `INSERT INTO category_products (category_slug, name, slug, image, reference, rating, vehicle_model_ids, compatible_vehicles, prix_neveux, stock_disponible, seuil_alerte, prix_achat_brut, remise_achat_percent, net_achat_htva, tva_percent, net_achat_ttc, marge_percent, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, COALESCE($8::jsonb, '[]'::jsonb), $9, $10, $11, $12, $13, $14, $15, $16, $17, NOW(), NOW())
       RETURNING *`,
      [sanitizedSlug, sanitizedName, uniqueSlug, sanitizedImage, sanitizedReference, sanitizedRating, sanitizedVehicleModelIds, compatibleVehiclesJson, finalPrixNeveux, finalStockDisponible, finalSeuilAlerte, finalPrixAchatBrut, finalRemiseAchat, finalNetAchatHTVA, finalTvaPercent, finalNetAchatTTC, finalMargePercent]
    );
    
    console.log('INSERT executed successfully');
    console.log('Result rows count:', result?.rows?.length || 0);
    console.log('Inserted row:', JSON.stringify(result?.rows?.[0] || {}, null, 2));
    
    if (!result || !result.rows || result.rows.length === 0) {
      throw new Error('Insert query returned no rows');
    }
    
    const insertedProduct = result.rows[0];
    
    console.log(`✅ Success: Created category product with ID: ${insertedProduct.id}`);
    console.log(`   vehicle_model_ids: ${insertedProduct.vehicle_model_ids ? JSON.stringify(insertedProduct.vehicle_model_ids) : 'NULL (global product)'}`);
    console.log(`   prix_neveux (inserted): ${insertedProduct.prix_neveux}`);
    console.log(`   stock_disponible (inserted): ${insertedProduct.stock_disponible}`);
    console.log(`   seuil_alerte (inserted): ${insertedProduct.seuil_alerte}`);
    // Verification: refetch and assert stored values match
    try {
      const refetch = await pool.query('SELECT prix_neveux, stock_disponible, seuil_alerte FROM category_products WHERE id = $1', [insertedProduct.id]);
      const r = refetch?.rows?.[0];
      if (r) {
        const pnOk = String(r.prix_neveux ?? 'null') === String(finalPrixNeveux ?? 'null');
        const stockOk = Number(r.stock_disponible) === finalStockDisponible && Number(r.seuil_alerte) === finalSeuilAlerte;
        if (!pnOk) console.warn(`⚠️ Verification: prix_neveux mismatch - expected ${finalPrixNeveux}, refetched ${r.prix_neveux}`);
        if (!stockOk) console.warn(`⚠️ Verification: stock/seuil mismatch - expected ${finalStockDisponible}/${finalSeuilAlerte}, refetched ${r.stock_disponible}/${r.seuil_alerte}`);
        if (pnOk && stockOk) console.log(`✅ Verification: prix_neveux, stock_disponible, seuil_alerte match after refetch`);
      }
    } catch (verifyErr) {
      console.warn('⚠️ Verification refetch failed (non-fatal):', verifyErr.message);
    }
    console.log('========================================');
    
    return res.json({
      success: true,
      data: insertedProduct
    });
    
  } catch (error) {
    // Log full error details
    console.error('========================================');
    console.error('❌ DATABASE ERROR in POST /api/category-products');
    console.error('Error name:', error.name);
    console.error('Error message:', error.message);
    console.error('Error code:', error.code);
    console.error('Error detail:', error.detail);
    console.error('Error hint:', error.hint);
    console.error('Error position:', error.position);
    console.error('Error constraint:', error.constraint);
    console.error('Error table:', error.table);
    console.error('Error column:', error.column);
    console.error('Full error object:', JSON.stringify(error, Object.getOwnPropertyNames(error), 2));
    console.error('========================================');
    
    // Create category product - error handler
    // This helps debug the 500 error by providing detailed error information
    
    // Handle specific database errors
    if (error.code === '42P01') {
      // Table does not exist
      return res.status(500).json({
        success: false,
        error: 'Database table not found',
        details: 'The category_products table does not exist. Please run database migration.',
        errorCode: error.code
      });
    }
    
    if (error.code === '23505') {
      // Unique violation
      return res.status(409).json({
        success: false,
        error: 'Product already exists',
        details: error.detail || 'A product with this combination already exists',
        errorCode: error.code
      });
    }
    
    if (error.code === '23502') {
      // Not null violation
      return res.status(400).json({
        success: false,
        error: 'Required field is missing',
        details: error.detail || 'A required field is null',
        errorCode: error.code,
        column: error.column
      });
    }
    
    if (error.code === '42703') {
      // Column does not exist (undefined column)
      return res.status(500).json({
        success: false,
        error: 'Database column not found',
        details: `Column '${error.column || 'unknown'}' does not exist in category_products table. Please run migration to add 'reference' and 'rating' columns.`,
        errorCode: error.code,
        column: error.column,
        hint: 'Run: ALTER TABLE category_products ADD COLUMN IF NOT EXISTS reference TEXT NULL; ALTER TABLE category_products ADD COLUMN IF NOT EXISTS rating INTEGER NULL;'
      });
    }
    
    if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
      return res.status(500).json({
        success: false,
        error: 'Database connection failed',
        details: 'Cannot connect to PostgreSQL database',
        errorCode: error.code
      });
    }
    
    // Generic error response - include all error details for debugging
    return res.status(500).json({
      success: false,
      error: 'Failed to create category product',
      details: error.message || 'Unknown database error',
      errorCode: error.code || 'UNKNOWN',
      errorDetail: error.detail || null,
      errorHint: error.hint || null,
      errorColumn: error.column || null
    });
  }
}));

/**
 * PUT /api/category-products/:id
 * Update a category product (admin only)
 */
router.put('/:id', requireAdmin, asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { name, image, reference, rating, prix_neveux, stockDisponible, seuilAlerte, vehicle_model_ids } = req.body;
  const stockDisponibleVal = stockDisponible ?? req.body.stock_disponible;
  const seuilAlerteVal = seuilAlerte ?? req.body.seuil_alerte;
  
  console.log(`📥 PUT /api/category-products/${id}`);
  console.log('Request body:', JSON.stringify(req.body, null, 2));
  if (stockDisponibleVal !== undefined || seuilAlerteVal !== undefined) {
    console.log('  stockDisponible (received):', stockDisponibleVal, 'seuilAlerte (received):', seuilAlerteVal);
  }
  
  // Validate ID
  const productId = parseInt(id);
  if (isNaN(productId) || productId <= 0) {
    return res.status(400).json({
      success: false,
      error: 'Invalid product ID',
      details: `ID must be a positive integer, got: ${id}`
    });
  }
  
  try {
    const updates = [];
    const values = [];
    let paramCount = 1;
    
    if (name !== undefined) {
      if (typeof name !== 'string' || name.trim() === '') {
        return res.status(400).json({
          success: false,
          error: 'name must be a non-empty string'
        });
      }
      updates.push(`name = $${paramCount++}`);
      values.push(name.trim());
    }
    
    if (image !== undefined) {
      const sanitizedImage = (image && typeof image === 'string' && image.trim() !== '') 
        ? image.trim() 
        : null;
      updates.push(`image = $${paramCount++}`);
      values.push(sanitizedImage);
    }
    
    if (reference !== undefined) {
      const sanitizedReference = (reference && typeof reference === 'string' && reference.trim() !== '') 
        ? reference.trim() 
        : null;
      updates.push(`reference = $${paramCount++}`);
      values.push(sanitizedReference);
    }
    
    if (rating !== undefined) {
      const sanitizedRating = typeof rating === 'number' && rating >= 0 && rating <= 5 ? rating : 0;
      updates.push(`rating = $${paramCount++}`);
      values.push(sanitizedRating);
    }

    if (prix_neveux !== undefined) {
      const pn = (typeof prix_neveux === 'number' ? prix_neveux : parseFloat(prix_neveux));
      const finalPn = (pn != null && Number.isFinite(pn) && pn >= 0) ? pn : null;
      updates.push(`prix_neveux = $${paramCount++}`);
      values.push(finalPn);
    }
    if (stockDisponibleVal !== undefined) {
      const parsed = parseInt(stockDisponibleVal, 10);
      if (!Number.isInteger(parsed) || parsed < 0) {
        return res.status(400).json({
          success: false,
          error: 'stockDisponible must be an integer >= 0',
          details: 'Invalid stock value'
        });
      }
      updates.push(`stock_disponible = $${paramCount++}`);
      values.push(parsed);
      console.log('  stock_disponible (stored):', parsed);
    }
    if (seuilAlerteVal !== undefined) {
      const v = Math.max(0, parseInt(seuilAlerteVal, 10) || 0);
      updates.push(`seuil_alerte = $${paramCount++}`);
      values.push(v);
      console.log('  seuil_alerte (stored):', v);
    }

    if (vehicle_model_ids !== undefined) {
      let sanitizedIds = null;
      if (Array.isArray(vehicle_model_ids) && vehicle_model_ids.length > 0) {
        const validIds = vehicle_model_ids
          .map((id) => { const n = typeof id === 'number' ? id : parseInt(String(id), 10); return !isNaN(n) && n > 0 ? n : null; })
          .filter((id) => id !== null);
        if (validIds.length > 0) sanitizedIds = validIds;
      }
      updates.push(`vehicle_model_ids = $${paramCount++}`);
      values.push(sanitizedIds);

      let compatibleVehiclesJson = null;
      if (sanitizedIds && sanitizedIds.length > 0) {
        try {
          const vmResult = await pool.query(
            'SELECT id, marque, model FROM vehicle_models WHERE id = ANY($1) ORDER BY marque, model',
            [sanitizedIds]
          );
          const arr = (vmResult.rows || []).map((r) => ({
            brand: String(r.marque || '').trim() || 'Unknown',
            model: String(r.model || '').trim() || ''
          })).filter((v) => v.model);
          if (arr.length > 0) compatibleVehiclesJson = JSON.stringify(arr);
        } catch (vmErr) {
          console.warn('⚠️  Could not resolve vehicle_model_ids to compatible_vehicles:', vmErr.message);
        }
      }
      updates.push(`compatible_vehicles = COALESCE($${paramCount++}::jsonb, '[]'::jsonb)`);
      values.push(compatibleVehiclesJson);
      console.log('  vehicle_model_ids (stored):', sanitizedIds, 'compatible_vehicles:', compatibleVehiclesJson ? 'built' : 'empty');
    }

    if (updates.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No valid fields to update'
      });
    }
    
    updates.push(`updated_at = NOW()`);
    values.push(productId);
    
    const result = await pool.query(
      `UPDATE category_products 
       SET ${updates.join(', ')}
       WHERE id = $${paramCount}
       RETURNING *`,
      values
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Category product not found'
      });
    }
    
    const updatedRow = result.rows[0];
    console.log(`✅ Updated category product with ID: ${productId}`);
    if (prix_neveux !== undefined) {
      console.log(`   prix_neveux (stored): ${updatedRow.prix_neveux}`);
      // Verification: refetch and assert prix_neveux matches
      try {
        const refetch = await pool.query('SELECT prix_neveux FROM category_products WHERE id = $1', [productId]);
        const refetchedPn = refetch?.rows?.[0]?.prix_neveux;
        const expectedPn = (typeof prix_neveux === 'number' ? prix_neveux : parseFloat(prix_neveux));
        const expected = (expectedPn != null && Number.isFinite(expectedPn) && expectedPn >= 0) ? expectedPn : null;
        if (String(refetchedPn ?? 'null') !== String(expected ?? 'null')) {
          console.warn(`⚠️ Verification: prix_neveux mismatch - expected ${expected}, refetched ${refetchedPn}`);
        } else {
          console.log(`✅ Verification: prix_neveux matches after refetch (${refetchedPn})`);
        }
      } catch (verifyErr) {
        console.warn('⚠️ Verification refetch failed (non-fatal):', verifyErr.message);
      }
    }
    
    res.json({
      success: true,
      data: updatedRow
    });
  } catch (error) {
    console.error('❌ Error updating category product:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update category product',
      details: error.message || 'Unknown database error',
      errorCode: error.code || 'UNKNOWN'
    });
  }
}));

/**
 * DELETE /api/category-products/:id
 * Delete a category product (admin only)
 */
router.delete('/:id', requireAdmin, asyncHandler(async (req, res) => {
  const { id } = req.params;
  
  console.log(`📥 DELETE /api/category-products/${id}`);
  
  try {
    const result = await pool.query(
      'DELETE FROM category_products WHERE id = $1 RETURNING *',
      [id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Category product not found'
      });
    }
    
    console.log(`✅ Deleted category product with ID: ${id}`);
    
    res.json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    console.error('❌ Error deleting category product:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete category product',
      details: error.message || 'Unknown database error',
      errorCode: error.code || 'UNKNOWN'
    });
  }
}));

module.exports = router;
