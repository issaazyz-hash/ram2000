/**
 * Admin Log Service
 * Logs admin actions for audit trail
 */

const pool = require('../db/pool');

class AdminLogService {
  /**
   * Log an admin action
   * @param {number} userId - Admin user ID
   * @param {string} action - Action performed (create, update, delete)
   * @param {string} resourceType - Resource type (product, user, order, etc.)
   * @param {number|null} resourceId - Resource ID
   * @param {Object} details - Additional details
   * @param {string} ipAddress - IP address of the request
   */
  static async logAction(userId, action, resourceType, resourceId = null, details = {}, ipAddress = null) {
    try {
      const client = await pool.connect();
      try {
        await client.query(
          `INSERT INTO admin_logs (user_id, action, resource_type, resource_id, details, ip_address)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [userId, action, resourceType, resourceId, JSON.stringify(details), ipAddress]
        );
      } finally {
        client.release();
      }
    } catch (error) {
      // Don't fail the request if logging fails
      console.error('AdminLogService.logAction error:', error.message);
    }
  }

  /**
   * Get admin logs
   * @param {Object} filters - Filter options
   * @returns {Promise<Array>} Admin logs
   */
  static async getLogs(filters = {}) {
    try {
      const client = await pool.connect();
      try {
        let query = `
          SELECT al.*, u.name as user_name, u.email as user_email
          FROM admin_logs al
          JOIN users u ON al.user_id = u.id
          WHERE 1=1
        `;
        const params = [];
        let paramCount = 1;

        if (filters.userId) {
          query += ` AND al.user_id = $${paramCount++}`;
          params.push(filters.userId);
        }

        if (filters.action) {
          query += ` AND al.action = $${paramCount++}`;
          params.push(filters.action);
        }

        if (filters.resourceType) {
          query += ` AND al.resource_type = $${paramCount++}`;
          params.push(filters.resourceType);
        }

        query += ` ORDER BY al.created_at DESC LIMIT ${filters.limit || 100}`;

        const result = await client.query(query, params);
        return result.rows;
      } finally {
        client.release();
      }
    } catch (error) {
      console.error('AdminLogService.getLogs error:', error);
      throw new Error('Failed to fetch admin logs');
    }
  }
}

module.exports = AdminLogService;

