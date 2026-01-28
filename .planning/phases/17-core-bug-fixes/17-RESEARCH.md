# Phase 17: Core Bug Fixes - Research

**Researched:** 2026-01-28
**Domain:** React state management, JavaScript data transformation, time-series calculations
**Confidence:** HIGH

## Summary

This phase fixes 5 critical bugs in the Bug Dashboard related to component extraction, filtering, chart data, and KPI calculations. The research focused on understanding the existing implementation patterns in the codebase and identifying correct approaches for:

1. String parsing and categorization logic for component extraction
2. React state synchronization patterns for filter propagation
3. Array filtering and transformation for consistent data flow
4. Rolling window calculations for time-series metrics

The existing codebase uses React 18, Recharts 2.15.1, and follows established patterns from v1.2-v1.3. The bugs are implementation errors rather than architectural issues - all fixes can be made within the existing structure.

**Primary recommendation:** Fix bugs incrementally in two plans - (1) backend component extraction and frontend filter population, (2) filter propagation and KPI formula correction.

## Standard Stack

The established libraries/tools already in use:

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| React | 18.2.0 | UI framework | Already in use, proven v1.2-v1.3 |
| Recharts | 2.15.1 | Chart rendering | Already in use for all charts |
| Express | 4.18.2 | Backend API | Already in use for BugService |
| PostgreSQL | via pg 8.11.3 | Database | Already in use for bugs table |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| date-fns | 3.6.0 | Date manipulation | For rolling window calculations |
| fast-csv | 5.0.5 | CSV parsing | Already parsing labels/components |

**No new dependencies needed** - all bugs fixable with existing stack.

## Architecture Patterns

### Pattern 1: Component Extraction Logic
**What:** Extract component from bug labels and summary text using pattern matching
**When to use:** During CSV parsing enrichment phase
**Current bug:** Only uses CSV Component/s column, ignores labels and summary
**Fix approach:** Add pattern matching to extractComponent() method

**Example:**
```javascript
// server/services/BugService.js
extractComponent(bug) {
  // Priority 1: Check labels for component patterns
  if (bug.labels && bug.labels.length > 0) {
    for (const label of bug.labels) {
      if (label.includes('deploy-metering')) return 'deploy-metering';
      if (label.includes('service-broker')) return 'service-broker';
      if (label.includes('foss-vulnerabilities')) return 'foss-vulnerabilities';
      if (label.includes('cm-metering')) return 'cm-metering';
      if (label.includes('sdm-metering')) return 'sdm-metering';
    }
  }

  // Priority 2: Check summary text for component keywords
  if (bug.summary) {
    const summaryLower = bug.summary.toLowerCase();
    if (summaryLower.includes('deploy') && summaryLower.includes('metering'))
      return 'deploy-metering';
    if (summaryLower.includes('service broker'))
      return 'service-broker';
    // ... etc
  }

  // Priority 3: Fall back to CSV Component/s column
  if (bug.csv_components && bug.csv_components.length > 0) {
    return bug.csv_components[0];
  }

  return 'other';
}
```

### Pattern 2: Filter State Propagation
**What:** Single filter state variable triggers multiple data fetches via useEffect
**When to use:** When filter changes need to update KPIs, charts, and tables simultaneously
**Current bug:** Component filter populated from hardcoded ALLOWED_COMPONENTS, not from actual data
**Fix approach:** Extract components from KPI data's category_distribution field

**Example:**
```javascript
// src/pages/BugDashboard.jsx
// Remove ALLOWED_COMPONENTS constant

// Extract components from KPIs data (dynamically from uploaded data)
const components = kpis?.category_distribution
  ? Object.keys(kpis.category_distribution).sort()
  : [];

// Component filter dropdown
<Select value={selectedComponent} onValueChange={setSelectedComponent}>
  <SelectItem value="all">All Components</SelectItem>
  {components.map((comp) => (
    <SelectItem key={comp} value={comp}>{comp}</SelectItem>
  ))}
</Select>
```

**Why this works:** The category_distribution object already contains all components found in the data. Extracting keys gives us the actual component list without filtering.

### Pattern 3: useEffect Dependency Synchronization
**What:** Multiple components fetch data based on same filter state
**When to use:** Filter changes need immediate propagation
**Current implementation:** Already correct - useEffect with [selectedComponent] dependency

