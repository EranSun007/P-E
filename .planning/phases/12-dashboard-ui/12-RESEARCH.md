# Phase 12: Dashboard UI - Research

**Researched:** 2026-01-28
**Domain:** React Dashboard UI with KPI Cards, Status Indicators, and Charts (Recharts)
**Confidence:** HIGH

## Summary

Phase 12 builds the Dashboard UI for the DevOps Bug Dashboard. The backend APIs (Phase 10) and CSV upload (Phase 11) are complete, providing pre-calculated KPIs via `/api/bugs/kpis` and bug lists via `/api/bugs/list`. The dashboard needs to display 9 KPIs in card layouts with green/yellow/red status indicators, support filtering by component and week, show critical alerts, display aging bugs table, and render MTTR bar chart + bug category pie/donut chart.

The existing codebase provides an excellent foundation:
- **Recharts 2.15.1** already installed and actively used (Metrics.jsx, Projects.jsx, OneOnOneComplianceCard.jsx)
- **shadcn/ui components** for Card, Alert, Select, Table, Badge already available
- **ChartContainer pattern** exists in `src/components/ui/chart.jsx` wrapping Recharts with theming
- **API client pattern** established in `src/api/apiClient.js` with `bugs.getKPIs()`, `bugs.listBugs()`, `bugs.listUploads()`

**Primary recommendation:** Extend the existing BugDashboard.jsx page using established patterns from Metrics.jsx (KPI cards with trend indicators) and Projects.jsx (PieChart), adding component-specific KPICard and charts.

## Standard Stack

The established libraries/tools for this domain:

### Core (Already Installed)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| recharts | 2.15.1 | Charts (Bar, Pie/Donut) | Already used in Metrics.jsx, Projects.jsx; React-native composable charts |
| @radix-ui/react-select | 2.1.6 | Filter dropdowns | Already used throughout app; accessible select component |
| lucide-react | 0.475.0 | Icons | Already used; consistent icon set |
| date-fns | 3.6.0 | Date formatting | Already used; lightweight date utilities |

### Supporting (Already Available)
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Card, CardContent, etc | shadcn/ui | KPI card containers | All KPI displays |
| Alert, AlertTitle | shadcn/ui | Critical alert banner | Red zone KPIs |
| Table, TableHeader, etc | shadcn/ui | Aging bugs table | DASH-06 |
| Badge | shadcn/ui | Status indicators | Priority badges |
| Select, SelectItem | shadcn/ui | Filter dropdowns | Component/week filters |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Recharts | Chart.js | Recharts already integrated, React-native composition |
| Custom status logic | class-variance-authority | cva already used for badges, good pattern |

**Installation:**
No new packages needed - all required libraries already installed.

## Architecture Patterns

### Recommended Project Structure
```
src/
├── pages/
│   └── BugDashboard.jsx      # Main dashboard page (exists, extend)
├── components/
│   └── bugs/
│       ├── CSVUploadDialog.jsx    # (exists - Phase 11)
│       ├── KPICard.jsx            # NEW: Single KPI display with status
│       ├── KPIGrid.jsx            # NEW: Grid of all KPI cards
│       ├── CriticalAlertBanner.jsx # NEW: Alert when red zone KPIs
│       ├── AgingBugsTable.jsx     # NEW: Table of open VH/High bugs
│       ├── MTTRBarChart.jsx       # NEW: MTTR by priority bar chart
│       └── BugCategoryChart.jsx   # NEW: Category distribution pie/donut
└── api/
    └── apiClient.js              # (exists - bugs.getKPIs, etc.)
```

