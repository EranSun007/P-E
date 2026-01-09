# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

P&E Manager is a full-stack project and task management application built with React (frontend) and Express.js (backend), using PostgreSQL for data persistence. The app is deployed on SAP BTP (Business Technology Platform) Cloud Foundry.

**Architecture:** Full-stack application with REST API
**Frontend:** React 18 + Vite + Tailwind CSS + Radix UI
**Backend:** Express.js + PostgreSQL
**Deployment:** SAP BTP Cloud Foundry
**Authentication:** Development mode (bypasses auth) / XSUAA ready for production

## Development Commands

### Running the Full Stack
```bash
npm run dev              # Start both frontend and backend concurrently
npm run dev:server       # Start backend only (port 3001)
npm run dev:client       # Start frontend only (port 5173)
```

### Database Operations
```bash
npm run migrate          # Run database migrations
npm run setup:db         # Ensure database exists and run migrations
npm run setup:full       # Full setup: database + migrations + start dev
```

### Testing
```bash
npm test                 # Run all tests once
npm test:watch           # Run tests in watch mode
npm run lint             # Run ESLint
```

### Build and Deploy
```bash
npm run build:client     # Build frontend for production (outputs to dist/)
npm start                # Start backend in production mode
npm run preview          # Preview production build locally
```

### Cloud Foundry Deployment
```bash
# Backend deployment
cf push pe-manager-backend -p pe-manager-backend.zip

# Frontend deployment
cf push pe-manager-frontend -p pe-manager-frontend.zip

# Run migrations on BTP
cf run-task pe-manager-backend "npm run migrate"

# View logs
cf logs pe-manager-backend --recent
cf logs pe-manager-frontend --recent
```

### Bundle Analysis
```bash
npm run build:analyze    # Build and generate bundle analysis
npm run bundle:visual    # Build and open visual bundle report
npm run monitor:bundle   # Run bundle monitoring dashboard
```

## Architecture

### Full-Stack Data Flow

```
┌─────────────────────────────────────────┐
│    Frontend (React + Vite)              │
│         Port 5173 (dev)                 │
├─────────────────────────────────────────┤
│  Components → entities.js → apiClient   │
│      ↓            ↓            ↓        │
│  Tasks.jsx → Task.list() → GET /api/tasks │
└─────────────────────────────────────────┘
                ↓
         Vite Proxy (/api → :3001)
                ↓
┌─────────────────────────────────────────┐
│    Backend (Express.js)                 │
│         Port 3001                       │
├─────────────────────────────────────────┤
│  Auth Middleware → Routes → Services    │
│  (dev-user-001)      ↓         ↓        │
│                  /api/tasks  TaskService│
│                      ↓           ↓      │
│              PostgreSQL Database        │
└─────────────────────────────────────────┘
```

### Backend Layer

**Entry Point:** `server/index.js`
- Express app with CORS configured for frontend domain
- JSON body parser with 10mb limit
- Request logging middleware
- Health check: `GET /api/health`
- Global error handler with stack traces in development

**Database:** `server/db/connection.js`
- PostgreSQL connection pool using `pg` library
- Reads from VCAP_SERVICES (SAP BTP) or local env variables
- SSL enabled for BTP deployment: `ssl: { rejectUnauthorized: false }`
- Connection pooling: 20 max connections
- Query helper with automatic logging in development

**Migrations:** `server/db/migrate.js`
- Version-tracked migration system
- Migrations table stores executed versions
- Idempotent execution (safe to run multiple times)
- Run with: `npm run migrate` or `cf run-task`

**Authentication:** `server/middleware/auth.js`
- **Development mode** (`AUTH_MODE=development`): Bypasses authentication with mock user (dev-user-001)
- **Production mode** (`AUTH_MODE=production`): SAP BTP XSUAA JWT validation
- Attaches `req.user` object with { id, name, email }

