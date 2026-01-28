# Technical Implementation Guide

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                        Frontend                              │
│  ┌─────────────┐  ┌──────────────┐  ┌──────────────┐       │
│  │   Upload    │  │   Filters    │  │   Display    │       │
│  │   Modal     │  │  Component & │  │   KPIs &     │       │
│  │             │  │    Week      │  │   Charts     │       │
│  └──────┬──────┘  └──────┬───────┘  └──────┬───────┘       │
│         │                │                  │                │
└─────────┼────────────────┼──────────────────┼───────────────┘
          │                │                  │
          ▼                ▼                  ▼
┌─────────────────────────────────────────────────────────────┐
│                      API Layer                               │
│  ┌─────────────┐  ┌──────────────┐  ┌──────────────┐       │
│  │   Upload    │  │   Query      │  │   KPI        │       │
│  │   Endpoint  │  │   Endpoints  │  │   Calculator │       │
│  └──────┬──────┘  └──────┬───────┘  └──────┬───────┘       │
└─────────┼────────────────┼──────────────────┼───────────────┘
          │                │                  │
          ▼                ▼                  ▼
┌─────────────────────────────────────────────────────────────┐
│                    Database Layer                            │
│  ┌──────────────┐  ┌──────────┐  ┌────────────────┐        │
│  │ bug_uploads  │  │   bugs   │  │  weekly_kpis   │        │
│  │   (meta)     │  │  (data)  │  │ (calculated)   │        │
│  └──────────────┘  └──────────┘  └────────────────┘        │
└─────────────────────────────────────────────────────────────┘
```

## Database Design Decisions

### Why 3 Tables?

1. **bug_uploads** (Upload Metadata)
   - Tracks upload history
   - Enables audit trail
   - Supports multiple uploads per week (testing/corrections)
   - Foreign key parent for cascade delete

2. **bugs** (Raw Data)
   - One row per bug from CSV
   - Normalized data structure
   - Enables detailed querying
   - Raw JSON backup in case of parsing issues

3. **weekly_kpis** (Pre-calculated Metrics)
   - Performance optimization
   - Avoids recalculating on every page load
   - One row per (upload_id, component) combination
   - Component = "all" for overall KPIs

### Indexing Strategy

```sql
-- Fast lookup by bug key
CREATE INDEX idx_bugs_bug_key ON bugs(bug_key);

-- Fast filtering by component
CREATE INDEX idx_bugs_component ON bugs(component);

-- Fast filtering by priority and status
CREATE INDEX idx_bugs_priority ON bugs(priority);
CREATE INDEX idx_bugs_status ON bugs(status);

-- Fast upload lookup
CREATE INDEX idx_bugs_upload_id ON bugs(upload_id);

-- Composite index for common queries
CREATE INDEX idx_bugs_status_priority ON bugs(status, priority);

