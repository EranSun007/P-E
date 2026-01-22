# Phase 6: Backend Foundation - Research

**Researched:** 2026-01-22
**Domain:** PostgreSQL schema design, Express.js REST API, multi-tenant data access
**Confidence:** HIGH

## Summary

Phase 6 establishes the backend foundation for the v1.1 Web Capture Framework. This involves creating three new database tables (`capture_rules`, `capture_inbox`, `entity_mappings`), a single service class (`CaptureService`), and REST API routes following the existing patterns established in v1.0.

The existing codebase provides clear patterns to follow from the Jira integration (v1.0), particularly `017_jira_integration.sql`, `JiraService.js`, and `server/routes/jira.js`. The new tables will use JSONB for flexible rule storage and follow the established multi-tenancy pattern via `user_id` filtering.

**Primary recommendation:** Create a single `CaptureService.js` that manages all three tables (rules, inbox, mappings), following the JiraService pattern but with inbox-specific accept/reject workflows.

## Standard Stack

The established libraries/tools for this domain:

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| pg | 8.x | PostgreSQL client | Already in use, connection pool configured |
| express | 4.x | REST API framework | Already in use, route patterns established |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| uuid-ossp | - | PostgreSQL extension | UUID primary keys (already enabled) |
| JSONB | - | PostgreSQL native | Flexible schema for selectors/metadata |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| JSONB | Separate tables | JSONB simpler for rule config, no joins needed |
| Single service | Multiple services | Single service keeps related logic together |

**Installation:**
No new packages required - uses existing pg and express.

## Architecture Patterns

### Recommended Project Structure
```
server/
├── db/
│   └── 018_capture_framework.sql  # Migration for all 3 tables
├── services/
│   └── CaptureService.js          # Single service for rules, inbox, mappings
└── routes/
    ├── captureRules.js            # /api/capture-rules routes
    ├── captureInbox.js            # /api/capture-inbox routes
    └── entityMappings.js          # /api/entity-mappings routes
```

### Pattern 1: JSONB for Rule Configuration
**What:** Store selectors, field mappings, and rule metadata as JSONB
**When to use:** When schema needs flexibility without migrations
**Example:**
```sql
-- Source: Existing pattern from tasks.metadata JSONB
CREATE TABLE capture_rules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id VARCHAR(255) NOT NULL,
  name VARCHAR(255) NOT NULL,
  url_pattern VARCHAR(1024) NOT NULL,
  enabled BOOLEAN DEFAULT true,
  selectors JSONB NOT NULL,  -- Array of {selector, field_name, type}
  metadata JSONB DEFAULT '{}',
  created_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Pattern 2: Inbox Status Workflow
**What:** Staged items with status transitions (pending -> accepted/rejected)
**When to use:** Review workflows where data must be validated before use
**Example:**
```sql
CREATE TABLE capture_inbox (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id VARCHAR(255) NOT NULL,
  rule_id UUID REFERENCES capture_rules(id) ON DELETE SET NULL,
  source_url VARCHAR(2048) NOT NULL,
  status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
  captured_data JSONB NOT NULL,  -- Raw extracted data
  processed_at TIMESTAMP,
  created_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Pattern 3: Generic Entity Mappings
**What:** Source identifier -> target entity mappings that work across entity types
**When to use:** When the same source can map to different P&E entity types
**Example:**
```sql
CREATE TABLE entity_mappings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id VARCHAR(255) NOT NULL,
  source_identifier VARCHAR(512) NOT NULL,  -- e.g., "jenkins:job:my-app"
  target_entity_type VARCHAR(100) NOT NULL,  -- 'project', 'team_member', 'task', etc.
  target_entity_id UUID NOT NULL,
  auto_apply BOOLEAN DEFAULT true,  -- Apply to future captures automatically
  created_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, source_identifier)
);
```

### Anti-Patterns to Avoid
- **Separate migrations per table:** Use single migration for all 3 tables - they're logically related
- **Nullable user_id:** Always enforce multi-tenancy, never allow NULL user_id
- **Entity-specific mapping tables:** Use generic entity_mappings, not jira_mappings, grafana_mappings, etc.
- **Storing processed data in inbox:** Inbox only stores raw captured_data, processing happens on accept

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| UUID generation | Custom ID generation | uuid_generate_v4() | Already enabled, consistent with codebase |
| Updated timestamps | Manual setting in service | Database trigger | update_updated_date_column() already exists |
| Parameterized queries | String concatenation | $1, $2 placeholders | Prevents SQL injection |

**Key insight:** The codebase already has all infrastructure patterns - triggers, indexes, connection pooling. Phase 6 just applies them to new tables.

## Common Pitfalls

### Pitfall 1: Forgetting Multi-Tenancy Filter
**What goes wrong:** Queries return or modify other users' data
**Why it happens:** Missing user_id WHERE clause
**How to avoid:** Every SQL query MUST include `WHERE user_id = $1`
**Warning signs:** Tests pass in single-user mode but fail with multiple users

### Pitfall 2: JSONB Type Coercion
**What goes wrong:** JSONB arrays passed as strings, causing parse errors
**Why it happens:** JavaScript objects not properly serialized
**How to avoid:** Always pass JavaScript objects/arrays directly to pg, let driver handle serialization
**Warning signs:** Error "invalid input syntax for type json"

### Pitfall 3: Accept Workflow Missing Mapping Creation
**What goes wrong:** Items accepted but no mapping created for future captures
**Why it happens:** Accept logic only updates status, doesn't create entity_mapping
**How to avoid:** Accept endpoint must: 1) Update inbox status, 2) Create entity_mapping if requested
**Warning signs:** Same source captured repeatedly, never auto-applies

