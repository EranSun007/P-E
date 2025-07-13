import { useState, useEffect, useCallback } from 'react';

/**
 * Custom hook for managing async data loading with error handling
 * @param {Function} asyncFunction - Async function to execute
 * @param {Array} dependencies - Dependencies array for useEffect
 * @param {Object} options - Configuration options
 * @returns {Object} - { data, loading, error, refetch }
 */
export const useAsyncData = (asyncFunction, dependencies = [], options = {}) => {
  const {
    initialData = null,
    executeOnMount = true,
    onSuccess = null,
    onError = null,
    retryDelay = 1000,
    maxRetries = 3
  } = options;

  const [data, setData] = useState(initialData);
  const [loading, setLoading] = useState(executeOnMount);
  const [error, setError] = useState(null);
  const [retryCount, setRetryCount] = useState(0);

  const execute = useCallback(async (retryAttempt = 0) => {
    setLoading(true);
    setError(null);

    try {
      const result = await asyncFunction();
      setData(result);
      setRetryCount(0);
      
      if (onSuccess) {
        onSuccess(result);
      }
    } catch (err) {
      console.error('Async data loading failed:', err);
      
      if (retryAttempt < maxRetries) {
        setRetryCount(retryAttempt + 1);
        setTimeout(() => {
          execute(retryAttempt + 1);
        }, retryDelay * (retryAttempt + 1));
      } else {
        setError(err);
        if (onError) {
          onError(err);
        }
      }
    } finally {
      setLoading(false);
    }
  }, [asyncFunction, onSuccess, onError, maxRetries, retryDelay]);

  const refetch = useCallback(() => {
    execute(0);
  }, [execute]);

  useEffect(() => {
    if (executeOnMount) {
      execute();
    }
  }, dependencies);

  return {
    data,
    loading,
    error,
    refetch,
    retryCount
  };
};

/**
 * Custom hook for managing multiple async operations
 * @param {Object} asyncFunctions - Object with async functions
 * @param {Array} dependencies - Dependencies array
 * @returns {Object} - Loading states and data for each function
 */
export const useMultipleAsyncData = (asyncFunctions, dependencies = []) => {
  const [states, setStates] = useState(() => {
    const initialStates = {};
    Object.keys(asyncFunctions).forEach(key => {
      initialStates[key] = {
        data: null,
        loading: true,
        error: null
      };
    });
    return initialStates;
  });

  const executeAll = useCallback(async () => {
    const promises = Object.entries(asyncFunctions).map(async ([key, fn]) => {
      try {
        const result = await fn();
        setStates(prev => ({
          ...prev,
          [key]: { data: result, loading: false, error: null }
        }));
      } catch (error) {
        setStates(prev => ({
          ...prev,
          [key]: { data: null, loading: false, error }
        }));
      }
    });

    await Promise.all(promises);
  }, [asyncFunctions]);

  useEffect(() => {
    executeAll();
  }, dependencies);

  const refetchAll = useCallback(() => {
    setStates(prev => {
      const newStates = {};
      Object.keys(prev).forEach(key => {
        newStates[key] = { ...prev[key], loading: true, error: null };
      });
      return newStates;
    });
    executeAll();
  }, [executeAll]);

  const refetch = useCallback((key) => {
    setStates(prev => ({
      ...prev,
      [key]: { ...prev[key], loading: true, error: null }
    }));
    
    asyncFunctions[key]()
      .then(result => {
        setStates(prev => ({
          ...prev,
          [key]: { data: result, loading: false, error: null }
        }));
      })
      .catch(error => {
        setStates(prev => ({
          ...prev,
          [key]: { data: null, loading: false, error }
        }));
      });
  }, [asyncFunctions]);

  return {
    states,
    refetchAll,
    refetch
  };
};

/**
 * Custom hook for debounced async operations
 * @param {Function} asyncFunction - Async function to debounce
 * @param {number} delay - Debounce delay in milliseconds
 * @param {Array} dependencies - Dependencies array
 * @returns {Object} - Debounced async operation state
 */
export const useDebouncedAsyncData = (asyncFunction, delay = 300, dependencies = []) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const debouncedExecute = useCallback(
    debounce(async (fn) => {
      setLoading(true);
      setError(null);
      
      try {
        const result = await fn();
        setData(result);
      } catch (err) {
        setError(err);
      } finally {
        setLoading(false);
      }
    }, delay),
    [delay]
  );

  useEffect(() => {
    if (asyncFunction) {
      debouncedExecute(asyncFunction);
    }
  }, dependencies);

  return { data, loading, error };
};

// Utility function for debouncing
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}