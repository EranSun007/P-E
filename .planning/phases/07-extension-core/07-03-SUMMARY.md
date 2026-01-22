---
phase: 07-extension-core
plan: 03
subsystem: ui
tags: [chrome-extension, popup, badge, capture-framework]

# Dependency graph
requires:
  - phase: 07-01
    provides: [capture rule fetching, storage module updates]
provides:
  - Popup UI with capture controls and pending inbox display
  - Manual capture trigger from popup
  - Refresh rules button to fetch latest rules
  - Pending inbox count badge (orange) on extension icon
affects: [08-frontend-management, 09-site-extractors]

# Tech tracking
tech-stack:
  added: []
  patterns: [badge color priority (pending > error > clear)]

key-files:
  created: []
  modified:
    - extension/popup/popup.html
    - extension/popup/popup.js
    - extension/service-worker.js
    - extension/lib/api.js

key-decisions:
  - "D-0703-01: Orange badge (FF9800) for pending count takes priority over Jira sync status"
  - "D-0703-02: Pending count from cached storage for instant popup display, refreshed on capture"

patterns-established:
  - "Badge priority: pending count (orange) > sync error (red) > clear"
  - "Popup button state: disable during async operations, show feedback text"

# Metrics
duration: 3m 38s
completed: 2026-01-22
---

# Phase 07 Plan 03: Popup UI and Badge Status Summary

**Extension popup rebranded to "P&E Web Capture" with pending inbox count display, manual capture button, and refresh rules control**

## Performance

- **Duration:** 3m 38s
- **Started:** 2026-01-22T08:55:41Z
- **Completed:** 2026-01-22T08:59:19Z
- **Tasks:** 3
- **Files modified:** 4

## Accomplishments

- Rebranded popup from "P&E Jira Sync" to "P&E Web Capture"
- Added pending inbox count section with "View Inbox" link
- Added "Capture This Page" button for manual page capture
- Added "Refresh Rules" button to fetch latest capture rules
- Added GET_PENDING_COUNT and MANUAL_CAPTURE message handlers
- Added updatePendingBadge function with orange (FF9800) badge
- Added getPendingInboxCount to API client
- Badge initializes on browser startup and extension install

## Task Commits

**Note:** This plan's functionality was committed as part of the parallel 07-02 execution, which required popup UI integration for its generic extractor testing.

1. **Tasks 1-3 (UI + handlers + badge)** - `200386b5` (feat(07-02): implement handleCaptureData and pending badge)

_The parallel 07-02 plan included popup UI changes because handleCaptureData integration required testing the full capture flow including badge updates._

## Files Modified

- `extension/popup/popup.html` - Updated title, added pending section, capture button, refresh rules button, CSS for secondary buttons and disabled state
- `extension/popup/popup.js` - Added capture handler, refresh rules handler, pending count display, storage change listener for pendingInboxCount
- `extension/service-worker.js` - Added GET_PENDING_COUNT and MANUAL_CAPTURE message types and handlers, updatePendingBadge function, badge initialization on startup
- `extension/lib/api.js` - Added getPendingInboxCount method

## Decisions Made

1. **D-0703-01: Badge color priority** - Orange badge for pending count takes visual priority over Jira sync status (red for error). Rationale: Pending captures require user action.

2. **D-0703-02: Cached pending count** - Popup reads from cached storage for instant display, backend count fetched on capture operations. Rationale: Avoids API call on every popup open.

## Deviations from Plan

None - plan executed as specified. Implementation was delivered through parallel 07-02 execution which required these UI components for integration testing.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Popup UI complete with all capture controls
- Badge system ready for pending count display
- Ready for Phase 8: Frontend capture inbox management page
- Site-specific extractors (Phase 9) can be tested via popup capture button

---
*Phase: 07-extension-core*
*Completed: 2026-01-22*
