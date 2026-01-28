---
phase: 11-csv-upload
plan: 01
subsystem: frontend
tags: [react, upload, csv, dropzone, ui]

# Dependency Graph
requires:
  - "10-02": "Bug upload backend API"
provides:
  - "CSV upload UI with progress tracking"
  - "Bug Dashboard page with navigation"
  - "Bug API client methods"
affects:
  - "12-01": "KPI dashboard will consume uploaded data"
  - "12-02": "Charts and analysis build on upload foundation"

# Tech Stack
tech-stack:
  added:
    - "react-dropzone@14.3.8"
  patterns:
    - "XMLHttpRequest for upload progress (fetch lacks progress events)"
    - "Saturday-only date validation with snap-to-previous"
    - "AlertDialog for duplicate confirmation workflow"

# Files
key-files:
  created:
    - "src/components/bugs/CSVUploadDialog.jsx"
    - "src/pages/BugDashboard.jsx"
  modified:
    - "src/api/apiClient.js"
    - "src/pages/index.jsx"
    - "src/pages/Layout.jsx"
    - "package.json"

# Decisions
decisions:
  - id: "11-01-001"
    decision: "Use XMLHttpRequest instead of fetch for uploads"
    rationale: "fetch API doesn't support upload progress events"
    alternatives: ["Indeterminate progress with fetch", "axios"]
  - id: "11-01-002"
    decision: "Snap non-Saturday dates to previous Saturday"
    rationale: "Better UX than error message for invalid dates"
    alternatives: ["Error message only", "Date picker with Saturday-only option"]

# Metrics
metrics:
  duration: "4m 43s"
  completed: "2026-01-28"
---

# Phase 11 Plan 01: CSV Upload UI Summary

CSV upload UI enabling users to import JIRA bug exports with drag-and-drop, progress tracking, and duplicate detection.

## One-liner

React-dropzone file upload with XHR progress, Saturday-only date picker, AlertDialog duplicate confirmation.

## What Was Built

### CSVUploadDialog Component (442 lines)
Complete upload dialog implementing the following features:
- Drag-and-drop file selection using react-dropzone
- Saturday-only week-ending date picker (snaps non-Saturday to previous)
- Real-time upload progress via XMLHttpRequest
- Duplicate detection with confirmation AlertDialog
- Error display for invalid files (type, size)
- Success summary showing bug count and components
- Full state reset on dialog close

### Bug API Client (6 methods)
Added bugs section to apiClient.js:
- `checkDuplicate(weekEnding)` - Pre-upload duplicate detection
- `listUploads()` - Get all uploads for user
- `getUpload(id)` - Get single upload details
- `deleteUpload(id)` - Delete with cascade
- `getKPIs(uploadId, component)` - Get calculated KPIs
- `listBugs(uploadId, filters)` - List bugs with pagination

### BugDashboard Page (83 lines)
Placeholder page with:
- Upload CSV button triggering CSVUploadDialog
- Placeholder card for Phase 12 KPI dashboard
- Last upload summary display
- Navigation link in sidebar with Bug icon

## Commits

| Hash | Type | Description |
|------|------|-------------|
| 7513217f | feat | Install react-dropzone and add bugs API client |
| ca8bad30 | feat | Create CSVUploadDialog component |
| c32336dc | feat | Create BugDashboard page and add navigation |

## Key Technical Decisions

### XMLHttpRequest for Progress
Using XHR instead of fetch because the fetch API doesn't support upload progress events. This enables real-time percentage updates during file upload.

### Saturday Date Snapping
Instead of showing error messages for invalid dates, the date picker automatically snaps any non-Saturday selection to the previous Saturday, providing better UX.

### AlertDialog for Duplicates
Using the existing AlertDialog component for duplicate confirmation maintains UI consistency and provides accessible modal behavior with proper focus management.

## Deviations from Plan

None - plan executed exactly as written.

## Dependencies Added

| Package | Version | Purpose |
|---------|---------|---------|
| react-dropzone | ^14.3.8 | Drag-and-drop file upload with file type validation |

## Files Changed

| File | Lines | Change |
|------|-------|--------|
| src/components/bugs/CSVUploadDialog.jsx | +442 | New upload dialog component |
| src/pages/BugDashboard.jsx | +83 | New dashboard page |
| src/api/apiClient.js | +45 | Bug API methods |
| src/pages/index.jsx | +6 | Route and lazy import |
| src/pages/Layout.jsx | +6 | Navigation link |
| package.json | +3 | react-dropzone dependency |

## Verification Results

- [x] react-dropzone@14.3.8 installed
- [x] apiClient.bugs has 6 methods
- [x] CSVUploadDialog is 442 lines (required: 200+)
- [x] BugDashboard is 83 lines (required: 30+)
- [x] XHR POST to /api/bugs/upload present
- [x] Duplicate check via /api/bugs/uploads/check present
- [x] CSVUploadDialog imported in BugDashboard
- [x] No lint errors in new files

## Next Phase Readiness

### Phase 12 Prerequisites Met
- Upload API client methods ready for KPI fetching
- BugDashboard page ready for KPI cards
- Upload workflow provides data for analysis

### Remaining for v1.2
- 12-01: KPI Dashboard - Display cards with thresholds
- 12-02: Charts and Analysis - MTTR charts, aging bugs table
