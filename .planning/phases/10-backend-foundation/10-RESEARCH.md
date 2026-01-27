# Phase 10: Backend Foundation - Research

**Researched:** 2026-01-27
**Domain:** Backend API development with CSV parsing, KPI calculations, PostgreSQL analytics
**Confidence:** HIGH

## Summary

Phase 10 implements the backend foundation for the DevOps Bug Dashboard, building on proven patterns from v1.0 (JiraService) and v1.1 (CaptureService). The phase adds three new database tables (bug_uploads, bugs, weekly_kpis), a BugService with CSV parsing and KPI calculation logic, and REST API routes following established conventions.

**Key Technical Challenges:**
1. CSV parsing with validation for required JIRA export columns
2. Calculating 10 complex KPIs with statistical functions (median, standard deviation)
3. Pre-calculating and storing KPIs per component for performance
4. Component extraction from labels and summary fields

**Architecture Decision:** Pre-calculate all KPIs on upload and store in weekly_kpis table rather than calculating on-demand. This trades storage space for query performance and ensures consistent calculations across dashboard views.

**Primary recommendation:** Use fast-csv for Node.js streaming CSV parsing, PostgreSQL built-in PERCENTILE_CONT for median calculations, and follow existing JiraService patterns for multi-tenancy and error handling.

## Standard Stack

The established libraries/tools for this domain:

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| express | ^4.21.2 | Web framework | Already in use, proven for REST APIs |
| pg | ^8.13.1 | PostgreSQL client | Already in use, supports parameterized queries |
| fast-csv | ^5.0.1 | CSV parsing | High reputation (86.7 score), 212 code snippets, streaming support |
| PostgreSQL | 14+ | Database | Built-in aggregate functions (PERCENTILE_CONT, STDDEV) |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| multer | ^1.4.5-lts.1 | File upload middleware | Handle multipart/form-data for CSV uploads |
| date-fns | ^4.1.0 | Date manipulation | Already in frontend, consistent date parsing |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| fast-csv | papaparse | PapaParse is browser-focused (89.6 score), fast-csv is Node.js native with better streaming |
| fast-csv | csv-parser | csv-parser is fast but fast-csv has better documentation (212 vs 82 snippets) |
| multer | formidable | Multer has better Express integration and wider adoption |

**Installation:**
```bash
npm install fast-csv multer
```

## Architecture Patterns

### Recommended Project Structure
```
server/
├── db/
│   └── 019_bug_dashboard.sql      # Migration file
├── services/
│   └── BugService.js              # All bug logic (CSV, KPI, CRUD)
└── routes/
    └── bugs.js                     # REST API endpoints
```

### Pattern 1: Service Layer with CSV Parsing
**What:** CSV parsing in service layer, not routes. Validation before database insert.
**When to use:** Always for data import operations
**Example:**
```javascript
// BugService.js
class BugService {
  async uploadCSV(userId, fileBuffer, weekEnding) {
    // 1. Parse CSV with fast-csv
    const bugs = await this.parseCSV(fileBuffer);

    // 2. Validate required columns
    this.validateColumns(bugs);

    // 3. Calculate derived fields (resolution_time_hours, component)
    const enrichedBugs = bugs.map(bug => ({
      ...bug,
      resolution_time_hours: this.calculateResolutionTime(bug),
      component: this.extractComponent(bug)
    }));

    // 4. Begin transaction
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // 5. Insert upload metadata
      const uploadResult = await client.query(`
        INSERT INTO bug_uploads (user_id, week_ending, filename, bug_count)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (user_id, week_ending) DO UPDATE SET
          filename = EXCLUDED.filename,
          bug_count = EXCLUDED.bug_count,
          uploaded_at = CURRENT_TIMESTAMP
        RETURNING id
      `, [userId, weekEnding, filename, enrichedBugs.length]);

      const uploadId = uploadResult.rows[0].id;

      // 6. Delete old bugs for this upload
      await client.query('DELETE FROM bugs WHERE upload_id = $1', [uploadId]);

      // 7. Batch insert bugs
      await this.batchInsertBugs(client, uploadId, enrichedBugs);

      // 8. Calculate and store KPIs
      await this.calculateAndStoreKPIs(client, uploadId, enrichedBugs);

      await client.query('COMMIT');
      return { uploadId, bugCount: enrichedBugs.length };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }
}
```

