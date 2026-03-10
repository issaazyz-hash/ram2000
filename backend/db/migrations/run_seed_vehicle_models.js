/**
 * Seed Vehicle Models Runner
 * Executes the seed_vehicle_models.sql script to populate vehicle_models table
 */

const fs = require('fs');
const path = require('path');
const pool = require('../db/pool');

async function runSeed() {
  const client = await pool.connect();
  
  try {
    console.log('🌱 Starting vehicle models seed...');
    
    // Read the SQL file
    const sqlPath = path.join(__dirname, 'seed_vehicle_models.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');
    
    // Execute the SQL
    await client.query('BEGIN');
    await client.query(sql);
    await client.query('COMMIT');
    
    // Verify results
    const result = await client.query(`
      SELECT 
        marque, 
        COUNT(*) as model_count 
      FROM vehicle_models 
      WHERE marque IN ('Kia', 'Hyundai')
      GROUP BY marque
      ORDER BY marque
    `);
    
    console.log('✅ Vehicle models seeded successfully!');
    console.log('📊 Results:');
    result.rows.forEach(row => {
      console.log(`   ${row.marque}: ${row.model_count} models`);
    });
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Error seeding vehicle models:', error.message);
    throw error;
  } finally {
    client.release();
  }
}

// Run if called directly
if (require.main === module) {
  runSeed()
    .then(() => {
      console.log('✅ Seed completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Seed failed:', error);
      process.exit(1);
    });
}

module.exports = runSeed;

