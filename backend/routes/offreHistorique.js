/**
 * Offre historique API - promo-only storage.
 * POST /api/offre-historique  Body: { promoId }
 * GET  /api/offre-historique  Returns list from offre_historique_promos
 * MUST NOT touch admin_dashboard_products.
 */
const express = require('express');
const router = express.Router();
const pool = require('../db/pool');
const requireAdmin = require('../middlewares/requireAdmin');
const createOffreHistoriquePromosTable = require('../migrations/create_offre_historique_promos_table');
const ensureOffreHistoriquePromoColumns = require('../migrations/add_promo_id_to_offre_historique_items');
const addPromoPriceStock = require('../migrations/add_promo_price_stock_to_offre_historique');

function extractPromotionsArray(content) {
  if (!content) return [];
  const parsed = typeof content === 'string' ? (() => { try { return JSON.parse(content); } catch (e) { return null; } })() : content;
  if (!parsed) return [];
  if (Array.isArray(parsed)) return parsed;
  if (parsed.promotions && Array.isArray(parsed.promotions)) return parsed.promotions;
  if (parsed.items && Array.isArray(parsed.items)) return parsed.items;
  return [];
}

/**
 * POST /api/offre-historique
 * Body: { promoId } (required for promo flow)
 * Inserts into offre_historique_promos. Does NOT touch admin_dashboard_products.
 */
router.post('/offre-historique', async (req, res) => {
  try {
    await createOffreHistoriquePromosTable();
    await ensureOffreHistoriquePromoColumns();
    await addPromoPriceStock();

    const { promoId, slug, promoPrice, promoStock } = req.body || {};

    if (promoId == null || promoId === '') {
      return res.status(400).json({ success: false, error: 'promoId is required' });
    }

    const promoIdInt = parseInt(promoId, 10);
    if (!Number.isFinite(promoIdInt) || promoIdInt < 0) {
      return res.status(400).json({ success: false, error: 'Invalid promoId' });
    }

    // Parse promoPrice and promoStock from request
    const promoPriceNum = promoPrice != null && promoPrice !== ''
      ? parseFloat(String(promoPrice).replace(',', '.'))
      : null;
    const promoStockInt = promoStock != null && promoStock !== ''
      ? parseInt(String(promoStock), 10)
      : null;
    const safePromoStock = (promoStockInt != null && Number.isFinite(promoStockInt) && promoStockInt >= 0)
      ? promoStockInt
      : null;

    // Fetch promo from section_content to get slug, name, reference, image
    const scRow = await pool.query(
      `SELECT content FROM section_content WHERE section_type = $1 LIMIT 1`,
      ['promotions']
    );

    let resolvedSlug = typeof slug === 'string' && slug.trim().length > 0 ? slug.trim() : null;
    let name = null;
    let reference = null;
    let image = null;

    if (scRow.rows.length > 0) {
      const promotions = extractPromotionsArray(scRow.rows[0].content);
      const promo = promotions.find((p) => p && Number(p.id) === promoIdInt);
      if (promo) {
        resolvedSlug = resolvedSlug || promo.product_slug || promo.productSlug || promo.slug || null;
        name = promo.title || promo.name || null;
        reference = promo.reference || promo.ref || null;
        image = promo.image || null;
      }
    }

    if (!resolvedSlug) {
      return res.status(400).json({ success: false, error: 'slug is required (from promo or request)' });
    }

    // Delete from admin_dashboard_products by slug (keep rule - do not pollute dashboard)
    await pool.query(
      `DELETE FROM admin_dashboard_products WHERE slug = $1`,
      [resolvedSlug]
    );

    // Insert into offre_historique_promos ONLY - never insert into admin_dashboard_products
    const insert = await pool.query(
      `
      INSERT INTO offre_historique_promos (promo_id, slug, name, reference, image, promo_price, promo_stock)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      ON CONFLICT (promo_id) DO UPDATE SET
        slug = EXCLUDED.slug,
        name = EXCLUDED.name,
        reference = EXCLUDED.reference,
        image = EXCLUDED.image,
        promo_price = EXCLUDED.promo_price,
        promo_stock = EXCLUDED.promo_stock
      RETURNING *
      `,
      [promoIdInt, resolvedSlug, name, reference, image, promoPriceNum, safePromoStock]
    );

    return res.status(200).json({
      success: true,
      added: insert.rows.length > 0,
    });
  } catch (error) {
    console.error('[offre-historique] POST error:', error);
    return res.status(500).json({ success: false, error: 'Failed to add to offre historique' });
  }
});

