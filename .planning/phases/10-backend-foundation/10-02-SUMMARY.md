---
phase: 10-backend-foundation
plan: 02
subsystem: api
tags: [express, rest-api, multer, kpi-calculation, bug-tracking]

# Dependency graph
requires:
  - phase: 10-01
    provides: BugService foundation with CSV parsing and database operations
provides:
  - Complete KPI calculation engine for all 9 KPIs (KPI-01 through KPI-09)
  - REST API for bug uploads, KPI retrieval, and bug queries
  - Transaction-based upload workflow with atomic operations
affects: [11-frontend-dashboard]

# Tech tracking
tech-stack:
  added: []
  patterns: [KPI pre-calculation and storage, median/stddev calculations, ISO week grouping, multer memory storage for CSV uploads]

key-files:
  created:
    - server/routes/bugs.js
  modified:
    - server/services/BugService.js
    - server/index.js

key-decisions:
  - "Pre-calculate KPIs during upload for instant dashboard loads"
  - "Store KPIs per component plus 'all' aggregate for flexible filtering"
  - "Use multer memory storage to avoid disk I/O for CSV processing"
  - "Calculate median MTTR and stddev for workload distribution"

patterns-established:
  - "KPI calculation uses sorted arrays for median, array operations for stddev"
  - "ISO week calculation with getWeekKey for consistent grouping"
  - "Transaction wraps entire upload workflow (metadata → bugs → KPIs)"
  - "Component-level KPI storage enables drill-down without recalculation"

# Metrics
duration: 2min
completed: 2026-01-27
---

# Phase 10 Plan 02: Upload API and KPI Calculations Summary

**REST API with 6 endpoints for bug uploads, KPI retrieval, and filtering; BugService calculates all 9 KPIs (KPI-01 through KPI-09) with median/stddev math**

## Performance

- **Duration:** 2 min
- **Started:** 2026-01-27T21:15:47Z
- **Completed:** 2026-01-27T21:17:33Z
- **Tasks:** 3
- **Files modified:** 3

## Accomplishments
- Implemented all 9 KPI calculations (KPI-01 through KPI-09) matching specification formulas
- Created REST API with 6 endpoints: upload, uploads list, KPIs, bug list, delete, check duplicate
- Transaction-based uploadCSV method ensures atomic operations across 3 tables
- Helper methods for statistical calculations: calculateMedian, calculateStdDev, getWeekKey

## Task Commits

Each task was committed atomically:

1. **Task 1: Add KPI calculations and upload workflow to BugService** - `6734c5ef` (feat)
2. **Task 2: Create REST API routes for bug dashboard** - `1d1752b4` (feat)
3. **Task 3: Mount bug routes at /api/bugs** - `80d6fbe1` (feat)

## Files Created/Modified
- `server/services/BugService.js` - Added calculateKPIs (all 9 KPIs), uploadCSV with transaction, listBugs with filtering, getKPIs for retrieval
- `server/routes/bugs.js` - 6 REST endpoints with multer for CSV upload, validation, and error handling
- `server/index.js` - Mounted /api/bugs routes

## Decisions Made

1. **KPI Pre-calculation:** Store all 9 KPIs (KPI-01 through KPI-09) in weekly_kpis table during upload
   - Rationale: Dashboard loads instantly vs calculating 10 KPIs on every page load

2. **Component-level KPI Storage:** Store KPIs for "all" (NULL component) plus each detected component
   - Rationale: Frontend can filter by component without backend recalculation

3. **Multer Memory Storage:** Process CSV in memory without disk writes
   - Rationale: Faster for 10MB files, no cleanup needed, follows stateless API pattern

4. **Statistical Calculations:** Median for MTTR (not mean), stddev for workload distribution
   - Rationale: Median more robust to outliers, stddev quantifies workload volatility

5. **Transaction Scope:** Wrap upload metadata, bug inserts, and KPI calculations in single transaction
   - Rationale: Atomic failure/success prevents partial uploads, maintains referential integrity

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None - implementation followed plan specifications for all 9 KPIs and REST endpoints.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

Ready for Phase 11 (Frontend Dashboard):
- REST API complete with 6 endpoints for all dashboard operations
- All 9 KPIs (KPI-01 through KPI-09) calculated and stored per upload and component
- CSV upload with validation (required columns, Saturday week-ending date)
- Filtering and pagination built into listBugs endpoint
- DELETE cascades from uploads to bugs to KPIs

**Blockers:** None

**Concerns:**
- KPI formulas should be validated with sample production data before launch
- Large CSV files (1000+ bugs) need performance testing for transaction duration
- Component extraction accuracy should be verified with real JIRA labels

---
*Phase: 10-backend-foundation*
*Completed: 2026-01-27*
