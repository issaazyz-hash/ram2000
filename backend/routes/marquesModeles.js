/**
 * Admin Marques and Modeles Routes
 * Handles marque/modèle CRUD and product linking (admin only)
 * Mounted at /api/admin
 */

const express = require('express');
const router = express.Router();
const pool = require('../db/pool');
const requireAdmin = require('../middlewares/requireAdmin');
const createMarquesModelesTables = require('../migrations/create_marques_modeles_tables');

// Admin endpoints - CRUD for marques
router.get('/marques', requireAdmin, async (req, res) => {
  try {
    await createMarquesModelesTables();
    
    const result = await pool.query(
      'SELECT id, name, created_at FROM marques ORDER BY name ASC'
    );

    return res.status(200).json({
      success: true,
      marques: result.rows
    });
  } catch (error) {
    console.error('[GET /api/admin/marques] Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération des marques'
    });
  }
});

router.post('/marques', requireAdmin, async (req, res) => {
  try {
    await createMarquesModelesTables();
    
    const { name } = req.body;
    if (!name || typeof name !== 'string' || !name.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Le nom de la marque est requis'
      });
    }

    const result = await pool.query(
      `INSERT INTO marques (name) VALUES ($1) RETURNING id, name`,
      [name.trim()]
    );

    return res.status(201).json({
      success: true,
      marque: result.rows[0]
    });
  } catch (error) {
    if (error.code === '23505') {
      return res.status(400).json({
        success: false,
        message: 'Cette marque existe déjà'
      });
    }
    console.error('[POST /api/admin/marques] Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Erreur lors de la création de la marque'
    });
  }
});

router.put('/marques/:id', requireAdmin, async (req, res) => {
  try {
    await createMarquesModelesTables();
    
    const { id } = req.params;
    const { name } = req.body;
    
    if (!name || typeof name !== 'string' || !name.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Le nom de la marque est requis'
      });
    }

    const idInt = parseInt(id);
    if (isNaN(idInt)) {
      return res.status(400).json({
        success: false,
        message: 'ID invalide'
      });
    }

    const result = await pool.query(
      'UPDATE marques SET name = $1 WHERE id = $2 RETURNING id, name',
      [name.trim(), idInt]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Marque introuvable'
      });
    }

    return res.status(200).json({
      success: true,
      marque: result.rows[0]
    });
  } catch (error) {
    if (error.code === '23505') {
      return res.status(400).json({
        success: false,
        message: 'Cette marque existe déjà'
      });
    }
    console.error('[PUT /api/admin/marques/:id] Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Erreur lors de la mise à jour de la marque'
    });
  }
});

router.delete('/marques/:id', requireAdmin, async (req, res) => {
  try {
    await createMarquesModelesTables();
    
    const { id } = req.params;
    const idInt = parseInt(id);
    if (isNaN(idInt)) {
      return res.status(400).json({
        success: false,
        message: 'ID invalide'
      });
    }

    await pool.query('DELETE FROM marques WHERE id = $1', [idInt]);

    return res.status(200).json({
      success: true,
      message: 'Marque supprimée'
    });
  } catch (error) {
    console.error('[DELETE /api/admin/marques/:id] Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Erreur lors de la suppression de la marque'
    });
  }
});

// Admin endpoints - CRUD for modeles
router.get('/modeles', requireAdmin, async (req, res) => {
  try {
    await createMarquesModelesTables();
    
    const { marqueId } = req.query;
    
    let query = 'SELECT id, name, marque_id, created_at FROM modeles';
    let params = [];
    
    if (marqueId) {
      const marqueIdInt = parseInt(marqueId);
      if (!isNaN(marqueIdInt)) {
        query += ' WHERE marque_id = $1';
        params.push(marqueIdInt);
      }
    }
    
    query += ' ORDER BY name ASC';
    
    const result = await pool.query(query, params);

    return res.status(200).json({
      success: true,
      modeles: result.rows
    });
  } catch (error) {
    console.error('[GET /api/admin/modeles] Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération des modèles'
    });
  }
});

