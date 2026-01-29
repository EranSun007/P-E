/**
 * Navigation Context
 * Manages menu configuration state for folder grouping
 * Supports separate configs for People and Product modes
 */

import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useAppMode } from '@/contexts/AppModeContext';
import { apiClient } from '@/api/apiClient';

const NavigationContext = createContext(null);

// Default configs (match backend defaults)
const DEFAULT_CONFIG = { folders: [], items: [] };

// DEBUG: Track provider renders
let navProviderRenderCount = 0;

export function NavigationProvider({ children }) {
  const { isAuthenticated } = useAuth();
  const { isProductMode } = useAppMode();

  // DEBUG: Track renders
  navProviderRenderCount++;
  console.log('[NavigationProvider] Render #', navProviderRenderCount, { isAuthenticated, isProductMode });

  // Separate state for each mode
  const [peopleConfig, setPeopleConfig] = useState(DEFAULT_CONFIG);
  const [productConfig, setProductConfig] = useState(DEFAULT_CONFIG);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Track if initial data has been loaded to prevent re-fetch on navigation
  const dataLoadedRef = useRef(false);

  // Current mode's config
  const currentConfig = isProductMode ? productConfig : peopleConfig;
  const setCurrentConfig = isProductMode ? setProductConfig : setPeopleConfig;
  const currentMode = isProductMode ? 'product' : 'people';

  // Load config from backend
  const loadConfig = useCallback(async (mode) => {
    try {
      const response = await apiClient.menuConfig.get(mode);
      return response.config;
    } catch (err) {
      console.error(`Failed to load ${mode} menu config:`, err);
      return DEFAULT_CONFIG;
    }
  }, []);

  // Load both configs on auth
  // Only fetch once per authentication session to prevent re-fetch on navigation
  useEffect(() => {
    if (!isAuthenticated) {
      dataLoadedRef.current = false;
      setPeopleConfig(DEFAULT_CONFIG);
      setProductConfig(DEFAULT_CONFIG);
      setLoading(false);
      return;
    }

    // Skip if already loaded
    if (dataLoadedRef.current) {
      return;
    }

    const loadBothConfigs = async () => {
      setLoading(true);
      setError(null);
      try {
        const [people, product] = await Promise.all([
          loadConfig('people'),
          loadConfig('product'),
        ]);
        setPeopleConfig(people);
        setProductConfig(product);
        dataLoadedRef.current = true;
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    loadBothConfigs();
  }, [isAuthenticated, loadConfig]);

  // Save config to backend (debounced internally if needed)
  const saveConfig = useCallback(async (config) => {
    try {
      await apiClient.menuConfig.set(currentMode, config);
      setCurrentConfig(config);
      return true;
    } catch (err) {
      console.error(`Failed to save ${currentMode} menu config:`, err);
      setError(err.message);
      return false;
    }
  }, [currentMode, setCurrentConfig]);

  // Reset to defaults
  const resetToDefaults = useCallback(async () => {
    try {
      const response = await apiClient.menuConfig.getDefaults(currentMode);
      await apiClient.menuConfig.set(currentMode, response.config);
      setCurrentConfig(response.config);
      return true;
    } catch (err) {
      console.error(`Failed to reset ${currentMode} menu config:`, err);
      setError(err.message);
      return false;
    }
  }, [currentMode, setCurrentConfig]);

  // Refresh current mode's config from backend
  const refresh = useCallback(async () => {
    const config = await loadConfig(currentMode);
    setCurrentConfig(config);
  }, [currentMode, setCurrentConfig, loadConfig]);

  const value = {
    // Current mode's config
    config: currentConfig,
    folders: currentConfig.folders,
    items: currentConfig.items,

    // State
    loading,
    error,

    // Actions
    saveConfig,
    resetToDefaults,
    refresh,

    // Mode info
    currentMode,
  };

  return (
    <NavigationContext.Provider value={value}>
      {children}
    </NavigationContext.Provider>
  );
}

export function useNavigation() {
  const context = useContext(NavigationContext);
  if (!context) {
    throw new Error('useNavigation must be used within a NavigationProvider');
  }
  return context;
}

export default NavigationContext;
