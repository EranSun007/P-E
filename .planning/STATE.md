# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-01-29)

**Core value:** Single dashboard showing health and status across all team tools without switching contexts
**Current focus:** v1.8 Entity Model Viewer — read-only schema visualization as interactive node graph

## Current Position

Phase: Not started (defining requirements)
Plan: —
Status: Researching domain ecosystem
Last activity: 2026-01-29 — Milestone v1.8 started

Progress: Defining milestone...

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

**Total: 8 milestones shipped, 31 phases, 63 plans completed**

**Current Milestone:** v1.8 Entity Model Editor (in progress)

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

### Decisions Made (Phases 29-31)

| ID | Decision | Rationale |
|----|----------|-----------|
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

### Blockers/Concerns

None — all milestones shipped successfully.

## Session Continuity

Last session: 2026-01-29
Stopped at: Phase 31 verified and complete
Resume file: None

## Next Steps

1. Run `/gsd:plan-phase 32` to plan Schema Introspection Backend
2. Execute Phase 32
3. Plan and execute Phase 33 (Visual Canvas)
