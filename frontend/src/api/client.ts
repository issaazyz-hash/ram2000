// Client-side API functions (for browser environment)

export interface ProductData {
  id?: string;
  name: string;
  price: string;
  originalPrice?: string;
  discount?: string;
  image?: string;
  brand: string;
  sku: string;
  category: string;
  loyaltyPoints: number;
  hasPreview?: boolean;
  hasOptions?: boolean;
}

export interface SectionContentData {
  sectionType: string;
  title?: string;
  description?: string;
  content?: any;
}

export interface SearchOptionData {
  field: string;
  value: string;
}

// For now, we'll use localStorage as a fallback until we set up a proper backend API
// In a real application, these would make HTTP requests to your backend

// Products API
export const getProducts = async (): Promise<ProductData[]> => {
  try {
    // Try to fetch from localStorage first
    const savedProducts = localStorage.getItem('products');
    if (savedProducts) {
      return JSON.parse(savedProducts);
    }
    
    // Return default products if none saved
    return getDefaultProducts();
  } catch (error) {
    console.error('Error fetching products:', error);
    return getDefaultProducts();
  }
};

export const getProductById = async (id: string): Promise<ProductData | null> => {
  try {
    const products = await getProducts();
    return products.find(p => p.id === id) || null;
  } catch (error) {
    console.error('Error fetching product:', error);
    return null;
  }
};

export const createProduct = async (data: ProductData): Promise<ProductData> => {
  try {
    const products = await getProducts();
    const newProduct = {
      ...data,
      id: Date.now().toString() // Simple ID generation
    };
    
    const updatedProducts = [...products, newProduct];
    localStorage.setItem('products', JSON.stringify(updatedProducts));
    
    return newProduct;
  } catch (error) {
    console.error('Error creating product:', error);
    throw error;
  }
};

export const updateProduct = async (id: string, data: Partial<ProductData>): Promise<ProductData> => {
  try {
    const products = await getProducts();
    const productIndex = products.findIndex(p => p.id === id);
    
    if (productIndex === -1) {
      throw new Error('Product not found');
    }
    
    const updatedProduct = {
      ...products[productIndex],
      ...data
    };
    
    products[productIndex] = updatedProduct;
    localStorage.setItem('products', JSON.stringify(products));
    
    return updatedProduct;
  } catch (error) {
    console.error('Error updating product:', error);
    throw error;
  }
};

export const deleteProduct = async (id: string): Promise<boolean> => {
  try {
    const products = await getProducts();
    const filteredProducts = products.filter(p => p.id !== id);
    localStorage.setItem('products', JSON.stringify(filteredProducts));
    return true;
  } catch (error) {
    console.error('Error deleting product:', error);
    throw error;
  }
};

// Section Content API
export const getSectionContent = async (sectionType: string): Promise<SectionContentData | null> => {
  try {
    const savedContent = localStorage.getItem(`section_${sectionType}`);
    if (savedContent) {
      return JSON.parse(savedContent);
    }
    return null;
  } catch (error) {
    console.error('Error fetching section content:', error);
    return null;
  }
};

export const updateSectionContent = async (sectionType: string, data: SectionContentData): Promise<SectionContentData> => {
  try {
    localStorage.setItem(`section_${sectionType}`, JSON.stringify(data));
    return data;
  } catch (error) {
    console.error('Error updating section content:', error);
    throw error;
  }
};

// Search Options API
export const getSearchOptions = async (field?: string): Promise<SearchOptionData[]> => {
  try {
    const savedOptions = localStorage.getItem('searchOptions');
    if (savedOptions) {
      const options = JSON.parse(savedOptions);
      return field ? options.filter((opt: SearchOptionData) => opt.field === field) : options;
    }
    return [];
  } catch (error) {
    console.error('Error fetching search options:', error);
    return [];
  }
};

export const createSearchOption = async (data: SearchOptionData): Promise<SearchOptionData> => {
  try {
    const options = await getSearchOptions();
    const newOption = {
      ...data,
      id: Date.now().toString()
    };
    
    const updatedOptions = [...options, newOption];
    localStorage.setItem('searchOptions', JSON.stringify(updatedOptions));
    
    return newOption;
  } catch (error) {
    console.error('Error creating search option:', error);
    throw error;
  }
};

export const deleteSearchOption = async (id: string): Promise<boolean> => {
  try {
    const options = await getSearchOptions();
    const filteredOptions = options.filter((opt: any) => opt.id !== id);
    localStorage.setItem('searchOptions', JSON.stringify(filteredOptions));
    return true;
  } catch (error) {
    console.error('Error deleting search option:', error);
    throw error;
  }
};

export const deleteSearchOptionByValue = async (field: string, value: string): Promise<boolean> => {
  try {
    const options = await getSearchOptions();
    const filteredOptions = options.filter((opt: SearchOptionData) => !(opt.field === field && opt.value === value));
    localStorage.setItem('searchOptions', JSON.stringify(filteredOptions));
    return true;
  } catch (error) {
    console.error('Error deleting search option by value:', error);
    throw error;
  }
};