-- KPI lookup
CREATE INDEX idx_kpis_week_component ON weekly_kpis(week_ending, component);
```

## API Endpoint Design

### POST /api/bugs/upload

**Request:**
```typescript
interface UploadRequest {
  file: File;
  week_ending: string; // ISO date: "2026-01-26"
  replace_existing?: boolean;
}
```

**Processing Steps:**
1. Validate file is CSV
2. Parse CSV headers
3. Validate required columns exist
4. Check for duplicate upload
5. If duplicate and !replace_existing, return error
6. If duplicate and replace_existing, delete old upload (cascade)
7. Create bug_upload record
8. Parse all CSV rows in transaction
9. Extract component for each bug
10. Calculate resolution_time_hours
11. Insert all bugs
12. Calculate KPIs for "all" components
13. Calculate KPIs for each unique component
14. Insert weekly_kpis records
15. Commit transaction
16. Return success with summary

**Response:**
```typescript
interface UploadResponse {
  success: true;
  upload_id: string;
  total_bugs: number;
  week_ending: string;
  components: string[]; // List of detected components
  kpis_summary: {
    bug_inflow_rate: number;
    backlog_health_score: number;
    sla_compliance: number;
  };
}
```

**Error Handling:**
```typescript
interface UploadError {
  success: false;
  error_code: 
    | 'INVALID_CSV' 
    | 'MISSING_COLUMNS' 
    | 'DUPLICATE_UPLOAD'
    | 'PARSE_ERROR'
    | 'DB_ERROR';
  message: string;
  details?: {
    missing_columns?: string[];
    row_number?: number;
    column_name?: string;
  };
}
```

### GET /api/bugs/kpis

**Request:**
```typescript
interface KPIRequest {
  week: string; // ISO date
  component?: string; // Default: "all"
}
```

**Response:**
```typescript
interface KPIResponse {
  week_ending: string;
  component: string;
  kpis: KPIResult; // See KPI_SPECIFICATION.md
  aging_high_bugs: {
    bug_key: string;
    summary: string;
    age_days: number;
    assignee: string | null;
    status: string;
  }[];
  total_open_bugs: number;
  alert_conditions: {
    show_alert: boolean;
    messages: string[];
  };
}
```

### GET /api/bugs/list

**Request:**
```typescript
interface BugsListRequest {
  week: string;
  component?: string;
  priority?: string;
  status?: string;
  search?: string;
  page?: number;
  page_size?: number;
  sort_by?: 'age' | 'priority' | 'status' | 'assignee';
  sort_order?: 'asc' | 'desc';
}
```

**Response:**
```typescript
interface BugsListResponse {
  bugs: Bug[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}
```

## CSV Parsing Best Practices

### Robust Date Parsing

```typescript
function parseJiraDate(dateStr: string | null): Date | null {
  if (!dateStr || dateStr.trim() === '') {
    return null;
  }
  
  try {
    // JIRA format: "2025-01-15 10:30:45"
    // Convert to ISO format
    const isoStr = dateStr.replace(' ', 'T') + 'Z';
    const date = new Date(isoStr);
    
    // Validate date
    if (isNaN(date.getTime())) {
      console.warn(`Invalid date: ${dateStr}`);
      return null;
    }
    
    return date;
  } catch (error) {
    console.error(`Error parsing date: ${dateStr}`, error);
    return null;
  }
}
```

### Component Extraction

```typescript
function extractComponent(bug: {
  labels: string[];
  summary: string;
}): string {
  const labelsStr = bug.labels.join(' ').toLowerCase();
  const summary = bug.summary.toLowerCase();
  const combined = `${labelsStr} ${summary}`;
  
  // Priority order matters - check most specific first
  if (combined.includes('deploy-metering') || combined.includes('deployment')) {
    return 'deploy-metering';
  }
  
  if (combined.includes('service-broker') || combined.includes('broker')) {
    return 'service-broker';
  }
  
  if (combined.includes('foss') || combined.includes('vulnerability') || 
      combined.includes('cve-')) {
    return 'foss-vulnerabilities';
  }
  
  if (combined.includes('cm-metering') || combined.includes('convergent')) {
    return 'cm-metering';
  }
  
  if (combined.includes('sdm') || combined.includes('document management')) {
    return 'sdm-metering';
  }
  
  return 'other';
}
```

### Resolution Time Calculation

```typescript
function calculateResolutionTime(
  created: Date,
  resolved: Date | null
): number | null {
  if (!resolved) {
    return null;
  }
  
  const diffMs = resolved.getTime() - created.getTime();
  const diffHours = diffMs / (1000 * 60 * 60);
  
  // Sanity check: resolution time should be positive and reasonable
  if (diffHours < 0 || diffHours > 87600) { // > 10 years
    console.warn(`Unusual resolution time: ${diffHours}h`);
    return null;
  }
  
  return Math.round(diffHours * 10) / 10; // Round to 1 decimal
}
```

## Performance Optimization

### Batch Insert Strategy

```typescript
async function insertBugs(upload_id: string, bugs: ParsedBug[]) {
  const BATCH_SIZE = 100;
  
  for (let i = 0; i < bugs.length; i += BATCH_SIZE) {
    const batch = bugs.slice(i, i + BATCH_SIZE);
    
    await db.bugs.createMany({
      data: batch.map(bug => ({
        upload_id,
        bug_key: bug.key,
        summary: bug.summary,
        // ... other fields
      }))
    });
    
    // Progress callback
    if (onProgress) {
      onProgress({
        processed: Math.min(i + BATCH_SIZE, bugs.length),
        total: bugs.length
      });
    }
  }
}
```

### KPI Calculation Optimization

```typescript
// Calculate all KPIs in a single pass
function calculateAllKPIsOptimized(bugs: Bug[]): KPIResult {
  const resolved = [];
  const open = [];
  const byPriority = {
    'Very High': [],
    'High': [],
    'Medium': [],
    'Low': []
  };
  
  // Single pass to categorize
  for (const bug of bugs) {
    if (bug.resolved_date) {
      resolved.push(bug);
    } else if (isOpenStatus(bug.status)) {
      open.push(bug);
    }
    
    if (bug.priority in byPriority) {
      byPriority[bug.priority].push(bug);
    }
  }
  
  // Now calculate each KPI using categorized data
  return {
    kpi1: calculateKPI1(bugs),
    kpi2: calculateKPI2(bugs),
    kpi3: calculateKPI3ByPriority(byPriority, resolved),
    kpi4: calculateKPI4(byPriority, resolved),
    kpi5: calculateKPI5(open, byPriority),
    // ...
  };
}
```

### Caching Strategy

```typescript
// Cache KPIs for frequently accessed weeks
const kpiCache = new Map<string, {
  data: KPIResult;
  timestamp: number;
}>();

const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

async function getKPIs(week: string, component: string): Promise<KPIResult> {
  const cacheKey = `${week}:${component}`;
  const cached = kpiCache.get(cacheKey);
  
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }
  
