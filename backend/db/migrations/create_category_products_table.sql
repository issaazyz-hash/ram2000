-- ============================================
-- Create category_products table
-- ============================================
-- This migration creates the category_products table
-- Run this manually if the table doesn't exist
-- ============================================

-- Drop table if exists (for clean migration - remove in production)
-- DROP TABLE IF EXISTS category_products CASCADE;

-- Create category_products table
CREATE TABLE IF NOT EXISTS category_products (
  id SERIAL PRIMARY KEY,
  category_slug VARCHAR(255) NOT NULL,
  name VARCHAR(255),
  image TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create index for faster queries by category_slug
CREATE INDEX IF NOT EXISTS idx_category_products_slug ON category_products(category_slug);

-- Add comment to table
COMMENT ON TABLE category_products IS 'Stores products associated with category slugs from the cat page';

-- Verify table creation
DO $$
BEGIN
  IF EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'category_products'
  ) THEN
    RAISE NOTICE '✅ category_products table created successfully';
  ELSE
    RAISE EXCEPTION '❌ Failed to create category_products table';
  END IF;
END $$;

