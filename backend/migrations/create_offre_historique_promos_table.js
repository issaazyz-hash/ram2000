/**
 * Migration: Create offre_historique_promos table
 * Promo-only storage for "Offre historique" - MUST NOT touch admin_dashboard_products
 */
const pool = require('../db/pool');

async function createOffreHistoriquePromosTable() {
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS offre_historique_promos (
        id SERIAL PRIMARY KEY,
        promo_id INTEGER NOT NULL,
        slug TEXT,
        name TEXT,
        reference TEXT,
        image TEXT,
        created_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(promo_id)
      )
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_offre_historique_promos_created_at
      ON offre_historique_promos(created_at DESC)
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_offre_historique_promos_promo_id
      ON offre_historique_promos(promo_id)
    `);
  } finally {
    client.release();
  }
}

module.exports = createOffreHistoriquePromosTable;
