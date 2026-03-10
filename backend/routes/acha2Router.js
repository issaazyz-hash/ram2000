/**
 * Acha2 Router
 * Dedicated endpoints for Acha2 page products
 * Uses acha2_products table (separate from acha_products)
 */

const express = require('express');
const router = express.Router();
const pool = require('../db/pool');
const createAcha2ProductsTable = require('../migrations/create_acha2_products_table');
const createAdminDashboardProductsTable = require('../migrations/create_admin_dashboard_products_table');
const createMarquesModelesTables = require('../migrations/create_marques_modeles_tables');
const requireAdmin = require('../middlewares/requireAdmin');

function formatAcha2ProductRow(product) {
  let parsedReferences = product.references2;
  if (typeof parsedReferences === 'string') {
    try { parsedReferences = JSON.parse(parsedReferences); } catch (e) { parsedReferences = []; }
  }
  if (!Array.isArray(parsedReferences)) parsedReferences = [];
  let parsedImages = product.images2;
  if (typeof parsedImages === 'string') {
    try { parsedImages = JSON.parse(parsedImages); } catch (e) { parsedImages = []; }
  }
  if (!Array.isArray(parsedImages)) parsedImages = [];
  let parsedModeles = product.modele2;
  if (typeof parsedModeles === 'string') {
    try { parsedModeles = JSON.parse(parsedModeles); } catch (e) { parsedModeles = []; }
  }
  if (!Array.isArray(parsedModeles)) parsedModeles = [];
  let parsedAvisClients = { average: 0, count: 0, reviews: [] };
  if (product.avis_clients) {
    if (typeof product.avis_clients === 'string') {
      try { parsedAvisClients = JSON.parse(product.avis_clients); } catch (e) {}
    } else if (typeof product.avis_clients === 'object' && product.avis_clients !== null) {
      parsedAvisClients = product.avis_clients;
    }
  }
  return {
    name: product.name,
    quantity2: product.quantity2 || 0,
    price2: product.price2 ? parseFloat(product.price2) : 0,
    description2: product.description2 || '',
    references2: parsedReferences,
    images2: parsedImages,
    modele2: parsedModeles,
    has_discount2: product.has_discount2 || false,
    discount_type2: product.discount_type2 || null,
    discount_value2: product.discount_value2 ? parseFloat(product.discount_value2) : null,
    discounted_price2: product.discounted_price2 ? parseFloat(product.discounted_price2) : null,
    caracteristiques2: product.caracteristiques2 || '',
    references_constructeur2: product.references_constructeur2 || '',
    custom_content2: product.custom_content2 || '',
    avis_clients: parsedAvisClients,
    champ1: product.champ1 || null,
    champ2: product.champ2 || null,
    champ3: product.champ3 || null,
    champ4: product.champ4 || null,
    champ5: product.champ5 || null,
    champ6: product.champ6 || null
  };
}

/**
 * GET /api/acha2/equivalents
 * Get products with the same référence as the current product
 * Query params: reference (required), slug (optional - to exclude current product)
 * Must be before /:slug route to avoid route conflict
 */
