# Architecture Patterns: KPI Trend Charts & Threshold Notifications

**Domain:** Express/React/PostgreSQL Time Series Visualization & Alert System
**Researched:** 2026-01-28
**Confidence:** HIGH

## Executive Summary

KPI trend charts and threshold notifications integrate seamlessly with the existing Express/React/PostgreSQL architecture. The project already has all foundational pieces: Recharts for visualization, weekly_kpis table for time-series data, notification system for alerts, and established service patterns. No job scheduler or email infrastructure exists yet, requiring new dependencies (node-cron for scheduling, nodemailer for email).

**Key architectural decisions:**
1. **Time-series queries:** Extend BugService with historical KPI queries across multiple weekly_kpis rows
2. **Trend visualization:** Add Recharts LineChart/AreaChart components following existing chart patterns
3. **Threshold monitoring:** New ThresholdService evaluates KPIs against configurable thresholds on upload
4. **Notification delivery:** Extend NotificationService with in-app alerts first, email optional via nodemailer
5. **Scheduling:** Introduce node-cron for periodic threshold checks (lightweight, no Redis needed)

**Build order:** Historical queries → Trend charts → Threshold evaluation → Notification integration → (Optional) Email delivery

## Recommended Architecture

### System Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                     Frontend (React)                            │
├─────────────────────────────────────────────────────────────────┤
│  BugDashboard.jsx                                               │
│    ├─ KPITrendChart.jsx (NEW)  ← Recharts LineChart           │
│    ├─ KPICard.jsx (exists)     ← Add trend indicator           │
│    └─ NotificationBell.jsx (NEW) ← Badge for unread alerts    │
│                                                                 │
│  API Calls:                                                     │
│    ├─ GET /api/bugs/kpis/history?weeks=8&component=X (NEW)    │
│    ├─ GET /api/notifications (exists)                          │
│    └─ PUT /api/notifications/:id (mark read - exists)         │
└─────────────────────────────────────────────────────────────────┘
                            ↓ HTTP
┌─────────────────────────────────────────────────────────────────┐
│                     Backend (Express)                           │
├─────────────────────────────────────────────────────────────────┤
│  Routes:                                                        │
│    ├─ bugs.js (EXTEND)                                         │
│    │    └─ GET /kpis/history → BugService.getKPIHistory()     │
│    ├─ notifications.js (exists)                                │
│    │    └─ GET /api/notifications → NotificationService.list()│
│    └─ thresholds.js (NEW - optional)                           │
│         └─ GET /api/thresholds → ThresholdService.list()      │
│                                                                 │
│  Services:                                                      │
│    ├─ BugService.js (EXTEND)                                  │
│    │    ├─ getKPIHistory(userId, weeks, component)            │
│    │    └─ uploadCSV() → triggers threshold check (MODIFIED)  │
│    ├─ ThresholdService.js (NEW)                               │
│    │    ├─ evaluateKPIs(kpis, uploadId)                       │
│    │    ├─ createNotificationIfBreached(userId, kpi, value)   │
│    │    └─ list/create/update/delete thresholds               │
│    └─ NotificationService.js (exists - no changes needed)     │
│                                                                 │
│  Scheduler (NEW):                                              │
│    └─ scheduler/kpiMonitor.js                                  │
│         └─ node-cron: 0 8 * * 1 (weekly Monday 8am)           │
│              └─ Check thresholds for all users/uploads         │
│                                                                 │
│  Email (OPTIONAL):                                             │
│    └─ services/EmailService.js (NEW - only if email needed)   │
│         └─ sendThresholdAlert(user, kpi, value)               │
└─────────────────────────────────────────────────────────────────┘
                            ↓ SQL
┌─────────────────────────────────────────────────────────────────┐
│                   PostgreSQL Database                           │
├─────────────────────────────────────────────────────────────────┤
│  weekly_kpis (EXISTS)                                          │
│    ├─ upload_id (FK)                                           │
│    ├─ component (VARCHAR)                                      │
│    ├─ kpi_data (JSONB) ← { bug_inflow_rate, sla_vh_percent }  │
│    └─ calculated_at (TIMESTAMP)                                │
│                                                                 │
│  notifications (EXISTS)                                         │
│    ├─ id, user_id, message, read                              │
│    ├─ scheduled_date (TIMESTAMP)                               │
│    └─ created_date (TIMESTAMP)                                 │
│                                                                 │
│  kpi_thresholds (NEW - optional)                               │
│    ├─ id, user_id, kpi_name                                    │
│    ├─ warning_threshold (NUMERIC)                              │
│    ├─ critical_threshold (NUMERIC)                             │
│    └─ notification_enabled (BOOLEAN)                           │
│                                                                 │
│  bug_uploads (EXISTS - join key for historical queries)        │
│    ├─ id, user_id, week_ending                                │
│    └─ uploaded_at (TIMESTAMP)                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Component Boundaries

