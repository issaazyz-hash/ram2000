const BrandImages = require('../models/BrandImages');
const fs = require('fs');
const path = require('path');

// Default brand images for fallback
const DEFAULT_BRANDS = {
  id: 0,
  title: 'NOS MARQUES DISPONIBLES',
  images: ['/pp.jpg'],
  updatedAt: new Date().toISOString()
};

class BrandImagesController {
  /**
   * GET /api/brands
   * Get current brand images - NEVER returns 500
   */
  static async get(req, res) {
    console.log('📥 GET /api/brands - Fetching brand images...');
    
    try {
      const content = await BrandImages.get();
      
      const responseData = {
        id: content.id || 0,
        title: content.title || DEFAULT_BRANDS.title,
        images: content.images || DEFAULT_BRANDS.images,
        updatedAt: content.updated_at || new Date().toISOString()
      };
      
      console.log('✅ GET /api/brands - Success');
      
      res.json({
        success: true,
        data: responseData
      });
    } catch (error) {
      console.error('❌ GET /api/brands - Error:', error.message);
      // Return default instead of 500
      res.json({
        success: true,
        data: DEFAULT_BRANDS
      });
    }
  }

  /**
   * POST /api/brands
   * Update brand images (admin only)
   */
  static async update(req, res) {
    console.log('📤 POST /api/brands - Updating brand images...');
    
    try {
      const { title, images } = req.body;
      
      // Get current images for cleanup
      let currentImages = [];
      try {
        currentImages = await BrandImages.getCurrentImages();
      } catch (e) {
        console.log('⚠️ Could not get current images:', e.message);
      }
      
      const updateData = {};
      
      if (title !== undefined) updateData.title = title;
      
      // Handle images from request body
      if (images !== undefined && Array.isArray(images)) {
        const validImages = images.filter(img => img && typeof img === 'string' && img.trim() !== '');
        if (validImages.length > 0) {
          updateData.images = validImages;
          BrandImagesController.cleanupOldImages(currentImages, validImages);
        }
      }
      
      // Handle file uploads
      if (req.files && req.files.length > 0) {
        const uploadedImages = req.files.map(file => `/brands/${file.filename}`);
        updateData.images = uploadedImages;
        BrandImagesController.cleanupOldImages(currentImages, uploadedImages);
      }
      
      console.log('📝 Update data prepared:', Object.keys(updateData));
      
      const content = await BrandImages.update(updateData);
      
      console.log('✅ POST /api/brands - Content saved to database');
      
      res.json({
        success: true,
        message: 'Brand images updated successfully',
        data: {
          id: content.id,
          title: content.title,
          images: content.images || [],
          updatedAt: content.updated_at
        }
      });
    } catch (error) {
      console.error('❌ POST /api/brands - Error:', error.message);
      res.status(500).json({
        success: false,
        error: 'Failed to update brand images: ' + error.message
      });
    }
  }

  /**
   * POST /api/brands/upload
   * Upload brand images
   */
  static async uploadImages(req, res) {
    console.log('📤 POST /api/brands/upload - Uploading images...');
    
    try {
      if (!req.files || req.files.length === 0) {
        return res.status(400).json({
          success: false,
          error: 'No images uploaded'
        });
      }

      console.log(`📦 Received ${req.files.length} files`);
      req.files.forEach((file, idx) => {
        console.log(`  📄 File ${idx + 1}: ${file.originalname} → ${file.filename}`);
      });

      let currentImages = [];
      try {
        currentImages = await BrandImages.getCurrentImages();
        console.log('📋 Current images in DB:', currentImages);
      } catch (e) {
        console.log('⚠️ Could not get current images:', e.message);
      }
      
      const newImages = req.files.map(file => `/brands/${file.filename}`);
      console.log('🆕 New image paths:', newImages);
      
      const content = await BrandImages.update({ images: newImages });
      console.log('💾 Updated DB content:', content);
      
      BrandImagesController.cleanupOldImages(currentImages, newImages);
      
      console.log('✅ POST /api/brands/upload - Images uploaded successfully');
      
      res.json({
        success: true,
        message: 'Images uploaded successfully',
        data: {
          images: content.images
        }
      });
    } catch (error) {
      console.error('❌ POST /api/brands/upload - Error:', error.message);
      res.status(500).json({
        success: false,
        error: 'Failed to upload images: ' + error.message
      });
    }
  }

  /**
   * Clean up old uploaded images from disk
   */
  static cleanupOldImages(oldImages, newImages) {
    if (!oldImages || !Array.isArray(oldImages)) return;
    
    const brandsDir = path.join(__dirname, '../public/brands');
    
    if (!fs.existsSync(brandsDir)) {
      console.log('📁 Brands directory does not exist, skipping cleanup');
      return;
    }
    
    oldImages.forEach(oldImage => {
      if (oldImage && 
          typeof oldImage === 'string' &&
          oldImage.startsWith('/brands/') && 
          !oldImage.includes('pp.jpg') &&
          !oldImage.startsWith('data:')) {
        if (!newImages || !newImages.includes(oldImage)) {
          const filename = oldImage.replace('/brands/', '');
          const filepath = path.join(brandsDir, filename);
          
          if (fs.existsSync(filepath)) {
            try {
              fs.unlinkSync(filepath);
              console.log(`🗑️ Deleted old brand image: ${filename}`);
            } catch (err) {
              console.error(`❌ Failed to delete: ${filename}`, err.message);
            }
          }
        }
      }
    });
  }
}

module.exports = BrandImagesController;

