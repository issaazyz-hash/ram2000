/**
 * Upload Routes
 * File upload endpoints
 */

const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const router = express.Router();
const UploadController = require('../controllers/uploadController');
const asyncHandler = require('../middlewares/asyncHandler');
const { uploads } = require('../config/app');

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, '..', uploads.directory);
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configure multer storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    const name = path.basename(file.originalname, ext).replace(/[^a-zA-Z0-9]/g, '_');
    cb(null, `${name}-${uniqueSuffix}${ext}`);
  }
});

// File filter for image types
const fileFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png|webp/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedTypes.test(file.mimetype);
  
  if (mimetype && extname) {
    return cb(null, true);
  }
  cb(new Error('Invalid file type. Only JPEG, PNG, and WebP images are allowed.'));
};

// Configure multer
const upload = multer({
  storage: storage,
  limits: {
    fileSize: uploads.maxFileSize
  },
  fileFilter: fileFilter
});

router.post('/image', upload.single('image'), asyncHandler(UploadController.uploadImage));
router.delete('/image', asyncHandler(UploadController.deleteImage));

module.exports = router;
