# Prompt for Claude Code: DevOps Bug Dashboard Implementation

## Context
I have a JIRA bug export analysis system that calculates 10 KPIs for our DevOps duty monitoring. I need you to implement a full-featured bug dashboard in our existing P&E application with upload, filtering, and persistence capabilities.

## Reference Files
I'm providing these files:
1. `jira_export_sample.csv` - Sample JIRA export (shows exact data format and columns)
2. `KPI_SPECIFICATION.md` - Complete KPI definitions, formulas, and thresholds
3. `IMPLEMENTATION_GUIDE.md` - Technical implementation details

## Requirements

### 1. Navigation & Menu Item
- Add a new menu item "Bugs" under the Engineering state in the main navigation
- Route: `/engineering/bugs`
- Icon: Use a bug/issue icon from your existing icon set
- Should be visible to all engineering team members

### 2. Database Schema
Create tables to persist all bug data and KPI calculations:

**Table: bug_uploads**
```sql
CREATE TABLE bug_uploads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  upload_date TIMESTAMP NOT NULL DEFAULT NOW(),
  week_ending DATE NOT NULL,
  file_name VARCHAR(255) NOT NULL,
  total_bugs INTEGER NOT NULL,
  uploaded_by VARCHAR(255) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE(week_ending, uploaded_by)
);
```

**Table: bugs**
```sql
CREATE TABLE bugs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  upload_id UUID NOT NULL REFERENCES bug_uploads(id) ON DELETE CASCADE,
  bug_key VARCHAR(50) NOT NULL,
  summary TEXT NOT NULL,
  priority VARCHAR(20) NOT NULL,
  status VARCHAR(50) NOT NULL,
  component VARCHAR(100),
  reporter VARCHAR(255),
  assignee VARCHAR(255),
  created_date TIMESTAMP NOT NULL,
  resolved_date TIMESTAMP,
  resolution_time_hours FLOAT,
  labels TEXT[],
  description TEXT,
  jira_url VARCHAR(500),
  raw_data JSONB,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  INDEX idx_bug_key (bug_key),
  INDEX idx_component (component),
  INDEX idx_priority (priority),
  INDEX idx_status (status),
  INDEX idx_upload_id (upload_id)
);
```

**Table: weekly_kpis**
```sql
CREATE TABLE weekly_kpis (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  upload_id UUID NOT NULL REFERENCES bug_uploads(id) ON DELETE CASCADE,
  week_ending DATE NOT NULL,
  component VARCHAR(100),
  
  -- KPI 1: Bug Inflow Rate
  bug_inflow_rate FLOAT NOT NULL,
  bugs_created_4weeks INTEGER NOT NULL,
  
  -- KPI 2: Time to First Response
  median_ttfr_hours FLOAT,
  ttfr_under_24h_percent FLOAT,
  ttfr_under_24h_count INTEGER,
  
  -- KPI 3: Mean Time to Resolution by Priority
  mttr_very_high_hours FLOAT,
  mttr_high_hours FLOAT,
  mttr_medium_hours FLOAT,
  mttr_low_hours FLOAT,
  
  -- KPI 4: SLA Compliance
  sla_vh_under_24h_percent FLOAT,
  sla_vh_under_24h_count INTEGER,
  sla_vh_total INTEGER,
  sla_high_under_48h_percent FLOAT,
  sla_high_under_48h_count INTEGER,
  sla_high_total INTEGER,
  
  -- KPI 5: Open Bug Age Distribution
  open_vh_count INTEGER,
  open_vh_avg_age_days FLOAT,
  open_high_count INTEGER,
  open_high_avg_age_days FLOAT,
  open_medium_count INTEGER,
  open_medium_avg_age_days FLOAT,
  
  -- KPI 6: Automated vs Actionable
  automated_bug_count INTEGER,
  automated_bug_percent FLOAT,
  
  -- KPI 7: Bug Category Distribution
  deployment_bug_count INTEGER,
  deployment_bug_percent FLOAT,
  foss_bug_count INTEGER,
  foss_bug_percent FLOAT,
  service_broker_bug_count INTEGER,
  service_broker_bug_percent FLOAT,
  other_bug_count INTEGER,
  
  -- KPI 8: Duty Rotation Workload
  avg_bugs_per_week FLOAT,
  std_dev_bugs_per_week FLOAT,
  
  -- KPI 10: Backlog Health Score
  backlog_health_score INTEGER NOT NULL,
  
  calculated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE(upload_id, component)
);
```

### 3. Page Layout Structure

