const pool = require('../db/pool');
const ApiResponse = require('../utils/apiResponse');
const path = require('path');
const fs = require('fs');
const PromotionCategoryProductSyncService = require('../services/PromotionCategoryProductSyncService');

function extractPromotionsArray(content) {
  if (!content) return [];
  const parsed = typeof content === 'string'
    ? (() => { try { return JSON.parse(content); } catch (e) { return null; } })()
    : content;
  if (!parsed) return [];
  if (Array.isArray(parsed)) return parsed;
  if (parsed.promotions && Array.isArray(parsed.promotions)) return parsed.promotions;
  if (parsed.items && Array.isArray(parsed.items)) return parsed.items;
  return [];
}

exports.getSectionContent = async (req, res) => {
  try {
    const sectionType = req.query.sectionType;
    const modelId = req.query.modelId ? parseInt(req.query.modelId, 10) : null;

    if (!sectionType) {
      return res.status(400).json({ 
        success: false, 
        message: "sectionType query parameter is required",
        code: "MISSING_PARAMETER"
      });
    }

    // If modelId is provided and sectionType is famille_categories, filter by model
    if (modelId && !isNaN(modelId) && sectionType === 'famille_categories') {
      let allowedFamilleIds = null;
      let fallbackReason = null;
      
      // Try to get allowed famille_ids for this model from pivot table
      // Use try-catch to handle missing table or query errors gracefully
      try {
        // Check if table exists first (safe query)
        const tableExists = await pool.query(`
          SELECT EXISTS (
            SELECT FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name = 'vehicle_model_familles'
          )
        `);
        
        if (tableExists.rows[0]?.exists) {
          const familleIdsResult = await pool.query(
            "SELECT famille_id FROM vehicle_model_familles WHERE model_id = $1",
            [modelId]
          );
          
          if (familleIdsResult.rows.length > 0) {
            allowedFamilleIds = new Set(familleIdsResult.rows.map(row => row.famille_id));
            console.log(`✅ [FILTER] Filtering familles for modelId=${modelId}, allowed count: ${allowedFamilleIds.size}`);
          } else {
            fallbackReason = 'No mappings found for this model';
            console.log(`⚠️  [FALLBACK] modelId=${modelId}: ${fallbackReason} - returning all familles`);
          }
        } else {
          fallbackReason = 'vehicle_model_familles table does not exist';
          console.log(`⚠️  [FALLBACK] modelId=${modelId}: ${fallbackReason} - returning all familles`);
        }
      } catch (queryError) {
        // Table might not exist or query failed - fallback to unfiltered
        fallbackReason = `Query error: ${queryError.message}`;
        console.warn(`⚠️  [FALLBACK] modelId=${modelId}: ${fallbackReason} - returning all familles`);
      }
      
      // Get section content
      const result = await pool.query(
        "SELECT * FROM section_content WHERE section_type = $1",
        [sectionType]
      );

      if (result.rows.length === 0) {
        return res.status(200).json({
          success: true,
          data: {
            section_type: sectionType,
            title: null,
            content: []
          }
        });
      }

      const sectionData = result.rows[0];
      let content = sectionData.content;
      
      // If we have allowed IDs, filter the content
      if (allowedFamilleIds && allowedFamilleIds.size > 0) {
        // Handle both array and object with items/categories property
        let contentArray = null;
        let isObjectShape = false;
        let arrayKey = null;
        
        if (Array.isArray(content)) {
          contentArray = content;
        } else if (content && typeof content === 'object') {
          if (content.items && Array.isArray(content.items)) {
            contentArray = content.items;
            isObjectShape = true;
            arrayKey = 'items';
          } else if (content.categories && Array.isArray(content.categories)) {
            contentArray = content.categories;
            isObjectShape = true;
            arrayKey = 'categories';
          }
        }
        
        if (contentArray && Array.isArray(contentArray)) {
          // Filter familles by allowed IDs
          // Support multiple ID field names: id, famille_id, slug
          const filteredArray = contentArray.filter(famille => {
            if (!famille || typeof famille !== 'object') return false;
            const familleId = famille.id || famille.famille_id || famille.slug;
            return familleId && allowedFamilleIds.has(familleId);
          });
          
          // Return in same shape as stored
          if (isObjectShape) {
            return res.status(200).json({
              success: true,
              data: {
                ...sectionData,
                content: {
                  ...content,
                  [arrayKey]: filteredArray
                }
              }
            });
          } else {
            return res.status(200).json({
              success: true,
              data: {
                ...sectionData,
                content: filteredArray
              }
            });
          }
        }
      }
      
      // Fallback: return unfiltered content (backward compatibility)
      // This happens if: table missing, query failed, no mappings, or content shape not recognized
      return res.status(200).json({
        success: true,
        data: sectionData
      });
    }

    // Default behavior: return all content (no modelId or not famille_categories)
    const result = await pool.query(
      "SELECT * FROM section_content WHERE section_type = $1",
      [sectionType]
    );

    if (result.rows.length === 0) {
      // Return 200 with null content (frontend expects this, not 404)
      console.log('[sectionContent] GET sectionType=%s found=false', sectionType);
      return res.status(200).json({
        success: true,
        data: {
          sectionType,
          section_type: sectionType,
          title: null,
          content: null
        }
      });
    }

    console.log('[sectionContent] GET sectionType=%s found=true', sectionType);
    return res.status(200).json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    console.error("getSectionContent error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to load section content",
      code: "DATABASE_ERROR",
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Clean data to ensure it's JSON-serializable (remove undefined, Date objects, Functions, Files)
 */
const cleanForJSON = (obj) => {
  if (obj === null || obj === undefined) {
    return null;
  }
  
  // Handle Date objects
  if (obj instanceof Date) {
    return obj.toISOString();
  }
  
  // Handle File/Blob objects (should never happen, but safety check)
  // Note: File/Blob are browser APIs, but we check for them just in case
  if ((typeof File !== 'undefined' && obj instanceof File) || 
      (typeof Blob !== 'undefined' && obj instanceof Blob)) {
    console.warn('⚠️ File/Blob object detected in JSON data - this should not happen!');
    return null;
  }
  
  // Handle functions (should never happen, but safety check)
  if (typeof obj === 'function') {
    console.warn('⚠️ Function detected in JSON data - this should not happen!');
    return null;
  }
  
  // Handle arrays
  if (Array.isArray(obj)) {
    return obj.map(item => cleanForJSON(item)).filter(item => item !== undefined);
  }
  
  // Handle objects
  if (typeof obj === 'object') {
    const cleaned = {};
    for (const key in obj) {
      if (obj.hasOwnProperty(key) && obj[key] !== undefined) {
        const cleanedValue = cleanForJSON(obj[key]);
        if (cleanedValue !== undefined) {
          cleaned[key] = cleanedValue;
        }
      }
    }
    return cleaned;
  }
  
  // Primitive values (string, number, boolean) are safe
  return obj;
};

/**
 * Validate and prepare JSONB content for PostgreSQL
 */
const prepareJSONBContent = (content) => {
  // If content is null or undefined, return empty object
  if (content === null || content === undefined) {
    return {};
  }
  
  // Clean the content first
  const cleaned = cleanForJSON(content);
  
  // Double-serialize to ensure clean JSON (removes any remaining undefined)
  let jsonString;
  try {
    jsonString = JSON.stringify(cleaned);
  } catch (error) {
    console.error('❌ Error stringifying content:', error);
    throw new Error(`Invalid JSON content: ${error.message}`);
  }
  
  // Parse it back to ensure it's valid JSON
  let parsed;
  try {
    parsed = JSON.parse(jsonString);
  } catch (error) {
    console.error('❌ Error parsing content:', error);
    throw new Error(`Invalid JSON content: ${error.message}`);
  }
  
  return parsed;
};

exports.updateSectionContent = async (req, res) => {
  try {
    const { sectionType, title, content } = req.body;

    if (!sectionType) {
      return res.status(400).json({
        success: false,
        message: "sectionType is required",
        code: "MISSING_PARAMETER"
      });
    }

    // Accept content as JSON string (from frontend) or object. Store exactly as sent when string (no double-stringify).
    let contentToStore; // string for ::jsonb (PG will parse)
    let parsedContent;  // for promotions sync and response
    try {
      if (typeof content === 'string') {
        parsedContent = JSON.parse(content);
        contentToStore = content; // use original string so we don't double-stringify or lose data
      } else if (content !== null && content !== undefined) {
        const cleaned = prepareJSONBContent(content);
        parsedContent = cleaned;
        contentToStore = JSON.stringify(cleaned);
      } else {
        parsedContent = {};
        contentToStore = JSON.stringify({});
      }
    } catch (error) {
      console.error('❌ Error parsing/preparing JSON content:', error);
      return res.status(400).json({
        success: false,
        message: `Invalid JSON content: ${error.message}`,
        code: "INVALID_JSON",
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }

    const contentLen = typeof contentToStore === 'string' ? contentToStore.length : 0;
    const preview = typeof contentToStore === 'string' ? contentToStore.substring(0, 200) : '';
    console.log('[sectionContent] POST sectionType=%s contentLength=%d preview=%s', sectionType, contentLen, preview);

    if (sectionType === 'cat3_pages' && Array.isArray(parsedContent) && parsedContent.length > 0) {
      const firstPage = parsedContent[0];
      const items = firstPage && Array.isArray(firstPage.items) ? firstPage.items : [];
      const firstItem = items[0];
      console.log('[sectionContent] cat3_pages request body: first item reference=', firstItem ? firstItem.reference : 'no items');
    }

    // Upsert by sectionType
    const existing = await pool.query(
      "SELECT id FROM section_content WHERE section_type = $1",
      [sectionType]
    );

    let savedRow = null;
    let statusCode = 200;
    let message = "Section content updated";

    if (existing.rows.length === 0) {
      console.log('[sectionContent] POST creating new section: %s', sectionType);
      const insert = await pool.query(
        `INSERT INTO section_content (section_type, title, content, created_at, updated_at)
         VALUES ($1, $2, $3::jsonb, NOW(), NOW())
         RETURNING *`,
        [sectionType, title || null, contentToStore]
      );
      savedRow = insert.rows[0];
      statusCode = 201;
      message = "Section content created";
    } else {
      // Update existing section - use transaction for promotions (include offre-historique cleanup)
      const client = sectionType === 'promotions' ? await pool.connect() : null;
      try {
        if (client && sectionType === 'promotions') {
          await client.query('BEGIN');

          // Fetch OLD content before update to compute removed promotions
          const oldRow = await client.query(
            'SELECT content FROM section_content WHERE section_type = $1',
            [sectionType]
          );
          const oldPromotions = oldRow.rows[0]
            ? extractPromotionsArray(oldRow.rows[0].content)
            : [];
          const newPromotions = extractPromotionsArray(parsedContent);

          const oldIds = new Set(
            oldPromotions
              .filter((p) => p && (typeof p.id === 'number' || (p.id != null && Number.isFinite(Number(p.id)))))
              .map((p) => Number(p.id))
          );
          const newIds = new Set(
            newPromotions
              .filter((p) => p && (typeof p.id === 'number' || (p.id != null && Number.isFinite(Number(p.id)))))
              .map((p) => Number(p.id))
          );
          const removedIds = [...oldIds].filter((id) => !newIds.has(id));

          const removedSlugs = [];
          oldPromotions.forEach((p) => {
            if (!p) return;
            const pid = p.id != null ? Number(p.id) : null;
            if (pid != null && removedIds.includes(pid)) {
              const slug = (p.product_slug || p.productSlug || p.slug || '').trim();
              if (slug) removedSlugs.push(slug);
            }
          });

          const update = await client.query(
            `UPDATE section_content 
             SET title = $1, content = $2::jsonb, updated_at = NOW()
             WHERE section_type = $3
             RETURNING *`,
            [title || null, contentToStore, sectionType]
          );
          savedRow = update.rows[0];

          if (removedIds.length > 0) {
            await client.query(
              `DELETE FROM offre_historique_promos WHERE promo_id = ANY($1::int[])`,
              [removedIds]
            );
            console.log('[promotions] Removed offre-historique entries for promo_ids:', removedIds);
          }
          if (removedSlugs.length > 0) {
            await client.query(
              `DELETE FROM offre_historique_promos WHERE promo_id IS NULL AND slug = ANY($1::text[])`,
              [removedSlugs]
            );
          }

          await client.query('COMMIT');
          console.log('✅ Section updated successfully (with offre-historique cleanup)');
        } else {
          const update = await pool.query(
            `UPDATE section_content 
             SET title = $1, content = $2::jsonb, updated_at = NOW()
             WHERE section_type = $3
             RETURNING *`,
            [title || null, contentToStore, sectionType]
          );
          savedRow = update.rows[0];
          console.log('[sectionContent] POST updated section: %s', sectionType);
        }
        statusCode = 200;
        message = "Section content updated";
      } catch (txError) {
        if (client) {
          await client.query('ROLLBACK').catch(() => {});
          client.release();
        }
        throw txError;
      } finally {
        if (client) client.release();
      }
    }

    if (sectionType === 'cat3_pages' && savedRow && savedRow.content) {
      let stored = savedRow.content;
      if (typeof stored === 'string') {
        try { stored = JSON.parse(stored); } catch (_) { stored = []; }
      }
      const pages = Array.isArray(stored) ? stored : [];
      const firstPage = pages[0];
      const items = firstPage && Array.isArray(firstPage.items) ? firstPage.items : [];
      const firstItem = items[0];
      console.log('[sectionContent] cat3_pages DB returned row: first item reference=', firstItem ? firstItem.reference : 'no items');
    }

    // Promotions special-case: keep category_products in sync so equivalents can match by cp.reference.
    // Non-breaking: sync failures should NOT prevent saving the section content.
    if (sectionType === 'promotions') {
      try {
        const syncResult = await PromotionCategoryProductSyncService.syncPromotionsSectionContent(parsedContent);
        if (process.env.NODE_ENV === 'development') {
          console.log('[promotions->category_products] sync result:', syncResult);
        }
      } catch (e) {
        console.warn('⚠️  [promotions->category_products] sync failed (non-fatal):', e.message);
      }
    }

    return res.status(statusCode).json({
      success: true,
      message,
      data: savedRow
    });
  } catch (error) {
    console.error("❌ updateSectionContent error:", error);
    console.error("Error details:", {
      message: error.message,
      stack: error.stack,
      code: error.code
    });
    
    // Check if it's a JSON/JSONB syntax error
    if (error.message && (
      error.message.includes('invalid input syntax for type json') ||
      error.message.includes('invalid input syntax for type jsonb')
    )) {
      return res.status(400).json({
        success: false,
        message: "Invalid JSON syntax in content. Please ensure all data is properly serialized.",
        code: "INVALID_JSON_SYNTAX",
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
    
    return res.status(500).json({
      success: false,
      message: "Failed to update section content",
      code: "DATABASE_ERROR",
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

exports.getAllSections = async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT * FROM section_content ORDER BY section_type"
    );

    return res.status(200).json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    console.error("getAllSections error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to load sections",
      code: "DATABASE_ERROR",
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

exports.deleteSection = async (req, res) => {
  try {
    const { sectionType } = req.params;

    if (!sectionType) {
      return res.status(400).json({
        success: false,
        message: "sectionType is required",
        code: "MISSING_PARAMETER"
      });
    }

    const result = await pool.query(
      "DELETE FROM section_content WHERE section_type = $1 RETURNING *",
      [sectionType]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Section not found",
        code: "NOT_FOUND"
      });
    }

    return res.status(200).json({
      success: true,
      message: "Section deleted",
      data: result.rows[0]
    });
  } catch (error) {
    console.error("deleteSection error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to delete section",
      code: "DATABASE_ERROR",
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

exports.uploadFamilleImage = async (req, res) => {
  try {
    const { famille_id } = req.body;

    if (!famille_id) {
      return res.status(400).json({
        success: false,
        error: 'famille_id is required'
      });
    }

    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'No image file uploaded'
      });
    }

    const imageUrl = `/uploads/familles/${req.file.filename}`;

    // Get current section content
    const sectionResult = await pool.query(
      "SELECT * FROM section_content WHERE section_type = $1",
      ['famille_categories']
    );

    if (sectionResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'famille_categories section not found'
      });
    }

    const section = sectionResult.rows[0];
    let content = section.content;

    // Handle both array and object with items property
    if (content && typeof content === 'object') {
      if (!Array.isArray(content) && content.items && Array.isArray(content.items)) {
        content = content.items;
      } else if (!Array.isArray(content)) {
        content = [];
      }
    } else {
      content = [];
    }

    // Find and update the famille
    const familleIndex = content.findIndex((item) => item.id === famille_id);
    
    if (familleIndex === -1) {
      return res.status(404).json({
        success: false,
        error: 'Famille not found'
      });
    }

    // Delete old image if it exists
    const oldImage = content[familleIndex].image;
    if (oldImage && oldImage.startsWith('/uploads/familles/')) {
      const oldFilename = oldImage.replace('/uploads/familles/', '');
      const uploadsDir = path.join(__dirname, '../uploads/familles');
      const oldFilepath = path.join(uploadsDir, oldFilename);
      
      if (fs.existsSync(oldFilepath)) {
        try {
          fs.unlinkSync(oldFilepath);
        } catch (err) {
          // Ignore deletion errors
        }
      }
    }

    // Update the famille image
    content[familleIndex] = {
      ...content[familleIndex],
      image: imageUrl
    };

    // Update section content
    const updateResult = await pool.query(
      `UPDATE section_content 
       SET content = $1::jsonb, updated_at = NOW()
       WHERE section_type = $2
       RETURNING *`,
      [JSON.stringify(content), 'famille_categories']
    );

    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');

    res.json({
      success: true,
      message: 'Image uploaded successfully',
      data: {
        famille_id: famille_id,
        image_url: imageUrl,
        timestamp: Date.now()
      }
    });
  } catch (error) {
    console.error('Error uploading famille image:', error.message);
    res.status(500).json({
      success: false,
      error: 'Failed to upload image: ' + error.message
    });
  }
};
