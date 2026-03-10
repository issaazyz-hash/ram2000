const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const BrandImagesController = require('../controllers/brandImagesController');

// Ensure brands directory exists - MUST match server.js path
const brandsDir = path.join(__dirname, '../public/brands');
if (!fs.existsSync(brandsDir)) {
  fs.mkdirSync(brandsDir, { recursive: true });
  console.log('📁 Created /backend/public/brands directory');
}
console.log('📁 Brands upload directory:', brandsDir);

// Configure multer for brand image uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    // Ensure directory exists at upload time too
    if (!fs.existsSync(brandsDir)) {
      fs.mkdirSync(brandsDir, { recursive: true });
    }
    cb(null, brandsDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `brand-${uniqueSuffix}${ext}`);
  }
});

// Fixed fileFilter - checks mimetype correctly
const fileFilter = (req, file, cb) => {
  console.log('📤 Upload file check:', file.originalname, 'mimetype:', file.mimetype);
  
  // Accept any image mimetype
  if (file.mimetype.startsWith('image/')) {
    console.log('✅ File accepted:', file.originalname);
    cb(null, true);
  } else {
    console.log('❌ File rejected:', file.originalname, 'mimetype:', file.mimetype);
    cb(new Error('Only image files are allowed!'), false);
  }
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB max
  }
});

// Admin check middleware (simplified for development)
const isAdmin = (req, res, next) => {
  // Allow all requests for development
  return next();
};

// Error handling middleware for multer errors
const handleMulterError = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    console.error('❌ Multer error:', err.message);
    return res.status(400).json({
      success: false,
      error: `Upload error: ${err.message}`
    });
  } else if (err) {
    console.error('❌ Upload error:', err.message);
    return res.status(400).json({
      success: false,
      error: err.message
    });
  }
  next();
};

// ==========================================
// ROUTES
// ==========================================

/**
 * GET /api/brands
 * Get current brand images
 */
router.get('/', BrandImagesController.get);

/**
 * POST /api/brands
 * Update brand images (admin only)
 */
router.post('/', isAdmin, BrandImagesController.update);

/**
 * PUT /api/brands
 * Alternative update endpoint
 */
router.put('/', isAdmin, BrandImagesController.update);

/**
 * POST /api/brands/upload
 * Upload brand images (admin only)
 */
router.post('/upload', isAdmin, upload.array('images', 10), handleMulterError, BrandImagesController.uploadImages);

/**
 * POST /api/brands/with-images
 * Update with image uploads
 */
router.post('/with-images', isAdmin, upload.array('images', 10), handleMulterError, BrandImagesController.update);

module.exports = router;
