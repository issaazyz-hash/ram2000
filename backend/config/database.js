/**
 * Database Configuration - Production Ready
 * PostgreSQL connection with proper error handling and logging
 * 
 * NOTE: This module RE-USES the pool from db/pool.js to avoid duplicate connections.
 * All models and controllers should import directly from db/pool.js.
 * This module provides server-level utilities (testConnection, isConnected, etc.)
 */

// dotenv should be loaded by server.js first, but load here as fallback
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

// Import the SINGLE pool instance from db/pool.js (no duplicate pools!)
const pool = require('../db/pool');

// Track connection verification status
let connectionVerified = false;

// Get database config for logging/error messages (same as db/pool.js uses)
const dbConfig = {
  user: process.env.DB_USER,
  host: process.env.DB_HOST || '127.0.0.1',
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: parseInt(process.env.DB_PORT || '5432', 10),
};

/**
 * Test database connection
 * @param {number} retries - Number of retry attempts
 * @param {number} delay - Delay between retries in ms
 * @returns {Promise<Object>} Connection test result
 */
async function testConnection(retries = 3, delay = 2000) {
  if (!pool) {
    throw new Error('Database pool not initialized');
  }

  for (let attempt = 1; attempt <= retries; attempt++) {
    let client;
    try {
      client = await pool.connect();
      
      // Test query
      const dbCheck = await client.query('SELECT current_database(), version()');
      const dbName = dbCheck.rows[0].current_database;
      const dbVersion = dbCheck.rows[0].version.split(',')[0]; // First line of version
      
      // Verify we're connected to the correct database
      if (dbName !== dbConfig.database) {
        throw new Error(`Wrong database: ${dbName}, expected: ${dbConfig.database}`);
      }

      // Test write capability
      await client.query('SELECT NOW()');
      
      client.release();
      
      connectionVerified = true;
      console.log('✅ [DB] Database connection test successful');
      console.log(`   Database: ${dbName}`);
      console.log(`   Version: ${dbVersion}`);
      console.log(`   Host: ${dbConfig.host}:${dbConfig.port}`);
      console.log(`   User: ${dbConfig.user}`);
      console.log(`   Password: ${'*'.repeat(Math.min(dbConfig.password?.length || 0, 8))} (hidden)`);
      
      return { 
        success: true, 
        database: dbName,
        version: dbVersion,
        host: dbConfig.host,
        port: dbConfig.port
      };
      
    } catch (error) {
      if (client) {
        client.release();
      }
      
      if (attempt === retries) {
        connectionVerified = false;
        
        // Detailed error messages with explicit auth error handling
        let errorMessage = error.message;
        if (error.code === '28P01') {
          errorMessage = `Authentication failed for user '${dbConfig.user}'. Verify DB_USER and DB_PASSWORD in .env file. User may not exist or password is incorrect.`;
          console.error('❌ [DB] AUTHENTICATION ERROR - Check your .env file:');
          console.error(`   DB_USER=${dbConfig.user}`);
          console.error(`   DB_PASSWORD=${dbConfig.password ? '***SET***' : 'NOT SET'}`);
          console.error(`   DB_NAME=${dbConfig.database}`);
          console.error(`   DB_HOST=${dbConfig.host}`);
        } else if (error.code === '3D000') {
          errorMessage = `Database '${dbConfig.database}' does not exist. 
          
To create it, run one of these:
1. Automatic: node backend/config/createDatabase.js
2. Manual SQL: psql -U ${dbConfig.user} -c "CREATE DATABASE ${dbConfig.database};"
3. SQL file: psql -U ${dbConfig.user} -f backend/db/create_database.sql`;
        } else if (error.code === 'ECONNREFUSED') {
          errorMessage = `Connection refused - PostgreSQL is not running or not reachable at ${dbConfig.host}:${dbConfig.port}. ` +
            'Start the PostgreSQL service (Windows: see POSTGRES_STARTUP_FIX_GUIDE.md for commands).';
        } else if (error.code === 'ENOTFOUND') {
          errorMessage = `Host '${dbConfig.host}' not found`;
        }
        
        console.error('❌ [DB] Connection failed after', retries, 'attempts');
        console.error('❌ [DB] Error:', errorMessage);
        console.error('❌ [DB] Error Code:', error.code || 'UNKNOWN');
        if (error.code === 'ECONNREFUSED') {
          console.error('💡 [DB] What to do: Start PostgreSQL service, then run npm start again. See POSTGRES_STARTUP_FIX_GUIDE.md at project root.');
        }
        
        throw new Error(`Database connection failed: ${errorMessage}`);
      }
      
      console.warn(`⚠️  [DB] Connection attempt ${attempt}/${retries} failed, retrying in ${delay}ms...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
}

/**
 * Get connection pool (re-exports from db/pool.js)
 * @returns {Pool} PostgreSQL connection pool
 */
function getPool() {
  // Pool is imported from db/pool.js - just return it
  if (!pool) {
    throw new Error('Database pool not initialized. Check db/pool.js and ensure .env is loaded.');
  }
  return pool;
}

/**
 * Check if database connection is verified
 * @returns {boolean}
 */
function isConnected() {
  return connectionVerified;
}

/**
 * Close database connections gracefully
 * NOTE: This closes the shared pool - use with caution in production
 */
async function close() {
  if (pool) {
    await pool.end();
    console.log('🔌 [DB] Connection pool closed');
    connectionVerified = false;
  }
}

// Export
module.exports = {
  pool: getPool,
  testConnection,
  isConnected,
  close,
  connectionVerified: () => connectionVerified,
  // Legacy support (for backward compatibility)
  isDisabled: () => !pool || !connectionVerified
};
