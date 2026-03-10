const express = require('express');
const router = express.Router();
const pool = require('../db/pool');
const createAdminDashboardProductsTable = require('../migrations/create_admin_dashboard_products_table');
const createAcha2ProductsTable = require('../migrations/create_acha2_products_table');

router.get('/dashboard-products', async (req, res) => {
  try {
    // Ensure tables exist with all required columns
    await createAdminDashboardProductsTable();
    await createAcha2ProductsTable();

    const sourceRaw = typeof req.query.source === 'string' ? req.query.source.trim() : '';
    const sourceFilter = sourceRaw === 'promotion' || sourceRaw === 'normal' ? sourceRaw : null;

    // Try query with champ columns (migration should ensure they exist)
    let result;
    try {
      result = await pool.query(`
        SELECT DISTINCT ON (cp.slug)
          adp.id as adp_id,
          cp.slug,
          cp.name,
          cp.image as cp_image,
          cp.category_slug,
          cp.reference as cp_reference,
          cp.rating as cp_rating,
          cp.stock_disponible as cp_stock_disponible,
          cp.seuil_alerte as cp_seuil_alerte,
          cp.prix_neveux as cp_prix_neveux,
          cp.prix_achat_brut,
          cp.remise_achat_percent,
          cp.net_achat_htva,
          cp.tva_percent,
          cp.net_achat_ttc,
          cp.marge_percent,
          cp.created_at as cp_created_at,
          cp.updated_at as cp_updated_at,
          cp.vehicle_model_ids,
          cp.compatible_vehicles,
          a2.images2,
          a2.references2,
          a2.price2,
          a2.discounted_price2,
          a2.has_discount2,
          a2.quantity2,
          a2.champ1,
          a2.champ2,
          a2.champ3,
          a2.champ4,
          a2.champ5,
          a2.champ6,
          adp.source,
          adp.promo_ref,
          adp.promo_name,
          adp.created_at
        FROM admin_dashboard_products adp
        INNER JOIN category_products cp ON cp.slug = adp.slug
        LEFT JOIN acha2_products a2 ON a2.name = cp.name
        WHERE (
          $1::text IS NULL
          OR ($1 = 'promotion' AND adp.source = 'promotion')
          OR ($1 = 'normal' AND (adp.source IS NULL OR adp.source <> 'promotion'))
        )
        ORDER BY cp.slug, adp.created_at DESC
      `, [sourceFilter]);
    } catch (queryError) {
      // If query fails due to missing champ columns (code 42703 = undefined column), use fallback
      if (queryError.code === '42703' || 
          (queryError.message && (queryError.message.includes('column') || queryError.message.includes('does not exist')))) {
        console.warn('[admin/dashboard-products] Query failed due to missing champ columns, using fallback query');
        result = await pool.query(`
          SELECT DISTINCT ON (cp.slug)
            adp.id as adp_id,
            cp.slug,
            cp.name,
            cp.image as cp_image,
            cp.category_slug,
            cp.reference as cp_reference,
            cp.rating as cp_rating,
            cp.stock_disponible as cp_stock_disponible,
            cp.seuil_alerte as cp_seuil_alerte,
            cp.prix_neveux as cp_prix_neveux,
            a2.images2,
            a2.references2,
            a2.price2,
            a2.discounted_price2,
            a2.has_discount2,
            a2.quantity2,
            NULL as champ1,
            NULL as champ2,
            NULL as champ3,
            NULL as champ4,
            NULL as champ5,
            NULL as champ6,
            adp.source,
            adp.promo_ref,
            adp.promo_name,
            adp.created_at
          FROM admin_dashboard_products adp
          INNER JOIN category_products cp ON cp.slug = adp.slug
          LEFT JOIN acha2_products a2 ON a2.name = cp.name
          WHERE (
            $1::text IS NULL
            OR ($1 = 'promotion' AND adp.source = 'promotion')
            OR ($1 = 'normal' AND (adp.source IS NULL OR adp.source <> 'promotion'))
          )
          ORDER BY cp.slug, adp.created_at DESC
        `, [sourceFilter]);
      } else {
        // Re-throw if it's a different error
        throw queryError;
      }
    }

    const products = result.rows.map((row, index) => {
      let image = row.cp_image || null;
      if (!image && row.images2) {
        try {
          const images2 = typeof row.images2 === 'string' 
            ? JSON.parse(row.images2) 
            : row.images2;
          if (Array.isArray(images2) && images2.length > 0) {
            image = images2[0];
          }
        } catch (e) {
        }
      }

      let reference = row.cp_reference || null;
      if (!reference && row.references2) {
        try {
          const references2 = typeof row.references2 === 'string' 
            ? JSON.parse(row.references2) 
            : row.references2;
          if (Array.isArray(references2) && references2.length > 0) {
            reference = references2[0];
          }
        } catch (e) {
        }
      }

      let price = row.cp_prix_neveux != null ? parseFloat(row.cp_prix_neveux) : (row.price2 ? parseFloat(row.price2) : 0);
      if (row.has_discount2 && row.discounted_price2) {
        const discountedPrice = parseFloat(row.discounted_price2);
        if (discountedPrice > 0 && discountedPrice < price) {
          price = discountedPrice;
        }
      }

      const stockFromCp = (row.cp_stock_disponible != null && row.cp_stock_disponible !== '')
        ? parseInt(row.cp_stock_disponible, 10) : null;
      const stockFromA2 = row.quantity2 !== null && row.quantity2 !== undefined
        ? parseInt(row.quantity2, 10) : null;
      const stockDisponible = (stockFromCp != null && Number.isFinite(stockFromCp))
        ? stockFromCp
        : (stockFromA2 != null ? stockFromA2 : null);
      const seuilAlerte = (row.cp_seuil_alerte != null && row.cp_seuil_alerte !== '')
        ? parseInt(row.cp_seuil_alerte, 10) : 0;

      let compatibleCount = 0;
      if (row.compatible_vehicles) {
        try {
          const cv = typeof row.compatible_vehicles === 'string' ? JSON.parse(row.compatible_vehicles) : row.compatible_vehicles;
          compatibleCount = Array.isArray(cv) ? cv.length : 0;
        } catch (e) {}
      } else if (row.vehicle_model_ids && Array.isArray(row.vehicle_model_ids)) {
        compatibleCount = row.vehicle_model_ids.length;
      }

      const product = {
        id: row.adp_id != null ? parseInt(row.adp_id, 10) : null,
        slug: row.slug,
        name: row.name,
        image: image,
        reference: reference,
        price: price,
        quantity: stockDisponible !== null ? stockDisponible : 0,
        stock_disponible: stockDisponible,
        stockDisponible: stockDisponible,
        seuilAlerte: Number.isFinite(seuilAlerte) ? seuilAlerte : 0,
        category_slug: row.category_slug || null,
        categoryName: row.category_slug ? row.category_slug.split('-').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ') : null,
        rating: row.cp_rating != null ? parseInt(row.cp_rating, 10) : null,
        prix_achat_brut: row.prix_achat_brut != null ? parseFloat(row.prix_achat_brut) : null,
        remise_achat_percent: row.remise_achat_percent != null ? parseFloat(row.remise_achat_percent) : null,
        net_achat_htva: row.net_achat_htva != null ? parseFloat(row.net_achat_htva) : null,
        tva_percent: row.tva_percent != null ? parseFloat(row.tva_percent) : null,
        net_achat_ttc: row.net_achat_ttc != null ? parseFloat(row.net_achat_ttc) : null,
        marge_percent: row.marge_percent != null ? parseFloat(row.marge_percent) : null,
        prix_vente: row.cp_prix_neveux != null ? parseFloat(row.cp_prix_neveux) : null,
        created_at: row.cp_created_at || row.created_at,
        updated_at: row.cp_updated_at,
        compatible_vehicles_count: compatibleCount,
        champ1: row.champ1 || null,
        champ2: row.champ2 || null,
        champ3: row.champ3 || null,
        champ4: row.champ4 || null,
        champ5: row.champ5 || null,
        champ6: row.champ6 || null
      };
      
      // Debug: Log first product to verify champ1-6 are in DB
      if (index === 0) {
        console.log('[admin/dashboard-products] First product from DB:', {
          name: product.name,
          champ1: row.champ1,
          champ2: row.champ2,
          champ3: row.champ3,
          champ4: row.champ4,
          champ5: row.champ5,
          champ6: row.champ6
        });
      }
      
      return product;
    });

    return res.status(200).json({
      success: true,
      products: products
    });

  } catch (error) {
    console.error('[admin/dashboard-products] Error:', error);
    console.error('[admin/dashboard-products] Error details:', {
      message: error.message,
      code: error.code,
      detail: error.detail,
      hint: error.hint,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
    return res.status(500).json({
      success: false,
      error: 'Failed to load dashboard products',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * DELETE /api/admin/dashboard-products/by-slug/:slug
 * Deletes by slug. MUST be defined BEFORE /:id so "by-slug" is not captured as id.
 * Does NOT touch promotions (section_content) or offre_historique.
 */
router.delete('/dashboard-products/by-slug/:slug', async (req, res) => {
  try {
    const slug = (req.params.slug || '').trim();
    if (!slug) {
      return res.status(400).json({ success: false, error: 'Slug is required' });
    }

    const result = await pool.query(
      `DELETE FROM admin_dashboard_products WHERE slug = $1 RETURNING id, slug`,
      [slug]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ success: false, error: 'Product not found' });
    }

    const row = result.rows[0];
    return res.status(200).json({ success: true, slug: row.slug || slug });
  } catch (error) {
    console.error('[admin/dashboard-products] DELETE by-slug error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to delete product',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * DELETE /api/admin/dashboard-products/:id
 * Deletes a product from admin_dashboard_products by id.
 * Does NOT touch promotions (section_content) or offre_historique.
 */
router.delete('/dashboard-products/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (!Number.isFinite(id) || id < 1) {
      return res.status(400).json({ success: false, error: 'Invalid id' });
    }

    const result = await pool.query(
      `DELETE FROM admin_dashboard_products WHERE id = $1 RETURNING id`,
      [id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ success: false, error: 'Product not found' });
    }

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('[admin/dashboard-products] DELETE error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to delete product',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

module.exports = router;
