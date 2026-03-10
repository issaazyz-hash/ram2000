-- ============================================
-- Add vehicle_model_ids column to category_products
-- ============================================
-- This migration adds a vehicle_model_ids INTEGER[] column to store
-- an array of vehicle model IDs that are compatible with each product.
-- NULL or empty array means the product is "global" (visible for all models).
-- ============================================

-- Add vehicle_model_ids column (INTEGER array, nullable)
ALTER TABLE category_products 
ADD COLUMN IF NOT EXISTS vehicle_model_ids INTEGER[] NULL;

-- Add GIN index for fast array filtering
-- GIN indexes are optimized for array containment queries (e.g., WHERE $1 = ANY(vehicle_model_ids))
CREATE INDEX IF NOT EXISTS idx_category_products_vehicle_model_ids
ON category_products USING GIN (vehicle_model_ids);

-- Add comment to column
COMMENT ON COLUMN category_products.vehicle_model_ids IS 
'Array of vehicle model IDs (from vehicle_models table) that this product is compatible with. NULL or empty array means the product is global (visible for all models).';

-- Verify column was added
DO $$
BEGIN
  IF EXISTS (
    SELECT FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'category_products'
    AND column_name = 'vehicle_model_ids'
  ) THEN
    RAISE NOTICE '✅ vehicle_model_ids column added successfully';
  ELSE
    RAISE EXCEPTION '❌ Failed to add vehicle_model_ids column';
  END IF;
  
  -- Verify index was created
  IF EXISTS (
    SELECT FROM pg_indexes 
    WHERE schemaname = 'public' 
    AND tablename = 'category_products'
    AND indexname = 'idx_category_products_vehicle_model_ids'
  ) THEN
    RAISE NOTICE '✅ GIN index on vehicle_model_ids created successfully';
  ELSE
    RAISE WARNING '⚠️  GIN index on vehicle_model_ids may not have been created';
  END IF;
END $$;

