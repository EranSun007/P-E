# Developer Onboarding Guide

Welcome to P&E Manager! This guide will help you understand the codebase structure, development patterns, and get you productive quickly.

## Quick Start

### Prerequisites
- Node.js (v18 or higher)
- npm (comes with Node.js)
- Git
- Modern code editor (VS Code recommended)

### Setup
```bash
# Clone the repository
git clone <repository-url>
cd pe-manager

# Install dependencies
npm install

# Start development server
npm run dev

# Run tests
npm run test

# Build for production
npm run build
```

## Project Overview

P&E Manager is a unified people and engineering management system built with React 18, Vite, and TailwindCSS. It helps P&E managers connect people development with project delivery in a single platform.

### Key Technologies
- **Frontend**: React 18 + Vite
- **Styling**: TailwindCSS + Radix UI
- **State**: React Context + localStorage
- **Forms**: React Hook Form + Zod
- **Testing**: Vitest + React Testing Library
- **Icons**: Lucide React

## Codebase Architecture

### Directory Structure
```
src/
├── api/                    # Data layer (localStorage-based)
├── components/            # UI components by feature domain
│   ├── ui/               # Base components (Radix UI)
│   ├── auth/             # Authentication components
│   ├── calendar/         # Calendar features
│   ├── duty/             # Duty management
│   ├── task/             # Task management
│   └── team/             # Team management
├── contexts/             # React Context providers
├── hooks/                # Custom React hooks
├── pages/                # Route-level components
├── services/             # Business logic services
├── utils/                # Pure utility functions
└── test/                 # Test setup and utilities
```

### Architectural Patterns

#### Component Organization
- **Feature-based**: Components grouped by business domain
- **Co-located tests**: Tests in `__tests__/` folders within features
- **Consistent naming**: PascalCase for components, camelCase for utilities

#### Data Flow
```
Pages → Services → API Layer → localStorage
  ↓        ↓         ↓
Components ← Hooks ← Context
```

#### Import Conventions
```javascript
// React imports first
import React, { useState, useEffect } from 'react';

// Third-party imports
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';

// Local imports
import { useAuth } from '@/contexts/AuthContext';
import './Component.css';
```

## Development Patterns

### Component Structure
```jsx
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';

export default function ComponentName({ 
  prop1, 
  prop2 = 'default' 
}) {
  const { user } = useAuth();
  const [localState, setLocalState] = useState();

  const handleAction = () => {
    // Event handler logic
  };

  return (
    <div className="component-container">
      <h2 className="text-xl font-semibold">{prop1}</h2>
      <Button onClick={handleAction}>
        Action
      </Button>
    </div>
  );
}

// Named exports for utilities
export const helperFunction = () => {
  // Helper logic
};
```

### Service Pattern
```javascript
class ServiceName {
  constructor(dependencies = {}) {
    this.apiClient = dependencies.apiClient || localClient;
  }

  async performOperation(data) {
    try {
      const validatedData = this.validateInput(data);
      const result = await this.apiClient.operation(validatedData);
      return this.transformResult(result);
    } catch (error) {
      this.handleError(error);
      throw error;
    }
  }
}

export default new ServiceName();
```

### Custom Hook Pattern
```javascript
import { useState, useEffect, useCallback } from 'react';

export function useCustomHook(initialValue) {
  const [state, setState] = useState(initialValue);
  const [loading, setLoading] = useState(false);

  const performAction = useCallback(async (data) => {
    setLoading(true);
    try {
      const result = await asyncOperation(data);
      setState(result);
      return result;
    } finally {
      setLoading(false);
    }
  }, []);

  return { state, loading, performAction };
}
```

## Testing Guidelines

### Test Structure
```javascript
import { render, screen, fireEvent } from '@testing-library/react';
import ComponentName from '../ComponentName';

describe('ComponentName', () => {
  it('renders correctly', () => {
    render(<ComponentName prop1="test" />);
    expect(screen.getByText('test')).toBeInTheDocument();
  });

  it('handles user interactions', () => {
    const mockHandler = jest.fn();
    render(<ComponentName onAction={mockHandler} />);
    
    fireEvent.click(screen.getByRole('button'));
    expect(mockHandler).toHaveBeenCalled();
  });
});
```

### Testing Commands
```bash
# Run all tests
npm run test

# Run tests in watch mode
npm run test -- --watch

# Run specific test file
npm run test -- ComponentName.test.jsx

# Run tests with coverage
npm run test -- --coverage
```

