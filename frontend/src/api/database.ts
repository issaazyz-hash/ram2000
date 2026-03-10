// Database API - PostgreSQL Backend
import { getApiBaseUrl, getBackendBaseUrl, resolveImageUrl as resolveImageUrlUtil } from '@/utils/apiConfig';
import { dedupeVehicleModelsClient, normalizeVehicleModelEntry } from '@/utils/vehicleModelUtils';

// DO NOT export as constant - must be called dynamically to get current env value
// Always call getApiBaseUrl() directly in functions to ensure correct URL
// This ensures production builds use the correct backend URL

// Re-export for backward compatibility
export const resolveImageUrl = resolveImageUrlUtil;

export interface ProductData {
  id?: string;
  name: string;
  price: string;
  originalPrice?: string;
  discount?: string;
  image?: string;
  allImages?: string[];
  brand: string;
  sku: string;
  category: string;
  loyaltyPoints: number;
  hasPreview?: boolean;
  hasOptions?: boolean;
  description?: string;
}

export interface SectionContentData {
  id?: string;
  sectionType: string;
  title?: string;
  description?: string;
  content?: unknown;
}

export interface SearchOptionData {
  id?: string;
  field: string;
  value: string;
}

export interface CarBrandData {
  id?: string;
  name: string;
  model?: string;
  description?: string;
  image_url?: string;
}

// Vehicle data interface for the Catalogue page
export interface VehicleData {
  id?: string;
  name: string;
  brand: string;
  model: string;
  description?: string;
  image_url?: string;
  created_at?: string;
  updated_at?: string;
}

// Vehicle Model data interface for Catalogue2 page
export interface VehicleModelData {
  id?: string | number;
  marque: string;
  model: string;
  description?: string;
  image?: string;
  created_at?: string;
  updated_at?: string;
}

// Vehicle Model Part data interface for PiecesDispo page
export interface VehiclePartData {
  id: number;
  model_id: number;
  name: string;
  reference?: string;
  description?: string;
  price?: number;
  image_url?: string;
  category?: string;
  in_stock?: boolean;
  created_at?: string;
  updated_at?: string;
}

// ==========================================
// VEHICLES API - For Catalogue Page
// ==========================================

/**
 * Get all vehicles from the database
 */
export const getVehicles = async (): Promise<VehicleData[]> => {
  try {
    const response = await fetch(`${getApiBaseUrl()}/vehicles`, {
      cache: 'no-store',
    });
    
    if (!response.ok) {
      throw new Error(`Failed to fetch vehicles: ${response.statusText}`);
    }
    
    const result = await response.json();
    
    if (!result.success) {
      throw new Error(result.error || 'Failed to fetch vehicles');
    }
    
    return result.data || [];
  } catch (error) {
    console.error('❌ Error fetching vehicles:', error);
    throw error;
  }
};

/**
 * Get a vehicle by ID
 */
export const getVehicleById = async (id: string): Promise<VehicleData | null> => {
  try {
    const response = await fetch(`${getApiBaseUrl()}/vehicles/${id}`, {
      cache: 'no-store',
    });
    
    if (!response.ok) {
      if (response.status === 404) return null;
      throw new Error(`Failed to fetch vehicle: ${response.statusText}`);
    }
    
    const result = await response.json();
    
    if (!result.success) {
      throw new Error(result.error || 'Failed to fetch vehicle');
    }
    
    return result.data || null;
  } catch (error) {
    console.error('❌ Error fetching vehicle:', error);
    throw error;
  }
};

/**
 * Create a new vehicle
 */
export const createVehicle = async (data: Omit<VehicleData, 'id' | 'created_at' | 'updated_at'>): Promise<VehicleData> => {
  try {
    const response = await fetch(`${getApiBaseUrl()}/vehicles`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: data.name,
        brand: data.brand,
        model: data.model,
        description: data.description || null,
        image_url: data.image_url || null,
      }),
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `Failed to create vehicle: ${response.statusText}`);
    }
    
    const result = await response.json();
    
    if (!result.success || !result.data) {
      throw new Error(result.error || 'Invalid API response');
    }
    
    console.log('✅ Vehicle created:', result.data.name);
    return result.data;
  } catch (error) {
    console.error('❌ Error creating vehicle:', error);
    throw error;
  }
};

/**
 * Update a vehicle
 */
export const updateVehicle = async (id: string, data: Partial<VehicleData>): Promise<VehicleData> => {
  try {
    const response = await fetch(`${getApiBaseUrl()}/vehicles/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `Failed to update vehicle: ${response.statusText}`);
    }
    
    const result = await response.json();
    
    if (!result.success || !result.data) {
      throw new Error(result.error || 'Invalid API response');
    }
    
    return result.data;
  } catch (error) {
    console.error('❌ Error updating vehicle:', error);
    throw error;
  }
};

/**
 * Delete a vehicle
 */
export const deleteVehicle = async (id: string): Promise<boolean> => {
  try {
    const response = await fetch(`${getApiBaseUrl()}/vehicles/${id}`, {
      method: 'DELETE',
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `Failed to delete vehicle: ${response.statusText}`);
    }
    
    const result = await response.json();
    
    if (!result.success) {
      throw new Error(result.error || 'Failed to delete vehicle');
    }
    
    console.log('✅ Vehicle deleted');
    return true;
  } catch (error) {
    console.error('❌ Error deleting vehicle:', error);
    throw error;
  }
};

// ==========================================
// VEHICLE MODELS API - For Catalogue2 Page
// ==========================================

/**
 * Get all vehicle models (all marques)
 * Returns array of { id, marque, model, image? } with minimal runtime validation
 */
export const getAllVehicleModels = async (): Promise<VehicleModelData[]> => {
  try {
    console.log('🔍 Fetching all vehicle models from:', `${getApiBaseUrl()}/vehicleModels`);
    const response = await fetch(`${getApiBaseUrl()}/vehicleModels`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      cache: 'no-store',
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ getAllVehicleModels: HTTP error', response.status, errorText);
      throw new Error(`Failed to fetch all vehicle models: ${response.status} ${response.statusText}`);
    }
    
    const result = await response.json();
    
    if (!result.success) {
      console.error('❌ getAllVehicleModels: API error', result.error || result.message);
      throw new Error(result.error || result.message || 'Failed to fetch all vehicle models');
    }
    
    const models = result.data || [];
    
    // Minimal runtime validation to prevent UI breakage
    // REQUIRE length >= 3 to filter out "BB", "yy", "XCXV", "bbb"
    const validModels = models.filter((model: any) => {
      // Must have id (number or string that can be parsed)
      if (!model.id) {
        console.warn('⚠️ Model missing id:', model);
        return false;
      }
      
      // Must have marque (string, not empty, length >= 3)
      if (!model.marque || typeof model.marque !== 'string') {
        console.warn('⚠️ Model missing/invalid marque:', model);
        return false;
      }
      
      const trimmedMarque = model.marque.trim();
      if (trimmedMarque.length === 0 || trimmedMarque.length < 3) {
        console.warn('⚠️ Model marque too short (length < 3):', model);
        return false;
      }
      
      // Must have model (string, not empty, length >= 3)
      if (!model.model || typeof model.model !== 'string') {
        console.warn('⚠️ Model missing/invalid model name:', model);
        return false;
      }
      
      const trimmedModel = model.model.trim();
      if (trimmedModel.length === 0 || trimmedModel.length < 3) {
        console.warn('⚠️ Model name too short (length < 3):', model);
        return false;
      }
      
      // Filter out obvious invalid values
      const lowerModel = trimmedModel.toLowerCase();
      const lowerMarque = trimmedMarque.toLowerCase();
      
      if (lowerModel === 'object' || lowerModel === '[object object]') {
        console.warn('⚠️ Model has invalid name (Object):', model);
        return false;
      }
      
      if (lowerMarque === 'object' || lowerMarque === '[object object]') {
        console.warn('⚠️ Model has invalid marque (Object):', model);
        return false;
      }
      
      // Reject short all-caps patterns
      if (/^[A-Z]{1,3}$/.test(trimmedMarque)) {
        console.warn('⚠️ Model has suspicious marque pattern:', model);
        return false;
      }
      
      if (/^[A-Z]{1,3}$/.test(trimmedModel)) {
        console.warn('⚠️ Model has suspicious model pattern:', model);
        return false;
      }
      
      return true;
    });
    
    // Normalize IDs + display values, then dedupe for extra safety
    const normalizedModels = validModels
      .map((model: any) => {
        const normalized = normalizeVehicleModelEntry(model);
        const parsedId =
          typeof normalized.id === 'number'
            ? normalized.id
            : parseInt(String(normalized.id ?? model.id), 10);
        return {
          ...normalized,
          id: parsedId,
        };
      })
      .filter((model: any) => !isNaN(model.id) && model.id > 0);
    
    const dedupedModels = dedupeVehicleModelsClient(normalizedModels);
    const droppedDuplicates = normalizedModels.length - dedupedModels.length;
    if (droppedDuplicates > 0) {
      console.log(`🧹 getAllVehicleModels: removed ${droppedDuplicates} duplicate entries client-side`);
    }
    
    console.log(
      '✅ getAllVehicleModels: Fetched',
      dedupedModels.length,
      'valid models (filtered',
      models.length - dedupedModels.length,
      'invalid/duplicate)'
    );
    return dedupedModels;
  } catch (error) {
    console.error('❌ Error fetching all vehicle models:', error);
    throw error; // Re-throw to allow error handling in component
  }
};

/**
 * Get all vehicle models for a specific marque
 */
export const getVehicleModels = async (marque: string): Promise<VehicleModelData[]> => {
  try {
    const response = await fetch(`${getApiBaseUrl()}/vehicleModels/${encodeURIComponent(marque)}`, {
      cache: 'no-store',
    });
    
    if (!response.ok) {
      throw new Error(`Failed to fetch vehicle models: ${response.statusText}`);
    }
    
    const result = await response.json();
    
    if (!result.success) {
      throw new Error(result.error || 'Failed to fetch vehicle models');
    }
    
    return result.data || [];
  } catch (error) {
    console.error('❌ Error fetching vehicle models:', error);
    return [];
  }
};

/**
 * Get vehicle models by marque (alias for getVehicleModels for clarity)
 * Use this when you need models for a specific brand (e.g., 'Kia', 'Hyundai')
 */
export const getVehicleModelsByMarque = getVehicleModels;

/**
 * Create a new vehicle model
 */
export const createVehicleModel = async (data: Omit<VehicleModelData, 'id' | 'created_at' | 'updated_at'>): Promise<VehicleModelData> => {
  try {
    const response = await fetch(`${getApiBaseUrl()}/vehicleModels`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        marque: data.marque,
        model: data.model,
        description: data.description || null,
        image: data.image || null,
      }),
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `Failed to create vehicle model: ${response.statusText}`);
    }
    
    const result = await response.json();
    
    if (!result.success || !result.data) {
      throw new Error(result.message || 'Invalid API response');
    }
    
    console.log('✅ Vehicle model created:', result.data.model);
    return result.data;
  } catch (error) {
    console.error('❌ Error creating vehicle model:', error);
    throw error;
  }
};

/**
 * Delete a vehicle model
 */
export const deleteVehicleModel = async (id: string | number): Promise<boolean> => {
  try {
    const response = await fetch(`${getApiBaseUrl()}/vehicleModels/${id}`, {
      method: 'DELETE',
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `Failed to delete vehicle model: ${response.statusText}`);
    }
    
    const result = await response.json();
    
    if (!result.success) {
      throw new Error(result.message || 'Failed to delete vehicle model');
    }
    
    console.log('✅ Vehicle model deleted');
    return true;
  } catch (error) {
    console.error('❌ Error deleting vehicle model:', error);
    throw error;
  }
};

// ==========================================
// VEHICLE MODEL PARTS API - For PiecesDispo Page
// ==========================================

/**
 * Get all parts for a specific vehicle model
 */
export const getPartsForModel = async (modelId: string | number): Promise<VehiclePartData[]> => {
  try {
    const response = await fetch(`${getApiBaseUrl()}/models/${modelId}/parts`, {
      cache: 'no-store',
    });
    
    if (!response.ok) {
      throw new Error(`Failed to fetch parts: ${response.statusText}`);
    }
    
    const result = await response.json();
    
    if (!result.success) {
      throw new Error(result.error || 'Failed to fetch parts');
    }
    
    return result.data || [];
  } catch (error) {
    console.error('❌ Error fetching parts for model:', error);
    return [];
  }
};

/**
 * Create a new part for a vehicle model
 */
export const createPartForModel = async (
  modelId: string | number, 
  data: Omit<VehiclePartData, 'id' | 'model_id' | 'created_at' | 'updated_at'>
): Promise<VehiclePartData> => {
  try {
    const response = await fetch(`${getApiBaseUrl()}/models/${modelId}/parts`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: data.name,
        reference: data.reference || null,
        description: data.description || null,
        price: data.price || null,
        image_url: data.image_url || null,
        category: data.category || null,
        in_stock: data.in_stock !== false,
      }),
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `Failed to create part: ${response.statusText}`);
    }
    
    const result = await response.json();
    
    if (!result.success || !result.data) {
      throw new Error(result.message || 'Invalid API response');
    }
    
    console.log('✅ Part created:', result.data.name);
    return result.data;
  } catch (error) {
    console.error('❌ Error creating part:', error);
    throw error;
  }
};

/**
 * Delete a part
 */
export const deletePart = async (partId: string | number): Promise<boolean> => {
  try {
    const response = await fetch(`${getApiBaseUrl()}/parts/${partId}`, {
      method: 'DELETE',
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `Failed to delete part: ${response.statusText}`);
    }
    
    const result = await response.json();
    
    if (!result.success) {
      throw new Error(result.message || 'Failed to delete part');
    }
    
    console.log('✅ Part deleted');
    return true;
  } catch (error) {
    console.error('❌ Error deleting part:', error);
    throw error;
  }
};

// ==========================================
// PRODUCTS API
// ==========================================

// Import search utilities
import { calculateMatchScore, normalizeText } from '@/utils/fuzzySearch';
import { SearchResult } from '@/types/search';
import Fuse from 'fuse.js';

export const getProducts = async (): Promise<ProductData[]> => {
  try {
    const response = await fetch(`${getApiBaseUrl()}/products`, {
      cache: 'no-store',
    });
    
    if (!response.ok) {
      throw new Error(`Failed to fetch products: ${response.statusText}`);
    }
    
    const result = await response.json();
    
    if (!result.success || !result.data) {
      throw new Error('Invalid API response format');
    }
    
    const products = result.data;
    
    const mappedProducts = products.map((p: Record<string, unknown>) => ({
      id: p.id?.toString() || p.id,
      name: p.name,
      price: p.price?.toString() || p.price,
      originalPrice: p.original_price?.toString(),
      discount: p.discount,
      image: p.main_image || p.image,
      allImages: p.all_images || [],
      brand: p.brand,
      sku: p.sku,
      category: p.category,
      loyaltyPoints: p.loyalty_points || p.loyaltyPoints || 0,
      hasPreview: p.has_preview || p.hasPreview || false,
      hasOptions: p.has_options || p.hasOptions || false,
      description: p.description || '',
    }));
    
    console.log('✅ API: Fetched', mappedProducts.length, 'products from PostgreSQL');
    return mappedProducts;
  } catch (error) {
    console.error('❌ Error fetching products:', error);
    throw error;
  }
};

export const searchProducts = async (
  query: string, 
  fuzzyThreshold: number = 0.6
): Promise<SearchResult[]> => {
  console.log('🔍 API: Starting advanced search with query:', query);
  const startTime = performance.now();
  
  try {
    const normalizedQuery = normalizeText(query);
    if (!normalizedQuery || normalizedQuery.length < 1) {
      console.log('🔍 API: Empty query after normalization');
      return [];
    }
    
    console.log('🔍 API: Normalized query:', normalizedQuery);
    
    const allProducts = await getProducts();
    console.log('🔍 API: Loaded', allProducts.length, 'products (fresh)');
    
    if (allProducts.length === 0) {
      console.log('🔍 API: No products available');
      return [];
    }
    
    const results: SearchResult[] = [];
    const processedProductIds = new Set<string>();
    
    for (const product of allProducts) {
      if (product.id && processedProductIds.has(product.id)) continue;
      
      let bestScore = 0;
      let bestMatchType: 'exact' | 'partial' | 'fuzzy' = 'fuzzy';
      let bestMatchedField: 'name' | 'brand' | 'category' | 'sku' = 'name';
      let bestMatchedText = '';
      
      const fields: Array<{ field: 'name' | 'brand' | 'category' | 'sku'; value: string }> = [
        { field: 'name', value: product.name || '' },
        { field: 'brand', value: product.brand || '' },
        { field: 'category', value: product.category || '' },
        { field: 'sku', value: product.sku || '' },
      ];
      
      for (const { field, value } of fields) {
        if (!value) continue;
        
        const normalizedValue = normalizeText(value);
        if (!normalizedValue) continue;
        
        const match = calculateMatchScore(normalizedValue, normalizedQuery, field);
        
        if (match.score > bestScore) {
          bestScore = match.score;
          bestMatchType = match.matchType;
          bestMatchedField = field;
          bestMatchedText = value;
        }
      }
      
      if (bestScore > 0) {
        results.push({
          product,
          score: bestScore,
          matchType: bestMatchType,
          matchedField: bestMatchedField,
          matchedText: bestMatchedText,
        });
        if (product.id) processedProductIds.add(product.id);
      }
    }
    
    console.log('🔍 API: Found', results.length, 'matches using custom algorithm');
    
    if (results.length < 5 && normalizedQuery.length >= 2) {
      console.log('🔍 API: Using Fuse.js fallback for better results');
      
      try {
        const fuse = new Fuse(allProducts, {
          keys: [
            { name: 'name', weight: 0.4 },
            { name: 'brand', weight: 0.3 },
            { name: 'category', weight: 0.2 },
            { name: 'sku', weight: 0.1 },
          ],
          threshold: 0.4,
          ignoreLocation: true,
          includeScore: true,
          minMatchCharLength: 2,
          getFn: (obj, path) => {
            const value = Fuse.config.getFn(obj, path);
            return typeof value === 'string' ? normalizeText(value) : value;
          },
        });
        
        const fuseResults = fuse.search(normalizedQuery);
        
        const fuseResultMap = new Map<string, SearchResult>();
        
        for (const fuseResult of fuseResults) {
          const product = fuseResult.item;
          const score = fuseResult.score || 0;
          const fuseScore = Math.max(0, Math.min(100, (1 - score) * 100));
          
          if (product.id && processedProductIds.has(product.id)) continue;
          
          let matchedField: 'name' | 'brand' | 'category' | 'sku' = 'name';
          let matchedText = product.name || '';
          
          const fieldScores = [
            { field: 'name' as const, value: product.name || '', weight: 0.4 },
            { field: 'brand' as const, value: product.brand || '', weight: 0.3 },
            { field: 'category' as const, value: product.category || '', weight: 0.2 },
            { field: 'sku' as const, value: product.sku || '', weight: 0.1 },
          ];
          
          let bestFieldScore = 0;
          for (const { field, value } of fieldScores) {
            if (value && normalizeText(value).includes(normalizedQuery)) {
              const fieldScore = fuseScore * (field === 'name' ? 1.2 : field === 'brand' ? 1.1 : 1.0);
              if (fieldScore > bestFieldScore) {
                bestFieldScore = fieldScore;
                matchedField = field;
                matchedText = value;
              }
            }
          }
          
          fuseResultMap.set(product.id || '', {
            product,
            score: fuseScore,
            matchType: fuseScore >= 80 ? 'exact' : fuseScore >= 60 ? 'partial' : 'fuzzy',
            matchedField,
            matchedText,
          });
          
          if (product.id) processedProductIds.add(product.id);
        }
        
        for (const [productId, fuseResult] of fuseResultMap.entries()) {
          const existingResult = results.find(r => r.product.id === productId);
          if (!existingResult) {
            results.push(fuseResult);
          } else {
            if (fuseResult.score > existingResult.score) {
              const index = results.indexOf(existingResult);
              results[index] = fuseResult;
            }
          }
        }
        
        console.log('🔍 API: After Fuse.js fallback, total results:', results.length);
      } catch (fuseError) {
        console.error('🔍 API: Error using Fuse.js fallback:', fuseError);
      }
    }
    
    console.log('🔍 API: Sorting results by score');
    results.sort((a, b) => {
      if (Math.abs(b.score - a.score) > 0.01) {
        return b.score - a.score;
      }
      const fieldPriority: Record<'name' | 'brand' | 'category' | 'sku', number> = {
        name: 4,
        brand: 3,
        category: 2,
        sku: 1,
      };
      return fieldPriority[b.matchedField] - fieldPriority[a.matchedField];
    });
    
    const finalResults = results.slice(0, 50);
    const searchTime = performance.now() - startTime;
    
    console.log('🔍 API: Final results:', finalResults.length, 'products');
    console.log('🔍 API: Search completed in', searchTime.toFixed(2), 'ms');
    
    return finalResults;
  } catch (error) {
    console.error('🔍 API: Error performing search:', error);
    return [];
  }
};

export const searchProductsSimple = async (query: string): Promise<ProductData[]> => {
  const results = await searchProducts(query);
  return results.map(r => r.product);
};

export const getProductById = async (id: string): Promise<ProductData | null> => {
  try {
    const response = await fetch(`${getApiBaseUrl()}/products/${id}`, {
      cache: 'no-store',
    });
    
    if (!response.ok) {
      throw new Error(`Failed to fetch product: ${response.statusText}`);
    }
    
    const result = await response.json();
    
    if (!result.success || !result.data) {
      throw new Error('Invalid API response format');
    }
    
    const product = result.data;
    
    return {
      id: product.id?.toString() || product.id,
      name: product.name,
      price: product.price?.toString() || product.price,
      originalPrice: product.original_price?.toString(),
      discount: product.discount,
      image: product.main_image || product.image,
      allImages: product.all_images || [],
      brand: product.brand,
      sku: product.sku,
      category: product.category,
      loyaltyPoints: product.loyalty_points || 0,
      hasPreview: product.has_preview || false,
      hasOptions: product.has_options || false,
      description: product.description || '',
    };
  } catch (error) {
    console.error('❌ Error fetching product:', error);
    throw error;
  }
};

export const createProduct = async (data: ProductData): Promise<ProductData> => {
  try {
    const backendData = {
      name: data.name,
      price: parseFloat(data.price),
      original_price: data.originalPrice ? parseFloat(data.originalPrice) : null,
      discount: data.discount || null,
      main_image: data.image || null,
      all_images: data.allImages || (data.image ? [data.image] : []),
      brand: data.brand,
      sku: data.sku,
      category: data.category,
      loyalty_points: data.loyaltyPoints || 0,
      has_preview: data.hasPreview || false,
      has_options: data.hasOptions || false,
      description: data.description || null,
    };

    const response = await fetch(`${getApiBaseUrl()}/products`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(backendData),
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `Failed to create product: ${response.statusText}`);
    }
    
    const result = await response.json();
    
    if (!result.success || !result.data) {
      throw new Error('Invalid API response format');
    }
    
    const product = result.data;
    
    return {
      id: product.id?.toString() || product.id,
      name: product.name,
      price: product.price?.toString() || product.price,
      originalPrice: product.original_price?.toString(),
      discount: product.discount,
      image: product.main_image || product.image,
      allImages: product.all_images || [],
      brand: product.brand,
      sku: product.sku,
      category: product.category,
      loyaltyPoints: product.loyalty_points || 0,
      hasPreview: product.has_preview || false,
      hasOptions: product.has_options || false,
      description: product.description || '',
    };
  } catch (error) {
    console.error('❌ Error creating product:', error);
    throw error;
  }
};

export const updateProduct = async (id: string, data: Partial<ProductData>): Promise<ProductData> => {
  try {
    const backendData: Record<string, unknown> = {};
    if (data.name !== undefined) backendData.name = data.name;
    if (data.price !== undefined) backendData.price = parseFloat(data.price);
    if (data.originalPrice !== undefined) backendData.original_price = data.originalPrice ? parseFloat(data.originalPrice) : null;
    if (data.discount !== undefined) backendData.discount = data.discount || null;
    if (data.image !== undefined) backendData.main_image = data.image || null;
    if (data.allImages !== undefined) backendData.all_images = data.allImages;
    if (data.brand !== undefined) backendData.brand = data.brand;
    if (data.sku !== undefined) backendData.sku = data.sku;
    if (data.category !== undefined) backendData.category = data.category;
    if (data.loyaltyPoints !== undefined) backendData.loyalty_points = data.loyaltyPoints;
    if (data.hasPreview !== undefined) backendData.has_preview = data.hasPreview;
    if (data.hasOptions !== undefined) backendData.has_options = data.hasOptions;
    if (data.description !== undefined) backendData.description = data.description || null;

    const response = await fetch(`${getApiBaseUrl()}/products/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(backendData),
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `Failed to update product: ${response.statusText}`);
    }
    
    const result = await response.json();
    
    if (!result.success || !result.data) {
      throw new Error('Invalid API response format');
    }
    
    const product = result.data;
    
    return {
      id: product.id?.toString() || product.id,
      name: product.name,
      price: product.price?.toString() || product.price,
      originalPrice: product.original_price?.toString(),
      discount: product.discount,
      image: product.main_image || product.image,
      allImages: product.all_images || [],
      brand: product.brand,
      sku: product.sku,
      category: product.category,
      loyaltyPoints: product.loyalty_points || 0,
      hasPreview: product.has_preview || false,
      hasOptions: product.has_options || false,
      description: product.description || '',
    };
  } catch (error) {
    console.error('❌ Error updating product:', error);
    throw error;
  }
};

