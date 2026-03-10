-- Migration: Add product_snapshot JSONB column to orders table
-- Remove FK constraint if it exists

-- Add product_snapshot column if it doesn't exist
ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS product_snapshot JSONB DEFAULT '{}'::jsonb;

-- Drop foreign key constraint if it exists
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'fk_orders_product' 
    AND table_name = 'orders'
  ) THEN
    ALTER TABLE orders DROP CONSTRAINT fk_orders_product;
    RAISE NOTICE 'Dropped fk_orders_product constraint';
  END IF;
END $$;

