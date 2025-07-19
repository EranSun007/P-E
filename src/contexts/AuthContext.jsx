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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  /**
   * Initialize authentication state from localStorage on component mount
   */
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        setError(null);
        const isAuth = AuthService.isAuthenticated();
        setIsAuthenticated(isAuth);
      } catch (error) {
        console.error('Failed to initialize authentication state:', error);
        
        // Set user-friendly error message based on error type
        let errorMessage = 'Failed to initialize authentication. Please refresh the page.';
        
        switch (error.type) {
          case 'STORAGE_UNAVAILABLE':
            errorMessage = 'Browser storage is not available. Please enable cookies and local storage in your browser settings.';
            break;
          case 'STORAGE_SECURITY_ERROR':
            errorMessage = 'Browser storage access is restricted. Please check your privacy settings.';
            break;
          default:
            // Fallback to message-based detection for backward compatibility
            if (error.message?.includes('localStorage')) {
              errorMessage = 'Browser storage is not available. Please enable cookies and local storage.';
            }
        }
        
        setError(errorMessage);
        setIsAuthenticated(false);
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
   * @returns {Promise<{success: boolean, error?: string}>} - Login result with success status and optional error message
   */
  const login = async (username, password) => {
    try {
      setError(null);
      
      // Validate input parameters
      if (!username || !password) {
        return { 
          success: false, 
          error: 'Please fill in all fields' 
        };
      }

      // Validate credentials
      const isValid = AuthService.validateCredentials(username, password);
      
      if (!isValid) {
        return { 
          success: false, 
          error: 'Invalid username or password' 
        };
      }

      // Generate and store authentication token
      const token = AuthService.generateToken(username);
      AuthService.storeToken(token);
      
      // Update authentication state
      setIsAuthenticated(true);
      
      return { success: true };
    } catch (error) {
      console.error('Login failed:', error);
      
      // Handle specific error types based on error.type
      let errorMessage = 'Authentication failed. Please try again.';
      
      switch (error.type) {
        case 'STORAGE_UNAVAILABLE':
          errorMessage = 'Browser storage is disabled. Please enable cookies and local storage in your browser settings.';
          break;
        case 'STORAGE_QUOTA_EXCEEDED':
          errorMessage = 'Browser storage is full. Please clear some browser data and try again.';
          break;
        case 'STORAGE_SECURITY_ERROR':
          errorMessage = 'Browser storage access is restricted. Please check your privacy settings and try again.';
          break;
        case 'STORAGE_UNKNOWN_ERROR':
          errorMessage = 'Unable to save login session. Please try again or contact support.';
          break;
        default:
          // Fallback to message-based detection for backward compatibility
          if (error.message?.includes('localStorage')) {
            errorMessage = 'Unable to save login session. Please check your browser settings.';
          } else if (error.message?.includes('Unable to store')) {
            errorMessage = 'Unable to save login session. Your browser storage may be full.';
          }
      }
      
      return { 
        success: false, 
        error: errorMessage 
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
      
      // Clear authentication data from localStorage
      const clearSuccess = AuthService.clearAuthData();
      
      // Update authentication state regardless of storage clear success
      setIsAuthenticated(false);
      
      // Warn user if storage couldn't be cleared
      if (!clearSuccess) {
        console.warn('Unable to clear browser storage during logout - session data may persist');
        // Set a non-blocking warning for development/debugging
        if (process.env.NODE_ENV === 'development') {
          setError('Warning: Unable to clear browser storage. Session data may persist until browser restart.');
        }
      }
    } catch (error) {
      console.error('Logout failed:', error);
      
      // Always update state to ensure user is logged out
      setIsAuthenticated(false);
      
      // Handle specific logout errors
      if (error.type === 'STORAGE_UNAVAILABLE') {
        console.warn('localStorage unavailable during logout - session cleared from memory only');
      } else {
        console.warn('Unexpected error during logout:', error);
      }
    }
  };

  /**
   * Clears any authentication errors
   */
  const clearError = () => {
    setError(null);
  };

  // Context value object
  const contextValue = {
    isAuthenticated,
    login,
    logout,
    loading,
    error,
    clearError
  };

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthContext;