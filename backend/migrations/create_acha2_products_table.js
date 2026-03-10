/**
 * Migration: Create acha2_products table
 * Ensures the acha2_products table exists with all required columns
 */

const pool = require('../db/pool');

async function createAcha2ProductsTable() {
  const client = await pool.connect();
  
  try {
    // Create the table if it doesn't exist
    await client.query(`
      CREATE TABLE IF NOT EXISTS acha2_products (
        id SERIAL PRIMARY KEY,
        name TEXT UNIQUE NOT NULL,
        quantity2 INTEGER DEFAULT 0,
        price2 NUMERIC DEFAULT 0,
        description2 TEXT,
        references2 JSONB DEFAULT '[]'::jsonb,
        images2 JSONB DEFAULT '[]'::jsonb,
        modele2 JSONB DEFAULT '[]'::jsonb,
        has_discount2 BOOLEAN DEFAULT false,
        discount_type2 TEXT,
        discount_value2 NUMERIC,
        discounted_price2 NUMERIC,
        caracteristiques2 TEXT,
        references_constructeur2 TEXT,
        custom_content2 TEXT,
        avis_clients JSONB DEFAULT '{"average": 0, "count": 0, "reviews": []}'::jsonb,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // Ensure all required columns exist (add if missing for safety)
    const columnCheck = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'acha2_products' 
      AND column_name IN ('references2', 'description2', 'price2', 'quantity2', 'images2', 'modele2', 'has_discount2', 'discount_type2', 'discount_value2', 'discounted_price2', 'caracteristiques2', 'references_constructeur2', 'custom_content2', 'avis_clients', 'champ1', 'champ2', 'champ3', 'champ4', 'champ5', 'champ6', 'hide_vehicle_selectors')
    `);
    
    const existingColumns = columnCheck.rows.map(row => row.column_name);
    
    // Add missing columns if they don't exist
    if (!existingColumns.includes('references2')) {
      await client.query(`
        ALTER TABLE acha2_products 
        ADD COLUMN IF NOT EXISTS references2 JSONB DEFAULT '[]'::jsonb
      `);
      console.log('✅ Added references2 column to acha2_products');
    }
    
    if (!existingColumns.includes('description2')) {
      await client.query(`
        ALTER TABLE acha2_products 
        ADD COLUMN IF NOT EXISTS description2 TEXT
      `);
      console.log('✅ Added description2 column to acha2_products');
    }
    
    if (!existingColumns.includes('price2')) {
      await client.query(`
        ALTER TABLE acha2_products 
        ADD COLUMN IF NOT EXISTS price2 NUMERIC DEFAULT 0
      `);
      console.log('✅ Added price2 column to acha2_products');
    }
    
    if (!existingColumns.includes('quantity2')) {
      await client.query(`
        ALTER TABLE acha2_products 
        ADD COLUMN IF NOT EXISTS quantity2 INTEGER DEFAULT 0
      `);
      console.log('✅ Added quantity2 column to acha2_products');
    }
    
    if (!existingColumns.includes('images2')) {
      await client.query(`
        ALTER TABLE acha2_products 
        ADD COLUMN IF NOT EXISTS images2 JSONB DEFAULT '[]'::jsonb
      `);
      console.log('✅ Added images2 column to acha2_products');
    }
    
      if (!existingColumns.includes('modele2')) {
      await client.query(`
        ALTER TABLE acha2_products 
        ADD COLUMN IF NOT EXISTS modele2 JSONB DEFAULT '[]'::jsonb
      `);
      console.log('✅ Added modele2 column to acha2_products');
    }
    
    // Add discount columns if they don't exist
    if (!existingColumns.includes('has_discount2')) {
      await client.query(`
        ALTER TABLE acha2_products 
        ADD COLUMN IF NOT EXISTS has_discount2 BOOLEAN DEFAULT false
      `);
      console.log('✅ Added has_discount2 column to acha2_products');
    }
    
    if (!existingColumns.includes('discount_type2')) {
      await client.query(`
        ALTER TABLE acha2_products 
        ADD COLUMN IF NOT EXISTS discount_type2 TEXT CHECK (discount_type2 IN ('percentage','fixed'))
      `);
      console.log('✅ Added discount_type2 column to acha2_products');
    } else {
      // Ensure CHECK constraint exists (might fail if constraint already exists, that's OK)
      try {
        await client.query(`
          ALTER TABLE acha2_products 
          DROP CONSTRAINT IF EXISTS acha2_products_discount_type2_check
        `);
        await client.query(`
          ALTER TABLE acha2_products 
          ADD CONSTRAINT acha2_products_discount_type2_check 
          CHECK (discount_type2 IS NULL OR discount_type2 IN ('percentage','fixed'))
        `);
      } catch (e) {
        // Constraint might already exist or table might not support it - ignore
      }
    }
    
    if (!existingColumns.includes('discount_value2')) {
      await client.query(`
        ALTER TABLE acha2_products 
        ADD COLUMN IF NOT EXISTS discount_value2 NUMERIC
      `);
      console.log('✅ Added discount_value2 column to acha2_products');
    }
    
    if (!existingColumns.includes('discounted_price2')) {
      await client.query(`
        ALTER TABLE acha2_products 
        ADD COLUMN IF NOT EXISTS discounted_price2 NUMERIC
      `);
      console.log('✅ Added discounted_price2 column to acha2_products');
    }

    // Add new fields: caracteristiques2 and references_constructeur2
    if (!existingColumns.includes('caracteristiques2')) {
      await client.query(`
        ALTER TABLE acha2_products 
        ADD COLUMN IF NOT EXISTS caracteristiques2 TEXT
      `);
      console.log('✅ Added caracteristiques2 column to acha2_products');
    }

    if (!existingColumns.includes('references_constructeur2')) {
      await client.query(`
        ALTER TABLE acha2_products 
        ADD COLUMN IF NOT EXISTS references_constructeur2 TEXT
      `);
      console.log('✅ Added references_constructeur2 column to acha2_products');
    }

    if (!existingColumns.includes('custom_content2')) {
      await client.query(`
        ALTER TABLE acha2_products 
        ADD COLUMN IF NOT EXISTS custom_content2 TEXT
      `);
      console.log('✅ Added custom_content2 column to acha2_products');
    }

    if (!existingColumns.includes('avis_clients')) {
      await client.query(`
        ALTER TABLE acha2_products 
        ADD COLUMN IF NOT EXISTS avis_clients JSONB DEFAULT '{"average": 0, "count": 0, "reviews": []}'::jsonb
      `);
      console.log('✅ Added avis_clients column to acha2_products');
    }

    // Add gestion fields: champ1-champ6
    if (!existingColumns.includes('champ1')) {
      await client.query(`
        ALTER TABLE acha2_products 
        ADD COLUMN IF NOT EXISTS champ1 TEXT
      `);
      console.log('✅ Added champ1 column to acha2_products');
    }

    if (!existingColumns.includes('champ2')) {
      await client.query(`
        ALTER TABLE acha2_products 
        ADD COLUMN IF NOT EXISTS champ2 TEXT
      `);
      console.log('✅ Added champ2 column to acha2_products');
    }

    if (!existingColumns.includes('champ3')) {
      await client.query(`
        ALTER TABLE acha2_products 
        ADD COLUMN IF NOT EXISTS champ3 TEXT
      `);
      console.log('✅ Added champ3 column to acha2_products');
    }

    if (!existingColumns.includes('champ4')) {
      await client.query(`
        ALTER TABLE acha2_products 
        ADD COLUMN IF NOT EXISTS champ4 TEXT
      `);
      console.log('✅ Added champ4 column to acha2_products');
    }

    if (!existingColumns.includes('champ5')) {
      await client.query(`
        ALTER TABLE acha2_products 
        ADD COLUMN IF NOT EXISTS champ5 TEXT
      `);
      console.log('✅ Added champ5 column to acha2_products');
    }

    if (!existingColumns.includes('champ6')) {
      await client.query(`
        ALTER TABLE acha2_products 
        ADD COLUMN IF NOT EXISTS champ6 TEXT
      `);
      console.log('✅ Added champ6 column to acha2_products');
    }

    // Add hide_vehicle_selectors (admin toggle to hide Marque/Modèle on acha2 page)
    if (!existingColumns.includes('hide_vehicle_selectors')) {
      await client.query(`
        ALTER TABLE acha2_products 
        ADD COLUMN IF NOT EXISTS hide_vehicle_selectors BOOLEAN DEFAULT false
      `);
      console.log('✅ Added hide_vehicle_selectors column to acha2_products');
    }

  } catch (error) {
    console.error('❌ Error creating acha2_products table:', error.message);
    throw error;
  } finally {
    client.release();
  }
}

module.exports = createAcha2ProductsTable;
