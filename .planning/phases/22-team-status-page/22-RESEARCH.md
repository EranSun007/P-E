# Phase 22: Team Status Page - Research

**Researched:** 2026-01-29
**Domain:** React Dashboard UI with MCP Insights Integration
**Confidence:** HIGH

## Summary

This phase builds a read-only team health dashboard that displays daily summaries and progress metrics from the MCP knowledge base. The page shows team member cards with health indicators (red/yellow/green), aggregate metrics (completed/blockers/velocity), and weekly timeline navigation. Data is retrieved from the MCP store_insight API via the existing MCPService backend.

The implementation follows established patterns from BugDashboard (metrics display, filter UI) and TeamSync (Context-based state, team tabs). The dashboard uses React Context for state management, Radix UI primitives for cards/tabs/collapsible components, and the existing releaseCycles utility for sprint/week calculations. No new libraries are required — all dependencies are already in the project.

**Primary recommendation:** Build a TeamStatusContext following the SyncContext pattern, use Collapsible cards for member summaries, implement weekly navigation with sprint formatting from releaseCycles.js, and query MCP insights API with date range filters.

## Standard Stack

The established libraries/tools for this domain:

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| React 18 | 18.2.0 | UI framework | Already in project, Context API for state |
| @radix-ui/react-collapsible | 1.1.3 | Expandable member cards | Already in project, accessible primitives |
| @radix-ui/react-tabs | 1.1.3 | Team department tabs | Already in project, matches TeamSync pattern |
| date-fns | 3.6.0 | Date calculations | Already in project, used throughout codebase |
| lucide-react | 0.475.0 | Icons | Already in project, consistent icon set |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| @radix-ui/react-avatar | 1.1.3 | Member avatars | Already in project, compact member cards |
| class-variance-authority | 0.7.1 | Badge variants | Already in project, health color styling |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Collapsible | Accordion | Collapsible allows multiple cards open, better for status overview |
| Custom health logic | External library | Health calculation is domain-specific, custom is simpler |
| Daily view | Week-only | Phase context decision: weekly view only |

**Installation:**
```bash
# No new dependencies needed - all libraries already installed
```

## Architecture Patterns

### Recommended Project Structure
```
src/
├── pages/
│   └── TeamStatus.jsx           # Main page component
├── contexts/
│   └── TeamStatusContext.jsx    # State management for team summaries
├── components/
│   └── team-status/
│       ├── TeamTabs.jsx         # Team department filter tabs
│       ├── MetricsBanner.jsx    # Aggregate team metrics card
│       ├── MemberCard.jsx       # Collapsible member summary card
│       ├── TimelineNav.jsx      # Week navigation (prev/next arrows)
│       └── EmptyState.jsx       # No data for selected week
└── utils/
    └── healthCalculation.js     # Health indicator logic
```

### Pattern 1: Context-Based Dashboard State
**What:** React Context managing team summaries, current week, and loading state
**When to use:** Always for dashboard pages - matches SyncContext and NotificationContext patterns
**Example:**
```javascript
// Source: SyncContext.jsx pattern
import { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { apiClient } from '@/api/apiClient';
import { useAuth } from '@/contexts/AuthContext';
import { getCurrentCycle, getSprintById, listSprints } from '@/utils/releaseCycles';

const TeamStatusContext = createContext(null);

export function TeamStatusProvider({ children }) {
  const [summaries, setSummaries] = useState([]);
  const [currentTeam, setCurrentTeam] = useState('metering');
  const [currentWeek, setCurrentWeek] = useState(null); // Sprint ID like '2601a'
  const [loading, setLoading] = useState(true);
  const { isAuthenticated } = useAuth();

  // Initialize to current week
  useEffect(() => {
    if (!currentWeek) {
      const cycle = getCurrentCycle();
      setCurrentWeek(cycle.currentSprint.id);
    }
  }, [currentWeek]);

  // Fetch summaries for current team and week
  const refresh = useCallback(async () => {
    if (!isAuthenticated || !currentWeek) {
      setSummaries([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const sprint = getSprintById(currentWeek);

      // Query MCP insights API with date range
      const result = await apiClient.knowledge.searchInsights({
        teamDepartment: currentTeam,
        startDate: sprint.startDate,
        endDate: sprint.endDate,
        category: 'team_summary'
      });

      setSummaries(result.summaries || []);
    } catch (error) {
      console.error('Failed to fetch team summaries:', error);
      setSummaries([]);
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, currentTeam, currentWeek]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const value = {
    summaries,
    currentTeam,
    setCurrentTeam,
    currentWeek,
    setCurrentWeek,
    loading,
    refresh
  };

  return (
    <TeamStatusContext.Provider value={value}>
      {children}
    </TeamStatusContext.Provider>
  );
}

export function useTeamStatus() {
  const context = useContext(TeamStatusContext);
  if (!context) {
    throw new Error('useTeamStatus must be used within a TeamStatusProvider');
  }
  return context;
}
```

