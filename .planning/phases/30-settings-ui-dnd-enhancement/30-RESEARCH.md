# Phase 30: Settings UI DnD Enhancement - Research

**Researched:** 2026-01-29
**Domain:** React drag-and-drop with @dnd-kit library
**Confidence:** HIGH

## Summary

Phase 30 adds drag-and-drop functionality to the NavigationSettings component to enable reordering folders and menu items. The codebase already has @dnd-kit/core (v6.3.1), @dnd-kit/sortable (v10.0.0), and @dnd-kit/utilities (v3.2.2) installed.

The research confirms that @dnd-kit is the industry standard for accessible React drag-and-drop interfaces. This phase requires implementing **three distinct drag-and-drop contexts**:

1. **Folder reordering** - Simple single-list vertical sorting
2. **Item reordering within folders** - Multiple sortable contexts (one per folder)
3. **Cross-container dragging** - Items moving between folders and root level

The key technical challenge is handling cross-container drag operations with proper state management via the `onDragOver` callback to provide real-time visual feedback as items move between containers.

**Primary recommendation:** Use @dnd-kit/sortable for folder reordering and within-folder item reordering. Use @dnd-kit/core's DndContext with custom onDragOver logic for cross-container item dragging between folders and root level.

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| @dnd-kit/core | 6.3.1 | Core drag-and-drop primitives | Industry standard for accessible React DnD, modular architecture |
| @dnd-kit/sortable | 10.0.0 | Sortable list presets | Built-in sorting logic with arrayMove utility |
| @dnd-kit/utilities | 3.2.2 | Transform utilities | CSS transform helpers for smooth animations |

**Status:** All dependencies already installed in codebase ✅

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| @dnd-kit/modifiers | Latest | Restrict drag bounds, snap to grid | Optional for advanced constraints |

### Key Imports
```javascript
// Core
import {
  DndContext,
  closestCenter,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  DragOverlay,
} from '@dnd-kit/core';

// Sortable
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
  sortableKeyboardCoordinates,
} from '@dnd-kit/sortable';

// Utilities
import { CSS } from '@dnd-kit/utilities';
```

## Architecture Patterns

### Recommended Component Structure

Based on NavigationSettings.jsx (644 lines), the DnD implementation should follow this structure:

```
NavigationSettings.jsx (existing)
├── DndContext (wrap entire component)
│   ├── FolderList (new - sortable folders)
│   │   └── SortableContext (folders array)
│   │       └── SortableFolderRow (new component)
│   ├── ItemAssignmentTable (new - cross-container dragging)
│   │   ├── RootItemsDroppable (root level zone)
│   │   │   └── SortableContext (root items)
│   │   │       └── SortableMenuItem (new)
│   │   └── FolderItemsDroppable[] (one per folder)
│   │       └── SortableContext (items in folder)
│   │           └── SortableMenuItem (new)
│   └── DragOverlay (visual feedback)
```

### Pattern 1: Simple List Reordering (Folder Order)

**What:** Reorder folders using drag-and-drop instead of manual order field editing

**When to use:** Single flat list where items only reorder within the same container

**Implementation:**
```jsx
// Source: https://docs.dndkit.com/presets
import { DndContext, closestCenter, PointerSensor, KeyboardSensor, useSensor, useSensors } from '@dnd-kit/core';
import { SortableContext, arrayMove, verticalListSortingStrategy, sortableKeyboardCoordinates } from '@dnd-kit/sortable';

function FolderList() {
  const [folders, setFolders] = useState([...]);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event) => {
    const { active, over } = event;

    if (active.id !== over.id) {
      setFolders((folders) => {
        const oldIndex = folders.findIndex(f => f.id === active.id);
        const newIndex = folders.findIndex(f => f.id === over.id);

        return arrayMove(folders, oldIndex, newIndex);
      });
    }
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <SortableContext
        items={folders.map(f => f.id)}
        strategy={verticalListSortingStrategy}
      >
        {folders.map(folder => (
          <SortableFolderRow key={folder.id} folder={folder} />
        ))}
      </SortableContext>
    </DndContext>
  );
}
```

**Key points:**
- Use `arrayMove` utility to reorder array efficiently
- `closestCenter` collision detection works well for lists
- Must update folder `order` field after reordering (recalculate: 1, 2, 3...)

### Pattern 2: Multiple Sortable Contexts (Items within Folders)

**What:** Each folder has its own sortable list of items that can be reordered independently

**When to use:** Multiple independent lists that don't interact with each other