### Pattern 1: KPI Status Color Logic
**What:** Determine green/yellow/red status from KPI value and threshold
**When to use:** All KPI cards (DASH-01, DASH-02)
**Example:**
```jsx
// Source: Codebase pattern from OneOnOneComplianceCard.jsx
const KPI_THRESHOLDS = {
  bug_inflow_rate: { green: 6, yellow: 8 },      // <=6 green, 6.1-8 yellow, >8 red
  median_ttfr_hours: { green: 24, yellow: 48 },  // <24 green, 24-48 yellow, >48 red
  sla_vh_percent: { green: 80, yellow: 60 },     // >=80 green, 60-79 yellow, <60 red (inverted)
  sla_high_percent: { green: 80, yellow: 60 },   // Same as VH
  backlog_health_score: { green: 70, yellow: 50 } // >=70 green, 50-69 yellow, <50 red (inverted)
};

function getKPIStatus(kpiName, value) {
  const threshold = KPI_THRESHOLDS[kpiName];
  if (!threshold) return 'neutral';

  // For "lower is better" KPIs (inflow, TTFR)
  if (['bug_inflow_rate', 'median_ttfr_hours'].includes(kpiName)) {
    if (value <= threshold.green) return 'green';
    if (value <= threshold.yellow) return 'yellow';
    return 'red';
  }

  // For "higher is better" KPIs (SLA %, backlog health)
  if (value >= threshold.green) return 'green';
  if (value >= threshold.yellow) return 'yellow';
  return 'red';
}

const STATUS_COLORS = {
  green: { bg: 'bg-green-50', border: 'border-green-200', text: 'text-green-700', icon: 'text-green-500' },
  yellow: { bg: 'bg-yellow-50', border: 'border-yellow-200', text: 'text-yellow-700', icon: 'text-yellow-500' },
  red: { bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-700', icon: 'text-red-500' },
  neutral: { bg: 'bg-gray-50', border: 'border-gray-200', text: 'text-gray-700', icon: 'text-gray-500' }
};
```

### Pattern 2: KPI Card Component
**What:** Reusable card for displaying a single KPI with status indicator
**When to use:** All 9 KPIs
**Example:**
```jsx
// Source: Based on Metrics.jsx card pattern + OneOnOneComplianceCard.jsx status pattern
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

function KPICard({ title, value, unit, status, description, icon: Icon }) {
  const colors = STATUS_COLORS[status] || STATUS_COLORS.neutral;

  return (
    <Card className={cn('transition-all', colors.bg, colors.border)}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            {title}
          </CardTitle>
          {Icon && <Icon className={cn('h-4 w-4', colors.icon)} />}
        </div>
      </CardHeader>
      <CardContent>
        <div className={cn('text-2xl font-bold', colors.text)}>
          {value}{unit && <span className="text-sm ml-1">{unit}</span>}
        </div>
        {description && (
          <p className="text-xs text-muted-foreground mt-1">{description}</p>
        )}
      </CardContent>
    </Card>
  );
}
```

### Pattern 3: Filter Dropdowns with Select
**What:** Component and week filter dropdowns
**When to use:** DASH-03, DASH-04
**Example:**
```jsx
// Source: Codebase pattern from shadcn/ui Select
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

function FilterBar({ uploads, components, selectedUpload, selectedComponent, onUploadChange, onComponentChange }) {
  return (
    <div className="flex gap-4 mb-6">
      {/* Week Filter */}
      <Select value={selectedUpload} onValueChange={onUploadChange}>
        <SelectTrigger className="w-[200px]">
          <SelectValue placeholder="Select week" />
        </SelectTrigger>
        <SelectContent>
          {uploads.map(upload => (
            <SelectItem key={upload.id} value={upload.id}>
              Week of {format(new Date(upload.week_ending), 'MMM d, yyyy')}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Component Filter */}
      <Select value={selectedComponent} onValueChange={onComponentChange}>
        <SelectTrigger className="w-[180px]">
          <SelectValue placeholder="All components" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Components</SelectItem>
          {components.map(comp => (
            <SelectItem key={comp} value={comp}>
              {comp}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
```

