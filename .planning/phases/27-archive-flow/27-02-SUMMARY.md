---
phase: 27-archive-flow
plan: 02
subsystem: ui
tags: [react, context, sync, archive, optimistic-update]

# Dependency graph
requires:
  - phase: 25-sync-context
    provides: SyncContext with updateItem function
  - phase: 27-01
    provides: Archive modal and restore functionality
provides:
  - Auto-archive on status done transition
  - shouldAutoArchive pattern for status detection
  - Optimistic archive count updates
affects: [phase-27-03, archive-flow]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Status transition detection for auto-archive"
    - "Combined update + archive in single API call"
    - "Optimistic removal from active items on archive"

key-files:
  created: []
  modified:
    - src/contexts/SyncContext.jsx

key-decisions:
  - "Auto-archive triggers on transition TO done, not when already done"
  - "Single API call combines user updates with archived:true flag"
  - "Optimistic UI removes item immediately, rollback on error via refresh()"

patterns-established:
  - "shouldAutoArchive: status transition detection pattern"
  - "Optimistic archive count increment with rollback on failure"

# Metrics
duration: 5min
completed: 2026-01-29
---

# Phase 27 Plan 02: Auto-Archive on Done Summary

**Auto-archive sync items when status changes to "done" with optimistic UI updates and single API call**

## Performance

- **Duration:** 5 min
- **Started:** 2026-01-29T10:46:57Z
- **Completed:** 2026-01-29T10:52:00Z
- **Tasks:** 1
- **Files modified:** 1

## Accomplishments

- Detect status transition to "done" using shouldAutoArchive pattern
- Automatically add archived:true to updates when transitioning to done
- Optimistically remove item from Kanban board (items array filter)
- Optimistically increment archivedCount badge
- Rollback via refresh() on API error

## Task Commits

Each task was committed atomically:

1. **Task 1: Add auto-archive logic to updateItem** - `c9a20cfd` (feat)

## Files Created/Modified

- `src/contexts/SyncContext.jsx` - Added auto-archive detection in updateItem function

## Decisions Made

- Auto-archive triggers only when transitioning TO "done", not when item already has status "done" (prevents re-archiving on other updates)
- Combined archived:true with user updates in single API call (efficient, atomic)
- Optimistic UI removes item immediately from active list for instant feedback

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Auto-archive on done transition complete
- Ready for manual archive button implementation (27-03) if planned
- UI-19 requirement fulfilled

---
*Phase: 27-archive-flow*
*Completed: 2026-01-29*