| Component | Responsibility | Communicates With | State |
|-----------|----------------|-------------------|-------|
| **BugDashboard.jsx** | Orchestrate KPI display, trend charts, filters | KPITrendChart, KPICard, apiClient | Current + EXTEND with historical KPIs |
| **KPITrendChart.jsx** (NEW) | Render multi-week KPI line chart | Recharts LineChart, apiClient | Read-only (receives data from parent) |
| **ThresholdService.js** (NEW) | Evaluate KPIs against thresholds, create notifications | BugService (get KPIs), NotificationService (create) | Stateless |
| **BugService.js** | Provide KPI time-series data | weekly_kpis table (multi-row queries) | EXTEND with history queries |
| **NotificationService.js** | Store/retrieve notifications | notifications table | EXISTS - no changes |
| **kpiMonitor.js** (NEW) | Scheduled threshold checks | ThresholdService, BugService | Cron job runner |
| **EmailService.js** (OPTIONAL) | Send email alerts | nodemailer, SMTP server | NEW - only if email required |

### Data Flow

**Flow 1: Historical KPI Query (Trend Charts)**
```
1. User views BugDashboard
2. Frontend calls GET /api/bugs/kpis/history?weeks=8&component=all
3. BugService.getKPIHistory():
   - Queries weekly_kpis table for last 8 weeks (JOIN with bug_uploads on week_ending)
   - Returns array: [{ week_ending, kpi_data }, ...]
4. Frontend transforms to Recharts format:
   [{ week: '2026-01-11', bug_inflow_rate: 6.2, sla_vh_percent: 85 }, ...]
5. KPITrendChart renders LineChart with multiple lines (one per KPI)
```

**Flow 2: Threshold Evaluation (On Upload)**
```
1. User uploads CSV via POST /api/bugs/upload
2. BugService.uploadCSV():
   - Parses CSV, calculates KPIs, stores in weekly_kpis (existing logic)
   - NEW: Calls ThresholdService.evaluateKPIs(kpis, uploadId)
3. ThresholdService.evaluateKPIs():
   - Fetches thresholds for user (or uses defaults)
   - Checks each KPI against warning/critical thresholds
   - If breached: NotificationService.create({ message: "SLA VH below 60%" })
4. Frontend polls GET /api/notifications or uses existing notification bell
```

**Flow 3: Scheduled Monitoring (Weekly Check)**
```
1. Cron job triggers Monday 8am: scheduler/kpiMonitor.js
2. For each user with uploads:
   - Fetch most recent upload's KPIs
   - ThresholdService.evaluateKPIs(kpis, uploadId)
3. If thresholds breached:
   - Create in-app notification
   - (Optional) EmailService.sendThresholdAlert()
4. User sees notification on next login
```

## Integration Points

### 1. Existing BugService (server/services/BugService.js)

**Current state:** Provides `getKPIs(userId, uploadId, component)` for single week

**Integration:**
```javascript
// ADD NEW METHOD to BugService.js
/**
 * Get KPI history across multiple weeks for trend analysis
 * @param {string} userId - User ID
 * @param {number} weeks - Number of weeks to retrieve (default 8)
 * @param {string|null} component - Optional component filter
 * @returns {Array} - Array of { week_ending, kpi_data, upload_id }
 */
async getKPIHistory(userId, weeks = 8, component = null) {
  const sql = `
    SELECT
      bu.week_ending,
      wk.kpi_data,
      wk.upload_id,
      wk.calculated_at
    FROM weekly_kpis wk
    JOIN bug_uploads bu ON wk.upload_id = bu.id
    WHERE bu.user_id = $1
      AND wk.component IS NOT DISTINCT FROM $2
    ORDER BY bu.week_ending DESC
    LIMIT $3
  `;

  const result = await query(sql, [userId, component, weeks]);

  // Return in chronological order (oldest first) for charts
  return result.rows.reverse();
}
```

