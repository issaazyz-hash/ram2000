-- Migration: Create vehicle_model_familles pivot table
-- Purpose: Link vehicle models to familles for model-specific filtering
-- Date: Generated for model-specific familles implementation

-- Create pivot table
CREATE TABLE IF NOT EXISTS vehicle_model_familles (
  id SERIAL PRIMARY KEY,
  model_id INTEGER NOT NULL REFERENCES vehicle_models(id) ON DELETE CASCADE,
  famille_id TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(model_id, famille_id)
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_vehicle_model_familles_model_id ON vehicle_model_familles(model_id);
CREATE INDEX IF NOT EXISTS idx_vehicle_model_familles_famille_id ON vehicle_model_familles(famille_id);

-- Populate initial data: Associate ALL existing familles to ALL existing vehicle models
-- This ensures backward compatibility - all models see all familles until admin customizes
DO $$
DECLARE
  model_record RECORD;
  famille_record RECORD;
  famille_content JSONB;
  famille_item JSONB;
BEGIN
  -- Get all vehicle models
  FOR model_record IN SELECT id FROM vehicle_models LOOP
    -- Get familles from section_content
    SELECT content INTO famille_content
    FROM section_content
    WHERE section_type = 'famille_categories'
    LIMIT 1;
    
    -- Handle both array and object with items property
    IF famille_content IS NOT NULL THEN
      -- If content is an object with items array
      IF jsonb_typeof(famille_content) = 'object' AND famille_content ? 'items' THEN
        famille_content := famille_content->'items';
      END IF;
      
      -- If content is an array, iterate through it
      IF jsonb_typeof(famille_content) = 'array' THEN
        FOR famille_item IN SELECT * FROM jsonb_array_elements(famille_content) LOOP
          -- Extract famille_id from the item
          IF famille_item ? 'id' THEN
            INSERT INTO vehicle_model_familles (model_id, famille_id)
            VALUES (model_record.id, famille_item->>'id')
            ON CONFLICT (model_id, famille_id) DO NOTHING;
          END IF;
        END LOOP;
      END IF;
    END IF;
  END LOOP;
END $$;

-- Log completion
DO $$
DECLARE
  total_associations INTEGER;
BEGIN
  SELECT COUNT(*) INTO total_associations FROM vehicle_model_familles;
  RAISE NOTICE 'Created % vehicle_model_familles associations', total_associations;
END $$;

