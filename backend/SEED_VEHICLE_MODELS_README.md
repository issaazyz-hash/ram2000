# Vehicle Models Seed Script

## Purpose

This seed script populates the `vehicle_models` table with exact vehicle models from `KiaCars.tsx` and `HyundaiCars.tsx` to fix the "Compatibilité Véhicules" field in the admin product form.

## Usage

```bash
cd ram/bb/backend && npm run seed:vehicle-models
```

## What It Does

1. **Connects to database** using the same pool configuration as the backend server
2. **Runs in a transaction** for safety (rolls back on error)
3. **Truncates `vehicle_models` table** to remove all existing rows (including test data)
4. **Inserts exactly:**
   - 14 Kia models (13 unique due to duplicate "kia seltos"/"kia Seltos")
   - 22 Hyundai models
   - Total: 35 unique models
5. **Verifies counts** and rolls back if incorrect
6. **Prints summary** to console

## Expected Output

```
🌱 Starting vehicle models seed...
   Kia models to insert: 14
   Hyundai models to insert: 22
   Total: 36
🗑️  Truncating vehicle_models table...
   ✅ Truncated successfully
🚗 Inserting Kia models...
   ✅ Inserted: Kia | kia rio 2010
   ...
   ⚠️  Skipped (duplicate): Kia | kia Seltos
🚗 Inserting Hyundai models...
   ✅ Inserted: Hyundai | Hyundai I10
   ...
🔍 Verifying results...

✅ Seed completed successfully!
📊 Results:
   Total models: 35
   Kia: 13 (14 attempted, 1 duplicates skipped)
   Hyundai: 22

✅ Seed done: Kia=13 Hyundai=22 Total=35
   Note: 14 Kia models attempted but "kia seltos" and "kia Seltos" conflict under unique constraint
```

## Important Notes

### Duplicate Handling

The script attempts to insert 14 Kia models, but "kia seltos" and "kia Seltos" conflict due to the unique constraint on `LOWER(TRIM(model))`. Only one will be inserted, resulting in **13 unique Kia models** (not 14).

This is expected behavior and matches the actual unique constraint in the database.

### Safety Features

- **Transaction-safe**: All operations wrapped in `BEGIN; ... COMMIT;`
- **Idempotent**: Safe to run multiple times
- **Validation**: Verifies counts and rolls back if incorrect
- **Error handling**: Catches and reports all errors clearly

## Verification

After running the seed, verify:

1. **Database:**
   ```sql
   SELECT marque, COUNT(*) FROM vehicle_models GROUP BY marque ORDER BY marque;
   ```
   Expected: Kia: 13, Hyundai: 22

2. **API:**
   ```bash
   curl http://localhost:3000/api/vehicleModels | jq '.count'
   ```
   Expected: 35

3. **Frontend:**
   - Navigate to `/cat/:slug` as admin
   - Click "Ajouter un produit"
   - Check "Compatibilité Véhicules" section
   - Should show KIA (13) and HYUNDAI (22) groups

## Troubleshooting

**If seed fails:**
- Check database connection: `npm run test:db`
- Check if unique constraint exists
- Check backend console for detailed error messages

**If counts are wrong:**
- Check for foreign key constraints preventing TRUNCATE
- Verify unique constraint is working correctly
- Check backend console logs for skipped duplicates

