# Technology Stack: Menu Clustering

**Project:** P&E Manager - Collapsible Folder Navigation with Settings UI
**Researched:** 2026-01-29
**Confidence:** HIGH

## Executive Summary

This milestone adds collapsible folder groups to the sidebar navigation, allowing users to organize 16+ menu items into customizable folders. The feature requires:

1. **Collapsible folder UI** - Expand/collapse navigation groups
2. **Settings UI** - CRUD for folders, drag-and-drop item assignment
3. **Backend persistence** - Store folder configuration per user

**Key decision:** NO new dependencies required. The existing stack already has everything needed:
- `@radix-ui/react-collapsible` (v1.1.3) - Already installed, wraps collapsible behavior
- `@dnd-kit/core` + `@dnd-kit/sortable` (v6.3.1 / v10.0.0) - Already used for subtask reordering
- PostgreSQL - Existing database for configuration storage
- shadcn/ui sidebar components - Already have SidebarGroup, SidebarMenu patterns

---

## Stack Assessment

### ZERO New Dependencies Required

| Capability | Required Library | Status | Installed Version |
|------------|------------------|--------|-------------------|
| Collapsible folders | @radix-ui/react-collapsible | **ALREADY INSTALLED** | 1.1.3 |
| Collapsible wrapper | src/components/ui/collapsible.jsx | **ALREADY EXISTS** | shadcn/ui |
| Drag-and-drop | @dnd-kit/core + @dnd-kit/sortable | **ALREADY INSTALLED** | 6.3.1 / 10.0.0 |
| DnD utilities | @dnd-kit/utilities | **ALREADY INSTALLED** | 3.2.2 |
| Settings tabs UI | @radix-ui/react-tabs | **ALREADY INSTALLED** | 1.1.3 |
| Sidebar patterns | src/components/ui/sidebar.jsx | **ALREADY EXISTS** | shadcn/ui |
| Database | PostgreSQL via pg | **ALREADY INSTALLED** | 8.11.3 |

**Verification (npm list output):**
```
@dnd-kit/core@6.3.1
@dnd-kit/sortable@10.0.0
@dnd-kit/utilities@3.2.2
@radix-ui/react-collapsible@1.1.3
```

**npm registry latest versions (verified 2026-01-29):**
- @dnd-kit/core: 6.3.1 (current = latest)
- @dnd-kit/sortable: 10.0.0 (current = latest)
- @radix-ui/react-collapsible: 1.1.12 (installed 1.1.3 is slightly behind but compatible)

---

## Existing Components to Leverage

### 1. Collapsible Component (Already Exists)

**Location:** `src/components/ui/collapsible.jsx`

```jsx
// Already exported and ready to use:
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from "@/components/ui/collapsible";

<Collapsible open={isOpen} onOpenChange={setIsOpen}>
  <CollapsibleTrigger>
    <FolderIcon /> {folderName}
    <ChevronDown className={isOpen ? 'rotate-180' : ''} />
  </CollapsibleTrigger>
  <CollapsibleContent>
    {/* Navigation items in this folder */}
  </CollapsibleContent>
</Collapsible>
```

**Radix Collapsible features (per official docs):**
- Controlled/uncontrolled state via `open`/`defaultOpen`
- `onOpenChange` callback for state management
- CSS variables for animation: `--radix-collapsible-content-height`, `--radix-collapsible-content-width`
- ARIA disclosure pattern compliance
- Keyboard support (Space/Enter toggle)

### 2. DnD-Kit Pattern (Already Exists)

**Existing usage:** `src/components/sync/SubtaskList.jsx` and `SubtaskItem.jsx`

The project already implements the exact pattern needed for folder management:

```jsx
// Existing pattern in SubtaskList.jsx:
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy, arrayMove } from '@dnd-kit/sortable';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

// This pattern directly applies to:
// - Reordering folders
// - Reordering items within folders
// - Moving items between folders (with multiple SortableContexts)
```

**Key existing patterns to reuse:**
- `useSensors()` with PointerSensor + KeyboardSensor
- `arrayMove()` for reordering
- `useSortable()` hook for draggable items
- `CSS.Transform.toString(transform)` for drag animations

### 3. Sidebar Group Components (Already Exists)

**Location:** `src/components/ui/sidebar.jsx`

The shadcn/ui sidebar already has group/submenu patterns:

```jsx
// Already available:
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarMenuSub,
  SidebarMenuSubItem,
  SidebarMenuSubButton
} from "@/components/ui/sidebar";

// SidebarMenuSub provides nested navigation with visual indent
// SidebarGroup provides section grouping with labels
```

### 4. Settings Page Pattern (Already Exists)

**Location:** `src/pages/Settings.jsx`

The Settings page already implements a tabbed configuration UI:
- Uses `@radix-ui/react-tabs` for navigation
- Has existing patterns for CRUD operations (TaskAttribute management)
- Uses Dialog for create/edit modals
- Uses Table for listing items
- Uses DropdownMenu for item actions

