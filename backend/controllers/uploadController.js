/**
 * Upload Controller
 * Handles file upload operations
 */

const path = require('path');
const fs = require('fs');
const { apiBaseUrl } = require('../config/app');

class UploadController {
  static async uploadImage(req, res) {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'No file uploaded'
      });
    }

    // Construct the URL - use environment variable or request host
    const protocol = req.protocol;
    const host = req.get('host');
    const fileUrl = `${protocol}://${host}/uploads/${req.file.filename}`;

    res.status(200).json({
      success: true,
      data: {
        url: fileUrl,
        filename: req.file.filename,
        path: `/uploads/${req.file.filename}`,
        size: req.file.size,
        mimetype: req.file.mimetype
      }
    });
  }

  static async deleteImage(req, res) {
    const { url, filename } = req.body;
    
    if (!filename && !url) {
      return res.status(400).json({
        success: false,
        error: 'Filename or URL is required'
      });
    }

    // Extract filename from URL if provided
    let fileToDelete = filename;
    if (url && !filename) {
      const urlParts = url.split('/');
      fileToDelete = urlParts[urlParts.length - 1];
    }

    const uploadsDir = path.join(__dirname, '..', 'uploads');
    const filePath = path.join(uploadsDir, fileToDelete);

    // Check if file exists
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({
        success: false,
        error: 'File not found'
      });
    }

    // Delete file
    try {
      fs.unlinkSync(filePath);
      
      res.status(200).json({
        success: true,
        message: 'Image deleted successfully',
        data: { filename: fileToDelete }
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        error: 'Failed to delete file',
        message: error.message
      });
    }
  }
}

module.exports = UploadController;

