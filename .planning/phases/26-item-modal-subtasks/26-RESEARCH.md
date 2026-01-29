# Phase 26: Item Modal & Subtasks - Research

**Researched:** 2026-01-29
**Domain:** React modal forms, shadcn/ui Dialog, drag-and-drop sortable lists
**Confidence:** HIGH

## Summary

This phase implements a detail/edit modal for sync items on the TeamSync Kanban board, with all form fields (category, team, status, assignee, sprint) and a subtask management section (list display, completion toggle, add input, drag-and-drop reorder). The codebase has strong foundations: shadcn/ui Dialog is already used extensively (GoalFormDialog, WorkItemForm), all required UI primitives exist (Select, Checkbox, Accordion, Input), and the SyncContext provides CRUD operations with optimistic updates. The SyncItem API already includes subtask methods (listSubtasks, createSubtask, updateSubtask, deleteSubtask, reorderSubtasks).

The primary gap is drag-and-drop functionality for subtask reordering. The project has framer-motion installed but no dedicated drag-and-drop library. For vertical list reordering, **@dnd-kit/sortable** is the recommended standard - it's lightweight, accessible, and integrates well with React. The existing useDialogForm hook in useForm.js provides patterns for modal state management with open/close, editing, and delete confirmation flows.

**Primary recommendation:** Create a SyncItemModal component using Dialog primitives, implement subtask list using @dnd-kit/sortable for drag-and-drop reordering, and follow the existing GoalFormDialog pattern for form state management with view/edit modes.

## Standard Stack

The established libraries/tools for this domain:

### Core (Already Installed)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| @radix-ui/react-dialog | ^1.1.6 | Accessible modal dialog | Already in use via shadcn/ui dialog.jsx |
| @radix-ui/react-select | ^2.1.6 | Accessible dropdown selects | Already in use via shadcn/ui select.jsx |
| @radix-ui/react-checkbox | ^1.1.4 | Accessible checkboxes | Already in use via shadcn/ui checkbox.jsx |
| @radix-ui/react-accordion | ^1.2.3 | Collapsible sections | Already in use via shadcn/ui accordion.jsx |
| @radix-ui/react-alert-dialog | ^1.1.6 | Confirmation dialogs | Already in use for unsaved changes prompts |
| lucide-react | ^0.475.0 | Icons (GripVertical, Plus, Trash2, X) | Already used throughout codebase |

### Supporting (To Install)
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| @dnd-kit/core | ^6.x | Drag-and-drop foundation | Required for sortable functionality |
| @dnd-kit/sortable | ^8.x | Sortable list preset | Subtask reordering |
| @dnd-kit/utilities | ^3.x | CSS transform utilities | Smooth drag animations |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| @dnd-kit/sortable | framer-motion Reorder | framer-motion already installed, but dnd-kit has better accessibility and keyboard support for lists |
| @dnd-kit/sortable | react-beautiful-dnd | Discontinued by Atlassian in 2024, no longer recommended |
| @dnd-kit/sortable | HTML5 drag API | Poor accessibility, inconsistent browser behavior |

**Installation:**
```bash
npm install @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities
```

## Architecture Patterns

### Recommended Project Structure
```
src/components/sync/
├── SyncItemModal.jsx           # NEW: Main modal component with view/edit modes
├── SyncItemForm.jsx            # NEW: Form fields for sync item (extracted for reuse)
├── SubtaskSection.jsx          # NEW: Accordion wrapper for subtask management
├── SubtaskList.jsx             # NEW: Sortable list with checkboxes
├── SubtaskItem.jsx             # NEW: Individual draggable subtask row
├── SyncItemCard.jsx            # EXISTING: Kanban card (add onClick handler)
├── KanbanBoard.jsx             # EXISTING: Board layout
└── TeamDepartmentTabs.jsx      # EXISTING: Team filter tabs
```

### Pattern 1: Modal with View/Edit Modes
**What:** Open in view mode first, switch to edit mode via button click
**When to use:** When accidental edits are a concern
**Example:**
```jsx
// Source: Derived from existing GoalFormDialog.jsx pattern
function SyncItemModal({ open, onOpenChange, item, onSave, onDelete }) {
  const [mode, setMode] = useState('view'); // 'view' | 'edit'
  const [formData, setFormData] = useState({});
  const [hasChanges, setHasChanges] = useState(false);

  // Reset to view mode when opening with existing item
  useEffect(() => {
    if (open && item) {
      setMode('view');
      setFormData({ ...item });
      setHasChanges(false);
    } else if (open && !item) {
      // New item - start in edit mode
      setMode('edit');
      setFormData(getDefaultFormData());
      setHasChanges(false);
    }
  }, [open, item]);

  const handleClose = () => {
    if (hasChanges) {
      // Show confirmation dialog
      setShowUnsavedDialog(true);
    } else {
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[600px]">
        {mode === 'view' ? (
          <ViewModeContent item={formData} onEdit={() => setMode('edit')} />
        ) : (
          <EditModeContent
            formData={formData}
            onChange={(field, value) => {
              setFormData(prev => ({ ...prev, [field]: value }));
              setHasChanges(true);
            }}
            onSave={handleSave}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
```