### Pattern 2: PostgreSQL Aggregate Functions for KPIs
**What:** Use PostgreSQL built-in functions for statistical calculations
**When to use:** For median, standard deviation, percentiles
**Example:**
```javascript
// Calculate median MTTR by priority using SQL
async getMTTRByPriority(uploadId) {
  const sql = `
    SELECT
      priority,
      PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY resolution_time_hours) as median_mttr
    FROM bugs
    WHERE upload_id = $1 AND resolution_time_hours IS NOT NULL
    GROUP BY priority
  `;
  const result = await query(sql, [uploadId]);
  return result.rows;
}

// Calculate standard deviation using SQL
async getWorkloadStats(uploadId) {
  const sql = `
    SELECT
      COUNT(*) / 4.0 as avg_bugs_per_week,
      STDDEV(weekly_count) as std_dev
    FROM (
      SELECT
        DATE_TRUNC('week', created_date) as week,
        COUNT(*) as weekly_count
      FROM bugs
      WHERE upload_id = $1
      GROUP BY week
    ) weekly_counts
  `;
  const result = await query(sql, [uploadId]);
  return result.rows[0];
}
```

### Pattern 3: Pre-calculated KPIs with Component Filtering
**What:** Store KPIs per (upload_id, component) for fast filtering
**When to use:** When dashboard needs instant component switching
**Example:**
```javascript
// Store KPIs for "all" and each component
async calculateAndStoreKPIs(client, uploadId, bugs) {
  // Calculate for "all" components
  const allKPIs = this.calculateKPIs(bugs);
  await this.insertKPIs(client, uploadId, null, allKPIs);

  // Calculate per component
  const components = [...new Set(bugs.map(b => b.component).filter(Boolean))];
  for (const component of components) {
    const componentBugs = bugs.filter(b => b.component === component);
    const componentKPIs = this.calculateKPIs(componentBugs);
    await this.insertKPIs(client, uploadId, component, componentKPIs);
  }
}

// Retrieve with simple query
async getKPIs(userId, uploadId, component = null) {
  const sql = `
    SELECT * FROM weekly_kpis
    WHERE upload_id = $1 AND component IS NOT DISTINCT FROM $2
  `;
  const result = await query(sql, [uploadId, component]);
  return result.rows[0];
}
```

### Pattern 4: Batch Insert for Performance
**What:** Use PostgreSQL unnest() for efficient bulk inserts
**When to use:** Inserting 100+ rows at once
**Example:**
```javascript
async batchInsertBugs(client, uploadId, bugs) {
  if (bugs.length === 0) return;

  // Build arrays for each column
  const bugKeys = bugs.map(b => b.bug_key);
  const summaries = bugs.map(b => b.summary);
  const priorities = bugs.map(b => b.priority);
  // ... other columns

  const sql = `
    INSERT INTO bugs (
      upload_id, bug_key, summary, priority, status,
      created_date, resolved_date, resolution_time_hours, component
    )
    SELECT
      $1,
      unnest($2::varchar[]),
      unnest($3::text[]),
      unnest($4::varchar[]),
      unnest($5::varchar[]),
      unnest($6::timestamp[]),
      unnest($7::timestamp[]),
      unnest($8::float[]),
      unnest($9::varchar[])
  `;

  await client.query(sql, [
    uploadId, bugKeys, summaries, priorities, statuses,
    createdDates, resolvedDates, resolutionTimes, components
  ]);
}
```

### Anti-Patterns to Avoid
- **Row-by-row CSV parsing in routes:** Always parse in service layer with proper error handling
- **Calculating KPIs on page load:** Pre-calculate and store in database
- **SQL injection in dynamic queries:** Always use parameterized queries ($1, $2, etc.)
- **Missing transaction for multi-table operations:** Wrap upload + bugs + KPIs in single transaction
- **No duplicate upload detection:** Use UNIQUE constraint on (user_id, week_ending)

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| CSV parsing | Manual split/parse loop | fast-csv library | Handles quoted fields, escaped commas, encoding issues, streaming for large files |
| Median calculation | Manual sort and index | PostgreSQL PERCENTILE_CONT | Database-native, optimized, handles NULL values correctly |
| Standard deviation | Manual variance calculation | PostgreSQL STDDEV | Database-native, numerically stable |
| File uploads | req.body parsing | multer middleware | Handles multipart/form-data, file size limits, mime type validation |
| Component extraction | Complex regex | Simple includes() with fallback | Labels format varies, simple string matching is more maintainable |