### Pattern 4: Critical Alert Banner
**What:** Alert banner that appears when any KPI is in red zone
**When to use:** DASH-05
**Example:**
```jsx
// Source: Codebase pattern from shadcn/ui Alert
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertTriangle } from 'lucide-react';

function CriticalAlertBanner({ kpis }) {
  const redKPIs = Object.entries(kpis)
    .filter(([name, value]) => getKPIStatus(name, value) === 'red')
    .map(([name]) => KPI_LABELS[name]);

  if (redKPIs.length === 0) return null;

  return (
    <Alert variant="destructive" className="mb-6">
      <AlertTriangle className="h-4 w-4" />
      <AlertTitle>Critical Alert</AlertTitle>
      <AlertDescription>
        {redKPIs.length} KPI{redKPIs.length > 1 ? 's' : ''} in critical zone: {redKPIs.join(', ')}
      </AlertDescription>
    </Alert>
  );
}
```

### Pattern 5: Bar Chart for MTTR by Priority
**What:** Horizontal bar chart showing MTTR for each priority level
**When to use:** DASH-07
**Example:**
```jsx
// Source: Codebase Metrics.jsx + Recharts patterns
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Cell } from 'recharts';

const PRIORITY_COLORS = {
  'Very High': '#ef4444', // red-500
  'High': '#f97316',      // orange-500
  'Medium': '#eab308',    // yellow-500
  'Low': '#22c55e'        // green-500
};

function MTTRBarChart({ mttrByPriority }) {
  const data = Object.entries(mttrByPriority)
    .map(([priority, { median, count }]) => ({
      priority,
      mttr: median || 0,
      count
    }))
    .filter(d => d.count > 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle>MTTR by Priority</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} layout="vertical">
              <XAxis type="number" unit="h" />
              <YAxis dataKey="priority" type="category" width={80} />
              <Tooltip
                formatter={(value) => [`${value.toFixed(1)}h`, 'Median MTTR']}
              />
              <Bar dataKey="mttr" radius={[0, 4, 4, 0]}>
                {data.map((entry, index) => (
                  <Cell key={index} fill={PRIORITY_COLORS[entry.priority]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
```

### Pattern 6: Pie/Donut Chart for Bug Categories
**What:** Donut chart showing bug distribution by component
**When to use:** DASH-08
**Example:**
```jsx
// Source: Codebase Projects.jsx + OneOnOneComplianceCard.jsx
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend } from 'recharts';

const COMPONENT_COLORS = {
  deployment: '#3b82f6',       // blue-500
  'foss-vulnerabilities': '#8b5cf6', // violet-500
  'service-broker': '#06b6d4',  // cyan-500
  'cm-metering': '#f59e0b',     // amber-500
  'sdm-metering': '#10b981',    // emerald-500
  other: '#6b7280'              // gray-500
};

function BugCategoryChart({ categoryDistribution }) {
  const data = Object.entries(categoryDistribution)
    .map(([name, value]) => ({
      name,
      value,
      color: COMPONENT_COLORS[name] || COMPONENT_COLORS.other
    }));

  return (
    <Card>
      <CardHeader>
        <CardTitle>Bug Distribution by Category</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                innerRadius={50}  // Creates donut effect
                outerRadius={80}
                paddingAngle={2}
                label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
              >
                {data.map((entry, index) => (
                  <Cell key={index} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip formatter={(value) => [value, 'Bugs']} />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
```

### Pattern 7: Aging Bugs Table with JIRA Links
**What:** Table showing open VH/High bugs sorted by age
**When to use:** DASH-06
**Example:**
```jsx
// Source: Codebase shadcn/ui Table pattern
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { ExternalLink } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

const JIRA_BASE_URL = 'https://jira.example.com/browse/';

function AgingBugsTable({ bugs }) {
  // Filter to open VH/High bugs only
  const agingBugs = bugs
    .filter(b =>
      ['Very High', 'High'].includes(b.priority) &&
      ['Open', 'Author Action', 'In Progress', 'Reopened'].includes(b.status)
    )
    .slice(0, 20); // Limit display

  return (
    <Card>
      <CardHeader>
        <CardTitle>Aging High-Priority Bugs</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Key</TableHead>
              <TableHead>Summary</TableHead>
              <TableHead>Priority</TableHead>
              <TableHead>Age</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {agingBugs.map(bug => (
              <TableRow key={bug.id}>
                <TableCell>
                  <a
                    href={`${JIRA_BASE_URL}${bug.bug_key}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-blue-600 hover:underline"
                  >
                    {bug.bug_key}
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </TableCell>
                <TableCell className="max-w-[300px] truncate">{bug.summary}</TableCell>
                <TableCell>
                  <Badge variant={bug.priority === 'Very High' ? 'destructive' : 'secondary'}>
                    {bug.priority}
                  </Badge>
                </TableCell>
                <TableCell>
                  {formatDistanceToNow(new Date(bug.created_date), { addSuffix: false })}
                </TableCell>
                <TableCell>{bug.status}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
