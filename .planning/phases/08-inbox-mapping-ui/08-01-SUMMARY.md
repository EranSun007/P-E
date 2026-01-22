---
phase: 08-inbox-mapping-ui
plan: 01
subsystem: capture-framework
tags: [react, api-client, inbox-ui, preview-dialog]
status: complete
created: 2026-01-22
completed: 2026-01-22

dependencies:
  requires:
    - "06-01: Capture framework database schema"
    - "06-02: Capture framework backend services"
  provides:
    - CaptureInbox API client with accept/reject methods
    - EntityMapping API client with lookup method
    - CaptureInbox page with table and filtering
    - InboxItemDetail preview dialog component
  affects:
    - "08-02: Entity mapping dialog and bulk operations"

tech-stack:
  added: []
  patterns:
    - "createCaptureInboxClient factory for API client"
    - "Client-side filtering with useMemo"
    - "Action loading states per item"

key-files:
  created:
    - src/components/capture/InboxItemDetail.jsx
    - src/pages/CaptureInbox.jsx
  modified:
    - src/api/apiClient.js
    - src/api/entities.js
    - src/pages/index.jsx
    - src/pages/Layout.jsx

decisions:
  - id: D-0801-01
    description: "Default filter to 'pending' status to show actionable items first"
    rationale: "Users typically want to see items needing review, not historical data"

metrics:
  duration: "4m"
  tasks_completed: 3
  files_created: 2
  files_modified: 4
  lines_added: ~610
---

# Phase 8 Plan 1: Capture Inbox Foundation Summary

Created API clients and UI components for the capture inbox workflow, enabling users to view, preview, and act on captured data.

## One-Liner

CaptureInbox page with table display, client-side filtering, preview dialog, and basic accept/reject actions via new API clients.

## Completed Tasks

| Task | Name | Commit | Key Files |
|------|------|--------|-----------|
| 1 | Add CaptureInbox and EntityMapping API clients | 4f813ecd | apiClient.js, entities.js |
| 2 | Create InboxItemDetail preview component | 1381dcf8 | InboxItemDetail.jsx |
| 3 | Create CaptureInbox page with table, filtering, and actions | ece63bc1 | CaptureInbox.jsx, index.jsx, Layout.jsx |

## What Was Built

### API Clients (src/api/apiClient.js)

**CaptureInbox client:**
- `list()` - Get all inbox items
- `get(id)` - Get single item
- `create(data)` - Create item (used by extension)
- `accept(id, data)` - Accept with optional entity mapping
- `reject(id, data)` - Reject with optional reason
- `bulkAccept(itemIds, options)` - Bulk accept
- `bulkReject(itemIds)` - Bulk reject

**EntityMapping client:**
- Standard CRUD operations
- `lookup(sourceIdentifier)` - Find existing mapping by source

### InboxItemDetail Component (src/components/capture/InboxItemDetail.jsx)

Preview dialog showing:
- Status badge (pending/accepted/rejected)
- Source hostname and capture timestamp
- Source identifier and rule name
- Full source URL as clickable link
- Captured data formatted as key-value pairs
- Processing timestamp for processed items

### CaptureInbox Page (src/pages/CaptureInbox.jsx)

**Summary cards:**
- Total items count
- Pending count (yellow)
- Accepted count (green)
- Rejected count (red)

**Filter bar:**
- Search by identifier or rule name
- Status dropdown (All/Pending/Accepted/Rejected)
- Source hostname dropdown
- Clear filters button

**Table columns:**
- Source (hostname with Globe icon)
- Identifier (truncated)
- Rule name
- Captured timestamp (relative)
- Status badge
- Actions (Preview/Accept/Reject for pending items)

**Actions:**
- Click row to open preview dialog
- Preview button (Eye icon)
- Accept button (Check icon, green)
- Reject button (X icon, red)
- Loading states per action

### Navigation

- Route: `/capture-inbox`
- Sidebar: "Capture Inbox" with Inbox icon in People mode navigation

## Deviations from Plan

None - plan executed exactly as written.

## Technical Notes

### Pattern Decisions

1. **Client-side filtering** - Items loaded once, filtered with useMemo for performance
2. **Action loading per item** - `actionLoading[itemId]` prevents duplicate clicks
3. **Optimistic UI updates** - Local state updated immediately after API success
4. **Default status filter** - Shows "pending" by default to surface actionable items

### Integration Points

- Uses CaptureInbox.list() to fetch items from `/api/capture-inbox`
- Accept/reject call backend endpoints created in Phase 6
- InboxItemDetail handles both string and object captured_data formats

## Verification Results

- Build succeeds with new CaptureInbox chunk (11.10 kB)
- CaptureInbox exported from entities.js with all methods
- EntityMapping exported from entities.js with lookup method
- Route /capture-inbox registered in index.jsx
- Navigation item added to Layout.jsx sidebar
- CaptureInbox.jsx: 474 lines (exceeds 150 min)
- InboxItemDetail.jsx: 139 lines (exceeds 50 min)

## Next Phase Readiness

Ready for Plan 08-02 (Entity Mapping and Bulk Operations):
- CaptureInbox page ready for checkbox selection integration
- Accept/reject methods available for EntityMappingDialog
- API clients support all required operations
