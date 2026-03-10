/**
 * Migration: Create offre_historique_items table
 * Dedicated mapping table for "Offre historique" (promo-origin only)
 *
 * - Stores ONLY references to existing category_products rows
 * - Prevents polluting other admin datasets (e.g. Produits 2 / admin_dashboard_products)
 */

const pool = require('../db/pool');

async function createOffreHistoriqueItemsTable() {
  const client = await pool.connect();

  try {
    // Try with FK to category_products (preferred)
    try {
      await client.query(`
        CREATE TABLE IF NOT EXISTS offre_historique_items (
          id SERIAL PRIMARY KEY,
          product_id INTEGER NOT NULL REFERENCES category_products(id) ON DELETE CASCADE,
          created_at TIMESTAMP DEFAULT NOW(),
          UNIQUE(product_id)
        )
      `);
    } catch (fkError) {
      // Fallback: create without FK if category_products isn't available yet
      await client.query(`
        CREATE TABLE IF NOT EXISTS offre_historique_items (
          id SERIAL PRIMARY KEY,
          product_id INTEGER NOT NULL,
          created_at TIMESTAMP DEFAULT NOW(),
          UNIQUE(product_id)
        )
      `);
    }

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_offre_historique_items_created_at
      ON offre_historique_items(created_at DESC)
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_offre_historique_items_product_id
      ON offre_historique_items(product_id)
    `);

    console.log('✅ offre_historique_items table ready');
  } finally {
    client.release();
  }
}

module.exports = createOffreHistoriqueItemsTable;

