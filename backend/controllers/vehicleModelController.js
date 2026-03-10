/**
 * VehicleModel Controller
 * Handles HTTP requests for vehicle models
 */

const VehicleModel = require('../models/VehicleModel');
const {
  normalizeVehicleEntry,
  dedupeVehicleModels,
} = require('../utils/vehicleModelUtils');

class VehicleModelController {
  /**
   * Get all models for a specific marque
   * GET /api/vehicleModels/:marque
   */
  static async getModelsByMarque(req, res) {
    try {
      const { marque } = req.params;
      
      if (!marque) {
        return res.status(400).json({
          success: false,
          message: 'Marque parameter is required'
        });
      }

      const decodedMarque = decodeURIComponent(marque);
      const models = await VehicleModel.findByMarque(decodedMarque);
      const normalized = dedupeVehicleModels(
        (models || []).map((entry) => normalizeVehicleEntry(entry))
      );
      
      res.status(200).json({
        success: true,
        count: normalized.length,
        marque: decodedMarque,
        data: normalized,
      });
    } catch (error) {
      console.error('Error getting models by marque:', error.message);
      res.status(200).json({
        success: true,
        count: 0,
        data: []
      });
    }
  }

  /**
   * Get all vehicle models
   * GET /api/vehicleModels
   * Filters out invalid rows and orders by marque, then model
   */
  static async getAll(req, res) {
    try {
      const allModels = await VehicleModel.findAll();
      
      // DEBUG LOG: Print total rows and counts by marque
      console.log(`🔍 [DEBUG] GET /api/vehicleModels: Found ${allModels.length} total rows in DB`);
      
      const countsByMarque = allModels.reduce((acc, m) => {
        const marque = m.marque || 'Unknown';
        acc[marque] = (acc[marque] || 0) + 1;
        return acc;
      }, {});
      console.log(`🔍 [DEBUG] Counts by marque:`, countsByMarque);
      
      // DEBUG LOG: Print first 10 rows
      if (allModels.length > 0) {
        console.log(`🔍 [DEBUG] First 10 rows from DB:`);
        allModels.slice(0, 10).forEach((m, index) => {
          console.log(`   ${index + 1}. ID: ${m.id}, marque: "${m.marque}", model: "${m.model}"`);
        });
      }
      
      // Filter out invalid rows where model is not a string, empty, or equals "[object Object]" or "Object"
      // Data integrity check: Log rejected models once for debugging
      const rejectedModels = [];
      
      const validModels = allModels.filter((model) => {
        // Must have model field
        if (!model.model) {
          rejectedModels.push({ id: model.id, marque: model.marque, model: model.model, reason: 'Missing model field' });
          return false;
        }
        
        // Must be a string
        if (typeof model.model !== 'string') {
          rejectedModels.push({ id: model.id, marque: model.marque, model: model.model, reason: 'Model is not a string' });
          return false;
        }
        
        // Must not be empty after trimming
        const trimmedModel = model.model.trim();
        if (trimmedModel.length === 0) {
          rejectedModels.push({ id: model.id, marque: model.marque, model: model.model, reason: 'Model is empty after trim' });
          return false;
        }
        
        // REQUIRE length >= 3 to filter out "BB", "yy", "XCXV", "bbb"
        if (trimmedModel.length < 3) {
          rejectedModels.push({ id: model.id, marque: model.marque, model: model.model, reason: `Model too short (length ${trimmedModel.length} < 3)` });
          return false;
        }
        
        // Must not be "[object Object]" or "Object"
        const lowerModel = trimmedModel.toLowerCase();
        if (lowerModel === '[object object]' || lowerModel === 'object') {
          rejectedModels.push({ id: model.id, marque: model.marque, model: model.model, reason: 'Model is "Object" or "[object Object]"' });
          return false;
        }
        
        // Must have valid marque
        if (!model.marque || typeof model.marque !== 'string') {
          rejectedModels.push({ id: model.id, marque: model.marque, model: model.model, reason: 'Invalid or missing marque' });
          return false;
        }
        
        const trimmedMarque = model.marque.trim();
        if (trimmedMarque.length === 0) {
          rejectedModels.push({ id: model.id, marque: model.marque, model: model.model, reason: 'Marque is empty after trim' });
          return false;
        }
        
        // REQUIRE marque length >= 3 to filter out "BB", "XCXV", etc.
        if (trimmedMarque.length < 3) {
          rejectedModels.push({ id: model.id, marque: model.marque, model: model.model, reason: `Marque too short (length ${trimmedMarque.length} < 3)` });
          return false;
        }
        
        // Reject "Object" in marque
        const lowerMarque = trimmedMarque.toLowerCase();
        if (lowerMarque === '[object object]' || lowerMarque === 'object') {
          rejectedModels.push({ id: model.id, marque: model.marque, model: model.model, reason: 'Marque is "Object" or "[object Object]"' });
          return false;
        }
        
        return true;
      });
      
      // Order by marque, then model (already done in VehicleModel.findAll, but ensure it)
      validModels.sort((a, b) => {
        const marqueCompare = (a.marque || '').localeCompare(b.marque || '');
        if (marqueCompare !== 0) return marqueCompare;
        return (a.model || '').localeCompare(b.model || '');
      });
      
      // Normalize display + dedupe to prevent duplicates in compatibility lists.
      const normalizedModels = validModels.map((entry) => normalizeVehicleEntry(entry));
      const dedupedModels = dedupeVehicleModels(normalizedModels);
      const removedCount = normalizedModels.length - dedupedModels.length;
      if (removedCount > 0 && process.env.NODE_ENV !== 'production') {
        console.log(`🧹 [vehicleModels] Removed ${removedCount} duplicate entries before responding`);
      }
      
      // Data integrity check: Log rejected models once for debugging
      if (rejectedModels.length > 0) {
        console.warn(`⚠️ [DATA INTEGRITY] Rejected ${rejectedModels.length} invalid vehicle models:`);
        rejectedModels.slice(0, 10).forEach((rejected, index) => {
          console.warn(`   ${index + 1}. ID: ${rejected.id}, marque: "${rejected.marque}", model: "${rejected.model}" - Reason: ${rejected.reason}`);
        });
        if (rejectedModels.length > 10) {
          console.warn(`   ... and ${rejectedModels.length - 10} more rejected models`);
        }
      }
      
      console.log(`✅ GET /api/vehicleModels: Returning ${dedupedModels.length} valid models (filtered ${allModels.length - dedupedModels.length} invalid/duplicate)`);
      
      // REMOVE DEBUG LOGS AFTER VERIFICATION
      // TODO: Remove the [DEBUG] logs above after confirming the fix works
      console.log(`📊 Models by marque:`, validModels.reduce((acc, m) => {
        acc[m.marque] = (acc[m.marque] || 0) + 1;
        return acc;
      }, {}));
      
      // Ensure no hardcoded/mock data - only return what's in database
      res.status(200).json({
        success: true,
        count: dedupedModels.length,
        data: dedupedModels, // Only normalized, deduped data from database
      });
    } catch (error) {
      console.error('Error getting all models:', error.message);
      // Return empty array on error - do NOT inject fake/mock data
      res.status(200).json({
        success: true,
        count: 0,
        data: [] // Empty array, not mock data
      });
    }
  }

