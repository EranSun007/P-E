---
phase: 04-extension-ui
plan: 01
subsystem: ui
tags: [chrome-extension, popup, badge, storage-listener, manual-sync]

# Dependency graph
requires:
  - phase: 02-extension-core
    provides: Storage module, API client, message protocol
  - phase: 03-content-script
    provides: Content scripts that trigger SYNC_ISSUES
provides:
  - Extension icon badge showing sync status at a glance
  - Manual Sync Now button in popup
  - Reactive popup updates via storage.onChanged listener
affects: [04-02, 05-01, 05-02]

# Tech tracking
tech-stack:
  added: []
  patterns: [chrome.action badge API, chrome.storage.onChanged listener]

key-files:
  created: []
  modified:
    - extension/service-worker.js
    - extension/popup/popup.html
    - extension/popup/popup.js

key-decisions:
  - "Badge colors: blue (#2196F3) for syncing, red (#F44336) for error"
  - "Badge text: '...' for syncing, '!' for error, empty for success/never"
  - "Restore badge state on service worker startup from storage"

patterns-established:
  - "updateBadge called after every Storage.updateSyncStatus"
  - "storage.onChanged listener pattern for reactive popup updates"
  - "syncBtn disabled during sync to prevent double-clicks"

# Metrics
duration: 4min
completed: 2026-01-21
---

# Phase 4 Plan 01: Badge Status and Manual Sync Summary

**Extension badge shows sync status (blue '...' syncing, red '!' error, empty success) with popup Sync Now button and reactive storage listener updates**

## Performance

- **Duration:** 4 min
- **Started:** 2026-01-21T17:00:00Z
- **Completed:** 2026-01-21T17:04:00Z
- **Tasks:** 3
- **Files modified:** 3

## Accomplishments
- Extension icon badge provides at-a-glance sync status visibility
- Manual Sync Now button allows triggering sync without navigating to Jira
- Popup auto-updates via storage.onChanged when background sync status changes
- Badge state restored on service worker startup

## Task Commits

Each task was committed atomically:

1. **Task 1: Add badge update function to service worker** - `4f9b4a85` (feat)
2. **Task 2: Add Sync Now button and syncing state to popup HTML** - `3e3f3f23` (feat)
3. **Task 3: Add manual sync handler and reactive updates to popup JS** - `cea88724` (feat)

## Files Created/Modified
- `extension/service-worker.js` - Added updateBadge function, badge calls after sync status changes, badge restore on startup
- `extension/popup/popup.html` - Added .status.syncing CSS class, Sync Now button
- `extension/popup/popup.js` - Added syncBtn handler, syncing state in loadStatus, storage.onChanged listener

## Decisions Made
- Badge uses Material Design blue (#2196F3) for syncing and red (#F44336) for error to match UI conventions
- Badge cleared (empty text) for success/never states to avoid visual noise when everything is working
- storage.onChanged listener provides reactive updates - popup always reflects current state

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- Badge and manual sync UI complete
- Ready for Phase 4 Plan 02 (Options page polish) or Phase 5 (Web App Integration)
- All extension UI requirements from must_haves verified

---
*Phase: 04-extension-ui*
*Completed: 2026-01-21*
