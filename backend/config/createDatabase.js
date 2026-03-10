/**
 * Create Database Script
 * Creates the PostgreSQL database if it doesn't exist
 * This script runs BEFORE the main database connection to ensure the DB exists
 */

// dotenv should be loaded by server.js first, but load here as fallback
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const { Client } = require('pg');

async function createDatabaseIfNotExists() {
  // CRITICAL: Must use environment variables - NO defaults for user
  if (!process.env.DB_NAME || !process.env.DB_USER || !process.env.DB_PASSWORD) {
    throw new Error(
      'Missing required database environment variables: DB_NAME, DB_USER, DB_PASSWORD. ' +
      'Set these in your .env file.'
    );
  }

  const dbName = process.env.DB_NAME;
  const dbUser = process.env.DB_USER; // NO default - must come from .env
  const dbPassword = process.env.DB_PASSWORD;
  const dbHost = process.env.DB_HOST || '127.0.0.1';
  const dbPort = parseInt(process.env.DB_PORT || '5432', 10);

  // Connect to PostgreSQL server (using 'postgres' database by default to create target DB)
  // Use the SAME user credentials from .env, not the postgres superuser
  const adminClient = new Client({
    user: dbUser, // Use DB_USER from .env (e.g., 'azyz_user')
    host: dbHost,
    port: dbPort,
    password: dbPassword,
    database: 'postgres' // Connect to default postgres database first (only DB name, not user)
  });

  try {
    await adminClient.connect();
    console.log(`✅ [DB] Connected to PostgreSQL server (${dbHost}:${dbPort}) as user '${dbUser}'`);

    // Check if database exists
    const checkDbResult = await adminClient.query(
      `SELECT 1 FROM pg_database WHERE datname = $1`,
      [dbName]
    );

    if (checkDbResult.rows.length === 0) {
      // Database doesn't exist - create it
      console.log(`🔄 [DB] Database '${dbName}' does not exist. Creating...`);
      await adminClient.query(`CREATE DATABASE "${dbName}"`);
      console.log(`✅ [DB] Database '${dbName}' created successfully`);
    } else {
      console.log(`ℹ️  [DB] Database '${dbName}' already exists`);
    }

    await adminClient.end();
    return true;
  } catch (error) {
    await adminClient.end();
    
    if (error.code === '28P01') {
      // Authentication failed - check if user exists and password is correct
      throw new Error(`Authentication failed for user '${dbUser}'. Check DB_USER and DB_PASSWORD. If user doesn't exist, create it: CREATE USER ${dbUser} WITH PASSWORD '${dbPassword}';`);
    } else if (error.code === '3D000') {
      // Cannot connect to 'postgres' database - user may lack permissions
      console.warn(`⚠️  [DB] User '${dbUser}' cannot connect to 'postgres' database. This may require CREATEDB privilege or manual database creation.`);
      throw new Error(`User '${dbUser}' cannot connect to 'postgres' database. Grant CREATEDB: ALTER USER ${dbUser} CREATEDB; OR create database manually as postgres superuser.`);
    } else if (error.code === 'ECONNREFUSED') {
      throw new Error(`Cannot connect to PostgreSQL server at ${dbHost}:${dbPort}. Ensure PostgreSQL is running.`);
    } else if (error.code === '42P04') {
      // Database already exists (this is fine)
      console.log(`ℹ️  [DB] Database '${dbName}' already exists`);
      return true;
    } else {
      throw new Error(`Failed to create database: ${error.message} (code: ${error.code})`);
    }
  }
}

// Export for use in server startup
module.exports = createDatabaseIfNotExists;

// Run if called directly
if (require.main === module) {
  createDatabaseIfNotExists()
    .then(() => {
      console.log('✅ Database setup completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Database setup failed:', error.message);
      process.exit(1);
    });
}

