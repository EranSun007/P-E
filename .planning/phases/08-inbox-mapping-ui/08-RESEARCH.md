# Phase 8: Inbox and Mapping UI - Research

**Researched:** 2026-01-22
**Domain:** React frontend for inbox review workflows and entity mapping
**Confidence:** HIGH

## Summary

This phase implements the user-facing inbox UI for reviewing captured data and mapping it to P&E Manager entities. The research reveals that the existing codebase has strong patterns for list views, filtering, dialogs, and entity mapping (specifically in JiraIssues.jsx and AssigneeMappingDialog.jsx) that should be followed directly.

The primary challenge is implementing bulk selection and actions, which requires careful state management for checkbox selection across filtered/paginated data. The existing shadcn/ui Table component with Checkbox support provides the foundation, and the JiraIssues.jsx page demonstrates the exact patterns for filtering, loading states, and table rendering.

**Primary recommendation:** Build the Capture Inbox as a new page following JiraIssues.jsx patterns, with a dedicated InboxItem table supporting checkbox selection for bulk operations, and reuse the AssigneeMappingDialog pattern for entity mapping dialogs.

## Standard Stack

The established libraries/tools for this domain:

### Core (Already in Codebase)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| React | 18.x | UI framework | Already in use |
| @radix-ui/react-checkbox | latest | Accessible checkbox primitives | Part of shadcn/ui stack |
| @radix-ui/react-dialog | latest | Modal dialogs for mapping | Part of shadcn/ui stack |
| @radix-ui/react-select | latest | Entity type selection | Part of shadcn/ui stack |
| cmdk | latest | Command palette for search/suggestions | Already available in components/ui/command.jsx |
| lucide-react | latest | Icons | Already in use |
| tailwindcss | 3.x | Styling | Already in use |

### Supporting (Already Available)
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| date-fns | latest | Date formatting for timestamps | Capture timestamps display |
| framer-motion | latest | Animations | Optional: selection/action animations |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Manual checkbox state | react-table with selection | react-table adds complexity not needed for simple list |
| Custom combobox | cmdk Command component | cmdk already in codebase, use it for entity search |

**Installation:**
```bash
# No new packages needed - all required components already exist
```

## Architecture Patterns

### Recommended Project Structure
```
src/
├── pages/
│   └── CaptureInbox.jsx           # Main inbox page
├── components/
│   └── capture/
│       ├── InboxTable.jsx          # Table with selection support
│       ├── InboxItemRow.jsx        # Single row with checkbox
│       ├── InboxItemDetail.jsx     # Preview panel/dialog
│       ├── InboxFilterBar.jsx      # Filtering controls
│       ├── InboxBulkActions.jsx    # Bulk action toolbar
│       ├── EntityMappingDialog.jsx # Map to entity dialog
│       └── EntityMappingForm.jsx   # Mapping form with auto-suggest
├── api/
│   └── apiClient.js                # Add capture endpoints (extend existing)
│   └── entities.js                 # Export CaptureInbox entity
```

### Pattern 1: Page with Table and Bulk Selection
**What:** List view with checkbox selection following JiraIssues.jsx pattern
**When to use:** Main inbox page displaying captured items
**Example:**
```jsx
// Source: Based on existing JiraIssues.jsx pattern
import { useState, useMemo } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export default function CaptureInboxPage() {
  const [items, setItems] = useState([]);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [filters, setFilters] = useState({ status: "pending", search: "" });

  // Filtered items (client-side filtering)
  const filteredItems = useMemo(() => {
    return items.filter(item => {
      if (filters.status && item.status !== filters.status) return false;
      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        if (!item.source_identifier?.toLowerCase().includes(searchLower)) return false;
      }
      return true;
    });
  }, [items, filters]);

  // Select all (only filtered items)
  const handleSelectAll = (checked) => {
    if (checked) {
      setSelectedIds(new Set(filteredItems.map(i => i.id)));
    } else {
      setSelectedIds(new Set());
    }
  };

  // Toggle single item
  const handleSelectItem = (id, checked) => {
    const newSet = new Set(selectedIds);
    if (checked) {
      newSet.add(id);
    } else {
      newSet.delete(id);
    }
    setSelectedIds(newSet);
  };

  const allSelected = filteredItems.length > 0 &&
    filteredItems.every(i => selectedIds.has(i.id));
  const someSelected = selectedIds.size > 0 && !allSelected;

  return (
    <div className="p-6">
      {/* Bulk actions bar appears when items selected */}
      {selectedIds.size > 0 && (
        <InboxBulkActions
          selectedCount={selectedIds.size}
          onBulkAccept={handleBulkAccept}
          onBulkReject={handleBulkReject}
          onClearSelection={() => setSelectedIds(new Set())}
        />
      )}

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-12">
              <Checkbox
                checked={allSelected}
                indeterminate={someSelected}
                onCheckedChange={handleSelectAll}
              />
            </TableHead>
            <TableHead>Source</TableHead>
            <TableHead>Rule</TableHead>
            <TableHead>Captured</TableHead>
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filteredItems.map(item => (
            <TableRow key={item.id}>
              <TableCell>
                <Checkbox
                  checked={selectedIds.has(item.id)}
                  onCheckedChange={(checked) => handleSelectItem(item.id, checked)}
                />
              </TableCell>
              {/* ... other cells */}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
```