export const deleteProduct = async (id: string): Promise<boolean> => {
  try {
    const response = await fetch(`${getApiBaseUrl()}/products/${id}`, {
      method: 'DELETE',
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `Failed to delete product: ${response.statusText}`);
    }
    
    const result = await response.json();
    
    if (!result.success) {
      throw new Error(result.error || 'Failed to delete product');
    }
    
    return true;
  } catch (error) {
    console.error('❌ Error deleting product:', error);
    throw error;
  }
};

// ==========================================
// SECTION CONTENT API
// ==========================================

export const getSectionContent = async (sectionType: string, modelId?: string | number): Promise<SectionContentData | null> => {
  try {
    // Build URL with optional modelId parameter
    let url = `${getApiBaseUrl()}/sectionContent?sectionType=${sectionType}`;
    if (modelId !== undefined && modelId !== null) {
      url += `&modelId=${encodeURIComponent(String(modelId))}`;
    }
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      // Prevent automatic retries
      cache: 'no-store',
    });
    
    if (!response.ok) {
      // If 404 or other error, return default structure (don't retry)
      if (response.status === 404) {
        return {
          sectionType: sectionType,
          content: sectionType === 'famille_categories' || sectionType === 'promotions' 
            ? { items: [] } 
            : {},
          title: null
        };
      }
      // For other errors, log and return default
      console.error(`❌ getSectionContent failed for '${sectionType}': ${response.status} ${response.statusText}`);
      return {
        sectionType: sectionType,
        content: sectionType === 'famille_categories' || sectionType === 'promotions' 
          ? { items: [] } 
          : {},
        title: null
      };
    }
    
    const result = await response.json();
    
    // Handle error response format
    if (!result.success) {
      const errorMsg = typeof result.error === 'string' 
        ? result.error 
        : (result.error?.message || result.message || 'Unknown error');
      console.error(`❌ getSectionContent error for '${sectionType}':`, errorMsg);
      
      // Return default structure (don't retry)
      return {
        sectionType: sectionType,
        content: sectionType === 'famille_categories' || sectionType === 'promotions' 
          ? { items: [] } 
          : {},
        title: null
      };
    }
    
    if (result.data) {
      return result.data;
    }
    
    // Return default if no data
    return {
      sectionType: sectionType,
      content: sectionType === 'famille_categories' || sectionType === 'promotions' 
        ? { items: [] } 
        : {},
      title: null
    };
  } catch (error) {
    // Network errors or other exceptions - log once and return default (don't retry)
    console.error(`❌ getSectionContent network error for '${sectionType}':`, error instanceof Error ? error.message : 'Unknown error');
    return {
      sectionType: sectionType,
      content: sectionType === 'famille_categories' || sectionType === 'promotions' 
        ? { items: [] } 
        : {},
      title: null
    };
  }
};

/**
 * Clean data to be JSON-serializable (remove undefined, Date objects, Functions, Files)
 */
