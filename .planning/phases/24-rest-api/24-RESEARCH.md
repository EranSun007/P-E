# Phase 24: REST API - Research

**Researched:** 2026-01-29
**Domain:** Express.js REST API endpoints for sync items, subtasks, and settings
**Confidence:** HIGH

## Summary

Phase 24 creates REST API routes that expose the backend services built in Phase 23. This is a routing-only phase - all business logic exists in services. The project has well-established patterns for Express.js REST APIs with 30+ existing route modules.

The standard approach is to create thin route handlers that delegate to service classes, following RESTful conventions with consistent error handling, authentication middleware, and multi-tenancy filtering.

**Primary recommendation:** Create `/api/sync` routes following existing patterns in `server/routes/tasks.js` and `server/routes/bugs.js`. Use established auth middleware, error handling, and nested resource patterns for subtask endpoints.

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| express | ^4.18.2 | Web framework | Established in project, 30+ route modules |
| express.Router | Built-in | Route grouping | Standard Express pattern |
| authMiddleware | Custom | JWT/dev auth | Used by all existing routes |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| multer | ^1.4.5 | File uploads | Only if CSV/file upload needed (not required Phase 24) |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| express.Router | Inline app.METHOD | Router provides modularity, matches existing pattern |
| Custom middleware | Third-party validation | Custom auth already established |

**Installation:**
No new dependencies required - all packages already in project.

## Architecture Patterns

### Recommended Project Structure
```
server/
├── routes/
│   └── sync.js              # New file for Phase 24
├── services/
│   ├── SyncItemService.js   # Already exists (Phase 23)
│   ├── SubtaskService.js    # Already exists (Phase 23)
│   └── SyncSettingsService.js # Already exists (Phase 23)
└── index.js                 # Mount new router
```

### Pattern 1: Thin Route Handlers with Service Delegation
**What:** Route handlers contain only request/response logic, delegate to services
**When to use:** All CRUD operations (established pattern across 30+ routes)
**Example:**
```javascript
// Source: server/routes/tasks.js (existing pattern)
router.get('/', async (req, res) => {
  try {
    const { orderBy } = req.query;
    const tasks = await TaskService.list(req.user.id, orderBy);
    res.json(tasks);
  } catch (error) {
    console.error('GET /api/tasks error:', error);
    res.status(500).json({ error: error.message });
  }
});
```

### Pattern 2: Nested Resources
**What:** Parent resource ID in URL path, accessed via router.METHOD('/:parentId/child')
**When to use:** Subtask endpoints under sync items
**Example:**
```javascript
// Source: server/routes/jira.js (existing nested resource pattern)
router.post('/:id/insights', async (req, res) => {
  try {
    const insight = await WorkItemService.addInsight(req.user.id, req.params.id, req.body);
    res.json(insight);
  } catch (error) {
    console.error(`POST /api/jira/${req.params.id}/insights error:`, error);
    res.status(500).json({ error: error.message });
  }
});
```

### Pattern 3: Query Parameter Filtering
**What:** Extract query params, build filters object, pass to service
**When to use:** List endpoints with optional filtering (category, team_department, archived)
**Example:**
```javascript
// Source: server/routes/bugs.js (existing query parameter pattern)
router.get('/list', async (req, res) => {
  try {
    const { uploadId, priority, status, component, limit, offset } = req.query;

    if (!uploadId) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'uploadId is required'
      });
    }

    const filters = {};
    if (priority) filters.priority = priority;
    if (status) filters.status = status;
    if (component) filters.component = component;
    if (limit) filters.limit = parseInt(limit, 10);
    if (offset) filters.offset = parseInt(offset, 10);

    const bugs = await BugService.listBugs(req.user.id, uploadId, filters);
    res.json(bugs);
  } catch (error) {
    console.error('GET /api/bugs/list error:', error);
    res.status(500).json({ error: error.message });
  }
});
```

### Pattern 4: HTTP Status Code Mapping
**What:** Map error messages to appropriate HTTP status codes
**When to use:** All error handling blocks
**Example:**
```javascript
// Source: server/routes/tasks.js (existing error handling)
router.put('/:id', async (req, res) => {
  try {
    const task = await TaskService.update(req.user.id, req.params.id, req.body);
    res.json(task);
  } catch (error) {
    console.error(`PUT /api/tasks/${req.params.id} error:`, error);
    const statusCode = error.message.includes('not found') ? 404 : 400;
    res.status(statusCode).json({ error: error.message });
  }
});
```