router.get('/equivalents', async (req, res) => {
  // ────────────────────────────────────────────────────────────────────────────
  // MANUAL TEST INSTRUCTIONS:
  // 1. Create two products in category_products with same name but different slugs
  // 2. Put the same reference inside acha2_products.references2 for the same name
  // 3. Call: /api/acha2/equivalents?reference=OEM%201109%20AZ&slug=<currentSlug>
  // 4. Result should contain only ONE product for this name
  // ────────────────────────────────────────────────────────────────────────────

  // ────────────────────────────────────────────────────────────────────────────
  // 1️⃣ INPUT VALIDATION (MANDATORY) - Return immediately if invalid
  // ────────────────────────────────────────────────────────────────────────────
  const { reference, slug } = req.query;

  // Check if reference is missing, empty, null, or not a string
  if (!reference || typeof reference !== 'string' || reference.trim().length === 0) {
    console.log('[equivalents] reference missing or invalid, returning empty array');
    return res.status(200).json({
      success: true,
      products: []
    });
  }

  // slug is OPTIONAL - if missing, we don't exclude current product
  const trimmedReference = reference.trim();
  const trimmedSlug = (slug && typeof slug === 'string' && slug.trim().length > 0) 
    ? slug.trim() 
    : null;

  console.log('[equivalents] reference:', trimmedReference, 'slug:', trimmedSlug || 'none (not excluding current product)');

  // ────────────────────────────────────────────────────────────────────────────
  // 6️⃣ DIAGNOSTIC WARNINGS (Non-destructive checks before main query)
  // ────────────────────────────────────────────────────────────────────────────
  try {
    // Check for duplicate slugs
    const dupSlugCheck = await pool.query(`
      SELECT slug, COUNT(*) as c
      FROM category_products
      GROUP BY slug
      HAVING COUNT(*) > 1
      ORDER BY c DESC
      LIMIT 10
    `);
    if (dupSlugCheck.rows.length > 0) {
      console.log('[equivalents] WARNING duplicate slugs in category_products:', dupSlugCheck.rows);
    }

    // Check for duplicate names
    const dupNameCheck = await pool.query(`
      SELECT name, COUNT(*) as c
      FROM category_products
      GROUP BY name
      HAVING COUNT(*) > 1
      ORDER BY c DESC
      LIMIT 10
    `);
    if (dupNameCheck.rows.length > 0) {
      console.log('[equivalents] WARNING duplicate names in category_products:', dupNameCheck.rows);
    }

    // ────────────────────────────────────────────────────────────────────────────
    // 2️⃣ SQL QUERY (CRITICAL) - Use DISTINCT ON (cp.name) to guarantee one per name
    // ────────────────────────────────────────────────────────────────────────────
    // Use DISTINCT ON (cp.name) to ensure only ONE row per product name
    // ORDER BY cp.name first (required for DISTINCT ON), then cp.created_at DESC (latest first)
    // Exclude current product using cp.slug <> $2 only if $2 is not NULL
    // Match equivalent products by checking reference in a2.references2 JSONB array
    const query = `SELECT DISTINCT ON (cp.name)
      cp.id,
      cp.name as title,
      cp.slug,
      cp.image,
      cp.created_at,
      COALESCE(a2.price2, 0) as price,
      a2.images2,
      a2.references2
    FROM category_products cp
    JOIN acha2_products a2 ON a2.name = cp.name
    WHERE a2.references2 IS NOT NULL
      AND EXISTS (
        SELECT 1
        FROM jsonb_array_elements_text(a2.references2) AS ref_elem
        WHERE TRIM(ref_elem) = $1
      )
      AND ( $2::text IS NULL OR cp.slug <> $2 )
    ORDER BY cp.name, cp.created_at DESC
    LIMIT 10`;

    // Parameters: [reference (matching), slug (exclusion, can be null)]
    const params = [trimmedReference, trimmedSlug];

    const result = await pool.query(query, params);

    // ────────────────────────────────────────────────────────────────────────────
    // 5️⃣ LOGGING (REQUIRED) - Raw rows from SQL
    // ────────────────────────────────────────────────────────────────────────────
    console.log('[equivalents] raw rows count:', result.rows.length);
    console.log('[equivalents] raw rows:', result.rows.map(row => ({
      id: row.id,
      slug: row.slug,
      title: row.title
    })));

    // ────────────────────────────────────────────────────────────────────────────
    // 4️⃣ FORMAT THE RESULTS (Object mapping)
    // ────────────────────────────────────────────────────────────────────────────
    const formattedProducts = result.rows.map((row) => {
      let image = row.image;
      
      // If no image in category_products, try to get from acha2_products images2
      if (!image && row.images2) {
        try {
          const images2 = typeof row.images2 === 'string' 
            ? JSON.parse(row.images2) 
            : row.images2;
          if (Array.isArray(images2) && images2.length > 0) {
            image = images2[0];
          }
        } catch (e) {
          // Ignore parse errors
        }
      }

      // Get all references for this product (safe parsing)
      let references = [];
      if (row.references2) {
        try {
          references = typeof row.references2 === 'string' 
            ? JSON.parse(row.references2) 
            : row.references2;
          if (!Array.isArray(references)) {
            references = [];
          }
        } catch (e) {
          references = [];
        }
      }

      return {
        id: row.slug,        // id = slug
        slug: row.slug,
        title: row.title,
        price: Number(row.price) || 0,
        image: image || null,
        reference: trimmedReference,
        references: references
      };
    });

    // ────────────────────────────────────────────────────────────────────────────
    // 3️⃣ BACKEND - Extra Safety Filter: Deduplicate by normalized title
    // ────────────────────────────────────────────────────────────────────────────
    const titleMap = new Map();
    const finalProducts = [];
    
    for (const p of formattedProducts) {
      // Skip if missing title or slug
      if (!p?.title || !p?.slug) {
        console.log('[equivalents] WARNING: Product missing title or slug:', { title: p?.title, slug: p?.slug });
        continue;
      }

      // Normalize title: trim and lowercase
      const normalizedTitle = (p.title || '').trim().toLowerCase();
      
      // If this normalized title already exists, skip (keep first occurrence)
      if (titleMap.has(normalizedTitle)) {
        console.log('[equivalents] WARNING: Duplicate normalized title detected:', normalizedTitle, 'slug:', p.slug);
        continue;
      }

      titleMap.set(normalizedTitle, p);
      finalProducts.push(p);
    }

    // ────────────────────────────────────────────────────────────────────────────
    // 5️⃣ LOGGING (REQUIRED) - Final results
    // ────────────────────────────────────────────────────────────────────────────
    console.log('[equivalents] final count:', finalProducts.length);
    console.log('[equivalents] final slugs/titles:', finalProducts.map(p => ({ slug: p.slug, title: p.title })));

    // ────────────────────────────────────────────────────────────────────────────
    // 5️⃣ RESPONSE FORMAT
    // ────────────────────────────────────────────────────────────────────────────
    return res.status(200).json({
      success: true,
      products: finalProducts
    });

  } catch (error) {
    // ────────────────────────────────────────────────────────────────────────────
    // ERROR SAFETY (ABSOLUTE RULE) - NEVER return 500
    // ────────────────────────────────────────────────────────────────────────────
    console.error('[equivalents] SQL error:', error);
    console.error('[equivalents] Error code:', error.code);
    console.error('[equivalents] Error message:', error.message);
    
    // Return empty array instead of crashing - NEVER return 500
    return res.status(200).json({
      success: true,
      products: []
    });
  }
});

/**
 * GET /api/acha2/equivalent-products/:slug
 * Get products with the same référence as the current product
 * Excludes the current product itself
 * Must be before /:slug route to avoid route conflict
 * DEPRECATED: Use /equivalents endpoint instead
 */