**Modification to existing uploadCSV():**
```javascript
// In BugService.uploadCSV(), after storing KPIs (line 521)
// ADD threshold evaluation trigger
await client.query('COMMIT');

// NEW: Evaluate thresholds after successful upload
const ThresholdService = (await import('./ThresholdService.js')).default;
await ThresholdService.evaluateKPIs(allKPIs, uploadId, userId);

return { uploadId, bugCount, components, kpis: allKPIs };
```

### 2. Existing Bug Routes (server/routes/bugs.js)

**Current state:** Provides `/kpis`, `/list`, `/upload` endpoints

**Integration:**
```javascript
// ADD NEW ROUTE to bugs.js (after existing /kpis route)
/**
 * GET /api/bugs/kpis/history
 * Get KPI history for trend analysis
 * Query params: weeks (default 8), component (optional)
 */
router.get('/kpis/history', async (req, res) => {
  try {
    const { weeks = 8, component } = req.query;

    const history = await BugService.getKPIHistory(
      req.user.id,
      parseInt(weeks, 10),
      component === 'all' ? null : component
    );

    res.json(history);
  } catch (error) {
    console.error('GET /api/bugs/kpis/history error:', error);
    res.status(500).json({ error: 'Internal Server Error', message: error.message });
  }
});
```

### 3. Existing Notifications (No Changes Needed)

**Current state:** NotificationService and routes already exist for CRUD operations

**Integration:** Use as-is. ThresholdService will call `NotificationService.create()`:
```javascript
// Example call from ThresholdService
await NotificationService.create(userId, {
  message: `⚠️ SLA VH Compliance dropped to ${slaVhPercent.toFixed(1)}% (threshold: 60%)`,
  read: false,
  scheduled_date: null
});
```

### 4. Frontend BugDashboard (src/pages/BugDashboard.jsx)

**Current state:** Displays single-week KPIs in cards with status colors

**Integration:**
```javascript
// ADD historical KPI state and fetch
const [historicalKPIs, setHistoricalKPIs] = useState([]);

useEffect(() => {
  // Existing single-week KPI fetch remains unchanged
  // ADD parallel historical fetch for trends
  async function loadHistoricalData() {
    if (!selectedComponent) return;

    try {
      const history = await apiClient.bugs.getKPIHistory(
        8, // last 8 weeks
        selectedComponent === 'all' ? null : selectedComponent
      );
      setHistoricalKPIs(history);
    } catch (err) {
      console.error('Failed to load historical KPIs:', err);
    }
  }

  loadHistoricalData();
}, [selectedComponent]);

// PASS historicalKPIs to new KPITrendChart component
<KPITrendChart data={historicalKPIs} kpiName="bug_inflow_rate" />
```

### 5. Frontend API Client (src/api/apiClient.js)

**Current state:** Has `bugs.getKPIs()`, `bugs.listUploads()`, `bugs.uploadCSV()`

**Integration:**
```javascript
// ADD to bugs client in apiClient.js (around line 400-500)
bugs: {
  // ... existing methods ...

  async getKPIHistory(weeks = 8, component = null) {
    const params = new URLSearchParams({ weeks: weeks.toString() });
    if (component) params.append('component', component);

    return fetchWithAuth(`${API_BASE_URL}/bugs/kpis/history?${params.toString()}`);
  }
}
```

## New Components Needed

### 1. ThresholdService.js (NEW)

**Location:** `server/services/ThresholdService.js`
**Purpose:** Evaluate KPIs against thresholds and create notifications