router.post('/modeles', requireAdmin, async (req, res) => {
  try {
    await createMarquesModelesTables();
    
    const { marqueId, name } = req.body;
    if (!name || typeof name !== 'string' || !name.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Le nom du modèle est requis'
      });
    }
    if (!marqueId) {
      return res.status(400).json({
        success: false,
        message: 'La marque est requise'
      });
    }

    const marqueIdInt = parseInt(marqueId);
    if (isNaN(marqueIdInt)) {
      return res.status(400).json({
        success: false,
        message: 'ID de marque invalide'
      });
    }

    const result = await pool.query(
      `INSERT INTO modeles (marque_id, name) VALUES ($1, $2) RETURNING id, name, marque_id`,
      [marqueIdInt, name.trim()]
    );

    return res.status(201).json({
      success: true,
      modele: result.rows[0]
    });
  } catch (error) {
    if (error.code === '23505') {
      return res.status(400).json({
        success: false,
        message: 'Ce modèle existe déjà pour cette marque'
      });
    }
    if (error.code === '23503') {
      return res.status(400).json({
        success: false,
        message: 'Marque introuvable'
      });
    }
    console.error('[POST /api/admin/modeles] Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Erreur lors de la création du modèle'
    });
  }
});

router.put('/modeles/:id', requireAdmin, async (req, res) => {
  try {
    await createMarquesModelesTables();
    
    const { id } = req.params;
    const { name } = req.body;
    
    if (!name || typeof name !== 'string' || !name.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Le nom du modèle est requis'
      });
    }

    const idInt = parseInt(id);
    if (isNaN(idInt)) {
      return res.status(400).json({
        success: false,
        message: 'ID invalide'
      });
    }

    const result = await pool.query(
      'UPDATE modeles SET name = $1 WHERE id = $2 RETURNING id, name, marque_id',
      [name.trim(), idInt]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Modèle introuvable'
      });
    }

    return res.status(201).json({
      success: true,
      modele: result.rows[0]
    });
  } catch (error) {
    if (error.code === '23505') {
      return res.status(400).json({
        success: false,
        message: 'Ce modèle existe déjà pour cette marque'
      });
    }
    console.error('[PUT /api/admin/modeles/:id] Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Erreur lors de la mise à jour du modèle'
    });
  }
});

router.delete('/modeles/:id', requireAdmin, async (req, res) => {
  try {
    await createMarquesModelesTables();
    
    const { id } = req.params;
    const idInt = parseInt(id);
    if (isNaN(idInt)) {
      return res.status(400).json({
        success: false,
        message: 'ID invalide'
      });
    }

    await pool.query('DELETE FROM modeles WHERE id = $1', [idInt]);

    return res.status(200).json({
      success: true,
      message: 'Modèle supprimé'
    });
  } catch (error) {
    console.error('[DELETE /api/admin/modeles/:id] Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Erreur lors de la suppression du modèle'
    });
  }
});

// Admin endpoints - Link marque to product
router.get('/products/:slug/marques', requireAdmin, async (req, res) => {
  try {
    await createMarquesModelesTables();
    
    const { slug } = req.params;

    const result = await pool.query(
      `SELECT m.id, m.name 
       FROM marques m
       INNER JOIN product_marques pm ON pm.marque_id = m.id
       WHERE pm.product_slug = $1
       ORDER BY m.name ASC`,
      [slug]
    );

    return res.status(200).json({
      success: true,
      marques: result.rows
    });
  } catch (error) {
    console.error('[GET /api/admin/products/:slug/marques] Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération des marques'
    });
  }
});

router.post('/products/:slug/marques', requireAdmin, async (req, res) => {
  try {
    await createMarquesModelesTables();
    
    const { slug } = req.params;
    const { marqueId } = req.body;

    if (!marqueId) {
      return res.status(400).json({
        success: false,
        message: 'marqueId est requis'
      });
    }

    const marqueIdInt = parseInt(marqueId);
    if (isNaN(marqueIdInt)) {
      return res.status(400).json({
        success: false,
        message: 'ID de marque invalide'
      });
    }

    await pool.query(
      `INSERT INTO product_marques (product_slug, marque_id) 
       VALUES ($1, $2) 
       ON CONFLICT (product_slug, marque_id) DO NOTHING`,
      [slug, marqueIdInt]
    );

    return res.status(200).json({
      success: true,
      message: 'Marque liée au produit'
    });
  } catch (error) {
    if (error.code === '23503') {
      return res.status(400).json({
        success: false,
        message: 'Marque introuvable'
      });
    }
    console.error('[POST /api/admin/products/:slug/marques] Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Erreur lors de la liaison de la marque'
    });
  }
});

