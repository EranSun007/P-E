/**
 * LoginForm Component
 * Handles user authentication with username/password inputs
 */

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useAuth } from '@/contexts/AuthContext';

const LoginForm = () => {
  const [formData, setFormData] = useState({
    username: '',
    password: ''
  });
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [loginError, setLoginError] = useState('');
  const [retryCount, setRetryCount] = useState(0);

  const { login, error: contextError, clearError } = useAuth();

  /**
   * Validates form fields
   * @returns {boolean} - True if form is valid, false otherwise
   */
  const validateForm = () => {
    const newErrors = {};

    if (!formData.username.trim()) {
      newErrors.username = 'Username is required';
    }

    if (!formData.password.trim()) {
      newErrors.password = 'Password is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  /**
   * Handles input field changes
   * @param {Event} e - Input change event
   */
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));

    // Clear field error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }

    // Clear login error when user modifies input
    if (loginError) {
      setLoginError('');
    }

    // Clear context error when user modifies input
    if (contextError && clearError) {
      clearError();
    }
  };

  /**
   * Handles form submission
   * @param {Event} e - Form submit event
   */
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsLoading(true);
    setLoginError('');

    try {
      const result = await login(formData.username, formData.password);
      
      if (!result.success) {
        setRetryCount(prev => prev + 1);
        
        // Provide more helpful error messages based on retry count
        let errorMessage = result.error || 'Login failed. Please try again.';
        
        if (retryCount >= 2 && result.error?.includes('Invalid username or password')) {
          errorMessage = 'Invalid username or password. Default credentials are username: "admin", password: "password123"';
        } else if (retryCount >= 1 && result.error?.includes('storage')) {
          errorMessage = `${result.error} Try refreshing the page or using a different browser.`;
        }
        
        setLoginError(errorMessage);
      } else {
        // Reset retry count on successful login
        setRetryCount(0);
      }
      // If successful, the AuthContext will handle the state update
    } catch (error) {
      console.error('Login error:', error);
      setRetryCount(prev => prev + 1);
      
      // Provide contextual error messages based on error type and retry count
      let errorMessage = 'Authentication failed. Please try again.';
      
      if (error.type === 'STORAGE_UNAVAILABLE') {
        errorMessage = 'Browser storage is not available. Please enable cookies and local storage.';
      } else if (error.type === 'STORAGE_QUOTA_EXCEEDED') {
        errorMessage = 'Browser storage is full. Please clear some browser data and try again.';
      } else if (retryCount >= 2) {
        errorMessage = 'Repeated authentication failures. Please refresh the page or contact support.';
      }
      
      setLoginError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold text-center">
            Sign In
          </CardTitle>
          <CardDescription className="text-center">
            Enter your credentials to access the application
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Context Error Alert */}
            {contextError && (
              <Alert variant="destructive">
                <AlertDescription>
                  {contextError}
                </AlertDescription>
              </Alert>
            )}

            {/* Login Error Alert */}
            {loginError && (
              <Alert variant="destructive">
                <AlertDescription>
                  {loginError}
                </AlertDescription>
              </Alert>
            )}

            {/* Username Field */}
            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                name="username"
                type="text"
                placeholder="Enter your username"
                value={formData.username}
                onChange={handleInputChange}
                className={errors.username ? 'border-destructive' : ''}
                disabled={isLoading}
              />
              {errors.username && (
                <p className="text-sm text-destructive">
                  {errors.username}
                </p>
              )}
            </div>

            {/* Password Field */}
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                name="password"
                type="password"
                placeholder="Enter your password"
                value={formData.password}
                onChange={handleInputChange}
                className={errors.password ? 'border-destructive' : ''}
                disabled={isLoading}
              />
              {errors.password && (
                <p className="text-sm text-destructive">
                  {errors.password}
                </p>
              )}
            </div>

            {/* Submit Button */}
            <Button 
              type="submit" 
              className="w-full" 
              disabled={isLoading}
            >
              {isLoading ? 'Signing In...' : 'Sign In'}
            </Button>

            {/* Help section for users having trouble */}
            {retryCount >= 1 && (
              <div className="mt-4 p-3 bg-muted rounded-md">
                <p className="text-sm text-muted-foreground mb-2">
                  <strong>Having trouble signing in?</strong>
                </p>
                <ul className="text-xs text-muted-foreground space-y-1">
                  <li>• Default username: <code className="bg-background px-1 rounded">admin</code></li>
                  <li>• Default password: <code className="bg-background px-1 rounded">password123</code></li>
                  <li>• Make sure cookies and local storage are enabled</li>
                  <li>• Try refreshing the page if you see storage errors</li>
                </ul>
              </div>
            )}
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default LoginForm;