const cleanForJSON = (obj: any): any => {
  if (obj === null || obj === undefined) {
    return null;
  }
  
  // Handle Date objects
  if (obj instanceof Date) {
    return obj.toISOString();
  }
  
  // Handle File/Blob objects (should never happen, but safety check)
  if (obj instanceof File || obj instanceof Blob) {
    console.warn('⚠️ File object detected in JSON data - this should not happen!');
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
    const cleaned: any = {};
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

export const updateSectionContent = async (sectionType: string, data: SectionContentData): Promise<SectionContentData> => {
  try {
    // Clean the content data first
    let cleanedContent = data.content ? cleanForJSON(data.content) : null;
    
    // Ensure content is a valid array or object (never undefined/null/NaN)
    if (cleanedContent === null || cleanedContent === undefined) {
      cleanedContent = {};
    }
    
    // Stringify content to JSON string before sending
    let contentString: string;
    try {
      contentString = JSON.stringify(cleanedContent);
      
      // Validate it's valid JSON by parsing it back
      JSON.parse(contentString);
    } catch (jsonError) {
      console.error('❌ Invalid JSON content:', jsonError);
      throw new Error(`Invalid JSON content: ${jsonError instanceof Error ? jsonError.message : 'Unknown error'}`);
    }
    
    // Prepare the payload - send content as string
    const payload = {
      sectionType: sectionType,
      title: data.title || null,
      content: contentString // Send as JSON string
    };
    
    console.log('📤 Sending updateSectionContent payload:', {
      sectionType: payload.sectionType,
      title: payload.title,
      contentType: typeof payload.content,
      contentLength: payload.content?.length,
      contentPreview: payload.content ? payload.content.substring(0, 200) : 'null'
    });
    
    // Backend handles create/update automatically based on sectionType
    const response = await fetch(`${getApiBaseUrl()}/sectionContent`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      // Extract error message safely
      const errorMessage = typeof errorData.error === 'string'
        ? errorData.error
        : (errorData.error?.message || errorData.message || `Failed to update section content: ${response.statusText}`);
      throw new Error(errorMessage);
    }
    
    const result = await response.json();
    
    if (result.success && result.data) {
      return result.data;
    }
    
    throw new Error('Invalid response from server');
  } catch (error) {
    console.error('❌ Error updating section content:', error);
    throw error;
  }
};

// ==========================================
// CAT2 CARDS API (persisted in DB)
// ==========================================

export interface Cat2CardApi {
  id: number;
  parentId: number;
  name: string;
  slug: string | null;
  reference: string | null;
  rating: number | null;
  stockDisponible: number;
  seuilAlerte: number;
  image: string | null;
  prixAchatBrut: number | null;
  remiseAchat: number | null;
  netAchatHTVA: number | null;
  tva: number | null;
  netAchatTTC: number | null;
  marge: number | null;
  prixNeveux: number | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateCat2CardPayload {
  parentId: number;
  name: string;
  reference?: string | null;
  rating?: number | null;
  stockDisponible?: number;
  seuilAlerte?: number;
  image?: string | null;
  prixAchatBrut?: number | null;
  remiseAchat?: number | null;
  netAchatHTVA?: number | null;
  tva?: number | null;
  netAchatTTC?: number | null;
  marge?: number | null;
  prixNeveux?: number | null;
}

/** GET /api/cat2/cards?parentId= */
export async function getCat2Cards(parentId: number | string): Promise<Cat2CardApi[]> {
  const id = typeof parentId === 'string' ? parseInt(parentId, 10) : parentId;
  if (!Number.isFinite(id) || id < 0) return [];
  const url = `${getApiBaseUrl()}/cat2/cards?parentId=${encodeURIComponent(String(id))}`;
  const res = await fetch(url, { cache: 'no-store' });
  if (!res.ok) return [];
  const json = await res.json().catch(() => null);
  return Array.isArray(json?.data) ? json.data : [];
}

/** GET /api/cat2/cards/:id */
export async function getCat2CardById(id: number | string): Promise<Cat2CardApi | null> {
  const numId = typeof id === 'string' ? parseInt(id, 10) : id;
  if (!Number.isFinite(numId) || numId <= 0) return null;
  const url = `${getApiBaseUrl()}/cat2/cards/${numId}`;
  const res = await fetch(url, { cache: 'no-store' });
  if (!res.ok) return null;
  const json = await res.json().catch(() => null);
  return json?.data ?? null;
}

/** POST /api/cat2/cards (admin). Returns created row. */
export async function createCat2Card(payload: CreateCat2CardPayload): Promise<Cat2CardApi> {
  const userData = typeof window !== 'undefined' ? localStorage.getItem('user') : null;
  const headers: HeadersInit = { 'Content-Type': 'application/json' };
  if (userData) (headers as Record<string, string>)['x-user'] = userData;
  const res = await fetch(`${getApiBaseUrl()}/cat2/cards`, {
    method: 'POST',
    headers,
    body: JSON.stringify(payload),
    cache: 'no-store',
  });
  const json = await res.json().catch(() => null);
  if (!res.ok) throw new Error(json?.error ?? 'Failed to create Cat2 card');
  if (!json?.data) throw new Error('Invalid response');
  return json.data;
}

/** PUT /api/cat2/cards/:id (admin). */
export async function updateCat2Card(id: number, patch: Partial<CreateCat2CardPayload>): Promise<Cat2CardApi> {
  const userData = typeof window !== 'undefined' ? localStorage.getItem('user') : null;
  const headers: HeadersInit = { 'Content-Type': 'application/json' };
  if (userData) (headers as Record<string, string>)['x-user'] = userData;
  const res = await fetch(`${getApiBaseUrl()}/cat2/cards/${id}`, {
    method: 'PUT',
    headers,
    body: JSON.stringify(patch),
    cache: 'no-store',
  });
  const json = await res.json().catch(() => null);
  if (!res.ok) throw new Error(json?.error ?? 'Failed to update Cat2 card');
  if (!json?.data) throw new Error('Invalid response');
  return json.data;
}

/** DELETE /api/cat2/cards/:id (admin). */
export async function deleteCat2Card(id: number): Promise<void> {
  const userData = typeof window !== 'undefined' ? localStorage.getItem('user') : null;
  const headers: HeadersInit = { 'Content-Type': 'application/json' };
  if (userData) (headers as Record<string, string>)['x-user'] = userData;
  const res = await fetch(`${getApiBaseUrl()}/cat2/cards/${id}`, {
    method: 'DELETE',
    headers,
    cache: 'no-store',
  });
  if (!res.ok) {
    const json = await res.json().catch(() => null);
    throw new Error(json?.error ?? 'Failed to delete Cat2 card');
  }
}

// ==========================================
// SEARCH OPTIONS API
// ==========================================

export const getSearchOptions = async (field?: string): Promise<SearchOptionData[]> => {
  try {
    const url = field ? `${getApiBaseUrl()}/searchOptions?field=${field}` : `${getApiBaseUrl()}/searchOptions`;
    const response = await fetch(url, { cache: 'no-store' });
    
    if (!response.ok) {
      throw new Error(`Failed to fetch search options: ${response.statusText}`);
    }
    
    const result = await response.json();
    
    if (!result.success || !result.data) {
      throw new Error('Invalid API response format');
    }
    
    return result.data;
  } catch (error) {
    console.error('❌ Error fetching search options:', error);
    throw error;
  }
};

export const createSearchOption = async (data: SearchOptionData): Promise<SearchOptionData> => {
  try {
    const response = await fetch(`${getApiBaseUrl()}/searchOptions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `Failed to create search option: ${response.statusText}`);
    }
    
    const result = await response.json();
    
    if (!result.success || !result.data) {
      throw new Error(result.error || 'Invalid API response format');
    }
    
    return result.data;
  } catch (error) {
    console.error('❌ Error creating search option:', error);
    throw error;
  }
};

export const deleteSearchOption = async (id: string): Promise<boolean> => {
  try {
    const response = await fetch(`${getApiBaseUrl()}/searchOptions/${id}`, {
      method: 'DELETE',
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `Failed to delete search option: ${response.statusText}`);
    }
    
    const result = await response.json();
    
    if (!result.success) {
      throw new Error(result.error || 'Failed to delete search option');
    }
    
    return true;
  } catch (error) {
    console.error('❌ Error deleting search option:', error);
    throw error;
  }
};

export const deleteSearchOptionByValue = async (field: string, value: string): Promise<boolean> => {
  try {
    const response = await fetch(`${getApiBaseUrl()}/searchOptions/field-value`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ field, value }),
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `Failed to delete search option: ${response.statusText}`);
    }
    
    const result = await response.json();
    
    if (!result.success) {
      throw new Error(result.error || 'Failed to delete search option');
    }
    
    return true;
  } catch (error) {
    console.error('❌ Error deleting search option by value:', error);
    throw error;
  }
};

// ==========================================
// CAR BRANDS API (Legacy - for backwards compatibility)
// ==========================================

export const getCarBrands = async (): Promise<CarBrandData[]> => {
  try {
    const response = await fetch(`${getApiBaseUrl()}/carBrands`, {
      cache: 'no-store',
    });
    
    if (!response.ok) {
      throw new Error(`Failed to fetch car brands: ${response.statusText}`);
    }
    
    const result = await response.json();
    
    if (!result.success || !result.data) {
      throw new Error('Invalid API response format');
    }
    
    return result.data;
  } catch (error) {
    console.error('❌ Error fetching car brands:', error);
    throw error;
  }
};

export const createCarBrand = async (data: CarBrandData): Promise<CarBrandData> => {
  try {
    const response = await fetch(`${getApiBaseUrl()}/carBrands`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `Failed to create car brand: ${response.statusText}`);
    }
    
    const result = await response.json();
    
    if (!result.success || !result.data) {
      throw new Error('Invalid API response format');
    }
    
    return result.data;
  } catch (error) {
    console.error('❌ Error creating car brand:', error);
    throw error;
  }
};

export const updateCarBrand = async (id: string, data: Partial<CarBrandData>): Promise<CarBrandData> => {
  try {
    const response = await fetch(`${getApiBaseUrl()}/carBrands/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `Failed to update car brand: ${response.statusText}`);
    }
    
    const result = await response.json();
    
    if (!result.success || !result.data) {
      throw new Error('Invalid API response format');
    }
    
    return result.data;
  } catch (error) {
    console.error('❌ Error updating car brand:', error);
    throw error;
  }
};

export const deleteCarBrand = async (id: string): Promise<boolean> => {
  try {
    const response = await fetch(`${getApiBaseUrl()}/carBrands/${id}`, {
      method: 'DELETE',
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `Failed to delete car brand: ${response.statusText}`);
    }
    
    const result = await response.json();
    
    if (!result.success) {
      throw new Error(result.error || 'Failed to delete car brand');
    }
    
    return true;
  } catch (error) {
    console.error('❌ Error deleting car brand:', error);
    throw error;
  }
};

export const deleteCarBrandByName = async (name: string): Promise<boolean> => {
  try {
    const brands = await getCarBrands();
    const brand = brands.find(b => b.name === name);
    
    if (!brand || !brand.id) {
      throw new Error(`Car brand "${name}" not found`);
    }
    
    return await deleteCarBrand(brand.id.toString());
  } catch (error) {
    console.error('❌ Error deleting car brand by name:', error);
    throw error;
  }
};

export const getBrandSuggestions = async (query: string, limit: number = 3): Promise<CarBrandData[]> => {
  console.log('🔍 API: Getting brand suggestions for:', query);
  try {
    const brands = await getCarBrands();
    const { normalizeText, calculateMatchScore } = await import('@/utils/fuzzySearch');
    const normalizedQuery = normalizeText(query);
    
    if (!normalizedQuery) return brands.slice(0, limit);
    
    const scored = brands.map((brand: CarBrandData) => {
      const normalizedBrand = normalizeText(brand.name);
      const match = calculateMatchScore(normalizedBrand, normalizedQuery, 'brand');
      return { brand, score: match.score };
    });
    
    scored.sort((a, b) => b.score - a.score);
    return scored.slice(0, limit).map(item => item.brand);
  } catch (error) {
    console.error('🔍 API: Error getting brand suggestions:', error);
    return [];
  }
};

export const getCategorySuggestions = async (query: string, limit: number = 3): Promise<string[]> => {
  console.log('🔍 API: Getting category suggestions for:', query);
  try {
    const products = await getProducts();
    const { normalizeText, calculateMatchScore } = await import('@/utils/fuzzySearch');
    const normalizedQuery = normalizeText(query);
    
    const categories = [...new Set(products.map(p => p.category).filter(Boolean))];
    
    if (!normalizedQuery) return categories.slice(0, limit);
    
    const scored = categories.map(category => {
      const normalizedCategory = normalizeText(category);
      const match = calculateMatchScore(normalizedCategory, normalizedQuery, 'category');
      return { category, score: match.score };
    });
    
    scored.sort((a, b) => b.score - a.score);
    return scored.slice(0, limit).map(item => item.category);
  } catch (error) {
    console.error('🔍 API: Error getting category suggestions:', error);
    return [];
  }
};

// ==========================================
// SUBCATEGORIES API - For FamillesPiecesSectionCompact
// ==========================================

export interface SubcategoryData {
  id?: number;
  name: string;
  family_name?: string;
  image_url?: string;
  created_at?: string;
  updated_at?: string;
}

/**
 * Get all subcategories from database - ALWAYS FRESH (no cache)
 */
export const getSubcategories = async (): Promise<SubcategoryData[]> => {
  try {
    const timestamp = Date.now(); // Cache buster
    const response = await fetch(`${getApiBaseUrl()}/subcategories?t=${timestamp}`, {
      cache: 'no-store',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      throw new Error(`Failed to fetch subcategories: ${response.statusText}`);
    }
    
    const result = await response.json();
    
    if (!result.success || !result.data) {
      throw new Error('Invalid API response');
    }
    
    console.log('✅ Subcategories fetched (fresh):', result.data.length, 'items');
    return result.data;
  } catch (error) {
    console.error('❌ Error fetching subcategories:', error);
    return [];
  }
};

/**
 * Upload subcategory image AND link to family - triggers global refresh
 * @param name - Subcategory name
 * @param file - Image file
 * @param familyName - Parent family name (required for persistence)
 */
export const uploadSubcategoryImage = async (
  name: string, 
  file: File, 
  familyName?: string
): Promise<SubcategoryData | null> => {
  try {
    // Get user from localStorage to send as header (for admin auth)
    const userData = localStorage.getItem('user');
    if (!userData) {
      throw new Error('Authentication required. Please log in.');
    }

    const formData = new FormData();
    formData.append('image', file);
    formData.append('subcategory_name', name);
    if (familyName) {
      formData.append('family_name', familyName);
    }
    
    const headers: HeadersInit = {};
    // Add x-user header for admin authentication (DO NOT set Content-Type - browser will set it automatically for FormData)
    headers['x-user'] = userData;
    
    const response = await fetch(`${getApiBaseUrl()}/subcategories/upload-image`, {
      method: 'POST',
      headers,
      body: formData,
      cache: 'no-store'
    });
    
    if (!response.ok) {
      if (response.status === 401) {
        throw new Error('Authentication required. Please log in.');
      }
      if (response.status === 403) {
        throw new Error('Admin access required');
      }
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `Failed to upload image: ${response.statusText}`);
    }
    
    const result = await response.json();
    
    if (!result.success || !result.data) {
      throw new Error(result.error || 'Invalid API response');
    }
    
    console.log('✅ Subcategory image uploaded:', name, 'Family:', familyName || 'N/A');
    
    // Dispatch global event to refresh all components
    window.dispatchEvent(new CustomEvent('subcategories-updated'));
    
    return result.data;
  } catch (error) {
    console.error('❌ Error uploading subcategory image:', error);
    throw error;
  }
};

/**
 * Get subcategories grouped by family name
 */
export const getSubcategoriesByFamily = async (): Promise<Record<string, SubcategoryData[]>> => {
  try {
    const timestamp = Date.now();
    const response = await fetch(`${getApiBaseUrl()}/subcategories/by-family?t=${timestamp}`, {
      cache: 'no-store',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      throw new Error(`Failed to fetch subcategories: ${response.statusText}`);
    }
    
    const result = await response.json();
    
    if (!result.success || !result.data) {
      throw new Error('Invalid API response');
    }
    
    console.log('✅ Subcategories by family fetched');
    return result.data;
  } catch (error) {
    console.error('❌ Error fetching subcategories by family:', error);
    return {};
  }
};

/**
 * Get subcategories for a specific family
 */
export const getSubcategoriesForFamily = async (familyName: string): Promise<SubcategoryData[]> => {
  try {
    const timestamp = Date.now();
    const response = await fetch(
      `${getApiBaseUrl()}/subcategories/family/${encodeURIComponent(familyName)}?t=${timestamp}`, 
      {
        cache: 'no-store',
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );
    
    if (!response.ok) {
      throw new Error(`Failed to fetch subcategories: ${response.statusText}`);
    }
    
    const result = await response.json();
    
    if (!result.success || !result.data) {
      throw new Error('Invalid API response');
    }
    
    console.log('✅ Subcategories for family fetched:', familyName);
    return result.data;
  } catch (error) {
    console.error('❌ Error fetching subcategories for family:', error);
    return [];
  }
};

/**
 * Force refresh subcategories globally
 * Call this after any create/update/delete operation
 * Triggers refresh across ALL tabs/windows using BroadcastChannel
 */
export const refreshSubcategoriesGlobally = async (): Promise<void> => {
  console.log('🔄 Triggering global subcategories refresh...');
  
  // Method 1: Custom event for same-tab listeners
  window.dispatchEvent(new CustomEvent('subcategories-updated'));
  
  // Method 2: BroadcastChannel for cross-tab communication
  try {
    const channel = new BroadcastChannel('subcategories-updates');
    channel.postMessage({ type: 'refresh', timestamp: Date.now() });
    channel.close();
  } catch (e) {
    console.warn('BroadcastChannel not supported, using events only');
  }
  
  // Method 3: Fetch fresh data to ensure cache is cleared
  await getSubcategories();
};

/**
 * Global refresh function for all categories/subcategories
 * Forces re-fetch everywhere (same tab, other tabs, React Query cache)
 */
export const refreshCategoriesGlobally = async (): Promise<void> => {
  console.log('🔄 refreshCategoriesGlobally: Forcing refresh everywhere...');
  
  // Refresh subcategories
  await refreshSubcategoriesGlobally();
  
  // Dispatch global categories refresh event
  window.dispatchEvent(new CustomEvent('categories-updated'));
  
  // BroadcastChannel for cross-tab
  try {
    const channel = new BroadcastChannel('categories-updates');
    channel.postMessage({ type: 'refresh', timestamp: Date.now() });
    channel.close();
  } catch (e) {
    console.warn('BroadcastChannel not supported');
  }
};

// ==========================================
// ACHA PRODUCTS API - For Acha Page
// ==========================================

export interface AchaProductData {
  id?: number;
  sub_id: string;
  name?: string;
  brand_name?: string;
  model_name?: string;
  description?: string;
  price?: string;
  images?: string[];
  quantity?: number;
  product_references?: string[];
  promotion_percentage?: number | null;
  promotion_price?: string | null;
  created_at?: string;
  updated_at?: string;
}

/**
 * Get or create an Acha product by sub_id
 */
export const getOrCreateAchaProduct = async (subId: string): Promise<AchaProductData> => {
  try {
    const response = await fetch(`${getApiBaseUrl()}/acha-products/sub/${encodeURIComponent(subId)}`, {
      cache: 'no-store',
    });
    
    if (!response.ok) {
      throw new Error(`Failed to get or create acha product: ${response.statusText}`);
    }
    
    const result = await response.json();
    
    if (!result.success || !result.data) {
      throw new Error(result.error || 'Invalid API response');
    }
    
    console.log('✅ Acha product loaded:', {
      sub_id: result.data.sub_id,
      promotion_percentage: result.data.promotion_percentage,
      promotion_price: result.data.promotion_price,
      price: result.data.price
    });
    return result.data;
  } catch (error) {
    console.error('❌ Error getting/creating acha product:', error);
    throw error;
  }
};

/**
 * Update an Acha product
 */
export const updateAchaProduct = async (id: number, data: Partial<AchaProductData>): Promise<AchaProductData> => {
  try {
    console.log('🔄 Updating Acha product:', { id, data, promotion_percentage: data.promotion_percentage });
    
    const response = await fetch(`${getApiBaseUrl()}/acha-products/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      cache: 'no-store',
      body: JSON.stringify(data),
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `Failed to update acha product: ${response.statusText}`);
    }
    
    const result = await response.json();
    
    if (!result.success || !result.data) {
      throw new Error(result.error || 'Invalid API response');
    }
    
    console.log('✅ Acha product updated');
    return result.data;
  } catch (error) {
    console.error('❌ Error updating acha product:', error);
    throw error;
  }
};

/**
 * Perform vente hors ligne (decrease quantity by 1)
 */
export const venteHorsLigneAchaProduct = async (id: number): Promise<AchaProductData> => {
  try {
    const response = await fetch(`${getApiBaseUrl()}/acha-products/${id}/vente-hors-ligne`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `Failed to perform vente hors ligne: ${response.statusText}`);
    }
    
    const result = await response.json();
    
    if (!result.success || !result.data) {
      throw new Error(result.error || 'Invalid API response');
    }
    
    console.log('✅ Vente hors ligne successful, new quantity:', result.data.quantity);
    return result.data;
  } catch (error) {
    console.error('❌ Error performing vente hors ligne:', error);
    throw error;
  }
};

// ==========================================
// HERO CONTENT API - Dynamic Hero Section
// ==========================================

export interface HeroContentData {
  id?: number;
  title: string;
  subtitle: string;
  buttonText: string;
  buttonLink: string;
  images: string[];
  updatedAt?: string;
}

/**
 * Get hero content from database
 */
export const getHeroContent = async (): Promise<HeroContentData> => {
  try {
    const response = await fetch(`${getApiBaseUrl()}/hero`, {
      cache: 'no-store',
    });
    
    if (!response.ok) {
      throw new Error(`Failed to get hero content: ${response.statusText}`);
    }
    
    const result = await response.json();
    
    if (!result.success || !result.data) {
      throw new Error(result.error || 'Invalid API response');
    }
    
    console.log('✅ Hero content loaded from database');
    return result.data;
  } catch (error) {
    console.error('❌ Error loading hero content:', error);
    // Return default content on error
    return {
      title: 'Un large choix de pièces auto',
      subtitle: 'Découvrez des milliers de références pour toutes les marques populaires. Qualité garantie, service fiable.',
      buttonText: 'Découvrir le catalogue',
      buttonLink: '/catalogue',
      images: ['/k.png', '/k2.jpg', '/k3.png']
    };
  }
};

/**
 * Update hero content (admin only)
 */
export const updateHeroContent = async (data: Partial<HeroContentData>): Promise<HeroContentData> => {
  try {
    const response = await fetch(`${getApiBaseUrl()}/hero`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `Failed to update hero content: ${response.statusText}`);
    }
    
    const result = await response.json();
    
    if (!result.success || !result.data) {
      throw new Error(result.error || 'Invalid API response');
    }
    
    console.log('✅ Hero content updated successfully');
    return result.data;
  } catch (error) {
    console.error('❌ Error updating hero content:', error);
    throw error;
  }
};

/**
 * Upload hero images (admin only)
 */
export const uploadHeroImages = async (files: File[]): Promise<string[]> => {
  try {
    const formData = new FormData();
    files.forEach((file, index) => {
      formData.append('images', file);
    });
    
    const response = await fetch(`${getApiBaseUrl()}/hero/upload`, {
      method: 'POST',
      body: formData,
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `Failed to upload images: ${response.statusText}`);
    }
    
    const result = await response.json();
    
    if (!result.success || !result.data) {
      throw new Error(result.error || 'Invalid API response');
    }
    
    console.log('✅ Hero images uploaded successfully');
    return result.data.images;
  } catch (error) {
    console.error('❌ Error uploading hero images:', error);
    throw error;
  }
};

// ==========================================
// BRANDS SECTION API
// ==========================================

export interface BrandImagesData {
  id?: number;
  title: string;
  images: string[];
  updatedAt?: string;
}

const DEFAULT_BRANDS: BrandImagesData = {
  id: 0,
  title: 'NOS MARQUES DISPONIBLES',
  images: ['/pp.jpg'],
  updatedAt: new Date().toISOString()
};

/**
 * Get brand images from database
 */
export const getBrandImages = async (): Promise<BrandImagesData> => {
  try {
    const response = await fetch(`${getApiBaseUrl()}/brands`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    if (!response.ok) {
      console.warn('⚠️ Failed to fetch brands, using defaults');
      return DEFAULT_BRANDS;
    }
    
    const result = await response.json();
    
    if (!result.success || !result.data) {
      console.warn('⚠️ Invalid brands response, using defaults');
      return DEFAULT_BRANDS;
    }
    
    console.log('✅ Brand images fetched successfully');
    return {
      id: result.data.id,
      title: result.data.title || DEFAULT_BRANDS.title,
      images: result.data.images || DEFAULT_BRANDS.images,
      updatedAt: result.data.updatedAt
    };
  } catch (error) {
    console.error('❌ Error fetching brand images:', error);
    return DEFAULT_BRANDS;
  }
};

/**
 * Update brand images (admin only)
 */
export const updateBrandImages = async (data: Partial<BrandImagesData>): Promise<BrandImagesData> => {
  try {
    const response = await fetch(`${getApiBaseUrl()}/brands`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `Failed to update brands: ${response.statusText}`);
    }
    
    const result = await response.json();
    
    if (!result.success || !result.data) {
      throw new Error(result.error || 'Invalid API response');
    }
    
    console.log('✅ Brand images updated successfully');
    return {
      id: result.data.id,
      title: result.data.title,
      images: result.data.images,
      updatedAt: result.data.updatedAt
    };
  } catch (error) {
    console.error('❌ Error updating brand images:', error);
    throw error;
  }
};

/**
 * Upload brand images (admin only)
 */
export const uploadBrandImages = async (files: File[]): Promise<string[]> => {
  try {
    const formData = new FormData();
    files.forEach((file) => {
      formData.append('images', file);
    });
    
    const response = await fetch(`${getApiBaseUrl()}/brands/upload`, {
      method: 'POST',
      body: formData,
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `Failed to upload images: ${response.statusText}`);
    }
    
    const result = await response.json();
    
    if (!result.success || !result.data) {
      throw new Error(result.error || 'Invalid API response');
    }
    
    console.log('✅ Brand images uploaded successfully');
    return result.data.images;
  } catch (error) {
    console.error('❌ Error uploading brand images:', error);
    throw error;
  }
};

/**
 * Dashboard Product Data Interface
 */
export interface DashboardProductData {
  id?: number;
  acha_id: number;
  sub_id?: string | null;
  name?: string | null;
  price?: number | string;
  quantity?: number;
  first_image?: string | null;
  reference?: string | null;
  promotion_percentage?: number;
  created_at?: string;
}

/**
 * Add product to dashboard
 */
export async function addDashboardProduct(product) {
  // Build request body matching backend API expectations
  const requestBody = {
    name: product.name,
    price: product.price,
    promo_percent: product.promo_percent !== undefined ? product.promo_percent : null,
    promo_price: product.promo_price || null,
    image: product.image || null,
    references: Array.isArray(product.references) ? product.references : []
  };

  console.log('🌐 API call - POST /api/dashboard-products:', JSON.stringify(requestBody, null, 2));

  const response = await fetch(`${getApiBaseUrl()}/dashboard-products`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(requestBody),
  });

  const result = await response.json();
  
  if (!response.ok) {
    // Extract error message from response
    const errorMessage = result.error || `Failed to add product: ${response.statusText}`;
    throw new Error(errorMessage);
  }

  console.log('✅ API response received:', JSON.stringify(result, null, 2));
  return result;
}

/**
 * Get all dashboard products
 */
export async function getDashboardProducts() {
  const res = await fetch(`${getApiBaseUrl()}/dashboard-products`);
  if (!res.ok) throw new Error("Failed to fetch dashboard products");
  return res.json();
}

/**
 * Delete dashboard product
 */
export async function deleteDashboardProduct(id: string) {
  const response = await fetch(`${getApiBaseUrl()}/dashboard-products/${id}`, {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
  });
  if (!response.ok) throw new Error("Failed to delete product");
  return response.json();
}

/**
 * Update dashboard product
 */
export async function updateDashboardProduct(id: string, data: any) {
  const requestBody = {
    id: data.id,
    name: data.name,
    image: data.image,
    reference: data.reference,
    price: data.price,
    quantity: data.quantity !== undefined ? Number(data.quantity) : 0
  };

  const response = await fetch(`${getApiBaseUrl()}/dashboard-products/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(requestBody),
  });
  if (!response.ok) throw new Error("Failed to update product");
  return response.json();
}

/**
 * Delete product from Produits2 (admin_dashboard_products table).
 * Backend: DELETE /api/admin/dashboard-products/:id
 * Does NOT touch promotions or offre historique.
 */
export async function deleteAdminDashboardProduct(id: number): Promise<void> {
  const res = await fetch(`${getApiBaseUrl()}/admin/dashboard-products/${id}`, {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
  });
  if (!res.ok) {
    const result = await res.json().catch(() => ({}));
    const msg = typeof result?.error === "string" ? result.error : "Failed to delete product";
    throw new Error(msg);
  }
}

/**
 * Delete product from Produits2 by slug (fallback).
 * Backend: DELETE /api/admin/dashboard-products/by-slug/:slug
 */
export async function deleteAdminDashboardProductBySlug(slug: string): Promise<void> {
  const res = await fetch(
    `${getApiBaseUrl()}/admin/dashboard-products/by-slug/${encodeURIComponent(slug)}`,
    { method: "DELETE", headers: { "Content-Type": "application/json" } }
  );
  if (!res.ok) {
    const result = await res.json().catch(() => ({}));
    const msg = typeof result?.error === "string" ? result.error : "Failed to delete product";
    throw new Error(msg);
  }
}

// ==========================================
// OFFRE HISTORIQUE (Admin dashboard products)
// ==========================================

export type OffreHistoriqueItem = {
  slug: string;
  name: string;
  image?: string | null;
  reference?: string | null;
  price?: number | null;
  quantity?: number | null;
  created_at?: string | null;
  promo_id?: number | null;
};

/**
 * Get "Offre historique" items (admin dashboard products list).
 * Backend: GET /api/admin/dashboard-products
 */
export async function getOffreHistorique(): Promise<OffreHistoriqueItem[]> {
  const res = await fetch(`${getApiBaseUrl()}/offre-historique`, { cache: "no-store" });
  if (!res.ok) throw new Error("Failed to fetch offre historique");
  const result = await res.json().catch(() => null);
  const items: any[] = Array.isArray(result?.items) ? result.items : [];
  return items
    .map((p) => ({
      id: p.id != null ? Number(p.id) : null,
      slug: String(p.slug || ""),
      name: String(p.name || ""),
      image: p.image ?? null,
      reference: p.reference ?? null,
      price: p.price !== undefined && p.price !== null ? Number(p.price) : null,
      quantity: (p.quantite ?? p.quantity) !== undefined && (p.quantite ?? p.quantity) !== null
        ? Number(p.quantite ?? p.quantity)
        : null,
      created_at: p.created_at ?? null,
      promo_id: p.promo_id != null ? Number(p.promo_id) : null,
    }))
    .filter((p) => Boolean(p.slug) || Boolean(p.name));
}

/**
 * Add current Acha2 product to "Offre historique".
 * Backend: POST /api/offre-historique
 * Legacy: uses slug. For promo-origin, use addOffreHistoriquePromo({ promoId }).
 */
export async function addOffreHistorique(payload: {
  slug: string;
  name?: string;
  reference?: string | null;
  image?: string | null;
}) {
  const res = await fetch(`${getApiBaseUrl()}/offre-historique`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ slug: payload.slug }),
  });
  const result = await res.json().catch(() => null);
  if (!res.ok) {
    const msg = typeof result?.error === "string" ? result.error : "Failed to add to offre historique";
    throw new Error(msg);
  }
  return result;
}

/**
 * Get promotion by ID.
 * Backend: GET /api/promotions/:promoId
 */
export async function getPromotionById(promoId: number): Promise<{
  id: number;
  title?: string;
  product_slug?: string;
  productSlug?: string;
  reference?: string;
  ref?: string;
  badge?: string;
  image?: string;
  expiresAt?: string;
  stock?: number | null;
  stock_disponible?: number | null;
  alertThreshold?: number | null;
  seuil_alerte?: number | null;
} | null> {
  try {
    const res = await fetch(`${getApiBaseUrl()}/promotions/${promoId}`, { cache: "no-store" });
    if (!res.ok) {
      if (res.status === 404) return null;
      throw new Error("Failed to fetch promotion");
    }
    const result = await res.json().catch(() => null);
    if (!result?.success || !result?.promo) return null;
    return result.promo;
  } catch (e) {
    console.warn("getPromotionById error:", e);
    return null;
  }
}

/**
 * Update promotion stock (delta). Admin only.
 * Backend: PATCH /api/promotions/:promoId/stock
 * Body: { delta: number } default -1
 */
export async function patchPromotionStock(
  promoId: number,
  delta: number = -1
): Promise<{ promo?: { stock?: number } }> {
  const userData = typeof window !== "undefined" ? localStorage.getItem("user") : null;
  const headers: HeadersInit = { "Content-Type": "application/json" };
  if (userData) headers["x-user"] = userData;

  const res = await fetch(`${getApiBaseUrl()}/promotions/${promoId}/stock`, {
    method: "PATCH",
    headers,
    body: JSON.stringify({ delta }),
  });
  const result = await res.json().catch(() => null);
  if (!res.ok) {
    const msg = typeof result?.error === "string" ? result.error : "Failed to update promotion stock";
    throw new Error(msg);
  }
  return result;
}

/**
 * Set promotion stock to an absolute value. Admin only.
 * Backend: PATCH /api/promotions/:promoId/stock with body { stock: number }
 * Returns { success: true, id, stock, updatedAt, promo }.
 */
export async function setPromotionStock(
  promoId: number,
  stock: number
): Promise<{ success?: boolean; id?: number; stock?: number; updatedAt?: string; promo?: { stock?: number } }> {
  const userData = typeof window !== "undefined" ? localStorage.getItem("user") : null;
  const headers: HeadersInit = { "Content-Type": "application/json" };
  if (userData) headers["x-user"] = userData;

  const payload = { stock: Math.max(0, Math.floor(Number(stock))) };
  const url = `${getApiBaseUrl()}/promotions/${promoId}/stock`;
  const res = await fetch(url, {
    method: "PATCH",
    headers,
    body: JSON.stringify(payload),
    cache: "no-store",
  });
  const result = await res.json().catch(() => null);
  if (typeof window !== "undefined" && import.meta.env?.DEV) {
    console.log("[setPromotionStock] payload=%o id=%s status=%s response=%o", payload, promoId, res.status, result);
  }
  if (!res.ok) {
    const msg = typeof result?.error === "string" ? result.error : "Failed to set promotion stock";
    throw new Error(msg);
  }
  return result;
}

/**
 * Add promotion to offre historique (promo-only, does NOT touch admin_dashboard_products).
 * Backend: POST /api/offre-historique with { slug, promoId, promoPrice, promoStock }
 */
export async function addOffreHistoriquePromo(payload: {
  slug: string;
  promoId: number;
  promoPrice: number;
  promoStock: number;
}) {
  const res = await fetch(`${getApiBaseUrl()}/offre-historique`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      slug: payload.slug,
      promoId: payload.promoId,
      promoPrice: payload.promoPrice,
      promoStock: payload.promoStock,
    }),
  });
  const result = await res.json().catch(() => null);
  if (!res.ok) {
    const msg = typeof result?.error === "string" ? result.error : "Failed to add to offre historique";
    throw new Error(msg);
  }
  return result;
}

