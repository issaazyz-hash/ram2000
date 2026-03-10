/**
 * Migration Runner: Create vehicle_model_familles table and populate initial data
 * 
 * Run this script to create the pivot table and populate it with all-to-all associations
 * This ensures backward compatibility - all models see all familles until admin customizes
 * 
 * Usage: node db/migrations/run_vehicle_model_familles_migration.js
 */

const pool = require('../pool');
const fs = require('fs');
const path = require('path');

async function runMigration() {
  const client = await pool.connect();
  
  try {
    console.log('🔄 Starting vehicle_model_familles migration...');
    
    await client.query('BEGIN');
    
    // Read and execute migration SQL
    const migrationSQL = fs.readFileSync(
      path.join(__dirname, 'create_vehicle_model_familles.sql'),
      'utf8'
    );
    
    await client.query(migrationSQL);
    
    await client.query('COMMIT');
    
    console.log('✅ Migration completed successfully!');
    
    // Verify data
    const countResult = await client.query('SELECT COUNT(*) as count FROM vehicle_model_familles');
    console.log(`📊 Total associations created: ${countResult.rows[0].count}`);
    
    const modelCountResult = await client.query('SELECT COUNT(DISTINCT model_id) as count FROM vehicle_model_familles');
    console.log(`📊 Models with associations: ${modelCountResult.rows[0].count}`);
    
    const familleCountResult = await client.query('SELECT COUNT(DISTINCT famille_id) as count FROM vehicle_model_familles');
    console.log(`📊 Unique familles: ${familleCountResult.rows[0].count}`);
    
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

