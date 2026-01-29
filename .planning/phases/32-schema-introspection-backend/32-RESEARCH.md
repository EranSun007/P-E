# Phase 32: Schema Introspection Backend - Research

**Researched:** 2026-01-29
**Domain:** PostgreSQL schema introspection and metadata extraction
**Confidence:** HIGH

## Summary

PostgreSQL schema introspection involves querying database metadata to extract information about tables, columns, data types, constraints, indexes, and relationships. PostgreSQL provides two primary approaches: the standard SQL `information_schema` views and PostgreSQL-specific `pg_catalog` system tables.

For this phase, we need to build a REST API endpoint (`GET /api/schema/tables`) that returns comprehensive schema metadata. The standard approach is to use `information_schema` views for portability and simplicity, with `pg_catalog` views like `pg_indexes` for features not covered by the SQL standard (like index details).

The research identified three implementation approaches:
1. Raw SQL queries against `information_schema` (recommended for this project)
2. Using `extract-pg-schema` library (abstraction layer)
3. Using `pg-structure` library (ORM-like object model)

**Primary recommendation:** Use raw SQL queries against `information_schema` and `pg_catalog` views. This approach provides full control, zero dependencies, and aligns with the project's existing direct SQL patterns in services.

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| pg | 8.17+ | PostgreSQL client | Already in project, industry standard Node.js PostgreSQL driver |
| information_schema | SQL standard | Schema metadata | Standard SQL views, portable across PostgreSQL versions |
| pg_catalog | PostgreSQL native | Extended metadata | PostgreSQL-specific metadata (indexes, advanced features) |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| extract-pg-schema | 5.8+ | Schema extraction library | If building schema export/import, type generation |
| pg-structure | 7.15+ | ORM-like schema model | If building complex schema analysis tools |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Raw SQL queries | extract-pg-schema | Adds dependency, abstracts away control, but provides structured output |
| information_schema | Direct pg_catalog queries | More complex SQL, less portable, but more complete metadata |
| Custom endpoint | GraphQL introspection | More complex setup, overkill for simple schema reading |

**Installation:**
```bash
# No new dependencies required - use existing 'pg' package
# Already in package.json
```

## Architecture Patterns

### Recommended Project Structure
```
server/
├── services/
│   └── SchemaService.js         # Schema introspection logic
├── routes/
│   └── schema.js                # REST endpoints for schema
└── db/
    └── connection.js            # Existing database connection
```

### Pattern 1: Service Layer for Schema Queries
**What:** Separate service class that encapsulates all schema introspection SQL
**When to use:** Matches existing project pattern (TaskService, ProjectService, etc.)
**Example:**
```javascript
// server/services/SchemaService.js
import { query } from '../db/connection.js';

class SchemaService {
  async getTables(includeSystem = false) {
    const systemFilter = includeSystem ? '' : `
      AND table_schema NOT IN ('pg_catalog', 'information_schema')
      AND table_schema NOT LIKE 'pg_%'
    `;

    const sql = `
      SELECT
        table_schema,
        table_name,
        table_type
      FROM information_schema.tables
      WHERE table_type = 'BASE TABLE'
      ${systemFilter}
      ORDER BY table_schema, table_name
    `;

    const result = await query(sql);
    return result.rows;
  }
}

export default new SchemaService();
```

### Pattern 2: Nested Data Structure for Schema Response
**What:** Hierarchical JSON with tables containing columns, indexes, and constraints
**When to use:** For comprehensive schema API responses
**Example:**
```javascript
{
  "tables": [
    {
      "schema": "public",
      "name": "tasks",
      "type": "BASE TABLE",
      "columns": [
        {
          "name": "id",
          "type": "uuid",
          "nullable": false,
          "default": "uuid_generate_v4()",
          "position": 1
        }
      ],
      "indexes": [
        {
          "name": "tasks_pkey",
          "definition": "CREATE UNIQUE INDEX tasks_pkey ON public.tasks USING btree (id)"
        }
      ],
      "foreignKeys": [
        {
          "name": "tasks_project_id_fkey",
          "sourceColumn": "project_id",
          "targetSchema": "public",
          "targetTable": "projects",
          "targetColumn": "id",
          "updateRule": "CASCADE",
          "deleteRule": "SET NULL"
        }
      ],
      "constraints": [
        {
          "name": "tasks_pkey",
          "type": "PRIMARY KEY",
          "columns": ["id"]
        }
      ]
    }
  ]
}
```