```
┌──────────────────────────────────────────────────────────────────┐
│  DevOps Bug Dashboard                         [Upload New Week]  │
│  Component: [All Components ▼]         Week: [Jan 20-26, 2026 ▼]│
└──────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────┐
│  🚨 CRITICAL ALERTS (Show only if any condition is critical)     │
│  • Backlog Health Score: 20/100 (RED ZONE)                       │
│  • SLA Compliance: 36.7% (Target: 80%)                           │
│  • 12 High priority bugs aging (avg 23 days)                     │
│  • TTFR: 5.2 days median (Target: <1 day for Very High)         │
└──────────────────────────────────────────────────────────────────┘

┌────────────┬────────────┬────────────┬────────────┬────────────┐
│  KPI 1     │  KPI 2     │  KPI 4     │  KPI 10    │  Total     │
│  Bug       │  Time to   │  SLA       │  Backlog   │  Open      │
│  Inflow    │  First     │  Comply    │  Health    │  Bugs      │
│            │  Response  │            │            │            │
│  5.0/week  │  5.2 days  │  36.7%     │  20/100    │  19 bugs   │
│  ✅ Good   │  🔴 Crit   │  🔴 Crit   │  🔴 Red    │  🟡 Watch  │
└────────────┴────────────┴────────────┴────────────┴────────────┘

┌──────────────────────────┬──────────────────────────────────────┐
│  KPI 3: MTTR by Priority │  KPI 7: Bug Category Distribution    │
│  [Bar Chart]             │  [Bar Chart]                         │
│                          │                                      │
│  Very High: 50.5h        │  Deployment: 116 (30.5%)            │
│  High: 89.4h             │  FOSS: 57 (15.0%)                   │
│  Medium: 293.1h          │  Service Broker: 45 (11.8%)         │
│  Low: 224.5h             │  Other: 162 (42.6%)                 │
└──────────────────────────┴──────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────┐
│  Aging High Priority Bugs Requiring Triage (12)                  │
│  [Search: _______________]  [Priority: All ▼]  [Status: All ▼]  │
│                                                                   │
│  Age  │ Bug Key       │ Summary              │ Assignee │ Status│
│  ───────────────────────────────────────────────────────────────│
│  🔴127│ NGPBUG-459082 │ Segregate customers..│ Unassign │ Open  │
│  🔴35 │ NGPBUG-472325 │ FOSS Vuln (6.5)...  │ Alice A. │ Open  │
│  🔴27 │ NGPBUG-472732 │ METERING_SAAS_ERROR..│ Unassign │ Auth  │
│  ...  │               │                      │          │       │
└──────────────────────────────────────────────────────────────────┘
```

### 4. Upload Functionality

**Upload Modal:**
```typescript
// When "Upload New Week" button clicked:
<Modal>
  <ModalHeader>Upload Weekly JIRA Export</ModalHeader>
  <ModalBody>
    <FormField label="Week Ending Date">
      <DatePicker 
        value={weekEnding} 
        onChange={setWeekEnding}
        hint="Select the Saturday that ends this week"
      />
    </FormField>
    
    <FormField label="JIRA Export CSV">
      <FileUpload
        accept=".csv"
        maxSize={10 * 1024 * 1024} // 10MB
        onChange={handleFileSelect}
      />
      <HelpText>
        Export from JIRA with required columns: Key, Summary, Priority, 
        Status, Created, Resolved, Reporter, Assignee, Labels
      </HelpText>
    </FormField>
  </ModalBody>
  
  <ModalFooter>
    <Button variant="secondary" onClick={onClose}>Cancel</Button>
    <Button 
      variant="primary" 
      onClick={handleUpload}
      loading={uploading}
      disabled={!file || !weekEnding}
    >
      Upload & Process
    </Button>
  </ModalFooter>
</Modal>
```

**Upload Processing Flow:**
1. Validate CSV has required columns
2. Parse all rows
3. Extract component from Labels field (pattern: look for service names, deployment keywords, etc.)
4. Calculate resolution_time_hours for resolved bugs
5. Save to bug_uploads table
6. Save all bugs to bugs table
7. Calculate all KPIs for "All Components" and each individual component
8. Save KPIs to weekly_kpis table
9. Show success toast: "Successfully uploaded 85 bugs for week ending Jan 26, 2026"
10. Refresh dashboard

**Duplicate Detection:**
```typescript
// If upload already exists for this week_ending:
<Alert variant="warning">
  An upload already exists for week ending {weekEnding}.
  Do you want to replace it?
  <Button onClick={replaceUpload}>Replace</Button>
  <Button onClick={cancel}>Cancel</Button>
</Alert>
```

### 5. Component Picker

