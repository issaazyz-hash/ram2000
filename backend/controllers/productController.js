/**
 * Product Controller
 * Handles product HTTP requests/responses only
 * Business logic is in ProductService
 * Logs admin actions
 */

const ProductService = require('../services/ProductService');
const AdminLogService = require('../services/AdminLogService');
const ApiResponse = require('../utils/apiResponse');
const EquivalentReferenceService = require('../services/EquivalentReferenceService');
const pool = require('../db/pool');

function slugify(text) {
  if (!text || typeof text !== 'string') return '';
  return text
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

class ProductController {
  /**
   * GET /api/products
   * Get all products with optional filters
   */
  static async getAll(req, res) {
    try {
      const { category, brand, search } = req.query;

      const filters = {};
      if (category) filters.category = category;
      if (brand) filters.brand = brand;
      if (search) filters.search = search;

      const products = await ProductService.getAllProducts(filters);

      return ApiResponse.success(res, products);
    } catch (error) {
      console.error('ProductController.getAll error:', error);
      return ApiResponse.serverError(res, 'Failed to fetch products');
    }
  }

  /**
   * GET /api/products/equivalents?ref=XXX&excludeId=ID
   * Find products that share the same reference token(s) (category_products.reference).
   *
   * Notes:
   * - ref can be comma-separated; results are merged/deduped server-side
   * - excludeId and/or excludeSlug can be provided to exclude current product
   */
  static async getEquivalents(req, res) {
    try {
      const debugEquivalents =
        process.env.DEBUG_EQUIVALENTS === '1' || process.env.NODE_ENV === 'development';

      const ref = (req.query.ref || req.query.reference || '').toString();
      const excludeIdRaw = req.query.excludeId;
      const excludeSlug = req.query.excludeSlug ? String(req.query.excludeSlug) : null;
      const limitRaw = req.query.limit;

      const refString = ref.trim();
      if (!refString) {
        if (debugEquivalents) console.log('[equivalents] reference missing or empty -> 400');
        return ApiResponse.error(res, 'reference is required', 'VALIDATION_ERROR', 400);
      }

      const excludeId =
        excludeIdRaw !== undefined && excludeIdRaw !== null && String(excludeIdRaw).trim() !== ''
          ? Number(excludeIdRaw)
          : null;

      const limit =
        limitRaw !== undefined && limitRaw !== null && String(limitRaw).trim() !== ''
          ? Number(limitRaw)
          : 20;

      const tokens = refString
        .replace(/[;\n|]+/g, ',')
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean);

      if (debugEquivalents) {
        console.log('[equivalents] /api/products/equivalents', {
          refString,
          tokens,
          excludeId: Number.isFinite(excludeId) ? excludeId : null,
          excludeSlug,
          limit,
        });
      }

      const products = await EquivalentReferenceService.findEquivalents({
        refString,
        excludeId: Number.isFinite(excludeId) ? excludeId : null,
        excludeSlug,
        limit,
      });

      const excludeIdInt = Number.isFinite(excludeId) ? excludeId : null;
      const refLower = refString.toLowerCase();

      let cat3Equivalents = [];
      try {
        const sectionRes = await pool.query(
          "SELECT content FROM section_content WHERE section_type = $1",
          ['cat3_pages']
        );
        if (sectionRes.rows.length > 0 && sectionRes.rows[0].content) {
          let pages = sectionRes.rows[0].content;
          if (typeof pages === 'string') {
            try {
              pages = JSON.parse(pages);
            } catch (_) {
              pages = [];
            }
          }
          if (!Array.isArray(pages)) pages = [];
          for (const page of pages) {
            const cardId = String(page.cardId ?? page.id ?? '');
            const items = Array.isArray(page.items) ? page.items : [];
            for (const item of items) {
              const itemRef = (item.reference != null ? String(item.reference) : '').trim();
              if (!itemRef) continue;
              if (itemRef.toLowerCase() !== refLower) continue;
              if (excludeIdInt != null && Number(item.id) === excludeIdInt) continue;
              const slug = slugify(item.title || item.name || '');
              if (!slug) continue;
              cat3Equivalents.push({
                id: Number(item.id),
                name: (item.title || item.name || '').trim(),
                slug,
                image: item.image ?? null,
                reference: itemRef || null,
                price: item.prix_neveux != null ? Number(item.prix_neveux) : (item.price2 != null ? Number(item.price2) : null),
                prixNeveux: item.prix_neveux != null ? Number(item.prix_neveux) : null,
                stock: item.stock != null ? Number(item.stock) : null,
                stockDisponible: item.stock != null ? Number(item.stock) : null,
                seuilAlerte: item.alertThreshold != null ? Number(item.alertThreshold) : null,
                rating: null,
                cat3Id: cardId,
                itemId: Number(item.id),
              });
            }
          }
        }
      } catch (cat3Err) {
        if (debugEquivalents) console.log('[equivalents] cat3_pages fetch error:', cat3Err.message);
      }

      const merged = [...products, ...cat3Equivalents];
      if (debugEquivalents) {
        console.log('[equivalents] matched row count:', products.length, 'cat3:', cat3Equivalents.length, 'total:', merged.length);
      }
      return ApiResponse.success(res, merged);
    } catch (error) {
      console.error('ProductController.getEquivalents error:', error);
      // Non-breaking: return empty list rather than failing the product page
      return ApiResponse.success(res, []);
    }
  }

  /**
   * GET /api/products/:id
   * Get product by ID
   */
  static async getById(req, res) {
    try {
      const { id } = req.params;

      if (!id || isNaN(parseInt(id))) {
        return ApiResponse.error(res, 'Valid product ID is required', 'VALIDATION_ERROR', 400);
      }

      const product = await ProductService.getProductById(id);

      if (!product) {
        return ApiResponse.notFound(res, 'Product not found');
      }

      return ApiResponse.success(res, product);
    } catch (error) {
      // Handle known errors
      if (error.message.includes('not found')) {
        return ApiResponse.notFound(res, error.message);
      }
      if (error.message.includes('required')) {
        return ApiResponse.error(res, error.message, 'VALIDATION_ERROR', 400);
      }

      console.error('ProductController.getById error:', error);
      return ApiResponse.serverError(res, 'Failed to fetch product');
    }
  }

  /**
   * POST /api/products
   * Create a new product (admin only)
   */
  static async create(req, res) {
    try {
      const productData = req.body;
      const userId = req.user?.id;
      const ipAddress = req.ip || req.connection.remoteAddress;

      // Call service (validation happens in service)
      const product = await ProductService.createProduct(productData);

      // Log admin action
      if (userId) {
        AdminLogService.logAction(
          userId,
          'create',
          'product',
          product.id,
          { name: product.name, price: product.price, sku: product.sku },
          ipAddress
        ).catch(err => console.error('Failed to log admin action:', err));
      }

      return ApiResponse.success(res, product, 'Product created successfully', 201);
    } catch (error) {
      // Handle known errors
      if (error.message.includes('already exists') || 
          error.message.includes('SKU')) {
        return ApiResponse.error(res, error.message, 'DUPLICATE_SKU', 409);
      }
      if (error.message.includes('required') || 
          error.message.includes('must be')) {
        return ApiResponse.error(res, error.message, 'VALIDATION_ERROR', 400);
      }

      console.error('ProductController.create error:', error);
      return ApiResponse.serverError(res, 'Failed to create product');
    }
  }

  /**
   * PUT /api/products/:id
   * Update product (admin only)
   */
  static async update(req, res) {
    try {
      const { id } = req.params;
      const updateData = req.body;
      const userId = req.user?.id;
      const ipAddress = req.ip || req.connection.remoteAddress;

      if (!id || isNaN(parseInt(id))) {
        return ApiResponse.error(res, 'Valid product ID is required', 'VALIDATION_ERROR', 400);
      }

      // Call service (validation happens in service)
      const product = await ProductService.updateProduct(id, updateData);

      // Log admin action
      if (userId) {
        AdminLogService.logAction(
          userId,
          'update',
          'product',
          product.id,
          updateData,
          ipAddress
        ).catch(err => console.error('Failed to log admin action:', err));
      }

      return ApiResponse.success(res, product, 'Product updated successfully');
    } catch (error) {
      // Handle known errors
      if (error.message.includes('not found')) {
        return ApiResponse.notFound(res, error.message);
      }
      if (error.message.includes('already exists') || 
          error.message.includes('SKU')) {
        return ApiResponse.error(res, error.message, 'DUPLICATE_SKU', 409);
      }
      if (error.message.includes('required') || 
          error.message.includes('must be') ||
          error.message.includes('No fields')) {
        return ApiResponse.error(res, error.message, 'VALIDATION_ERROR', 400);
      }

      console.error('ProductController.update error:', error);
      return ApiResponse.serverError(res, 'Failed to update product');
    }
  }

  /**
   * DELETE /api/products/:id
   * Delete product (admin only)
   */
  static async delete(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user?.id;
      const ipAddress = req.ip || req.connection.remoteAddress;

      if (!id || isNaN(parseInt(id))) {
        return ApiResponse.error(res, 'Valid product ID is required', 'VALIDATION_ERROR', 400);
      }

      // Get product info before deletion (for logging)
      const product = await ProductService.getProductById(id);

      // Call service
      await ProductService.deleteProduct(id);

      // Log admin action
      if (userId && product) {
        AdminLogService.logAction(
          userId,
          'delete',
          'product',
          parseInt(id),
          { name: product.name, sku: product.sku },
          ipAddress
        ).catch(err => console.error('Failed to log admin action:', err));
      }

      return ApiResponse.success(res, {
        id: parseInt(id),
        name: product?.name
      }, 'Product deleted successfully');
    } catch (error) {
      // Handle known errors
      if (error.message.includes('not found')) {
        return ApiResponse.notFound(res, error.message);
      }
      if (error.message.includes('required')) {
        return ApiResponse.error(res, error.message, 'VALIDATION_ERROR', 400);
      }

      console.error('ProductController.delete error:', error);
      return ApiResponse.serverError(res, 'Failed to delete product');
    }
  }
}

module.exports = ProductController;
