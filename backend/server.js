/**
 * Main Server File
 * Express application with PostgreSQL integration
 * Clean architecture: routes -> controllers -> models -> database
 */

// Load environment variables FIRST with explicit path
const envPath = require('path').join(__dirname, '.env');
const envLoaded = require('fs').existsSync(envPath);
require('dotenv').config({ path: envPath });
if (envLoaded) {
  console.log('[STARTUP] .env loaded from:', envPath);
} else {
  console.warn('[STARTUP] .env file not found at', envPath, '- using process.env only');
}
const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const path = require('path');
const fs = require('fs');
const { port, nodeEnv } = require('./config/app');
// Database import - production mode (will throw if not configured)
const dbModule = require('./config/database');
const testConnection = dbModule.testConnection;
const getPool = dbModule.pool;
const isConnected = dbModule.isConnected;

const migrate = require('./db/migrate');
const errorHandler = require('./middlewares/errorHandler');
const { registerFixedAdmin } = require('./scripts/register-fixed-admin');

// Import routes
const authRouter = require('./routes/auth');
const usersRouter = require('./routes/users');
const uploadRouter = require('./routes/upload');
const productsRouter = require('./routes/products');
const searchOptionsRouter = require('./routes/searchOptions');
const carBrandsRouter = require('./routes/carBrands');
const vehiclesRouter = require('./routes/vehicles');
const vehicleModelsRouter = require('./routes/vehicleModels');
const modelPartsRouter = require('./routes/modelParts');
const partsRouter = require('./routes/parts');
const achaProductsRouter = require('./routes/achaProducts');
const heroRouter = require('./routes/hero');
const brandsRouter = require('./routes/brands');
const subcategoriesRouter = require('./routes/subcategories');
const categoryProductsRouter = require('./routes/categoryProducts');
// OLD route file - kept for reference but not used
// const dashboardProductsRouter = require('./routes/dashboardProducts');
const dashboardProductsRoutes = require("./dashboardProducts/dashboardProducts.routes");

const app = express();

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const isProduction = nodeEnv === 'production';

// CORS configuration (single source of truth)
const devOrigins = ['http://localhost:8080', 'http://localhost:5173'];
const corsOriginsEnv = process.env.CORS_ORIGIN;
const envOrigins = corsOriginsEnv
  ? corsOriginsEnv.split(',').map((o) => o.trim()).filter(Boolean)
  : [];
const allowedOrigins = isProduction
  ? envOrigins
  : Array.from(new Set([...devOrigins, ...envOrigins]));

const corsOptions = {
  origin: (origin, callback) => {
    // Development: allow all browser origins for predictable localhost behavior.
    // This avoids dev-only origin mismatches while keeping production strict.
    if (!isProduction) return callback(null, true);

    // Production: strict allowlist only
    if (!origin) return callback(null, true);
    if (allowedOrigins.length === 0) {
      return callback(new Error('CORS origin not allowed'), false);
    }
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    return callback(new Error('CORS origin not allowed'), false);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'x-user', 'Accept'],
};

// CORS first to satisfy preflight before anything else
app.use(cors(corsOptions));
app.options('*', cors(corsOptions));

// Increase body size limit for base64 images
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Static assets with CORS, not rate-limited
app.use('/uploads', cors(corsOptions), express.static(uploadsDir));

// Serve static files from public/hero directory for hero images
const heroDir = path.join(__dirname, 'public/hero');
if (!fs.existsSync(heroDir)) {
  fs.mkdirSync(heroDir, { recursive: true });
}
app.use('/hero', cors(corsOptions), express.static(heroDir));

// Serve static files from brands directory
const brandsDir = path.join(__dirname, 'public/brands');
if (!fs.existsSync(brandsDir)) {
  fs.mkdirSync(brandsDir, { recursive: true });
  console.log('📁 Created /public/brands directory');
}
console.log('📁 Serving brands static files from:', brandsDir);
app.use('/brands', cors(corsOptions), express.static(brandsDir));

// Rate limiting (production-only) – protects APIs but not static assets/health
if (isProduction) {
  const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 200,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
      success: false,
      error: 'Too many requests from this IP, please try again later.'
    },
  });
  // Apply limiter only to API routes (static assets stay uncapped)
  app.use('/api', apiLimiter);
}

