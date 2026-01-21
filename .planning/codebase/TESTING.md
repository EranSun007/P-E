# Testing Patterns

**Analysis Date:** 2026-01-21

## Test Framework

**Runner:**
- Vitest 3.2.4
- Config: `vitest.config.js`

**Assertion Library:**
- Vitest built-in assertions (Jest-compatible)
- @testing-library/jest-dom 6.9.1 for DOM assertions

**Run Commands:**
```bash
npm test                # Run all tests once
npm test:watch          # Watch mode
npm run test:bundle     # Bundle size regression tests
npm run test:bundle-analysis    # Bundle analysis validation
npm run test:loading-performance # Loading performance tests
npm run test:optimization       # Optimization validation
```

## Test File Organization

**Location:**
- Co-located with source in `__tests__/` subdirectories
- Or alongside source with `.test.js`/`.test.jsx` suffix
- Both patterns used throughout codebase

**Examples:**
```
src/api/localClient.test.js           # Same directory pattern
src/api/__tests__/entities.test.js    # Subdirectory pattern
src/services/__tests__/authService.test.js
src/utils/__tests__/calendarService.test.js
scripts/__tests__/bundle-analysis.test.js
```

**Naming:**
- Format: `<filename>.test.js` or `<filename>.test.jsx`
- Integration tests: `<feature>Integration.test.js` or `<feature>WorkflowIntegration.test.js`
- Comprehensive tests: `<feature>-comprehensive.test.js`
- Enhanced tests: `<feature>-enhanced.test.js`

**Structure:**
```
src/
├── api/
│   ├── entities.js
│   ├── localClient.test.js
│   └── __tests__/
│       ├── entities.test.js
│       ├── duty.test.js
│       └── peer.test.js
├── services/
│   └── __tests__/
│       ├── authService.test.js
│       ├── calendarSynchronizationService.test.js
│       └── errorHandlingService.test.js
└── utils/
    └── __tests__/
        ├── calendarService.test.js
        └── eventStylingService.test.js
```

## Test Structure

**Suite Organization:**
```javascript
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

describe('ServiceName', () => {
  beforeEach(() => {
    // Setup before each test
    vi.clearAllMocks();
    localStorage.clear();
  });

  afterEach(() => {
    // Cleanup after each test
    vi.restoreAllMocks();
  });

  describe('methodName', () => {
    it('should perform expected behavior', () => {
      // Arrange
      const input = 'test';

      // Act
      const result = Service.method(input);

      // Assert
      expect(result).toBe('expected');
    });

    it('should handle edge case', () => {
      // Test edge cases
    });

    it('should throw error on invalid input', () => {
      // Test error conditions
    });
  });
});
```

**Patterns:**
- Nested `describe` blocks for grouping related tests
- `beforeEach` for test isolation (clear mocks, localStorage, etc.)
- `afterEach` for cleanup (restore mocks, reset state)
- Clear test names: "should [expected behavior]"
- Arrange-Act-Assert pattern (implicit, not commented)

**React Component Tests:**
```javascript
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import React from 'react';
import Component from '../Component';

describe('Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render correctly', () => {
    render(<Component />);
    expect(screen.getByText('Expected Text')).toBeInTheDocument();
  });

  it('should handle user interaction', async () => {
    render(<Component />);
    const button = screen.getByRole('button', { name: /click me/i });

    fireEvent.click(button);

    await waitFor(() => {
      expect(screen.getByText('Updated')).toBeInTheDocument();
    });
  });
});
```

## Mocking

**Framework:** Vitest built-in mocking (`vi` module)

**Module Mocking:**
```javascript
// Mock entire module
vi.mock('../services/authService.js', () => ({
  default: {
    getStoredToken: vi.fn(),
    clearAuthData: vi.fn()
  }
}));

// Import and use mocked module
const { default: AuthService } = await import('../services/authService.js');
AuthService.getStoredToken.mockReturnValue(mockToken);
```