### Pattern 5: Router-Level Authentication
**What:** Apply authMiddleware once at router level via router.use(authMiddleware)
**When to use:** All routes requiring authentication (all sync endpoints)
**Example:**
```javascript
// Source: server/routes/tasks.js (existing auth pattern)
import { authMiddleware } from '../middleware/auth.js';

const router = express.Router();

// All routes require authentication
router.use(authMiddleware);

router.get('/', async (req, res) => {
  // req.user automatically available
});
```

### Pattern 6: Router Mounting in server/index.js
**What:** Import router, mount with app.use('/api/path', router)
**When to use:** After creating route module
**Example:**
```javascript
// Source: server/index.js (existing mounting pattern)
import syncRouter from './routes/sync.js';
// ... after other imports

app.use('/api/sync', syncRouter);
```

### Anti-Patterns to Avoid
- **Business logic in routes:** Services contain logic, routes contain HTTP handling
- **Direct database queries:** Always use service layer for multi-tenancy enforcement
- **Missing user_id:** Every service call must include req.user.id (from authMiddleware)
- **Inconsistent error handling:** Always catch, log with context, return JSON error
- **Missing parameter validation:** Validate required params before calling service

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Authentication | Custom JWT parsing | authMiddleware from auth.js | Already handles dev mode, JWT validation, user lookup |
| Multi-tenancy | Route-level user_id filtering | Service layer filtering | Services enforce user_id in all queries |
| Error responses | Custom error formatting | Established try/catch pattern | Consistent error structure across API |
| Request logging | Custom logger middleware | Existing middleware in server/index.js | Already logs METHOD path statusCode duration |
| CORS | Custom headers | Existing CORS config in server/index.js | Already configured for localhost + BTP |

**Key insight:** The backend infrastructure is fully established. Phase 24 is pure routing glue between HTTP and services.

## Common Pitfalls

### Pitfall 1: Forgetting authMiddleware
**What goes wrong:** Routes accessible without authentication
**Why it happens:** Forgetting router.use(authMiddleware) at top of file
**How to avoid:** Add router.use(authMiddleware) immediately after router creation
**Warning signs:** req.user is undefined in route handlers

### Pitfall 2: Incorrect Status Codes for 404
**What goes wrong:** Returning 500 when resource not found
**Why it happens:** Not checking error.message for "not found"
**How to avoid:** Pattern: `const statusCode = error.message.includes('not found') ? 404 : 400;`
**Warning signs:** Frontend receives 500 for missing resources

### Pitfall 3: Missing Query Parameter Validation
**What goes wrong:** Services receive undefined/null, crash or return wrong data
**Why it happens:** Not validating required params like uploadId
**How to avoid:** Check required params, return 400 Bad Request with message
**Warning signs:** Cryptic database errors for missing values

### Pitfall 4: Nested Route Ordering
**What goes wrong:** Specific routes (e.g., /archived) match generic pattern (/:id)
**Why it happens:** Generic patterns registered before specific routes
**How to avoid:** Register specific routes BEFORE generic :id routes
**Example:**
```javascript
// CORRECT order
router.get('/archived', ...);        // Specific
router.get('/archived/count', ...);  // Specific
router.get('/:id', ...);             // Generic (must be last)

// WRONG order
router.get('/:id', ...);             // Too early - matches "/archived"
router.get('/archived', ...);        // Never reached
```

### Pitfall 5: Not Parsing Integer Query Params
**What goes wrong:** limit="10" passed as string to service, breaks SQL
**Why it happens:** req.query values are always strings
**How to avoid:** `parseInt(req.query.limit, 10)` before passing to service
**Warning signs:** Database type errors or incorrect LIMIT clauses

### Pitfall 6: Missing user_id in Service Calls
**What goes wrong:** Multi-tenancy bypassed, users see other users' data
**Why it happens:** Forgetting req.user.id as first argument
**How to avoid:** ALWAYS pass req.user.id as first argument to every service method
**Warning signs:** Services throw "user_id is required" errors

## Code Examples

Verified patterns from existing codebase:

