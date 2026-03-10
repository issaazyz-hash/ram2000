/**
 * Modeles Router
 * Manages global modele list (dropdown options)
 */

const express = require('express');
const router = express.Router();
const pool = require('../db/pool');
const createGlobalSettingsTable = require('../migrations/create_global_settings_table');

/**
 * GET /api/modeles
 * Returns the list of all available modeles
 */
router.get('/', async (req, res) => {
  try {
    // Ensure table exists
    await createGlobalSettingsTable();

    const result = await pool.query(
      "SELECT setting_value FROM global_settings WHERE setting_key = 'modele_list'"
    );

    if (result.rows.length === 0) {
      // Initialize with default list
      const defaultList = [
        "Kia Picanto",
        "Kia Rio",
        "Kia Sportage",
        "Hyundai i10",
        "Hyundai i20",
        "Peugeot 208",
        "Peugeot 308",
        "Renault Clio",
        "Renault Megane",
        "Volkswagen Golf",
        "Volkswagen Polo"
      ];
      await pool.query(
        `INSERT INTO global_settings (setting_key, setting_value)
         VALUES ('modele_list', $1::jsonb)
         RETURNING setting_value`,
        [JSON.stringify(defaultList)]
      );
      return res.json(defaultList);
    }

    let modeleList = result.rows[0].setting_value;
    
    // Parse JSONB if it's a string
    if (typeof modeleList === 'string') {
      try {
        modeleList = JSON.parse(modeleList);
      } catch (e) {
        modeleList = [];
      }
    }
    
    if (!Array.isArray(modeleList)) {
      modeleList = [];
    }

    return res.json(modeleList);

  } catch (error) {
    console.error('❌ Error in GET /api/modeles:', error.message);
    return res.status(500).json({
      success: false,
      error: 'Server error'
    });
  }
});

/**
 * POST /api/modeles
 * Add or delete a modele from the global list
 * Body: { action: "add" | "delete", value: "Model Name" }
 */
router.post('/', async (req, res) => {
  try {
    const { action, value } = req.body;

    if (!action || !value) {
      return res.status(400).json({
        success: false,
        error: 'Action and value are required'
      });
    }

    if (action !== 'add' && action !== 'delete') {
      return res.status(400).json({
        success: false,
        error: 'Action must be "add" or "delete"'
      });
    }

    // Ensure table exists
    await createGlobalSettingsTable();

    // Get current list
    const result = await pool.query(
      "SELECT setting_value FROM global_settings WHERE setting_key = 'modele_list'"
    );

    let modeleList = [];

    if (result.rows.length > 0) {
      modeleList = result.rows[0].setting_value;
      
      // Parse JSONB if it's a string
      if (typeof modeleList === 'string') {
        try {
          modeleList = JSON.parse(modeleList);
        } catch (e) {
          modeleList = [];
        }
      }
      
      if (!Array.isArray(modeleList)) {
        modeleList = [];
      }
    }

    // Perform action
    if (action === 'add') {
      const trimmedValue = value.trim();
      if (trimmedValue && !modeleList.includes(trimmedValue)) {
        modeleList.push(trimmedValue);
      }
    } else if (action === 'delete') {
      modeleList = modeleList.filter(m => m !== value);
    }

    // Save updated list
    await pool.query(
      `INSERT INTO global_settings (setting_key, setting_value, updated_at)
       VALUES ('modele_list', $1::jsonb, NOW())
       ON CONFLICT (setting_key)
       DO UPDATE SET
         setting_value = EXCLUDED.setting_value,
         updated_at = NOW()
       RETURNING setting_value`,
      [JSON.stringify(modeleList)]
    );

    return res.json(modeleList);

  } catch (error) {
    console.error('❌ Error in POST /api/modeles:', error.message);
    return res.status(500).json({
      success: false,
      error: 'Server error'
    });
  }
});

module.exports = router;

