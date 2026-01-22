---
phase: 07-extension-core
plan: 02
subsystem: extension
tags: [chrome-extension, content-script, dom-extraction, manifest-v3]

# Dependency graph
requires:
  - phase: 07-01
    provides: Rule fetching, storage, API client, dynamic script registration
  - phase: 06-02
    provides: CaptureService with sendToInbox API endpoint
provides:
  - Generic extractor content script for rule-based DOM extraction
  - Complete capture flow: page load -> extract by rule -> send to inbox
  - Pending inbox badge with count display
  - Manual capture trigger from popup
affects: [07-03, 08-01]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "IIFE pattern for content script isolation"
    - "chrome.runtime.sendMessage for content <-> service worker communication"
    - "Chrome badge API for pending count display"

key-files:
  created:
    - extension/content/generic-extractor.js
  modified:
    - extension/service-worker.js
    - extension/manifest.json

key-decisions:
  - "D-0702-01: Manual capture only, no auto-capture on page load (user control)"
  - "D-0702-02: Orange badge (FF9800) for pending inbox count"
  - "D-0702-03: Generic extractor uses <all_urls> in web_accessible_resources"

patterns-established:
  - "Content script IIFE pattern with chrome.runtime messaging"
  - "Rule-based extraction with typed selectors (text/html/attribute/href/src)"
  - "Badge count pattern: fetch from API, cache in storage"

# Metrics
duration: 3m 29s
completed: 2026-01-22
---

# Phase 7 Plan 2: Generic Extractor Content Script Summary

**Rule-based DOM extractor content script with complete capture flow to backend inbox**

## Performance

- **Duration:** 3m 29s
- **Started:** 2026-01-22T08:55:44Z
- **Completed:** 2026-01-22T08:59:13Z
- **Tasks:** 3
- **Files modified:** 3

## Accomplishments

- Generic extractor content script with rule-based DOM extraction
- Complete capture flow: extract by rule -> send CAPTURE_DATA -> Api.sendToInbox()
- Pending inbox badge with count (orange, shows 99+ for large counts)
- Manual capture trigger via MANUAL_CAPTURE message from popup

## Task Commits

Each task was committed atomically:

1. **Task 1: Create generic extractor content script** - `05d47bf7` (feat)
2. **Task 2: Implement handleCaptureData in service worker** - `200386b5` (feat)
3. **Task 3: Add generic-extractor.js to web_accessible_resources** - `4566cead` (feat)

## Files Created/Modified

- `extension/content/generic-extractor.js` (264 lines) - Rule-based DOM extraction content script
- `extension/service-worker.js` - handleCaptureData, updatePendingBadge, handleManualCapture implementations
- `extension/manifest.json` - Added generic-extractor.js to web_accessible_resources with <all_urls>

## Key Links Verified

- `generic-extractor.js` -> `service-worker.js` via `chrome.runtime.sendMessage({ type: 'CAPTURE_DATA' })`
- `service-worker.js` -> `api.js` via `Api.sendToInbox(payload)`

## Decisions Made

1. **Manual capture only (D-0702-01):** No auto-capture on page load. Manual trigger only per EXT-05 research decision. Users maintain control over when data is captured.

2. **Orange badge for pending (D-0702-02):** Using #FF9800 (orange) to distinguish pending captures from sync errors (red) and success (clear).

3. **<all_urls> for generic extractor (D-0702-03):** The generic extractor is dynamically injected on any URL matching a user rule, so it needs broad web_accessible_resources access.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Capture flow complete: rule matching -> extraction -> inbox
- Ready for 07-03 (Popup UI) to add capture controls and inbox preview
- Extension can now capture data from any URL matching a configured rule

---
*Phase: 07-extension-core*
*Plan: 02*
*Completed: 2026-01-22*