### Pattern 2: Sortable Subtask List with dnd-kit
**What:** Drag-and-drop reorderable list with visible grip handles
**When to use:** User-controllable ordering of items
**Example:**
```jsx
// Source: dnd-kit official documentation
import { DndContext, closestCenter, PointerSensor, KeyboardSensor, useSensor, useSensors } from '@dnd-kit/core';
import { SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy, arrayMove } from '@dnd-kit/sortable';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

function SubtaskList({ subtasks, onReorder, onToggle, onDelete }) {
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = async (event) => {
    const { active, over } = event;
    if (active.id !== over?.id) {
      const oldIndex = subtasks.findIndex(s => s.id === active.id);
      const newIndex = subtasks.findIndex(s => s.id === over.id);
      const newOrder = arrayMove(subtasks, oldIndex, newIndex);
      await onReorder(newOrder.map(s => s.id));
    }
  };

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={subtasks.map(s => s.id)} strategy={verticalListSortingStrategy}>
        {subtasks.map(subtask => (
          <SubtaskItem
            key={subtask.id}
            subtask={subtask}
            onToggle={onToggle}
            onDelete={onDelete}
          />
        ))}
      </SortableContext>
    </DndContext>
  );
}

function SubtaskItem({ subtask, onToggle, onDelete }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: subtask.id
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} className="flex items-center gap-2 p-2 bg-white border rounded">
      <button {...attributes} {...listeners} className="cursor-grab touch-none">
        <GripVertical className="h-4 w-4 text-gray-400" />
      </button>
      <Checkbox
        checked={subtask.completed}
        onCheckedChange={() => onToggle(subtask.id)}
      />
      <span className="flex-1">{subtask.title}</span>
      <Button variant="ghost" size="icon" onClick={() => onDelete(subtask.id)}>
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  );
}
```

### Pattern 3: Inline Add Input (Always Visible)
**What:** Input field at bottom of list that adds on Enter
**When to use:** Frequent item addition without dialog friction
**Example:**
```jsx
// Source: Common React pattern
function SubtaskAddInput({ onAdd }) {
  const [value, setValue] = useState('');

  const handleKeyDown = async (e) => {
    if (e.key === 'Enter' && value.trim()) {
      await onAdd(value.trim());
      setValue('');
    }
  };

  return (
    <div className="flex items-center gap-2 p-2 border-t">
      <Plus className="h-4 w-4 text-gray-400" />
      <Input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Add subtask..."
        className="border-0 shadow-none focus-visible:ring-0"
      />
    </div>
  );
}
```

### Pattern 4: Unsaved Changes Confirmation
**What:** AlertDialog prompting user when closing with unsaved changes
**When to use:** Forms where data loss is costly
**Example:**
```jsx
// Source: @radix-ui/react-alert-dialog via shadcn/ui
function UnsavedChangesDialog({ open, onDiscard, onCancel }) {
  return (
    <AlertDialog open={open}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>You have unsaved changes</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to discard your changes?
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={onCancel}>Keep Editing</AlertDialogCancel>
          <AlertDialogAction onClick={onDiscard}>Discard</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
```

### Anti-Patterns to Avoid
- **Inline edit in Kanban cards:** Cards should be click-to-view, not inline editable (clutters UI, error-prone)
- **Separate create/edit modals:** Use single modal with mode state (less code duplication)
- **Fetching dropdown options on every render:** Team members and sprints should be loaded once and cached in context
- **Direct API calls in modal component:** Use SyncContext methods (createItem, updateItem) for consistent state management
- **Custom drag implementation:** Use @dnd-kit/sortable, don't hand-roll with mouse events

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Drag-and-drop reordering | Mouse event handlers + state | @dnd-kit/sortable | Accessibility, keyboard support, touch support, edge cases |
| Modal dialog | Custom div with overlay | Dialog from shadcn/ui | Focus trap, escape key, screen reader announcements |
| Confirmation prompts | window.confirm() | AlertDialog from shadcn/ui | Consistent styling, accessible |
| Form validation | Manual checks | Inline error display pattern from GoalFormDialog | UX consistency |
| Sprint list generation | Manual date math | releaseCycles.js getCurrentCycle, listSprints | Already implemented, handles edge cases |

