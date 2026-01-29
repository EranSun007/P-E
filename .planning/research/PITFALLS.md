# Pitfalls Research: Entity Model Editor

**Domain:** Schema management / migration tool for existing P&E Manager
**Researched:** 2026-01-29
**Context:** Building schema introspection and visual editor INSIDE the app that uses the same database

---

## Critical Pitfalls

Mistakes that cause data loss, broken production, or major rewrites.

### Pitfall 1: Destructive Operations Without Confirmation Gates

**What goes wrong:** User clicks "Drop Column" or "Delete Table" in the visual editor, migration runs immediately, data is permanently lost. No undo possible.

**Why it happens:**
- UI designed for efficiency makes destructive actions too easy
- Generated migrations execute without human review
- No distinction between "design mode" and "commit mode"

**Consequences:**
- Permanent data loss in production database
- Cascading foreign key deletions (ON DELETE CASCADE) remove more than expected
- The running P&E Manager app crashes with missing columns/tables

**Prevention:**
1. **Multi-step confirmation for destructive operations**:
   - First: "This will delete column X"
   - Second: "This column has Y rows of data. Type 'DELETE' to confirm"
   - Third: Show generated SQL before execution
2. **Generate migrations as files, never execute directly**: User must run `npm run migrate` manually
3. **Classify operations by danger level**:
   - GREEN: Add column, add table, add index
   - YELLOW: Rename column, add constraint
   - RED: Drop column, drop table, drop constraint
4. **Never generate DROP statements by default**: Require explicit "Include destructive changes" checkbox

**Detection (warning signs):**
- No confirmation dialog in mockups
- Migration runs on button click
- No "preview SQL" step in workflow

**Phase to address:** Phase 1 (Foundation) - Build safety gates before any migration generation

---

### Pitfall 2: Live Database Introspection Breaking the Running App

**What goes wrong:** Schema introspection queries lock tables or run expensive scans, causing the P&E Manager app to hang or timeout during normal operation.

**Why it happens:**
- `information_schema` queries can be slow on large schemas
- Introspection runs automatically (on page load, on interval)
- No isolation between "admin" database operations and "app" database operations

**Consequences:**
- Users experience app slowdowns during schema inspection
- Long-running queries on `pg_catalog` block other transactions
- Connection pool exhaustion (introspection uses connections needed by app)

**Prevention:**
1. **Use dedicated connection for introspection**: Separate from app connection pool
2. **Cache schema metadata aggressively**: Query on-demand, not on every render
3. **Prefer `pg_catalog` over `information_schema`**: Direct system catalog access is faster
4. **Set statement timeout for introspection queries**: `SET statement_timeout = '5s'`
5. **Run introspection during low-traffic periods**: Or make it manual-only

**Detection (warning signs):**
- Introspection runs on component mount
- No caching layer between UI and database queries
- Using same connection pool as main app

**Phase to address:** Phase 1 (Foundation) - Design introspection architecture before UI

---

### Pitfall 3: Generated Migration Breaks Running Application

**What goes wrong:** User generates and applies a migration that removes a column the app still references. App crashes with "column X does not exist" errors.

**Why it happens:**
- Schema editor only knows database state, not application code state
- No validation that app code matches schema changes
- Migrations applied without deployment coordination

**Consequences:**
- Production downtime
- Error logs flooded with SQL errors
- Users lose access to app features

**Prevention:**
1. **Two-environment workflow**:
   - Generate migrations in schema editor
   - Apply to dev database first
   - Run app tests against dev database
   - Only then apply to production
2. **Warn about high-risk removals**: "Column 'status' is commonly used in application queries"
3. **Staged rollout for destructive changes**:
   - First migration: Mark column as deprecated (add comment)
   - Deploy code that no longer uses column
   - Second migration: Actually drop column
4. **Integration with app code** (future): Scan `server/services/*.js` for column references

**Detection (warning signs):**
- No "test migration" workflow in plan
- Migrations apply directly to production database
- No consideration of zero-downtime deployments

**Phase to address:** Phase 2 (Migration Generator) - Build workflow, not just SQL generation

---

## Moderate Pitfalls