```

### Anti-Patterns to Avoid
- **Fetching KPIs on every render:** Use useEffect with proper dependencies, memoize calculations
- **Inline threshold logic:** Define KPI_THRESHOLDS as constants, not inline in JSX
- **Missing loading states:** Always show skeleton or spinner while fetching
- **Hardcoded JIRA URL:** Store in environment variable (VITE_JIRA_BASE_URL)
- **Re-fetching bugs for table:** Bugs API already fetched for other purposes, pass as prop

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Status color styling | Manual className strings | STATUS_COLORS constant + cn() | Consistent, maintainable |
| Responsive charts | Fixed dimensions | ResponsiveContainer | Already works in codebase |
| Date formatting | Manual date math | date-fns formatDistanceToNow | Edge cases handled |
| Select dropdown | Custom dropdown | @radix-ui/react-select | Accessibility, keyboard nav |
| Alert styling | Custom div | shadcn/ui Alert | Consistent with design system |

**Key insight:** The codebase already has excellent patterns for all dashboard elements. Copy patterns from Metrics.jsx and OneOnOneComplianceCard.jsx rather than inventing new ones.

## Common Pitfalls

### Pitfall 1: Chart Container Height
**What goes wrong:** Charts render with 0 height or overflow
**Why it happens:** ResponsiveContainer needs explicit height on parent
**How to avoid:** Always wrap ResponsiveContainer in a div with explicit height (e.g., `h-64`)
**Warning signs:** Chart not visible, console warnings about height

### Pitfall 2: KPI Threshold Direction
**What goes wrong:** Green/red status reversed for some KPIs
**Why it happens:** Some KPIs are "lower is better" (bug inflow), others "higher is better" (SLA %)
**How to avoid:** Document threshold direction per KPI, use separate logic paths
**Warning signs:** SLA 90% showing red instead of green

### Pitfall 3: Empty State Handling
**What goes wrong:** Dashboard crashes or shows empty when no uploads exist
**Why it happens:** Attempting to render KPIs/charts with null data
**How to avoid:** Check for uploads.length === 0, show helpful empty state with upload prompt
**Warning signs:** White screen, "Cannot read property of undefined" errors

### Pitfall 4: Filter State Synchronization
**What goes wrong:** Selected week/component doesn't match displayed data
**Why it happens:** State updates not triggering refetch
**How to avoid:** Use useEffect with [selectedUpload, selectedComponent] dependencies
**Warning signs:** Data doesn't change when changing filters

### Pitfall 5: JIRA URL Configuration
**What goes wrong:** JIRA links go to wrong instance or 404
**Why it happens:** Hardcoded URL doesn't match user's JIRA instance
**How to avoid:** Use environment variable VITE_JIRA_BASE_URL with fallback
**Warning signs:** Links work in dev but not prod, or vice versa

### Pitfall 6: Large Bug Lists Performance
**What goes wrong:** Table takes long to render with many bugs
**Why it happens:** Rendering 500+ table rows at once
**How to avoid:** Limit display to top 20 aging bugs, use pagination for full list
**Warning signs:** Page freeze on large uploads

## Code Examples

Verified patterns from the existing codebase:

### Data Fetching Pattern
```jsx
// Source: Metrics.jsx pattern adapted for bugs
import { useEffect, useState } from 'react';
import { apiClient } from '@/api/apiClient';

