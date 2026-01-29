# Phase 25: Frontend Foundation - Research

**Researched:** 2026-01-29
**Domain:** React Frontend State Management and UI Components
**Confidence:** HIGH

## Summary

Phase 25 builds the frontend foundation for TeamSync integration. This research examined the existing codebase patterns for contexts, API clients, routing, navigation, and UI components to ensure the new SyncContext and TeamSync page follow established patterns.

The project uses a well-defined architecture: contexts for state management (AppContext, NotificationContext patterns), apiClient.js with createEntityClient for API access, lazy-loaded pages via index.jsx routing, Layout.jsx for navigation, and shadcn/ui components (Radix UI primitives with Tailwind CSS). The backend sync API (Phase 24) provides all necessary endpoints.

**Primary recommendation:** Create SyncContext following NotificationContext patterns, extend apiClient.js with a custom sync client using existing patterns, add lazy-loaded TeamSync page to routing, and build Kanban UI using existing Card, Badge, and Tabs components.

## Standard Stack

The established libraries/tools for this phase:

### Core (Already in Project)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| React | 18.x | UI Library | Project standard |
| @radix-ui/react-tabs | - | Tabs primitive | Used in tabs.jsx |
| date-fns | - | Date formatting | Used in releaseCycles.js |
| lucide-react | - | Icons | Project standard |
| tailwindcss | - | Styling | Project standard |

### Supporting (Reuse Existing)
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| class-variance-authority | - | Badge variants | badge.jsx pattern |
| @/lib/utils cn() | - | Class merging | All component styling |

### No New Libraries Required
This phase uses only existing project dependencies. No new npm installations needed.

## Architecture Patterns

### Recommended Project Structure
```
src/
├── api/
│   ├── apiClient.js       # ADD: createSyncClient() with custom methods
│   └── entities.js        # ADD: SyncItem, Subtask, SyncSettings exports
├── contexts/
│   └── SyncContext.jsx    # NEW: SyncContext following NotificationContext pattern
├── pages/
│   ├── index.jsx          # MODIFY: Add TeamSync lazy import and route
│   ├── Layout.jsx         # MODIFY: Add TeamSync to peopleNavigation
│   └── TeamSync.jsx       # NEW: Main page with Kanban board
└── components/
    └── sync/              # NEW: Sync-specific components
        ├── SyncItemCard.jsx       # Card component for Kanban columns
        ├── TeamDepartmentTabs.jsx # Tab filtering (All/Metering/Reporting)
        └── KanbanBoard.jsx        # 4-column Kanban layout
```

### Pattern 1: Context Pattern (Based on NotificationContext)
**What:** State management for sync items with CRUD operations and computed values
**When to use:** For SyncContext providing sync items state to the app
**Example:**
```javascript
// Source: src/contexts/NotificationContext.jsx pattern
import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { SyncItem } from '@/api/entities';
import { useAuth } from '@/contexts/AuthContext';

const SyncContext = createContext(null);

export function SyncProvider({ children }) {
  const [items, setItems] = useState([]);
  const [currentTeam, setCurrentTeam] = useState('all');
  const [archivedCount, setArchivedCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const { isAuthenticated } = useAuth();

  // CTX-02: Computed grouping by category
  const itemsByCategory = useMemo(() => {
    return items.reduce((acc, item) => {
      const category = item.category || 'uncategorized';
      if (!acc[category]) acc[category] = [];
      acc[category].push(item);
      return acc;
    }, {});
  }, [items]);

  const refresh = useCallback(async () => {
    if (!isAuthenticated) {
      setItems([]);
      setArchivedCount(0);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const filters = currentTeam !== 'all'
        ? { teamDepartment: currentTeam }
        : {};
      const [itemList, countResult] = await Promise.all([
        SyncItem.list(filters),
        SyncItem.getArchivedCount(),
      ]);
      setItems(itemList);
      setArchivedCount(countResult.count);
    } catch (error) {
      console.error('Failed to fetch sync items:', error);
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, currentTeam]);

  // CRUD operations following NotificationContext patterns...
  // ...

  return (
    <SyncContext.Provider value={value}>
      {children}
    </SyncContext.Provider>
  );
}

export function useSync() {
  const context = useContext(SyncContext);
  if (!context) {
    throw new Error('useSync must be used within a SyncProvider');
  }
  return context;
}
```

