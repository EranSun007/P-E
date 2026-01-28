# Bug Dashboard KPI Specification

## Complete KPI Definitions and Calculation Formulas

### KPI 1: Bug Inflow Rate
**Definition:** Average number of bugs created per week over a rolling 4-week period.

**Formula:**
```
Bug Inflow Rate = (Total bugs created in last 4 weeks) / 4
```

**Target:** ≤6 bugs/week

**Status Thresholds:**
- ✅ Green (On Target): ≤6.0 bugs/week
- 🟡 Yellow (Warning): 6.1-8.0 bugs/week
- 🔴 Red (Critical): >8.0 bugs/week

**Implementation:**
```typescript
function calculateBugInflowRate(bugs: Bug[]): number {
  const fourWeeksAgo = new Date();
  fourWeeksAgo.setDate(fourWeeksAgo.getDate() - 28);
  
  const recentBugs = bugs.filter(b => 
    new Date(b.created_date) >= fourWeeksAgo
  );
  
  return recentBugs.length / 4;
}
```

---

### KPI 2: Time to First Response (TTFR)
**Definition:** Median time from bug creation to first status change or assignment.

**Formula:**
```
TTFR = Median(first_response_time for all bugs)
where first_response_time = time of first status change - created_date

Also calculate: % of bugs with TTFR < 24 hours
```

**Target:** 
- Very High bugs: <24 hours (80% compliance)
- All bugs: <48 hours median

**Status Thresholds:**
- ✅ Green: Median <24h
- 🟡 Yellow: Median 24-48h
- 🔴 Red: Median >48h

**Implementation:**
```typescript
function calculateTTFR(bugs: Bug[]): { median: number; under24h: number } {
  // Note: In your CSV, first response is approximated as first status change
  // You may need to enhance this based on your workflow
  
  const ttfrValues: number[] = [];
  
  for (const bug of bugs) {
    // Approximate: Use time to resolution or current time if still open
    const responseTime = bug.resolved_date 
      ? new Date(bug.resolved_date).getTime() 
      : new Date().getTime();
    
    const createdTime = new Date(bug.created_date).getTime();
    const ttfrHours = (responseTime - createdTime) / (1000 * 60 * 60);
    
    ttfrValues.push(ttfrHours);
  }
  
  const median = calculateMedian(ttfrValues);
  const under24h = ttfrValues.filter(t => t < 24).length;
  const under24hPercent = (under24h / ttfrValues.length) * 100;
  
  return { median, under24hPercent };
}
```

---

### KPI 3: Mean Time to Resolution (MTTR) by Priority
**Definition:** Median resolution time for bugs of each priority level.

**Formula:**
```
MTTR_VeryHigh = Median(resolution_time_hours WHERE priority = 'Very High' AND resolved)
MTTR_High = Median(resolution_time_hours WHERE priority = 'High' AND resolved)
MTTR_Medium = Median(resolution_time_hours WHERE priority = 'Medium' AND resolved)
MTTR_Low = Median(resolution_time_hours WHERE priority = 'Low' AND resolved)
```

**Targets:**
- Very High: <72h (3 days)
- High: <168h (7 days)
- Medium: <336h (14 days)
- Low: Best effort

**Implementation:**
```typescript
function calculateMTTRByPriority(bugs: Bug[]): Record<string, number> {
  const resolvedBugs = bugs.filter(b => b.resolved_date !== null);
  
  const priorities = ['Very High', 'High', 'Medium', 'Low'];
  const mttr: Record<string, number> = {};
  
  for (const priority of priorities) {
    const priorityBugs = resolvedBugs.filter(b => b.priority === priority);
    
    if (priorityBugs.length === 0) {
      mttr[priority] = 0;
      continue;
    }
    
    const resolutionTimes = priorityBugs
      .map(b => b.resolution_time_hours)
      .filter(t => t !== null) as number[];
    
    mttr[priority] = calculateMedian(resolutionTimes);
  }
  
  return mttr;
}
```

---

### KPI 4: Resolution Rate / SLA Compliance
**Definition:** Percentage of bugs resolved within target SLA time.

