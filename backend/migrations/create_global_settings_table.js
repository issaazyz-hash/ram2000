/**
 * Migration: Create global_settings table
 * Ensures the global_settings table exists with all required columns
 */

const pool = require('../db/pool');

async function createGlobalSettingsTable() {
  const client = await pool.connect();
  
  try {
    // Create the table if it doesn't exist
    await client.query(`
      CREATE TABLE IF NOT EXISTS global_settings (
        id SERIAL PRIMARY KEY,
        setting_key TEXT UNIQUE NOT NULL,
        setting_value JSONB,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);

  } catch (error) {
    console.error('❌ Error creating global_settings table:', error.message);
    throw error;
  } finally {
    client.release();
  }
}

module.exports = createGlobalSettingsTable;
