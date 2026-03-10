/**
 * Register Fixed Admin User - Production Ready
 * 
 * Registers a fixed admin user with predefined credentials:
 * - Email: admin123@exe.com
 * - Password: admin123 (hashed with bcrypt)
 * - Role: admin
 * - is_admin: true
 * 
 * This script:
 * - Requires database connection (no demo mode)
 * - Checks if admin already exists (no duplication)
 * - Hashes password securely (bcrypt, 10 rounds)
 * - Fails fast if database is unavailable
 * 
 * Usage:
 *   - Called automatically during server startup
 *   - Can be run manually: node scripts/register-fixed-admin.js
 */

require('dotenv').config();
const bcrypt = require('bcrypt');
const pool = require('../db/pool');

// Fixed admin credentials
const FIXED_ADMIN = {
  email: 'admin123@exe.com',
  password: 'admin123',
  name: 'Admin User',
  role: 'admin',
  is_admin: true
};

/**
 * Check if admin user already exists in database
 */
async function adminExistsInDatabase() {
  const result = await pool.query(
    'SELECT id, email, is_admin FROM users WHERE email = $1',
    [FIXED_ADMIN.email.toLowerCase().trim()]
  );
  
  if (result.rows.length > 0) {
    const user = result.rows[0];
    // Check if it's already an admin
    return {
      exists: true,
      isAdmin: user.is_admin === true,
      userId: user.id
    };
  }
  
  return { exists: false, isAdmin: false };
}

/**
 * Register admin user in database
 */
async function registerAdminInDatabase() {
  // Check if admin already exists
  const checkResult = await adminExistsInDatabase();
  
  if (checkResult.exists) {
    if (checkResult.isAdmin) {
      // Admin already exists and is already an admin - skip
      return {
        success: true,
        skipped: true,
        message: 'Admin user already exists - skipping creation',
        user: {
          email: FIXED_ADMIN.email,
          is_admin: true
        }
      };
    } else {
      // User exists but is not admin - update to admin
      const saltRounds = 10;
      const hashedPassword = await bcrypt.hash(FIXED_ADMIN.password, saltRounds);
      
      await pool.query(
        `UPDATE users 
         SET is_admin = $1, password = $2, updated_at = NOW() 
         WHERE email = $3`,
        [true, hashedPassword, FIXED_ADMIN.email.toLowerCase().trim()]
      );
      
      return {
        success: true,
        created: false,
        updated: true,
        message: 'Existing user updated to admin',
        user: {
          email: FIXED_ADMIN.email,
          is_admin: true
        }
      };
    }
  }

  // Hash password using bcrypt (10 rounds)
  const saltRounds = 10;
  const hashedPassword = await bcrypt.hash(FIXED_ADMIN.password, saltRounds);

  // Create admin user
  const result = await pool.query(
    `INSERT INTO users (name, email, password, is_admin, created_at, updated_at) 
     VALUES ($1, $2, $3, $4, NOW(), NOW()) 
     RETURNING id, name, email, is_admin, created_at`,
    [
      FIXED_ADMIN.name,
      FIXED_ADMIN.email.toLowerCase().trim(),
      hashedPassword,
      true // is_admin = true
    ]
  );

  const user = result.rows[0];
  
  return {
    success: true,
    created: true,
    message: 'Admin user created successfully',
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      is_admin: user.is_admin
    }
  };
}

/**
 * Main function to register fixed admin (PRODUCTION - database required)
 */
async function registerFixedAdmin() {
  // Verify database is connected (check if pool exists)
  if (!pool) {
    throw new Error('Database connection required. Cannot register admin without database.');
  }

  try {
    const result = await registerAdminInDatabase();
    
    // Handle duplicate key error (race condition)
    if (result.created === false && result.updated === false) {
      // Check if user was created in another process
      const checkResult = await adminExistsInDatabase();
      if (checkResult.exists && checkResult.isAdmin) {
        return {
          success: true,
          skipped: true,
          message: 'Admin user already exists - skipping creation',
          user: {
            email: FIXED_ADMIN.email,
            is_admin: true
          }
        };
      }
    }
    
    return result;
  } catch (error) {
    // Check if it's a duplicate key error (race condition)
    if (error.code === '23505' || error.message.includes('unique')) {
      const checkResult = await adminExistsInDatabase();
      if (checkResult.exists && checkResult.isAdmin) {
        return {
          success: true,
          skipped: true,
          message: 'Admin user already exists - skipping creation',
          user: {
            email: FIXED_ADMIN.email,
            is_admin: true
          }
        };
      }
    }
    throw error;
  }
}

// Export for use in server startup
module.exports = {
  registerFixedAdmin,
  FIXED_ADMIN
};

// Run if called directly
if (require.main === module) {
  registerFixedAdmin()
    .then(result => {
      console.log('\n═══════════════════════════════════════════════════════');
      console.log('  🔐 FIXED ADMIN REGISTRATION');
      console.log('═══════════════════════════════════════════════════════\n');
      
      if (result.skipped) {
        console.log(`ℹ️  ${result.message}`);
      } else if (result.created || result.updated) {
        console.log(`✅ ${result.message}`);
      }
      
      if (result.user) {
        console.log(`\n📋 Admin User Details:`);
        console.log(`   Email:    ${result.user.email}`);
        console.log(`   Password: admin123`);
        console.log(`   Role:     admin`);
        console.log(`   is_admin: true`);
      }
      
      console.log('\n');
      process.exit(0);
    })
    .catch(error => {
      console.error(`\n❌ Error registering fixed admin: ${error.message}`);
      console.error(`   Database connection required. Ensure PostgreSQL is running and configured.\n`);
      process.exit(1);
    });
}
