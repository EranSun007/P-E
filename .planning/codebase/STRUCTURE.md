# Codebase Structure

**Analysis Date:** 2026-01-21

## Directory Layout

```
/Users/i306072/Documents/GitHub/P-E/
├── server/                    # Backend Express.js application
│   ├── routes/                # REST API endpoint handlers
│   ├── services/              # Business logic and data access
│   ├── middleware/            # Express middleware (auth)
│   ├── db/                    # Database connection and migrations
│   └── ai/                    # AI integration tools
├── src/                       # Frontend React application
│   ├── pages/                 # Page-level components (lazy loaded)
│   ├── components/            # Reusable UI components
│   ├── contexts/              # React Context providers
│   ├── api/                   # API client and entity abstractions
│   ├── utils/                 # Utility functions and helpers
│   ├── hooks/                 # Custom React hooks
│   ├── services/              # Frontend services (auth, etc.)
│   └── lib/                   # Third-party library configurations
├── dist/                      # Production build output (frontend)
├── scripts/                   # Deployment and utility scripts
├── public/                    # Static assets (favicon, etc.)
├── docs/                      # Documentation files
├── .planning/                 # GSD codebase mapping output
│   └── codebase/              # Architecture and structure docs
├── .auto-claude/              # Auto-claude configuration and specs
├── .agent-os/                 # Agent OS product configuration
├── .kiro/                     # Kiro specifications and settings
├── node_modules/              # NPM dependencies (gitignored)
├── package.json               # Project dependencies and scripts
├── vite.config.js             # Vite build configuration
├── tailwind.config.js         # Tailwind CSS configuration
├── manifest.yml               # Cloud Foundry backend manifest
├── manifest-frontend.yml      # Cloud Foundry frontend manifest
├── .env.development           # Development environment variables
└── .env.production            # Production environment variables
```

## Directory Purposes

