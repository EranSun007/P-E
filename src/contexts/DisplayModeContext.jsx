/**
 * Display Mode Context
 * Provides global presentation mode state management
 * When presentation mode is active, sensitive data is anonymized
 */

import { createContext, useContext, useState, useEffect } from 'react';

const STORAGE_KEY = 'pe_manager_presentation_mode';

const DisplayModeContext = createContext(null);

/**
 * Custom hook to use the display mode context
 * @returns {object} Display mode context value
 * @throws {Error} If used outside of DisplayModeProvider
 */
export const useDisplayMode = () => {
  const context = useContext(DisplayModeContext);
  if (!context) {
    throw new Error('useDisplayMode must be used within a DisplayModeProvider');
  }
  return context;
};

/**
 * Display Mode Provider Component
 * Manages presentation mode state with localStorage persistence
 */
export const DisplayModeProvider = ({ children }) => {
  const [isPresentationMode, setIsPresentationMode] = useState(() => {
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
      localStorage.setItem(STORAGE_KEY, isPresentationMode.toString());
    } catch (error) {
      console.error('Failed to persist presentation mode:', error);
    }
  }, [isPresentationMode]);

  /**
   * Toggle between working and presentation mode
   */
  const togglePresentationMode = () => {
    setIsPresentationMode(prev => !prev);
  };

  /**
   * Enable presentation mode
   */
  const enablePresentationMode = () => {
    setIsPresentationMode(true);
  };

  /**
   * Disable presentation mode (back to working mode)
   */
  const disablePresentationMode = () => {
    setIsPresentationMode(false);
  };

  const contextValue = {
    isPresentationMode,
    togglePresentationMode,
    enablePresentationMode,
    disablePresentationMode
  };

  return (
    <DisplayModeContext.Provider value={contextValue}>
      {children}
    </DisplayModeContext.Provider>
  );
};

export default DisplayModeContext;
