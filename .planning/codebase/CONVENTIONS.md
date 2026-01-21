# Coding Conventions

**Analysis Date:** 2026-01-21

## Naming Patterns

**Files:**
- React components: PascalCase (e.g., `TaskList.jsx`, `AuthContext.jsx`)
- Services: PascalCase + "Service" suffix (e.g., `TaskService.js`, `AuthService.js`)
- Utilities: camelCase (e.g., `logger.js`, `validation.js`, `colorUtils.js`)
- Routes: camelCase (e.g., `tasks.js`, `teamMembers.js`)
- Tests: Match source file + `.test.js` or `.test.jsx` suffix
- Test directories: `__tests__/` subdirectories within feature folders

**Functions:**
- camelCase for all functions (e.g., `createEntityClient`, `handleHttpError`, `loadTasks`)
- Async functions explicitly named with action verbs (e.g., `fetchWithAuth`, `refreshAll`)
- Event handlers: `handle` prefix (e.g., `handleCreateTask`, `handleDelete`)

**Variables:**
- camelCase for local variables (e.g., `localTasks`, `showCreationForm`, `isAuthenticated`)
- UPPER_SNAKE_CASE for constants (e.g., `LOG_LEVELS`, `JWT_SECRET`, `API_BASE_URL`)
- Boolean flags: `is`, `has`, `should` prefixes (e.g., `isAuthenticated`, `hasError`)

**Types:**
- PascalCase for classes (e.g., `Logger`, `TaskService`, `AuthMiddleware`)
- camelCase for objects/config (e.g., `apiClient`, `entities`)

**Database Fields:**
- snake_case for all database columns (e.g., `user_id`, `created_date`, `team_member_id`)
- Date fields: `_date` suffix (e.g., `due_date`, `completion_date`)
- ID fields: `id` or `_id` suffix (e.g., `id`, `user_id`, `team_member_id`)

## Code Style

**Formatting:**
- Tool: ESLint (eslint.config.js) with recommended React rules
- No Prettier config detected - ESLint handles formatting
- Indentation: 2 spaces (implicit from codebase examination)
- Line length: No strict limit enforced
- Semicolons: Used consistently throughout codebase
- Quotes: Single quotes for strings, double quotes for JSX attributes

**Linting:**
- ESLint v9.19.0 with flat config format
- Plugins: `eslint-plugin-react`, `eslint-plugin-react-hooks`, `eslint-plugin-react-refresh`
- React version: 18.3
- ECMAScript: 2020/latest with JSX support
- Key rules:
  - React recommended rules enabled
  - React Hooks rules enforced
  - `react/jsx-no-target-blank` disabled
  - `react-refresh/only-export-components` warning (allows constant exports)

**JSX/React:**
```jsx
// Component structure pattern
export default function ComponentName() {
  const [state, setState] = useState(initial);

  useEffect(() => {
    // Effect logic
  }, [dependencies]);

  const handleEvent = async (param) => {
    // Handler logic
  };

  return (
    <Element className={cn("classes")}>
      {/* Content */}
    </Element>
  );
}
```

## Import Organization

**Order:**
1. External dependencies (React, libraries)
2. Internal utilities/services
3. Components
4. Styles (if any)

**Pattern:**
```javascript
// External
import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { Plus, Trash2 } from 'lucide-react';

// Internal API/Services
import { Task } from '@/api/entities';
import { logger } from '@/utils/logger';

// Components
import { Button } from '@/components/ui/button';
import TaskList from '@/components/task/TaskList';

// Contexts
import { AppContext } from '@/contexts/AppContext.jsx';
```

**Path Aliases:**
- `@` → `src/` (configured in Vite and Vitest)
- Absolute imports preferred over relative: `@/api/entities` not `../../api/entities`
- Extensions included in imports: `.js`, `.jsx` explicitly specified

## Error Handling

