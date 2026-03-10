/**
 * Centralized PostgreSQL Connection Pool
 * Single source of truth for database connection
 * All models and controllers should import from this file
 */

// dotenv should be loaded by server.js first, but load here as fallback
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const { Pool } = require('pg');

// Validate required environment variables
if (!process.env.DB_USER || !process.env.DB_NAME || !process.env.DB_PASSWORD) {
  throw new Error(
    'Missing required database environment variables: DB_USER, DB_NAME, DB_PASSWORD. ' +
    'Set these in your .env file.'
  );
}

// Database configuration
const dbConfig = {
  user: process.env.DB_USER,
  host: process.env.DB_HOST || '127.0.0.1',
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: parseInt(process.env.DB_PORT || '5432', 10),
  max: 20,
  min: 2,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
  statement_timeout: 30000,
  query_timeout: 30000,
};

// Create and export the pool instance directly
let pool = null;

try {
  pool = new Pool(dbConfig);

  // Handle pool errors
  pool.on('error', (err) => {
    console.error('❌ [DB] Pool error:', err.message);
  });

  // Log successful connection
  pool.on('connect', () => {
    console.log('🔌 [DB] New client connected to PostgreSQL');
  });

  console.log('✅ [DB] Connection pool created');
  console.log('[DB] PostgreSQL pool ready');
  console.log(`   Database: ${dbConfig.database}`);
  console.log(`   Host: ${dbConfig.host}:${dbConfig.port}`);
  console.log(`   User: ${dbConfig.user}`);
  console.log(`   Password: ${'*'.repeat(Math.min(dbConfig.password?.length || 0, 8))} (hidden)`);
} catch (error) {
  console.error('❌ [DB] Failed to create connection pool:', error.message);
  throw error;
}

// Export the pool instance directly (not a function)
module.exports = pool;

