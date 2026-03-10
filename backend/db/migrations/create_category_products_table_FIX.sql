-- ============================================
-- PRODUCTION FIX: Create category_products table
-- ============================================
-- This SQL creates the missing category_products table
-- Run this directly in PostgreSQL to fix the production error
-- ============================================

-- Create the table with exact schema as required
CREATE TABLE IF NOT EXISTS category_products (
  id SERIAL PRIMARY KEY,
  category_slug VARCHAR(255) NOT NULL,
  name VARCHAR(255) NOT NULL,
  image TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create index for faster queries by category_slug
CREATE INDEX IF NOT EXISTS idx_category_products_slug ON category_products(category_slug);

-- Verify table was created
SELECT 
  table_name,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'category_products'
ORDER BY ordinal_position;