### Pattern 2: Entity Mapping Dialog with Auto-Suggest
**What:** Dialog for mapping captured item to P&E entity with search/selection
**When to use:** When user accepts an inbox item and needs to select target entity
**Example:**
```jsx
// Source: Based on existing AssigneeMappingDialog.jsx pattern
import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Command, CommandInput, CommandList, CommandItem, CommandEmpty } from "@/components/ui/command";

export function EntityMappingDialog({
  open,
  onOpenChange,
  inboxItem,
  onAccept
}) {
  const [entityType, setEntityType] = useState("project");
  const [selectedEntity, setSelectedEntity] = useState(null);
  const [createMapping, setCreateMapping] = useState(true);
  const [entities, setEntities] = useState([]);
  const [suggestedEntity, setSuggestedEntity] = useState(null);

  // Load entities based on selected type
  useEffect(() => {
    if (open && entityType) {
      loadEntities(entityType);
    }
  }, [open, entityType]);

  // Auto-suggest based on name similarity
  useEffect(() => {
    if (inboxItem?.captured_name && entities.length > 0) {
      const suggested = findBestMatch(inboxItem.captured_name, entities);
      setSuggestedEntity(suggested);
    }
  }, [inboxItem, entities]);

  const handleAccept = async () => {
    await onAccept({
      inboxItemId: inboxItem.id,
      entityType,
      entityId: selectedEntity?.id,
      createMapping
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Map to Entity</DialogTitle>
        </DialogHeader>

        {/* Entity type selector */}
        <Select value={entityType} onValueChange={setEntityType}>
          <SelectTrigger>
            <SelectValue placeholder="Select entity type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="project">Project</SelectItem>
            <SelectItem value="team_member">Team Member</SelectItem>
            <SelectItem value="service">Service</SelectItem>
          </SelectContent>
        </Select>

        {/* Entity search with suggestions */}
        <Command>
          <CommandInput placeholder="Search entities..." />
          <CommandList>
            <CommandEmpty>No entities found</CommandEmpty>
            {suggestedEntity && (
              <CommandItem
                className="bg-blue-50 border-blue-200"
                onSelect={() => setSelectedEntity(suggestedEntity)}
              >
                <span className="text-blue-600 text-xs mr-2">Suggested:</span>
                {suggestedEntity.name}
              </CommandItem>
            )}
            {entities.map(entity => (
              <CommandItem
                key={entity.id}
                onSelect={() => setSelectedEntity(entity)}
              >
                {entity.name}
              </CommandItem>
            ))}
          </CommandList>
        </Command>

        {/* Create mapping checkbox */}
        <div className="flex items-center gap-2">
          <Checkbox
            checked={createMapping}
            onCheckedChange={setCreateMapping}
          />
          <label>Remember this mapping for future captures</label>
        </div>
      </DialogContent>
    </Dialog>
  );
}
```

