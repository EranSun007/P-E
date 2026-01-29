# Project Research Summary

**Project:** P&E Manager v1.8 Entity Model Editor
**Domain:** Visual Database Schema Management Tool
**Researched:** 2026-01-29
**Confidence:** HIGH

## Executive Summary

The Entity Model Editor is a visual schema management tool for PostgreSQL that follows a well-established pattern: introspect current database state, allow users to define a target schema visually, compare the two states, and generate migration SQL. Research across pgAdmin ERD, DBeaver, dbdiagram.io, Prisma, and Drizzle confirms the core workflow is consistent: **view current -> define target -> preview diff -> generate migration**. The user's preference for "form-based with live graph preview" aligns perfectly with how successful tools like dbdiagram.io approach this problem.

The recommended approach maximizes reuse of the existing P&E Manager stack. PostgreSQL's native `information_schema` and `pg_catalog` provide complete schema introspection without new libraries. The only new dependency is @xyflow/react (formerly React Flow) for graph visualization — a battle-tested library with 3.85M weekly downloads. Migration SQL generation uses custom implementation rather than adopting an ORM, maintaining compatibility with the existing `server/db/migrate.js` system.

The primary risks are architectural: (1) destructive operations must have confirmation gates since this tool modifies the database it runs on, (2) introspection queries must not block the running application, and (3) generated migrations must integrate with the existing 27-migration system, not create a parallel one. These risks are well-understood and mitigatable with proper phase ordering — build safety gates and backend foundation before the visual editor.

## Key Findings

### Recommended Stack

The stack additions are minimal and targeted. Only one new npm package is required.

**Core technologies:**
- **PostgreSQL information_schema + pg_catalog:** Schema introspection — native SQL queries via existing `pg` library, no new dependency
- **@xyflow/react v12.10.0:** Graph visualization — MIT-licensed, React-native, built-in ER diagram support, excellent customization
- **Custom SQL generator:** Migration generation — matches existing migrate.js pattern, no ORM lock-in

**Technologies NOT to add:**
- No Prisma, TypeORM, or Knex (would require ORM adoption, conflicts with raw-pg approach)
- No pg-introspection (overkill, native queries are simpler)
- No vis-network or d3 raw (less React-native than @xyflow/react)

### Expected Features

**Must have (table stakes):**
- Entity boxes displaying tables with columns, types, PK indicators
- FK relationship lines with cardinality notation
- Load current schema from database via introspection
- Add/edit entities and fields via forms (user requirement)
- Current vs target schema comparison view
- Generate CREATE/ALTER/DROP SQL statements
- Preview and copy generated SQL

