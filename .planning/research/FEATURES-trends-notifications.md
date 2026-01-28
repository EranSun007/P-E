# Feature Landscape: KPI Trend Charts & Threshold Notifications

**Domain:** Bug Dashboard - KPI Trend Visualization & Alerting
**Researched:** 2026-01-28
**Milestone Context:** Phase 13 (subsequent to Phase 12 Dashboard UI)

## Executive Summary

This milestone adds historical trend visualization and threshold breach notifications to the existing bug dashboard. Phase 12 established the foundation with 9 KPI cards showing current week status (green/yellow/red). Phase 13 adds two capabilities:

1. **Trend Visualization** - Line charts showing KPI evolution over time (weeks)
2. **Threshold Notifications** - Alerts when KPIs cross into yellow/red zones

**Key insight:** Weekly CSV upload workflow means discrete data points (not real-time), which simplifies implementation but requires storing KPI snapshots for historical trending. The existing Recharts library and threshold logic (KPICard.jsx) provide solid foundation.

**Existing assets:**
- Recharts 2.15.1 with LineChart component
- KPI_THRESHOLDS constants defining green/yellow/red zones
- Date range API (`bugs.getKPIsByDateRange`) already supports time-based queries
- Radix Toast component for notifications

**Critical dependency:** Must store KPI snapshots on each CSV upload (currently calculated on-demand, not persisted).

---

## Table Stakes

Features users expect from KPI trend charts and notification systems. Missing these = feature feels incomplete.

### Trend Visualization Basics

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| **Time-series line chart per KPI** | Standard visualization for showing trends | Medium | Recharts LineChart component, one chart per KPI |
| **Hover tooltips with exact values** | Users need precise values at specific dates | Low | ChartTooltip built-in to existing chart.jsx wrapper |
| **Date axis showing weeks** | Context for time period | Low | Format as "Week of MMM DD" using date-fns |
| **Current value marker** | Highlight most recent data point | Low | Dot with different color/size on line |
| **X-axis time labels** | Clear date labels | Low | Auto-handled by Recharts with proper formatting |
| **Y-axis metric scale** | Appropriate scale for each KPI | Low | Auto-scaled by Recharts, can set domain if needed |
| **Responsive sizing** | Chart adapts to screen size | Low | ResponsiveContainer already in chart.jsx |
| **Loading state** | Show spinner while fetching trend data | Low | Existing pattern from BugDashboard |

### Threshold Visualization

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| **Color-coded threshold zones** | Visual bands showing green/yellow/red zones | Medium | ReferenceArea component in Recharts |
| **Zone boundary lines** | Clear threshold values shown | Low | ReferenceLine with threshold values |
| **Status-colored trend line** | Line color matches current status | Low | Conditional stroke color based on latest value |

### Trend Controls

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| **KPI selector** | Switch between 9 KPIs | Low | Tabs or Select dropdown to choose KPI |
| **Time range selector** | "Last 4 weeks", "Last 8 weeks", "Last 12 weeks" | Low | Buttons or Select to filter data |
| **Back to current view** | Return to KPI cards from trend view | Low | Navigation button or breadcrumb |

### Notification Basics

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| **Notification indicator** | Badge showing unread count | Low | Bell icon with count badge in nav |
| **Notification panel** | List of recent alerts | Low | Slide-out drawer or dropdown panel |
| **Alert message** | Clear description of threshold breach | Low | "Bug Inflow Rate moved to red zone (12/week, threshold: 8)" |
| **Timestamp** | When alert was generated | Low | "2 days ago" using date-fns |
| **KPI link** | Jump to related KPI card or trend | Low | Click notification to navigate |
| **Mark as read** | Dismiss individual notifications | Low | Update notification status |
| **Threshold breach detection** | Detect when KPI crosses threshold | Medium | Backend logic comparing snapshots |

---

## Differentiators