// API routes (after rate limiter so APIs are protected but statics are not)
app.use('/api/auth', authRouter);
app.use('/api/users', usersRouter);
app.use('/api/upload', uploadRouter);
app.use('/api/products', productsRouter);
app.use('/api/searchOptions', searchOptionsRouter);
app.use('/api/carBrands', carBrandsRouter);
app.use('/api/vehicles', vehiclesRouter);
app.use('/api/vehicleModels', vehicleModelsRouter);
app.use('/api/models', modelPartsRouter);
app.use('/api/parts', partsRouter);
app.use('/api/acha-products', achaProductsRouter);
const acha2Router = require('./routes/acha2Router');
app.use('/api/acha2', acha2Router);
const adminDashboardProductsRouter = require('./routes/adminDashboardProducts');
const marquesModelesAdminRouter = require('./routes/marquesModeles');
const publicMarquesModelesRouter = require('./routes/publicMarquesModeles');
app.use('/api/admin', adminDashboardProductsRouter);
app.use('/api/admin', marquesModelesAdminRouter);
app.use('/api/public', publicMarquesModelesRouter);
app.use('/api', require('./routes/promotions'));
app.use('/api', require('./routes/offreHistorique'));
app.use('/api/modeles', require('./routes/modeles'));
app.use('/api/orders', require('./routes/orders'));
app.use('/api/hero', heroRouter);
app.use('/api/brands', brandsRouter);
app.use('/api/subcategories', subcategoriesRouter);
app.use('/api/category-products', categoryProductsRouter);
const cat2CardsRouter = require('./routes/cat2Cards');
app.use('/api/cat2', cat2CardsRouter);
app.use("/api/sectionContent", require("./routes/sectionContent"));
app.use("/api/familles", require("./routes/familles"));
app.use("/api", dashboardProductsRoutes);