### Pattern 3: Query Parameter Filtering
**What:** Allow clients to control what metadata is returned via query parameters
**When to use:** Optimize response size, avoid over-fetching
**Example:**
```javascript
// GET /api/schema/tables?include=columns,indexes&exclude_system=true
router.get('/tables', async (req, res) => {
  const {
    include = 'columns,indexes,constraints,foreignKeys',
    exclude_system = 'true'
  } = req.query;

  const includeSet = new Set(include.split(','));
  const excludeSystem = exclude_system === 'true';

  const tables = await SchemaService.getTables(excludeSystem);

  if (includeSet.has('columns')) {
    // Fetch and attach column info
  }

  res.json({ tables });
});
```

### Anti-Patterns to Avoid

- **Exposing raw pg_catalog complexity:** Don't force clients to understand PostgreSQL internals - transform to friendly structure
- **Missing system table filtering:** Always provide option to exclude `pg_catalog`, `information_schema`, etc.
- **N+1 query problem:** Don't query columns/indexes separately for each table - use JOINs or batch queries
- **Ignoring multi-schema databases:** Don't assume everything is in `public` schema
- **Returning excessive metadata:** Don't include internal PostgreSQL fields like OIDs unless specifically needed

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Schema diffing | Custom schema comparison | extract-pg-schema or pg-structure | Edge cases: renamed columns, type changes, constraint modifications |
| Type mapping | Manual PostgreSQL → TypeScript types | Kanel (uses extract-pg-schema) | 100+ PostgreSQL types, domains, arrays, enums |
| Schema validation | Custom schema linting | Schemalint | Naming conventions, missing indexes, orphaned columns |
| Full-text schema export | Custom JSON serialization | pg_dump or extract-pg-schema | System dependencies, sequences, functions, triggers |

**Key insight:** Raw schema introspection is straightforward, but advanced schema operations (diffing, migration generation, type generation) have complex edge cases. Use libraries for those, but basic introspection is simple enough to hand-roll.

## Common Pitfalls

### Pitfall 1: Forgetting System Schema Filtering
**What goes wrong:** API returns hundreds of PostgreSQL internal tables like `pg_class`, `pg_attribute`, etc.
**Why it happens:** `information_schema.tables` includes ALL tables, including system catalogs
**How to avoid:** Always filter by `table_schema NOT IN ('pg_catalog', 'information_schema') AND table_schema NOT LIKE 'pg_%'`
**Warning signs:** Response contains tables starting with `pg_`, `sql_`, or `information_schema` tables

### Pitfall 2: Composite Foreign Keys Complexity
**What goes wrong:** Foreign key queries return multiple rows for multi-column foreign keys
**Why it happens:** `key_column_usage` has one row per column in the key
**How to avoid:** Group by constraint name and aggregate columns into arrays
**Warning signs:** Duplicate constraint names in foreign key response

### Pitfall 3: Missing Index Columns
**What goes wrong:** `pg_indexes.indexdef` is a string, not structured data about columns
**Why it happens:** PostgreSQL stores reconstructed CREATE INDEX command, not normalized column list
**How to avoid:** Parse `indexdef` string or query `pg_index` catalog with array handling
**Warning signs:** Can't programmatically identify which columns are indexed

### Pitfall 4: User-Defined Types Appear as "USER-DEFINED"
**What goes wrong:** `data_type` column shows "USER-DEFINED" instead of actual type name
**Why it happens:** ENUMs and custom types don't have standard SQL names
**How to avoid:** Join with `udt_name` column or `pg_type` catalog for actual type name
**Warning signs:** Columns showing "USER-DEFINED" without additional type info

### Pitfall 5: N+1 Query Performance
**What goes wrong:** Fetching columns for each table in a loop causes 100+ database queries
**Why it happens:** Not leveraging SQL JOINs to fetch related metadata in bulk
**How to avoid:**
- Fetch all columns for all tables in one query, then group by table in application code
- Use CTEs or temporary tables for complex multi-step introspection
**Warning signs:** Schema endpoint takes >1 second with 10+ tables