### Pitfall 4: Route Order Conflicts
**What goes wrong:** `/api/capture-inbox/:id/accept` conflicts with `/api/capture-inbox/:id`
**Why it happens:** Express matches first route that fits
**How to avoid:** Define specific routes (like `/accept`) BEFORE generic `:id` routes
**Warning signs:** 404 errors or wrong handler executing

## Code Examples

Verified patterns from the existing codebase:

### Service Method Pattern (from JiraService.js)
```javascript
// Source: /Users/i306072/Documents/GitHub/P-E/server/services/JiraService.js
async listRules(userId, filters = {}) {
  let sql = `
    SELECT * FROM capture_rules
    WHERE user_id = $1
  `;
  const params = [userId];
  let paramIndex = 2;

  if (filters.enabled !== undefined) {
    sql += ` AND enabled = $${paramIndex}`;
    params.push(filters.enabled);
    paramIndex++;
  }

  sql += ' ORDER BY name ASC';
  const result = await query(sql, params);
  return result.rows;
}
```

### Upsert Pattern for Mappings (from JiraService.js)
```javascript
// Source: /Users/i306072/Documents/GitHub/P-E/server/services/JiraService.js
async createOrUpdateMapping(userId, sourceIdentifier, targetEntityType, targetEntityId) {
  const sql = `
    INSERT INTO entity_mappings (user_id, source_identifier, target_entity_type, target_entity_id)
    VALUES ($1, $2, $3, $4)
    ON CONFLICT (user_id, source_identifier)
    DO UPDATE SET
      target_entity_type = EXCLUDED.target_entity_type,
      target_entity_id = EXCLUDED.target_entity_id,
      updated_date = CURRENT_TIMESTAMP
    RETURNING *
  `;
  const result = await query(sql, [userId, sourceIdentifier, targetEntityType, targetEntityId]);
  return result.rows[0];
}
```

### Route Pattern with Auth (from jira.js)
```javascript
// Source: /Users/i306072/Documents/GitHub/P-E/server/routes/jira.js
import express from 'express';
import CaptureService from '../services/CaptureService.js';
import { authMiddleware } from '../middleware/auth.js';

const router = express.Router();
router.use(authMiddleware);

// GET /api/capture-rules
router.get('/', async (req, res) => {
  try {
    const { enabled } = req.query;
    const filters = {};
    if (enabled !== undefined) filters.enabled = enabled === 'true';

    const rules = await CaptureService.listRules(req.user.id, filters);
    res.json(rules);
  } catch (error) {
    console.error('GET /api/capture-rules error:', error);
    res.status(500).json({ error: 'Internal Server Error', message: error.message });
  }
});
```

### Accept Inbox Item Pattern (new for v1.1)
```javascript
// Accept item with optional entity mapping
router.post('/:id/accept', async (req, res) => {
  try {
    const { target_entity_type, target_entity_id, create_mapping } = req.body;

    const item = await CaptureService.acceptInboxItem(
      req.user.id,
      req.params.id,
      { target_entity_type, target_entity_id, create_mapping }
    );

    if (!item) {
      return res.status(404).json({ error: 'Not Found', message: 'Inbox item not found' });
    }

    res.json(item);
  } catch (error) {
    console.error(`POST /api/capture-inbox/${req.params.id}/accept error:`, error);
    res.status(500).json({ error: 'Internal Server Error', message: error.message });
  }
});
```

