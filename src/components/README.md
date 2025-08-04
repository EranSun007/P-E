# Components Directory

This directory contains all reusable UI components for P&E Manager, organized by feature domains and component types.

## Directory Structure

```
components/
├── ui/                   # Base UI components (shadcn/ui primitives)
├── agenda/              # Agenda and personal file management
├── auth/                # Authentication-related components
├── calendar/            # Calendar-specific components
├── duty/                # Duty management components
├── goals/               # Goal tracking and management
├── peer/                # Peer management components
├── projects/            # Project-related components
├── task/                # Task management components
├── team/                # Team management components
└── ErrorBoundary.jsx    # Global error boundary component
```

## Component Categories

### Base UI Components (`ui/`)
Reusable, unstyled base components built on Radix UI primitives:
- Form controls (Button, Input, Select, etc.)
- Layout components (Card, Dialog, Sheet, etc.)
- Data display (Table, Badge, Avatar, etc.)
- Feedback components (Toast, Alert, Loading states)

### Feature Components
Domain-specific components that implement business logic:
- **Agenda**: Meeting agenda and personal file management
- **Auth**: Login, password change, protected routes
- **Calendar**: Event display, meeting management, view modes
- **Duty**: Duty assignment, rotation management, status tracking
- **Goals**: Goal creation, tracking, import/export
- **Peer**: External peer management and out-of-office tracking
- **Projects**: Project creation, management, progress tracking
- **Task**: Task creation, management, filtering, metadata
- **Team**: Team member management, out-of-office, profiles

## Component Standards

### File Naming
- **Components**: PascalCase (e.g., `TaskCard.jsx`, `DutyForm.jsx`)
- **Tests**: `ComponentName.test.jsx` in `__tests__/` folder
- **Utilities**: camelCase for helper functions

### Component Structure
```jsx
// Standard component structure
import React from 'react';
import { Button } from '@/components/ui/button';

export default function ComponentName({ prop1, prop2 = 'default' }) {
  // Component logic
  
  return (
    <div className="component-container">
      {/* Component JSX */}
    </div>
  );
}

// Named exports for utilities
export const helperFunction = () => {
  // Helper logic
};
```

### Props and State
- Use props destructuring with default values
- Implement proper TypeScript-style prop validation with Zod when needed
- Manage local state with useState, global state via Context

### Styling
- Use Tailwind CSS classes for styling
- Follow design system patterns from `ui/` components
- Implement responsive design with Tailwind breakpoints

## Testing Standards

### Test Organization
- Place tests in `__tests__/` folder within each feature directory
- Use descriptive test file names: `ComponentName.test.jsx`
- Group related tests by component functionality

### Test Patterns
```jsx
import { render, screen, fireEvent } from '@testing-library/react';
import ComponentName from '../ComponentName';

describe('ComponentName', () => {
  it('renders correctly with default props', () => {
    render(<ComponentName />);
    expect(screen.getByRole('button')).toBeInTheDocument();
  });

  it('handles user interactions', () => {
    const mockHandler = jest.fn();
    render(<ComponentName onClick={mockHandler} />);
    fireEvent.click(screen.getByRole('button'));
    expect(mockHandler).toHaveBeenCalled();
  });
});
```

## Development Guidelines

### Adding New Components
1. Choose appropriate feature directory or create new one
2. Follow naming conventions (PascalCase for components)
3. Create comprehensive tests in `__tests__/` folder
4. Document complex props and usage patterns
5. Use existing `ui/` components as building blocks

### Component Composition
- Build complex components from simpler `ui/` components
- Keep components focused on single responsibility
- Extract reusable logic into custom hooks
- Use proper error boundaries for robust error handling

### Performance Considerations
- Use React.memo for expensive components
- Implement proper key props for lists
- Avoid unnecessary re-renders with useCallback/useMemo
- Lazy load heavy components when appropriate