**Example from existing code:**
```javascript
// BugDashboard.jsx - already has correct pattern
useEffect(() => {
  async function loadData() {
    const componentFilter = selectedComponent === 'all' ? null : selectedComponent;
    const [kpiData, bugData] = await Promise.all([
      apiClient.bugs.getKPIs(selectedUploadId, componentFilter),
      apiClient.bugs.listBugs(selectedUploadId, { component: componentFilter })
    ]);
    setKPIs(kpiData);
    setBugs(bugData);
  }
  loadData();
}, [selectedUploadId, selectedSprint, selectedComponent]);

// KPIGrid.jsx - already has correct pattern
useEffect(() => {
  async function loadHistory() {
    const history = await apiClient.bugs.getKPIHistory(4, component);
    setHistoryData(kpiHistory);
  }
  loadHistory();
}, [component]);
```

**Status:** This pattern already works correctly. No changes needed for FIX-03.

### Pattern 4: Rolling Window Calculation
**What:** Calculate average bugs per week over a 4-week sliding window
**When to use:** For bug_inflow_rate KPI calculation
**Current bug:** Simplified as `totalBugs / 4` instead of proper rolling window
**Fix approach:** Group bugs by week, then calculate 4-week rolling average

**Example:**
```javascript
// server/services/BugService.js
calculateBugInflowRate(bugs) {
  // Group bugs by week of creation
  const weeklyGroups = {};
  for (const bug of bugs) {
    if (!bug.created_date) continue;
    const weekKey = this.getWeekKey(new Date(bug.created_date));
    weeklyGroups[weekKey] = (weeklyGroups[weekKey] || 0) + 1;
  }

  // Sort weeks chronologically
  const weeks = Object.keys(weeklyGroups).sort();

  // If less than 4 weeks of data, return simple average
  if (weeks.length < 4) {
    const totalBugs = Object.values(weeklyGroups).reduce((a, b) => a + b, 0);
    return totalBugs / weeks.length;
  }

  // Calculate 4-week rolling window average (most recent 4 weeks)
  const recentWeeks = weeks.slice(-4);
  const recentBugCount = recentWeeks.reduce(
    (sum, week) => sum + weeklyGroups[week],
    0
  );
  return recentBugCount / 4;
}

// Update calculateKPIs to use this method
calculateKPIs(bugs) {
  const bugInflowRate = this.calculateBugInflowRate(bugs);
  // ... rest of KPIs
}
```

### Anti-Patterns to Avoid

- **Hardcoding component lists:** Always derive from data, never maintain separate ALLOWED_COMPONENTS array
- **Async state updates in render:** All data fetching must be in useEffect, not in render function
- **Mutating state directly:** Always use setState functions from useState
- **Filtering after fetch:** Apply filters in API query parameters, not in client-side JavaScript

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Date week calculation | Custom date math | date-fns startOfWeek/endOfWeek | Handles edge cases like year boundaries |
| String pattern matching | Manual indexOf loops | Array.find() with includes() | More readable, handles case sensitivity |
| Data grouping | Manual loop with object | Array.reduce() | Standard functional pattern |
| Week key generation | Custom ISO week logic | Existing getWeekKey() method | Already implemented and tested in BugService |

**Key insight:** The existing codebase already has utility functions like getWeekKey(). Use them rather than reimplementing.

## Common Pitfalls

### Pitfall 1: Case-Insensitive String Matching
**What goes wrong:** Labels might be "Deploy-Metering" vs "deploy-metering" - exact match fails
**Why it happens:** CSV labels come from JIRA which allows any casing
**How to avoid:** Always use .toLowerCase() before string comparisons
**Warning signs:** Component extraction works for some bugs but not others with same semantic label

### Pitfall 2: Empty Array vs Null Handling
**What goes wrong:** Code checks `if (array.length > 0)` but array might be null/undefined
**Why it happens:** CSV parsing might produce null for empty fields
**How to avoid:** Use `if (array && array.length > 0)` or optional chaining `array?.length > 0`
**Warning signs:** Crashes on specific CSV rows with missing data

