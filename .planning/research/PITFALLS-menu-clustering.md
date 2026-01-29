# Domain Pitfalls: Menu Clustering / Folder Navigation

**Domain:** Adding collapsible folder navigation to existing React sidebar
**Researched:** 2026-01-29
**Context:** P&E Manager with React 18, @dnd-kit, Tailwind CSS, dual navigation modes (People/Product)

## Critical Pitfalls

Mistakes that cause rewrites, broken navigation, or architectural issues requiring major refactoring.

---

### Pitfall 1: ID Collision in DragOverlay with useSortable

**What goes wrong:** Rendering a component that calls `useSortable` inside `<DragOverlay>` causes an ID collision between the original draggable and the overlay copy. Both call `useDraggable` with the same `id`, breaking drag-and-drop behavior.

**Why it happens:**
- `useSortable` internally wraps `useDraggable`, which registers the ID
- When you render `<SortableItem id="task-1">` and also render the same component inside `<DragOverlay>`, two draggables exist with the same ID
- The dnd-kit context gets confused about which element is actually being dragged

**Consequences:**
- Dragging appears broken or has visual glitches
- Items "teleport" or snap to wrong positions
- Drop targets don't activate correctly
- Console errors about duplicate draggable IDs

**Warning signs:**
- Console warnings about duplicate IDs in drag context
- Dragged item doesn't follow cursor smoothly
- Original item doesn't visually hide during drag

**Prevention:**
1. **Create separate presentational components for DragOverlay:**
   ```javascript
   // BAD - SortableItem calls useSortable internally
   <DragOverlay>
     <SortableItem item={activeItem} />
   </DragOverlay>

   // GOOD - ItemPreview is purely presentational
   <DragOverlay>
     <ItemPreview item={activeItem} />
   </DragOverlay>
   ```

2. **Extract styling/rendering to a shared component without hooks:**
   ```javascript
   // Shared presentational component
   const NavigationItemUI = ({ icon: Icon, name, isFolder, isActive }) => (
     <div className={cn(styles, isActive && activeStyles)}>
       <Icon className="h-4 w-4" />
       <span>{name}</span>
     </div>
   );

   // Sortable version (uses hook)
   const SortableNavItem = ({ item }) => {
     const { attributes, listeners, setNodeRef, transform } = useSortable({ id: item.id });
     return (
       <div ref={setNodeRef} {...attributes} {...listeners}>
         <NavigationItemUI {...item} />
       </div>
     );
   };

   // Overlay version (no hook)
   const DragOverlayItem = ({ item }) => (
     <NavigationItemUI {...item} />
   );
   ```

**Phase to address:** Phase 2 (Settings UI with drag-and-drop) - must be built correctly from start.

