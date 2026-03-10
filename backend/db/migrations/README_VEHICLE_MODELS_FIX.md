# Vehicle Models Integrity Fix

## Problem
- `getAllVehicleModels()` was fetching only 3 models total
- One model had invalid value "Object" (test/invalid data)
- HyundaiCars page fetched 0 Hyundai models (DB had no Hyundai rows)
- CatPage compatibility field showed wrong/invalid data

## Solution

### 1. Database Integrity
- **Unique Constraint**: Added case-insensitive unique index on `(marque, model)` to prevent duplicates
- **Cleanup Script**: Created `cleanup_invalid_vehicle_models.sql` to remove invalid rows
- **Seed Script**: Created `seed_vehicle_models.sql` to populate real Kia and Hyundai models

### 2. Frontend Changes
- **CatPage**: Changed from `getAllVehicleModels()` to `getVehicleModelsByMarque('Kia')` for better data integrity
- **database.ts**: Added `getVehicleModelsByMarque` alias for clarity

## Migration Steps

### Step 1: Add Unique Constraint
```bash
# Run the migration to add unique constraint and clean duplicates
psql -d your_database -f backend/db/migrations/add_unique_constraint_vehicle_models.sql
```

### Step 2: Cleanup Invalid Data
```bash
# Remove invalid rows (Object, BB, UGF, etc.)
psql -d your_database -f backend/db/migrations/cleanup_invalid_vehicle_models.sql
```

### Step 3: Seed Vehicle Models
```bash
# Option A: Run via Node.js script (recommended)
node backend/db/migrations/run_seed_vehicle_models.js

# Option B: Run SQL directly
psql -d your_database -f backend/db/migrations/seed_vehicle_models.sql
```

## Files Created

1. **add_unique_constraint_vehicle_models.sql**
   - Adds unique index on (marque, model)
   - Removes duplicates before adding constraint
   - Removes invalid rows (Object, null, etc.)

2. **cleanup_invalid_vehicle_models.sql**
   - Removes test data and invalid entries
   - Filters out suspicious patterns

3. **seed_vehicle_models.sql**
   - Inserts 14 Kia models (matching KiaCars.tsx)
   - Inserts 10 Hyundai models (basic set)
   - Uses `ON CONFLICT DO NOTHING` to prevent duplicates

4. **run_seed_vehicle_models.js**
   - Node.js runner for seed script
   - Includes verification queries
   - Error handling and rollback

## Expected Results

After running migrations:
- **Kia models**: 14 models (matching KiaCars.tsx)
- **Hyundai models**: 10 models (basic set)
- **No duplicates**: Unique constraint prevents duplicates
- **No invalid data**: Cleanup removes test data

## CatPage Changes

- Now fetches only Kia models via `getVehicleModelsByMarque('Kia')`
- Better data integrity (no invalid/test data)
- Same UI: searchable, multi-select checkboxes, selected chips
- Backward compatible: still works if API fails

## Verification

After migrations, verify:
```sql
-- Check Kia models
SELECT COUNT(*) FROM vehicle_models WHERE marque = 'Kia';
-- Expected: 14

-- Check Hyundai models
SELECT COUNT(*) FROM vehicle_models WHERE marque = 'Hyundai';
-- Expected: 10

-- Check for invalid data
SELECT * FROM vehicle_models 
WHERE model IS NULL 
   OR LOWER(TRIM(model)) = 'object'
   OR LENGTH(TRIM(model)) < 2;
-- Expected: 0 rows
```