### Pattern 3: API Client Extension
**What:** Add capture inbox endpoints to existing apiClient.js
**When to use:** Following the established pattern in apiClient.js
**Example:**
```jsx
// Source: Based on existing apiClient.js patterns
function createCaptureInboxClient() {
  const baseClient = createEntityClient('/capture-inbox');

  return {
    ...baseClient,

    // Accept with entity mapping
    async accept(id, data) {
      return fetchWithAuth(`${API_BASE_URL}/capture-inbox/${id}/accept`, {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },

    // Reject item
    async reject(id, data) {
      return fetchWithAuth(`${API_BASE_URL}/capture-inbox/${id}/reject`, {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },

    // Bulk accept
    async bulkAccept(ids, options = {}) {
      return fetchWithAuth(`${API_BASE_URL}/capture-inbox/bulk-accept`, {
        method: 'POST',
        body: JSON.stringify({ ids, ...options }),
      });
    },

    // Bulk reject
    async bulkReject(ids, reason = null) {
      return fetchWithAuth(`${API_BASE_URL}/capture-inbox/bulk-reject`, {
        method: 'POST',
        body: JSON.stringify({ ids, reason }),
      });
    },
  };
}

function createEntityMappingClient() {
  const baseClient = createEntityClient('/entity-mappings');

  return {
    ...baseClient,

    // Lookup mapping by source
    async lookup(sourceType, sourceId) {
      return fetchWithAuth(
        `${API_BASE_URL}/entity-mappings/lookup/${sourceType}/${encodeURIComponent(sourceId)}`
      );
    },
  };
}
```

### Anti-Patterns to Avoid
- **Don't manage selection state in the component rendering each row:** Keep selection state at the parent level to enable bulk operations.
- **Don't reload full list after each action:** Use optimistic updates and local state manipulation, then refresh.
- **Don't put entity mapping logic in the page component:** Extract to a reusable dialog component following AssigneeMappingDialog.jsx pattern.
- **Don't fetch all entities upfront:** Load entities lazily when user opens mapping dialog and selects entity type.

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Checkbox component | Custom checkbox | @radix-ui/react-checkbox (via shadcn) | Accessibility, indeterminate state |
| Combobox/autocomplete | Custom dropdown with search | cmdk Command component | Already in codebase, keyboard navigation |
| Modal dialogs | Custom modal | @radix-ui/react-dialog (via shadcn) | Focus management, a11y |
| Select dropdown | Custom select | @radix-ui/react-select (via shadcn) | Already in codebase |
| Table with selection | Build from scratch | shadcn Table + Checkbox | Pattern exists in JiraIssues.jsx |

**Key insight:** The existing codebase has all the UI primitives needed. The implementation is primarily composition and state management, not new component development.

## Common Pitfalls

### Pitfall 1: Selection State Desync with Filters
**What goes wrong:** User selects items, then changes filter. Selected items may no longer be visible but remain in selection state.
**Why it happens:** Selection state isn't aware of filter changes.
**How to avoid:** Either (a) clear selection when filters change, or (b) show warning "N selected items are hidden by current filter"
**Warning signs:** Users accidentally bulk-reject items they can't see.

### Pitfall 2: Bulk Actions Without Confirmation
**What goes wrong:** User accidentally clicks bulk reject, loses all pending items.
**Why it happens:** No confirmation for destructive bulk actions.
**How to avoid:** Add AlertDialog confirmation for bulk reject (bulk accept is non-destructive).
**Warning signs:** User complaints about accidental data loss.

### Pitfall 3: Optimistic Updates Gone Wrong
**What goes wrong:** UI shows item as accepted, but API call fails. Item still appears as accepted.
**Why it happens:** Optimistic update without proper rollback.
**How to avoid:** Either (a) don't use optimistic updates for accept/reject, or (b) implement proper rollback on error.
**Warning signs:** UI state doesn't match database state.

### Pitfall 4: Auto-Suggest Matching Too Strict
**What goes wrong:** Auto-suggest doesn't find obvious matches due to minor differences (case, whitespace, prefixes).
**Why it happens:** Using exact string matching instead of fuzzy matching.
**How to avoid:** Use case-insensitive comparison, normalize whitespace, consider prefix/suffix variations.
**Warning signs:** Users manually searching for entities that should have been suggested.

### Pitfall 5: Loading States in Bulk Operations
**What goes wrong:** User doesn't know bulk operation is in progress, clicks again.
**Why it happens:** No loading indicator for bulk actions.
**How to avoid:** Disable bulk action buttons during operation, show progress indicator.
**Warning signs:** Duplicate API calls, confusing state.

## Code Examples

Verified patterns from the existing codebase:

### Loading State Pattern
```jsx
// Source: JiraIssues.jsx lines 277-281
{loading ? (
  <div className="flex items-center justify-center py-12">
    <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
    <span className="ml-2 text-gray-500">Loading Jira issues...</span>
  </div>
) : (
  // Content here
)}
```

