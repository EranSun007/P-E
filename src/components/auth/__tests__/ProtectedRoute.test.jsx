/**
 * ProtectedRoute Component Tests
 * Tests for route protection functionality
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import ProtectedRoute from '../ProtectedRoute.jsx';
import { useAuth } from '../../../contexts/AuthContext.jsx';

// Mock the useAuth hook
vi.mock('../../../contexts/AuthContext.jsx', () => ({
  useAuth: vi.fn()
}));

// Mock the LoginForm component
vi.mock('../LoginForm.jsx', () => ({
  default: () => <div data-testid="login-form">Login Form</div>
}));

// Mock the LoadingSpinner component
vi.mock('../../ui/LoadingSpinner.jsx', () => ({
  default: () => <div data-testid="loading-spinner">Loading...</div>
}));

describe('ProtectedRoute', () => {
  const TestComponent = () => <div data-testid="protected-content">Protected Content</div>;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should show loading spinner when authentication is loading', () => {
    // Mock loading state
    useAuth.mockReturnValue({
      isAuthenticated: false,
      loading: true
    });

    render(
      <ProtectedRoute>
        <TestComponent />
      </ProtectedRoute>
    );

    expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();
    expect(screen.queryByTestId('protected-content')).not.toBeInTheDocument();
    expect(screen.queryByTestId('login-form')).not.toBeInTheDocument();
  });

  it('should show login form when user is not authenticated', () => {
    // Mock unauthenticated state
    useAuth.mockReturnValue({
      isAuthenticated: false,
      loading: false
    });

    render(
      <ProtectedRoute>
        <TestComponent />
      </ProtectedRoute>
    );

    expect(screen.getByTestId('login-form')).toBeInTheDocument();
    expect(screen.queryByTestId('protected-content')).not.toBeInTheDocument();
    expect(screen.queryByTestId('loading-spinner')).not.toBeInTheDocument();
  });

  it('should show protected content when user is authenticated', () => {
    // Mock authenticated state
    useAuth.mockReturnValue({
      isAuthenticated: true,
      loading: false
    });

    render(
      <ProtectedRoute>
        <TestComponent />
      </ProtectedRoute>
    );

    expect(screen.getByTestId('protected-content')).toBeInTheDocument();
    expect(screen.queryByTestId('login-form')).not.toBeInTheDocument();
    expect(screen.queryByTestId('loading-spinner')).not.toBeInTheDocument();
  });

  it('should render multiple children when authenticated', () => {
    // Mock authenticated state
    useAuth.mockReturnValue({
      isAuthenticated: true,
      loading: false
    });

    render(
      <ProtectedRoute>
        <div data-testid="child-1">Child 1</div>
        <div data-testid="child-2">Child 2</div>
      </ProtectedRoute>
    );

    expect(screen.getByTestId('child-1')).toBeInTheDocument();
    expect(screen.getByTestId('child-2')).toBeInTheDocument();
  });

  it('should handle authentication state changes correctly', () => {
    const { rerender } = render(
      <ProtectedRoute>
        <TestComponent />
      </ProtectedRoute>
    );

    // Start with loading state
    useAuth.mockReturnValue({
      isAuthenticated: false,
      loading: true
    });
    rerender(
      <ProtectedRoute>
        <TestComponent />
      </ProtectedRoute>
    );
    expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();

    // Change to unauthenticated state
    useAuth.mockReturnValue({
      isAuthenticated: false,
      loading: false
    });
    rerender(
      <ProtectedRoute>
        <TestComponent />
      </ProtectedRoute>
    );
    expect(screen.getByTestId('login-form')).toBeInTheDocument();

    // Change to authenticated state
    useAuth.mockReturnValue({
      isAuthenticated: true,
      loading: false
    });
    rerender(
      <ProtectedRoute>
        <TestComponent />
      </ProtectedRoute>
    );
    expect(screen.getByTestId('protected-content')).toBeInTheDocument();
  });
});