---
phase: 13-historical-kpi-storage
plan: 01
subsystem: api
tags: [postgresql, express, rest-api, kpi, time-series]

# Dependency graph
requires:
  - phase: 11-kpi-calculations
    provides: weekly_kpis table with calculated KPIs per upload
  - phase: 10-csv-upload
    provides: bug_uploads table with week_ending dates
provides:
  - Historical KPI query endpoint returning time-series data
  - BugService.getKPIHistory method with JOIN query
  - Week-based KPI history for chart X-axis rendering
affects: [14-trend-charts, 15-threshold-evaluation]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Historical data queries via JOIN (weekly_kpis + bug_uploads)"
    - "Week count validation (4/8/12 weeks)"

key-files:
  created: []
  modified:
    - server/services/BugService.js
    - server/routes/bugs.js

key-decisions:
  - "JOIN query pattern: weekly_kpis + bug_uploads for week_ending dates"
  - "Week count validation: only allow 4, 8, or 12 weeks (default 12)"
  - "Component filter using IS NOT DISTINCT FROM for NULL handling"

patterns-established:
  - "Historical queries return arrays with week_ending for X-axis"
  - "Service validates input parameters (weeks: 4/8/12)"
  - "Route provides sensible defaults (weeks=12) for optional params"

# Metrics
duration: 2min
completed: 2026-01-28
---

# Phase 13 Plan 01: Historical KPI Storage Summary

**GET /api/bugs/kpis/history endpoint returns multi-week KPI trend data with week_ending dates for chart visualization**

## Performance

- **Duration:** 2 min
- **Started:** 2026-01-28T14:57:32Z
- **Completed:** 2026-01-28T14:58:38Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments
- Added getKPIHistory method to BugService with JOIN query (weekly_kpis + bug_uploads)
- Created GET /api/bugs/kpis/history endpoint accepting weeks and component parameters
- Week count validation ensures only 4, 8, or 12 weeks (defaults to 12)
- Response includes week_ending dates for chart X-axis rendering

## Task Commits

Each task was committed atomically:

1. **Task 1: Add getKPIHistory method to BugService** - `63a14525` (feat)
2. **Task 2: Add GET /api/bugs/kpis/history route** - `5dd756f9` (feat)

## Files Created/Modified
- `server/services/BugService.js` - Added getKPIHistory method with JOIN query and week validation
- `server/routes/bugs.js` - Added GET /api/bugs/kpis/history endpoint with JSDoc

## Decisions Made

**1. JOIN query pattern for historical data:**
- Query JOINs weekly_kpis with bug_uploads to get week_ending dates
- Uses `IS NOT DISTINCT FROM` for NULL-safe component filtering
- Orders by week_ending DESC for chronological data

**2. Week count validation:**
- Only allow 4, 8, or 12 weeks
- Invalid values default to 12
- Enables frontend to provide fixed time-range options

**3. Response format:**
- Array of objects with week_ending, component, kpi_data, calculated_at
- week_ending DATE from bug_uploads enables X-axis rendering
- Maintains consistency with existing getKPIs response structure

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

**Ready for Phase 14 (Trend Charts):**
- Historical KPI endpoint provides time-series data
- week_ending dates enable chart X-axis labels
- Week count parameter (4/8/12) supports multiple time ranges
- Component filter matches dashboard filtering

**Performance note:**
- Query includes JOIN with weekly_kpis and bug_uploads
- Limited to 12 weeks maximum (manageable dataset)
- Should complete under 500ms for typical datasets

---
*Phase: 13-historical-kpi-storage*
*Completed: 2026-01-28*
