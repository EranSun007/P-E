# Phase 18: Table Enhancements & UI Polish - Research

**Researched:** 2026-01-28
**Domain:** React table UI patterns, Recharts visualization, Tailwind color palette
**Confidence:** HIGH

## Summary

This phase enhances the existing Bug Dashboard (`src/pages/BugDashboard.jsx`) with three main improvements: (1) aging bugs table with visual age indicators and sortable columns, (2) weekly inflow trend chart for multi-week data visualization, and (3) filter UI polish with clear labels and active state badges.

The codebase already has strong foundations: Recharts is installed and used extensively (`KPITrendChart.jsx`, `MTTRBarChart.jsx`, `BugCategoryChart.jsx`), the table primitives from shadcn/ui are in place (`src/components/ui/table.jsx`), and sorting patterns exist in other components (`AgendaItemList.jsx`). The `AgingBugsTable.jsx` component is the primary enhancement target - currently it displays bugs in a static table without sorting or visual age indicators.

**Primary recommendation:** Extend `AgingBugsTable.jsx` with clickable column headers for sorting (useState + useMemo pattern from AgendaItemList), add a colored dot component for age visualization using the softer muted palette (coral/amber/sage), and create a new `WeeklyInflowChart.jsx` component based on existing `KPITrendChart.jsx` patterns.

## Standard Stack

The established libraries/tools for this domain:

### Core (Already Installed)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| recharts | ^2.15.1 | Chart rendering | Already used for KPITrendChart, MTTRBarChart, BugCategoryChart |
| lucide-react | ^0.475.0 | Icons (ArrowUpDown, ChevronUp, ChevronDown) | Already used throughout codebase |
| date-fns | ^3.6.0 | Date formatting and calculations | Already used in BugDashboard and AgingBugsTable |
| tailwindcss | ^3.4.17 | Styling with custom colors | Already configured with theme variables |

### Supporting (Already Available)
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| @radix-ui/react-select | ^2.1.6 | Accessible dropdowns | Filter dropdowns |
| class-variance-authority | ^0.7.1 | Conditional class composition | Badge variants |
| clsx/tailwind-merge | ^2.1.1/^3.0.2 | Class merging | Dynamic styling |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Manual table sorting | TanStack Table | Overkill for 6 columns, 20 rows max |
| Recharts | Tremor/visx | Not worth switching - Recharts already integrated |
| Custom badge | Additional badge variant | Badge component supports custom styling via className |

**Installation:**
```bash
# No new dependencies needed - all required libraries already installed
```

## Architecture Patterns

### Recommended Project Structure
```
src/components/bugs/
├── AgingBugsTable.jsx         # ENHANCE: Add sorting, age indicators, component column
├── WeeklyInflowChart.jsx      # NEW: Weekly inflow trend visualization
├── KPITrendChart.jsx          # REFERENCE: Existing pattern for charts
├── MTTRBarChart.jsx           # REFERENCE: Existing pattern for bar charts
└── BugCategoryChart.jsx       # REFERENCE: Existing pattern for category display
```

### Pattern 1: Table Column Sorting (useState + useMemo)
**What:** Client-side sorting with clickable column headers
**When to use:** Tables with < 100 rows where all data is already loaded
**Example:**
```jsx
// Source: src/components/agenda/AgendaItemList.jsx (adapted)
const [sortBy, setSortBy] = useState('age'); // default sort
const [sortOrder, setSortOrder] = useState('desc');

const sortedBugs = useMemo(() => {
  const sorted = [...agingBugs];
  sorted.sort((a, b) => {
    let aVal, bVal;
    switch (sortBy) {
      case 'key':
        aVal = a.bug_key;
        bVal = b.bug_key;
        break;
      case 'age':
        aVal = new Date(a.created_date);
        bVal = new Date(b.created_date);
        break;
      // ... other columns
    }
    if (sortOrder === 'asc') {
      return aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
    }
    return aVal > bVal ? -1 : aVal < bVal ? 1 : 0;
  });
  return sorted;
}, [agingBugs, sortBy, sortOrder]);
```

### Pattern 2: Clickable Sort Header Component
**What:** Table header that toggles sort direction on click
**When to use:** Sortable tables with visual sort indicators
**Example:**
```jsx
// Source: Common React table pattern
function SortableHeader({ column, label, sortBy, sortOrder, onSort }) {
  const isActive = sortBy === column;
  return (
    <TableHead
      className="cursor-pointer select-none hover:bg-muted/50"
      onClick={() => onSort(column)}
    >
      <div className="flex items-center gap-1">
        {label}
        {isActive ? (
          sortOrder === 'asc' ? (
            <ChevronUp className="h-4 w-4" />
          ) : (
            <ChevronDown className="h-4 w-4" />
          )
        ) : (
          <ArrowUpDown className="h-4 w-4 text-muted-foreground" />
        )}
      </div>
    </TableHead>
  );
}
```

