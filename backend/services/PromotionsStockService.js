/**
 * Promotions stock operations - section_content JSON
 */
const pool = require('../db/pool');

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
 * Get current promotion stock
 */
async function getPromotionStock(promoId) {
  const row = await pool.query(
    `SELECT content FROM section_content WHERE section_type = $1 LIMIT 1`,
    ['promotions']
  );
  if (row.rows.length === 0) return null;
  const promotions = extractPromotionsArray(row.rows[0].content);
  const promo = promotions.find((p) => p && Number(p.id) === promoId);
  if (!promo) return null;
  const current = promo.stock ?? promo.stock_disponible;
  return current == null ? 0 : (typeof current === 'number' ? current : parseInt(String(current), 10) || 0);
}

/**
 * Decrease promotion stock by amount. Returns new stock or throws if not enough.
 * @param {number} promoId
 * @param {number} amount - positive number to subtract
 * @returns {Promise<number>} new stock after decrease
 */
async function decreasePromotionStock(promoId, amount) {
  if (!Number.isFinite(promoId) || !Number.isFinite(amount) || amount < 0) {
    throw new Error('Invalid promoId or amount');
  }

  const row = await pool.query(
    `SELECT content FROM section_content WHERE section_type = $1 LIMIT 1`,
    ['promotions']
  );

  if (row.rows.length === 0) {
    throw new Error('Promotions section not found');
  }

  const rawContent = row.rows[0].content;
  const contentShape = getContentShape(rawContent);
  const promotions = extractPromotionsArray(rawContent);

  const idx = promotions.findIndex((p) => p && Number(p.id) === promoId);
  if (idx === -1) {
    throw new Error('Promotion not found');
  }

  const promo = promotions[idx];
  const currentStock = promo.stock ?? promo.stock_disponible;
  const num = currentStock == null ? 0 : (typeof currentStock === 'number' ? currentStock : parseInt(String(currentStock), 10) || 0);

  if (num < amount) {
    throw new Error('Not enough stock');
  }

  const newStock = Math.max(0, num - amount);
  promo.stock = newStock;
  if (promo.stock_disponible !== undefined) promo.stock_disponible = newStock;

  let contentToSave;
  if (contentShape === 'array') {
    contentToSave = promotions;
  } else {
    const parsed = typeof rawContent === 'string' ? JSON.parse(rawContent) : { ...rawContent };
    if (parsed.promotions && Array.isArray(parsed.promotions)) {
      parsed.promotions = promotions;
    } else if (parsed.items && Array.isArray(parsed.items)) {
      parsed.items = promotions;
    } else {
      parsed.promotions = promotions;
    }
    contentToSave = parsed;
  }

  await pool.query(
    `UPDATE section_content SET content = $1::jsonb, updated_at = NOW() WHERE section_type = $2`,
    [JSON.stringify(contentToSave), 'promotions']
  );

  return newStock;
}

module.exports = {
  getPromotionStock,
  decreasePromotionStock,
};
