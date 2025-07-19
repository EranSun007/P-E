/**
 * Tests for User entity integration with authentication system
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { User } from '../entities.js';

// Mock the AuthService
vi.mock('../../services/authService.js', () => ({
  default: {
    getStoredToken: vi.fn(),
    clearAuthData: vi.fn()
  }
}));

describe('User Entity', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('me()', () => {
    it('should return user data when valid token exists', async () => {
      const mockToken = {
        username: 'admin',
        timestamp: Date.now(),
        value: 'mock-token'
      };

      const { default: AuthService } = await import('../../services/authService.js');
      AuthService.getStoredToken.mockReturnValue(mockToken);

      const userData = await User.me();

      expect(userData).toEqual({
        id: 'local-user',
        name: 'Administrator',
        username: 'admin',
        isAuthenticated: true,
        loginTime: new Date(mockToken.timestamp).toISOString()
      });
    });

    it('should return capitalized username for non-admin users', async () => {
      const mockToken = {
        username: 'testuser',
        timestamp: Date.now(),
        value: 'mock-token'
      };

      const { default: AuthService } = await import('../../services/authService.js');
      AuthService.getStoredToken.mockReturnValue(mockToken);

      const userData = await User.me();

      expect(userData.name).toBe('Testuser');
      expect(userData.username).toBe('testuser');
    });

    it('should throw error when no token exists', async () => {
      const { default: AuthService } = await import('../../services/authService.js');
      AuthService.getStoredToken.mockReturnValue(null);

      await expect(User.me()).rejects.toThrow('No authenticated user found');
    });
  });

  describe('logout()', () => {
    it('should clear auth data and return true', async () => {
      const { default: AuthService } = await import('../../services/authService.js');
      
      const result = await User.logout();

      expect(AuthService.clearAuthData).toHaveBeenCalled();
      expect(result).toBe(true);
    });
  });
});