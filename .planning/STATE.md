# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-01-29)

**Core value:** Single dashboard showing health and status across all team tools without switching contexts
**Current focus:** v1.8 Entity Model Viewer — read-only schema visualization as interactive node graph

## Current Position

Phase: 33 of 33 (33-visual-canvas)
Plan: 2 of 2 in phase
Status: Phase complete
Last activity: 2026-01-29 — Completed 33-02-PLAN.md

Progress: [████████████████████████████████████████████████████████████████████] 67/67 plans (100%)

## Milestone Summary

**Shipped Milestones:**
- v1.0 Jira Integration (Phases 1-5, 10 plans) — 2026-01-21
- v1.1 Web Capture Framework (Phases 6-9, 9 plans) — 2026-01-22
- v1.2 DevOps Bug Dashboard (Phases 10-12, 5 plans) — 2026-01-28
- v1.3 KPI Insights & Alerts (Phases 13-16, 7 plans) — 2026-01-28
- v1.4 Bug Dashboard Fixes (Phases 17-18, 4 plans) — 2026-01-28
- v1.5 Knowledge Base Integration (Phases 19-22, 10 plans) — 2026-01-29
- v1.6 TeamSync Integration (Phases 23-27, 11 plans) — 2026-01-29
- v1.7 Menu Clustering (Phases 28-31, 7 plans) — 2026-01-29
- v1.8 Entity Model Viewer (Phases 32-33, 4 plans) — 2026-01-29

**Total: 9 milestones shipped, 33 phases, 67 plans completed**

**Current Milestone:** v1.8 Entity Model Viewer (COMPLETE - all 2 phases shipped)

## Performance Metrics

**v1.0-v1.7:** All shipped in 9 days (2026-01-21 to 2026-01-29)

## Accumulated Context

### Key Patterns Established

- Table extension pattern with ADD COLUMN IF NOT EXISTS
- JSONB for audit trails (status_history)
- Optimistic updates with rollback for better UX
- Route ordering: specific routes before generic /:id
- camelCase/snake_case conversion at service layer boundary
- @dnd-kit for accessible drag-and-drop
- @radix-ui/react-collapsible for expand/collapse (already installed)
- JSON config storage in user_settings (menu_config_{mode})
- Context with parallel mode config loading (NavigationContext pattern)
- Settings tab component pattern with Card layout (NavigationSettings)
- Select dropdown for item-to-folder assignment
- Preview visualization pattern for navigation configuration
- DnD state transformation pattern (buildItemContainers, findItemContainer)
- DroppableContainer component with hover highlights
- DragOverlay for visual feedback during drag operations
- useCollapsedFolders hook pattern (localStorage + mode-aware keys)
- CollapsibleFolder component wrapping Radix Collapsible
- HierarchicalNavigation component grouping items by folder
- ReactFlow canvas pattern with custom node types
- Schema data transformation (API → graph nodes/edges)
- Details panel sidebar pattern with Card components
- Click handler pattern with useCallback hooks
- Enhanced edge styling with MarkerType.ArrowClosed

### Decisions Made (Phases 29-33)

| ID | Decision | Rationale |
|----|----------|-----------|
| schema-introspection-approach | information_schema views for portability | SQL-standard over pg_catalog queries |
| schema-response-format | camelCase keys in API responses | Frontend consistency, friendlier than snake_case |
| schema-parallel-fetch | Promise.all() for metadata queries | Performance optimization, 60ms vs 250ms+ |
| constraint-grouping | Multi-column constraints as column arrays | Group by constraint_name, not separate rows |
| schema-routes-no-auth | No authentication for schema routes | Schema metadata is global and read-only |
| schema-404-on-missing | 404 status for non-existent tables | Clear error over empty 200 response |
| uuid-generation | crypto.randomUUID() for folder IDs | Native browser API, no dependency |
| folder-order | New folder order = max existing + 1 | New folders appear at end |
| delete-behavior | Delete folder sets items folderId to null | Items move to root level |
| menu-items-inline | PEOPLE_MENU_ITEMS/PRODUCT_MENU_ITEMS defined in component | Match Layout.jsx navigation arrays |
| root-representation | "root" value in Select for root level | Clear UX, null removal on save |
| dnd-architecture | Single DndContext for folders, separate for items | Isolated concerns, cleaner state management |
| dnd-save-timing | saveConfig in onDragEnd, not onDragOver | Persist after drag completes, not during |
| dnd-transform | itemContainers state with buildItemContainers() | Transform context to DnD format in real-time |
| dnd-rollback | setItemContainers(buildItemContainers()) on error | Rollback to context state on save failure |
| collapsed-storage | Store collapsed IDs (not expanded) | Opt-in to collapse, empty array = all expanded |
| mode-reread | Re-read localStorage when mode changes | Independent collapse state per mode |
| item-match-by-name | Match navigation items by name property | Layout.jsx uses name as identifier |
| skip-empty-folders | Don't render folders with no items | Cleaner UI without empty groups |
| animation-keyframes | collapsible-down/up in tailwind.config.js | Smooth height transitions using Radix CSS variables |
| reactflow-grid-layout | Grid positioning (4 columns per row) | Simple initial layout, can add auto-layout later |
| entity-node-memoization | Memoized custom node component | Performance optimization for many nodes |
| entity-model-product-mode | Entity Model in Product mode only | Schema visualization is product/engineering tool |
| reactflow-height-requirement | Explicit height on ReactFlow parent | ReactFlow requires explicit height to render |
| details-panel-sidebar | Fixed-width sidebar (w-96) on right | Keeps canvas visible while viewing details |
| click-away-close | onPaneClick closes details panel | More intuitive than requiring X button |
| edge-arrows-style | MarkerType.ArrowClosed with slate color | Clear directional indication of FK relationships |
| section-based-details | 5 Card sections for schema info | Organized display: Columns, PK, FK, Indexes, Constraints |

### Blockers/Concerns

None — all milestones shipped successfully.

## Session Continuity

Last session: 2026-01-29
Stopped at: Phase 33 complete (33-02-PLAN.md) - ALL PHASES COMPLETE
Resume file: None

## Next Steps

v1.8 Entity Model Viewer COMPLETE! All 33 phases shipped (100%).

**Latest features (Plan 33-02):**
- Interactive click-to-view entity details panel
- Enhanced edge visualization with arrows and styled labels
- Comprehensive schema information display (Columns, PK, FK, Indexes, Constraints)
- Click-away behavior for intuitive panel closing

Project ready for next milestone planning.
