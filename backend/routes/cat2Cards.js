/**
 * Cat2 Cards API
 * CRUD for cat2_cards table (Huile sub-cards).
 * Mounted at /api/cat2
 */

const express = require('express');
const router = express.Router();
const pool = require('../db/pool');
const requireAdmin = require('../middlewares/requireAdmin');
const asyncHandler = require('../middlewares/asyncHandler');

function slugify(name) {
  if (name == null || typeof name !== 'string') return null;
  return name
    .toString()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^\w-]+/g, '')
    .replace(/--+/g, '-')
    .replace(/^-|-$/g, '') || null;
}

function parseNum(val, fallback) {
  if (val === undefined || val === null || val === '') return fallback;
  const n = Number(val);
  return Number.isFinite(n) ? n : fallback;
}

function rowToApi(row) {
  if (!row) return null;
  return {
    id: row.id,
    parentId: row.parent_id,
    name: row.name,
    slug: row.slug ?? null,
    reference: row.reference ?? null,
    rating: row.rating != null ? row.rating : null,
    stockDisponible: row.stock_disponible != null ? parseInt(row.stock_disponible, 10) : 0,
    seuilAlerte: row.seuil_alerte != null ? parseInt(row.seuil_alerte, 10) : 0,
    image: row.image ?? null,
    prixAchatBrut: row.prix_achat_brut != null ? parseFloat(row.prix_achat_brut) : null,
    remiseAchat: row.remise_achat_percent != null ? parseFloat(row.remise_achat_percent) : null,
    netAchatHTVA: row.net_achat_htva != null ? parseFloat(row.net_achat_htva) : null,
    tva: row.tva_percent != null ? parseFloat(row.tva_percent) : null,
    netAchatTTC: row.net_achat_ttc != null ? parseFloat(row.net_achat_ttc) : null,
    marge: row.marge_percent != null ? parseFloat(row.marge_percent) : null,
    prixNeveux: row.prix_neveux != null ? parseFloat(row.prix_neveux) : null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/**
 * GET /api/cat2/cards?parentId=...
 * List cards by parent_id
 */
router.get('/cards', asyncHandler(async (req, res) => {
  const parentId = parseNum(req.query.parentId, null);
  if (parentId == null || parentId < 0) {
    return res.status(400).json({ success: false, error: 'Valid parentId is required' });
  }
  const result = await pool.query(
    'SELECT * FROM cat2_cards WHERE parent_id = $1 ORDER BY id ASC',
    [parentId]
  );
  const data = (result.rows || []).map(rowToApi);
  return res.json({ success: true, data });
}));

/**
 * GET /api/cat2/cards/:id
 * Get one card by id
 */
router.get('/cards/:id', asyncHandler(async (req, res) => {
  const id = parseNum(req.params.id, null);
  if (id == null || id <= 0) {
    return res.status(400).json({ success: false, error: 'Valid id is required' });
  }
  const result = await pool.query('SELECT * FROM cat2_cards WHERE id = $1', [id]);
  const row = result.rows && result.rows[0];
  if (!row) {
    return res.status(404).json({ success: false, error: 'Card not found' });
  }
  return res.json({ success: true, data: rowToApi(row) });
}));

/**
 * POST /api/cat2/cards (admin)
 * Create a new card
 */
router.post('/cards', requireAdmin, asyncHandler(async (req, res) => {
  const parentId = parseNum(req.body.parentId, null);
  const name = req.body.name != null && String(req.body.name).trim() ? String(req.body.name).trim() : null;
  if (parentId == null || parentId < 0) {
    return res.status(400).json({ success: false, error: 'Valid parentId is required' });
  }
  if (!name) {
    return res.status(400).json({ success: false, error: 'Name is required' });
  }
  const slug = slugify(name);
  const reference = req.body.reference != null ? String(req.body.reference).trim() || null : null;
  const rating = req.body.rating != null ? Math.min(5, Math.max(0, parseInt(req.body.rating, 10) || 0)) : null;
  const stockDisponible = Math.max(0, parseInt(req.body.stockDisponible, 10) || 0);
  const seuilAlerte = Math.max(0, parseInt(req.body.seuilAlerte, 10) || 0);
  const image = req.body.image != null ? String(req.body.image).trim() || null : null;
  const prixAchatBrut = req.body.prixAchatBrut != null ? parseFloat(req.body.prixAchatBrut) : null;
  const remiseAchat = req.body.remiseAchat != null ? parseFloat(req.body.remiseAchat) : null;
  const netAchatHTVA = req.body.netAchatHTVA != null ? parseFloat(req.body.netAchatHTVA) : null;
  const tva = req.body.tva != null ? parseFloat(req.body.tva) : 19;
  const netAchatTTC = req.body.netAchatTTC != null ? parseFloat(req.body.netAchatTTC) : null;
  const marge = req.body.marge != null ? parseFloat(req.body.marge) : null;
  const prixNeveux = req.body.prixNeveux != null ? parseFloat(req.body.prixNeveux) : null;

  const result = await pool.query(
    `INSERT INTO cat2_cards (
      parent_id, name, slug, reference, rating, stock_disponible, seuil_alerte, image,
      prix_achat_brut, remise_achat_percent, net_achat_htva, tva_percent, net_achat_ttc, marge_percent, prix_neveux
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
    RETURNING *`,
    [
      parentId, name, slug, reference, rating, stockDisponible, seuilAlerte, image,
      prixAchatBrut, remiseAchat, netAchatHTVA, tva, netAchatTTC, marge, prixNeveux
    ]
  );
  const row = result.rows && result.rows[0];
  if (!row) {
    return res.status(500).json({ success: false, error: 'Insert failed' });
  }
  return res.status(201).json({ success: true, data: rowToApi(row) });
}));

/**
 * PUT /api/cat2/cards/:id (admin)
 * Update a card (partial)
 */
router.put('/cards/:id', requireAdmin, asyncHandler(async (req, res) => {
  const id = parseNum(req.params.id, null);
  if (id == null || id <= 0) {
    return res.status(400).json({ success: false, error: 'Valid id is required' });
  }
  const existing = await pool.query('SELECT * FROM cat2_cards WHERE id = $1', [id]);
  if (!existing.rows || existing.rows.length === 0) {
    return res.status(404).json({ success: false, error: 'Card not found' });
  }
  const row = existing.rows[0];
  const body = req.body || {};

  const name = body.name != null && String(body.name).trim() ? String(body.name).trim() : row.name;
  const slug = body.name != null ? slugify(body.name) : row.slug;
  const reference = body.reference !== undefined ? (String(body.reference).trim() || null) : row.reference;
  const rating = body.rating !== undefined ? (body.rating != null ? Math.min(5, Math.max(0, parseInt(body.rating, 10) || 0)) : null) : row.rating;
  const stockDisponible = body.stockDisponible !== undefined ? Math.max(0, parseInt(body.stockDisponible, 10) || 0) : row.stock_disponible;
  const seuilAlerte = body.seuilAlerte !== undefined ? Math.max(0, parseInt(body.seuilAlerte, 10) || 0) : row.seuil_alerte;
  const image = body.image !== undefined ? (body.image != null ? String(body.image).trim() : null) : row.image;
  const prixAchatBrut = body.prixAchatBrut !== undefined ? (body.prixAchatBrut != null ? parseFloat(body.prixAchatBrut) : null) : row.prix_achat_brut;
  const remiseAchat = body.remiseAchat !== undefined ? (body.remiseAchat != null ? parseFloat(body.remiseAchat) : null) : row.remise_achat_percent;
  const netAchatHTVA = body.netAchatHTVA !== undefined ? (body.netAchatHTVA != null ? parseFloat(body.netAchatHTVA) : null) : row.net_achat_htva;
  const tva = body.tva !== undefined ? (body.tva != null ? parseFloat(body.tva) : 19) : row.tva_percent;
  const netAchatTTC = body.netAchatTTC !== undefined ? (body.netAchatTTC != null ? parseFloat(body.netAchatTTC) : null) : row.net_achat_ttc;
  const marge = body.marge !== undefined ? (body.marge != null ? parseFloat(body.marge) : null) : row.marge_percent;
  const prixNeveux = body.prixNeveux !== undefined ? (body.prixNeveux != null ? parseFloat(body.prixNeveux) : null) : row.prix_neveux;

  await pool.query(
    `UPDATE cat2_cards SET
      name = $1, slug = $2, reference = $3, rating = $4, stock_disponible = $5, seuil_alerte = $6, image = $7,
      prix_achat_brut = $8, remise_achat_percent = $9, net_achat_htva = $10, tva_percent = $11, net_achat_ttc = $12, marge_percent = $13, prix_neveux = $14,
      updated_at = NOW()
    WHERE id = $15`,
    [name, slug, reference, rating, stockDisponible, seuilAlerte, image, prixAchatBrut, remiseAchat, netAchatHTVA, tva, netAchatTTC, marge, prixNeveux, id]
  );
  const updated = await pool.query('SELECT * FROM cat2_cards WHERE id = $1', [id]);
  const updatedRow = updated.rows && updated.rows[0];
  return res.json({ success: true, data: rowToApi(updatedRow || row) });
}));

/**
 * DELETE /api/cat2/cards/:id (admin)
 */
router.delete('/cards/:id', requireAdmin, asyncHandler(async (req, res) => {
  const id = parseNum(req.params.id, null);
  if (id == null || id <= 0) {
    return res.status(400).json({ success: false, error: 'Valid id is required' });
  }
  const result = await pool.query('DELETE FROM cat2_cards WHERE id = $1 RETURNING id', [id]);
  if (!result.rows || result.rows.length === 0) {
    return res.status(404).json({ success: false, error: 'Card not found' });
  }
  return res.json({ success: true, data: { id } });
}));

module.exports = router;