**Implementation:**
```jsx
// Source: https://docs.dndkit.com/presets/sortable/sortable-context
<DndContext>
  {/* Root level items */}
  <SortableContext items={rootItemIds}>
    {rootItems.map(item => <SortableMenuItem key={item.id} item={item} />)}
  </SortableContext>

  {/* Each folder has its own context */}
  {folders.map(folder => (
    <SortableContext key={folder.id} items={getItemsInFolder(folder.id).map(i => i.id)}>
      {getItemsInFolder(folder.id).map(item => (
        <SortableMenuItem key={item.id} item={item} />
      ))}
    </SortableContext>
  ))}
</DndContext>
```

**Critical requirement:** All item IDs must be unique across all SortableContexts. Since menu items already have unique IDs (tasks, calendar, etc.), this is satisfied.

### Pattern 3: Cross-Container Dragging (Items Between Folders)

**What:** Drag items from one folder to another, or to/from root level

**When to use:** Complex UI where items need to move between multiple containers with real-time feedback

**Implementation:** Based on GitHub dnd-kit MultipleContainers example:

```jsx
// Source: https://github.com/clauderic/dnd-kit (MultipleContainers story)
function ItemAssignmentTable() {
  const [items, setItems] = useState({
    root: ['tasks', 'calendar'],
    'folder-1': ['team', 'metrics'],
    'folder-2': ['projects']
  });

  const [activeId, setActiveId] = useState(null);

  // Find which container an item belongs to
  const findContainer = (id) => {
    if (id in items) return id; // It's a container itself
    return Object.keys(items).find(key => items[key].includes(id));
  };

  const handleDragOver = ({ active, over }) => {
    const overId = over?.id;
    if (!overId || active.id in items) return;

    const overContainer = findContainer(overId);
    const activeContainer = findContainer(active.id);

    if (!overContainer || !activeContainer) return;

    if (activeContainer !== overContainer) {
      setItems((items) => {
        const activeItems = items[activeContainer];
        const overItems = items[overContainer];
        const overIndex = overItems.indexOf(overId);
        const activeIndex = activeItems.indexOf(active.id);

        let newIndex;
        if (overId in items) {
          // Dropping on empty container
          newIndex = overItems.length + 1;
        } else {
          // Dropping between items
          const isBelowOverItem =
            over &&
            active.rect.current.translated &&
            active.rect.current.translated.top > over.rect.top + over.rect.height;

          const modifier = isBelowOverItem ? 1 : 0;
          newIndex = overIndex >= 0 ? overIndex + modifier : overItems.length + 1;
        }

        return {
          ...items,
          [activeContainer]: items[activeContainer].filter(item => item !== active.id),
          [overContainer]: [
            ...items[overContainer].slice(0, newIndex),
            items[activeContainer][activeIndex],
            ...items[overContainer].slice(newIndex),
          ],
        };
      });
    }
  };

  const handleDragEnd = ({ active, over }) => {
    // Finalize position within same container
    const activeContainer = findContainer(active.id);
    const overContainer = findContainer(over?.id);

    if (!overContainer || activeContainer !== overContainer) {
      setActiveId(null);
      return;
    }

    const activeIndex = items[activeContainer].indexOf(active.id);
    const overIndex = items[overContainer].indexOf(over.id);

    if (activeIndex !== overIndex) {
      setItems((items) => ({
        ...items,
        [overContainer]: arrayMove(items[overContainer], activeIndex, overIndex),
      }));
    }

    setActiveId(null);
  };

  return (
    <DndContext
      sensors={sensors}
      onDragStart={({ active }) => setActiveId(active.id)}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      {/* Root level droppable */}
      <Droppable id="root">
        <SortableContext items={items.root}>
          {items.root.map(id => <SortableMenuItem key={id} id={id} />)}
        </SortableContext>
      </Droppable>

      {/* Folder droppables */}
      {folders.map(folder => (
        <Droppable key={folder.id} id={folder.id}>
          <SortableContext items={items[folder.id] || []}>
            {(items[folder.id] || []).map(id => (
              <SortableMenuItem key={id} id={id} />
            ))}
          </SortableContext>
        </Droppable>
      ))}

      <DragOverlay>
        {activeId ? <MenuItem id={activeId} /> : null}
      </DragOverlay>
    </DndContext>
  );
}
```

**Critical insight:** `onDragOver` fires continuously during drag, updating state in real-time. `onDragEnd` only handles final position within the same container.

### Pattern 4: Visual Feedback with DragOverlay

**What:** Show a preview of the dragged item that follows the cursor

**When to use:** Always - provides essential UX feedback during drag operations

