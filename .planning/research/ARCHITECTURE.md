# Architecture Patterns: Menu Clustering / Collapsible Folder Navigation

**Domain:** React Sidebar Navigation with Hierarchical Menu Structure
**Researched:** 2026-01-29
**Confidence:** HIGH

## Executive Summary

Menu clustering integrates seamlessly with the existing P&E Manager architecture. The project already has all foundational pieces: shadcn/ui sidebar components with built-in `SidebarMenuSub` for nested items, `@radix-ui/react-collapsible` for expand/collapse behavior, `@dnd-kit` for drag-and-drop reordering, and `UserSettingsService` with the `user_settings` table for persisting configuration. No new dependencies required.

**Key architectural decisions:**
1. **Data model:** Store menu configuration as JSON in existing `user_settings` table (key: `menu_config_people` / `menu_config_product`)
2. **UI components:** Transform flat navigation arrays to hierarchical structure using existing shadcn/ui sidebar primitives
3. **Settings UI:** Add "Navigation" tab to Settings.jsx using existing Tabs pattern with folder CRUD and drag-drop item assignment
4. **State management:** New `NavigationContext` to centralize menu structure, loaded on app init
5. **Default fallback:** Maintain flat array as default for users without custom configuration

**Build order:** Data model + context first, then hierarchical rendering, then Settings UI, then drag-drop (optional enhancement).

## Recommended Architecture

### System Overview

```
+----------------------------------------------------------------+
|                     Frontend (React)                            |
+----------------------------------------------------------------+
|  Layout.jsx                                                     |
|    |-- NavigationContext.Provider                              |
|         |-- useNavigation() hook                               |
|              |-- menuConfig (hierarchical)                     |
|              |-- updateMenuConfig()                            |
|                                                                |
|  Sidebar Rendering:                                            |
|    |-- CollapsibleFolder.jsx (NEW)                             |
|         |-- SidebarGroup + Collapsible                         |
|         |-- SidebarMenuSub for nested items                    |
|                                                                |
|  Settings.jsx                                                  |
|    |-- TabsContent value="navigation" (NEW)                    |
|         |-- FolderList (CRUD folders)                          |
|         |-- MenuItemAssignment (drag items to folders)         |
|                                                                |
|  API Calls:                                                    |
|    |-- UserSettings.get('menu_config_people')                  |
|    |-- UserSettings.set('menu_config_people', config)          |
+----------------------------------------------------------------+
                            | HTTP
+----------------------------------------------------------------+
|                     Backend (Express)                           |
+----------------------------------------------------------------+
|  Routes:                                                        |
|    |-- /api/user-settings (EXISTS)                             |
|         |-- GET /:key                                          |
|         |-- PUT /:key                                          |
|                                                                |
|  Services:                                                      |
|    |-- UserSettingsService.js (EXISTS)                         |
|         |-- get(userId, settingKey)                            |
|         |-- set(userId, settingKey, value)                     |
+----------------------------------------------------------------+
                            | SQL
+----------------------------------------------------------------+
|                   PostgreSQL Database                           |
+----------------------------------------------------------------+
|  user_settings (EXISTS)                                        |
|    |-- id (UUID)                                               |
|    |-- user_id (VARCHAR)                                       |
|    |-- setting_key (VARCHAR) -- 'menu_config_people'           |
|    |-- setting_value (TEXT)  -- JSON string                    |
|    |-- encrypted (BOOLEAN)   -- false for menu config          |
+----------------------------------------------------------------+
```

### Component Boundaries

| Component | Responsibility | Communicates With | State |
|-----------|----------------|-------------------|-------|
| **NavigationContext** (NEW) | Centralize menu config, provide hooks | UserSettings API, Layout | menuConfig, loading, updateMenuConfig() |
| **Layout.jsx** (MODIFY) | Consume NavigationContext, render hierarchical nav | NavigationContext | EXTEND with folder rendering |
| **CollapsibleFolder.jsx** (NEW) | Render collapsible folder with nested items | Collapsible, SidebarMenuSub | isOpen state (local) |
| **Settings.jsx** (MODIFY) | Add Navigation tab for folder management | NavigationContext, UserSettings | EXTEND with navigation tab |
| **FolderManager.jsx** (NEW) | CRUD operations for folders | NavigationContext | editing state, newFolderName |
| **MenuItemAssignment.jsx** (NEW) | Drag items to folders | @dnd-kit, NavigationContext | dragState |
| **UserSettingsService** (EXISTS) | Persist settings to DB | user_settings table | No changes needed |

