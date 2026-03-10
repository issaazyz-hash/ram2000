/**
 * User Service
 * Business logic for user operations
 * Handles authentication, authorization, and user management
 */

const bcrypt = require('bcrypt');
const User = require('../models/User');
const pool = require('../db/pool');

class UserService {
  /**
   * Register a new user
   * @param {Object} userData - User registration data
   * @param {boolean} requirePassword - Whether password is required (default: true)
   * @returns {Promise<Object>} Created user (without password)
   */
  static async registerUser(userData, requirePassword = true) {
    const { name, email, password, phone, address } = userData;

    // Validate input
    if (!name || !email) {
      throw new Error('Name and email are required');
    }

    if (requirePassword && !password) {
      throw new Error('Password is required');
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      throw new Error('Invalid email format');
    }

    // Validate password length if provided
    if (password && password.length < 6) {
      throw new Error('Password must be at least 6 characters long');
    }

    // Check if email already exists
    const emailExists = await User.emailExists(email);
    if (emailExists) {
      throw new Error('Email already registered');
    }

    // Hash password if provided, or generate a random one
    let hashedPassword;
    if (password) {
      const saltRounds = 10;
      hashedPassword = await bcrypt.hash(password, saltRounds);
    } else {
      // Generate a random password if not provided (for admin-created users)
      // This password should be reset by the user
      const crypto = require('crypto');
      const randomPassword = crypto.randomBytes(16).toString('hex');
      const saltRounds = 10;
      hashedPassword = await bcrypt.hash(randomPassword, saltRounds);
    }

    // Create user (using transaction for data integrity)
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const user = await User.create({
        name,
        email,
        password: hashedPassword,
        phone,
        address
      });

      await client.query('COMMIT');

      // Remove password from response
      const { password: _, ...userWithoutPassword } = user;
      return userWithoutPassword;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Authenticate user (login)
   * @param {string} email - User email
   * @param {string} password - User password
   * @returns {Promise<Object>} User object (without password) or null
   */
  static async authenticateUser(email, password) {
    if (!email || !password) {
      throw new Error('Email and password are required');
    }

    try {
      // Find user by email
      const user = await User.findByEmail(email);
      if (!user) {
        console.log(`[AUTH] Login attempt failed: user not found (email: ${email})`);
        return null; // Don't reveal if email exists (security best practice)
      }

      // Verify password using bcrypt
      const isValidPassword = await bcrypt.compare(password, user.password);
      if (!isValidPassword) {
        console.log(`[AUTH] Login attempt failed: invalid password (email: ${email})`);
        return null;
      }

      console.log(`[AUTH] Login successful: ${email} (user ID: ${user.id}, admin: ${user.is_admin})`);

      // Remove password from response
      const { password: _, ...userWithoutPassword } = user;
      return userWithoutPassword;
    } catch (error) {
      console.error('[AUTH] Authentication error:', error.message);
      throw error; // Re-throw to be handled by controller
    }
  }

  /**
   * Get user by ID (for authorization checks)
   * @param {number} userId - User ID
   * @returns {Promise<Object|null>} User object or null
   */
  static async getUserById(userId) {
    if (!userId || isNaN(parseInt(userId))) {
      return null;
    }

    const user = await User.findById(userId);
    if (!user) {
      return null;
    }

    // Remove password from response
    const { password: _, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }

  /**
   * Verify if user is admin (from database)
   * @param {number} userId - User ID
   * @returns {Promise<boolean>} True if user is admin
   */
  static async isAdmin(userId) {
    if (!userId) {
      return false;
    }

    const user = await User.findById(userId);
    return user && user.is_admin === true;
  }

  /**
   * Verify user from token/header (for authorization middleware)
   * This validates that the user ID in the request matches a real admin in the database
   * @param {Object} userData - User data from request (e.g. from header)
   * @returns {Promise<Object|null>} Verified user from database or null
   */
  static async verifyUser(userData) {
    if (!userData || !userData.id) {
      return null;
    }

    const userId = parseInt(userData.id);
    if (isNaN(userId)) {
      return null;
    }

    // Get user from database (source of truth)
    const user = await this.getUserById(userId);
    return user;
  }

  /**
   * Check if email is available
   * @param {string} email - Email to check
   * @returns {Promise<boolean>} True if email is available
   */
  static async isEmailAvailable(email) {
    if (!email) {
      return false;
    }

    const exists = await User.emailExists(email);
    return !exists;
  }

  /**
   * Get all users (admin only)
   * @returns {Promise<Array>} List of users (without passwords)
   */
  static async getAllUsers() {
    const users = await User.findAll();
    // Remove passwords from all users
    return users.map(user => {
      const { password: _, ...userWithoutPassword } = user;
      return userWithoutPassword;
    });
  }

  /**
   * Update user
   * @param {number} userId - User ID
   * @param {Object} updateData - Data to update
   * @returns {Promise<Object>} Updated user (without password)
   */
  static async updateUser(userId, updateData) {
    if (!userId || isNaN(parseInt(userId))) {
      throw new Error('Valid user ID is required');
    }

    // Prevent updating is_admin through this method (use separate admin method)
    if (updateData.is_admin !== undefined) {
      throw new Error('Cannot update admin status through this method');
    }

    // If email is being updated, check if it's available
    if (updateData.email) {
      const emailAvailable = await this.isEmailAvailable(updateData.email);
      if (!emailAvailable) {
        throw new Error('Email already in use');
      }
    }

    const user = await User.update(userId, updateData);
    if (!user) {
      throw new Error('User not found');
    }

    // Remove password from response
    const { password: _, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }

  /**
   * Delete user
   * @param {number} userId - User ID
   * @returns {Promise<Object>} Deleted user info
   */
  static async deleteUser(userId) {
    if (!userId || isNaN(parseInt(userId))) {
      throw new Error('Valid user ID is required');
    }

    const user = await User.delete(userId);
    if (!user) {
      throw new Error('User not found');
    }

    return user;
  }
}

module.exports = UserService;