### Pattern 2: Collapsible Member Cards with Health Borders
**What:** Card component with colored left border, compact view, click to expand details
**When to use:** Always for member summaries - matches phase context decision
**Example:**
```javascript
// Source: Radix UI Collapsible + codebase Badge pattern
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from '@/components/ui/collapsible';
import { Card } from '@/components/ui/card';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { ChevronDown } from 'lucide-react';
import { calculateHealth } from '@/utils/healthCalculation';

function MemberCard({ member, summary }) {
  const [isOpen, setIsOpen] = useState(false);
  const health = calculateHealth(summary);

  // Health border color
  const borderColor = {
    green: 'border-l-green-500',
    yellow: 'border-l-yellow-500',
    red: 'border-l-red-500'
  }[health.status];

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <Card className={`border-l-4 ${borderColor} hover:shadow-md transition-shadow`}>
        <CollapsibleTrigger className="w-full text-left p-4 flex items-center gap-3">
          {/* Avatar */}
          <Avatar className="h-10 w-10">
            <AvatarImage src={member.avatar} />
            <AvatarFallback>{member.initials}</AvatarFallback>
          </Avatar>

          {/* Name and 1-line summary */}
          <div className="flex-1 min-w-0">
            <div className="font-medium">{member.name}</div>
            <div className="text-sm text-muted-foreground truncate">
              {summary.oneLine || 'No updates this week'}
            </div>
          </div>

          {/* Metric badges */}
          <div className="flex gap-2">
            {summary.completedCount > 0 && (
              <Badge variant="secondary">{summary.completedCount} done</Badge>
            )}
            {summary.blockerCount > 0 && (
              <Badge variant="destructive">{summary.blockerCount} blocker</Badge>
            )}
          </div>

          {/* Expand icon */}
          <ChevronDown className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </CollapsibleTrigger>

        <CollapsibleContent className="px-4 pb-4 space-y-3">
          {/* Full summary with all items */}
          <div className="text-sm space-y-2">
            {summary.items?.map(item => (
              <div key={item.id} className="flex items-start gap-2">
                <span className="text-muted-foreground">•</span>
                <span>{item.text}</span>
              </div>
            ))}
          </div>

          {/* Health reasoning */}
          <div className="text-xs text-muted-foreground pt-2 border-t">
            {health.reasoning}
          </div>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}
```