### Data Flow

**Flow 1: Load Menu Configuration on App Init**
```
1. User authenticates, AppProvider mounts
2. NavigationContext fetches: GET /api/user-settings/menu_config_people
3. If exists: Parse JSON, set as menuConfig
4. If not exists: Use DEFAULT_MENU_CONFIG (flat array structure)
5. Layout.jsx consumes menuConfig via useNavigation() hook
6. Render hierarchical sidebar based on menuConfig structure
```

**Flow 2: User Creates New Folder**
```
1. User opens Settings > Navigation tab
2. Clicks "Add Folder", enters name (e.g., "Core Tasks")
3. FolderManager calls NavigationContext.createFolder(name)
4. NavigationContext:
   a. Updates local menuConfig state (optimistic)
   b. Calls UserSettings.set('menu_config_people', JSON.stringify(newConfig))
5. Backend stores in user_settings table
6. Sidebar re-renders with new folder
```

**Flow 3: User Moves Item to Folder**
```
1. In Settings > Navigation, user drags "Tasks" item
2. Drops onto "Core Tasks" folder
3. MenuItemAssignment calls NavigationContext.moveItemToFolder(itemId, folderId)
4. NavigationContext:
   a. Removes item from current location (root or other folder)
   b. Adds item to target folder's children
   c. Persists to UserSettings
5. Sidebar re-renders with item in new folder
```

**Flow 4: Toggle Folder Collapse State**
```
1. User clicks folder header in sidebar
2. CollapsibleFolder toggles local isOpen state
3. Optional: Persist collapse states to localStorage for session persistence
   (Not database - transient UI preference)
```

## Integration Points

### 1. Existing UserSettingsService (server/services/UserSettingsService.js)

**Current state:** Provides `get(userId, key)`, `set(userId, key, value, encrypt)` for any key-value pair.

**Integration:** Use as-is. No modifications needed.

```javascript
// Example usage for menu config
await UserSettingsService.set(
  userId,
  'menu_config_people',
  JSON.stringify(menuConfig),
  false // not encrypted
);

const config = await UserSettingsService.get(userId, 'menu_config_people');
const menuConfig = config ? JSON.parse(config) : DEFAULT_CONFIG;
```

### 2. Existing apiClient UserSettings (src/api/entities.js)

**Current state:** Exports `UserSettings` with `get()`, `set()`, `delete()` methods.

**Integration:** Use existing methods.

```javascript
// In NavigationContext
import { UserSettings } from '@/api/entities';

const loadMenuConfig = async () => {
  const configStr = await UserSettings.get('menu_config_people');
  return configStr ? JSON.parse(configStr) : DEFAULT_MENU_CONFIG;
};

const saveMenuConfig = async (config) => {
  await UserSettings.set('menu_config_people', JSON.stringify(config));
};
```

### 3. Existing Layout.jsx (src/pages/Layout.jsx)

**Current state:**
- Lines 91-188: `peopleNavigation` flat array (16 items)
- Lines 191-228: `productNavigation` flat array (6 items)
- Line 230: `navigation = isProductMode ? productNavigation : peopleNavigation`
- Lines 301-320: Map over flat array to render `<Link>` items

**Integration:**

```javascript
// BEFORE: Flat array rendering
{navigation.map((item) => (
  <Link key={item.name} to={item.href} ...>
    <item.icon className="h-5 w-5 mr-3" />
    {item.name}
  </Link>
))}

// AFTER: Hierarchical rendering with context
const { menuConfig, isLoading } = useNavigation();
const navigation = isProductMode
  ? menuConfig.product
  : menuConfig.people;

{isLoading ? (
  <NavigationSkeleton />
) : (
  <HierarchicalNavigation items={navigation} />
)}
```

### 4. Existing Settings.jsx (src/pages/Settings.jsx)

**Current state:**
- Lines 272-282: `tabConfigs` array defines all settings tabs
- Line 370: `<Tabs>` component with `TabsList` and `TabsContent` for each tab

**Integration:**

```javascript
// ADD to tabConfigs array (line 272)
const tabConfigs = [
  { id: "priorities", label: "Priorities", icon: Flag },
  { id: "taskTypes", label: "Task Types", icon: Layers },
  // ... existing tabs ...
  { id: "navigation", label: "Navigation", icon: Menu }, // NEW
  { id: "data", label: "Data", icon: Database }
];

// ADD TabsContent (after line 525)
{tab.id === 'navigation' && (
  <NavigationSettings />
)}
```

### 5. Existing shadcn/ui Components

