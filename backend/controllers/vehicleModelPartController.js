/**
 * VehicleModelPart Controller
 * Handles HTTP requests for vehicle model parts
 */

const VehicleModelPart = require('../models/VehicleModelPart');

class VehicleModelPartController {
  /**
   * Get all parts for a specific model
   * GET /api/models/:modelId/parts
   */
  static async getPartsByModel(req, res) {
    try {
      const modelId = Number(req.params.modelId);
      
      if (Number.isNaN(modelId)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid modelId'
        });
      }

      const parts = await VehicleModelPart.findByModelId(modelId);
      
      res.status(200).json({
        success: true,
        count: parts.length,
        modelId,
        data: parts
      });
    } catch (error) {
      console.error('Error getting parts by model:', error.message);
      res.status(200).json({
        success: true,
        count: 0,
        data: []
      });
    }
  }

  /**
   * Get all parts
   * GET /api/parts
   */
  static async getAll(req, res) {
    try {
      const parts = await VehicleModelPart.findAll();
      
      res.status(200).json({
        success: true,
        count: parts.length,
        data: parts
      });
    } catch (error) {
      console.error('Error getting all parts:', error.message);
      res.status(200).json({
        success: true,
        count: 0,
        data: []
      });
    }
  }

  /**
   * Get a part by ID
   * GET /api/parts/:id
   */
  static async getById(req, res) {
    try {
      const { id } = req.params;
      const part = await VehicleModelPart.findById(id);
      
      if (!part) {
        return res.status(404).json({
          success: false,
          message: 'Pièce non trouvée'
        });
      }
      
      res.status(200).json({
        success: true,
        data: part
      });
    } catch (error) {
      console.error('Error getting part by ID:', error.message);
      res.status(500).json({
        success: false,
        message: 'Erreur serveur',
        error: error.message
      });
    }
  }

  /**
   * Create a new part for a model
   * POST /api/models/:modelId/parts
   */
  static async create(req, res) {
    try {
      const modelId = Number(req.params.modelId);
      
      if (Number.isNaN(modelId)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid modelId'
        });
      }

      const { name, reference, description, price, image_url, category, in_stock } = req.body;
      
      // Validation
      if (!name || !name.trim()) {
        return res.status(400).json({
          success: false,
          message: 'Le nom de la pièce est requis'
        });
      }

      const part = await VehicleModelPart.create(modelId, {
        name: name.trim(),
        reference: reference?.trim() || null,
        description: description?.trim() || null,
        price: price ? parseFloat(price) : null,
        image_url: image_url || null,
        category: category?.trim() || null,
        in_stock: in_stock !== undefined ? in_stock : true
      });
      
      res.status(201).json({
        success: true,
        message: 'Pièce ajoutée avec succès !',
        data: part
      });
    } catch (error) {
      console.error('Error creating part:', error.message);
      res.status(500).json({
        success: false,
        message: 'Erreur lors de la création de la pièce',
        error: error.message
      });
    }
  }

  /**
   * Update a part
   * PUT /api/parts/:id
   */
  static async update(req, res) {
    try {
      const { id } = req.params;
      const { name, reference, description, price, image_url, category, in_stock } = req.body;
      
      const existingPart = await VehicleModelPart.findById(id);
      if (!existingPart) {
        return res.status(404).json({
          success: false,
          message: 'Pièce non trouvée'
        });
      }

      const updatedPart = await VehicleModelPart.update(id, {
        name: name?.trim(),
        reference: reference?.trim(),
        description: description?.trim(),
        price: price ? parseFloat(price) : undefined,
        image_url,
        category: category?.trim(),
        in_stock
      });
      
      res.status(200).json({
        success: true,
        message: 'Pièce mise à jour avec succès',
        data: updatedPart
      });
    } catch (error) {
      console.error('Error updating part:', error.message);
      res.status(500).json({
        success: false,
        message: 'Erreur lors de la mise à jour',
        error: error.message
      });
    }
  }

  /**
   * Delete a part
   * DELETE /api/parts/:id
   */
  static async delete(req, res) {
    try {
      const { id } = req.params;
      
      const existingPart = await VehicleModelPart.findById(id);
      if (!existingPart) {
        return res.status(404).json({
          success: false,
          message: 'Pièce non trouvée'
        });
      }

      const deletedPart = await VehicleModelPart.delete(id);
      
      res.status(200).json({
        success: true,
        message: 'Pièce supprimée avec succès',
        data: {
          id: deletedPart.id,
          name: deletedPart.name
        }
      });
    } catch (error) {
      console.error('Error deleting part:', error.message);
      res.status(500).json({
        success: false,
        message: 'Erreur lors de la suppression',
        error: error.message
      });
    }
  }

  /**
   * Search parts within a model
   * GET /api/models/:modelId/parts/search?q=query
   */
  static async search(req, res) {
    try {
      const modelId = Number(req.params.modelId);
      const { q } = req.query;
      
      if (Number.isNaN(modelId)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid modelId'
        });
      }

      if (!q) {
        return res.status(400).json({
          success: false,
          message: 'Search query is required'
        });
      }

      const parts = await VehicleModelPart.search(modelId, q);
      
      res.status(200).json({
        success: true,
        count: parts.length,
        query: q,
        data: parts
      });
    } catch (error) {
      console.error('Error searching parts:', error.message);
      res.status(500).json({
        success: false,
        message: 'Erreur lors de la recherche',
        error: error.message
      });
    }
  }
}

module.exports = VehicleModelPartController;
