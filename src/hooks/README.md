# Hooks Directory

This directory contains custom React hooks that encapsulate reusable stateful logic and side effects. These hooks promote code reuse and separation of concerns across the application.

## Hook Categories

### Form Hooks
- **`useForm.js`** - Generic form state management and validation
- **`useDutyFormValidation.js`** - Specialized validation logic for duty forms

### Data Hooks
- **`useAsyncData.js`** - Async data loading with loading/error states

### UI Hooks
- **`useMobile.js`** - Mobile device detection and responsive behavior
- **`use-mobile.jsx`** - Alternative mobile detection implementation

## Hook Architecture

### Custom Hook Patterns
```javascript
// Standard custom hook structure
import { useState, useEffect, useCallback } from 'react';

export function useCustomHook(initialValue, options = {}) {
  const [state, setState] = useState(initialValue);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const performAction = useCallback(async (data) => {
    try {
      setLoading(true);
      setError(null);
      
      // Perform async operation
      const result = await asyncOperation(data);
      setState(result);
      
      return result;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // Cleanup function
    return () => {
      // Cleanup logic
    };
  }, []);

  return {
    state,
    loading,
    error,
    performAction,
    // Other hook utilities
  };
}
```

### Hook Design Principles
- **Single Responsibility**: Each hook handles one specific concern
- **Reusability**: Hooks can be used across multiple components
- **Testability**: Hooks are pure and easily testable
- **Performance**: Proper use of useCallback and useMemo
- **Cleanup**: Proper cleanup of side effects

## Key Hooks Overview

### useForm Hook
```javascript
import { useForm } from '@/hooks/useForm';

function MyComponent() {
  const {
    values,
    errors,
    touched,
    handleChange,
    handleBlur,
    handleSubmit,
    isValid,
    isSubmitting
  } = useForm({
    initialValues: { name: '', email: '' },
    validationSchema: schema,
    onSubmit: async (values) => {
      await submitForm(values);
    }
  });

  return (
    <form onSubmit={handleSubmit}>
      <input
        name="name"
        value={values.name}
        onChange={handleChange}
        onBlur={handleBlur}
      />
      {errors.name && touched.name && <span>{errors.name}</span>}
    </form>
  );
}
```

### useAsyncData Hook
```javascript
import { useAsyncData } from '@/hooks/useAsyncData';

function DataComponent() {
  const {
    data,
    loading,
    error,
    refetch
  } = useAsyncData(
    () => apiService.fetchData(),
    { 
      immediate: true,
      dependencies: [userId] 
    }
  );

  if (loading) return <LoadingSpinner />;
  if (error) return <ErrorMessage error={error} />;

  return <DataDisplay data={data} onRefresh={refetch} />;
}
```

### useMobile Hook
```javascript
import { useMobile } from '@/hooks/useMobile';

function ResponsiveComponent() {
  const isMobile = useMobile();

  return (
    <div className={isMobile ? 'mobile-layout' : 'desktop-layout'}>
      {isMobile ? <MobileView /> : <DesktopView />}
    </div>
  );
}
```

### useDutyFormValidation Hook
```javascript
import { useDutyFormValidation } from '@/hooks/useDutyFormValidation';

function DutyForm() {
  const {
    validateField,
    validateForm,
    getFieldError,
    isFieldValid
  } = useDutyFormValidation();

  const handleFieldChange = (field, value) => {
    const error = validateField(field, value);
    // Handle validation result
  };

  return (
    // Form implementation
  );
}
```

## Testing Standards

### Hook Testing Patterns
```javascript
import { renderHook, act } from '@testing-library/react';
import { useCustomHook } from '../useCustomHook';

describe('useCustomHook', () => {
  it('initializes with correct default state', () => {
    const { result } = renderHook(() => useCustomHook('initial'));
    
    expect(result.current.state).toBe('initial');
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('handles async operations correctly', async () => {
    const { result } = renderHook(() => useCustomHook());

    await act(async () => {
      await result.current.performAction('test data');
    });

    expect(result.current.state).toBe('expected result');
    expect(result.current.loading).toBe(false);
  });

  it('handles errors appropriately', async () => {
    const { result } = renderHook(() => useCustomHook());

    await act(async () => {
      try {
        await result.current.performAction('invalid data');
      } catch (error) {
        // Expected error
      }
    });

    expect(result.current.error).toBe('Error message');
  });
});
```

### Testing with Dependencies
```javascript
import { renderHook } from '@testing-library/react';
import { AuthProvider } from '@/contexts/AuthContext';

const wrapper = ({ children }) => (
  <AuthProvider>{children}</AuthProvider>
);

describe('useAuthenticatedHook', () => {
  it('works with authentication context', () => {
    const { result } = renderHook(() => useAuthenticatedHook(), { wrapper });
    
    expect(result.current.isAuthenticated).toBe(true);
  });
});
```

## Development Guidelines

### Creating New Hooks
1. Identify reusable stateful logic across components
2. Extract logic into custom hook following naming convention (use*)
3. Implement proper error handling and cleanup
4. Write comprehensive tests using @testing-library/react-hooks
5. Document hook parameters and return values

### Hook Composition
- Hooks can use other hooks internally
- Avoid deep hook composition chains
- Keep hook interfaces simple and focused
- Use TypeScript-style JSDoc for parameter documentation

### Performance Optimization
```javascript
import { useState, useCallback, useMemo } from 'react';

export function useOptimizedHook(data, options) {
  const [state, setState] = useState();

  // Memoize expensive calculations
  const processedData = useMemo(() => {
    return expensiveProcessing(data);
  }, [data]);

  // Memoize callback functions
  const handleUpdate = useCallback((newData) => {
    setState(newData);
  }, []);

  return { processedData, handleUpdate };
}
```

### Common Patterns

#### Data Fetching Hook
```javascript
export function useApiData(endpoint, options = {}) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;

    const fetchData = async () => {
      try {
        setLoading(true);
        const result = await api.get(endpoint);
        
        if (!cancelled) {
          setData(result);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    fetchData();

    return () => {
      cancelled = true;
    };
  }, [endpoint]);

  return { data, loading, error };
}
```

#### Local Storage Hook
```javascript
export function useLocalStorage(key, initialValue) {
  const [storedValue, setStoredValue] = useState(() => {
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      return initialValue;
    }
  });

  const setValue = useCallback((value) => {
    try {
      setStoredValue(value);
      window.localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      console.error('Error saving to localStorage:', error);
    }
  }, [key]);

  return [storedValue, setValue];
}
```