---

## Architecture for Menu Clustering

### Frontend Data Flow

```
Layout.jsx                     MenuConfigContext              API/Database
    |                               |                              |
    |-- reads navigation -->        |                              |
    |                               |                              |
    |-- useMenuConfig() -->         |                              |
    |   (provides folders,          |                              |
    |    collapsed state)           |                              |
    |                               |                              |
Settings.jsx                        |                              |
    |-- updates folders -->         |                              |
    |-- drag-drop reorder -->       |                              |
    |                               |-- saves config -->            |
    |                               |                              |
    |                               |<-- loads config --            |
```

### Database Schema Addition

```sql
-- New table for folder configuration
CREATE TABLE menu_folders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id VARCHAR(100) NOT NULL,
  name VARCHAR(100) NOT NULL,
  icon VARCHAR(50),              -- lucide icon name
  sort_order INTEGER DEFAULT 0,
  is_collapsed BOOLEAN DEFAULT false,
  created_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- New table for menu item assignments
CREATE TABLE menu_item_assignments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id VARCHAR(100) NOT NULL,
  menu_item_key VARCHAR(100) NOT NULL,  -- e.g., 'Tasks', 'Calendar'
  folder_id UUID REFERENCES menu_folders(id) ON DELETE SET NULL,
  sort_order INTEGER DEFAULT 0,
  is_hidden BOOLEAN DEFAULT false,
  created_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for query performance
CREATE INDEX idx_menu_folders_user ON menu_folders(user_id);
CREATE INDEX idx_menu_item_assignments_user ON menu_item_assignments(user_id);
CREATE INDEX idx_menu_item_assignments_folder ON menu_item_assignments(folder_id);
```

### Backend Service Layer

```javascript
// New service: server/services/MenuConfigService.js
class MenuConfigService {
  // Folders
  async listFolders(userId)
  async createFolder(userId, { name, icon })
  async updateFolder(userId, folderId, updates)
  async deleteFolder(userId, folderId)
  async reorderFolders(userId, folderIds)

  // Item assignments
  async getItemAssignments(userId)
  async assignItemToFolder(userId, menuItemKey, folderId, sortOrder)
  async removeItemFromFolder(userId, menuItemKey)
  async reorderItemsInFolder(userId, folderId, menuItemKeys)

  // Collapsed state
  async setFolderCollapsed(userId, folderId, isCollapsed)
  async getCollapsedState(userId)
}
```

### Frontend Components (New)

| Component | Purpose | Uses |
|-----------|---------|------|
| `CollapsibleNavFolder.jsx` | Renders a folder with collapsible items | Collapsible, SidebarMenuSub |
| `MenuConfigContext.jsx` | Provides folder config to Layout | React Context |
| `MenuSettingsTab.jsx` | Settings tab for folder management | Tabs, Table, DnD |
| `FolderItemAssigner.jsx` | Drag-drop interface for item assignment | @dnd-kit |

---

## What NOT to Add

### Libraries to Avoid

| Library | Why NOT |
|---------|---------|
| **react-beautiful-dnd** | Deprecated, @dnd-kit already installed and superior |
| **framer-motion** for collapse | Radix Collapsible has built-in CSS variable animation |
| **react-collapse** | Radix Collapsible already handles this |
| **react-sortable-hoc** | Legacy, @dnd-kit is the modern replacement |
| **Additional sidebar libraries** | shadcn/ui sidebar already comprehensive |

### Patterns to Avoid

| Anti-Pattern | Why Avoid | Instead |
|--------------|-----------|---------|
| localStorage for config | Doesn't sync across devices | Use PostgreSQL |
| Separate collapsed state per device | Confusing UX | Server-side persistence |
| Complex nested DnD | Hard to implement correctly | Simple folder-to-folder moves |
| Real-time sync (WebSocket) | Overkill for config changes | Reload on focus/manual refresh |

---

## DnD-Kit Nested Container Pattern

For moving items between folders, use multiple `SortableContext` providers:

```jsx
// Pattern for Settings UI - drag items between folders
<DndContext onDragEnd={handleDragEnd} collisionDetection={closestCenter}>
  {/* Unassigned items pool */}
  <SortableContext items={unassignedItems.map(i => i.key)} strategy={verticalListSortingStrategy}>
    <div className="border p-4">
      <h3>Unassigned Items</h3>
      {unassignedItems.map(item => (
        <DraggableMenuItem key={item.key} item={item} />
      ))}
    </div>
  </SortableContext>

  {/* Each folder has its own sortable context */}
  {folders.map(folder => (
    <SortableContext
      key={folder.id}
      items={folder.items.map(i => i.key)}
      strategy={verticalListSortingStrategy}
    >
      <div className="border p-4">
        <h3>{folder.name}</h3>
        {folder.items.map(item => (
          <DraggableMenuItem key={item.key} item={item} />
        ))}
      </div>
    </SortableContext>
  ))}
</DndContext>
```