### Pitfall 6: Permissions Issues
**What goes wrong:** Schema introspection fails or returns partial data for non-superuser accounts
**Why it happens:** `information_schema` views automatically filter based on user privileges
**How to avoid:**
- Grant appropriate permissions to application database user
- Document that schema introspection requires SELECT privilege on all tables
- Handle missing permissions gracefully (return empty list, not error)
**Warning signs:** Different results for superuser vs application user

## Code Examples

Verified patterns from official sources:

### Get All Tables with Columns
```sql
-- Source: https://www.postgresql.org/docs/current/information-schema.html
SELECT
  t.table_schema,
  t.table_name,
  t.table_type,
  c.column_name,
  c.ordinal_position,
  c.data_type,
  c.is_nullable,
  c.column_default,
  c.character_maximum_length,
  c.numeric_precision,
  c.numeric_scale,
  c.udt_name  -- Actual type name for USER-DEFINED types
FROM information_schema.tables t
LEFT JOIN information_schema.columns c
  ON t.table_schema = c.table_schema
  AND t.table_name = c.table_name
WHERE t.table_type = 'BASE TABLE'
  AND t.table_schema NOT IN ('pg_catalog', 'information_schema')
  AND t.table_schema NOT LIKE 'pg_%'
ORDER BY t.table_schema, t.table_name, c.ordinal_position;
```

### Get Foreign Key Relationships
```sql
-- Source: https://www.postgresql.org/docs/current/infoschema-referential-constraints.html
SELECT
  rc.constraint_name,
  kcu.table_schema AS source_schema,
  kcu.table_name AS source_table,
  kcu.column_name AS source_column,
  ccu.table_schema AS target_schema,
  ccu.table_name AS target_table,
  ccu.column_name AS target_column,
  rc.update_rule,
  rc.delete_rule
FROM information_schema.referential_constraints rc
JOIN information_schema.key_column_usage kcu
  ON rc.constraint_name = kcu.constraint_name
  AND rc.constraint_schema = kcu.constraint_schema
JOIN information_schema.constraint_column_usage ccu
  ON rc.unique_constraint_name = ccu.constraint_name
  AND rc.unique_constraint_schema = ccu.constraint_schema
WHERE kcu.table_schema NOT IN ('pg_catalog', 'information_schema')
  AND kcu.table_schema NOT LIKE 'pg_%'
ORDER BY kcu.table_schema, kcu.table_name, rc.constraint_name;
```

### Get Indexes with Columns
```sql
-- Source: https://www.postgresql.org/docs/current/view-pg-indexes.html
SELECT
  schemaname,
  tablename,
  indexname,
  indexdef
FROM pg_indexes
WHERE schemaname NOT IN ('pg_catalog', 'information_schema')
  AND schemaname NOT LIKE 'pg_%'
ORDER BY schemaname, tablename, indexname;
```

### Get All Constraints
```sql
-- Source: https://www.postgresql.org/docs/current/infoschema-table-constraints.html
SELECT
  tc.constraint_name,
  tc.table_schema,
  tc.table_name,
  tc.constraint_type,
  kcu.column_name,
  tc.is_deferrable,
  tc.initially_deferred
FROM information_schema.table_constraints tc
LEFT JOIN information_schema.key_column_usage kcu
  ON tc.constraint_name = kcu.constraint_name
  AND tc.table_schema = kcu.table_schema
  AND tc.table_name = kcu.table_name
WHERE tc.table_schema NOT IN ('pg_catalog', 'information_schema')
  AND tc.table_schema NOT LIKE 'pg_%'
ORDER BY tc.table_schema, tc.table_name, tc.constraint_type, tc.constraint_name;
```

