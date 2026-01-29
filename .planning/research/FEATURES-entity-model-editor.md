# Features Research: Entity Model Editor

**Domain:** Visual Schema Editor / Entity Modeler for PostgreSQL
**Researched:** 2026-01-29
**Research Mode:** Ecosystem

## Executive Summary

Based on research of dbdiagram.io, pgAdmin ERD, DBeaver, Prisma Studio, Drizzle Kit, and draw.io, visual schema editors follow consistent patterns. The core workflow is: **view current schema -> define target model -> preview diff -> generate migration SQL**.

The user's preference for "form-based with live graph preview" aligns well with industry patterns - most successful tools (dbdiagram.io, pgAdmin) use a text/form-based definition with real-time visual rendering, rather than pure drag-and-drop.

## Table Stakes (Must Have)

Features users expect. Missing = tool feels incomplete.

### Schema Visualization

| Feature | Why Expected | Complexity | Dependencies |
|---------|--------------|------------|--------------|
| **Entity boxes displaying tables** | Core value proposition - see schema visually | Medium | React Flow or similar graph library |
| **Column display with types** | Users need to see field definitions | Low | Schema introspection API |
| **Primary key indicators** | Standard ER notation - users expect it | Low | None |
| **Foreign key relationship lines** | Core ER diagram capability | Medium | Graph edge rendering |
| **Cardinality notation** | Users expect crow's foot or similar notation | Low | Edge label customization |
| **Auto-layout** | Manual positioning is tedious for many tables | Medium | Dagre or ELK.js algorithm |
| **Zoom/pan controls** | Standard for any diagram tool | Low | React Flow built-in |

### Schema Definition (Form-Based)

| Feature | Why Expected | Complexity | Dependencies |
|---------|--------------|------------|--------------|
| **Add/edit entities via form** | User requirement - form-based approach | Medium | Form components |
| **Add/edit fields via form** | Core editing capability | Medium | Field type selector |
| **Define field types** | VARCHAR, INTEGER, UUID, TEXT, BOOLEAN, TIMESTAMP, NUMERIC, JSONB, arrays | Low | PostgreSQL type catalog |
| **Set constraints** | NOT NULL, UNIQUE, DEFAULT values | Medium | Constraint validation |
| **Define relationships** | FK references with ON DELETE behavior | High | Relationship builder UI |
| **Define indexes** | Performance-critical for real apps | Medium | Index definition form |

### Current vs Target Comparison

| Feature | Why Expected | Complexity | Dependencies |
|---------|--------------|------------|--------------|
| **Load current schema from database** | User requirement - see existing state | Medium | PostgreSQL introspection queries |
| **Side-by-side or toggle view** | User requirement - see diff | Medium | Dual canvas or overlay mode |
| **Visual diff highlighting** | User requirement - see what changed | Medium | Change detection algorithm |
| **Added/removed/modified indicators** | Standard diff UX pattern | Low | Color coding system |

### Migration Generation

| Feature | Why Expected | Complexity | Dependencies |
|---------|--------------|------------|--------------|
| **Generate CREATE TABLE SQL** | Core migration capability | Medium | SQL generation logic |
| **Generate ALTER TABLE SQL** | Core migration capability - handle changes | High | Diff-to-SQL transformer |
| **Generate DROP statements** | Complete migration workflow | Low | Simple SQL generation |
| **Preview generated SQL** | Users want to review before executing | Low | Code viewer component |
| **Copy/download SQL** | Standard export pattern | Low | Clipboard API |

## Differentiators (Should Have)

Features that would make this exceptional. Not expected, but valued.

### Enhanced Editing Experience

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| **Live preview while editing** | Immediate feedback - dbdiagram.io's killer feature | Medium | Real-time re-render on form changes |
| **DBML-style text input option** | Power users can type faster than clicking | High | DBML parser integration |
| **Undo/redo history** | Confidence to experiment | Medium | State history management |
| **Validation warnings** | Catch mistakes before migration | Medium | Schema validation rules |
| **Smart defaults** | Pre-fill common patterns (id UUID, timestamps) | Low | Template system |