  const kpis = await db.weekly_kpis.findUnique({
    where: { week_ending_component: { week, component } }
  });
  
  if (kpis) {
    kpiCache.set(cacheKey, {
      data: kpis,
      timestamp: Date.now()
    });
  }
  
  return kpis;
}
```

## UI Component Patterns

### KPI Metric Card

```typescript
interface MetricCardProps {
  label: string;
  value: string | number;
  unit?: string;
  subtitle?: string;
  target?: string;
  status: 'success' | 'warning' | 'danger';
}

function MetricCard({ label, value, unit, subtitle, target, status }: MetricCardProps) {
  return (
    <Card>
      <CardHeader>
        <Text size="sm" color="muted">{label}</Text>
      </CardHeader>
      <CardBody>
        <Flex align="baseline" gap={1}>
          <Heading size="2xl" color={`${status}.600`}>
            {value}
          </Heading>
          {unit && <Text size="sm" color="muted">{unit}</Text>}
        </Flex>
        {subtitle && <Text size="xs" color="muted">{subtitle}</Text>}
        {target && <Text size="xs" color="muted">Target: {target}</Text>}
        <Badge variant={status} mt={2}>
          {status === 'success' ? 'On Target' : 
           status === 'warning' ? 'Warning' : 'Critical'}
        </Badge>
      </CardBody>
    </Card>
  );
}
```

### Age Indicator

```typescript
function AgeIndicator({ age }: { age: number }) {
  const getVariant = () => {
    if (age < 7) return 'success';
    if (age < 14) return 'warning';
    return 'danger';
  };
  
  const getIcon = () => {
    if (age < 7) return '🟢';
    if (age < 14) return '🟡';
    return '🔴';
  };
  
  return (
    <Tooltip label={`${Math.round(age)} days old`}>
      <Badge variant={getVariant()} size="sm">
        {getIcon()}
      </Badge>
    </Tooltip>
  );
}
```

### Filter Controls

```typescript
function DashboardFilters({ 
  weeks, 
  components,
  selectedWeek,
  selectedComponent,
  onWeekChange,
  onComponentChange 
}: FilterProps) {
  return (
    <Flex gap={4} align="center">
      <FormControl>
        <FormLabel>Component</FormLabel>
        <Select 
          value={selectedComponent}
          onChange={(e) => onComponentChange(e.target.value)}
        >
          <option value="all">All Components</option>
          {components.map(c => (
            <option key={c} value={c}>
              {formatComponentName(c)}
            </option>
          ))}
        </Select>
      </FormControl>
      
      <FormControl>
        <FormLabel>Week</FormLabel>
        <Select
          value={selectedWeek}
          onChange={(e) => onWeekChange(e.target.value)}
        >
          {weeks.map(w => (
            <option key={w.week_ending} value={w.week_ending}>
              Week ending {formatDate(w.week_ending)} ({w.total_bugs} bugs)
            </option>
          ))}
        </Select>
      </FormControl>
    </Flex>
  );
}
```

## Testing Strategy

### Unit Tests for KPI Calculations

```typescript
describe('KPI Calculator', () => {
  const mockBugs: Bug[] = [
    {
      bug_key: 'TEST-1',
      priority: 'Very High',
      status: 'Resolved',
      created_date: new Date('2025-01-01T10:00:00Z'),
      resolved_date: new Date('2025-01-01T20:00:00Z'),
      resolution_time_hours: 10,
      // ...
    },
    // ... more test data
  ];
  
  it('should calculate bug inflow rate correctly', () => {
    const result = calculateBugInflowRate(mockBugs);
    expect(result).toBe(5.0);
  });
  
  it('should calculate SLA compliance correctly', () => {
    const result = calculateSLACompliance(mockBugs);
    expect(result.vh_percent).toBe(100); // All VH resolved <24h
  });
  
  it('should calculate backlog health score correctly', () => {
    const result = calculateBacklogHealthScore(mockBugs);
    expect(result).toBe(100); // No open VH or High bugs
  });
});
```

### Integration Tests for Upload

```typescript
describe('Bug Upload API', () => {
  it('should successfully upload and process CSV', async () => {
    const csv = createTestCSV();
    const response = await uploadCSV(csv, '2026-01-26');
    
    expect(response.success).toBe(true);
    expect(response.total_bugs).toBeGreaterThan(0);
    
    // Verify bugs were saved
    const bugs = await db.bugs.findMany({
      where: { upload_id: response.upload_id }
    });
    expect(bugs.length).toBe(response.total_bugs);
    
    // Verify KPIs were calculated
    const kpis = await db.weekly_kpis.findUnique({
      where: { 
        week_ending_component: {
          week_ending: '2026-01-26',
          component: 'all'
        }
      }
    });
    expect(kpis).toBeTruthy();
    expect(kpis.backlog_health_score).toBeGreaterThanOrEqual(0);
  });
  
  it('should reject duplicate upload without replace flag', async () => {
    const csv = createTestCSV();
    await uploadCSV(csv, '2026-01-26');
    
    const response = await uploadCSV(csv, '2026-01-26');
    expect(response.success).toBe(false);
    expect(response.error_code).toBe('DUPLICATE_UPLOAD');
  });
});
```

## Security Considerations

### Input Validation

```typescript
function validateUploadRequest(req: UploadRequest): ValidationResult {
  const errors: string[] = [];
  
  // Validate file
  if (!req.file) {
    errors.push('File is required');
  } else if (!req.file.name.endsWith('.csv')) {
    errors.push('File must be CSV format');
  } else if (req.file.size > 10 * 1024 * 1024) { // 10MB
    errors.push('File size must be less than 10MB');
  }
  
  // Validate week_ending
  if (!req.week_ending) {
    errors.push('Week ending date is required');
  } else {
    const date = new Date(req.week_ending);
    if (isNaN(date.getTime())) {
      errors.push('Invalid week ending date');
    } else if (date.getDay() !== 6) { // Not Saturday
      errors.push('Week ending must be a Saturday');
    }
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}
```

### Permission Checks

```typescript
async function checkUploadPermission(userId: string): Promise<boolean> {
  const user = await db.users.findUnique({
    where: { id: userId },
    include: { roles: true }
  });
  
  const allowedRoles = ['engineering_lead', 'engineering_manager', 'admin'];
  
  return user?.roles.some(role => 
    allowedRoles.includes(role.name)
  ) ?? false;
}

// In API endpoint:
export async function POST(req: Request) {
  const userId = await getCurrentUserId(req);
  
  if (!await checkUploadPermission(userId)) {
    return Response.json({
      success: false,
      error: 'Unauthorized'
    }, { status: 403 });
  }
  
  // ... proceed with upload
}
```

### SQL Injection Prevention

```typescript
// ✅ GOOD - Using parameterized queries
async function getBugsByComponent(uploadId: string, component: string) {
  return await db.bugs.findMany({
    where: {
      upload_id: uploadId,
      component: component
    }
  });
}

// ❌ BAD - Never construct SQL strings manually
async function getBugsByComponentBad(uploadId: string, component: string) {
  return await db.$queryRaw(
    `SELECT * FROM bugs WHERE upload_id = '${uploadId}' AND component = '${component}'`
  );
}
```

## Deployment Checklist

### Pre-Deployment

- [ ] Run all tests
- [ ] Verify database migrations
- [ ] Check environment variables
- [ ] Review security settings
- [ ] Test with production-like data volume
- [ ] Verify backup strategy

### Database Migration

```bash
# 1. Backup database
pg_dump -U user -d dbname > backup_before_bugs_dashboard.sql

# 2. Run migrations
npm run db:migrate

# 3. Verify schema
psql -U user -d dbname -c "\d bugs"
psql -U user -d dbname -c "\d bug_uploads"
psql -U user -d dbname -c "\d weekly_kpis"

# 4. Test with sample data
npm run seed:test-bugs
```

### Post-Deployment

- [ ] Verify dashboard loads
- [ ] Test upload functionality
- [ ] Check KPI calculations
- [ ] Verify filters work
- [ ] Test permissions
- [ ] Monitor error logs
- [ ] Check database indexes
- [ ] Verify performance metrics

## Monitoring & Maintenance

### Key Metrics to Track

```typescript
// Add telemetry
async function trackUpload(metrics: {
  upload_id: string;
  bug_count: number;
  processing_time_ms: number;
  success: boolean;
}) {
  await analytics.track('bug_upload', metrics);
}

// Monitor query performance
async function trackQueryPerformance(
  endpoint: string,
  duration_ms: number
) {
  if (duration_ms > 1000) {
    console.warn(`Slow query: ${endpoint} took ${duration_ms}ms`);
  }
}
```

### Database Maintenance

```sql
-- Weekly maintenance
VACUUM ANALYZE bugs;
VACUUM ANALYZE weekly_kpis;

-- Monthly index optimization
REINDEX TABLE bugs;
REINDEX TABLE weekly_kpis;

-- Check table sizes
SELECT 
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename))
FROM pg_tables
WHERE tablename IN ('bugs', 'bug_uploads', 'weekly_kpis')
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
```

---

This guide should provide all the technical details needed for a robust implementation. Refer back to KPI_SPECIFICATION.md for exact calculation formulas and CLAUDE_CODE_PROMPT.md for feature requirements.