```javascript
import { query } from '../db/connection.js';
import NotificationService from './NotificationService.js';

// Default thresholds (can be overridden per-user in kpi_thresholds table)
const DEFAULT_THRESHOLDS = {
  bug_inflow_rate: { warning: 8, critical: 10 },     // bugs/week
  median_ttfr_hours: { warning: 48, critical: 72 },  // hours
  sla_vh_percent: { warning: 60, critical: 50 },     // % (inverted: lower is worse)
  sla_high_percent: { warning: 60, critical: 50 },
  backlog_health_score: { warning: 50, critical: 30 } // score (inverted)
};

class ThresholdService {
  /**
   * Evaluate KPIs and create notifications if thresholds breached
   */
  async evaluateKPIs(kpis, uploadId, userId) {
    // Check each KPI with threshold
    for (const [kpiName, thresholds] of Object.entries(DEFAULT_THRESHOLDS)) {
      const value = kpis[kpiName];
      if (value === null || value === undefined) continue;

      const breachLevel = this.checkThreshold(kpiName, value, thresholds);

      if (breachLevel) {
        await this.createNotification(userId, kpiName, value, breachLevel);
      }
    }
  }

  /**
   * Check if KPI breaches threshold
   * @returns {string|null} - 'warning' or 'critical' or null
   */
  checkThreshold(kpiName, value, thresholds) {
    const isInverted = ['sla_vh_percent', 'sla_high_percent', 'backlog_health_score'].includes(kpiName);

    if (isInverted) {
      // Lower is worse
      if (value <= thresholds.critical) return 'critical';
      if (value <= thresholds.warning) return 'warning';
    } else {
      // Higher is worse
      if (value >= thresholds.critical) return 'critical';
      if (value >= thresholds.warning) return 'warning';
    }

    return null;
  }

  async createNotification(userId, kpiName, value, level) {
    const emoji = level === 'critical' ? '🚨' : '⚠️';
    const labels = {
      bug_inflow_rate: 'Bug Inflow Rate',
      median_ttfr_hours: 'Time to First Response',
      sla_vh_percent: 'SLA VH Compliance',
      sla_high_percent: 'SLA High Compliance',
      backlog_health_score: 'Backlog Health Score'
    };

    const message = `${emoji} ${labels[kpiName]} ${level}: ${value.toFixed(1)}`;

    await NotificationService.create(userId, {
      message,
      read: false
    });
  }
}

export default new ThresholdService();
```

### 2. KPITrendChart.jsx (NEW)

**Location:** `src/components/bugs/KPITrendChart.jsx`
**Purpose:** Render multi-week trend line chart for a single KPI

```javascript
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { format } from 'date-fns';

const KPI_LABELS = {
  bug_inflow_rate: 'Bug Inflow Rate',
  median_ttfr_hours: 'Time to First Response',
  sla_vh_percent: 'SLA VH Compliance',
  sla_high_percent: 'SLA High Compliance',
  backlog_health_score: 'Backlog Health Score'
};

const KPI_UNITS = {
  bug_inflow_rate: '/week',
  median_ttfr_hours: 'hours',
  sla_vh_percent: '%',
  sla_high_percent: '%',
  backlog_health_score: 'score'
};

/**
 * KPITrendChart - Line chart showing KPI trend over time
 * @param {Array} data - Historical KPI data from getKPIHistory()
 * @param {string} kpiName - KPI field name (e.g., 'bug_inflow_rate')
 */
export function KPITrendChart({ data, kpiName }) {
  // Transform data for Recharts
  const chartData = data.map(item => ({
    week: format(new Date(item.week_ending), 'MM/dd'),
    value: item.kpi_data[kpiName] || 0
  }));

  if (chartData.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{KPI_LABELS[kpiName]} Trend</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Not enough historical data
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{KPI_LABELS[kpiName]} Trend (8 weeks)</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="week" />
              <YAxis unit={KPI_UNITS[kpiName]} />
              <Tooltip
                formatter={(value) => [value.toFixed(1), KPI_LABELS[kpiName]]}
              />
              <Line
                type="monotone"
                dataKey="value"
                stroke="#3b82f6"
                strokeWidth={2}
                dot={{ r: 4 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
```

### 3. kpiMonitor.js (NEW - Optional)

**Location:** `server/scheduler/kpiMonitor.js`
**Purpose:** Scheduled job for periodic threshold checks

```javascript
import cron from 'node-cron';
import { query } from '../db/connection.js';
import ThresholdService from '../services/ThresholdService.js';

/**
 * Weekly KPI monitoring job
 * Runs every Monday at 8:00 AM
 */
export function startKPIMonitor() {
  // Cron pattern: minute hour day month weekday
  // 0 8 * * 1 = Every Monday at 8:00 AM
  cron.schedule('0 8 * * 1', async () => {
    console.log('[KPI Monitor] Running weekly threshold check...');

    try {
      // Get all users with recent uploads
      const result = await query(`
        SELECT DISTINCT bu.user_id, wk.upload_id, wk.kpi_data
        FROM bug_uploads bu
        JOIN weekly_kpis wk ON bu.id = wk.upload_id
        WHERE wk.component IS NULL  -- All components aggregate
          AND bu.week_ending >= CURRENT_DATE - INTERVAL '7 days'
      `);

      for (const row of result.rows) {
        await ThresholdService.evaluateKPIs(
          row.kpi_data,
          row.upload_id,
          row.user_id
        );
      }

      console.log(`[KPI Monitor] Checked ${result.rows.length} uploads`);
    } catch (error) {
      console.error('[KPI Monitor] Error:', error);
    }
  });

  console.log('[KPI Monitor] Started (runs Mondays 8am)');
}
```

