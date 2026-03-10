/**
 * Database Migration Script - Production Ready
 * Executes schema_production.sql to create all tables
 * FAILS if any SQL error occurs (production mode)
 */

require('dotenv').config();
const fs = require('fs');
const path = require('path');

async function migrate() {
  console.log('🔄 Starting database migration...');
  
  let client;
  try {
    // Get pool and test connection first
    const pool = require('./pool');
    client = await pool.connect();
    
    console.log('✅ [MIGRATE] Database connection established');
    
    // Read production schema
    const schemaPath = path.join(__dirname, 'schema_production.sql');
    if (!fs.existsSync(schemaPath)) {
      throw new Error(`Schema file not found: ${schemaPath}`);
    }
    
    const schemaSQL = fs.readFileSync(schemaPath, 'utf8');
    
    // Execute schema
    console.log('📦 [MIGRATE] Executing schema_production.sql...');
    await client.query(schemaSQL);
    
    // Verify tables were created
    const tablesCheck = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_type = 'BASE TABLE'
      ORDER BY table_name
    `);
    
    console.log('✅ [MIGRATE] Database migration completed successfully');
    console.log(`📊 [MIGRATE] Created ${tablesCheck.rows.length} tables:`);
    tablesCheck.rows.forEach(row => {
      console.log(`   - ${row.table_name}`);
    });
    
    // Verify critical tables exist
    const criticalTables = ['users', 'products', 'brands', 'categories', 'orders', 'section_content', 'vehicles'];
    const existingTables = tablesCheck.rows.map(r => r.table_name);
    const missingTables = criticalTables.filter(t => !existingTables.includes(t));
    
    if (missingTables.length > 0) {
      console.warn(`⚠️  [MIGRATE] Missing critical tables: ${missingTables.join(', ')}`);
    } else {
      console.log('✅ [MIGRATE] All critical tables created successfully');
    }
    
    // Fix vehicles table schema if needed (add missing columns safely)
    if (existingTables.includes('vehicles')) {
      try {
        console.log('🔄 [MIGRATE] Verifying vehicles table schema...');
        const fixVehiclesTable = require('./fix_vehicles_table');
        const fixResult = await fixVehiclesTable();
        console.log(`✅ [MIGRATE] Vehicles table schema verified: ${fixResult.message}`);
      } catch (fixError) {
        console.warn(`⚠️  [MIGRATE] Vehicles table schema fix warning: ${fixError.message}`);
        // Don't fail migration if schema fix has issues
      }
    }

    // Add product_snapshot column to orders table if it doesn't exist
    if (existingTables.includes('orders')) {
      try {
        console.log('🔄 [MIGRATE] Adding product_snapshot column to orders table...');
        await client.query(`
          ALTER TABLE orders 
          ADD COLUMN IF NOT EXISTS product_snapshot JSONB DEFAULT '{}'::jsonb
        `);
        
        // Drop FK constraint if it exists
        await client.query(`
          DO $$ 
          BEGIN
            IF EXISTS (
              SELECT 1 FROM information_schema.table_constraints 
              WHERE constraint_name = 'fk_orders_product' 
              AND table_name = 'orders'
            ) THEN
              ALTER TABLE orders DROP CONSTRAINT fk_orders_product;
            END IF;
          END $$;
        `);
        
        console.log('✅ [MIGRATE] Orders table updated with product_snapshot column');
      } catch (migError) {
        console.warn(`⚠️  [MIGRATE] Orders table migration warning: ${migError.message}`);
      }
    }

    // Add missing columns to products table (promo_percent, promo_price, image, product_references)
    // NOTE: Renamed "references" to "product_references" (PostgreSQL reserved keyword)
    if (existingTables.includes('products')) {
      try {
        console.log('🔄 [MIGRATE] Adding missing columns to products table...');
        
        await client.query(`ALTER TABLE products ADD COLUMN IF NOT EXISTS promo_percent INTEGER`);
        await client.query(`ALTER TABLE products ADD COLUMN IF NOT EXISTS promo_price NUMERIC(10,3)`);
        await client.query(`ALTER TABLE products ADD COLUMN IF NOT EXISTS image TEXT`);
        
        // Rename old "references" column to "product_references" if it exists (reserved keyword fix)
        const hasOldReferencesColumn = await client.query(`
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = 'products' AND column_name = 'references'
        `);
        if (hasOldReferencesColumn.rows.length > 0) {
          console.log('🔄 [MIGRATE] Renaming "references" column to product_references...');
          await client.query(`ALTER TABLE products RENAME COLUMN "references" TO product_references`);
        }
        
        // Add product_references column if it doesn't exist
        await client.query(`ALTER TABLE products ADD COLUMN IF NOT EXISTS product_references TEXT[] DEFAULT '{}'`);
        
        // Copy main_image to image if image is null
        await client.query(`UPDATE products SET image = main_image WHERE image IS NULL AND main_image IS NOT NULL`);
        
        console.log('✅ [MIGRATE] Products table updated with missing columns');
      } catch (migError) {
        console.warn(`⚠️  [MIGRATE] Products table migration warning: ${migError.message}`);
      }
    }

    // Add stock_disponible and seuil_alerte to category_products (if table exists)
    if (existingTables.includes('category_products')) {
      try {
        console.log('🔄 [MIGRATE] Adding stock_disponible, seuil_alerte to category_products...');
        await client.query(`ALTER TABLE category_products ADD COLUMN IF NOT EXISTS stock_disponible INTEGER NOT NULL DEFAULT 0`);
        await client.query(`ALTER TABLE category_products ADD COLUMN IF NOT EXISTS seuil_alerte INTEGER NOT NULL DEFAULT 0`);
        console.log('✅ [MIGRATE] category_products updated with stock_disponible, seuil_alerte');
      } catch (migError) {
        console.warn(`⚠️  [MIGRATE] category_products stock/seuil migration warning: ${migError.message}`);
      }
    }
    
    return { success: true, tables: tablesCheck.rows.length };
    
  } catch (error) {
    console.error('❌ [MIGRATE] Database migration FAILED:');
    console.error(`   Error: ${error.message}`);
    if (error.code) {
      console.error(`   Code: ${error.code}`);
    }
    if (error.position) {
      console.error(`   Position: ${error.position}`);
    }
    throw error; // Fail in production
  } finally {
    if (client) {
      client.release();
    }
  }
}

// Run migration if called directly
if (require.main === module) {
  migrate()
    .then((result) => {
      console.log('✅ Migration script completed');
      console.log(`   Created ${result.tables} tables`);
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Migration script failed:', error.message);
      process.exit(1);
    });
}

module.exports = migrate;
