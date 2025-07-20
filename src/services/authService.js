/**
 * Authentication Service
 * Handles credential validation, token management, and localStorage operations
 */

import { 
  getLocalStorageJSON, 
  setLocalStorageJSON, 
  removeLocalStorageItem,
  isLocalStorageAvailable 
} from '../utils/authUtils.js';

// Default credentials configuration
const AUTH_CONFIG = {
  username: 'admin',
  password: 'password123'
};

// localStorage key for authentication token
const AUTH_TOKEN_KEY = 'auth_token';

/**
 * Authentication Service Class
 * Provides methods for credential validation and token management
 */
class AuthService {
  /**
   * Validates user credentials against configured values
   * @param {string} username - User provided username
   * @param {string} password - User provided password
   * @returns {boolean} - True if credentials are valid
   */
  static validateCredentials(username, password) {
    if (!username || !password) {
      return false;
    }
    
    return username === AUTH_CONFIG.username && password === AUTH_CONFIG.password;
  }

  /**
   * Generates a random authentication token
   * @param {string} username - Username to associate with token
   * @returns {object} - Token object with value, timestamp, and username
   */
  static generateToken(username) {
    const token = {
      value: Math.random().toString(36).substring(2) + Date.now().toString(36),
      timestamp: Date.now(),
      username: username
    };
    
    return token;
  }

  /**
   * Validates if a token is properly formatted and not expired
   * @param {object} token - Token object to validate
   * @returns {boolean} - True if token is valid
   */
  static isValidToken(token) {
    if (!token || typeof token !== 'object') {
      return false;
    }
    
    // Check required properties
    if (!token.value || !token.timestamp || !token.username) {
      return false;
    }
    
    // For simplicity, tokens don't expire in this implementation
    // Could add expiration logic here in the future
    return true;
  }

  /**
   * Clears all authentication data from localStorage
   * @returns {boolean} - True if successful, false if localStorage unavailable
   */
  static clearAuthData() {
    if (!isLocalStorageAvailable()) {
      console.warn('localStorage is not available - cannot clear authentication data');
      return false;
    }
    
    try {
      return removeLocalStorageItem(AUTH_TOKEN_KEY);
    } catch (error) {
      console.warn('Failed to clear authentication data:', error);
      return false;
    }
  }

  /**
   * Stores authentication token in localStorage
   * @param {object} token - Token object to store
   * @throws {Error} When localStorage is unavailable or storage fails
   */
  static storeToken(token) {
    if (!isLocalStorageAvailable()) {
      const error = new Error('localStorage is not available - browser storage may be disabled');
      error.type = 'STORAGE_UNAVAILABLE';
      throw error;
    }
    
    try {
      const success = setLocalStorageJSON(AUTH_TOKEN_KEY, token);
      if (!success) {
        const error = new Error('Unable to store authentication data - storage may be full or restricted');
        error.type = 'STORAGE_QUOTA_EXCEEDED';
        throw error;
      }
    } catch (err) {
      // Handle specific storage errors
      if (err.name === 'QuotaExceededError' || err.code === 22) {
        const error = new Error('Browser storage is full - please clear some data and try again');
        error.type = 'STORAGE_QUOTA_EXCEEDED';
        throw error;
      } else if (err.name === 'SecurityError') {
        const error = new Error('Browser storage access is restricted - please check your privacy settings');
        error.type = 'STORAGE_SECURITY_ERROR';
        throw error;
      } else {
        const error = new Error('Failed to save authentication data - please try again');
        error.type = 'STORAGE_UNKNOWN_ERROR';
        error.originalError = err;
        throw error;
      }
    }
  }

  /**
   * Retrieves authentication token from localStorage
   * @returns {object|null} - Token object or null if not found/invalid
   * @throws {Error} When localStorage is unavailable
   */
  static getStoredToken() {
    if (!isLocalStorageAvailable()) {
      const error = new Error('localStorage is not available - cannot retrieve authentication token');
      error.type = 'STORAGE_UNAVAILABLE';
      throw error;
    }
    
    try {
      const token = getLocalStorageJSON(AUTH_TOKEN_KEY);
      return this.isValidToken(token) ? token : null;
    } catch (err) {
      // Handle corrupted token data
      console.warn('Corrupted authentication token detected, clearing storage');
      this.clearAuthData();
      return null;
    }
  }

  /**
   * Checks if user is currently authenticated
   * @returns {boolean} - True if user has valid authentication
   * @throws {Error} When localStorage is unavailable
   */
  static isAuthenticated() {
    try {
      const token = this.getStoredToken();
      return token !== null;
    } catch (error) {
      if (error.type === 'STORAGE_UNAVAILABLE') {
        // Re-throw storage unavailable errors to be handled by caller
        throw error;
      }
      // For other errors, assume not authenticated
      console.warn('Error checking authentication status:', error);
      return false;
    }
  }
  /**
   * Changes the user's password
   * @param {string} username - The user's username
   * @param {string} currentPassword - The user's current password
   * @param {string} newPassword - The new password
   * @returns {Promise<void>}
   * @throws {Error} If the current password is incorrect
   */
  static async changePassword(username, currentPassword, newPassword) {
    if (username !== AUTH_CONFIG.username || currentPassword !== AUTH_CONFIG.password) {
      throw new Error("Incorrect current password.");
    }

    AUTH_CONFIG.password = newPassword;
    console.log("Password for user '" + username + "' has been changed.");
    
    // In a real application, you would also invalidate the current token
    // and force the user to log in again.
    this.clearAuthData();
  }
}

export default AuthService;