  /**
   * Get a vehicle model by ID
   * GET /api/vehicleModels/id/:id
   */
  static async getById(req, res) {
    try {
      const { id } = req.params;
      const model = await VehicleModel.findById(id);
      
      if (!model) {
        return res.status(404).json({
          success: false,
          message: 'Modèle non trouvé'
        });
      }
      
      res.status(200).json({
        success: true,
        data: model
      });
    } catch (error) {
      console.error('Error getting model by ID:', error.message);
      res.status(500).json({
        success: false,
        message: 'Erreur serveur',
        error: error.message
      });
    }
  }

  /**
   * Create a new vehicle model
   * POST /api/vehicleModels
   * Validates marque and model to prevent bad data
   */
  static async create(req, res) {
    try {
      const { marque, model, description, image } = req.body;
      
      // Validation
      if (!marque || !marque.trim()) {
        return res.status(400).json({
          success: false,
          message: 'La marque est requise'
        });
      }
      
      if (!model || !model.trim()) {
        return res.status(400).json({
          success: false,
          message: 'Le modèle est requis'
        });
      }
      
      const trimmedMarque = marque.trim();
      const trimmedModel = model.trim();
      
      // Validate length >= 3 to prevent "BB", "yy", "XCXV", "bbb"
      if (trimmedMarque.length < 3) {
        return res.status(400).json({
          success: false,
          message: 'La marque doit contenir au moins 3 caractères'
        });
      }
      
      if (trimmedModel.length < 3) {
        return res.status(400).json({
          success: false,
          message: 'Le modèle doit contenir au moins 3 caractères'
        });
      }
      
      // Reject "Object" patterns
      const lowerMarque = trimmedMarque.toLowerCase();
      const lowerModel = trimmedModel.toLowerCase();
      
      if (lowerMarque === 'object' || lowerMarque === '[object object]') {
        return res.status(400).json({
          success: false,
          message: 'Marque invalide: "Object" n\'est pas autorisé'
        });
      }
      
      if (lowerModel === 'object' || lowerModel === '[object object]') {
        return res.status(400).json({
          success: false,
          message: 'Modèle invalide: "Object" n\'est pas autorisé'
        });
      }
      
      // Reject short all-caps patterns (BB, XCXV, etc.)
      if (/^[A-Z]{1,3}$/.test(trimmedMarque)) {
        return res.status(400).json({
          success: false,
          message: 'Marque invalide: format suspect (trop court)'
        });
      }
      
      if (/^[A-Z]{1,3}$/.test(trimmedModel)) {
        return res.status(400).json({
          success: false,
          message: 'Modèle invalide: format suspect (trop court)'
        });
      }

      const newModel = await VehicleModel.create({
        marque: trimmedMarque,
        model: trimmedModel,
        description: description?.trim() || null,
        image: image || null
      });
      
      res.status(201).json({
        success: true,
        message: 'Modèle ajouté avec succès !',
        data: newModel
      });
    } catch (error) {
      console.error('Error creating vehicle model:', error.message);
      res.status(500).json({
        success: false,
        message: 'Erreur lors de la création du modèle',
        error: error.message
      });
    }
  }