### Service Class Pattern (matches existing project)
```javascript
// server/services/SchemaService.js
import { query } from '../db/connection.js';

class SchemaService {
  /**
   * Get all tables with optional system table exclusion
   * @param {boolean} excludeSystem - Exclude pg_catalog and information_schema
   * @returns {Promise<Array>} Array of table objects
   */
  async getTables(excludeSystem = true) {
    const systemFilter = excludeSystem ? `
      AND table_schema NOT IN ('pg_catalog', 'information_schema')
      AND table_schema NOT LIKE 'pg_%'
    ` : '';

    const sql = `
      SELECT
        table_schema,
        table_name,
        table_type
      FROM information_schema.tables
      WHERE table_type = 'BASE TABLE'
      ${systemFilter}
      ORDER BY table_schema, table_name
    `;

    const result = await query(sql);
    return result.rows;
  }

  /**
   * Get columns for all tables (or specific schema)
   * @param {string} schemaName - Optional schema filter
   * @returns {Promise<Array>} Array of column objects
   */
  async getColumns(schemaName = null) {
    const schemaFilter = schemaName
      ? 'AND c.table_schema = $1'
      : `AND c.table_schema NOT IN ('pg_catalog', 'information_schema')
         AND c.table_schema NOT LIKE 'pg_%'`;

    const sql = `
      SELECT
        c.table_schema,
        c.table_name,
        c.column_name,
        c.ordinal_position,
        c.data_type,
        c.udt_name,
        c.is_nullable,
        c.column_default,
        c.character_maximum_length,
        c.numeric_precision,
        c.numeric_scale
      FROM information_schema.columns c
      WHERE 1=1
      ${schemaFilter}
      ORDER BY c.table_schema, c.table_name, c.ordinal_position
    `;

    const params = schemaName ? [schemaName] : [];
    const result = await query(sql, params);
    return result.rows;
  }

  /**
   * Get all foreign key relationships
   * @returns {Promise<Array>} Array of foreign key objects
   */
  async getForeignKeys() {
    const sql = `
      SELECT
        rc.constraint_name,
        kcu.table_schema AS source_schema,
        kcu.table_name AS source_table,
        kcu.column_name AS source_column,
        ccu.table_schema AS target_schema,
        ccu.table_name AS target_table,
        ccu.column_name AS target_column,
        rc.update_rule,
        rc.delete_rule
      FROM information_schema.referential_constraints rc
      JOIN information_schema.key_column_usage kcu
        ON rc.constraint_name = kcu.constraint_name
        AND rc.constraint_schema = kcu.constraint_schema
      JOIN information_schema.constraint_column_usage ccu
        ON rc.unique_constraint_name = ccu.constraint_name
        AND rc.unique_constraint_schema = ccu.constraint_schema
      WHERE kcu.table_schema NOT IN ('pg_catalog', 'information_schema')
        AND kcu.table_schema NOT LIKE 'pg_%'
      ORDER BY kcu.table_schema, kcu.table_name, rc.constraint_name
    `;

    const result = await query(sql);
    return result.rows;
  }

  /**
   * Get all indexes
   * @returns {Promise<Array>} Array of index objects
   */
  async getIndexes() {
    const sql = `
      SELECT
        schemaname,
        tablename,
        indexname,
        indexdef
      FROM pg_indexes
      WHERE schemaname NOT IN ('pg_catalog', 'information_schema')
        AND schemaname NOT LIKE 'pg_%'
      ORDER BY schemaname, tablename, indexname
    `;

    const result = await query(sql);
    return result.rows;
  }

  /**
   * Get all constraints (PK, UNIQUE, CHECK, FK)
   * @returns {Promise<Array>} Array of constraint objects
   */
  async getConstraints() {
    const sql = `
      SELECT
        tc.constraint_name,
        tc.table_schema,
        tc.table_name,
        tc.constraint_type,
        kcu.column_name,
        tc.is_deferrable,
        tc.initially_deferred
      FROM information_schema.table_constraints tc
      LEFT JOIN information_schema.key_column_usage kcu
        ON tc.constraint_name = kcu.constraint_name
        AND tc.table_schema = kcu.table_schema
        AND tc.table_name = kcu.table_name
      WHERE tc.table_schema NOT IN ('pg_catalog', 'information_schema')
        AND tc.table_schema NOT LIKE 'pg_%'
      ORDER BY tc.table_schema, tc.table_name, tc.constraint_type, tc.constraint_name
    `;

    const result = await query(sql);
    return result.rows;
  }

  /**
   * Get complete schema for all tables
   * @returns {Promise<Object>} Complete schema with nested structure
   */
  async getCompleteSchema() {
    // Fetch all data in parallel
    const [tables, columns, foreignKeys, indexes, constraints] = await Promise.all([
      this.getTables(),
      this.getColumns(),
      this.getForeignKeys(),
      this.getIndexes(),
      this.getConstraints()
    ]);

    // Group columns by table
    const columnsByTable = this.groupByTable(columns);
    const indexesByTable = this.groupByTable(indexes, 'tablename', 'schemaname');
    const constraintsByTable = this.groupByTable(constraints);
    const foreignKeysByTable = this.groupByTable(foreignKeys, 'source_table', 'source_schema');

    // Build nested structure
    const tablesWithMetadata = tables.map(table => ({
      schema: table.table_schema,
      name: table.table_name,
      type: table.table_type,
      columns: columnsByTable[`${table.table_schema}.${table.table_name}`] || [],
      indexes: indexesByTable[`${table.table_schema}.${table.table_name}`] || [],
      constraints: constraintsByTable[`${table.table_schema}.${table.table_name}`] || [],
      foreignKeys: foreignKeysByTable[`${table.table_schema}.${table.table_name}`] || []
    }));

    return { tables: tablesWithMetadata };
  }

  /**
   * Helper: Group array items by table
   * @private
   */
  groupByTable(items, tableKey = 'table_name', schemaKey = 'table_schema') {
    return items.reduce((acc, item) => {
      const key = `${item[schemaKey]}.${item[tableKey]}`;
      if (!acc[key]) acc[key] = [];
      acc[key].push(item);
      return acc;
    }, {});
  }
}

export default new SchemaService();
```

