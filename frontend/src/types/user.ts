/**
 * User Types
 * 
 * Type definitions for user and authentication entities.
 */

/**
 * User Role Enum
 */
export enum UserRole {
  ADMIN = 'admin',
  USER = 'user',
}

/**
 * User Interface
 */
export interface User {
  id: string;
  name: string;
  username?: string;
  email: string;
  role: UserRole;
  is_admin: boolean;
  createdAt?: string;
  updatedAt?: string;
}

/**
 * Login Credentials
 */
export interface LoginCredentials {
  email: string;
  password: string;
}

/**
 * Auth Response
 */
export interface AuthResponse {
  user: User;
  token: string;
  refreshToken?: string;
  expiresIn?: number;
}