**Backend:**
- HTTP status codes with JSON error objects
- Pattern: `res.status(code).json({ error: message })`
- Status codes:
  - 200: Success (implicit)
  - 201: Resource created
  - 204: Success with no content (DELETE operations)
  - 400: Bad request (validation errors)
  - 401: Unauthorized (missing/invalid auth)
  - 403: Forbidden (insufficient permissions)
  - 404: Not found (resource doesn't exist)
  - 500: Internal server error

**Backend Error Pattern:**
```javascript
try {
  const result = await Service.operation(userId, data);
  res.json(result);
} catch (error) {
  console.error('Operation error:', error);
  const statusCode = error.message.includes('not found') ? 404 : 400;
  res.status(statusCode).json({ error: error.message });
}
```

**Frontend:**
- Logger utility for structured error tracking
- Location: `src/utils/logger.js`
- Levels: DEBUG (0), INFO (1), WARN (2), ERROR (3)
- Errors stored in localStorage (last 10 entries)
- Environment-aware: DEBUG level in dev, WARN level in production

**Frontend Error Pattern:**
```javascript
try {
  await Task.create(data);
  setShowForm(false);
} catch (err) {
  logger.error('Failed to create task', { error: String(err) });
  setError('Failed to create task. Please try again.');
}
```

**Service Layer (Backend):**
- Always catch and re-throw with user-friendly messages
- Never expose database errors directly to client
- Validate inputs before database operations
- Use parameterized queries to prevent SQL injection

**Service Error Pattern:**
```javascript
async create(userId, data) {
  try {
    // Validation
    if (!data.title) {
      throw new Error('Missing required field: title');
    }

    const result = await query(sql, values);
    return result.rows[0];
  } catch (error) {
    console.error('Service.create error:', error);
    throw new Error('Failed to create resource');
  }
}
```

## Logging

**Framework:** Custom Logger class (`src/utils/logger.js`)

**Patterns:**
```javascript
// Import
import { logger } from '@/utils/logger';

// Usage
logger.debug('Detailed diagnostic info', { context });
logger.info('General informational message', { taskId });
logger.warn('Warning condition', { issue });
logger.error('Error occurred', { error: String(err) });
```

**Backend Console Logging:**
- Service layer: `console.error('ServiceName.method error:', error)`
- Routes: `console.error('VERB /api/path error:', error)`
- Middleware: `console.error('Middleware name error:', error)`
- SQL queries logged automatically in development (via `db/connection.js`)

**When to Log:**
- ERROR: All caught exceptions in try/catch blocks
- WARN: Deprecated features, fallback behaviors, recoverable issues
- INFO: Successful operations, state changes, API calls
- DEBUG: Detailed execution flow, variable values (dev only)

**What NOT to Log:**
- Passwords or authentication credentials
- Full error stack traces in production
- Sensitive user data or PII
- Database connection strings

## Comments

**When to Comment:**
- Complex algorithms or business logic
- Non-obvious workarounds or hacks
- API endpoint documentation (routes)
- Function purpose (JSDoc style for services)
- Regex patterns or magic numbers
- Security-critical sections

**JSDoc/TSDoc:**
- Used for service layer methods
- Includes @param and @returns tags
- Pattern:
```javascript
/**
 * List all tasks for a user with optional sorting
 * @param {string} userId - The user ID
 * @param {string} orderBy - Sort field (e.g., '-created_date' for descending)
 * @returns {Promise<Array>} Array of tasks
 */
async list(userId, orderBy = '-created_date') {
  // Implementation
}
```

**Middleware Documentation:**
```javascript
/**
 * Authentication middleware
 * Validates JWT token and attaches user to request
 *
 * Supports two modes:
 * 1. Development mode with DEV_SKIP_AUTH=true: Bypass authentication entirely
 * 2. Normal mode: Validate JWT token from Authorization header
 */
async function authMiddleware(req, res, next) {
  // Implementation
}
```

**Component Comments:**
- Minimal inline comments in JSX
- Use JSDoc for complex props or hook logic
- Prefer self-documenting code over comments

## Function Design

**Size:**
- No strict limits enforced
- Service methods typically 20-40 lines
- Component functions vary widely
- Extract complex logic into separate functions when readability suffers

**Parameters:**
- Backend services: Always accept `userId` first for multi-tenancy
- Service pattern: `async method(userId, entityId, data)`
- Frontend components: Use destructured props
- Use default parameters for optional values

**Parameter Pattern (Backend):**
```javascript
// Service layer
async create(userId, taskData) {
  const { title, status = 'todo', tags = [] } = taskData;
  // Implementation
}

// Routes
router.post('/', async (req, res) => {
  const task = await TaskService.create(req.user.id, req.body);
  res.status(201).json(task);
});
```

**Return Values:**
- Backend services: Return database objects directly (no wrapping)
- API routes: Return JSON via `res.json(data)`
- Frontend functions: Return JSX or data as appropriate
- Async functions: Always return Promise

**Async/Await:**
- Preferred over .then() chaining
- All database operations are async
- All API calls are async
- Always use try/catch with async functions

## Module Design

**Exports:**
- Default exports for main component/class: `export default TaskService`
- Named exports for utilities: `export { logger, LOG_LEVELS }`
- Re-export pattern in `entities.js`: Aggregates all entity clients
- Middleware: Named exports `export { authMiddleware, requireAdmin }`

**Module Pattern (Services):**
```javascript
class ServiceName {
  async list(userId) { /* ... */ }
  async create(userId, data) { /* ... */ }
  async update(userId, id, updates) { /* ... */ }
  async delete(userId, id) { /* ... */ }
}

export default new ServiceName(); // Singleton instance
```

**Module Pattern (API Client):**
```javascript
function createEntityClient(endpoint) {
  return {
    async list() { /* ... */ },
    async get(id) { /* ... */ },
    async create(data) { /* ... */ },
    async update(id, updates) { /* ... */ },
    async delete(id) { /* ... */ },
  };
}

export const apiClient = {
  entities: {
    Task: createEntityClient('/tasks'),
    // ... other entities
  }
};
```

**Barrel Files:**
- Used sparingly
- Main barrel file: `src/api/entities.js` (aggregates entity clients)
- UI components: No central barrel (import directly from component files)

## React Patterns

**Hooks:**
- Use built-in hooks: `useState`, `useEffect`, `useContext`, `useCallback`
- Custom hooks in `src/hooks/` directory (e.g., `useAsyncData.js`, `useForm.js`)
- Context hooks: `useAuth`, `useAI`, `useAppMode` (exported from context files)
- Always include dependency arrays in `useEffect`

**Context Usage:**
```javascript
// Context definition
export const AuthContext = createContext(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

// Usage in components
const { isAuthenticated, user, login, logout } = useAuth();
```

**State Management:**
- Local state: `useState` for component-specific data
- Global state: Context API (no Redux/MobX)
- Main contexts: `AuthContext`, `AppContext`, `AIContext`, `AppModeContext`, `DisplayModeContext`
- AppContext loads all entities on mount, provides refresh functions

**Component Composition:**
- shadcn/ui pattern: Composable primitive components
- Use `cn()` utility from `@/lib/utils` for conditional classes
- Pattern: `className={cn("base-classes", conditionalClass && "extra-classes")}`

## Security Patterns

**SQL Injection Prevention:**
```javascript
// ✅ CORRECT - Parameterized queries
const sql = 'SELECT * FROM tasks WHERE id = $1 AND user_id = $2';
await query(sql, [taskId, userId]);

// ✅ CORRECT - Whitelist validation for dynamic fields
const allowedFields = ['created_date', 'title', 'status'];
const sortField = allowedFields.includes(field) ? field : 'created_date';
const sql = `SELECT * FROM tasks ORDER BY ${sortField} DESC`;

// ❌ NEVER DO THIS - Direct string interpolation
const sql = `SELECT * FROM tasks WHERE id = '${taskId}'`;
```

**Authentication:**
- JWT tokens in Authorization header: `Bearer <token>`
- Middleware extracts and validates token on every protected route
- Development bypass mode: `DEV_SKIP_AUTH=true` (explicit opt-in)
- Token validation includes expiry check and user lookup

**CORS:**
- Explicit origin whitelist (no wildcard `*`)
- Configured in `server/index.js`
- Development: `http://localhost:5173` and `:3000`
- Production: `process.env.FRONTEND_URL`

**Multi-Tenancy:**
- All data operations filtered by `user_id` at service layer
- Critical security boundary - never skip user_id filter
- Pattern enforced in every service method

## File Organization

**Test Files:**
- Co-located with source: `__tests__/` subdirectory in same folder as code
- Or: Same directory with `.test.js` suffix (older pattern)
- Examples:
  - `src/api/__tests__/entities.test.js`
  - `src/services/__tests__/authService.test.js`
  - `src/api/localClient.test.js`

**Component Structure:**
```
src/
├── components/
│   ├── ui/              # shadcn/ui components
│   ├── task/            # Task-specific components
│   ├── duty/            # Duty management components
│   └── agenda/          # Agenda components
├── pages/               # Route-level components
├── contexts/            # React contexts
├── hooks/               # Custom hooks
├── services/            # Frontend services
├── utils/               # Utility functions
└── api/                 # API client layer
```

**Backend Structure:**
```
server/
├── routes/              # Express route handlers
├── services/            # Business logic layer
├── middleware/          # Express middleware
├── db/                  # Database connection and migrations
└── ai/                  # AI integration (if applicable)
```

---

*Convention analysis: 2026-01-21*