**Should have (differentiators):**
- Live preview while editing forms (dbdiagram.io's killer feature)
- Data-safe migration warnings for destructive changes
- Undo/redo history for confidence to experiment
- Migration ordering to handle FK dependencies automatically
- Table grouping and color coding by domain

**Defer (v2+):**
- DBML text input/parser (high complexity, marginal benefit)
- Rollback SQL generation
- Direct execution from UI (dangerous)
- Multiple notation styles (crow's foot vs Chen)
- Support for triggers/functions editing

### Architecture Approach

The Entity Model Editor integrates into P&E Manager as a new feature area, following established patterns: PostgreSQL backend with service class, REST routes, React frontend with Context provider. The key architectural decision is to generate migration files for manual review rather than executing DDL directly — this maintains safety and integrates with the existing git-tracked migration workflow.

**Major components:**
1. **SchemaService** (`server/services/SchemaService.js`) — introspection queries, model CRUD, diff calculation, SQL generation
2. **Schema Routes** (`server/routes/schema.js`) — REST endpoints for introspection, models, comparison, migration preview
3. **entity_models table** — stores target schema definitions as JSONB with visual layout positions
4. **EntityModelContext** (`src/contexts/EntityModelContext.jsx`) — manages editor state, selection, local changes before save
5. **Visual Editor Components** (`src/components/schema/`) — EntityBox, FieldForm, SchemaCanvas, MigrationPreview

### Critical Pitfalls

1. **Destructive operations without confirmation gates** — User could drop columns or tables instantly; generated migrations must be file output only, never execute directly; require multi-step confirmation for any DROP operations
2. **Live introspection breaking running app** — Cache schema metadata aggressively, use separate connection, set statement timeout; introspection should be manual/on-demand, not automatic
3. **Generated migration breaks running application** — Schema editor doesn't know app code state; require dev-first workflow (generate -> apply to dev -> test -> then production)
4. **PostgreSQL features lost in introspection** — Must query pg_catalog for arrays, JSONB, triggers; build PostgreSQL-specific model, not generic database model
5. **Self-referential danger** — This tool manages the database it runs on; mark system tables (migrations, users) as protected; show lock icons, require elevated confirmation

## Implications for Roadmap

Based on research, suggested phase structure:

### Phase 1: Backend Foundation
**Rationale:** All other phases depend on introspection and storage; must establish safety patterns from day one
**Delivers:** Schema introspection API, entity_models table, SchemaService with CRUD
**Addresses:** Load current schema (table stakes), PostgreSQL-specific introspection
**Avoids:** Pitfall 2 (introspection blocking app), Pitfall 4 (PG features lost), Pitfall 11 (self-referential danger)

### Phase 2: Frontend Data Layer
**Rationale:** Cannot build visual editor without data flow; API client and Context enable component development
**Delivers:** EntityModel API client, EntityModelContext, model loading/saving
**Uses:** SchemaService from Phase 1
**Implements:** Data flow architecture, multi-tenancy enforcement

### Phase 3: Form-Based Editing
**Rationale:** User explicitly prefers forms over pure drag-drop; forms are simpler to implement than canvas
**Delivers:** Entity form, field form, relationship form; basic schema manipulation without visual canvas
**Addresses:** Add/edit entities via form (table stakes), field definition, relationship builder
**Avoids:** Delaying usable functionality while building complex visual editor

### Phase 4: Visual Canvas
**Rationale:** Depends on data layer and basic editing; performance must be designed in from start
**Delivers:** @xyflow/react canvas, EntityBox nodes, FK edge rendering, auto-layout
**Uses:** @xyflow/react v12.10.0
**Avoids:** Pitfall 5 (performance collapse), Pitfall 9 (edge spaghetti)

### Phase 5: Diff and Migration
**Rationale:** Core value proposition; requires both current introspection and target model from earlier phases
**Delivers:** Schema comparison, diff highlighting, SQL generation, migration file output
**Addresses:** Current vs target comparison (table stakes), generate migration SQL (table stakes)
**Avoids:** Pitfall 1 (destructive ops), Pitfall 6 (false positives), Pitfall 12 (compatibility with existing migrate.js)

### Phase 6: Polish and Safety
**Rationale:** Refinement after core functionality works
**Delivers:** Live preview while editing, undo/redo, data-safe warnings, protected table indicators
**Addresses:** Should-have differentiators

### Phase Ordering Rationale

- **Backend before frontend:** API must exist before UI can consume it; introspection is foundation for everything
- **Forms before canvas:** Simpler to build, validates data model; canvas adds complexity and new dependency
- **Editing before diff:** Users need to create target models before comparison makes sense
- **Safety throughout:** Confirmation gates and file-only output built into Phase 1/5, not bolted on later
- **Polish last:** Undo/redo and warnings are refinements, not blockers

### Research Flags

Phases likely needing deeper research during planning:
- **Phase 4 (Visual Canvas):** @xyflow/react integration, custom node types, edge routing — verify API patterns with current docs
- **Phase 5 (Diff/Migration):** SQL generation edge cases (constraint naming, partial indexes, triggers) — may need iteration

Phases with standard patterns (skip research-phase):
- **Phase 1 (Backend Foundation):** Standard PostgreSQL information_schema queries, follows existing P&E service patterns
- **Phase 2 (Frontend Data Layer):** Standard React Context, existing apiClient patterns
- **Phase 3 (Form-Based Editing):** Standard React forms with existing shadcn/ui components

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | @xyflow/react verified via official docs; native PG queries documented; minimal additions |
| Features | HIGH | Consistent patterns across pgAdmin, DBeaver, dbdiagram.io; user requirements clear |
| Architecture | HIGH | Directly follows existing P&E patterns (services, routes, contexts); verified against codebase |
| Pitfalls | HIGH | PostgreSQL docs, React Flow performance guides, Prisma/Graphile migration safety patterns |

**Overall confidence:** HIGH

### Gaps to Address

- **Visual canvas performance at scale:** Need to test with 20+ tables; may require node collapsing or simplified styling
- **Constraint matching in diff:** Auto-generated constraint names make structural matching necessary; needs iteration during implementation
- **Index management scope:** Decision needed: include indexes in model or handle separately?
- **Trigger preservation:** P&E has one trigger (update_updated_date); decide if migrations should preserve/recreate triggers

## Sources

### Primary (HIGH confidence)
- PostgreSQL Information Schema Documentation — introspection queries
- PostgreSQL System Catalogs Documentation — pg_catalog for PG-specific features
- React Flow Documentation (reactflow.dev) — visualization patterns, performance, v12.10.0 API
- Existing P&E Manager codebase — service patterns, route patterns, migration system

### Secondary (MEDIUM confidence)
- pgAdmin ERD Tool Documentation — workflow patterns
- dbdiagram.io Documentation — form-based editing patterns
- Prisma Migrate Documentation — safety patterns, shadow database concept
- Graphile-migrate — hash verification, safety mechanisms

### Tertiary (LOW confidence)
- DBeaver ER Documentation — exploration patterns
- Knex.js Migrations — constraint comparison edge cases

---
*Research completed: 2026-01-29*
*Ready for roadmap: yes*
