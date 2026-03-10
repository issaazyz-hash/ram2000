/**
 * Migration: Create admin_dashboard_products table
 * Stores Acha2 products added to admin dashboard
 * slug is the unique identifier
 */

const pool = require('../db/pool');

async function createAdminDashboardProductsTable() {
  const client = await pool.connect();
  
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS admin_dashboard_products (
        id SERIAL PRIMARY KEY,
        slug TEXT UNIQUE NOT NULL,
        source TEXT DEFAULT NULL,
        promo_ref TEXT DEFAULT NULL,
        promo_name TEXT DEFAULT NULL,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // Create index on slug for faster lookups
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_admin_dashboard_products_slug 
      ON admin_dashboard_products(slug)
    `);

    // Create index on created_at for ordering
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_admin_dashboard_products_created_at 
      ON admin_dashboard_products(created_at DESC)
    `);

    // Ensure columns exist on older installs
    await client.query(`ALTER TABLE admin_dashboard_products ADD COLUMN IF NOT EXISTS source TEXT DEFAULT NULL`);
    await client.query(`ALTER TABLE admin_dashboard_products ADD COLUMN IF NOT EXISTS promo_ref TEXT DEFAULT NULL`);
    await client.query(`ALTER TABLE admin_dashboard_products ADD COLUMN IF NOT EXISTS promo_name TEXT DEFAULT NULL`);

    // Optional index for filtered listing
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_admin_dashboard_products_source
      ON admin_dashboard_products(source)
    `);

    const existingColumns = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'admin_dashboard_products'
    `);
    const columnNames = existingColumns.rows.map(r => r.column_name);

    if (columnNames.includes('name') || columnNames.includes('image') || 
        columnNames.includes('reference') || columnNames.includes('price') || 
        columnNames.includes('quantity')) {
      await client.query(`
        ALTER TABLE admin_dashboard_products
        DROP COLUMN IF EXISTS name,
        DROP COLUMN IF EXISTS image,
        DROP COLUMN IF EXISTS reference,
        DROP COLUMN IF EXISTS price,
        DROP COLUMN IF EXISTS quantity
      `);
    }

    console.log('✅ admin_dashboard_products table ready');
  } catch (error) {
    console.error('❌ Error creating admin_dashboard_products table:', error.message);
    throw error;
  } finally {
    client.release();
  }
}

module.exports = createAdminDashboardProductsTable;