router.delete('/products/:slug/marques/:marqueId', requireAdmin, async (req, res) => {
  try {
    await createMarquesModelesTables();
    
    const { slug, marqueId } = req.params;
    const marqueIdInt = parseInt(marqueId);
    
    if (isNaN(marqueIdInt)) {
      return res.status(400).json({
        success: false,
        message: 'ID de marque invalide'
      });
    }

    await pool.query(
      'DELETE FROM product_marques WHERE product_slug = $1 AND marque_id = $2',
      [slug, marqueIdInt]
    );

    return res.status(200).json({
      success: true,
      message: 'Marque retirée du produit'
    });
  } catch (error) {
    console.error('[DELETE /api/admin/products/:slug/marques/:marqueId] Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Erreur lors de la suppression de la liaison'
    });
  }
});

// Admin endpoints - Link modele to product
router.get('/products/:slug/modeles', requireAdmin, async (req, res) => {
  try {
    await createMarquesModelesTables();
    
    const { slug } = req.params;

    const result = await pool.query(
      `SELECT m.id, m.name, m.marque_id 
       FROM modeles m
       INNER JOIN product_modeles pm ON pm.modele_id = m.id
       WHERE pm.product_slug = $1
       ORDER BY m.name ASC`,
      [slug]
    );

    return res.status(200).json({
      success: true,
      modeles: result.rows
    });
  } catch (error) {
    console.error('[GET /api/admin/products/:slug/modeles] Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération des modèles'
    });
  }
});

router.post('/products/:slug/modeles', requireAdmin, async (req, res) => {
  try {
    await createMarquesModelesTables();
    
    const { slug } = req.params;
    const { modeleId } = req.body;

    if (!modeleId) {
      return res.status(400).json({
        success: false,
        message: 'modeleId est requis'
      });
    }

    const modeleIdInt = parseInt(modeleId);
    if (isNaN(modeleIdInt)) {
      return res.status(400).json({
        success: false,
        message: 'ID de modèle invalide'
      });
    }

    await pool.query(
      `INSERT INTO product_modeles (product_slug, modele_id) 
       VALUES ($1, $2) 
       ON CONFLICT (product_slug, modele_id) DO NOTHING`,
      [slug, modeleIdInt]
    );

    return res.status(200).json({
      success: true,
      message: 'Modèle lié au produit'
    });
  } catch (error) {
    if (error.code === '23503') {
      return res.status(400).json({
        success: false,
        message: 'Modèle introuvable'
      });
    }
    console.error('[POST /api/admin/products/:slug/modeles] Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Erreur lors de la liaison du modèle'
    });
  }
});

router.delete('/products/:slug/modeles/:modeleId', requireAdmin, async (req, res) => {
  try {
    await createMarquesModelesTables();
    
    const { slug, modeleId } = req.params;
    const modeleIdInt = parseInt(modeleId);
    
    if (isNaN(modeleIdInt)) {
      return res.status(400).json({
        success: false,
        message: 'ID de modèle invalide'
      });
    }

    await pool.query(
      'DELETE FROM product_modeles WHERE product_slug = $1 AND modele_id = $2',
      [slug, modeleIdInt]
    );

    return res.status(200).json({
      success: true,
      message: 'Modèle retiré du produit'
    });
  } catch (error) {
    console.error('[DELETE /api/admin/products/:slug/modeles/:modeleId] Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Erreur lors de la suppression de la liaison'
    });
  }
});

// Public read-only endpoints (no authentication required)
router.get('/public/marques', async (req, res) => {
  try {
    await createMarquesModelesTables();
    
    const result = await pool.query(
      'SELECT id, name, created_at FROM marques ORDER BY name ASC'
    );

    return res.status(200).json({
      success: true,
      marques: result.rows
    });
  } catch (error) {
    console.error('[GET /api/public/marques] Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération des marques'
    });
  }
});

router.get('/public/modeles', async (req, res) => {
  try {
    await createMarquesModelesTables();
    
    const { marque_id } = req.query;
    
    let query = 'SELECT id, name, marque_id, created_at FROM modeles';
    let params = [];
    
    if (marque_id) {
      const marqueIdInt = parseInt(marque_id);
      if (!isNaN(marqueIdInt)) {
        query += ' WHERE marque_id = $1';
        params.push(marqueIdInt);
      }
    }
    
    query += ' ORDER BY name ASC';
    
    const result = await pool.query(query, params);

    return res.status(200).json({
      success: true,
      modeles: result.rows
    });
  } catch (error) {
    console.error('[GET /api/public/modeles] Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération des modèles'
    });
  }
});

module.exports = router;