### Pattern 3: Age Indicator Dot Component
**What:** Colored dot displayed before age value based on thresholds
**When to use:** Visual status indication in tables
**Example:**
```jsx
// Source: User decision from CONTEXT.md
// Colors: coral (>14d), amber (7-14d), sage (<7d)
function AgeIndicator({ daysOld }) {
  const getColor = () => {
    if (daysOld > 14) return 'bg-[#E07A5F]'; // coral
    if (daysOld >= 7) return 'bg-[#D4A574]'; // amber
    return 'bg-[#81B29A]';                    // sage
  };

  return (
    <span className="flex items-center gap-2">
      <span className={`h-2 w-2 rounded-full ${getColor()}`} />
      <span>{daysOld} days</span>
    </span>
  );
}
```

### Pattern 4: Weekly Inflow Bar Chart
**What:** Bar chart showing bug inflow per week
**When to use:** Multi-week data visualization
**Example:**
```jsx
// Source: src/components/bugs/MTTRBarChart.jsx (adapted)
// Use existing KPIHistory API endpoint
const data = await apiClient.bugs.getKPIHistory(weeks, component);
// Transform: data[n].kpi_data.bug_inflow_rate for each week
// Display as vertical bar chart with week labels on X-axis
```

### Anti-Patterns to Avoid
- **Server-side sorting for small datasets:** The aging bugs table is limited to 20 rows - no need for server pagination/sorting
- **Hardcoded color values scattered:** Define color constants once, reuse throughout
- **Inline sorting logic in JSX:** Extract to useMemo for performance and readability
- **New chart library:** Stick with Recharts - consistency trumps marginal improvements

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Sort icon toggling | Custom icon logic | lucide-react ChevronUp/ChevronDown/ArrowUpDown | Consistent with codebase |
| Color palette | Random hex values | Coordinated coral/amber/sage palette | Design consistency |
| Date age calculation | Manual date math | date-fns `differenceInDays` | Already used in codebase |
| Chart responsiveness | CSS media queries | Recharts ResponsiveContainer | Already in use |
| Filter badge | Custom badge component | Badge component with custom className | Already exists |

**Key insight:** The codebase has well-established patterns for all required functionality. The task is to combine existing patterns (sorting from AgendaItemList, charts from KPITrendChart, badges from badge.jsx) rather than inventing new approaches.

## Common Pitfalls

### Pitfall 1: Sorting by Displayed Age String Instead of Date
**What goes wrong:** Sort by "3 days" vs "14 days" alphabetically puts "14" before "3"
**Why it happens:** Using the formatted display value instead of raw date
**How to avoid:** Always sort by `new Date(bug.created_date)`, then format for display
**Warning signs:** "14 days" appearing before "3 days" in ascending order

### Pitfall 2: Breaking Existing Filter Behavior
**What goes wrong:** Table sorting resets when component filter changes
**Why it happens:** Not preserving sort state across filter updates
**How to avoid:** Keep sortBy/sortOrder state independent of filter state
**Warning signs:** Sort state lost when changing component dropdown

### Pitfall 3: Performance Issues with Large Datasets
**What goes wrong:** Slow rendering when sorting/filtering
**Why it happens:** Re-computing sort on every render
**How to avoid:** Use useMemo with proper dependencies: [agingBugs, sortBy, sortOrder]
**Warning signs:** Visible lag when clicking sort headers

### Pitfall 4: Inconsistent Age Threshold Display
**What goes wrong:** Different age colors in different places
**Why it happens:** Hardcoded threshold values in multiple locations
**How to avoid:** Define AGE_THRESHOLDS constant once, export and reuse
**Warning signs:** Color discrepancies between table and potential future uses

### Pitfall 5: Missing Accessibility on Clickable Headers
**What goes wrong:** Screen readers don't announce sortable columns
**Why it happens:** Using onClick without proper ARIA attributes
**How to avoid:** Add `role="button"`, `aria-sort`, `tabIndex={0}`, keyboard handler
**Warning signs:** Cannot tab to sort headers, no screen reader announcements

## Code Examples

Verified patterns from the codebase:

### Age Calculation (from AgingBugsTable.jsx)
```jsx
// Source: src/components/bugs/AgingBugsTable.jsx line 101-102
import { formatDistanceToNow, differenceInDays } from 'date-fns';

// For display
formatDistanceToNow(new Date(bug.created_date), { addSuffix: false })

// For sorting/thresholds
const daysOld = differenceInDays(new Date(), new Date(bug.created_date));
```

