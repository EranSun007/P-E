import crypto from 'crypto';
import { query } from '../db/connection.js';

// Simple encryption for storing sensitive settings
// In production, consider using a proper secrets manager
const ENCRYPTION_KEY = process.env.SETTINGS_ENCRYPTION_KEY || 'pe-manager-default-key-32chars!';
const ALGORITHM = 'aes-256-cbc';

class UserSettingsService {
  /**
   * Encrypt a value for storage
   */
  _encrypt(text) {
    if (!text) return null;
    const iv = crypto.randomBytes(16);
    const key = crypto.scryptSync(ENCRYPTION_KEY, 'salt', 32);
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return iv.toString('hex') + ':' + encrypted;
  }

  /**
   * Decrypt a stored value
   */
  _decrypt(encryptedText) {
    if (!encryptedText) return null;
    const parts = encryptedText.split(':');
    if (parts.length !== 2) return null;

    const iv = Buffer.from(parts[0], 'hex');
    const encrypted = parts[1];
    const key = crypto.scryptSync(ENCRYPTION_KEY, 'salt', 32);
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  }

  /**
   * Get a single setting
   */
  async get(userId, settingKey) {
    const sql = `
      SELECT setting_value, encrypted
      FROM user_settings
      WHERE user_id = $1 AND setting_key = $2
    `;
    const result = await query(sql, [userId, settingKey]);

    if (result.rows.length === 0) return null;

    const { setting_value, encrypted } = result.rows[0];
    return encrypted ? this._decrypt(setting_value) : setting_value;
  }

  /**
   * Set a setting (upsert)
   */
  async set(userId, settingKey, value, shouldEncrypt = false) {
    const storedValue = shouldEncrypt ? this._encrypt(value) : value;

    const sql = `
      INSERT INTO user_settings (user_id, setting_key, setting_value, encrypted)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (user_id, setting_key)
      DO UPDATE SET setting_value = $3, encrypted = $4
      RETURNING id, setting_key, encrypted, created_date, updated_date
    `;

    const result = await query(sql, [userId, settingKey, storedValue, shouldEncrypt]);
    return result.rows[0];
  }

  /**
   * Delete a setting
   */
  async delete(userId, settingKey) {
    const sql = 'DELETE FROM user_settings WHERE user_id = $1 AND setting_key = $2';
    const result = await query(sql, [userId, settingKey]);
    return result.rowCount > 0;
  }

  /**
   * Get all settings for a user (decrypted)
   */
  async listForUser(userId) {
    const sql = `
      SELECT setting_key, setting_value, encrypted, created_date, updated_date
      FROM user_settings
      WHERE user_id = $1
      ORDER BY setting_key
    `;
    const result = await query(sql, [userId]);

    return result.rows.map(row => ({
      key: row.setting_key,
      value: row.encrypted ? this._decrypt(row.setting_value) : row.setting_value,
      encrypted: row.encrypted,
      created_date: row.created_date,
      updated_date: row.updated_date
    }));
  }

  // Specific setting helpers

  /**
   * Store GitHub Personal Access Token (encrypted)
   */
  async setGitHubToken(userId, token) {
    return this.set(userId, 'github_pat', token, true);
  }

  /**
   * Get GitHub Personal Access Token
   */
  async getGitHubToken(userId) {
    return this.get(userId, 'github_pat');
  }

  /**
   * Check if user has GitHub token configured
   */
  async hasGitHubToken(userId) {
    const token = await this.getGitHubToken(userId);
    return !!token;
  }

  /**
   * Delete GitHub token
   */
  async deleteGitHubToken(userId) {
    return this.delete(userId, 'github_pat');
  }
}

export default new UserSettingsService();
