-- Seed Vehicle Models
-- Purpose: Populate vehicle_models table with real Kia and Hyundai models
-- Removes invalid rows and inserts correct data
-- Safe to run multiple times (idempotent via unique constraint)
--
-- Usage: Run via Node.js script: npm run seed:vehicle-models
-- Or execute directly: psql -d your_database -f db/seeds/seed_vehicle_models.sql

BEGIN;

-- Delete ONLY invalid rows (test data, empty, too short, Object, etc.)
-- This preserves any valid rows that might already exist
DELETE FROM vehicle_models
WHERE 
  model IS NULL 
  OR model = ''
  OR TRIM(model) = ''
  OR LENGTH(TRIM(model)) < 3
  OR LOWER(TRIM(model)) = 'object'
  OR LOWER(TRIM(model)) = '[object object]'
  OR marque IS NULL
  OR marque = ''
  OR TRIM(marque) = ''
  OR LENGTH(TRIM(marque)) < 3
  OR LOWER(TRIM(marque)) = 'object'
  OR LOWER(TRIM(marque)) = '[object object]';

-- Insert Kia models (14 models - note: "kia seltos" and "kia Seltos" will conflict due to unique constraint)
-- Only one will be inserted, resulting in 13 unique Kia models
INSERT INTO vehicle_models (marque, model, created_at)
VALUES
  ('Kia', 'kia rio 2010', NOW()),
  ('Kia', 'kia rio 2018_2025', NOW()),
  ('Kia', 'kia picanto', NOW()),
  ('Kia', 'kia picanto GT Line', NOW()),
  ('Kia', 'kia seltos', NOW()),
  ('Kia', 'kia sportage', NOW()),
  ('Kia', 'kia Cerato', NOW()),
  ('Kia', 'kia sorento', NOW()),
  ('Kia', 'kia Rio 2012_2018', NOW()),
  ('Kia', 'kia picanto 2010', NOW()),
  ('Kia', 'kia picanto 2012_2016', NOW()),
  ('Kia', 'kia cerato 2010', NOW()),
  ('Kia', 'kia SPORTAGE 2012_20015', NOW()),
  ('Kia', 'kia Seltos', NOW())
ON CONFLICT DO NOTHING;

-- Insert Hyundai models (22 models)
INSERT INTO vehicle_models (marque, model, created_at)
VALUES
  ('Hyundai', 'Hyundai I10', NOW()),
  ('Hyundai', 'Hyundai GRAN I10 2012_2018', NOW()),
  ('Hyundai', 'Hyundai i20', NOW()),
  ('Hyundai', 'Hyundai IX 35', NOW()),
  ('Hyundai', 'Hyundai GRAND I10 2018_2022', NOW()),
  ('Hyundai', 'Hyundai i20 2014', NOW()),
  ('Hyundai', 'Hyundai i20 2015_2019', NOW()),
  ('Hyundai', 'Hyundai grand i10', NOW()),
  ('Hyundai', 'Hyundai grand i10sedan', NOW()),
  ('Hyundai', 'Hyundai i30 fastback', NOW()),
  ('Hyundai', 'Hyundai creta', NOW()),
  ('Hyundai', 'Hyundai Accent', NOW()),
  ('Hyundai', 'Hyundai elantra', NOW()),
  ('Hyundai', 'Hyundai veloster', NOW()),
  ('Hyundai', 'Hyundai Getz', NOW()),
  ('Hyundai', 'Hyundai atos', NOW()),
  ('Hyundai', 'Hyundai tucson', NOW()),
  ('Hyundai', 'Hyundai santa fe', NOW()),
  ('Hyundai', 'Hyundai h1', NOW()),
  ('Hyundai', 'Hyundai h100', NOW()),
  ('Hyundai', 'Hyundai porter', NOW()),
  ('Hyundai', 'Hyundai i30', NOW())
ON CONFLICT DO NOTHING;

COMMIT;

-- Verification query (run after transaction)
-- Expected: Kia: 13 (14 attempted but duplicate prevented), Hyundai: 22, Total: 35
-- SELECT marque, COUNT(*) FROM vehicle_models GROUP BY marque ORDER BY marque;