### Pattern 3: Weekly Timeline Navigation with Sprint Formatting
**What:** Prev/Next arrows, week display as "Week 4 • Sprint 2601a", 4 weeks history
**When to use:** Always for timeline - matches phase context decision
**Example:**
```javascript
// Source: releaseCycles.js utility + BugDashboard navigation pattern
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { getSprintById, listSprints, getCurrentCycle } from '@/utils/releaseCycles';
import { format } from 'date-fns';

function TimelineNav({ currentWeek, onWeekChange }) {
  const sprint = getSprintById(currentWeek);

  // Get 4 weeks of history (2 cycles)
  const currentCycle = getCurrentCycle();
  const sprints = listSprints(
    getPreviousCycleId(currentCycle.id),
    2
  );

  const currentIndex = sprints.findIndex(s => s.id === currentWeek);
  const hasPrev = currentIndex > 0;
  const hasNext = currentIndex < sprints.length - 1;

  const goPrev = () => {
    if (hasPrev) onWeekChange(sprints[currentIndex - 1].id);
  };

  const goNext = () => {
    if (hasNext) onWeekChange(sprints[currentIndex + 1].id);
  };

  // Format: "Week 4 • Sprint 2601a"
  const weekNumber = sprint.weeks[0].week === 1 ?
    sprint.cycleId.slice(2) * 2 - 1 :
    sprint.cycleId.slice(2) * 2;
  const weekLabel = `Week ${weekNumber} • Sprint ${sprint.id}`;

  return (
    <div className="flex items-center gap-4">
      <Button
        variant="outline"
        size="icon"
        onClick={goPrev}
        disabled={!hasPrev}
      >
        <ChevronLeft className="h-4 w-4" />
      </Button>

      <div className="text-center min-w-[200px]">
        <div className="font-medium">{weekLabel}</div>
        <div className="text-sm text-muted-foreground">
          {format(sprint.startDate, 'MMM d')} - {format(sprint.endDate, 'MMM d')}
        </div>
      </div>

      <Button
        variant="outline"
        size="icon"
        onClick={goNext}
        disabled={!hasNext}
      >
        <ChevronRight className="h-4 w-4" />
      </Button>
    </div>
  );
}
```

### Pattern 4: Aggregate Metrics Banner
**What:** Single row card showing team totals (Completed / Blockers / Velocity)
**When to use:** Always - matches phase context decision for team-level metrics
**Example:**
```javascript
// Source: BugDashboard KPIGrid pattern
import { Card, CardContent } from '@/components/ui/card';

function MetricsBanner({ summaries }) {
  const metrics = summaries.reduce((acc, summary) => ({
    completed: acc.completed + (summary.completedCount || 0),
    blockers: acc.blockers + (summary.blockerCount || 0),
    velocity: acc.velocity + (summary.completedCount || 0) // Simple count
  }), { completed: 0, blockers: 0, velocity: 0 });

  return (
    <Card>
      <CardContent className="py-4">
        <div className="grid grid-cols-3 divide-x">
          <div className="text-center">
            <div className="text-2xl font-bold">{metrics.completed}</div>
            <div className="text-sm text-muted-foreground">Completed</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold">{metrics.blockers}</div>
            <div className="text-sm text-muted-foreground">Blockers</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold">{metrics.velocity}</div>
            <div className="text-sm text-muted-foreground">Velocity</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
```

### Anti-Patterns to Avoid
- **Storing health thresholds in component:** Extract to utility function for reusability and testing
- **Fetching data in individual member cards:** Fetch once at Context level, pass down via props
- **Daily granularity in timeline:** Phase context decision is weekly-only
- **Team health as database field:** Calculate on-the-fly from summary data
- **Inline health calculation in render:** Use useMemo to avoid recalculation on every render

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Sprint/week calculations | Custom date math | releaseCycles.js utility | Already handles 4-week cycles, sprint naming, edge cases |
| Expandable cards | Custom accordion | Radix Collapsible | Accessible, keyboard nav, animation built-in |
| Avatar placeholders | Custom fallback logic | Radix Avatar with AvatarFallback | Handles loading states, initials extraction |
| Color variants for health | Inline styles | class-variance-authority (cva) | Type-safe, consistent with Badge component pattern |
| Date formatting | Manual string concat | date-fns format() | Handles locales, edge cases, already in project |

**Key insight:** This project already has comprehensive UI primitives (Radix UI) and utilities (releaseCycles, date-fns). Building custom versions adds maintenance burden and breaks consistency with existing pages.

