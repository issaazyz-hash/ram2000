/**
 * Database Table Initialization
 * Ensures all required tables exist on server startup
 */

const pool = require('../db/pool');

async function initAllTables() {
  console.log('🔄 Initializing database tables...');
  
  try {
    // Create car_brands table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS car_brands (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        file TEXT,
        models TEXT[],
        description TEXT,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);
    console.log('✅ car_brands table ready');

    // Create search_options table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS search_options (
        id SERIAL PRIMARY KEY,
        field TEXT NOT NULL,
        value TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);
    console.log('✅ search_options table ready');

    // Create products table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS products (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        price NUMERIC,
        original_price NUMERIC,
        discount TEXT,
        main_image TEXT,
        all_images TEXT[],
        brand TEXT,
        sku TEXT,
        category TEXT,
        loyalty_points INTEGER DEFAULT 0,
        has_preview BOOLEAN DEFAULT false,
        has_options BOOLEAN DEFAULT false,
        description TEXT,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);
    console.log('✅ products table ready');

    // Create users table if not exists
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        phone TEXT,
        address TEXT,
        role TEXT DEFAULT 'user',
        is_admin BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);
    console.log('✅ users table ready');

    // Create category_products table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS category_products (
        id SERIAL PRIMARY KEY,
        category_slug VARCHAR(255) NOT NULL,
        name VARCHAR(255) NOT NULL,
        slug VARCHAR(255) UNIQUE,
        image TEXT,
        reference TEXT,
        rating INTEGER,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);
    console.log('✅ category_products table ready');
    
    // Add slug column if it doesn't exist (for existing tables)
    try {
      const columnCheck = await pool.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'category_products' 
        AND column_name = 'slug'
      `);
      
      if (columnCheck.rows.length === 0) {
        // Add column without UNIQUE constraint first
        await pool.query(`
          ALTER TABLE category_products 
          ADD COLUMN slug VARCHAR(255)
        `);
        
        // Backfill existing rows
        const existingProducts = await pool.query(`
          SELECT id, name FROM category_products WHERE slug IS NULL OR slug = ''
        `);
        
        function generateSlug(name) {
          return name
            .toString()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .toLowerCase()
            .trim()
            .replace(/\s+/g, '-')
            .replace(/[^\w-]+/g, '')
            .replace(/--+/g, '-');
        }
        
        for (const product of existingProducts.rows) {
          const baseSlug = generateSlug(product.name);
          let uniqueSlug = baseSlug;
          let counter = 1;
          
          while (true) {
            const checkResult = await pool.query(
              'SELECT id FROM category_products WHERE slug = $1 AND id != $2',
              [uniqueSlug, product.id]
            );
            
            if (checkResult.rows.length === 0) {
              break;
            }
            
            uniqueSlug = `${baseSlug}-${counter}`;
            counter++;
          }
          
          await pool.query(
            'UPDATE category_products SET slug = $1 WHERE id = $2',
            [uniqueSlug, product.id]
          );
        }
        
        // Add UNIQUE constraint
        await pool.query(`
          ALTER TABLE category_products 
          ADD CONSTRAINT category_products_slug_unique UNIQUE (slug)
        `);
        
        console.log(`✅ Backfilled ${existingProducts.rows.length} products with slugs`);
      }
    } catch (error) {
      if (error.message.includes('already exists') || error.message.includes('duplicate')) {
        console.log('ℹ️  slug constraint already exists');
      } else {
        console.error('❌ Error adding slug column:', error.message);
      }
    }

    // Create index for faster queries
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_category_products_slug ON category_products(category_slug)
    `);
    console.log('✅ category_products index ready');

    // Ensure reference/rating exist even on older tables
    try {
      await pool.query(`ALTER TABLE category_products ADD COLUMN IF NOT EXISTS reference TEXT NULL`);
      await pool.query(`ALTER TABLE category_products ADD COLUMN IF NOT EXISTS rating INTEGER NULL`);
      await pool.query(`CREATE INDEX IF NOT EXISTS idx_category_products_reference ON category_products(reference)`);
    } catch (e) {
      console.warn('⚠️  Could not ensure category_products reference/rating columns:', e.message);
    }

    // Create vehicle_models table if not exists
    await pool.query(`
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
    console.log('✅ vehicle_models table ready');

    // Add unique constraint on (marque, model) - case-insensitive
    try {
      await pool.query(`
        CREATE UNIQUE INDEX IF NOT EXISTS idx_vehicle_models_marque_model_unique
        ON vehicle_models (LOWER(TRIM(marque)), LOWER(TRIM(model)))
      `);
      console.log('✅ vehicle_models unique constraint ready');
    } catch (error) {
      if (error.message.includes('already exists') || error.message.includes('duplicate')) {
        console.log('ℹ️  vehicle_models unique constraint already exists');
      } else {
        console.error('❌ Error adding vehicle_models unique constraint:', error.message);
      }
    }

    console.log('✅ All database tables initialized successfully!');
    return true;
  } catch (error) {
    console.error('❌ Error initializing tables:', error.message);
    return false;
  }
}

module.exports = { initAllTables };

