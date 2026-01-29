/**
 * useCollapsedFolders Hook
 * Manages folder collapse state with localStorage persistence
 * Stores array of collapsed folder IDs (opt-in to collapse)
 * Separate storage keys for people/product modes
 */

import { useState, useEffect } from 'react';
import { useAppMode } from '@/contexts/AppModeContext';

const STORAGE_KEY_PREFIX = 'pe_manager_nav_collapsed_folders';

/**
 * Custom hook for managing folder collapse state with persistence
 * @returns {object} { isCollapsed, toggleFolder }
 */
export function useCollapsedFolders() {
  const { isProductMode } = useAppMode();
  const currentMode = isProductMode ? 'product' : 'people';
  const storageKey = `${STORAGE_KEY_PREFIX}_${currentMode}`;

  // Initialize from localStorage on mount
  const [collapsedFolders, setCollapsedFolders] = useState(() => {
    try {
      const stored = localStorage.getItem(storageKey);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  // Persist to localStorage when state changes
  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(collapsedFolders));
    } catch (error) {
      // Handle QuotaExceededError gracefully
      if (error.name === 'QuotaExceededError') {
        console.warn('localStorage quota exceeded, clearing folder state');
        localStorage.removeItem(storageKey);
      } else {
        console.error('Failed to persist folder state:', error);
      }
    }
  }, [collapsedFolders, storageKey]);

  // Re-read from localStorage when mode changes
  useEffect(() => {
    try {
      const stored = localStorage.getItem(storageKey);
      setCollapsedFolders(stored ? JSON.parse(stored) : []);
    } catch {
      setCollapsedFolders([]);
    }
  }, [storageKey]);

  /**
   * Check if a folder is collapsed
   * @param {string} folderId - The folder ID to check
   * @returns {boolean} True if folder is collapsed
   */
  const isCollapsed = (folderId) => collapsedFolders.includes(folderId);

  /**
   * Toggle a folder's collapsed state
   * @param {string} folderId - The folder ID to toggle
   */
  const toggleFolder = (folderId) => {
    setCollapsedFolders(prev =>
      prev.includes(folderId)
        ? prev.filter(id => id !== folderId)
        : [...prev, folderId]
    );
  };

  return { isCollapsed, toggleFolder };
}