## Common Pitfalls

### Pitfall 1: Missing MCP Insights Retrieval Endpoint
**What goes wrong:** MCPService only has storeInsight(), no getInsights() method
**Why it happens:** Phase 19 implemented write-only API, retrieval was deferred
**How to avoid:** Add GET /api/knowledge/insights endpoint that queries MCP server for stored insights by date range and team
**Warning signs:** 404 errors when Context tries to fetch summaries

### Pitfall 2: Health Calculation Performance in Loop
**What goes wrong:** Calculating health inside .map() on every render causes lag
**Why it happens:** Health calculation involves multiple conditions and data aggregation
**How to avoid:** Use useMemo at card level to cache health result, only recalculate when summary data changes
**Warning signs:** Stuttering when scrolling member cards, slow expand/collapse

### Pitfall 3: Sprint Week Number Calculation Off-by-One
**What goes wrong:** Week numbers don't match user expectations ("Week 4" when actually Week 3)
**Why it happens:** Confusing sprint.weeks[0].week (1 or 2) with absolute week number in year
**How to avoid:** Calculate absolute week from cycle number: (cycleNum * 2) - 1 for sprint A, (cycleNum * 2) for sprint B
**Warning signs:** User reports "wrong week shown in timeline", dates are correct but label is wrong

### Pitfall 4: Team Filter Not Applying to Insights Query
**What goes wrong:** Changing team tab shows same data as "All Teams"
**Why it happens:** Forgot to include teamDepartment filter in MCP insights query
**How to avoid:** Context refresh() must pass currentTeam to API query, backend must filter by team field in stored insights
**Warning signs:** All team tabs show identical member lists

### Pitfall 5: Empty State Not Showing When No Data
**What goes wrong:** Blank page when no summaries for selected week
**Why it happens:** Component renders empty div instead of EmptyState component
**How to avoid:** Check summaries.length === 0 && !loading before rendering member cards
**Warning signs:** Users confused when switching to old weeks, no indication why page is blank

## Code Examples

Verified patterns from official sources:

### Health Calculation with Multiple Factors
```javascript
// Source: Phase context decision - blockers, activity, completion rate
/**
 * Calculate health status from summary data
 * @param {Object} summary - Member summary with metrics
 * @returns {Object} { status: 'green'|'yellow'|'red', reasoning: string }
 */
export function calculateHealth(summary) {
  const { blockerCount = 0, completedCount = 0, lastUpdateDays = 0 } = summary;

  // Red conditions (critical)
  if (blockerCount >= 2) {
    return {
      status: 'red',
      reasoning: `${blockerCount} blockers, immediate attention needed`
    };
  }

  if (lastUpdateDays > 3) {
    return {
      status: 'red',
      reasoning: `No updates in ${lastUpdateDays} days`
    };
  }

  // Yellow conditions (warning)
  if (blockerCount === 1) {
    return {
      status: 'yellow',
      reasoning: '1 blocker, monitor progress'
    };
  }

  if (completedCount === 0 && lastUpdateDays > 1) {
    return {
      status: 'yellow',
      reasoning: 'Low activity, no completed items'
    };
  }

  // Green (healthy)
  return {
    status: 'green',
    reasoning: `${completedCount} items completed, on track`
  };
}
```

### Team Health Count Breakdown
```javascript
// Source: Phase context decision - "3 green, 1 yellow, 1 red"
function TeamHealthBadge({ summaries }) {
  const healthCounts = summaries.reduce((acc, summary) => {
    const health = calculateHealth(summary);
    acc[health.status] = (acc[health.status] || 0) + 1;
    return acc;
  }, {});

  return (
    <div className="flex items-center gap-2 text-sm">
      {healthCounts.green > 0 && (
        <Badge variant="outline" className="border-green-500 text-green-700">
          {healthCounts.green} green
        </Badge>
      )}
      {healthCounts.yellow > 0 && (
        <Badge variant="outline" className="border-yellow-500 text-yellow-700">
          {healthCounts.yellow} yellow
        </Badge>
      )}
      {healthCounts.red > 0 && (
        <Badge variant="outline" className="border-red-500 text-red-700">
          {healthCounts.red} red
        </Badge>
      )}
    </div>
  );
}
```

