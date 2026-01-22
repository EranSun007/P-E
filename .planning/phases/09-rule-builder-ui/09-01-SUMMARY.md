---
phase: 09-rule-builder-ui
plan: 01
subsystem: ui
tags: [react, dialog, forms, crud, capture-framework]

# Dependency graph
requires:
  - phase: 06-capture-backend
    provides: "CaptureRule backend API endpoints (CRUD operations)"
  - phase: 08-inbox-mapping-ui
    provides: "Capture framework UI patterns (EntityMappingDialog, CaptureInbox page structure)"

provides:
  - "CaptureRule API client in frontend"
  - "RuleBuilderDialog component for rule creation/editing"
  - "CaptureRules page with CRUD operations"
  - "Dynamic selector array management pattern"
  - "Navigation entry for Capture Rules"

affects: [09-02-site-support, testing, documentation]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Dynamic array management for selectors (add/remove with validation)"
    - "Conditional form fields (attribute input only shown for type=attribute)"
    - "Enable/disable toggle in table rows"

key-files:
  created:
    - src/api/apiClient.js (CaptureRule client)
    - src/api/entities.js (CaptureRule export)
    - src/components/capture/RuleBuilderDialog.jsx (400 lines)
    - src/pages/CaptureRules.jsx (342 lines)
  modified:
    - src/pages/index.jsx (routing)
    - src/pages/Layout.jsx (navigation)

key-decisions:
  - "Dynamic selector array follows TaskCreationForm subtasks pattern"
  - "Attribute field conditionally shown only when type=attribute"
  - "Enable/disable toggle updates rule in-place (no confirmation)"
  - "Delete requires confirmation dialog"
  - "Search filters by name and URL pattern client-side"

patterns-established:
  - "RuleBuilderDialog: Dialog-based CRUD with complex nested state (selectors array)"
  - "New selector form: Inline add form with validation before adding to array"
  - "Selector display: Read-only cards with type badges and remove buttons"

# Metrics
duration: 5min
completed: 2026-01-22
---

# Phase 09 Plan 01: Rule Builder UI Summary

**Web-based rule management with dialog-based CRUD, dynamic selector arrays, and enable/disable toggles**

## Performance

- **Duration:** 5 min
- **Started:** 2026-01-22T13:23:01Z
- **Completed:** 2026-01-22T13:28:00Z
- **Tasks:** 3
- **Files created:** 4
- **Files modified:** 2
- **Commits:** 3

## Accomplishments

- Users can create and edit capture rules through web interface
- Dynamic selector array with 5 extraction types (text, html, attribute, href, src)
- Enable/disable toggle allows quick rule activation without deletion
- Search and filter rules by name or URL pattern
- Full CRUD operations with confirmation dialogs

## Task Commits

Each task was committed atomically:

1. **Task 1: Add CaptureRule API client and entity export** - `d1749b45` (feat)
2. **Task 2: Create RuleBuilderDialog with dynamic selector array** - `d2c83b53` (feat)
3. **Task 3: Create CaptureRules page with CRUD operations** - `1f9c9813` (feat)

## Files Created/Modified

**Created:**
- `src/api/apiClient.js` - Added CaptureRule to entities object using createEntityClient
- `src/api/entities.js` - Exported CaptureRule with local mode fallback
- `src/components/capture/RuleBuilderDialog.jsx` (400 lines) - Dialog form with dynamic selector management
- `src/pages/CaptureRules.jsx` (342 lines) - Rules list page with table, search, and CRUD actions

**Modified:**
- `src/pages/index.jsx` - Added CaptureRules route and page registration
- `src/pages/Layout.jsx` - Added "Capture Rules" navigation entry with FileCode icon

## Component Features

### RuleBuilderDialog (400 lines)
- Create/edit mode with form state reset on dialog open
- Rule name and URL pattern inputs (glob format)
- Enable toggle (default true)
- Dynamic selectors array:
  - Add new selector form with validation
  - Field name, CSS selector, type dropdown (5 types)
  - Conditional attribute input (shown only for type=attribute)
  - Required checkbox for validation
  - Display selectors as cards with type badges
  - Remove button per selector
- Validation: name, URL pattern, at least one selector required
- Error alerts and loading states

### CaptureRules Page (342 lines)
- Header with title, description, Refresh and "Add Rule" buttons
- Search bar (filters by name or URL pattern)
- Rules table with columns:
  - Name
  - URL Pattern (with globe icon and code formatting)
  - Selectors count badge
  - Status (Enabled/Disabled with icons)
  - Created date
  - Actions (Enable/Disable toggle, Edit, Delete)
- Empty states for no rules and no search results
- RuleBuilderDialog integration for create/edit
- Delete confirmation dialog
- Loading and error states

## Decisions Made

**1. Dynamic selector array management**
- Followed TaskCreationForm subtasks pattern for add/remove operations
- Validation before adding to array (field_name and selector required)
- Attribute validation when type=attribute

**2. Enable/disable toggle**
- In-place update without confirmation (quick action)
- Visual feedback with Power/PowerOff icons and color-coded badges
- Separate from delete operation (which requires confirmation)

**3. Conditional attribute field**
- Attribute input shown only when type="attribute"
- Clears attribute when type changes away from "attribute"
- Improves form UX by hiding irrelevant fields

**4. Client-side filtering**
- Search filters rules by name or URL pattern
- No backend filtering needed for small rule sets
- Fast, responsive filtering as user types

**5. Empty states**
- Different messages for "no rules" vs "no search results"
- "Create First Rule" action button for empty state
- Follows EmptyState component pattern from CaptureInbox

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None - all tasks completed as planned with no blocking issues.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

**Ready for:**
- Phase 09-02 (Site-Specific Support) - can create rules for Grafana, Jenkins, Jira
- Testing of rule creation flow
- Documentation of URL pattern syntax and CSS selector examples

**Available:**
- CaptureRule API client for frontend components
- RuleBuilderDialog reusable component for rule forms
- Dynamic selector array pattern for other features
- Navigation entry in sidebar

**Notes:**
- Extension must refresh rules after UI changes (background message or storage event)
- URL pattern uses glob syntax (e.g., *grafana.sap/*)
- Selector types match generic-extractor.js implementation

---
*Phase: 09-rule-builder-ui*
*Completed: 2026-01-22*
