/**
 * Production Database Configuration
 * Centralized database connection for production
 * NO DEMO MODE - Database is required
 */

require('dotenv').config();
const { Pool } = require('pg');

// Production database configuration - NO DEFAULTS (must come from .env)
// Validate required environment variables
if (!process.env.DB_USER || !process.env.DB_NAME || !process.env.DB_PASSWORD) {
  throw new Error(
    'Missing required database environment variables: DB_USER, DB_NAME, DB_PASSWORD. ' +
    'Set these in your .env file.'
  );
}

const config = {
  user: process.env.DB_USER, // NO default - must come from .env
  host: process.env.DB_HOST || '127.0.0.1',
  database: process.env.DB_NAME, // NO default - must come from .env
  password: process.env.DB_PASSWORD, // NO default - must come from .env
  port: parseInt(process.env.DB_PORT || '5432', 10),
  max: 20,
  min: 2,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
  statement_timeout: 30000,
  query_timeout: 30000,
};

// Validate required configuration
const requiredVars = ['DB_USER', 'DB_NAME', 'DB_PASSWORD'];
const missingVars = requiredVars.filter(varName => !process.env[varName] && !config[varName.toLowerCase().replace('db_', '')]);

if (missingVars.length > 0 && process.env.NODE_ENV === 'production') {
  console.error('❌ [DB] Missing required environment variables:', missingVars.join(', '));
  console.error('❌ [DB] Production mode requires database configuration');
  process.exit(1);
}

let pool = null;
let connectionVerified = false;

// Create connection pool
try {
  pool = new Pool(config);

  pool.on('error', (err) => {
    console.error('❌ [DB] Pool error:', err.message);
    console.error('❌ [DB] This should not happen in production');
  });

  console.log('✅ [DB] Connection pool created');
} catch (error) {
  console.error('❌ [DB] Failed to create connection pool:', error.message);
  if (process.env.NODE_ENV === 'production') {
    process.exit(1);
  }
  throw error;
}

/**
 * Test database connection
 * @param {number} retries - Number of retry attempts
 * @param {number} delay - Delay between retries in ms
 * @returns {Promise<Object>} Connection test result
 */
async function testConnection(retries = 3, delay = 2000) {
  if (!pool) {
    const error = 'Database pool not initialized';
    console.error(`❌ [DB] ${error}`);
    return { success: false, error, disabled: false };
  }

  for (let attempt = 1; attempt <= retries; attempt++) {
    let client;
    try {
      console.log(`🔄 [DB] Connection attempt ${attempt}/${retries}...`);
      client = await pool.connect();
      
      // Test basic query
      const dbCheck = await client.query('SELECT current_database(), version()');
      const dbName = dbCheck.rows[0].current_database;
      const dbVersion = dbCheck.rows[0].version.split(' ')[0] + ' ' + dbCheck.rows[0].version.split(' ')[1];
      
      // Verify database name matches config
      if (dbName !== config.database) {
        throw new Error(`Wrong database: ${dbName}, expected: ${config.database}`);
      }
      
      // Test timestamp query
      await client.query('SELECT NOW()');
      
      client.release();
      connectionVerified = true;
      
      console.log(`✅ [DB] Connected successfully to database: ${dbName}`);
      console.log(`✅ [DB] PostgreSQL version: ${dbVersion}`);
      console.log(`✅ [DB] Connection verified: ${connectionVerified}`);
      
      return { 
        success: true, 
        database: dbName,
        version: dbVersion,
        verified: true
      };
      
    } catch (error) {
      if (client) {
        client.release();
      }
      
      const errorMessages = {
        '28P01': `Authentication failed - check DB_USER (${config.user}) and DB_PASSWORD`,
        '3D000': `Database '${config.database}' does not exist`,
        'ECONNREFUSED': `Connection refused - check DB_HOST (${config.host}) and DB_PORT (${config.port})`,
        'ENOTFOUND': `Host not found: ${config.host}`,
      };
      
      const errorMessage = errorMessages[error.code] || error.message;
      
      if (attempt === retries) {
        console.error(`❌ [DB] Connection failed after ${retries} attempts`);
        console.error(`❌ [DB] Error: ${errorMessage}`);
        console.error(`❌ [DB] Code: ${error.code || 'UNKNOWN'}`);
        
        if (process.env.NODE_ENV === 'production') {
          console.error('❌ [DB] Production mode requires database connection');
          process.exit(1);
        }
        
        return { 
          success: false, 
          error: errorMessage, 
          code: error.code,
          disabled: false 
        };
      }
      
      console.warn(`⚠️  [DB] Attempt ${attempt} failed: ${errorMessage}`);
      console.warn(`⚠️  [DB] Retrying in ${delay}ms...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
}

/**
 * Get database pool (throws if not available)
 */
function getPool() {
  if (!pool) {
    throw new Error('Database pool is not initialized');
  }
  return pool;
}

/**
 * Check if connection is verified
 */
function isVerified() {
  return connectionVerified;
}

module.exports = {
  pool: pool,
  getPool,
  testConnection,
  connectionVerified: () => connectionVerified,
  isVerified,
  config
};

