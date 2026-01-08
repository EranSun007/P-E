/**
 * Authentication Error Handling Tests
 * Tests for comprehensive error handling in authentication system
 */

import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { AuthProvider, useAuth } from '../../../contexts/AuthContext.jsx';
import AuthService from '../../../services/authService.js';

// Mock AuthService
vi.mock('../../../services/authService.js');

// Test component for error scenarios
const ErrorTestComponent = () => {
  const { isAuthenticated, login, logout, loading, error, clearError } = useAuth();
  const [loginResult, setLoginResult] = React.useState(null);
  
  const handleLogin = async (username = 'admin', password = 'password123') => {
    const result = await login(username, password);
    setLoginResult(result);
  };
  
  return (
    <div>
      <div data-testid="auth-loading">{loading.toString()}</div>
      <div data-testid="auth-authenticated">{isAuthenticated.toString()}</div>
      <div data-testid="auth-error">{error || 'no-error'}</div>
      
      <button data-testid="login-valid" onClick={() => handleLogin()}>
        Login Valid
      </button>
      <button data-testid="login-invalid" onClick={() => handleLogin('wrong', 'wrong')}>
        Login Invalid
      </button>
      <button data-testid="login-empty" onClick={() => handleLogin('', '')}>
        Login Empty
      </button>
      <button data-testid="logout-btn" onClick={logout}>
        Logout
      </button>
      <button data-testid="clear-error" onClick={clearError}>
        Clear Error
      </button>
      
      {loginResult && (
        <div data-testid="login-result">
          {loginResult.success ? 'success' : loginResult.error}
        </div>
      )}
    </div>
  );
};

