-- ============================================
-- Database Constraints Migration
-- Adds foreign keys, unique constraints, and indexes
-- Safe to run on existing data (uses IF NOT EXISTS where possible)
-- ============================================

-- ============================================
-- PRODUCTS TABLE CONSTRAINTS
-- ============================================

-- Add UNIQUE constraint on SKU if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'products_sku_unique' 
    AND conrelid = 'products'::regclass
  ) THEN
    -- First, ensure no duplicate SKUs exist
    DELETE FROM products a USING products b
    WHERE a.id < b.id AND a.sku = b.sku AND a.sku IS NOT NULL AND a.sku != '';
    
    -- Then add the constraint
    ALTER TABLE products 
    ADD CONSTRAINT products_sku_unique UNIQUE (sku);
  END IF;
END $$;

-- Add NOT NULL constraints to critical fields
ALTER TABLE products 
  ALTER COLUMN name SET NOT NULL,
  ALTER COLUMN price SET NOT NULL,
  ALTER COLUMN sku SET NOT NULL;

-- Add index on SKU for faster lookups
CREATE INDEX IF NOT EXISTS idx_products_sku ON products(sku);

-- Add index on brand and category for filtering
CREATE INDEX IF NOT EXISTS idx_products_brand ON products(brand);
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);

-- ============================================
-- USERS TABLE CONSTRAINTS
-- ============================================

-- Email is already UNIQUE from schema.sql, but ensure it's NOT NULL
ALTER TABLE users 
  ALTER COLUMN email SET NOT NULL,
  ALTER COLUMN password SET NOT NULL,
  ALTER COLUMN name SET NOT NULL;

-- Add index on email for faster lookups
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- ============================================
-- ORDERS TABLE CONSTRAINTS
-- ============================================

-- Add NOT NULL constraints to required fields
ALTER TABLE orders 
  ALTER COLUMN product_name SET NOT NULL,
  ALTER COLUMN quantity SET NOT NULL,
  ALTER COLUMN customer_nom SET NOT NULL,
  ALTER COLUMN customer_prenom SET NOT NULL,
  ALTER COLUMN customer_phone SET NOT NULL,
  ALTER COLUMN customer_wilaya SET NOT NULL,
  ALTER COLUMN customer_delegation SET NOT NULL;

-- Add index on created_at for sorting
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at DESC);

-- Add index on product_id for filtering
CREATE INDEX IF NOT EXISTS idx_orders_product_id ON orders(product_id);

-- ============================================
-- VEHICLE_MODEL_PARTS TABLE CONSTRAINTS
-- ============================================

-- Add foreign key to vehicle_models if model_id references it
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'vehicle_models') THEN
    IF NOT EXISTS (
      SELECT 1 FROM pg_constraint 
      WHERE conname = 'vehicle_model_parts_model_id_fkey'
    ) THEN
      ALTER TABLE vehicle_model_parts 
      ADD CONSTRAINT vehicle_model_parts_model_id_fkey 
      FOREIGN KEY (model_id) REFERENCES vehicle_models(id) ON DELETE CASCADE;
    END IF;
  END IF;
END $$;

-- Add NOT NULL constraint
ALTER TABLE vehicle_model_parts 
  ALTER COLUMN model_id SET NOT NULL,
  ALTER COLUMN name SET NOT NULL;

-- ============================================
-- ACHA_PRODUCTS TABLE CONSTRAINTS
-- ============================================

-- sub_id is already UNIQUE, but ensure it's NOT NULL
ALTER TABLE acha_products 
  ALTER COLUMN sub_id SET NOT NULL;

-- Add index on sub_id
CREATE INDEX IF NOT EXISTS idx_acha_products_sub_id ON acha_products(sub_id);

-- ============================================
-- ACHA2_PRODUCTS TABLE CONSTRAINTS
-- ============================================

-- name is already UNIQUE, ensure it's NOT NULL
ALTER TABLE acha2_products 
  ALTER COLUMN name SET NOT NULL;

-- ============================================
-- GLOBAL_SETTINGS TABLE CONSTRAINTS
-- ============================================

-- setting_key is already UNIQUE, ensure it's NOT NULL
ALTER TABLE global_settings 
  ALTER COLUMN setting_key SET NOT NULL;

-- ============================================
-- SECTION_CONTENT TABLE CONSTRAINTS
-- ============================================

-- section_type is already UNIQUE, ensure it's NOT NULL
ALTER TABLE section_content 
  ALTER COLUMN section_type SET NOT NULL;

-- ============================================
-- SUBCATEGORIES TABLE CONSTRAINTS
-- ============================================

-- Ensure required fields are NOT NULL
ALTER TABLE subcategories 
  ALTER COLUMN name SET NOT NULL,
  ALTER COLUMN family_name SET NOT NULL;


