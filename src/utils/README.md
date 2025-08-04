# Utils Directory

This directory contains general utility functions and helper modules that provide common functionality across the application. These utilities are pure functions that don't depend on application state or business logic.

## Utility Categories

### Core Utilities
- **`index.js`** - Main utility exports and common functions
- **`index.ts`** - TypeScript utility definitions
- **`validation.js`** - General validation functions and patterns

### Data Utilities
- **`arrayUtils.js`** - Array manipulation and processing functions
- **`dataMigration.js`** - Data migration utilities for storage evolution
- **`dutyTitleMigration.js`** - Specific migration for duty title changes
- **`runDutyTitleMigration.js`** - Migration execution script

### Domain-Specific Utilities
- **`calendarService.js`** - Calendar date manipulation and formatting
- **`dutyValidation.js`** - Duty-specific validation logic
- **`agendaService.js`** - Agenda processing utilities
- **`authUtils.js`** - Authentication helper functions

### UI Utilities
- **`colorUtils.js`** - Color manipulation and theme utilities
- **`formUtils.js`** - Form processing and validation helpers
- **`statusUtils.js`** - Status display and formatting utilities
- **`eventStylingService.js`** - Event styling and appearance utilities

### Cleanup Utilities
- **`runCalendarEventCleanup.js`** - Calendar event cleanup script

## Utility Patterns

### Pure Functions
All utilities should be pure functions that:
- Don't modify input parameters
- Return consistent output for same input
- Have no side effects
- Are easily testable

### Standard Utility Structure
```javascript
// Standard utility function
export function utilityFunction(input, options = {}) {
  // Input validation
  if (!input) {
    throw new Error('Input is required');
  }

  // Processing logic
  const result = processInput(input, options);

  // Return result
  return result;
}

// Helper functions (not exported)
function processInput(input, options) {
  // Internal processing logic
  return input;
}
```

### Error Handling
```javascript
// Utility with proper error handling
export function safeUtilityFunction(input) {
  try {
    return riskyOperation(input);
  } catch (error) {
    console.warn('Utility operation failed:', error.message);
    return null; // or appropriate fallback
  }
}
```

## Key Utilities Overview

### Array Utilities
```javascript
import { groupBy, sortBy, filterUnique } from '@/utils/arrayUtils';

// Group items by property
const grouped = groupBy(items, 'category');

// Sort items by property
const sorted = sortBy(items, 'createdAt');

// Remove duplicates
const unique = filterUnique(items, 'id');
```

### Calendar Utilities
```javascript
import { formatDate, isWithinRange, addBusinessDays } from '@/utils/calendarService';

// Format date for display
const formatted = formatDate(new Date(), 'MMM dd, yyyy');

// Check if date is within range
const inRange = isWithinRange(date, startDate, endDate);

// Add business days
const futureDate = addBusinessDays(new Date(), 5);
```

### Validation Utilities
```javascript
import { validateEmail, validateRequired, validateLength } from '@/utils/validation';

// Email validation
const isValidEmail = validateEmail('user@example.com');

// Required field validation
const hasValue = validateRequired(fieldValue);

// Length validation
const isValidLength = validateLength(text, { min: 5, max: 100 });
```

### Form Utilities
```javascript
import { sanitizeInput, formatFormData, validateForm } from '@/utils/formUtils';

// Sanitize user input
const clean = sanitizeInput(userInput);

// Format form data for API
const formatted = formatFormData(formValues);

// Validate entire form
const { isValid, errors } = validateForm(formData, schema);
```

## Testing Standards

### Utility Testing Patterns
```javascript
import { utilityFunction } from '../utilityFile';

describe('utilityFunction', () => {
  it('processes input correctly', () => {
    const input = { test: 'data' };
    const result = utilityFunction(input);
    
    expect(result).toEqual(expectedOutput);
  });

  it('handles edge cases', () => {
    expect(utilityFunction(null)).toBeNull();
    expect(utilityFunction(undefined)).toBeNull();
    expect(() => utilityFunction(invalidInput)).toThrow();
  });

  it('maintains input immutability', () => {
    const input = { test: 'data' };
    const originalInput = { ...input };
    
    utilityFunction(input);
    
    expect(input).toEqual(originalInput);
  });
});
```

### Test Coverage Requirements
- Test all public functions
- Test edge cases and error conditions
- Test input validation
- Verify immutability of inputs
- Test performance for complex operations

## Development Guidelines

### Adding New Utilities
1. Identify if functionality is truly generic (not business-specific)
2. Create pure functions with no side effects
3. Implement proper input validation
4. Write comprehensive tests
5. Document function parameters and return values

### Utility Organization
- Group related functions in same file
- Use descriptive function names
- Export individual functions, not default objects
- Keep utilities focused on single responsibility

### Performance Considerations
- Optimize for common use cases
- Use memoization for expensive calculations
- Avoid unnecessary object creation
- Profile performance for complex utilities

### Migration Utilities
Special utilities for data migration:
- Version-aware migration functions
- Rollback capabilities
- Data integrity validation
- Progress tracking for large migrations