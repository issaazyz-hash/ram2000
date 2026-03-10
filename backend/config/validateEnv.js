/**
 * Environment Variables Validation
 * Validates all required environment variables on startup
 * Fails fast if critical variables are missing
 */

require('dotenv').config();

function validateEnvironment() {
  const required = {
    DB_HOST: process.env.DB_HOST || '127.0.0.1',
    DB_PORT: process.env.DB_PORT || '5432',
    DB_NAME: process.env.DB_NAME,
    DB_USER: process.env.DB_USER,
    DB_PASSWORD: process.env.DB_PASSWORD
  };

  const missing = [];
  
  if (!required.DB_NAME) missing.push('DB_NAME');
  if (!required.DB_USER) missing.push('DB_USER');
  if (!required.DB_PASSWORD) missing.push('DB_PASSWORD');

  if (missing.length > 0) {
    console.error('❌ [ENV] Missing required environment variables:');
    missing.forEach(varName => {
      console.error(`   - ${varName}`);
    });
    console.error('\n❌ [ENV] Set these in your .env file:');
    console.error('   DB_HOST=127.0.0.1');
    console.error('   DB_PORT=5432');
    console.error('   DB_NAME=azyz_db');
    console.error('   DB_USER=azyz_user');
    console.error('   DB_PASSWORD=azyz123');
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }

  console.log('✅ [ENV] Environment variables validated (DB config from backend/.env):');
  console.log(`   DB_HOST: ${required.DB_HOST}`);
  console.log(`   DB_PORT: ${required.DB_PORT}`);
  console.log(`   DB_NAME: ${required.DB_NAME}`);
  console.log(`   DB_USER: ${required.DB_USER}`);
  console.log(`   DB_PASSWORD: ${'*'.repeat(required.DB_PASSWORD.length)}`);
  
  return true;
}

module.exports = validateEnvironment;

