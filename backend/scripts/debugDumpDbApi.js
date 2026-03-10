/**
 * Diagnostic Script: Database and API Dump
 * 
 * This script collects comprehensive diagnostic information about:
 * - Database connection and configuration
 * - Table schemas and data
 * - API endpoints and responses
 * - Frontend data consumption patterns
 * 
 * Usage: npm run debug:dump
 * Output: DEBUG_DB_API_DUMP.md (repository root)
 * 
 * IMPORTANT: This script only READS data. It does NOT modify anything.
 */

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const pool = require('../db/pool');
const fs = require('fs');
const path = require('path');
const http = require('http');
const https = require('https');

const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3000';
const OUTPUT_FILE = path.join(__dirname, '..', '..', 'DEBUG_DB_API_DUMP.md');

let markdown = [];

function addSection(title, level = 1) {
  markdown.push('\n' + '#'.repeat(level) + ' ' + title + '\n');
}

function addCodeBlock(code, language = '') {
  markdown.push('\n```' + language + '\n' + code + '\n```\n');
}

function addText(text) {
  markdown.push(text + '\n');
}

// HTTP fetch implementation (no external dependencies)
function fetch(url, options = {}) {
  return new Promise((resolve, reject) => {
    try {
      const urlObj = new URL(url);
      const isHttps = urlObj.protocol === 'https:';
      const client = isHttps ? https : http;
      
      const req = client.request({
        hostname: urlObj.hostname,
        port: urlObj.port || (isHttps ? 443 : 80),
        path: urlObj.pathname + urlObj.search,
        method: options.method || 'GET',
        headers: options.headers || {},
      }, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          try {
            resolve({
              ok: res.statusCode >= 200 && res.statusCode < 300,
              status: res.statusCode,
              statusText: res.statusMessage,
              json: async () => JSON.parse(data),
              text: async () => data,
            });
          } catch (e) {
            reject(e);
          }
        });
      });
      req.on('error', reject);
      req.end();
    } catch (e) {
      reject(e);
    }
  });
}

async function queryDB(query, params = []) {
  const client = await pool.connect();
  try {
    const result = await client.query(query, params);
    return result.rows;
  } catch (error) {
    return { error: error.message };
  } finally {
    client.release();
  }
}

async function fetchAPI(endpoint) {
  try {
    const url = `${API_BASE_URL}${endpoint}`;
    const response = await fetch(url, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });
    
    if (!response.ok) {
      return { error: `HTTP ${response.status}: ${response.statusText}` };
    }
    
    const data = await response.json();
    return data;
  } catch (error) {
    return { error: error.message || String(error) };
  }
}

