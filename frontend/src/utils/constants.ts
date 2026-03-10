/**
 * Constants
 * 
 * Application-wide constants and magic numbers.
 */

/**
 * File Upload Constants
 */
export const FILE_UPLOAD = {
  MAX_SIZE: 1024 * 1024, // 1MB
  ACCEPTED_TYPES: ['image/jpeg', 'image/png', 'image/webp'],
  MAX_WIDTH: 800,
  MAX_HEIGHT: 800,
  QUALITY: 0.7,
} as const;

/**
 * Filter Constants
 */
export const FILTER = {
  MAX_NAME_LENGTH: 100,
  DEFAULT_ICON_SIZE: 64,
} as const;

/**
 * API Constants
 */
export const API = {
  TIMEOUT: 30000,
  RETRY_ATTEMPTS: 3,
  RETRY_DELAY: 1000,
} as const;

/**
 * UI Constants
 */
export const UI = {
  DROPDOWN_CLOSE_DELAY: 220, // milliseconds
  DEBOUNCE_DELAY: 300, // milliseconds
  THROTTLE_DELAY: 100, // milliseconds
} as const;