/**
 * GET /api/offre-historique
 * Returns list from offre_historique_promos ordered by created_at desc.
 */
router.get('/offre-historique', async (req, res) => {
  try {
    await createOffreHistoriquePromosTable();
    await ensureOffreHistoriquePromoColumns();
    await addPromoPriceStock();

    const result = await pool.query(`
      SELECT id, promo_id, slug, name, reference, image, promo_price, promo_stock, created_at
      FROM offre_historique_promos
      ORDER BY created_at DESC
    `);

    const items = (result.rows || []).map((row) => {
      const priceVal = row.promo_price != null && Number.isFinite(Number(row.promo_price))
        ? Number(row.promo_price)
        : null;
      const quantiteVal = row.promo_stock != null && Number.isFinite(Number(row.promo_stock))
        ? Number(row.promo_stock)
        : null;

      return {
        id: row.id,
        promo_id: row.promo_id,
        slug: row.slug || '',
        name: row.name || '',
        reference: row.reference ?? null,
        image: row.image ?? null,
        price: priceVal,
        quantite: quantiteVal,
        quantity: quantiteVal,
        created_at: row.created_at,
        createdAt: row.created_at,
      };
    });

    return res.status(200).json({ success: true, items });
  } catch (error) {
    console.error('[offre-historique] GET error:', error);
    return res.status(500).json({ success: false, error: 'Failed to load offre historique' });
  }
});

/**
 * DELETE /api/offre-historique/by-promo/:promoId
 * Removes the offre-historique entry when a promotion is deleted.
 * Idempotent: no error if row not found.
 * MUST NOT touch admin_dashboard_products.
 */
router.delete('/offre-historique/by-promo/:promoId', async (req, res) => {
  try {
    const promoId = parseInt(req.params.promoId, 10);
    if (!Number.isFinite(promoId) || promoId < 0) {
      return res.status(400).json({ success: false, error: 'Invalid promoId' });
    }

    await pool.query(
      `DELETE FROM offre_historique_promos WHERE promo_id = $1`,
      [promoId]
    );

    return res.status(200).json({ success: true, ok: true });
  } catch (error) {
    console.error('[offre-historique] DELETE by-promo error:', error);
    return res.status(500).json({ success: false, error: 'Failed to delete from offre historique' });
  }
});

/**
 * DELETE /api/offre-historique/by-slug/:slug
 * Removes by slug (fallback when promoId not available).
 * Idempotent.
 */
router.delete('/offre-historique/by-slug/:slug', async (req, res) => {
  try {
    const slug = (req.params.slug || '').trim();
    if (!slug) {
      return res.status(400).json({ success: false, error: 'Slug is required' });
    }

    await pool.query(
      `DELETE FROM offre_historique_promos WHERE slug = $1`,
      [slug]
    );

    return res.status(200).json({ success: true, ok: true });
  } catch (error) {
    console.error('[offre-historique] DELETE by-slug error:', error);
    return res.status(500).json({ success: false, error: 'Failed to delete from offre historique' });
  }
});

/**
 * DELETE /api/offre-historique/cleanup-orphans
 * Admin-only. Removes orphan rows (promo no longer exists in section_content).
 * Returns { deletedCount, deletedRowsPreview }.
 * Does NOT touch admin_dashboard_products or product tables.
 */