/**
 * Delete offre-historique entry by promoId (when promotion is deleted).
 * Backend: DELETE /api/offre-historique/by-promo/:promoId
 */
export async function deleteOffreHistoriqueByPromo(promoId: number): Promise<void> {
  const res = await fetch(`${getApiBaseUrl()}/offre-historique/by-promo/${promoId}`, {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
  });
  if (!res.ok) {
    const result = await res.json().catch(() => null);
    const msg = typeof result?.error === "string" ? result.error : "Failed to delete from offre historique";
    throw new Error(msg);
  }
}

/**
 * Delete offre-historique entry by slug (fallback when promoId not available).
 * Backend: DELETE /api/offre-historique/by-slug/:slug
 */
export async function deleteOffreHistoriqueBySlug(slug: string): Promise<void> {
  const res = await fetch(
    `${getApiBaseUrl()}/offre-historique/by-slug/${encodeURIComponent(slug)}`,
    { method: "DELETE", headers: { "Content-Type": "application/json" } }
  );
  if (!res.ok) {
    const result = await res.json().catch(() => null);
    const msg = typeof result?.error === "string" ? result.error : "Failed to delete from offre historique";
    throw new Error(msg);
  }
}

/**
 * Delete offre-historique entry by primary key id (admin only).
 * Backend: DELETE /api/offre-historique/:id
 */