### Pattern 2: API Client Pattern (Based on apiClient.js)
**What:** Custom entity client with extended methods for nested resources
**When to use:** For SyncItem client needing subtask operations
**Example:**
```javascript
// Source: src/api/apiClient.js createDevOpsDutyClient() pattern
function createSyncItemClient() {
  const baseClient = createEntityClient('/sync');

  return {
    ...baseClient,

    // List with optional filters (category, teamDepartment, archived)
    async list(filters = {}) {
      const params = new URLSearchParams();
      if (filters.category) params.append('category', filters.category);
      if (filters.teamDepartment) params.append('teamDepartment', filters.teamDepartment);
      if (filters.archived) params.append('archived', 'true');
      const queryString = params.toString();
      const url = `${API_BASE_URL}/sync${queryString ? '?' + queryString : ''}`;
      return fetchWithAuth(url);
    },

    // Archive operations
    async getArchived(filters = {}) {
      const params = new URLSearchParams();
      if (filters.from_date) params.append('from_date', filters.from_date);
      if (filters.to_date) params.append('to_date', filters.to_date);
      const queryString = params.toString();
      return fetchWithAuth(`${API_BASE_URL}/sync/archived${queryString ? '?' + queryString : ''}`);
    },

    async getArchivedCount() {
      return fetchWithAuth(`${API_BASE_URL}/sync/archived/count`);
    },

    async restore(id) {
      return fetchWithAuth(`${API_BASE_URL}/sync/${id}/restore`, {
        method: 'PUT',
      });
    },

    // Subtask operations (nested resource)
    async listSubtasks(itemId) {
      return fetchWithAuth(`${API_BASE_URL}/sync/${itemId}/subtasks`);
    },

    async createSubtask(itemId, data) {
      return fetchWithAuth(`${API_BASE_URL}/sync/${itemId}/subtasks`, {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },

    async updateSubtask(itemId, subtaskId, updates) {
      return fetchWithAuth(`${API_BASE_URL}/sync/${itemId}/subtasks/${subtaskId}`, {
        method: 'PUT',
        body: JSON.stringify(updates),
      });
    },

    async deleteSubtask(itemId, subtaskId) {
      await fetchWithAuth(`${API_BASE_URL}/sync/${itemId}/subtasks/${subtaskId}`, {
        method: 'DELETE',
      });
      return true;
    },

    async reorderSubtasks(itemId, orderedSubtaskIds) {
      return fetchWithAuth(`${API_BASE_URL}/sync/${itemId}/subtasks/reorder`, {
        method: 'PUT',
        body: JSON.stringify({ orderedSubtaskIds }),
      });
    },
  };
}

// Settings client
function createSyncSettingsClient() {
  return {
    async get() {
      return fetchWithAuth(`${API_BASE_URL}/sync/settings`);
    },

    async update(data) {
      return fetchWithAuth(`${API_BASE_URL}/sync/settings`, {
        method: 'PUT',
        body: JSON.stringify(data),
      });
    },
  };
}
```

### Pattern 3: Page Registration Pattern (Based on index.jsx)
**What:** Lazy loading with error boundary and route registration
**When to use:** Adding new TeamSync page
**Example:**
```javascript
// Source: src/pages/index.jsx
// Step 1: Import with retry mechanism
const TeamSync = lazy(() => retryImport(() => import(/* webpackChunkName: "pages-teamsync" */ "./TeamSync"), 3, 1000));

// Step 2: Add to PAGES object
const PAGES = {
    // ... existing pages
    TeamSync: TeamSync,
}

// Step 3: Add route (before generic routes like /:id)
<Route path="/teamsync" element={<TeamSync />} />
```

### Pattern 4: Navigation Pattern (Based on Layout.jsx)
**What:** Adding navigation items to the sidebar
**When to use:** Adding TeamSync to peopleNavigation array
**Example:**
```javascript
// Source: src/pages/Layout.jsx
const peopleNavigation = [
    // ... existing items
    {
      name: "Team Sync",
      icon: Users,  // Or another appropriate lucide icon
      href: createPageUrl("TeamSync"),
      current: currentPageName === "TeamSync"
    },
    // Position it logically (after Team, before GitHub)
];
```

### Pattern 5: Kanban Column Layout (Flex-based)
**What:** 4-column grid layout for Kanban categories
**When to use:** Displaying sync items by category
**Example:**
```jsx
// Based on project's Card/Grid patterns
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
  {CATEGORIES.map(category => (
    <div key={category.id} className="flex flex-col">
      <div className="flex items-center justify-between mb-2">
        <h3 className="font-semibold text-sm uppercase tracking-wide text-gray-600">
          {category.label}
        </h3>
        <Badge variant="secondary">{itemsByCategory[category.id]?.length || 0}</Badge>
      </div>
      <div className="space-y-3 flex-1">
        {(itemsByCategory[category.id] || []).map(item => (
          <SyncItemCard key={item.id} item={item} />
        ))}
      </div>
    </div>
  ))}
</div>
```

