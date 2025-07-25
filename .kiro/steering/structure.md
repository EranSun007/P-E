# Project Structure & Organization

## Directory Structure

```
src/
├── api/                    # Data layer and API clients
│   ├── __tests__/         # API integration tests
│   ├── base44Client.js    # Legacy Base44 SDK client
│   ├── entities.js        # Entity definitions and helpers
│   ├── integrations.js    # External service integrations
│   └── localClient.js     # localStorage-based API client
├── components/            # Reusable UI components
│   ├── ui/               # Base UI components (shadcn/ui)
│   ├── auth/             # Authentication-related components
│   ├── calendar/         # Calendar-specific components
│   ├── duty/             # Duty management components
│   ├── peer/             # Peer management components
│   ├── projects/         # Project-related components
│   ├── task/             # Task management components
│   ├── team/             # Team management components
│   └── utils/            # Utility components
├── contexts/             # React Context providers
├── hooks/                # Custom React hooks
├── lib/                  # Utility libraries
├── pages/                # Page-level components
├── services/             # Business logic services
├── test/                 # Test configuration and setup
└── utils/                # General utility functions
```

## Architectural Patterns

### Component Organization
- **UI Components**: Located in `src/components/ui/` - reusable, unstyled base components
- **Feature Components**: Organized by domain (task, team, calendar, etc.)
- **Page Components**: Top-level route components in `src/pages/`
- **Test Co-location**: Tests placed in `__tests__/` folders within feature directories

### Data Layer Architecture
- **localClient.js**: Primary data access layer using localStorage
- **entities.js**: Entity definitions and validation helpers
- **services/**: Business logic that orchestrates data operations
- **Context API**: Global state management for authentication and shared data

### File Naming Conventions
- **Components**: PascalCase (e.g., `TaskCard.jsx`, `DutyForm.jsx`)
- **Utilities**: camelCase (e.g., `calendarService.js`, `authUtils.js`)
- **Tests**: `*.test.js` or `*.test.jsx`
- **Pages**: PascalCase matching route names

### Import Patterns
- Use `@/` alias for src imports: `import { Button } from '@/components/ui/button'`
- Relative imports for local files: `import './Component.css'`
- Group imports: React first, then third-party, then local

### Component Structure
- Export default for main component
- Named exports for utilities/helpers
- Props destructuring with defaults
- Consistent error boundaries and loading states