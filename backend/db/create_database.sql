-- ============================================
-- Create Database Script
-- Run this manually if automatic creation fails
-- ============================================
-- Usage: psql -U postgres -f create_database.sql
-- OR: psql -U postgres -c "CREATE DATABASE azyz_db;"
-- ============================================

-- Create database if it doesn't exist
-- Note: PostgreSQL doesn't support IF NOT EXISTS for CREATE DATABASE
-- So we check first or just run: CREATE DATABASE azyz_db;

CREATE DATABASE azyz_db;

-- Connect to the new database to set permissions (optional)
\c azyz_db

-- Grant privileges (optional - adjust user as needed)
-- GRANT ALL PRIVILEGES ON DATABASE azyz_db TO azyz_user;

-- Note: After creating the database, run the migration:
-- node backend/db/migrate.js