Mistakes that cause delays, technical debt, or user confusion.

### Pitfall 4: PostgreSQL-Specific Features Lost in Introspection

**What goes wrong:** Schema introspection misses PostgreSQL-specific features like:
- UUID extensions (`uuid_generate_v4()`)
- Array types (`TEXT[]`)
- JSONB columns and their operators
- Custom triggers and functions
- Partial indexes

**Why it happens:**
- `information_schema` is SQL-standard and omits PostgreSQL extensions
- Generic schema models don't have fields for PG-specific features
- Developer assumes "standard SQL" is sufficient

**Consequences:**
- Generated schema missing critical functionality
- Round-trip (introspect -> generate -> apply) corrupts schema
- Triggers/functions silently dropped during migration

**Prevention:**
1. **Query `pg_catalog` directly for PostgreSQL features**:
   ```sql
   -- Get array columns
   SELECT column_name, udt_name FROM information_schema.columns
   WHERE data_type = 'ARRAY';

   -- Get triggers
   SELECT * FROM pg_trigger WHERE tgrelid = 'tablename'::regclass;
   ```
2. **Build PostgreSQL-specific schema model**: Not a generic database model
3. **Preserve unknown/complex elements**: If introspection can't model it, preserve verbatim
4. **Test round-trip integrity**: Introspect -> Generate SQL -> Compare to original

**Detection (warning signs):**
- Schema model uses generic "type: string" instead of PostgreSQL types
- No handling for arrays, JSONB, or extensions
- information_schema is only data source

**Phase to address:** Phase 1 (Foundation) - Design schema model with PostgreSQL specifics

---

### Pitfall 5: Graph Visualization Performance Collapse

**What goes wrong:** With 20+ entities (tables), the graph editor becomes:
- Sluggish during drag/pan/zoom
- Unusable for selection
- Laggy when adding/removing nodes

**Why it happens:**
- React re-renders all nodes on any state change
- Custom node components not memoized
- Expensive calculations in render cycle
- CSS shadows/gradients on every node

**Consequences:**
- Users avoid the visual editor
- Browser tab becomes unresponsive
- Feature abandoned due to poor UX

**Prevention:**
1. **Memoize aggressively**:
   ```jsx
   const TableNode = React.memo(({ data }) => { ... });
   ```
2. **Use `useCallback` for all handlers passed to ReactFlow**
3. **Avoid inline objects/functions**: Create stable references
4. **Simplify node styling**: Remove shadows, gradients, animations for 20+ nodes
5. **Implement node collapsing**: Hide column details when zoomed out
6. **Use virtualization**: ReactFlow does this by default, don't override
7. **Lazy-load edge rendering**: Only render visible edges

**Detection (warning signs):**
- No `React.memo` in node component code
- Inline callbacks in ReactFlow props
- Complex CSS on node elements

**Phase to address:** Phase 3 (Visual Editor) - Performance testing from day one

---

### Pitfall 6: Schema Diff Algorithm False Positives