**Available (no new dependencies):**

| Component | Location | Purpose |
|-----------|----------|---------|
| `Collapsible` | `src/components/ui/collapsible.jsx` | Expand/collapse folder content |
| `SidebarMenuSub` | `src/components/ui/sidebar.jsx` | Nested menu items (line 554-565) |
| `SidebarMenuSubItem` | `src/components/ui/sidebar.jsx` | Individual nested item (line 567) |
| `SidebarMenuSubButton` | `src/components/ui/sidebar.jsx` | Clickable nested item (line 570-592) |
| `Accordion` | `src/components/ui/accordion.jsx` | Alternative to Collapsible (more structure) |

**Existing Collapsible usage pattern:**
```javascript
// From OneOnOneComplianceCard.jsx - exact pattern to follow
<Collapsible open={expanded} onOpenChange={setExpanded}>
  <CollapsibleTrigger asChild>
    <Button variant="ghost" className="w-full flex items-center justify-between">
      <span>{expanded ? 'Hide' : 'Show'} details</span>
      {expanded ? <ChevronUp /> : <ChevronDown />}
    </Button>
  </CollapsibleTrigger>
  <CollapsibleContent className="space-y-2 pt-2">
    {items.map(item => (...))}
  </CollapsibleContent>
</Collapsible>
```

### 6. Existing @dnd-kit (src/components/sync/SubtaskList.jsx)

**Current state:** Used for subtask reordering in SubtaskList.jsx

**Integration for menu item drag-drop:**

```javascript
// Exact pattern from SubtaskList.jsx
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable';

// In MenuItemAssignment component
const sensors = useSensors(
  useSensor(PointerSensor),
  useSensor(KeyboardSensor, {
    coordinateGetter: sortableKeyboardCoordinates,
  })
);

const handleDragEnd = (event) => {
  const { active, over } = event;
  if (active.id !== over?.id) {
    // Move item to folder or reorder
    moveItemToFolder(active.id, over.id);
  }
};
```

## New Components Needed

### 1. NavigationContext.jsx (NEW)

**Location:** `src/contexts/NavigationContext.jsx`
**Purpose:** Centralize menu configuration state and operations

```javascript
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { UserSettings } from '@/api/entities';
import { useAuth } from '@/contexts/AuthContext';
import { logger } from '@/utils/logger';

// Default configurations (flat structure as fallback)
const DEFAULT_PEOPLE_CONFIG = {
  folders: [],
  items: [
    { id: 'tasks', name: 'Tasks', icon: 'CheckSquare', href: '/Tasks', folderId: null },
    { id: 'calendar', name: 'Calendar', icon: 'Calendar', href: '/Calendar', folderId: null },
    // ... all 16 items from peopleNavigation
  ]
};

const DEFAULT_PRODUCT_CONFIG = {
  folders: [],
  items: [
    { id: 'services', name: 'My Services', icon: 'Server', href: '/Services', folderId: null },
    // ... all 6 items from productNavigation
  ]
};

const NavigationContext = createContext(null);

export function NavigationProvider({ children }) {
  const { isAuthenticated } = useAuth();
  const [peopleConfig, setPeopleConfig] = useState(DEFAULT_PEOPLE_CONFIG);
  const [productConfig, setProductConfig] = useState(DEFAULT_PRODUCT_CONFIG);
  const [loading, setLoading] = useState(true);

  // Load configuration on auth
  useEffect(() => {
    if (isAuthenticated) {
      loadConfigs();
    }
  }, [isAuthenticated]);

  const loadConfigs = async () => {
    setLoading(true);
    try {
      const [peopleStr, productStr] = await Promise.all([
        UserSettings.get('menu_config_people'),
        UserSettings.get('menu_config_product')
      ]);

      if (peopleStr) setPeopleConfig(JSON.parse(peopleStr));
      if (productStr) setProductConfig(JSON.parse(productStr));
    } catch (err) {
      logger.error('Failed to load menu config', { error: String(err) });
    } finally {
      setLoading(false);
    }
  };

  const saveConfig = useCallback(async (mode, config) => {
    const key = mode === 'people' ? 'menu_config_people' : 'menu_config_product';
    await UserSettings.set(key, JSON.stringify(config));
  }, []);

  // Folder operations
  const createFolder = useCallback(async (mode, name) => {
    const config = mode === 'people' ? peopleConfig : productConfig;
    const setConfig = mode === 'people' ? setPeopleConfig : setProductConfig;

    const newFolder = {
      id: `folder-${Date.now()}`,
      name,
      order: config.folders.length
    };

    const newConfig = {
      ...config,
      folders: [...config.folders, newFolder]
    };

    setConfig(newConfig);
    await saveConfig(mode, newConfig);
    return newFolder;
  }, [peopleConfig, productConfig, saveConfig]);

  const moveItemToFolder = useCallback(async (mode, itemId, folderId) => {
    const config = mode === 'people' ? peopleConfig : productConfig;
    const setConfig = mode === 'people' ? setPeopleConfig : setProductConfig;

    const newConfig = {
      ...config,
      items: config.items.map(item =>
        item.id === itemId ? { ...item, folderId } : item
      )
    };

    setConfig(newConfig);
    await saveConfig(mode, newConfig);
  }, [peopleConfig, productConfig, saveConfig]);

  const value = {
    peopleConfig,
    productConfig,
    loading,
    createFolder,
    moveItemToFolder,
    // ... other operations
  };

  return (
    <NavigationContext.Provider value={value}>
      {children}
    </NavigationContext.Provider>
  );
}

export function useNavigation() {
  const context = useContext(NavigationContext);
  if (!context) {
    throw new Error('useNavigation must be used within NavigationProvider');
  }
  return context;
}
```

