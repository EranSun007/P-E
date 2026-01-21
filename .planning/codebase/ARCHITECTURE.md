# Architecture

**Analysis Date:** 2026-01-21

## Pattern Overview

**Overall:** Three-Tier Full-Stack Architecture (Client-Service-Database)

**Key Characteristics:**
- Clear separation between frontend (React SPA) and backend (Express REST API)
- Service-oriented backend with domain-driven service classes
- Multi-tenant data isolation enforced at service layer via user_id filtering
- Stateless authentication with JWT tokens (development bypass available)
- Database-first design with PostgreSQL as single source of truth

## Layers

**Presentation Layer (Frontend):**
- Purpose: User interface and client-side state management
- Location: `src/`
- Contains: React components, pages, contexts, UI elements
- Depends on: API Client (`src/api/apiClient.js`), Entity abstractions (`src/api/entities.js`)
- Used by: End users via browser

**API Layer (Backend Routes):**
- Purpose: HTTP endpoint handlers and request/response transformation
- Location: `server/routes/`
- Contains: Express route handlers for 24 entity types (tasks, projects, team members, etc.)
- Depends on: Service layer (`server/services/`), Auth middleware (`server/middleware/auth.js`)
- Used by: Frontend via HTTP requests

**Service Layer (Backend Business Logic):**
- Purpose: Business logic, data validation, and multi-tenant enforcement
- Location: `server/services/`
- Contains: Service classes (TaskService, ProjectService, etc.) with CRUD operations
- Depends on: Database connection (`server/db/connection.js`)
- Used by: Route handlers

**Data Layer (PostgreSQL):**
- Purpose: Persistent data storage with referential integrity
- Location: Database managed via `server/db/migrate.js`
- Contains: 24 entity tables + migrations tracking table
- Depends on: PostgreSQL database server
- Used by: Service layer via parameterized queries

**Authentication Layer:**
- Purpose: User identity verification and authorization
- Location: `server/middleware/auth.js`
- Contains: JWT verification, development mode bypass, user lookup
- Depends on: UserService (`server/services/UserService.js`)
- Used by: All protected route handlers

## Data Flow

**Standard CRUD Operation (e.g., Create Task):**

1. User submits form in React component (`src/pages/Tasks.jsx`)
2. Component calls entity client: `Task.create(data)` from `src/api/entities.js`
3. Entity client delegates to API client: `apiClient.entities.Task.create(data)` in `src/api/apiClient.js`
4. API client sends HTTP POST to `/api/tasks` with JWT token in Authorization header
5. Vite proxy forwards request to Express backend (port 3001) during development
6. Auth middleware (`server/middleware/auth.js`) validates JWT and attaches `req.user` object
7. Route handler (`server/routes/tasks.js`) extracts `req.user.id` and `req.body`
8. Route handler calls `TaskService.create(req.user.id, req.body)`
9. TaskService validates data and executes parameterized SQL INSERT with user_id filter
10. PostgreSQL returns created task row
11. Service returns task object to route handler
12. Route handler sends JSON response with HTTP 201 status
13. API client parses JSON and returns task object
14. Component updates local state and triggers re-render

**State Management:**
- Global app state managed via React Context (`src/contexts/AppContext.jsx`)
- Authentication state managed separately (`src/contexts/AuthContext.jsx`)
- Data loaded on app mount after authentication succeeds
- Individual pages can refresh specific entities or all data via context methods

## Key Abstractions

**Entity Client Pattern:**
- Purpose: Unified CRUD interface for all entity types
- Examples: `src/api/entities.js` exports Task, Project, TeamMember, etc.
- Pattern: Each entity has `.list()`, `.get(id)`, `.create(data)`, `.update(id, updates)`, `.delete(id)` methods
- Abstraction layer allows switching between API mode (PostgreSQL) and local mode (localStorage) via environment variable

**Service Class Pattern:**
- Purpose: Encapsulate business logic and data access for each entity
- Examples: `server/services/TaskService.js`, `server/services/ProjectService.js`
- Pattern: Singleton classes exporting `list()`, `create()`, `update()`, `delete()` methods that always include user_id filtering
- All SQL queries are parameterized to prevent SQL injection