### Basic CRUD Routes (Standard Pattern)
```javascript
// Source: server/routes/tasks.js
import express from 'express';
import SyncItemService from '../services/SyncItemService.js';
import { authMiddleware } from '../middleware/auth.js';

const router = express.Router();
router.use(authMiddleware);

// GET /api/sync - List with filtering
router.get('/', async (req, res) => {
  try {
    const { category, teamDepartment, archived } = req.query;
    const filters = { category, team_department: teamDepartment, archived };
    const items = await SyncItemService.list(req.user.id, filters);
    res.json(items);
  } catch (error) {
    console.error('GET /api/sync error:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/sync/:id - Get single
router.get('/:id', async (req, res) => {
  try {
    const item = await SyncItemService.get(req.user.id, req.params.id);
    res.json(item);
  } catch (error) {
    console.error(`GET /api/sync/${req.params.id} error:`, error);
    const statusCode = error.message.includes('not found') ? 404 : 500;
    res.status(statusCode).json({ error: error.message });
  }
});

// POST /api/sync - Create
router.post('/', async (req, res) => {
  try {
    const item = await SyncItemService.create(req.user.id, req.body);
    res.status(201).json(item);
  } catch (error) {
    console.error('POST /api/sync error:', error);
    res.status(400).json({ error: error.message });
  }
});

// PUT /api/sync/:id - Update
router.put('/:id', async (req, res) => {
  try {
    const item = await SyncItemService.update(req.user.id, req.params.id, req.body);
    res.json(item);
  } catch (error) {
    console.error(`PUT /api/sync/${req.params.id} error:`, error);
    const statusCode = error.message.includes('not found') ? 404 : 400;
    res.status(statusCode).json({ error: error.message });
  }
});

// DELETE /api/sync/:id - Delete
router.delete('/:id', async (req, res) => {
  try {
    await SyncItemService.delete(req.user.id, req.params.id);
    res.status(204).send();
  } catch (error) {
    console.error(`DELETE /api/sync/${req.params.id} error:`, error);
    const statusCode = error.message.includes('not found') ? 404 : 400;
    res.status(statusCode).json({ error: error.message });
  }
});

export default router;
```

### Specific Routes Before Generic (:id)
```javascript
// Source: Pattern from server/routes/bugs.js and server/routes/performanceEvaluations.js

// CORRECT ORDER: Specific routes first
router.get('/archived', async (req, res) => { /* ... */ });
router.get('/archived/count', async (req, res) => { /* ... */ });
router.get('/:id', async (req, res) => { /* ... */ }); // Generic last
```

### Nested Resource Endpoints
```javascript
// Source: Pattern from server/routes/jira.js (nested insights)

// GET /api/sync/:itemId/subtasks - List subtasks
router.get('/:itemId/subtasks', async (req, res) => {
  try {
    const subtasks = await SubtaskService.list(req.user.id, req.params.itemId);
    res.json(subtasks);
  } catch (error) {
    console.error(`GET /api/sync/${req.params.itemId}/subtasks error:`, error);
    const statusCode = error.message.includes('not found') ? 404 : 500;
    res.status(statusCode).json({ error: error.message });
  }
});

// POST /api/sync/:itemId/subtasks - Create subtask
router.post('/:itemId/subtasks', async (req, res) => {
  try {
    const subtask = await SubtaskService.create(req.user.id, req.params.itemId, req.body);
    res.status(201).json(subtask);
  } catch (error) {
    console.error(`POST /api/sync/${req.params.itemId}/subtasks error:`, error);
    res.status(400).json({ error: error.message });
  }
});

// PUT /api/sync/:itemId/subtasks/:subtaskId - Update subtask
router.put('/:itemId/subtasks/:subtaskId', async (req, res) => {
  try {
    const subtask = await SubtaskService.update(
      req.user.id,
      req.params.itemId,
      req.params.subtaskId,
      req.body
    );
    res.json(subtask);
  } catch (error) {
    console.error(`PUT /api/sync/${req.params.itemId}/subtasks/${req.params.subtaskId} error:`, error);
    const statusCode = error.message.includes('not found') ? 404 : 400;
    res.status(statusCode).json({ error: error.message });
  }
});

// DELETE /api/sync/:itemId/subtasks/:subtaskId - Delete subtask
router.delete('/:itemId/subtasks/:subtaskId', async (req, res) => {
  try {
    await SubtaskService.delete(req.user.id, req.params.itemId, req.params.subtaskId);
    res.status(204).send();
  } catch (error) {
    console.error(`DELETE /api/sync/${req.params.itemId}/subtasks/${req.params.subtaskId} error:`, error);
    const statusCode = error.message.includes('not found') ? 404 : 400;
    res.status(statusCode).json({ error: error.message });
  }
});

// PUT /api/sync/:itemId/subtasks/reorder - Reorder subtasks
router.put('/:itemId/subtasks/reorder', async (req, res) => {
  try {
    const { orderedSubtaskIds } = req.body;

    if (!Array.isArray(orderedSubtaskIds)) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'orderedSubtaskIds must be an array'
      });
    }

    const subtasks = await SubtaskService.reorder(
      req.user.id,
      req.params.itemId,
      orderedSubtaskIds
    );
    res.json(subtasks);
  } catch (error) {
    console.error(`PUT /api/sync/${req.params.itemId}/subtasks/reorder error:`, error);
    res.status(400).json({ error: error.message });
  }
});
```