**Source:** [dnd-kit Sortable Documentation](https://docs.dndkit.com/presets/sortable)

---

### Pitfall 2: SortableContext Items Array Order Mismatch

**What goes wrong:** The `items` prop passed to `SortableContext` doesn't match the actual render order of sortable items. This causes items to jump, animate incorrectly, or appear in wrong positions during drag operations.

**Why it happens:**
- Navigation items from two sources (hardcoded arrays + user config) get merged
- Sorting/filtering applied to render but not to items array
- Async state updates cause mismatches between items array and rendered DOM
- Folders complicate ordering (folder must appear before its children in items array)

**Consequences:**
- Items visually jump during drag operations
- Drop indicators appear in wrong positions
- "Ghost" items appear during drag
- Animations are janky or items teleport

**Warning signs:**
- Visual glitches when dragging items between folders
- Items don't animate smoothly to new positions
- Drop position different from visual indicator

**Prevention:**
1. **Derive items array from the same source as render:**
   ```javascript
   // Generate both items array and render order from same source
   const orderedNavigation = useMemo(() => {
     return buildOrderedNavigation(userConfig, baseNavigation);
   }, [userConfig, baseNavigation]);

   const sortableIds = orderedNavigation.map(item => item.id);

   return (
     <SortableContext items={sortableIds} strategy={verticalListSortingStrategy}>
       {orderedNavigation.map(item => (
         <SortableNavItem key={item.id} item={item} />
       ))}
     </SortableContext>
   );
   ```

2. **Flatten folder hierarchy for items array:**
   ```javascript
   // For nested folders, flatten to single array maintaining visual order
   const flattenedItems = useMemo(() => {
     const items = [];
     navigation.forEach(item => {
       items.push(item.id);
       if (item.type === 'folder' && item.expanded) {
         item.children.forEach(child => items.push(child.id));
       }
     });
     return items;
   }, [navigation]);
   ```

3. **Use stable sorting - never sort in render:**
   ```javascript
   // BAD - sorting in render causes mismatches
   {navigation.sort((a, b) => a.order - b.order).map(...)}

   // GOOD - sort in useMemo, use result everywhere
   const sortedNav = useMemo(() =>
     [...navigation].sort((a, b) => a.order - b.order),
     [navigation]
   );
   ```

**Detection:** Enable React DevTools Profiler; watch for components re-rendering unexpectedly during drag. Visual jumps during drag are the clearest indicator.

**Phase to address:** Phase 2 (Settings UI) and Phase 3 (Navigation Integration).

**Source:** [dnd-kit Sortable Documentation](https://docs.dndkit.com/presets/sortable)

---

### Pitfall 3: Nested SortableContext State Fragmentation

**What goes wrong:** When implementing folder-based organization with items inside folders, managing state across multiple nested `SortableContext` components causes items to "get lost," duplicated, or fail to move between containers.

**Why it happens:**
- Each `SortableContext` manages its own items array
- Moving item from folder A to folder B requires coordinated state updates across both
- `onDragOver` and `onDragEnd` handlers need complex logic to detect cross-container moves
- Race conditions between "remove from source" and "add to destination"

**Consequences:**
- Item disappears when dragging between folders
- Item appears in both folders (duplication)
- Application crashes due to undefined item lookups
- Undo/redo becomes impossible due to fragmented state

**Warning signs:**
- Items disappear during cross-folder drags
- Console errors about undefined item properties
- State doesn't match UI after drag operations

**Prevention:**
1. **Use single source of truth for all items:**
   ```javascript
   // State structure: items and folder memberships separate
   const [items, setItems] = useState({
     'nav-tasks': { name: 'Tasks', icon: 'CheckSquare', folderId: null, order: 1 },
     'nav-calendar': { name: 'Calendar', icon: 'Calendar', folderId: 'folder-1', order: 1 },
     // ...
   });

   const [folders, setFolders] = useState({
     'folder-1': { name: 'Capture', order: 1, expanded: true },
     // ...
   });
   ```

2. **Handle cross-container moves in onDragOver:**
   ```javascript
   const handleDragOver = (event) => {
     const { active, over } = event;
     if (!over) return;

     const activeFolder = items[active.id]?.folderId;
     const overFolder = over.id.startsWith('folder-')
       ? over.id
       : items[over.id]?.folderId;

     // Only update if container changed
     if (activeFolder !== overFolder) {
       setItems(prev => ({
         ...prev,
         [active.id]: { ...prev[active.id], folderId: overFolder }
       }));
     }
   };
   ```

3. **Derive sorted arrays from state, don't store arrays:**
   ```javascript
   // Derive, don't store order arrays
   const getFolderItems = (folderId) => {
     return Object.entries(items)
       .filter(([_, item]) => item.folderId === folderId)
       .sort(([_, a], [__, b]) => a.order - b.order)
       .map(([id]) => id);
   };
   ```

**Detection:** Log state changes in onDragOver and onDragEnd; compare logged state with UI. Items missing from state but visible (or vice versa) indicate fragmentation.

**Phase to address:** Phase 1 (Data Layer) - data model must support cross-folder operations cleanly.

---

### Pitfall 4: Breaking Existing Navigation with Mode Switching

**What goes wrong:** Adding folder configuration breaks the existing `isProductMode` toggle. Users switch modes but folder state persists incorrectly, showing Product navigation items in People mode folders, or folder config gets shared between modes.

**Why it happens:**
- Existing codebase has two separate navigation arrays: `peopleNavigation` and `productNavigation` (Layout.jsx lines 91-228)
- New folder configuration stored in single table/structure without mode discrimination
- `useAppMode()` context already exists and persists to localStorage
- Folder expanded state shared between modes, causing confusion

**Consequences:**
- GitHub item (People mode) appears in Product mode folder
- Switching modes resets folder collapsed state
- User customizations in one mode bleed into other
- Navigation becomes inconsistent between modes

**Warning signs:**
- Items visible that shouldn't be in current mode
- Folder expand/collapse state "jumps" on mode switch
- User reports "my navigation keeps resetting"

**Prevention:**
1. **Mode-scoped folder configuration:**
   ```javascript
   // Database schema with mode separation
   CREATE TABLE menu_folders (
     id UUID PRIMARY KEY,
     user_id VARCHAR(255),
     mode VARCHAR(20) NOT NULL, -- 'people' | 'product'
     name VARCHAR(100),
     icon VARCHAR(50),
     sort_order INTEGER,
     UNIQUE(user_id, mode, name)
   );

   CREATE TABLE menu_item_assignments (
     id UUID PRIMARY KEY,
     user_id VARCHAR(255),
     mode VARCHAR(20) NOT NULL,
     item_key VARCHAR(100), -- 'Tasks', 'Calendar', etc.
     folder_id UUID REFERENCES menu_folders(id),
     sort_order INTEGER
   );
   ```

2. **Mode-aware context/hook:**
   ```javascript
   const useMenuConfig = () => {
     const { isProductMode } = useAppMode();
     const mode = isProductMode ? 'product' : 'people';

     const [config, setConfig] = useState({
       people: { folders: [], assignments: {} },
       product: { folders: [], assignments: {} }
     });

     // Always return mode-specific config
     return {
       folders: config[mode].folders,
       assignments: config[mode].assignments,
       currentMode: mode,
       // ... methods
     };
   };
   ```

3. **Separate localStorage keys per mode:**
   ```javascript
   // Expanded state per mode
   const STORAGE_KEYS = {
     people: 'pe_nav_folders_expanded_people',
     product: 'pe_nav_folders_expanded_product'
   };

   const [expandedFolders, setExpandedFolders] = useState(() => {
     const key = STORAGE_KEYS[mode];
     return JSON.parse(localStorage.getItem(key) || '{}');
   });
   ```

**Detection:** Toggle between People and Product modes rapidly; check if folder structure is identical when it shouldn't be, or if items from wrong mode appear.

**Phase to address:** Phase 1 (Data Layer) - schema must encode mode from day one.

---

### Pitfall 5: Accessibility Regression in Drag-and-Drop

**What goes wrong:** Adding drag-and-drop to navigation removes keyboard accessibility that existed in the current flat navigation. Users who rely on keyboard navigation can no longer use the sidebar effectively.

**Why it happens:**
- dnd-kit defaults are generic ("Picked up draggable item...")
- Folder expand/collapse needs keyboard support beyond drag
- Focus management breaks when items are reordered
- Screen readers don't announce folder membership

**Consequences:**
- Keyboard users can't navigate folders (no Tab + Enter to expand)
- Screen readers announce meaningless item IDs
- Focus gets "lost" after drag operations
- WCAG 2.1 compliance regression

**Warning signs:**
- Unable to navigate sidebar with Tab key only
- Screen reader announces "draggable item undefined"
- Focus jumps unexpectedly after expanding folder

**Prevention:**
1. **Keyboard support for folders (separate from drag):**
   ```javascript
   const FolderHeader = ({ folder, expanded, onToggle }) => (
     <button
       onClick={onToggle}
       onKeyDown={(e) => {
         if (e.key === 'Enter' || e.key === ' ') {
           e.preventDefault();
           onToggle();
         }
       }}
       aria-expanded={expanded}
       aria-controls={`folder-content-${folder.id}`}
       className="flex items-center w-full"
     >
       <ChevronRight className={cn(expanded && 'rotate-90')} />
       <span>{folder.name}</span>
     </button>
   );
   ```

2. **Customize dnd-kit announcements:**
   ```javascript
   const announcements = {
     onDragStart: ({ active }) =>
       `Picked up navigation item ${active.data.current?.name}. Use arrow keys to move, space to drop.`,
     onDragOver: ({ active, over }) =>
       over?.data.current?.type === 'folder'
         ? `Moving ${active.data.current?.name} over folder ${over.data.current?.name}`
         : `Moving ${active.data.current?.name}`,
     onDragEnd: ({ active, over }) =>
       over
         ? `Dropped ${active.data.current?.name} into ${over.data.current?.name || 'navigation'}`
         : `Cancelled moving ${active.data.current?.name}`,
   };

   <DndContext announcements={announcements}>
   ```

3. **Manage focus after reorder:**
   ```javascript
   const handleDragEnd = (event) => {
     // ... update state

     // Restore focus to moved item
     requestAnimationFrame(() => {
       document.getElementById(`nav-item-${event.active.id}`)?.focus();
     });
   };
   ```

**Detection:** Test with keyboard only (no mouse). Test with screen reader (VoiceOver on Mac, NVDA on Windows). Verify Tab order and announcements.

**Phase to address:** Phase 2 (Settings UI) and Phase 3 (Navigation Integration) - must be designed in, not retrofitted.

**Source:** [dnd-kit Accessibility Guide](https://docs.dndkit.com/guides/accessibility)

---

## Moderate Pitfalls

Mistakes that cause delays, technical debt, or poor user experience.

---

### Pitfall 6: Folder Animation Jank

**What goes wrong:** Using CSS `height: auto` or JavaScript height calculations for folder expand/collapse causes janky animations or layout thrashing.

**Why it happens:**
- CSS can't transition `height: auto` smoothly
- Measuring content height triggers layout recalculation
- Multiple folders expanding/collapsing simultaneously compounds the issue
- Framer Motion or other animation libraries need explicit heights

**Consequences:**
- Choppy open/close animations
- Visible layout jumps when folder contents change
- Performance degradation on mobile
- "Unpolished" feel to the UI

**Prevention:**
1. **Use max-height with overflow:**
   ```css
   .folder-content {
     max-height: 0;
     overflow: hidden;
     transition: max-height 200ms ease-out;
   }

   .folder-content.expanded {
     max-height: 500px; /* Pick value larger than any realistic content */
   }
   ```

2. **Use grid template rows (modern approach):**
   ```css
   .folder-content {
     display: grid;
     grid-template-rows: 0fr;
     transition: grid-template-rows 200ms ease-out;
   }

   .folder-content.expanded {
     grid-template-rows: 1fr;
   }

   .folder-content > div {
     overflow: hidden;
   }
   ```

3. **Use Radix Collapsible (already in dependencies):**
   ```javascript
   import { Collapsible, CollapsibleTrigger, CollapsibleContent } from "@/components/ui/collapsible";

   // Radix handles animation with CSS/data attributes
   <Collapsible open={expanded} onOpenChange={setExpanded}>
     <CollapsibleTrigger>
       <ChevronRight className={cn(expanded && 'rotate-90')} />
       {folder.name}
     </CollapsibleTrigger>
     <CollapsibleContent>
       {folder.items.map(item => <NavItem key={item.id} {...item} />)}
     </CollapsibleContent>
   </Collapsible>
   ```

**Detection:** Use Chrome DevTools Performance tab; record folder expand/collapse. Look for layout thrashing (purple blocks) or long frames.

**Phase to address:** Phase 3 (Navigation Integration).

---

### Pitfall 7: Stale Closure in Drag Handlers

**What goes wrong:** `onDragEnd` or `onDragOver` handlers capture stale state due to JavaScript closure behavior. Actions like updating item order use outdated state, causing items to jump back or get wrong order values.

**Why it happens:**
- Event handlers defined inside component capture state at definition time
- State updates are batched; handler may see pre-update value
- React 18 automatic batching makes this more common
- Multiple rapid drag operations compound the issue

**Consequences:**
- Item order doesn't update correctly
- Items "jump back" after drop
- Rapid drag operations cause data corruption
- Debugging is difficult (state looks correct but handler sees old value)

**Prevention:**
1. **Use functional state updates:**
   ```javascript
   // BAD - captures stale items
   const handleDragEnd = (event) => {
     const newOrder = arrayMove(items, oldIndex, newIndex);
     setItems(newOrder);
   };

   // GOOD - uses current state
   const handleDragEnd = (event) => {
     setItems(prevItems => {
       const oldIndex = prevItems.findIndex(i => i.id === active.id);
       const newIndex = prevItems.findIndex(i => i.id === over.id);
       return arrayMove(prevItems, oldIndex, newIndex);
     });
   };
   ```

2. **Use refs for latest state access:**
   ```javascript
   const itemsRef = useRef(items);
   useEffect(() => {
     itemsRef.current = items;
   }, [items]);

   const handleDragEnd = useCallback((event) => {
     const currentItems = itemsRef.current;
     // ... use currentItems
   }, []); // Empty deps, always uses latest via ref
   ```

3. **Extract to stable callbacks:**
   ```javascript
   const moveItem = useCallback((activeId, overId) => {
     setItems(prev => {
       const oldIndex = prev.findIndex(i => i.id === activeId);
       const newIndex = prev.findIndex(i => i.id === overId);
       return arrayMove(prev, oldIndex, newIndex);
     });
   }, []);

   const handleDragEnd = useCallback((event) => {
     if (event.over) {
       moveItem(event.active.id, event.over.id);
     }
   }, [moveItem]);
   ```

**Detection:** Add `console.log('items length:', items.length)` in handler; compare with actual state. Stale closure shows outdated length.

**Phase to address:** Phase 2 (Settings UI with drag-and-drop).

---

### Pitfall 8: Orphaned Items on Folder Delete

**What goes wrong:** Deleting a folder leaves its items orphaned (pointing to non-existent folder ID) or accidentally deletes the items too. Neither behavior is what users expect - they expect items to return to root level.

**Why it happens:**
- Database CASCADE DELETE removes items with folder
- Or: No cascade, items have folderId pointing to deleted folder
- UI doesn't know how to render items with invalid folderId
- No explicit "move to root" logic on folder delete

**Consequences:**
- Navigation items completely disappear after folder delete
- Items stuck in limbo (exist in database but not rendered)
- User needs to recreate navigation structure from scratch
- Data integrity issues accumulate over time

**Prevention:**
1. **Explicit orphan handling on delete:**
   ```javascript
   const deleteFolder = async (folderId) => {
     // Step 1: Move all items to root (folderId = null)
     await MenuItemAssignment.updateMany(
       { folderId },
       { folderId: null }
     );

     // Step 2: Delete the folder
     await MenuFolder.delete(folderId);

     // Step 3: Refresh local state
     await refreshMenuConfig();
   };
   ```

2. **Database constraint approach:**
   ```sql
   ALTER TABLE menu_item_assignments
   ADD CONSTRAINT fk_folder_with_nullify
   FOREIGN KEY (folder_id) REFERENCES menu_folders(id)
   ON DELETE SET NULL;  -- Items get folderId = null, not deleted
   ```

3. **UI confirmation with preview:**
   ```javascript
   const handleDeleteFolder = (folder) => {
     const itemCount = items.filter(i => i.folderId === folder.id).length;

     showConfirmDialog({
       title: `Delete "${folder.name}"?`,
       message: itemCount > 0
         ? `${itemCount} items will be moved to the main navigation.`
         : 'This folder is empty.',
       onConfirm: () => deleteFolder(folder.id)
     });
   };
   ```

**Detection:** Delete a folder with items; check if items still appear in root navigation. If they disappear, orphan handling is broken.

**Phase to address:** Phase 1 (Data Layer) and Phase 2 (Settings UI).

---

### Pitfall 9: Sync Conflict Between LocalStorage and Backend

**What goes wrong:** Folder configuration stored in both localStorage (for fast load) and backend (for persistence). When they get out of sync, users see different navigation on different devices or after clearing browser data.

**Why it happens:**
- LocalStorage used for instant UI (no loading state)
- Backend used for persistence across devices
- Network failures cause write to backend to fail silently
- No conflict resolution strategy between sources

**Consequences:**
- User customizes navigation on Device A, sees old navigation on Device B
- Clear browser data loses all customizations
- Backend and local state diverge over time
- "My changes keep disappearing" user complaints

**Prevention:**
1. **Backend as source of truth, local as cache:**
   ```javascript
   const useMenuConfig = () => {
     const [config, setConfig] = useState(null);
     const [isLoading, setIsLoading] = useState(true);

     useEffect(() => {
       const loadConfig = async () => {
         // Try backend first
         try {
           const backendConfig = await MenuConfig.get();
           setConfig(backendConfig);
           // Update local cache
           localStorage.setItem('menu_config_cache', JSON.stringify(backendConfig));
         } catch (error) {
           // Fall back to cache
           const cached = localStorage.getItem('menu_config_cache');
           if (cached) setConfig(JSON.parse(cached));
         } finally {
           setIsLoading(false);
         }
       };
       loadConfig();
     }, []);

     return { config, isLoading };
   };
   ```

2. **Optimistic updates with sync feedback:**
   ```javascript
   const updateConfig = async (newConfig) => {
     // Update local immediately
     setConfig(newConfig);
     localStorage.setItem('menu_config_cache', JSON.stringify(newConfig));

     // Sync to backend
     try {
       await MenuConfig.update(newConfig);
     } catch (error) {
       // Show sync failure notification
       toast.error('Changes saved locally but failed to sync. Will retry.');
       // Queue for retry
       queueSync(newConfig);
     }
   };
   ```

3. **Version-based conflict detection:**
   ```javascript
   // Add version to config
   const [localVersion, setLocalVersion] = useState(0);

   const syncWithBackend = async () => {
     const backendConfig = await MenuConfig.get();
     if (backendConfig.version > localVersion) {
       // Backend is newer, update local
       setConfig(backendConfig);
       setLocalVersion(backendConfig.version);
     }
   };
   ```

**Detection:** Make a change, disable network (airplane mode), refresh page, re-enable network. Check if change persists across devices.

**Phase to address:** Phase 1 (Data Layer) - sync strategy must be designed early.

---

## Minor Pitfalls

Mistakes that cause annoyance but are relatively easy to fix.

---

### Pitfall 10: Empty Folder Visual Confusion

**What goes wrong:** Empty folders are visually identical to collapsed folders with items. Users can't tell if clicking will expand items or if the folder is actually empty.

**Prevention:**
```javascript
const FolderHeader = ({ folder, itemCount, expanded }) => (
  <div className="flex items-center justify-between">
    <div className="flex items-center">
      {itemCount > 0 && (
        <ChevronRight className={cn('transition-transform', expanded && 'rotate-90')} />
      )}
      <folder.icon className="h-4 w-4 mr-2" />
      <span>{folder.name}</span>
    </div>
    {itemCount > 0 && (
      <Badge variant="secondary">{itemCount}</Badge>
    )}
    {itemCount === 0 && (
      <span className="text-xs text-gray-400">Empty</span>
    )}
  </div>
);
```

**Phase to address:** Phase 3 (Navigation Integration).

---

### Pitfall 11: Lost Expanded State on Config Update

**What goes wrong:** Every time menu configuration is saved/loaded, folder expanded state resets to default. Users have to re-expand their preferred folders repeatedly.

**Prevention:**
```javascript
// Separate expanded state from config state
const [expandedFolders, setExpandedFolders] = useState(() => {
  const stored = localStorage.getItem(`menu_expanded_${mode}`);
  return stored ? JSON.parse(stored) : {};
});

// Persist independently of config changes
useEffect(() => {
  localStorage.setItem(`menu_expanded_${mode}`, JSON.stringify(expandedFolders));
}, [expandedFolders, mode]);

// Don't merge expanded state into config
const saveConfig = async (newConfig) => {
  // Only save structural config, not UI state
  await MenuConfig.update({
    folders: newConfig.folders,
    assignments: newConfig.assignments
    // NOT: expandedFolders
  });
};
```

**Phase to address:** Phase 3 (Navigation Integration).

---

### Pitfall 12: Touch Device Drag Issues

**What goes wrong:** Drag-and-drop works fine with mouse but fails or behaves erratically on touch devices due to scroll conflicts and touch event handling.

**Prevention:**
```javascript
const sensors = useSensors(
  useSensor(PointerSensor, {
    activationConstraint: {
      distance: 8, // Minimum drag distance before activation
    },
  }),
  useSensor(TouchSensor, {
    activationConstraint: {
      delay: 250, // Delay before drag activates (allows scrolling)
      tolerance: 5, // Movement tolerance during delay
    },
  }),
  useSensor(KeyboardSensor, {
    coordinateGetter: sortableKeyboardCoordinates,
  })
);
```

**Phase to address:** Phase 2 (Settings UI).

---

## Phase-Specific Warnings

| Phase | Likely Pitfall | Mitigation |
|-------|---------------|------------|
| Phase 1: Data Layer | Mode scope confusion (Pitfall 4) | Design schema with mode field from day one |
| Phase 1: Data Layer | Orphaned items (Pitfall 8) | Use ON DELETE SET NULL in foreign key |
| Phase 1: Data Layer | Sync conflicts (Pitfall 9) | Define backend-as-truth strategy |
| Phase 2: Settings UI | ID collision in DragOverlay (Pitfall 1) | Create separate presentational components |
| Phase 2: Settings UI | Items array mismatch (Pitfall 2) | Derive items from render source |
| Phase 2: Settings UI | Stale closures (Pitfall 7) | Use functional state updates |
| Phase 3: Navigation | Breaking mode switch (Pitfall 4) | Test People/Product toggle thoroughly |
| Phase 3: Navigation | Accessibility regression (Pitfall 5) | Test with keyboard and screen reader |
| Phase 3: Navigation | Animation jank (Pitfall 6) | Use Radix Collapsible or grid-template-rows |

---

## Integration Risks with Existing System

### Risk: Context Provider Ordering

P&E Manager already has multiple context providers (AuthContext, AppModeContext, DisplayModeContext). Adding MenuConfigContext requires correct nesting.

**Prevention:** Add inside AuthContext but outside AppModeContext, since menu config depends on auth but provides data used by AppMode-aware components.

```javascript
// App.jsx
<AuthProvider>
  <MenuConfigProvider>
    <AppModeProvider>
      <DisplayModeProvider>
        <RouterProvider />
      </DisplayModeProvider>
    </AppModeProvider>
  </MenuConfigProvider>
</AuthProvider>
```

### Risk: Navigation Array Modification

Current Layout.jsx defines navigation arrays as constants (lines 91-228). Converting to dynamic structure must preserve:
- `createPageUrl()` function calls
- `current: currentPageName === "X"` active state logic
- Mode-specific theming classes
- Mobile sidebar close behavior

**Prevention:** Create helper function that merges base navigation with user config, preserving all existing properties:

```javascript
const buildNavigationWithFolders = (baseNavItems, userConfig, currentPageName) => {
  // Returns structure matching existing usage patterns
  return baseNavItems.map(item => ({
    ...item,
    current: currentPageName === item.name,
    // Folder assignment from userConfig
    folderId: userConfig.assignments[item.name]?.folderId || null
  }));
};
```

### Risk: Existing SubtaskList Conflict

SubtaskList.jsx already uses @dnd-kit with its own DndContext. If menu config Settings UI uses another DndContext on the same page, they could interfere.

**Prevention:** Ensure Settings tabs are mutually exclusive - Menu configuration tab never renders at same time as any component with existing DndContext.

---

## Sources

- [dnd-kit Sortable Documentation](https://docs.dndkit.com/presets/sortable) - ID collision, items array ordering
- [dnd-kit Accessibility Guide](https://docs.dndkit.com/guides/accessibility) - Keyboard, screen reader requirements
- [dnd-kit Context Provider](https://docs.dndkit.com/api-documentation/context-provider) - Collision detection, sensors
- P&E Manager Codebase Analysis:
  - `/src/pages/Layout.jsx` - Navigation structure (lines 91-228)
  - `/src/contexts/AppModeContext.jsx` - Mode switching pattern
  - `/src/components/sync/SubtaskList.jsx` - Existing dnd-kit usage
  - `/src/pages/Settings.jsx` - Settings tab structure