**server/**
- Purpose: Backend Express.js application serving REST API
- Contains: Route handlers, service classes, database logic, middleware
- Key files: `server/index.js` (entry point), `server/db/connection.js` (database pool)

**server/routes/**
- Purpose: REST API endpoint definitions
- Contains: 24 route files (one per entity type)
- Key files: `server/routes/tasks.js`, `server/routes/projects.js`, `server/routes/teamMembers.js`
- Pattern: Each route file exports Express router with authentication middleware applied

**server/services/**
- Purpose: Business logic and data access layer
- Contains: 26 service classes implementing CRUD operations
- Key files: `server/services/TaskService.js`, `server/services/ProjectService.js`, `server/services/UserService.js`
- Pattern: Singleton classes with `list()`, `create()`, `update()`, `delete()` methods

**server/middleware/**
- Purpose: Express middleware functions
- Contains: `auth.js` (JWT authentication and development bypass)
- Key files: `server/middleware/auth.js`

**server/db/**
- Purpose: Database connection management and migrations
- Contains: Connection pool configuration, migration runner, SQL migration files
- Key files: `server/db/connection.js`, `server/db/migrate.js`, `server/db/schema.sql`, `server/db/002_work_items.sql` through `016_github_integration.sql`

**server/ai/**
- Purpose: AI assistant integration (Claude API)
- Contains: Tool definitions for AI-powered features
- Key files: `server/ai/tools.js`

**src/**
- Purpose: Frontend React single-page application
- Contains: Components, pages, contexts, API clients, utilities
- Key files: `src/main.jsx` (entry point), `src/App.jsx` (root component)

**src/pages/**
- Purpose: Top-level page components (one per route)
- Contains: 23 page components (Tasks, Calendar, Team, Projects, etc.)
- Key files: `src/pages/index.jsx` (routing setup), `src/pages/Tasks.jsx`, `src/pages/Team.jsx`, `src/pages/Calendar.jsx`
- Pattern: Lazy loaded via React.lazy() with retry logic

**src/components/**
- Purpose: Reusable UI components organized by feature
- Contains: Subdirectories for ui/ (base components), task/, team/, calendar/, auth/, projects/, etc.
- Key files: `src/components/ui/*` (shadcn/ui components), `src/components/auth/ProtectedRoute.jsx`

**src/components/ui/**
- Purpose: Base UI components built on Radix UI primitives
- Contains: 59 shadcn/ui components (Button, Dialog, Select, Table, etc.)
- Key files: `src/components/ui/button.jsx`, `src/components/ui/dialog.jsx`, `src/components/ui/table.jsx`

**src/contexts/**
- Purpose: React Context providers for global state
- Contains: 6 context providers (Auth, App, DisplayMode, AppMode, AI)
- Key files: `src/contexts/AuthContext.jsx`, `src/contexts/AppContext.jsx`, `src/contexts/AIContext.jsx`

**src/api/**
- Purpose: API client abstraction and entity interfaces
- Contains: HTTP client, localStorage client, entity exports
- Key files: `src/api/entities.js` (entity exports), `src/api/apiClient.js` (HTTP client), `src/api/localClient.js` (localStorage fallback)

**src/utils/**
- Purpose: Utility functions and helpers
- Contains: 19 utility modules (logger, date formatting, context formatter, etc.)
- Key files: `src/utils/logger.js`, `src/utils/dataMigration.js`, `src/utils/releaseCycles.js`

**src/hooks/**
- Purpose: Custom React hooks
- Contains: 6 custom hooks
- Key files: `src/hooks/usePageContext.js`

**src/services/**
- Purpose: Frontend service layer (authentication, etc.)
- Contains: 15 service modules
- Key files: `src/services/authService.js`

**dist/**
- Purpose: Production build output (generated by Vite)
- Contains: Optimized JavaScript bundles, CSS, HTML, assets
- Key files: `dist/index.html`, `dist/assets/*`
- Generated: Yes (via `npm run build:client`)
- Committed: No (gitignored)

**scripts/**
- Purpose: Deployment scripts and utilities
- Contains: 10 utility scripts
- Key files: `scripts/check-ai-deployments.js`

**.planning/codebase/**
- Purpose: GSD command output (architecture documentation)
- Contains: ARCHITECTURE.md, STRUCTURE.md (this file)
- Generated: Yes (via `/gsd:map-codebase`)
- Committed: Yes

**.auto-claude/**
- Purpose: Auto-claude task management and specifications
- Contains: Specs, insights, roadmap, file timelines
- Key files: `.auto-claude/specs/`, `.auto-claude/insights/`

**.agent-os/**
- Purpose: Agent OS product configuration
- Contains: `product/` subdirectory with product-specific overrides
- Key files: `.agent-os/product/`

**node_modules/**
- Purpose: NPM package dependencies
- Contains: 626 packages
- Generated: Yes (via `npm install`)
- Committed: No (gitignored)

## Key File Locations

**Entry Points:**
- `server/index.js`: Backend Express server entry point
- `src/main.jsx`: Frontend React app entry point
- `src/pages/index.jsx`: React Router configuration and page routing
- `index.html`: HTML shell for React app

**Configuration:**
- `package.json`: NPM dependencies and scripts
- `vite.config.js`: Vite build tool configuration (proxy, plugins, code splitting)
- `tailwind.config.js`: Tailwind CSS theme and plugin configuration
- `eslint.config.js`: ESLint code quality rules
- `vitest.config.js`: Vitest test runner configuration
- `.env.development`: Development environment variables (DB credentials, API URLs)
- `.env.production`: Production environment variables (BTP URLs)
- `manifest.yml`: Cloud Foundry backend deployment manifest
- `manifest-frontend.yml`: Cloud Foundry frontend deployment manifest

**Core Logic:**
- `server/services/*.js`: 26 service classes implementing business logic
- `server/routes/*.js`: 24 REST API route handlers
- `src/api/entities.js`: Entity abstraction layer (switches between API/localStorage)
- `src/contexts/AppContext.jsx`: Global application state management
- `src/contexts/AuthContext.jsx`: Authentication state management

**Testing:**
- `vitest.setup.js`: Test environment setup
- `src/__tests__/`: Frontend component tests
- `src/api/__tests__/`: API client tests
- `src/components/*/test__/`: Component-specific tests

**Database:**
- `server/db/connection.js`: PostgreSQL connection pool
- `server/db/migrate.js`: Migration runner
- `server/db/schema.sql`: Initial schema (migration 001)
- `server/db/002_*.sql` through `016_*.sql`: Incremental migrations

**Authentication:**
- `server/middleware/auth.js`: JWT validation middleware
- `src/services/authService.js`: Frontend auth service
- `src/contexts/AuthContext.jsx`: Auth state provider
- `src/components/auth/ProtectedRoute.jsx`: Route-level auth guard

## Naming Conventions

**Files:**
- React components: PascalCase.jsx (e.g., `Tasks.jsx`, `TeamMemberProfile.jsx`)
- Services: PascalCase.js (e.g., `TaskService.js`, `UserService.js`)
- Utilities: camelCase.js (e.g., `logger.js`, `dataMigration.js`)
- Routes: camelCase.js (e.g., `tasks.js`, `teamMembers.js`)
- Database migrations: `###_snake_case.sql` (e.g., `002_work_items.sql`)

**Directories:**
- React features: lowercase (e.g., `components/task/`, `components/team/`)
- Backend modules: lowercase (e.g., `server/routes/`, `server/services/`)

**API Endpoints:**
- RESTful convention: `/api/entity-name` (kebab-case)
- Examples: `/api/tasks`, `/api/team-members`, `/api/one-on-ones`

**Database Tables:**
- Snake_case: `tasks`, `team_members`, `one_on_ones`, `calendar_events`
- Plural names for entity tables