export async function deleteOffreHistoriqueById(id: number): Promise<void> {
  const userData = typeof window !== "undefined" ? localStorage.getItem("user") : null;
  const headers: HeadersInit = { "Content-Type": "application/json" };
  if (userData) headers["x-user"] = userData;

  const res = await fetch(`${getApiBaseUrl()}/offre-historique/${id}`, {
    method: "DELETE",
    headers,
  });
  if (!res.ok) {
    const result = await res.json().catch(() => null);
    const msg = typeof result?.error === "string" ? result.error : "Failed to delete from offre historique";
    throw new Error(msg);
  }
}

/**
 * Cleanup orphan offre-historique entries (admin only).
 * Deletes rows whose promo no longer exists in section_content.
 * Backend: DELETE /api/offre-historique/cleanup-orphans
 * Returns { deletedCount, deletedRowsPreview }.
 */
export async function cleanupOffreHistoriqueOrphans(): Promise<{
  deletedCount: number;
  deletedRowsPreview: Array<{ id: number; promo_id?: number; slug?: string; name?: string; created_at?: string }>;
}> {
  const userData = typeof window !== "undefined" ? localStorage.getItem("user") : null;
  const headers: HeadersInit = { "Content-Type": "application/json" };
  if (userData) headers["x-user"] = userData;

  const res = await fetch(`${getApiBaseUrl()}/offre-historique/cleanup-orphans`, {
    method: "DELETE",
    headers,
  });
  const result = await res.json().catch(() => null);
  if (!res.ok) {
    const msg = typeof result?.error === "string" ? result.error : "Failed to cleanup orphans";
    throw new Error(msg);
  }
  return {
    deletedCount: result.deletedCount ?? 0,
    deletedRowsPreview: result.deletedRowsPreview ?? [],
  };
}

/**
 * Acha2 Product Data Interface
 */
export interface Acha2ProductData {
  id: string; // Product name used as ID
  name: string;
  quantity2: number;
  price2: number;
  description2: string;
  references2: string[];
  images2: string[];
  modele2: string[];
  has_discount2?: boolean;
  discount_type2?: string | null;
  discount_value2?: number | null;
  discounted_price2?: number | null;
  caracteristiques2?: string;
  references_constructeur2?: string;
  custom_content2?: string;
  avis_clients?: {
    average: number;
    count: number;
    reviews: Array<{
      author: string;
      rating: number;
      comment: string;
    }>;
  };
  created_at?: string;
  updated_at?: string;
}

/**
 * Get all Acha2 products
 */
export async function getAcha2Products(): Promise<Acha2ProductData[]> {
  try {
    const response = await fetch(`${getApiBaseUrl()}/acha2/all`);
    if (!response.ok) {
      throw new Error("Failed to fetch Acha2 products");
    }
    const result = await response.json();
    if (result.success && Array.isArray(result.data)) {
      return result.data;
    }
    return [];
  } catch (error) {
    console.error('❌ Error fetching Acha2 products:', error);
    throw error;
  }
}

/**
 * Save Acha2 product to dashboard (UPSERT - insert or update)
 */
export async function saveAcha2Product(data: {
  name: string;
  quantity2: number;
  price2: number;
  description2: string;
  references2: string[];
  images2: string[];
  modele2: string[];
}): Promise<Acha2ProductData> {
  try {
    const response = await fetch(`${getApiBaseUrl()}/acha2/${encodeURIComponent(data.name)}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      cache: 'no-store',
      body: JSON.stringify({
        quantity2: data.quantity2 || 0,
        price2: data.price2 || 0,
        description2: data.description2 || '',
        references2: Array.isArray(data.references2) ? data.references2 : [],
        images2: Array.isArray(data.images2) ? data.images2 : [],
        modele2: Array.isArray(data.modele2) ? data.modele2 : [],
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || "Failed to save Acha2 product");
    }

    const result = await response.json();
    if (result.success && result.data) {
      console.log('✅ Acha2 product saved to dashboard:', data.name);
      return result.data;
    }
    throw new Error("Invalid API response");
  } catch (error) {
    console.error('❌ Error saving Acha2 product:', error);
    throw error;
  }
}

/**
 * Update Acha2 product by name
 */
export async function updateAcha2Product(
  name: string,
  data: Partial<Omit<Acha2ProductData, 'id' | 'name' | 'created_at' | 'updated_at'>>
): Promise<Acha2ProductData> {
  try {
    // Only send fields that are actually provided (partial update support)
    const bodyData: any = {};
    if (data.quantity2 !== undefined) bodyData.quantity2 = data.quantity2;
    if (data.price2 !== undefined) bodyData.price2 = data.price2;
    if (data.description2 !== undefined) bodyData.description2 = data.description2;
    if (data.references2 !== undefined) bodyData.references2 = data.references2;
    if (data.images2 !== undefined) bodyData.images2 = data.images2;
    if (data.modele2 !== undefined) bodyData.modele2 = data.modele2;
    if (data.has_discount2 !== undefined) bodyData.has_discount2 = data.has_discount2;
    if (data.discount_type2 !== undefined) bodyData.discount_type2 = data.discount_type2;
    if (data.discount_value2 !== undefined) bodyData.discount_value2 = data.discount_value2;
    if (data.discounted_price2 !== undefined) bodyData.discounted_price2 = data.discounted_price2;
    if (data.caracteristiques2 !== undefined) bodyData.caracteristiques2 = data.caracteristiques2;
    if (data.references_constructeur2 !== undefined) bodyData.references_constructeur2 = data.references_constructeur2;
    if (data.custom_content2 !== undefined) bodyData.custom_content2 = data.custom_content2;
    if (data.avis_clients !== undefined) bodyData.avis_clients = data.avis_clients;

    // Safety: if nothing changed, avoid sending an empty/destructive update payload
    if (Object.keys(bodyData).length === 0) {
      const currentRes = await fetch(`${getApiBaseUrl()}/acha2/${encodeURIComponent(name)}`, {
        method: "GET",
        cache: "no-store",
      });
      const currentJson = await currentRes.json().catch(() => null);
      if (currentRes.ok && currentJson?.success && currentJson?.data) {
        return currentJson.data as Acha2ProductData;
      }
      throw new Error("No changed fields to update");
    }
    
    // Log before sending (incl. editable sections for persistence debugging)
    const editableKeys = ["caracteristiques2", "custom_content2", "references_constructeur2", "avis_clients"];
    const editablePayload = editableKeys.reduce((acc: Record<string, string>, k) => {
      if (bodyData[k] !== undefined) acc[k] = typeof bodyData[k] === "string" ? `${(bodyData[k] as string).length} chars` : (Array.isArray((bodyData[k] as any)?.reviews) ? `${(bodyData[k] as any).reviews.length} reviews` : "present");
      return acc;
    }, {});
    if (Object.keys(editablePayload).length > 0) console.log("📤 [Acha2] payload before save (editable sections):", editablePayload);
    console.log("📤 Saving Acha2 data:", bodyData);

    const response = await fetch(`${getApiBaseUrl()}/acha2/${encodeURIComponent(name)}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      cache: 'no-store',
      body: JSON.stringify(bodyData),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || "Failed to update Acha2 product");
    }

    const result = await response.json();
    if (result.success && result.data) {
      console.log('✅ Acha2 product updated:', name);
      console.log('✅ Response data includes:', {
        custom_content2: result.data.custom_content2 ? 'present' : 'missing',
        references_constructeur2: result.data.references_constructeur2 ? 'present' : 'missing'
      });
      return result.data;
    }
    throw new Error("Invalid API response");
  } catch (error) {
    console.error('❌ Error updating Acha2 product:', error);
    throw error;
  }
}

/**
 * Delete Acha2 product by name
 */
export async function deleteAcha2Product(name: string): Promise<void> {
  try {
    const response = await fetch(`${getApiBaseUrl()}/acha2/${encodeURIComponent(name)}`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
    });
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || "Failed to delete Acha2 product");
    }
  } catch (error) {
    console.error('❌ Error deleting Acha2 product:', error);
    throw error;
  }
}

/**
 * Patch hideVehicleSelectors flag on acha2 product (admin only).
 * PATCH /api/acha2/:slug/hide-vehicle-selectors
 */
export async function patchAcha2HideVehicleSelectors(
  slug: string,
  hideVehicleSelectors: boolean
): Promise<{ hideVehicleSelectors: boolean }> {
  const userData = typeof window !== 'undefined' ? localStorage.getItem('user') : null;
  const headers: HeadersInit = { 'Content-Type': 'application/json' };
  if (userData) headers['x-user'] = userData;

  const response = await fetch(
    `${getApiBaseUrl()}/acha2/${encodeURIComponent(slug)}/hide-vehicle-selectors`,
    {
      method: 'PATCH',
      headers,
      body: JSON.stringify({ hideVehicleSelectors }),
    }
  );

  const result = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(result?.error || 'Failed to update visibility');
  }
  if (!result?.success || result?.data === undefined) {
    throw new Error('Invalid API response');
  }
  return { hideVehicleSelectors: result.data.hideVehicleSelectors === true };
}

// ==========================================
// PROMOTIONS API
// ==========================================

export interface PromotionData {
  id: number;
  image?: string;
  title?: string;
  subtitle?: string;
  price?: string;
  originalPrice?: string;
  oldPrice?: string;
  badge?: string;
  productId?: string;
  product_slug?: string; // Primary field for product slug - matches CatPage product.slug
  expiresAt?: string;
}

export interface PromotionsData {
  promotions: PromotionData[];
}

/**
 * Get promotions from database
 */
export const getPromotions = async (): Promise<PromotionData[]> => {
  try {
    const section = await getSectionContent('promotions');
    
    if (section && section.content) {
      const content = typeof section.content === 'string' 
        ? JSON.parse(section.content) 
        : section.content;
      
      if (Array.isArray(content)) {
        return content;
      }
      
      // If content is an object with promotions array
      if (content.promotions && Array.isArray(content.promotions)) {
        return content.promotions;
      }
    }
    
    // Return default promotions if none exist
    return [
      { id: 0, image: '/ff.png' },
      { id: 1, image: '/ll.png' }
    ];
  } catch (error) {
    console.error('❌ Error fetching promotions:', error);
    // Return defaults on error
    return [
      { id: 0, image: '/ff.png' },
      { id: 1, image: '/ll.png' }
    ];
  }
};

/**
 * Update promotion image
 * This function should only be called ONCE per update operation
 */
export const updatePromotionImage = async (promoId: number, imageUrl: string): Promise<PromotionData[]> => {
  try {
    // Ensure imageUrl is a string (never a File object)
    if (!imageUrl || typeof imageUrl !== 'string') {
      throw new Error('Invalid imageUrl: must be a non-empty string');
    }
    
    const cleanedImageUrl = String(imageUrl);
    
    // Get current promotions
    const currentPromotions = await getPromotions();
    
    // Find and update the promotion
    const updatedPromotions = currentPromotions.map(promo => {
      if (promo.id === promoId) {
        return { ...promo, image: cleanedImageUrl };
      }
      return promo;
    });
    
    // If promotion doesn't exist, add it
    if (!updatedPromotions.find(p => p.id === promoId)) {
      updatedPromotions.push({ id: promoId, image: cleanedImageUrl } as PromotionData);
    }
    
    // Clean the entire array before saving - ensure all values are valid
    const cleanedPromotions = updatedPromotions.map(promo => {
      const cleaned: PromotionData = {
        id: promo.id
      };
      // Only include fields that have valid values
      if (promo.title !== undefined && promo.title !== null) cleaned.title = String(promo.title);
      if (promo.price !== undefined && promo.price !== null) cleaned.price = String(promo.price);
      if (promo.oldPrice !== undefined && promo.oldPrice !== null) cleaned.oldPrice = String(promo.oldPrice);
      if (promo.originalPrice !== undefined && promo.originalPrice !== null) cleaned.originalPrice = String(promo.originalPrice);
      if (promo.image !== undefined && promo.image !== null) cleaned.image = String(promo.image);
      if (promo.badge !== undefined && promo.badge !== null) cleaned.badge = String(promo.badge);
      if (promo.expiresAt !== undefined && promo.expiresAt !== null) {
        cleaned.expiresAt = typeof promo.expiresAt === 'string' 
          ? promo.expiresAt 
          : new Date(promo.expiresAt).toISOString();
      }
      if (promo.productId !== undefined && promo.productId !== null) cleaned.productId = String(promo.productId);
      if (promo.product_slug !== undefined && promo.product_slug !== null) cleaned.product_slug = String(promo.product_slug);
      return cleaned;
    }).filter(promo => promo.id !== undefined && promo.id !== null); // Remove any invalid entries
    
    console.log('📤 updatePromotionImage: cleaned promotions array:', JSON.stringify(cleanedPromotions, null, 2));
    
    // Validate the array can be stringified
    try {
      const testString = JSON.stringify(cleanedPromotions);
      JSON.parse(testString); // Validate
    } catch (validationError) {
      console.error('❌ Validation error in updatePromotionImage:', validationError);
      throw new Error(`Invalid promotions data: ${validationError instanceof Error ? validationError.message : 'Unknown error'}`);
    }
    
    // Save to database using sectionContent - ONLY ONCE
    await updateSectionContent('promotions', {
      sectionType: 'promotions',
      title: 'PROMOTIONS',
      content: cleanedPromotions
    });
    
    return cleanedPromotions;
  } catch (error) {
    console.error('❌ Error updating promotion image:', error);
    throw error;
  }
};

/**
 * Update promotion (all fields)
 * This function should only be called ONCE per update operation
 */
