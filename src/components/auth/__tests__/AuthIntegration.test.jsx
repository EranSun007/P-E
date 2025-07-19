/**
 * Authentication Integration Tests
 * Tests for complete login/logout flow and session persistence
 */

import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { AuthProvider, useAuth } from '../../../contexts/AuthContext.jsx';
import LoginForm from '../LoginForm.jsx';
import ProtectedRoute from '../ProtectedRoute.jsx';

// Mock localStorage
const localStorageMock = (() => {
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
    key: vi.fn((index) => Object.keys(store)[index] || null)
  };
})();

// Mock LoadingSpinner
vi.mock('../../ui/LoadingSpinner.jsx', () => ({
  default: () => <div data-testid="loading-spinner">Loading...</div>
}));

// Test component that uses auth context
const AuthTestComponent = () => {
  const { isAuthenticated, login, logout, loading, error } = useAuth();
  
  return (
    <div>
      <div data-testid="auth-status">
        {loading ? 'loading' : isAuthenticated ? 'authenticated' : 'not-authenticated'}
      </div>
      {error && <div data-testid="auth-error">{error}</div>}
      <button 
        data-testid="test-login" 
        onClick={() => login('admin', 'password123')}
      >
        Test Login
      </button>
      <button 
        data-testid="test-logout" 
        onClick={logout}
      >
        Test Logout
      </button>
    </div>
  );
};

// Protected content component
const ProtectedContent = () => (
  <div data-testid="protected-content">
    <h1>Protected Content</h1>
    <AuthTestComponent />
  </div>
);