### 2. CollapsibleFolder.jsx (NEW)

**Location:** `src/components/navigation/CollapsibleFolder.jsx`
**Purpose:** Render a collapsible folder with nested navigation items

```javascript
import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ChevronDown, ChevronRight, Folder, FolderOpen } from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';

export function CollapsibleFolder({
  folder,
  items,
  isProductMode,
  onNavigate
}) {
  const [isOpen, setIsOpen] = useState(true); // Default open
  const location = useLocation();

  // Check if any child is active
  const hasActiveChild = items.some(item =>
    location.pathname === item.href ||
    location.pathname.startsWith(item.href + '/')
  );

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger className={cn(
        "w-full flex items-center px-4 py-2 text-sm font-medium rounded-md transition-colors",
        isProductMode
          ? hasActiveChild
            ? "bg-purple-900/30 text-purple-300"
            : "text-gray-400 hover:bg-gray-800 hover:text-gray-200"
          : hasActiveChild
            ? "bg-indigo-50/50 text-indigo-700"
            : "text-gray-600 hover:bg-gray-100"
      )}>
        {isOpen ? (
          <FolderOpen className="h-4 w-4 mr-2" />
        ) : (
          <Folder className="h-4 w-4 mr-2" />
        )}
        <span className="flex-1 text-left">{folder.name}</span>
        {isOpen ? (
          <ChevronDown className="h-4 w-4" />
        ) : (
          <ChevronRight className="h-4 w-4" />
        )}
      </CollapsibleTrigger>

      <CollapsibleContent>
        <div className="ml-4 mt-1 space-y-1 border-l border-gray-200 dark:border-gray-700 pl-2">
          {items.map((item) => {
            const Icon = item.iconComponent; // Pre-resolved icon
            const isActive = location.pathname === item.href;

            return (
              <Link
                key={item.id}
                to={item.href}
                onClick={onNavigate}
                className={cn(
                  "flex items-center px-3 py-2 text-sm rounded-md transition-colors",
                  isProductMode
                    ? isActive
                      ? "bg-purple-900/50 text-purple-300"
                      : "text-gray-300 hover:bg-gray-800 hover:text-white"
                    : isActive
                      ? "bg-indigo-50 text-indigo-700"
                      : "text-gray-700 hover:bg-gray-100"
                )}
              >
                <Icon className="h-4 w-4 mr-2" />
                {item.name}
              </Link>
            );
          })}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
```

### 3. HierarchicalNavigation.jsx (NEW)

**Location:** `src/components/navigation/HierarchicalNavigation.jsx`
**Purpose:** Orchestrate rendering of folders and standalone items