router.get('/equivalent-products/:slug', async (req, res) => {
  try {
    const { slug } = req.params;
    const { reference } = req.query;

    if (!slug) {
      return res.status(400).json({
        success: false,
        error: 'Product slug is required'
      });
    }

    if (!reference) {
      return res.status(400).json({
        success: false,
        error: 'Reference parameter is required'
      });
    }

    // First, get the current product to exclude it
    const currentProductResult = await pool.query(
      'SELECT id, name FROM category_products WHERE slug = $1',
      [slug]
    );

    if (currentProductResult.rows.length === 0) {
      return res.json({
        success: true,
        data: []
      });
    }

    const currentProductId = currentProductResult.rows[0].id;

    // Find products with the same référence in references2 array
    // Join category_products with acha2_products to get full product info
    // Search for reference in the references2 JSONB array
    const result = await pool.query(
      `SELECT DISTINCT
        cp.id,
        cp.name as title,
        cp.slug,
        cp.image,
        COALESCE(a2.price2, 0) as price,
        a2.images2
      FROM category_products cp
      INNER JOIN acha2_products a2 ON cp.name = a2.name
      WHERE cp.id != $1
        AND a2.references2 IS NOT NULL
        AND EXISTS (
          SELECT 1 
          FROM jsonb_array_elements_text(a2.references2) AS ref_elem
          WHERE TRIM(ref_elem) = $2
        )
      ORDER BY cp.created_at DESC
      LIMIT 6`,
      [
        currentProductId,
        reference.trim()
      ]
    );

    // Format the results
    const equivalentProducts = result.rows.map((row) => {
      let image = row.image;
      // If no image in category_products, try to get from acha2_products images2
      if (!image && row.images2) {
        try {
          const images2 = typeof row.images2 === 'string' 
            ? JSON.parse(row.images2) 
            : row.images2;
          if (Array.isArray(images2) && images2.length > 0) {
            image = images2[0];
          }
        } catch (e) {
          // Ignore parse errors
        }
      }

      return {
        id: row.id,
        title: row.title,
        price: parseFloat(row.price) || 0,
        image: image || null,
        reference: reference,
        slug: row.slug
      };
    });

    return res.json({
      success: true,
      data: equivalentProducts
    });

  } catch (error) {
    console.error('❌ Error in GET /api/acha2/equivalent-products/:slug:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch equivalent products',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * GET /api/acha2/:slug/marques
 * Get marques available for a product
 * Must be before /:slug route to avoid route conflict
 */
router.get('/:slug/marques', async (req, res) => {
  try {
    await createMarquesModelesTables();
    
    const { slug } = req.params;
    if (!slug) {
      return res.status(200).json({ success: true, marques: [] });
    }

    const result = await pool.query(
      `SELECT DISTINCT m.id, m.name
       FROM marques m
       INNER JOIN product_marques pm ON pm.marque_id = m.id
       WHERE pm.product_slug = $1
       ORDER BY m.name ASC`,
      [slug]
    );

    return res.status(200).json({
      success: true,
      marques: result.rows
    });
  } catch (error) {
    console.error('[GET /api/acha2/:slug/marques] Error:', error);
    return res.status(200).json({ success: true, marques: [] });
  }
});

/**
 * GET /api/acha2/:slug/modeles
 * Get modeles available for a product and marque
 * Query param: marqueId (required)
 * Must be before /:slug route to avoid route conflict
 */
router.get('/:slug/modeles', async (req, res) => {
  try {
    await createMarquesModelesTables();
    
    const { slug } = req.params;
    const { marqueId } = req.query;

    if (!slug || !marqueId) {
      return res.status(200).json({ success: true, modeles: [] });
    }

    const marqueIdInt = parseInt(marqueId);
    if (isNaN(marqueIdInt)) {
      return res.status(200).json({ success: true, modeles: [] });
    }

    const result = await pool.query(
      `SELECT DISTINCT m.id, m.name, m.marque_id
       FROM modeles m
       INNER JOIN product_modeles pm ON pm.modele_id = m.id
       WHERE pm.product_slug = $1 AND m.marque_id = $2
       ORDER BY m.name ASC`,
      [slug, marqueIdInt]
    );

    return res.status(200).json({
      success: true,
      modeles: result.rows
    });
  } catch (error) {
    console.error('[GET /api/acha2/:slug/modeles] Error:', error);
    return res.status(200).json({ success: true, modeles: [] });
  }
});

/**
 * Find equivalent products by reference matching
 * Splits reference string by comma, trims tokens, and finds products with matching tokens
 * @param {string} currentSlug - Slug of the current product (to exclude)
 * @param {string|null} referenceString - Reference string (e.g. "jjj, hhh") or null
 * @returns {Promise<Array>} Array of equivalent product summaries
 */
async function findEquivalentProductsByReference(currentSlug, referenceString) {
  try {
    // If no reference or empty, return empty array
    if (!referenceString || typeof referenceString !== 'string' || referenceString.trim().length === 0) {
      return [];
    }

    // Split by comma, trim, and filter out empty tokens
    const currentTokens = referenceString
      .split(',')
      .map(token => token.trim())
      .filter(token => token.length > 0);

    if (currentTokens.length === 0) {
      return [];
    }

    // Build SQL condition: check if any token from current product matches any token in other products
    // We'll use a LIKE pattern for each token
    const conditions = currentTokens.map((_, index) => 
      `cp.reference ILIKE '%' || $${index + 2} || '%'`
    ).join(' OR ');

    // Query to find products with matching reference tokens
    const query = `
      SELECT DISTINCT
        cp.id,
        cp.name,
        cp.slug,
        cp.image,
        cp.reference,
        cp.rating,
        cp.prix_neveux,
        a2.price2,
        a2.quantity2
      FROM category_products cp
      LEFT JOIN acha2_products a2 ON a2.name = cp.name
      WHERE cp.slug != $1
        AND cp.reference IS NOT NULL
        AND cp.reference != ''
        AND (${conditions})
      ORDER BY cp.name ASC
      LIMIT 10
    `;

    const params = [currentSlug, ...currentTokens];
    const result = await pool.query(query, params);

    // Map to equivalent product summary format - prefer prix_neveux over price2
    const equivalents = result.rows.map(row => {
      let price = null;
      if (row.prix_neveux != null && row.prix_neveux !== '' && Number.isFinite(parseFloat(row.prix_neveux))) {
        price = parseFloat(row.prix_neveux);
      } else if (row.price2 !== null && row.price2 !== undefined) {
        price = parseFloat(row.price2);
      }

      let stock = null;
      if (row.quantity2 !== null && row.quantity2 !== undefined) {
        stock = parseInt(row.quantity2);
      }

      let rating = null;
      if (row.rating !== null && row.rating !== undefined) {
        rating = parseInt(row.rating);
      }

      return {
        id: row.id,
        name: row.name || '',
        slug: row.slug || '',
        image: row.image || null,
        reference: row.reference || null,
        price: price,
        stock: stock,
        rating: rating
      };
    });

    return equivalents;
  } catch (error) {
    console.error('❌ Error finding equivalent products:', error);
    // Return empty array on error to not break the main product fetch
    return [];
  }
}

/**
 * PATCH /api/acha2/:slug/hide-vehicle-selectors
 * Admin only. Toggle hideVehicleSelectors flag on acha2 product.
 * Body: { hideVehicleSelectors: true | false }
 */
router.patch('/:slug/hide-vehicle-selectors', requireAdmin, async (req, res) => {
  try {
    const { slug } = req.params;
    const { hideVehicleSelectors } = req.body;

    if (!slug || typeof slug !== 'string' || slug.trim() === '') {
      return res.status(400).json({ success: false, error: 'Slug is required' });
    }

    if (typeof hideVehicleSelectors !== 'boolean') {
      return res.status(400).json({ success: false, error: 'hideVehicleSelectors must be true or false' });
    }

    await createAcha2ProductsTable();
    const decodedSlug = decodeURIComponent(slug.trim());

    // Resolve slug to acha2 product name: category_products.slug -> category_products.name, else use slug
    let productName = decodedSlug;
    const catResult = await pool.query('SELECT name FROM category_products WHERE slug = $1', [decodedSlug]);
    if (catResult.rows.length > 0) {
      productName = catResult.rows[0].name;
    }

    const result = await pool.query(
      'UPDATE acha2_products SET hide_vehicle_selectors = $1, updated_at = NOW() WHERE name = $2 RETURNING name, hide_vehicle_selectors',
      [hideVehicleSelectors, productName]
    );

    if (!result.rows || result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Product not found' });
    }

    const row = result.rows[0];
    return res.json({
      success: true,
      data: {
        name: row.name,
        hideVehicleSelectors: row.hide_vehicle_selectors === true
      }
    });
  } catch (error) {
    console.error('❌ PATCH /api/acha2/:slug/hide-vehicle-selectors:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/acha2/:slug
 * Load product by slug (from category_products)
 * Returns: { success: true, data: {...} } or { success: true, data: null }
 */
router.get('/:slug', async (req, res) => {
  try {
    const { slug } = req.params;

    if (!slug) {
      return res.status(400).json({
        success: false,
        error: 'Product slug is required'
      });
    }

    // First, try to fetch from category_products by slug
    const categoryProductResult = await pool.query(
      'SELECT * FROM category_products WHERE slug = $1',
      [slug]
    );

    if (categoryProductResult.rows.length > 0) {
      const categoryProduct = categoryProductResult.rows[0];
      
      // Check if corresponding acha2_products entry exists
      await createAcha2ProductsTable();
      const acha2Result = await pool.query(
        'SELECT * FROM acha2_products WHERE name = $1',
        [categoryProduct.name]
      );

      let acha2Product = acha2Result.rows.length > 0 ? acha2Result.rows[0] : null;

      // If acha2_products doesn't exist, create a basic entry
      if (!acha2Product) {
        const initialPrice = (categoryProduct.prix_neveux != null && Number.isFinite(parseFloat(categoryProduct.prix_neveux)))
          ? parseFloat(categoryProduct.prix_neveux)
          : 0;
        const insertResult = await pool.query(
          `INSERT INTO acha2_products (name, quantity2, price2, description2, references2, images2, modele2, created_at, updated_at)
           VALUES ($1, $2, $3, $4, $5::jsonb, $6::jsonb, $7::jsonb, NOW(), NOW())
           RETURNING *`,
          [categoryProduct.name, 0, initialPrice, '', '[]', categoryProduct.image ? JSON.stringify([categoryProduct.image]) : '[]', '[]']
        );
        acha2Product = insertResult.rows[0];
      }

      // Parse JSONB fields
      let references2 = acha2Product.references2;
      if (typeof references2 === 'string') {
        try {
          references2 = JSON.parse(references2);
        } catch (e) {
          references2 = [];
        }
      }
      if (!Array.isArray(references2)) {
        references2 = [];
      }

      let images2 = acha2Product.images2;
      if (typeof images2 === 'string') {
        try {
          images2 = JSON.parse(images2);
        } catch (e) {
          images2 = [];
        }
      }
      if (!Array.isArray(images2)) {
        images2 = [];
        // If no images in acha2_products, use image from category_products
        if (categoryProduct.image) {
          images2 = [categoryProduct.image];
        }
      }

      let modele2 = acha2Product.modele2;
      if (typeof modele2 === 'string') {
        try {
          modele2 = JSON.parse(modele2);
        } catch (e) {
          modele2 = [];
        }
      }
      if (!Array.isArray(modele2)) {
        modele2 = [];
      }

      // Parse avis_clients
      let parsedAvisClients = { average: 0, count: 0, reviews: [] };
      if (acha2Product.avis_clients) {
        if (typeof acha2Product.avis_clients === 'string') {
          try {
            parsedAvisClients = JSON.parse(acha2Product.avis_clients);
          } catch (e) {
            parsedAvisClients = { average: 0, count: 0, reviews: [] };
          }
        } else if (typeof acha2Product.avis_clients === 'object' && acha2Product.avis_clients !== null) {
          parsedAvisClients = acha2Product.avis_clients;
        }
      }

      // Include reference and rating from category_products if available
      const categoryReference = categoryProduct.reference || null;
      const categoryRating = categoryProduct.rating !== null && categoryProduct.rating !== undefined 
        ? parseInt(categoryProduct.rating) 
        : null;

      // Find equivalent products by reference
      const equivalentProducts = await findEquivalentProductsByReference(slug, categoryReference);

      // Prefer prix_neveux from category_products for display (famille des pièces)
      const prixNeveux = (categoryProduct.prix_neveux != null && categoryProduct.prix_neveux !== '' && Number.isFinite(parseFloat(categoryProduct.prix_neveux)))
        ? parseFloat(categoryProduct.prix_neveux)
        : null;
      const displayPrice = (prixNeveux != null && Number.isFinite(prixNeveux))
        ? prixNeveux
        : (acha2Product.price2 ? parseFloat(acha2Product.price2) : 0);

      // Stock: prefer category_products.stock_disponible when available; fallback to acha2 quantity2
      const stockDisponible = (categoryProduct.stock_disponible != null && categoryProduct.stock_disponible !== '')
        ? parseInt(categoryProduct.stock_disponible, 10) : null;
      const seuilAlerte = (categoryProduct.seuil_alerte != null && categoryProduct.seuil_alerte !== '')
        ? parseInt(categoryProduct.seuil_alerte, 10) : null;
      const effectiveStock = (stockDisponible != null && Number.isFinite(stockDisponible))
        ? stockDisponible
        : (acha2Product.quantity2 != null ? parseInt(acha2Product.quantity2, 10) : 0);

      // compatibleVehicles: for acha2 Marque/Modèle filtering. Parse from compatible_vehicles or derive from vehicle_model_ids
      let compatibleVehicles = [];
      if (categoryProduct.compatible_vehicles != null) {
        try {
          const parsed = typeof categoryProduct.compatible_vehicles === 'string'
            ? JSON.parse(categoryProduct.compatible_vehicles)
            : categoryProduct.compatible_vehicles;
          if (Array.isArray(parsed)) {
            compatibleVehicles = parsed.filter((v) => v && (v.brand || v.model));
          }
        } catch (e) { /* ignore */ }
      }
      if (compatibleVehicles.length === 0 && categoryProduct.vehicle_model_ids && categoryProduct.vehicle_model_ids.length > 0) {
        try {
          const vmResult = await pool.query(
            'SELECT id, marque, model FROM vehicle_models WHERE id = ANY($1) ORDER BY marque, model',
            [categoryProduct.vehicle_model_ids]
          );
          compatibleVehicles = (vmResult.rows || []).map((r) => ({
            brand: String(r.marque || '').trim() || 'Unknown',
            model: String(r.model || '').trim() || ''
          })).filter((v) => v.model);
        } catch (e) { /* ignore */ }
      }

      console.log('📤 GET /api/acha2/:slug (via category_products) - returning editable sections', {
        name: acha2Product.name,
        caracteristiques2: acha2Product.caracteristiques2 != null ? `${String(acha2Product.caracteristiques2).length} chars` : 'null',
        custom_content2: acha2Product.custom_content2 != null ? `${String(acha2Product.custom_content2).length} chars` : 'null',
        references_constructeur2: acha2Product.references_constructeur2 != null ? `${String(acha2Product.references_constructeur2).length} chars` : 'null',
        avis_clients: acha2Product.avis_clients ? 'present' : 'null'
      });

      return res.json({
        success: true,
        data: {
          categoryProductId: categoryProduct.id,
          name: acha2Product.name,
          quantity2: effectiveStock,
          price2: displayPrice,
          prixNeveux: prixNeveux,
          stockDisponible: Number.isFinite(stockDisponible) ? stockDisponible : effectiveStock,
          seuilAlerte: Number.isFinite(seuilAlerte) ? seuilAlerte : 0,
          description2: acha2Product.description2 || '',
          references2: references2,
          images2: images2,
          modele2: modele2,
          has_discount2: acha2Product.has_discount2 || false,
          discount_type2: acha2Product.discount_type2 || null,
          discount_value2: acha2Product.discount_value2 ? parseFloat(acha2Product.discount_value2) : null,
          discounted_price2: acha2Product.discounted_price2 ? parseFloat(acha2Product.discounted_price2) : null,
          caracteristiques2: acha2Product.caracteristiques2 || '',
          references_constructeur2: acha2Product.references_constructeur2 || '',
          custom_content2: acha2Product.custom_content2 || '',
          avis_clients: parsedAvisClients,
          reference: categoryReference,
          rating: categoryRating,
          champ1: acha2Product.champ1 || null,
          champ2: acha2Product.champ2 || null,
          champ3: acha2Product.champ3 || null,
          champ4: acha2Product.champ4 || null,
          champ5: acha2Product.champ5 || null,
          champ6: acha2Product.champ6 || null,
          hideVehicleSelectors: acha2Product.hide_vehicle_selectors === true,
          compatibleVehicles: compatibleVehicles,
          equivalentProducts: equivalentProducts
        }
      });
    }

    // If not found in category_products, try acha2_products by name (backward compatibility)
    await createAcha2ProductsTable();
    const result = await pool.query(
      'SELECT * FROM acha2_products WHERE name = $1',
      [slug]
    );

    if (result.rows.length === 0) {
      return res.json({
        success: true,
        data: null
      });
    }

    const product = result.rows[0];

    // Parse JSONB fields if they're strings
    let references2 = product.references2;
    if (typeof references2 === 'string') {
      try {
        references2 = JSON.parse(references2);
      } catch (e) {
        references2 = [];
      }
    }
    if (!Array.isArray(references2)) {
      references2 = [];
    }

    let images2 = product.images2;
    if (typeof images2 === 'string') {
      try {
        images2 = JSON.parse(images2);
      } catch (e) {
        images2 = [];
      }
    }
    if (!Array.isArray(images2)) {
      images2 = [];
    }

    let modele2 = product.modele2;
    if (typeof modele2 === 'string') {
      try {
        modele2 = JSON.parse(modele2);
      } catch (e) {
        modele2 = [];
      }
    }
    if (!Array.isArray(modele2)) {
      modele2 = [];
    }

    // Parse avis_clients (JSONB)
    let parsedAvisClients = { average: 0, count: 0, reviews: [] };
    if (product.avis_clients) {
      if (typeof product.avis_clients === 'string') {
        try {
          parsedAvisClients = JSON.parse(product.avis_clients);
        } catch (e) {
          parsedAvisClients = { average: 0, count: 0, reviews: [] };
        }
      } else if (typeof product.avis_clients === 'object' && product.avis_clients !== null) {
        parsedAvisClients = product.avis_clients;
      }
    }
    // Ensure structure is valid
    if (!parsedAvisClients.average || typeof parsedAvisClients.average !== 'number') {
      parsedAvisClients.average = 0;
    }
    if (!parsedAvisClients.count || typeof parsedAvisClients.count !== 'number') {
      parsedAvisClients.count = 0;
    }
    if (!Array.isArray(parsedAvisClients.reviews)) {
      parsedAvisClients.reviews = [];
    }

    // For backward compatibility path, no reference from category_products, so no equivalents
    const equivalentProducts = [];
    const qty2 = product.quantity2 != null ? parseInt(product.quantity2, 10) : 0;

    console.log('📤 GET /api/acha2/:slug (by name) - returning editable sections', {
      name: product.name,
      caracteristiques2: product.caracteristiques2 != null ? `${String(product.caracteristiques2).length} chars` : 'null',
      custom_content2: product.custom_content2 != null ? `${String(product.custom_content2).length} chars` : 'null',
      references_constructeur2: product.references_constructeur2 != null ? `${String(product.references_constructeur2).length} chars` : 'null',
      avis_clients: product.avis_clients ? (typeof product.avis_clients === 'object' && product.avis_clients.reviews ? product.avis_clients.reviews.length + ' reviews' : 'present') : 'null'
    });

    return res.json({
      success: true,
      data: {
        name: product.name,
        quantity2: qty2,
        stockDisponible: Number.isFinite(qty2) ? qty2 : 0,
        seuilAlerte: 0,
        price2: product.price2 ? parseFloat(product.price2) : 0,
        description2: product.description2 || '',
        references2: references2,
        images2: images2,
        modele2: modele2,
        has_discount2: product.has_discount2 || false,
        discount_type2: product.discount_type2 || null,
        discount_value2: product.discount_value2 ? parseFloat(product.discount_value2) : null,
        discounted_price2: product.discounted_price2 ? parseFloat(product.discounted_price2) : null,
        caracteristiques2: product.caracteristiques2 || '',
        references_constructeur2: product.references_constructeur2 || '',
        custom_content2: product.custom_content2 || '',
        avis_clients: parsedAvisClients,
        champ1: product.champ1 || null,
        champ2: product.champ2 || null,
        champ3: product.champ3 || null,
        champ4: product.champ4 || null,
        champ5: product.champ5 || null,
        champ6: product.champ6 || null,
        hideVehicleSelectors: product.hide_vehicle_selectors === true,
        compatibleVehicles: [],
        equivalentProducts: equivalentProducts
      }
    });

  } catch (error) {
    console.error('❌ Error in GET /api/acha2/:slug:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to load product',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * GET /api/acha2?name=xxxx (backward compatibility)
 * Load product by name
 * Returns: { success: true, data: {...} } or { success: true, data: null }
 */
router.get('/', async (req, res) => {
  try {
    const { name } = req.query;

    if (!name) {
      return res.status(400).json({
        success: false,
        error: 'Product name is required'
      });
    }

    // Ensure table exists
    await createAcha2ProductsTable();

    // Query the database
    const result = await pool.query(
      'SELECT * FROM acha2_products WHERE name = $1',
      [name]
    );

    if (result.rows.length === 0) {
      return res.json({
        success: true,
        data: null
      });
    }

    const product = result.rows[0];

    // Parse JSONB fields if they're strings
    let references2 = product.references2;
    if (typeof references2 === 'string') {
      try {
        references2 = JSON.parse(references2);
      } catch (e) {
        references2 = [];
      }
    }
    if (!Array.isArray(references2)) {
      references2 = [];
    }

    let images2 = product.images2;
    if (typeof images2 === 'string') {
      try {
        images2 = JSON.parse(images2);
      } catch (e) {
        images2 = [];
      }
    }
    if (!Array.isArray(images2)) {
      images2 = [];
    }

    let modele2 = product.modele2;
    if (typeof modele2 === 'string') {
      try {
        modele2 = JSON.parse(modele2);
      } catch (e) {
        modele2 = [];
      }
    }
    if (!Array.isArray(modele2)) {
      modele2 = [];
    }

    // Parse avis_clients (JSONB)
    let parsedAvisClients = { average: 0, count: 0, reviews: [] };
    if (product.avis_clients) {
      if (typeof product.avis_clients === 'string') {
        try {
          parsedAvisClients = JSON.parse(product.avis_clients);
        } catch (e) {
          parsedAvisClients = { average: 0, count: 0, reviews: [] };
        }
      } else if (typeof product.avis_clients === 'object' && product.avis_clients !== null) {
        parsedAvisClients = product.avis_clients;
      }
    }
    // Ensure structure is valid
    if (!parsedAvisClients.average || typeof parsedAvisClients.average !== 'number') {
      parsedAvisClients.average = 0;
    }
    if (!parsedAvisClients.count || typeof parsedAvisClients.count !== 'number') {
      parsedAvisClients.count = 0;
    }
    if (!Array.isArray(parsedAvisClients.reviews)) {
      parsedAvisClients.reviews = [];
    }

    return res.json({
      success: true,
      data: {
        name: product.name,
        quantity2: product.quantity2 || 0,
        price2: product.price2 ? parseFloat(product.price2) : 0,
        description2: product.description2 || '',
        references2: references2,
        images2: images2,
        modele2: modele2,
        has_discount2: product.has_discount2 || false,
        discount_type2: product.discount_type2 || null,
        discount_value2: product.discount_value2 ? parseFloat(product.discount_value2) : null,
        discounted_price2: product.discounted_price2 ? parseFloat(product.discounted_price2) : null,
        caracteristiques2: product.caracteristiques2 || '',
        references_constructeur2: product.references_constructeur2 || '',
        custom_content2: product.custom_content2 || '',
        avis_clients: parsedAvisClients
      }
    });

  } catch (error) {
    console.error('❌ Error in GET /api/acha2:', error.message);
    return res.status(500).json({
      success: false,
      error: 'Server error'
    });
  }
});

/**
 * PUT /api/acha2/:name
 * Partial update only - only columns present in req.body are updated.
 * Missing/undefined fields are NEVER overwritten with defaults (preserve existing DB values).
 */
router.put('/:name', async (req, res) => {
  try {
    const { name } = req.params;
    const body = req.body || {};
    const rawKeys = Object.keys(body).filter(k => body[k] !== undefined);

    console.log('📥 PUT /api/acha2/:name - raw body keys received:', rawKeys);

    if (!name) {
      return res.status(400).json({
        success: false,
        error: 'Product name is required'
      });
    }

    if (rawKeys.length === 0) {
      console.log('📥 PUT /api/acha2/:name - no updatable fields, ignoring');
      await createAcha2ProductsTable();
      const existingResult = await pool.query('SELECT * FROM acha2_products WHERE name = $1', [name]);
      const existing = existingResult.rows[0];
      if (!existing) {
        return res.status(400).json({
          success: false,
          error: 'No fields to update and product does not exist'
        });
      }
      return res.json({ success: true, data: formatAcha2ProductRow(existing) });
    }

    await createAcha2ProductsTable();

    const existingResult = await pool.query('SELECT * FROM acha2_products WHERE name = $1', [name]);
    const existing = existingResult.rows[0];

    const updates = [];
    const values = [];
    let pos = 1;

    function add(col, val) {
      updates.push(`${col} = $${pos}`);
      values.push(val);
      pos++;
    }

    if (body.quantity2 !== undefined) {
      add('quantity2', Number.isFinite(Number(body.quantity2)) ? parseInt(body.quantity2, 10) : 0);
    }
    if (body.price2 !== undefined) {
      add('price2', parseFloat(body.price2) || 0);
    }
    if (body.description2 !== undefined) {
      add('description2', typeof body.description2 === 'string' ? body.description2 : '');
    }
    if (body.references2 !== undefined) {
      const arr = Array.isArray(body.references2) ? body.references2 : [];
      add('references2', JSON.stringify(arr));
    }
    if (body.images2 !== undefined) {
      const arr = Array.isArray(body.images2) ? body.images2 : [];
      add('images2', JSON.stringify(arr));
    }
    if (body.modele2 !== undefined) {
      const arr = Array.isArray(body.modele2) ? body.modele2 : [];
      add('modele2', JSON.stringify(arr));
    }
    if (body.has_discount2 !== undefined) {
      add('has_discount2', Boolean(body.has_discount2));
    }
    if (body.discount_type2 !== undefined) {
      add('discount_type2', body.discount_type2 || null);
    }
    if (body.discount_value2 !== undefined) {
      const v = body.discount_value2 != null ? parseFloat(body.discount_value2) : null;
      add('discount_value2', v);
    }
    if (body.discounted_price2 !== undefined) {
      add('discounted_price2', parseFloat(body.discounted_price2) || 0);
    }
    if (body.caracteristiques2 !== undefined) {
      add('caracteristiques2', typeof body.caracteristiques2 === 'string' ? body.caracteristiques2 : JSON.stringify(body.caracteristiques2 || {}));
    }
    if (body.references_constructeur2 !== undefined) {
      add('references_constructeur2', typeof body.references_constructeur2 === 'string' ? body.references_constructeur2 : '');
    }
    if (body.custom_content2 !== undefined) {
      add('custom_content2', typeof body.custom_content2 === 'string' ? body.custom_content2 : '');
    }
    if (body.avis_clients !== undefined && typeof body.avis_clients === 'object' && body.avis_clients !== null) {
      const a = body.avis_clients;
      const validated = {
        average: typeof a.average === 'number' ? Math.max(0, Math.min(5, a.average)) : 0,
        count: typeof a.count === 'number' ? Math.max(0, a.count) : 0,
        reviews: Array.isArray(a.reviews) ? a.reviews.map((r) => ({
          author: typeof r?.author === 'string' ? r.author.trim() : '',
          rating: typeof r?.rating === 'number' ? Math.max(1, Math.min(5, r.rating)) : 5,
          comment: typeof r?.comment === 'string' ? r.comment.trim() : ''
        })).filter((r) => r.author && r.comment) : []
      };
      if (validated.reviews.length > 0) {
        validated.average = validated.reviews.reduce((s, r) => s + r.rating, 0) / validated.reviews.length;
        validated.count = validated.reviews.length;
      }
      add('avis_clients', JSON.stringify(validated));
    }
    for (const c of ['champ1', 'champ2', 'champ3', 'champ4', 'champ5', 'champ6']) {
      if (body[c] !== undefined) add(c, body[c] || null);
    }

    if (updates.length === 0) {
      if (existing) return res.json({ success: true, data: formatAcha2ProductRow(existing) });
      return res.status(400).json({ success: false, error: 'No valid fields to update' });
    }

    updates.push('updated_at = NOW()');
    values.push(name);
    const setClause = updates.join(', ');
    const whereParam = `$${pos}`;

    const colsUpdated = updates.map(u => u.split(' = ')[0]).filter(x => x !== 'updated_at');
    console.log('📤 PUT /api/acha2/:name - columns to update:', colsUpdated);
    const editableCols = ['caracteristiques2', 'references_constructeur2', 'custom_content2', 'avis_clients'];
    const normalisedLog = {};
    editableCols.forEach(c => {
      if (body[c] !== undefined) {
        const v = body[c];
        if (typeof v === 'string') normalisedLog[c] = `string(${v.length})`;
        else if (typeof v === 'object' && v !== null) normalisedLog[c] = `object(${Array.isArray(v?.reviews) ? v.reviews.length + ' reviews' : 'ok'})`;
        else normalisedLog[c] = String(v);
      }
    });
    if (Object.keys(normalisedLog).length > 0) console.log('📤 PUT /api/acha2/:name - normalized editable fields before UPDATE:', normalisedLog);

    if (!existing) {
      await pool.query(
        'INSERT INTO acha2_products (name, updated_at) VALUES ($1, NOW()) ON CONFLICT (name) DO NOTHING',
        [name]
      );
    }

    const result = await pool.query(
      `UPDATE acha2_products SET ${setClause} WHERE name = ${whereParam} RETURNING *`,
      values
    );

    if (!result.rows || result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Product not found' });
    }

    const product = result.rows[0];
    const finalLog = {};
    editableCols.forEach(c => {
      const v = product[c];
      if (v != null) {
        if (typeof v === 'string') finalLog[c] = `string(${v.length})`;
        else if (typeof v === 'object') finalLog[c] = `object(${Array.isArray(v?.reviews) ? v.reviews.length + ' reviews' : 'ok'})`;
        else finalLog[c] = String(v);
      }
    });
    if (Object.keys(finalLog).length > 0) console.log('✅ PUT /api/acha2/:name - final DB row (editable sections):', finalLog);

    return res.json({ success: true, data: formatAcha2ProductRow(product) });

  } catch (error) {
    console.error('❌ Error in PUT /api/acha2/:name:', error.message);
    return res.status(500).json({
      success: false,
      error: 'Server error'
    });
  }
});

/**
 * GET /api/acha2/all
 * Get all acha2 products
 * Returns: { success: true, data: [...] }
 */
router.get('/all', async (req, res) => {
  try {
    // Ensure table exists
    await createAcha2ProductsTable();

    // Query all products
    const result = await pool.query(
      'SELECT * FROM acha2_products ORDER BY updated_at DESC, created_at DESC'
    );

    // Parse JSONB fields for each product
    const products = result.rows.map(product => {
      let references2 = product.references2;
      if (typeof references2 === 'string') {
        try {
          references2 = JSON.parse(references2);
        } catch (e) {
          references2 = [];
        }
      }
      if (!Array.isArray(references2)) {
        references2 = [];
      }

      let images2 = product.images2;
      if (typeof images2 === 'string') {
        try {
          images2 = JSON.parse(images2);
        } catch (e) {
          images2 = [];
        }
      }
      if (!Array.isArray(images2)) {
        images2 = [];
      }

      let modele2 = product.modele2;
      if (typeof modele2 === 'string') {
        try {
          modele2 = JSON.parse(modele2);
        } catch (e) {
          modele2 = [];
        }
      }
      if (!Array.isArray(modele2)) {
        modele2 = [];
      }

      return {
        id: product.name, // Use name as id
        name: product.name,
        quantity2: product.quantity2 || 0,
        price2: product.price2 ? parseFloat(product.price2) : 0,
        description2: product.description2 || '',
        references2: references2,
        images2: images2,
        modele2: modele2,
        has_discount2: product.has_discount2 || false,
        discount_type2: product.discount_type2 || null,
        discount_value2: product.discount_value2 ? parseFloat(product.discount_value2) : null,
        discounted_price2: product.discounted_price2 ? parseFloat(product.discounted_price2) : null,
        created_at: product.created_at,
        updated_at: product.updated_at
      };
    });

    return res.json({
      success: true,
      data: products
    });

  } catch (error) {
    console.error('❌ Error in GET /api/acha2/all:', error.message);
    return res.status(500).json({
      success: false,
      error: 'Server error'
    });
  }
});

/**
 * DELETE /api/acha2/:name
 * Delete acha2 product by name
 */
router.delete('/:name', async (req, res) => {
  try {
    const { name } = req.params;

    if (!name) {
      return res.status(400).json({
        success: false,
        error: 'Product name is required'
      });
    }

    // Ensure table exists
    await createAcha2ProductsTable();

    // Delete the product
    const result = await pool.query(
      'DELETE FROM acha2_products WHERE name = $1 RETURNING *',
      [name]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Product not found'
      });
    }

    return res.json({
      success: true,
      message: 'Product deleted successfully'
    });

  } catch (error) {
    console.error('❌ Error in DELETE /api/acha2/:name:', error.message);
    return res.status(500).json({
      success: false,
      error: 'Server error'
    });
  }
});

/**
 * POST /api/acha2/add-to-dashboard
 * Add Acha2 product to admin dashboard
 * Uses slug as unique identifier
 */
router.post('/add-to-dashboard', async (req, res) => {
  try {
    const { slug, source, promo_ref, promo_name } = req.body;

    if (!slug || typeof slug !== 'string' || slug.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Product slug is required'
      });
    }

    const trimmedSlug = slug.trim();
    const normalizedSource =
      source && typeof source === 'string' && source.trim().toLowerCase() === 'promotion'
        ? 'promotion'
        : null;
    const normalizedPromoRef =
      promo_ref && typeof promo_ref === 'string' && promo_ref.trim().length > 0
        ? promo_ref.trim()
        : null;
    const normalizedPromoName =
      promo_name && typeof promo_name === 'string' && promo_name.trim().length > 0
        ? promo_name.trim()
        : null;

    // Ensure table exists
    await createAdminDashboardProductsTable();

    // Get product from category_products
    const categoryProductResult = await pool.query(
      'SELECT name, image FROM category_products WHERE slug = $1',
      [trimmedSlug]
    );

    if (categoryProductResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Product not found'
      });
    }

    const categoryProduct = categoryProductResult.rows[0];

    // Get product data from acha2_products
    await createAcha2ProductsTable();
    const acha2Result = await pool.query(
      'SELECT price2, quantity2, references2, images2, discounted_price2, has_discount2 FROM acha2_products WHERE name = $1',
      [categoryProduct.name]
    );

    if (acha2Result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Product data not found'
      });
    }

    const acha2Product = acha2Result.rows[0];

    // Extract reference (first element of references2 array)
    let reference = null;
    if (acha2Product.references2) {
      try {
        const references2 = typeof acha2Product.references2 === 'string' 
          ? JSON.parse(acha2Product.references2) 
          : acha2Product.references2;
        if (Array.isArray(references2) && references2.length > 0) {
          reference = references2[0];
        }
      } catch (e) {
        // Ignore parsing errors
      }
    }

    // Extract image (first image from images2, or category_products.image)
    let image = categoryProduct.image || null;
    if (acha2Product.images2) {
      try {
        const images2 = typeof acha2Product.images2 === 'string' 
          ? JSON.parse(acha2Product.images2) 
          : acha2Product.images2;
        if (Array.isArray(images2) && images2.length > 0) {
          image = images2[0];
        }
      } catch (e) {
        // Ignore parsing errors, use categoryProduct.image
      }
    }

    // Extract price (use discounted_price2 if available and has discount, else price2)
    let price = acha2Product.price2 ? parseFloat(acha2Product.price2) : 0;
    if (acha2Product.has_discount2 && acha2Product.discounted_price2) {
      const discountedPrice = parseFloat(acha2Product.discounted_price2);
      if (discountedPrice > 0 && discountedPrice < price) {
        price = discountedPrice;
      }
    }

    const insertResult = await pool.query(
      `INSERT INTO admin_dashboard_products (slug, source, promo_ref, promo_name)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (slug) DO UPDATE SET
         source = COALESCE(EXCLUDED.source, admin_dashboard_products.source),
         promo_ref = COALESCE(EXCLUDED.promo_ref, admin_dashboard_products.promo_ref),
         promo_name = COALESCE(EXCLUDED.promo_name, admin_dashboard_products.promo_name)
       RETURNING *`,
      [trimmedSlug, normalizedSource, normalizedPromoRef, normalizedPromoName]
    );

    const added = insertResult.rows.length > 0;

    return res.status(200).json({
      success: true,
      added: added
    });

  } catch (error) {
    console.error('[add-to-dashboard] Error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to add product to dashboard'
    });
  }
});

module.exports = router;

