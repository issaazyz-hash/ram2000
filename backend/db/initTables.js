/**
 * Database Table Auto-Initialization
 * Creates missing tables automatically on server startup
 * This ensures all required tables exist even if schema_production.sql doesn't include them
 */

const pool = require('./pool');

/**
 * Check if a table exists
 */
async function tableExists(tableName) {
  try {
    const result = await pool.query(
      `SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = $1
      )`,
      [tableName]
    );
    return result.rows[0].exists;
  } catch (error) {
    console.error(`❌ Error checking table ${tableName}:`, error.message);
    return false;
  }
}

/**
 * Create search_options table if it doesn't exist
 */
async function createSearchOptionsTable() {
  try {
    const exists = await tableExists('search_options');
    if (exists) {
      console.log('[DB] search_options ready (already exists)');
      return true;
    }

    await pool.query(`
      CREATE TABLE IF NOT EXISTS search_options (
        id SERIAL PRIMARY KEY,
        field TEXT NOT NULL,
        value TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    console.log('[DB] search_options ready');
    return true;
  } catch (error) {
    console.error('❌ Error creating search_options table:', error.message);
    return false;
  }
}

/**
 * Create subcategories table if it doesn't exist
 */
async function createSubcategoriesTable() {
  try {
    const exists = await tableExists('subcategories');
    if (exists) {
      console.log('[DB] subcategories ready (already exists)');
      return true;
    }

    await pool.query(`
      CREATE TABLE IF NOT EXISTS subcategories (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        family_name TEXT NOT NULL DEFAULT 'Uncategorized',
        image_url TEXT,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW(),
        CONSTRAINT subcategories_name_family_unique UNIQUE(name, family_name)
      )
    `);

    // Create index on name for faster lookups
    try {
      await pool.query(`CREATE INDEX IF NOT EXISTS idx_subcategories_name ON subcategories(name)`);
      await pool.query(`CREATE INDEX IF NOT EXISTS idx_subcategories_family ON subcategories(family_name)`);
    } catch (idxError) {
      // Index might already exist, continue
    }

    console.log('[DB] subcategories ready');
    return true;
  } catch (error) {
    console.error('❌ Error creating subcategories table:', error.message);
    return false;
  }
}

/**
 * Create dashboard_products table if it doesn't exist
 */
async function createDashboardProductsTable() {
  try {
    const exists = await tableExists('dashboard_products');
    if (exists) {
      console.log('[DB] dashboard_products ready (already exists)');
      return true;
    }

    await pool.query(`
      CREATE TABLE IF NOT EXISTS dashboard_products (
        id SERIAL PRIMARY KEY,
        acha_id INTEGER NOT NULL,
        sub_id TEXT,
        name TEXT,
        price NUMERIC(12,3),
        quantity INTEGER DEFAULT 0,
        first_image TEXT,
        reference TEXT,
        promotion_percentage NUMERIC DEFAULT 0,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // Create indexes
    try {
      await pool.query(`CREATE INDEX IF NOT EXISTS idx_dashboard_products_acha_id ON dashboard_products(acha_id)`);
      await pool.query(`CREATE INDEX IF NOT EXISTS idx_dashboard_products_sub_id ON dashboard_products(sub_id)`);
      await pool.query(`CREATE INDEX IF NOT EXISTS idx_dashboard_products_created_at ON dashboard_products(created_at DESC)`);
    } catch (idxError) {
      // Index might already exist, continue
    }

    console.log('[DB] dashboard_products ready');
    return true;
  } catch (error) {
    console.error('❌ Error creating dashboard_products table:', error.message);
    return false;
  }
}

/**
 * Create orders table if it doesn't exist
 */
async function createOrdersTable() {
  try {
    const exists = await tableExists('orders');
    if (exists) {
      console.log('[DB] orders ready (already exists)');
      return true;
    }

    await pool.query(`
      CREATE TABLE IF NOT EXISTS orders (
        id SERIAL PRIMARY KEY,
        product_id INTEGER,
        product_name TEXT NOT NULL,
        product_image TEXT,
        product_price NUMERIC(12,2) DEFAULT 0 NOT NULL,
        product_references TEXT[] DEFAULT '{}',
        product_snapshot JSONB DEFAULT '{}'::jsonb,
        quantity INTEGER NOT NULL DEFAULT 1,
        customer_nom TEXT NOT NULL,
        customer_prenom TEXT NOT NULL,
        customer_phone TEXT NOT NULL,
        customer_wilaya TEXT NOT NULL,
        customer_delegation TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT NOW() NOT NULL
      )
    `);

    // Create indexes
    try {
      await pool.query(`CREATE INDEX IF NOT EXISTS idx_orders_product_id ON orders(product_id)`);
      await pool.query(`CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at DESC)`);
    } catch (idxError) {
      // Index might already exist, continue
    }

    console.log('[DB] orders ready');
    return true;
  } catch (error) {
    // If foreign key constraint fails (products table doesn't exist), create without FK
    if (error.message.includes('products') || error.code === '42830') {
      try {
        await pool.query(`
          CREATE TABLE IF NOT EXISTS orders (
            id SERIAL PRIMARY KEY,
            product_id INTEGER,
            product_name TEXT NOT NULL,
            product_image TEXT,
            product_price NUMERIC(12,2) DEFAULT 0 NOT NULL,
            product_references TEXT[] DEFAULT '{}',
            product_snapshot JSONB DEFAULT '{}'::jsonb,
            quantity INTEGER NOT NULL DEFAULT 1,
            customer_nom TEXT NOT NULL,
            customer_prenom TEXT NOT NULL,
            customer_phone TEXT NOT NULL,
            customer_wilaya TEXT NOT NULL,
            customer_delegation TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT NOW() NOT NULL
          )
        `);

        // Create indexes
        try {
          await pool.query(`CREATE INDEX IF NOT EXISTS idx_orders_product_id ON orders(product_id)`);
          await pool.query(`CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at DESC)`);
        } catch (idxError) {
          // Index might already exist, continue
        }

        console.log('[DB] orders ready (created without FK constraint)');
        return true;
      } catch (retryError) {
        console.error('❌ Error creating orders table (retry):', retryError.message);
        return false;
      }
    }

    console.error('❌ Error creating orders table:', error.message);
    return false;
  }
}

/**
 * Helper function for slug generation
 */
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

/**
 * Create category_products table if it doesn't exist
 */
async function createCategoryProductsTable() {
  try {
    const exists = await tableExists('category_products');
    if (exists) {
      console.log('✅ [DB] category_products table already exists');
      // Still need to check/add slug column for existing tables
    } else {

    console.log('🔄 [DB] Creating category_products table...');
    
    // Create table with exact schema as required
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

    // Create indexes for faster queries
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_category_products_slug ON category_products(category_slug)
    `);
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_category_products_product_slug ON category_products(slug)
    `);
    
    console.log('✅ [DB] category_products table created');
    console.log('✅ [DB] Indexes created');
    }
    
    // Add slug column if it doesn't exist (for existing tables)
    try {
      // First, check if column exists
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
        console.log('✅ [DB] slug column added');
        
        // Backfill existing rows with slugs
        const existingProducts = await pool.query(`
          SELECT id, name FROM category_products WHERE slug IS NULL OR slug = ''
        `);
        
        for (const product of existingProducts.rows) {
          const baseSlug = generateSlug(product.name);
          let uniqueSlug = baseSlug;
          let counter = 1;
          
          // Ensure unique slug
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
        
        console.log(`✅ [DB] Backfilled ${existingProducts.rows.length} existing products with slugs`);
        
        // Now add UNIQUE constraint
        await pool.query(`
          ALTER TABLE category_products 
          ADD CONSTRAINT category_products_slug_unique UNIQUE (slug)
        `);
        console.log('✅ [DB] UNIQUE constraint added to slug column');
      } else {
        console.log('✅ [DB] slug column already exists');
        
        // Ensure UNIQUE constraint exists
        try {
          const constraintCheck = await pool.query(`
            SELECT constraint_name 
            FROM information_schema.table_constraints 
            WHERE table_name = 'category_products' 
            AND constraint_type = 'UNIQUE' 
            AND constraint_name LIKE '%slug%'
          `);
          
          if (constraintCheck.rows.length === 0) {
            // Try to add unique constraint
            try {
              await pool.query(`
                ALTER TABLE category_products 
                ADD CONSTRAINT category_products_slug_unique UNIQUE (slug)
              `);
              console.log('✅ [DB] UNIQUE constraint added to slug column');
            } catch (e) {
              // If constraint fails, try unique index
              await pool.query(`
                CREATE UNIQUE INDEX IF NOT EXISTS category_products_slug_unique 
                ON category_products(slug)
              `);
              console.log('✅ [DB] UNIQUE index created on slug column');
            }
          }
        } catch (e) {
          console.log('ℹ️  [DB] Could not verify UNIQUE constraint:', e.message);
        }
      }
    } catch (error) {
      // If UNIQUE constraint already exists, that's fine
      if (error.message.includes('already exists') || error.message.includes('duplicate')) {
        console.log('ℹ️  [DB] slug constraint already exists');
      } else {
        console.error('❌ [DB] Error adding slug column:', error.message);
        // Don't throw - allow table creation to continue
      }
    }

    // Ensure reference and rating columns exist (required for equivalents + Acha2 ref display)
    try {
      await pool.query(`ALTER TABLE category_products ADD COLUMN IF NOT EXISTS reference TEXT NULL`);
      await pool.query(`ALTER TABLE category_products ADD COLUMN IF NOT EXISTS rating INTEGER NULL`);
      // Helpful (optional) index for debugging / admin queries
      await pool.query(`CREATE INDEX IF NOT EXISTS idx_category_products_reference ON category_products(reference)`);
    } catch (e) {
      console.warn('⚠️  [DB] Could not ensure reference/rating columns on category_products:', e.message);
    }

    console.log('✅ [DB] category_products table created');
    console.log('✅ [DB] Index created on category_slug');
    return true;
  } catch (error) {
    console.error('❌ Error creating category_products table:', error);
    console.error('Error details:', {
      name: error.name,
      message: error.message,
      code: error.code,
      detail: error.detail
    });
    return false;
  }
}

/**
 * Initialize all required tables
 * This function is called on server startup after migration
 */
async function initAllTables() {
  console.log('🔄 [DB] Initializing required tables...');

  const results = {
    search_options: false,
    subcategories: false,
    dashboard_products: false,
    orders: false,
    category_products: false
  };

  try {
    // Create tables in parallel for better performance
    const [
      searchOptionsResult,
      subcategoriesResult,
      dashboardProductsResult,
      ordersResult,
      categoryProductsResult
    ] = await Promise.all([
      createSearchOptionsTable(),
      createSubcategoriesTable(),
      createDashboardProductsTable(),
      createOrdersTable(),
      createCategoryProductsTable()
    ]);

    results.search_options = searchOptionsResult;
    results.subcategories = subcategoriesResult;
    results.dashboard_products = dashboardProductsResult;
    results.orders = ordersResult;
    results.category_products = categoryProductsResult;

    // Check if all tables were created successfully
    const allSuccess = Object.values(results).every(r => r === true);

    if (allSuccess) {
      console.log('✅ [DB] All required tables initialized successfully');
    } else {
      const failed = Object.entries(results)
        .filter(([_, success]) => !success)
        .map(([table, _]) => table)
        .join(', ');
      console.warn(`⚠️  [DB] Some tables failed to initialize: ${failed}`);
    }

    return results;
  } catch (error) {
    console.error('❌ [DB] Error during table initialization:', error.message);
    return results;
  }
}

module.exports = {
  initAllTables,
  createSearchOptionsTable,
  createSubcategoriesTable,
  createDashboardProductsTable,
  createOrdersTable,
  tableExists
};
