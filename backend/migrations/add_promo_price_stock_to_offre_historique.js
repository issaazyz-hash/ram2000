/**
 * Migration: Add promo_price and promo_stock to offre_historique tables.
 * Stores snapshot at insert time - avoids JSON joins from section_content.
 * Applied to offre_historique_promos (API table) and offre_historique_items.
 */
const pool = require('../db/pool');

async function addPromoPriceStockToOffreHistorique() {
  const client = await pool.connect();
  try {
    // offre_historique_promos - the table used by GET/POST /api/offre-historique
    await client.query(`ALTER TABLE offre_historique_promos ADD COLUMN IF NOT EXISTS promo_price NUMERIC(12,3)`);
    await client.query(`ALTER TABLE offre_historique_promos ADD COLUMN IF NOT EXISTS promo_stock INTEGER DEFAULT 0`);
    await client.query(`
      ALTER TABLE offre_historique_promos
      DROP CONSTRAINT IF EXISTS offre_historique_promos_promo_stock_nonneg
    `);
    await client.query(`
      ALTER TABLE offre_historique_promos
      ADD CONSTRAINT offre_historique_promos_promo_stock_nonneg
      CHECK (promo_stock IS NULL OR promo_stock >= 0)
    `);

    // offre_historique_items - per user spec (table may not exist in some setups)
    try {
      await client.query(`ALTER TABLE offre_historique_items ADD COLUMN IF NOT EXISTS promo_id INTEGER`);
      await client.query(`ALTER TABLE offre_historique_items ADD COLUMN IF NOT EXISTS promo_price NUMERIC(12,3)`);
      await client.query(`ALTER TABLE offre_historique_items ADD COLUMN IF NOT EXISTS promo_stock INTEGER DEFAULT 0`);
      await client.query(`ALTER TABLE offre_historique_items DROP CONSTRAINT IF EXISTS offre_historique_items_promo_stock_nonneg`);
      await client.query(`
        ALTER TABLE offre_historique_items
        ADD CONSTRAINT offre_historique_items_promo_stock_nonneg
        CHECK (promo_stock IS NULL OR promo_stock >= 0)
      `);
    } catch (err) {
      if (err.code !== '42P01') throw err; // 42P01 = undefined_table
    }

    console.log('✅ offre_historique promo_price/promo_stock columns added');
  } catch (error) {
    console.error('❌ add_promo_price_stock migration error:', error.message);
    throw error;
  } finally {
    client.release();
  }
}

module.exports = addPromoPriceStockToOffreHistorique;