**Function Mocking:**
```javascript
// Mock specific functions
const mockFn = vi.fn();
mockFn.mockReturnValue('value');
mockFn.mockResolvedValue(Promise.resolve('async value'));
mockFn.mockRejectedValue(new Error('error'));

// Clear mock state between tests
vi.clearAllMocks();     // Clear call history
vi.restoreAllMocks();   // Restore original implementation
```

**Console Mocking (Common Pattern):**
```javascript
beforeEach(() => {
  vi.spyOn(console, 'warn').mockImplementation(() => {});
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
});
```

**What to Mock:**
- External API calls (fetch, HTTP requests)
- Browser APIs (localStorage, IntersectionObserver, ResizeObserver, matchMedia)
- Authentication services
- Database connections
- Time-dependent functions (Date, setTimeout)

**What NOT to Mock:**
- Pure utility functions (test actual implementation)
- Simple data transformations
- Component internal logic
- Validation functions

## Fixtures and Factories

**Test Data Pattern:**
```javascript
// Inline test data (most common)
describe('Duty Entity', () => {
  it('should create a duty with valid data', async () => {
    const teamMember = await TeamMember.create({
      name: 'John Doe',
      role: 'Developer',
      email: 'john@example.com'
    });

    const dutyData = {
      team_member_id: teamMember.id,
      type: 'devops',
      title: 'DevOps Duty Week 1',
      description: 'Responsible for deployments and monitoring',
      start_date: '2025-01-20',
      end_date: '2025-01-27'
    };

    const duty = await Duty.create(dutyData);
    expect(duty).toBeDefined();
  });
});
```

**Mock Token Factory:**
```javascript
const mockToken = {
  username: 'admin',
  timestamp: Date.now(),
  value: 'mock-token'
};
```

**Location:**
- No centralized fixtures directory
- Test data defined inline within test files
- Factories created as needed in individual test files
- localStorage used for state persistence in some tests

## Setup and Teardown

**Global Setup:**
- Location: `src/test/setup.js` (configured in vitest.config.js)
- Imports @testing-library/jest-dom
- Mocks browser APIs:
  - IntersectionObserver
  - ResizeObserver
  - window.matchMedia

**Setup File Pattern:**
```javascript
import '@testing-library/jest-dom'

// Mock IntersectionObserver
global.IntersectionObserver = class IntersectionObserver {
  constructor() {}
  disconnect() {}
  observe() {}
  unobserve() {}
}

// Mock ResizeObserver
global.ResizeObserver = class ResizeObserver {
  constructor() {}
  disconnect() {}
  observe() {}
  unobserve() {}
}

// Mock matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
})
```

**Per-Test Setup:**
```javascript
beforeEach(() => {
  // Clear all mocks
  vi.clearAllMocks();

  // Clear localStorage
  localStorage.clear();

  // Mock console methods
  vi.spyOn(console, 'warn').mockImplementation(() => {});
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  // Restore all mocks
  vi.restoreAllMocks();
});
```

## Coverage

**Requirements:** No explicit coverage thresholds enforced

**Current Test Distribution:**
- API layer: `src/api/__tests__/` (entities, duty, peer, calendar events, out of office)
- Services: `src/services/__tests__/` (auth, calendar, error handling, birthday events, etc.)
- Utils: `src/utils/__tests__/` (calendar service, event styling, integration tests)
- Scripts: `scripts/__tests__/` (bundle analysis, performance)
- Components: Limited component testing (UI components, some feature components)

**View Coverage:**
- No dedicated coverage script in package.json
- Run with: `vitest run --coverage` (requires coverage plugin)

## Test Types

**Unit Tests:**
- Scope: Individual functions, methods, classes
- Pattern: Test single responsibility in isolation
- Examples:
  - `src/api/localClient.test.js` - Tests localStorage-based entity operations
  - `src/services/__tests__/authService.test.js` - Tests authentication methods
  - `src/api/__tests__/entities.test.js` - Tests User entity integration

**Integration Tests:**
- Scope: Multiple components/services working together
- Pattern: Test data flow across system boundaries
- Examples:
  - `src/services/__tests__/calendarSynchronizationIntegration.test.js`
  - `src/services/__tests__/birthdayEventIntegration.test.js`
  - `src/utils/__tests__/calendarWorkflowIntegration.simple.test.js`
  - `src/utils/__tests__/oneOnOneIntegration.test.js`

