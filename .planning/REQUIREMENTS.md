# Requirements: P&E Manager v1.2 DevOps Bug Dashboard

**Generated:** 2026-01-27
**Status:** Active
**Source:** User specification + KPI_SPECIFICATION.md + IMPLEMENTATION_GUIDE.md

---

## v1.2 Requirements (This Milestone)

### CSV Upload (UPLOAD)

- [ ] **UPLOAD-01**: User can upload JIRA CSV export file via drag-and-drop or file picker
- [ ] **UPLOAD-02**: User must specify week-ending date (Saturday) for each upload
- [ ] **UPLOAD-03**: System validates CSV has required columns (Key, Summary, Priority, Status, Created, Resolved, Reporter, Assignee, Labels)
- [ ] **UPLOAD-04**: System detects duplicate uploads for same week and prompts for replace/cancel
- [ ] **UPLOAD-05**: System shows upload progress and summary (total bugs, components detected)
- [ ] **UPLOAD-06**: System displays clear error messages for invalid CSV format

### Database Schema (DB)

- [ ] **DB-01**: bug_uploads table stores upload metadata (id, user_id, week_ending, filename, uploaded_at, bug_count)
- [ ] **DB-02**: bugs table stores parsed bug data with calculated fields (resolution_time_hours, component)
- [ ] **DB-03**: weekly_kpis table stores pre-calculated KPI values per (upload_id, component)
- [ ] **DB-04**: Indexes on user_id, status, priority, component for query performance
- [ ] **DB-05**: CASCADE DELETE from bug_uploads removes associated bugs and KPIs

### KPI Calculations (KPI)

- [ ] **KPI-01**: Bug Inflow Rate - Average bugs created per week over rolling 4-week period
- [ ] **KPI-02**: Time to First Response (TTFR) - Median time to first status change, % under 24h
- [ ] **KPI-03**: MTTR by Priority - Median resolution time for Very High, High, Medium, Low
- [ ] **KPI-04**: SLA Compliance - % of VH bugs resolved <24h, % of High bugs resolved <48h
- [ ] **KPI-05**: Open Bug Age Distribution - Count and avg age of open bugs by priority
- [ ] **KPI-06**: Automated vs Actionable Ratio - % of bugs from automated reporters (T_*)
- [ ] **KPI-07**: Bug Category Distribution - Count by category (deployment, foss, service-broker, other)
- [ ] **KPI-08**: Duty Rotation Workload - Avg bugs/week and standard deviation
- [ ] **KPI-09**: Backlog Health Score - 100 - (VH×10) - (High×5), clamped 0-100

### Dashboard UI (DASH)

- [ ] **DASH-01**: Dashboard page shows all KPIs in card layout with status indicators
- [ ] **DASH-02**: KPI cards show green/yellow/red status based on thresholds
- [ ] **DASH-03**: Filter by component (All, deploy-metering, service-broker, foss, etc.)
- [ ] **DASH-04**: Filter by week (dropdown of uploaded weeks)
- [ ] **DASH-05**: Critical alert banner when any KPI in red zone
- [ ] **DASH-06**: Aging bugs table showing open VH/High bugs with JIRA links
- [ ] **DASH-07**: MTTR by priority bar chart
- [ ] **DASH-08**: Bug category pie/donut chart

### Backend API (API)

- [ ] **API-01**: POST /api/bugs/upload - Accept CSV file, validate, parse, store, calculate KPIs
- [ ] **API-02**: GET /api/bugs/uploads - List uploaded weeks for dropdown
- [ ] **API-03**: GET /api/bugs/kpis - Get KPI values for week + component
- [ ] **API-04**: GET /api/bugs/list - Get bugs with filtering and pagination
- [ ] **API-05**: DELETE /api/bugs/uploads/:id - Delete upload and cascade to bugs/KPIs

---

## KPI Thresholds Reference

