/**
 * Migration: Add slug column to category_products table
 * 
 * This script:
 * 1. Adds slug column if it doesn't exist
 * 2. Backfills existing rows with unique slugs
 * 3. Adds UNIQUE constraint
 * 
 * Run: node db/migrations/add_slug_to_category_products.js
 */

const pool = require('../pool');

// Helper function for slug generation
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

// Helper function to ensure unique slug
async function ensureUniqueSlug(baseSlug, pool, excludeId = null) {
  let slug = baseSlug;
  let counter = 1;
  
  while (true) {
    let query = 'SELECT id FROM category_products WHERE slug = $1';
    let params = [slug];
    
    if (excludeId) {
      query += ' AND id != $2';
      params.push(excludeId);
    }
    
    const result = await pool.query(query, params);
    
    if (result.rows.length === 0) {
      return slug;
    }
    
    slug = `${baseSlug}-${counter}`;
    counter++;
  }
}

async function addSlugColumn() {
  console.log('🔄 Starting migration: Add slug column to category_products...');
  
  try {
    // Step 1: Check if column exists
    const columnCheck = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'category_products' 
      AND column_name = 'slug'
    `);
    
    if (columnCheck.rows.length > 0) {
      console.log('✅ slug column already exists');
      
      // Check if UNIQUE constraint exists
      const constraintCheck = await pool.query(`
        SELECT constraint_name 
        FROM information_schema.table_constraints 
        WHERE table_name = 'category_products' 
        AND constraint_type = 'UNIQUE' 
        AND constraint_name LIKE '%slug%'
      `);
      
      if (constraintCheck.rows.length > 0) {
        console.log('✅ UNIQUE constraint already exists');
        return { success: true, message: 'Slug column and constraint already exist' };
      }
      
      // Add UNIQUE constraint if missing
      try {
        await pool.query(`
          ALTER TABLE category_products 
          ADD CONSTRAINT category_products_slug_unique UNIQUE (slug)
        `);
        console.log('✅ UNIQUE constraint added');
      } catch (e) {
        // Try unique index if constraint fails
        await pool.query(`
          CREATE UNIQUE INDEX IF NOT EXISTS category_products_slug_unique 
          ON category_products(slug)
        `);
        console.log('✅ UNIQUE index created');
      }
      
      // Backfill any NULL slugs
      const nullSlugs = await pool.query(`
        SELECT id, name FROM category_products WHERE slug IS NULL OR slug = ''
      `);
      
      if (nullSlugs.rows.length > 0) {
        console.log(`📝 Backfilling ${nullSlugs.rows.length} products with NULL slugs...`);
        
        for (const product of nullSlugs.rows) {
          const baseSlug = generateSlug(product.name);
          const uniqueSlug = await ensureUniqueSlug(baseSlug, pool, product.id);
          
          await pool.query(
            'UPDATE category_products SET slug = $1 WHERE id = $2',
            [uniqueSlug, product.id]
          );
        }
        
        console.log(`✅ Backfilled ${nullSlugs.rows.length} products`);
      }
      
      return { success: true, message: 'Migration completed' };
    }
    
    // Step 2: Add column without UNIQUE constraint first
    console.log('📝 Adding slug column...');
    await pool.query(`
      ALTER TABLE category_products 
      ADD COLUMN slug VARCHAR(255)
    `);
    console.log('✅ slug column added');
    
    // Step 3: Backfill existing rows
    const existingProducts = await pool.query(`
      SELECT id, name FROM category_products WHERE slug IS NULL OR slug = ''
    `);
    
    if (existingProducts.rows.length > 0) {
      console.log(`📝 Backfilling ${existingProducts.rows.length} existing products with slugs...`);
      
      for (const product of existingProducts.rows) {
        const baseSlug = generateSlug(product.name);
        const uniqueSlug = await ensureUniqueSlug(baseSlug, pool, product.id);
        
        await pool.query(
          'UPDATE category_products SET slug = $1 WHERE id = $2',
          [uniqueSlug, product.id]
        );
      }
      
      console.log(`✅ Backfilled ${existingProducts.rows.length} products`);
    }
    
    // Step 4: Add UNIQUE constraint
    console.log('📝 Adding UNIQUE constraint...');
    try {
      await pool.query(`
        ALTER TABLE category_products 
        ADD CONSTRAINT category_products_slug_unique UNIQUE (slug)
      `);
      console.log('✅ UNIQUE constraint added');
    } catch (e) {
      // If constraint fails, try unique index
      await pool.query(`
        CREATE UNIQUE INDEX IF NOT EXISTS category_products_slug_unique 
        ON category_products(slug)
      `);
      console.log('✅ UNIQUE index created');
    }
    
    // Step 5: Create index for faster queries
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_category_products_product_slug 
      ON category_products(slug)
    `);
    console.log('✅ Index created on slug column');
    
    console.log('✅ Migration completed successfully!');
    return { success: true, message: 'Migration completed successfully' };
    
  } catch (error) {
    console.error('❌ Migration error:', error);
    console.error('Error details:', {
      name: error.name,
      message: error.message,
      code: error.code,
      detail: error.detail
    });
    return { success: false, error: error.message };
  }
}

// Run if called directly
if (require.main === module) {
  addSlugColumn()
    .then(result => {
      if (result.success) {
        console.log('✅ Migration successful');
        process.exit(0);
      } else {
        console.error('❌ Migration failed');
        process.exit(1);
      }
    })
    .catch(error => {
      console.error('❌ Migration error:', error);
      process.exit(1);
    });
}

module.exports = addSlugColumn;

