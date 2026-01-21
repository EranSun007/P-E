# Phase 5: Web App Integration - Research

**Researched:** 2026-01-21
**Domain:** React frontend integration for Jira data visualization
**Confidence:** HIGH

## Summary

This research documents the existing patterns in the P&E Manager codebase for adding a new Jira Issues page. The codebase follows well-established patterns for:
1. Page routing with lazy loading
2. Entity client creation for API access
3. Filter component composition
4. Data aggregation and grouping views

The integration requires creating new frontend components that follow existing conventions exactly. The backend API (Phase 1) is already complete with endpoints for `/api/jira-issues`, `/api/jira-issues/sync`, and `/api/jira-mappings`.

**Primary recommendation:** Follow the established GitHubRepos page pattern as the closest analog - it handles external data sync, status indicators, and tabular data display.

## Standard Stack

The established libraries/tools already in use:

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| React | 18.x | UI framework | Already in use |
| react-router-dom | 7.x | Routing | Already in use |
| @radix-ui/* | Latest | UI primitives | shadcn/ui foundation |
| Tailwind CSS | 3.x | Styling | Already in use |
| lucide-react | Latest | Icons | Already in use |

### UI Components (Already Available)
| Component | Import Path | Purpose |
|-----------|-------------|---------|
| Card | @/components/ui/card | Container layouts |
| Table | @/components/ui/table | Data tables |
| Badge | @/components/ui/badge | Status indicators |
| Select | @/components/ui/select | Dropdowns |
| Input | @/components/ui/input | Search fields |
| Button | @/components/ui/button | Actions |
| Tabs | @/components/ui/tabs | View switching |
| Dialog | @/components/ui/dialog | Modals |
| Alert | @/components/ui/alert | Error messages |
| DropdownMenu | @/components/ui/dropdown-menu | Filter menus |

### No Additional Libraries Needed
The codebase has all required UI components. Do NOT add new dependencies.

## Architecture Patterns

### Pattern 1: Adding a New Page

**Step 1:** Create the page component in `src/pages/`:
```jsx
// src/pages/JiraIssues.jsx
import { useState, useEffect } from "react";
import { JiraIssue } from "@/api/entities";
// ... component code
export default function JiraIssuesPage() { ... }
```

**Step 2:** Register in `src/pages/index.jsx`:
```jsx
// Add lazy import
const JiraIssues = lazy(() => retryImport(() =>
  import(/* webpackChunkName: "pages-jira-issues" */ "./JiraIssues"), 3, 1000));

// Add to PAGES object
const PAGES = {
  // ... existing pages
  JiraIssues: JiraIssues,
};

// Add Route
<Route path="/JiraIssues" element={<JiraIssues />} />
```

**Step 3:** Add to navigation in `src/pages/Layout.jsx`:
```jsx
const peopleNavigation = [
  // ... existing items
  {
    name: "Jira Issues",
    icon: Bug, // from lucide-react
    href: createPageUrl("JiraIssues"),
    current: currentPageName === "JiraIssues"
  }
];
```

### Pattern 2: Entity Client for JiraIssue

**Location:** `src/api/apiClient.js`

Add to entities object:
```javascript
JiraIssue: {
  ...createEntityClient('/jira-issues'),

  // Custom methods matching backend API
  async sync() {
    return fetchWithAuth(`${API_BASE_URL}/jira-issues/sync`, {
      method: 'POST',
    });
  },

  async listWithFilters(filters = {}) {
    const params = new URLSearchParams();
    if (filters.status) params.append('status', filters.status);
    if (filters.assignee) params.append('assignee', filters.assignee);
    if (filters.sprint) params.append('sprint', filters.sprint);
    const url = `${API_BASE_URL}/jira-issues${params.toString() ? '?' + params : ''}`;
    return fetchWithAuth(url);
  }
},

JiraMapping: createEntityClient('/jira-mappings'),
```

**Location:** `src/api/entities.js`

Add exports:
```javascript
// Jira Integration API (only available with API mode)
export const JiraIssue = USE_API ? apiClient.entities.JiraIssue : {
  list: async () => { throw new Error('Jira integration not available in local mode'); },
  sync: async () => { throw new Error('Jira integration not available in local mode'); },
  // ... other methods
};

