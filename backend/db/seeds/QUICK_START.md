# Quick Start - Fix Vehicle Models Data Integrity

## The Problem
"Compatibilité Véhicules" shows wrong values (BB, XCXV, bbb, yy) because database is missing real models.

## The Solution (2 Commands)

```bash
cd ram/bb/backend

# Step 1: Remove bad data
node db/seeds/cleanup_vehicle_models.js

# Step 2: Insert real models
node db/seeds/seed_vehicle_models_kia_hyundai.js
```

## Verify It Worked

1. **Check database:**
   ```sql
   SELECT marque, COUNT(*) FROM vehicle_models GROUP BY marque;
   -- Should show: Kia: 14, Hyundai: 22
   ```

2. **Test API:**
   ```bash
   curl http://localhost:PORT/api/vehicleModels | jq '.count'
   -- Should return: 36
   ```

3. **Test UI:**
   - Login as admin
   - Go to `/cat/some-category`
   - Click "Ajouter un produit"
   - Check "Compatibilité Véhicules" section
   - Should show KIA and HYUNDAI groups with real models
   - Should NOT show "BB", "XCXV", "bbb", "yy"

## What Gets Inserted

- **14 Kia models**: kia rio 2010, kia picanto, kia seltos, etc.
- **22 Hyundai models**: Hyundai I10, Hyundai i20, Hyundai tucson, etc.

## What Gets Removed

- Rows with marque/model length <= 2 (BB, yy, XCXV, bbb)
- Rows with "Object" or "[object Object]"
- NULL/empty values

## Need More Details?

See `EXECUTION_GUIDE.md` for complete troubleshooting and verification steps.