**Implementation:**
```jsx
// Source: https://docs.dndkit.com/api-documentation/draggable/drag-overlay
import { DragOverlay } from '@dnd-kit/core';

const [activeId, setActiveId] = useState(null);

<DndContext
  onDragStart={({ active }) => setActiveId(active.id)}
  onDragEnd={() => setActiveId(null)}
>
  {/* sortable content */}

  <DragOverlay>
    {activeId ? <ItemPreview id={activeId} /> : null}
  </DragOverlay>
</DndContext>
```

**Styling tip:** DragOverlay item should have higher opacity/shadow to indicate it's being dragged.

### Pattern 5: SortableItem Component

**What:** Reusable component for items that can be dragged and sorted

**When to use:** Every draggable item in a sortable list

**Implementation:**
```jsx
// Source: https://docs.dndkit.com/presets/sortable/usesortable
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

function SortableMenuItem({ item }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <span>{item.name}</span>
    </div>
  );
}
```

**Key properties:**
- `attributes`: Accessibility attributes (aria-labels, etc.)
- `listeners`: Event handlers for mouse/touch/keyboard
- `setNodeRef`: Ref to attach to DOM node
- `transform`: CSS transform for drag animation
- `transition`: CSS transition for smooth movement
- `isDragging`: Boolean to apply different styles when dragging

### Anti-Patterns to Avoid

- **Mutating state directly:** Always use functional updates with `setItems((prev) => {...})` for proper React state management
- **Missing unique IDs:** Every draggable item must have a unique identifier across all contexts
- **Forgetting accessibility:** Always include KeyboardSensor for keyboard navigation
- **Not handling empty containers:** Empty folders need droppable zones or you can't drag items back into them
- **Inconsistent data structure:** Keep NavigationContext state structure consistent with DnD state structure to avoid transformation bugs

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Array reordering | Manual index swapping logic | `arrayMove` from @dnd-kit/sortable | Handles edge cases, immutable updates |
| Drag handle detection | Custom mouse event listeners | @dnd-kit sensors (PointerSensor, KeyboardSensor) | Cross-browser, touch support, accessibility |
| Collision detection | Manual bounding box calculations | `closestCenter` from @dnd-kit/core | Optimized algorithms with fallbacks |
| Keyboard navigation | Custom keyboard handlers | KeyboardSensor with sortableKeyboardCoordinates | WCAG compliant, tested patterns |
| Drag preview | Custom positioned div with mouse tracking | DragOverlay component | Portal-based, correct z-index, smooth |

**Key insight:** @dnd-kit handles ALL the complexity of drag-and-drop (browser inconsistencies, touch devices, accessibility, collision detection, animations). Never reimplement these from scratch.

## Common Pitfalls

### Pitfall 1: ID Collisions in Nested SortableContexts

**What goes wrong:** Two SortableContexts use the same item IDs, causing drag operations to fail or target the wrong element

**Why it happens:** Copying folder IDs into item IDs, or reusing menu item IDs across contexts

**How to avoid:**
- Use globally unique IDs (menu items already have: "tasks", "calendar", etc.)
- Use folder UUIDs from `crypto.randomUUID()`
- Never prefix/suffix IDs to create "uniqueness" - use actual unique values

**Warning signs:**
- Items jump to wrong locations when dragged
- Console errors about duplicate keys
- `findContainer()` returns wrong container

### Pitfall 2: Not Persisting Order After Drag

**What goes wrong:** Drag works visually but refreshing the page resets order

**Why it happens:** State updated locally but not saved to backend/storage

**How to avoid:**
```jsx
const handleDragEnd = async (event) => {
  // 1. Update local state (immediate feedback)
  const newFolders = arrayMove(folders, oldIndex, newIndex);
  setFolders(newFolders);

  // 2. Recalculate order field (1, 2, 3...)
  const foldersWithOrder = newFolders.map((folder, index) => ({
    ...folder,
    order: index + 1
  }));

  // 3. Persist to backend
  await saveConfig({
    ...config,
    folders: foldersWithOrder
  });
};
```

**Warning signs:**
- Order resets after page refresh
- Different users see different order
- Order field values are stale

### Pitfall 3: onDragOver Performance Issues

**What goes wrong:** UI becomes laggy during drag operations, especially with many items

**Why it happens:** `onDragOver` fires continuously (every pixel moved), causing excessive state updates and re-renders

**How to avoid:**
- Only update state when container actually changes: `if (activeContainer !== overContainer)`
- Use `React.memo()` on item components to prevent unnecessary re-renders
- Consider throttling state updates for very large lists (100+ items)
- Don't make API calls in `onDragOver` - save state in `onDragEnd` only

**Warning signs:**
- Jerky drag animations
- Dropped frames during drag
- High CPU usage in React DevTools profiler

