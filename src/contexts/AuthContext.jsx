/**
 * Authentication Context
 * Provides global authentication state management for the application
 */

import React, { createContext, useContext, useState, useEffect } from 'react';
import AuthService from '../services/authService.js';

// Create the authentication context
const AuthContext = createContext(null);

/**
 * Custom hook to use the authentication context
 * @returns {object} Authentication context value
 * @throws {Error} If used outside of AuthProvider
 */
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

/**
 * Authentication Provider Component
 * Manages authentication state and provides login/logout functionality
 */
export const AuthProvider = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  /**
   * Initialize authentication state on component mount
   */
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        setError(null);

        // Check if we have a valid token
        if (AuthService.isAuthenticated()) {
          // Fetch current user info
          const userData = await AuthService.fetchCurrentUser();
          if (userData) {
            setUser(userData);
            setIsAuthenticated(true);
          } else {
            // Token invalid or expired
            AuthService.clearAuthData();
            setIsAuthenticated(false);
            setUser(null);
          }
        } else {
          setIsAuthenticated(false);
          setUser(null);
        }
      } catch (error) {
        console.error('Failed to initialize authentication state:', error);
        setError('Failed to initialize authentication. Please refresh the page.');
        setIsAuthenticated(false);
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    initializeAuth();
  }, []);

  /**
   * Handles user login with username and password
   * @param {string} username - User provided username
   * @param {string} password - User provided password
   * @returns {Promise<{success: boolean, error?: string}>} - Login result
   */
  const login = async (username, password) => {
    try {
      setError(null);

      if (!username || !password) {
        return {
          success: false,
          error: 'Please fill in all fields'
        };
      }

      // Call the API to authenticate
      const result = await AuthService.login(username, password);

      if (!result.success) {
        return {
          success: false,
          error: result.error || 'Invalid username or password'
        };
      }

      // Update state with authenticated user
      setUser(result.user);
      setIsAuthenticated(true);

      return { success: true };
    } catch (error) {
      console.error('Login failed:', error);
      return {
        success: false,
        error: 'Authentication failed. Please try again.'
      };
    }
  };

  /**
   * Handles user logout
   * Clears authentication data and updates state
   */
  const logout = () => {
    try {
      setError(null);
      AuthService.clearAuthData();
      setIsAuthenticated(false);
      setUser(null);
    } catch (error) {
      console.error('Logout failed:', error);
      // Always clear state even if storage fails
      setIsAuthenticated(false);
      setUser(null);
    }
  };

  /**
   * Clears any authentication errors
   */
  const clearError = () => {
    setError(null);
  };

  /**
   * Refresh user data from API
   */
  const refreshUser = async () => {
    try {
      const userData = await AuthService.fetchCurrentUser();
      if (userData) {
        setUser(userData);
      }
    } catch (error) {
      console.error('Failed to refresh user:', error);
    }
  };

  // Context value object
  const contextValue = {
    isAuthenticated,
    user,
    login,
    logout,
    loading,
    error,
    clearError,
    refreshUser
  };

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthContext;
