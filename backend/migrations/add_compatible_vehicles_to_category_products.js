/**
 * Migration: Add compatible_vehicles to category_products
 * Stores [{ brand, model }] for acha2 Marque/Modèle filtering
 * NULL or [] means product is global (show all brands/models)
 */
const pool = require('../db/pool');

async function addCompatibleVehiclesToCategoryProducts() {
  const client = await pool.connect();
  try {
    await client.query(`
      ALTER TABLE category_products 
      ADD COLUMN IF NOT EXISTS compatible_vehicles JSONB NULL DEFAULT '[]'::jsonb
    `);
    console.log('✅ Migration add_compatible_vehicles: compatible_vehicles column added');
  } finally {
    client.release();
  }
}

module.exports = addCompatibleVehiclesToCategoryProducts;
