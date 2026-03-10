/**
 * Seed Vehicle Models
 * Inserts Kia and Hyundai vehicle models into vehicle_models table
 * Safe to run multiple times (uses UPSERT with unique constraint)
 * 
 * Usage: node db/seeds/seed_vehicle_models.js
 */

const pool = require('../pool');
const path = require('path');

// Vehicle models data (exact casing as provided)
const KIA_MODELS = [
  'kia rio 2010',
  'kia rio 2018_2025',
  'kia picanto',
  'kia picanto GT Line',
  'kia seltos',
  'kia sportage',
  'kia Cerato',
  'kia sorento',
  'kia Rio 2012_2018',
  'kia picanto 2010',
  'kia picanto 2012_2016',
  'kia cerato 2010',
  'kia SPORTAGE 2012_20015',
  'kia Seltos',
];

const HYUNDAI_MODELS = [
  'Hyundai I10',
  'Hyundai GRAN I10 2012_2018',
  'Hyundai i20',
  'Hyundai IX 35',
  'Hyundai GRAND I10 2018_2022',
  'Hyundai i20 2014',
  'Hyundai i20 2015_2019',
  'Hyundai grand i10',
  'Hyundai grand i10sedan',
  'Hyundai i30 fastback',
  'Hyundai creta',
  'Hyundai Accent',
  'Hyundai elantra',
  'Hyundai veloster',
  'Hyundai Getz',
  'Hyundai atos',
  'Hyundai tucson',
  'Hyundai santa fe',
  'Hyundai h1',
  'Hyundai h100',
  'Hyundai porter',
  'Hyundai i30',
];

async function seedVehicleModels() {
  const client = await pool.connect();
  
  try {
    console.log('🌱 Starting vehicle models seed...');
    console.log(`   Kia models: ${KIA_MODELS.length}`);
    console.log(`   Hyundai models: ${HYUNDAI_MODELS.length}`);
    
    await client.query('BEGIN');
    
    // Ensure unique constraint exists (case-insensitive)
    console.log('📋 Ensuring unique constraint exists...');
    await client.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_vehicle_models_marque_model_unique
      ON vehicle_models (LOWER(TRIM(marque)), LOWER(TRIM(model)))
    `);
    console.log('✅ Unique constraint ready');
    
    // Clean up invalid rows first
    console.log('🧹 Cleaning up invalid rows...');
    const cleanupResult = await client.query(`
      DELETE FROM vehicle_models
      WHERE model IS NULL
         OR TRIM(model) = ''
         OR LOWER(TRIM(model)) = 'object'
         OR LOWER(TRIM(model)) = '[object object]'
    `);
    console.log(`   Removed ${cleanupResult.rowCount} invalid rows`);
    
    let insertedCount = 0;
    let skippedCount = 0;
    
    // Insert Kia models
    console.log('🚗 Inserting Kia models...');
    for (const model of KIA_MODELS) {
      const trimmedModel = model.trim();
      try {
        const result = await client.query(`
          INSERT INTO vehicle_models (marque, model, created_at)
          VALUES ($1, $2, NOW())
          ON CONFLICT DO NOTHING
        `, ['Kia', trimmedModel]);
        
        if (result.rowCount > 0) {
          insertedCount++;
          console.log(`   ✅ Inserted: Kia ${trimmedModel}`);
        } else {
          skippedCount++;
          console.log(`   ⏭️  Skipped (duplicate): Kia ${trimmedModel}`);
        }
      } catch (error) {
        // Check if it's a unique constraint violation (shouldn't happen with ON CONFLICT)
        if (error.code === '23505') {
          skippedCount++;
          console.log(`   ⏭️  Skipped (duplicate): Kia ${trimmedModel}`);
        } else {
          console.error(`   ❌ Error inserting Kia ${trimmedModel}:`, error.message);
          throw error;
        }
      }
    }
    
    // Insert Hyundai models
    console.log('🚗 Inserting Hyundai models...');
    for (const model of HYUNDAI_MODELS) {
      const trimmedModel = model.trim();
      try {
        const result = await client.query(`
          INSERT INTO vehicle_models (marque, model, created_at)
          VALUES ($1, $2, NOW())
          ON CONFLICT DO NOTHING
        `, ['Hyundai', trimmedModel]);
        
        if (result.rowCount > 0) {
          insertedCount++;
          console.log(`   ✅ Inserted: Hyundai ${trimmedModel}`);
        } else {
          skippedCount++;
          console.log(`   ⏭️  Skipped (duplicate): Hyundai ${trimmedModel}`);
        }
      } catch (error) {
        if (error.code === '23505') {
          skippedCount++;
          console.log(`   ⏭️  Skipped (duplicate): Hyundai ${trimmedModel}`);
        } else {
          console.error(`   ❌ Error inserting Hyundai ${trimmedModel}:`, error.message);
          throw error;
        }
      }
    }
    
    await client.query('COMMIT');
    
    // Get final counts
    const kiaCount = await client.query(
      "SELECT COUNT(*) as count FROM vehicle_models WHERE marque = 'Kia'"
    );
    const hyundaiCount = await client.query(
      "SELECT COUNT(*) as count FROM vehicle_models WHERE marque = 'Hyundai'"
    );
    const totalCount = await client.query(
      "SELECT COUNT(*) as count FROM vehicle_models"
    );
    
    console.log('\n✅ Seed completed successfully!');
    console.log('📊 Summary:');
    console.log(`   Inserted: ${insertedCount} new models`);
    console.log(`   Skipped: ${skippedCount} duplicates`);
    console.log(`   Total Kia models in DB: ${kiaCount.rows[0].count}`);
    console.log(`   Total Hyundai models in DB: ${hyundaiCount.rows[0].count}`);
    console.log(`   Total models in DB: ${totalCount.rows[0].count}`);
    
    return {
      inserted: insertedCount,
      skipped: skippedCount,
      totalKia: parseInt(kiaCount.rows[0].count),
      totalHyundai: parseInt(hyundaiCount.rows[0].count),
      total: parseInt(totalCount.rows[0].count),
    };
    
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
  seedVehicleModels()
    .then((summary) => {
      console.log('\n✅ Seed script completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Seed script failed:', error);
      process.exit(1);
    });
}

module.exports = seedVehicleModels;

