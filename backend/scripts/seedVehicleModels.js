/**
 * Seed Vehicle Models
 * Populates vehicle_models table with exact models from KiaCars.tsx and HyundaiCars.tsx
 * 
 * Usage: npm run seed:vehicle-models
 * Or: node scripts/seedVehicleModels.js
 * 
 * This script:
 * - Uses existing DB pool from backend/db/pool.js
 * - Runs in a transaction for safety
 * - Truncates vehicle_models and repopulates with correct data
 * - Inserts 14 Kia models (13 unique due to duplicate) and 22 Hyundai models
 * - Verifies counts and rolls back if incorrect
 * - Safe to run multiple times (idempotent)
 */

const pool = require('../db/pool');

// Kia models (14 models - exact casing from KiaCars.tsx)
// Note: "kia seltos" and "kia Seltos" will conflict due to unique constraint
// Only one will be inserted, resulting in 13 unique Kia models
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
  'kia Seltos', // Will conflict with "kia seltos" above
];

// Hyundai models (22 models - exact casing from HyundaiCars.tsx)
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
    console.log(`   Kia models to insert: ${KIA_MODELS.length}`);
    console.log(`   Hyundai models to insert: ${HYUNDAI_MODELS.length}`);
    console.log(`   Total: ${KIA_MODELS.length + HYUNDAI_MODELS.length}`);
    
    // Begin transaction
    await client.query('BEGIN');
    
    // Ensure table exists (should already exist, but safe check)
    await client.query(`
      CREATE TABLE IF NOT EXISTS vehicle_models (
        id SERIAL PRIMARY KEY,
        marque VARCHAR(255) NOT NULL,
        model VARCHAR(255) NOT NULL,
        description TEXT,
        image TEXT,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);
    
    // Ensure unique constraint exists (for idempotency)
    await client.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_vehicle_models_marque_model_unique
      ON vehicle_models (LOWER(TRIM(marque)), LOWER(TRIM(model)))
    `);
    
    // Truncate table (removes all rows and resets ID sequence)
    // Use CASCADE to handle foreign key constraints
    console.log('🗑️  Truncating vehicle_models table...');
    try {
      await client.query('TRUNCATE vehicle_models RESTART IDENTITY CASCADE');
      console.log('   ✅ Truncated successfully');
    } catch (truncateError) {
      // If CASCADE fails (foreign key constraints), fallback to DELETE
      console.log('   ⚠️  TRUNCATE CASCADE failed, using DELETE instead...');
      await client.query('DELETE FROM vehicle_models');
      console.log('   ✅ Deleted all rows');
    }
    
    // Insert Kia models
    console.log('🚗 Inserting Kia models...');
    let kiaInserted = 0;
    let kiaSkipped = 0;
    for (const model of KIA_MODELS) {
      try {
        await client.query(
          'INSERT INTO vehicle_models (marque, model, created_at) VALUES ($1, $2, NOW())',
          ['Kia', model]
        );
        kiaInserted++;
        console.log(`   ✅ Inserted: Kia | ${model}`);
      } catch (insertError) {
        // Check if it's a unique constraint violation
        if (insertError.code === '23505' || insertError.message.includes('unique')) {
          kiaSkipped++;
          console.log(`   ⚠️  Skipped (duplicate): Kia | ${model}`);
        } else {
          throw insertError;
        }
      }
    }
    
    // Insert Hyundai models
    console.log('🚗 Inserting Hyundai models...');
    let hyundaiInserted = 0;
    let hyundaiSkipped = 0;
    for (const model of HYUNDAI_MODELS) {
      try {
        await client.query(
          'INSERT INTO vehicle_models (marque, model, created_at) VALUES ($1, $2, NOW())',
          ['Hyundai', model]
        );
        hyundaiInserted++;
        console.log(`   ✅ Inserted: Hyundai | ${model}`);
      } catch (insertError) {
        if (insertError.code === '23505' || insertError.message.includes('unique')) {
          hyundaiSkipped++;
          console.log(`   ⚠️  Skipped (duplicate): Hyundai | ${model}`);
        } else {
          throw insertError;
        }
      }
    }
    
    // Verify counts
    console.log('🔍 Verifying results...');
    const totalCount = await client.query('SELECT COUNT(*) as count FROM vehicle_models');
    const byMarque = await client.query(`
      SELECT marque, COUNT(*) as count 
      FROM vehicle_models 
      GROUP BY marque 
      ORDER BY marque
    `);
    
    const total = parseInt(totalCount.rows[0].count);
    const kiaCount = parseInt(byMarque.rows.find(r => r.marque === 'Kia')?.count || 0);
    const hyundaiCount = parseInt(byMarque.rows.find(r => r.marque === 'Hyundai')?.count || 0);
    
    // Expected: 14 Kia attempted, but "kia seltos" and "kia Seltos" conflict
    // So we expect 13 unique Kia models
    const expectedKia = 13; // 14 attempted, 1 duplicate prevented
    const expectedHyundai = 22;
    const expectedTotal = 35; // 13 + 22
    
    // Validate counts
    if (kiaCount !== expectedKia) {
      await client.query('ROLLBACK');
      throw new Error(
        `❌ Validation failed: Expected Kia ${expectedKia} (14 attempted, 1 duplicate), got ${kiaCount}. ` +
        `Inserted: ${kiaInserted}, Skipped: ${kiaSkipped}`
      );
    }
    
    if (hyundaiCount !== expectedHyundai) {
      await client.query('ROLLBACK');
      throw new Error(
        `❌ Validation failed: Expected Hyundai ${expectedHyundai}, got ${hyundaiCount}. ` +
        `Inserted: ${hyundaiInserted}, Skipped: ${hyundaiSkipped}`
      );
    }
    
    if (total !== expectedTotal) {
      await client.query('ROLLBACK');
      throw new Error(
        `❌ Validation failed: Expected total ${expectedTotal}, got ${total}`
      );
    }
    
    // Commit transaction
    await client.query('COMMIT');
    
    console.log('\n✅ Seed completed successfully!');
    console.log('📊 Results:');
    console.log(`   Total models: ${total}`);
    console.log(`   Kia: ${kiaCount} (${KIA_MODELS.length} attempted, ${kiaSkipped} duplicates skipped)`);
    console.log(`   Hyundai: ${hyundaiCount}`);
    console.log('\n✅ Seed done: Kia=13 Hyundai=22 Total=35');
    console.log('   Note: 14 Kia models attempted but "kia seltos" and "kia Seltos" conflict under unique constraint');
    
    return {
      total,
      kia: kiaCount,
      hyundai: hyundaiCount,
      kiaInserted,
      kiaSkipped,
      hyundaiInserted,
      hyundaiSkipped,
    };
    
  } catch (error) {
    // Rollback on error
    await client.query('ROLLBACK');
    console.error('❌ Error seeding vehicle models:', error.message);
    console.error(error);
    throw error;
  } finally {
    client.release();
  }
}

// Run if called directly
if (require.main === module) {
  seedVehicleModels()
    .then((result) => {
      console.log('\n✅ Seed script completed successfully');
      console.log(`   Final counts: Kia=${result.kia}, Hyundai=${result.hyundai}, Total=${result.total}`);
      // Close pool connection
      pool.end(() => {
        console.log('🔌 Database connection closed');
        process.exit(0);
      });
    })
    .catch((error) => {
      console.error('\n❌ Seed script failed:', error.message);
      // Close pool connection
      pool.end(() => {
        console.log('🔌 Database connection closed');
        process.exit(1);
      });
    });
}

module.exports = seedVehicleModels;