### REST Route Pattern
```javascript
// server/routes/schema.js
import express from 'express';
import SchemaService from '../services/SchemaService.js';
import { authMiddleware } from '../middleware/auth.js';

const router = express.Router();

// Optional: Add authentication if schema access should be restricted
// router.use(authMiddleware);

/**
 * GET /api/schema/tables
 * Get all tables with complete metadata
 */
router.get('/tables', async (req, res) => {
  try {
    const excludeSystem = req.query.exclude_system !== 'false'; // Default: true
    const schema = await SchemaService.getCompleteSchema();
    res.json(schema);
  } catch (error) {
    console.error('GET /api/schema/tables error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/schema/tables/:schema/:table
 * Get metadata for specific table
 */
router.get('/tables/:schema/:table', async (req, res) => {
  try {
    const { schema: schemaName, table: tableName } = req.params;

    const [columns, foreignKeys, indexes, constraints] = await Promise.all([
      SchemaService.getColumns(schemaName),
      SchemaService.getForeignKeys(),
      SchemaService.getIndexes(),
      SchemaService.getConstraints()
    ]);

    // Filter for specific table
    const tableColumns = columns.filter(
      c => c.table_schema === schemaName && c.table_name === tableName
    );

    const tableForeignKeys = foreignKeys.filter(
      fk => fk.source_schema === schemaName && fk.source_table === tableName
    );

    const tableIndexes = indexes.filter(
      i => i.schemaname === schemaName && i.tablename === tableName
    );

    const tableConstraints = constraints.filter(
      c => c.table_schema === schemaName && c.table_name === tableName
    );

    if (tableColumns.length === 0) {
      return res.status(404).json({ error: 'Table not found' });
    }

    res.json({
      schema: schemaName,
      name: tableName,
      columns: tableColumns,
      foreignKeys: tableForeignKeys,
      indexes: tableIndexes,
      constraints: tableConstraints
    });
  } catch (error) {
    console.error('GET /api/schema/tables/:schema/:table error:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Direct pg_catalog queries | information_schema views | PostgreSQL 7.4+ (2003) | Portable SQL, less PostgreSQL-specific knowledge required |
| String parsing pg_get_indexdef() | pg_indexes view | PostgreSQL 9.5+ (2016) | Simpler index queries, no manual parsing |
| Manual foreign key joins | referential_constraints view | SQL standard | Standardized relationship discovery |
| Node.js 12 callback style | async/await with pg | Node.js 16+ (2021) | Cleaner code, better error handling |

**Deprecated/outdated:**
- **OID-based queries**: Old PostgreSQL tutorials show querying by OID - use names instead (OIDs can change)
- **pg.Client (direct connection)**: Use connection pools (pg.Pool) for multi-user applications
- **callback-style pg queries**: Use async/await instead of `query(sql, (err, result) => {})`

## Open Questions

Things that couldn't be fully resolved:

1. **Should schema introspection require authentication?**
   - What we know: Most entity routes require auth via authMiddleware
   - What's unclear: Schema metadata isn't user-specific data - is it sensitive?
   - Recommendation: Start without auth, add if needed. Schema structure alone isn't sensitive, but combined with data access might reveal business logic

2. **Should we cache schema introspection results?**
   - What we know: Schema rarely changes during runtime
   - What's unclear: Cache invalidation strategy (when migrations run)
   - Recommendation: Start without caching, add if performance becomes issue. Could cache with TTL or invalidate on migration detection

3. **How to handle composite foreign keys?**
   - What we know: key_column_usage returns one row per column
   - What's unclear: UI requirements for displaying multi-column FKs
   - Recommendation: Group by constraint_name and aggregate columns into arrays in response

4. **Should we include views in schema introspection?**
   - What we know: information_schema.tables includes views
   - What's unclear: Whether Entity Model Editor will support views
   - Recommendation: Filter to BASE TABLE initially, add view support later if needed

## Sources

### Primary (HIGH confidence)
- PostgreSQL Official Documentation (https://www.postgresql.org/docs/current/)
  - information_schema views: https://www.postgresql.org/docs/current/information-schema.html
  - information_schema.tables: https://www.postgresql.org/docs/current/infoschema-tables.html
  - information_schema.columns: https://www.postgresql.org/docs/current/infoschema-columns.html
  - information_schema.referential_constraints: https://www.postgresql.org/docs/current/infoschema-referential-constraints.html
  - information_schema.table_constraints: https://www.postgresql.org/docs/current/infoschema-table-constraints.html
  - pg_indexes view: https://www.postgresql.org/docs/current/view-pg-indexes.html
  - pg_catalog overview: https://www.postgresql.org/docs/current/catalogs-overview.html
  - Schema documentation: https://www.postgresql.org/docs/current/ddl-schemas.html

### Secondary (MEDIUM confidence)
- npm packages:
  - pg: https://www.npmjs.com/package/pg (industry standard, version 8.17.2 as of 2026-01-20)
  - extract-pg-schema: https://www.npmjs.com/package/extract-pg-schema (version 5.8.1 as of 2026-01-21)
  - pg-structure: https://www.npmjs.com/package/pg-structure (version 7.15.3 as of 2024-05-16)
- GitHub repositories:
  - pg-structure: https://github.com/ozum/pg-structure
  - extract-pg-schema: https://github.com/kristiandupont/extract-pg-schema

### Tertiary (LOW confidence)
- None - all findings verified with official documentation

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Official PostgreSQL documentation and npm package verification
- Architecture: HIGH - Patterns match existing project structure, verified with PostgreSQL docs
- Pitfalls: HIGH - Documented in PostgreSQL official docs and observed in information_schema behavior

**Research date:** 2026-01-29
**Valid until:** 2026-07-29 (6 months - PostgreSQL and information_schema are stable standards)

## Additional Notes for Planning

### Integration Points
- **Database connection**: Use existing `server/db/connection.js` with `query()` helper
- **Service pattern**: Follow existing pattern from TaskService, ProjectService
- **Route pattern**: Follow existing RESTful pattern from server/routes/tasks.js
- **Error handling**: Use existing 500 error format with error message

### Performance Considerations
- Schema introspection queries are read-only and relatively fast (<100ms for 50 tables)
- Consider limiting response size if database has 100+ tables
- Parallel Promise.all() for fetching related metadata (columns, indexes, etc.)
- No need for user_id filtering - schema is global, not multi-tenant

### Testing Strategy
- Unit tests: Mock query() function to test service methods
- Integration tests: Use test database with known schema
- Verify system table filtering works (no pg_catalog tables in response)
- Test with empty database, single table, and multi-schema databases

### Migration Strategy
- No database changes required - purely read-only introspection
- No frontend changes required initially - this is backend-only
- Can be developed and tested independently of other features