**Integration:** Add to `server/index.js`:
```javascript
// After all routes mounted, before app.listen()
import { startKPIMonitor } from './scheduler/kpiMonitor.js';

if (process.env.NODE_ENV === 'production') {
  startKPIMonitor();
}
```

### 4. EmailService.js (OPTIONAL - Only if email required)

**Location:** `server/services/EmailService.js`
**Purpose:** Send email alerts for threshold breaches

**Required:** `npm install nodemailer` (not currently installed)

```javascript
import nodemailer from 'nodemailer';

class EmailService {
  constructor() {
    this.transporter = nodemailer.createTransporter({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    });
  }

  async sendThresholdAlert(userEmail, kpiName, value, level) {
    const subject = `[${level.toUpperCase()}] Bug Dashboard Alert: ${kpiName}`;
    const html = `
      <h2>KPI Threshold Alert</h2>
      <p><strong>${kpiName}</strong> has breached the ${level} threshold.</p>
      <p>Current value: <strong>${value.toFixed(1)}</strong></p>
      <p><a href="${process.env.FRONTEND_URL}/bug-dashboard">View Dashboard</a></p>
    `;

    await this.transporter.sendMail({
      from: process.env.SMTP_FROM || 'noreply@example.com',
      to: userEmail,
      subject,
      html
    });
  }
}

export default new EmailService();
```

## Modified Components

### BugService.js Modifications

**File:** `server/services/BugService.js`

**Changes:**
1. Add `getKPIHistory()` method (see Integration Points section)
2. Modify `uploadCSV()` to call ThresholdService after commit:

```javascript
// Line 523, after await client.query('COMMIT');
// ADD:
import ThresholdService from './ThresholdService.js';

// Evaluate thresholds (fire-and-forget, don't block response)
ThresholdService.evaluateKPIs(allKPIs, uploadId, userId)
  .catch(err => console.error('Threshold evaluation failed:', err));

return { uploadId, bugCount, components, kpis: allKPIs };
```

### BugDashboard.jsx Modifications

**File:** `src/pages/BugDashboard.jsx`

**Changes:**
1. Add historical KPIs state and fetch
2. Add KPITrendChart component to layout
3. Add trend indicator to existing KPICard

```javascript
// After existing state declarations (line 54)
const [historicalKPIs, setHistoricalKPIs] = useState([]);

// Add new useEffect for historical data
useEffect(() => {
  if (selectedSprint !== 'all' || !selectedUploadId) return;

  async function loadHistoricalKPIs() {
    try {
      const history = await apiClient.bugs.getKPIHistory(
        8,
        selectedComponent === 'all' ? null : selectedComponent
      );
      setHistoricalKPIs(history);
    } catch (err) {
      console.error('Failed to load historical KPIs:', err);
    }
  }

  loadHistoricalKPIs();
}, [selectedUploadId, selectedComponent]);

// In render, after KPIGrid (line 364):
{/* Trend Charts */}
{historicalKPIs.length > 1 && (
  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
    <KPITrendChart data={historicalKPIs} kpiName="bug_inflow_rate" />
    <KPITrendChart data={historicalKPIs} kpiName="sla_vh_percent" />
  </div>
)}
```

### apiClient.js Modifications

**File:** `src/api/apiClient.js`

**Changes:** Add `getKPIHistory()` method to bugs client (see Integration Points section)

## Data Flow Changes

### Current State (Single Week)
```
Upload CSV → BugService.uploadCSV() → Calculate KPIs → Store in weekly_kpis
Frontend → GET /api/bugs/kpis?uploadId=X → Single KPI object → KPICard
```