**Formula:**
```
SLA_VH = (Count of Very High bugs resolved < 24h) / (Total Very High bugs) × 100
SLA_High = (Count of High bugs resolved < 48h) / (Total High bugs) × 100
```

**Targets:**
- Very High: 80% resolved <24h
- High: 70% resolved <48h

**Status Thresholds:**
- ✅ Green: ≥80% for VH, ≥70% for High
- 🟡 Yellow: 60-79% for VH, 50-69% for High
- 🔴 Red: <60% for VH, <50% for High

**Implementation:**
```typescript
function calculateSLACompliance(bugs: Bug[]): {
  vh_percent: number;
  high_percent: number;
} {
  const vhBugs = bugs.filter(b => b.priority === 'Very High');
  const highBugs = bugs.filter(b => b.priority === 'High');
  
  const vhUnder24h = vhBugs.filter(b => 
    b.resolution_time_hours !== null && b.resolution_time_hours < 24
  ).length;
  
  const highUnder48h = highBugs.filter(b =>
    b.resolution_time_hours !== null && b.resolution_time_hours < 48
  ).length;
  
  return {
    vh_percent: vhBugs.length > 0 ? (vhUnder24h / vhBugs.length) * 100 : 0,
    high_percent: highBugs.length > 0 ? (highUnder48h / highBugs.length) * 100 : 0
  };
}
```

---

### KPI 5: Open Bug Age Distribution
**Definition:** Count and average age of open bugs by priority.

**Formula:**
```
For each priority level:
  Open_Count = Count WHERE status IN ('Open', 'Author Action') AND priority = X
  Avg_Age = Average((NOW() - created_date) in days) WHERE open AND priority = X
```

**Targets:**
- Very High: 0 bugs >3 days
- High: 0 bugs >14 days
- Medium: <5 bugs total

**Implementation:**
```typescript
function calculateOpenBugAge(bugs: Bug[]): {
  vh: { count: number; avgAge: number };
  high: { count: number; avgAge: number };
  medium: { count: number; avgAge: number };
} {
  const openStatuses = ['Open', 'Author Action', 'In Progress'];
  const openBugs = bugs.filter(b => openStatuses.includes(b.status));
  
  const now = new Date();
  
  function getStats(priority: string) {
    const priorityBugs = openBugs.filter(b => b.priority === priority);
    
    if (priorityBugs.length === 0) {
      return { count: 0, avgAge: 0 };
    }
    
    const ages = priorityBugs.map(b => {
      const created = new Date(b.created_date);
      return (now.getTime() - created.getTime()) / (1000 * 60 * 60 * 24);
    });
    
    const avgAge = ages.reduce((sum, age) => sum + age, 0) / ages.length;
    
    return { count: priorityBugs.length, avgAge };
  }
  
  return {
    vh: getStats('Very High'),
    high: getStats('High'),
    medium: getStats('Medium')
  };
}
```

---

### KPI 6: Automated vs Actionable Bug Ratio
**Definition:** Percentage of bugs from automated sources vs manual reports.

**Formula:**
```
Automated_Count = Count WHERE reporter IN (automated_reporters)
Automated_Percent = (Automated_Count / Total_Bugs) × 100
```

**Automated Reporters (check in data):**
- T_VASST (vulnerability scanner)
- T_hcpcm_cn (monitoring)
- T_* (any reporter starting with T_)

**Target:** 25-40% automated (shows good monitoring coverage)

**Implementation:**
```typescript
function calculateAutomatedRatio(bugs: Bug[]): {
  automated: number;
  percent: number;
} {
  const automatedReporters = bugs.filter(b => 
    b.reporter.startsWith('T_') || 
    b.reporter.includes('VASST') ||
    b.reporter.includes('hcpcm')
  ).length;
  
  return {
    automated: automatedReporters,
    percent: (automatedReporters / bugs.length) * 100
  };
}
```

---

### KPI 7: Bug Category Distribution
**Definition:** Breakdown of bugs by functional category.