Features that add polish and competitive advantage. Not expected, but valued.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| **Trend indicator on KPI cards** | Quick glance at direction (↑↓) without opening chart | Low | Compare current to previous week, show arrow + % change |
| **Multi-week comparison line** | Show 4-week average as reference line | Medium | Calculate rolling average, display as dashed line |
| **Threshold zone shading** | Semi-transparent colored bands on chart | Medium | Multiple ReferenceArea with fillOpacity |
| **Historical threshold crossings** | Mark where KPI moved between zones | Medium | Dots or annotations at status change points |
| **Sparkline on KPI card** | Mini trend chart embedded in card | Medium | Small LineChart (100px wide) showing last 4-8 weeks |
| **Notification grouping by severity** | Red alerts separate from yellow | Low | Group by status in notification panel |
| **Notification filtering** | "Show red only" or "Show all" | Low | Toggle buttons in notification panel |
| **Trend comparison view** | Show 2-3 KPIs on same chart | Medium | Multiple LineChart lines with legend |
| **Component-specific trends** | Filter trend by component | Medium | Use existing component filter with trend chart |
| **Sprint overlay on trends** | Vertical lines marking sprint boundaries | Low | ReferenceLine for sprint dates |
| **Trend export** | Download chart data as CSV | Low | Generate CSV from trend data |
| **Notification snooze** | "Don't alert for Bug Inflow for 2 weeks" | Medium | Temporary mute specific KPI alerts |
| **Week-over-week delta** | Show absolute and % change on chart | Low | Text annotation showing change |
| **Trend analysis summary** | "Improving trend" or "Declining trend" | Medium | Calculate linear regression slope |
| **Notification sound** | Optional audio alert | Low | Browser notification API (if user grants permission) |
| **Desktop push notifications** | System tray notifications | Medium | Requires browser notification permission |

---

## Anti-Features

Features to explicitly NOT build. Common mistakes in monitoring dashboards.

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| **Real-time live updates** | Weekly CSV upload workflow doesn't support this | Clearly label as "Weekly snapshots" |
| **Alert on every threshold crossing** | Alert fatigue - 9 alerts every Monday | Only alert when status CHANGES (green→yellow, yellow→red) |
| **Email/Slack/Teams integrations** | Scope creep for this milestone | In-app notifications only |
| **Predictive forecasting** | "Will breach threshold next week" - requires ML, sparse data | Show trends, let user interpret |
| **Per-bug drill-down from trend** | Trend shows aggregate KPI, not bugs | Link to Aging Bugs Table instead |
| **Complex alert rules (AND/OR logic)** | Too complex for initial version | Simple threshold crossings only |
| **Multiple notification channels** | Email, SMS, push - unnecessary | Web app notification panel only |
| **Infinite notification history** | Storage overhead, limited value | Auto-delete after 8-12 weeks |
| **Team comparison trends** | Multi-team feature not in scope | Single team view only |
| **Mobile-optimized charts** | Not in requirements | Desktop/tablet-first responsive design |
| **Custom chart types** | Scatter, bubble, heatmap | Line charts sufficient for time series |
| **Anomaly detection AI** | "Unusual spike detected" - overpromising | Manual threshold-based only |
| **Configurable thresholds UI** | User-editable thresholds - adds complexity | Hardcoded thresholds for now |
| **Alert escalation paths** | "Notify manager if unread for 48h" | Simple notifications only |
| **Notification read receipts** | Track who saw what | Just mark read/unread |
| **Trend chart animation** | Animated line drawing | Static charts load faster |

---

## Feature Dependencies