### Sort State Pattern (from AgendaItemList.jsx)
```jsx
// Source: src/components/agenda/AgendaItemList.jsx lines 37-39
const [sortBy, setSortBy] = useState('createdAt');
const [sortOrder, setSortOrder] = useState('desc');

// Toggle sort function
const handleSort = (column) => {
  if (sortBy === column) {
    setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
  } else {
    setSortBy(column);
    setSortOrder('asc');
  }
};
```

### Chart Data Fetching (from KPITrendChart.jsx)
```jsx
// Source: src/components/bugs/KPITrendChart.jsx lines 102-117
const data = await apiClient.bugs.getKPIHistory(parseInt(selectedWeeks, 10), component);

const transformed = data
  .map(record => ({
    weekEnding: record.week_ending,
    value: record.kpi_data?.bug_inflow_rate ?? null,
  }))
  .filter(record => record.value !== null)
  .sort((a, b) => new Date(a.weekEnding) - new Date(b.weekEnding));
```

### Badge Component Usage (from badge.jsx)
```jsx
// Source: src/components/ui/badge.jsx
import { Badge } from '@/components/ui/badge';

// Default variant
<Badge variant="default">{component}</Badge>

// Custom styling via className
<Badge className="bg-[#E07A5F] text-white">{component}</Badge>
```

### Softer Muted Color Palette
```jsx
// Recommended palette (softer than existing KPI colors)
const AGE_COLORS = {
  critical: '#E07A5F', // coral - >14 days
  warning: '#D4A574',  // amber - 7-14 days
  healthy: '#81B29A',  // sage - <7 days
};

// Existing KPI colors (for reference - DO NOT reuse for age)
// red: '#ef4444', yellow: '#eab308', green: '#22c55e'
```

### Filter Label Pattern (from BugDashboard.jsx)
```jsx
// Source: src/pages/BugDashboard.jsx lines 322-339
<Select value={selectedComponent} onValueChange={setSelectedComponent}>
  <SelectTrigger className="w-[220px]">
    <SelectValue placeholder="All components" />
  </SelectTrigger>
  <SelectContent>
    <SelectItem value="all">All Components</SelectItem>
    {/* ... component options */}
  </SelectContent>
</Select>

// Enhanced with descriptive label:
<SelectTrigger className="w-[220px]">
  <span className="text-muted-foreground mr-1">Filter by Component:</span>
  <SelectValue placeholder="All" />
</SelectTrigger>
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Table libraries (react-table) | shadcn/ui Table primitives | 2023 | Simpler, more customizable |
| Hardcoded chart colors | Tailwind CSS variables | 2024 | Theme consistency |
| Manual sorting logic | useState + useMemo | React 18 | Better performance |

**Deprecated/outdated:**
- **react-table v7:** Superseded by TanStack Table, but neither needed for simple use case
- **Moment.js:** Replaced by date-fns throughout codebase

## Open Questions

Things that couldn't be fully resolved:

1. **Exact hex values for softer palette**
   - What we know: User wants coral/amber/sage instead of harsh red/yellow/green
   - What's unclear: Exact hex values not specified
   - Recommendation: Use `#E07A5F` (coral), `#D4A574` (amber), `#81B29A` (sage) - earthy muted tones that complement the existing design

2. **Weekly inflow chart placement**
   - What we know: VIS-01 requires chart when multiple weeks uploaded
   - What's unclear: Where in the dashboard layout
   - Recommendation: Place in the existing charts row, or as a new section between KPIGrid and charts row

3. **Filter badge exact styling**
   - What we know: UI-02 requires badge when filtered (not "All")
   - What's unclear: Badge design (inline with dropdown, separate element)
   - Recommendation: Use Badge component next to filter dropdown, showing selected component name

## Sources

### Primary (HIGH confidence)
- `src/components/bugs/AgingBugsTable.jsx` - Current implementation, enhancement target
- `src/components/bugs/KPITrendChart.jsx` - Chart patterns with Recharts
- `src/components/bugs/MTTRBarChart.jsx` - Bar chart reference
- `src/components/agenda/AgendaItemList.jsx` - Sorting pattern reference
- `src/components/ui/badge.jsx` - Badge component API
- `src/components/ui/table.jsx` - Table primitives

### Secondary (MEDIUM confidence)
- `src/pages/BugDashboard.jsx` - Filter dropdown patterns
- `src/api/apiClient.js` - API methods for KPI history
- `package.json` - Confirmed library versions

### Tertiary (LOW confidence)
- Color palette recommendations (coral/amber/sage hex values) - based on common UI design conventions

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - All libraries already installed and in use
- Architecture: HIGH - Patterns verified from existing codebase
- Pitfalls: HIGH - Based on actual code patterns observed
- Color palette: MEDIUM - Specific hex values are recommendations

**Research date:** 2026-01-28
**Valid until:** 60 days (stable technologies, no anticipated breaking changes)
