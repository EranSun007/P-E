---
phase: 28
plan: 01
subsystem: backend-api
tags: [menu-config, rest-api, user-settings]

dependency-graph:
  requires: [user_settings table, UserSettingsService]
  provides: [MenuConfigService, /api/menu-config endpoints]
  affects: [phase-29 frontend-integration]

tech-stack:
  added: []
  patterns: [service-wrapper, json-serialization, mode-based-config]

key-files:
  created:
    - server/services/MenuConfigService.js
    - server/routes/menuConfig.js
  modified:
    - server/index.js

decisions:
  - id: json-storage
    choice: "Store menu config as JSON string in user_settings"
    rationale: "Reuses existing infrastructure, no schema changes needed"
  - id: separate-modes
    choice: "Separate setting keys per mode (menu_config_people, menu_config_product)"
    rationale: "Users may have different folder organizations for each mode"
  - id: empty-defaults
    choice: "Default configs are empty arrays for both folders and items"
    rationale: "Allow frontend to determine initial ordering when no user config exists"

metrics:
  duration: "5 minutes"
  completed: "2026-01-29"
---

# Phase 28 Plan 01: Backend API for Menu Config Summary

**One-liner:** REST API for menu configuration persistence using UserSettingsService wrapper with separate configs per mode

## Objectives Met

Created backend service and REST API for menu configuration persistence.

## Implementation Details

### MenuConfigService (server/services/MenuConfigService.js)

Wraps UserSettingsService with JSON serialization for menu config:

```javascript
// Methods
async getConfig(userId, mode)   // Returns stored config or defaults
async setConfig(userId, mode, config)  // Saves config to user_settings
getDefaults(mode)               // Synchronous default config retrieval

// Storage keys
menu_config_people  // People mode menu organization
menu_config_product // Product mode menu organization

// Config structure
{
  folders: [{ id, name, order }],
  items: [{ itemId, folderId, order }]
}
```

### REST API Routes (server/routes/menuConfig.js)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/menu-config/:mode` | Get user's menu config for mode |
| PUT | `/api/menu-config/:mode` | Save menu config for mode |
| GET | `/api/menu-config/:mode/defaults` | Get default config (for reset) |

**Validation:**
- Mode must be 'people' or 'product' (400 if invalid)
- Config must have `folders` array and `items` array (400 if invalid)
- All routes require authentication (401 if no token)

## Commits

| Hash | Type | Description |
|------|------|-------------|
| ca89ed21 | feat | Create MenuConfigService for menu config persistence |
| e46cf4c4 | feat | Add REST API routes for menu configuration |

## Verification Results

All tests passed:
- Backend starts without errors
- GET returns default config when none saved
- PUT saves config and returns success
- Second GET returns saved config (not defaults)
- Invalid mode returns 400
- Invalid config structure returns 400
- Without auth token returns 401
- People and Product modes have separate stored configs

## Deviations from Plan

None - plan executed exactly as written.

## Next Phase Readiness

Phase 29 (Frontend Integration) can now:
- Import and use MenuConfigService via fetch to /api/menu-config/:mode
- GET config on component mount
- PUT config when user reorganizes menu
- Use /defaults endpoint for reset functionality