**Services Pattern:** `server/services/`
All 11 entity types have service classes following this pattern:
```javascript
class TaskService {
  async list(userId, orderBy)      // Get all for user
  async create(userId, data)        // Create new
  async update(userId, id, updates) // Update existing
  async delete(userId, id)          // Delete
}
```

**Service Classes:**
- TaskService.js - Tasks with auto-completion_date when status="done"
- ProjectService.js - Project management
- StakeholderService.js - Stakeholder information
- TeamMemberService.js - Team members with skills arrays
- OneOnOneService.js - One-on-one meetings
- MeetingService.js - Team meetings with agendas
- CalendarEventService.js - Calendar events with recurrence
- NotificationService.js - User notifications
- ReminderService.js - Task reminders
- CommentService.js - Comments on tasks/projects
- TaskAttributeService.js - Dynamic task attributes

**REST Routes:** `server/routes/`
All routes follow RESTful conventions:
- `GET /api/[entity]` - List all
- `GET /api/[entity]/:id` - Get single
- `POST /api/[entity]` - Create
- `PUT /api/[entity]/:id` - Update
- `DELETE /api/[entity]/:id` - Delete

Available endpoints:
- `/api/auth/me` - Get current user info
- `/api/tasks` - Task operations
- `/api/projects` - Project operations
- `/api/stakeholders` - Stakeholder operations
- `/api/team-members` - Team member operations
- `/api/one-on-ones` - One-on-one meeting operations
- `/api/meetings` - Meeting operations
- `/api/calendar-events` - Calendar event operations
- `/api/notifications` - Notification operations
- `/api/reminders` - Reminder operations
- `/api/comments` - Comment operations
- `/api/task-attributes` - Task attribute operations

### Database Schema

**Database Name:** `pe_manager` (local) or auto from VCAP_SERVICES (BTP)
**Tables:** 11 entity tables + migrations tracking table

**Key Features:**
- UUID primary keys generated by PostgreSQL (`uuid_generate_v4()`)
- Multi-tenancy via `user_id` field (all queries automatically filtered)
- Auto-timestamps via PostgreSQL triggers (`updated_date` updated on every change)
- PostgreSQL native arrays for tags[], skills[], participants[]
- JSONB fields for flexible metadata
- Indexes on user_id, status, dates for query performance
- Foreign keys with CASCADE DELETE for referential integrity

**Tables:**
```sql
tasks               - Task tracking with completion_date auto-set
projects            - Project management with budgets/deadlines
stakeholders        - Stakeholder contact information
team_members        - Team member profiles with skills
one_on_ones         - One-on-one meetings with team members
meetings            - Team meetings with agendas and action items
calendar_events     - Calendar scheduling with recurrence
notifications       - User notifications with read status
reminders           - Task reminders with completion tracking
comments            - Comments linked to tasks/projects
task_attributes     - Dynamic custom attributes for tasks
migrations          - Migration version tracking
```

### Frontend Layer

**Data Access:** `src/api/`
- **apiClient.js** - HTTP-based API client using fetch
- **localClient.js** - Legacy localStorage client (backward compatibility)
- **entities.js** - Exports unified entity clients (switches between API/local based on env)

**API Client Pattern:**
```javascript
import { Task } from '@/api/entities';

// List all tasks
const tasks = await Task.list();

// Create task
const newTask = await Task.create({
  title: 'New Task',
  status: 'todo'
});

// Update task
const updated = await Task.update(taskId, { status: 'done' });

// Delete task
await Task.delete(taskId);
```

**Environment Switching:**
- Default: Uses apiClient (PostgreSQL backend via HTTP)
- `VITE_API_MODE=local` - Uses localClient (localStorage)

**State Management:** `src/contexts/`
- **AuthContext.jsx** - Authentication state and login/logout
- **AppContext.jsx** - Application-wide data (projects, tasks, etc.)
  - Loads all entities on mount
  - Provides refresh functions per entity type
  - Exposes `refreshAll()` for full reload
  - Loading and error states

