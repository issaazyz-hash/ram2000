/**
 * Public Marques and Modeles Routes
 * Read-only endpoints accessible to all users (no authentication)
 * Mounted at /api/public
 */

const express = require('express');
const router = express.Router();
const pool = require('../db/pool');
const createMarquesModelesTables = require('../migrations/create_marques_modeles_tables');

// Public endpoint - Get all marques
router.get('/marques', async (req, res) => {
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

// Public endpoint - Get modeles (optionally filtered by marque_id)
router.get('/modeles', async (req, res) => {
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

