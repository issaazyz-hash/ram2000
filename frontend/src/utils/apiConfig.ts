/**
 * Centralized API Configuration
 * 
 * Single source of truth for API base URL.
 * Production: Uses VITE_API_BASE_URL if set, otherwise uses default production URL.
 * Development: Uses VITE_API_BASE_URL if set, otherwise falls back to localhost.
 */

// Module-level flag to prevent duplicate warnings
let hasWarned = false;

/**
 * Get API base URL from environment variable
 * 
 * @returns API base URL (e.g., "/api" in production or "http://localhost:3000/api" in development)
 */
export const getApiBaseUrl = (): string => {
  // Always check for environment variable first (works in both dev and prod)
  const envUrl = import.meta.env.VITE_API_BASE_URL;
  if (envUrl) {
    // Ensure it ends with /api
    return envUrl.endsWith('/api') ? envUrl : `${envUrl.replace(/\/$/, '')}/api`;
  }
  
  // Production: Use relative path or throw error (no hardcoded IP)
  if (import.meta.env.PROD) {
    // In production, if no env var is set, use relative path (works with reverse proxy)
    // Or you can throw an error to force env var configuration
    console.error('❌ VITE_API_BASE_URL is required in production. Falling back to relative path.');
    return '/api'; // Relative path works if frontend and backend are on same domain
  }
  
  // Development: Use relative path when proxy is configured (vite.config.ts)
  // This eliminates CORS issues in development
  // If proxy is not used, set VITE_API_BASE_URL=http://localhost:3000/api
  if (!hasWarned && import.meta.env.DEV) {
    // Only log in development (once)
    if (typeof console !== 'undefined' && console.warn) {
      console.warn('⚠️ VITE_API_BASE_URL not set. Using relative path /api (proxy recommended)');
      console.warn('   If not using proxy, set VITE_API_BASE_URL=http://localhost:3000/api in .env');
    }
    hasWarned = true;
  }
  // Use relative path - Vite proxy will forward /api to http://localhost:3000/api
  return '/api';
};

/**
 * Get backend base URL (without /api suffix) for static file serving
 * Used for resolving image URLs like /brands/file.png
 */
export const getBackendBaseUrl = (): string => {
  const apiUrl = getApiBaseUrl();
  // Remove /api suffix to get base URL
  return apiUrl.replace(/\/api\/?$/, '');
};

/**
 * Resolve image URL to full path
 * Handles relative paths, absolute paths, and full URLs
 */
export const resolveImageUrl = (path: string | undefined | null): string => {
  if (!path) return '/pp.jpg';
  
  // Already a full URL
  if (path.startsWith('http://') || path.startsWith('https://')) {
    return path;
  }
  
  // Data URL (base64)
  if (path.startsWith('data:')) {
    return path;
  }

  // Normalize common relative backend asset paths without leading slash
  // e.g. "uploads/x.png", "brands/x.webp", "hero/x.jpg"
  const normalized = path.replace(/^\.?\/*/, '');
  if (
    normalized.startsWith('uploads/') ||
    normalized.startsWith('brands/') ||
    normalized.startsWith('hero/')
  ) {
    return `${getBackendBaseUrl()}/${normalized}`;
  }
  
  // Relative path starting with /
  if (path.startsWith('/')) {
    // Backend-served paths that need full URL
    if (path.startsWith('/brands/') || path.startsWith('/hero/') || path.startsWith('/uploads/')) {
      return `${getBackendBaseUrl()}${path}`;
    }
    // Public folder assets (e.g., /pp.jpg, /k.png) - keep as-is
    return path;
  }
  
  // Bare filename: image extensions → uploads (product/card images), else → brands
  const lower = path.toLowerCase().trim();
  const isUploadExtension = /\.(png|jpe?g|gif|webp|bmp|svg)$/.test(lower);
  const prefix = isUploadExtension ? '/uploads/' : '/brands/';
  return `${getBackendBaseUrl()}${prefix}${path}`;
};

