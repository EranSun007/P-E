# Requirements: P&E Manager v1.4

**Defined:** 2026-01-28
**Core Value:** Single dashboard showing health and status across all team tools without switching contexts

## v1.4 Requirements

Requirements for Bug Dashboard Fixes & Enhancements milestone. Each maps to roadmap phases.

### Bug Fixes

- [x] **FIX-01**: Component extraction logic correctly categorizes bugs from labels/summary
- [x] **FIX-02**: Component filter dropdown populated from uploaded data with "All Components" default
- [x] **FIX-03**: Component filter updates all KPIs, charts, and table when changed
- [x] **FIX-04**: Category distribution chart shows correct multi-category breakdown
- [x] **FIX-05**: Bug inflow rate uses correct 4-week rolling window formula

### Table Enhancements

- [x] **TABLE-01**: Aging bugs table shows visual age indicators (🔴🟡🟢)
- [x] **TABLE-02**: Aging bugs table includes component column with badge display
- [x] **TABLE-03**: All table columns are sortable with sort indicators

### Visualization

- [x] **VIS-01**: Weekly inflow trend chart displays when multiple weeks uploaded

### UI Polish

- [x] **UI-01**: Filter dropdowns have clear, descriptive labels
- [x] **UI-02**: Component filter badge shows when filtered (not "All")

## Future Requirements

Deferred to v1.5 or later. Tracked but not in current roadmap.

### Table Features

- **TABLE-F01**: Search functionality for bugs (filter by key, summary, assignee)
- **TABLE-F02**: Bulk actions on selected bugs

### Visualization Features

- **VIS-F01**: KPI status badges on cards (✅ On Target / 🟡 Warning / 🔴 Critical)
- **VIS-F02**: Multi-KPI comparison view on trend charts
- **VIS-F03**: Export trend data to CSV

### Advanced Features

- **ADV-F01**: Custom threshold configuration UI
- **ADV-F02**: Per-component threshold overrides

## Out of Scope

Explicitly excluded. Documented to prevent scope creep.

| Feature | Reason |
|---------|--------|
| Direct JIRA API integration | CSV export is the data source per design |
| Real-time bug updates | Weekly CSV upload workflow |
| Bug modification/write-back | Read-only analytics |
| Custom KPI definitions | Fixed set of 9 KPIs |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| FIX-01 | Phase 17 | Complete |
| FIX-02 | Phase 17 | Complete |
| FIX-03 | Phase 17 | Complete |
| FIX-04 | Phase 17 | Complete |
| FIX-05 | Phase 17 | Complete |
| TABLE-01 | Phase 18 | Complete |
| TABLE-02 | Phase 18 | Complete |
| TABLE-03 | Phase 18 | Complete |
| VIS-01 | Phase 18 | Complete |
| UI-01 | Phase 18 | Complete |
| UI-02 | Phase 18 | Complete |

**Coverage:**
- v1.4 requirements: 11 total
- Mapped to phases: 11 (100%)
- Unmapped: 0 ✓

**Phase distribution:**
- Phase 17: 5 requirements (FIX-01 through FIX-05)
- Phase 18: 6 requirements (TABLE-01 through TABLE-03, VIS-01, UI-01, UI-02)

---
*Requirements defined: 2026-01-28*
*Last updated: 2026-01-28 after Phase 18 completion*