**Context Usage Pattern:**
```jsx
const { projects, tasks, refreshProjects, loading, error } = useContext(AppContext);
const { isAuthenticated, login, logout } = useAuth();
```

**Routing:** `src/pages/index.jsx`
- React Router v7 with dynamic page detection
- Root path defaults to Tasks page
- Custom Layout component wraps all pages with navigation

**UI Components:**
- `src/components/ui/` - shadcn/ui components (built on Radix UI primitives)
- `src/components/projects/` - Project-specific components
- `src/components/task/` - Task-specific components
- `src/components/auth/` - Authentication components
- Styling: Tailwind CSS with custom theme

**Path Aliases:**
Vite configured with `@` alias to `src/`:
```javascript
import { Task } from '@/api/entities';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
```

## Important Patterns

### Multi-Tenancy (Critical)

**All data is filtered by user_id automatically at the service layer:**
```javascript
// Service layer always filters by user_id
const tasks = await TaskService.list(req.user.id);

// SQL queries ALWAYS include user_id filter
SELECT * FROM tasks WHERE user_id = $1 ORDER BY created_date DESC
```

**NEVER write direct SQL without user_id filter!**

**User Object:**
- Development: `{ id: 'dev-user-001', name: 'Development User', email: 'dev@example.com' }`
- Production: Extracted from XSUAA JWT token

### Auto-Timestamps

**Database triggers update `updated_date` automatically:**
```sql
CREATE OR REPLACE FUNCTION update_updated_date()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_date = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

**Business logic handles completion_date:**
```javascript
// In TaskService.update()
if (updates.status === 'done' && currentTask.status !== 'done') {
  updates.completion_date = new Date().toISOString();
}
```

### Error Handling

**Backend:** HTTP status codes with JSON error messages
```javascript
res.status(404).json({ error: 'Task not found' });
```

**Frontend:** Logger utility for error tracking
```javascript
import { logger } from '@/utils/logger';

logger.error('API request failed', { url, error: String(error) });
logger.info('Task created', { taskId });
```

**Logger Levels:**
- DEBUG: Detailed diagnostic information
- INFO: General informational messages
- WARN: Warning messages
- ERROR: Error messages (also stored in localStorage)

### Security

**SQL Injection Prevention (CRITICAL):**
```javascript
// ✅ CORRECT - Always use parameterized queries
const sql = 'SELECT * FROM tasks WHERE id = $1 AND user_id = $2';
await query(sql, [taskId, userId]);