**Formula:**
```
Deployment_Count = Count WHERE labels CONTAINS 'deploy' OR 'Deploy'
FOSS_Count = Count WHERE labels CONTAINS 'foss' OR summary CONTAINS 'FOSS'
ServiceBroker_Count = Count WHERE labels CONTAINS 'broker' OR summary CONTAINS 'broker'
Other_Count = Total - (Deployment + FOSS + ServiceBroker)
```

**Categories:**
1. **Deployment Failures** - deploy-metering, deployment issues
2. **FOSS Security** - Vulnerability scans, library updates
3. **Service Broker** - Broker timeouts, errors, connectivity
4. **Other** - Everything else

**Implementation:**
```typescript
function categorizeBugs(bugs: Bug[]): {
  deployment: number;
  foss: number;
  service_broker: number;
  other: number;
} {
  let deployment = 0;
  let foss = 0;
  let serviceBroker = 0;
  
  for (const bug of bugs) {
    const labelsStr = bug.labels.join(' ').toLowerCase();
    const summary = bug.summary.toLowerCase();
    
    if (labelsStr.includes('deploy') || summary.includes('deploy')) {
      deployment++;
    } else if (labelsStr.includes('foss') || summary.includes('foss') || 
               summary.includes('vulnerability')) {
      foss++;
    } else if (labelsStr.includes('broker') || summary.includes('broker')) {
      serviceBroker++;
    }
  }
  
  return {
    deployment,
    foss,
    service_broker: serviceBroker,
    other: bugs.length - deployment - foss - serviceBroker
  };
}
```

---

### KPI 8: Duty Rotation Workload Distribution
**Definition:** Average bugs per week and variability.

**Formula:**
```
Avg_Bugs_Per_Week = Total_Bugs / Number_Of_Weeks
Std_Dev = Standard deviation of weekly bug counts
```

**Target:** Predictable workload, StdDev <3

**Implementation:**
```typescript
function calculateWorkloadDistribution(bugs: Bug[]): {
  avgPerWeek: number;
  stdDev: number;
} {
  // Group bugs by week
  const bugsByWeek: Record<string, number> = {};
  
  for (const bug of bugs) {
    const created = new Date(bug.created_date);
    const weekKey = getWeekKey(created);
    bugsByWeek[weekKey] = (bugsByWeek[weekKey] || 0) + 1;
  }
  
  const weeklyCounts = Object.values(bugsByWeek);
  const avg = weeklyCounts.reduce((sum, c) => sum + c, 0) / weeklyCounts.length;
  
  const variance = weeklyCounts.reduce((sum, c) => 
    sum + Math.pow(c - avg, 2), 0
  ) / weeklyCounts.length;
  
  const stdDev = Math.sqrt(variance);
  
  return { avgPerWeek: avg, stdDev };
}

function getWeekKey(date: Date): string {
  // Get Monday of the week
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  return d.toISOString().split('T')[0];
}
```

---

### KPI 9: Known Issue Recurrence Rate
**Definition:** Percentage of bugs that match known patterns.

**Known Patterns:**
- State Push Failure (SPF) - Fast resolution, well-documented
- Deployment timeout - Service broker timeout patterns
- FOSS vulnerabilities - Auto-created by scanner

**Target:** 20-30% should be known patterns (shows good documentation)

---

### KPI 10: Backlog Health Score
**Definition:** Composite score based on open bug severity and age.

**Formula:**
```
Backlog_Health_Score = 100 - (Open_VH_Count × 10) - (Open_High_Count × 5)

Minimum score: 0
Maximum score: 100
```

**Interpretation:**
- 100: Perfect (no open VH or High bugs)
- 70-99: Good (green zone)
- 50-69: Warning (yellow zone)
- 0-49: Critical (red zone)

**Examples:**
- 0 VH, 0 High = 100 (perfect)
- 2 VH, 0 High = 100 - 20 = 80 (good)
- 0 VH, 5 High = 100 - 25 = 75 (good)
- 2 VH, 12 High = 100 - 20 - 60 = 20 (critical)

**Implementation:**
```typescript
function calculateBacklogHealthScore(bugs: Bug[]): number {
  const openStatuses = ['Open', 'Author Action', 'In Progress'];
  const openBugs = bugs.filter(b => openStatuses.includes(b.status));
  
  const vhCount = openBugs.filter(b => b.priority === 'Very High').length;
  const highCount = openBugs.filter(b => b.priority === 'High').length;
  
  const score = 100 - (vhCount * 10) - (highCount * 5);
  
  return Math.max(0, score); // Floor at 0
}
```

