/**
 * Seed Vehicle Model Familles
 * Populates vehicle_model_familles pivot table with all familles for all vehicle models
 * This ensures backward compatibility - all models see all familles until admin customizes
 * 
 * Usage: npm run seed:vehicle-model-familles
 * Or: node scripts/seedVehicleModelFamilles.js
 * 
 * This script:
 * - Connects using existing DB pool
 * - Reads famille_categories from section_content
 * - Extracts famille IDs robustly (handles array, object.items, object.categories)
 * - Inserts cross product: all vehicle_models × all familles
 * - Safe to run multiple times (idempotent via unique constraint)
 */

const pool = require('../db/pool');

async function seedVehicleModelFamilles() {
  const client = await pool.connect();
  
  try {
    console.log('🌱 Starting vehicle_model_familles seed...');
    
    // Begin transaction
    await client.query('BEGIN');
    
    // Ensure table exists
    await client.query(`
      CREATE TABLE IF NOT EXISTS vehicle_model_familles (
        id SERIAL PRIMARY KEY,
        model_id INTEGER NOT NULL REFERENCES vehicle_models(id) ON DELETE CASCADE,
        famille_id TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(model_id, famille_id)
      )
    `);
    
    // Ensure indexes exist
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_vehicle_model_familles_model_id 
      ON vehicle_model_familles(model_id)
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_vehicle_model_familles_famille_id 
      ON vehicle_model_familles(famille_id)
    `);
    
    // Get all vehicle models
    const modelsResult = await client.query('SELECT id FROM vehicle_models ORDER BY id');
    const modelIds = modelsResult.rows.map(row => row.id);
    console.log(`   Found ${modelIds.length} vehicle models`);
    
    if (modelIds.length === 0) {
      throw new Error('No vehicle models found. Run seed:vehicle-models first.');
    }
    
    // Get famille_categories content from section_content
    const sectionResult = await client.query(`
      SELECT content FROM section_content 
      WHERE section_type = 'famille_categories' 
      LIMIT 1
    `);
    
    if (sectionResult.rows.length === 0) {
      throw new Error('No famille_categories section found in section_content table.');
    }
    
    const rawContent = sectionResult.rows[0].content;
    console.log(`   Found famille_categories section`);
    
    // Extract famille IDs robustly
    let famillesArray = null;
    
    // Case 1: content is already an array
    if (Array.isArray(rawContent)) {
      famillesArray = rawContent;
      console.log(`   Content is array with ${famillesArray.length} items`);
    }
    // Case 2: content is object with items array
    else if (rawContent && typeof rawContent === 'object' && rawContent.items && Array.isArray(rawContent.items)) {
      famillesArray = rawContent.items;
      console.log(`   Content is object with items array (${famillesArray.length} items)`);
    }
    // Case 3: content is object with categories array
    else if (rawContent && typeof rawContent === 'object' && rawContent.categories && Array.isArray(rawContent.categories)) {
      famillesArray = rawContent.categories;
      console.log(`   Content is object with categories array (${famillesArray.length} items)`);
    }
    else {
      throw new Error(
        `Invalid content structure. Expected array or object with items/categories array. ` +
        `Got: ${typeof rawContent}, keys: ${rawContent ? Object.keys(rawContent).join(', ') : 'null'}`
      );
    }
    
    if (!famillesArray || famillesArray.length === 0) {
      throw new Error('No familles found in famille_categories content.');
    }
    
    // Extract famille IDs
    const familleIds = [];
    for (const famille of famillesArray) {
      if (!famille || typeof famille !== 'object') {
        console.warn(`   ⚠️  Skipping invalid famille item:`, famille);
        continue;
      }
      
      // Try id, then famille_id, then slug
      const familleId = famille.id || famille.famille_id || famille.slug;
      
      if (!familleId || typeof familleId !== 'string') {
        console.warn(`   ⚠️  Skipping famille without valid ID:`, famille);
        continue;
      }
      
      familleIds.push(familleId);
    }
    
    console.log(`   Extracted ${familleIds.length} famille IDs`);
    
    if (familleIds.length === 0) {
      throw new Error('No valid famille IDs extracted from content.');
    }
    
    // Insert cross product: all models × all familles
    console.log(`   Inserting ${modelIds.length} models × ${familleIds.length} familles = ${modelIds.length * familleIds.length} associations...`);
    
    let inserted = 0;
    let skipped = 0;
    
    for (const modelId of modelIds) {
      for (const familleId of familleIds) {
        try {
          await client.query(
            'INSERT INTO vehicle_model_familles (model_id, famille_id, created_at) VALUES ($1, $2, NOW())',
            [modelId, familleId]
          );
          inserted++;
        } catch (insertError) {
          // Check if it's a unique constraint violation (already exists)
          if (insertError.code === '23505' || insertError.message.includes('unique')) {
            skipped++;
          } else {
            throw insertError;
          }
        }
      }
    }
    
    // Verify results
    const totalCount = await client.query('SELECT COUNT(*) as count FROM vehicle_model_familles');
    const byModel = await client.query(`
      SELECT model_id, COUNT(*) as count 
      FROM vehicle_model_familles 
      GROUP BY model_id 
      ORDER BY model_id 
      LIMIT 5
    `);
    
    const total = parseInt(totalCount.rows[0].count);
    const expectedTotal = modelIds.length * familleIds.length;
    
    // Commit transaction
    await client.query('COMMIT');
    
    console.log('\n✅ Seed completed successfully!');
    console.log('📊 Results:');
    console.log(`   Total associations: ${total}`);
    console.log(`   Expected: ${expectedTotal} (${modelIds.length} models × ${familleIds.length} familles)`);
    console.log(`   Inserted: ${inserted}`);
    console.log(`   Skipped (already exists): ${skipped}`);
    
    console.log('\n📋 Sample associations (first 5 models):');
    byModel.rows.forEach((row, index) => {
      console.log(`   Model ID ${row.model_id}: ${row.count} familles`);
    });
    
    return {
      total,
      expectedTotal,
      inserted,
      skipped,
      modelCount: modelIds.length,
      familleCount: familleIds.length,
    };
    
  } catch (error) {
    // Rollback on error
    await client.query('ROLLBACK');
    console.error('❌ Error seeding vehicle_model_familles:', error.message);
    console.error(error);
    throw error;
  } finally {
    client.release();
  }
}

// Run if called directly
if (require.main === module) {
  seedVehicleModelFamilles()
    .then((result) => {
      console.log('\n✅ Seed script completed successfully');
      console.log(`   Final count: ${result.total} associations`);
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

module.exports = seedVehicleModelFamilles;