async function main() {
  markdown.push('# Database and API Diagnostic Dump\n');
  markdown.push(`Generated: ${new Date().toISOString()}\n`);
  markdown.push('This file contains comprehensive diagnostic information for debugging "Compatibilité Véhicules" issues.\n');

  const client = await pool.connect();
  
  try {
    // ==========================================
    // 1. DATABASE CONNECTION TARGET
    // ==========================================
    addSection('1. Database Connection Target', 1);
    
    addText('## Environment Variables (from .env)');
    const envVars = {
      DB_NAME: process.env.DB_NAME || 'NOT SET',
      DB_HOST: process.env.DB_HOST || '127.0.0.1',
      DB_PORT: process.env.DB_PORT || '5432',
      DB_USER: process.env.DB_USER || 'NOT SET',
      DB_PASSWORD: process.env.DB_PASSWORD ? '***HIDDEN***' : 'NOT SET',
    };
    addCodeBlock(JSON.stringify(envVars, null, 2), 'json');
    
    addText('## Actual Database Connection');
    const dbInfo = await queryDB(`
      SELECT 
        current_database() AS db,
        current_user AS user,
        inet_server_addr() AS host,
        inet_server_port() AS port,
        version() AS version
    `);
    addCodeBlock(JSON.stringify(dbInfo, null, 2), 'json');

    // ==========================================
    // 2. TABLE SCHEMAS
    // ==========================================
    addSection('2. Table Schemas', 1);
    
    const tablesToInspect = [
      'vehicle_models',
      'category_products',
      'section_content',
      'vehicles',
      'marques',
      'modeles',
      'car_brands',
      'category_product_vehicle_models',
      'vehicle_model_familles',
    ];
    
    for (const tableName of tablesToInspect) {
      addSection(`Table: ${tableName}`, 2);
      
      // Check if table exists
      const tableExists = await queryDB(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = $1
        )
      `, [tableName]);
      
      if (!tableExists[0]?.exists) {
        addText(`**Table does not exist.**\n`);
        continue;
      }
      
      // Column list
      addText('### Columns');
      const columns = await queryDB(`
        SELECT 
          column_name,
          data_type,
          character_maximum_length,
          is_nullable,
          column_default
        FROM information_schema.columns
        WHERE table_schema = 'public' 
        AND table_name = $1
        ORDER BY ordinal_position
      `, [tableName]);
      addCodeBlock(JSON.stringify(columns, null, 2), 'json');
      
      // Constraints and indexes
      addText('### Constraints and Indexes');
      const constraints = await queryDB(`
        SELECT
          tc.constraint_name,
          tc.constraint_type,
          kcu.column_name,
          ccu.table_name AS foreign_table_name,
          ccu.column_name AS foreign_column_name
        FROM information_schema.table_constraints AS tc
        JOIN information_schema.key_column_usage AS kcu
          ON tc.constraint_name = kcu.constraint_name
        LEFT JOIN information_schema.constraint_column_usage AS ccu
          ON ccu.constraint_name = tc.constraint_name
        WHERE tc.table_schema = 'public' 
        AND tc.table_name = $1
      `, [tableName]);
      addCodeBlock(JSON.stringify(constraints, null, 2), 'json');
      
      // Row count
      addText('### Row Count');
      const count = await queryDB(`SELECT COUNT(*) as count FROM ${tableName}`);
      addCodeBlock(JSON.stringify(count, null, 2), 'json');
      
      // Sample rows (first 10)
      addText('### Sample Rows (first 10)');
      let sampleRows;
      try {
        sampleRows = await queryDB(`SELECT * FROM ${tableName} ORDER BY id ASC LIMIT 10`);
      } catch (e) {
        // If no id column, try created_at or just any order
        try {
          sampleRows = await queryDB(`SELECT * FROM ${tableName} ORDER BY created_at DESC LIMIT 10`);
        } catch (e2) {
          sampleRows = await queryDB(`SELECT * FROM ${tableName} LIMIT 10`);
        }
      }
      addCodeBlock(JSON.stringify(sampleRows, null, 2), 'json');
    }

    // ==========================================
    // 3. VEHICLE_MODELS SPECIFIC ANALYSIS
    // ==========================================
    addSection('3. vehicle_models Table - Detailed Analysis', 1);
    
    // Counts by marque
    addText('## Counts by Marque');
    const countsByMarque = await queryDB(`
      SELECT marque, COUNT(*) as count 
      FROM vehicle_models 
      GROUP BY marque 
      ORDER BY marque
    `);
    addCodeBlock(JSON.stringify(countsByMarque, null, 2), 'json');
    
    // Invalid patterns
    addText('## Invalid Rows (Test Data)');
    const invalidRows = await queryDB(`
      SELECT * FROM vehicle_models
      WHERE marque IS NULL OR model IS NULL
         OR LENGTH(TRIM(COALESCE(marque, ''))) < 3
         OR LENGTH(TRIM(COALESCE(model, ''))) < 3
         OR LOWER(TRIM(COALESCE(model, ''))) IN ('object', '[object object]')
         OR LOWER(TRIM(COALESCE(marque, ''))) IN ('object', '[object object]')
      ORDER BY id ASC
    `);
    addCodeBlock(JSON.stringify(invalidRows, null, 2), 'json');
    addText(`**Found ${invalidRows.length} invalid rows.**\n`);
    
    // All Kia models
    addText('## All Kia Models');
    const kiaModels = await queryDB(`
      SELECT id, marque, model, created_at
      FROM vehicle_models
      WHERE marque = 'Kia'
      ORDER BY model
    `);
    addCodeBlock(JSON.stringify(kiaModels, null, 2), 'json');
    
    // All Hyundai models
    addText('## All Hyundai Models');
    const hyundaiModels = await queryDB(`
      SELECT id, marque, model, created_at
      FROM vehicle_models
      WHERE marque = 'Hyundai'
      ORDER BY model
    `);
    addCodeBlock(JSON.stringify(hyundaiModels, null, 2), 'json');

    // ==========================================
    // 4. API ENDPOINTS
    // ==========================================
    addSection('4. API Endpoints', 1);
    
    addText('## GET /api/vehicleModels');
    addText('**Route File:** `ram/bb/backend/routes/vehicleModels.js`');
    addText('**Handler:** `VehicleModelController.getAll`');
    addText('**SQL Query:** `SELECT * FROM vehicle_models ORDER BY marque, model`');
    addText('**Response Shape:** `{ success: true, count: number, data: VehicleModelData[] }`\n');
    
    const apiResponse = await fetchAPI('/api/vehicleModels');
    addText('### Live API Response');
    if (apiResponse.error) {
      addText(`**Error:** ${apiResponse.error}\n`);
    } else {
      addText(`**Count:** ${apiResponse.count || apiResponse.data?.length || 0}`);
      addText(`**Success:** ${apiResponse.success}`);
      addText('**Sample Data (first 30 items):**');
      const sampleData = Array.isArray(apiResponse.data) 
        ? apiResponse.data.slice(0, 30) 
        : apiResponse.data;
      addCodeBlock(JSON.stringify(sampleData, null, 2), 'json');
    }
    
    addText('\n## GET /api/vehicleModels/Kia');
    const kiaApiResponse = await fetchAPI('/api/vehicleModels/Kia');
    if (kiaApiResponse.error) {
      addText(`**Error:** ${kiaApiResponse.error}\n`);
    } else {
      addCodeBlock(JSON.stringify(kiaApiResponse, null, 2), 'json');
    }
    
    addText('\n## GET /api/vehicleModels/Hyundai');
    const hyundaiApiResponse = await fetchAPI('/api/vehicleModels/Hyundai');
    if (hyundaiApiResponse.error) {
      addText(`**Error:** ${hyundaiApiResponse.error}\n`);
    } else {
      addCodeBlock(JSON.stringify(hyundaiApiResponse, null, 2), 'json');
    }

    // ==========================================
    // 5. FRONTEND CONSUMPTION
    // ==========================================
    addSection('5. Frontend Data Consumption', 1);
    
    addText('## Function: getAllVehicleModels()');
    addText('**File:** `ram/bb/frontend/src/api/database.ts`');
    addText('**Lines:** 250-349');
    addText('**API Call:** `GET /api/vehicleModels`');
    addText('**Validation:** Filters models with length < 3, "Object", suspicious patterns');
    addText('**Returns:** `Promise<VehicleModelData[]>`\n');
    
    addText('## Usage in CatPage.tsx');
    addText('**File:** `ram/bb/frontend/src/pages/CatPage.tsx`');
    addText('**Lines:** 114-238');
    addText('**Trigger:** `useEffect` when `isAdmin && isAddingProduct === true`');
    addText('**State:** `allVehicleModels: VehicleModelData[]`');
    addText('**Grouping:** Models grouped by `marque` for UI display');
    addText('**Display:** Uses `model.model` for label, `model.id` for checkbox value\n');
    
    // Read actual frontend files for code snippets
    try {
      const databaseTsPath = path.join(__dirname, '..', '..', 'frontend', 'src', 'api', 'database.ts');
      if (fs.existsSync(databaseTsPath)) {
        const databaseTs = fs.readFileSync(databaseTsPath, 'utf8');
        const getAllVehicleModelsMatch = databaseTs.match(/export const getAllVehicleModels[\s\S]{1,500}/);
        if (getAllVehicleModelsMatch) {
          addText('### Code Snippet: getAllVehicleModels()');
          addCodeBlock(getAllVehicleModelsMatch[0].substring(0, 2000), 'typescript');
        }
      }
    } catch (e) {
      addText(`**Error reading frontend file:** ${e.message}\n`);
    }

    // ==========================================
    // 6. MISMATCH FINDINGS
    // ==========================================
    addSection('6. Mismatch Findings', 1);
    
    const findings = [];
    
    // Check if DB has data but API returns empty
    const dbCount = await queryDB('SELECT COUNT(*) as count FROM vehicle_models');
    const dbCountNum = parseInt(dbCount[0]?.count || 0);
    
    if (dbCountNum > 0 && apiResponse.count === 0) {
      findings.push('❌ **Database has rows but API returns empty** - Possible filtering issue in controller');
    }
    
    if (dbCountNum === 0) {
      findings.push('⚠️ **Database table is empty** - Seed script needs to be run');
    }
    
    // Check for invalid rows
    if (invalidRows.length > 0) {
      findings.push(`⚠️ **Found ${invalidRows.length} invalid rows** - Test data (BB, XCXV, etc.) needs cleanup`);
    }
    
    // Check expected counts
    const kiaCount = countsByMarque.find(r => r.marque === 'Kia')?.count || 0;
    const hyundaiCount = countsByMarque.find(r => r.marque === 'Hyundai')?.count || 0;
    
    if (kiaCount < 13) {
      findings.push(`⚠️ **Kia models missing** - Expected 13, found ${kiaCount}`);
    }
    
    if (hyundaiCount < 22) {
      findings.push(`⚠️ **Hyundai models missing** - Expected 22, found ${hyundaiCount}`);
    }
    
    // Check API response structure
    if (apiResponse && !apiResponse.success) {
      findings.push('❌ **API response missing success field** - Response structure mismatch');
    }
    
    if (apiResponse && apiResponse.data && !Array.isArray(apiResponse.data)) {
      findings.push('❌ **API data is not an array** - Response structure mismatch');
    }
    
    if (findings.length === 0) {
      findings.push('✅ **No obvious mismatches found** - Data flow appears correct');
    }
    
    findings.forEach(f => addText(f));

    // ==========================================
    // 7. ROOT CAUSE HYPOTHESES
    // ==========================================
    addSection('7. Likely Root Cause Hypotheses', 1);
    
    const hypotheses = [];
    
    if (dbCountNum === 0) {
      hypotheses.push('1. **Database not seeded** - The `vehicle_models` table is empty. Run `npm run seed:vehicle-models` to populate it.');
    }
    
    if (invalidRows.length > 0 && dbCountNum > 0) {
      hypotheses.push('2. **Invalid test data in database** - Table contains test rows (BB, XCXV, bbb, yy) that are being filtered out. Seed script should clean these up.');
    }
    
    if (dbCountNum > 0 && apiResponse.count === 0) {
      hypotheses.push('3. **Backend filtering too aggressive** - Database has rows but controller filters them all out. Check validation logic in `vehicleModelController.js`.');
    }
    
    if (kiaCount < 13 || hyundaiCount < 22) {
      hypotheses.push('4. **Incomplete seed data** - Seed script may not have run successfully or was interrupted. Verify seed script execution and check for errors.');
    }
    
    if (apiResponse && apiResponse.error) {
      hypotheses.push('5. **API endpoint not accessible** - Backend server may not be running or endpoint is misconfigured. Check server logs and CORS settings.');
    }
    
    if (findings.length === 0 && dbCountNum > 0 && apiResponse.count > 0) {
      hypotheses.push('6. **Frontend validation issue** - Database and API are correct, but frontend `getAllVehicleModels()` may be filtering out valid models. Check validation logic in `database.ts`.');
    }
    
    if (hypotheses.length === 0) {
      hypotheses.push('**No clear hypothesis** - All checks passed. Issue may be in UI rendering logic or state management.');
    }
    
    hypotheses.forEach(h => addText(h));

    // ==========================================
    // 8. RECOMMENDED ACTIONS
    // ==========================================
    addSection('8. Recommended Actions', 1);
    
    addText('1. **If database is empty:** Run `npm run seed:vehicle-models`');
    addText('2. **If invalid rows exist:** Run seed script (it cleans up invalid rows)');
    addText('3. **If API returns empty but DB has data:** Check backend console logs for filtering warnings');
    addText('4. **If counts are wrong:** Verify seed script completed successfully and check for unique constraint conflicts');
    addText('5. **If API is unreachable:** Ensure backend server is running on correct port');

  } catch (error) {
    addSection('ERROR', 1);
    addText(`**Fatal error during diagnostic:** ${error.message}`);
    addCodeBlock(error.stack, '');
  } finally {
    client.release();
  }
  
  // Write markdown file
  const content = markdown.join('\n');
  fs.writeFileSync(OUTPUT_FILE, content, 'utf8');
  console.log(`✅ Diagnostic dump written to: ${OUTPUT_FILE}`);
  
  // Close pool
  await pool.end();
}

// Run if called directly
if (require.main === module) {
  main()
    .then(() => {
      console.log('✅ Diagnostic script completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Diagnostic script failed:', error);
      process.exit(1);
    });
}

module.exports = main;

