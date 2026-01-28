---
phase: 12-dashboard-ui
plan: 02
subsystem: frontend-visualization
tags: [recharts, data-visualization, jira-integration, table, charts]

dependency-graph:
  requires: ["12-01"]
  provides:
    - "AgingBugsTable component with JIRA links"
    - "MTTRBarChart for resolution time analysis"
    - "BugCategoryChart for category distribution"
    - "Integrated visualization dashboard"
  affects: []

tech-stack:
  added: []
  patterns:
    - "Recharts BarChart with vertical layout"
    - "Recharts PieChart with donut configuration"
    - "Parallel data fetching with Promise.all"

file-tracking:
  key-files:
    created:
      - src/components/bugs/AgingBugsTable.jsx
      - src/components/bugs/MTTRBarChart.jsx
      - src/components/bugs/BugCategoryChart.jsx
    modified:
      - src/pages/BugDashboard.jsx

decisions:
  - id: "12-02-D1"
    description: "JIRA URL configurable via env var with SAP default"
    rationale: "Different environments may have different JIRA instances"
  - id: "12-02-D2"
    description: "Parallel fetch for KPIs and bugs data"
    rationale: "Faster dashboard loading than sequential requests"
  - id: "12-02-D3"
    description: "Named exports plus default exports"
    rationale: "Flexible import patterns for consumers"

metrics:
  duration: "2.5 min"
  completed: "2026-01-28"
---

# Phase 12 Plan 02: Charts and Aging Bugs Table Summary

**One-liner:** Three visualization components - aging bugs table with JIRA links, MTTR bar chart, and category donut chart - integrated into dashboard.

## What Was Built

### AgingBugsTable (DASH-06)
- Table showing open VH/High priority bugs sorted by age
- Bug keys are clickable links to JIRA (opens new tab)
- Priority badges with visual distinction (destructive for VH, secondary for High)
- Human-readable age using date-fns formatDistanceToNow
- Empty state when no high-priority bugs open

### MTTRBarChart (DASH-07)
- Horizontal bar chart using Recharts
- Mean Time To Resolution by priority level
- Priority-colored bars (red, orange, yellow, green)
- Tooltip showing resolution time and bug count
- Empty state when no resolved bugs

### BugCategoryChart (DASH-08)
- Donut chart using Recharts PieChart
- Bug distribution across categories/components
- Component-specific colors for visual distinction
- Legend and tooltip with percentages
- Empty state when no category data

### Dashboard Integration
- Added bugs state with parallel data fetching
- MTTR and category charts in responsive 2-column grid
- Aging bugs table below charts
- All visualizations update with week/component filter changes

## Technical Implementation

### File Structure
```
src/components/bugs/
├── AgingBugsTable.jsx    # 122 lines - Table with JIRA links
├── MTTRBarChart.jsx      # 100 lines - Horizontal bar chart
├── BugCategoryChart.jsx  # 96 lines - Donut chart
└── ...existing files
```

### Key Patterns

**JIRA Integration:**
```javascript
const JIRA_BASE_URL = import.meta.env.VITE_JIRA_BASE_URL || 'https://jira.tools.sap/browse/';

// Link rendering
<a href={`${JIRA_BASE_URL}${bug.bug_key}`} target="_blank" rel="noopener noreferrer">
```

**Recharts Configuration:**
```javascript
// Horizontal bar chart
<BarChart data={data} layout="vertical">
  <XAxis type="number" />
  <YAxis dataKey="priority" type="category" />
</BarChart>

// Donut chart
<Pie innerRadius={60} outerRadius={90} paddingAngle={2}>
```

**Parallel Data Fetching:**
```javascript
const [kpiData, bugData] = await Promise.all([
  apiClient.bugs.getKPIs(...),
  apiClient.bugs.listBugs(...)
]);
```

## Commits

| Hash | Type | Description |
|------|------|-------------|
| 4be84d73 | feat | Create AgingBugsTable component |
| 93889b1c | feat | Create MTTRBarChart component |
| 52306873 | feat | Create BugCategoryChart and integrate visualizations |

## Verification Results

- [x] AgingBugsTable renders open VH/High bugs
- [x] Bug keys link to JIRA (opens new tab)
- [x] MTTRBarChart shows horizontal bars by priority
- [x] Bar colors match priority levels
- [x] BugCategoryChart shows donut with category segments
- [x] Legend displays all categories
- [x] Component filter updates all visualizations
- [x] Week filter updates all visualizations
- [x] Empty states handled gracefully
- [x] `npm run build` succeeds

## Deviations from Plan

None - plan executed exactly as written.

## v1.2 DevOps Bug Dashboard - Phase Complete

With this plan complete, the v1.2 DevOps Bug Dashboard milestone is fully implemented:

**Backend (Phase 10):**
- CSV parsing with fast-csv
- 3-table schema: bug_uploads, bugs, weekly_kpis
- Pre-calculated KPIs during upload
- 9 KPIs with defined formulas

**Upload UI (Phase 11):**
- Drag-and-drop CSV upload
- Progress tracking
- Duplicate detection
- Week-ending date handling

**Dashboard UI (Phase 12):**
- KPI cards with status colors (green/yellow/red)
- Critical alert banner for red zone KPIs
- MTTR bar chart
- Category distribution donut chart
- Aging bugs table with JIRA links
- Week and component filtering
