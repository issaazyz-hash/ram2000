-- Migration: Add unique constraint to vehicle_models(marque, model)
-- Purpose: Prevent duplicate vehicle models in the database
-- Date: Generated for vehicle models integrity fix

-- First, remove any duplicate rows (keep the one with the lowest id)
DELETE FROM vehicle_models a
USING vehicle_models b
WHERE a.id > b.id
  AND LOWER(TRIM(a.marque)) = LOWER(TRIM(b.marque))
  AND LOWER(TRIM(a.model)) = LOWER(TRIM(b.model));

-- Remove invalid rows where model is null, 'Object', or '[object Object]'
DELETE FROM vehicle_models
WHERE model IS NULL
   OR TRIM(model) = ''
   OR LOWER(TRIM(model)) = 'object'
   OR LOWER(TRIM(model)) = '[object object]';

-- Add unique constraint (case-insensitive comparison)
-- Note: PostgreSQL doesn't support case-insensitive unique constraints directly,
-- so we'll add a unique index on lowercased values
CREATE UNIQUE INDEX IF NOT EXISTS idx_vehicle_models_marque_model_unique
ON vehicle_models (LOWER(TRIM(marque)), LOWER(TRIM(model)));

-- Add a comment to document the constraint
COMMENT ON INDEX idx_vehicle_models_marque_model_unique IS 
'Ensures unique combination of marque and model (case-insensitive)';