**Dropdown Implementation:**
```typescript
const components = [
  { value: 'all', label: 'All Components' },
  ...uniqueComponentsFromDB.map(c => ({ 
    value: c, 
    label: formatComponentName(c) 
  }))
];

<Select
  value={selectedComponent}
  onChange={handleComponentChange}
  options={components}
  placeholder="Select component..."
/>
```

**Filter Behavior:**
- When component changes, fetch KPIs for that component from weekly_kpis table
- Filter bugs table to show only bugs with matching component
- Re-render all charts with filtered data
- Update alert box based on filtered KPIs
- Keep week filter independent (both filters can be active)

### 6. Week Picker

**Dropdown Implementation:**
```typescript
const weeks = await db.query(`
  SELECT DISTINCT week_ending, total_bugs
  FROM bug_uploads
  ORDER BY week_ending DESC
`);

<Select
  value={selectedWeek}
  onChange={handleWeekChange}
  options={weeks.map(w => ({
    value: w.week_ending,
    label: `Week ending ${formatDate(w.week_ending)} (${w.total_bugs} bugs)`
  }))}
/>
```

### 7. Styling Instructions

**CRITICAL - Use Existing App Styles:**

❌ **DO NOT:**
- Create new color variables or CSS custom properties
- Import external color schemes (SAP Blue, Material colors, etc.)
- Create new component variants
- Override existing component styles
- Use inline styles with hardcoded colors

✅ **DO:**
- Use existing component library components exactly as they are
- Reference existing color classes: `text-success`, `text-warning`, `text-danger`, `bg-primary`, etc.
- Use existing spacing utilities: `mb-4`, `p-3`, `gap-2`, etc.
- Follow existing card/panel patterns from other dashboard pages
- Use existing badge variants: `<Badge variant="success">`, `<Badge variant="danger">`, etc.
- Match existing typography: `<Heading size="lg">`, `<Text size="sm">`, etc.

**Example of Correct Usage:**
```typescript
// ✅ CORRECT - Using existing components
<Card>
  <CardHeader>
    <Heading size="md">Bug Inflow Rate</Heading>
  </CardHeader>
  <CardBody>
    <Metric value="5.0" unit="bugs/week" />
    <Badge variant="success">On Target</Badge>
  </CardBody>
</Card>

// ❌ WRONG - Creating custom styles
<div style={{ backgroundColor: '#0070f2', color: 'white' }}>
  <h2 style={{ fontSize: '24px' }}>Bug Inflow Rate</h2>
</div>
```

**Before you start coding, show me:**
1. An example of an existing dashboard page
2. Your card component usage
3. Your table component usage
4. Your badge/status indicator variants
5. Your chart component (if you have one)

### 8. KPI Calculation Functions

**Create a pure KPI calculator module:**

```typescript
// File: lib/kpi-calculator.ts

interface Bug {
  bug_key: string;
  priority: 'Very High' | 'High' | 'Medium' | 'Low';
  status: string;
  created_date: Date;
  resolved_date: Date | null;
  resolution_time_hours: number | null;
  component: string;
  labels: string[];
}

interface KPIResult {
  kpi1_bug_inflow_rate: number;
  kpi2_median_ttfr_hours: number;
  kpi2_ttfr_under_24h_percent: number;
  kpi3_mttr_by_priority: {
    very_high: number;
    high: number;
    medium: number;
    low: number;
  };
  kpi4_sla_compliance: {
    vh_under_24h_percent: number;
    high_under_48h_percent: number;
  };
  kpi5_open_bug_age: {
    vh_count: number;
    vh_avg_age_days: number;
    high_count: number;
    high_avg_age_days: number;
    medium_count: number;
    medium_avg_age_days: number;
  };
  kpi7_categories: {
    deployment: number;
    foss: number;
    service_broker: number;
    other: number;
  };
  kpi10_backlog_health_score: number;
}

export function calculateKPIs(bugs: Bug[]): KPIResult {
  // Implementation based on KPI_SPECIFICATION.md
  // See file for detailed formulas
}

// Helper functions
function calculateMedian(values: number[]): number {
  const sorted = values.sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 
    ? (sorted[mid - 1] + sorted[mid]) / 2 
    : sorted[mid];
}

function getBugAge(bug: Bug): number {
  const now = new Date();
  const created = new Date(bug.created_date);
  return (now.getTime() - created.getTime()) / (1000 * 60 * 60 * 24);
}

function extractComponent(bug: Bug): string {
  // Check labels for component patterns
  const componentPatterns = [
    'deploy-metering',
    'service-broker',
    'cm-metering',
    'foss',
    'sdm-metering'
  ];
  
  for (const label of bug.labels) {
    for (const pattern of componentPatterns) {
      if (label.toLowerCase().includes(pattern)) {
        return pattern;
      }
    }
  }
  
  return 'other';
}
```