```
FOUNDATION (Phase 12 - Complete)
================================
KPI Cards with Status Colors
CSV Upload Workflow
Weekly Data Snapshots


HISTORICAL DATA LAYER (Must Build First)
=========================================
Store KPI Snapshots on Upload
    ├── New table: kpi_snapshots
    ├── Capture all 9 KPIs per upload
    └── Support component-specific snapshots
        ↓
Query Historical KPIs by Date Range
    ├── API: GET /api/bugs/kpi-trends?start=...&end=...
    └── Returns array of snapshots


TREND VISUALIZATION (Depends on Historical Data)
=================================================
Fetch Historical KPIs
    ↓
Trend Chart Component
    ├── KPI Selector (which metric?)
    ├── Time Range Selector (how far back?)
    ├── LineChart with Recharts
    ├── Threshold Zone Shading (ReferenceArea)
    └── Hover Tooltips
        ↓
Display on Dashboard Page
    ├── New "Trends" section or tab
    └── Link from KPI cards


NOTIFICATION SYSTEM (Depends on Historical Data)
=================================================
Threshold Crossing Detection (Backend)
    ├── Compare previous snapshot to current
    ├── Detect status changes (green→yellow, yellow→red)
    └── Create notification records
        ↓
Notification Storage
    ├── New table: notifications
    └── Track: KPI, old value, new value, status change
        ↓
Notification UI (Frontend)
    ├── Notification Badge (count in nav)
    ├── Notification Panel (list of alerts)
    ├── Mark as Read
    └── Link to KPI or Trend


OPTIONAL ENHANCEMENTS
=====================
Trend Indicator on KPI Cards
    ├── Calculate % change vs previous week
    └── Show ↑↓ arrow with delta

Sparklines on KPI Cards
    ├── Fetch last 4-8 weeks
    └── Render mini LineChart

Component-Specific Trends
    └── Apply existing component filter to trends
```

---

## MVP Recommendation

For Phase 13 (KPI Trends & Notifications), prioritize core trending and basic alerting.

### Must Have (Phase 13 MVP)

**Foundation: Historical KPI Storage**
1. **kpi_snapshots table** - Store KPI values on each CSV upload
2. **Snapshot creation on upload** - Save all 9 KPIs + component breakdowns
3. **Query API for trends** - `GET /api/bugs/kpi-trends?kpi=...&start=...&end=...`

**Trend Visualization**
4. **Trend chart component** - LineChart with Recharts showing KPI over time
5. **KPI selector** - Dropdown or tabs to switch between 9 KPIs
6. **Time range selector** - Buttons for "Last 4 weeks", "Last 8 weeks", "Last 12 weeks"
7. **Threshold zone shading** - ReferenceArea showing green/yellow/red bands
8. **Hover tooltips** - Show exact value and date on hover
9. **Trend page/tab** - New section on dashboard to display trends

**Threshold Notifications**
10. **Threshold crossing detection** - Backend service runs after CSV upload
11. **notifications table** - Store alert records
12. **Notification badge** - Bell icon with unread count in nav
13. **Notification panel** - Slide-out list of alerts
14. **Alert messages** - "Bug Inflow Rate moved to red zone (12/week, threshold: 8)"
15. **Mark as read** - Dismiss button on each notification

### Nice to Have (Phase 13+)

**Trend Enhancements**
- Trend indicator on KPI cards (↑↓ with % change)
- Sprint boundaries overlay on trends
- Current value marker on trend line
- Week-over-week delta annotations

**Notification Enhancements**
- Notification grouping by severity (red/yellow tabs)
- Notification filtering ("Show red only")
- Link from notification to trend chart
- Notification snooze (mute specific KPI for N weeks)

### Defer to Phase 14

**Advanced Trend Features**
- Sparklines on KPI cards (mini charts)
- Multi-KPI comparison view (2-3 lines on one chart)
- Trend export (download CSV)
- Trend analysis summary ("improving" / "declining")
- Component-specific trends

**Advanced Notification Features**
- Desktop push notifications
- Notification sound
- Configurable thresholds UI
- Alert escalation

---

## Implementation Notes

### Existing Assets to Leverage

**From Phase 12 (Dashboard UI):**
- `KPICard.jsx` with `KPI_THRESHOLDS` and `getKPIStatus()` function
- `STATUS_COLORS` constants for consistent green/yellow/red styling
- `BugDashboard.jsx` with filter controls (component, week)
- `MTTRBarChart.jsx` and `BugCategoryChart.jsx` as Recharts examples