describe('Authentication Error Handling Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Initialization Errors', () => {
    it('should handle storage unavailable during initialization', async () => {
      // Mock storage unavailable error
      const storageError = new Error('localStorage is not available');
      storageError.type = 'STORAGE_UNAVAILABLE';
      AuthService.isAuthenticated.mockImplementation(() => {
        throw storageError;
      });

      render(
        <AuthProvider>
          <ErrorTestComponent />
        </AuthProvider>
      );

      // Should handle error and show appropriate message
      await waitFor(() => {
        expect(screen.getByTestId('auth-loading')).toHaveTextContent('false');
        expect(screen.getByTestId('auth-authenticated')).toHaveTextContent('false');
        expect(screen.getByTestId('auth-error')).toHaveTextContent(
          expect.stringContaining('Browser storage is not available')
        );
      });

      expect(console.error).toHaveBeenCalledWith(
        'Failed to initialize authentication state:',
        storageError
      );
    });

    it('should handle security errors during initialization', async () => {
      const securityError = new Error('Storage access restricted');
      securityError.type = 'STORAGE_SECURITY_ERROR';
      AuthService.isAuthenticated.mockImplementation(() => {
        throw securityError;
      });

      render(
        <AuthProvider>
          <ErrorTestComponent />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('auth-error')).toHaveTextContent(
          expect.stringContaining('Browser storage access is restricted')
        );
      });
    });

    it('should handle unknown initialization errors', async () => {
      const unknownError = new Error('Unknown initialization error');
      AuthService.isAuthenticated.mockImplementation(() => {
        throw unknownError;
      });

      render(
        <AuthProvider>
          <ErrorTestComponent />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('auth-error')).toHaveTextContent(
          'Failed to initialize authentication. Please refresh the page.'
        );
      });
    });

    it('should handle localStorage message-based errors (backward compatibility)', async () => {
      const legacyError = new Error('localStorage is disabled in this browser');
      AuthService.isAuthenticated.mockImplementation(() => {
        throw legacyError;
      });

      render(
        <AuthProvider>
          <ErrorTestComponent />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('auth-error')).toHaveTextContent(
          expect.stringContaining('Browser storage is not available')
        );
      });
    });
  });

  describe('Login Errors', () => {
    beforeEach(() => {
      // Setup default mocks for successful initialization
      AuthService.isAuthenticated.mockReturnValue(false);
    });

    it('should handle invalid credentials error', async () => {
      AuthService.validateCredentials.mockReturnValue(false);

      render(
        <AuthProvider>
          <ErrorTestComponent />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('auth-loading')).toHaveTextContent('false');
      });

      // Attempt login with invalid credentials
      await act(async () => {
        screen.getByTestId('login-invalid').click();
      });

      await waitFor(() => {
        expect(screen.getByTestId('login-result')).toHaveTextContent(
          'Invalid username or password'
        );
      });
    });

    it('should handle empty credentials validation', async () => {
      render(
        <AuthProvider>
          <ErrorTestComponent />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('auth-loading')).toHaveTextContent('false');
      });

      // Attempt login with empty credentials
      await act(async () => {
        screen.getByTestId('login-empty').click();
      });

      await waitFor(() => {
        expect(screen.getByTestId('login-result')).toHaveTextContent(
          'Please fill in all fields'
        );
      });
    });

    it('should handle storage unavailable during login', async () => {
      AuthService.validateCredentials.mockReturnValue(true);
      AuthService.generateToken.mockReturnValue({
        value: 'test-token',
        timestamp: Date.now(),
        username: 'admin'
      });
      
      const storageError = new Error('Storage unavailable');
      storageError.type = 'STORAGE_UNAVAILABLE';
      AuthService.storeToken.mockImplementation(() => {
        throw storageError;
      });

      render(
        <AuthProvider>
          <ErrorTestComponent />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('auth-loading')).toHaveTextContent('false');
      });

      await act(async () => {
        screen.getByTestId('login-valid').click();
      });

      await waitFor(() => {
        expect(screen.getByTestId('login-result')).toHaveTextContent(
          'Browser storage is disabled. Please enable cookies and local storage'
        );
      });
    });

    it('should handle quota exceeded during login', async () => {
      AuthService.validateCredentials.mockReturnValue(true);
      AuthService.generateToken.mockReturnValue({
        value: 'test-token',
        timestamp: Date.now(),
        username: 'admin'
      });
      
      const quotaError = new Error('Quota exceeded');
      quotaError.type = 'STORAGE_QUOTA_EXCEEDED';
      AuthService.storeToken.mockImplementation(() => {
        throw quotaError;
      });

      render(
        <AuthProvider>
          <ErrorTestComponent />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('auth-loading')).toHaveTextContent('false');
      });

      await act(async () => {
        screen.getByTestId('login-valid').click();
      });

      await waitFor(() => {
        expect(screen.getByTestId('login-result')).toHaveTextContent(
          'Browser storage is full. Please clear some browser data and try again.'
        );
      });
    });

    it('should handle security errors during login', async () => {
      AuthService.validateCredentials.mockReturnValue(true);
      AuthService.generateToken.mockReturnValue({
        value: 'test-token',
        timestamp: Date.now(),
        username: 'admin'
      });
      
      const securityError = new Error('Security error');
      securityError.type = 'STORAGE_SECURITY_ERROR';
      AuthService.storeToken.mockImplementation(() => {
        throw securityError;
      });

      render(
        <AuthProvider>
          <ErrorTestComponent />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('auth-loading')).toHaveTextContent('false');
      });

      await act(async () => {
        screen.getByTestId('login-valid').click();
      });

      await waitFor(() => {
        expect(screen.getByTestId('login-result')).toHaveTextContent(
          'Browser storage access is restricted. Please check your privacy settings and try again.'
        );
      });
    });

    it('should handle unknown storage errors during login', async () => {
      AuthService.validateCredentials.mockReturnValue(true);
      AuthService.generateToken.mockReturnValue({
        value: 'test-token',
        timestamp: Date.now(),
        username: 'admin'
      });
      
      const unknownError = new Error('Unknown storage error');
      unknownError.type = 'STORAGE_UNKNOWN_ERROR';
      AuthService.storeToken.mockImplementation(() => {
        throw unknownError;
      });

      render(
        <AuthProvider>
          <ErrorTestComponent />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('auth-loading')).toHaveTextContent('false');
      });

      await act(async () => {
        screen.getByTestId('login-valid').click();
      });

      await waitFor(() => {
        expect(screen.getByTestId('login-result')).toHaveTextContent(
          'Unable to save login session. Please try again or contact support.'
        );
      });
    });

    it('should handle legacy localStorage errors (backward compatibility)', async () => {
      AuthService.validateCredentials.mockReturnValue(true);
      AuthService.generateToken.mockReturnValue({
        value: 'test-token',
        timestamp: Date.now(),
        username: 'admin'
      });
      
      const legacyError = new Error('localStorage is not available');
      AuthService.storeToken.mockImplementation(() => {
        throw legacyError;
      });

      render(
        <AuthProvider>
          <ErrorTestComponent />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('auth-loading')).toHaveTextContent('false');
      });

      await act(async () => {
        screen.getByTestId('login-valid').click();
      });

      await waitFor(() => {
        expect(screen.getByTestId('login-result')).toHaveTextContent(
          'Unable to save login session. Please check your browser settings.'
        );
      });
    });
  });

  describe('Logout Errors', () => {
    beforeEach(() => {
      // Setup authenticated state
      AuthService.isAuthenticated.mockReturnValue(true);
    });

    it('should handle logout when storage clearing fails', async () => {
      AuthService.clearAuthData.mockReturnValue(false);

      render(
        <AuthProvider>
          <ErrorTestComponent />
        </AuthProvider>
      );

      // Wait for authenticated state
      await waitFor(() => {
        expect(screen.getByTestId('auth-authenticated')).toHaveTextContent('true');
      });

      // Attempt logout
      await act(async () => {
        screen.getByTestId('logout-btn').click();
      });

      // Should still logout user despite storage error
      await waitFor(() => {
        expect(screen.getByTestId('auth-authenticated')).toHaveTextContent('false');
      });

      // In development mode, should show warning
      if (process.env.NODE_ENV === 'development') {
        expect(screen.getByTestId('auth-error')).toHaveTextContent(
          expect.stringContaining('Unable to clear browser storage')
        );
      }
    });

    it('should handle logout storage exceptions', async () => {
      const logoutError = new Error('Logout storage error');
      logoutError.type = 'STORAGE_UNAVAILABLE';
      AuthService.clearAuthData.mockImplementation(() => {
        throw logoutError;
      });

      render(
        <AuthProvider>
          <ErrorTestComponent />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('auth-authenticated')).toHaveTextContent('true');
      });

      await act(async () => {
        screen.getByTestId('logout-btn').click();
      });

      // Should still logout despite error
      await waitFor(() => {
        expect(screen.getByTestId('auth-authenticated')).toHaveTextContent('false');
      });

      expect(console.error).toHaveBeenCalledWith('Logout failed:', logoutError);
    });
  });

  describe('Error Recovery', () => {
    it('should allow clearing errors manually', async () => {
      const storageError = new Error('Storage error');
      storageError.type = 'STORAGE_UNAVAILABLE';
      AuthService.isAuthenticated.mockImplementation(() => {
        throw storageError;
      });

      render(
        <AuthProvider>
          <ErrorTestComponent />
        </AuthProvider>
      );

      // Wait for error to appear
      await waitFor(() => {
        expect(screen.getByTestId('auth-error')).not.toHaveTextContent('no-error');
      });

      // Clear error
      await act(async () => {
        screen.getByTestId('clear-error').click();
      });

      // Error should be cleared
      expect(screen.getByTestId('auth-error')).toHaveTextContent('no-error');
    });

    it('should clear errors on successful login', async () => {
      // Start with initialization error
      const initError = new Error('Init error');
      AuthService.isAuthenticated.mockImplementationOnce(() => {
        throw initError;
      });

      render(
        <AuthProvider>
          <ErrorTestComponent />
        </AuthProvider>
      );

      // Wait for error
      await waitFor(() => {
        expect(screen.getByTestId('auth-error')).not.toHaveTextContent('no-error');
      });

      // Setup successful login
      AuthService.validateCredentials.mockReturnValue(true);
      AuthService.generateToken.mockReturnValue({
        value: 'test-token',
        timestamp: Date.now(),
        username: 'admin'
      });
      AuthService.storeToken.mockImplementation(() => {});

      // Attempt login
      await act(async () => {
        screen.getByTestId('login-valid').click();
      });

      // Error should be cleared and user authenticated
      await waitFor(() => {
        expect(screen.getByTestId('auth-error')).toHaveTextContent('no-error');
        expect(screen.getByTestId('auth-authenticated')).toHaveTextContent('true');
      });
    });

    it('should handle rapid error state changes', async () => {
      let shouldThrow = true;
      AuthService.isAuthenticated.mockImplementation(() => {
        if (shouldThrow) {
          throw new Error('Intermittent error');
        }
        return false;
      });

      const { rerender } = render(
        <AuthProvider>
          <ErrorTestComponent />
        </AuthProvider>
      );

      // Wait for error
      await waitFor(() => {
        expect(screen.getByTestId('auth-error')).not.toHaveTextContent('no-error');
      });

      // Stop throwing error
      shouldThrow = false;

      // Re-render
      rerender(
        <AuthProvider>
          <ErrorTestComponent />
        </AuthProvider>
      );

      // Should recover from error
      await waitFor(() => {
        expect(screen.getByTestId('auth-error')).toHaveTextContent('no-error');
        expect(screen.getByTestId('auth-authenticated')).toHaveTextContent('false');
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle null/undefined login parameters gracefully', async () => {
      AuthService.isAuthenticated.mockReturnValue(false);

      const NullTestComponent = () => {
        const { login } = useAuth();
        const [result, setResult] = React.useState(null);
        
        const handleNullLogin = async () => {
          const loginResult = await login(null, undefined);
          setResult(loginResult);
        };
        
        return (
          <div>
            <button data-testid="null-login" onClick={handleNullLogin}>
              Null Login
            </button>
            {result && (
              <div data-testid="null-result">
                {result.success ? 'success' : result.error}
              </div>
            )}
          </div>
        );
      };

      render(
        <AuthProvider>
          <NullTestComponent />
        </AuthProvider>
      );

      await act(async () => {
        screen.getByTestId('null-login').click();
      });

      await waitFor(() => {
        expect(screen.getByTestId('null-result')).toHaveTextContent(
          'Please fill in all fields'
        );
      });
    });

    it('should handle concurrent login attempts', async () => {
      AuthService.isAuthenticated.mockReturnValue(false);
      AuthService.validateCredentials.mockReturnValue(true);
      AuthService.generateToken.mockReturnValue({
        value: 'concurrent-token',
        timestamp: Date.now(),
        username: 'admin'
      });
      AuthService.storeToken.mockImplementation(() => {
        // Simulate slow storage operation
        return new Promise(resolve => setTimeout(resolve, 100));
      });

      const ConcurrentTestComponent = () => {
        const { login } = useAuth();
        const [results, setResults] = React.useState([]);
        
        const handleConcurrentLogin = async () => {
          const promises = [
            login('admin', 'password123'),
            login('admin', 'password123'),
            login('admin', 'password123')
          ];
          
          const loginResults = await Promise.all(promises);
          setResults(loginResults);
        };
        
        return (
          <div>
            <button data-testid="concurrent-login" onClick={handleConcurrentLogin}>
              Concurrent Login
            </button>
            <div data-testid="concurrent-results">
              {results.map((result, index) => (
                <div key={index}>{result.success ? 'success' : result.error}</div>
              ))}
            </div>
          </div>
        );
      };

      render(
        <AuthProvider>
          <ConcurrentTestComponent />
        </AuthProvider>
      );

      await act(async () => {
        screen.getByTestId('concurrent-login').click();
      });

      // All attempts should succeed (or handle gracefully)
      await waitFor(() => {
        const results = screen.getByTestId('concurrent-results');
        expect(results.children).toHaveLength(3);
      }, { timeout: 1000 });
    });
  });
});