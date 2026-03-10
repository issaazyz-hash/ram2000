-- Migration: Create category_product_vehicle_models pivot table
-- Purpose: Link category products to vehicle models for model-specific filtering
-- Date: Generated for model-specific category products implementation

-- Create pivot table
CREATE TABLE IF NOT EXISTS category_product_vehicle_models (
  product_id INTEGER NOT NULL REFERENCES category_products(id) ON DELETE CASCADE,
  model_id INTEGER NOT NULL REFERENCES vehicle_models(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT NOW(),
  PRIMARY KEY(product_id, model_id)
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_category_product_vehicle_models_product_id 
  ON category_product_vehicle_models(product_id);
CREATE INDEX IF NOT EXISTS idx_category_product_vehicle_models_model_id 
  ON category_product_vehicle_models(model_id);

-- Note: We do NOT populate initial data here
-- Legacy products without pivot rows will be treated as "global" (visible for all models)
-- This ensures backward compatibility

-- Log completion
DO $$
DECLARE
  table_exists BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'category_product_vehicle_models'
  ) INTO table_exists;
  
  IF table_exists THEN
    RAISE NOTICE 'Table category_product_vehicle_models created successfully';
  ELSE
    RAISE WARNING 'Table category_product_vehicle_models may not have been created';
  END IF;
END $$;

