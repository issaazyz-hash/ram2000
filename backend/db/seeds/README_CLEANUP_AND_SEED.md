# Vehicle Models Cleanup and Seed Guide

## Problem
The "Compatibilité Véhicules" UI in CatPage shows wrong values like:
- BB -> yy
- XCXV -> bbb

These are invalid test data rows in the `vehicle_models` table.

## Solution Steps

### Step 1: Cleanup Bad Rows

Run the cleanup script to remove invalid rows:

```bash
cd ram/bb/backend
node db/seeds/cleanup_vehicle_models.js
```

**What it does:**
- Finds and lists all suspicious rows (marque/model length <= 2, "Object", null, etc.)
- Deletes them from the database
- Shows before/after counts
- Safe to run multiple times

**Expected output:**
```
🧹 Starting vehicle models cleanup...
📋 Found X suspicious rows:
   1. ID: 123, marque: "BB", model: "yy"
   2. ID: 124, marque: "XCXV", model: "bbb"
   ...
✅ Cleanup completed!
📊 Summary:
   Rows before: 50
   Rows deleted: 5
   Rows after: 45
```

### Step 2: Seed Real Models

Run the seed script to insert official Kia and Hyundai models:

```bash
cd ram/bb/backend
node db/seeds/seed_vehicle_models_kia_hyundai.js
```

**What it does:**
- Inserts 14 Kia models (matching KiaCars.tsx)
- Inserts 22 Hyundai models (matching HyundaiCars.tsx)
- Uses UPSERT (ON CONFLICT DO NOTHING) - safe to run multiple times
- Validates data before insert (length >= 3)

**Expected output:**
```
🌱 Starting vehicle models seed (Kia + Hyundai)...
   Kia models: 14
   Hyundai models: 22
   Total: 36
📋 Ensuring unique constraint exists...
✅ Unique constraint ready
🚗 Inserting Kia models...
   ✅ Inserted: Kia kia rio 2010
   ✅ Inserted: Kia kia rio 2018_2025
   ...
🚗 Inserting Hyundai models...
   ✅ Inserted: Hyundai Hyundai I10
   ✅ Inserted: Hyundai Hyundai i20
   ...
✅ Seed completed successfully!
📊 Summary:
   Inserted: 36 new models
   Skipped: 0 duplicates
   Total Kia models in DB: 14
   Total Hyundai models in DB: 22
   Total models in DB: 36
```

## Verification

### 1. Database Check

```sql
-- Check for bad rows (should return 0)
SELECT * FROM vehicle_models 
WHERE LENGTH(TRIM(marque)) <= 2 
   OR LENGTH(TRIM(model)) <= 2
   OR LOWER(TRIM(model)) = 'object'
   OR LOWER(TRIM(marque)) = 'object';

-- Check Kia models (should be 14)
SELECT COUNT(*) FROM vehicle_models WHERE marque = 'Kia';

-- Check Hyundai models (should be 22)
SELECT COUNT(*) FROM vehicle_models WHERE marque = 'Hyundai';

-- Check all models grouped by marque
SELECT marque, COUNT(*) as count 
FROM vehicle_models 
GROUP BY marque 
ORDER BY marque;
```

### 2. Backend API Check

```bash
# Test GET /api/vehicleModels
curl http://localhost:YOUR_PORT/api/vehicleModels | jq

# Should return:
# {
#   "success": true,
#   "count": 36,
#   "data": [
#     { "id": 1, "marque": "Hyundai", "model": "Hyundai I10", ... },
#     { "id": 2, "marque": "Hyundai", "model": "Hyundai i20", ... },
#     ...
#   ]
# }

# Check backend logs for:
# 🔍 [TRACE] GET /api/vehicleModels: Found 36 total rows in DB
# ✅ GET /api/vehicleModels: Returning 36 valid models (filtered 0 invalid)
```

### 3. Frontend UI Check

1. **Login as admin**
2. **Navigate to** `/cat/some-category`
3. **Click "Ajouter un produit"**
4. **Check "Compatibilité Véhicules" section:**
   - ✅ Should show "Chargement des modèles..." briefly
   - ✅ Should display groups: "HYUNDAI" and "KIA"
   - ✅ Should show real model names (not "BB", "yy", "XCXV", "bbb")
   - ✅ Search should work
   - ✅ Multi-select checkboxes should work
   - ✅ Selected chips should show correct names

5. **Check browser console:**
   - ✅ `🔍 [TRACE] Fetching from: http://...`
   - ✅ `✅ Fetched 36 vehicle models`
   - ✅ `🔍 [TRACE] Raw API response sample: [...]`
   - ✅ `✅ Validated 36 valid vehicle models (filtered 0 invalid)`
   - ✅ `🔍 [TRACE] Grouped by marque: { Hyundai: 22, Kia: 14 }`
   - ❌ No warnings about "BB", "yy", "XCXV", "bbb"

## What Was Fixed

### Backend
1. **vehicleModelController.js**:
   - Added filtering in `getAll()` to reject rows with marque/model length < 3
   - Added validation in `create()` to prevent bad data insertion
   - Added trace logs to debug data flow

2. **Unique Constraint**:
   - Ensured unique index exists on `(marque, model)` (case-insensitive)
   - Prevents duplicates

### Frontend
1. **database.ts**:
   - Updated `getAllVehicleModels()` to filter rows with length < 3
   - Added validation for marque and model fields

2. **CatPage.tsx**:
   - Updated filtering to require length >= 3 (not just >= 2)
   - Added trace logs to debug data flow
   - Fixed import for `getApiBaseUrl`
   - UI correctly uses `model.model` for label and `model.id` for value

### Scripts
1. **cleanup_vehicle_models.js**: Removes bad rows
2. **seed_vehicle_models_kia_hyundai.js**: Inserts real models

## Troubleshooting

### Issue: Still seeing "BB -> yy" in UI
- **Check**: Run cleanup script again
- **Check**: Clear browser cache and reload
- **Check**: Backend logs - are invalid rows being filtered?
- **Check**: Frontend console - are validation warnings showing?

### Issue: Seed script says "Skipped (duplicate)"
- **Normal**: Models already exist in DB
- **Action**: Check DB to confirm models are there

### Issue: API returns 0 models
- **Check**: Run seed script
- **Check**: Database connection
- **Check**: Backend logs for errors

## Files Modified

1. `backend/db/seeds/cleanup_vehicle_models.js` (NEW)
2. `backend/db/seeds/seed_vehicle_models_kia_hyundai.js` (NEW)
3. `backend/controllers/vehicleModelController.js` (validation + filtering)
4. `frontend/src/api/database.ts` (validation)
5. `frontend/src/pages/CatPage.tsx` (filtering + trace logs)