### Migration Intelligence

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| **Data-safe migration warnings** | Warn about destructive changes | Medium | Analyze DROP, type narrowing |
| **Migration ordering** | Handle FK dependencies automatically | High | Topological sort of changes |
| **Rollback SQL generation** | Reversible migrations like Prisma | High | Inverse operation generation |
| **Migration versioning** | Integration with existing migrate.js pattern | Medium | Version naming convention |

### Visualization Enhancements

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| **Table grouping** | Organize large schemas like dbdiagram.io | Medium | Group node containers |
| **Color coding by domain** | Visual organization (HR vs Engineering entities) | Low | Color picker per group |
| **Minimap** | Navigate large schemas efficiently | Low | React Flow built-in |
| **Notes/annotations** | Document design decisions | Low | Note node type |
| **Multiple notation styles** | Crow's foot, Chen, IDEF1X options | Medium | Configurable edge rendering |

### Integration with P&E Manager

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| **Save target model as project artifact** | Persist work between sessions | Low | JSON storage in projects table |
| **Compare with migration history** | See what migrations exist vs target | Medium | Read migrate.js versions |
| **Direct execution option** | Apply migrations from UI (dev only) | High | Dangerous - needs safeguards |

## Anti-Features (Do NOT Build in v1)

Features to explicitly NOT build. Common mistakes in this domain.

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| **Pure drag-and-drop entity creation** | User explicitly prefers form-based; drag-drop is harder to implement well | Use form dialogs with graph preview |
| **Full DBML editor/parser** | High complexity, marginal benefit for internal tool | Stick to form-based; consider DBML export later |
| **Support for non-PostgreSQL databases** | P&E Manager only uses PostgreSQL; adds complexity | PostgreSQL-only, hardcode dialect |
| **Direct production database connection** | Dangerous; could corrupt production data | Read-only introspection, copy SQL manually to production |
| **Real-time collaboration** | Requires WebSocket infrastructure, overkill for internal tool | Single-user editing |
| **Schema version control/branching** | Git handles this better | Export SQL files, use git |
| **Stored procedures/functions editor** | P&E only has one trigger; rare use case | Manual SQL for functions |
| **Data editor (like Prisma Studio)** | Different feature set, different UI | Stick to schema design |
| **Import from Prisma/Drizzle schema** | P&E uses raw SQL migrations | Import from existing PostgreSQL only |
| **Cloud-hosted diagrams** | Internal tool doesn't need external sharing | Local/project storage only |
| **Mobile support** | No real use case for schema editing on mobile | Desktop/tablet only |

## User Workflows

Typical user journeys through the feature based on research patterns.

### Workflow 1: Visualize Existing Schema

**Goal:** Understand current database structure

1. Open Entity Model Editor page
2. Click "Load Current Schema" button
3. System introspects PostgreSQL database via API
4. Graph renders with all 13+ P&E tables and relationships
5. User can zoom, pan, click entities to see details
6. User can rearrange layout if desired (positions saved)

**Key insight from research:** pgAdmin and DBeaver both support "reverse engineering" - generating diagrams from existing databases. This is the entry point for most users.

### Workflow 2: Plan Schema Changes

**Goal:** Design a new entity or modify existing

1. View current schema visualization
2. Click "New Entity" button -> form opens in side panel
3. Fill in entity name, fields, types, constraints
4. Live preview shows new entity appearing in graph
5. Click "Add Relationship" -> select source/target fields
6. Relationship line appears with cardinality notation
7. Save to "target model" (stored separately from current)

**Key insight from research:** dbdiagram.io's success comes from immediate visual feedback while editing. Form changes should instantly update the graph.

### Workflow 3: Generate Migration

**Goal:** Transform current schema to target model