### Anti-Patterns to Avoid
- **Direct API calls in components:** Use SyncContext, not direct apiClient calls
- **State in page components:** Lift state to SyncContext for sharing
- **Hardcoded constants:** Export from SyncContext (CTX-05)
- **Missing loading states:** Always show loading skeleton during fetches
- **Missing error boundaries:** Wrap page in PageChunkErrorBoundary

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Tab filtering | Custom tabs | @radix-ui/react-tabs via ui/tabs.jsx | Accessibility, keyboard nav |
| Badge styling | Inline styles | Badge component with variants | Consistent look, variant system |
| Loading state | Custom spinner | Loader2 from lucide-react | Consistent with BugDashboard |
| Card layouts | Div soup | Card, CardHeader, CardContent | Consistent styling |
| Status badges | Custom spans | Badge with getStatusBadge pattern | From Projects.jsx |
| Date formatting | Manual | date-fns format() | Already used throughout |
| Sprint data | Custom calculation | releaseCycles.js utilities | getCurrentCycle(), etc. |

**Key insight:** Every UI pattern needed for Phase 25 already exists in the codebase. The goal is consistency with existing patterns, not innovation.

## Common Pitfalls

### Pitfall 1: Context Provider Order
**What goes wrong:** SyncContext cannot access auth state
**Why it happens:** Provider not wrapped inside AuthProvider
**How to avoid:** Add SyncProvider inside NotificationProvider in main.jsx
**Warning signs:** "useAuth must be used within AuthProvider" error

### Pitfall 2: Route Order in index.jsx
**What goes wrong:** /teamsync route never matches
**Why it happens:** Generic /:id route captures it first
**How to avoid:** Add specific routes BEFORE parametric routes
**Warning signs:** 404 or wrong page renders

### Pitfall 3: Missing Query Param Mapping
**What goes wrong:** API 400 errors on filter requests
**Why it happens:** Backend expects snake_case (team_department), frontend sends camelCase (teamDepartment)
**How to avoid:** API client maps camelCase params to snake_case (already done in sync.js route)
**Warning signs:** "Invalid parameter" errors from backend

### Pitfall 4: Stale Closure in useCallback
**What goes wrong:** Refresh fetches with wrong team filter
**Why it happens:** currentTeam captured at creation, not updated
**How to avoid:** Include currentTeam in useCallback dependency array
**Warning signs:** Filter changes don't affect data

### Pitfall 5: Missing Array Safety
**What goes wrong:** Runtime errors on undefined.map()
**Why it happens:** API returns null/undefined instead of empty array
**How to avoid:** Default to empty array: `(items || []).map(...)`
**Warning signs:** "Cannot read property 'map' of undefined"

## Code Examples

Verified patterns from the codebase:

### SyncItemCard Component
```jsx
// Based on: src/components/task/TaskCard.jsx and src/pages/Projects.jsx
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { User, ListChecks } from "lucide-react";

const STATUS_COLORS = {
  not_started: "bg-gray-100 text-gray-800",
  in_progress: "bg-blue-100 text-blue-800",
  blocked: "bg-red-100 text-red-800",
  done: "bg-green-100 text-green-800",
};

const STATUS_LABELS = {
  not_started: "Not Started",
  in_progress: "In Progress",
  blocked: "Blocked",
  done: "Done",
};

export function SyncItemCard({ item, onClick }) {
  const subtaskCount = item.subtask_count || 0;

  return (
    <Card
      className="shadow-sm hover:shadow-md transition-shadow cursor-pointer"
      onClick={() => onClick?.(item)}
    >
      <CardHeader className="pb-2">
        <CardTitle className="text-base line-clamp-2">{item.name}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-2 flex-wrap">
          {/* Status Badge (UI-04) */}
          <Badge className={STATUS_COLORS[item.sync_status] || STATUS_COLORS.not_started}>
            {STATUS_LABELS[item.sync_status] || "Not Started"}
          </Badge>

          {/* Assignee Name (UI-04) */}
          {item.assigned_to_name && (
            <Badge variant="outline" className="flex items-center gap-1">
              <User className="h-3 w-3" />
              {item.assigned_to_name}
            </Badge>
          )}

          {/* Subtask Count (UI-04) */}
          {subtaskCount > 0 && (
            <Badge variant="secondary" className="flex items-center gap-1">
              <ListChecks className="h-3 w-3" />
              {subtaskCount}
            </Badge>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
```

