/**
 * Page Context Hook
 * Manages page-specific context for AI chat integration
 */

import { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';
import { useLocation } from 'react-router-dom';

// Context for page context management
const PageContextContext = createContext(null);

/**
 * Provider component for page context
 */
export function PageContextProvider({ children }) {
  const location = useLocation();
  const [context, setContext] = useState(null);
  const [timestamp, setTimestamp] = useState(null);
  const [previousPath, setPreviousPath] = useState(null);
  const [navigationChanged, setNavigationChanged] = useState(false);
  const contextGeneratorRef = useRef(null);

  // Track navigation changes
  useEffect(() => {
    if (previousPath && previousPath !== location.pathname) {
      setNavigationChanged(true);
    }
    setPreviousPath(location.pathname);
  }, [location.pathname, previousPath]);

  /**
   * Register a context generator for the current page
   * Pages call this to provide their context generation function
   */
  const registerContext = useCallback((generator) => {
    contextGeneratorRef.current = generator;
    // Generate initial context
    if (generator) {
      const newContext = generator();
      setContext(newContext);
      setTimestamp(new Date().toISOString());
      setNavigationChanged(false);
    }
  }, []);

  /**
   * Unregister context (called when leaving a page)
   */
  const unregisterContext = useCallback(() => {
    contextGeneratorRef.current = null;
    // Keep the last context but mark the path change
  }, []);

  /**
   * Refresh the current context
   */
  const refresh = useCallback(() => {
    if (contextGeneratorRef.current) {
      const newContext = contextGeneratorRef.current();
      setContext(newContext);
      setTimestamp(new Date().toISOString());
      setNavigationChanged(false);
    }
  }, []);

  /**
   * Dismiss navigation change notification
   */
  const dismissNavigationChange = useCallback(() => {
    setNavigationChanged(false);
  }, []);

  /**
   * Check if context is stale (> 5 minutes old)
   */
  const isStale = useCallback(() => {
    if (!timestamp) return false;
    const contextTime = new Date(timestamp).getTime();
    const now = Date.now();
    const fiveMinutes = 5 * 60 * 1000;
    return (now - contextTime) > fiveMinutes;
  }, [timestamp]);

  /**
   * Get staleness duration in minutes
   */
  const getStalenessMinutes = useCallback(() => {
    if (!timestamp) return 0;
    const contextTime = new Date(timestamp).getTime();
    const now = Date.now();
    return Math.floor((now - contextTime) / (60 * 1000));
  }, [timestamp]);

  const value = {
    context,
    timestamp,
    navigationChanged,
    currentPath: location.pathname,
    registerContext,
    unregisterContext,
    refresh,
    dismissNavigationChange,
    isStale,
    getStalenessMinutes
  };

  return (
    <PageContextContext.Provider value={value}>
      {children}
    </PageContextContext.Provider>
  );
}

/**
 * Hook to access page context
 */
export function usePageContext() {
  const context = useContext(PageContextContext);
  if (!context) {
    throw new Error('usePageContext must be used within a PageContextProvider');
  }
  return context;
}

/**
 * Hook for pages to register their context
 * Automatically unregisters on unmount
 */
export function useRegisterPageContext(contextGenerator, dependencies = []) {
  const { registerContext, unregisterContext } = usePageContext();

  useEffect(() => {
    registerContext(contextGenerator);
    return () => unregisterContext();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, dependencies);
}

export default usePageContext;
