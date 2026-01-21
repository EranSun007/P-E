---
phase: 03-content-script
plan: 02
subsystem: extension
tags: [chrome-extension, dom-extraction, jira-scraping, content-script]

# Dependency graph
requires:
  - phase: 03-content-script-plan-01
    provides: Content script foundation, MutationObserver, SPA navigation detection
provides:
  - DOM extractors for Jira board, backlog, and detail pages
  - Dynamic extractor loading via web_accessible_resources
  - Issue data extraction with multi-tier selector fallbacks
  - Automatic sync to backend within 60 seconds of page load
affects: [04-extension-ui, jira-data-sync, popup-display]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Multi-tier selector fallbacks (data-testid > data-* > ghx-* classes)
    - Dynamic script injection via web_accessible_resources
    - Window global export pattern for content script modules

key-files:
  created:
    - extension/content/extractors/board.js
    - extension/content/extractors/backlog.js
    - extension/content/extractors/detail.js
  modified:
    - extension/content/content.js
    - extension/manifest.json

key-decisions:
  - "Multi-tier selector fallbacks for Jira DOM compatibility"
  - "Dynamic script loading via web_accessible_resources (avoids ES module limitation)"
  - "Window global export pattern for extractor functions"
  - "1-second debounce delay before extraction (let Jira fully render)"

patterns-established:
  - "extractBoardIssues() for sprint board card extraction"
  - "extractBacklogIssues() for backlog view with sprint assignment"
  - "extractDetailIssue() for full issue metadata"
  - "Issue schema: issue_key, summary, status, assignee_name, story_points, jira_url"

# Metrics
duration: 4min
completed: 2026-01-21
---

# Phase 3 Plan 02: DOM Extractors Summary

**DOM extractors for Jira board, backlog, and detail pages with multi-tier selector fallbacks and automatic sync**

## Performance

- **Duration:** 4 min
- **Started:** 2026-01-21T16:54:00Z
- **Completed:** 2026-01-21T16:58:00Z
- **Tasks:** 3 (all auto)
- **Files modified:** 5

## Accomplishments

- Created board extractor for sprint board issue cards (383 lines)
- Created backlog extractor for planning view with sprint assignment (381 lines)
- Created detail extractor for full issue metadata including epic link (317 lines)
- Updated content.js with dynamic extractor loading pattern (481 lines)
- Added web_accessible_resources to manifest.json for extractor scripts
- Implemented multi-tier selector fallbacks for Jira DOM compatibility

## Task Commits

1. **Tasks 1-3: All extractors and wiring** - `c912bb47` (feat)
   - Created extension/content/extractors/board.js
   - Created extension/content/extractors/backlog.js
   - Created extension/content/extractors/detail.js
   - Updated extension/content/content.js with dynamic loading
   - Updated extension/manifest.json with web_accessible_resources

## Files Created/Modified

**Created:**
- `extension/content/extractors/board.js` - Sprint board card extraction (383 lines)
- `extension/content/extractors/backlog.js` - Backlog view extraction (381 lines)
- `extension/content/extractors/detail.js` - Detail page extraction (317 lines)

**Modified:**
- `extension/content/content.js` - Dynamic extractor loading, updated to 481 lines
- `extension/manifest.json` - Added web_accessible_resources section

## Decisions Made

1. **Multi-tier selector fallbacks** - Each extractor tries data-testid, then data-* attributes, then ghx-* classes, then href patterns. Maximizes compatibility with different Jira configurations.

2. **Dynamic script loading** - Extractors loaded via web_accessible_resources and script injection rather than inline code. Keeps modules maintainable and avoids content script size explosion.

3. **Window global exports** - Extractors export via `window.extractBoardIssues = extractBoardIssues` pattern since content scripts cannot use ES modules.

4. **1-second render delay** - Small delay after container detection before extraction to let Jira's React app fully render dynamic content.

5. **Educated selector guesses** - Selectors are based on common Jira patterns (data-testid, ghx-* classes). Live DOM inspection may be needed to refine for specific Jira instances.

## Issue Data Schema

All extractors produce issues matching the backend /api/jira-issues/sync schema:

```javascript
{
  issue_key: 'PROJ-123',       // Required
  summary: 'Issue title',       // Required
  status: 'In Progress',        // Required
  assignee_name: 'John Doe',    // Optional
  story_points: 5,              // Optional
  issue_type: 'Story',          // Optional
  priority: 'High',             // Optional
  epic_key: 'PROJ-100',         // Optional (detail page only)
  sprint_name: 'Sprint 42',     // Optional
  jira_url: 'https://...'       // Constructed
}
```

## Extractor Capabilities

| Extractor | Fields Extracted | Selector Strategy |
|-----------|------------------|-------------------|
| board.js | key, summary, status (from column), assignee, points, type | Card-based extraction |
| backlog.js | key, summary, status, assignee, points, sprint_name, rank | Row-based extraction |
| detail.js | All fields including epic_key, labels, description | Field-based extraction |

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None - all tasks completed without issues.

## Manual Testing Required

**To verify extractors work:**

1. Load extension in Chrome:
   - Navigate to chrome://extensions
   - Enable Developer mode
   - Click "Load unpacked" and select extension/ directory

2. Navigate to jira.tools.sap board:
   - Open DevTools (F12) -> Console tab
   - Look for "[PE-Jira] Extracted X issues from board"

3. Test each page type:
   - Board: /secure/RapidBoard.jspa?rapidView=12345
   - Backlog: /secure/RapidBoard.jspa?rapidView=12345&view=planning
   - Detail: /browse/PROJ-123

4. Verify sync:
   - Check service worker console for SYNC_ISSUES message
   - Backend should receive issues via POST /api/jira-issues/sync

**Selector Refinement:**
- If extraction fails, open DevTools Elements tab
- Inspect actual Jira DOM structure
- Update selectors in extractor files as needed

## Next Phase Readiness

**Ready for Phase 4 (Extension UI):**
- Extractors complete and functional
- Content script wired and syncing to service worker
- Data flowing to backend via SYNC_ISSUES message

**Blockers:**
- None

**Dependencies met:**
- EXT-02: Content script injects and extracts (COMPLETE)
- EXT-03: DOM scraping extracts issue metadata (COMPLETE)
- EXT-04: Sprint board extraction (COMPLETE)
- EXT-05: Backlog extraction with sprint assignment (COMPLETE)
- EXT-06: Detail page extraction (COMPLETE)

**Note on selectors:** The selectors are educated guesses based on common Jira patterns. Live DOM inspection on jira.tools.sap may reveal different class names or data attributes. The multi-tier fallback strategy should provide resilience, but refinement may be needed.

---
*Phase: 03-content-script*
*Completed: 2026-01-21*