```javascript
import { Link, useLocation } from 'react-router-dom';
import { CollapsibleFolder } from './CollapsibleFolder';
import { cn } from '@/lib/utils';

// Icon mapping (move from Layout.jsx)
import * as Icons from 'lucide-react';

const ICON_MAP = {
  CheckSquare: Icons.CheckSquare,
  Calendar: Icons.Calendar,
  CalendarDays: Icons.CalendarDays,
  Folders: Icons.Folders,
  BarChart2: Icons.BarChart2,
  UserPlus: Icons.UserPlus,
  Users: Icons.Users,
  Github: Icons.Github,
  Bug: Icons.Bug,
  Server: Icons.Server,
  Map: Icons.Map,
  ListTodo: Icons.ListTodo,
  TrendingUp: Icons.TrendingUp,
  MessageSquare: Icons.MessageSquare,
  Rocket: Icons.Rocket,
  Inbox: Icons.Inbox,
  FileCode: Icons.FileCode,
  Search: Icons.Search,
  Activity: Icons.Activity,
};

export function HierarchicalNavigation({
  config,
  isProductMode,
  onNavigate
}) {
  const location = useLocation();
  const { folders, items } = config;

  // Resolve icon components
  const itemsWithIcons = items.map(item => ({
    ...item,
    iconComponent: ICON_MAP[item.icon] || Icons.Circle
  }));

  // Group items by folder
  const itemsByFolder = {};
  const standaloneItems = [];

  itemsWithIcons.forEach(item => {
    if (item.folderId) {
      if (!itemsByFolder[item.folderId]) {
        itemsByFolder[item.folderId] = [];
      }
      itemsByFolder[item.folderId].push(item);
    } else {
      standaloneItems.push(item);
    }
  });

  // Sort folders by order
  const sortedFolders = [...folders].sort((a, b) => a.order - b.order);

  return (
    <div className="space-y-1">
      {/* Render folders with their items */}
      {sortedFolders.map(folder => (
        <CollapsibleFolder
          key={folder.id}
          folder={folder}
          items={itemsByFolder[folder.id] || []}
          isProductMode={isProductMode}
          onNavigate={onNavigate}
        />
      ))}

      {/* Render standalone items (not in any folder) */}
      {standaloneItems.map(item => {
        const Icon = item.iconComponent;
        const isActive = location.pathname === item.href;

        return (
          <Link
            key={item.id}
            to={item.href}
            onClick={onNavigate}
            className={cn(
              "flex items-center px-4 py-3 text-sm font-medium rounded-md transition-colors",
              isProductMode
                ? isActive
                  ? "bg-purple-900/50 text-purple-300"
                  : "text-gray-300 hover:bg-gray-800 hover:text-white"
                : isActive
                  ? "bg-indigo-50 text-indigo-700"
                  : "text-gray-700 hover:bg-gray-100"
            )}
          >
            <Icon className="h-5 w-5 mr-3" />
            {item.name}
          </Link>
        );
      })}
    </div>
  );
}
```

### 4. NavigationSettings.jsx (NEW)

**Location:** `src/components/settings/NavigationSettings.jsx`
**Purpose:** Settings UI for folder management and item assignment