  /**
   * Update a vehicle model
   * PUT /api/vehicleModels/:id
   */
  static async update(req, res) {
    try {
      const { id } = req.params;
      const { model, description, image } = req.body;
      
      const existingModel = await VehicleModel.findById(id);
      if (!existingModel) {
        return res.status(404).json({
          success: false,
          message: 'Modèle non trouvé'
        });
      }

      const updatedModel = await VehicleModel.update(id, {
        model: model?.trim(),
        description: description?.trim(),
        image
      });
      
      res.status(200).json({
        success: true,
        message: 'Modèle mis à jour avec succès',
        data: updatedModel
      });
    } catch (error) {
      console.error('Error updating vehicle model:', error.message);
      res.status(500).json({
        success: false,
        message: 'Erreur lors de la mise à jour',
        error: error.message
      });
    }
  }

  /**
   * Delete a vehicle model
   * DELETE /api/vehicleModels/:id
   */
  static async delete(req, res) {
    try {
      const { id } = req.params;
      
      const existingModel = await VehicleModel.findById(id);
      if (!existingModel) {
        return res.status(404).json({
          success: false,
          message: 'Modèle non trouvé'
        });
      }

      const deletedModel = await VehicleModel.delete(id);
      
      res.status(200).json({
        success: true,
        message: 'Modèle supprimé avec succès',
        data: {
          id: deletedModel.id,
          model: deletedModel.model
        }
      });
    } catch (error) {
      console.error('Error deleting vehicle model:', error.message);
      res.status(500).json({
        success: false,
        message: 'Erreur lors de la suppression',
        error: error.message
      });
    }
  }
}

module.exports = VehicleModelController;