export const updatePromotion = async (promoId: number, promoData: Partial<PromotionData>): Promise<PromotionData[]> => {
  try {
    // Clean promoData first - remove undefined values and ensure proper types
    const cleanedPromoData: Partial<PromotionData> = {};
    
    if (promoData.id !== undefined) cleanedPromoData.id = promoData.id;
    if (promoData.title !== undefined && promoData.title !== null) cleanedPromoData.title = String(promoData.title);
    if (promoData.price !== undefined && promoData.price !== null) cleanedPromoData.price = String(promoData.price);
    if (promoData.oldPrice !== undefined && promoData.oldPrice !== null) cleanedPromoData.oldPrice = String(promoData.oldPrice);
    if (promoData.originalPrice !== undefined && promoData.originalPrice !== null) cleanedPromoData.originalPrice = String(promoData.originalPrice);
    if (promoData.image !== undefined && promoData.image !== null) cleanedPromoData.image = String(promoData.image);
    if (promoData.badge !== undefined && promoData.badge !== null) cleanedPromoData.badge = String(promoData.badge);
    if (promoData.expiresAt !== undefined && promoData.expiresAt !== null) {
      // Ensure expiresAt is a string (ISO date)
      cleanedPromoData.expiresAt = typeof promoData.expiresAt === 'string' 
        ? promoData.expiresAt 
        : new Date(promoData.expiresAt).toISOString();
    }
    if (promoData.productId !== undefined && promoData.productId !== null) cleanedPromoData.productId = String(promoData.productId);
    if (promoData.product_slug !== undefined && promoData.product_slug !== null) cleanedPromoData.product_slug = String(promoData.product_slug);
    
    // Get current promotions
    const currentPromotions = await getPromotions();
    
    // Find and update the promotion
    const updatedPromotions = currentPromotions.map(promo => 
      promo.id === promoId 
        ? { ...promo, ...cleanedPromoData }
        : promo
    );
    
    // If promotion doesn't exist, add it
    if (!updatedPromotions.find(p => p.id === promoId)) {
      updatedPromotions.push({ id: promoId, ...cleanedPromoData } as PromotionData);
    }
    
    // Clean the entire array before saving - ensure all values are valid
    const cleanedPromotions = updatedPromotions.map(promo => {
      const cleaned: PromotionData = {
        id: promo.id
      };
      // Only include fields that have valid values
      if (promo.title !== undefined && promo.title !== null) cleaned.title = String(promo.title);
      if (promo.price !== undefined && promo.price !== null) cleaned.price = String(promo.price);
      if (promo.oldPrice !== undefined && promo.oldPrice !== null) cleaned.oldPrice = String(promo.oldPrice);
      if (promo.originalPrice !== undefined && promo.originalPrice !== null) cleaned.originalPrice = String(promo.originalPrice);
      if (promo.image !== undefined && promo.image !== null) cleaned.image = String(promo.image);
      if (promo.badge !== undefined && promo.badge !== null) cleaned.badge = String(promo.badge);
      if (promo.expiresAt !== undefined && promo.expiresAt !== null) {
        cleaned.expiresAt = typeof promo.expiresAt === 'string' 
          ? promo.expiresAt 
          : new Date(promo.expiresAt).toISOString();
      }
      if (promo.productId !== undefined && promo.productId !== null) cleaned.productId = String(promo.productId);
      if (promo.product_slug !== undefined && promo.product_slug !== null) cleaned.product_slug = String(promo.product_slug);
      return cleaned;
    }).filter(promo => promo.id !== undefined && promo.id !== null); // Remove any invalid entries
    
    console.log('📤 updatePromotion: cleaned promotions array:', JSON.stringify(cleanedPromotions, null, 2));
    
    // Validate the array can be stringified
    try {
      const testString = JSON.stringify(cleanedPromotions);
      JSON.parse(testString); // Validate
    } catch (validationError) {
      console.error('❌ Validation error in updatePromotion:', validationError);
      throw new Error(`Invalid promotions data: ${validationError instanceof Error ? validationError.message : 'Unknown error'}`);
    }
    
    // Save to database using sectionContent - ONLY ONCE
    await updateSectionContent('promotions', {
      sectionType: 'promotions',
      title: 'PROMOTIONS',
      content: cleanedPromotions
    });
    
    return cleanedPromotions;
  } catch (error) {
    console.error('❌ Error updating promotion:', error);
    throw error;
  }
};

// ==========================================
// EAU ET ADDITIF CARDS API (section key: eau_additif)
// ==========================================

export interface EauAdditifCard {
  id: number;
  title: string;
  description: string;
  slug: string;
  image?: string;
  link?: string;
  createdAt?: string;
  /** Same as id when present; used for Cat3 page lookup (legacy). */
  cat3Id?: string;
  /** Unique id of the dedicated Cat3 page for this card. Navigate to /cat3/{cat3PageId}. */
  cat3PageId?: number;
}

/**
 * Get EAU ET ADDITIF cards from sectionContent (same storage as promotions).
 * Returns [] if no content or on error. Normalizes missing slug for backward compat (slug = card-{id}).
 */
export const getEauAdditifCards = async (): Promise<EauAdditifCard[]> => {
  try {
    const section = await getSectionContent('eau_additif');
    if (section && section.content !== undefined && section.content !== null) {
      const content = typeof section.content === 'string'
        ? JSON.parse(section.content)
        : section.content;
      if (Array.isArray(content)) {
        const filtered = content.filter(
          (c): c is EauAdditifCard & { slug?: string } =>
            c && typeof c === 'object' && typeof c.id === 'number' && typeof c.title === 'string' && typeof c.description === 'string'
        );
        return filtered.map((c) => ({
          ...c,
          slug: typeof c.slug === 'string' && c.slug.trim() ? c.slug.trim() : `card-${c.id}`,
        })) as EauAdditifCard[];
      }
    }
    return [];
  } catch (error) {
    console.error('❌ Error fetching eau_additif cards:', error);
    return [];
  }
};

/**
 * Save EAU ET ADDITIF cards to sectionContent.
 */
export const saveEauAdditifCards = async (cards: EauAdditifCard[]): Promise<void> => {
  await updateSectionContent('eau_additif', {
    sectionType: 'eau_additif',
    title: 'EAU ET ADDITIF',
    content: cards,
  });
};

/**
 * Update a single EauEtAdditif card by id. Persists to backend.
 * Returns the updated card, or null if card is not found.
 */
export const updateEauAdditifCard = async (
  cardId: number | string,
  patch: Partial<EauAdditifCard>
): Promise<EauAdditifCard | null> => {
  const cards = await getEauAdditifCards();
  const cardIdStr = String(cardId);
  const idNum = typeof cardId === 'number' ? cardId : parseInt(cardIdStr, 10);
  const index = cards.findIndex((c) => c.id === idNum || String(c.id) === cardIdStr);
  if (index === -1) return null;

  const updated: EauAdditifCard = {
    ...cards[index],
    ...patch,
  };
  const nextCards = [...cards];
  nextCards[index] = updated;
  await saveEauAdditifCards(nextCards);
  return updated;
};

/**
 * Delete a single EauEtAdditif card by id. Persists to backend.
 */
export const deleteEauAdditifCard = async (cardId: number | string): Promise<void> => {
  const cards = await getEauAdditifCards();
  const cardIdStr = String(cardId);
  const idNum = typeof cardId === 'number' ? cardId : parseInt(cardIdStr, 10);
  const remaining = cards.filter(
    (c) => c.id !== idNum && String(c.id) !== cardIdStr
  );
  await saveEauAdditifCards(remaining);
};

/**
 * Remove the Cat3 page for the given EauEtAdditif card.
 * When cat3PageId is provided (new cards), removes by page.id; otherwise by page.cardId (legacy).
 */
export const deleteCat3PageByCardId = async (
  cardId: number | string,
  cat3PageId?: number
): Promise<void> => {
  const cardIdStr = String(cardId);
  const pages = await getCat3Pages();
  const remaining =
    cat3PageId != null && Number.isFinite(cat3PageId)
      ? pages.filter((p) => p.id !== cat3PageId)
      : pages.filter((p) => p.cardId !== cardIdStr);
  if (remaining.length === pages.length) return;
  await saveCat3Pages(remaining);
};

// ==========================================
// CAT3 PAGES API (section key: cat3_pages)
// ==========================================

export interface Cat3ItemAvisClients {
  average?: number;
  count?: number;
  reviews?: Array<{ author?: string; comment?: string; rating?: number }>;
}

export interface Cat3Item {
  id: number;
  title: string;
  reference?: string;
  stock?: number | null;
  alertThreshold?: number | null;
  image?: string;
  // Tarif (same keys as cat/category_products)
  prix_achat_brut?: number | null;
  remise_achat_percent?: number | null;
  net_achat_htva?: number | null;
  tva_percent?: number | null;
  net_achat_ttc?: number | null;
  marge_percent?: number | null;
  prix_neveux?: number | null;
  // Acha2-persisted fields (Cat3-origin only)
  custom_content2?: string | null;
  references_constructeur2?: string | null;
  avis_clients?: Cat3ItemAvisClients | null;
  price2?: string | number | null;
}

export interface Cat3PageData {
  id: number;
  slug: string;
  title: string;
  subtitle?: string;
  heroImage?: string;
  items: Cat3Item[];
  /** EauEtAdditif card id when this page is tied to an eau_additif card */
  cardId?: string;
}

/**
 * Normalize a raw page (from storage) to Cat3PageData.
 * If page has no "items" but has legacy card fields, wrap into items.
 */
function normalizeCat3Page(raw: Record<string, unknown>): Cat3PageData {
  const cardId = raw.cardId != null ? String(raw.cardId) : undefined;
  const id =
    typeof raw.id === 'number' && Number.isFinite(raw.id)
      ? raw.id
      : cardId && /^\d+$/.test(String(cardId))
        ? parseInt(cardId, 10)
        : 0;
  const slug =
    typeof raw.slug === 'string' && raw.slug.trim()
      ? raw.slug.trim()
      : cardId
        ? `card-${cardId}`
        : `page-${id}`;
  const title = typeof raw.title === 'string' ? raw.title : '';
  const subtitle = typeof raw.subtitle === 'string' ? raw.subtitle : undefined;
  const heroImage = typeof raw.heroImage === 'string' ? raw.heroImage : undefined;
  let items: Cat3Item[] = [];
  const parseNumOrNull = (v: unknown): number | null => {
    if (v === null || v === undefined || v === '') return null;
    const n = typeof v === 'number' ? v : Number(v);
    return Number.isFinite(n) && n >= 0 ? Math.floor(n) : null;
  };
  const parseDecimalOrNull = (v: unknown): number | null => {
    if (v === null || v === undefined || v === '') return null;
    const n = typeof v === 'number' ? v : Number(v);
    return Number.isFinite(n) ? n : null;
  };
  if (Array.isArray(raw.items)) {
    items =
      raw.items.length > 0
        ? raw.items
            .filter((it): it is Record<string, unknown> => {
              if (!it || typeof it !== 'object') return false;
              const o = it as Record<string, unknown>;
              return typeof o.id === 'number' && typeof o.title === 'string';
            })
            .map((it) => {
        const t = it as Record<string, unknown>;
        const title = String(t.title || '');
        const parseAvisClients = (v: unknown): Cat3ItemAvisClients | undefined => {
          if (v == null || typeof v !== 'object') return undefined;
          const o = v as Record<string, unknown>;
          return {
            average: typeof o.average === 'number' ? o.average : 0,
            count: typeof o.count === 'number' ? o.count : 0,
            reviews: Array.isArray(o.reviews) ? o.reviews as Cat3ItemAvisClients['reviews'] : [],
          };
        };
        return {
          id: Number(t.id),
          title,
          reference: typeof t.reference === 'string' && t.reference.trim() ? t.reference.trim() : undefined,
          stock: parseNumOrNull(t.stock),
          alertThreshold: parseNumOrNull(t.alertThreshold),
          image: typeof t.image === 'string' ? t.image : undefined,
          prix_achat_brut: parseDecimalOrNull(t.prix_achat_brut),
          remise_achat_percent: parseDecimalOrNull(t.remise_achat_percent),
          net_achat_htva: parseDecimalOrNull(t.net_achat_htva),
          tva_percent: parseDecimalOrNull(t.tva_percent),
          net_achat_ttc: parseDecimalOrNull(t.net_achat_ttc),
          marge_percent: parseDecimalOrNull(t.marge_percent),
          prix_neveux: parseDecimalOrNull(t.prix_neveux),
          custom_content2: typeof t.custom_content2 === 'string' ? t.custom_content2 : (t.custom_content2 != null ? String(t.custom_content2) : undefined),
          references_constructeur2: typeof t.references_constructeur2 === 'string' ? t.references_constructeur2 : (t.references_constructeur2 != null ? String(t.references_constructeur2) : undefined),
          avis_clients: parseAvisClients(t.avis_clients),
          price2: t.price2 != null && t.price2 !== '' ? (typeof t.price2 === 'number' ? t.price2 : String(t.price2)) : undefined,
        } as Cat3Item;
      })
        : [];
  } else if (typeof raw.title === 'string' && raw.title) {
    const title = String(raw.title);
    items = [
      {
        id: 1,
        title,
        reference: undefined,
        stock: null,
        alertThreshold: null,
        image: typeof raw.image === 'string' ? raw.image : (typeof raw.heroImage === 'string' ? raw.heroImage : undefined),
      },
    ];
  }
  const finalCardId =
    cardId ?? (slug && slug.startsWith('card-') ? slug.replace(/^card-/, '') : undefined);
  return { id, slug, title, subtitle, heroImage, items, cardId: finalCardId };
}

/**
 * Get all Cat3 pages from sectionContent.
 * Normalizes each page (migrates legacy single-card to items array).
 */
export const getCat3Pages = async (): Promise<Cat3PageData[]> => {
  try {
    const section = await getSectionContent('cat3_pages');
    if (section && section.content !== undefined && section.content !== null) {
      const content = typeof section.content === 'string'
        ? JSON.parse(section.content)
        : section.content;
      if (Array.isArray(content)) {
        return content
          .filter((p): p is Record<string, unknown> => p && typeof p === 'object')
          .map(normalizeCat3Page);
      }
    }
    return [];
  } catch (error) {
    console.error('❌ Error fetching cat3_pages:', error);
    return [];
  }
};

/**
 * Get a single Cat3 page by id (number) or slug (string).
 * Uses same storage as getCat3Pages.
 */
export const getCat3PageById = async (cat3Id: string | number): Promise<Cat3PageData | undefined> => {
  const pages = await getCat3Pages();
  const idNum = typeof cat3Id === 'string' ? parseInt(cat3Id, 10) : cat3Id;
  const cardIdStr = String(cat3Id);
  return pages.find(
    (p) =>
      p.cardId === cardIdStr ||
      p.id === idNum ||
      (typeof cat3Id === 'string' && p.slug === cat3Id)
  );
};

/**
 * Get current stock for a Cat3 item (for validation / display).
 * Returns 0 if item not found or stock missing/invalid.
 */
export const getCat3ItemStock = async (
  cat3PageId: string | number,
  cat3ItemId: number
): Promise<number> => {
  const page = await getCat3PageById(cat3PageId);
  if (!page || !page.items) return 0;
  const item = page.items.find((i) => i.id === cat3ItemId);
  if (!item) return 0;
  const raw = item.stock;
  if (raw == null || raw === '') return 0;
  const n = typeof raw === 'number' ? raw : parseInt(String(raw), 10);
  return Number.isFinite(n) && n >= 0 ? n : 0;
};

/**
 * Save Cat3 pages to sectionContent.
 */
export const saveCat3Pages = async (pages: Cat3PageData[]): Promise<void> => {
  await updateSectionContent('cat3_pages', {
    sectionType: 'cat3_pages',
    title: 'CAT3_PAGES',
    content: pages,
  });
};

/**
 * Create a NEW empty Cat3 page for a new EauEtAdditif card. Returns the page id (unique).
 * Use this when creating a new card so each card has its own dedicated page.
 */
export const createNewCat3PageForCard = async (
  cardId: number | string,
  title: string
): Promise<number> => {
  const cardIdStr = String(cardId);
  const pages = await getCat3Pages();
  const uniquePageId = Date.now();
  const newPage: Cat3PageData = {
    id: uniquePageId,
    slug: `card-${cardIdStr}`,
    title: title.trim() || 'Sans titre',
    items: [],
    cardId: cardIdStr,
  };
  await saveCat3Pages([...pages, newPage]);
  return uniquePageId;
};