export const JiraMapping = USE_API ? apiClient.entities.JiraMapping : {
  list: async () => { throw new Error('Jira mapping not available in local mode'); },
  // ...
};
```

### Pattern 3: Page Component Structure

Following GitHubRepos.jsx and Tasks.jsx patterns:

```jsx
export default function JiraIssuesPage() {
  // State management
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [issues, setIssues] = useState([]);
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState({
    status: [],
    assignee: [],
    sprint: null
  });

  // Load data on mount
  useEffect(() => {
    loadIssues();
  }, []);

  // Filter handler
  const loadIssues = async () => { ... };

  // Render structure
  return (
    <div className="p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header with title and action buttons */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          ...
        </div>

        {/* Error alert if any */}
        {error && <Alert variant="destructive">...</Alert>}

        {/* Loading state */}
        {loading ? <LoadingSpinner /> : (
          <>
            {/* Summary cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">...</div>

            {/* Filter bar */}
            <JiraFilterBar filters={filters} setFilters={setFilters} />

            {/* Main content */}
            <div className="...">...</div>
          </>
        )}
      </div>
    </div>
  );
}
```

### Pattern 4: Filter Component (TaskFilterBar Pattern)

```jsx
// src/components/jira/JiraFilterBar.jsx
export default function JiraFilterBar({ filters, setFilters, availableStatuses, availableAssignees, availableSprints }) {
  const toggleFilter = (filterType, value) => {
    const currentFilters = filters[filterType] || [];
    setFilters(prev => ({
      ...prev,
      [filterType]: currentFilters.includes(value)
        ? currentFilters.filter(item => item !== value)
        : [...currentFilters, value]
    }));
  };

  return (
    <div className="mb-6 space-y-4">
      <div className="flex flex-col sm:flex-row gap-3">
        {/* Search input */}
        <div className="relative flex-grow">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input placeholder="Search issues..." className="pl-9" />
        </div>

        {/* Dropdown filters */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline">
              <Filter className="h-4 w-4 mr-2" />
              Filters
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            {/* Status checkboxes */}
            {/* Assignee checkboxes */}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Sprint select */}
        <Select value={filters.sprint} onValueChange={(v) => setFilters(prev => ({...prev, sprint: v}))}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="All Sprints" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Sprints</SelectItem>
            {availableSprints.map(sprint => (
              <SelectItem key={sprint} value={sprint}>{sprint}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
```

### Pattern 5: Workload Aggregation View (Team.jsx Pattern)

Group issues by assignee and calculate totals:

```jsx
// In JiraIssuesPage.jsx or separate component
const workloadByAssignee = React.useMemo(() => {
  const groups = {};

  issues.forEach(issue => {
    const assignee = issue.assignee_name || 'Unassigned';
    if (!groups[assignee]) {
      groups[assignee] = {
        assignee,
        issues: [],
        totalPoints: 0
      };
    }
    groups[assignee].issues.push(issue);
    groups[assignee].totalPoints += issue.story_points || 0;
  });

  return Object.values(groups).sort((a, b) => b.totalPoints - a.totalPoints);
}, [issues]);

// Render as accordion or cards
{workloadByAssignee.map(group => (
  <Card key={group.assignee}>
    <CardHeader>
      <CardTitle className="flex items-center justify-between">
        <span>{group.assignee}</span>
        <Badge>{group.totalPoints} pts</Badge>
      </CardTitle>
    </CardHeader>
    <CardContent>
      <div className="space-y-2">
        {group.issues.map(issue => <IssueRow key={issue.id} issue={issue} />)}
      </div>
    </CardContent>
  </Card>
))}
```

### Pattern 6: Sync Status Indicator

Following GitHubRepos pattern for last-synced display:

```jsx
// Time ago utility (already exists in GitHubRepos)
const formatTimeAgo = (dateStr) => {
  if (!dateStr) return "-";
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 30) return `${diffDays}d ago`;
  return formatDate(dateStr);
};

// Usage
<p className="text-xs text-gray-400 flex items-center gap-1">
  <Clock className="h-3 w-3" />
  Last synced: {formatTimeAgo(syncStatus?.last_synced_at)}
</p>
```

### Pattern 7: External Link (Open in Jira)

```jsx
// Following GitHubRepos external link pattern
<a
  href={issue.url}
  target="_blank"
  rel="noopener noreferrer"
  className="text-blue-600 hover:underline inline-flex items-center gap-1"
>
  {issue.issue_key}
  <ExternalLink className="h-3 w-3" />
</a>
```

### Pattern 8: Assignee Mapping Dialog

For linking Jira assignees to team members:

```jsx
// src/components/jira/AssigneeMappingDialog.jsx
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function AssigneeMappingDialog({
  open,
  onOpenChange,
  jiraAssignees,
  teamMembers,
  mappings,
  onSaveMapping
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Link Jira Assignees to Team Members</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          {jiraAssignees.map(assignee => (
            <div key={assignee} className="flex items-center justify-between gap-4">
              <span className="text-sm font-medium">{assignee}</span>
              <Select
                value={mappings[assignee] || ''}
                onValueChange={(v) => onSaveMapping(assignee, v)}
              >
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Select team member" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Not linked</SelectItem>
                  {teamMembers.map(member => (
                    <SelectItem key={member.id} value={member.id}>
                      {member.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ))}
        </div>
        <DialogFooter>
          <Button onClick={() => onOpenChange(false)}>Done</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

### Recommended Project Structure

```
src/
├── api/
│   ├── apiClient.js        # Add JiraIssue entity client
│   └── entities.js         # Export JiraIssue, JiraMapping
├── components/
│   └── jira/               # NEW: Jira-specific components
│       ├── JiraFilterBar.jsx
│       ├── JiraIssueRow.jsx
│       ├── JiraWorkloadView.jsx
│       ├── AssigneeMappingDialog.jsx
│       └── SyncStatusIndicator.jsx
└── pages/
    ├── index.jsx           # Add route registration
    ├── Layout.jsx          # Add navigation item
    └── JiraIssues.jsx      # NEW: Main page component
```

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Dropdown filters | Custom filter UI | DropdownMenuCheckboxItem from @/components/ui/dropdown-menu | Matches existing TaskFilterBar |
| Data tables | Custom table rendering | Table components from @/components/ui/table | Consistent styling |
| Modal dialogs | Custom modal | Dialog from @/components/ui/dialog | Radix accessibility |
| Loading states | Custom spinners | Pattern from GitHubRepos (Loader2 with animate-spin) | Consistent UX |
| Time formatting | Custom date utils | formatTimeAgo from GitHubRepos | Already implemented |
| Empty states | Custom empty UI | Pattern from Team.jsx empty state | Consistent design |

**Key insight:** The codebase has mature, tested UI patterns. Copying existing implementations ensures consistency and avoids bugs.

## Common Pitfalls

### Pitfall 1: Not Using Lazy Loading
**What goes wrong:** Bundle size increases, slower initial load
**Why it happens:** Forgetting to wrap new page in lazy()
**How to avoid:** Always add pages using the retryImport pattern in index.jsx
**Warning signs:** Page component imported directly instead of via lazy()

### Pitfall 2: Missing Error Boundaries
**What goes wrong:** Page crashes show blank screen
**Why it happens:** Not wrapping page in PageChunkErrorBoundary
**How to avoid:** Use existing Route structure in index.jsx (already has error boundary)
**Warning signs:** Uncaught errors crashing the app

### Pitfall 3: Inconsistent Filter State
**What goes wrong:** Filters reset or behave unexpectedly
**Why it happens:** Not following TaskFilterBar's safeFilters pattern
**How to avoid:** Always provide default values and type-check arrays
**Warning signs:** "Cannot read property of undefined" errors

### Pitfall 4: Not Handling Empty/Loading States
**What goes wrong:** Blank screens or poor UX during loading
**Why it happens:** Missing conditional rendering
**How to avoid:** Follow GitHubRepos pattern: loading spinner, empty state, data view
**Warning signs:** UI flashes or shows undefined

### Pitfall 5: External Links Not Opening Correctly
**What goes wrong:** Links don't open in new tab or are blocked
**Why it happens:** Missing target="_blank" or rel attributes
**How to avoid:** Always use `target="_blank" rel="noopener noreferrer"`
**Warning signs:** Browser security warnings or same-tab navigation

### Pitfall 6: Navigation Not Updated
**What goes wrong:** Page accessible but not in sidebar
**Why it happens:** Forgetting to add to Layout.jsx navigation array
**How to avoid:** Update all three locations: page file, index.jsx routes, Layout.jsx nav
**Warning signs:** Page works via URL but no way to navigate to it

## Code Examples

### Complete Page Header Pattern
```jsx
// Source: GitHubRepos.jsx pattern
<div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
  <div>
    <h1 className="text-3xl font-bold flex items-center gap-2">
      <Bug className="h-8 w-8" />
      Jira Issues
    </h1>
    <p className="text-gray-500 mt-1">
      View and manage synced Jira issues
    </p>
  </div>
  <div className="flex gap-2">
    <Button variant="outline" onClick={handleSync} disabled={syncing}>
      {syncing ? (
        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
      ) : (
        <RefreshCw className="h-4 w-4 mr-2" />
      )}
      Sync Now
    </Button>
    <Button onClick={() => setShowMappingDialog(true)}>
      <Users className="h-4 w-4 mr-2" />
      Link Assignees
    </Button>
  </div>
</div>
```

### Complete Table Row Pattern
```jsx
// Source: GitHubRepos.jsx table pattern
<TableRow key={issue.id}>
  <TableCell>
    <a
      href={issue.url}
      target="_blank"
      rel="noopener noreferrer"
      className="text-blue-600 hover:underline"
    >
      {issue.issue_key}
    </a>
    <div className="text-sm text-gray-500 truncate max-w-xs">
      {issue.summary}
    </div>
  </TableCell>
  <TableCell>
    <Badge
      variant="outline"
      className={
        issue.status === "Done"
          ? "bg-green-100 text-green-800"
          : issue.status === "In Progress"
          ? "bg-blue-100 text-blue-800"
          : "bg-gray-100 text-gray-800"
      }
    >
      {issue.status}
    </Badge>
  </TableCell>
  <TableCell>
    <div className="flex items-center gap-2">
      <span className="text-sm">{issue.assignee_name || 'Unassigned'}</span>
    </div>
  </TableCell>
  <TableCell className="text-right">
    <Badge variant="secondary">{issue.story_points || 0} pts</Badge>
  </TableCell>
</TableRow>
```

### Summary Cards Pattern
```jsx
// Source: GitHubRepos.jsx summary cards
<div className="grid grid-cols-2 md:grid-cols-4 gap-4">
  <Card>
    <CardContent className="pt-6">
      <div className="text-2xl font-bold">{summary.total_issues}</div>
      <p className="text-sm text-gray-500">Total Issues</p>
    </CardContent>
  </Card>
  <Card>
    <CardContent className="pt-6">
      <div className="text-2xl font-bold text-blue-600">{summary.in_progress}</div>
      <p className="text-sm text-gray-500">In Progress</p>
    </CardContent>
  </Card>
  <Card>
    <CardContent className="pt-6">
      <div className="text-2xl font-bold text-green-600">{summary.done}</div>
      <p className="text-sm text-gray-500">Done</p>
    </CardContent>
  </Card>
  <Card>
    <CardContent className="pt-6">
      <div className="text-2xl font-bold text-purple-600">{summary.total_points}</div>
      <p className="text-sm text-gray-500">Total Points</p>
    </CardContent>
  </Card>
</div>
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Class components | Functional components with hooks | React 16.8+ | All pages use hooks |
| Redux | React Context + local state | Current pattern | AppContext for shared state |
| CSS modules | Tailwind CSS | Current pattern | Utility-first styling |
| Manual routing | React Router v7 lazy routes | Current | Better code splitting |

**Current in codebase:**
- All components are functional with hooks
- State management via useState/useEffect + AppContext for shared data
- Radix UI primitives wrapped in shadcn/ui components
- Lazy loading for all pages

## Open Questions

None - the patterns are clear and well-established in the codebase. The implementation should follow existing patterns exactly.

## Sources

### Primary (HIGH confidence)
- `/Users/i306072/Documents/GitHub/P-E/src/pages/index.jsx` - Routing and lazy loading pattern
- `/Users/i306072/Documents/GitHub/P-E/src/pages/GitHubRepos.jsx` - Closest analog for external data integration
- `/Users/i306072/Documents/GitHub/P-E/src/pages/Tasks.jsx` - Filter and list pattern
- `/Users/i306072/Documents/GitHub/P-E/src/pages/Team.jsx` - Grouping/aggregation pattern
- `/Users/i306072/Documents/GitHub/P-E/src/pages/Layout.jsx` - Navigation integration
- `/Users/i306072/Documents/GitHub/P-E/src/api/apiClient.js` - Entity client pattern
- `/Users/i306072/Documents/GitHub/P-E/src/api/entities.js` - Entity export pattern
- `/Users/i306072/Documents/GitHub/P-E/src/components/task/TaskFilterBar.jsx` - Filter component pattern
- `/Users/i306072/Documents/GitHub/P-E/src/contexts/AppContext.jsx` - Context pattern (if needed)

### Secondary (MEDIUM confidence)
- CLAUDE.md project documentation - Architecture overview

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - All components already exist in codebase
- Architecture: HIGH - Direct code analysis of existing patterns
- Pitfalls: HIGH - Based on actual codebase conventions
- Code examples: HIGH - Extracted from working code

**Research date:** 2026-01-21
**Valid until:** Indefinite (internal codebase patterns, not external dependencies)
