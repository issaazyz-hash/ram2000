/**
 * Product Service
 * Business logic for product operations
 * Handles validation, transactions, and business rules
 */

const Product = require('../models/Product');
const pool = require('../db/pool');

class ProductService {
  /**
   * Get all products with optional filters
   * @param {Object} filters - Filter criteria
   * @returns {Promise<Array>} List of products
   */
  static async getAllProducts(filters = {}) {
    // Get pool - will throw if not initialized (production mode)
    pool();
    try {
      const products = await Product.findAll(filters);
      return products;
    } catch (error) {
      console.error('ProductService.getAllProducts error:', error);
      throw new Error('Failed to fetch products');
    }
  }

  /**
   * Get product by ID
   * @param {number} productId - Product ID
   * @returns {Promise<Object|null>} Product or null
   */
  static async getProductById(productId) {
    if (!productId || isNaN(parseInt(productId))) {
      throw new Error('Valid product ID is required');
    }

    try {
      const product = await Product.findById(productId);
      return product;
    } catch (error) {
      console.error('ProductService.getProductById error:', error);
      throw new Error('Failed to fetch product');
    }
  }

  /**
   * Validate product data
   * @param {Object} productData - Product data to validate
   * @param {boolean} isUpdate - Whether this is an update operation
   * @throws {Error} If validation fails
   */
  static validateProductData(productData, isUpdate = false) {
    // Required fields for creation
    if (!isUpdate) {
      if (!productData.name || !productData.name.trim()) {
        throw new Error('Product name is required');
      }
      if (productData.price === undefined || productData.price === null) {
        throw new Error('Product price is required');
      }
      if (parseFloat(productData.price) < 0) {
        throw new Error('Product price must be non-negative');
      }
      if (!productData.sku || !productData.sku.trim()) {
        throw new Error('Product SKU is required');
      }
      if (!productData.brand || !productData.brand.trim()) {
        throw new Error('Product brand is required');
      }
      if (!productData.category || !productData.category.trim()) {
        throw new Error('Product category is required');
      }
    } else {
      // For updates, validate only provided fields
      if (productData.price !== undefined && parseFloat(productData.price) < 0) {
        throw new Error('Product price must be non-negative');
      }
      if (productData.name !== undefined && !productData.name.trim()) {
        throw new Error('Product name cannot be empty');
      }
      if (productData.sku !== undefined && !productData.sku.trim()) {
        throw new Error('Product SKU cannot be empty');
      }
    }

    // Validate numeric fields
    if (productData.loyalty_points !== undefined) {
      const points = parseInt(productData.loyalty_points);
      if (isNaN(points) || points < 0) {
        throw new Error('Loyalty points must be a non-negative integer');
      }
    }
  }

  /**
   * Create a new product
   * @param {Object} productData - Product data
   * @returns {Promise<Object>} Created product
   */
  static async createProduct(productData) {
    // Validate input
    this.validateProductData(productData, false);

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Check if SKU already exists
      const skuExists = await Product.findBySku(productData.sku);
      if (skuExists) {
        throw new Error('SKU already exists');
      }

      // Create product
      const product = await Product.create(productData);

      await client.query('COMMIT');
      return product;
    } catch (error) {
      await client.query('ROLLBACK');
      
      // Re-throw validation errors as-is
      if (error.message.includes('required') || 
          error.message.includes('exists') ||
          error.message.includes('must be')) {
        throw error;
      }
      
      console.error('ProductService.createProduct error:', error);
      throw new Error('Failed to create product');
    } finally {
      client.release();
    }
  }

  /**
   * Update product
   * @param {number} productId - Product ID
   * @param {Object} updateData - Data to update
   * @returns {Promise<Object>} Updated product
   */
  static async updateProduct(productId, updateData) {
    if (!productId || isNaN(parseInt(productId))) {
      throw new Error('Valid product ID is required');
    }

    // Validate provided fields
    this.validateProductData(updateData, true);

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Check if product exists
      const existingProduct = await Product.findById(productId);
      if (!existingProduct) {
        throw new Error('Product not found');
      }

      // Check SKU uniqueness if SKU is being updated
      if (updateData.sku && updateData.sku !== existingProduct.sku) {
        const skuExists = await Product.findBySku(updateData.sku, productId);
        if (skuExists) {
          throw new Error('SKU already exists');
        }
      }

      // Update product
      const product = await Product.update(productId, updateData);
      if (!product) {
        throw new Error('No fields to update');
      }

      await client.query('COMMIT');
      return product;
    } catch (error) {
      await client.query('ROLLBACK');
      
      // Re-throw validation/not found errors as-is
      if (error.message.includes('required') || 
          error.message.includes('exists') ||
          error.message.includes('not found') ||
          error.message.includes('must be') ||
          error.message.includes('No fields')) {
        throw error;
      }
      
      console.error('ProductService.updateProduct error:', error);
      throw new Error('Failed to update product');
    } finally {
      client.release();
    }
  }

  /**
   * Delete product
   * @param {number} productId - Product ID
   * @returns {Promise<Object>} Deleted product info
   */
  static async deleteProduct(productId) {
    if (!productId || isNaN(parseInt(productId))) {
      throw new Error('Valid product ID is required');
    }

    try {
      const product = await Product.delete(productId);
      if (!product) {
        throw new Error('Product not found');
      }
      return product;
    } catch (error) {
      // Re-throw not found errors as-is
      if (error.message.includes('not found')) {
        throw error;
      }
      
      console.error('ProductService.deleteProduct error:', error);
      throw new Error('Failed to delete product');
    }
  }
}

module.exports = ProductService;

