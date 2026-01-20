/**
 * Authentication Service
 * Handles API-based authentication with JWT tokens
 */

// localStorage keys
const AUTH_TOKEN_KEY = 'auth_token';
const AUTH_USER_KEY = 'auth_user';

// API base URL
const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

/**
 * Authentication Service Class
 * Provides methods for login, logout, and token management
 */
class AuthService {
  /**
   * Login with username and password
   * @param {string} username - User's username
   * @param {string} password - User's password
   * @returns {Promise<{success: boolean, user?: object, error?: string}>}
   */
  static async login(username, password) {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ username, password })
      });

      const data = await response.json();

      if (!response.ok) {
        return {
          success: false,
          error: data.message || 'Login failed'
        };
      }

      // Store token and user info
      this.storeToken(data.token);
      this.storeUser(data.user);

      return {
        success: true,
        user: data.user
      };
    } catch (error) {
      console.error('Login error:', error);
      return {
        success: false,
        error: 'Network error. Please check your connection.'
      };
    }
  }

  /**
   * Store JWT token in localStorage
   * @param {string} token - JWT token
   */
  static storeToken(token) {
    try {
      localStorage.setItem(AUTH_TOKEN_KEY, token);
    } catch (error) {
      console.error('Failed to store token:', error);
      throw error;
    }
  }

  /**
   * Store user info in localStorage
   * @param {object} user - User object
   */
  static storeUser(user) {
    try {
      localStorage.setItem(AUTH_USER_KEY, JSON.stringify(user));
    } catch (error) {
      console.error('Failed to store user:', error);
    }
  }

  /**
   * Get stored JWT token
   * @returns {string|null}
   */
  static getToken() {
    try {
      return localStorage.getItem(AUTH_TOKEN_KEY);
    } catch (error) {
      console.error('Failed to get token:', error);
      return null;
    }
  }

  /**
   * Get stored user info
   * @returns {object|null}
   */
  static getStoredUser() {
    try {
      const userJson = localStorage.getItem(AUTH_USER_KEY);
      return userJson ? JSON.parse(userJson) : null;
    } catch (error) {
      console.error('Failed to get user:', error);
      return null;
    }
  }

  /**
   * Check if user is authenticated (has valid token)
   * @returns {boolean}
   */
  static isAuthenticated() {
    const token = this.getToken();
    if (!token) return false;

    // Check if token is expired (basic check)
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      const exp = payload.exp * 1000; // Convert to milliseconds
      return Date.now() < exp;
    } catch {
      return false;
    }
  }

  /**
   * Clear authentication data
   * @returns {boolean}
   */
  static clearAuthData() {
    try {
      localStorage.removeItem(AUTH_TOKEN_KEY);
      localStorage.removeItem(AUTH_USER_KEY);
      return true;
    } catch (error) {
      console.error('Failed to clear auth data:', error);
      return false;
    }
  }

  /**
   * Change password
   * @param {string} currentPassword - Current password
   * @param {string} newPassword - New password
   * @returns {Promise<{success: boolean, error?: string}>}
   */
  static async changePassword(currentPassword, newPassword) {
    try {
      const token = this.getToken();
      if (!token) {
        return { success: false, error: 'Not authenticated' };
      }

      const response = await fetch(`${API_BASE_URL}/auth/change-password`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ currentPassword, newPassword })
      });

      const data = await response.json();

      if (!response.ok) {
        return {
          success: false,
          error: data.message || 'Failed to change password'
        };
      }

      return { success: true };
    } catch (error) {
      console.error('Change password error:', error);
      return {
        success: false,
        error: 'Network error. Please try again.'
      };
    }
  }

  /**
   * Fetch current user from API
   * @returns {Promise<object|null>}
   */
  static async fetchCurrentUser() {
    try {
      const token = this.getToken();
      if (!token) return null;

      const response = await fetch(`${API_BASE_URL}/auth/me`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        if (response.status === 401) {
          this.clearAuthData();
        }
        return null;
      }

      const user = await response.json();
      this.storeUser(user);
      return user;
    } catch (error) {
      console.error('Fetch user error:', error);
      return null;
    }
  }

  /**
   * Setup initial admin user (first-time setup)
   * @param {string} password - Initial admin password
   * @returns {Promise<{success: boolean, error?: string}>}
   */
  static async setupInitialAdmin(password) {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/setup`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ password })
      });

      const data = await response.json();

      if (!response.ok) {
        return {
          success: false,
          error: data.message || 'Setup failed'
        };
      }

      return { success: true, user: data.user };
    } catch (error) {
      console.error('Setup error:', error);
      return {
        success: false,
        error: 'Network error. Please try again.'
      };
    }
  }
}

export default AuthService;
