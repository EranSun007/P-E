/**
 * Authentication Error Boundary
 * Specialized error boundary for authentication-related failures
 */

import React from 'react';
import { AlertTriangle, RefreshCw, LogIn } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';

class AuthErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { 
      hasError: false, 
      error: null, 
      errorInfo: null,
      errorType: 'unknown'
    };
  }

  static getDerivedStateFromError(error) {
    // Determine error type based on error message or type
    let errorType = 'unknown';
    
    if (error.message?.includes('localStorage')) {
      errorType = 'storage';
    } else if (error.message?.includes('authentication') || error.message?.includes('auth')) {
      errorType = 'authentication';
    } else if (error.message?.includes('network') || error.message?.includes('fetch')) {
      errorType = 'network';
    }

    return { 
      hasError: true,
      errorType
    };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Authentication error caught by boundary:', error, errorInfo);
    
    this.setState({
      error: error,
      errorInfo: errorInfo
    });

    // Report authentication errors if callback provided
    if (this.props.onAuthError) {
      this.props.onAuthError(error, errorInfo, this.state.errorType);
    }
  }

  handleRetry = () => {
    this.setState({ 
      hasError: false, 
      error: null, 
      errorInfo: null,
      errorType: 'unknown'
    });
  };

  handleForceLogout = () => {
    // Clear any potentially corrupted auth state
    try {
      localStorage.removeItem('auth_token');
    } catch (e) {
      // Ignore localStorage errors during cleanup
    }
    
    this.handleRetry();
    
    // Force page reload to reset authentication state
    window.location.reload();
  };

  getErrorMessage() {
    switch (this.state.errorType) {
      case 'storage':
        return {
          title: 'Storage Error',
          message: 'Unable to access browser storage. Please check your browser settings and try again.',
          suggestion: 'Make sure cookies and local storage are enabled in your browser.'
        };
      case 'authentication':
        return {
          title: 'Authentication Error',
          message: 'There was a problem with the authentication system.',
          suggestion: 'Please try logging in again or contact support if the problem persists.'
        };
      case 'network':
        return {
          title: 'Connection Error',
          message: 'Unable to connect to the authentication service.',
          suggestion: 'Please check your internet connection and try again.'
        };
      default:
        return {
          title: 'Authentication System Error',
          message: 'An unexpected error occurred in the authentication system.',
          suggestion: 'Please try again or contact support if the problem persists.'
        };
    }
  }

  render() {
    if (this.state.hasError) {
      const errorDetails = this.getErrorMessage();
      
      return (
        <div className="min-h-screen bg-background flex items-center justify-center p-4">
          <Card className="w-full max-w-md">
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 p-3 bg-destructive/10 rounded-full w-fit">
                <AlertTriangle className="h-8 w-8 text-destructive" />
              </div>
              <CardTitle className="text-xl">
                {errorDetails.title}
              </CardTitle>
              <CardDescription>
                {errorDetails.message}
              </CardDescription>
            </CardHeader>
            
            <CardContent className="space-y-4">
              {/* Additional guidance */}
              <Alert>
                <AlertDescription>
                  {errorDetails.suggestion}
                </AlertDescription>
              </Alert>

              {/* Error details in development */}
              {process.env.NODE_ENV === 'development' && this.state.error && (
                <div className="p-3 bg-muted rounded-md">
                  <details className="text-sm">
                    <summary className="cursor-pointer font-medium mb-2">
                      Technical Details (Development)
                    </summary>
                    <div className="space-y-2 text-xs text-muted-foreground">
                      <div>
                        <strong>Error:</strong> {this.state.error.toString()}
                      </div>
                      <div>
                        <strong>Type:</strong> {this.state.errorType}
                      </div>
                      {this.state.errorInfo && (
                        <div>
                          <strong>Component Stack:</strong>
                          <pre className="mt-1 whitespace-pre-wrap text-xs">
                            {this.state.errorInfo.componentStack}
                          </pre>
                        </div>
                      )}
                    </div>
                  </details>
                </div>
              )}

              {/* Action buttons */}
              <div className="flex gap-2">
                <Button 
                  onClick={this.handleRetry}
                  variant="outline"
                  className="flex-1"
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Try Again
                </Button>
                <Button 
                  onClick={this.handleForceLogout}
                  className="flex-1"
                >
                  <LogIn className="h-4 w-4 mr-2" />
                  Reset Login
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}

export default AuthErrorBoundary;