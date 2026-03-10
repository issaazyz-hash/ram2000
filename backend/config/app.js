/**
 * Application Configuration
 * Centralized app settings and environment variables
 */

require('dotenv').config();

// Validate and normalize PORT
const getPort = () => {
  const envPort = process.env.PORT;
  
  if (!envPort) {
    console.warn('⚠️  PORT environment variable not set. Using default: 3000');
    return 3000;
  }
  
  const port = parseInt(envPort, 10);
  
  if (isNaN(port) || port < 1 || port > 65535) {
    console.warn(`⚠️  Invalid PORT value "${envPort}". Using default: 3000`);
    return 3000;
  }
  
  return port;
};

// Production environment validation
const nodeEnv = process.env.NODE_ENV || 'development';
const isProduction = nodeEnv === 'production';

const devOrigins = ['http://localhost:8080', 'http://localhost:5173'];

const parseCorsOrigin = () => {
  if (isProduction) {
    if (!process.env.CORS_ORIGIN) {
      console.warn('[CORS] WARNING: CORS_ORIGIN not set in production. Falling back to * (less secure).');
      return '*';
    }
    // Support comma-separated origins for multiple frontend domains
    return process.env.CORS_ORIGIN.includes(',')
      ? process.env.CORS_ORIGIN.split(',').map((origin) => origin.trim())
      : process.env.CORS_ORIGIN;
  }
  // Development: allow common local frontends
  return devOrigins;
};

const corsAllowedHeaders = [
  'Content-Type',
  'Authorization',
  'X-Requested-With',
  'x-user',
  'Accept',
];

const corsAllowedMethods = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'];

// Validate production environment variables
if (isProduction) {
  const requiredProdVars = ['CORS_ORIGIN'];
  const missingProdVars = requiredProdVars.filter(varName => !process.env[varName]);
  
  if (missingProdVars.length > 0) {
    console.error(`[CONFIG] Missing required production environment variables: ${missingProdVars.join(', ')}`);
    console.error(`[CONFIG] Server will start but CORS may fail. Set these in your .env file.`);
    // Don't throw - allow server to start but log warning
  }
}

module.exports = {
  port: getPort(),
  nodeEnv: nodeEnv,
  // Remove localhost reference - API base URL should be set by frontend, not backend
  // Backend doesn't need to know its own public URL
  apiBaseUrl: process.env.API_BASE_URL || (isProduction ? null : `http://localhost:${getPort()}`),
  
  // Database
  db: {
    user: process.env.DB_USER,
    host: process.env.DB_HOST || '127.0.0.1',
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: parseInt(process.env.DB_PORT || '5432', 10),
  },
  
  // File uploads
  uploads: {
    maxFileSize: 50 * 1024 * 1024, // 50MB
    allowedTypes: ['image/jpeg', 'image/png', 'image/webp'],
    directory: 'uploads'
  },
  
  // CORS - Production requires explicit origin, development allows frontend origin
  cors: {
    origin: parseCorsOrigin(),
    credentials: true,
    allowedHeaders: corsAllowedHeaders,
    methods: corsAllowedMethods,
  }
};

