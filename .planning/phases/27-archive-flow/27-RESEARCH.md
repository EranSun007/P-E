# Phase 27: Archive Flow - Research

**Researched:** 2026-01-29
**Domain:** Archive management UI with modal, date filtering, and restore functionality
**Confidence:** HIGH

## Summary

Phase 27 implements an archive flow for Team Sync items, allowing users to view and restore archived items through a modal interface. The backend infrastructure is already complete from Phase 24-25: database schema has `archived` boolean field on projects table (with `is_sync_item=true` flag), API endpoints exist for getting archived items with date filters, and SyncContext already manages archive state with lazy-loading pattern.

This phase is primarily UI work: adding an archive button with count badge to the header, implementing an archive modal with list view and date filtering, providing restore action per item, and adding auto-archive logic when status changes to "done" (resolving UI-19's mention of "resolved" status as "done" which is the actual status in the codebase).

The standard approach uses existing Radix UI Dialog primitives (already in use throughout the app), date-fns for date range filtering (already installed), and lucide-react for Archive icon (already installed). Pattern follows NotificationContext's lazy-loading and badge count pattern established in prior phases.

**Primary recommendation:** Create ArchiveModal component using Dialog primitives, add Archive button with Badge to TeamSync header, implement date range filter with Input[type="date"], lazy-load archived items on modal open, and add status change watcher in SyncContext to auto-archive when sync_status transitions to "done".

## Standard Stack

All required libraries already installed. No new dependencies needed.

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| @radix-ui/react-dialog | Latest | Modal/dialog primitives | Already used in SyncItemModal and throughout app |
| lucide-react | 0.475.0 | Archive icon with badge | Already used throughout app, has Archive and ArchiveRestore icons |
| date-fns | 3.x | Date formatting and filtering | Already installed, used in TimeOffCard and duty scheduling |
| @/components/ui/badge | Custom | Count badge component | Already exists with variant support (default/secondary/destructive/outline) |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| SyncContext | Custom | State management for sync items | Already manages archivedItems, archivedCount, loadArchivedItems, restoreItem |
| @/components/ui/button | Custom | Button component | Already styled and used throughout |
| @/components/ui/input | Custom | Date input fields | Already styled with Tailwind |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Native date inputs | react-datepicker library | Overkill - native inputs sufficient for simple date range |
| Separate archive page | Modal overlay | Modal keeps user in context, follows existing notification pattern |
| Client-side date filtering | Server-side filtering | Server-side already implemented (more efficient for large datasets) |

**Installation:**
```bash
# No new installations required
# All dependencies already present from previous phases
```

## Architecture Patterns

### Recommended Project Structure
```
src/
├── components/sync/
│   ├── ArchiveModal.jsx          # NEW - archive list modal with date filters
│   ├── ArchivedItemCard.jsx      # NEW - card component for archived item display
│   ├── SyncItemModal.jsx         # Existing - no changes needed
│   ├── KanbanBoard.jsx           # Existing - no changes needed
│   └── TeamDepartmentTabs.jsx    # Existing - no changes needed
├── contexts/
│   └── SyncContext.jsx           # Existing - add auto-archive on status change
└── pages/
    └── TeamSync.jsx              # Existing - add Archive button and ArchiveModal
```

### Pattern 1: Archive Button with Badge Count
**What:** Header button showing archived item count, opens modal on click
**When to use:** User needs to access archived items from main page
**Example:**
```jsx
// In TeamSync.jsx header section
import { Archive } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

const { archivedCount } = useSync();
const [archiveModalOpen, setArchiveModalOpen] = useState(false);

<div className="flex items-center gap-2">
  <Button
    variant="outline"
    onClick={() => setArchiveModalOpen(true)}
    className="relative"
  >
    <Archive className="h-4 w-4 mr-2" />
    Archive
    {archivedCount > 0 && (
      <Badge variant="secondary" className="ml-2">
        {archivedCount}
      </Badge>
    )}
  </Button>

  <TeamDepartmentTabs value={currentTeam} onValueChange={setCurrentTeam} />

  <Button onClick={handleCreateClick}>
    <Plus className="h-4 w-4 mr-1" />
    Add
  </Button>
</div>
```

### Pattern 2: Archive Modal with Date Filtering
**What:** Dialog component displaying archived items with date range filters
**When to use:** User clicks Archive button to view/restore archived items
**Example:**
```jsx
// ArchiveModal.jsx structure
import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useSync } from '@/contexts/SyncContext';
import { format } from 'date-fns';

export function ArchiveModal({ open, onOpenChange }) {
  const { archivedItems, loadArchivedItems, restoreItem } = useSync();
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [loading, setLoading] = useState(false);

  // Lazy-load archived items when modal opens
  useEffect(() => {
    if (open) {
      setLoading(true);
      loadArchivedItems({ from_date: fromDate, to_date: toDate })
        .finally(() => setLoading(false));
    }
  }, [open, fromDate, toDate, loadArchivedItems]);

  const handleRestore = async (itemId) => {
    await restoreItem(itemId);
    // Item removed from archivedItems by SyncContext
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>Archived Items</DialogTitle>
        </DialogHeader>

        {/* Date filters */}
        <div className="flex gap-4 mb-4">
          <div className="flex-1">
            <Label htmlFor="from-date">From Date</Label>
            <Input
              id="from-date"
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
            />
          </div>
          <div className="flex-1">
            <Label htmlFor="to-date">To Date</Label>
            <Input
              id="to-date"
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
            />
          </div>
        </div>

        {/* Scrollable archived items list */}
        <div className="overflow-y-auto space-y-2">
          {loading ? (
            <div className="text-center py-8 text-gray-500">Loading...</div>
          ) : archivedItems.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No archived items found
            </div>
          ) : (
            archivedItems.map(item => (
              <ArchivedItemCard
                key={item.id}
                item={item}
                onRestore={handleRestore}
              />
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
```

### Pattern 3: Archived Item Card with Restore Action
**What:** Card component displaying archived item summary with restore button
**When to use:** Rendering each archived item in the archive modal
**Example:**
```jsx
// ArchivedItemCard.jsx
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArchiveRestore } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { CATEGORIES } from '@/contexts/SyncContext';

export function ArchivedItemCard({ item, onRestore }) {
  const categoryConfig = CATEGORIES.find(c => c.id === item.category);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div className="flex-1">
          <CardTitle className="text-base">{item.name}</CardTitle>
          <CardDescription className="line-clamp-2">
            {item.description || 'No description'}
          </CardDescription>
          <div className="flex items-center gap-2 mt-2">
            {categoryConfig && (
              <Badge variant="outline">{categoryConfig.label}</Badge>
            )}
            {item.team_department && (
              <Badge variant="secondary">{item.team_department}</Badge>
            )}
            <span className="text-xs text-gray-500">
              Archived: {format(parseISO(item.updated_date), 'MMM d, yyyy')}
            </span>
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onRestore(item.id)}
        >
          <ArchiveRestore className="h-4 w-4 mr-2" />
          Restore
        </Button>
      </CardHeader>
    </Card>
  );
}
```

### Pattern 4: Auto-Archive on Status Change
**What:** Automatically archive sync items when status changes to "done"
**When to use:** User marks item as complete in SyncItemModal
**Example:**
```jsx
// In SyncContext.jsx updateItem function
const updateItem = useCallback(async (id, updates) => {
  // Get current item to check status transition
  const currentItem = items.find(item => item.id === id);

  // Check if status is changing to "done" (UI-19: "resolved" maps to "done")
  const shouldAutoArchive =
    updates.sync_status === 'done' &&
    currentItem?.sync_status !== 'done';

  // If auto-archiving, set archived flag
  if (shouldAutoArchive) {
    updates.archived = true;
  }

  // Optimistic update (remove from items if archiving)
  if (shouldAutoArchive) {
    setItems(prev => prev.filter(item => item.id !== id));
    setArchivedCount(prev => prev + 1);
  } else {
    setItems(prev =>
      prev.map(item => item.id === id ? { ...item, ...updates } : item)
    );
  }

  try {
    const updatedItem = await SyncItem.update(id, updates);
    return updatedItem;
  } catch (error) {
    console.error('Failed to update sync item:', error);
    // Refresh on failure to restore correct state
    await refresh();
    throw error;
  }
}, [items, refresh]);
```

### Anti-Patterns to Avoid
- **Loading all archived items upfront:** Lazy-load on modal open to avoid unnecessary data fetching
- **Client-side date filtering:** Backend already supports server-side filtering via query params
- **Separate archive page:** Modal keeps user in context, follows notification panel pattern
- **Manual archive button per item:** Auto-archive on status change (UI-19 requirement)
- **Hardcoding "resolved" status:** Use existing "done" status from SYNC_STATUSES constant

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Date picker UI | Custom calendar widget | Native `<input type="date">` | Browser-native, accessible, already styled via Tailwind |
| Badge positioning | Custom absolute positioning | Badge component with ml-2 utility | Consistent with existing badge usage (NotificationContext) |
| Modal scrolling | Custom overflow handling | DialogContent with max-h-[80vh] + overflow-y-auto | Radix Dialog primitives handle focus trap and accessibility |
| Date formatting | Custom date logic | date-fns format/parseISO | Already installed, handles edge cases (timezones, invalid dates) |
| Loading states | Custom spinners | Existing loading skeleton patterns | Consistent UX across app |

**Key insight:** Phase 27 is primarily UI assembly work. All infrastructure exists—don't rebuild what's already there.

## Common Pitfalls

### Pitfall 1: Status Name Mismatch
**What goes wrong:** UI-19 requirement mentions "resolved" status but codebase uses "done"
**Why it happens:** Requirements written before schema design finalized
**How to avoid:** Map "resolved" conceptually to "done" status in SYNC_STATUSES
**Warning signs:** Tests or code referencing non-existent "resolved" status

### Pitfall 2: Forgetting to Refresh Badge Count
**What goes wrong:** Badge count doesn't update after restore action
**Why it happens:** SyncContext.restoreItem updates archivedItems array but forgets count
**How to avoid:** Update both archivedCount and trigger refresh() in restoreItem
**Warning signs:** Restore works but badge shows stale count until page reload

### Pitfall 3: Date Filter Query Param Format
**What goes wrong:** Backend expects ISO date strings but native input provides YYYY-MM-DD
**Why it happens:** Misunderstanding date format expectations
**How to avoid:** Native date input already provides YYYY-MM-DD, backend accepts this format
**Warning signs:** Date filtering doesn't work, backend logs show invalid date errors

### Pitfall 4: Not Handling Modal State on Restore
**What goes wrong:** Modal shows restored item in archived list momentarily
**Why it happens:** Optimistic update removes from archivedItems but modal still open
**How to avoid:** SyncContext.restoreItem already removes from archivedItems array
**Warning signs:** Item flickers before disappearing from archive list

### Pitfall 5: Archived Count Not Loading on Mount
**What goes wrong:** Badge shows 0 even when archived items exist
**Why it happens:** SyncContext.refresh already fetches count in parallel with items
**How to avoid:** Verify SyncContext.refresh is called on mount (already implemented)
**Warning signs:** Badge never shows count until manual refresh

### Pitfall 6: Auto-Archive Race Condition
**What goes wrong:** Item archives but immediately un-archives
**Why it happens:** Optimistic update conflicts with server response
**How to avoid:** Trust optimistic update, don't override with stale server data
**Warning signs:** Item disappears then reappears in Kanban board

## Code Examples

Verified patterns from existing codebase and official sources:

### Radix Dialog with Scrollable Content
```jsx
// Source: Radix UI Primitives docs + existing SyncItemModal.jsx pattern
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

<Dialog open={open} onOpenChange={onOpenChange}>
  <DialogContent className="max-w-3xl max-h-[80vh]">
    <DialogHeader>
      <DialogTitle>Archived Items</DialogTitle>
    </DialogHeader>

    {/* Scrollable content area */}
    <div className="overflow-y-auto space-y-2 pr-2">
      {/* List items here */}
    </div>
  </DialogContent>
</Dialog>
```

### Date Range Filtering with Native Inputs
```jsx
// Source: Existing project pattern (TimeOffCard.jsx uses date-fns with native dates)
import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const [fromDate, setFromDate] = useState('');
const [toDate, setToDate] = useState('');

<div className="grid grid-cols-2 gap-4">
  <div>
    <Label htmlFor="from-date">From Date</Label>
    <Input
      id="from-date"
      type="date"
      value={fromDate}
      onChange={(e) => setFromDate(e.target.value)}
      className="w-full"
    />
  </div>
  <div>
    <Label htmlFor="to-date">To Date</Label>
    <Input
      id="to-date"
      type="date"
      value={toDate}
      onChange={(e) => setToDate(e.target.value)}
      className="w-full"
    />
  </div>
</div>
```

### Badge with Icon Button
```jsx
// Source: Existing project pattern (NotificationContext uses similar pattern)
import { Archive } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

const { archivedCount } = useSync();

<Button
  variant="outline"
  onClick={() => setArchiveModalOpen(true)}
  className="relative"
>
  <Archive className="h-4 w-4 mr-2" />
  Archive
  {archivedCount > 0 && (
    <Badge variant="secondary" className="ml-2">
      {archivedCount}
    </Badge>
  )}
</Button>
```

### Lazy-Load on Modal Open
```jsx
// Source: SyncContext.jsx existing loadArchivedItems pattern
import { useEffect } from 'react';

useEffect(() => {
  if (open) {
    setLoading(true);
    loadArchivedItems({ from_date: fromDate, to_date: toDate })
      .finally(() => setLoading(false));
  }
}, [open, fromDate, toDate, loadArchivedItems]);
```

### Optimistic Update with Rollback
```jsx
// Source: SyncContext.jsx existing updateItem pattern
const restoreItem = useCallback(async (id) => {
  // Optimistic update
  setArchivedItems(prev => prev.filter(item => item.id !== id));

  try {
    await SyncItem.restore(id);
    // Refresh main items list
    await refresh();
  } catch (error) {
    console.error('Failed to restore sync item:', error);
    throw error;
  }
}, [refresh]);
```

### Date Formatting for Display
```jsx
// Source: date-fns docs + existing project usage (TimeOffCard.jsx)
import { format, parseISO } from 'date-fns';

// Display archived date
const archivedDate = format(parseISO(item.updated_date), 'MMM d, yyyy');
// => "Jan 29, 2026"

// Display with time if needed
const fullTimestamp = format(parseISO(item.updated_date), 'MMM d, yyyy h:mm a');
// => "Jan 29, 2026 3:45 PM"
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Manual archive buttons per item | Auto-archive on status="done" | Phase 27 | Reduces user clicks, aligns with requirement UI-19 |
| Load all archived items upfront | Lazy-load on modal open | Phase 25 (established pattern) | Better performance for users with many archived items |
| Client-side date filtering | Server-side via query params | Phase 24 (backend foundation) | Scalable to large datasets, reduces client memory usage |
| Separate archive page | Modal overlay | Phase 27 | Maintains user context, follows notification panel pattern |

**Deprecated/outdated:**
- N/A - This is new feature development on existing infrastructure

## Open Questions

No critical gaps. All requirements can be implemented with existing infrastructure.

1. **Empty State Message**
   - What we know: Standard empty state pattern exists (EmptyState.jsx component)
   - What's unclear: Specific messaging preference for "no archived items"
   - Recommendation: Use simple text "No archived items found" with optional filter reset button

2. **Restore Confirmation**
   - What we know: Delete actions use AlertDialog for confirmation (TeamMemberDeletionDialog.jsx)
   - What's unclear: Whether restore needs confirmation or should be immediate
   - Recommendation: Immediate restore (single click) - less destructive than delete, can re-archive if needed

3. **Archive Modal Height/Scrolling**
   - What we know: max-h-[80vh] is standard for modal content (existing patterns)
   - What's unclear: Whether to show "X items total" count at top
   - Recommendation: Show count in DialogDescription for context ("Showing 23 archived items")

## Sources

### Primary (HIGH confidence)
- Existing codebase patterns:
  - /Users/i306072/Documents/GitHub/P-E/src/contexts/SyncContext.jsx (lines 34-186)
  - /Users/i306072/Documents/GitHub/P-E/src/contexts/NotificationContext.jsx (badge count pattern)
  - /Users/i306072/Documents/GitHub/P-E/src/components/sync/SyncItemModal.jsx (dialog pattern)
  - /Users/i306072/Documents/GitHub/P-E/server/services/SyncItemService.js (lines 294-390)
  - /Users/i306072/Documents/GitHub/P-E/server/routes/sync.js (lines 39-68)
  - /Users/i306072/Documents/GitHub/P-E/src/components/ui/badge.jsx (badge component)
- Radix UI Primitives documentation - Dialog component patterns (https://www.radix-ui.com/primitives/docs/components/dialog)
- Lucide Icons documentation - Archive icon availability (https://lucide.dev/icons/)
- date-fns documentation - Date formatting and parsing (/date-fns/date-fns Context7 library)

### Secondary (MEDIUM confidence)
- Project CLAUDE.md documentation (architecture patterns)
- Phase 24-25 infrastructure (backend services and context patterns)

### Tertiary (LOW confidence)
- N/A

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - All libraries already installed and in use
- Architecture: HIGH - Existing patterns established in NotificationContext and SyncContext
- Pitfalls: HIGH - Identified from codebase analysis and similar feature patterns

**Research date:** 2026-01-29
**Valid until:** 2026-02-28 (30 days - stable infrastructure, minimal risk of breaking changes)
