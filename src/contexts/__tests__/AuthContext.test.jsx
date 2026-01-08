/**
 * AuthContext Tests
 * Tests for authentication context and provider functionality
 */

import React from 'react';
import { render, screen, act, waitFor } from '@testing-library/react';
import { vi, describe, test, expect, beforeEach } from 'vitest';
import { AuthProvider, useAuth } from '../AuthContext.jsx';
import AuthService from '../../services/authService.js';

// Mock AuthService
vi.mock('../../services/authService.js');

// Test component to access auth context
const TestComponent = () => {
  const { isAuthenticated, login, logout, loading } = useAuth();
  
  return (
    <div>
      <div data-testid="loading">{loading ? 'loading' : 'not-loading'}</div>
      <div data-testid="authenticated">{isAuthenticated ? 'authenticated' : 'not-authenticated'}</div>
      <button data-testid="login-btn" onClick={() => login('admin', 'password123')}>
        Login
      </button>
      <button data-testid="logout-btn" onClick={logout}>
        Logout
      </button>
    </div>
  );
};

describe('AuthContext', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('should throw error when useAuth is used outside AuthProvider', () => {
    // Suppress console.error for this test
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    
    expect(() => {
      render(<TestComponent />);
    }).toThrow('useAuth must be used within an AuthProvider');
    
    consoleSpy.mockRestore();
  });

  test('should initialize authentication state from AuthService', async () => {
    AuthService.isAuthenticated.mockReturnValue(true);
    
    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    // Should start with loading state
    expect(screen.getByTestId('loading')).toHaveTextContent('loading');
    
    // Wait for initialization to complete
    await waitFor(() => {
      expect(screen.getByTestId('loading')).toHaveTextContent('not-loading');
    });
    
    expect(screen.getByTestId('authenticated')).toHaveTextContent('authenticated');
    expect(AuthService.isAuthenticated).toHaveBeenCalled();
  });

  test('should handle login successfully', async () => {
    AuthService.isAuthenticated.mockReturnValue(false);
    AuthService.validateCredentials.mockReturnValue(true);
    AuthService.generateToken.mockReturnValue({ value: 'test-token', timestamp: Date.now(), username: 'admin' });
    AuthService.storeToken.mockImplementation(() => {});
    
    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    // Wait for initialization
    await waitFor(() => {
      expect(screen.getByTestId('loading')).toHaveTextContent('not-loading');
    });

    // Should start as not authenticated
    expect(screen.getByTestId('authenticated')).toHaveTextContent('not-authenticated');

    // Perform login
    await act(async () => {
      screen.getByTestId('login-btn').click();
    });

    // Should be authenticated after login
    expect(screen.getByTestId('authenticated')).toHaveTextContent('authenticated');
    expect(AuthService.validateCredentials).toHaveBeenCalledWith('admin', 'password123');
    expect(AuthService.generateToken).toHaveBeenCalledWith('admin');
    expect(AuthService.storeToken).toHaveBeenCalled();
  });

  test('should handle login failure', async () => {
    AuthService.isAuthenticated.mockReturnValue(false);
    AuthService.validateCredentials.mockReturnValue(false);
    
    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    // Wait for initialization
    await waitFor(() => {
      expect(screen.getByTestId('loading')).toHaveTextContent('not-loading');
    });

    // Should start as not authenticated
    expect(screen.getByTestId('authenticated')).toHaveTextContent('not-authenticated');

    // Perform failed login
    await act(async () => {
      screen.getByTestId('login-btn').click();
    });

    // Should remain not authenticated
    expect(screen.getByTestId('authenticated')).toHaveTextContent('not-authenticated');
    expect(AuthService.validateCredentials).toHaveBeenCalledWith('admin', 'password123');
    expect(AuthService.generateToken).not.toHaveBeenCalled();
    expect(AuthService.storeToken).not.toHaveBeenCalled();
  });

  test('should handle logout', async () => {
    AuthService.isAuthenticated.mockReturnValue(true);
    AuthService.clearAuthData.mockImplementation(() => {});
    
    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    // Wait for initialization
    await waitFor(() => {
      expect(screen.getByTestId('loading')).toHaveTextContent('not-loading');
    });

    // Should start as authenticated
    expect(screen.getByTestId('authenticated')).toHaveTextContent('authenticated');

    // Perform logout
    await act(async () => {
      screen.getByTestId('logout-btn').click();
    });

    // Should be not authenticated after logout
    expect(screen.getByTestId('authenticated')).toHaveTextContent('not-authenticated');
    expect(AuthService.clearAuthData).toHaveBeenCalled();
  });

  test('should handle initialization errors gracefully', async () => {
    AuthService.isAuthenticated.mockImplementation(() => {
      throw new Error('Storage error');
    });
    
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    
    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    // Wait for initialization
    await waitFor(() => {
      expect(screen.getByTestId('loading')).toHaveTextContent('not-loading');
    });

    // Should default to not authenticated on error
    expect(screen.getByTestId('authenticated')).toHaveTextContent('not-authenticated');
    expect(consoleSpy).toHaveBeenCalledWith('Failed to initialize authentication state:', expect.any(Error));
    
    consoleSpy.mockRestore();
  });
});