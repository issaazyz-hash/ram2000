/**
 * Auth Service
 * 
 * API calls for authentication operations.
 */

import api from './api';
import type { User, LoginCredentials, AuthResponse } from '../types/user';

/**
 * Login user
 */
export const login = async (email: string, password: string): Promise<AuthResponse> => {
  const credentials: LoginCredentials = { email, password };
  const response = await api.post<AuthResponse>('/auth/login', credentials);
  
  // Store token
  if (response.data.token) {
    localStorage.setItem('authToken', response.data.token);
  }
  
  // Store user
  localStorage.setItem('user', JSON.stringify(response.data.user));
  window.dispatchEvent(new CustomEvent('userLogin'));
  
  return response.data;
};

/**
 * Logout user
 */
export const logout = async (): Promise<void> => {
  try {
    await api.post('/auth/logout');
  } finally {
    localStorage.removeItem('authToken');
    localStorage.removeItem('user');
    window.dispatchEvent(new CustomEvent('userLogout'));
  }
};

/**
 * Get current user
 */
export const getCurrentUser = async (): Promise<User> => {
  const response = await api.get<User>('/auth/me');
  return response.data;
};

/**
 * Verify admin role
 */
export const verifyAdminRole = async (): Promise<boolean> => {
  try {
    const response = await api.get<{ isAdmin: boolean }>('/auth/verify-admin');
    return response.data.isAdmin;
  } catch {
    return false;
  }
};

