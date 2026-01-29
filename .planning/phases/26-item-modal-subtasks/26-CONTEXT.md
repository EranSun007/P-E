# Phase 26: Item Modal & Subtasks - Context

**Gathered:** 2026-01-29
**Status:** Ready for planning

<domain>
## Phase Boundary

Modal interface for creating and editing sync items with all form fields (category, team, status, assignee, sprint) and subtask management (list display, completion toggle, add input, drag-and-drop reorder). This phase covers UI-05 through UI-15 requirements.

</domain>

<decisions>
## Implementation Decisions

### Modal Layout & Entry Points
- Click on Kanban card opens modal in **view mode first** (read-only with Edit button to prevent accidental edits)
- Modal size: **medium width (~600px)** with fields stacking vertically
- Create button location: **page header** (next to team tabs)
- Create button label: **"+ Add"** (minimal, icon-focused)

### Dropdown Defaults & Behavior
- Team dropdown: **pre-selects current team tab** when creating new item (if viewing Metering, defaults to Metering)
- Required fields: **Title + Category + Team** (core fields that define where item appears)
- Default status for new items: **"New"**
- Sprint dropdown: **shows current + future sprints only** (no past sprints)

### Subtask Section Design
- Subtask section appears in a **collapsible accordion** within the modal
- Add subtask input: **inline input always visible** at bottom of list (type and Enter to add)
- Drag handle: **visible 6-dot grip icon on left** of each subtask (always visible, clear affordance)
- Completed subtask styling: **checkbox checked only, no text change** (minimal styling, keeps text readable)

### Feedback & States
- After save: **close modal immediately** (return to Kanban board, item visible in updated position)
- Unsaved changes: **show confirmation dialog** if user tries to close with unsaved changes ("You have unsaved changes. Discard?")
- Validation errors: **inline below each field** (red text directly under invalid field)
- Loading state during save: **disable Save button + show spinner in button** ("Saving..." with spinner, prevents double-click)

### Claude's Discretion
- Modal header design and close button placement
- Field ordering within the form
- Accordion expand/collapse animation
- Empty subtask state message
- Delete subtask button style and confirmation
- Error message wording

</decisions>

<specifics>
## Specific Ideas

- Note from discussion: sync items are stored in projects table, so button could be labeled "Create Project" in context, but "+ Add" was chosen for simplicity on TeamSync page
- View mode before edit mode follows patterns that prevent accidental changes

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 26-item-modal-subtasks*
*Context gathered: 2026-01-29*
