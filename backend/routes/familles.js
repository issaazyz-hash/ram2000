const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const pool = require('../db/pool');
const requireAdmin = require('../middlewares/requireAdmin');
const asyncHandler = require('../middlewares/asyncHandler');

// Ensure uploads/familles directory exists
const uploadsDir = path.join(__dirname, '../uploads/familles');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configure multer for image uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const timestamp = Date.now();
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${timestamp}-${file.originalname}`);
  }
});

const fileFilter = (req, file, cb) => {
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Only JPG, JPEG, PNG, and WEBP files are allowed!'), false);
  }
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB max
  }
});

const handleMulterError = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    return res.status(400).json({
      success: false,
      error: `Upload error: ${err.message}`
    });
  } else if (err) {
    return res.status(400).json({
      success: false,
      error: err.message
    });
  }
  next();
};

/**
 * PUT /api/familles/:id/image
 * Upload an image for a famille (admin only)
 */
router.put('/:id/image', requireAdmin, upload.single('image'), handleMulterError, asyncHandler(async (req, res) => {
  const { id } = req.params;

  if (!req.file) {
    return res.status(400).json({
      success: false,
      error: 'No image file uploaded'
    });
  }

  const imagePath = `/uploads/familles/${req.file.filename}`;

  // Check if famille exists in familles table
  const checkResult = await pool.query(
    'SELECT id, image FROM familles WHERE id = $1',
    [id]
  );

  let oldImage = null;
  if (checkResult.rows.length > 0) {
    oldImage = checkResult.rows[0].image;
  } else {
    // Check in section_content as fallback
    const sectionResult = await pool.query(
      "SELECT content FROM section_content WHERE section_type = 'famille_categories'"
    );
    
    if (sectionResult.rows.length > 0) {
      let content = sectionResult.rows[0].content;
      if (content && typeof content === 'object') {
        if (!Array.isArray(content) && content.items && Array.isArray(content.items)) {
          content = content.items;
        } else if (!Array.isArray(content)) {
          content = [];
        }
      }
      
      const famille = content.find((f) => f.id === id);
      if (famille) {
        oldImage = famille.image;
        
        // Insert into familles table if not exists
        await pool.query(
          `INSERT INTO familles (id, title, image, subcategories, created_at, updated_at)
           VALUES ($1, $2, $3, $4::jsonb, NOW(), NOW())
           ON CONFLICT (id) DO NOTHING`,
          [
            famille.id,
            famille.title,
            famille.image || null,
            JSON.stringify(famille.subcategories || [])
          ]
        );
      }
    }
    
    if (!oldImage && checkResult.rows.length === 0) {
      // Delete uploaded file if famille doesn't exist
      const filePath = path.join(uploadsDir, req.file.filename);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
      return res.status(404).json({
        success: false,
        error: 'Famille not found'
      });
    }
  }

  // Delete old image if it exists
  if (oldImage && oldImage.startsWith('/uploads/familles/')) {
    const oldFilename = oldImage.replace('/uploads/familles/', '');
    const oldFilepath = path.join(uploadsDir, oldFilename);
    if (fs.existsSync(oldFilepath)) {
      try {
        fs.unlinkSync(oldFilepath);
      } catch (err) {
        // Ignore deletion errors
      }
    }
  }

  // Update famille image in familles table
  await pool.query(
    'UPDATE familles SET image = $1, updated_at = NOW() WHERE id = $2',
    [imagePath, id]
  );

  // Also update in section_content for compatibility
  const sectionResult = await pool.query(
    "SELECT content FROM section_content WHERE section_type = 'famille_categories'"
  );
  
  if (sectionResult.rows.length > 0) {
    let content = sectionResult.rows[0].content;
    if (content && typeof content === 'object') {
      if (!Array.isArray(content) && content.items && Array.isArray(content.items)) {
        content = content.items;
        const familleIndex = content.findIndex((f) => f.id === id);
        if (familleIndex !== -1) {
          content[familleIndex] = { ...content[familleIndex], image: imagePath };
          await pool.query(
            `UPDATE section_content SET content = $1::jsonb, updated_at = NOW() WHERE section_type = 'famille_categories'`,
            [JSON.stringify({ items: content })]
          );
        }
      } else if (Array.isArray(content)) {
        const familleIndex = content.findIndex((f) => f.id === id);
        if (familleIndex !== -1) {
          content[familleIndex] = { ...content[familleIndex], image: imagePath };
          await pool.query(
            `UPDATE section_content SET content = $1::jsonb, updated_at = NOW() WHERE section_type = 'famille_categories'`,
            [JSON.stringify(content)]
          );
        }
      }
    }
  }

  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');

  res.json({
    success: true,
    image: imagePath
  });
}));

module.exports = router;

