const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const HeroController = require('../controllers/heroController');

// Ensure hero directory exists
const heroDir = path.join(__dirname, '../../public/hero');
if (!fs.existsSync(heroDir)) {
  fs.mkdirSync(heroDir, { recursive: true });
  console.log('📁 Created /public/hero directory');
}

// Configure multer for hero image uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, heroDir);
  },
  filename: (req, file, cb) => {
    // Generate unique filename with timestamp
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, `hero-${uniqueSuffix}${ext}`);
  }
});

const fileFilter = (req, file, cb) => {
  // Accept only image files
  const allowedTypes = /jpeg|jpg|png|gif|webp|svg/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedTypes.test(file.mimetype);
  
  if (mimetype && extname) {
    return cb(null, true);
  }
  cb(new Error('Only image files are allowed!'));
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB max per file
  }
});

// Simple admin check middleware
const isAdmin = (req, res, next) => {
  // Check for admin token in headers or session
  // For now, allow all authenticated requests
  // You can enhance this with proper authentication
  const authHeader = req.headers.authorization;
  const adminToken = req.headers['x-admin-token'];
  
  // Basic check - in production use proper JWT/session validation
  if (authHeader || adminToken || req.body.isAdmin === true) {
    return next();
  }
  
  // Allow requests from localhost for development
  const ip = req.ip || req.connection.remoteAddress;
  if (ip === '127.0.0.1' || ip === '::1' || ip === '::ffff:127.0.0.1') {
    return next();
  }
  
  // For now, allow all requests (you should implement proper auth)
  return next();
  
  // Uncomment below to enforce admin check
  // return res.status(403).json({
  //   success: false,
  //   error: 'Admin access required'
  // });
};

// ==========================================
// ROUTES
// ==========================================

/**
 * GET /api/hero
 * Get current hero content
 */
router.get('/', HeroController.get);

/**
 * POST /api/hero
 * Update hero content (admin only)
 * Accepts JSON body with: title, subtitle, buttonText, buttonLink, images
 */
router.post('/', isAdmin, HeroController.update);

/**
 * POST /api/hero/upload
 * Upload hero images (admin only)
 * Accepts multipart form data with up to 3 images
 */
router.post('/upload', isAdmin, upload.array('images', 3), HeroController.uploadImages);

/**
 * PUT /api/hero
 * Alternative update endpoint
 */
router.put('/', isAdmin, HeroController.update);

/**
 * POST /api/hero/with-images
 * Update hero content with image uploads in single request
 */
router.post('/with-images', isAdmin, upload.array('images', 3), HeroController.update);

module.exports = router;