### Pitfall 3: Stale Category Distribution Keys
**What goes wrong:** Component filter shows components from previous upload after new upload
**Why it happens:** React doesn't reset selectedComponent when data changes
**How to avoid:** Reset selectedComponent to 'all' when upload changes (already in handleWeekChange)
**Warning signs:** Filter dropdown shows components that don't exist in current dataset

### Pitfall 4: Rolling Window Edge Cases
**What goes wrong:** Division by zero when no bugs in dataset, or NaN for empty weeks
**Why it happens:** Not all weeks may have bugs
**How to avoid:** Check for empty datasets before division, handle weeks with 0 bugs explicitly
**Warning signs:** KPI shows NaN or Infinity

### Pitfall 5: Chart Data Transformation
**What goes wrong:** Recharts expects specific data format, wrong format shows empty chart
**Why it happens:** category_distribution is object { component: count }, Recharts needs array
**How to avoid:** Transform with Object.entries() and .map() (already done in BugCategoryChart)
**Warning signs:** Chart renders but shows "No data available"

## Code Examples

### Component Extraction with Priority Fallback
```javascript
// Source: Analyzed from BugService.js extractComponent() method
extractComponent(bug) {
  // Priority 1: Label-based detection (most reliable)
  if (bug.labels && bug.labels.length > 0) {
    const labelStr = bug.labels.join(' ').toLowerCase();
    if (labelStr.includes('deploy') && labelStr.includes('metering'))
      return 'deploy-metering';
    if (labelStr.includes('service') && labelStr.includes('broker'))
      return 'service-broker';
    if (labelStr.includes('foss') || labelStr.includes('vulnerabilit'))
      return 'foss-vulnerabilities';
    if (labelStr.includes('cm-metering'))
      return 'cm-metering';
    if (labelStr.includes('sdm-metering'))
      return 'sdm-metering';
  }

  // Priority 2: Summary text analysis
  if (bug.summary) {
    const summaryLower = bug.summary.toLowerCase();
    if (summaryLower.includes('deploy') && summaryLower.includes('meter'))
      return 'deploy-metering';
    if (summaryLower.includes('service broker'))
      return 'service-broker';
    if (summaryLower.includes('foss') || summaryLower.includes('vulnerabilit'))
      return 'foss-vulnerabilities';
    if (summaryLower.includes('cm meter'))
      return 'cm-metering';
    if (summaryLower.includes('sdm meter'))
      return 'sdm-metering';
  }

  // Priority 3: CSV Component/s column (original logic)
  if (bug.csv_components && bug.csv_components.length > 0) {
    return bug.csv_components[0];
  }

  // Default fallback
  return 'other';
}
```

### Dynamic Component List Extraction
```javascript
// Source: Modified from BugDashboard.jsx
// Remove hardcoded ALLOWED_COMPONENTS constant

// Extract components dynamically from KPI data
const components = useMemo(() => {
  if (!kpis?.category_distribution) return [];
  return Object.keys(kpis.category_distribution).sort();
}, [kpis]);

// Render component filter
<Select
  value={selectedComponent}
  onValueChange={setSelectedComponent}
  disabled={components.length === 0}
>
  <SelectTrigger className="w-[220px]">
    <SelectValue placeholder="All components" />
  </SelectTrigger>
  <SelectContent>
    <SelectItem value="all">All Components</SelectItem>
    {components.map((comp) => (
      <SelectItem key={comp} value={comp}>
        {comp}
      </SelectItem>
    ))}
  </SelectContent>
</Select>
```

### Rolling Window Calculation
```javascript
// Source: Pattern adapted for BugService.js calculateKPIs()
calculateBugInflowRate(bugs) {
  // Group bugs by ISO week of creation
  const weeklyGroups = {};
  for (const bug of bugs) {
    if (!bug.created_date) continue;
    const weekKey = this.getWeekKey(new Date(bug.created_date));
    weeklyGroups[weekKey] = (weeklyGroups[weekKey] || 0) + 1;
  }

  // Get sorted list of weeks
  const weeks = Object.keys(weeklyGroups).sort();

  // Handle insufficient data
  if (weeks.length === 0) return 0;
  if (weeks.length < 4) {
    const totalBugs = Object.values(weeklyGroups).reduce((a, b) => a + b, 0);
    return totalBugs / weeks.length;
  }

  // Calculate 4-week rolling window (most recent 4 weeks)
  const recentWeeks = weeks.slice(-4);
  const recentBugCount = recentWeeks.reduce(
    (sum, week) => sum + (weeklyGroups[week] || 0),
    0
  );

  return recentBugCount / 4;
}
```

