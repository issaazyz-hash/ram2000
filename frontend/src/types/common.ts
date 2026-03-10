/**
 * Common Types
 * 
 * Shared type definitions used across the application.
 */

/**
 * API Response Wrapper
 */
export interface ApiResponse<T> {
  data: T;
  message?: string;
  error?: string;
  status: number;
}

/**
 * Paginated Response
 */
export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

/**
 * Image Upload Result
 */
export interface ImageUploadResult {
  url: string;
  size: number;
  format: string;
  width?: number;
  height?: number;
}

/**
 * Admin Action Type
 */
export type AdminAction = 'edit' | 'delete' | 'restore' | 'create';

/**
 * Search Options
 */
export interface SearchOptions {
  marque: string[];
  modele: string[];
  annee: string[];
}

/**
 * Error Response
 */
export interface ErrorResponse {
  message: string;
  code?: string;
  details?: Record<string, unknown>;
}