**Route Handler Pattern:**
- Purpose: Thin controllers that delegate to services
- Examples: `server/routes/tasks.js`, `server/routes/projects.js`
- Pattern: Express router with authentication middleware applied at router level, handlers extract `req.user.id` and delegate to service layer

**Context Provider Pattern:**
- Purpose: Global state management without prop drilling
- Examples: `src/contexts/AuthContext.jsx`, `src/contexts/AppContext.jsx`, `src/contexts/AIContext.jsx`
- Pattern: React Context with custom hooks (`useAuth()`, `useContext(AppContext)`)

## Entry Points

**Frontend Entry Point:**
- Location: `src/main.jsx`
- Triggers: Browser loads `index.html` which references built JS bundle
- Responsibilities: Initializes React app, wraps with context providers (AuthProvider → AppModeProvider → DisplayModeProvider → AppProvider → AIProvider), renders `<App />` component

**Backend Entry Point:**
- Location: `server/index.js`
- Triggers: Node.js process starts (`npm run dev:server` or Cloud Foundry app startup)
- Responsibilities: Configures Express middleware (CORS, body parser, request logger), mounts all route handlers, starts HTTP server on port 3001

**Database Entry Point:**
- Location: `server/db/migrate.js`
- Triggers: `npm run migrate` or `cf run-task` or HTTP POST to `/api/admin/migrate`
- Responsibilities: Creates migrations tracking table, reads executed migrations, runs pending SQL files in order

**React Router Entry:**
- Location: `src/pages/index.jsx`
- Triggers: User navigates to URL path
- Responsibilities: Lazy loads page components with retry logic, wraps routes in Layout component, handles chunk loading errors with fallback UI

## Error Handling

**Strategy:** Layered error handling with graceful degradation

**Patterns:**
- Backend service errors throw descriptive Error objects caught by route handlers
- Route handlers map errors to HTTP status codes (404 for not found, 400 for validation, 500 for server errors)
- API client catches HTTP errors and logs to console/localStorage via logger utility (`src/utils/logger.js`)
- Frontend components display error messages via toast notifications (`src/components/ui/toaster`)
- React ErrorBoundary (`src/components/ErrorBoundary.jsx`) catches unhandled component errors
- Page-level chunk loading failures trigger retry mechanism with fallback UI

**401 Unauthorized Handling:**
- API client detects 401 responses and clears auth data automatically
- AuthContext redirects to login page when `isAuthenticated` becomes false
- No page reload to avoid infinite loops during authentication checks

## Cross-Cutting Concerns

**Logging:**
- Frontend: Custom logger utility (`src/utils/logger.js`) with DEBUG/INFO/WARN/ERROR levels
- Backend: Console.log statements with request duration tracking middleware
- Development mode enables verbose SQL query logging in database connection layer

**Validation:**
- Frontend: Zod schemas with react-hook-form for form validation
- Backend: Service layer validates required fields before database operations
- Database: PostgreSQL constraints enforce data integrity (NOT NULL, UNIQUE, FOREIGN KEY)

**Authentication:**
- Development mode: `DEV_SKIP_AUTH=true` injects mock user (`dev-user-001`) in auth middleware
- Production mode: JWT token validation with user lookup and active status check
- Token stored in localStorage, attached to all API requests via Authorization header
- Multi-tenancy enforced by including `req.user.id` in all database queries

**Multi-Tenancy:**
- Every database table includes `user_id` column indexed for query performance
- Service layer ALWAYS filters by user_id - never allows cross-tenant data access
- Auth middleware ensures `req.user` is populated before route handlers execute
- SQL queries use parameterized statements with user_id as first parameter

**CORS:**
- Explicit origin whitelist (localhost:5173 for dev, BTP frontend URL for production)
- Preflight OPTIONS requests handled separately with proper headers
- Credentials enabled for cookie-based authentication (future XSUAA integration)

**Database Transactions:**
- Connection pool managed via `pg` library with 20 max connections
- Helper function `getClient()` available for multi-statement transactions
- Graceful shutdown handlers (SIGTERM/SIGINT) close database pool cleanly

**Code Splitting:**
- All page components lazy loaded with React.lazy()
- Vendor libraries split into chunks: vendor-core (React), vendor-ui (Radix), vendor-utils (date-fns), vendor-charts (recharts)
- Custom retry logic for failed chunk loads (3 retries with exponential backoff)

---

*Architecture analysis: 2026-01-21*