**Key insight:** The codebase has established patterns for all UI concerns. The only new addition needed is @dnd-kit for drag-and-drop, which is the standard React solution for accessible sortable lists.

## Common Pitfalls

### Pitfall 1: Losing Subtask Order on Re-render
**What goes wrong:** Subtasks appear in wrong order after state update
**Why it happens:** Not preserving sort_order when updating local state
**How to avoid:** Always maintain sort_order in subtask objects, use arrayMove from dnd-kit
**Warning signs:** Subtasks jump around unexpectedly after drag-drop

### Pitfall 2: Modal Not Closing on Save
**What goes wrong:** Save completes but modal stays open
**Why it happens:** onOpenChange(false) called before async operation completes
**How to avoid:** Call onOpenChange(false) in finally block after await
**Warning signs:** User has to manually close after save

### Pitfall 3: Stale Form Data When Switching Items
**What goes wrong:** Previous item's data shows when opening different item
**Why it happens:** useEffect dependency array missing item.id
**How to avoid:** Reset form state in useEffect keyed on [open, item?.id]
**Warning signs:** Wrong data displayed when clicking different cards quickly

### Pitfall 4: Dropdown Options Not Loading
**What goes wrong:** Team member or sprint dropdown shows empty
**Why it happens:** Forgot to access AppContext for teamMembers, or releaseCycles not imported
**How to avoid:** Get teamMembers from AppContext, generate sprints via listSprints()
**Warning signs:** "No options available" in dropdown

### Pitfall 5: Drag Handle Not Working on Mobile
**What goes wrong:** Subtasks can't be dragged on touch devices
**Why it happens:** Missing touch-action: none CSS on grip handle
**How to avoid:** Add `className="touch-none"` to drag handle element
**Warning signs:** Dragging works on desktop but not mobile

### Pitfall 6: Form Submission During Loading
**What goes wrong:** Double submissions, race conditions
**Why it happens:** Save button not disabled during async operation
**How to avoid:** Track isSubmitting state, disable button and show spinner
**Warning signs:** Duplicate items created, error toasts

## Code Examples

Verified patterns from the codebase:

### Dialog Pattern (from GoalFormDialog.jsx)
```jsx
// Source: src/components/team/GoalFormDialog.jsx
<Dialog open={open} onOpenChange={onOpenChange}>
  <DialogContent className="sm:max-w-lg">
    <DialogHeader>
      <DialogTitle>{isEditing ? 'Edit' : 'Create'} Item</DialogTitle>
    </DialogHeader>

    <form onSubmit={handleSubmit} className="space-y-4 py-4">
      {/* Form fields */}
    </form>

    <DialogFooter>
      <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
        Cancel
      </Button>
      <Button onClick={handleSubmit} disabled={isLoading}>
        {isLoading ? 'Saving...' : 'Save'}
      </Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
```

### Select Pattern (from WorkItemForm.jsx)
```jsx
// Source: src/components/team/WorkItemForm.jsx lines 168-187
<div className="space-y-2">
  <Label htmlFor="project">Project</Label>
  <Select
    value={formData.project_id}
    onValueChange={(value) => handleInputChange('project_id', value)}
    disabled={isLoading}
  >
    <SelectTrigger>
      <SelectValue placeholder="Select a project" />
    </SelectTrigger>
    <SelectContent>
      <SelectItem value="none">No project</SelectItem>
      {projects.map((project) => (
        <SelectItem key={project.id} value={project.id}>
          {project.name}
        </SelectItem>
      ))}
    </SelectContent>
  </Select>
</div>
```

### Inline Validation Error Pattern
```jsx
// Source: src/components/team/GoalFormDialog.jsx lines 116-128
<div className="space-y-2">
  <Label htmlFor="title">Title *</Label>
  <Input
    id="title"
    value={formData.title}
    onChange={(e) => handleInputChange('title', e.target.value)}
    disabled={isLoading}
    className={errors.title ? 'border-destructive' : ''}
  />
  {errors.title && (
    <p className="text-sm text-destructive">{errors.title}</p>
  )}
</div>
```

### SyncContext Usage Pattern
```jsx
// Source: src/contexts/SyncContext.jsx
const { createItem, updateItem, items, currentTeam } = useSync();

// Create new item
const newItem = await createItem({
  name: formData.name,
  category: formData.category,
  team_department: formData.team_department,
  sync_status: formData.sync_status,
  assigned_to: formData.assigned_to,
  sprint_id: formData.sprint_id,
});

// Update existing item (optimistic)
await updateItem(item.id, { name: formData.name, sync_status: formData.sync_status });
```

