# Phase 1: Backend Foundation - Research

**Researched:** 2026-01-21
**Domain:** Express.js REST API + PostgreSQL (Node.js)
**Confidence:** HIGH

## Summary

This phase implements Jira integration backend infrastructure following established patterns in the P&E Manager codebase. The codebase has a mature, consistent architecture with GitHubService as the reference implementation (added in migration 016).

**Key findings:**
- GitHubService provides perfect template: multi-table structure (repos, PRs, issues, commits), UPSERT sync pattern, ON CONFLICT handling
- All existing services follow strict multi-tenancy: every query filters by user_id at service layer
- Migration system is version-tracked and idempotent with file-based SQL execution
- Auth middleware supports JWT validation with development bypass mode via DEV_SKIP_AUTH=true

**Primary recommendation:** Clone GitHubService structure for JiraService - proven pattern for external integrations with batch sync operations.

## Standard Stack

The established libraries/tools for this codebase:

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| express | Latest | Web server | Industry standard REST API framework |
| pg | Latest | PostgreSQL client | Official PostgreSQL driver for Node.js |
| jsonwebtoken | Latest | JWT auth | Standard for token validation |
| dotenv | Latest | Environment vars | Standard config management |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| @sap/xsenv | Latest | SAP BTP config | Production deployment (reads VCAP_SERVICES) |

**Installation:**
```bash
# Already installed in package.json - no new dependencies needed
```

## Architecture Patterns

### Recommended Project Structure
```
server/
├── db/
│   ├── connection.js          # PostgreSQL pool & query helper
│   ├── migrate.js             # Migration runner with version tracking
│   └── 017_jira_integration.sql  # New migration file
├── services/
│   └── JiraService.js         # New: Jira data operations
├── routes/
│   └── jira.js                # New: REST endpoints
├── middleware/
│   └── auth.js                # Existing: JWT validation
└── index.js                   # Mount new routes
```

### Pattern 1: Service Layer with Multi-Tenancy
**What:** All database operations go through service classes that enforce user_id filtering
**When to use:** Every database query (MANDATORY in this codebase)
**Example:**
```javascript
// Source: server/services/GitHubService.js (lines 151-159)
class JiraService {
  async listIssues(userId, filters = {}) {
    const sql = `
      SELECT * FROM jira_issues
      WHERE user_id = $1
      ORDER BY synced_at DESC
    `;
    const result = await query(sql, [userId]);
    return result.rows;
  }
}
```

### Pattern 2: UPSERT Batch Sync with ON CONFLICT
**What:** Idempotent batch synchronization for external data sources
**When to use:** When syncing data from external APIs (Jira, GitHub, etc.)
**Example:**
```javascript
// Source: server/services/GitHubService.js (lines 109-126)
async syncIssues(userId, issuesData) {
  for (const issue of issuesData) {
    await query(`
      INSERT INTO jira_issues (
        user_id, issue_key, summary, status, assignee_name,
        assignee_id, story_points, priority, issue_type,
        sprint_name, epic_key, jira_url, synced_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, CURRENT_TIMESTAMP)
      ON CONFLICT (user_id, issue_key)
      DO UPDATE SET
        summary = $3,
        status = $4,
        assignee_name = $5,
        assignee_id = $6,
        story_points = $7,
        priority = $8,
        issue_type = $9,
        sprint_name = $10,
        epic_key = $11,
        synced_at = CURRENT_TIMESTAMP
    `, [userId, issue.key, issue.summary, ...]);
  }
}
```

### Pattern 3: Express Router with Auth Middleware
**What:** REST routes always apply auth middleware at router level
**When to use:** All API endpoints (except health check)
**Example:**
```javascript
// Source: server/routes/github.js (lines 1-7)
import express from 'express';
import JiraService from '../services/JiraService.js';
import { authMiddleware } from '../middleware/auth.js';

const router = express.Router();
router.use(authMiddleware); // Applied to ALL routes in this file

router.post('/sync', async (req, res) => {
  try {
    const { issues } = req.body;
    const result = await JiraService.syncIssues(req.user.id, issues);
    res.json(result);
  } catch (error) {
    console.error('POST /api/jira-issues/sync error:', error);
    res.status(500).json({ error: error.message });
  }
});
```