### Pitfall 4: Missing Droppable Zones for Empty Containers

**What goes wrong:** Can't drag items into empty folders because there's no drop target

**Why it happens:** Only items have droppable zones, not the folder container itself

**How to avoid:**
```jsx
<Droppable id={folder.id}>
  <div className="min-h-[100px]"> {/* Always has height even if empty */}
    <SortableContext items={getItemsInFolder(folder.id).map(i => i.id)}>
      {getItemsInFolder(folder.id).length === 0 ? (
        <div className="text-gray-400">Drop items here</div>
      ) : (
        getItemsInFolder(folder.id).map(item => <SortableMenuItem key={item.id} item={item} />)
      )}
    </SortableContext>
  </div>
</Droppable>
```

**Warning signs:**
- Can drag items out of folders but not back in when folder becomes empty
- Empty state shows but isn't droppable

### Pitfall 5: Transform State Structure Mismatch

**What goes wrong:** DnD state uses `{ root: [...], 'folder-1': [...] }` structure but NavigationContext uses `{ folders: [...], items: [{ itemId, folderId }] }`

**Why it happens:** Different optimal structures for DnD vs. storage

**How to avoid:**
- Transform NavigationContext structure to DnD structure at component mount
- Transform back when saving to backend
- Create utility functions: `contextToDndState()` and `dndStateToContext()`

**Example:**
```jsx
// Transform NavigationContext → DnD state
const contextToDndState = (config, menuItems) => {
  const state = { root: [] };

  // Find root items (not in any folder)
  const assignedIds = config.items.map(i => i.itemId);
  state.root = menuItems
    .filter(m => !assignedIds.includes(m.id))
    .map(m => m.id);

  // Create folder containers
  config.folders.forEach(folder => {
    state[folder.id] = config.items
      .filter(i => i.folderId === folder.id)
      .map(i => i.itemId);
  });

  return state;
};

// Transform DnD state → NavigationContext
const dndStateToContext = (dndState, folders) => {
  const items = [];

  Object.keys(dndState).forEach(containerId => {
    if (containerId === 'root') return; // Skip root

    dndState[containerId].forEach((itemId, index) => {
      items.push({ itemId, folderId: containerId });
    });
  });

  return { folders, items };
};
```

## Code Examples

Verified patterns from official sources:

### Setup Sensors for Accessibility

```jsx
// Source: https://docs.dndkit.com/api-documentation/sensors
import { PointerSensor, KeyboardSensor, useSensor, useSensors } from '@dnd-kit/core';
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable';

const sensors = useSensors(
  useSensor(PointerSensor, {
    activationConstraint: {
      distance: 8, // Require 8px movement before activating (prevents accidental drags)
    },
  }),
  useSensor(KeyboardSensor, {
    coordinateGetter: sortableKeyboardCoordinates,
  })
);
```

### Complete SortableItem with All Features

```jsx
// Source: https://docs.dndkit.com/presets/sortable/usesortable
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

function SortableItem({ id, children }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : undefined,
    cursor: isDragging ? 'grabbing' : 'grab',
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      {children}
    </div>
  );
}
```

### Update Folder Order After Reordering

```jsx
const handleFolderDragEnd = async (event) => {
  const { active, over } = event;
  if (!over || active.id === over.id) return;

  const oldIndex = folders.findIndex(f => f.id === active.id);
  const newIndex = folders.findIndex(f => f.id === over.id);

  // Reorder array
  const reordered = arrayMove(folders, oldIndex, newIndex);

  // Recalculate order field (1, 2, 3, ...)
  const withOrder = reordered.map((folder, index) => ({
    ...folder,
    order: index + 1
  }));

  // Save to backend
  await saveConfig({
    ...config,
    folders: withOrder
  });
};
```

### Save Item Assignment After Cross-Container Drag