### Subtask API Methods (from apiClient.js)
```jsx
// Source: src/api/apiClient.js lines 371-401
const SyncItem = apiClient.entities.SyncItem;

// List subtasks for an item
const subtasks = await SyncItem.listSubtasks(itemId);

// Create subtask
const newSubtask = await SyncItem.createSubtask(itemId, { title: 'New subtask' });

// Toggle completion
await SyncItem.updateSubtask(itemId, subtaskId, { completed: !subtask.completed });

// Delete subtask
await SyncItem.deleteSubtask(itemId, subtaskId);

// Reorder subtasks (send ordered array of IDs)
await SyncItem.reorderSubtasks(itemId, ['id1', 'id2', 'id3']);
```

### Sprint Generation Pattern (from releaseCycles.js)
```jsx
// Source: src/utils/releaseCycles.js
import { getCurrentCycle, listSprints, formatSprintLabel } from '@/utils/releaseCycles';

// Get current and future sprints (e.g., 6 sprints = 3 cycles worth)
const currentCycle = getCurrentCycle();
const sprints = listSprints(currentCycle.id, 3); // Returns 6 sprint objects

// Format for dropdown display
sprints.map(sprint => ({
  id: sprint.id,           // e.g., "2601a"
  label: formatSprintLabel(sprint.id, true), // e.g., "Sprint 2601a (Jan 11-24)"
}));
```

### Team Members from AppContext
```jsx
// Source: src/contexts/AppContext.jsx
import { useContext } from 'react';
import { AppContext } from '@/contexts/AppContext';

const { teamMembers } = useContext(AppContext);

// Team members have { id, name, ... }
// Map to dropdown options
teamMembers.map(member => ({
  id: member.id,
  label: member.name,
}));
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| react-beautiful-dnd | @dnd-kit | 2024 (rbd discontinued) | dnd-kit is now the standard |
| Separate create/edit dialogs | Single modal with mode | 2023 | Less code duplication |
| window.confirm() | AlertDialog component | shadcn/ui adoption | Better UX, consistent styling |
| Manual form state | useState + useEffect | React 18 | Simple, sufficient for this use case |

**Deprecated/outdated:**
- **react-beautiful-dnd:** Discontinued by Atlassian Feb 2024, do not use
- **react-dnd (HTML5 backend):** Works but dnd-kit has better DX and accessibility
- **Native HTML5 drag-and-drop:** Inconsistent, inaccessible, don't use for sortable lists

## Open Questions

Things that couldn't be fully resolved:

1. **Subtask data structure**
   - What we know: API has listSubtasks, createSubtask, updateSubtask, deleteSubtask, reorderSubtasks
   - What's unclear: Exact field names returned by API (title vs name, completed vs is_complete)
   - Recommendation: Check backend SyncService or test API response to confirm field names

2. **Sprint dropdown default behavior**
   - What we know: Per CONTEXT.md, sprint dropdown shows "current + future sprints only"
   - What's unclear: How to determine "current" sprint if item has no sprint set
   - Recommendation: Use getCurrentCycle().currentSprint.id as default selection

3. **Subtask limit**
   - What we know: Subtasks are user-managed, no explicit limit mentioned
   - What's unclear: Should there be a max subtask count?
   - Recommendation: No limit initially, can add if performance issues arise

## Sources

### Primary (HIGH confidence)
- `src/components/ui/dialog.jsx` - Dialog primitives used for modals
- `src/components/ui/select.jsx` - Select dropdown pattern
- `src/components/ui/checkbox.jsx` - Checkbox for subtask completion
- `src/components/ui/accordion.jsx` - Accordion for subtask section
- `src/components/ui/alert-dialog.jsx` - Confirmation dialog pattern
- `src/components/team/GoalFormDialog.jsx` - Modal form pattern reference
- `src/components/team/WorkItemForm.jsx` - Form with Select and project dropdown
- `src/contexts/SyncContext.jsx` - Sync CRUD operations and constants
- `src/api/apiClient.js` - SyncItem API including subtask methods (lines 332-402)
- `src/utils/releaseCycles.js` - Sprint generation utilities
- `src/hooks/useForm.js` - useDialogForm hook for modal state management

### Secondary (MEDIUM confidence)
- dnd-kit official documentation (https://docs.dndkit.com/presets/sortable) - WebFetched sortable list patterns

### Tertiary (LOW confidence)
- None - all patterns verified from codebase or official documentation

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - All UI components exist in codebase, only @dnd-kit needs installation
- Architecture: HIGH - Patterns verified from existing dialogs (GoalFormDialog, WorkItemForm)
- Pitfalls: HIGH - Based on actual codebase patterns and React modal experience
- dnd-kit integration: MEDIUM - Based on official docs, not yet tested in codebase

**Research date:** 2026-01-29
**Valid until:** 60 days (stable technologies, shadcn/ui and dnd-kit are mature)