### 9. API Endpoints

**POST /api/bugs/upload**
```typescript
// Request:
{
  file: File, // CSV file
  week_ending: string, // ISO date
  replace_existing: boolean
}

// Response:
{
  success: true,
  upload_id: string,
  total_bugs: number,
  week_ending: string,
  kpis: KPIResult
}
```

**GET /api/bugs/weeks**
```typescript
// Response:
{
  weeks: [
    {
      week_ending: "2026-01-26",
      total_bugs: 85,
      upload_date: "2026-01-27T10:30:00Z",
      uploaded_by: "eran.lahav@sap.com"
    }
  ]
}
```

**GET /api/bugs/kpis?week={date}&component={component}**
```typescript
// Response:
{
  week_ending: "2026-01-26",
  component: "all",
  kpis: KPIResult,
  aging_high_bugs: Bug[],
  total_open_bugs: number
}
```

**GET /api/bugs?week={date}&component={component}&priority={priority}&status={status}**
```typescript
// Response:
{
  bugs: Bug[],
  total: number,
  page: number,
  page_size: number
}
```

### 10. Charts Required

**Use your existing chart library. If you don't have one, recommend one based on your stack:**

**Bar Chart 1: MTTR by Priority**
```typescript
<BarChart
  data={[
    { priority: 'Very High', hours: 50.5 },
    { priority: 'High', hours: 89.4 },
    { priority: 'Medium', hours: 293.1 },
    { priority: 'Low', hours: 224.5 }
  ]}
  xKey="priority"
  yKey="hours"
  yAxisLabel="Resolution Time (hours)"
  colors={{
    'Very High': 'success',
    'High': 'warning',
    'Medium': 'danger',
    'Low': 'info'
  }}
/>
```

**Bar Chart 2: Bug Categories**
```typescript
<BarChart
  data={[
    { category: 'Deployment', count: 116, percent: 30.5 },
    { category: 'FOSS Security', count: 57, percent: 15.0 },
    { category: 'Service Broker', count: 45, percent: 11.8 },
    { category: 'Other', count: 162, percent: 42.6 }
  ]}
  xKey="category"
  yKey="count"
  showPercentage={true}
/>
```

**Line Chart: Weekly Trend (if multiple weeks uploaded)**
```typescript
<LineChart
  data={weeklyData}
  xKey="week_ending"
  yKey="bug_count"
  yAxisLabel="Bugs Created"
/>
```

### 11. Aging Bugs Table

**Table Configuration:**
```typescript
const columns = [
  {
    id: 'age',
    header: 'Age',
    accessor: (bug) => getBugAge(bug),
    cell: (value) => (
      <span>
        <AgeIndicator age={value} />
        {Math.round(value)}d
      </span>
    ),
    sortable: true,
    width: '80px'
  },
  {
    id: 'bug_key',
    header: 'Bug Key',
    accessor: 'bug_key',
    cell: (value) => (
      <a 
        href={`https://jira.tools.sap/browse/${value}`}
        target="_blank"
        className="link-primary"
      >
        {value}
      </a>
    ),
    sortable: true,
    width: '140px'
  },
  {
    id: 'summary',
    header: 'Summary',
    accessor: 'summary',
    cell: (value) => (
      <Tooltip content={value}>
        <Text truncate>{value}</Text>
      </Tooltip>
    ),
    sortable: false
  },
  {
    id: 'assignee',
    header: 'Assignee',
    accessor: 'assignee',
    cell: (value) => value || 'Unassigned',
    sortable: true,
    width: '150px'
  },
  {
    id: 'status',
    header: 'Status',
    accessor: 'status',
    cell: (value) => <Badge>{value}</Badge>,
    sortable: true,
    width: '120px'
  }
];

<DataTable
  data={agingHighBugs}
  columns={columns}
  defaultSort={{ column: 'age', direction: 'desc' }}
  searchable={true}
  searchPlaceholder="Search bugs..."
/>
```

**Age Indicator Component:**
```typescript
function AgeIndicator({ age }: { age: number }) {
  const variant = age >= 14 ? 'danger' : age >= 7 ? 'warning' : 'success';
  return <StatusDot variant={variant} />;
}
```

### 12. Alert Box Logic

```typescript
function shouldShowAlert(kpis: KPIResult): boolean {
  return (
    kpis.kpi10_backlog_health_score < 50 ||
    kpis.kpi4_sla_compliance.vh_under_24h_percent < 60 ||
    kpis.kpi5_open_bug_age.high_count > 0 && 
      kpis.kpi5_open_bug_age.high_avg_age_days > 21 ||
    kpis.kpi2_median_ttfr_hours > 48
  );
}

