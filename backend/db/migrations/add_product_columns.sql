-- Migration: Add missing columns to products table
-- Adds: promo_percent, promo_price, image, product_references
-- NOTE: product_references (not "references" - reserved keyword)

-- Add promo_percent column if it doesn't exist
ALTER TABLE products 
ADD COLUMN IF NOT EXISTS promo_percent INTEGER;

-- Add promo_price column if it doesn't exist
ALTER TABLE products 
ADD COLUMN IF NOT EXISTS promo_price NUMERIC(10,3);

-- Add image column if it doesn't exist (use main_image if exists, otherwise add image)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'products' AND column_name = 'image'
  ) THEN
    ALTER TABLE products ADD COLUMN image TEXT;
    -- Copy data from main_image to image if main_image exists
    UPDATE products SET image = main_image WHERE main_image IS NOT NULL AND image IS NULL;
  END IF;
END $$;

-- Rename old "references" column to "product_references" if it exists (PostgreSQL reserved keyword fix)
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'products' AND column_name = 'references'
  ) THEN
    ALTER TABLE products RENAME COLUMN "references" TO product_references;
    RAISE NOTICE 'Renamed "references" column to product_references';
  END IF;
END $$;

-- Add product_references column if it doesn't exist (as TEXT[])
ALTER TABLE products 
ADD COLUMN IF NOT EXISTS product_references TEXT[] DEFAULT '{}';

