/**
 * Cleanup Vehicle Models
 * Removes suspicious/invalid rows from vehicle_models table
 * Safe to run multiple times
 * 
 * Usage: node db/seeds/cleanup_vehicle_models.js
 */

const pool = require('../pool');

async function cleanupVehicleModels() {
  const client = await pool.connect();
  
  try {
    console.log('🧹 Starting vehicle models cleanup...');
    
    await client.query('BEGIN');
    
    // Find suspicious rows before deletion
    const suspiciousRows = await client.query(`
      SELECT id, marque, model, created_at
      FROM vehicle_models
      WHERE 
        marque IS NULL 
        OR model IS NULL
        OR TRIM(marque) = ''
        OR TRIM(model) = ''
        OR LOWER(TRIM(model)) = 'object'
        OR LOWER(TRIM(model)) = '[object object]'
        OR LENGTH(TRIM(model)) <= 2
        OR LENGTH(TRIM(marque)) <= 2
        OR LOWER(TRIM(marque)) = 'object'
        OR LOWER(TRIM(marque)) = '[object object]'
      ORDER BY id
    `);
    
    console.log(`\n📋 Found ${suspiciousRows.rows.length} suspicious rows:`);
    if (suspiciousRows.rows.length > 0) {
      suspiciousRows.rows.forEach((row, index) => {
        console.log(`   ${index + 1}. ID: ${row.id}, marque: "${row.marque}", model: "${row.model}"`);
      });
    }
    
    // Get count before deletion
    const countBefore = await client.query('SELECT COUNT(*) as count FROM vehicle_models');
    const beforeCount = parseInt(countBefore.rows[0].count);
    
    // Delete suspicious rows
    const deleteResult = await client.query(`
      DELETE FROM vehicle_models
      WHERE 
        marque IS NULL 
        OR model IS NULL
        OR TRIM(marque) = ''
        OR TRIM(model) = ''
        OR LOWER(TRIM(model)) = 'object'
        OR LOWER(TRIM(model)) = '[object object]'
        OR LENGTH(TRIM(model)) <= 2
        OR LENGTH(TRIM(marque)) <= 2
        OR LOWER(TRIM(marque)) = 'object'
        OR LOWER(TRIM(marque)) = '[object object]'
    `);
    
    await client.query('COMMIT');
    
    // Get count after deletion
    const countAfter = await client.query('SELECT COUNT(*) as count FROM vehicle_models');
    const afterCount = parseInt(countAfter.rows[0].count);
    
    console.log('\n✅ Cleanup completed!');
    console.log('📊 Summary:');
    console.log(`   Rows before: ${beforeCount}`);
    console.log(`   Rows deleted: ${deleteResult.rowCount}`);
    console.log(`   Rows after: ${afterCount}`);
    
    // Show remaining models by marque
    const remainingByMarque = await client.query(`
      SELECT marque, COUNT(*) as count
      FROM vehicle_models
      GROUP BY marque
      ORDER BY marque
    `);
    
    if (remainingByMarque.rows.length > 0) {
      console.log('\n📊 Remaining models by marque:');
      remainingByMarque.rows.forEach(row => {
        console.log(`   ${row.marque}: ${row.count} models`);
      });
    }
    
    return {
      before: beforeCount,
      deleted: deleteResult.rowCount,
      after: afterCount,
      suspicious: suspiciousRows.rows,
    };
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Error during cleanup:', error.message);
    throw error;
  } finally {
    client.release();
  }
}

// Run if called directly
if (require.main === module) {
  cleanupVehicleModels()
    .then((summary) => {
      console.log('\n✅ Cleanup script completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Cleanup script failed:', error);
      process.exit(1);
    });
}

module.exports = cleanupVehicleModels;