// Default products data
const getDefaultProducts = (): ProductData[] => [
  {
    id: "1",
    name: "LIQUI MOLY Top Tec 6320 5W-30 5L",
    price: "179.90 TND",
    originalPrice: "200.00 TND",
    discount: "-10%",
    brand: "LIQUI MOLY",
    sku: "LM23167",
    category: "Huiles moteur",
    loyaltyPoints: 4.50,
    hasPreview: false,
    hasOptions: false
  },
  {
    id: "2",
    name: "LIQUI MOLY Special Tec AA 0W-16 5L",
    price: "179.90 TND",
    originalPrice: "",
    discount: "",
    brand: "LIQUI MOLY",
    sku: "LM23168",
    category: "Huiles moteur",
    loyaltyPoints: 4.15,
    hasPreview: true,
    hasOptions: false
  },
  {
    id: "3",
    name: "LIQUI MOLY Top Tec 6200 0W-20",
    price: "59.90 TND - 259.90 TND",
    originalPrice: "",
    discount: "",
    brand: "LIQUI MOLY",
    sku: "LM23169",
    category: "Huiles moteur",
    loyaltyPoints: 3.25,
    hasPreview: true,
    hasOptions: true
  },
  {
    id: "4",
    name: "LIQUI MOLY Top Tec 4210 0W-30 5L",
    price: "229.90 TND",
    originalPrice: "",
    discount: "",
    brand: "LIQUI MOLY",
    sku: "LM23170",
    category: "Huiles moteur",
    loyaltyPoints: 5.75,
    hasPreview: false,
    hasOptions: false
  },
  {
    id: "5",
    name: "LIQUI MOLY Molygen New Generation 5W-20 5L",
    price: "189.90 TND",
    originalPrice: "200.00 TND",
    discount: "-5%",
    brand: "LIQUI MOLY",
    sku: "LM23171",
    category: "Huiles moteur",
    loyaltyPoints: 4.75,
    hasPreview: false,
    hasOptions: false
  },
  {
    id: "6",
    name: "LIQUI MOLY MoS2 Leichtlauf 15W-40 5L",
    price: "104.90 TND",
    originalPrice: "110.00 TND",
    discount: "-4%",
    brand: "LIQUI MOLY",
    sku: "LM23172",
    category: "Huiles moteur",
    loyaltyPoints: 2.65,
    hasPreview: false,
    hasOptions: false
  },
  {
    id: "7",
    name: "LIQUI MOLY Top Tec 4400 5W-30 5L",
    price: "189.90 TND",
    originalPrice: "215.00 TND",
    discount: "-12%",
    brand: "LIQUI MOLY",
    sku: "LM23173",
    category: "Huiles moteur",
    loyaltyPoints: 4.75,
    hasPreview: false,
    hasOptions: false
  },
  {
    id: "8",
    name: "LIQUI MOLY Special Tec AA 10W-30 Diesel 4L",
    price: "117.90 TND",
    originalPrice: "",
    discount: "",
    brand: "LIQUI MOLY",
    sku: "LM23174",
    category: "Huiles moteur",
    loyaltyPoints: 2.95,
    hasPreview: true,
    hasOptions: false
  },
  {
    id: "9",
    name: "Mannol bidon TS-4 15W40 EXTRA CL 20L",
    price: "309.90 TND",
    originalPrice: "",
    discount: "",
    brand: "Mannol",
    sku: "MN23175",
    category: "Huiles moteur",
    loyaltyPoints: 7.75,
    hasPreview: false,
    hasOptions: false
  },
  {
    id: "10",
    name: "LIQUI MOLY Touring high tech 20W50 4L",
    price: "89.90 TND",
    originalPrice: "",
    discount: "",
    brand: "LIQUI MOLY",
    sku: "LM23176",
    category: "Huiles moteur",
    loyaltyPoints: 2.25,
    hasPreview: false,
    hasOptions: false
  },
  {
    id: "11",
    name: "LIQUI MOLY SPECIAL TEC I 0W-30",
    price: "67.00 TND - 231.90 TND",
    originalPrice: "",
    discount: "-3%",
    brand: "LIQUI MOLY",
    sku: "LM23177",
    category: "Huiles moteur",
    loyaltyPoints: 1.68,
    hasPreview: false,
    hasOptions: true
  },
  {
    id: "12",
    name: "LIQUI MOLY Top Tec 4100 5W-40",
    price: "36.90 TND - 162.90 TND",
    originalPrice: "",
    discount: "-4%",
    brand: "LIQUI MOLY",
    sku: "LM23178",
    category: "Huiles moteur",
    loyaltyPoints: 0.92,
    hasPreview: false,
    hasOptions: true
  }
];
