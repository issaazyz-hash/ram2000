/**
 * Vehicle Controller
 * Handles vehicle CRUD operations for the Catalogue page
 */

const Vehicle = require('../models/Vehicle');

class VehicleController {
  /**
   * GET /api/vehicles
   * Get all vehicles
   */
  static async getAll(req, res) {
    try {
      const vehicles = await Vehicle.findAll();
      
      res.status(200).json({
        success: true,
        count: vehicles.length,
        data: vehicles
      });
    } catch (error) {
      console.error('❌ VehicleController.getAll error:', error.message);
      // Return empty array instead of 500 error
      res.status(200).json({
        success: true,
        count: 0,
        data: [],
        warning: 'Could not fetch vehicles'
      });
    }
  }

  /**
   * GET /api/vehicles/:id
   * Get a vehicle by ID
   */
  static async getById(req, res) {
    try {
      const { id } = req.params;
      
      if (!id || isNaN(parseInt(id))) {
        return res.status(400).json({
          success: false,
          error: 'Valid vehicle ID is required'
        });
      }
      
      const vehicle = await Vehicle.findById(id);
      
      if (!vehicle) {
        return res.status(404).json({
          success: false,
          error: 'Vehicle not found'
        });
      }
      
      res.status(200).json({
        success: true,
        data: vehicle
      });
    } catch (error) {
      console.error('❌ VehicleController.getById error:', error.message);
      res.status(500).json({
        success: false,
        error: 'Database error',
        message: error.message
      });
    }
  }

  /**
   * POST /api/vehicles
   * Create a new vehicle
   */
  static async create(req, res) {
    try {
      const { name, brand, model, description, image_url } = req.body;
      
      // Validation
      if (!name || !name.trim()) {
        return res.status(400).json({
          success: false,
          error: 'Le nom du véhicule est requis'
        });
      }
      
      if (!brand || !brand.trim()) {
        return res.status(400).json({
          success: false,
          error: 'La marque est requise'
        });
      }
      
      if (!model || !model.trim()) {
        return res.status(400).json({
          success: false,
          error: 'Le modèle est requis'
        });
      }
      
      const vehicle = await Vehicle.create({
        name: name.trim(),
        brand: brand.trim(),
        model: model.trim(),
        description: description?.trim() || null,
        image_url: image_url || null
      });
      
      console.log('✅ Vehicle created:', vehicle.name);
      
      res.status(201).json({
        success: true,
        message: 'Véhicule ajouté avec succès !',
        data: vehicle
      });
    } catch (error) {
      console.error('❌ VehicleController.create error:', error.message);
      res.status(500).json({
        success: false,
        error: 'Erreur lors de la création du véhicule',
        message: error.message
      });
    }
  }

  /**
   * PUT /api/vehicles/:id
   * Update a vehicle
   */
  static async update(req, res) {
    try {
      const { id } = req.params;
      const updateData = req.body;
      
      if (!id || isNaN(parseInt(id))) {
        return res.status(400).json({
          success: false,
          error: 'Valid vehicle ID is required'
        });
      }
      
      // Check if vehicle exists
      const existing = await Vehicle.findById(id);
      if (!existing) {
        return res.status(404).json({
          success: false,
          error: 'Vehicle not found'
        });
      }
      
      const vehicle = await Vehicle.update(id, updateData);
      
      if (!vehicle) {
        return res.status(400).json({
          success: false,
          error: 'No fields to update'
        });
      }
      
      res.status(200).json({
        success: true,
        message: 'Véhicule mis à jour avec succès',
        data: vehicle
      });
    } catch (error) {
      console.error('❌ VehicleController.update error:', error.message);
      res.status(500).json({
        success: false,
        error: 'Erreur lors de la mise à jour du véhicule',
        message: error.message
      });
    }
  }

  /**
   * DELETE /api/vehicles/:id
   * Delete a vehicle
   */
  static async delete(req, res) {
    try {
      const { id } = req.params;
      
      if (!id || isNaN(parseInt(id))) {
        return res.status(400).json({
          success: false,
          error: 'Valid vehicle ID is required'
        });
      }
      
      const vehicle = await Vehicle.delete(id);
      
      if (!vehicle) {
        return res.status(404).json({
          success: false,
          error: 'Vehicle not found'
        });
      }
      
      console.log('✅ Vehicle deleted:', vehicle.name);
      
      res.status(200).json({
        success: true,
        message: 'Véhicule supprimé avec succès',
        data: { id: vehicle.id, name: vehicle.name }
      });
    } catch (error) {
      console.error('❌ VehicleController.delete error:', error.message);
      res.status(500).json({
        success: false,
        error: 'Erreur lors de la suppression du véhicule',
        message: error.message
      });
    }
  }

  /**
   * GET /api/vehicles/search?q=query
   * Search vehicles
   */
  static async search(req, res) {
    try {
      const { q } = req.query;
      
      if (!q || !q.trim()) {
        return res.status(400).json({
          success: false,
          error: 'Search query is required'
        });
      }
      
      const vehicles = await Vehicle.search(q.trim());
      
      res.status(200).json({
        success: true,
        count: vehicles.length,
        data: vehicles
      });
    } catch (error) {
      console.error('❌ VehicleController.search error:', error.message);
      res.status(200).json({
        success: true,
        count: 0,
        data: []
      });
    }
  }
}

module.exports = VehicleController;

