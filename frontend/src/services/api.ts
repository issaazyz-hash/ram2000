/**
 * API Client
 * 
 * Axios instance with base configuration, interceptors, and error handling.
 */

import axios, { AxiosInstance, AxiosError, InternalAxiosRequestConfig } from 'axios';

import { getApiBaseUrl as getApiBaseUrlUtil } from '@/utils/apiConfig';

// Get API base URL with development fallback
const getApiBaseUrl = (): string => {
  return getApiBaseUrlUtil();
};

// Create axios instance
const api: AxiosInstance = axios.create({
  baseURL: getApiBaseUrl(),
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor - Add auth token
api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = localStorage.getItem('authToken');
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error: AxiosError) => {
    return Promise.reject(error);
  }
);

// Response interceptor - Handle errors globally
api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    // Enhanced error logging for production debugging
    if (error.response) {
      const { status, data } = error.response;

      // Log API errors with full details (safe for production)
      const errorDetails = {
        url: error.config?.url,
        method: error.config?.method,
        status,
        message: error.message,
        data: data
      };
      
      // Always log errors (will be removed in production build by terser)
      console.error('API Error:', errorDetails);

      // Handle 401 Unauthorized
      if (status === 401) {
        localStorage.removeItem('authToken');
        localStorage.removeItem('user');
        window.dispatchEvent(new CustomEvent('userLogout'));
        // Redirect to login page
        window.location.href = '/login';
      }

      // Handle 403 Forbidden
      if (status === 403) {
        console.error('Access forbidden - Admin access required');
      }

      // Handle 500 Server Error
      if (status === 500) {
        console.error('Server error - Backend may be unavailable or error occurred');
      }
    } else if (error.request) {
      // Network error - backend unreachable
      console.error('Network error - Cannot reach backend:', {
        baseURL: error.config?.baseURL,
        url: error.config?.url,
        message: error.message
      });
    } else {
      // Request setup error
      console.error('Request setup error:', error.message);
    }

    return Promise.reject(error);
  }
);

export default api;