### New State (Trends + Alerts)
```
Upload CSV → BugService.uploadCSV()
  → Calculate KPIs
  → Store in weekly_kpis
  → ThresholdService.evaluateKPIs()
     → Check thresholds
     → NotificationService.create() if breached

Frontend → GET /api/bugs/kpis/history?weeks=8
  → Array of KPIs (8 weeks)
  → KPITrendChart (LineChart)

Frontend → GET /api/notifications
  → Unread notification count
  → NotificationBell badge
```

## Suggested Build Order

**Phase 1: Historical Queries & Trend Charts**
1. Add `BugService.getKPIHistory()` method
2. Add `GET /api/bugs/kpis/history` route
3. Add `apiClient.bugs.getKPIHistory()` frontend method
4. Create `KPITrendChart.jsx` component
5. Integrate trend charts into BugDashboard

**Dependencies:** None (extends existing patterns)
**Risk:** Low - read-only queries, no schema changes

**Phase 2: Threshold Evaluation**
1. Create `ThresholdService.js` with default thresholds
2. Modify `BugService.uploadCSV()` to call ThresholdService
3. Test threshold detection with sample uploads

**Dependencies:** Phase 1 complete
**Risk:** Medium - side effect on upload, needs error handling

**Phase 3: Notification Integration**
1. Modify BugDashboard to fetch notifications
2. Add notification bell with unread badge
3. Link threshold alerts to KPI cards (click notification → scroll to KPI)

**Dependencies:** Phase 2 complete, NotificationService exists
**Risk:** Low - UI changes only

**Phase 4 (Optional): Scheduled Monitoring**
1. Install `node-cron` package
2. Create `scheduler/kpiMonitor.js`
3. Integrate into `server/index.js`
4. Add environment variable `ENABLE_KPI_MONITORING=true`

**Dependencies:** Phase 2 complete
**Risk:** Medium - new process management, needs monitoring

**Phase 5 (Optional): Email Notifications**
1. Install `nodemailer` package
2. Create `EmailService.js`
3. Add SMTP environment variables
4. Modify ThresholdService to call EmailService
5. Add user preference for email alerts

**Dependencies:** Phase 2 complete
**Risk:** High - external SMTP dependency, deliverability issues

## Architecture Patterns

### Pattern 1: Time-Series Query with JOIN

**What:** Query multiple weeks of KPIs efficiently
**When:** Historical trend display, week-over-week comparison
**Example:**
```sql
SELECT
  bu.week_ending,
  wk.kpi_data,
  wk.calculated_at
FROM weekly_kpis wk
JOIN bug_uploads bu ON wk.upload_id = bu.id
WHERE bu.user_id = $1
  AND wk.component IS NOT DISTINCT FROM $2
ORDER BY bu.week_ending DESC
LIMIT 8;
```

**Why this works:**
- `week_ending` provides X-axis for charts
- `kpi_data` JSONB contains all KPI values
- `IS NOT DISTINCT FROM` handles NULL component correctly (all components aggregate)
- `LIMIT` prevents unbounded queries

### Pattern 2: Fire-and-Forget Threshold Check

**What:** Evaluate thresholds asynchronously after upload
**When:** Upload success, don't block response
**Example:**
```javascript
await client.query('COMMIT');

// Don't await - fire-and-forget
ThresholdService.evaluateKPIs(kpis, uploadId, userId)
  .catch(err => console.error('Threshold eval failed:', err));

return { uploadId, bugCount, components, kpis };
```

**Why this works:**
- Upload response not delayed by notification creation
- Errors in threshold logic don't break upload
- User gets immediate feedback, notifications appear shortly after

### Pattern 3: Default Thresholds with Override Option

**What:** Hardcode sensible defaults, allow per-user customization later
**When:** MVP threshold system
**Example:**
```javascript
const DEFAULT_THRESHOLDS = {
  bug_inflow_rate: { warning: 8, critical: 10 }
};

async getThresholds(userId, kpiName) {
  // Future: query kpi_thresholds table for user overrides
  // For now: return defaults
  return DEFAULT_THRESHOLDS[kpiName];
}
```

**Why this works:**
- Immediate value without configuration UI
- Extensible to per-user thresholds later
- Single source of truth in code

### Pattern 4: Notification as Event Log