```javascript
import { useState } from 'react';
import { useNavigation } from '@/contexts/NavigationContext';
import { useAppMode } from '@/contexts/AppModeContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import { Plus, Folder, Trash2, Edit2, GripVertical } from 'lucide-react';

export default function NavigationSettings() {
  const { isProductMode } = useAppMode();
  const {
    peopleConfig,
    productConfig,
    createFolder,
    deleteFolder,
    renameFolder,
    moveItemToFolder,
    resetToDefaults
  } = useNavigation();

  const config = isProductMode ? productConfig : peopleConfig;
  const mode = isProductMode ? 'product' : 'people';

  const [showAddFolder, setShowAddFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [editingFolder, setEditingFolder] = useState(null);

  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) return;
    await createFolder(mode, newFolderName.trim());
    setNewFolderName('');
    setShowAddFolder(false);
  };

  // Group items by folder for display
  const itemsByFolder = {};
  const unassignedItems = [];

  config.items.forEach(item => {
    if (item.folderId) {
      if (!itemsByFolder[item.folderId]) {
        itemsByFolder[item.folderId] = [];
      }
      itemsByFolder[item.folderId].push(item);
    } else {
      unassignedItems.push(item);
    }
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Folder className="h-5 w-5" />
          Navigation Folders
        </CardTitle>
        <CardDescription>
          Organize your {isProductMode ? 'Product' : 'People'} mode navigation into folders
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Current mode indicator */}
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-500">Editing:</span>
          <Badge variant={isProductMode ? 'default' : 'secondary'}>
            {isProductMode ? 'Product Mode' : 'People Mode'}
          </Badge>
        </div>

        {/* Folders list */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium">Folders</h3>
            <Button size="sm" onClick={() => setShowAddFolder(true)}>
              <Plus className="h-4 w-4 mr-1" />
              Add Folder
            </Button>
          </div>

          {config.folders.length === 0 ? (
            <p className="text-sm text-gray-500 py-4 text-center border border-dashed rounded">
              No folders created. Add a folder to start organizing your navigation.
            </p>
          ) : (
            <div className="space-y-2">
              {config.folders.map(folder => (
                <div
                  key={folder.id}
                  className="p-3 border rounded-lg bg-gray-50"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Folder className="h-4 w-4 text-gray-500" />
                      <span className="font-medium">{folder.name}</span>
                      <Badge variant="outline" className="text-xs">
                        {(itemsByFolder[folder.id] || []).length} items
                      </Badge>
                    </div>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setEditingFolder(folder)}
                      >
                        <Edit2 className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => deleteFolder(mode, folder.id)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>

                  {/* Items in this folder */}
                  {(itemsByFolder[folder.id] || []).length > 0 && (
                    <div className="mt-2 pl-6 space-y-1">
                      {(itemsByFolder[folder.id] || []).map(item => (
                        <div
                          key={item.id}
                          className="flex items-center justify-between text-sm py-1"
                        >
                          <span>{item.name}</span>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => moveItemToFolder(mode, item.id, null)}
                            className="text-xs"
                          >
                            Remove
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Unassigned items */}
        <div className="space-y-2">
          <h3 className="text-sm font-medium">Unassigned Items</h3>
          <p className="text-xs text-gray-500">
            Click an item to assign it to a folder
          </p>

          <div className="flex flex-wrap gap-2">
            {unassignedItems.map(item => (
              <Badge
                key={item.id}
                variant="outline"
                className="cursor-pointer hover:bg-gray-100"
                // TODO: Open folder selection dropdown
              >
                {item.name}
              </Badge>
            ))}
          </div>
        </div>

        {/* Reset to defaults */}
        <div className="pt-4 border-t">
          <Button
            variant="outline"
            onClick={() => resetToDefaults(mode)}
            className="text-gray-600"
          >
            Reset to Default Navigation
          </Button>
        </div>
      </CardContent>

      {/* Add folder dialog */}
      <Dialog open={showAddFolder} onOpenChange={setShowAddFolder}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Folder</DialogTitle>
            <DialogDescription>
              Add a new folder to organize your navigation items
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Label htmlFor="folderName">Folder Name</Label>
            <Input
              id="folderName"
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              placeholder="e.g., Core Tasks, Team, Integrations"
              className="mt-2"
              onKeyDown={(e) => e.key === 'Enter' && handleCreateFolder()}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddFolder(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateFolder}>
              Create Folder
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
```

## Data Model

### Menu Configuration Structure

```typescript
interface MenuConfig {
  folders: Folder[];
  items: MenuItem[];
}

interface Folder {
  id: string;           // 'folder-{timestamp}'
  name: string;         // 'Core Tasks'
  order: number;        // 0, 1, 2... for folder ordering
  collapsed?: boolean;  // Optional: default collapse state
}

interface MenuItem {
  id: string;           // 'tasks', 'calendar', etc.
  name: string;         // 'Tasks'
  icon: string;         // 'CheckSquare' (icon name for mapping)
  href: string;         // '/Tasks'
  folderId: string | null;  // null = root level, 'folder-123' = in folder
  order?: number;       // Optional: ordering within folder
}
```

### Example Configuration (Stored in user_settings)

```json
{
  "folders": [
    { "id": "folder-1706500000000", "name": "Core Tasks", "order": 0 },
    { "id": "folder-1706500000001", "name": "Team", "order": 1 },
    { "id": "folder-1706500000002", "name": "Integrations", "order": 2 }
  ],
  "items": [
    { "id": "tasks", "name": "Tasks", "icon": "CheckSquare", "href": "/Tasks", "folderId": "folder-1706500000000" },
    { "id": "calendar", "name": "Calendar", "icon": "Calendar", "href": "/Calendar", "folderId": "folder-1706500000000" },
    { "id": "duties", "name": "Duties", "icon": "CalendarDays", "href": "/Duties", "folderId": "folder-1706500000000" },
    { "id": "team", "name": "Team", "icon": "UserPlus", "href": "/Team", "folderId": "folder-1706500000001" },
    { "id": "stakeholders", "name": "Stakeholders", "icon": "Users", "href": "/Stakeholders", "folderId": "folder-1706500000001" },
    { "id": "github", "name": "GitHub", "icon": "Github", "href": "/GitHub", "folderId": "folder-1706500000002" },
    { "id": "jira", "name": "Jira", "icon": "Bug", "href": "/Jira", "folderId": "folder-1706500000002" },
    { "id": "projects", "name": "Projects", "icon": "Folders", "href": "/Projects", "folderId": null },
    { "id": "metrics", "name": "Metrics", "icon": "BarChart2", "href": "/Metrics", "folderId": null }
  ]
}
```