function useBugDashboard(uploadId, component) {
  const [kpis, setKPIs] = useState(null);
  const [bugs, setBugs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!uploadId) {
      setKPIs(null);
      setBugs([]);
      setLoading(false);
      return;
    }

    async function fetchData() {
      setLoading(true);
      try {
        const [kpiData, bugData] = await Promise.all([
          apiClient.bugs.getKPIs(uploadId, component === 'all' ? null : component),
          apiClient.bugs.listBugs(uploadId, {
            component: component === 'all' ? null : component,
            limit: 100
          })
        ]);
        setKPIs(kpiData);
        setBugs(bugData);
        setError(null);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [uploadId, component]);

  return { kpis, bugs, loading, error };
}
```

### KPI Grid Layout
```jsx
// Source: Metrics.jsx grid pattern
function KPIGrid({ kpis }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      <KPICard
        title="Bug Inflow Rate"
        value={kpis.bug_inflow_rate?.toFixed(1)}
        unit="/week"
        status={getKPIStatus('bug_inflow_rate', kpis.bug_inflow_rate)}
        icon={Bug}
      />
      <KPICard
        title="Time to First Response"
        value={kpis.median_ttfr_hours?.toFixed(1)}
        unit="h median"
        status={getKPIStatus('median_ttfr_hours', kpis.median_ttfr_hours)}
        icon={Clock}
      />
      <KPICard
        title="SLA Compliance (VH)"
        value={kpis.sla_vh_percent?.toFixed(0)}
        unit="%"
        status={getKPIStatus('sla_vh_percent', kpis.sla_vh_percent)}
        icon={CheckCircle}
      />
      {/* ... more KPI cards ... */}
    </div>
  );
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Chart.js via react-chartjs-2 | Recharts | Project decision | React-native, composable |
| Custom dropdowns | Radix UI Select | shadcn/ui adoption | Accessibility built-in |
| Inline styles | Tailwind + cn() | Project standard | Consistent theming |

**Deprecated/outdated:**
- localClient.js: Legacy localStorage pattern, use apiClient.js for all data

## Open Questions

Things that couldn't be fully resolved:

1. **JIRA Base URL Configuration**
   - What we know: Need to make JIRA links clickable
   - What's unclear: User's JIRA instance URL
   - Recommendation: Add VITE_JIRA_BASE_URL env var with reasonable default, show in Settings if needed

2. **Historical Week Comparison**
   - What we know: Single week KPIs are displayed
   - What's unclear: Should we show week-over-week trends?
   - Recommendation: Defer trend arrows to future phase, focus on single-week display first

3. **Components List**
   - What we know: Components extracted from labels/summary during upload
   - What's unclear: Exact component list varies by upload
   - Recommendation: Extract components from KPI data dynamically via `Object.keys(kpis.category_distribution)`

## Sources

### Primary (HIGH confidence)
- `/Users/i306072/Documents/GitHub/P-E/src/pages/Metrics.jsx` - KPI card patterns, Recharts LineChart usage
- `/Users/i306072/Documents/GitHub/P-E/src/pages/Projects.jsx` - PieChart with ResponsiveContainer pattern
- `/Users/i306072/Documents/GitHub/P-E/src/components/metrics/OneOnOneComplianceCard.jsx` - Donut chart (innerRadius), status colors
- `/Users/i306072/Documents/GitHub/P-E/src/components/ui/chart.jsx` - ChartContainer wrapper pattern
- `/Users/i306072/Documents/GitHub/P-E/src/api/apiClient.js` - bugs.getKPIs, bugs.listBugs, bugs.listUploads APIs
- `/Users/i306072/Documents/GitHub/P-E/server/services/BugService.js` - KPI data structure (kpi_data fields)

### Secondary (MEDIUM confidence)
- shadcn/ui component files in `src/components/ui/` - Card, Alert, Table, Select patterns
- Recharts library documentation (package.json shows v2.15.1)

### Tertiary (LOW confidence)
- None - all patterns verified against codebase

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - All libraries already installed and used in codebase
- Architecture: HIGH - Patterns directly copied from existing pages
- Pitfalls: HIGH - Based on common React/Recharts issues and codebase conventions

**Research date:** 2026-01-28
**Valid until:** 2026-02-28 (30 days - stable patterns)