**What:** Store all threshold breaches as notifications, mark read when acknowledged
**When:** Threshold breach detected
**Example:**
```javascript
await NotificationService.create(userId, {
  message: '🚨 SLA VH Compliance critical: 45% (threshold: 50%)',
  read: false,
  scheduled_date: null
});
```

**Why this works:**
- Persistent audit trail of alerts
- User can review past breaches
- Existing notification system handles read/unread state
- No new tables needed

### Pattern 5: Recharts LineChart for Trends

**What:** Use existing Recharts patterns for multi-week trends
**When:** Displaying KPI over time
**Example:**
```jsx
<ResponsiveContainer width="100%" height="100%">
  <LineChart data={chartData}>
    <CartesianGrid strokeDasharray="3 3" />
    <XAxis dataKey="week" />
    <YAxis />
    <Tooltip />
    <Line type="monotone" dataKey="value" stroke="#3b82f6" />
  </LineChart>
</ResponsiveContainer>
```

**Why this works:**
- Consistent with existing Metrics.jsx patterns
- ResponsiveContainer handles sizing
- LineChart built-in to Recharts (no new dependencies)

## Anti-Patterns to Avoid

### Anti-Pattern 1: Real-Time Threshold Monitoring

**What:** Running threshold checks on every KPI query
**Why bad:** Performance overhead, redundant checks
**Instead:** Check thresholds only on upload and scheduled jobs

### Anti-Pattern 2: Storing Trend Data Separately

**What:** Creating a new `kpi_trends` table
**Why bad:** Duplicates data already in `weekly_kpis`
**Instead:** Query `weekly_kpis` with JOIN for historical data

### Anti-Pattern 3: Synchronous Email Sending

**What:** Await email send in upload flow
**Why bad:** Blocks response on SMTP latency/failures
**Instead:** Fire-and-forget or background job queue

### Anti-Pattern 4: Client-Side Threshold Logic

**What:** Calculating threshold breaches in React
**Why bad:** No notifications for users not viewing dashboard
**Instead:** Server-side evaluation creates persistent notifications

### Anti-Pattern 5: Hardcoded Chart Count

**What:** Always showing 8 weeks of trend
**Why bad:** Fails when <8 weeks of data exist
**Instead:** Handle `chartData.length === 0` and show "Not enough data"

## Scalability Considerations

| Concern | At 10 uploads | At 100 uploads | At 1000 uploads |
|---------|--------------|----------------|-----------------|
| **Historical query** | <10ms | <50ms | Needs index on (user_id, week_ending) |
| **Threshold checks** | Synchronous OK | Synchronous OK | Move to background job queue |
| **Notification storage** | No issue | No issue | Add pagination to notification list |
| **Chart rendering** | Instant | Instant | Limit to 12 weeks max |
| **Email delivery** | Nodemailer OK | Nodemailer OK | Consider SendGrid/SES |

## Technology Decisions

### Decision 1: node-cron vs Bull/Agenda

**Choice:** node-cron (if scheduling needed)

**Rationale:**
- **Pros:** Lightweight (no Redis), simple cron syntax, sufficient for weekly checks
- **Cons:** No persistence (jobs lost on restart), no distributed scheduling
- **Alternatives considered:**
  - Bull: Requires Redis, overkill for weekly jobs
  - Agenda: Requires MongoDB, not in current stack
- **When to reconsider:** If need >1 concurrent worker or job history

### Decision 2: Recharts LineChart vs AreaChart

**Choice:** LineChart for trends

**Rationale:**
- **Pros:** Cleaner for multi-KPI overlay, already used in Metrics.jsx
- **Cons:** Less visual emphasis than AreaChart
- **Alternatives considered:**
  - AreaChart: Good for single KPI, but cluttered with multiple lines
  - ComposedChart: Overkill for simple trends
- **When to reconsider:** If need to show confidence intervals or ranges

### Decision 3: In-App Notifications Only vs Email

**Choice:** In-app notifications first, email optional

**Rationale:**
- **Pros:** No external dependencies, existing notification system works
- **Cons:** Requires login to see alerts
- **Alternatives considered:**
  - Email-only: Misses users with SMTP issues
  - Push notifications: Requires PWA setup
- **When to reconsider:** User feedback requests email alerts

### Decision 4: Default Thresholds vs Configuration UI

**Choice:** Default thresholds hardcoded, configuration deferred

