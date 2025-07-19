/**
 * ProtectedRoute Component
 * Higher-order component that protects routes from unauthorized access
 */

import React from 'react';
import { useAuth } from '../../contexts/AuthContext.jsx';
import LoginForm from './LoginForm.jsx';
import LoadingSpinner from '../ui/LoadingSpinner.jsx';

/**
 * ProtectedRoute - Wraps components that require authentication
 * @param {object} props - Component props
 * @param {React.ReactNode} props.children - Child components to render when authenticated
 * @returns {React.ReactElement} - LoginForm, LoadingSpinner, or protected content
 */
const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();

  // Show loading spinner during initial authentication check
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingSpinner />
      </div>
    );
  }

  // Show login form if user is not authenticated
  if (!isAuthenticated) {
    return <LoginForm />;
  }

  // Render protected content if user is authenticated
  return children;
};

export default ProtectedRoute;