/**
 * Ensure a Cat3 page exists for the given EauEtAdditif card (legacy). If none exists, creates one with empty items.
 * Used when opening an old card that has no cat3PageId and no page exists yet.
 */
export const ensureCat3PageForCard = async (
  cardId: number | string,
  title: string
): Promise<void> => {
  const cardIdStr = String(cardId);
  const pages = await getCat3Pages();
  const exists = pages.some(
    (p) => p.cardId === cardIdStr || p.id === (typeof cardId === 'number' ? cardId : parseInt(cardIdStr, 10)) || p.slug === `card-${cardIdStr}`
  );
  if (exists) return;
  const numId = typeof cardId === 'number' ? cardId : parseInt(cardIdStr, 10);
  const newPage: Cat3PageData = {
    id: Number.isFinite(numId) ? numId : Date.now(),
    slug: `card-${cardIdStr}`,
    title: title.trim() || 'Sans titre',
    items: [],
    cardId: cardIdStr,
  };
  await saveCat3Pages([...pages, newPage]);
};

/**
 * Find page index by cat3PageId (cardId string, id, or slug).
 */
function findCat3PageIndex(
  pages: Cat3PageData[],
  cat3PageId: string | number
): number {
  const cardIdStr = String(cat3PageId);
  const pageIdNum = typeof cat3PageId === 'string' ? parseInt(cat3PageId, 10) : cat3PageId;
  return pages.findIndex(
    (p) =>
      p.cardId === cardIdStr ||
      p.id === pageIdNum ||
      (typeof cat3PageId === 'string' && p.slug === cat3PageId)
  );
}

/** Ensure numeric fields are number or null (no NaN) for JSON persistence. */
function cleanCat3ItemForPersist(item: Cat3Item): Cat3Item {
  const toNum = (v: unknown): number | null => {
    if (v == null) return null;
    const n = typeof v === 'number' ? v : Number(v);
    return Number.isFinite(n) ? n : null;
  };
  return {
    id: typeof item.id === 'number' && Number.isFinite(item.id) ? item.id : 0,
    title: typeof item.title === 'string' ? item.title : '',
    reference: (item.reference != null && String(item.reference).trim() !== '') ? String(item.reference).trim() : undefined,
    stock: toNum(item.stock),
    alertThreshold: toNum(item.alertThreshold),
    image: item.image != null ? String(item.image) : undefined,
    prix_achat_brut: toNum(item.prix_achat_brut),
    remise_achat_percent: toNum(item.remise_achat_percent),
    net_achat_htva: toNum(item.net_achat_htva),
    tva_percent: toNum(item.tva_percent),
    net_achat_ttc: toNum(item.net_achat_ttc),
    marge_percent: toNum(item.marge_percent),
    prix_neveux: toNum(item.prix_neveux),
    custom_content2: item.custom_content2 != null ? String(item.custom_content2) : undefined,
    references_constructeur2: item.references_constructeur2 != null ? String(item.references_constructeur2) : undefined,
    avis_clients: item.avis_clients ?? undefined,
    price2: item.price2,
  };
}

/**
 * Upsert a Cat3 page: fetch all pages, find or create the page for cat3Id, apply patch, persist.
 * Same pattern as promotions. Use for add/edit/delete items so data is saved in DB for all users.
 */
export const upsertCat3Page = async (
  cat3Id: string | number,
  patch: Partial<Pick<Cat3PageData, 'title' | 'items'>>
): Promise<Cat3PageData> => {
  const pages = await getCat3Pages();
  const cardIdStr = String(cat3Id);
  const pageIdNum = typeof cat3Id === 'string' ? parseInt(cat3Id, 10) : cat3Id;
  let pageIndex = findCat3PageIndex(pages, cat3Id);

  let updatedPages: Cat3PageData[];
  if (pageIndex === -1) {
    const newPage: Cat3PageData = {
      id: Number.isFinite(pageIdNum) ? pageIdNum : Date.now(),
      slug: `card-${cardIdStr}`,
      title: (patch.title && String(patch.title).trim()) || 'Sans titre',
      items: Array.isArray(patch.items)
        ? patch.items.map(cleanCat3ItemForPersist)
        : [],
      cardId: cardIdStr,
    };
    updatedPages = [...pages, newPage];
  } else {
    const page = pages[pageIndex];
    const merged: Cat3PageData = {
      ...page,
      cardId: cardIdStr,
      ...(patch.title !== undefined && { title: String(patch.title).trim() || page.title }),
      ...(patch.items !== undefined && {
        items: patch.items.map(cleanCat3ItemForPersist),
      }),
    };
    updatedPages = [...pages];
    updatedPages[pageIndex] = merged;
  }

  await saveCat3Pages(updatedPages);
  const idx = findCat3PageIndex(updatedPages, cat3Id);
  return updatedPages[idx];
};

/**
 * Add a new Cat3 item to a page. Persists to backend. Returns the created item and updated page for immediate UI update.
 */
export const addCat3Item = async (
  cat3PageId: string | number,
  item: Omit<Cat3Item, 'id'>
): Promise<{ newItem: Cat3Item; updatedPage: Cat3PageData }> => {
  const pages = await getCat3Pages();
  const pageIndex = findCat3PageIndex(pages, cat3PageId);
  const page = pageIndex >= 0 ? pages[pageIndex] : null;
  const currentItems = page?.items ?? [];
  const maxId = currentItems.length > 0 ? Math.max(...currentItems.map((i) => i.id), 0) : 0;
  const rawId = maxId + 1;
  const safeId = typeof rawId === 'number' && Number.isFinite(rawId) ? rawId : Date.now();
  const newItem: Cat3Item = cleanCat3ItemForPersist({ ...item, id: safeId });
  if (typeof newItem.id !== 'number' || !Number.isFinite(newItem.id)) {
    (newItem as Cat3Item).id = Date.now();
  }
  const updatedItems = [...currentItems, newItem];
  const updatedPage = await upsertCat3Page(cat3PageId, {
    title: page?.title ?? 'Sans titre',
    items: updatedItems,
  });
  console.log('[addCat3Item] saved', { cat3PageId, newItemId: newItem.id, itemsCount: updatedPage.items.length });
  return { newItem, updatedPage };
};

/**
 * Update a single Cat3 item by page id and item id. Merges patch into existing item and persists via upsertCat3Page.
 */
export const updateCat3Item = async (
  cat3PageId: string | number,
  cat3ItemId: number,
  patch: Partial<Cat3Item>
): Promise<void> => {
  const pages = await getCat3Pages();
  const pageIndex = findCat3PageIndex(pages, cat3PageId);
  if (pageIndex === -1) return;
  const page = pages[pageIndex];
  const itemIndex = page.items.findIndex((i) => i.id === cat3ItemId);
  if (itemIndex === -1) return;
  const updatedItems = [...page.items];
  const existing = updatedItems[itemIndex];
  updatedItems[itemIndex] = cleanCat3ItemForPersist({ ...existing, ...patch });
  await upsertCat3Page(cat3PageId, { title: page.title, items: updatedItems });
};

/**
 * Delete a Cat3 item by page id and item id. Persists to backend.
 */
export const deleteCat3Item = async (
  cat3PageId: string | number,
  cat3ItemId: number
): Promise<void> => {
  const pages = await getCat3Pages();
  const pageIndex = findCat3PageIndex(pages, cat3PageId);
  if (pageIndex === -1) return;
  const page = pages[pageIndex];
  const remaining = page.items.filter((i) => i.id !== cat3ItemId);
  if (remaining.length === page.items.length) return;
  await upsertCat3Page(cat3PageId, { title: page.title, items: remaining });
};

// ==========================================
// HUILE & EAU ADDITIF (dashboard list from Cat3 Acha2)
// sectionContent key: huile_eau_additif
// ==========================================

export interface HuileEauAdditifItem {
  id: string;
  cat3PageId: string | number;
  cat3ItemId: number;
  title: string;
  reference?: string | null;
  stock?: number | null;
  alertThreshold?: number | null;
  image?: string | null;
  prixAchatBrut?: number | null;
  remiseAchat?: number | null;
  netAchatHTVA?: number | null;
  tva?: number | null;
  netAchatTTC?: number | null;
  marge?: number | null;
  prixNeveux?: number | null;
  createdAt: string;
}

const HUILE_EAU_ADDITIF_SECTION = 'huile_eau_additif';

/**
 * Get the Huile & Eau Additif list from sectionContent.
 */
export const getHuileEauAdditif = async (): Promise<HuileEauAdditifItem[]> => {
  try {
    const section = await getSectionContent(HUILE_EAU_ADDITIF_SECTION);
    if (section && section.content !== undefined && section.content !== null) {
      const content = typeof section.content === 'string'
        ? JSON.parse(section.content)
        : section.content;
      if (Array.isArray(content)) {
        return content.filter(
          (c): c is HuileEauAdditifItem =>
            c && typeof c === 'object' && typeof c.id === 'string' && typeof c.title === 'string'
        );
      }
    }
    return [];
  } catch (error) {
    console.error('❌ Error fetching huile_eau_additif:', error);
    return [];
  }
};

/**
 * Add an item to the Huile & Eau Additif list.
 */
export const addHuileEauAdditifItem = async (item: Omit<HuileEauAdditifItem, 'id' | 'createdAt'>): Promise<HuileEauAdditifItem> => {
  const list = await getHuileEauAdditif();
  const id = `hea-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  const createdAt = new Date().toISOString();
  const newItem: HuileEauAdditifItem = { ...item, id, createdAt };
  await updateSectionContent(HUILE_EAU_ADDITIF_SECTION, {
    sectionType: HUILE_EAU_ADDITIF_SECTION,
    title: 'Huile & Eau Additif',
    content: [...list, newItem],
  });
  return newItem;
};

/**
 * Remove an item by id.
 */
export const removeHuileEauAdditifItem = async (id: string): Promise<void> => {
  const list = await getHuileEauAdditif();
  const next = list.filter((i) => i.id !== id);
  await updateSectionContent(HUILE_EAU_ADDITIF_SECTION, {
    sectionType: HUILE_EAU_ADDITIF_SECTION,
    title: 'Huile & Eau Additif',
    content: next,
  });
};

/**
 * Update an existing item (optional).
 */
export const updateHuileEauAdditifItem = async (item: HuileEauAdditifItem): Promise<void> => {
  const list = await getHuileEauAdditif();
  const idx = list.findIndex((i) => i.id === item.id);
  if (idx === -1) return;
  const next = [...list];
  next[idx] = { ...item };
  await updateSectionContent(HUILE_EAU_ADDITIF_SECTION, {
    sectionType: HUILE_EAU_ADDITIF_SECTION,
    title: 'Huile & Eau Additif',
    content: next,
  });
};

// ==========================================
// ORDERS API
// ==========================================

export interface OrderData {
  id?: number;
  product_id?: number | null;
  product_name: string;
  brand_name?: string | null;
  model_name?: string | null;
  origin?: string | null;
  promo_id?: number | null;
  promo_slug?: string | null;
  status?: string | null;
  product_image?: string | null;
  product_price: number | string;
  product_references?: string[];
  product_snapshot?: {
    id?: number | null;
    sub_id?: string | null;
    name: string;
    price: number | string;
    image?: string | null;
    images?: string[];
    references?: string[];
    product_references?: string[];
    brand_name?: string | null;
    model_name?: string | null;
    description?: string | null;
    promotion_percentage?: number | null;
    promotion_price?: string | null;
    quantity?: number | null;
    [key: string]: any;
  };
  quantity: number;
  customer_nom: string;
  customer_prenom: string;
  customer_phone: string;
  customer_wilaya: string;
  customer_delegation: string;
  created_at?: string;
}

/**
 * Create a new order
 */
export const createOrder = async (orderData: Omit<OrderData, 'id' | 'created_at'>): Promise<OrderData> => {
  try {
    const response = await fetch(`${getApiBaseUrl()}/orders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(orderData),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      
      // Extract readable error message
      let errorMessage = `Failed to create order: ${response.statusText}`;
      if (errorData.message) {
        errorMessage = errorData.message;
      } else if (errorData.error) {
        if (typeof errorData.error === 'string') {
          errorMessage = errorData.error;
        } else if (errorData.error.message) {
          errorMessage = errorData.error.message;
        }
      }
      
      throw new Error(errorMessage);
    }

    const result = await response.json();

    if (!result.success || !result.data) {
      throw new Error(result.message || result.error || 'Invalid API response');
    }

    console.log('✅ Order created successfully');
    return result.data;
  } catch (error) {
    console.error('❌ Error creating order:', error);
    throw error;
  }
};

/**
 * Accept promo-origin order (admin only)
 */
export const acceptOrder = async (orderId: number): Promise<OrderData> => {
  const userData = typeof window !== "undefined" ? localStorage.getItem("user") : null;
  const headers: HeadersInit = { "Content-Type": "application/json" };
  if (userData) headers["x-user"] = userData;
  const res = await fetch(`${getApiBaseUrl()}/orders/${orderId}/accept`, {
    method: "PATCH",
    headers,
  });
  const result = await res.json().catch(() => null);
  if (!res.ok) {
    const msg = typeof result?.message === "string" ? result.message : "Failed to accept order";
    if (res.status === 409) throw new Error(msg || "Stock insuffisant");
    throw new Error(msg);
  }
  if (!result?.data) throw new Error("Invalid response");
  return result.data;
};

/**
 * Reject order (admin only)
 */
export const rejectOrder = async (orderId: number): Promise<OrderData> => {
  const userData = typeof window !== "undefined" ? localStorage.getItem("user") : null;
  const headers: HeadersInit = { "Content-Type": "application/json" };
  if (userData) headers["x-user"] = userData;
  const res = await fetch(`${getApiBaseUrl()}/orders/${orderId}/reject`, {
    method: "PATCH",
    headers,
  });
  const result = await res.json().catch(() => null);
  if (!res.ok) {
    const msg = typeof result?.message === "string" ? result.message : "Failed to reject order";
    throw new Error(msg);
  }
  if (!result?.data) throw new Error("Invalid response");
  return result.data;
};

/**
 * Get pending order counts per product for a category (for CAT page highlighting).
 * Public endpoint - no auth required.
 */
export const getPendingOrdersByProduct = async (
  categorySlug: string
): Promise<{ byProductSlug: Record<string, number> }> => {
  const url = `${getApiBaseUrl()}/orders/pending-by-product?categorySlug=${encodeURIComponent(categorySlug)}`;
  const response = await fetch(url, { cache: 'no-store' });
  if (!response.ok) {
    return { byProductSlug: {} };
  }
  const result = await response.json().catch(() => ({}));
  const data = result?.data || result;
  return {
    byProductSlug: typeof data?.byProductSlug === 'object' ? data.byProductSlug : {},
  };
};

/**
 * Get all orders (admin only)
 * @param options - { status?: 'pending' | 'accepted' | 'rejected' } optional filter
 */
export const getOrders = async (options?: { status?: string }): Promise<OrderData[]> => {
  try {
    const userData = localStorage.getItem('user');
    const headers: HeadersInit = { 'Content-Type': 'application/json' };
    if (userData) headers['x-user'] = userData;

    const url = options?.status
      ? `${getApiBaseUrl()}/orders?status=${encodeURIComponent(options.status)}`
      : `${getApiBaseUrl()}/orders`;
    const response = await fetch(url, {
      headers,
      cache: 'no-store',
    });

    if (!response.ok) {
      if (response.status === 401 || response.status === 403) {
        throw new Error('Admin access required');
      }
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `Failed to fetch orders: ${response.statusText}`);
    }

    const result = await response.json();

    if (!result.success || !result.data) {
      throw new Error(result.error || 'Invalid API response');
    }

    return result.data || [];
  } catch (error) {
    console.error('❌ Error fetching orders:', error);
    throw error;
  }
};

/**
 * Delete an order (admin only)
 */