### Pattern 4: Migration with Version Tracking
**What:** SQL migrations in separate files, registered in MIGRATIONS array
**When to use:** Every database schema change
**Example:**
```javascript
// Source: server/db/migrate.js (lines 85-89)
// Add to MIGRATIONS array:
{
  version: '017_jira_integration',
  name: 'Create tables for Jira issue tracking and team mappings',
  file: '017_jira_integration.sql'
}
```

### Anti-Patterns to Avoid
- **Direct SQL without user_id filter:** Every query MUST filter by user_id for multi-tenancy
- **String interpolation in SQL:** ALWAYS use parameterized queries ($1, $2, etc.) to prevent SQL injection
- **Modifying existing migrations:** Create new migrations instead of editing executed ones
- **Inline SQL in routes:** Database operations must be in service layer, not route handlers

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Database connection pooling | Custom connection manager | pg Pool from connection.js | Already configured with BTP VCAP_SERVICES, SSL, timeouts |
| JWT token validation | Custom token parsing | authMiddleware from middleware/auth.js | Handles expired tokens, user lookup, development bypass |
| Migration execution | Custom schema versioning | migrate.js runner | Version tracking, idempotent execution, error handling |
| Query logging | Console.log everywhere | query() helper from connection.js | Automatic logging in development with duration tracking |
| CORS configuration | Custom headers | Existing app.options() handler in index.js | Already configured for BTP deployment |

**Key insight:** The codebase has mature patterns - follow them exactly. GitHubService (517 lines) is comprehensive reference for external integrations.

## Common Pitfalls

### Pitfall 1: Multi-Tenancy Bypass
**What goes wrong:** Query returns data across all users
**Why it happens:** Forgot to filter by user_id in WHERE clause
**How to avoid:**
- EVERY service method takes userId as first parameter
- EVERY SQL query includes `WHERE user_id = $1` or `AND user_id = $N`
- Verify each query manually before implementing
**Warning signs:** Getting test data from other users in development

### Pitfall 2: Non-Idempotent Sync
**What goes wrong:** Duplicate records on repeated sync, sync fails on second run
**Why it happens:** Using INSERT without ON CONFLICT handling
**How to avoid:**
- Always use `ON CONFLICT (user_id, unique_key) DO UPDATE SET ...`
- Define UNIQUE constraint on (user_id, issue_key) in table schema
- Test by running sync twice with same data
**Warning signs:** Primary key violation errors, growing row count on re-sync

### Pitfall 3: SQL Injection via String Interpolation
**What goes wrong:** Security vulnerability, potential data breach
**Why it happens:** Using template literals instead of parameterized queries
**How to avoid:**
```javascript
// WRONG - SQL injection vulnerability!
const sql = `SELECT * FROM jira_issues WHERE issue_key = '${issueKey}'`;

// CORRECT - Parameterized query
const sql = 'SELECT * FROM jira_issues WHERE issue_key = $1';
await query(sql, [issueKey]);
```
**Warning signs:** Any ${} inside SQL strings

### Pitfall 4: Missing Foreign Key Constraints
**What goes wrong:** Orphaned records when team member deleted
**Why it happens:** Not defining ON DELETE CASCADE on foreign keys
**How to avoid:**
- `team_member_id UUID REFERENCES team_members(id) ON DELETE CASCADE`
- Document cascade behavior in migration comments
- Test deletion scenarios
**Warning signs:** Constraint violation errors on delete operations

### Pitfall 5: Development vs Production Auth
**What goes wrong:** Auth works in dev but fails in production (or vice versa)
**Why it happens:** Misunderstanding DEV_SKIP_AUTH flag behavior
**How to avoid:**
- Set `DEV_SKIP_AUTH=true` in .env.development only
- Never set DEV_SKIP_AUTH in production environment
- Test with real JWT tokens before deploying
- Auth middleware logs show which mode is active
**Warning signs:** 401 Unauthorized in environments where auth should work

## Code Examples

Verified patterns from official sources:

