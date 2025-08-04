# Contexts Directory

This directory contains React Context providers that manage global application state and provide shared functionality across components.

## Context Files

### Core Contexts
- **`AuthContext.jsx`** - Authentication state management and user session handling

## Context Architecture

### Context Pattern
```jsx
import React, { createContext, useContext, useReducer, useEffect } from 'react';

// Create context
const MyContext = createContext();

// Context provider component
export function MyProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, initialState);

  // Context value with state and actions
  const value = {
    // State
    ...state,
    
    // Actions
    performAction: (data) => dispatch({ type: 'PERFORM_ACTION', payload: data }),
    resetState: () => dispatch({ type: 'RESET' })
  };

  return (
    <MyContext.Provider value={value}>
      {children}
    </MyContext.Provider>
  );
}

// Custom hook for consuming context
export function useMyContext() {
  const context = useContext(MyContext);
  
  if (!context) {
    throw new Error('useMyContext must be used within MyProvider');
  }
  
  return context;
}
```

### State Management Principles
- **Centralized State**: Global state that needs to be shared across components
- **Immutable Updates**: State updates follow immutable patterns
- **Action-based Updates**: State changes through dispatched actions
- **Type Safety**: Actions and state have consistent structure

## AuthContext Overview

### Authentication State
The AuthContext manages:
- User authentication status
- User profile information
- Session management
- Login/logout operations
- Password change functionality

### Usage Example
```jsx
import { useAuth } from '@/contexts/AuthContext';

function MyComponent() {
  const {
    user,
    isAuthenticated,
    login,
    logout,
    changePassword,
    loading
  } = useAuth();

  const handleLogin = async (credentials) => {
    try {
      await login(credentials);
      // Handle successful login
    } catch (error) {
      // Handle login error
    }
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div>
      {isAuthenticated ? (
        <div>
          <p>Welcome, {user.name}!</p>
          <button onClick={logout}>Logout</button>
        </div>
      ) : (
        <LoginForm onLogin={handleLogin} />
      )}
    </div>
  );
}
```

### Provider Setup
```jsx
import { AuthProvider } from '@/contexts/AuthContext';

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          {/* Your routes */}
        </Routes>
      </Router>
    </AuthProvider>
  );
}
```

## Context Design Guidelines

### When to Use Context
Use Context for:
- Authentication state
- Theme/UI preferences
- User settings
- Global notifications
- Shared data that many components need

### When NOT to Use Context
Avoid Context for:
- Frequently changing data (causes re-renders)
- Data that only a few components need
- Complex business logic (use services instead)
- Performance-critical state updates

### Context Composition
```jsx
// Multiple context providers
function AppProviders({ children }) {
  return (
    <AuthProvider>
      <ThemeProvider>
        <NotificationProvider>
          {children}
        </NotificationProvider>
      </ThemeProvider>
    </AuthProvider>
  );
}
```

## Testing Standards

### Context Testing Patterns
```jsx
import { render, screen, fireEvent } from '@testing-library/react';
import { AuthProvider, useAuth } from '../AuthContext';

// Test component that uses the context
function TestComponent() {
  const { user, login, logout } = useAuth();
  
  return (
    <div>
      {user ? (
        <div>
          <span>User: {user.name}</span>
          <button onClick={logout}>Logout</button>
        </div>
      ) : (
        <button onClick={() => login({ username: 'test', password: 'test' })}>
          Login
        </button>
      )}
    </div>
  );
}

describe('AuthContext', () => {
  const renderWithProvider = (component) => {
    return render(
      <AuthProvider>
        {component}
      </AuthProvider>
    );
  };

  it('provides authentication functionality', () => {
    renderWithProvider(<TestComponent />);
    
    expect(screen.getByText('Login')).toBeInTheDocument();
  });

  it('handles login correctly', async () => {
    renderWithProvider(<TestComponent />);
    
    fireEvent.click(screen.getByText('Login'));
    
    // Wait for login to complete and verify state change
    await screen.findByText('User: test');
  });

  it('throws error when used outside provider', () => {
    // Test that hook throws error when used without provider
    const TestComponentWithoutProvider = () => {
      useAuth(); // This should throw
      return <div>Test</div>;
    };

    expect(() => render(<TestComponentWithoutProvider />)).toThrow(
      'useAuth must be used within AuthProvider'
    );
  });
});
```

### Integration Testing
```jsx
import { render, screen } from '@testing-library/react';
import { AuthProvider } from '@/contexts/AuthContext';
import App from '@/App';

describe('AuthContext Integration', () => {
  it('integrates with protected routes', () => {
    render(
      <AuthProvider>
        <App />
      </AuthProvider>
    );

    // Test that unauthenticated users see login screen
    expect(screen.getByText('Login')).toBeInTheDocument();
  });
});
```

## Performance Considerations

### Avoiding Unnecessary Re-renders
```jsx
import { useMemo } from 'react';

export function MyProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, initialState);

  // Memoize context value to prevent unnecessary re-renders
  const value = useMemo(() => ({
    ...state,
    performAction: (data) => dispatch({ type: 'PERFORM_ACTION', payload: data })
  }), [state]);

  return (
    <MyContext.Provider value={value}>
      {children}
    </MyContext.Provider>
  );
}
```

### Context Splitting
```jsx
// Split contexts to minimize re-renders
const AuthStateContext = createContext();
const AuthActionsContext = createContext();

export function AuthProvider({ children }) {
  const [state, dispatch] = useReducer(authReducer, initialState);

  const actions = useMemo(() => ({
    login: (credentials) => dispatch({ type: 'LOGIN', payload: credentials }),
    logout: () => dispatch({ type: 'LOGOUT' })
  }), []);

  return (
    <AuthStateContext.Provider value={state}>
      <AuthActionsContext.Provider value={actions}>
        {children}
      </AuthActionsContext.Provider>
    </AuthStateContext.Provider>
  );
}

// Separate hooks for state and actions
export const useAuthState = () => useContext(AuthStateContext);
export const useAuthActions = () => useContext(AuthActionsContext);
```

## Development Guidelines

### Adding New Contexts
1. Identify truly global state that multiple components need
2. Create context with provider and custom hook
3. Implement proper error handling for missing provider
4. Write comprehensive tests including integration tests
5. Document context API and usage patterns

### Context Best Practices
- Keep context focused on single responsibility
- Use reducers for complex state logic
- Memoize context values to prevent unnecessary re-renders
- Provide clear error messages for missing providers
- Document when and how to use each context