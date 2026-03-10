/**
 * Migration Runner: Create category_product_vehicle_models table
 * 
 * Run this script to create the pivot table for linking category products to vehicle models
 * 
 * Usage: node db/migrations/run_category_product_vehicle_models_migration.js
 */

const pool = require('../pool');
const fs = require('fs');
const path = require('path');

async function runMigration() {
  const client = await pool.connect();
  
  try {
    console.log('🔄 Starting category_product_vehicle_models migration...');
    
    await client.query('BEGIN');
    
    // Read and execute migration SQL
    const migrationSQL = fs.readFileSync(
      path.join(__dirname, 'create_category_product_vehicle_models.sql'),
      'utf8'
    );
    
    await client.query(migrationSQL);
    
    await client.query('COMMIT');
    
    console.log('✅ Migration completed successfully!');
    
    // Verify table exists
    const tableCheck = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'category_product_vehicle_models'
      )
    `);
    
    if (tableCheck.rows[0].exists) {
      console.log('✅ Table category_product_vehicle_models created');
      
      // Check indexes
      const indexCheck = await client.query(`
        SELECT indexname 
        FROM pg_indexes 
        WHERE tablename = 'category_product_vehicle_models'
      `);
      console.log(`✅ Created ${indexCheck.rows.length} indexes`);
    } else {
      console.warn('⚠️  Table may not have been created');
    }
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    client.release();
  }
}

// Run migration if called directly
if (require.main === module) {
  runMigration()
    .then(() => {
      console.log('✅ Migration script completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Migration script failed:', error);
      process.exit(1);
    });
}

module.exports = runMigration;