### Filter Bar Pattern
```jsx
// Source: JiraIssues.jsx lines 325-426
<Card>
  <CardContent className="py-4">
    <div className="flex flex-wrap items-center gap-3">
      {/* Search input */}
      <div className="relative flex-1 min-w-[200px] max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <Input
          placeholder="Search..."
          value={filters.search}
          onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
          className="pl-9"
        />
      </div>

      {/* Dropdown filter with badge count */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" className="gap-2">
            <Filter className="h-4 w-4" />
            Status
            {filters.status.length > 0 && (
              <Badge variant="secondary" className="ml-1">
                {filters.status.length}
              </Badge>
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          {/* CheckboxItems */}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Clear filters button */}
      {hasActiveFilters && (
        <Button variant="ghost" size="sm" onClick={clearFilters}>
          <X className="h-4 w-4 mr-1" />
          Clear filters
        </Button>
      )}
    </div>
  </CardContent>
</Card>
```

### Entity Mapping Dialog Pattern
```jsx
// Source: AssigneeMappingDialog.jsx lines 117-196
<Dialog open={open} onOpenChange={handleClose}>
  <DialogContent className="sm:max-w-lg">
    <DialogHeader>
      <DialogTitle className="flex items-center gap-2">
        <Link2 className="h-5 w-5" />
        Title Here
      </DialogTitle>
      <DialogDescription>
        Description text here.
      </DialogDescription>
    </DialogHeader>

    {error && (
      <Alert variant="destructive">
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    )}

    {loading ? (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
      </div>
    ) : (
      <div className="space-y-4 py-4 max-h-96 overflow-y-auto">
        {/* Content */}
      </div>
    )}

    <DialogFooter>
      <Button onClick={handleClose} disabled={saving}>
        {saving ? (
          <>
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            Saving...
          </>
        ) : (
          'Done'
        )}
      </Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
```

### Empty State Pattern
```jsx
// Source: EmptyState.jsx
import { EmptyState } from '@/components/ui/EmptyState';
import { Inbox } from 'lucide-react';

<EmptyState
  icon={Inbox}
  title="Capture Inbox is Empty"
  description="No items are waiting for review. Captured data will appear here."
  size="md"
/>
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| localStorage selection | React state with Set | N/A | Cleaner, no persistence needed |
| Alert for confirmations | AlertDialog component | Available | Better UX for destructive actions |
| Manual loading spinners | Loader2 from lucide | In use | Consistent loading indicators |

**Deprecated/outdated:**
- None identified - all patterns align with current codebase practices

## Open Questions

Things that couldn't be fully resolved:

1. **Bulk Accept Entity Mapping Strategy**
   - What we know: Phase 6 API supports bulk accept with default entity type
   - What's unclear: Should bulk accept allow per-item entity type selection, or use a single type for all?
   - Recommendation: Start with single entity type for bulk accept (simplest UX), allow individual accept for per-item control

2. **Auto-Suggest Algorithm**
   - What we know: Need to match captured names to existing entities
   - What's unclear: What similarity algorithm to use (Levenshtein, contains, starts-with)?
   - Recommendation: Start with case-insensitive contains matching, refine based on user feedback

3. **Pagination vs Infinite Scroll**
   - What we know: Inbox could have many items
   - What's unclear: Expected volume of inbox items
   - Recommendation: Start without pagination (match JiraIssues pattern), add if performance issues arise

## Sources

### Primary (HIGH confidence)
- `/Users/i306072/Documents/GitHub/P-E/src/pages/JiraIssues.jsx` - Primary pattern for list view with filtering
- `/Users/i306072/Documents/GitHub/P-E/src/components/jira/AssigneeMappingDialog.jsx` - Primary pattern for entity mapping
- `/Users/i306072/Documents/GitHub/P-E/src/api/apiClient.js` - API client patterns
- `/Users/i306072/Documents/GitHub/P-E/src/api/entities.js` - Entity export patterns
- `/Users/i306072/Documents/GitHub/P-E/src/components/ui/` - All shadcn components available

### Secondary (MEDIUM confidence)
- `/Users/i306072/Documents/GitHub/P-E/src/pages/Tasks.jsx` - Additional list/filter patterns
- `/Users/i306072/Documents/GitHub/P-E/src/contexts/AppContext.jsx` - Context patterns (if needed)

### Tertiary (LOW confidence)
- General React patterns for bulk selection - based on training data, verify implementation works

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - All components already exist in codebase
- Architecture: HIGH - Following existing JiraIssues.jsx and AssigneeMappingDialog.jsx patterns exactly
- Pitfalls: MEDIUM - Based on general React patterns, specific to this codebase context

**Research date:** 2026-01-22
**Valid until:** 2026-02-22 (30 days - stable patterns, minimal external dependencies)
