/**
 * Migration: Create category_products table
 * 
 * This script creates the category_products table if it doesn't exist.
 * Run this manually if the table is missing: node db/migrations/create_category_products_table.js
 */

const pool = require('../pool');

async function createCategoryProductsTable() {
  console.log('🔄 Creating category_products table...');
  
  try {
    // Check if table already exists
    const checkTable = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'category_products'
      );
    `);
    
    if (checkTable.rows[0].exists) {
      console.log('✅ category_products table already exists');
      return { success: true, message: 'Table already exists' };
    }
    
    // Create table
    await pool.query(`
      CREATE TABLE category_products (
        id SERIAL PRIMARY KEY,
        category_slug VARCHAR(255) NOT NULL,
        name VARCHAR(255) NOT NULL,
        slug VARCHAR(255) UNIQUE,
        image TEXT,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);
    
    // Create index
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_category_products_slug 
      ON category_products(category_slug);
    `);
    
    console.log('✅ category_products table created successfully');
    console.log('✅ Index created on category_slug');
    
    return { success: true, message: 'Table created successfully' };
  } catch (error) {
    console.error('❌ Error creating category_products table:', error);
    console.error('Error details:', {
      name: error.name,
      message: error.message,
      code: error.code,
      detail: error.detail
    });
    return { success: false, error: error.message };
  } finally {
    // Don't close pool - it's shared
    console.log('Migration completed');
  }
}

// Run if called directly
if (require.main === module) {
  createCategoryProductsTable()
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

module.exports = createCategoryProductsTable;