**React Components:**
- PascalCase: `TaskList`, `TeamMemberCard`, `CalendarView`
- Prefixes: None for regular components, `use` for hooks (e.g., `useAuth`)

## Where to Add New Code

**New Entity (Full Stack):**
- Database: Create migration SQL file in `server/db/###_entity_name.sql`
- Backend Service: Create `server/services/EntityService.js` with CRUD methods
- Backend Routes: Create `server/routes/entities.js` (plural, kebab-case)
- Mount Route: Add to `server/index.js` imports and `app.use('/api/entities', entityRouter)`
- API Client: Add entity to `src/api/apiClient.js` using `createEntityClient('/entities')`
- Entity Export: Add to `src/api/entities.js` export list
- Frontend: Create components in `src/components/entity/` and page in `src/pages/Entity.jsx`

**New REST Endpoint:**
- Primary code: `server/routes/[entity].js` (add new router method)
- Service method: Add corresponding method to service class in `server/services/[Entity]Service.js`
- If custom logic needed: Extend entity client in `src/api/apiClient.js`

**New UI Component:**
- Shared/reusable: `src/components/ui/[component-name].jsx`
- Feature-specific: `src/components/[feature]/[ComponentName].jsx`
- Example: Task form in `src/components/task/TaskCreationForm.jsx`

**New Page:**
- Page component: `src/pages/[PageName].jsx`
- Add to routing: Update `src/pages/index.jsx` imports and route definitions
- Add to navigation: Update `src/pages/Layout.jsx` navigation menu

**Utilities:**
- Shared helpers: `src/utils/[utilityName].js`
- Examples: Date formatting, data transformations, logging

**Business Logic:**
- Backend: Add methods to existing service class or create new service in `server/services/`
- Frontend: Add to appropriate context provider or create new hook in `src/hooks/`

**Middleware:**
- Backend: `server/middleware/[name].js`
- Apply globally in `server/index.js` or per-route in route files

**Context Provider:**
- Create: `src/contexts/[Feature]Context.jsx`
- Wrap: Add to provider hierarchy in `src/main.jsx`
- Export hook: Export custom `use[Feature]()` hook alongside provider

**Database Migration:**
- Create: `server/db/###_description.sql` (increment version number)
- Register: Add entry to `MIGRATIONS` array in `server/db/migrate.js`
- Run: Execute `npm run migrate` locally or `cf run-task pe-manager-backend "npm run migrate"` on BTP

## Special Directories

**dist/**
- Purpose: Vite build output for production deployment
- Generated: Yes (via `npm run build:client`)
- Committed: No (in .gitignore)
- Deployment: Zipped and pushed to Cloud Foundry frontend app

**node_modules/**
- Purpose: NPM package dependencies
- Generated: Yes (via `npm install`)
- Committed: No (in .gitignore)

**.planning/**
- Purpose: GSD command output (architecture mapping)
- Generated: Yes (via `/gsd:map-codebase`)
- Committed: Yes (for documentation)

**.auto-claude/**
- Purpose: Auto-claude task tracking and specifications
- Generated: Yes (via auto-claude workflows)
- Committed: Yes (except worktrees/)

**.git/**
- Purpose: Git version control metadata
- Generated: Yes (via `git init`)
- Committed: No (never committed)

**logs/**
- Purpose: Application logs from development/testing
- Generated: Yes (by various development tools)
- Committed: No (in .gitignore)

**Build Artifacts:**
- `pe-manager-backend.zip`: Backend deployment package (server/ + package.json + manifest)
- `pe-manager-frontend.zip`: Frontend deployment package (dist/ + Staticfile + manifest)
- Generated: Yes (manually via zip commands before `cf push`)
- Committed: No (in .gitignore)

## Path Aliases

**Vite Configuration:**
- `@` → `src/` (configured in `vite.config.js`)

**Usage Examples:**
```javascript
import { Task } from '@/api/entities';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { logger } from '@/utils/logger';
```

## Import Patterns

**Backend (ES Modules):**
```javascript
import express from 'express';
import TaskService from '../services/TaskService.js';
import { authMiddleware } from '../middleware/auth.js';
import { query } from '../db/connection.js';
```

**Frontend (Vite + Path Aliases):**
```javascript
import { Task } from '@/api/entities';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
```

## Code Organization Principles

**Backend:**
- Thin controllers (routes) delegate to fat models (services)
- Services encapsulate all database access
- Multi-tenancy enforced at service layer (never in routes)
- Middleware handles cross-cutting concerns (auth, logging)

**Frontend:**
- Pages are lazy loaded for code splitting
- Shared state in Context, local state in components
- API calls abstracted through entity clients
- UI components reusable across features

**Full Stack:**
- Clear separation of concerns (presentation, API, business logic, data)
- RESTful API design with consistent endpoint naming
- Environment-based configuration (development vs. production)

---

*Structure analysis: 2026-01-21*
