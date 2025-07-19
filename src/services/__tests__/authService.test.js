/**
 * AuthService Unit Tests
 * Comprehensive tests for authentication service methods
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import AuthService from '../authService.js';
import * as authUtils from '../../utils/authUtils.js';

// Mock the authUtils module
vi.mock('../../utils/authUtils.js');

describe('AuthService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset console methods
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('validateCredentials', () => {
    it('should return true for valid credentials', () => {
      const result = AuthService.validateCredentials('admin', 'password123');
      expect(result).toBe(true);
    });

    it('should return false for invalid username', () => {
      const result = AuthService.validateCredentials('wronguser', 'password123');
      expect(result).toBe(false);
    });

    it('should return false for invalid password', () => {
      const result = AuthService.validateCredentials('admin', 'wrongpassword');
      expect(result).toBe(false);
    });

    it('should return false for empty username', () => {
      const result = AuthService.validateCredentials('', 'password123');
      expect(result).toBe(false);
    });

    it('should return false for empty password', () => {
      const result = AuthService.validateCredentials('admin', '');
      expect(result).toBe(false);
    });

    it('should return false for null username', () => {
      const result = AuthService.validateCredentials(null, 'password123');
      expect(result).toBe(false);
    });

    it('should return false for null password', () => {
      const result = AuthService.validateCredentials('admin', null);
      expect(result).toBe(false);
    });

    it('should return false for undefined credentials', () => {
      const result = AuthService.validateCredentials(undefined, undefined);
      expect(result).toBe(false);
    });
  });

  describe('generateToken', () => {
    it('should generate a token with required properties', () => {
      const username = 'testuser';
      const token = AuthService.generateToken(username);

      expect(token).toHaveProperty('value');
      expect(token).toHaveProperty('timestamp');
      expect(token).toHaveProperty('username');
      expect(token.username).toBe(username);
      expect(typeof token.value).toBe('string');
      expect(typeof token.timestamp).toBe('number');
      expect(token.value.length).toBeGreaterThan(0);
    });

    it('should generate unique tokens', async () => {
      const token1 = AuthService.generateToken('user1');
      // Add small delay to ensure different timestamps
      await new Promise(resolve => setTimeout(resolve, 2));
      const token2 = AuthService.generateToken('user2');

      expect(token1.value).not.toBe(token2.value);
      // Timestamps should be different due to the delay and random component
      expect(token1.timestamp).not.toBe(token2.timestamp);
    });

    it('should include current timestamp', () => {
      const beforeTime = Date.now();
      const token = AuthService.generateToken('testuser');
      const afterTime = Date.now();

      expect(token.timestamp).toBeGreaterThanOrEqual(beforeTime);
      expect(token.timestamp).toBeLessThanOrEqual(afterTime);
    });
  });

  describe('isValidToken', () => {
    it('should return true for valid token object', () => {
      const validToken = {
        value: 'test-token-value',
        timestamp: Date.now(),
        username: 'testuser'
      };

      const result = AuthService.isValidToken(validToken);
      expect(result).toBe(true);
    });

    it('should return false for null token', () => {
      const result = AuthService.isValidToken(null);
      expect(result).toBe(false);
    });

    it('should return false for undefined token', () => {
      const result = AuthService.isValidToken(undefined);
      expect(result).toBe(false);
    });

    it('should return false for non-object token', () => {
      expect(AuthService.isValidToken('string')).toBe(false);
      expect(AuthService.isValidToken(123)).toBe(false);
      expect(AuthService.isValidToken(true)).toBe(false);
    });

    it('should return false for token missing value property', () => {
      const invalidToken = {
        timestamp: Date.now(),
        username: 'testuser'
      };

      const result = AuthService.isValidToken(invalidToken);
      expect(result).toBe(false);
    });

    it('should return false for token missing timestamp property', () => {
      const invalidToken = {
        value: 'test-token-value',
        username: 'testuser'
      };

      const result = AuthService.isValidToken(invalidToken);
      expect(result).toBe(false);
    });

    it('should return false for token missing username property', () => {
      const invalidToken = {
        value: 'test-token-value',
        timestamp: Date.now()
      };

      const result = AuthService.isValidToken(invalidToken);
      expect(result).toBe(false);
    });

    it('should return false for token with empty value', () => {
      const invalidToken = {
        value: '',
        timestamp: Date.now(),
        username: 'testuser'
      };

      const result = AuthService.isValidToken(invalidToken);
      expect(result).toBe(false);
    });

    it('should return false for token with empty username', () => {
      const invalidToken = {
        value: 'test-token-value',
        timestamp: Date.now(),
        username: ''
      };

      const result = AuthService.isValidToken(invalidToken);
      expect(result).toBe(false);
    });
  });

  describe('clearAuthData', () => {
    it('should clear auth data when localStorage is available', () => {
      authUtils.isLocalStorageAvailable.mockReturnValue(true);
      authUtils.removeLocalStorageItem.mockReturnValue(true);

      const result = AuthService.clearAuthData();

      expect(result).toBe(true);
      expect(authUtils.removeLocalStorageItem).toHaveBeenCalledWith('auth_token');
    });

    it('should return false when localStorage is not available', () => {
      authUtils.isLocalStorageAvailable.mockReturnValue(false);

      const result = AuthService.clearAuthData();

      expect(result).toBe(false);
      expect(console.warn).toHaveBeenCalledWith('localStorage is not available - cannot clear authentication data');
      expect(authUtils.removeLocalStorageItem).not.toHaveBeenCalled();
    });

    it('should handle removal errors gracefully', () => {
      authUtils.isLocalStorageAvailable.mockReturnValue(true);
      authUtils.removeLocalStorageItem.mockImplementation(() => {
        throw new Error('Storage error');
      });

      const result = AuthService.clearAuthData();

      expect(result).toBe(false);
      expect(console.warn).toHaveBeenCalledWith('Failed to clear authentication data:', expect.any(Error));
    });
  });

  describe('storeToken', () => {
    const validToken = {
      value: 'test-token-value',
      timestamp: Date.now(),
      username: 'testuser'
    };

    it('should store token successfully when localStorage is available', () => {
      authUtils.isLocalStorageAvailable.mockReturnValue(true);
      authUtils.setLocalStorageJSON.mockReturnValue(true);

      expect(() => AuthService.storeToken(validToken)).not.toThrow();
      expect(authUtils.setLocalStorageJSON).toHaveBeenCalledWith('auth_token', validToken);
    });

    it('should throw STORAGE_UNAVAILABLE error when localStorage is not available', () => {
      authUtils.isLocalStorageAvailable.mockReturnValue(false);

      expect(() => AuthService.storeToken(validToken)).toThrow('localStorage is not available - browser storage may be disabled');
      
      try {
        AuthService.storeToken(validToken);
      } catch (error) {
        expect(error.type).toBe('STORAGE_UNAVAILABLE');
      }
    });

    it('should throw STORAGE_QUOTA_EXCEEDED error when storage fails', () => {
      authUtils.isLocalStorageAvailable.mockReturnValue(true);
      authUtils.setLocalStorageJSON.mockReturnValue(false);

      let caughtError;
      try {
        AuthService.storeToken(validToken);
      } catch (error) {
        caughtError = error;
      }

      expect(caughtError).toBeDefined();
      expect(caughtError.message).toBe('Unable to store authentication data - storage may be full or restricted');
      expect(caughtError.type).toBe('STORAGE_QUOTA_EXCEEDED');
    });

    it('should handle QuotaExceededError', () => {
      authUtils.isLocalStorageAvailable.mockReturnValue(true);
      const quotaError = new Error('Quota exceeded');
      quotaError.name = 'QuotaExceededError';
      authUtils.setLocalStorageJSON.mockImplementation(() => {
        throw quotaError;
      });

      expect(() => AuthService.storeToken(validToken)).toThrow('Browser storage is full - please clear some data and try again');
      
      try {
        AuthService.storeToken(validToken);
      } catch (error) {
        expect(error.type).toBe('STORAGE_QUOTA_EXCEEDED');
      }
    });

    it('should handle SecurityError', () => {
      authUtils.isLocalStorageAvailable.mockReturnValue(true);
      const securityError = new Error('Security error');
      securityError.name = 'SecurityError';
      authUtils.setLocalStorageJSON.mockImplementation(() => {
        throw securityError;
      });

      expect(() => AuthService.storeToken(validToken)).toThrow('Browser storage access is restricted - please check your privacy settings');
      
      try {
        AuthService.storeToken(validToken);
      } catch (error) {
        expect(error.type).toBe('STORAGE_SECURITY_ERROR');
      }
    });

    it('should handle unknown storage errors', () => {
      authUtils.isLocalStorageAvailable.mockReturnValue(true);
      const unknownError = new Error('Unknown error');
      authUtils.setLocalStorageJSON.mockImplementation(() => {
        throw unknownError;
      });

      expect(() => AuthService.storeToken(validToken)).toThrow('Failed to save authentication data - please try again');
      
      try {
        AuthService.storeToken(validToken);
      } catch (error) {
        expect(error.type).toBe('STORAGE_UNKNOWN_ERROR');
        expect(error.originalError).toBe(unknownError);
      }
    });
  });

  describe('getStoredToken', () => {
    const validToken = {
      value: 'test-token-value',
      timestamp: Date.now(),
      username: 'testuser'
    };

    it('should return valid token when found in localStorage', () => {
      authUtils.isLocalStorageAvailable.mockReturnValue(true);
      authUtils.getLocalStorageJSON.mockReturnValue(validToken);

      const result = AuthService.getStoredToken();

      expect(result).toEqual(validToken);
      expect(authUtils.getLocalStorageJSON).toHaveBeenCalledWith('auth_token');
    });

    it('should return null when no token found', () => {
      authUtils.isLocalStorageAvailable.mockReturnValue(true);
      authUtils.getLocalStorageJSON.mockReturnValue(null);

      const result = AuthService.getStoredToken();

      expect(result).toBeNull();
    });

    it('should return null when token is invalid', () => {
      authUtils.isLocalStorageAvailable.mockReturnValue(true);
      authUtils.getLocalStorageJSON.mockReturnValue({ invalid: 'token' });

      const result = AuthService.getStoredToken();

      expect(result).toBeNull();
    });

    it('should throw STORAGE_UNAVAILABLE error when localStorage is not available', () => {
      authUtils.isLocalStorageAvailable.mockReturnValue(false);

      expect(() => AuthService.getStoredToken()).toThrow('localStorage is not available - cannot retrieve authentication token');
      
      try {
        AuthService.getStoredToken();
      } catch (error) {
        expect(error.type).toBe('STORAGE_UNAVAILABLE');
      }
    });

    it('should handle corrupted token data gracefully', () => {
      authUtils.isLocalStorageAvailable.mockReturnValue(true);
      authUtils.getLocalStorageJSON.mockImplementation(() => {
        throw new Error('Corrupted data');
      });
      authUtils.removeLocalStorageItem.mockReturnValue(true);

      const result = AuthService.getStoredToken();

      expect(result).toBeNull();
      expect(console.warn).toHaveBeenCalledWith('Corrupted authentication token detected, clearing storage');
      expect(authUtils.removeLocalStorageItem).toHaveBeenCalledWith('auth_token');
    });
  });

  describe('isAuthenticated', () => {
    const validToken = {
      value: 'test-token-value',
      timestamp: Date.now(),
      username: 'testuser'
    };

    it('should return true when valid token exists', () => {
      authUtils.isLocalStorageAvailable.mockReturnValue(true);
      authUtils.getLocalStorageJSON.mockReturnValue(validToken);

      const result = AuthService.isAuthenticated();

      expect(result).toBe(true);
    });

    it('should return false when no token exists', () => {
      authUtils.isLocalStorageAvailable.mockReturnValue(true);
      authUtils.getLocalStorageJSON.mockReturnValue(null);

      const result = AuthService.isAuthenticated();

      expect(result).toBe(false);
    });

    it('should return false when token is invalid', () => {
      authUtils.isLocalStorageAvailable.mockReturnValue(true);
      authUtils.getLocalStorageJSON.mockReturnValue({ invalid: 'token' });

      const result = AuthService.isAuthenticated();

      expect(result).toBe(false);
    });

    it('should re-throw STORAGE_UNAVAILABLE errors', () => {
      authUtils.isLocalStorageAvailable.mockReturnValue(false);

      expect(() => AuthService.isAuthenticated()).toThrow('localStorage is not available - cannot retrieve authentication token');
    });

    it('should return false for other errors', () => {
      // Mock getStoredToken to throw a non-STORAGE_UNAVAILABLE error
      vi.spyOn(AuthService, 'getStoredToken').mockImplementation(() => {
        const error = new Error('Other error');
        error.type = 'OTHER_ERROR';
        throw error;
      });

      const result = AuthService.isAuthenticated();

      expect(result).toBe(false);
      expect(console.warn).toHaveBeenCalledWith('Error checking authentication status:', expect.any(Error));
    });
  });
});