**Key insight:** PostgreSQL has battle-tested statistical functions. Don't reimplement median/stddev in JavaScript when the database can do it efficiently as part of the query.

## Common Pitfalls

### Pitfall 1: CSV Date Format Variations
**What goes wrong:** JIRA exports use different date formats depending on locale settings
**Why it happens:** "2025-01-15 10:30:45" vs "01/15/2025 10:30 AM" vs "15-Jan-2025"
**How to avoid:**
- Try multiple date parsers in sequence
- Log unparseable dates for debugging
- Store original date string in raw_data JSONB for recovery
**Warning signs:** "Invalid Date" errors, KPI calculations with wrong timestamps

### Pitfall 2: Component Extraction Edge Cases
**What goes wrong:** Bug belongs to multiple categories or no category
**Why it happens:** Labels overlap (e.g., "deploy-metering, foss-vulnerabilities")
**How to avoid:**
- Priority order: deployment > foss > service-broker > other
- First match wins
- Always have "other" as fallback
- Log bugs with multiple matches for review
**Warning signs:** Component counts don't add up to total bugs

### Pitfall 3: NULL vs Empty String in PostgreSQL
**What goes wrong:** Filters break when comparing NULL values
**Why it happens:** JavaScript undefined → SQL NULL, but SQL NULL != NULL
**How to avoid:**
- Use `IS NOT DISTINCT FROM` for nullable comparisons
- Example: `component IS NOT DISTINCT FROM $2` works for both NULL and string values
- Default NULL values in columns, not empty strings
**Warning signs:** Component filter "All" returns zero results

### Pitfall 4: Transaction Isolation for KPI Calculations
**What goes wrong:** KPIs calculated on partial data during concurrent uploads
**Why it happens:** Transaction isolation level allows dirty reads
**How to avoid:**
- Wrap entire upload in single transaction (BEGIN/COMMIT)
- Calculate KPIs within same transaction after all bugs inserted
- Use FOR UPDATE if reading bugs for calculation
**Warning signs:** KPI values vary between page refreshes

### Pitfall 5: Memory Issues with Large CSV Files
**What goes wrong:** Node.js runs out of memory parsing 10,000+ bug CSV
**Why it happens:** Loading entire file into memory at once
**How to avoid:**
- Use streaming CSV parser (fast-csv supports streams)
- Process in batches of 500-1000 bugs
- Set multer file size limit (10MB reasonable for bug exports)
**Warning signs:** Process crashes on large uploads, heap out of memory errors

## Code Examples

Verified patterns from Context7 and established practices:

### Fast-CSV Streaming Parse with Validation
```javascript
// Source: fast-csv library documentation
import fs from 'fs';
import { parse } from 'fast-csv';

async parseCSV(fileBuffer) {
  return new Promise((resolve, reject) => {
    const bugs = [];
    const requiredColumns = ['Key', 'Summary', 'Priority', 'Status', 'Created', 'Resolved', 'Reporter', 'Assignee', 'Labels'];

    const stream = parse({ headers: true, trim: true })
      .on('data', (row) => {
        // Validate required columns on first row
        if (bugs.length === 0) {
          const missingColumns = requiredColumns.filter(col => !(col in row));
          if (missingColumns.length > 0) {
            stream.destroy();
            reject(new Error(`Missing required columns: ${missingColumns.join(', ')}`));
            return;
          }
        }

        // Map CSV columns to database fields
        bugs.push({
          bug_key: row.Key,
          summary: row.Summary,
          priority: row.Priority,
          status: row.Status,
          created_date: this.parseDate(row.Created),
          resolved_date: row.Resolved ? this.parseDate(row.Resolved) : null,
          reporter: row.Reporter,
          assignee: row.Assignee || null,
          labels: row.Labels ? row.Labels.split(',').map(l => l.trim()) : []
        });
      })
      .on('error', reject)
      .on('end', () => resolve(bugs));

    // Convert buffer to stream
    const readableStream = require('stream').Readable.from(fileBuffer.toString());
    readableStream.pipe(stream);
  });
}
```

