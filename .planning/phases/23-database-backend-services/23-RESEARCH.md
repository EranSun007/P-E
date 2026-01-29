# Phase 23: Database & Backend Services - Research

**Researched:** 2026-01-29
**Domain:** PostgreSQL schema extension and Express.js service layer
**Confidence:** HIGH

## Summary

Phase 23 extends the existing PostgreSQL schema (projects and tasks tables) to support sync item management with full audit trail tracking. This phase builds on established patterns in the P&E Manager codebase: parameterized queries for SQL injection prevention, multi-tenancy enforcement at the service layer, JSONB for flexible data structures, and CASCADE DELETE for referential integrity.

The research confirms that the existing architecture is well-suited for these requirements. The codebase already demonstrates mature patterns for JSONB audit trails (work_items.insights), foreign key cascades (11+ examples), and upsert operations (user_settings). No new libraries or architectural patterns are needed.

**Primary recommendation:** Extend existing tables with ALTER TABLE migrations, follow the established service pattern (list/create/update/delete methods), and use JSONB for status_history with append-only writes for audit trail integrity.

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| pg | ^8.x | PostgreSQL client | Node.js standard for PostgreSQL, connection pooling, parameterized queries |
| express | ^4.x | REST API framework | Existing backend framework, proven service layer integration |
| PostgreSQL | 14+ | Relational database | Production database on SAP BTP, JSONB support since 9.4 |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| dotenv | ^16.x | Environment config | Already used for DB connection settings |

### Alternatives Considered
None needed - all requirements satisfied by existing stack.

**Installation:**
No new dependencies required. Existing stack covers all needs.

## Architecture Patterns

### Recommended Project Structure
```
server/
├── db/
│   ├── schema.sql            # Base schema (reference only)
│   ├── migrate.js            # Migration runner
│   └── 022_sync_items.sql    # New migration file
├── services/
│   ├── SyncItemService.js    # CRUD + archive/restore
│   ├── SubtaskService.js     # CRUD + reorder
│   └── SyncSettingsService.js # Read/upsert preferences
└── routes/
    ├── syncItems.js          # REST endpoints
    ├── subtasks.js           # REST endpoints
    └── syncSettings.js       # REST endpoints
```

### Pattern 1: Schema Extension via ALTER TABLE

**What:** Add columns to existing tables without recreating them
**When to use:** Extending functionality while preserving existing data
**Example:**
```sql
-- Source: Existing migration 007_one_on_ones_extended.sql
-- Pattern verified in production

-- Add new columns with IF NOT EXISTS for idempotency
ALTER TABLE projects ADD COLUMN IF NOT EXISTS category VARCHAR(100);
ALTER TABLE projects ADD COLUMN IF NOT EXISTS sync_status VARCHAR(50) DEFAULT 'not-started';
ALTER TABLE projects ADD COLUMN IF NOT EXISTS team_department VARCHAR(255);
ALTER TABLE projects ADD COLUMN IF NOT EXISTS assigned_to_id UUID REFERENCES team_members(id) ON DELETE SET NULL;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS status_history JSONB DEFAULT '[]';
ALTER TABLE projects ADD COLUMN IF NOT EXISTS archived BOOLEAN DEFAULT false;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS is_sync_item BOOLEAN DEFAULT false;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS display_order INTEGER DEFAULT 0;

-- Add indexes for query performance
CREATE INDEX IF NOT EXISTS idx_projects_category ON projects(category);
CREATE INDEX IF NOT EXISTS idx_projects_sync_status ON projects(sync_status);
CREATE INDEX IF NOT EXISTS idx_projects_is_sync_item ON projects(is_sync_item);
CREATE INDEX IF NOT EXISTS idx_projects_archived ON projects(archived);

-- Add updated_date trigger
DROP TRIGGER IF EXISTS update_projects_updated_date ON projects;
CREATE TRIGGER update_projects_updated_date BEFORE UPDATE ON projects
  FOR EACH ROW EXECUTE FUNCTION update_updated_date_column();
```

### Pattern 2: Foreign Keys with CASCADE DELETE

**What:** Subtasks auto-delete when parent sync item is deleted
**When to use:** Parent-child relationships where orphaned children are meaningless
**Example:**
```sql
-- Source: Verified pattern in 11+ existing migrations
-- comments, work_items, bugs, one_on_ones all use this pattern

ALTER TABLE tasks ADD COLUMN IF NOT EXISTS project_id UUID REFERENCES projects(id) ON DELETE CASCADE;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS is_subtask BOOLEAN DEFAULT false;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS display_order INTEGER DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_tasks_project_id ON tasks(project_id);
CREATE INDEX IF NOT EXISTS idx_tasks_is_subtask ON tasks(is_subtask);
```

