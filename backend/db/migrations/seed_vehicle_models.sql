-- Seed Vehicle Models
-- Purpose: Populate vehicle_models table with real Kia and Hyundai models
-- Removes all existing rows and inserts correct data
-- Safe to run multiple times (idempotent via unique constraint)
--
-- Usage: Run via Node.js script: npm run seed:vehicle-models
-- Or execute directly: psql -d your_database -f db/migrations/seed_vehicle_models.sql

BEGIN;

-- Delete all existing rows to ensure clean state
-- This removes any test data (BB, XCXV, bbb, yy, Object, etc.)
DELETE FROM vehicle_models;

-- Insert Kia models (14 models)
-- Note: Using exact casing as specified
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
  
ON CONFLICT DO NOTHING;

-- Insert Hyundai models (22 models)
-- Note: Using exact casing as specified
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
-- Expected: Kia: 14, Hyundai: 22, Total: 36
-- SELECT marque, COUNT(*) as count 
-- FROM vehicle_models 
-- GROUP BY marque 
-- ORDER BY marque;