function getAlertMessages(kpis: KPIResult): string[] {
  const messages = [];
  
  if (kpis.kpi10_backlog_health_score < 30) {
    messages.push(
      `Backlog Health Score: ${kpis.kpi10_backlog_health_score}/100 (RED ZONE)`
    );
  }
  
  if (kpis.kpi4_sla_compliance.vh_under_24h_percent < 60) {
    messages.push(
      `SLA Compliance: ${kpis.kpi4_sla_compliance.vh_under_24h_percent.toFixed(1)}% ` +
      `(Target: 80%)`
    );
  }
  
  if (kpis.kpi5_open_bug_age.high_count > 0) {
    messages.push(
      `${kpis.kpi5_open_bug_age.high_count} High priority bugs aging ` +
      `(avg ${kpis.kpi5_open_bug_age.high_avg_age_days.toFixed(1)} days)`
    );
  }
  
  if (kpis.kpi2_median_ttfr_hours > 24) {
    messages.push(
      `TTFR: ${(kpis.kpi2_median_ttfr_hours / 24).toFixed(1)} days median ` +
      `(Target: <1 day for Very High)`
    );
  }
  
  return messages;
}
```

### 13. Error Handling

**CSV Validation:**
```typescript
const REQUIRED_COLUMNS = [
  'Key',
  'Summary', 
  'Priority',
  'Status',
  'Created',
  'Resolved',
  'Reporter',
  'Assignee',
  'Labels'
];

function validateCSV(headers: string[]): { valid: boolean; missing: string[] } {
  const missing = REQUIRED_COLUMNS.filter(col => !headers.includes(col));
  return { valid: missing.length === 0, missing };
}

// Usage:
if (!validation.valid) {
  throw new Error(
    `CSV is missing required columns: ${validation.missing.join(', ')}`
  );
}
```

**Error States:**
```typescript
// Empty state
if (bugs.length === 0) {
  return (
    <EmptyState
      icon={<BugIcon />}
      title="No bugs found"
      description="Upload your first JIRA export to get started"
      action={<Button onClick={openUpload}>Upload File</Button>}
    />
  );
}

// Error state
if (error) {
  return (
    <ErrorState
      title="Failed to load dashboard"
      message={error.message}
      action={<Button onClick={retry}>Try Again</Button>}
    />
  );
}

// Loading state
if (loading) {
  return <LoadingSpinner />;
}
```

### 14. Permissions

```typescript
// Check permissions before showing upload button
const canUpload = userHasRole(['engineering_lead', 'engineering_manager']);

// In component:
{canUpload && (
  <Button onClick={openUploadModal}>
    Upload New Week
  </Button>
)}
```

### 15. Testing Checklist

After implementation, verify:

- [ ] Upload CSV with 380 bugs
- [ ] Verify KPI calculations match expected values:
  - Bug Inflow: ~5.0/week
  - TTFR: ~124.9 hours
  - SLA Compliance: ~36.7%
  - Backlog Health: 20/100
- [ ] Filter by component, verify KPIs recalculate
- [ ] Filter by week, verify correct data loads
- [ ] Aging bugs table shows 12 High priority bugs
- [ ] JIRA links are clickable and correct
- [ ] Charts render correctly
- [ ] Alert box shows when conditions are critical
- [ ] Upload duplicate week shows warning
- [ ] Replace existing upload works
- [ ] Navigation menu item appears
- [ ] Permissions work correctly

## Questions for You

Before I start implementation, I need to know:

1. **Database**: What ORM/query builder are you using? (Prisma, TypeORM, Drizzle, raw SQL?)
2. **Backend**: What's your API framework? (Next.js API routes, tRPC, Express, Fastify?)
3. **Frontend**: What's your component library? (Chakra UI, shadcn/ui, Material-UI, custom?)
4. **Charts**: Do you have a chart library? (Recharts, Chart.js, Victory, Apache ECharts?)
5. **File Upload**: What's your file upload pattern? Show me an example.
6. **Table**: Show me an example of your existing table component.
7. **Forms**: Show me your form components (Input, Select, DatePicker, etc.).
8. **Styling**: Show me an existing dashboard page so I can match the style.

## Delivery

After implementation, I'll provide:

1. All migration files
2. All API endpoint files
3. All UI component files
4. Updated navigation configuration
5. KPI calculator utility file
6. Test data script
7. README with setup instructions

Ready to start! Share your answers to the questions above.