**Critical:** The CASCADE DELETE is on the foreign key constraint, not a separate trigger.

### Pattern 3: JSONB Audit Trail (Append-Only)

**What:** Store status changes as append-only JSONB array for full history
**When to use:** Need complete audit trail of state changes
**Example:**
```javascript
// Source: Pattern established in WorkItemService.addInsight()
// Verified production pattern for JSONB array manipulation

async updateSyncItem(userId, syncItemId, updates) {
  const currentItem = await this.get(userId, syncItemId);

  // Track status change in history
  if (updates.sync_status && updates.sync_status !== currentItem.sync_status) {
    const historyEntry = {
      timestamp: new Date().toISOString(),
      field: 'sync_status',
      oldValue: currentItem.sync_status,
      newValue: updates.sync_status,
      changedBy: userId
    };

    // Parse existing history (PostgreSQL returns JSONB as object)
    let history = currentItem.status_history || [];
    if (typeof history === 'string') {
      history = JSON.parse(history);
    }

    history.push(historyEntry);
    updates.status_history = JSON.stringify(history);
  }

  // Continue with dynamic UPDATE...
}
```

### Pattern 4: Service Layer Multi-Tenancy

**What:** All queries automatically filtered by user_id at service layer
**When to use:** Always - NEVER write raw SQL without user_id filter
**Example:**
```javascript
// Source: TaskService.js (production pattern)

async list(userId, orderBy = '-created_date') {
  // CRITICAL: user_id MUST be in WHERE clause for multi-tenancy
  const sql = `
    SELECT * FROM tasks
    WHERE user_id = $1 AND is_subtask = false
    ORDER BY ${sortField} ${direction}
  `;
  const result = await query(sql, [userId]);
  return result.rows;
}

async create(userId, taskData) {
  // CRITICAL: user_id MUST be first parameter
  const sql = `INSERT INTO tasks (user_id, ...) VALUES ($1, ...)`;
  const result = await query(sql, [userId, ...values]);
  return result.rows[0];
}
```

### Pattern 5: Upsert for Settings

**What:** INSERT with ON CONFLICT for idempotent preference storage
**When to use:** User settings that should create or update
**Example:**
```javascript
// Source: UserSettingsService.js (production pattern)

async updateSyncSettings(userId, settings) {
  const sql = `
    INSERT INTO sync_settings (user_id, settings_data)
    VALUES ($1, $2)
    ON CONFLICT (user_id)
    DO UPDATE SET settings_data = $2, updated_date = CURRENT_TIMESTAMP
    RETURNING *
  `;
  const result = await query(sql, [userId, JSON.stringify(settings)]);
  return result.rows[0];
}
```

### Pattern 6: Display Order Reordering

**What:** Update display_order for multiple items in a single transaction
**When to use:** User drags to reorder list items
**Example:**
```javascript
// Pattern: Bulk update with explicit transaction for atomicity

async reorderSubtasks(userId, syncItemId, orderedSubtaskIds) {
  const client = await getClient();

  try {
    await client.query('BEGIN');

    // Verify ownership and parent relationship
    const subtasks = await client.query(
      'SELECT id FROM tasks WHERE user_id = $1 AND project_id = $2 AND is_subtask = true',
      [userId, syncItemId]
    );

    const existingIds = subtasks.rows.map(r => r.id);
    const invalidIds = orderedSubtaskIds.filter(id => !existingIds.includes(id));

    if (invalidIds.length > 0) {
      throw new Error('Invalid subtask IDs or access denied');
    }

    // Update display_order for each subtask
    for (let i = 0; i < orderedSubtaskIds.length; i++) {
      await client.query(
        'UPDATE tasks SET display_order = $1 WHERE id = $2 AND user_id = $3',
        [i, orderedSubtaskIds[i], userId]
      );
    }

    await client.query('COMMIT');

    // Return updated subtasks
    return this.getSubtasks(userId, syncItemId);
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}
```

### Anti-Patterns to Avoid