## Database Schema Design

### Table 1: capture_rules
```sql
CREATE TABLE IF NOT EXISTS capture_rules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id VARCHAR(255) NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  url_pattern VARCHAR(1024) NOT NULL,  -- e.g., "*.jenkins.sap/*", "grafana.internal.com/d/*"
  enabled BOOLEAN DEFAULT true,
  selectors JSONB NOT NULL DEFAULT '[]',  -- Array of selector configs
  metadata JSONB DEFAULT '{}',  -- Extension-specific settings
  created_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_capture_rules_user_id ON capture_rules(user_id);
CREATE INDEX IF NOT EXISTS idx_capture_rules_enabled ON capture_rules(enabled);
```

**Selectors JSONB Structure:**
```json
[
  {
    "field_name": "build_status",
    "selector": ".build-status-badge",
    "type": "text",
    "required": true
  },
  {
    "field_name": "job_name",
    "selector": "h1.job-name",
    "type": "text",
    "required": true
  },
  {
    "field_name": "last_run",
    "selector": ".last-run-time",
    "type": "text",
    "required": false
  }
]
```

### Table 2: capture_inbox
```sql
CREATE TABLE IF NOT EXISTS capture_inbox (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id VARCHAR(255) NOT NULL,
  rule_id UUID REFERENCES capture_rules(id) ON DELETE SET NULL,
  rule_name VARCHAR(255),  -- Denormalized for display after rule deletion
  source_url VARCHAR(2048) NOT NULL,
  source_identifier VARCHAR(512),  -- For matching entity mappings (e.g., "jenkins:job:my-app")
  status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
  captured_data JSONB NOT NULL,  -- Raw extracted data
  target_entity_type VARCHAR(100),  -- Set on accept
  target_entity_id UUID,  -- Set on accept
  processed_at TIMESTAMP,  -- Set on accept/reject
  created_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_capture_inbox_user_id ON capture_inbox(user_id);
CREATE INDEX IF NOT EXISTS idx_capture_inbox_status ON capture_inbox(status);
CREATE INDEX IF NOT EXISTS idx_capture_inbox_rule_id ON capture_inbox(rule_id);
CREATE INDEX IF NOT EXISTS idx_capture_inbox_created_date ON capture_inbox(created_date);
```

**Captured Data JSONB Structure:**
```json
{
  "build_status": "SUCCESS",
  "job_name": "my-app-build",
  "last_run": "2026-01-22 10:30:00",
  "_extracted_at": "2026-01-22T10:45:00Z",
  "_page_title": "Jenkins - my-app-build"
}
```

### Table 3: entity_mappings
```sql
CREATE TABLE IF NOT EXISTS entity_mappings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id VARCHAR(255) NOT NULL,
  source_identifier VARCHAR(512) NOT NULL,  -- Unique key for matching
  source_type VARCHAR(100),  -- e.g., "jenkins", "grafana", "concourse"
  source_display_name VARCHAR(255),  -- Human-readable label
  target_entity_type VARCHAR(100) NOT NULL,  -- 'project', 'team_member', 'task'
  target_entity_id UUID NOT NULL,
  auto_apply BOOLEAN DEFAULT true,  -- Auto-apply to future captures
  created_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, source_identifier)
);

CREATE INDEX IF NOT EXISTS idx_entity_mappings_user_id ON entity_mappings(user_id);
CREATE INDEX IF NOT EXISTS idx_entity_mappings_source_identifier ON entity_mappings(source_identifier);
CREATE INDEX IF NOT EXISTS idx_entity_mappings_target ON entity_mappings(target_entity_type, target_entity_id);
```

## Service Methods Needed

### CaptureService.js

**Rule Management:**
| Method | Purpose | Parameters |
|--------|---------|------------|
| `listRules(userId, filters)` | List all capture rules | filters: {enabled} |
| `getRule(userId, ruleId)` | Get single rule by ID | - |
| `createRule(userId, ruleData)` | Create new rule | name, url_pattern, selectors, enabled |
| `updateRule(userId, ruleId, updates)` | Update existing rule | Partial rule data |
| `deleteRule(userId, ruleId)` | Delete rule | - |