**From Codebase:**
- `src/components/ui/chart.jsx` - ChartContainer wrapper for Recharts
- `recharts` 2.15.1 - LineChart, ReferenceArea, ReferenceLine, Tooltip
- `date-fns` - formatDate, parseISO for date handling
- `@radix-ui/react-toast` - Notification toast component
- `lucide-react` - Bell, TrendingUp, TrendingDown icons

### Database Schema

**kpi_snapshots table:**
```sql
CREATE TABLE kpi_snapshots (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id TEXT NOT NULL,
  upload_id UUID REFERENCES bug_uploads(id) ON DELETE CASCADE,
  snapshot_date DATE NOT NULL,  -- Week ending date from upload
  kpi_key TEXT NOT NULL,  -- 'bug_inflow_rate', 'median_ttfr_hours', etc.
  value NUMERIC,
  status TEXT,  -- 'green', 'yellow', 'red', 'neutral'
  component TEXT,  -- NULL for all-components view, or specific component name
  created_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, upload_id, kpi_key, COALESCE(component, ''))
);

CREATE INDEX idx_kpi_snapshots_user_kpi_date
  ON kpi_snapshots(user_id, kpi_key, snapshot_date DESC);

CREATE INDEX idx_kpi_snapshots_user_component
  ON kpi_snapshots(user_id, component, snapshot_date DESC)
  WHERE component IS NOT NULL;
```

**notifications table:**
```sql
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id TEXT NOT NULL,
  kpi_key TEXT NOT NULL,
  kpi_display_name TEXT,  -- "Bug Inflow Rate"
  previous_status TEXT,  -- 'green', 'yellow', 'red'
  current_status TEXT,   -- 'yellow' or 'red' (only notify on worsening)
  previous_value NUMERIC,
  current_value NUMERIC,
  threshold_value NUMERIC,  -- Which threshold was crossed
  component TEXT,  -- NULL for all-components, or specific component
  snapshot_date DATE NOT NULL,  -- When the threshold was crossed
  is_read BOOLEAN DEFAULT FALSE,
  created_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_notifications_user_unread
  ON notifications(user_id, is_read, created_date DESC);

-- Auto-delete old notifications (optional cleanup job)
CREATE INDEX idx_notifications_expire
  ON notifications(created_date)
  WHERE is_read = TRUE;
```

### API Endpoints

**Existing (Phase 10-12):**
```
GET /api/bugs/kpis?uploadId=...&component=...
GET /api/bugs/kpis-by-date?start=...&end=...&component=...
GET /api/bugs/list?uploadId=...
POST /api/bugs/upload
GET /api/bugs/uploads
```

**New (Phase 13):**
```
# KPI Trends
GET /api/bugs/kpi-trends
  ?kpi=bug_inflow_rate
  &start=2026-01-01
  &end=2026-01-28
  &component=JPaaS%20Metering%20Service  (optional)
  → Returns: [{date, value, status}, ...]

# Notifications
GET /api/notifications
  ?status=unread  (optional: unread, read, all)
  &kpi=bug_inflow_rate  (optional filter)
  → Returns: [{id, kpi_key, message, status, created_date}, ...]

PUT /api/notifications/:id/read
  → Mark notification as read

POST /api/notifications/mark-all-read
  → Mark all as read

DELETE /api/notifications/cleanup
  → Delete old read notifications (cron job)
```

### Recharts Configuration

