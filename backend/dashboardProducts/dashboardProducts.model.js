const fs = require('fs');
const path = require('path');

const DATA_FILE = path.join(__dirname, '../data/dashboard-products.json');

/**
 * Ensure data directory exists
 */
function ensureDataDir() {
  const dataDir = path.dirname(DATA_FILE);
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
  if (!fs.existsSync(DATA_FILE)) {
    fs.writeFileSync(DATA_FILE, JSON.stringify([], null, 2));
  }
}

/**
 * Read all products from JSON file
 */
function readProducts() {
  ensureDataDir();
  try {
    const data = fs.readFileSync(DATA_FILE, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error reading dashboard products:', error);
    return [];
  }
}

/**
 * Write products to JSON file
 */
function writeProducts(products) {
  ensureDataDir();
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(products, null, 2));
    return true;
  } catch (error) {
    console.error('Error writing dashboard products:', error);
    throw error;
  }
}

/**
 * Generate unique ID
 */
function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

class DashboardProductModel {
  /**
   * Get all products
   */
  static getAll() {
    return readProducts();
  }

  /**
   * Get product by ID
   */
  static getById(id) {
    const products = readProducts();
    return products.find(p => p.id === id) || null;
  }

  /**
   * Check if product with ID already exists
   */
  static exists(id) {
    const products = readProducts();
    return products.some(p => p.id === id);
  }

  /**
   * Add new product
   */
  static add(productData) {
    const products = readProducts();
    
    // Validate required fields
    if (!productData.id) {
      throw new Error('Product ID is required');
    }
    
    // Check if product already exists
    if (this.exists(productData.id)) {
      const error = new Error('Product with this ID already exists');
      error.exists = true;
      throw error;
    }
    
    // Create product object
    const product = {
      id: productData.id,
      name: productData.name || '',
      image: productData.image || '',
      references: Array.isArray(productData.references) ? productData.references : [],
      price: Number(productData.price) || 0,
      promotion: Number(productData.promotion) || 0,
      quantity: Number(productData.quantity) || 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    
    products.push(product);
    writeProducts(products);
    
    return product;
  }

  /**
   * Update product
   */
  static update(id, updateData) {
    const products = readProducts();
    const index = products.findIndex(p => p.id === id);
    
    if (index === -1) {
      return null;
    }
    
    // Update product
    products[index] = {
      ...products[index],
      ...updateData,
      id: products[index].id, // Preserve original ID
      updated_at: new Date().toISOString()
    };
    
    // Ensure references is an array
    if (updateData.references !== undefined) {
      products[index].references = Array.isArray(updateData.references) 
        ? updateData.references 
        : [];
    }
    
    // Ensure numeric fields are numbers
    if (updateData.price !== undefined) {
      products[index].price = Number(updateData.price) || 0;
    }
    if (updateData.promotion !== undefined) {
      products[index].promotion = Number(updateData.promotion) || 0;
    }
    if (updateData.quantity !== undefined) {
      products[index].quantity = Number(updateData.quantity) || 0;
    }
    
    writeProducts(products);
    
    return products[index];
  }

  /**
   * Delete product
   */
  static delete(id) {
    const products = readProducts();
    const index = products.findIndex(p => p.id === id);
    
    if (index === -1) {
      return null;
    }
    
    const deleted = products.splice(index, 1)[0];
    writeProducts(products);
    
    return deleted;
  }
}

module.exports = DashboardProductModel;

