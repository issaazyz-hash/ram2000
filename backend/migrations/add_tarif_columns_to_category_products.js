/**
 * Migration: Add tarif columns to category_products
 * Stores pricing breakdown from Cat add-product Tarif section
 * prix_vente = prix_neveux (already exists)
 */
const pool = require('../db/pool');

async function addTarifColumnsToCategoryProducts() {
  const client = await pool.connect();
  try {
    const columns = [
      ['prix_achat_brut', 'NUMERIC(12,3)'],
      ['remise_achat_percent', 'NUMERIC(6,2)'],
      ['net_achat_htva', 'NUMERIC(12,3)'],
      ['tva_percent', 'NUMERIC(6,2)'],
      ['net_achat_ttc', 'NUMERIC(12,3)'],
      ['marge_percent', 'NUMERIC(6,2)'],
    ];
    for (const [col, type] of columns) {
      await client.query(
        `ALTER TABLE category_products ADD COLUMN IF NOT EXISTS ${col} ${type} NULL`
      );
    }
    console.log('✅ Migration add_tarif_columns: tarif columns added');
  } finally {
    client.release();
  }
}

module.exports = addTarifColumnsToCategoryProducts;
