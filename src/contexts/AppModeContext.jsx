/**
 * App Mode Context
 * Provides global app mode state management for dual-persona feature
 * - People & Engineering Mode (light theme)
 * - Product & Engineering Mode (dark theme)
 */

import { createContext, useContext, useState, useEffect, useCallback } from 'react';

const STORAGE_KEY = 'pe_manager_app_mode';

const AppModeContext = createContext(null);

/**
 * Custom hook to use the app mode context
 * @returns {object} App mode context value
 * @throws {Error} If used outside of AppModeProvider
 */
export const useAppMode = () => {
  const context = useContext(AppModeContext);
  if (!context) {
    throw new Error('useAppMode must be used within an AppModeProvider');
  }
  return context;
};

/**
 * App Mode Provider Component
 * Manages app mode state with localStorage persistence
 */
export const AppModeProvider = ({ children }) => {
  const [isProductMode, setIsProductMode] = useState(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored === 'true';
    } catch {
      return false;
    }
  });

  // Persist state changes to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, isProductMode.toString());
    } catch (error) {
      console.error('Failed to persist app mode:', error);
    }
  }, [isProductMode]);

  /**
   * Toggle between People and Product modes
   * Returns the new mode for navigation handling
   */
  const toggleAppMode = useCallback(() => {
    setIsProductMode(prev => !prev);
    return !isProductMode;
  }, [isProductMode]);

  /**
   * Set to People & Engineering mode
   */
  const enablePeopleMode = useCallback(() => {
    setIsProductMode(false);
  }, []);

  /**
   * Set to Product & Engineering mode
   */
  const enableProductMode = useCallback(() => {
    setIsProductMode(true);
  }, []);

  const contextValue = {
    isProductMode,
    isPeopleMode: !isProductMode,
    toggleAppMode,
    enablePeopleMode,
    enableProductMode,
    // Mode labels
    currentMode: isProductMode ? 'Product & Engineering' : 'People & Engineering',
    currentModeShort: isProductMode ? 'Product' : 'People',
  };

  return (
    <AppModeContext.Provider value={contextValue}>
      {children}
    </AppModeContext.Provider>
  );
};

export default AppModeContext;