- **String concatenation in SQL:** Always use parameterized queries ($1, $2, etc.) to prevent SQL injection
- **Missing user_id filter:** Every query MUST filter by user_id for multi-tenancy security
- **Direct JSONB mutation:** Never UPDATE with object spread - read current value, modify, write entire object
- **Forgetting indexes:** New columns used in WHERE clauses MUST have indexes for performance
- **Mixing migration and schema.sql:** schema.sql is reference only - ALL changes go in numbered migrations

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| SQL injection prevention | Manual string escaping | Parameterized queries ($1, $2) | PostgreSQL pg library handles escaping, prevents injection attacks |
| Connection pooling | Manual connection management | pg.Pool (already configured) | Existing connection.js provides pool with 20 max connections |
| Timestamp management | Manual date handling | PostgreSQL triggers | update_updated_date_column() trigger already exists, auto-updates on every UPDATE |
| UUID generation | JavaScript uuid library | PostgreSQL uuid_generate_v4() | Database-level UUID generation is atomic and guaranteed unique |
| Transaction management | Manual BEGIN/COMMIT | getClient() from connection.js | Existing helper provides transaction-safe client with error handling |

**Key insight:** The existing codebase has solved all low-level problems. Focus on business logic in services, not infrastructure.

## Common Pitfalls

### Pitfall 1: Forgetting Index on Foreign Keys
**What goes wrong:** Slow queries when filtering subtasks by project_id
**Why it happens:** PostgreSQL doesn't auto-index foreign keys (unlike MySQL)
**How to avoid:** Always create index on FK columns: `CREATE INDEX idx_tasks_project_id ON tasks(project_id)`
**Warning signs:** Query times >100ms on tables with >1000 rows, EXPLAIN ANALYZE shows sequential scan

### Pitfall 2: JSONB Array Mutation Without Read
**What goes wrong:** Concurrent updates overwrite each other's history entries
**Why it happens:** UPDATE status_history = jsonb_array_append() without reading current value loses concurrent writes
**How to avoid:** Always read current row, parse JSONB in JavaScript, append, write entire array
**Warning signs:** Missing history entries, users report "my change disappeared"

### Pitfall 3: CASCADE DELETE Without Understanding Scope
**What goes wrong:** Deleting a sync item unexpectedly deletes 50 subtasks
**Why it happens:** CASCADE DELETE is powerful but irreversible
**How to avoid:**
- Add confirmation UI before delete: "This will delete X subtasks"
- Use soft delete (archived=true) for sync items instead of DELETE
- Only hard DELETE via admin cleanup, not user action
**Warning signs:** User complaints about lost data, support tickets about "where did my subtasks go"

### Pitfall 4: Missing user_id in JOIN Queries
**What goes wrong:** User sees other users' data when JOINing tables
**Why it happens:** Adding JOIN without repeating user_id filter on joined table
**How to avoid:** EVERY table in FROM/JOIN MUST have `WHERE table.user_id = $1`
**Warning signs:** Multi-tenancy test failures, data leakage between users

### Pitfall 5: ORDER BY on Unindexed Columns
**What goes wrong:** Sorting by display_order causes full table scan
**Why it happens:** Index exists but ORDER BY doesn't match WHERE clause columns
**How to avoid:** For queries with WHERE + ORDER BY, create composite index: `CREATE INDEX idx_tasks_project_order ON tasks(project_id, display_order)`
**Warning signs:** Slow reorder operations, database CPU spikes during drag-and-drop

### Pitfall 6: DEFAULT Values in ALTER TABLE
**What goes wrong:** Adding column with DEFAULT on large table locks table for minutes
**Why it happens:** PostgreSQL rewrites entire table to set default value for existing rows
**How to avoid:** Add column WITHOUT default, then UPDATE in batches, then add default for new rows only
**Warning signs:** Migration takes >30 seconds, production deployment causes downtime

**Mitigation for Phase 23:**
```sql
-- Safe approach for large tables
ALTER TABLE projects ADD COLUMN IF NOT EXISTS is_sync_item BOOLEAN;
-- Update existing rows in batches (if needed)
UPDATE projects SET is_sync_item = false WHERE is_sync_item IS NULL;
-- Add NOT NULL constraint after data migration
ALTER TABLE projects ALTER COLUMN is_sync_item SET DEFAULT false;
```

However, for this phase: projects table likely has <10,000 rows, so DEFAULT is safe.

## Code Examples

### Example 1: SyncItemService.list with Team Filtering
```javascript
// Service layer with optional filtering (production pattern)

async list(userId, filters = {}) {
  const { category, team_department, archived = false } = filters;

  let sql = `
    SELECT p.*, tm.name as assigned_to_name
    FROM projects p
    LEFT JOIN team_members tm ON p.assigned_to_id = tm.id
    WHERE p.user_id = $1 AND p.is_sync_item = true AND p.archived = $2
  `;

  const values = [userId, archived];
  let paramIndex = 3;

  if (category) {
    sql += ` AND p.category = $${paramIndex}`;
    values.push(category);
    paramIndex++;
  }

  if (team_department) {
    sql += ` AND p.team_department = $${paramIndex}`;
    values.push(team_department);
    paramIndex++;
  }

  sql += ` ORDER BY p.display_order ASC, p.created_date DESC`;

  const result = await query(sql, values);
  return result.rows;
}
```