### Multer File Upload Configuration
```javascript
// Source: Express.js patterns for file uploads
import multer from 'multer';

// Configure multer for memory storage (no disk writes)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype !== 'text/csv' && !file.originalname.endsWith('.csv')) {
      cb(new Error('Only CSV files are allowed'));
      return;
    }
    cb(null, true);
  }
});

// Use in route
router.post('/upload', upload.single('csvFile'), async (req, res) => {
  try {
    const { weekEnding } = req.body;
    const fileBuffer = req.file.buffer;
    const filename = req.file.originalname;

    const result = await BugService.uploadCSV(
      req.user.id,
      fileBuffer,
      filename,
      weekEnding
    );

    res.json(result);
  } catch (error) {
    console.error('CSV upload error:', error);
    res.status(400).json({ error: error.message });
  }
});
```

### KPI Calculation with PostgreSQL Aggregates
```javascript
// Calculate all KPIs in single query for performance
async calculateKPIs(uploadId, component = null) {
  const sql = `
    WITH bug_stats AS (
      SELECT
        COUNT(*) as total_bugs,
        COUNT(*) FILTER (WHERE status IN ('Open', 'Author Action')) as open_bugs,
        COUNT(*) FILTER (WHERE resolution_time_hours IS NOT NULL) as resolved_bugs,

        -- KPI 1: Bug Inflow (simplified - actual needs 4-week rolling)
        COUNT(*) / 4.0 as bug_inflow_rate,

        -- KPI 2: TTFR
        PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY resolution_time_hours) as median_ttfr_hours,
        COUNT(*) FILTER (WHERE resolution_time_hours < 24) * 100.0 / NULLIF(COUNT(*), 0) as ttfr_under_24h_percent,

        -- KPI 3: MTTR by Priority
        PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY resolution_time_hours)
          FILTER (WHERE priority = 'Very High') as mttr_vh,
        PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY resolution_time_hours)
          FILTER (WHERE priority = 'High') as mttr_high,

        -- KPI 4: SLA Compliance
        COUNT(*) FILTER (WHERE priority = 'Very High' AND resolution_time_hours < 24) * 100.0 /
          NULLIF(COUNT(*) FILTER (WHERE priority = 'Very High'), 0) as sla_vh_percent,

        -- KPI 5: Open Bug Age
        COUNT(*) FILTER (WHERE status IN ('Open', 'Author Action') AND priority = 'Very High') as open_vh_count,
        AVG(EXTRACT(EPOCH FROM (NOW() - created_date)) / 86400)
          FILTER (WHERE status IN ('Open', 'Author Action') AND priority = 'Very High') as open_vh_avg_age_days,

        -- KPI 6: Automated Ratio
        COUNT(*) FILTER (WHERE reporter LIKE 'T_%') * 100.0 / NULLIF(COUNT(*), 0) as automated_percent,

        -- KPI 10: Backlog Health
        100 - (COUNT(*) FILTER (WHERE status IN ('Open', 'Author Action') AND priority = 'Very High') * 10) -
              (COUNT(*) FILTER (WHERE status IN ('Open', 'Author Action') AND priority = 'High') * 5) as backlog_health_score
      FROM bugs
      WHERE upload_id = $1
        AND ($2::varchar IS NULL OR component = $2)
    )
    SELECT * FROM bug_stats
  `;

  const result = await query(sql, [uploadId, component]);
  return result.rows[0];
}
```

### Component Extraction Logic
```javascript
// Extract component from labels and summary with priority order
extractComponent(bug) {
  const labelsStr = (bug.labels || []).join(' ').toLowerCase();
  const summary = (bug.summary || '').toLowerCase();
  const combined = `${labelsStr} ${summary}`;

  // Priority order: deployment > foss > service-broker > other
  if (combined.includes('deploy')) {
    return 'deployment';
  } else if (combined.includes('foss') || combined.includes('vulnerability')) {
    return 'foss-vulnerabilities';
  } else if (combined.includes('broker')) {
    return 'service-broker';
  } else if (combined.includes('cm-metering')) {
    return 'cm-metering';
  } else if (combined.includes('sdm-metering')) {
    return 'sdm-metering';
  } else {
    return 'other';
  }
}
```