### TeamDepartmentTabs Component
```jsx
// Based on: src/components/ui/tabs.jsx
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TEAM_DEPARTMENTS } from "@/contexts/SyncContext";

export function TeamDepartmentTabs({ value, onValueChange }) {
  return (
    <Tabs value={value} onValueChange={onValueChange}>
      <TabsList>
        {TEAM_DEPARTMENTS.map(dept => (
          <TabsTrigger key={dept.id} value={dept.id}>
            {dept.label}
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  );
}
```

### Constants Export Pattern (CTX-05)
```javascript
// In SyncContext.jsx
export const TEAM_DEPARTMENTS = [
  { id: 'all', label: 'All Teams' },
  { id: 'metering', label: 'Metering' },
  { id: 'reporting', label: 'Reporting' },
];

export const CATEGORIES = [
  { id: 'goal', label: 'Goals' },
  { id: 'blocker', label: 'Blockers' },
  { id: 'dependency', label: 'Dependencies' },
  { id: 'emphasis', label: 'Emphasis' },
];

export const SYNC_STATUSES = [
  { id: 'not_started', label: 'Not Started' },
  { id: 'in_progress', label: 'In Progress' },
  { id: 'blocked', label: 'Blocked' },
  { id: 'done', label: 'Done' },
];
```

### entities.js Export Pattern
```javascript
// In src/api/entities.js - add after existing exports
// TeamSync Integration (v1.6)
export const SyncItem = USE_API ? apiClient.entities.SyncItem : {
  list: async () => { throw new Error('Sync not available in local mode'); },
  get: async () => { throw new Error('Sync not available in local mode'); },
  create: async () => { throw new Error('Sync not available in local mode'); },
  update: async () => { throw new Error('Sync not available in local mode'); },
  delete: async () => { throw new Error('Sync not available in local mode'); },
  getArchived: async () => { throw new Error('Sync not available in local mode'); },
  getArchivedCount: async () => { throw new Error('Sync not available in local mode'); },
  restore: async () => { throw new Error('Sync not available in local mode'); },
  listSubtasks: async () => { throw new Error('Sync not available in local mode'); },
  createSubtask: async () => { throw new Error('Sync not available in local mode'); },
  updateSubtask: async () => { throw new Error('Sync not available in local mode'); },
  deleteSubtask: async () => { throw new Error('Sync not available in local mode'); },
  reorderSubtasks: async () => { throw new Error('Sync not available in local mode'); },
};

export const SyncSettings = USE_API ? apiClient.sync.settings : {
  get: async () => { throw new Error('Sync settings not available in local mode'); },
  update: async () => { throw new Error('Sync settings not available in local mode'); },
};
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Class components | Functional with hooks | React 16.8 | All new code uses hooks |
| Redux | React Context | Project inception | Simpler state management |
| CSS modules | Tailwind CSS | Project inception | Utility-first styling |

**Project conventions:**
- All contexts use functional components with hooks
- useMemo for computed values (itemsByCategory)
- useCallback for stable function references
- Optimistic updates for responsive UI (see NotificationContext)

## Open Questions

Things that couldn't be fully resolved:

1. **Subtask count in list response**
   - What we know: SyncItemService.list() joins team_members for assigned_to_name
   - What's unclear: Does it include subtask_count? Need to check SQL or add it
   - Recommendation: Check backend SQL, add COUNT subquery if missing

2. **Initial team filter state**
   - What we know: currentTeam defaults to 'all'
   - What's unclear: Should it persist across sessions (localStorage)?
   - Recommendation: Keep it simple for Phase 25, add persistence later if needed

## Sources

### Primary (HIGH confidence)
- src/contexts/NotificationContext.jsx - Context pattern reference
- src/contexts/AppContext.jsx - Multi-entity context pattern
- src/api/apiClient.js - API client patterns (createEntityClient, fetchWithAuth)
- src/api/entities.js - Entity export patterns
- src/pages/index.jsx - Routing and lazy loading patterns
- src/pages/Layout.jsx - Navigation patterns
- src/pages/BugDashboard.jsx - Filter UI patterns
- src/pages/Projects.jsx - Card grid and badge patterns
- src/components/ui/tabs.jsx - Radix tabs component
- src/components/ui/badge.jsx - Badge variants
- src/components/task/TaskCard.jsx - Card component patterns
- src/utils/releaseCycles.js - Sprint data utilities
- server/routes/sync.js - Backend API contract
- server/services/SyncItemService.js - Data model and query patterns

### Secondary (MEDIUM confidence)
- src/main.jsx - Context provider ordering

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - all libraries already in project
- Architecture: HIGH - patterns extracted from existing codebase
- Pitfalls: HIGH - derived from actual code patterns and common React issues

**Research date:** 2026-01-29
**Valid until:** 30 days (stable patterns, internal codebase)