## Styling Guidelines

### TailwindCSS Usage
```jsx
// Responsive design
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">

// Component variants
<Button className="bg-blue-500 hover:bg-blue-600 text-white">
  Primary Action
</Button>

// Conditional styling
<div className={`
  base-styles
  ${isActive ? 'bg-blue-100' : 'bg-gray-100'}
  ${size === 'large' ? 'p-6' : 'p-4'}
`}>
```

### Component Composition
```jsx
// Use base UI components
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

function FeatureCard({ title, children, onAction }) {
  return (
    <Card>
      <CardHeader>
        <h3 className="text-lg font-semibold">{title}</h3>
      </CardHeader>
      <CardContent>
        {children}
        <Button onClick={onAction} className="mt-4">
          Action
        </Button>
      </CardContent>
    </Card>
  );
}
```

## Common Tasks

### Adding a New Feature
1. **Create component directory**: `src/components/feature/`
2. **Add main component**: `FeatureComponent.jsx`
3. **Create tests**: `__tests__/FeatureComponent.test.jsx`
4. **Add service if needed**: `src/services/featureService.js`
5. **Update routing**: Add route in pages if needed
6. **Add documentation**: Update relevant README files

### Adding a New Page
1. **Create page component**: `src/pages/NewPage.jsx`
2. **Add route**: Update routing configuration
3. **Create tests**: `src/pages/__tests__/NewPage.test.jsx`
4. **Add navigation**: Update Layout component if needed

### Adding a New Service
1. **Create service file**: `src/services/newService.js`
2. **Follow service pattern**: Use dependency injection
3. **Add tests**: `src/services/__tests__/newService.test.js`
4. **Export service**: Update service index if exists

### Adding a New Hook
1. **Create hook file**: `src/hooks/useNewHook.js`
2. **Follow hook pattern**: Start with `use` prefix
3. **Add tests**: `src/hooks/__tests__/useNewHook.test.js`
4. **Document usage**: Add examples in comments

## Data Management

### localStorage API
```javascript
import { localClient } from '@/api/localClient';

// CRUD operations
const items = await localClient.getItems();
const newItem = await localClient.createItem(data);
const updated = await localClient.updateItem(id, changes);
await localClient.deleteItem(id);
```

### Entity Patterns
```javascript
import { createEntity, validateEntity } from '@/api/entities';

// Create new entity
const task = createEntity('task', {
  title: 'New Task',
  priority: 'high',
  assignee: userId
});

// Validate entity
const isValid = validateEntity('task', taskData);
```

## Debugging Tips

### Development Tools
- **React DevTools**: Browser extension for React debugging
- **Vite DevTools**: Built-in development server features
- **Console Logging**: Use `console.log` for debugging (remove before commit)

### Common Issues
1. **Import errors**: Check file paths and exports
2. **State not updating**: Verify state mutation patterns
3. **Tests failing**: Check mock implementations and async handling
4. **Styling issues**: Verify TailwindCSS class names and responsive breakpoints

## Code Quality

### ESLint Rules
- Follow React best practices
- Use consistent formatting
- Avoid unused variables and imports
- Implement proper error handling

### Git Workflow
```bash
# Create feature branch
git checkout -b feature/new-feature

# Make changes and commit
git add .
git commit -m "feat: add new feature"

# Push and create PR
git push origin feature/new-feature
```

### Commit Messages
- `feat:` - New features
- `fix:` - Bug fixes
- `docs:` - Documentation changes
- `test:` - Test additions/changes
- `refactor:` - Code refactoring

## Getting Help

### Resources
- **README files**: Each directory has detailed documentation
- **Code comments**: Inline documentation for complex logic
- **Test files**: Examples of component usage
- **Design system**: Check `src/components/ui/` for available components

### Best Practices
1. **Read existing code**: Understand patterns before adding new code
2. **Write tests**: Add tests for new functionality
3. **Follow conventions**: Use established naming and structure patterns
4. **Ask questions**: Don't hesitate to ask for clarification
5. **Document changes**: Update README files when adding new features

## Next Steps

1. **Explore the codebase**: Start with `src/pages/` to understand main features
2. **Run the application**: Use `npm run dev` to see it in action
3. **Read component documentation**: Check README files in each directory
4. **Try making a small change**: Add a simple feature to get familiar
5. **Run tests**: Ensure everything works with `npm run test`

Welcome to the team! 🚀