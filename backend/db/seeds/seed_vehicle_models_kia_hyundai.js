/**
 * Seed Vehicle Models - Kia and Hyundai
 * Inserts official Kia and Hyundai models into vehicle_models table
 * Uses UPSERT with unique constraint (safe to run multiple times)
 * 
 * Usage: node db/seeds/seed_vehicle_models_kia_hyundai.js
 */

const pool = require('../pool');

// Official Kia models (exact casing as provided)
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

// Official Hyundai models (exact casing as provided)
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
    console.log('🌱 Starting vehicle models seed (Kia + Hyundai)...');
    console.log(`   Kia models: ${KIA_MODELS.length}`);
    console.log(`   Hyundai models: ${HYUNDAI_MODELS.length}`);
    console.log(`   Total: ${KIA_MODELS.length + HYUNDAI_MODELS.length}`);
    
    await client.query('BEGIN');
    
    // Ensure unique constraint exists (case-insensitive)
    console.log('📋 Ensuring unique constraint exists...');
    try {
      await client.query(`
        CREATE UNIQUE INDEX IF NOT EXISTS ux_vehicle_models_marque_model 
        ON vehicle_models (LOWER(TRIM(marque)), LOWER(TRIM(model)))
      `);
      console.log('✅ Unique constraint ready');
    } catch (error) {
      if (error.code === '42P07') { // index already exists
        console.log('ℹ️  Unique constraint already exists');
      } else {
        throw error;
      }
    }
    
    let insertedCount = 0;
    let skippedCount = 0;
    const errors = [];
    
    // Insert Kia models
    console.log('\n🚗 Inserting Kia models...');
    for (const model of KIA_MODELS) {
      const trimmedModel = model.trim();
      try {
        // Validate before insert
        if (trimmedModel.length < 3) {
          console.warn(`   ⚠️  Skipping invalid model (length < 3): "${trimmedModel}"`);
          skippedCount++;
          continue;
        }
        
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
        if (error.code === '23505') { // unique constraint violation
          skippedCount++;
          console.log(`   ⏭️  Skipped (duplicate): Kia ${trimmedModel}`);
        } else {
          errors.push({ marque: 'Kia', model: trimmedModel, error: error.message });
          console.error(`   ❌ Error inserting Kia ${trimmedModel}:`, error.message);
        }
      }
    }
    
    // Insert Hyundai models
    console.log('\n🚗 Inserting Hyundai models...');
    for (const model of HYUNDAI_MODELS) {
      const trimmedModel = model.trim();
      try {
        // Validate before insert
        if (trimmedModel.length < 3) {
          console.warn(`   ⚠️  Skipping invalid model (length < 3): "${trimmedModel}"`);
          skippedCount++;
          continue;
        }
        
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
        if (error.code === '23505') { // unique constraint violation
          skippedCount++;
          console.log(`   ⏭️  Skipped (duplicate): Hyundai ${trimmedModel}`);
        } else {
          errors.push({ marque: 'Hyundai', model: trimmedModel, error: error.message });
          console.error(`   ❌ Error inserting Hyundai ${trimmedModel}:`, error.message);
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
    console.log(`   Errors: ${errors.length}`);
    console.log(`   Total Kia models in DB: ${kiaCount.rows[0].count}`);
    console.log(`   Total Hyundai models in DB: ${hyundaiCount.rows[0].count}`);
    console.log(`   Total models in DB: ${totalCount.rows[0].count}`);
    
    if (errors.length > 0) {
      console.log('\n⚠️  Errors encountered:');
      errors.forEach(err => {
        console.log(`   ${err.marque} ${err.model}: ${err.error}`);
      });
    }
    
    return {
      inserted: insertedCount,
      skipped: skippedCount,
      errors: errors.length,
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

