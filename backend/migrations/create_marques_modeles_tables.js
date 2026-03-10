/**
 * Migration: Create marques, modeles, and mapping tables
 * Ensures tables exist for marque/modèle management
 */

const pool = require('../db/pool');

async function createMarquesModelesTables() {
  const client = await pool.connect();
  
  try {
    // Create marques table
    await client.query(`
      CREATE TABLE IF NOT EXISTS marques (
        id SERIAL PRIMARY KEY,
        name TEXT UNIQUE NOT NULL,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // Create index on marques.name for faster lookups
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_marques_name ON marques(name)
    `);

    // Create modeles table
    await client.query(`
      CREATE TABLE IF NOT EXISTS modeles (
        id SERIAL PRIMARY KEY,
        marque_id INT NOT NULL REFERENCES marques(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(marque_id, name)
      )
    `);

    // Create indexes on modeles
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_modeles_marque_id ON modeles(marque_id)
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_modeles_name ON modeles(name)
    `);

    // Create product_marques mapping table
    await client.query(`
      CREATE TABLE IF NOT EXISTS product_marques (
        id SERIAL PRIMARY KEY,
        product_slug TEXT NOT NULL,
        marque_id INT NOT NULL REFERENCES marques(id) ON DELETE CASCADE,
        UNIQUE(product_slug, marque_id)
      )
    `);

    // Create indexes on product_marques
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_product_marques_slug ON product_marques(product_slug)
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_product_marques_marque_id ON product_marques(marque_id)
    `);

    // Create product_modeles mapping table
    await client.query(`
      CREATE TABLE IF NOT EXISTS product_modeles (
        id SERIAL PRIMARY KEY,
        product_slug TEXT NOT NULL,
        modele_id INT NOT NULL REFERENCES modeles(id) ON DELETE CASCADE,
        UNIQUE(product_slug, modele_id)
      )
    `);

    // Create indexes on product_modeles
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_product_modeles_slug ON product_modeles(product_slug)
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_product_modeles_modele_id ON product_modeles(modele_id)
    `);

  } catch (error) {
    console.error('[create_marques_modeles_tables] Error:', error);
    throw error;
  } finally {
    client.release();
  }
}

module.exports = createMarquesModelesTables;

