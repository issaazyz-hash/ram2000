/**
 * User Model
 * Database operations for users
 */

const pool = require('../db/pool');

class User {
  static async findAll() {
    const result = await pool.query(
      'SELECT id, name, email, phone, address, is_admin, created_at, updated_at FROM users ORDER BY id ASC'
    );
    // Add role field to each user
    return result.rows.map(user => ({
      ...user,
      role: user.is_admin ? 'admin' : 'user'
    }));
  }

  static async findById(id) {
    const result = await pool.query(
      'SELECT id, name, email, phone, address, is_admin, created_at, updated_at FROM users WHERE id = $1',
      [id]
    );
    const user = result.rows[0] || null;
    if (user) {
      // Add role field based on is_admin
      user.role = user.is_admin ? 'admin' : 'user';
    }
    return user;
  }

  static async findByEmail(email) {
    const result = await pool.query(
      'SELECT id, name, email, password, phone, address, is_admin, created_at, updated_at FROM users WHERE email = $1',
      [email.toLowerCase().trim()]
    );
    const user = result.rows[0] || null;
    if (user) {
      // Add role field based on is_admin
      user.role = user.is_admin ? 'admin' : 'user';
    }
    return user;
  }

  static async create(userData) {
    const { name, email, password, phone, address } = userData;
    const result = await pool.query(
      `INSERT INTO users (name, email, password, phone, address) 
       VALUES ($1, $2, $3, $4, $5) 
       RETURNING id, name, email, phone, address, is_admin, created_at`,
      [
        name.trim(),
        email.toLowerCase().trim(),
        password,
        phone ? phone.trim() : null,
        address ? address.trim() : null
      ]
    );
    const user = result.rows[0];
    // Add role field based on is_admin
    user.role = user.is_admin ? 'admin' : 'user';
    return user;
  }

  static async update(id, userData) {
    const updates = [];
    const values = [];
    let paramCount = 1;

    if (userData.name) {
      updates.push(`name = $${paramCount++}`);
      values.push(userData.name.trim());
    }
    if (userData.email) {
      updates.push(`email = $${paramCount++}`);
      values.push(userData.email.toLowerCase().trim());
    }
    if (userData.phone !== undefined) {
      updates.push(`phone = $${paramCount++}`);
      values.push(userData.phone ? userData.phone.trim() : null);
    }
    if (userData.address !== undefined) {
      updates.push(`address = $${paramCount++}`);
      values.push(userData.address ? userData.address.trim() : null);
    }
    if (userData.is_admin !== undefined) {
      updates.push(`is_admin = $${paramCount++}`);
      values.push(userData.is_admin);
    }

    if (updates.length === 0) {
      return null;
    }

    updates.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(id);

    const query = `UPDATE users SET ${updates.join(', ')} WHERE id = $${paramCount} 
                   RETURNING id, name, email, phone, address, is_admin, created_at, updated_at`;
    
    const result = await pool.query(query, values);
    const user = result.rows[0] || null;
    if (user) {
      // Add role field based on is_admin
      user.role = user.is_admin ? 'admin' : 'user';
    }
    return user;
  }

  static async delete(id) {
    const result = await pool.query(
      'DELETE FROM users WHERE id = $1 RETURNING id, name, email',
      [id]
    );
    return result.rows[0] || null;
  }

  static async emailExists(email, excludeId = null) {
    let query = 'SELECT id FROM users WHERE email = $1';
    const params = [email.toLowerCase().trim()];
    
    if (excludeId) {
      query += ' AND id != $2';
      params.push(excludeId);
    }
    
    const result = await pool.query(query, params);
    return result.rows.length > 0;
  }
}

module.exports = User;

