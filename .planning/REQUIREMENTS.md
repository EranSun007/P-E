# Requirements: P&E Manager v1.8 Entity Model Viewer

**Defined:** 2026-01-29
**Core Value:** Single dashboard showing health and status across all team tools without switching contexts

## v1.8 Requirements

Requirements for Entity Model Viewer milestone. Read-only schema visualization.

### Schema Introspection

- [ ] **INTRO-01**: System automatically reads all PostgreSQL tables in the database
- [ ] **INTRO-02**: System reads columns with types, nullable, defaults for each table
- [ ] **INTRO-03**: System reads foreign key relationships between tables
- [ ] **INTRO-04**: System reads indexes and constraints

### Visual Canvas

- [ ] **CANVAS-01**: Entities display as nodes with field lists visible
- [ ] **CANVAS-02**: Foreign key relationships display as connecting edges
- [ ] **CANVAS-03**: User can pan and zoom the canvas
- [ ] **CANVAS-04**: User can click entity node to view details (fields, types, constraints)

### Navigation

- [ ] **NAV-01**: Entity Model page accessible from sidebar navigation
- [ ] **NAV-02**: Page loads and displays schema on mount

## Future Requirements (v1.9+)

### Editing & Migration (if needed later)

- **EDIT-01**: User can create entity definitions
- **EDIT-02**: User can define relationships
- **DIFF-01**: Show current vs target diff
- **DIFF-02**: Generate migration SQL

### Enhancements

- **ENH-01**: Introspection result caching for performance
- **ENH-02**: PostgreSQL-specific type detection (JSONB, UUID, arrays)
- **ENH-03**: Auto-layout algorithm for graph
- **ENH-04**: Drag nodes to rearrange
- **ENH-05**: Highlight related entities on hover
- **ENH-06**: Add annotations/notes to entities
- **ENH-07**: Export diagram as image

## Out of Scope

| Feature | Reason |
|---------|--------|
| Entity editing in UI | Use code agent for schema changes |
| Migration generation | Use code agent to write SQL |
| Target model storage | No target concept in read-only mode |
| Real-time schema sync | Manual refresh sufficient |
| Multiple database support | Single database only |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| INTRO-01 | Phase 32 | Pending |
| INTRO-02 | Phase 32 | Pending |
| INTRO-03 | Phase 32 | Pending |
| INTRO-04 | Phase 32 | Pending |
| NAV-01 | Phase 33 | Pending |
| NAV-02 | Phase 33 | Pending |
| CANVAS-01 | Phase 33 | Pending |
| CANVAS-02 | Phase 33 | Pending |
| CANVAS-03 | Phase 33 | Pending |
| CANVAS-04 | Phase 33 | Pending |

**Coverage:**
- v1.8 requirements: 10 total
- Mapped to phases: 10
- Unmapped: 0

---
*Requirements defined: 2026-01-29*
*Roadmap created: 2026-01-29*