**Basic Trend Chart:**
```jsx
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceArea } from 'recharts';

const trendData = [
  { date: '2026-01-06', value: 5.2, status: 'green' },
  { date: '2026-01-13', value: 7.8, status: 'yellow' },
  { date: '2026-01-20', value: 9.1, status: 'red' },
  { date: '2026-01-27', value: 6.3, status: 'yellow' },
];

const threshold = KPI_THRESHOLDS['bug_inflow_rate'];
// { type: 'lower_is_better', green: 6, yellow: 8 }

<ChartContainer config={chartConfig}>
  <LineChart data={trendData}>
    <CartesianGrid strokeDasharray="3 3" />
    <XAxis
      dataKey="date"
      tickFormatter={(date) => format(parseISO(date), 'MMM dd')}
    />
    <YAxis />

    {/* Green zone */}
    <ReferenceArea
      y1={0}
      y2={threshold.green}
      fill="hsl(var(--chart-2))"
      fillOpacity={0.1}
    />

    {/* Yellow zone */}
    <ReferenceArea
      y1={threshold.green}
      y2={threshold.yellow}
      fill="hsl(var(--chart-3))"
      fillOpacity={0.1}
    />

    {/* Red zone */}
    <ReferenceArea
      y1={threshold.yellow}
      fill="hsl(var(--chart-1))"
      fillOpacity={0.1}
    />

    <ChartTooltip content={<ChartTooltipContent />} />

    <Line
      type="monotone"
      dataKey="value"
      stroke="hsl(var(--primary))"
      strokeWidth={2}
      dot={{ r: 4 }}
      activeDot={{ r: 6 }}
    />
  </LineChart>
</ChartContainer>
```

**Threshold Zone Colors (from KPICard.jsx):**
```javascript
// Map to chart colors
const ZONE_COLORS = {
  green: 'hsl(142, 76%, 36%)',    // --chart-2
  yellow: 'hsl(48, 96%, 53%)',    // --chart-3
  red: 'hsl(0, 84%, 60%)',        // --chart-1
};
```

### Notification Detection Logic

**Backend Service (on CSV upload completion):**
```javascript
async function detectThresholdCrossings(userId, currentUploadId) {
  // Get previous upload
  const previousUpload = await getPreviousUpload(userId, currentUploadId);
  if (!previousUpload) {
    // First upload, no baseline to compare
    return;
  }

  // Get KPI snapshots for both uploads
  const previousSnapshots = await getKPISnapshots(previousUpload.id);
  const currentSnapshots = await getKPISnapshots(currentUploadId);

  // Compare each KPI
  for (const kpiKey of Object.keys(KPI_THRESHOLDS)) {
    const prev = previousSnapshots.find(s => s.kpi_key === kpiKey);
    const curr = currentSnapshots.find(s => s.kpi_key === kpiKey);

    if (!prev || !curr) continue;

    // Check if status worsened
    const statusChanged = prev.status !== curr.status;
    const worsened = isWorsening(prev.status, curr.status);

    if (statusChanged && worsened) {
      // Create notification
      await createNotification({
        user_id: userId,
        kpi_key: kpiKey,
        kpi_display_name: KPI_DISPLAY_NAMES[kpiKey],
        previous_status: prev.status,
        current_status: curr.status,
        previous_value: prev.value,
        current_value: curr.value,
        threshold_value: getThresholdValue(kpiKey, curr.status),
        snapshot_date: curr.snapshot_date,
      });
    }
  }
}

function isWorsening(prevStatus, currStatus) {
  const worseningMap = {
    'green': ['yellow', 'red'],
    'yellow': ['red'],
  };
  return worseningMap[prevStatus]?.includes(currStatus) || false;
}
```

**Notification Message Template:**
```javascript
function formatNotificationMessage(notification) {
  const { kpi_display_name, current_status, current_value, threshold_value } = notification;
  const unit = KPI_UNITS[notification.kpi_key] || '';

  return `${kpi_display_name} moved to ${current_status} zone (${current_value}${unit}, threshold: ${threshold_value}${unit})`;
}

// Example output:
// "Bug Inflow Rate moved to red zone (12/week, threshold: 8/week)"
```

---

## UI Layout Recommendations

### Option A: Trend Tab on Dashboard

