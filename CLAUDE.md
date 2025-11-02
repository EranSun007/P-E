# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

P&E Manager is a unified people and engineering management system built with React 18 + Vite. The application consolidates people management (tasks, vacations, one-on-ones, projects) with HR development tracking in a single context platform designed for P&E managers with 5-15 direct reports.

**Current Phase**: Discovery/rapid iteration with local storage, preparing for cloud migration.

## Technology Stack

- **Frontend**: React 18 + Vite (ES modules)
- **Styling**: TailwindCSS + Radix UI components
- **Routing**: React Router DOM v7
- **Forms**: React Hook Form + Zod validation
- **State**: React Context + localStorage (temporary)
- **Testing**: Vitest + React Testing Library + jsdom
- **Icons**: Lucide React

## Common Commands

### Development
```bash
npm run dev          # Start dev server (default: http://localhost:5173)
npm run build        # Production build
npm run preview      # Preview production build
npm start           # Serve built files from dist/
```

### Testing
```bash
npm test                    # Run all tests with Vitest
npm test -- --watch         # Run tests in watch mode
npm test -- --coverage      # Run tests with coverage report
npm test -- path/to/file    # Run specific test file
```

### Code Quality
```bash
npm run lint         # Run ESLint on all files
```

### Bundle Analysis
```bash
npm run build:analyze        # Build and analyze bundle
npm run bundle:visual        # Build and open visual bundle analysis
npm run bundle:test          # Run bundle size tests
npm run monitor:bundle       # Run bundle monitoring dashboard
npm run ci:bundle-check      # CI bundle size check
```

## Architecture

### Data Layer Architecture
The application uses a **localStorage-based data layer** designed for easy migration to cloud databases:

1. **API Layer** (`src/api/`): Entity definitions and data models
2. **Local Client** (`src/api/localClient.js`): localStorage abstraction providing CRUD operations
3. **Services** (`src/services/`): Business logic that orchestrates data operations
4. **Components**: UI layer consuming services

**Key Pattern**: All data access goes through `localClient.entities.*` - never directly access localStorage. This abstraction enables seamless future migration to PostgreSQL/SAP HANA.

### State Management Pattern
```javascript
// Components use Context providers for global state
import { useAuth } from '@/contexts/AuthContext';

// Services handle business logic
import { CalendarService } from '@/utils/calendarService';

// Local client handles data persistence
import { localClient } from '@/api/localClient';
```

### Calendar System Architecture
The calendar system integrates multiple entity types with automatic bidirectional synchronization:

- **Event Types**: meeting, one_on_one, duty, birthday, out_of_office
- **Linking**: Events link to entities via `duty_id`, `out_of_office_id`, etc.
- **Synchronization**: CalendarSynchronizationService ensures consistency
- **Deduplication**: Automatic duplicate detection and cleanup
- **Validation**: Server-side validation in localClient.js

**Important**: When creating duties or out-of-office entries, calendar events are automatically generated. Do not manually create calendar events for these types.

### Entity Relationships
```
TeamMember
  ├── OneOnOne (1:many) - via team_member_id
  │   └── CalendarEvent - via next_meeting_calendar_event_id
  ├── Duty (1:many) - via team_member_id
  │   └── CalendarEvent - via duty_id
  ├── OutOfOffice (1:many) - via team_member_id
  │   └── CalendarEvent - via out_of_office_id
  ├── AgendaItem (1:many) - via teamMemberId
  ├── PersonalFileItem (1:many) - via teamMemberId
  └── EmployeeGoal (1:many) - via employeeId

Task
  ├── Project - via project_id
  ├── TeamMember - via assignee
  └── OneOnOne - via one_on_one_id

CalendarEvent
  ├── event_type (enum): meeting, one_on_one, duty, birthday, out_of_office
  ├── duty_id (link to Duty)
  ├── out_of_office_id (link to OutOfOffice)
  ├── team_member_id (link to TeamMember)
  └── recurrence (for birthday events)
```

### Component Organization
```
src/components/
├── ui/              # Radix UI base components (shadcn/ui style)
├── auth/            # Authentication components
├── calendar/        # Calendar-specific features
├── duty/            # Duty management components
├── task/            # Task management components
├── team/            # Team member components
├── projects/        # Project management
└── [feature]/       # Other domain-specific components
```

**Pattern**: Components are organized by business domain, not technical layer. Co-locate related functionality.

## Key Patterns and Conventions

### Import Paths
Always use `@/` path alias for src imports:
```javascript
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { localClient } from '@/api/localClient';
```

### Data Access Pattern
**Never access localStorage directly**. Always use the localClient abstraction:
```javascript
// ✅ Correct - uses abstraction layer
const tasks = await localClient.entities.Task.list();
await localClient.entities.Task.create({ title: 'New Task' });

// ❌ Wrong - direct localStorage access
const tasks = JSON.parse(localStorage.getItem('tasks'));
```

### Form Validation Pattern
Use Zod schemas with React Hook Form:
```javascript
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

const schema = z.object({
  title: z.string().min(1, 'Required'),
  // ...
});

const form = useForm({
  resolver: zodResolver(schema),
  defaultValues: { /* ... */ }
});
```

