# Vehicle Model Familles Seed Script

## Purpose

This seed script populates the `vehicle_model_familles` pivot table to enable model-specific filtering of familles on `/pieces-dispo/:id` pages while maintaining backward compatibility.

## Usage

```bash
cd ram/bb/backend && npm run seed:vehicle-model-familles
```

## What It Does

1. **Connects to database** using the same pool configuration as the backend server
2. **Runs in a transaction** for safety (rolls back on error)
3. **Ensures table exists** (creates if missing)
4. **Reads famille_categories** from `section_content` table
5. **Extracts famille IDs** robustly:
   - Handles array format: `[{id: "fam1", ...}, ...]`
   - Handles object with items: `{items: [{id: "fam1", ...}, ...]}`
   - Handles object with categories: `{categories: [{id: "fam1", ...}, ...]}`
   - Extracts ID from: `famille.id` → `famille.famille_id` → `famille.slug`
6. **Inserts cross product**: All vehicle_models × All familles
7. **Verifies results** and prints summary

## Expected Output

```
🌱 Starting vehicle_model_familles seed...
   Found 35 vehicle models
   Found famille_categories section
   Content is array with 12 items
   Extracted 12 famille IDs
   Inserting 35 models × 12 familles = 420 associations...

✅ Seed completed successfully!
📊 Results:
   Total associations: 420
   Expected: 420 (35 models × 12 familles)
   Inserted: 420
   Skipped (already exists): 0

📋 Sample associations (first 5 models):
   Model ID 1: 12 familles
   Model ID 2: 12 familles
   ...

✅ Seed script completed successfully
   Final count: 420 associations
🔌 Database connection closed
```

## Backward Compatibility

This seed creates associations for **ALL models × ALL familles**, ensuring:
- All existing models see all familles (backward compatible)
- Admin can later customize which familles appear for specific models
- If pivot table is missing or empty, API falls back to showing all familles

## Verification

### SQL Verification

Run the verification queries:
```bash
psql -d your_database -f backend/db/migrations/verify_vehicle_model_familles.sql
```

Or manually:
```sql
-- Check table exists
SELECT to_regclass('public.vehicle_model_familles') as table_exists;

-- Count associations
SELECT COUNT(*) FROM vehicle_model_familles;

-- Count per model
SELECT model_id, COUNT(*) FROM vehicle_model_familles GROUP BY model_id ORDER BY model_id LIMIT 5;
```

### API Verification

1. **Without modelId (should return all familles):**
   ```bash
   curl http://localhost:3000/api/sectionContent?sectionType=famille_categories | jq '.data.content | length'
   ```

2. **With modelId (should return filtered familles):**
   ```bash
   curl http://localhost:3000/api/sectionContent?sectionType=famille_categories&modelId=1 | jq '.data.content | length'
   ```
   Expected: Same count as without modelId (all models see all familles initially)

3. **Check backend logs:**
   - Should see: `✅ [FILTER] Filtering familles for modelId=1, allowed count: 12`
   - Should NOT see: `⚠️ [FALLBACK]` (unless table is missing)

### Frontend Verification

1. Navigate to `/pieces-dispo/1` (any model ID)
2. Check "Familles des pièces" section
3. Should display all familles (backward compatible)
4. Should NOT show 500 error

## Troubleshooting

**If seed fails:**
- Check if `vehicle_models` table is populated: `SELECT COUNT(*) FROM vehicle_models;`
- Check if `section_content` has `famille_categories`: `SELECT * FROM section_content WHERE section_type = 'famille_categories';`
- Verify content structure matches expected formats

**If API returns 500:**
- Check backend logs for error details
- Verify table exists: `SELECT to_regclass('public.vehicle_model_familles');`
- Check if seed script ran successfully

**If API falls back to all familles:**
- Check backend logs for `⚠️ [FALLBACK]` messages
- Verify pivot table has data: `SELECT COUNT(*) FROM vehicle_model_familles;`
- Run seed script if table is empty

## Safety Features

- **Transaction-safe**: All operations wrapped in `BEGIN; ... COMMIT;`
- **Idempotent**: Safe to run multiple times (uses `ON CONFLICT DO NOTHING`)
- **Error handling**: Catches and reports all errors clearly
- **Backward compatible**: Creates associations for all models × all familles

