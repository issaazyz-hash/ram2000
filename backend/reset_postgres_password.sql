-- Script to reset PostgreSQL password for user 'postgres'
-- Run this as the postgres superuser

-- Connect to postgres database first, then run:
ALTER USER postgres WITH PASSWORD 'postgres';

-- Or if you want a different password, change 'postgres' above to your desired password
-- Then update the DB_PASSWORD in your .env file to match

