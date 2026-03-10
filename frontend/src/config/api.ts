/**
 * Centralized API Configuration
 * Single source of truth for API base URL
 */

import { getApiBaseUrl, getBackendBaseUrl } from "@/utils/apiConfig";

export const API_BASE_URL = getBackendBaseUrl();

/**
 * Get full API endpoint URL
 */
export const getApiEndpoint = (path: string): string => {
  const cleanPath = path.startsWith("/") ? path.slice(1) : path;
  if (cleanPath.startsWith("api/")) {
    return `${API_BASE_URL}/${cleanPath}`;
  }
  return `${getApiBaseUrl()}/${cleanPath}`;
};

