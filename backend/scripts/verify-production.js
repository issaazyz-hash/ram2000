/**
 * Production Verification Script
 * Verifies that the backend is production-ready
 */

require('dotenv').config();
const dbModule = require('../config/database');

async function verifyProduction() {
  console.log('🔍 Verifying production readiness...\n');

  const checks = {
    database: false,
    tables: false,
    admin: false
  };

  try {
    // Check 1: Database connection
    console.log('1️⃣  Checking database connection...');
    try {
      const result = await dbModule.testConnection();
      if (result.success) {
        checks.database = true;
        console.log('   ✅ Database connected successfully');
        console.log(`   Database: ${result.database}`);
      } else {
        console.log('   ❌ Database connection failed');
      }
    } catch (error) {
      console.log('   ❌ Database connection error:', error.message);
    }

    // Check 2: Verify tables exist
    if (checks.database) {
      console.log('\n2️⃣  Checking database tables...');
      try {
        const pool = dbModule.pool();
        const client = await pool.connect();
        try {
          const result = await client.query(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_type = 'BASE TABLE'
            ORDER BY table_name
          `);

          const criticalTables = ['users', 'products', 'brands', 'categories', 'orders', 'admin_logs'];
          const existingTables = result.rows.map(r => r.table_name);
          const missingTables = criticalTables.filter(t => !existingTables.includes(t));

          if (missingTables.length === 0) {
            checks.tables = true;
            console.log('   ✅ All critical tables exist');
            console.log(`   Found ${result.rows.length} tables total`);
          } else {
            console.log('   ❌ Missing critical tables:', missingTables.join(', '));
          }
        } finally {
          client.release();
        }
      } catch (error) {
        console.log('   ❌ Error checking tables:', error.message);
      }
    }

    // Check 3: Verify admin user exists
    if (checks.database && checks.tables) {
      console.log('\n3️⃣  Checking admin user...');
      try {
        const pool = dbModule.pool();
        const client = await pool.connect();
        try {
          const result = await client.query(
            'SELECT id, name, email, is_admin FROM users WHERE is_admin = true LIMIT 1'
          );

          if (result.rows.length > 0) {
            checks.admin = true;
            console.log('   ✅ Admin user exists');
            console.log(`   Email: ${result.rows[0].email}`);
          } else {
            console.log('   ⚠️  No admin user found');
            console.log('   Run: npm run register-admin');
          }
        } finally {
          client.release();
        }
      } catch (error) {
        console.log('   ❌ Error checking admin:', error.message);
      }
    }

    // Summary
    console.log('\n' + '='.repeat(50));
    console.log('📊 Verification Summary:');
    console.log('='.repeat(50));
    console.log(`Database Connection: ${checks.database ? '✅' : '❌'}`);
    console.log(`Database Tables: ${checks.tables ? '✅' : '❌'}`);
    console.log(`Admin User: ${checks.admin ? '✅' : '⚠️ '}`);
    console.log('='.repeat(50));

    if (checks.database && checks.tables) {
      console.log('\n✅ Backend is production-ready!');
      if (!checks.admin) {
        console.log('⚠️  Remember to create an admin user: npm run register-admin');
      }
      process.exit(0);
    } else {
      console.log('\n❌ Backend is NOT production-ready');
      console.log('   Please fix the issues above');
      process.exit(1);
    }
  } catch (error) {
    console.error('\n❌ Verification failed:', error.message);
    process.exit(1);
  }
}

// Run verification
verifyProduction();