**What goes wrong:** Diff algorithm reports changes that don't exist:
- Column order changes (databases don't care)
- Default value formatting differences (`now()` vs `CURRENT_TIMESTAMP`)
- Constraint name differences (auto-generated vs user-defined)
- Whitespace in CHECK constraints

**Why it happens:**
- String comparison of SQL instead of semantic comparison
- Database normalizes SQL on storage differently than input
- Different introspection methods return different formats

**Consequences:**
- User confused by "phantom changes"
- Unnecessary migrations generated
- Trust in tool eroded

**Prevention:**
1. **Normalize before comparing**:
   - Ignore column order (not semantically meaningful in PostgreSQL)
   - Canonicalize default values
   - Compare constraint semantics, not SQL text
2. **Use database's own normalization**: Compare `pg_get_constraintdef()` output
3. **Filter known false positives**: Column order, case differences, formatting
4. **Show confidence level**: "Likely change" vs "Definite change"

**Detection (warning signs):**
- Diff based on string comparison of CREATE TABLE statements
- No normalization layer
- Testing only with simple schemas

**Phase to address:** Phase 2 (Migration Generator) - Build normalization into diff engine

---

### Pitfall 7: Unnamed Constraints Make Diff Unreliable

**What goes wrong:** PostgreSQL auto-generates constraint names like `tasks_pkey` or `tasks_check`. When comparing schemas:
- Different databases generate different names
- Constraint appears as "removed and added" instead of "unchanged"
- Migration generates DROP + CREATE unnecessarily

**Why it happens:**
- PostgreSQL doesn't enforce unique constraint names across schemas
- Auto-generated names include table/column info that may vary
- Diff algorithm uses name as identity

**Consequences:**
- Unnecessary constraint recreation
- Brief window of missing constraints
- Index rebuilds cause performance issues

**Prevention:**
1. **Identify constraints by structure, not name**:
   - Match by columns involved + constraint type
   - Name is metadata, not identity
2. **Recommend naming all constraints**: Lint warning for unnamed constraints
3. **Preserve auto-generated names**: Don't try to rename unless requested

**Detection (warning signs):**
- Constraint comparison uses `constraint_name` as primary key
- No structural matching fallback
- Tests use only manually-named constraints

**Phase to address:** Phase 2 (Migration Generator) - Constraint matching logic

---

## Minor Pitfalls

Mistakes that cause annoyance but are fixable.

### Pitfall 8: Confusing Visual Editor Interactions

**What goes wrong:**
- Users don't know how to add relationships (double-click? drag? menu?)
- Column editing requires too many clicks
- Undo doesn't work as expected
- Selection feedback unclear

**Why it happens:**
- No established conventions for schema editors
- Developer assumes familiarity with graph tools
- Insufficient user testing

**Prevention:**
1. **Provide multiple interaction paths**: Right-click menu + keyboard shortcuts + toolbar
2. **Use familiar patterns**: Drag to create relationship (like ERD tools)
3. **Implement full undo/redo**: Track all changes in history stack
4. **Clear selection states**: Visual distinction for selected/hovered/edited
5. **Onboarding hints**: First-run tooltips showing key interactions

**Detection (warning signs):**
- Single interaction method per action
- No undo system in scope
- No user testing planned

**Phase to address:** Phase 3 (Visual Editor) - UX design before implementation

---

### Pitfall 9: Foreign Key Visualization Becomes Spaghetti

**What goes wrong:** With many relationships, edges overlap and obscure the graph. Users can't trace relationships or understand table connections.

**Why it happens:**
- Default edge routing draws straight lines
- No edge bundling or routing optimization
- All edges rendered with same style

**Consequences:**
- Graph becomes unreadable
- Users miss important relationships
- Visual editor provides no value over text view

**Prevention:**
1. **Use edge routing**: Orthogonal (right-angle) edges are clearer than bezier
2. **Implement edge bundling**: Group parallel edges
3. **Edge highlighting on hover**: Dim unrelated edges
4. **Auto-layout options**: Dagre, ELK for hierarchical layouts
5. **Allow manual edge routing**: User-defined control points

**Detection (warning signs):**
- Using default ReactFlow edge styles
- No layout algorithm integration
- Testing with < 5 tables only

**Phase to address:** Phase 3 (Visual Editor) - Edge rendering system

---

### Pitfall 10: Migration File Naming Conflicts

**What goes wrong:** Generated migration files have naming collisions:
- Two developers generate migrations with same timestamp
- Manual and generated migrations in wrong order
- Descriptive names too long for filesystem

**Why it happens:**
- Timestamp-based naming with second precision
- No coordination between developers
- Mixing migration generation styles

**Prevention:**
1. **Use version prefix**: `028_add_new_column.sql` (sequential with project migrations)
2. **Read existing migrations**: Next version = max(existing) + 1
3. **Validate on generation**: Warn if version already exists
4. **Safe file names**: Limit length, sanitize special characters

**Detection (warning signs):**
- Timestamp-only naming
- No check for existing migration files
- No versioning scheme defined

**Phase to address:** Phase 2 (Migration Generator) - File naming conventions

---

## Project-Specific Pitfalls

Issues specific to building this tool inside P&E Manager.

### Pitfall 11: Self-Referential Danger

**What goes wrong:** The Entity Model Editor manages the same database it runs on. User could:
- Drop the `migrations` table
- Modify the `users` table breaking authentication
- Alter columns that the editor's own queries depend on

**Why it happens:**
- Tool has full database access
- No distinction between "system tables" and "user tables"
- Power corrupts (with great introspection comes great responsibility)

**Prevention:**
1. **Mark system tables as protected**:
   - `migrations` - Never allow modification
   - `users` - Warn before any change
   - Core tables critical to app function
2. **Show protection status in UI**: Lock icon on protected tables
3. **Require elevated permission for system table changes**
4. **Test with "what if I modify migrations table" scenario**

**Detection (warning signs):**
- No table classification system
- All tables treated equally
- No "system vs user" distinction

**Phase to address:** Phase 1 (Foundation) - Table classification system

---

### Pitfall 12: Existing Migration System Compatibility

**What goes wrong:** P&E Manager already has 27 migrations in `server/db/`. Generated migrations:
- Use different naming convention
- Don't integrate with existing `migrate.js`
- Create parallel migration history

**Why it happens:**
- Greenfield migration generator design
- Didn't analyze existing system
- Two migration sources = confusion

**Prevention:**
1. **Integrate with existing system**: Generate migrations compatible with `MIGRATIONS` array in `migrate.js`
2. **Match existing conventions**: `028_description.sql` format
3. **Update `migrate.js` array**: Or generate a JSON manifest
4. **Single source of truth**: All migrations in same directory, same format

**Detection (warning signs):**
- New migration folder/format in design
- No analysis of existing `migrate.js`
- "We'll handle compatibility later"

**Phase to address:** Phase 2 (Migration Generator) - Compatibility with existing system

---

## Confidence Assessment

| Area | Confidence | Source |
|------|------------|--------|
| PostgreSQL introspection | HIGH | Official PostgreSQL docs, existing P&E schema analysis |
| React Flow performance | HIGH | Official React Flow docs + GitHub discussions |
| Migration safety patterns | HIGH | Prisma, Graphile-migrate, Atlas official docs |
| Schema diff edge cases | MEDIUM | Knex.js docs + constraint documentation |
| UX patterns | MEDIUM | General graph editor patterns, limited domain-specific sources |

## Sources

- [PostgreSQL information_schema documentation](https://www.postgresql.org/docs/current/information-schema.html) - Constraint naming, PostgreSQL-specific features
- [React Flow Performance Guide](https://reactflow.dev/learn/advanced-use/performance) - Memoization, re-render prevention
- [React Flow GitHub Discussions](https://github.com/xyflow/xyflow/discussions) - Real-world performance issues at scale
- [Prisma Shadow Database](https://www.prisma.io/docs/orm/prisma-migrate/understanding-prisma-migrate/shadow-database) - Validation patterns for migrations
- [Graphile-migrate](https://github.com/graphile/migrate) - Safety mechanisms, hash verification
- [Atlas Dev Database](https://atlasgo.io/concepts/dev-database) - Pre-validation workflow
- [Knex.js Migrations](https://knexjs.org/guide/migrations.html) - Lock management, transaction pitfalls
- Existing P&E Manager codebase (`server/db/schema.sql`, `server/db/migrate.js`) - Current migration patterns

## Phase-Specific Warnings

| Phase | Likely Pitfall | Mitigation |
|-------|---------------|------------|
| Phase 1: Foundation | Pitfall 4 (PG features lost) | Design PostgreSQL-specific schema model from start |
| Phase 1: Foundation | Pitfall 11 (Self-referential) | Classify tables as system/user immediately |
| Phase 2: Migrations | Pitfall 1 (Destructive ops) | Build confirmation gates before any DROP generation |
| Phase 2: Migrations | Pitfall 3 (Break running app) | Workflow design with dev-first testing |
| Phase 2: Migrations | Pitfall 12 (Compatibility) | Analyze and match existing migrate.js patterns |
| Phase 3: Visual | Pitfall 5 (Performance) | Performance budget from day one, test with 20+ tables |
| Phase 3: Visual | Pitfall 9 (Edge spaghetti) | Edge routing and layout algorithms in initial design |