router.delete('/offre-historique/cleanup-orphans', requireAdmin, async (req, res) => {
  try {
    await createOffreHistoriquePromosTable();
    await ensureOffreHistoriquePromoColumns();
    await addPromoPriceStock();

    // 1) Preview: get IDs of orphan rows
    const previewResult = await pool.query(`
      SELECT o.id, o.promo_id, o.slug, o.name, o.created_at
      FROM offre_historique_promos o
      WHERE (
        (o.promo_id IS NOT NULL AND o.promo_id NOT IN (
          SELECT (elem->>'id')::int
          FROM section_content sc,
               LATERAL jsonb_array_elements(
                 CASE
                   WHEN jsonb_typeof(sc.content) = 'array' THEN sc.content
                   WHEN jsonb_typeof(sc.content) = 'object' AND sc.content ? 'promotions' THEN sc.content->'promotions'
                   WHEN jsonb_typeof(sc.content) = 'object' AND sc.content ? 'items' THEN sc.content->'items'
                   ELSE '[]'::jsonb
                 END
               ) AS elem
          WHERE sc.section_type = 'promotions'
          AND elem->>'id' IS NOT NULL
          AND (elem->>'id') ~ '^\\d+$'
        ))
        OR
        (o.promo_id IS NULL AND o.slug IS NOT NULL AND o.slug != '' AND NOT EXISTS (
          SELECT 1
          FROM section_content sc,
               LATERAL jsonb_array_elements(
                 CASE
                   WHEN jsonb_typeof(sc.content) = 'array' THEN sc.content
                   WHEN jsonb_typeof(sc.content) = 'object' AND sc.content ? 'promotions' THEN sc.content->'promotions'
                   WHEN jsonb_typeof(sc.content) = 'object' AND sc.content ? 'items' THEN sc.content->'items'
                   ELSE '[]'::jsonb
                 END
               ) AS elem
          WHERE sc.section_type = 'promotions'
          AND LOWER(COALESCE(elem->>'productSlug', elem->>'product_slug', elem->>'slug', '')) = LOWER(o.slug)
        ))
      )
    `);
    const toDelete = previewResult.rows || [];
    const deletedRowsPreview = toDelete.map((r) => ({
      id: r.id,
      promo_id: r.promo_id,
      slug: r.slug,
      name: r.name,
      created_at: r.created_at,
    }));

    if (toDelete.length === 0) {
      return res.status(200).json({
        success: true,
        deletedCount: 0,
        deletedRowsPreview: [],
        message: 'No orphan rows found',
      });
    }

    const ids = toDelete.map((r) => r.id).filter((id) => id != null);

    // 2) Delete by id (safe, transactional)
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      if (ids.length > 0) {
        await client.query(
          `DELETE FROM offre_historique_promos WHERE id = ANY($1::int[])`,
          [ids]
        );
      }
      await client.query('COMMIT');
    } catch (txErr) {
      await client.query('ROLLBACK').catch(() => {});
      throw txErr;
    } finally {
      client.release();
    }

    return res.status(200).json({
      success: true,
      deletedCount: ids.length,
      deletedRowsPreview,
      message: `Removed ${ids.length} orphan entr${ids.length === 1 ? 'y' : 'ies'}`,
    });
  } catch (error) {
    console.error('[offre-historique] cleanup-orphans error:', error);
    return res.status(500).json({ success: false, error: 'Failed to cleanup orphans' });
  }
});

/**
 * DELETE /api/offre-historique/:id
 * Admin-only. Deletes a single row by primary key id.
 * Idempotent.
 */
router.delete('/offre-historique/:id', requireAdmin, async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (!Number.isFinite(id) || id < 1) {
      return res.status(400).json({ success: false, error: 'Invalid id' });
    }

    const result = await pool.query(
      `DELETE FROM offre_historique_promos WHERE id = $1 RETURNING id`,
      [id]
    );

    return res.status(200).json({
      success: true,
      ok: true,
      deleted: result.rowCount > 0,
    });
  } catch (error) {
    console.error('[offre-historique] DELETE by id error:', error);
    return res.status(500).json({ success: false, error: 'Failed to delete from offre historique' });
  }
});

module.exports = router;
