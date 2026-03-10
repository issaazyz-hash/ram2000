/**
 * Migration: Add promo_id, origin, status, promo_slug to orders table
 * For promo-origin order management (Accept/Refuser)
 */
const pool = require('../db/pool');

async function addPromoFieldsToOrders() {
  const client = await pool.connect();
  try {
    await client.query(`
      ALTER TABLE orders ADD COLUMN IF NOT EXISTS promo_id INTEGER NULL
    `);
    await client.query(`
      ALTER TABLE orders ADD COLUMN IF NOT EXISTS origin VARCHAR(50) DEFAULT 'normal'
    `);
    await client.query(`
      ALTER TABLE orders ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'pending'
    `);
    await client.query(`
      ALTER TABLE orders ADD COLUMN IF NOT EXISTS promo_slug TEXT NULL
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_orders_origin ON orders(origin)
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status)
    `);
  } finally {
    client.release();
  }
}

module.exports = addPromoFieldsToOrders;