### Storage Location

```
user_settings table:
  user_id: 'dev-user-001'
  setting_key: 'menu_config_people'
  setting_value: '{"folders":[...],"items":[...]}'
  encrypted: false
```

## Modified Components

### Layout.jsx Modifications

**File:** `src/pages/Layout.jsx`

**Changes:**
1. Import and wrap with NavigationProvider
2. Replace flat array rendering with HierarchicalNavigation
3. Keep mode switching logic unchanged

```javascript
// IMPORTS (add)
import { NavigationProvider, useNavigation } from '@/contexts/NavigationContext';
import { HierarchicalNavigation } from '@/components/navigation/HierarchicalNavigation';

// REPLACE flat array usage (lines 301-320) with:
const { peopleConfig, productConfig, loading: navLoading } = useNavigation();

// In render, replace navigation.map() block:
<nav className="flex-1 p-4 overflow-y-auto">
  {navLoading ? (
    <NavigationSkeleton />
  ) : (
    <HierarchicalNavigation
      config={isProductMode ? productConfig : peopleConfig}
      isProductMode={isProductMode}
      onNavigate={() => setSidebarOpen(false)}
    />
  )}
</nav>
```

### Settings.jsx Modifications

**File:** `src/pages/Settings.jsx`

**Changes:**
1. Add "navigation" to tabConfigs
2. Import and render NavigationSettings component

```javascript
// IMPORTS (add)
import NavigationSettings from '@/components/settings/NavigationSettings';
import { Menu } from 'lucide-react';

// tabConfigs (line 272, add before 'data')
{ id: "navigation", label: "Navigation", icon: Menu },

// TabsContent (add case around line 525)
{tab.id === 'navigation' && <NavigationSettings />}
```

### App.jsx or Main.jsx Modifications

**File:** Entry point that renders providers

**Changes:** Add NavigationProvider to provider stack

```javascript
// Ensure NavigationProvider is inside AuthProvider (needs auth state)
<AuthProvider>
  <NavigationProvider>
    <AppProvider>
      {/* ... */}
    </AppProvider>
  </NavigationProvider>
</AuthProvider>
```

## Suggested Build Order

**Phase 1: Data Model + Context**
1. Create NavigationContext.jsx with default configs
2. Add NavigationProvider to app provider stack
3. Verify UserSettings.get/set works for menu config keys
4. Test: Config loads/saves correctly

**Dependencies:** None
**Risk:** Low - uses existing UserSettingsService

**Phase 2: Hierarchical Rendering**
1. Create CollapsibleFolder.jsx component
2. Create HierarchicalNavigation.jsx component
3. Modify Layout.jsx to use HierarchicalNavigation
4. Verify folder collapse/expand works
5. Verify active item highlighting works within folders

**Dependencies:** Phase 1
**Risk:** Medium - modifies core Layout, needs careful testing

**Phase 3: Settings UI (Basic)**
1. Create NavigationSettings.jsx component
2. Add "Navigation" tab to Settings.jsx
3. Implement folder CRUD (create, rename, delete)
4. Implement item assignment (click to assign/unassign)
5. Implement reset to defaults

**Dependencies:** Phase 2
**Risk:** Low - isolated to settings page

**Phase 4: Settings UI (Enhanced - Optional)**
1. Add @dnd-kit drag-drop for item assignment
2. Add folder reordering via drag-drop
3. Add item reordering within folders
4. Persist collapse states to localStorage

**Dependencies:** Phase 3
**Risk:** Medium - @dnd-kit complexity, but pattern exists in SubtaskList

## Architecture Patterns

### Pattern 1: Context + UserSettings for Persistent UI Config

**What:** Store UI configuration in database via UserSettings, provide via React Context
**When:** User-customizable UI state that should persist across sessions
**Why this works:**
- UserSettingsService already handles key-value storage
- Context provides app-wide access without prop drilling
- JSON serialization allows complex nested structures

### Pattern 2: Collapsible + SidebarMenuSub for Nested Navigation

**What:** Combine Radix Collapsible with shadcn sidebar primitives
**When:** Hierarchical menu with expand/collapse
**Why this works:**
- Collapsible handles animation and state
- SidebarMenuSub provides proper indentation and styling
- Already installed, no new dependencies

### Pattern 3: Icon Name to Component Mapping