**Rationale:**
- **Pros:** Immediate value, no UI development, sensible defaults for domain
- **Cons:** Not customizable per team
- **Alternatives considered:**
  - User-configurable from day 1: 2x development time
  - Per-component thresholds: Complex UX
- **When to reconsider:** Multiple users with different threshold needs

## Dependencies

### New Dependencies Required

| Package | Version | Purpose | When Needed |
|---------|---------|---------|-------------|
| node-cron | ^3.0.3 | Scheduled jobs | Phase 4 (optional) |
| nodemailer | ^6.9.8 | Email alerts | Phase 5 (optional) |

### No New Dependencies (Using Existing)

- Recharts 2.15.1 - Already installed, LineChart available
- date-fns 3.6.0 - Already installed, format() for chart labels
- Express 4.18.2 - Existing routes extended
- pg 8.11.3 - Existing query patterns

## Database Schema Changes

### Option A: No Schema Changes (Recommended for MVP)

Use default thresholds in code, store notifications in existing `notifications` table.

**Pros:**
- No migration needed
- Immediate deployment
- Notifications already work

**Cons:**
- Thresholds not customizable without code changes
- No threshold history/audit

### Option B: Add kpi_thresholds Table (Future Enhancement)

```sql
CREATE TABLE IF NOT EXISTS kpi_thresholds (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id VARCHAR(255) NOT NULL,
  kpi_name VARCHAR(100) NOT NULL,
  warning_threshold NUMERIC,
  critical_threshold NUMERIC,
  notification_enabled BOOLEAN DEFAULT true,
  email_enabled BOOLEAN DEFAULT false,
  created_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, kpi_name)
);

CREATE INDEX idx_kpi_thresholds_user_id ON kpi_thresholds(user_id);
```

**When to add:** User requests customizable thresholds

## Testing Strategy

### Unit Tests

**BugService.getKPIHistory():**
```javascript
// Mock query response with 3 weeks
const mockWeeks = [
  { week_ending: '2026-01-11', kpi_data: { bug_inflow_rate: 6.5 } },
  { week_ending: '2026-01-18', kpi_data: { bug_inflow_rate: 7.2 } },
  { week_ending: '2026-01-25', kpi_data: { bug_inflow_rate: 8.9 } }
];

// Assert returned in chronological order (oldest first)
expect(result[0].week_ending).toBe('2026-01-11');
```

**ThresholdService.checkThreshold():**
```javascript
// Lower-is-worse KPI (bug inflow)
expect(checkThreshold('bug_inflow_rate', 10.5, { warning: 8, critical: 10 }))
  .toBe('critical');

// Higher-is-worse KPI (SLA %)
expect(checkThreshold('sla_vh_percent', 55, { warning: 60, critical: 50 }))
  .toBe('warning');
```

### Integration Tests

**Historical Query:**
```javascript
// Insert 3 weeks of test data
// Query getKPIHistory(userId, 2, null)
// Assert returns 2 most recent weeks
```

**Threshold on Upload:**
```javascript
// Upload CSV with SLA VH = 45% (below critical 50%)
// Assert notification created with "critical" in message
```

### Manual Testing

1. Upload CSV with SLA VH < 50% → Check notification created
2. View dashboard → See 8-week trend chart (if 8 weeks uploaded)
3. Mark notification as read → Badge count decreases
4. Filter by component → Trend chart updates

## Sources

### Primary (HIGH confidence)
- `/Users/i306072/Documents/GitHub/P-E/server/services/BugService.js` - Existing KPI calculation and storage patterns
- `/Users/i306072/Documents/GitHub/P-E/server/services/NotificationService.js` - Existing notification CRUD operations
- `/Users/i306072/Documents/GitHub/P-E/server/db/019_bug_dashboard.sql` - weekly_kpis table schema with JSONB kpi_data
- `/Users/i306072/Documents/GitHub/P-E/src/pages/BugDashboard.jsx` - Current dashboard structure and filter patterns
- `/Users/i306072/Documents/GitHub/P-E/.planning/phases/12-dashboard-ui/12-RESEARCH.md` - Recharts patterns already established

### Secondary (MEDIUM confidence)
- Recharts documentation - LineChart API verified in package.json v2.15.1
- node-cron documentation - Cron syntax for scheduling (not yet installed)
- PostgreSQL time-series query patterns - JOIN performance characteristics

### Tertiary (LOW confidence)
- None - all patterns verified against existing codebase
