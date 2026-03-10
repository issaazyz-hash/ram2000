/**
 * Fix Vehicles Table Schema
 * Safely adds missing columns to the vehicles table
 * Does NOT drop existing data
 */

require('dotenv').config();
const pool = require('./pool');

async function fixVehiclesTable() {
  console.log('🔄 Checking vehicles table schema...');
  
  let client;
  try {
    client = await pool.connect();
    
    // Step 1: Check current table structure
    console.log('📋 Inspecting existing vehicles table columns...');
    const columnsResult = await client.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_schema = 'public' 
      AND table_name = 'vehicles'
      ORDER BY ordinal_position
    `);
    
    const existingColumns = columnsResult.rows.map(row => row.column_name);
    console.log('✅ Existing columns:', existingColumns.join(', '));
    
    // Step 2: Define required columns
    const requiredColumns = {
      id: { type: 'SERIAL PRIMARY KEY', exists: false },
      name: { type: 'TEXT NOT NULL DEFAULT \'\'', exists: existingColumns.includes('name') },
      brand: { type: 'TEXT NOT NULL DEFAULT \'\'', exists: existingColumns.includes('brand') },
      model: { type: 'TEXT NOT NULL DEFAULT \'\'', exists: existingColumns.includes('model') },
      year: { type: 'INTEGER', exists: existingColumns.includes('year') },
      description: { type: 'TEXT', exists: existingColumns.includes('description') },
      image_url: { type: 'TEXT', exists: existingColumns.includes('image_url') },
      created_at: { type: 'TIMESTAMP DEFAULT NOW() NOT NULL', exists: existingColumns.includes('created_at') },
      updated_at: { type: 'TIMESTAMP DEFAULT NOW() NOT NULL', exists: existingColumns.includes('updated_at') }
    };
    
    // Step 3: Add missing columns (safely with IF NOT EXISTS check)
    const missingColumns = [];
    for (const [colName, colInfo] of Object.entries(requiredColumns)) {
      if (colName === 'id') continue; // Skip primary key
      
      if (!colInfo.exists) {
        missingColumns.push({ name: colName, definition: colInfo.type });
      }
    }
    
    if (missingColumns.length === 0) {
      console.log('✅ All required columns exist. Table schema is correct.');
      return { success: true, message: 'Table schema is up to date', columns: existingColumns };
    }
    
    console.log(`⚠️  Found ${missingColumns.length} missing columns. Adding them...`);
    
    // Add each missing column
    for (const col of missingColumns) {
      try {
        // Check if column exists (double check)
        const checkResult = await client.query(`
          SELECT column_name 
          FROM information_schema.columns
          WHERE table_schema = 'public' 
          AND table_name = 'vehicles'
          AND column_name = $1
        `, [col.name]);
        
        if (checkResult.rows.length > 0) {
          console.log(`   ⏭️  Column '${col.name}' already exists, skipping`);
          continue;
        }
        
        // Add column safely
        const alterSQL = `ALTER TABLE vehicles ADD COLUMN ${col.name} ${col.definition}`;
        console.log(`   ➕ Adding column '${col.name}'...`);
        await client.query(alterSQL);
        console.log(`   ✅ Column '${col.name}' added successfully`);
      } catch (err) {
        if (err.code === '42701') { // Duplicate column
          console.log(`   ⏭️  Column '${col.name}' already exists`);
        } else {
          throw err;
        }
      }
    }
    
    // Step 4: Verify final schema
    const finalCheck = await client.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_schema = 'public' 
      AND table_name = 'vehicles'
      ORDER BY ordinal_position
    `);
    
    console.log('\n✅ Vehicles table schema verified:');
    finalCheck.rows.forEach(col => {
      console.log(`   - ${col.column_name} (${col.data_type}) ${col.is_nullable === 'NO' ? 'NOT NULL' : 'NULL'}`);
    });
    
    // Step 5: Create indexes if they don't exist
    try {
      await client.query('CREATE INDEX IF NOT EXISTS idx_vehicles_brand ON vehicles(brand)');
      await client.query('CREATE INDEX IF NOT EXISTS idx_vehicles_model ON vehicles(model)');
      console.log('✅ Indexes verified/created');
    } catch (idxErr) {
      console.warn('⚠️  Index creation warning:', idxErr.message);
    }
    
    return {
      success: true,
      message: `Added ${missingColumns.length} missing column(s)`,
      columns: finalCheck.rows.map(r => r.column_name)
    };
    
  } catch (error) {
    console.error('❌ Error fixing vehicles table:', error.message);
    console.error('   SQL Code:', error.code);
    throw error;
  } finally {
    if (client) {
      client.release();
    }
  }
}

// Run if called directly
if (require.main === module) {
  fixVehiclesTable()
    .then(result => {
      console.log('\n✅ Vehicles table fix completed:', result.message);
      process.exit(0);
    })
    .catch(error => {
      console.error('\n❌ Vehicles table fix failed:', error.message);
      process.exit(1);
    });
}

module.exports = fixVehiclesTable;