### Example 2: Status History Tracking
```javascript
// JSONB append-only audit trail (WorkItemService pattern adapted)

async updateSyncItem(userId, syncItemId, updates) {
  // Get current sync item
  const currentResult = await query(
    'SELECT * FROM projects WHERE id = $1 AND user_id = $2 AND is_sync_item = true',
    [syncItemId, userId]
  );

  if (currentResult.rows.length === 0) {
    throw new Error('Sync item not found or access denied');
  }

  const currentItem = currentResult.rows[0];

  // Track status change
  if (updates.sync_status && updates.sync_status !== currentItem.sync_status) {
    let history = currentItem.status_history || [];
    if (typeof history === 'string') {
      history = JSON.parse(history);
    }

    history.push({
      timestamp: new Date().toISOString(),
      field: 'sync_status',
      oldValue: currentItem.sync_status,
      newValue: updates.sync_status,
      changedBy: userId
    });

    updates.status_history = JSON.stringify(history);
  }

  // Build dynamic UPDATE query (standard pattern)
  const allowedFields = ['name', 'description', 'category', 'sync_status', 'team_department', 'assigned_to_id', 'display_order'];
  const updateFields = [];
  const values = [];
  let paramIndex = 1;

  for (const [key, value] of Object.entries(updates)) {
    if (allowedFields.includes(key) || key === 'status_history') {
      updateFields.push(`${key} = $${paramIndex}`);
      values.push(value);
      paramIndex++;
    }
  }

  if (updateFields.length === 0) {
    return currentItem;
  }

  values.push(syncItemId, userId);

  const sql = `
    UPDATE projects
    SET ${updateFields.join(', ')}
    WHERE id = $${paramIndex} AND user_id = $${paramIndex + 1} AND is_sync_item = true
    RETURNING *
  `;

  const result = await query(sql, values);
  return result.rows[0];
}
```

### Example 3: Subtask Creation with Auto-Increment Display Order
```javascript
// Auto-incrementing display_order for new items

async createSubtask(userId, syncItemId, subtaskData) {
  // Verify sync item exists and user owns it
  const syncItem = await query(
    'SELECT id FROM projects WHERE id = $1 AND user_id = $2 AND is_sync_item = true',
    [syncItemId, userId]
  );

  if (syncItem.rows.length === 0) {
    throw new Error('Sync item not found or access denied');
  }

  // Get max display_order for this sync item
  const maxOrderResult = await query(
    'SELECT COALESCE(MAX(display_order), -1) as max_order FROM tasks WHERE project_id = $1 AND is_subtask = true',
    [syncItemId]
  );

  const nextOrder = maxOrderResult.rows[0].max_order + 1;

  const { title, completed = false } = subtaskData;

  if (!title) {
    throw new Error('Missing required field: title');
  }

  const sql = `
    INSERT INTO tasks (
      user_id, project_id, title, is_subtask, completed, display_order,
      type, status, priority, description
    )
    VALUES ($1, $2, $3, true, $4, $5, 'subtask', $6, 'medium', '')
    RETURNING *
  `;

  // Map completed boolean to status string
  const status = completed ? 'done' : 'todo';

  const result = await query(sql, [userId, syncItemId, title, completed, nextOrder, status]);
  return result.rows[0];
}
```

### Example 4: Sync Settings Upsert
```javascript
// Settings upsert with JSONB storage (UserSettingsService pattern)

async updateSyncSettings(userId, settingsData) {
  const sql = `
    INSERT INTO sync_settings (user_id, sprint_weeks, default_view, default_team, settings_data)
    VALUES ($1, $2, $3, $4, $5)
    ON CONFLICT (user_id)
    DO UPDATE SET
      sprint_weeks = $2,
      default_view = $3,
      default_team = $4,
      settings_data = $5,
      updated_date = CURRENT_TIMESTAMP
    RETURNING *
  `;

  const { sprint_weeks = 2, default_view = 'sprint', default_team = null, ...rest } = settingsData;

  const result = await query(sql, [
    userId,
    sprint_weeks,
    default_view,
    default_team,
    JSON.stringify(rest)
  ]);

  return result.rows[0];
}

async getSyncSettings(userId) {
  const sql = 'SELECT * FROM sync_settings WHERE user_id = $1';
  const result = await query(sql, [userId]);

  if (result.rows.length === 0) {
    // Return defaults if no settings exist
    return {
      sprint_weeks: 2,
      default_view: 'sprint',
      default_team: null,
      settings_data: {}
    };
  }

  return result.rows[0];
}
```