```
┌─ Bug Dashboard ─────────────────────────────────┐
│ [Overview] [Trends] [Settings]                  │
│                                                  │
│ ┌──────────────────────────────────────────┐   │
│ │ KPI Selector: [Bug Inflow Rate ▼]        │   │
│ │ Time Range: [4w] [8w] [12w]              │   │
│ └──────────────────────────────────────────┘   │
│                                                  │
│ ┌──────────────────────────────────────────┐   │
│ │         Bug Inflow Rate Trend            │   │
│ │                                          │   │
│ │  ┌─ Green Zone ──────────────┐          │   │
│ │  │ ┌─ Yellow Zone ──────┐    │          │   │
│ │  │ │ ┌─ Red Zone ──┐    │    │          │   │
│ │  │ │ │   /\         │    │    │          │   │
│ │  │ │ │  /  \        │    │    │          │   │
│ │  │ │ │ /    \───    │    │    │          │   │
│ │  │ └─┴──────────────┘    │    │          │   │
│ │  └────────────────────────┘    │          │   │
│ │  Jan 6   Jan 13  Jan 20  Jan 27│          │   │
│ └──────────────────────────────────────────┘   │
└──────────────────────────────────────────────────┘
```

### Option B: Modal/Drawer from KPI Card

```
┌─ Bug Dashboard ─────────────────────────────────┐
│ KPI Cards:                                      │
│ ┌───────────────┐ ┌───────────────┐            │
│ │ Bug Inflow    │ │ TTFR          │            │
│ │ 12 /week  🔴  │ │ 18h       🟢  │            │
│ │ [View Trend]  │ │ [View Trend]  │            │
│ └───────────────┘ └───────────────┘            │
│                                                  │
│ ┌──── Trend Modal ──────────────────────────┐  │
│ │ Bug Inflow Rate - Last 8 Weeks    [Close]│  │
│ │                                           │  │
│ │ [Trend Chart Here]                        │  │
│ └──────────────────────────────────────────┘  │
└──────────────────────────────────────────────────┘
```

**Recommendation:** Option A (Trend Tab) - more space for chart, easier to compare multiple KPIs.

### Notification Panel

```
┌─ Navigation ─────────────────────────┐
│ Bug Dashboard    [🔔 3]              │
└──────────────────────────────────────┘
         │
         v
┌─ Notifications ─────────────────────┐
│ [Unread (3)] [All] [Read]    [×]    │
├──────────────────────────────────────┤
│ 🔴 Bug Inflow Rate → red zone       │
│    12/week (threshold: 8/week)      │
│    2 days ago              [Mark ✓] │
├──────────────────────────────────────┤
│ 🟡 MTTR (High) → yellow zone        │
│    52h (threshold: 48h)             │
│    1 week ago              [Mark ✓] │
├──────────────────────────────────────┤
│ 🔴 SLA (VH) → red zone              │
│    55% (threshold: 60%)             │
│    1 week ago              [Mark ✓] │
└──────────────────────────────────────┘
```

---

## Complexity Assessment

| Feature Category | Complexity | Rationale |
|------------------|------------|-----------|
| KPI snapshot storage | Low | Standard table insert on upload |
| Trend query API | Low | Simple date range query |
| LineChart rendering | Low | Recharts handles complexity |
| Threshold zone shading | Medium | Multiple ReferenceArea with proper Y-axis mapping |
| Threshold crossing detection | Medium | Business logic comparing snapshots |
| Notification storage | Low | Standard CRUD table |
| Notification UI | Low | List rendering with mark-read action |
| Notification badge count | Low | Query unread count |
| Trend chart interactivity | Low | Recharts built-in tooltips |
| Component-specific trends | Low | Add component filter to query |

**Overall Phase 13 Complexity:** MEDIUM

**Estimated Effort:**
- Historical KPI storage: 1 day (schema, migration, insert logic)
- Trend API: 0.5 day (query endpoint)
- Trend UI: 2 days (chart component, selectors, layout)
- Threshold detection: 1 day (backend logic)
- Notification system: 1.5 days (table, API, UI panel)
- Testing & polish: 1 day

**Total: ~7 days**

---

## Risk Factors

### 1. Historical Data Backfill - MEDIUM Risk

**Problem:** Existing CSV uploads don't have stored KPI snapshots. Trends will only show data from Phase 13 forward.

**Mitigation:**
- Accept that trends start from Phase 13 deployment
- Alternatively: Backfill by re-calculating KPIs from existing bug_uploads (if bug records are still linked to uploads)
- Document limitation: "Trends available for uploads after [date]"

