-- Cleanup script: Remove invalid vehicle model rows
-- Purpose: Remove test data and invalid entries from vehicle_models table
-- Date: Generated for vehicle models integrity fix
--
-- This script removes:
-- - Rows where model is NULL or empty
-- - Rows where model equals 'Object' or '[object Object]'
-- - Rows with suspicious test data patterns

-- Remove invalid rows
DELETE FROM vehicle_models
WHERE 
  -- NULL or empty model
  model IS NULL 
  OR TRIM(model) = ''
  -- Test data patterns
  OR LOWER(TRIM(model)) = 'object'
  OR LOWER(TRIM(model)) = '[object object]'
  -- Very short suspicious names (likely test data)
  OR LENGTH(TRIM(model)) < 2
  -- All caps short strings (BB, UGF, etc.)
  OR (LENGTH(TRIM(model)) <= 3 AND model = UPPER(model) AND model ~ '^[A-Z]+$')
  -- Numbers only (2566, etc.)
  OR (model ~ '^\d+$');

-- Show summary of remaining rows
SELECT 
  marque,
  COUNT(*) as remaining_count
FROM vehicle_models
GROUP BY marque
ORDER BY marque;