| KPI | Green | Yellow | Red |
|-----|-------|--------|-----|
| Bug Inflow Rate | ≤6/week | 6.1-8/week | >8/week |
| TTFR Median | <24h | 24-48h | >48h |
| SLA VH (<24h) | ≥80% | 60-79% | <60% |
| SLA High (<48h) | ≥70% | 50-69% | <50% |
| Backlog Health | 70-100 | 50-69 | 0-49 |

---

## Future Requirements (v1.3+)

### Deferred Features

- **v3-01**: Trend charts showing KPI history over multiple weeks
- **v3-02**: Email notifications when KPIs breach thresholds
- **v3-03**: Export KPI report to PDF/Excel
- **v3-04**: Compare KPIs between time periods
- **v3-05**: Bug resolution predictions based on historical data
- **v3-06**: Integration with duty rotation calendar

---

## Out of Scope

| Feature | Reason |
|---------|--------|
| Direct JIRA API integration | No API access, CSV export is standard workflow |
| Real-time bug updates | Weekly upload workflow is sufficient |
| Bug modification/write-back | Read-only analytics dashboard |
| Custom KPI definitions | 10 fixed KPIs cover duty monitoring needs |
| Historical data import | Starts fresh, builds history over time |
| Automated scheduled uploads | Manual upload ensures data review |

---

## Traceability

| REQ-ID | Phase | Status |
|--------|-------|--------|
| UPLOAD-01 | Phase 11 | Complete |
| UPLOAD-02 | Phase 11 | Complete |
| UPLOAD-03 | Phase 10 | Complete |
| UPLOAD-04 | Phase 11 | Complete |
| UPLOAD-05 | Phase 11 | Complete |
| UPLOAD-06 | Phase 11 | Complete |
| DB-01 | Phase 10 | Complete |
| DB-02 | Phase 10 | Complete |
| DB-03 | Phase 10 | Complete |
| DB-04 | Phase 10 | Complete |
| DB-05 | Phase 10 | Complete |
| KPI-01 | Phase 10 | Complete |
| KPI-02 | Phase 10 | Complete |
| KPI-03 | Phase 10 | Complete |
| KPI-04 | Phase 10 | Complete |
| KPI-05 | Phase 10 | Complete |
| KPI-06 | Phase 10 | Complete |
| KPI-07 | Phase 10 | Complete |
| KPI-08 | Phase 10 | Complete |
| KPI-09 | Phase 10 | Complete |
| API-01 | Phase 11 | Complete |
| API-02 | Phase 10 | Complete |
| API-03 | Phase 10 | Complete |
| API-04 | Phase 10 | Complete |
| API-05 | Phase 10 | Complete |
| DASH-01 | Phase 12 | Pending |
| DASH-02 | Phase 12 | Pending |
| DASH-03 | Phase 12 | Pending |
| DASH-04 | Phase 12 | Pending |
| DASH-05 | Phase 12 | Pending |
| DASH-06 | Phase 12 | Pending |
| DASH-07 | Phase 12 | Pending |
| DASH-08 | Phase 12 | Pending |

*Traceability table updated — 2026-01-28*

---

## Acceptance Criteria Summary

**CSV Upload works when:**
1. User can drag-drop or select CSV file
2. Week-ending date picker shows only Saturdays
3. Invalid CSV shows clear error message with missing columns
4. Duplicate week detection offers replace option
5. Upload shows progress bar and completion summary

**KPI Calculations work when:**
1. All 10 KPIs calculated on upload completion
2. Values match formulas in KPI_SPECIFICATION.md
3. KPIs stored per component + "all" aggregate
4. Recalculation not needed on page load

**Dashboard works when:**
1. KPI cards show values with green/yellow/red status
2. Component filter updates all KPIs
3. Week filter loads historical data
4. Alert banner appears when any KPI red
5. Aging bugs table shows clickable JIRA links
6. Charts render correctly with data

**API works when:**
1. Upload endpoint parses CSV and returns summary
2. KPIs endpoint returns all calculated values
3. Bugs list supports filtering and pagination
4. Delete cascades to bugs and KPIs

---

*Requirements generated from user specification and KPI documentation*
