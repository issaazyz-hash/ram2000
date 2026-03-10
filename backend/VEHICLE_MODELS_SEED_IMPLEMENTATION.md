# Vehicle Models Seed Implementation

## Summary

Implemented a safe seeding process to populate `vehicle_models` table with exact models from `KiaCars.tsx` and `HyundaiCars.tsx`.

## Files Created/Modified

### 1. SQL Seed File: `ram/bb/backend/db/seeds/seed_vehicle_models.sql`
- **Transaction-safe**: Wrapped in `BEGIN; ... COMMIT;`
- **Safe deletion**: Deletes ONLY invalid rows (preserves valid data)
- **Idempotent**: Uses `ON CONFLICT DO NOTHING`
- **Inserts**: 14 Kia models (13 unique due to duplicate) + 22 Hyundai models

### 2. Node.js Runner: `ram/bb/backend/scripts/seedVehicleModels.js`
- Reads and executes SQL seed file
- Validates results (exits with error if counts wrong)
- Logs verification counts and sample rows
- Safe to run multiple times

### 3. NPM Script: `ram/bb/backend/package.json`
- Already exists: `"seed:vehicle-models": "node scripts/seedVehicleModels.js"`

### 4. Auto-Seed in Development: `ram/bb/backend/server.js`
- Runs automatically in `NODE_ENV=development`
- Only seeds if table is empty OR contains only invalid rows
- Won't overwrite valid data

## Important Note: Kia Duplicate

KiaCars.tsx lists 14 models including both:
- "kia seltos" (lowercase)
- "kia Seltos" (capitalized)

Due to unique constraint on `LOWER(TRIM(model))`, only one will be inserted. Result: **13 unique Kia models** (not 14).

## Expected Results

After seeding:
- **Kia**: 13 models (14 attempted, 1 duplicate prevented)
- **Hyundai**: 22 models
- **Total**: 35 models

---

## Verification Commands

### 1. Run Seeding
```bash
cd ram/bb/backend && npm run seed:vehicle-models
```

**Expected Output:**
```
🌱 Starting vehicle models seed...
   Reading SQL file: db/seeds/seed_vehicle_models.sql
   Current rows in vehicle_models: X
📝 Executing SQL seed file...
🔍 Verifying results...

✅ Seed completed successfully!
📊 Results:
   Total models: 35 (was X)
   Hyundai: 22 models
   Kia: 13 models

📋 Sample rows (first 10):
   1. ID: 1, marque: "Hyundai", model: "Hyundai Accent"
   2. ID: 2, marque: "Hyundai", model: "Hyundai atos"
   ...

✅ Validation passed:
   ✓ Total: 35 (expected 35)
   ✓ Kia: 13 (expected 13, note: 14 attempted but duplicate prevented)
   ✓ Hyundai: 22 (expected 22)

✅ Seed script completed successfully
   Final counts: Kia=13, Hyundai=22, Total=35
🔌 Database connection closed
```

### 2. Query Database
```sql
SELECT marque, COUNT(*) FROM vehicle_models GROUP BY marque ORDER BY marque;
```

**Expected:**
```
marque  | count
--------+-------
Hyundai |    22
Kia     |    13
```

### 3. Test API
```bash
curl http://localhost:3000/api/vehicleModels | jq '.count'
```

**Expected:** `35`

**Full response check:**
```bash
curl http://localhost:3000/api/vehicleModels | jq '{count: .count, kia: [.data[] | select(.marque == "Kia")] | length, hyundai: [.data[] | select(.marque == "Hyundai")] | length}'
```

**Expected:**
```json
{
  "count": 35,
  "kia": 13,
  "hyundai": 22
}
```

### 4. Confirm UI
1. Navigate to `/cat/:slug` (any category) as admin
2. Click "Ajouter un produit"
3. Scroll to "Compatibilité Véhicules" section
4. **Should see:**
   - "KIA" section with 13 checkboxes
   - "HYUNDAI" section with 22 checkboxes
   - Search input works
   - Can select/deselect models
   - Selected models appear as chips
5. **Should NOT see:**
   - "Aucun modèle disponible"
   - "BB", "XCXV", "bbb", "yy" in the list

### 5. Check Browser Console
**Should see:**
- `✅ Fetched 35 vehicle models`
- `✅ Validated 35 valid vehicle models`

**Should NOT see:**
- `❌ [CRITICAL] No valid vehicle models found!`

---

## Auto-Seed in Development

When `NODE_ENV=development`, the server automatically checks `vehicle_models` on startup:
- If table is empty → auto-seeds
- If table has only invalid rows → auto-seeds
- If table has valid rows → skips seeding

**Console output:**
```
🔄 [DEV] Checking vehicle_models table for auto-seed...
⚠️  [DEV] vehicle_models has 0 total rows (0 valid), auto-seeding...
✅ [DEV] Vehicle models auto-seeded successfully
```

OR

```
🔄 [DEV] Checking vehicle_models table for auto-seed...
✅ [DEV] vehicle_models already has 35 valid rows, skipping auto-seed
```

---

## Safety Features

1. **Transaction Safety**: All operations wrapped in `BEGIN; ... COMMIT;`
2. **Selective Deletion**: Only deletes invalid rows, preserves valid data
3. **Idempotent**: Uses `ON CONFLICT DO NOTHING` - safe to run multiple times
4. **Validation**: Script exits with error code if counts are incorrect
5. **Exact Casing**: Uses exact model names as found in KiaCars.tsx and HyundaiCars.tsx
6. **Development Auto-Seed**: Only runs in development, checks for valid rows before seeding

---

## Troubleshooting

**If seed fails:**
1. Check database connection: `npm run test:db`
2. Check if unique constraint exists: `\d vehicle_models` in psql
3. Check for foreign key constraints

**If API returns 0 models:**
1. Check backend console for [DEBUG] logs
2. Verify seed ran successfully: `SELECT COUNT(*) FROM vehicle_models;`
3. Check for validation errors in backend logs

**If frontend shows empty:**
1. Check browser console for API errors
2. Verify `getApiBaseUrl()` points to correct backend URL
3. Check CORS settings
4. Verify admin is logged in