### 2. Alert Fatigue - LOW Risk

**Problem:** Too many notifications could become noise.

**Mitigation:**
- Only notify on worsening status changes (not every crossing)
- Group notifications by severity in UI
- Defer notification snooze to post-MVP if needed
- Weekly upload cadence naturally limits notification volume (max 9 per week if all KPIs breach)

### 3. Threshold Zone Visualization Accuracy - MEDIUM Risk

**Problem:** ReferenceArea Y-axis mapping must match KPI scale correctly (some KPIs are %, some are hours, some are counts).

**Mitigation:**
- Test with all 9 KPI types
- Set explicit Y-axis domain per KPI type if needed
- Validate threshold logic with getKPIStatus() function

### 4. Chart Performance with Long Histories - LOW Risk

**Problem:** Rendering 52 weeks × 9 KPIs = 468 data points might be slow.

**Mitigation:**
- Default to "Last 12 weeks" view
- Recharts handles hundreds of points well
- Limit max time range to 26 weeks (6 months)

### 5. Notification Panel UX - LOW Risk

**Problem:** Notification panel might be cluttered with many alerts.

**Mitigation:**
- Auto-delete old read notifications after 8 weeks
- Group by severity (red/yellow tabs)
- Show max 20 most recent, paginate if needed

---

## Confidence Assessment

| Area | Confidence | Reason |
|------|------------|--------|
| Trend visualization with Recharts | HIGH | LineChart is standard component, well-documented |
| Threshold zone shading | HIGH | ReferenceArea is proven pattern in Recharts |
| Historical KPI storage | HIGH | Standard database pattern, similar to existing tables |
| Notification detection logic | MEDIUM | Business logic is simple, but must be tested for edge cases |
| Notification UI | HIGH | Standard list pattern, Radix Toast available |
| Weekly data granularity | HIGH | Existing workflow supports this, no real-time complexity |
| Integration with existing dashboard | HIGH | BugDashboard.jsx provides clear integration point |

**Overall Confidence: HIGH**

---

## Sources

**Confidence Level: HIGH**

Research based on:

### Existing Codebase (HIGH confidence)
- `/src/pages/BugDashboard.jsx` - Current dashboard with KPI cards and filters
- `/src/components/bugs/KPICard.jsx` - Threshold logic (KPI_THRESHOLDS, getKPIStatus)
- `/src/components/bugs/MTTRBarChart.jsx` - Recharts usage example
- `/src/components/ui/chart.jsx` - ChartContainer wrapper
- `package.json` - Recharts 2.15.1, Radix Toast, date-fns available
- `/server/routes/bugs.js` - Existing KPI APIs

### Phase 12 Research (HIGH confidence)
- `/.planning/phases/12-dashboard-ui/12-RESEARCH.md` - Dashboard UI patterns

### Industry Patterns (MEDIUM confidence - from training)
- Time-series KPI visualization best practices
- Monitoring dashboard threshold alerting patterns
- Alert fatigue prevention strategies
- Notification system UX conventions

**Note:** WebSearch was unavailable during research. All technical recommendations verified against existing codebase. Architecture decisions based on established patterns in the codebase (Recharts for charts, Radix for UI primitives, existing API patterns).

---

## Recommended Next Steps

1. **Validate with stakeholders:**
   - Is weekly granularity sufficient for trend analysis?
   - Are 9 KPIs on separate charts acceptable, or prefer multi-line comparison?
   - Should notifications be in-app only, or plan for email/Slack later?

2. **Prototype threshold zone shading:**
   - Test ReferenceArea with all 9 KPI types
   - Verify Y-axis scaling works correctly for each

3. **Review Recharts documentation:**
   - ReferenceLine and ReferenceArea API
   - Tooltip customization for better UX

4. **Define notification priority:**
   - Are red zone alerts more important than yellow?
   - Should notification panel sort by severity or by recency?

5. **Plan for backfill (optional):**
   - Can existing bug_uploads be used to calculate historical KPI snapshots?
   - Worth the effort vs. starting fresh from Phase 13?