### Date Parsing with Fallbacks
```javascript
// Try multiple date formats from JIRA exports
parseDate(dateString) {
  if (!dateString) return null;

  // Try ISO format: "2025-01-15 10:30:45"
  let date = new Date(dateString.replace(' ', 'T') + 'Z');
  if (!isNaN(date.getTime())) return date;

  // Try standard Date constructor
  date = new Date(dateString);
  if (!isNaN(date.getTime())) return date;

  // Try manual parsing for "DD/MM/YYYY HH:mm" format
  const match = dateString.match(/(\d{2})\/(\d{2})\/(\d{4})\s+(\d{2}):(\d{2})/);
  if (match) {
    const [, day, month, year, hour, minute] = match;
    date = new Date(Date.UTC(year, month - 1, day, hour, minute));
    if (!isNaN(date.getTime())) return date;
  }

  console.warn(`Could not parse date: ${dateString}`);
  return null;
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Calculate KPIs on page load | Pre-calculate and store in DB | 2024+ | Dashboard loads 10x faster, consistent values |
| Row-by-row CSV insert | Batch insert with unnest() | PostgreSQL 9.4+ | 100x faster for large uploads |
| JavaScript median calculation | PostgreSQL PERCENTILE_CONT | PostgreSQL 9.4+ | Simpler code, database-optimized |
| Synchronous file parsing | Stream-based parsing | Node.js 10+ | Handles large files without memory issues |

**Deprecated/outdated:**
- csv-parse v4: Use v5+ with better TypeScript support and streaming
- manual SQL building: Always use parameterized queries to prevent SQL injection
- multer@1.4.2: Use 1.4.5-lts.1 for security fixes

## Open Questions

Things that couldn't be fully resolved:

1. **JIRA Date Format Variations**
   - What we know: JIRA exports vary by instance locale settings
   - What's unclear: All possible date formats in production exports
   - Recommendation: Store original date string in raw_data JSONB, log parse failures for monitoring

2. **Component Categorization Accuracy**
   - What we know: Component extracted from labels/summary with keyword matching
   - What's unclear: How accurate this is vs manual categorization
   - Recommendation: Add manual component override field in future phase, validate with sample data

3. **KPI 9 (Known Issue Recurrence) Implementation**
   - What we know: Spec mentions pattern matching for known issues
   - What's unclear: Pattern definitions not provided in specification
   - Recommendation: Defer to future phase, not in Phase 10 scope (only 10 KPIs, numbered 1-8, 10)

4. **Historical KPI Trends**
   - What we know: Dashboard shows single week at a time
   - What's unclear: How to efficiently query trends across multiple weeks
   - Recommendation: Phase 10 stores data, Phase 12 or v1.3 adds trend queries

## Sources

### Primary (HIGH confidence)
- /c2fo/fast-csv - CSV parsing library documentation, 212 code snippets
- PostgreSQL 14 documentation - PERCENTILE_CONT, STDDEV, aggregate functions
- Existing JiraService.js - Proven multi-tenancy and transaction patterns
- Existing CaptureService.js - Service layer structure and CRUD operations
- KPI_SPECIFICATION.md - Complete formulas and thresholds (user-provided)

### Secondary (MEDIUM confidence)
- Express.js best practices - Route organization, error handling
- Multer documentation - File upload middleware configuration
- P&E Manager CLAUDE.md - Project conventions, database patterns, auth flow

### Tertiary (LOW confidence)
- None - all findings verified with authoritative sources

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - fast-csv verified via Context7, PostgreSQL functions are database native
- Architecture: HIGH - Following proven patterns from JiraService and CaptureService
- Pitfalls: HIGH - Based on common PostgreSQL and CSV parsing issues documented extensively
- KPI calculations: HIGH - Formulas provided in specification, PostgreSQL functions well-documented

**Research date:** 2026-01-27
**Valid until:** 30 days for Node.js libraries (stable ecosystem), 90+ days for PostgreSQL features (highly stable)

**Codebase context:**
- Project uses Express 4.21.2, PostgreSQL with pg library
- Multi-tenancy enforced at service layer (user_id in all queries)
- Transactions pattern established in existing services
- Migration system uses numbered SQL files (019_bug_dashboard.sql next)
- REST API conventions: authMiddleware, GET/POST/DELETE, JSON responses
- Error handling: HTTP status codes with { error, message } format