**Key DnD-Kit guidance (per official docs):**
- Nested SortableContexts are supported within single DndContext
- Item IDs must be unique across ALL contexts (no collisions)
- Use `over.id` in `onDragEnd` to detect target container
- `closestCenter` collision detection works for simple use cases

---

## Integration with Existing Layout

### Current Layout.jsx Structure

```jsx
// Current: Flat navigation array
const peopleNavigation = [
  { name: "Tasks", icon: CheckSquare, href: createPageUrl("Tasks"), ... },
  { name: "Calendar", icon: Calendar, href: createPageUrl("Calendar"), ... },
  // ... 16 total items
];

// Current: Simple map rendering
{navigation.map((item) => (
  <Link key={item.name} to={item.href} ...>
    <item.icon />
    {item.name}
  </Link>
))}
```

### Target Layout.jsx Structure

```jsx
// New: Menu config from context
const { folders, unfoldered, isCollapsed, toggleCollapsed } = useMenuConfig();

// New: Render folders with collapsible content
{folders.map(folder => (
  <Collapsible
    key={folder.id}
    open={!isCollapsed[folder.id]}
    onOpenChange={() => toggleCollapsed(folder.id)}
  >
    <CollapsibleTrigger className="flex items-center px-4 py-2 w-full">
      <FolderIcon className="mr-2" />
      {folder.name}
      <ChevronDown className={cn("ml-auto", !isCollapsed[folder.id] && "rotate-180")} />
    </CollapsibleTrigger>
    <CollapsibleContent>
      {folder.items.map(item => (
        <Link key={item.name} to={item.href} className="pl-8">
          <item.icon />
          {item.name}
        </Link>
      ))}
    </CollapsibleContent>
  </Collapsible>
))}

{/* Unfoldered items render directly */}
{unfoldered.map(item => (
  <Link key={item.name} to={item.href}>
    <item.icon />
    {item.name}
  </Link>
))}
```

---

## API Endpoints (New)

```
GET    /api/menu-config           - Get folders + assignments for user
POST   /api/menu-config/folders   - Create folder
PUT    /api/menu-config/folders/:id - Update folder
DELETE /api/menu-config/folders/:id - Delete folder
POST   /api/menu-config/folders/reorder - Reorder folders

POST   /api/menu-config/assign    - Assign item to folder
DELETE /api/menu-config/assign/:key - Remove item from folder
POST   /api/menu-config/items/reorder - Reorder items within folder

PUT    /api/menu-config/collapsed/:folderId - Toggle collapsed state
```

---

## Bundle Size Impact

**Frontend impact:** 0 bytes
- All required libraries already installed
- No new dependencies

**Backend impact:** Minimal
- New service file (~5KB)
- New route file (~3KB)
- New migration (~2KB SQL)

---

## Version Verification Summary

| Package | Installed | Latest | Status |
|---------|-----------|--------|--------|
| @dnd-kit/core | 6.3.1 | 6.3.1 | Current |
| @dnd-kit/sortable | 10.0.0 | 10.0.0 | Current |
| @dnd-kit/utilities | 3.2.2 | 3.2.2 | Current |
| @radix-ui/react-collapsible | 1.1.3 | 1.1.12 | Compatible |

**Source:** npm registry queries via `npm view [package] version` (2026-01-29)

---

## Confidence Assessment

| Area | Confidence | Rationale |
|------|------------|-----------|
| Collapsible UI | HIGH | Radix component already installed, shadcn wrapper exists |
| Drag-and-drop | HIGH | @dnd-kit already used in project, pattern established |
| Settings UI | HIGH | Follows existing Settings.jsx patterns exactly |
| Database schema | HIGH | Standard PostgreSQL patterns, follows existing conventions |
| Layout integration | MEDIUM | Requires refactor of Layout.jsx, but pattern is clear |

**Overall:** HIGH - This feature requires zero new dependencies and builds entirely on proven patterns already in the codebase.

---

## Summary

**New dependencies:** 0

**Existing dependencies leveraged:**
- @radix-ui/react-collapsible (1.1.3)
- @dnd-kit/core (6.3.1)
- @dnd-kit/sortable (10.0.0)
- @dnd-kit/utilities (3.2.2)
- pg (PostgreSQL client, 8.11.3)

**New code required:**
- Database migration (2 tables)
- MenuConfigService.js (backend)
- menuConfig.js routes (backend)
- MenuConfigContext.jsx (frontend)
- CollapsibleNavFolder.jsx (frontend)
- MenuSettingsTab.jsx (frontend)

**Stack philosophy:** 100% leverage existing investments. The @dnd-kit + Radix + shadcn/ui stack is complete for this feature. Adding any new library would be redundant.