**Workflow Tests:**
- Scope: Complete user workflows
- Pattern: Simulate real user interactions across multiple pages/features
- Examples:
  - `src/utils/__tests__/calendarIntegrationComplete.test.js`

**E2E Tests:**
- Framework: Not currently used
- No Playwright/Cypress configuration detected

**Performance Tests:**
- `scripts/__tests__/loading-performance.test.js` - Tests initial load time
- `scripts/__tests__/bundle-size-regression.test.js` - Monitors bundle size
- `scripts/__tests__/bundle-analysis.test.js` - Validates bundle structure

## Common Patterns

**Async Testing:**
```javascript
it('should handle async operation', async () => {
  const result = await asyncFunction();
  expect(result).toBe('expected');
});

it('should wait for UI update', async () => {
  render(<Component />);
  fireEvent.click(screen.getByRole('button'));

  await waitFor(() => {
    expect(screen.getByText('Updated')).toBeInTheDocument();
  });
});
```

**Error Testing:**
```javascript
it('should throw error when no token exists', async () => {
  AuthService.getStoredToken.mockReturnValue(null);

  await expect(User.me()).rejects.toThrow('No authenticated user found');
});

it('should handle invalid input', () => {
  expect(() => {
    validateInput(null);
  }).toThrow('Invalid input');
});
```

**localStorage Testing:**
```javascript
beforeEach(() => {
  localStorage.clear();
});

it('should store data in localStorage', async () => {
  await Entity.create({ name: 'Test' });

  const stored = JSON.parse(localStorage.getItem('entities'));
  expect(stored).toHaveLength(1);
  expect(stored[0].name).toBe('Test');
});
```

**Component State Testing:**
```javascript
it('should update state on user interaction', async () => {
  const { rerender } = render(<Component initialValue="initial" />);

  expect(screen.getByText('initial')).toBeInTheDocument();

  fireEvent.click(screen.getByRole('button'));

  await waitFor(() => {
    expect(screen.getByText('updated')).toBeInTheDocument();
  });
});
```

**API Mocking Pattern:**
```javascript
vi.mock('@/api/entities', () => ({
  Task: {
    list: vi.fn().mockResolvedValue([]),
    create: vi.fn().mockResolvedValue({ id: '1', title: 'New Task' }),
    update: vi.fn().mockResolvedValue({ id: '1', title: 'Updated' }),
    delete: vi.fn().mockResolvedValue(true)
  }
}));
```

## Test Naming Conventions

**Descriptive Names:**
- Start with "should" for expected behavior
- Include context: "should return true for valid credentials"
- Edge cases: "should return null for non-existent duty"
- Error cases: "should throw error when no token exists"

**Test Grouping:**
```javascript
describe('ServiceName', () => {
  describe('CRUD Operations', () => {
    it('should create entity with valid data', () => {});
    it('should update entity', () => {});
    it('should delete entity', () => {});
  });

  describe('Validation', () => {
    it('should validate required fields', () => {});
    it('should reject invalid input', () => {});
  });

  describe('Edge Cases', () => {
    it('should handle empty results', () => {});
    it('should handle null values', () => {});
  });
});
```

## Testing Best Practices

**Test Isolation:**
- Each test should be independent
- Use `beforeEach` to reset state
- Clear mocks between tests
- Don't rely on test execution order

**Assertion Quality:**
- Use specific assertions: `toBe`, `toEqual`, `toHaveLength`
- Avoid generic `toBeTruthy`/`toBeFalsy`
- Test behavior, not implementation details
- One logical assertion per test (may include multiple expect calls)

**Async Best Practices:**
- Always use `async/await` for async tests
- Use `waitFor` for UI updates
- Set timeouts for slow operations
- Clean up async side effects

**Mock Hygiene:**
- Clear mocks in `beforeEach`
- Restore mocks in `afterEach`
- Mock at appropriate level (module vs function)
- Verify mock calls when behavior depends on side effects

---

*Testing analysis: 2026-01-21*