### Calendar Event Creation
For entities that auto-create calendar events (duties, out-of-office), let the system handle it:
```javascript
// ✅ Correct - calendar event auto-created
await localClient.entities.Duty.create({
  team_member_id: memberId,
  type: 'devops',
  title: 'DevOps',
  start_date: '2025-01-01',
  end_date: '2025-01-07'
});

// ❌ Wrong - don't manually create calendar event
await localClient.entities.CalendarEvent.createDutyEvent(/* ... */);
```

### Service Layer Pattern
Business logic should be in services, not components:
```javascript
// src/services/exampleService.js
export const ExampleService = {
  async businessOperation() {
    // Orchestrate multiple data operations
    const data1 = await localClient.entities.Entity1.list();
    const data2 = await localClient.entities.Entity2.get(id);
    // Process and return
    return processedResult;
  }
};
```

## Testing Strategy

### Test File Location
Tests are co-located with components in `__tests__/` directories:
```
src/components/duty/
├── DutyForm.jsx
└── __tests__/
    └── DutyForm.test.jsx
```

### Test Naming Convention
- **Unit tests**: `ComponentName.test.jsx`
- **Integration tests**: `featureName.integration.test.js`
- **E2E tests**: `workflow.e2e.test.js`

### Testing Patterns
```javascript
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

describe('ComponentName', () => {
  it('should handle user interaction', async () => {
    const user = userEvent.setup();
    render(<Component />);

    await user.click(screen.getByRole('button'));
    await waitFor(() => {
      expect(screen.getByText('Expected')).toBeInTheDocument();
    });
  });
});
```

### Mock localStorage in Tests
```javascript
beforeEach(() => {
  localStorage.clear();
  localStorage.setItem('tasks', JSON.stringify([]));
});
```

## Build Configuration

### Vite Configuration
- **Path aliases**: `@/` maps to `./src`
- **JSX in .js files**: Enabled via optimizeDeps
- **Manual chunks**: Vendor code split into vendor-core, vendor-ui, vendor-utils, vendor-charts
- **Bundle monitoring**: Custom plugin reports chunk sizes during build

### Bundle Size Targets
- **Warning threshold**: 400 KB per chunk
- **Monitoring**: Automated via scripts/bundle-monitoring-dashboard.js
- **CI checks**: Bundle size regression tests in CI pipeline

## Important Files and Locations

### Core Configuration
- `vite.config.js` - Build configuration with custom chunking
- `vitest.config.js` - Test configuration
- `tailwind.config.js` - TailwindCSS configuration
- `src/test/setup.js` - Test environment setup

### Data Layer
- `src/api/localClient.js` - **Core data abstraction** - all CRUD operations
- `src/api/entities.js` - Entity type definitions
- `src/api/oneOnOneAgenda.js` - Agenda-specific operations

### Key Services
- `src/services/authService.js` - Authentication logic
- `src/services/calendarSynchronizationService.js` - Calendar sync orchestration
- `src/services/dutyRotationService.js` - Duty rotation management
- `src/services/employeeGoalsService.js` - Employee goals management
- `src/utils/calendarService.js` - Calendar business logic

### Entry Points
- `src/main.jsx` - Application entry point with AuthProvider
- `src/App.jsx` - Root component with routing
- `index.html` - HTML entry point

## Migration Considerations

### Preparing for Cloud Migration
The codebase is structured to easily migrate from localStorage to cloud databases:

1. **All data access is abstracted** through localClient.js
2. **Migration utilities** exist in src/utils/dataMigration.js
3. **Future target**: PostgreSQL or SAP HANA Cloud
4. **Pattern**: Replace localClient.js internals, keep API surface unchanged

### localStorage Schema
Data is stored as JSON arrays in localStorage with these keys:
- `tasks`, `projects`, `stakeholders`, `team_members`
- `one_on_ones`, `meetings`, `calendar_events`
- `duties`, `duty_rotations`, `out_of_office`
- `agenda_items`, `personal_file_items`, `employee_goals`

## Common Pitfalls

1. **Don't bypass localClient**: Always use the abstraction layer
2. **Don't create calendar events manually** for duties/OOO - they auto-generate
3. **Don't forget calendar sync**: Changes to duties/OOO should trigger sync
4. **Session-based deduplication**: Duties use `creation_session_id` to prevent duplicates
5. **Date validation**: Always validate date ranges and overlaps server-side
6. **Rotation integrity**: Validate rotation fields consistency when creating/updating duties

## Future Roadmap

### Near-term
- Cloud database migration (PostgreSQL/SAP HANA)
- Real-time collaboration features
- SAP AI integration for insights
- Calendar/Outlook integration

### Long-term
- Enterprise integration (SAP SuccessFactors, JIRA)
- Multi-user support with permissions
- Mobile application
- Advanced analytics and reporting

## Development Philosophy

This is a **discovery-phase project** optimized for:
- **Rapid iteration**: Daily feature additions based on real usage
- **AI-assisted development**: Small, focused files for better AI comprehension
- **User-driven evolution**: Features evolve based on actual P&E manager needs
- **Unified context**: Everything in one place to eliminate context switching

## Getting Help

- **Developer Onboarding**: See `docs/developer-onboarding-guide.md`
- **Architecture Decisions**: See `docs/architecture-decision-record.md`
- **Naming Conventions**: See `docs/naming-conventions-guide.md`
- **Directory Documentation**: Each major directory has a README.md