describe('Authentication Integration Tests', () => {
  beforeEach(() => {
    // Setup localStorage mock
    Object.defineProperty(window, 'localStorage', {
      value: localStorageMock,
      writable: true
    });
    
    // Clear all mocks and localStorage
    vi.clearAllMocks();
    localStorageMock.clear();
    
    // Reset console methods
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Complete Login/Logout Flow', () => {
    it('should complete full authentication flow from login to logout', async () => {
      render(
        <AuthProvider>
          <ProtectedRoute>
            <ProtectedContent />
          </ProtectedRoute>
        </AuthProvider>
      );

      // Should start with loading state
      expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();

      // Wait for initialization to complete - should show login form
      await waitFor(() => {
        expect(screen.getByText('Sign In', { selector: 'div' })).toBeInTheDocument();
      });

      // Fill in login form
      const usernameInput = screen.getByLabelText('Username');
      const passwordInput = screen.getByLabelText('Password');
      const loginButton = screen.getByRole('button', { name: 'Sign In' });

      fireEvent.change(usernameInput, { target: { value: 'admin' } });
      fireEvent.change(passwordInput, { target: { value: 'password123' } });

      // Submit login form
      await act(async () => {
        fireEvent.click(loginButton);
      });

      // Should now show protected content
      await waitFor(() => {
        expect(screen.getByTestId('protected-content')).toBeInTheDocument();
        expect(screen.getByTestId('auth-status')).toHaveTextContent('authenticated');
      });

      // Verify token was stored in localStorage
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'auth_token',
        expect.stringContaining('"username":"admin"')
      );

      // Perform logout
      const logoutButton = screen.getByTestId('test-logout');
      await act(async () => {
        fireEvent.click(logoutButton);
      });

      // Should return to login form
      await waitFor(() => {
        expect(screen.getByText('Sign In', { selector: 'div' })).toBeInTheDocument();
        expect(screen.queryByTestId('protected-content')).not.toBeInTheDocument();
      });

      // Verify token was removed from localStorage
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('auth_token');
    });

    it('should handle invalid credentials during login flow', async () => {
      render(
        <AuthProvider>
          <ProtectedRoute>
            <ProtectedContent />
          </ProtectedRoute>
        </AuthProvider>
      );

      // Wait for login form to appear
      await waitFor(() => {
        expect(screen.getByText('Sign In', { selector: 'div' })).toBeInTheDocument();
      });

      // Fill in invalid credentials
      const usernameInput = screen.getByLabelText('Username');
      const passwordInput = screen.getByLabelText('Password');
      const loginButton = screen.getByRole('button', { name: 'Sign In' });

      fireEvent.change(usernameInput, { target: { value: 'wronguser' } });
      fireEvent.change(passwordInput, { target: { value: 'wrongpass' } });

      // Submit login form
      await act(async () => {
        fireEvent.click(loginButton);
      });

      // Should show error message and remain on login form
      await waitFor(() => {
        expect(screen.getByText('Invalid username or password')).toBeInTheDocument();
        expect(screen.getByText('Sign In', { selector: 'div' })).toBeInTheDocument();
        expect(screen.queryByTestId('protected-content')).not.toBeInTheDocument();
      });

      // Verify no token was stored
      expect(localStorageMock.setItem).not.toHaveBeenCalledWith(
        'auth_token',
        expect.any(String)
      );
    });

    it('should handle empty credentials validation', async () => {
      render(
        <AuthProvider>
          <ProtectedRoute>
            <ProtectedContent />
          </ProtectedRoute>
        </AuthProvider>
      );

      // Wait for login form
      await waitFor(() => {
        expect(screen.getByText('Sign In', { selector: 'div' })).toBeInTheDocument();
      });

      // Submit empty form
      const loginButton = screen.getByRole('button', { name: 'Sign In' });
      await act(async () => {
        fireEvent.click(loginButton);
      });

      // Should show validation errors
      await waitFor(() => {
        expect(screen.getByText('Username is required')).toBeInTheDocument();
        expect(screen.getByText('Password is required')).toBeInTheDocument();
      });
    });
  });

  describe('Session Persistence', () => {
    it('should restore authentication state from localStorage on page refresh', async () => {
      // Pre-populate localStorage with valid token
      const validToken = {
        value: 'test-token-123',
        timestamp: Date.now(),
        username: 'admin'
      };
      localStorageMock.setItem('auth_token', JSON.stringify(validToken));

      render(
        <AuthProvider>
          <ProtectedRoute>
            <ProtectedContent />
          </ProtectedRoute>
        </AuthProvider>
      );

      // Should start with loading
      expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();

      // Should restore authenticated state and show protected content
      await waitFor(() => {
        expect(screen.getByTestId('protected-content')).toBeInTheDocument();
        expect(screen.getByTestId('auth-status')).toHaveTextContent('authenticated');
      });

      // Verify localStorage was checked
      expect(localStorageMock.getItem).toHaveBeenCalledWith('auth_token');
    });

    it('should handle corrupted token data in localStorage', async () => {
      // Pre-populate localStorage with corrupted token
      localStorageMock.setItem('auth_token', 'corrupted-json-data');

      render(
        <AuthProvider>
          <ProtectedRoute>
            <ProtectedContent />
          </ProtectedRoute>
        </AuthProvider>
      );

      // Should show login form after handling corrupted data
      await waitFor(() => {
        expect(screen.getByText('Sign In', { selector: 'div' })).toBeInTheDocument();
      });

      // Should have cleared the corrupted data
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('auth_token');
    });

    it('should handle missing token properties in localStorage', async () => {
      // Pre-populate localStorage with incomplete token
      const incompleteToken = {
        value: 'test-token-123'
        // missing timestamp and username
      };
      localStorageMock.setItem('auth_token', JSON.stringify(incompleteToken));

      render(
        <AuthProvider>
          <ProtectedRoute>
            <ProtectedContent />
          </ProtectedRoute>
        </AuthProvider>
      );

      // Should show login form for invalid token
      await waitFor(() => {
        expect(screen.getByText('Sign In', { selector: 'div' })).toBeInTheDocument();
      });
    });

    it('should maintain authentication across component re-renders', async () => {
      const { rerender } = render(
        <AuthProvider>
          <ProtectedRoute>
            <ProtectedContent />
          </ProtectedRoute>
        </AuthProvider>
      );

      // Wait for login form
      await waitFor(() => {
        expect(screen.getByText('Sign In', { selector: 'div' })).toBeInTheDocument();
      });

      // Login
      const usernameInput = screen.getByLabelText('Username');
      const passwordInput = screen.getByLabelText('Password');
      const loginButton = screen.getByRole('button', { name: 'Sign In' });

      fireEvent.change(usernameInput, { target: { value: 'admin' } });
      fireEvent.change(passwordInput, { target: { value: 'password123' } });

      await act(async () => {
        fireEvent.click(loginButton);
      });

      // Verify authenticated
      await waitFor(() => {
        expect(screen.getByTestId('protected-content')).toBeInTheDocument();
      });

      // Re-render component
      rerender(
        <AuthProvider>
          <ProtectedRoute>
            <ProtectedContent />
          </ProtectedRoute>
        </AuthProvider>
      );

      // Should maintain authentication state
      expect(screen.getByTestId('protected-content')).toBeInTheDocument();
      expect(screen.getByTestId('auth-status')).toHaveTextContent('authenticated');
    });
  });

  describe('Route Protection Behavior', () => {
    it('should protect routes and redirect to login when not authenticated', async () => {
      render(
        <AuthProvider>
          <ProtectedRoute>
            <ProtectedContent />
          </ProtectedRoute>
        </AuthProvider>
      );

      // Should show login form instead of protected content
      await waitFor(() => {
        expect(screen.getByText('Sign In', { selector: 'div' })).toBeInTheDocument();
        expect(screen.queryByTestId('protected-content')).not.toBeInTheDocument();
      });
    });

    it('should allow access to protected routes when authenticated', async () => {
      // Pre-authenticate user
      const validToken = {
        value: 'test-token-123',
        timestamp: Date.now(),
        username: 'admin'
      };
      localStorageMock.setItem('auth_token', JSON.stringify(validToken));

      render(
        <AuthProvider>
          <ProtectedRoute>
            <ProtectedContent />
          </ProtectedRoute>
        </AuthProvider>
      );

      // Should show protected content
      await waitFor(() => {
        expect(screen.getByTestId('protected-content')).toBeInTheDocument();
        expect(screen.queryByText('Sign In', { selector: 'div' })).not.toBeInTheDocument();
      });
    });

    it('should handle multiple protected routes correctly', async () => {
      const MultipleRoutes = () => (
        <AuthProvider>
          <ProtectedRoute>
            <div data-testid="route-1">Route 1</div>
          </ProtectedRoute>
          <ProtectedRoute>
            <div data-testid="route-2">Route 2</div>
          </ProtectedRoute>
        </AuthProvider>
      );

      render(<MultipleRoutes />);

      // Should show login forms for both routes when not authenticated
      await waitFor(() => {
        const loginForms = screen.getAllByText('Sign In', { selector: 'div' });
        expect(loginForms).toHaveLength(2);
        expect(screen.queryByTestId('route-1')).not.toBeInTheDocument();
        expect(screen.queryByTestId('route-2')).not.toBeInTheDocument();
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle localStorage unavailable during login', async () => {
      // Mock localStorage as unavailable
      Object.defineProperty(window, 'localStorage', {
        value: {
          getItem: vi.fn(() => { throw new Error('localStorage disabled'); }),
          setItem: vi.fn(() => { throw new Error('localStorage disabled'); }),
          removeItem: vi.fn(() => { throw new Error('localStorage disabled'); })
        },
        writable: true
      });

      render(
        <AuthProvider>
          <AuthTestComponent />
        </AuthProvider>
      );

      // Wait for initialization
      await waitFor(() => {
        expect(screen.getByTestId('auth-status')).toHaveTextContent('not-authenticated');
      });

      // Attempt login
      const loginButton = screen.getByTestId('test-login');
      await act(async () => {
        fireEvent.click(loginButton);
      });

      // Should show storage error
      await waitFor(() => {
        expect(screen.getByTestId('auth-error')).toHaveTextContent(
          expect.stringContaining('Browser storage')
        );
      });
    });

    it('should handle authentication initialization errors', async () => {
      // Mock localStorage to throw during initialization
      localStorageMock.getItem.mockImplementation(() => {
        throw new Error('Storage initialization error');
      });

      render(
        <AuthProvider>
          <AuthTestComponent />
        </AuthProvider>
      );

      // Should handle error gracefully and show not authenticated
      await waitFor(() => {
        expect(screen.getByTestId('auth-status')).toHaveTextContent('not-authenticated');
      });

      // Should log error
      expect(console.error).toHaveBeenCalledWith(
        'Failed to initialize authentication state:',
        expect.any(Error)
      );
    });

    it('should handle logout errors gracefully', async () => {
      // Pre-authenticate user
      const validToken = {
        value: 'test-token-123',
        timestamp: Date.now(),
        username: 'admin'
      };
      localStorageMock.setItem('auth_token', JSON.stringify(validToken));

      render(
        <AuthProvider>
          <AuthTestComponent />
        </AuthProvider>
      );

      // Wait for authentication
      await waitFor(() => {
        expect(screen.getByTestId('auth-status')).toHaveTextContent('authenticated');
      });

      // Mock localStorage error during logout
      localStorageMock.removeItem.mockImplementation(() => {
        throw new Error('Logout storage error');
      });

      // Attempt logout
      const logoutButton = screen.getByTestId('test-logout');
      await act(async () => {
        fireEvent.click(logoutButton);
      });

      // Should still logout user despite storage error
      await waitFor(() => {
        expect(screen.getByTestId('auth-status')).toHaveTextContent('not-authenticated');
      });
    });
  });
});