---

## Helper Functions

### Median Calculation
```typescript
function calculateMedian(values: number[]): number {
  if (values.length === 0) return 0;
  
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  
  if (sorted.length % 2 === 0) {
    return (sorted[mid - 1] + sorted[mid]) / 2;
  }
  
  return sorted[mid];
}
```

### Date Utilities
```typescript
function getWeekEnding(date: Date): Date {
  // Get Saturday (week ending) for a given date
  const d = new Date(date);
  const day = d.getDay();
  const diff = 6 - day; // Days until Saturday
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function parseJiraDate(dateStr: string): Date {
  // JIRA format: "2025-01-15 10:30:45"
  return new Date(dateStr.replace(' ', 'T') + 'Z');
}
```

### Status Helpers
```typescript
function isOpenStatus(status: string): boolean {
  const openStatuses = [
    'Open',
    'Author Action',
    'In Progress',
    'Reopened'
  ];
  return openStatuses.includes(status);
}

function isResolvedStatus(status: string): boolean {
  const resolvedStatuses = [
    'Resolved',
    'Closed',
    'Done'
  ];
  return resolvedStatuses.includes(status);
}
```

---

## Complete KPI Calculation Module

```typescript
// File: lib/calculate-all-kpis.ts

export interface KPIResult {
  // KPI 1
  bug_inflow_rate: number;
  
  // KPI 2
  median_ttfr_hours: number;
  ttfr_under_24h_percent: number;
  
  // KPI 3
  mttr_very_high: number;
  mttr_high: number;
  mttr_medium: number;
  mttr_low: number;
  
  // KPI 4
  sla_vh_under_24h_percent: number;
  sla_vh_under_24h_count: number;
  sla_vh_total: number;
  sla_high_under_48h_percent: number;
  sla_high_under_48h_count: number;
  sla_high_total: number;
  
  // KPI 5
  open_vh_count: number;
  open_vh_avg_age_days: number;
  open_high_count: number;
  open_high_avg_age_days: number;
  open_medium_count: number;
  open_medium_avg_age_days: number;
  
  // KPI 6
  automated_bug_count: number;
  automated_bug_percent: number;
  
  // KPI 7
  deployment_bug_count: number;
  deployment_bug_percent: number;
  foss_bug_count: number;
  foss_bug_percent: number;
  service_broker_bug_count: number;
  service_broker_bug_percent: number;
  other_bug_count: number;
  other_bug_percent: number;
  
  // KPI 8
  avg_bugs_per_week: number;
  std_dev_bugs_per_week: number;
  
  // KPI 10
  backlog_health_score: number;
  
  // Meta
  total_bugs: number;
  total_open_bugs: number;
  total_resolved_bugs: number;
}

export function calculateAllKPIs(bugs: Bug[]): KPIResult {
  // Implement all KPI calculations here
  // Use the functions defined above
  
  return {
    bug_inflow_rate: calculateBugInflowRate(bugs),
    // ... all other KPIs
  };
}
```

---

## CSV Column Mapping

Expected columns from JIRA export:

| CSV Column | Database Field | Type | Notes |
|------------|---------------|------|-------|
| Key | bug_key | string | e.g., "NGPBUG-475842" |
| Summary | summary | text | Bug title |
| Priority | priority | string | "Very High", "High", "Medium", "Low" |
| Status | status | string | "Open", "Resolved", "Closed", etc. |
| Created | created_date | timestamp | Parse: "2025-01-15 10:30:45" |
| Resolved | resolved_date | timestamp | NULL if not resolved |
| Reporter | reporter | string | User who created |
| Assignee | assignee | string | NULL if unassigned |
| Labels | labels | array | Comma-separated in CSV |
| Description | description | text | Optional |

Calculate on import:
- resolution_time_hours = (resolved_date - created_date) in hours
- component = extract from labels or summary
- jira_url = `https://jira.tools.sap/browse/${bug_key}`