```jsx
const handleItemDragEnd = async (event) => {
  const { active, over } = event;
  if (!over) return;

  const activeContainer = findContainer(active.id);
  const overContainer = findContainer(over.id);

  // Item moved to different folder
  if (activeContainer !== overContainer) {
    const newFolderId = overContainer === 'root' ? null : overContainer;

    // Update items array
    const existingItem = items.find(i => i.itemId === active.id);
    let updatedItems;

    if (newFolderId === null) {
      // Move to root (remove assignment)
      updatedItems = items.filter(i => i.itemId !== active.id);
    } else if (existingItem) {
      // Update existing assignment
      updatedItems = items.map(i =>
        i.itemId === active.id ? { ...i, folderId: newFolderId } : i
      );
    } else {
      // Create new assignment
      updatedItems = [...items, { itemId: active.id, folderId: newFolderId }];
    }

    await saveConfig({
      ...config,
      items: updatedItems
    });
  }

  setActiveId(null);
};
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| react-dnd | @dnd-kit | ~2021 | Better accessibility, smaller bundle, hooks-based API |
| react-beautiful-dnd | @dnd-kit | ~2022 | react-beautiful-dnd deprecated, @dnd-kit is successor |
| HTML5 Drag API | @dnd-kit sensors | Always | Cross-browser/device compatibility, better UX |
| Imperative refs | Declarative hooks (useSortable) | ~2021 | Cleaner code, better React integration |

**Deprecated/outdated:**
- **react-beautiful-dnd**: No longer maintained (Atlassian archived 2023), use @dnd-kit instead
- **react-dnd**: Still maintained but more complex API, @dnd-kit is simpler for most use cases
- **HTML5 Drag API directly**: Browser inconsistencies, poor touch support, accessibility issues

**Current best practice (2026):** @dnd-kit is the de facto standard for React DnD. Version 6+ uses stable hooks API.

## Integration with Existing Code

### NavigationSettings.jsx Current Structure

The existing component already has:
- ✅ Folder CRUD operations (create, edit, delete)
- ✅ Item assignment via Select dropdowns
- ✅ Preview section showing folder/item hierarchy
- ✅ Loading and error states
- ✅ Mode awareness (people vs. product)

**What needs to change:**

1. **Wrap entire component in DndContext**
2. **Replace Table rows with Sortable components:**
   - Folder table → SortableFolderRow
   - Items table → Keep Select for now (Phase 30 adds optional DnD, Phase 31+ could replace Select entirely)
3. **Add DragOverlay at component root**
4. **Transform state between NavigationContext and DnD structure**

### NavigationContext Integration

NavigationContext provides:
```javascript
{
  config: { folders: [], items: [] },
  folders: [...],
  items: [...],
  saveConfig: async (config) => boolean,
  currentMode: 'people' | 'product'
}
```

**DnD needs:**
- Read `folders` and `items` on mount
- Call `saveConfig()` after drag ends
- Handle loading state during save
- Display errors from failed saves

**No changes needed to NavigationContext** - it's a pure data layer that works with any UI.

## Open Questions

1. **Should folder dragging be a separate DndContext or combined with item dragging?**
   - What we know: @dnd-kit documentation shows sibling SortableContexts can share a DndContext
   - What's unclear: Performance implications with 3 concurrent drag operations
   - Recommendation: Start with single DndContext for simplicity, split if performance issues arise

2. **How to handle drag conflicts when both folders and items are draggable?**
   - What we know: Different item IDs prevent collision (folder UUIDs vs. menu item strings)
   - What's unclear: UX confusion if users accidentally start dragging wrong thing
   - Recommendation: Add visual drag handles (grip icons) to make drag intent explicit

3. **Should Preview section be draggable or read-only?**
   - What we know: Phase requirements don't mention Preview section DnD
   - What's unclear: User expectations - might expect consistency
   - Recommendation: Phase 30 makes Preview read-only, Phase 31+ could add live preview DnD

## Sources

### Primary (HIGH confidence)
- Context7 /websites/dndkit - @dnd-kit official documentation (315 code snippets)
- https://docs.dndkit.com/presets - Sortable presets documentation
- https://docs.dndkit.com/api-documentation/sensors - Sensor configuration
- https://docs.dndkit.com/api-documentation/draggable/drag-overlay - DragOverlay API
- GitHub clauderic/dnd-kit MultipleContainers.tsx - Official example for cross-container dragging

### Secondary (MEDIUM confidence)
- package.json verification - Confirmed versions installed: core 6.3.1, sortable 10.0.0, utilities 3.2.2
- NavigationSettings.jsx analysis - Current component structure and integration points
- NavigationContext.jsx analysis - Data layer interface and state management

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - @dnd-kit is installed and verified in package.json
- Architecture: HIGH - Official docs and examples from Context7 and GitHub
- Pitfalls: HIGH - Common issues documented in official guides and known from library design
- Integration: HIGH - Existing code reviewed, clear integration points identified

**Research date:** 2026-01-29
**Valid until:** 2026-03-29 (60 days - @dnd-kit API stable)

**Tech stack verification:**
- @dnd-kit/core: v6.3.1 ✅ (current stable)
- @dnd-kit/sortable: v10.0.0 ✅ (current stable)
- @dnd-kit/utilities: v3.2.2 ✅ (current stable)
- React: v18.2.0 ✅ (compatible)