### Custom Action Endpoint (Restore)
```javascript
// Pattern: PUT /:id/action for non-standard operations

// PUT /api/sync/:id/restore - Restore archived item
router.put('/:id/restore', async (req, res) => {
  try {
    const item = await SyncItemService.restore(req.user.id, req.params.id);
    res.json(item);
  } catch (error) {
    console.error(`PUT /api/sync/${req.params.id}/restore error:`, error);
    const statusCode = error.message.includes('not found') ? 404 : 400;
    res.status(statusCode).json({ error: error.message });
  }
});
```

### Settings Endpoint (Key-Value or Object)
```javascript
// Source: Pattern from server/routes/userSettings.js

// GET /api/sync/settings - Get settings
router.get('/settings', async (req, res) => {
  try {
    const settings = await SyncSettingsService.get(req.user.id);
    res.json(settings);
  } catch (error) {
    console.error('GET /api/sync/settings error:', error);
    res.status(500).json({ error: error.message });
  }
});

// PUT /api/sync/settings - Update settings
router.put('/settings', async (req, res) => {
  try {
    const settings = await SyncSettingsService.update(req.user.id, req.body);
    res.json(settings);
  } catch (error) {
    console.error('PUT /api/sync/settings error:', error);
    res.status(400).json({ error: error.message });
  }
});
```

### Query Parameter Filtering with Date Range
```javascript
// Source: server/routes/bugs.js (date range filtering)

// GET /api/sync/archived - Get archived items with date filters
router.get('/archived', async (req, res) => {
  try {
    const { from_date, to_date } = req.query;
    const filters = {};
    if (from_date) filters.from_date = from_date;
    if (to_date) filters.to_date = to_date;

    const items = await SyncItemService.getArchived(req.user.id, filters);
    res.json(items);
  } catch (error) {
    console.error('GET /api/sync/archived error:', error);
    res.status(500).json({ error: error.message });
  }
});
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Route-level validation | Service-level validation | Established from Phase 1 | Routes are thin, services validate |
| Mixed auth patterns | authMiddleware at router level | Phase 1 (backend foundation) | Consistent auth across all routes |
| Inline error handling | Standardized try/catch pattern | Established across 30+ routes | Predictable error responses |
| String user IDs | req.user.id from middleware | Phase 2 (REST API layer) | Type-safe user identification |

**Deprecated/outdated:**
- N/A - No deprecated patterns, all routes follow current standards

## Open Questions

Things that couldn't be fully resolved:

1. **Archive on Resolve (UI-19)**
   - What we know: Requirement states "Resolving an item (status=resolved) auto-archives it"
   - What's unclear: Should this be frontend logic (change archived=true on resolve) or backend service logic (auto-set archived in SyncItemService.update)?
   - Recommendation: Implement in service layer (SyncItemService.update) - check if sync_status changes to 'resolved', auto-set archived=true. More reliable than frontend logic.

2. **Query Parameter Naming Convention**
   - What we know: Some routes use snake_case (team_department, from_date), frontend typically uses camelCase (teamDepartment)
   - What's unclear: Transform in route or accept camelCase and map to snake_case?
   - Recommendation: Accept camelCase in query params, map to snake_case for service calls (matches existing bugs.js pattern with `teamDepartment` query param mapped to `team_department` filter)

## Sources

### Primary (HIGH confidence)
- /Users/i306072/Documents/GitHub/P-E/server/index.js - Server setup, CORS, middleware, router mounting
- /Users/i306072/Documents/GitHub/P-E/server/routes/tasks.js - Standard CRUD pattern
- /Users/i306072/Documents/GitHub/P-E/server/routes/bugs.js - Query param filtering, nested routes, date ranges
- /Users/i306072/Documents/GitHub/P-E/server/routes/userSettings.js - Settings pattern, nested routes
- /Users/i306072/Documents/GitHub/P-E/server/middleware/auth.js - Authentication middleware pattern
- /Users/i306072/Documents/GitHub/P-E/server/services/SyncItemService.js - Service interface (Phase 23)
- /Users/i306072/Documents/GitHub/P-E/server/services/SubtaskService.js - Service interface (Phase 23)
- /Users/i306072/Documents/GitHub/P-E/server/services/SyncSettingsService.js - Service interface (Phase 23)

### Secondary (MEDIUM confidence)
- N/A - All sources are from existing codebase

### Tertiary (LOW confidence)
- N/A - No external sources needed

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - All dependencies already in project
- Architecture: HIGH - 30+ existing route modules following identical pattern
- Pitfalls: HIGH - All pitfalls observed in existing code or documented in CLAUDE.md

**Research date:** 2026-01-29
**Valid until:** 30 days (stable backend patterns, Express.js mature)