**Inbox Management:**
| Method | Purpose | Parameters |
|--------|---------|------------|
| `listInboxItems(userId, filters)` | List inbox items | filters: {status, rule_id} |
| `getInboxItem(userId, itemId)` | Get single item | - |
| `createInboxItem(userId, itemData)` | Receive captured data | rule_id, source_url, captured_data |
| `acceptInboxItem(userId, itemId, mapping)` | Accept with mapping | target_entity_type, target_entity_id, create_mapping |
| `rejectInboxItem(userId, itemId)` | Reject item | - |
| `bulkAccept(userId, itemIds, mapping)` | Bulk accept | Same as accept |
| `bulkReject(userId, itemIds)` | Bulk reject | - |

**Mapping Management:**
| Method | Purpose | Parameters |
|--------|---------|------------|
| `listMappings(userId, filters)` | List all mappings | filters: {source_type, target_entity_type} |
| `getMapping(userId, mappingId)` | Get single mapping | - |
| `getMappingBySource(userId, sourceId)` | Find mapping for source | For auto-apply |
| `createOrUpdateMapping(userId, data)` | Upsert mapping | source_identifier, target_entity_type, target_entity_id |
| `deleteMapping(userId, mappingId)` | Delete mapping | - |

## API Routes Structure

### /api/capture-rules (captureRules.js)
```
GET    /                  # List rules (filter: enabled)
GET    /:id               # Get single rule
POST   /                  # Create rule
PUT    /:id               # Update rule
DELETE /:id               # Delete rule
```

### /api/capture-inbox (captureInbox.js)
```
GET    /                  # List inbox items (filter: status, rule_id)
GET    /:id               # Get single item with full data
POST   /                  # Create inbox item (from extension)
POST   /:id/accept        # Accept item with mapping
POST   /:id/reject        # Reject item
POST   /bulk-accept       # Bulk accept
POST   /bulk-reject       # Bulk reject
```

### /api/entity-mappings (entityMappings.js)
```
GET    /                  # List mappings (filter: source_type, target_entity_type)
GET    /:id               # Get single mapping
POST   /                  # Create or update mapping (upsert)
DELETE /:id               # Delete mapping
GET    /lookup/:source    # Find mapping by source_identifier (for extension auto-apply)
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Jira-specific tables | Generic capture tables | v1.1 | Any site can be captured |
| Direct sync to main tables | Inbox staging workflow | v1.1 | User validates before data enters system |
| Hardcoded URL matching | Configurable rules | v1.1 | No code changes to add new sites |

**Deprecated/outdated:**
- jira_issues table: Still exists, but new captures should use capture_inbox
- jira_team_mappings: Replaced by generic entity_mappings

## Open Questions

Things that couldn't be fully resolved:

1. **Source Identifier Format**
   - What we know: Need unique identifier to match captures to mappings
   - What's unclear: Exact format (e.g., "jenkins:job:my-app" vs "my-app@jenkins")
   - Recommendation: Use "{source_type}:{identifier}" format, let rules define identifier extraction

2. **Mapping to Multiple Entities**
   - What we know: One source can potentially relate to multiple entities (project AND team member)
   - What's unclear: Should mapping support 1:N or just 1:1?
   - Recommendation: Start with 1:1 (simplest), revisit if needed in v1.2

3. **Inbox Item Expiration**
   - What we know: Old pending items could pile up
   - What's unclear: Should items auto-expire after N days?
   - Recommendation: Add `expires_at` column but don't implement auto-cleanup in v1.1

## Sources

### Primary (HIGH confidence)
- /Users/i306072/Documents/GitHub/P-E/server/db/017_jira_integration.sql - Table pattern
- /Users/i306072/Documents/GitHub/P-E/server/services/JiraService.js - Service pattern
- /Users/i306072/Documents/GitHub/P-E/server/routes/jira.js - Route pattern
- /Users/i306072/Documents/GitHub/P-E/server/db/schema.sql - Base schema with triggers
- /Users/i306072/Documents/GitHub/P-E/server/db/migrate.js - Migration registration

### Secondary (MEDIUM confidence)
- /Users/i306072/Documents/GitHub/P-E/.planning/REQUIREMENTS.md - Requirements reference
- /Users/i306072/Documents/GitHub/P-E/.planning/ROADMAP.md - Phase context

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Using existing pg/express, no new libraries
- Architecture: HIGH - Following established patterns exactly
- Pitfalls: HIGH - Based on real issues seen in JiraService
- Schema design: HIGH - Follows existing table patterns
- Service methods: HIGH - Mirrors JiraService structure

**Research date:** 2026-01-22
**Valid until:** 2026-02-22 (stable patterns, unlikely to change)
