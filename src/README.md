# Source Code Directory

This directory contains the main application source code for P&E Manager, organized by feature domains and architectural layers.

## Directory Structure

```
src/
├── api/                    # Data layer and API clients
├── components/            # Reusable UI components organized by domain
├── contexts/             # React Context providers for global state
├── hooks/                # Custom React hooks for shared logic
├── lib/                  # Utility libraries and configurations
├── pages/                # Page-level components (route handlers)
├── services/             # Business logic services
├── test/                 # Test configuration and setup utilities
└── utils/                # General utility functions
```

## Architecture Patterns

### Component Organization
- **Feature-based organization**: Components are grouped by business domain (task, team, calendar, etc.)
- **Co-located tests**: Test files are placed in `__tests__/` folders within each feature directory
- **Consistent naming**: PascalCase for components, camelCase for utilities

### Data Flow
- **Local storage**: Primary data persistence using browser localStorage
- **Context API**: Global state management for authentication and shared data
- **Service layer**: Business logic orchestrates data operations between components and storage

### Import Conventions
- Use `@/` alias for src imports: `import { Button } from '@/components/ui/button'`
- Group imports: React first, then third-party, then local
- Relative imports for local files within the same feature

## Development Guidelines

### Adding New Features
1. Create feature directory under appropriate domain (components, services, etc.)
2. Add `__tests__/` folder with comprehensive test coverage
3. Follow established naming conventions
4. Update relevant documentation

### Component Standards
- Export default for main component
- Named exports for utilities/helpers
- Props destructuring with defaults
- Consistent error boundaries and loading states

### Testing Standards
- Unit tests for individual components and utilities
- Integration tests for feature workflows
- Test file naming: `ComponentName.test.jsx`
- Co-locate tests with source code