export const deleteOrder = async (orderId: number): Promise<boolean> => {
  try {
    const userData = localStorage.getItem('user');
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };

    if (userData) {
      headers['x-user'] = userData;
    }

    const response = await fetch(`${getApiBaseUrl()}/orders/${orderId}`, {
      method: 'DELETE',
      headers,
    });

    if (!response.ok) {
      if (response.status === 401 || response.status === 403) {
        throw new Error('Admin access required');
      }
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `Failed to delete order: ${response.statusText}`);
    }

    const result = await response.json();

    if (!result.success) {
      throw new Error(result.error || 'Failed to delete order');
    }

    console.log('✅ Order deleted successfully');
    return true;
  } catch (error) {
    console.error('❌ Error deleting order:', error);
    throw error;
  }
};

// ==========================================
// CATEGORY PRODUCTS API - For Cat Page
// ==========================================

export interface CategoryProductData {
  id?: number;
  category_slug: string;
  name: string;
  slug?: string;
  image?: string;
  reference?: string; // kept for backward compatibility
  references?: string[]; // NEW: multiple references
  rating?: number;
  reviewsCount?: number;
  priceTtc?: number;
  price?: number | null; // السعر من acha2_products.price2 (نفس الحقل المستخدم في صفحة Acha2)
  prixNeveux?: number | null; // Tarif: Prix neveux (UI form field)
  vehicle_model_ids?: number[] | null; // Array of vehicle model IDs this product is compatible with. NULL or empty means global (visible for all models)
  stockDisponible?: number; // Current inventory (default 0)
  seuilAlerte?: number; // Warning threshold - low stock when stockDisponible <= seuilAlerte
  created_at?: string;
  updated_at?: string;
}

/**
 * Get aggregated status per category for Familles des pièces highlighting.
 * Returns { byCategorySlug: { "kit-de-distribution": "red"|"yellow"|"none", ... } }
 * red = any product out of stock, yellow = any pending order, none = else
 */
export const getCategoryStatusMap = async (): Promise<{ byCategorySlug: Record<string, 'red' | 'yellow' | 'none'> }> => {
  try {
    const url = `${getApiBaseUrl()}/category-products/status-by-category`;
    const response = await fetch(url, { cache: 'no-store' });
    if (!response.ok) return { byCategorySlug: {} };
    const result = await response.json().catch(() => ({}));
    const data = result?.data || result;
    return {
      byCategorySlug: typeof data?.byCategorySlug === 'object' ? data.byCategorySlug : {},
    };
  } catch {
    return { byCategorySlug: {} };
  }
};

/**
 * Get all products for a specific category
 */
export const getCategoryProducts = async (categorySlug: string, modelId?: number): Promise<CategoryProductData[]> => {
  try {
    if (!categorySlug || categorySlug.trim() === '') {
      console.error('❌ Invalid category slug provided');
      return [];
    }

    const encodedSlug = encodeURIComponent(categorySlug.trim());
    // Build URL with optional modelId query parameter
    let url = `${getApiBaseUrl()}/category-products/${encodedSlug}`;
    if (modelId !== undefined && modelId !== null && !isNaN(modelId) && modelId > 0) {
      url += `?modelId=${encodeURIComponent(String(modelId))}`;
    }
    
    console.log(`📥 Fetching category products for: ${categorySlug}${modelId ? ` (modelId: ${modelId})` : ''}`);
    
    const response = await fetch(url, {
      cache: 'no-store',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      let errorData;
      try {
        errorData = JSON.parse(errorText);
      } catch {
        errorData = { error: errorText || response.statusText };
      }
      
      console.error(`❌ API Error (${response.status}):`, errorData);
      throw new Error(errorData.error || `Failed to fetch category products: ${response.statusText}`);
    }
    
    const result = await response.json();
    
    if (!result || typeof result !== 'object') {
      throw new Error('Invalid API response: not an object');
    }
    
    if (!result.success) {
      throw new Error(result.error || 'API request failed');
    }
    
    // Handle both array and object with data property
    const products = Array.isArray(result.data) ? result.data : (result.data ? [result.data] : []);
    
    console.log(`✅ Fetched ${products.length} products for category: ${categorySlug}`);
    return products;
  } catch (error) {
    console.error('❌ Error fetching category products:', error);
    // Return empty array instead of throwing to prevent UI crashes
    return [];
  }
};

/** Equivalent product summary (from GET /api/products/equivalents) */
export interface EquivalentProductData {
  id: number;
  name: string;
  slug: string;
  image?: string | null;
  reference?: string | null;
  price?: number | null;
  prixNeveux?: number | null;
  stock?: number | null;
  stockDisponible?: number | null;
  seuilAlerte?: number | null;
  rating?: number | null;
  /** Average rating (0-5) for display; same as rating when not provided separately */
  avgRating?: number | null;
  /** Number of reviews for "(X avis)" display */
  reviewsCount?: number | null;
  cat3Id?: string;
  itemId?: number;
}

/**
 * Fetch products with the same reference (equivalents). Excludes current product by id.
 * Uses canonical param "reference". Do not call when reference is missing/empty.
 */
export const getEquivalentProducts = async (
  reference: string,
  excludeId: number | null
): Promise<EquivalentProductData[]> => {
  const refTrimmed = (reference ?? "").trim();
  if (!refTrimmed) return [];
  const params = new URLSearchParams();
  params.set("reference", refTrimmed);
  if (excludeId != null && Number.isFinite(excludeId)) params.set("excludeId", String(excludeId));
  const url = `${getApiBaseUrl()}/products/equivalents?${params.toString()}`;
  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) {
    if (response.status === 400) return [];
    throw new Error(`Failed to fetch equivalents: ${response.statusText}`);
  }
  const result = await response.json().catch(() => null);
  const items: unknown[] = Array.isArray(result?.data) ? result.data : Array.isArray(result) ? result : [];
  return items.map((p: any) => ({
    id: Number(p.id),
    name: String(p.name ?? ""),
    slug: String(p.slug ?? ""),
    image: p.image ?? null,
    reference: p.reference ?? null,
    price: p.price != null ? Number(p.price) : null,
    prixNeveux: p.prixNeveux != null ? Number(p.prixNeveux) : null,
    stock: p.stock != null ? Number(p.stock) : null,
    stockDisponible: p.stockDisponible ?? p.stock ?? null,
    seuilAlerte: p.seuilAlerte != null ? Number(p.seuilAlerte) : null,
    rating: p.rating != null ? Number(p.rating) : p.avgRating != null ? Number(p.avgRating) : null,
    avgRating: p.avgRating != null ? Number(p.avgRating) : p.rating != null ? Number(p.rating) : null,
    reviewsCount: p.reviewsCount != null && Number.isFinite(Number(p.reviewsCount)) ? Number(p.reviewsCount) : null,
    cat3Id: p.cat3Id != null ? String(p.cat3Id) : undefined,
    itemId: p.itemId != null ? Number(p.itemId) : undefined,
  }));
};

/**
 * Create a new category product (admin only)
 */
export const createCategoryProduct = async (product: {
  category_slug: string;
  name: string;
  image?: string;
  reference?: string; // Changed from references[] to reference (string)
  rating?: number;
  vehicle_model_ids?: number[]; // Array of vehicle model IDs. If empty/undefined, product is global (visible for all models)
  prix_neveux?: number | null; // Tarif final price (Prix neveux)
  stockDisponible?: number;
  seuilAlerte?: number;
  prix_achat_brut?: number | null;
  remise_achat_percent?: number | null;
  net_achat_htva?: number | null;
  tva_percent?: number | null;
  net_achat_ttc?: number | null;
  marge_percent?: number | null;
}): Promise<CategoryProductData> => {
  try {
    // Validate input
    if (!product.category_slug || product.category_slug.trim() === '') {
      throw new Error('category_slug is required');
    }
    
    if (!product.name || product.name.trim() === '') {
      throw new Error('name is required');
    }

    const userData = localStorage.getItem('user');
    if (!userData) {
      throw new Error('Authentication required. Please log in.');
    }

    // Create clean payload
    // Payload keys must match what the backend expects
    const payload = {
      category_slug: product.category_slug.trim(),
      name: product.name.trim(),
      ...(product.image && product.image.trim() !== '' && { image: product.image.trim() }),
      ...(product.reference && product.reference.trim() !== '' && { reference: product.reference.trim() }),
      ...(product.rating !== undefined && product.rating !== null && { rating: product.rating }),
      ...(product.vehicle_model_ids && Array.isArray(product.vehicle_model_ids) && product.vehicle_model_ids.length > 0 && { vehicle_model_ids: product.vehicle_model_ids }),
      ...(product.prix_neveux !== undefined && product.prix_neveux !== null && Number.isFinite(product.prix_neveux) && product.prix_neveux >= 0 && { prix_neveux: product.prix_neveux }),
      stockDisponible: product.stockDisponible !== undefined && product.stockDisponible !== null && Number.isInteger(product.stockDisponible) && product.stockDisponible >= 0
        ? product.stockDisponible
        : 0,
      seuilAlerte: product.seuilAlerte !== undefined && product.seuilAlerte !== null && Number.isInteger(product.seuilAlerte) && product.seuilAlerte >= 0
        ? product.seuilAlerte
        : 0,
      ...(product.prix_achat_brut != null && Number.isFinite(product.prix_achat_brut) && { prix_achat_brut: product.prix_achat_brut }),
      ...(product.remise_achat_percent != null && Number.isFinite(product.remise_achat_percent) && { remise_achat_percent: product.remise_achat_percent }),
      ...(product.net_achat_htva != null && Number.isFinite(product.net_achat_htva) && { net_achat_htva: product.net_achat_htva }),
      ...(product.tva_percent != null && Number.isFinite(product.tva_percent) && { tva_percent: product.tva_percent }),
      ...(product.net_achat_ttc != null && Number.isFinite(product.net_achat_ttc) && { net_achat_ttc: product.net_achat_ttc }),
      ...(product.marge_percent != null && Number.isFinite(product.marge_percent) && { marge_percent: product.marge_percent }),
    };

    console.log('📤 Creating category product:', payload);

    const response = await fetch(`${getApiBaseUrl()}/category-products`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-user': userData,
      },
      body: JSON.stringify(payload),
    });
    
    // Handle response
    const responseText = await response.text();
    let result;
    try {
      result = JSON.parse(responseText);
    } catch (parseError) {
      console.error('❌ Failed to parse response:', responseText);
      throw new Error(`Server error: ${response.statusText}`);
    }
    
    if (!response.ok) {
      if (response.status === 401 || response.status === 403) {
        throw new Error('Admin access required');
      }
      throw new Error(result.error || `Failed to create product: ${response.statusText}`);
    }
    
    if (!result || !result.success) {
      throw new Error(result.error || 'Invalid API response format');
    }
    
    if (!result.data) {
      throw new Error('Product created but no data returned');
    }
    
    console.log('✅ Created category product:', result.data.id);
    return result.data;
  } catch (error) {
    console.error('❌ Error creating category product:', error);
    // Re-throw with user-friendly message
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('Failed to create product. Please try again.');
  }
};

/**
 * Update a category product (admin only)
 */
export const updateCategoryProduct = async (
  id: number,
  updates: { name?: string; image?: string; references?: string[]; rating?: number; prix_neveux?: number | null; stockDisponible?: number; seuilAlerte?: number; vehicle_model_ids?: number[] }
): Promise<CategoryProductData> => {
  try {
    const userData = localStorage.getItem('user');
    if (!userData) {
      throw new Error('Authentication required');
    }

    const response = await fetch(`${getApiBaseUrl()}/category-products/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'x-user': userData,
      },
      body: JSON.stringify(updates),
    });
    
    if (!response.ok) {
      if (response.status === 401 || response.status === 403) {
        throw new Error('Admin access required');
      }
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `Failed to update product: ${response.statusText}`);
    }
    
    const result = await response.json();
    
    if (!result.success || !result.data) {
      throw new Error('Invalid API response format');
    }
    
    console.log('✅ Updated category product:', id);
    return result.data;
  } catch (error) {
    console.error('❌ Error updating category product:', error);
    throw error;
  }
};

/**
 * Update stock disponible for a category product (admin only)
 * Uses PUT /api/category-products/:id with { stockDisponible }
 */
export const updateCategoryProductStock = async (
  id: number,
  stockDisponible: number
): Promise<CategoryProductData> => {
  if (!Number.isInteger(stockDisponible) || stockDisponible < 0) {
    throw new Error('Stock disponible must be an integer >= 0');
  }
  return updateCategoryProduct(id, { stockDisponible });
};

/**
 * Update stock by product slug (admin only).
 * PATCH /api/category-products/:slug/stock
 * Body: { stockDisponible?: number, seuilAlerte?: number }
 */
export const updateCategoryProductStockBySlug = async (
  slug: string,
  updates: { stockDisponible?: number; seuilAlerte?: number }
): Promise<{ stockDisponible: number; seuilAlerte: number; id: number }> => {
  if (!slug || typeof slug !== 'string' || slug.trim() === '') {
    throw new Error('Slug is required');
  }
  if (updates.stockDisponible !== undefined) {
    const v = updates.stockDisponible;
    if (!Number.isInteger(v) || v < 0) {
      throw new Error('stockDisponible must be an integer >= 0');
    }
  }
  if (updates.seuilAlerte !== undefined) {
    const v = updates.seuilAlerte;
    if (!Number.isInteger(v) || v < 0) {
      throw new Error('seuilAlerte must be an integer >= 0');
    }
  }
  const userData = typeof window !== 'undefined' ? localStorage.getItem('user') : null;
  const headers: HeadersInit = { 'Content-Type': 'application/json' };
  if (userData) headers['x-user'] = userData;
  const res = await fetch(
    `${getApiBaseUrl()}/category-products/${encodeURIComponent(slug)}/stock`,
    {
      method: 'PATCH',
      headers,
      body: JSON.stringify(updates),
    }
  );
  const result = await res.json().catch(() => null);
  if (!res.ok) {
    const msg = typeof result?.error === 'string' ? result.error : 'Failed to update stock';
    throw new Error(msg);
  }
  const data = result?.data;
  if (!data) throw new Error('Invalid API response');
  return {
    id: data.id,
    stockDisponible: Number(data.stockDisponible ?? 0),
    seuilAlerte: Number(data.seuilAlerte ?? 0),
  };
};

/**
 * Decrement stock_disponible by 1 (Vente hors ligne). Admin only.
 * Returns { stockDisponible } on success.
 * Throws on 404 (product not found) or 400 (stock insuffisant).
 */
export const decrementCategoryProductStockBySlug = async (
  slug: string
): Promise<{ stockDisponible: number }> => {
  const userData = typeof window !== 'undefined' ? localStorage.getItem('user') : null;
  const headers: HeadersInit = { 'Content-Type': 'application/json' };
  if (userData) headers['x-user'] = userData;
  const res = await fetch(
    `${getApiBaseUrl()}/category-products/${encodeURIComponent(slug)}/stock/decrement`,
    { method: 'PATCH', headers }
  );
  const result = await res.json().catch(() => null);
  if (!res.ok) {
    const msg =
      typeof result?.message === 'string'
        ? result.message
        : result?.error || 'Stock insuffisant.';
    throw new Error(msg);
  }
  const data = result?.data;
  const stock =
    data?.stockDisponible !== undefined
      ? Number(data.stockDisponible)
      : null;
  if (stock === null || !Number.isInteger(stock) || stock < 0) {
    throw new Error('Invalid response from server');
  }
  return { stockDisponible: stock };
};

/**
 * Delete a category product (admin only)
 */
export const deleteCategoryProduct = async (id: number): Promise<boolean> => {
  try {
    const userData = localStorage.getItem('user');
    if (!userData) {
      throw new Error('Authentication required');
    }

    const response = await fetch(`${getApiBaseUrl()}/category-products/${id}`, {
      method: 'DELETE',
      headers: {
        'x-user': userData,
      },
    });
    
    if (!response.ok) {
      if (response.status === 401 || response.status === 403) {
        throw new Error('Admin access required');
      }
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `Failed to delete product: ${response.statusText}`);
    }
    
    const result = await response.json();
    
    if (!result.success) {
      throw new Error(result.error || 'Failed to delete product');
    }
    
    console.log('✅ Deleted category product:', id);
    return true;
  } catch (error) {
    console.error('❌ Error deleting category product:', error);
    throw error;
  }
};

