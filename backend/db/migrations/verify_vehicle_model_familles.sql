-- Verification queries for vehicle_model_familles pivot table
-- Run these to verify the table exists and is populated correctly

-- Check if table exists
SELECT to_regclass('public.vehicle_model_familles') as table_exists;

-- Count total vehicle models
SELECT COUNT(*) as total_models FROM vehicle_models;

-- Count total associations
SELECT COUNT(*) as total_associations FROM vehicle_model_familles;

-- Count associations per model (first 5)
SELECT model_id, COUNT(*) as famille_count 
FROM vehicle_model_familles 
GROUP BY model_id 
ORDER BY model_id 
LIMIT 5;

-- Count associations per famille (first 5)
SELECT famille_id, COUNT(*) as model_count 
FROM vehicle_model_familles 
GROUP BY famille_id 
ORDER BY famille_id 
LIMIT 5;

-- Sample associations
SELECT vmf.id, vmf.model_id, vm.marque, vm.model, vmf.famille_id
FROM vehicle_model_familles vmf
JOIN vehicle_models vm ON vmf.model_id = vm.id
ORDER BY vmf.model_id, vmf.famille_id
LIMIT 10;

