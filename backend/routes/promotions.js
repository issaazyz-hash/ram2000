/**
 * Promotions API - operates on section_content JSON (section_type='promotions')
 * GET /api/promotions/:promoId
 * PATCH /api/promotions/:promoId/stock
 */
const express = require('express');
const router = express.Router();
const pool = require('../db/pool');
const requireAdmin = require('../middlewares/requireAdmin');

function extractPromotionsArray(content) {
  if (!content) return [];
  const parsed = typeof content === 'string' ? (() => { try { return JSON.parse(content); } catch (e) { return null; } })() : content;
  if (!parsed) return [];
  if (Array.isArray(parsed)) return parsed;
  if (parsed.promotions && Array.isArray(parsed.promotions)) return parsed.promotions;
  if (parsed.items && Array.isArray(parsed.items)) return parsed.items;
  return [];
}

function getContentShape(content) {
  const parsed = typeof content === 'string' ? (() => { try { return JSON.parse(content); } catch (e) { return null; } })() : content;
  if (Array.isArray(parsed)) return 'array';
  if (parsed && typeof parsed === 'object') return 'object';
  return 'array';
}

/**
 * GET /api/promotions/:promoId
 * Returns a single promotion by id.
 */
router.get('/promotions/:promoId', async (req, res) => {
  try {
    const promoId = parseInt(req.params.promoId, 10);
    if (!Number.isFinite(promoId) || promoId < 0) {
      return res.status(400).json({ success: false, error: 'Invalid promoId' });
    }

    const row = await pool.query(
      `SELECT content FROM section_content WHERE section_type = $1 LIMIT 1`,
      ['promotions']
    );

    if (row.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Promotions section not found' });
    }

    const promotions = extractPromotionsArray(row.rows[0].content);
    const promo = promotions.find((p) => p && Number(p.id) === promoId);

    if (!promo) {
      return res.status(404).json({ success: false, error: 'Promotion not found' });
    }

    return res.status(200).json({ success: true, promo });
  } catch (error) {
    console.warn('[GET /api/promotions/:promoId]', error.message);
    return res.status(500).json({ success: false, error: 'Failed to fetch promotion' });
  }
});

/**
 * PATCH /api/promotions/:promoId/stock
 * Body: { stock?: number } to set absolute value, or { delta?: number } default -1
 * Updates promotion stock. Requires admin.
 */
router.patch('/promotions/:promoId/stock', requireAdmin, async (req, res) => {
  try {
    const promoId = parseInt(req.params.promoId, 10);
    if (!Number.isFinite(promoId) || promoId < 0) {
      return res.status(400).json({ success: false, error: 'Invalid promoId' });
    }

    const row = await pool.query(
      `SELECT content FROM section_content WHERE section_type = $1 LIMIT 1`,
      ['promotions']
    );

    if (row.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Promotions section not found' });
    }

    const rawContent = row.rows[0].content;
    const contentShape = getContentShape(rawContent);
    const promotions = extractPromotionsArray(rawContent);

    const idx = promotions.findIndex((p) => p && Number(p.id) === promoId);
    if (idx === -1) {
      return res.status(404).json({ success: false, error: 'Promotion not found' });
    }

    const promo = promotions[idx];
    const currentStock = promo.stock ?? promo.stock_disponible;
    const num = currentStock == null ? 0 : (typeof currentStock === 'number' ? currentStock : parseInt(String(currentStock), 10) || 0);

    let newStock;
    const stockParam = req.body?.stock;
    if (stockParam !== undefined && stockParam !== null && (typeof stockParam === 'number' || (typeof stockParam === 'string' && String(stockParam).trim() !== ''))) {
      newStock = Math.max(0, Math.floor(Number(stockParam)));
    } else {
      const delta = typeof req.body?.delta === 'number' ? req.body.delta : -1;
      newStock = Math.max(0, num + delta);
    }

    console.log('[PATCH /api/promotions/:promoId/stock] id=%s before=%s after=%s', promoId, num, newStock);

    // Build updated array without mutating pg result (deep clone for the updated item)
    const updatedPromotions = promotions.map((p, i) => {
      if (i !== idx) return p;
      return { ...p, stock: newStock, stock_disponible: newStock };
    });

    let contentToSave;
    if (contentShape === 'array') {
      contentToSave = updatedPromotions;
    } else {
      const parsed = typeof rawContent === 'string' ? JSON.parse(rawContent) : { ...rawContent };
      if (parsed.promotions && Array.isArray(parsed.promotions)) {
        parsed.promotions = updatedPromotions;
      } else if (parsed.items && Array.isArray(parsed.items)) {
        parsed.items = updatedPromotions;
      } else {
        parsed.promotions = updatedPromotions;
      }
      contentToSave = parsed;
    }

    await pool.query(
      `UPDATE section_content SET content = $1::jsonb, updated_at = NOW() WHERE section_type = $2`,
      [JSON.stringify(contentToSave), 'promotions']
    );

    // Keep offre_historique_promos in sync so GET /api/offre-historique shows correct stock
    await pool.query(
      `UPDATE offre_historique_promos SET promo_stock = $1 WHERE promo_id = $2`,
      [newStock, promoId]
    ).catch((err) => { console.warn('[PATCH promotions/stock] offre_historique_promos update (optional):', err.message); });

    const updatedAt = new Date().toISOString();
    console.log('[PATCH /api/promotions/:promoId/stock] persisted id=%s stock=%s', promoId, newStock);

    return res.status(200).json({
      success: true,
      id: promoId,
      stock: newStock,
      updatedAt,
      promo: { ...promo, stock: newStock, stock_disponible: newStock },
    });
  } catch (error) {
    console.warn('[PATCH /api/promotions/:promoId/stock]', error.message);
    return res.status(500).json({ success: false, error: 'Failed to update promotion stock' });
  }
});

module.exports = router;
