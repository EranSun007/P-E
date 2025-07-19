/**
 * Authentication Utilities
 * Helper functions for localStorage operations and authentication state management
 */

/**
 * Checks if localStorage is available in the current environment
 * @returns {boolean} - True if localStorage is available
 */
export const isLocalStorageAvailable = () => {
  try {
    const test = '__localStorage_test__';
    localStorage.setItem(test, test);
    localStorage.removeItem(test);
    return true;
  } catch (error) {
    return false;
  }
};

/**
 * Safely gets an item from localStorage
 * @param {string} key - The key to retrieve
 * @returns {string|null} - The stored value or null if not found/error
 */
export const getLocalStorageItem = (key) => {
  if (!isLocalStorageAvailable()) {
    console.warn('localStorage is not available');
    return null;
  }
  
  try {
    return localStorage.getItem(key);
  } catch (error) {
    console.warn(`Failed to get item from localStorage: ${key}`, error);
    return null;
  }
};

/**
 * Safely sets an item in localStorage
 * @param {string} key - The key to set
 * @param {string} value - The value to store
 * @returns {boolean} - True if successful, false otherwise
 */
export const setLocalStorageItem = (key, value) => {
  if (!isLocalStorageAvailable()) {
    console.warn('localStorage is not available');
    return false;
  }
  
  try {
    localStorage.setItem(key, value);
    return true;
  } catch (error) {
    console.warn(`Failed to set item in localStorage: ${key}`, error);
    return false;
  }
};

/**
 * Safely removes an item from localStorage
 * @param {string} key - The key to remove
 * @returns {boolean} - True if successful, false otherwise
 */
export const removeLocalStorageItem = (key) => {
  if (!isLocalStorageAvailable()) {
    console.warn('localStorage is not available');
    return false;
  }
  
  try {
    localStorage.removeItem(key);
    return true;
  } catch (error) {
    console.warn(`Failed to remove item from localStorage: ${key}`, error);
    return false;
  }
};

/**
 * Safely parses JSON from localStorage
 * @param {string} key - The key to retrieve and parse
 * @returns {object|null} - Parsed object or null if not found/invalid
 */
export const getLocalStorageJSON = (key) => {
  const value = getLocalStorageItem(key);
  if (!value) {
    return null;
  }
  
  try {
    return JSON.parse(value);
  } catch (error) {
    console.warn(`Failed to parse JSON from localStorage: ${key}`, error);
    // Clean up corrupted data
    removeLocalStorageItem(key);
    return null;
  }
};

/**
 * Safely stores JSON in localStorage
 * @param {string} key - The key to set
 * @param {object} value - The object to store
 * @returns {boolean} - True if successful, false otherwise
 */
export const setLocalStorageJSON = (key, value) => {
  try {
    const jsonString = JSON.stringify(value);
    return setLocalStorageItem(key, jsonString);
  } catch (error) {
    console.warn(`Failed to stringify and store JSON in localStorage: ${key}`, error);
    return false;
  }
};

/**
 * Clears all authentication-related data from localStorage
 * @param {string[]} keys - Array of keys to clear (optional, defaults to common auth keys)
 */
export const clearAuthStorage = (keys = ['auth_token', 'user_data', 'session_data']) => {
  keys.forEach(key => {
    removeLocalStorageItem(key);
  });
};