// Request logging middleware
app.use((req, res, next) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${req.method} ${req.path}${req.query && Object.keys(req.query).length > 0 ? '?' + new URLSearchParams(req.query).toString() : ''}`);
  next();
});

// Health check endpoint
app.get('/health', async (req, res) => {
  try {
    let dbStatus = 'unknown';
    let dbMessage = 'Checking database connection...';
    
    try {
      // Quick database ping (non-blocking, timeout after 2 seconds)
      const quickTest = await Promise.race([
        testConnection(),
        new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 2000))
      ]);
      
      if (quickTest && quickTest.success) {
        dbStatus = 'connected';
        dbMessage = `Connected to ${quickTest.database || 'database'}`;
      } else {
        dbStatus = 'error';
        dbMessage = quickTest.error || 'Database connection failed';
      }
    } catch (err) {
      dbStatus = 'error';
      dbMessage = err.message || 'Database connection failed';
    }
    
    res.status(200).json({
      success: true,
      status: 'ok',
      db: dbStatus,
      message: dbMessage,
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || 'development'
    });
  } catch (error) {
    // Health check should never fail - return basic status even on error
    res.status(200).json({
      success: true,
      status: 'ok',
      db: 'unknown',
      message: 'Health check query failed but server is running',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || 'development'
    });
  }
});

// API root endpoint
app.get('/', (req, res) => {
  res.json({
    success: true,
    data: {
      message: 'Node.js Backend API with PostgreSQL',
      version: '2.1.0',
      endpoints: {
        auth: {
          register: 'POST /api/auth/register',
          login: 'POST /api/auth/login',
          checkEmail: 'GET /api/auth/check-email/:email'
        },
        users: {
          getAll: 'GET /api/users',
          getById: 'GET /api/users/:id',
          create: 'POST /api/users',
          update: 'PUT /api/users/:id',
          delete: 'DELETE /api/users/:id'
        },
        upload: {
          uploadImage: 'POST /api/upload/image',
          deleteImage: 'DELETE /api/upload/image'
        },
        products: {
          getAll: 'GET /api/products',
          getById: 'GET /api/products/:id',
          create: 'POST /api/products',
          update: 'PUT /api/products/:id',
          delete: 'DELETE /api/products/:id'
        },
        searchOptions: {
          getAll: 'GET /api/searchOptions',
          getById: 'GET /api/searchOptions/:id',
          create: 'POST /api/searchOptions',
          delete: 'DELETE /api/searchOptions/:id'
        },
        carBrands: {
          getAll: 'GET /api/carBrands',
          getById: 'GET /api/carBrands/:id',
          create: 'POST /api/carBrands',
          update: 'PUT /api/carBrands/:id',
          delete: 'DELETE /api/carBrands/:id'
        },
        vehicles: {
          getAll: 'GET /api/vehicles',
          getById: 'GET /api/vehicles/:id',
          create: 'POST /api/vehicles',
          update: 'PUT /api/vehicles/:id',
          delete: 'DELETE /api/vehicles/:id',
          search: 'GET /api/vehicles/search?q=query'
        },
        hero: {
          get: 'GET /api/hero',
          update: 'POST /api/hero',
          uploadImages: 'POST /api/hero/upload'
        },
        sectionContent: {
          get: 'GET /api/sectionContent?sectionType=xxx',
          create: 'POST /api/sectionContent',
          update: 'PUT /api/sectionContent/:id'
        }
      }
    }
  });
});

console.log("✅ DashboardProducts routes mounted at /api/dashboard-products");

// REMOVED: Legacy routes without /api prefix (duplicates removed for localhost cleanup)
// All routes are now accessed via /api/* prefix only

// Serve React app build files ONLY in development mode
// In production, Nginx should serve static files - backend only handles API
const distPath = path.join(__dirname, '../frontend/dist');

if (fs.existsSync(distPath) && !isProduction) {
  console.log('📁 [DEV] Serving React app build files from:', distPath);
  // Serve static files from dist
  app.use(express.static(distPath));
  
  // SPA fallback: serve index.html for all non-API routes (development only)
  app.get('*', (req, res, next) => {
    // Skip API routes and static file routes
    if (req.path.startsWith('/api') || req.path.startsWith('/uploads') || req.path.startsWith('/brands') || req.path.startsWith('/hero') || req.path.startsWith('/auth') || req.path.startsWith('/users') || req.path.startsWith('/upload') || req.path.startsWith('/products') || req.path.startsWith('/searchOptions') || req.path.startsWith('/carBrands') || req.path.startsWith('/vehicles') || req.path.startsWith('/vehicleModels') || req.path.startsWith('/models') || req.path.startsWith('/parts') || req.path.startsWith('/acha-products') || req.path.startsWith('/subcategories')) {
      return next();
    }
    // Serve index.html for all other routes (SPA routing)
    res.sendFile(path.join(distPath, 'index.html'));
  });
} else if (isProduction && fs.existsSync(distPath)) {
  console.log('📁 [PROD] Frontend dist folder exists but will be served by Nginx, not Node.js');
}

// 404 handler (only for API routes)
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Route not found',
    path: req.path
  });
});

// Global error handler (must be last)
app.use(errorHandler);

// Start server - Production Ready (FAIL FAST on errors)
async function startServer() {
  try {
    // PHASE 1: Validate environment variables
    console.log('📋 Validating environment variables...');
    const validateEnv = require('./config/validateEnv');
    validateEnv();
    
    const nodeEnv = process.env.NODE_ENV || 'development';
    
    if (isProduction && !process.env.CORS_ORIGIN) {
      console.warn('⚠️  CORS_ORIGIN not set in production. CORS may fail.');
      console.warn('   Set CORS_ORIGIN in .env (e.g., CORS_ORIGIN=https://yourdomain.com)');
    }
    
    // PHASE 1.5: Create database if it doesn't exist
    try {
      console.log('🔄 Checking if database exists...');
      const createDatabase = require('./config/createDatabase');
      await createDatabase();
      console.log('✅ [DB] Database verified/created');
    } catch (dbCreateError) {
      // If database creation fails, log and continue (might already exist)
      if (dbCreateError.message.includes('already exists')) {
        console.log('ℹ️  [DB] Database already exists');
      } else {
        console.warn('⚠️  [DB] Could not create database automatically:', dbCreateError.message);
        console.warn('   You may need to create it manually (see backend/db/create_database.sql)');
      }
    }
    
    // PHASE 2: Connect to database (REQUIRED - fail fast if fails)
    const effectiveHost = process.env.DB_HOST || '127.0.0.1';
    const effectivePort = process.env.DB_PORT || '5432';
    const effectiveDb = process.env.DB_NAME;
    const effectiveUser = process.env.DB_USER;
    console.log('[STARTUP] DB config (from backend/.env):', {
      host: effectiveHost,
      port: effectivePort,
      database: effectiveDb,
      user: effectiveUser,
      password: process.env.DB_PASSWORD ? '***set***' : 'NOT SET'
    });
    console.log('🔄 Connecting to PostgreSQL database...');
    console.log('   If connection is refused, start PostgreSQL - see POSTGRES_STARTUP_FIX_GUIDE.md at project root.');
    const dbTest = await testConnection();
    
    if (!dbTest || !dbTest.success) {
      throw new Error(`Database connection failed: ${dbTest?.error || 'Unknown error'}`);
    }
    
    console.log('✅ [DB] Database connected successfully');
    console.log(`   Database: ${dbTest.database}`);
    console.log(`   Host: ${dbTest.host}:${dbTest.port}`);
    console.log(`   User: ${process.env.DB_USER}`);
    console.log(`   Password: ${process.env.DB_PASSWORD ? '*'.repeat(Math.min(process.env.DB_PASSWORD.length, 8)) : 'NOT SET'} (hidden)`);
    
    // PHASE 3: Run database migration (REQUIRED - fail fast if fails)
    console.log('🔄 Running database migration...');
    const migrationResult = await migrate();
    if (!migrationResult || !migrationResult.success) {
      throw new Error('Database migration failed');
    }
    console.log('✅ [DB] Database migration completed');
    console.log(`   Created ${migrationResult.tables} tables`);

    // PHASE 3.5: Initialize required tables (auto-create missing tables)
    try {
      console.log('🔄 Initializing required tables...');
      const initTables = require('./db/initTables');
      await initTables.initAllTables();
      console.log('✅ [DB] Required tables initialized');
    } catch (initError) {
      console.warn('⚠️  [DB] Table initialization warning:', initError.message);
      // Continue - tables might already exist
    }

    // PHASE 3.65: Add promo fields to orders table (promo_id, origin, status, promo_slug)
    try {
      const addPromoFieldsToOrders = require('./migrations/add_promo_fields_to_orders');
      await addPromoFieldsToOrders();
      console.log('✅ [ORDERS] Promo fields migration completed');
    } catch (e) {
      console.warn('⚠️  [ORDERS] Promo fields migration skipped (non-fatal):', e.message);
    }

    // PHASE 3.66: Add brand_name, model_name to orders table (Marque/Modèle snapshot)
    try {
      const addBrandModelToOrders = require('./migrations/add_brand_model_to_orders');
      await addBrandModelToOrders();
      console.log('✅ [ORDERS] Brand/model snapshot columns migration completed');
    } catch (e) {
      console.warn('⚠️  [ORDERS] Brand/model migration skipped (non-fatal):', e.message);
    }

    // PHASE 3.67: Add compatible_vehicles to category_products (acha2 Marque/Modèle filtering)
    try {
      const addCompatibleVehicles = require('./migrations/add_compatible_vehicles_to_category_products');
      await addCompatibleVehicles();
      console.log('✅ [CATEGORY_PRODUCTS] compatible_vehicles column migration completed');
    } catch (e) {
      console.warn('⚠️  [CATEGORY_PRODUCTS] compatible_vehicles migration skipped (non-fatal):', e.message);
    }

    // PHASE 3.68: Add tarif columns to category_products (Produits2 pricing display)
    try {
      const addTarifColumns = require('./migrations/add_tarif_columns_to_category_products');
      await addTarifColumns();
      console.log('✅ [CATEGORY_PRODUCTS] tarif columns migration completed');
    } catch (e) {
      console.warn('⚠️  [CATEGORY_PRODUCTS] tarif columns migration skipped (non-fatal):', e.message);
    }

    // PHASE 3.6: One-time sync promotions -> category_products (so equivalents work immediately)
    // Non-fatal: this should never block server startup.
    try {
      const pool = require('./db/pool');
      const PromotionCategoryProductSyncService = require('./services/PromotionCategoryProductSyncService');
      const promoSection = await pool.query(
        `SELECT content FROM section_content WHERE section_type = $1 LIMIT 1`,
        ['promotions']
      );
      const promoContent = promoSection.rows?.[0]?.content;
      if (promoContent) {
        await PromotionCategoryProductSyncService.syncPromotionsSectionContent(promoContent);
        console.log('✅ [PROMOTIONS] Synced promotions to category_products');
      }
    } catch (syncError) {
      console.warn('⚠️  [PROMOTIONS] Sync skipped (non-fatal):', syncError.message);
    }

    // PHASE 4: Fix vehicles table schema (ensure all columns exist)
    try {
      console.log('🔄 Verifying vehicles table schema...');
      const fixVehiclesTable = require('./db/fix_vehicles_table');
      const fixResult = await fixVehiclesTable();
      console.log(`✅ [VEHICLES] ${fixResult.message}`);
      console.log(`   Vehicles table schema verified`);
    } catch (fixError) {
      console.warn('⚠️  [VEHICLES] Schema verification warning:', fixError.message);
      // Continue - migration might have already created the table correctly
    }

    // PHASE 4.5: Optional auto-seed vehicle models in development mode
    // Only runs if table is empty OR contains only invalid rows
    if (process.env.NODE_ENV === 'development') {
      try {
        console.log('🔄 [DEV] Checking vehicle_models table for auto-seed...');
        const pool = getPool();
        const client = await pool.connect();
        try {
          // Get total count
          const countResult = await client.query('SELECT COUNT(*) as count FROM vehicle_models');
          const totalCount = parseInt(countResult.rows[0].count);
          
          // Get count of valid rows (not null, length >= 3, not "Object")
          const validCountResult = await client.query(`
            SELECT COUNT(*) as count 
            FROM vehicle_models 
            WHERE 
              model IS NOT NULL 
              AND model != ''
              AND TRIM(model) != ''
              AND LENGTH(TRIM(model)) >= 3
              AND LOWER(TRIM(model)) != 'object'
              AND LOWER(TRIM(model)) != '[object object]'
              AND marque IS NOT NULL
              AND marque != ''
              AND TRIM(marque) != ''
              AND LENGTH(TRIM(marque)) >= 3
              AND LOWER(TRIM(marque)) != 'object'
              AND LOWER(TRIM(marque)) != '[object object]'
          `);
          const validCount = parseInt(validCountResult.rows[0].count);
          
          // Auto-seed if table is empty OR has only invalid rows
          if (totalCount === 0 || validCount === 0) {
            console.log(`⚠️  [DEV] vehicle_models has ${totalCount} total rows (${validCount} valid), auto-seeding...`);
            const seedVehicleModels = require('./scripts/seedVehicleModels');
            await seedVehicleModels();
            console.log('✅ [DEV] Vehicle models auto-seeded successfully');
          } else {
            console.log(`✅ [DEV] vehicle_models already has ${validCount} valid rows, skipping auto-seed`);
          }
        } finally {
          client.release();
        }
      } catch (seedError) {
        console.warn('⚠️  [DEV] Auto-seed warning:', seedError.message);
        // Continue - seed can be run manually
      }
    }

    // PHASE 5: Register fixed admin user (non-critical - warn if fails)
    try {
      console.log('🔄 Registering fixed admin user...');
      const adminResult = await registerFixedAdmin();
      if (adminResult.skipped) {
        console.log(`ℹ️  [ADMIN] ${adminResult.message}`);
      } else if (adminResult.created || adminResult.updated) {
        if (adminResult.mode === 'database') {
          console.log(`✅ [ADMIN] ${adminResult.message} (Email: ${adminResult.user.email})`);
          console.log(`   Credentials: ${adminResult.user.email} / admin123`);
        }
      }
    } catch (adminError) {
      console.warn('⚠️  [ADMIN] Admin registration failed:', adminError.message);
      console.warn('⚠️  [ADMIN] Run manually: npm run register-admin');
    }
    
    // PHASE 5: Start server (only if DB is connected)
    if (!isConnected()) {
      throw new Error('Database connection not verified. Cannot start server.');
    }
    
    const host = process.env.HOST || '0.0.0.0';
    
    console.log('\n🚀 Starting server...');
    console.log(`   Environment: ${nodeEnv}`);
    console.log(`   Port: ${port}`);
    console.log(`   Host: ${host} (listening on all interfaces)`);
    console.log(`   Database: ✅ Connected to ${process.env.DB_NAME}`);
    if (isProduction) {
      console.log(`   CORS Origin: ${process.env.CORS_ORIGIN || 'NOT SET (WARNING)'}`);
    }
    
    const server = app.listen(port, host, () => {
      const displayHost = host === '0.0.0.0' ? 'localhost' : host;
      console.log(`\n✅ Server running on ${host}:${port}`);
      console.log(`📍 API URL: http://${displayHost}:${port}`);
      console.log(`📍 Health check: http://${displayHost}:${port}/health`);
      console.log(`📍 Database: ✅ ${process.env.DB_NAME} (${process.env.DB_HOST}:${process.env.DB_PORT})`);
      console.log(`📍 Admin: Run 'npm run register-admin' if admin user needed`);
      console.log('\n📋 API endpoints available at /api/*');
      if (isProduction) {
        console.log('   Production mode enabled');
      } else {
        console.log('\n📋 Available API endpoints:');
        console.log('   - GET  /health           → Server health check');
        console.log('   - GET  /api/vehicles     → List all vehicles');
        console.log('   - POST /api/vehicles     → Create vehicle');
        console.log('   - GET  /api/vehicles/:id → Get vehicle');
        console.log('   - PUT  /api/vehicles/:id → Update vehicle');
        console.log('   - DELETE /api/vehicles/:id → Delete vehicle');
        console.log('   - GET  /api/carBrands    → List car brands');
        console.log('   - GET  /api/searchOptions → List search options');
        console.log('   - GET  /api/products     → List products');
      }
    });

    // Handle server errors - NO AUTO-SWITCH
    server.on('error', (error) => {
      if (error.code === 'EADDRINUSE') {
        console.error(`\n❌ Port ${port} is already in use`);
        console.error(`💡 Solutions:`);
        console.error(`   1. Stop the process using port ${port}`);
        console.error(`   2. Set a different PORT in .env file (e.g., PORT=5001)`);
        process.exit(1);
      } else {
        console.error('❌ Server error:', error.message);
        process.exit(1);
      }
    });
    
    // Graceful shutdown handlers remain unchanged
    process.on('SIGTERM', () => {
      console.log('SIGTERM signal received: closing HTTP server');
      server.close(() => {
        console.log('HTTP server closed');
        process.exit(0);
      });
    });

    process.on('SIGINT', () => {
      console.log('\nSIGINT signal received: closing HTTP server');
      server.close(() => {
        console.log('HTTP server closed');
        process.exit(0);
      });
    });
    
  } catch (error) {
    // Handle port conflicts
    if (error.code === 'EADDRINUSE') {
      console.error(`❌ Port ${port} is already in use`);
      console.error(`   Stop the process using port ${port} or set PORT to a different value in .env`);
      process.exit(1);
    }
    
    // Handle database connection errors - FAIL FAST
    if (error.message && (
      error.message.includes('Database') || 
      error.message.includes('DB_') ||
      error.message.includes('connection') ||
      error.message.includes('Missing required')
    )) {
      console.error('❌ [DB] Database connection required. Server cannot start without database.');
      console.error(`   Error: ${error.message}`);
      process.exit(1);
    }
    
    // Handle migration errors - FAIL FAST
    if (error.message && error.message.includes('migration')) {
      console.error('❌ [DB] Database migration failed. Server cannot start.');
      console.error(`   Error: ${error.message}`);
      process.exit(1);
    }
    
    console.error('❌ Server startup failed:', error.message);
    if (error.stack && process.env.NODE_ENV !== 'production') {
      console.error('Stack:', error.stack);
    }
    process.exit(1);
  }
}

// Start the server
startServer();
