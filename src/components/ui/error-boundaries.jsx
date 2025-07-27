import React, { Component } from 'react';
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle, RefreshCw, Home, ArrowLeft } from "lucide-react";

// Helper function to retry failed dynamic imports
export const retryImport = (importFn, retries = 3, baseDelay = 1000) => {
  return importFn().catch(error => {
    if (retries > 0) {
      console.warn(`Failed to load chunk, retrying... (${retries} attempts left)`, error);
      return new Promise((resolve, reject) => {
        setTimeout(() => {
          retryImport(importFn, retries - 1, baseDelay * 1.5)
            .then(resolve)
            .catch(reject);
        }, baseDelay);
      });
    }
    console.error('Failed to load chunk after all retries:', error);
    throw error;
  });
};

// Generic error boundary for chunk loading failures
export class ChunkLoadErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { 
      hasError: false, 
      error: null, 
      errorInfo: null,
      retryCount: 0,
      isRetrying: false
    };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Chunk loading error:', error, errorInfo);
    this.setState({ errorInfo });
    
    // Report error to monitoring service if available
    if (window.reportError) {
      window.reportError(error, { context: 'chunk_loading', errorInfo });
    }
  }

  handleRetry = async () => {
    this.setState({ isRetrying: true });
    
    try {
      // Wait a bit before retrying
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Clear error state and increment retry count
      this.setState({ 
        hasError: false, 
        error: null, 
        errorInfo: null,
        retryCount: this.state.retryCount + 1,
        isRetrying: false
      });
    } catch (retryError) {
      console.error('Retry failed:', retryError);
      this.setState({ isRetrying: false });
    }
  };

  handleReload = () => {
    // Force a page reload to retry loading the chunk
    window.location.reload();
  };

  handleGoHome = () => {
    // Navigate to home page
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      const { error, retryCount, isRetrying } = this.state;
      const { fallback, showDetails = false, maxRetries = 3 } = this.props;
      
      // If a custom fallback is provided, use it
      if (fallback && typeof fallback === 'function') {
        return fallback(error, this.handleRetry, this.handleReload);
      }

      return (
        <div className="flex items-center justify-center min-h-[400px] p-6">
          <div className="max-w-md w-full">
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Failed to load content</AlertTitle>
              <AlertDescription className="mt-2">
                There was an error loading this part of the application. This might be due to a network issue or a temporary problem.
              </AlertDescription>
            </Alert>
            
            <div className="mt-6 space-y-3">
              {retryCount < maxRetries && (
                <Button
                  onClick={this.handleRetry}
                  disabled={isRetrying}
                  className="w-full"
                  variant="default"
                >
                  {isRetrying ? (
                    <>
                      <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                      Retrying...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="mr-2 h-4 w-4" />
                      Try Again {retryCount > 0 && `(${retryCount}/${maxRetries})`}
                    </>
                  )}
                </Button>
              )}
              
              <div className="flex gap-2">
                <Button
                  onClick={this.handleReload}
                  variant="outline"
                  className="flex-1"
                >
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Reload Page
                </Button>
                
                <Button
                  onClick={this.handleGoHome}
                  variant="outline"
                  className="flex-1"
                >
                  <Home className="mr-2 h-4 w-4" />
                  Go Home
                </Button>
              </div>
            </div>
            
            {showDetails && error && (
              <details className="mt-4">
                <summary className="cursor-pointer text-sm text-gray-600 hover:text-gray-800">
                  Technical Details
                </summary>
                <div className="mt-2 p-3 bg-gray-50 rounded text-xs font-mono text-gray-700 overflow-auto max-h-32">
                  <div><strong>Error:</strong> {error.message}</div>
                  {error.stack && (
                    <div className="mt-1">
                      <strong>Stack:</strong>
                      <pre className="whitespace-pre-wrap">{error.stack}</pre>
                    </div>
                  )}
                </div>
              </details>
            )}
            
            {retryCount >= maxRetries && (
              <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded">
                <p className="text-sm text-yellow-800">
                  Maximum retry attempts reached. Please try reloading the page or contact support if the problem persists.
                </p>
              </div>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// Specialized error boundary for page-level chunks
export class PageChunkErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { 
      hasError: false, 
      error: null,
      retryCount: 0,
      isRetrying: false
    };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Page chunk loading error:', error, errorInfo);
    
    // Report error with page context
    if (window.reportError) {
      window.reportError(error, { 
        context: 'page_chunk_loading', 
        page: this.props.pageName,
        errorInfo 
      });
    }
  }

  handleRetry = async () => {
    this.setState({ isRetrying: true });
    
    try {
      await new Promise(resolve => setTimeout(resolve, 1500));
      this.setState({ 
        hasError: false, 
        error: null,
        retryCount: this.state.retryCount + 1,
        isRetrying: false
      });
    } catch (retryError) {
      this.setState({ isRetrying: false });
    }
  };

  handleGoBack = () => {
    if (window.history.length > 1) {
      window.history.back();
    } else {
      window.location.href = '/';
    }
  };

  render() {
    if (this.state.hasError) {
      const { error, retryCount, isRetrying } = this.state;
      const { pageName = 'page' } = this.props;
      
      return (
        <div className="min-h-screen flex items-center justify-center p-6 bg-gray-50">
          <div className="max-w-lg w-full bg-white rounded-lg shadow-sm border p-8">
            <div className="text-center">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 mb-4">
                <AlertCircle className="h-6 w-6 text-red-600" />
              </div>
              
              <h1 className="text-xl font-semibold text-gray-900 mb-2">
                Failed to load {pageName}
              </h1>
              
              <p className="text-gray-600 mb-6">
                We're having trouble loading this page. This could be due to a network issue or a temporary problem with the application.
              </p>
              
              <div className="space-y-3">
                <Button
                  onClick={this.handleRetry}
                  disabled={isRetrying}
                  className="w-full"
                >
                  {isRetrying ? (
                    <>
                      <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                      Loading...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="mr-2 h-4 w-4" />
                      Try Again
                    </>
                  )}
                </Button>
                
                <div className="flex gap-2">
                  <Button
                    onClick={this.handleGoBack}
                    variant="outline"
                    className="flex-1"
                  >
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Go Back
                  </Button>
                  
                  <Button
                    onClick={() => window.location.reload()}
                    variant="outline"
                    className="flex-1"
                  >
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Reload
                  </Button>
                </div>
              </div>
              
              {retryCount > 0 && (
                <p className="text-sm text-gray-500 mt-4">
                  Retry attempts: {retryCount}
                </p>
              )}
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// Specialized error boundary for component-level chunks
export class ComponentChunkErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { 
      hasError: false, 
      error: null,
      retryCount: 0,
      isRetrying: false
    };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Component chunk loading error:', error, errorInfo);
    
    if (window.reportError) {
      window.reportError(error, { 
        context: 'component_chunk_loading', 
        component: this.props.componentName,
        errorInfo 
      });
    }
  }

  handleRetry = async () => {
    this.setState({ isRetrying: true });
    
    try {
      await new Promise(resolve => setTimeout(resolve, 1000));
      this.setState({ 
        hasError: false, 
        error: null,
        retryCount: this.state.retryCount + 1,
        isRetrying: false
      });
    } catch (retryError) {
      this.setState({ isRetrying: false });
    }
  };

  render() {
    if (this.state.hasError) {
      const { error, isRetrying } = this.state;
      const { componentName = 'component', inline = false } = this.props;
      
      if (inline) {
        return (
          <div className="p-4 border border-red-200 bg-red-50 rounded-md">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <AlertCircle className="h-4 w-4 text-red-600 mr-2" />
                <span className="text-sm text-red-800">
                  Failed to load {componentName}
                </span>
              </div>
              <Button
                onClick={this.handleRetry}
                disabled={isRetrying}
                size="sm"
                variant="outline"
              >
                {isRetrying ? (
                  <RefreshCw className="h-3 w-3 animate-spin" />
                ) : (
                  <RefreshCw className="h-3 w-3" />
                )}
              </Button>
            </div>
          </div>
        );
      }
      
      return (
        <div className="flex items-center justify-center p-8 border border-red-200 bg-red-50 rounded-lg">
          <div className="text-center">
            <AlertCircle className="h-8 w-8 text-red-600 mx-auto mb-3" />
            <h3 className="text-lg font-medium text-red-900 mb-2">
              Failed to load {componentName}
            </h3>
            <p className="text-sm text-red-700 mb-4">
              There was an error loading this component.
            </p>
            <Button
              onClick={this.handleRetry}
              disabled={isRetrying}
              size="sm"
            >
              {isRetrying ? (
                <>
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  Retrying...
                </>
              ) : (
                <>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Try Again
                </>
              )}
            </Button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// Hook for handling async component loading with error recovery
export function useAsyncComponent(importFn, options = {}) {
  const { maxRetries = 3, baseDelay = 1000 } = options;
  
  return React.useMemo(() => {
    return React.lazy(() => retryImport(importFn, maxRetries, baseDelay));
  }, [importFn, maxRetries, baseDelay]);
}

// Higher-order component for wrapping lazy components with error boundaries
export function withChunkErrorBoundary(LazyComponent, options = {}) {
  const { 
    componentName = 'Component',
    fallback = null,
    inline = false,
    ...boundaryProps 
  } = options;
  
  return function WrappedComponent(props) {
    return (
      <ComponentChunkErrorBoundary 
        componentName={componentName}
        inline={inline}
        {...boundaryProps}
      >
        <React.Suspense fallback={fallback}>
          <LazyComponent {...props} />
        </React.Suspense>
      </ComponentChunkErrorBoundary>
    );
  };
}