### Service Method Template
```javascript
// Source: server/services/GitHubService.js (lines 151-159)
class JiraService {
  async listIssues(userId, filters = {}) {
    const sql = `
      SELECT * FROM jira_issues
      WHERE user_id = $1
      ORDER BY synced_at DESC
    `;
    const result = await query(sql, [userId]);
    return result.rows;
  }

  async syncIssues(userId, issuesData) {
    // Returns sync counts for client feedback
    let created = 0;
    let updated = 0;

    for (const issue of issuesData) {
      const result = await query(`
        INSERT INTO jira_issues (...)
        VALUES (...)
        ON CONFLICT (user_id, issue_key)
        DO UPDATE SET ...
        RETURNING (xmax = 0) AS was_insert
      `, [...]);

      if (result.rows[0].was_insert) {
        created++;
      } else {
        updated++;
      }
    }

    return { created, updated, total: issuesData.length };
  }
}

export default new JiraService();
```

### Route Handler Template
```javascript
// Source: server/routes/github.js (lines 100-108)
router.post('/sync', async (req, res) => {
  try {
    const { issues } = req.body;

    if (!issues || !Array.isArray(issues)) {
      return res.status(400).json({ error: 'issues array is required' });
    }

    const result = await JiraService.syncIssues(req.user.id, issues);
    res.json(result);
  } catch (error) {
    console.error('POST /api/jira-issues/sync error:', error);
    res.status(500).json({ error: error.message });
  }
});
```

### Migration SQL Template
```sql
-- Source: server/db/016_github_integration.sql (lines 1-55)
-- Migration: 017_jira_integration
-- Create tables for Jira issue tracking and team mappings

CREATE TABLE IF NOT EXISTS jira_issues (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id VARCHAR(100) NOT NULL,
  issue_key VARCHAR(50) NOT NULL,
  summary TEXT,
  status VARCHAR(50),
  assignee_name VARCHAR(255),
  assignee_id VARCHAR(255),
  story_points NUMERIC(10,2),
  priority VARCHAR(50),
  issue_type VARCHAR(50),
  sprint_name VARCHAR(255),
  epic_key VARCHAR(50),
  jira_url TEXT,
  synced_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, issue_key)
);

CREATE INDEX IF NOT EXISTS idx_jira_issues_user_id ON jira_issues(user_id);
CREATE INDEX IF NOT EXISTS idx_jira_issues_status ON jira_issues(status);
CREATE INDEX IF NOT EXISTS idx_jira_issues_assignee_id ON jira_issues(assignee_id);

-- Auto-update trigger
DROP TRIGGER IF EXISTS update_jira_issues_updated_date ON jira_issues;
CREATE TRIGGER update_jira_issues_updated_date BEFORE UPDATE ON jira_issues
  FOR EACH ROW EXECUTE FUNCTION update_updated_date_column();
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| localStorage | PostgreSQL | Phase 1-4 (2025) | Multi-user support, deployed to BTP |
| SAP XSUAA | JWT with dev bypass | Phase 4 | Development workflow simplified |
| Manual SQL | Service layer | Initial architecture | Enforces multi-tenancy |

**Deprecated/outdated:**
- localStorage client (src/api/localClient.js): Kept for backward compatibility but not used in production

## Open Questions

None - codebase patterns are well-established and documented.

## Sources

### Primary (HIGH confidence)
- server/services/GitHubService.js - Complete reference implementation (540 lines)
- server/routes/github.js - REST endpoint patterns (162 lines)
- server/db/migrate.js - Migration system (182 lines)
- server/db/016_github_integration.sql - Recent migration example (140 lines)
- server/middleware/auth.js - Authentication patterns (142 lines)
- server/db/connection.js - Database connection and query helper (138 lines)
- server/services/TaskService.js - Service layer patterns (150 lines checked)
- CLAUDE.md - Project architecture documentation

### Secondary (MEDIUM confidence)
- None needed - all patterns verified from source code

### Tertiary (LOW confidence)
- None

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - All dependencies already installed, no new packages needed
- Architecture: HIGH - 16 existing migrations and 11 service classes follow identical patterns
- Pitfalls: HIGH - Common errors documented in codebase comments and CLAUDE.md

**Research date:** 2026-01-21
**Valid until:** 2026-02-21 (30 days - stable codebase patterns)