### Empty State Component
```javascript
// Source: BugDashboard empty state pattern
import { Card, CardContent } from '@/components/ui/card';
import { Users } from 'lucide-react';

function EmptyState({ currentWeek }) {
  return (
    <Card>
      <CardContent className="py-12 text-center">
        <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
        <p className="text-muted-foreground mb-2">
          No team summaries for this week
        </p>
        <p className="text-sm text-muted-foreground">
          Data will appear once daily summaries are stored via MCP
        </p>
      </CardContent>
    </Card>
  );
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Manual DOM manipulation | React state + Context | React 16.3 (2018) | Context API for cross-component state, no prop drilling |
| Custom collapsibles | Radix UI primitives | 2021+ | Accessible, keyboard nav, animation out-of-the-box |
| Inline health colors | CVA variants | 2023+ | Type-safe, consistent styling across components |
| Fetch API directly | Context-wrapped API client | Project convention | Centralized loading/error states, auth handling |

**Deprecated/outdated:**
- Class components with lifecycle methods: Replaced by functional components with hooks (useState, useEffect, useMemo)
- Redux for simple dashboards: Context API sufficient for single-page state, no global store needed
- moment.js for dates: Replaced by date-fns (tree-shakeable, smaller bundle)

## Open Questions

Things that couldn't be fully resolved:

1. **MCP Insights Retrieval API**
   - What we know: Phase 19 implemented storeInsight() write operation
   - What's unclear: Does MCP server support querying stored insights by date/team, or only semantic search?
   - Recommendation: Add backend endpoint GET /api/knowledge/insights with date range + team filters, implement retrieval from MCP if available, otherwise store insights in PostgreSQL table with indexed queries

2. **Sprint Week Number Display Logic**
   - What we know: Sprints are 2601a/2601b format, cycles are 4 weeks
   - What's unclear: User expectation for "Week 4" - is it absolute week in year, or relative to cycle start?
   - Recommendation: Use relative week within sprint (Week 1-4 per cycle), matches releaseCycles utility structure

3. **Health Indicator Thresholds**
   - What we know: Phase context says "Claude's discretion" for thresholds
   - What's unclear: User tolerance for yellow vs red (is 1 blocker yellow or red?)
   - Recommendation: Start conservative (2+ blockers = red, 1 blocker = yellow), iterate based on user feedback

## Sources

### Primary (HIGH confidence)
- Codebase: src/contexts/SyncContext.jsx - Context pattern with optimistic updates
- Codebase: src/contexts/NotificationContext.jsx - Loading states and refresh pattern
- Codebase: src/pages/BugDashboard.jsx - Metrics display, filter UI, empty states
- Codebase: src/utils/releaseCycles.js - Sprint calculations, week formatting
- Codebase: Phase 19 RESEARCH.md - MCP service implementation, storeInsight API
- Radix UI Documentation: Collapsible, Avatar, Tabs components (already installed versions)

### Secondary (MEDIUM confidence)
- Phase 22 CONTEXT.md - User decisions on layout, health indicators, timeline
- date-fns 3.6.0 documentation - format(), differenceInDays() functions

### Tertiary (LOW confidence)
- General React best practices - useMemo for expensive calculations (needs validation with actual summary data size)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - All libraries already installed and used in codebase
- Architecture: HIGH - Follows established Context + components pattern from SyncContext and BugDashboard
- Pitfalls: HIGH - Based on actual codebase patterns and common React dashboard mistakes
- MCP insights retrieval: MEDIUM - Phase 19 implemented write-only, read API may need implementation

**Research date:** 2026-01-29
**Valid until:** 2026-02-28 (30 days - stable React/Radix UI ecosystem)