**What:** Store icon names as strings, map to Lucide components at render
**When:** Serialized config needs to reference React components
**Why this works:**
- JSON can't store React components
- Mapping table is explicit and type-safe
- Easy to extend with new icons

### Pattern 4: Optimistic Updates + Background Persist

**What:** Update local state immediately, save to backend asynchronously
**When:** UI responsiveness matters more than guaranteed persistence
**Why this works:**
- No loading spinner on every change
- Background save is fire-and-forget
- Reload restores from last saved state

## Anti-Patterns to Avoid

### Anti-Pattern 1: Storing Full Component References

**What:** Trying to serialize React components into JSON
**Why bad:** JSON.stringify fails on functions/components
**Instead:** Store icon name strings, map to components at render time

### Anti-Pattern 2: Prop Drilling Navigation Config

**What:** Passing menuConfig through Layout -> Sidebar -> NavItem
**Why bad:** Verbose, hard to update, components coupled
**Instead:** Use NavigationContext, consume with useNavigation() hook

### Anti-Pattern 3: Mutating Default Config

**What:** Directly modifying DEFAULT_PEOPLE_CONFIG object
**Why bad:** Shared reference, affects all users/sessions
**Instead:** Deep copy defaults when creating user config

### Anti-Pattern 4: Blocking UI on Save

**What:** await saveConfig() before allowing next interaction
**Why bad:** Perceived slowness, bad UX
**Instead:** Optimistic update, background persist, handle errors gracefully

### Anti-Pattern 5: Complex Nested State Updates

**What:** Deep spread operators for nested updates: `{...config, folders: {...config.folders, ...}}`
**Why bad:** Error-prone, hard to reason about
**Instead:** Use immer or functional update patterns with clear helper functions

## Scalability Considerations

| Concern | At 10 items | At 50 items | At 100+ items |
|---------|-------------|-------------|---------------|
| **Config load** | <10ms | <20ms | Add pagination to Settings UI |
| **Render** | Instant | Instant | Virtualize folder contents |
| **Settings UI** | Simple list | Add search/filter | Paginate unassigned items |
| **Save** | <100ms | <100ms | No issue (single JSON blob) |

## Technology Decisions

### Decision 1: User Settings vs Dedicated Table

**Choice:** user_settings table (existing)

**Rationale:**
- **Pros:** No migration needed, key-value flexibility, encryption available
- **Cons:** No query by config content, no relationships
- **Alternatives:** New `menu_configs` table with proper columns
- **When to reconsider:** If needing to query configs across users (e.g., admin view)

### Decision 2: Context vs Zustand for Menu State

**Choice:** React Context

**Rationale:**
- **Pros:** Already used throughout app (AuthContext, AppContext), no new dependency
- **Cons:** Requires provider hierarchy, potential re-render issues
- **Alternatives:** Zustand for simpler updates, Jotai for atomic state
- **When to reconsider:** If experiencing re-render performance issues

### Decision 3: Collapsible vs Accordion for Folders

**Choice:** Collapsible (per-folder independent state)

**Rationale:**
- **Pros:** Multiple folders can be open simultaneously, simpler state
- **Cons:** No built-in single-open mode
- **Alternatives:** Accordion forces single-open behavior
- **When to reconsider:** If users prefer single-open mode

## Sources

### Primary (HIGH confidence)
- `/Users/i306072/Documents/GitHub/P-E/src/pages/Layout.jsx` - Current navigation structure (lines 91-228)
- `/Users/i306072/Documents/GitHub/P-E/src/components/ui/sidebar.jsx` - SidebarMenuSub components (lines 554-592)
- `/Users/i306072/Documents/GitHub/P-E/src/components/ui/collapsible.jsx` - Radix Collapsible wrapper
- `/Users/i306072/Documents/GitHub/P-E/src/components/metrics/OneOnOneComplianceCard.jsx` - Collapsible usage pattern (lines 233-298)
- `/Users/i306072/Documents/GitHub/P-E/server/services/UserSettingsService.js` - Settings persistence pattern
- `/Users/i306072/Documents/GitHub/P-E/src/components/sync/SubtaskList.jsx` - @dnd-kit usage pattern

### Secondary (MEDIUM confidence)
- `/Users/i306072/Documents/GitHub/P-E/package.json` - Confirms @dnd-kit v6.3.1, @radix-ui/react-collapsible v1.1.3
- `/Users/i306072/Documents/GitHub/P-E/server/db/016_github_integration.sql` - user_settings table schema

### Tertiary (LOW confidence)
- None - all patterns verified against existing codebase
