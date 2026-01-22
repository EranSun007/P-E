---
phase: 06
plan: 02
subsystem: api
tags: [express, rest-api, capture-framework, multi-tenancy, jsonb]

dependency-graph:
  requires:
    - phase: 06-01
      provides: capture_rules, capture_inbox, entity_mappings tables
  provides:
    - CaptureService with CRUD for rules, inbox, mappings
    - REST API /api/capture-rules (5 routes)
    - REST API /api/capture-inbox (7 routes)
    - REST API /api/entity-mappings (5 routes)
  affects: [07-extension-backend, 08-web-ui, 09-expansion]

tech-stack:
  added: []
  patterns: [service-singleton, parameterized-queries, coalesce-updates, upsert-on-conflict]

key-files:
  created:
    - server/services/CaptureService.js
    - server/routes/captureRules.js
    - server/routes/captureInbox.js
    - server/routes/entityMappings.js
  modified:
    - server/index.js

key-decisions:
  - "Single CaptureService handles rules, inbox, and mappings (cohesive domain)"
  - "Bulk accept/reject methods loop over single-item methods for consistency"
  - "Auto-create entity mapping on accept when create_mapping=true"

patterns-established:
  - "Route ordering: specific paths before :id to avoid conflicts"
  - "COALESCE pattern for partial updates preserving existing values"
  - "ON CONFLICT upsert for entity mappings by source_identifier"

metrics:
  duration: "3m 22s"
  completed: 2026-01-22
---

# Phase 6 Plan 02: Backend Services Summary

**CaptureService with 17 methods and REST API routes for capture rules (5), inbox workflow (7), and entity mappings (5) following JiraService.js patterns**

## Performance

- **Duration:** 3m 22s
- **Started:** 2026-01-22T08:16:00Z
- **Completed:** 2026-01-22T08:19:22Z
- **Tasks:** 3
- **Files modified:** 5

## Accomplishments

- CaptureService.js with complete CRUD for capture rules, inbox items, and entity mappings
- REST API routes with proper authentication, validation, and error handling
- Bulk accept/reject operations for inbox workflow efficiency
- All routes mounted and verified returning 200 OK

## Task Commits

Each task was committed atomically:

1. **Task 1: Create CaptureService with all methods** - `9d61e01d` (feat)
2. **Task 2: Create route files for all three APIs** - `ead82d2e` (feat)
3. **Task 3: Mount routes in server/index.js** - `7745fd85` (feat)

## Files Created/Modified

- `server/services/CaptureService.js` - 423 lines, 17 methods for rules/inbox/mappings data access
- `server/routes/captureRules.js` - CRUD routes for capture rules
- `server/routes/captureInbox.js` - Inbox routes including accept/reject workflow
- `server/routes/entityMappings.js` - Entity mapping routes with source lookup
- `server/index.js` - Route imports and mounting

## API Endpoints Created

### /api/capture-rules
| Method | Path | Description |
|--------|------|-------------|
| GET | / | List rules (filter: enabled) |
| GET | /:id | Get single rule |
| POST | / | Create rule |
| PUT | /:id | Update rule |
| DELETE | /:id | Delete rule |

### /api/capture-inbox
| Method | Path | Description |
|--------|------|-------------|
| GET | / | List items (filter: status, rule_id) |
| GET | /:id | Get single item |
| POST | / | Create item from extension |
| POST | /:id/accept | Accept with optional mapping |
| POST | /:id/reject | Reject item |
| POST | /bulk-accept | Bulk accept items |
| POST | /bulk-reject | Bulk reject items |

### /api/entity-mappings
| Method | Path | Description |
|--------|------|-------------|
| GET | / | List mappings (filter: source_type, target_entity_type) |
| GET | /lookup/:source | Find by source_identifier |
| GET | /:id | Get single mapping |
| POST | / | Create/update mapping (upsert) |
| DELETE | /:id | Delete mapping |

## Decisions Made

- **Single service class:** CaptureService handles all three tables (rules, inbox, mappings) since they form a cohesive domain for the capture framework
- **Bulk operations via loop:** bulkAccept/bulkReject iterate over single-item methods rather than batch SQL for consistent behavior and automatic mapping creation
- **Auto-mapping on accept:** When `create_mapping=true` during accept, automatically creates entity_mapping for future auto-apply

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None - all tasks completed without blockers.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

Phase 7 (Extension Backend) can now proceed:
- All API endpoints ready for extension to consume
- POST /api/capture-inbox for sending captured data
- GET /api/capture-rules for fetching user rules
- POST /api/entity-mappings for creating mappings

Phase 8 (Web UI) can also proceed:
- Full CRUD for capture rules management
- Inbox workflow with accept/reject
- Entity mapping management

---
*Phase: 06-backend-foundation*
*Completed: 2026-01-22*
