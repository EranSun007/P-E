import bcrypt from 'bcrypt';
import { query } from '../db/connection.js';

const SALT_ROUNDS = 10;

class UserService {
  /**
   * Hash a plain text password
   */
  static async hashPassword(plainPassword) {
    return bcrypt.hash(plainPassword, SALT_ROUNDS);
  }

  /**
   * Compare plain password with hash
   */
  static async validatePassword(plainPassword, passwordHash) {
    return bcrypt.compare(plainPassword, passwordHash);
  }

  /**
   * Find user by username (for login)
   */
  async findByUsername(username) {
    const sql = 'SELECT * FROM users WHERE username = $1 AND is_active = true';
    const result = await query(sql, [username]);
    return result.rows[0] || null;
  }

  /**
   * Find user by ID
   */
  async findById(id) {
    const sql = 'SELECT id, username, email, name, role, is_active, last_login, created_date FROM users WHERE id = $1';
    const result = await query(sql, [id]);
    return result.rows[0] || null;
  }

  /**
   * List all users (admin only)
   */
  async list(requestingUserId) {
    // Verify requesting user is admin
    const admin = await this.findById(requestingUserId);
    if (!admin || admin.role !== 'admin') {
      throw new Error('Unauthorized: Admin access required');
    }

    const sql = `
      SELECT id, username, email, name, role, is_active, last_login, created_date
      FROM users
      ORDER BY created_date DESC
    `;
    const result = await query(sql);
    return result.rows;
  }

  /**
   * Create a new user (admin only)
   */
  async create(requestingUserId, userData) {
    // Verify requesting user is admin (unless this is the initial setup)
    if (requestingUserId) {
      const admin = await this.findById(requestingUserId);
      if (!admin || admin.role !== 'admin') {
        throw new Error('Unauthorized: Admin access required');
      }
    }

    const { username, password, email, name, role = 'user' } = userData;

    if (!username || !password) {
      throw new Error('Username and password are required');
    }

    // Check if username already exists
    const existing = await this.findByUsername(username);
    if (existing) {
      throw new Error('Username already exists');
    }

    // Hash password
    const passwordHash = await UserService.hashPassword(password);

    const sql = `
      INSERT INTO users (username, email, password_hash, name, role)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id, username, email, name, role, is_active, created_date
    `;
    const result = await query(sql, [username, email || null, passwordHash, name || null, role]);
    return result.rows[0];
  }

  /**
   * Update a user (admin only, or user updating themselves)
   */
  async update(requestingUserId, targetUserId, updates) {
    const requester = await this.findById(requestingUserId);
    const isAdmin = requester?.role === 'admin';
    const isSelf = requestingUserId === targetUserId;

    if (!isAdmin && !isSelf) {
      throw new Error('Unauthorized: Cannot update other users');
    }

    const allowedFields = ['email', 'name'];
    if (isAdmin) {
      allowedFields.push('role', 'is_active');
    }

    const setClauses = [];
    const values = [];
    let paramIndex = 1;

    for (const field of allowedFields) {
      if (updates[field] !== undefined) {
        setClauses.push(`${field} = $${paramIndex}`);
        values.push(updates[field]);
        paramIndex++;
      }
    }

    if (setClauses.length === 0) {
      throw new Error('No valid fields to update');
    }

    values.push(targetUserId);
    const sql = `
      UPDATE users
      SET ${setClauses.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING id, username, email, name, role, is_active, created_date
    `;
    const result = await query(sql, values);
    return result.rows[0];
  }

  /**
   * Change password
   */
  async changePassword(userId, currentPassword, newPassword) {
    // Get user with password hash
    const sql = 'SELECT * FROM users WHERE id = $1';
    const result = await query(sql, [userId]);
    const user = result.rows[0];

    if (!user) {
      throw new Error('User not found');
    }

    // Verify current password
    const isValid = await UserService.validatePassword(currentPassword, user.password_hash);
    if (!isValid) {
      throw new Error('Current password is incorrect');
    }

    // Hash and update new password
    const newHash = await UserService.hashPassword(newPassword);
    await query('UPDATE users SET password_hash = $1 WHERE id = $2', [newHash, userId]);

    return true;
  }

  /**
   * Admin reset password (no current password required)
   */
  async resetPassword(adminUserId, targetUserId, newPassword) {
    const admin = await this.findById(adminUserId);
    if (!admin || admin.role !== 'admin') {
      throw new Error('Unauthorized: Admin access required');
    }

    const newHash = await UserService.hashPassword(newPassword);
    await query('UPDATE users SET password_hash = $1 WHERE id = $2', [newHash, targetUserId]);

    return true;
  }

  /**
   * Deactivate user (admin only)
   */
  async deactivate(adminUserId, targetUserId) {
    const admin = await this.findById(adminUserId);
    if (!admin || admin.role !== 'admin') {
      throw new Error('Unauthorized: Admin access required');
    }

    // Prevent deactivating yourself
    if (adminUserId === targetUserId) {
      throw new Error('Cannot deactivate your own account');
    }

    await query('UPDATE users SET is_active = false WHERE id = $1', [targetUserId]);
    return true;
  }

  /**
   * Update last login timestamp
   */
  async updateLastLogin(userId) {
    await query('UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = $1', [userId]);
  }

  /**
   * Create initial admin user if no users exist
   */
  async createInitialAdmin(password) {
    // Check if any users exist
    const countResult = await query('SELECT COUNT(*) FROM users');
    const count = parseInt(countResult.rows[0].count, 10);

    if (count > 0) {
      console.log('Users already exist, skipping initial admin creation');
      return null;
    }

    console.log('Creating initial admin user...');
    const admin = await this.create(null, {
      username: 'admin',
      password: password,
      name: 'Administrator',
      role: 'admin'
    });

    console.log('Initial admin user created with username: admin');
    return admin;
  }
}

export default new UserService();
