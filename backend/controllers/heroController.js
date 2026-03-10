const HeroContent = require('../models/HeroContent');
const fs = require('fs');
const path = require('path');

// Default hero content for fallback - MUST match frontend expectations
const DEFAULT_HERO = {
  id: 0,
  title: 'Un large choix de pièces auto',
  subtitle: 'Découvrez des milliers de références pour toutes les marques populaires. Qualité garantie, service fiable.',
  buttonText: 'Découvrir le catalogue',
  buttonLink: '/catalogue',
  images: ['/k.png', '/k2.jpg', '/k3.png'],
  updatedAt: new Date().toISOString()
};

class HeroController {
  /**
   * GET /api/hero
   * Get current hero content - NEVER returns 500
   */
  static async get(req, res) {
    console.log('📥 GET /api/hero - Fetching hero content...');
    
    try {
      const content = await HeroContent.get();
      
      // Transform database field names to camelCase for frontend
      const responseData = {
        id: content.id || 0,
        title: content.title || DEFAULT_HERO.title,
        subtitle: content.subtitle || DEFAULT_HERO.subtitle,
        buttonText: content.button_text || DEFAULT_HERO.buttonText,
        buttonLink: content.button_link || DEFAULT_HERO.buttonLink,
        images: content.images || DEFAULT_HERO.images,
        updatedAt: content.updated_at || new Date().toISOString()
      };
      
      console.log('✅ GET /api/hero - Success');
      
      res.json({
        success: true,
        data: responseData
      });
    } catch (error) {
      console.error('❌ GET /api/hero - Error:', error.message);
      // Return default content instead of 500 error
      res.json({
        success: true,
        data: DEFAULT_HERO
      });
    }
  }

  /**
   * POST /api/hero
   * Update hero content (admin only)
   */
  static async update(req, res) {
    console.log('📤 POST /api/hero - Updating hero content...');
    console.log('📦 Request body:', JSON.stringify(req.body, null, 2).substring(0, 500));
    
    try {
      const { title, subtitle, buttonText, buttonLink, images } = req.body;
      
      // Get current images for potential cleanup
      let currentImages = [];
      try {
        currentImages = await HeroContent.getCurrentImages();
      } catch (e) {
        console.log('⚠️ Could not get current images:', e.message);
      }
      
      // Prepare update data - convert camelCase to snake_case
      const updateData = {};
      
      if (title !== undefined) updateData.title = title;
      if (subtitle !== undefined) updateData.subtitle = subtitle;
      if (buttonText !== undefined) updateData.button_text = buttonText;
      if (buttonLink !== undefined) updateData.button_link = buttonLink;
      
      // Handle images from request body (base64 or URLs)
      if (images !== undefined && Array.isArray(images)) {
        // Filter out empty strings and limit to 3 images
        const validImages = images.filter(img => img && typeof img === 'string' && img.trim() !== '').slice(0, 3);
        if (validImages.length > 0) {
          updateData.images = validImages;
          // Clean up old uploaded images that are no longer used
          HeroController.cleanupOldImages(currentImages, validImages);
        }
      }
      
      // Handle file uploads if present (from multipart form)
      if (req.files && req.files.length > 0) {
        const uploadedImages = req.files.map(file => `/hero/${file.filename}`);
        updateData.images = uploadedImages.slice(0, 3);
        
        // Clean up old uploaded images
        HeroController.cleanupOldImages(currentImages, updateData.images);
      }
      
      console.log('📝 Update data prepared:', Object.keys(updateData));
      
      const content = await HeroContent.update(updateData);
      
      console.log('✅ POST /api/hero - Content saved to database');
      
      res.json({
        success: true,
        message: 'Hero content updated successfully',
        data: {
          id: content.id,
          title: content.title,
          subtitle: content.subtitle,
          buttonText: content.button_text,
          buttonLink: content.button_link,
          images: content.images || [],
          updatedAt: content.updated_at
        }
      });
    } catch (error) {
      console.error('❌ POST /api/hero - Error:', error.message);
      console.error('Stack:', error.stack);
      res.status(500).json({
        success: false,
        error: 'Failed to update hero content: ' + error.message
      });
    }
  }

  /**
   * POST /api/hero/upload
   * Upload hero images
   */
  static async uploadImages(req, res) {
    console.log('📤 POST /api/hero/upload - Uploading images...');
    
    try {
      if (!req.files || req.files.length === 0) {
        return res.status(400).json({
          success: false,
          error: 'No images uploaded'
        });
      }

      console.log(`📦 Received ${req.files.length} files`);

      // Get current images for cleanup
      let currentImages = [];
      try {
        currentImages = await HeroContent.getCurrentImages();
      } catch (e) {
        console.log('⚠️ Could not get current images:', e.message);
      }
      
      // Build new images array
      const newImages = req.files.map(file => `/hero/${file.filename}`);
      
      // Update database with new images
      const content = await HeroContent.update({ images: newImages });
      
      // Clean up old images that were replaced
      HeroController.cleanupOldImages(currentImages, newImages);
      
      console.log('✅ POST /api/hero/upload - Images uploaded successfully');
      
      res.json({
        success: true,
        message: 'Images uploaded successfully',
        data: {
          images: content.images
        }
      });
    } catch (error) {
      console.error('❌ POST /api/hero/upload - Error:', error.message);
      res.status(500).json({
        success: false,
        error: 'Failed to upload images: ' + error.message
      });
    }
  }

  /**
   * Clean up old uploaded images from disk
   * Only removes files from /public/hero/ directory
   */
  static cleanupOldImages(oldImages, newImages) {
    if (!oldImages || !Array.isArray(oldImages)) return;
    
    const heroDir = path.join(__dirname, '../../public/hero');
    
    // Ensure directory exists
    if (!fs.existsSync(heroDir)) {
      console.log('📁 Hero directory does not exist, skipping cleanup');
      return;
    }
    
    oldImages.forEach(oldImage => {
      // Only clean up images that were uploaded to /hero/ folder
      // Skip default images, base64 images, and URLs to other locations
      if (oldImage && 
          typeof oldImage === 'string' &&
          oldImage.startsWith('/hero/') && 
          !oldImage.includes('k.png') && 
          !oldImage.includes('k2.jpg') && 
          !oldImage.includes('k3.png') &&
          !oldImage.startsWith('data:')) {
        // Check if this image is still in use
        if (!newImages || !newImages.includes(oldImage)) {
          const filename = oldImage.replace('/hero/', '');
          const filepath = path.join(heroDir, filename);
          
          // Delete file if it exists
          if (fs.existsSync(filepath)) {
            try {
              fs.unlinkSync(filepath);
              console.log(`🗑️ Deleted old hero image: ${filename}`);
            } catch (err) {
              console.error(`❌ Failed to delete: ${filename}`, err.message);
            }
          }
        }
      }
    });
  }
}

module.exports = HeroController;
