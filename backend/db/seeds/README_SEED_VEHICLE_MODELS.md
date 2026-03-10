# Vehicle Models Seed Script

## Overview
This seed script inserts all Kia and Hyundai vehicle models into the `vehicle_models` table. It's safe to run multiple times (uses UPSERT with unique constraint).

## Command to Run

```bash
# From project root
node backend/db/seeds/seed_vehicle_models.js

# Or from backend directory
cd backend
node db/seeds/seed_vehicle_models.js
```

## What It Does

1. **Ensures unique constraint exists** on `(marque, model)` (case-insensitive)
2. **Cleans up invalid rows** (null, empty, "Object", "[object Object]")
3. **Inserts 14 Kia models** (matching KiaCars.tsx)
4. **Inserts 22 Hyundai models** (matching HyundaiCars.tsx)
5. **Uses UPSERT** - skips duplicates, only inserts new models
6. **Prints summary** - inserted count, skipped count, total counts

## Expected Output

```
🌱 Starting vehicle models seed...
   Kia models: 14
   Hyundai models: 22
📋 Ensuring unique constraint exists...
✅ Unique constraint ready
🧹 Cleaning up invalid rows...
   Removed X invalid rows
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

## Manual Test Checklist

### 1. Database Verification
```sql
-- Check Kia models count
SELECT COUNT(*) FROM vehicle_models WHERE marque = 'Kia';
-- Expected: 14

-- Check Hyundai models count
SELECT COUNT(*) FROM vehicle_models WHERE marque = 'Hyundai';
-- Expected: 22

-- Check for invalid data
SELECT * FROM vehicle_models 
WHERE model IS NULL 
   OR TRIM(model) = ''
   OR LOWER(TRIM(model)) = 'object'
   OR LOWER(TRIM(model)) = '[object object]';
-- Expected: 0 rows

-- Check for duplicates
SELECT marque, model, COUNT(*) 
FROM vehicle_models 
GROUP BY marque, model 
HAVING COUNT(*) > 1;
-- Expected: 0 rows
```

### 2. Backend API Test
```bash
# Test GET /api/vehicleModels
curl http://localhost:YOUR_PORT/api/vehicleModels

# Expected response:
# {
#   "success": true,
#   "count": 36,
#   "data": [
#     { "id": 1, "marque": "Kia", "model": "kia rio 2010", ... },
#     ...
#   ]
# }

# Verify:
# - success: true
# - count: 36 (or more if other brands exist)
# - data is an array
# - All models have id, marque, model fields
# - No "Object" or "[object Object]" in model names
# - Models are ordered by marque, then model
```

### 3. Frontend Test (CatPage)

1. **Login as admin**
2. **Navigate to any category page** (e.g., `/cat/some-category`)
3. **Click "Ajouter un produit"** button
4. **Check "Compatibilité Véhicules" section**:
   - ✅ Should show "Chargement des modèles..." briefly
   - ✅ Should display list of models grouped by marque (Kia, Hyundai)
   - ✅ Should show search input "Rechercher un modèle..."
   - ✅ Should allow multi-select checkboxes
   - ✅ Should show selected models as chips
   - ✅ Should NOT show "Aucun modèle disponible" (unless API fails)

5. **Test search functionality**:
   - Type "rio" in search box
   - Should filter to show only models containing "rio"
   - Clear search, should show all models again

6. **Test selection**:
   - Select multiple models (checkboxes)
   - Should see selected chips below list
   - Click X on chip to remove selection
   - Selection should persist when scrolling

7. **Test error handling**:
   - If API fails, should show error message with "Réessayer" button
   - Click "Réessayer" should retry fetch
   - If 0 models, should show warning with "Réessayer" button

### 4. Console Logs Check

Open browser DevTools Console and check:
- ✅ `🔍 Fetching all vehicle models for admin product form...`
- ✅ `✅ Fetched X vehicle models`
- ✅ `✅ Validated X valid vehicle models (filtered Y invalid)`
- ❌ No errors about "useSearch must be used within a SearchProvider"
- ❌ No errors about invalid model data

### 5. Backend Logs Check

Check server console:
- ✅ `✅ GET /api/vehicleModels: Returning X valid models (filtered Y invalid)`
- ❌ No errors about database queries
- ❌ No warnings about invalid model data

## Troubleshooting

### Issue: "Aucun modèle disponible" still shows
- **Check**: Run seed script and verify models exist in DB
- **Check**: Backend API returns data (test with curl)
- **Check**: Browser console for errors
- **Check**: Network tab - is GET /api/vehicleModels returning 200?

### Issue: Seed script fails with "duplicate key" error
- **Solution**: The unique constraint is working. Models already exist.
- **Action**: Check existing models: `SELECT * FROM vehicle_models WHERE marque IN ('Kia', 'Hyundai')`

### Issue: Backend returns invalid data ("Object")
- **Solution**: Backend controller now filters invalid data automatically
- **Check**: Verify cleanup ran: `SELECT * FROM vehicle_models WHERE LOWER(model) = 'object'`

### Issue: Frontend shows wrong models
- **Check**: Clear browser cache
- **Check**: Verify `getAllVehicleModels()` is being called (not `getVehicleModelsByMarque`)
- **Check**: Check browser console for validation warnings

## Files Modified

1. **backend/db/seeds/seed_vehicle_models.js** (NEW)
2. **backend/config/initTables.js** (added unique constraint)
3. **backend/controllers/vehicleModelController.js** (added filtering)
4. **frontend/src/api/database.ts** (added validation)
5. **frontend/src/pages/CatPage.tsx** (uses getAllVehicleModels, added retry button)

## Notes

- Seed script preserves original casing (e.g., "kia rio 2010", "Hyundai I10")
- Unique constraint is case-insensitive (prevents "Kia" and "kia" duplicates)
- Backend filters invalid data automatically
- Frontend has minimal validation to prevent UI breakage
- All changes are backward compatible

