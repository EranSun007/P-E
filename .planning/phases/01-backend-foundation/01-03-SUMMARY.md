---
phase: 01-backend-foundation
plan: 03
subsystem: api
tags: [express, rest-api, routes, authentication, jira]

dependency_graph:
  requires: ["01-01", "01-02"]
  provides: ["jira-rest-api", "auth-protected-routes"]
  affects: ["02-01", "02-02", "05-01"]

tech_stack:
  added: []
  patterns: ["express-router", "auth-middleware-at-router-level", "route-ordering-for-params"]

key_files:
  created:
    - server/routes/jira.js
  modified:
    - server/index.js

decisions:
  - id: route-ordering
    choice: "Place specific routes (/status, /workload, /unmapped, /mappings) before /:id"
    reason: "Avoid Express treating 'status' as an ID parameter"
  - id: auth-at-router
    choice: "Apply authMiddleware at router.use() level"
    reason: "Single point of enforcement, all routes protected by default"
  - id: foreign-key-error-handling
    choice: "Handle PostgreSQL error code 23503 for invalid team_member_id"
    reason: "Provide clear error message instead of generic 500"

metrics:
  duration: "4m 23s"
  completed: "2026-01-21"
---

# Phase 1 Plan 3: REST API Routes Summary

REST API routes for Jira integration with Express Router, auth middleware at router level, route ordering to avoid param conflicts.

## What Was Built

### server/routes/jira.js (271 lines)

Complete REST API for Jira integration with 11 endpoints:

**Issue Sync Operations (API-01):**
- `POST /sync` - Sync batch of issues from extension
  - Validates issues array exists and is non-empty
  - Validates each issue has issue_key
  - Returns `{ created, updated, total }`

**Issue CRUD Operations (API-02):**
- `GET /` - List all issues with optional filtering (status, assignee_id, sprint_name)
- `GET /:id` - Get single issue by ID (404 if not found)
- `DELETE /:id` - Delete single issue (204 on success, 404 if not found)
- `DELETE /` - Delete all user's issues (for re-sync)

**Status and Analytics:**
- `GET /status` - Sync status (lastSync timestamp, issueCount)
- `GET /workload` - Team workload grouped by assignee
- `GET /unmapped` - Jira assignees without team member mappings

**Mapping Operations (API-03):**
- `GET /mappings` - List all team member mappings
- `POST /mappings` - Create/update mapping (validates required fields)
- `DELETE /mappings/:id` - Delete mapping

### server/index.js Changes

- Added import: `import jiraRouter from './routes/jira.js'`
- Mounted at: `app.use('/api/jira-issues', jiraRouter)`

## Key Implementation Details

### Authentication (API-05)

```javascript
router.use(authMiddleware);
```

All routes protected at router level. Unauthenticated requests return:
```json
{"error":"Unauthorized","message":"Missing or invalid authorization header"}
```

### Route Ordering

Specific routes placed BEFORE `/:id` to avoid conflicts:
```javascript
router.get('/status', ...);    // Must come before /:id
router.get('/workload', ...);
router.get('/unmapped', ...);
router.get('/mappings', ...);
router.get('/:id', ...);       // Catches everything else
```

### Error Handling

- 400: Validation errors (missing fields, invalid data)
- 401: Unauthenticated (handled by middleware)
- 404: Resource not found
- 204: Successful delete (no content)
- 500: Server errors with logged details

Foreign key violations return user-friendly messages:
```javascript
if (error.code === '23503') {
  return res.status(400).json({
    error: 'Bad Request',
    message: 'Invalid team_member_id - team member does not exist'
  });
}
```

## Verification Results

All curl tests passed with DEV_SKIP_AUTH=true:

| Endpoint | Test | Result |
|----------|------|--------|
| POST /sync | Sync 1 issue | `{"created":1,"updated":0,"total":1}` |
| GET / | List issues | Returns synced issue |
| GET /?status=To%20Do | Filter by status | Returns filtered |
| GET /status | Sync status | `{"lastSync":"...","issueCount":1}` |
| GET /workload | Team workload | Returns assignee summary |
| GET /unmapped | Unmapped users | Returns unmapped assignee |
| GET /mappings | List mappings | Returns empty array |
| DELETE / | Delete all | `{"deleted":1}` |
| No auth header | Test 401 | `{"error":"Unauthorized",...}` |

## Requirements Coverage

| Requirement | Status | Implementation |
|-------------|--------|----------------|
| API-01: Batch sync endpoint | Complete | POST /sync with validation |
| API-02: CRUD for issues | Complete | GET/DELETE endpoints |
| API-03: Mapping management | Complete | /mappings endpoints |
| API-05: Auth enforcement | Complete | authMiddleware at router level |

## Commits

| Commit | Description |
|--------|-------------|
| cefcaeee | feat(01-03): add Jira REST API routes |
| 91b54831 | feat(01-03): mount Jira routes at /api/jira-issues |

## Deviations from Plan

None - plan executed exactly as written.

## Next Phase Readiness

**Phase 2 Dependencies Met:**
- REST API available for extension to call
- All endpoints follow patterns from github.js
- Multi-tenancy enforced via req.user.id

**Ready for:**
- 02-01: Chrome extension manifest and structure
- 02-02: Content script and sync logic
