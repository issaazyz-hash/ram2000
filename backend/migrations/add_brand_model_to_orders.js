/**
 * Migration: Add brand_name and model_name to orders table
 * Stores Marque and Modèle as snapshot fields for display in Admin Commandes table
 */
const pool = require('../db/pool');

async function addBrandModelToOrders() {
  const client = await pool.connect();
  try {
    await client.query(`
      ALTER TABLE orders ADD COLUMN IF NOT EXISTS brand_name VARCHAR(255) NULL
    `);
    await client.query(`
      ALTER TABLE orders ADD COLUMN IF NOT EXISTS model_name VARCHAR(255) NULL
    `);
    console.log('✅ Migration add_brand_model_to_orders: brand_name, model_name columns added');
  } finally {
    client.release();
  }
}

module.exports = addBrandModelToOrders;
