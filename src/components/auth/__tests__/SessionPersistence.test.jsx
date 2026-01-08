/**
 * Session Persistence Tests
 * Tests for authentication state persistence across page refreshes and browser sessions
 */

import React from 'react';
import { render, screen, waitFor, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { AuthProvider, useAuth } from '../../../contexts/AuthContext.jsx';
import AuthService from '../../../services/authService.js';

// Mock localStorage with more realistic behavior
const createLocalStorageMock = () => {
  let store = {};
  return {
    getItem: vi.fn((key) => store[key] || null),
    setItem: vi.fn((key, value) => {
      store[key] = value.toString();
    }),
    removeItem: vi.fn((key) => {
      delete store[key];
    }),
    clear: vi.fn(() => {
      store = {};
    }),
    get length() {
      return Object.keys(store).length;
    },
    key: vi.fn((index) => Object.keys(store)[index] || null),
    // Helper to get current store state
    _getStore: () => ({ ...store }),
    _setStore: (newStore) => { store = { ...newStore }; }
  };
};

// Test component to monitor auth state
const AuthStateMonitor = ({ onStateChange }) => {
  const { isAuthenticated, loading, error } = useAuth();
  
  React.useEffect(() => {
    if (onStateChange) {
      onStateChange({ isAuthenticated, loading, error });
    }
  }, [isAuthenticated, loading, error, onStateChange]);
  
  return (
    <div>
      <div data-testid="auth-loading">{loading.toString()}</div>
      <div data-testid="auth-authenticated">{isAuthenticated.toString()}</div>
      <div data-testid="auth-error">{error || 'no-error'}</div>
    </div>
  );
};

describe('Session Persistence Tests', () => {
  let localStorageMock;

  beforeEach(() => {
    localStorageMock = createLocalStorageMock();
    Object.defineProperty(window, 'localStorage', {
      value: localStorageMock,
      writable: true
    });
    
    vi.clearAllMocks();
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Token Persistence', () => {
    it('should persist authentication state across component remounts', async () => {
      // Create valid token
      const validToken = {
        value: 'persistent-token-123',
        timestamp: Date.now(),
        username: 'admin'
      };
      
      // Store token in localStorage
      localStorageMock.setItem('auth_token', JSON.stringify(validToken));

      // First render - should restore from localStorage
      const { unmount } = render(
        <AuthProvider>
          <AuthStateMonitor />
        </AuthProvider>
      );

      // Wait for initialization
      await waitFor(() => {
        expect(screen.getByTestId('auth-loading')).toHaveTextContent('false');
        expect(screen.getByTestId('auth-authenticated')).toHaveTextContent('true');
      });

      // Verify localStorage was accessed
      expect(localStorageMock.getItem).toHaveBeenCalledWith('auth_token');

      // Unmount component (simulating page navigation)
      unmount();

      // Re-render component (simulating page return)
      render(
        <AuthProvider>
          <AuthStateMonitor />
        </AuthProvider>
      );

      // Should restore authentication state again
      await waitFor(() => {
        expect(screen.getByTestId('auth-loading')).toHaveTextContent('false');
        expect(screen.getByTestId('auth-authenticated')).toHaveTextContent('true');
      });

      // Verify localStorage was accessed again
      expect(localStorageMock.getItem).toHaveBeenCalledTimes(2);
    });

    it('should handle token expiration gracefully', async () => {
      // Create expired token (this implementation doesn't actually expire tokens,
      // but we test the structure for future enhancement)
      const expiredToken = {
        value: 'expired-token-123',
        timestamp: Date.now() - (24 * 60 * 60 * 1000), // 24 hours ago
        username: 'admin'
      };
      
      localStorageMock.setItem('auth_token', JSON.stringify(expiredToken));

      render(
        <AuthProvider>
          <AuthStateMonitor />
        </AuthProvider>
      );

      // Current implementation doesn't expire tokens, so should still be authenticated
      // This test documents current behavior and can be updated when expiration is added
      await waitFor(() => {
        expect(screen.getByTestId('auth-loading')).toHaveTextContent('false');
        expect(screen.getByTestId('auth-authenticated')).toHaveTextContent('true');
      });
    });

    it('should clear invalid tokens and reset authentication state', async () => {
      // Store invalid token structure
      const invalidToken = {
        value: 'test-token',
        // missing timestamp and username
      };
      
      localStorageMock.setItem('auth_token', JSON.stringify(invalidToken));

      render(
        <AuthProvider>
          <AuthStateMonitor />
        </AuthProvider>
      );

      // Should not authenticate with invalid token
      await waitFor(() => {
        expect(screen.getByTestId('auth-loading')).toHaveTextContent('false');
        expect(screen.getByTestId('auth-authenticated')).toHaveTextContent('false');
      });
    });

    it('should handle multiple rapid initialization attempts', async () => {
      const validToken = {
        value: 'rapid-test-token',
        timestamp: Date.now(),
        username: 'admin'
      };
      
      localStorageMock.setItem('auth_token', JSON.stringify(validToken));

      // Render multiple providers rapidly
      const { unmount: unmount1 } = render(
        <AuthProvider>
          <AuthStateMonitor />
        </AuthProvider>
      );

      const { unmount: unmount2 } = render(
        <AuthProvider>
          <AuthStateMonitor />
        </AuthProvider>
      );

      // Wait for both to initialize
      await waitFor(() => {
        expect(screen.getAllByTestId('auth-loading')[0]).toHaveTextContent('false');
        expect(screen.getAllByTestId('auth-authenticated')[0]).toHaveTextContent('true');
      });

      unmount1();
      unmount2();

      // Final render should still work correctly
      render(
        <AuthProvider>
          <AuthStateMonitor />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('auth-loading')).toHaveTextContent('false');
        expect(screen.getByTestId('auth-authenticated')).toHaveTextContent('true');
      });
    });
  });

  describe('Storage Error Handling', () => {
    it('should handle localStorage quota exceeded during token storage', async () => {
      // Mock quota exceeded error
      localStorageMock.setItem.mockImplementation(() => {
        const error = new Error('QuotaExceededError');
        error.name = 'QuotaExceededError';
        throw error;
      });

      const TestLogin = () => {
        const { login } = useAuth();
        const [result, setResult] = React.useState(null);
        
        const handleLogin = async () => {
          const loginResult = await login('admin', 'password123');
          setResult(loginResult);
        };
        
        return (
          <div>
            <button data-testid="login-btn" onClick={handleLogin}>Login</button>
            {result && (
              <div data-testid="login-result">
                {result.success ? 'success' : result.error}
              </div>
            )}
          </div>
        );
      };

      render(
        <AuthProvider>
          <TestLogin />
        </AuthProvider>
      );

      // Wait for initialization
      await waitFor(() => {
        expect(screen.getByTestId('login-btn')).toBeInTheDocument();
      });

      // Attempt login
      await act(async () => {
        screen.getByTestId('login-btn').click();
      });

      // Should show quota exceeded error
      await waitFor(() => {
        expect(screen.getByTestId('login-result')).toHaveTextContent(
          'Browser storage is full'
        );
      });
    });

    it('should handle localStorage security errors', async () => {
      // Mock security error
      localStorageMock.getItem.mockImplementation(() => {
        const error = new Error('SecurityError');
        error.name = 'SecurityError';
        throw error;
      });

      const stateChanges = [];
      const handleStateChange = (state) => {
        stateChanges.push(state);
      };

      render(
        <AuthProvider>
          <AuthStateMonitor onStateChange={handleStateChange} />
        </AuthProvider>
      );

      // Should handle security error during initialization
      await waitFor(() => {
        expect(screen.getByTestId('auth-loading')).toHaveTextContent('false');
        expect(screen.getByTestId('auth-error')).not.toHaveTextContent('no-error');
      });

      // Should show appropriate error message
      expect(screen.getByTestId('auth-error')).toHaveTextContent(
        expect.stringContaining('Browser storage')
      );
    });

    it('should handle corrupted JSON data in localStorage', async () => {
      // Store corrupted JSON
      localStorageMock.setItem('auth_token', 'invalid-json-{corrupted');

      render(
        <AuthProvider>
          <AuthStateMonitor />
        </AuthProvider>
      );

      // Should handle corrupted data gracefully
      await waitFor(() => {
        expect(screen.getByTestId('auth-loading')).toHaveTextContent('false');
        expect(screen.getByTestId('auth-authenticated')).toHaveTextContent('false');
      });

      // Should have attempted to clear corrupted data
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('auth_token');
    });

    it('should handle localStorage completely disabled', async () => {
      // Mock localStorage as completely unavailable
      Object.defineProperty(window, 'localStorage', {
        value: undefined,
        writable: true
      });

      render(
        <AuthProvider>
          <AuthStateMonitor />
        </AuthProvider>
      );

      // Should handle missing localStorage gracefully
      await waitFor(() => {
        expect(screen.getByTestId('auth-loading')).toHaveTextContent('false');
        expect(screen.getByTestId('auth-error')).toHaveTextContent(
          expect.stringContaining('Browser storage')
        );
      });
    });
  });

  describe('Cross-Tab Synchronization', () => {
    it('should handle token changes from other tabs', async () => {
      // Initial render with no token
      render(
        <AuthProvider>
          <AuthStateMonitor />
        </AuthProvider>
      );

      // Wait for initialization
      await waitFor(() => {
        expect(screen.getByTestId('auth-loading')).toHaveTextContent('false');
        expect(screen.getByTestId('auth-authenticated')).toHaveTextContent('false');
      });

      // Simulate another tab setting a token
      const validToken = {
        value: 'cross-tab-token',
        timestamp: Date.now(),
        username: 'admin'
      };
      
      // Directly modify localStorage (simulating another tab)
      localStorageMock._setStore({
        'auth_token': JSON.stringify(validToken)
      });

      // Note: Current implementation doesn't listen for storage events
      // This test documents the current limitation and can be enhanced
      // when cross-tab synchronization is implemented
      
      // For now, verify that a new AuthProvider would pick up the change
      const { unmount } = render(
        <AuthProvider>
          <AuthStateMonitor />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getAllByTestId('auth-authenticated')[1]).toHaveTextContent('true');
      });

      unmount();
    });
  });

  describe('Memory Leak Prevention', () => {
    it('should clean up properly on unmount', async () => {
      const validToken = {
        value: 'cleanup-test-token',
        timestamp: Date.now(),
        username: 'admin'
      };
      
      localStorageMock.setItem('auth_token', JSON.stringify(validToken));

      const { unmount } = render(
        <AuthProvider>
          <AuthStateMonitor />
        </AuthProvider>
      );

      // Wait for initialization
      await waitFor(() => {
        expect(screen.getByTestId('auth-loading')).toHaveTextContent('false');
        expect(screen.getByTestId('auth-authenticated')).toHaveTextContent('true');
      });

      // Unmount should not cause errors
      expect(() => unmount()).not.toThrow();
    });

    it('should handle rapid mount/unmount cycles', async () => {
      const validToken = {
        value: 'rapid-mount-token',
        timestamp: Date.now(),
        username: 'admin'
      };
      
      localStorageMock.setItem('auth_token', JSON.stringify(validToken));

      // Rapid mount/unmount cycles
      for (let i = 0; i < 5; i++) {
        const { unmount } = render(
          <AuthProvider>
            <AuthStateMonitor />
          </AuthProvider>
        );
        
        // Quick unmount
        unmount();
      }

      // Final render should still work
      render(
        <AuthProvider>
          <AuthStateMonitor />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('auth-loading')).toHaveTextContent('false');
        expect(screen.getByTestId('auth-authenticated')).toHaveTextContent('true');
      });
    });
  });
});