// ❌ NEVER DO THIS - SQL injection vulnerability!
const sql = `SELECT * FROM tasks WHERE id = '${taskId}'`;
```

**CORS Configuration:**
```javascript
// Explicit origin whitelist
cors({
  origin: process.env.NODE_ENV === 'production'
    ? process.env.FRONTEND_URL
    : ['http://localhost:5173', 'http://localhost:3000'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
})
```

## Environment Configuration

### Development Environment

**Backend (.env.development):**
```env
NODE_ENV=development
PORT=3001
AUTH_MODE=development

# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=pe_manager
DB_USER=postgres
DB_PASSWORD=postgres

# Development user
DEV_USER_ID=dev-user-001
DEV_USER_NAME=Development User
DEV_USER_EMAIL=dev@example.com

# Frontend URL for CORS
FRONTEND_URL=http://localhost:5173
```

**Frontend (.env.development):**
```env
VITE_API_URL=/api
VITE_AUTH_MODE=development
VITE_BACKEND_URL=http://localhost:3001
```

**Vite Proxy (vite.config.js):**
```javascript
server: {
  proxy: {
    '/api': {
      target: 'http://localhost:3001',
      changeOrigin: true,
      secure: false
    }
  }
}
```

### Production Environment (SAP BTP)

**Backend:** Reads from VCAP_SERVICES automatically
```javascript
// connection.js reads database credentials from:
const vcapServices = JSON.parse(process.env.VCAP_SERVICES);
const postgresService = vcapServices['postgresql-db'][0];
const dbConfig = postgresService.credentials;
```

**Frontend (.env.production):**
```env
VITE_API_URL=https://pe-manager-backend.cfapps.eu01-canary.hana.ondemand.com/api
VITE_AUTH_MODE=development
```

**Critical for BTP:**
- Database credentials: Auto-injected via VCAP_SERVICES service binding
- SSL required: Always enabled with `rejectUnauthorized: false`
- CORS origin: Must match frontend domain exactly
- Health check: Backend needs HTTP health endpoint for Cloud Foundry

## Testing

**Test Runner:** Vitest with jsdom environment
**Test Files:** `*.test.js` or `**/__tests__/*.js`
**Setup:** `vitest.setup.js`

**Testing Libraries:**
- @testing-library/react
- @testing-library/jest-dom
- @testing-library/user-event

**Running Tests:**
```bash
npm test              # Run once
npm test:watch        # Watch mode
npm run test:bundle   # Test bundle size regression
```

**Mock API calls in tests:**
```javascript
vi.mock('@/api/entities', () => ({
  Task: {
    list: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn()
  }
}));
```

## Database Operations

### Running Migrations

```bash
# Local PostgreSQL
npm run migrate

# SAP BTP
cf run-task pe-manager-backend "npm run migrate"
```

### Connecting to Database

```bash
# Local (assuming Docker PostgreSQL)
docker exec -it teamssync-postgres psql -U postgres -d pe_manager

# Check tables
\dt

# Query data
SELECT * FROM tasks WHERE user_id = 'dev-user-001';
```

### Creating New Migrations

1. Add SQL to `server/db/schema.sql`
2. Update `MIGRATIONS` array in `server/db/migrate.js`:
```javascript
{
  version: '002_add_new_field',
  name: 'Add new field to tasks',
  sql: `ALTER TABLE tasks ADD COLUMN new_field TEXT;`
}
```
3. Run: `npm run migrate`

## Deployment

### Local Development

```bash
# Start PostgreSQL (if using Docker)
docker ps | grep postgres

# Start both frontend and backend
npm run dev

# Or start separately:
npm run dev:server  # Terminal 1
npm run dev:client  # Terminal 2
```

### SAP BTP Deployment

**Prerequisites:**
- Cloud Foundry CLI installed
- Logged in to SAP BTP: `cf login --sso`
- PostgreSQL service created: `pe-manager`

**Build and Package:**
```bash
# Build frontend
npm run build:client

# Create backend ZIP (exclude node_modules, let buildpack install)
zip -r pe-manager-backend.zip server/ package.json package-lock.json manifest-simple.yml .cfignore

# Create frontend ZIP
cp manifest-frontend.yml Staticfile dist/
cd dist && zip -r ../pe-manager-frontend.zip .
cd .. && rm dist/manifest-frontend.yml dist/Staticfile
```

**Deploy:**
```bash
# Backend
cf push pe-manager-backend -p pe-manager-backend.zip

# Frontend
cf push pe-manager-frontend -p pe-manager-frontend.zip

# Run migrations
cf run-task pe-manager-backend "npm run migrate"
```

**Verify:**
```bash
# Check apps
cf apps

# Check logs
cf logs pe-manager-backend --recent
cf logs pe-manager-frontend --recent

# Test health endpoint
curl https://pe-manager-backend.cfapps.eu01-canary.hana.ondemand.com/api/health
```

## Common Development Tasks

### Adding a New Entity

1. **Database:** Add table to `server/db/schema.sql`
2. **Service:** Create `server/services/NewEntityService.js`
3. **Routes:** Create `server/routes/newEntity.js`
4. **Mount Route:** Add to `server/index.js`
5. **API Client:** Add entity to `src/api/apiClient.js`
6. **Export:** Add to `src/api/entities.js`
7. **Frontend:** Update components to use new entity

### Debugging API Issues

```bash
# Backend logs show all SQL queries in development
npm run dev:server

# Test endpoint directly
curl http://localhost:3001/api/health
curl http://localhost:3001/api/auth/me
curl http://localhost:3001/api/tasks

# Check database
docker exec -it teamssync-postgres psql -U postgres -d pe_manager
SELECT * FROM tasks;
```

### Testing Multi-Tenancy

```bash
# Verify users can't see each other's data
SELECT user_id, COUNT(*) FROM tasks GROUP BY user_id;

# In production, test with multiple XSUAA users
```

## Key Technical Decisions

1. **Interface Compatibility:** apiClient matches localClient's exact interface - no component changes needed
2. **Multi-Tenancy:** All queries filtered by user_id at service layer - enforced in every operation
3. **Auto-Timestamps:** Database triggers for updated_date, business logic for completion_date
4. **Development Workflow:** Vite proxy eliminates CORS during development
5. **Authentication Strategy:** Development mode bypass for testing, XSUAA prepared but not yet active
6. **Fresh Start:** No automatic localStorage → PostgreSQL migration (clean slate for production)
7. **BTP Deployment:** Separate backend/frontend apps with service bindings for PostgreSQL

## Migration Status

**Completed Phases:**
- ✅ Phase 1: Backend Foundation (Express + PostgreSQL + Services)
- ✅ Phase 2: REST API Layer (Routes + Auth Middleware)
- ✅ Phase 3: Frontend Migration (apiClient + Environment Config)
- ✅ Phase 4: SAP BTP Deployment (Successfully deployed to Cloud Foundry)

**Current State:**
- Backend deployed: https://pe-manager-backend.cfapps.eu01-canary.hana.ondemand.com
- Frontend deployed: https://pe-manager-frontend.cfapps.eu01-canary.hana.ondemand.com
- Database: PostgreSQL with 11 entity tables migrated
- Authentication: Development mode (admin/password123)

**Future Phases:**
- Phase 5: XSUAA Integration (production authentication)
- Phase 6: Cleanup & Documentation

See **MIGRATION_PROGRESS.md** for detailed migration documentation.

## Dependencies

### Backend
- express - Web server framework
- pg - PostgreSQL client
- cors - CORS middleware
- dotenv - Environment variable management
- @sap/xsenv - SAP environment helpers (for VCAP_SERVICES)
- @sap/xssec - SAP authentication (XSUAA JWT validation)

### Frontend
- react, react-dom - UI library
- react-router-dom - Client-side routing
- @radix-ui/* - UI component primitives
- tailwindcss - Utility-first CSS framework
- lucide-react - Icon library
- date-fns - Date manipulation utilities
- zod - Schema validation
- react-hook-form - Form state management

### DevDependencies
- vite - Build tool and dev server
- vitest - Test runner
- @testing-library/react - Component testing utilities
- concurrently - Run multiple npm scripts in parallel
- eslint - Code linting

## Notes for Future Development

- **Multi-tenancy is enforced at service layer** - never write direct SQL without user_id filter
- **Development mode bypasses authentication** - always test with real XSUAA before production
- **Database migrations are version-tracked** - never modify existing migrations, create new ones
- **Frontend can switch between localStorage and API** - use `VITE_API_MODE=local` for testing
- **All API errors are logged** - check logger.js output for debugging
- **XSUAA integration prepared but not active** - ready to enable for production authentication
- **Vite environment variables are baked at build time** - not read at runtime, must rebuild after changes
- **AuthProvider must wrap the app** - missing provider causes "useAuth must be used within AuthProvider" error
- **CORS configuration critical for BTP** - frontend and backend domains must match CORS settings exactly

## Project Vision

P&E Manager is a unified people and engineering management system that combines:
1. **People Management**: Team tasks, vacation tracking, one-on-one goals, and project management
2. **HR Development**: Engineer Development Capacity and career growth tracking

This is designed for P&E managers who need flexibility to evolve their management tools based on real-world insights. Unlike top-down tools like Asana or Monday.com, P&E Manager is customizable and extensible.