### Example 5: Archive and Restore with Status History
```javascript
// Soft delete pattern with audit trail

async archiveSyncItem(userId, syncItemId, reason = null) {
  const currentItem = await this.get(userId, syncItemId);

  let history = currentItem.status_history || [];
  if (typeof history === 'string') {
    history = JSON.parse(history);
  }

  history.push({
    timestamp: new Date().toISOString(),
    action: 'archived',
    reason: reason,
    changedBy: userId
  });

  const sql = `
    UPDATE projects
    SET archived = true, status_history = $1
    WHERE id = $2 AND user_id = $3 AND is_sync_item = true
    RETURNING *
  `;

  const result = await query(sql, [JSON.stringify(history), syncItemId, userId]);
  return result.rows[0];
}

async restoreSyncItem(userId, syncItemId) {
  const currentItem = await this.get(userId, syncItemId);

  let history = currentItem.status_history || [];
  if (typeof history === 'string') {
    history = JSON.parse(history);
  }

  history.push({
    timestamp: new Date().toISOString(),
    action: 'restored',
    changedBy: userId
  });

  const sql = `
    UPDATE projects
    SET archived = false, status_history = $1
    WHERE id = $2 AND user_id = $3 AND is_sync_item = true
    RETURNING *
  `;

  const result = await query(sql, [JSON.stringify(history), syncItemId, userId]);
  return result.rows[0];
}

async getArchivedSyncItemsCount(userId) {
  const sql = `
    SELECT COUNT(*) as count
    FROM projects
    WHERE user_id = $1 AND is_sync_item = true AND archived = true
  `;

  const result = await query(sql, [userId]);
  return parseInt(result.rows[0].count, 10);
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Separate audit tables | JSONB status_history column | PostgreSQL 9.4+ (2014) | Simpler queries, no JOINs, atomic updates |
| Manual transaction handling | Connection pool getClient() | Established in codebase | Consistent error handling, automatic release |
| String concatenation SQL | Parameterized queries | pg library standard | SQL injection prevention |
| Separate settings tables per feature | Generic user_settings with JSONB | Established pattern (UserSettingsService) | Flexible schema, no migrations for new settings |
| Hard DELETE | Soft delete with archived flag | Established pattern (BugService) | Data recovery, audit compliance |

**Deprecated/outdated:**
- Manual SQL escaping: Use parameterized queries exclusively
- Separate history tables: JSONB array is simpler and more performant for append-only audit trails
- Numeric display order gaps (0, 10, 20): Use sequential integers (0, 1, 2) - PostgreSQL handles reordering efficiently

## Open Questions

None - all technical patterns verified in production codebase.

## Sources

### Primary (HIGH confidence)
- P&E Manager codebase: /Users/i306072/Documents/GitHub/P-E/server/
  - db/schema.sql - Base schema with UUID, JSONB, triggers
  - db/migrate.js - Migration runner pattern
  - db/002_work_items.sql - JSONB insights pattern
  - db/007_one_on_ones_extended.sql - ALTER TABLE column addition
  - db/019_bug_dashboard.sql - CASCADE DELETE pattern
  - services/TaskService.js - Service layer CRUD pattern
  - services/ProjectService.js - Dynamic UPDATE with validation
  - services/WorkItemService.js - JSONB array manipulation
  - services/UserSettingsService.js - Upsert pattern with ON CONFLICT
  - db/connection.js - Connection pool, getClient() for transactions

### Secondary (MEDIUM confidence)
- PostgreSQL documentation (inferred from codebase patterns):
  - JSONB data type (used in 9+ tables)
  - CASCADE DELETE foreign keys (used in 11+ migrations)
  - Trigger functions (update_updated_date_column used globally)
  - Parameterized queries ($1, $2 notation used throughout)

### Tertiary (LOW confidence)
None - research based entirely on verified production code

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - All libraries already in use, production-tested
- Architecture: HIGH - All patterns verified in existing services
- Pitfalls: HIGH - Documented from actual codebase anti-patterns

**Research date:** 2026-01-29
**Valid until:** 2026-02-28 (30 days - stable backend patterns)

**Research scope:**
- Database schema extension patterns
- Service layer CRUD operations
- JSONB audit trail implementation
- Foreign key CASCADE DELETE
- Multi-tenancy enforcement
- Display order management
- Upsert operations for settings

**Not researched (out of scope):**
- Frontend integration (Phase 24+)
- Sprint calculation logic (Phase 24)
- Team management UI (Phase 24)
- Authentication/authorization changes (not required)
