// Search API - PostgreSQL Backend
import { getApiBaseUrl } from '@/utils/apiConfig';

export interface SearchOptionData {
  id?: string;
  field: string;
  value: string;
}

export const getSearchOptions = async (field?: string): Promise<SearchOptionData[]> => {
  try {
    const apiBaseUrl = getApiBaseUrl();
    const url = field ? `${apiBaseUrl}/searchOptions?field=${field}` : `${apiBaseUrl}/searchOptions`;
    const response = await fetch(url, { cache: 'no-store' });
    
    if (!response.ok) {
      throw new Error(`Failed to fetch search options: ${response.statusText}`);
    }
    
    const result = await response.json();
    
    // Handle API response format: { success: true, data: [...] }
    if (!result.success || !result.data) {
      throw new Error('Invalid API response format');
    }
    
    return result.data;
  } catch (error) {
    console.error('❌ Error fetching search options:', error);
    throw error; // Don't fallback to localStorage
  }
};

export const createSearchOption = async (data: SearchOptionData): Promise<SearchOptionData> => {
  try {
    const apiBaseUrl = getApiBaseUrl();
    const response = await fetch(`${apiBaseUrl}/searchOptions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    
    if (!response.ok) {
      throw new Error(`Failed to create search option: ${response.statusText}`);
    }
    
    const result = await response.json();
    
    // Handle API response format: { success: true, data: {...} }
    if (!result.success || !result.data) {
      throw new Error('Invalid API response format');
    }
    
    return result.data;
  } catch (error) {
    console.error('❌ Error creating search option:', error);
    throw error; // Don't fallback to localStorage
  }
};

export const deleteSearchOption = async (id: string): Promise<boolean> => {
  try {
    const apiBaseUrl = getApiBaseUrl();
    const response = await fetch(`${apiBaseUrl}/searchOptions/${id}`, {
      method: 'DELETE',
    });
    
    if (!response.ok) {
      throw new Error(`Failed to delete search option: ${response.statusText}`);
    }
    
    const result = await response.json();
    
    if (!result.success) {
      throw new Error(result.error || 'Failed to delete search option');
    }
    
    return true;
  } catch (error) {
    console.error('❌ Error deleting search option:', error);
    throw error; // Don't fallback to localStorage
  }
};

export const deleteSearchOptionByValue = async (field: string, value: string): Promise<boolean> => {
  try {
    const apiBaseUrl = getApiBaseUrl();
    const response = await fetch(`${apiBaseUrl}/searchOptions/field-value`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ field, value }),
    });
    
    if (!response.ok) {
      throw new Error(`Failed to delete search option: ${response.statusText}`);
    }
    
    const result = await response.json();
    
    if (!result.success) {
      throw new Error(result.error || 'Failed to delete search option');
    }
    
    return true;
  } catch (error) {
    console.error('❌ Error deleting search option by value:', error);
    throw error; // Don't fallback to localStorage
  }
};
