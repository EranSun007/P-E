# Requirements: P&E Manager v1.8 Entity Model Editor

**Defined:** 2026-01-29
**Core Value:** Single dashboard showing health and status across all team tools without switching contexts

## v1.8 Requirements

Requirements for Entity Model Editor milestone. Each maps to roadmap phases.

### Schema Introspection

- [ ] **INTRO-01**: System automatically reads all PostgreSQL tables in the database
- [ ] **INTRO-02**: System reads columns with types, nullable, defaults for each table
- [ ] **INTRO-03**: System reads foreign key relationships between tables
- [ ] **INTRO-04**: System reads indexes and constraints
- [ ] **INTRO-05**: Current schema displays as interactive node graph

### Entity Editing

- [ ] **EDIT-01**: User can create a new entity definition with name
- [ ] **EDIT-02**: User can add fields to entity with type, nullable, default
- [ ] **EDIT-03**: User can define foreign key relationships to other entities
- [ ] **EDIT-04**: User can edit existing entity definitions in target model
- [ ] **EDIT-05**: User can delete entities from target model

### Visual Canvas

- [ ] **CANVAS-01**: Entities display as nodes with field lists visible
- [ ] **CANVAS-02**: Foreign key relationships display as connecting edges
- [ ] **CANVAS-03**: User can pan and zoom the canvas
- [ ] **CANVAS-04**: User can click entity node to select and view/edit

### Diff & Migration

- [ ] **DIFF-01**: System shows differences between current schema and target model
- [ ] **DIFF-02**: Differences are color-coded (green=add, red=remove, yellow=modify)
- [ ] **DIFF-03**: System generates SQL migration file from diff
- [ ] **DIFF-04**: User can preview generated SQL before saving

### Safety

- [ ] **SAFE-01**: System tables (migrations, user_settings) are protected from editing
- [ ] **SAFE-02**: Destructive operations require explicit confirmation
- [ ] **SAFE-03**: Migrations are generated as files only (no auto-execute)

### Storage

- [ ] **STORE-01**: Entity model definitions stored in PostgreSQL table
- [ ] **STORE-02**: Model scoped to user_id (multi-tenancy)
- [ ] **STORE-03**: API endpoints for CRUD operations on entity models

## Future Requirements (v1.9+)

### Enhancements

- **ENH-01**: Introspection result caching for performance
- **ENH-02**: PostgreSQL-specific type detection (JSONB, UUID, arrays)
- **ENH-03**: Field type autocomplete in forms
- **ENH-04**: Common pattern templates (timestamps, soft-delete, audit)
- **ENH-05**: Auto-layout algorithm for graph
- **ENH-06**: Drag nodes to rearrange
- **ENH-07**: Highlight related entities on hover
- **ENH-08**: Categorize changes by risk (safe vs destructive)
- **ENH-09**: Support for ALTER column type migrations

## Out of Scope

| Feature | Reason |
|---------|--------|
| Real-time collaborative editing | Single-user configuration |
| Multiple named target models | One target model per user sufficient for v1 |
| Migration rollback generation | Complex, defer to v2 |
| Index management in editor | Tables/columns first, indexes via SQL |
| Trigger/function editing | Too complex, out of scope |
| Cross-database schema comparison | Single database only |
| Auto-execute migrations | Safety concern, file-only |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| INTRO-01 | Phase 32 | Pending |
| INTRO-02 | Phase 32 | Pending |
| INTRO-03 | Phase 32 | Pending |
| INTRO-04 | Phase 32 | Pending |
| STORE-01 | Phase 32 | Pending |
| STORE-02 | Phase 32 | Pending |
| STORE-03 | Phase 32 | Pending |
| INTRO-05 | Phase 33 | Pending |
| CANVAS-01 | Phase 33 | Pending |
| CANVAS-02 | Phase 33 | Pending |
| CANVAS-03 | Phase 33 | Pending |
| CANVAS-04 | Phase 33 | Pending |
| EDIT-01 | Phase 34 | Pending |
| EDIT-02 | Phase 34 | Pending |
| EDIT-03 | Phase 34 | Pending |
| EDIT-04 | Phase 34 | Pending |
| EDIT-05 | Phase 34 | Pending |
| DIFF-01 | Phase 35 | Pending |
| DIFF-02 | Phase 35 | Pending |
| DIFF-03 | Phase 35 | Pending |
| DIFF-04 | Phase 35 | Pending |
| SAFE-01 | Phase 35 | Pending |
| SAFE-02 | Phase 35 | Pending |
| SAFE-03 | Phase 35 | Pending |

**Coverage:**
- v1.8 requirements: 21 total
- Mapped to phases: 21
- Unmapped: 0

---
*Requirements defined: 2026-01-29*
*Roadmap created: 2026-01-29*