### Filter Reset on Data Change
```javascript
// Source: Existing pattern from BugDashboard.jsx handleWeekChange
const handleWeekChange = (value) => {
  setSelectedUploadId(value);
  // Reset component filter when changing week
  setSelectedComponent('all');
};

const handleSprintChange = (value) => {
  setSelectedSprint(value);
  // Reset component filter when changing sprint
  setSelectedComponent('all');
};
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Hardcoded component list | Dynamic extraction from data | v1.4 (this phase) | Supports any component names in uploaded data |
| Simplified inflow rate | 4-week rolling window | v1.4 (this phase) | More accurate trending metric |
| CSV-only component extraction | Multi-source (labels + summary + CSV) | v1.4 (this phase) | Higher accuracy categorization |

**No deprecated patterns** - existing React patterns (useEffect, useState) are current best practice.

## Open Questions

1. **Component name normalization**
   - What we know: Components come from labels (various formats), summary (free text), CSV column (JIRA values)
   - What's unclear: Should "Deploy Metering" and "deploy-metering" be treated as same component?
   - Recommendation: Normalize all to lowercase-with-hyphens format (e.g., "deploy-metering")

2. **Partial week handling**
   - What we know: Rolling window uses last 4 weeks
   - What's unclear: What if current week is incomplete (only 2 days of data)?
   - Recommendation: Include partial weeks in calculation (matches real-world usage)

3. **Component priority conflicts**
   - What we know: A bug might match multiple component patterns (labels say "deploy-metering", summary mentions "service broker")
   - What's unclear: Which takes precedence?
   - Recommendation: Use priority order - labels first (most explicit), then summary, then CSV

## Sources

### Primary (HIGH confidence)
- Existing codebase analysis:
  - `/Users/i306072/Documents/GitHub/P-E/server/services/BugService.js` - Current implementation with bugs
  - `/Users/i306072/Documents/GitHub/P-E/src/pages/BugDashboard.jsx` - Filter UI and state management
  - `/Users/i306072/Documents/GitHub/P-E/src/components/bugs/BugCategoryChart.jsx` - Chart data transformation
  - `/Users/i306072/Documents/GitHub/P-E/src/components/bugs/KPIGrid.jsx` - KPI display with filter propagation
- Requirements document: `/Users/i306072/Documents/GitHub/P-E/.planning/REQUIREMENTS.md`
- Roadmap document: `/Users/i306072/Documents/GitHub/P-E/.planning/ROADMAP.md`

### Secondary (MEDIUM confidence)
- React 18 documentation (useState, useEffect patterns) - standard React patterns verified in existing code
- Recharts 2.15.1 patterns - already used successfully in v1.2-v1.3 implementation
- JavaScript Array methods (filter, map, reduce) - standard ES6+ patterns

### Tertiary (LOW confidence)
- None - all findings based on codebase analysis and established patterns

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - All libraries already in use, versions verified from package.json
- Architecture: HIGH - Patterns observed directly from working v1.2-v1.3 code
- Pitfalls: HIGH - Identified from actual bug manifestations in requirements and code review

**Research date:** 2026-01-28
**Valid until:** 60 days (stable React/JavaScript patterns, no fast-moving dependencies)

**Key findings:**
1. No new libraries needed - all fixes use existing stack
2. Backend bug (FIX-01) is simple string matching logic addition
3. Frontend bug (FIX-02) is removing hardcoded filter and using dynamic keys
4. Filter propagation (FIX-03) already works correctly via useEffect
5. Chart bug (FIX-04) will auto-fix when component extraction is fixed
6. Inflow rate (FIX-05) needs proper rolling window calculation implementation

**Implementation complexity:**
- Low complexity - all bugs are implementation errors, not design issues
- High confidence - patterns already proven in v1.2-v1.3
- Low risk - changes isolated to BugService and BugDashboard components
