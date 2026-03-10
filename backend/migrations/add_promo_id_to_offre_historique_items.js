/**
 * Migration: ensure offre_historique*_ tables have promo_id column (for promo linkage)
 */

const pool = require('../db/pool');

async function addPromoIdToOffreHistoriqueTables() {
  const client = await pool.connect();
  try {
    // Ensure offre_historique_promos table exists and has required columns
    await client.query(`
      CREATE TABLE IF NOT EXISTS offre_historique_promos (
        id SERIAL PRIMARY KEY,
        promo_id INTEGER,
        slug TEXT,
        name TEXT,
        reference TEXT,
        image TEXT,
        created_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(promo_id)
      )
    `);

    await client.query(`
      ALTER TABLE offre_historique_promos
      ADD COLUMN IF NOT EXISTS promo_id INTEGER
    `);

    await client.query(`
      ALTER TABLE offre_historique_promos
      ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT NOW()
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_offre_historique_promos_created_at
      ON offre_historique_promos(created_at DESC)
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_offre_historique_promos_promo_id
      ON offre_historique_promos(promo_id)
    `);

    // Some deployments may still use offre_historique_items table; add promo_id there as well for compatibility
    await client.query(`
      CREATE TABLE IF NOT EXISTS offre_historique_items (
        id SERIAL PRIMARY KEY,
        product_id INTEGER,
        created_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(product_id)
      )
    `);

    await client.query(`
      ALTER TABLE offre_historique_items
      ADD COLUMN IF NOT EXISTS promo_id INTEGER
    `);

    await client.query(`
      ALTER TABLE offre_historique_items
      ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT NOW()
    `);
  } finally {
    client.release();
  }
}

module.exports = addPromoIdToOffreHistoriqueTables;