1. With both current and target models defined
2. Click "Compare / Generate Migration"
3. System shows diff view:
   - Green: new tables/columns to add
   - Red: removed tables/columns
   - Yellow: modified columns/constraints
4. Review warnings for destructive changes
5. Click "Generate SQL"
6. SQL preview panel shows migration code
7. Copy SQL or download as file
8. User pastes into new migration file in `server/db/`

**Key insight from research:** Prisma and Drizzle both generate human-readable, customizable SQL. The migration should be a starting point, not a black box.

### Workflow 4: Quick Schema Exploration

**Goal:** Understand relationships for debugging/development

1. Open Entity Model Editor
2. Load current schema
3. Click on a table (e.g., `tasks`)
4. Side panel shows full table details
5. Relationship lines to `comments`, `task_attributes` highlighted
6. Click "Show related tables" to filter view
7. Use for reference while writing queries

**Key insight from research:** DBeaver emphasizes exploration - right-click to generate SELECT/INSERT statements. The tool serves as documentation.

## Feature Dependencies

```
Schema Visualization
    |
    +-- Load Current Schema (requires PostgreSQL introspection API)
    |
    +-- Entity Form Editor
    |       |
    |       +-- Field Definition
    |       |
    |       +-- Relationship Builder
    |
    +-- Target Model Storage
            |
            +-- Diff Calculation
                    |
                    +-- Migration SQL Generation
```

## MVP Feature Set Recommendation

For a useful v1, prioritize:

**Phase 1: Visualization (Must have first)**
1. Schema introspection API endpoint
2. Entity boxes with fields, types, PK indicators
3. FK relationship lines with cardinality
4. Auto-layout algorithm
5. Zoom/pan/basic controls

**Phase 2: Editing**
1. Add/edit entity form
2. Add/edit field form
3. Define relationship form
4. Live preview updates
5. Target model storage

**Phase 3: Migration**
1. Current vs Target diff view
2. Visual diff highlighting
3. SQL generation (CREATE TABLE, ALTER TABLE, DROP)
4. Preview and copy SQL
5. Integration with migration file naming

**Defer to v2:**
- DBML text input
- Rollback SQL generation
- Direct execution
- Multiple notation styles
- Advanced grouping/color coding

## Confidence Assessment

| Area | Confidence | Reason |
|------|------------|--------|
| Table stakes features | HIGH | Consistent across all researched tools (pgAdmin, DBeaver, dbdiagram.io) |
| User workflow patterns | HIGH | Well-documented in pgAdmin and dbdiagram.io docs |
| Differentiator value | MEDIUM | Based on competitive analysis, but internal tool may have different priorities |
| Anti-features | MEDIUM | Based on judgment about scope; user may disagree |
| Implementation complexity | MEDIUM | Based on tool capabilities (React Flow), but actual complexity depends on existing P&E codebase integration |

## Sources

**Authoritative (HIGH confidence):**
- pgAdmin ERD Tool Documentation: https://www.pgadmin.org/docs/pgadmin4/latest/erd_tool.html
- React Flow Documentation: https://reactflow.dev/
- DBML GitHub + Docs: https://github.com/holistics/dbml, https://dbml.dbdiagram.io/
- Prisma Studio Documentation: https://www.prisma.io/docs/orm/tools/prisma-studio
- Drizzle Kit Documentation: https://orm.drizzle.team/docs/kit-overview
- Flyway Documentation: https://documentation.red-gate.com/flyway

**Secondary (MEDIUM confidence):**
- DBeaver ER Diagram Documentation: https://dbeaver.com/docs/dbeaver/ER-Diagrams/
- dbdiagram.io Documentation: https://docs.dbdiagram.io/
- draw.io ER Diagram Blog: https://www.drawio.com/blog/entity-relationship-tables

**Existing Codebase (HIGH confidence for integration requirements):**
- P&E Manager schema.sql with 13+ tables and 27+ migrations
- Existing migration pattern in `server/db/migrate.js`
