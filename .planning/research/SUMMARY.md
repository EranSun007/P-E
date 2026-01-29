# Project Research Summary

**Project:** P&E Manager v1.7 Menu Clustering
**Domain:** Collapsible folder navigation for React sidebar with drag-and-drop configuration
**Researched:** 2026-01-29
**Confidence:** HIGH

## Executive Summary

Menu clustering is a low-risk, high-leverage feature that requires **zero new dependencies**. The existing P&E Manager codebase already contains every library and pattern needed: `@radix-ui/react-collapsible` (v1.1.3) for expand/collapse behavior, `@dnd-kit/core` + `@dnd-kit/sortable` (v6.3.1/v10.0.0) for drag-and-drop item assignment, shadcn/ui sidebar components with `SidebarMenuSub` for nested items, and the `user_settings` table for persisting configuration per user. The architecture integrates cleanly with existing patterns like `AppModeContext` and `UserSettingsService`.

The recommended approach is to store menu configuration as JSON in the existing `user_settings` table (keys: `menu_config_people`, `menu_config_product`), introduce a `NavigationContext` for app-wide state management, and add a "Navigation" tab to Settings.jsx for folder CRUD and item assignment. The flat navigation arrays in Layout.jsx will be transformed to a hierarchical structure using `HierarchicalNavigation` and `CollapsibleFolder` components. This approach maintains backward compatibility: users without custom configuration see the existing flat navigation.

The primary risks are (1) breaking the People/Product mode toggle with shared configuration, (2) dnd-kit ID collisions when rendering drag overlays, and (3) accessibility regression by removing keyboard navigation. All three are well-documented pitfalls with established prevention patterns. The mode separation must be designed into the data model from day one (separate configs per mode). Drag overlay components must be presentational-only (no `useSortable` hooks). Keyboard and screen reader support must be explicitly tested, not assumed from library defaults.

## Key Findings

### Recommended Stack

**No new dependencies required.** All capabilities are already installed and in use elsewhere in the codebase.

**Core technologies (already installed):**
- `@radix-ui/react-collapsible` (v1.1.3): Folder expand/collapse behavior with ARIA compliance
- `@dnd-kit/core` + `@dnd-kit/sortable` (v6.3.1/v10.0.0): Drag-and-drop for item assignment to folders
- `user_settings` table + `UserSettingsService`: Backend persistence of configuration
- shadcn/ui sidebar components (`SidebarMenuSub`, `SidebarMenuSubItem`): Nested navigation styling

**Libraries to NOT add:**
- react-beautiful-dnd (deprecated, @dnd-kit is already superior and installed)
- framer-motion for collapse (Radix Collapsible handles this)
- react-sortable-hoc (legacy, @dnd-kit is the modern replacement)

### Expected Features

**Must have (table stakes):**
- Collapse/expand folders with visual indicator (chevron rotation)
- Persist folder open/closed state across sessions (localStorage)
- Create, rename, and delete folders via Settings UI
- Assign/unassign items to folders
- Separate folder configurations for People and Product modes
- Ungrouped items remain visible at root level
- Items return to root on folder delete (not deleted)

**Should have (differentiators):**
- Drag-and-drop folder reordering in Settings
- Drag-and-drop item assignment (vs. dropdown selection)
- Folder item count badges on collapsed folders
- "Reset to default" option in Settings

**Defer (v2+):**
- Folder icons and color customization
- Nested folders (folders within folders)
- Real-time sync across devices (localStorage is sufficient for v1)
- Accordion mode (only one folder open at a time)

### Architecture Approach

The architecture follows existing P&E Manager patterns: a React Context (`NavigationContext`) provides menu configuration to Layout.jsx and Settings.jsx, backed by the `user_settings` table via `UserSettingsService`. Configuration is loaded on auth, stored as JSON, and updated optimistically with background persistence. The data model separates folder structure from expanded state: structure is persisted to backend, expanded state is local (localStorage) since it's transient UI preference.

**Major components:**
1. **NavigationContext** (new): Centralize menu config state, load from backend, provide `createFolder`, `moveItemToFolder`, `deleteFolder` operations
2. **HierarchicalNavigation** (new): Transform flat array to folder/item hierarchy, render in Layout.jsx
3. **CollapsibleFolder** (new): Wrap Radix Collapsible with sidebar styling, handle active item highlighting within folders
4. **NavigationSettings** (new): Settings tab for folder CRUD and item assignment
5. **Layout.jsx** (modify): Replace flat navigation map with HierarchicalNavigation component

### Critical Pitfalls

1. **ID collision in DragOverlay with useSortable** — Create separate presentational components for drag overlays; never render a component that calls `useSortable` inside `<DragOverlay>`

2. **Breaking mode switching (People/Product)** — Store separate configs per mode (`menu_config_people`, `menu_config_product`); never share folder state between modes

3. **SortableContext items array mismatch** — Derive items array from the same source as render order; use `useMemo` for sorting, never sort inline during render

4. **Orphaned items on folder delete** — Use `ON DELETE SET NULL` in foreign key or explicitly move items to root before deleting folder; always confirm with user and preview behavior

5. **Accessibility regression** — Explicitly add keyboard support for folder expand/collapse; customize dnd-kit announcements for screen readers; manage focus after drag operations

## Implications for Roadmap

Based on research, suggested phase structure:

### Phase 1: Data Layer and Context

**Rationale:** Data model must encode mode separation from day one to prevent Pitfall 4 (breaking mode switching). Context provides foundation for all subsequent UI work.

**Delivers:**
- `NavigationContext.jsx` with default configs for People and Product modes
- `useNavigation()` hook for consuming context
- Integration with `UserSettingsService` for backend persistence
- Loading/saving config via `UserSettings.get()/set()`

**Addresses:** Config persistence (table stake), mode-specific groupings (table stake)

**Avoids:** Pitfall 4 (mode confusion), Pitfall 9 (sync conflicts)

### Phase 2: Collapsible Folder Rendering

**Rationale:** Core visible feature; must work before Settings UI can configure it. Depends on Phase 1 context being complete.

**Delivers:**
- `CollapsibleFolder.jsx` component using Radix Collapsible
- `HierarchicalNavigation.jsx` to transform flat array to hierarchy
- Modified `Layout.jsx` to consume NavigationContext
- Active item highlighting within folders
- Local expanded state persistence (localStorage)

**Uses:** @radix-ui/react-collapsible, shadcn/ui sidebar primitives

**Implements:** HierarchicalNavigation, CollapsibleFolder components

**Avoids:** Pitfall 6 (animation jank) by using Radix Collapsible's built-in animation

### Phase 3: Settings UI (Basic)

**Rationale:** Users need UI to create/delete folders and assign items. Basic functionality without drag-drop is faster to build and lower risk.

**Delivers:**
- "Navigation" tab in Settings.jsx
- Folder CRUD: create, rename, delete folders
- Item assignment via dropdown or click-to-assign
- Reset to defaults button
- Delete confirmation with preview (shows items will move to root)

**Addresses:** Create folders, delete folders, assign items (all table stakes)

**Avoids:** Pitfall 8 (orphaned items) by showing confirmation with behavior preview

### Phase 4: Settings UI (Drag-and-Drop Enhancement)

**Rationale:** Drag-and-drop is differentiator, not table stake. Building on working basic UI reduces risk. dnd-kit patterns already exist in SubtaskList.jsx.

**Delivers:**
- Drag-and-drop item assignment to folders
- Folder reordering via drag-and-drop
- Item reordering within folders
- Touch device support with proper sensor configuration

**Uses:** @dnd-kit/core, @dnd-kit/sortable (reuse SubtaskList patterns)

**Avoids:** Pitfall 1 (ID collision) by using presentational overlay components; Pitfall 2 (items array mismatch) by deriving from single source; Pitfall 7 (stale closures) by using functional state updates

### Phase 5: Accessibility and Polish

**Rationale:** Accessibility must be explicitly verified, not assumed. Polish items improve UX but are not blockers.

**Delivers:**
- Keyboard navigation for folders (Tab, Enter/Space to expand)
- Custom dnd-kit announcements for screen readers
- Focus management after drag operations
- Empty folder visual treatment
- Expand all / Collapse all buttons (optional)

**Addresses:** Keyboard navigation (differentiator), accessibility compliance

**Avoids:** Pitfall 5 (accessibility regression)

### Phase Ordering Rationale

- **Phase 1 before Phase 2:** Context must exist before components can consume it
- **Phase 2 before Phase 3:** Must be able to see folders before configuring them (validates architecture)
- **Phase 3 before Phase 4:** Basic CRUD is table stakes; drag-drop is enhancement layer
- **Phase 5 last:** Accessibility testing happens on working feature, not incrementally (but guidelines should inform Phase 2-4 development)

**Alternative condensed approach:** Phases 3 and 4 can be merged if drag-and-drop is considered essential from start. However, separating them reduces risk and allows earlier user testing.

### Research Flags

**Phases likely needing deeper research during planning:**
- **Phase 4 (DnD Enhancement):** Cross-container drag with multiple SortableContexts is complex; review dnd-kit multi-container examples carefully

**Phases with standard patterns (skip research-phase):**
- **Phase 1:** Standard React Context + API integration pattern
- **Phase 2:** Radix Collapsible is well-documented; existing codebase has example in OneOnOneComplianceCard.jsx
- **Phase 3:** Settings tab pattern already exists in Settings.jsx
- **Phase 5:** dnd-kit accessibility guide provides exact patterns

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | All libraries verified installed via npm list; versions confirmed current or compatible |
| Features | HIGH | Based on codebase analysis of Layout.jsx, Settings.jsx, and standard UI patterns |
| Architecture | HIGH | All integration points verified against existing code; uses established patterns |
| Pitfalls | HIGH | dnd-kit pitfalls from official docs; mode switching from codebase analysis |

**Overall confidence:** HIGH

The research is based entirely on:
1. Direct codebase analysis of P&E Manager (Layout.jsx, Settings.jsx, SubtaskList.jsx, sidebar.jsx, collapsible.jsx)
2. Verified package versions from npm list
3. Official library documentation (@dnd-kit, @radix-ui/react-collapsible)

### Gaps to Address

- **Touch device testing:** dnd-kit touch support is documented but not tested in current P&E Manager usage (SubtaskList may not be used on mobile). Requires manual testing in Phase 4.

- **UserSettings API compatibility:** Research assumes `UserSettings.get(key)`/`UserSettings.set(key, value)` work for arbitrary keys. Verify this during Phase 1 implementation.

- **Large navigation item counts:** Current People mode has 16 items. If this grows significantly (50+), Settings UI may need pagination or search. Not a v1.7 concern but worth noting.

## Sources

### Primary (HIGH confidence)
- P&E Manager codebase:
  - `/src/pages/Layout.jsx` — Navigation arrays (lines 91-228)
  - `/src/pages/Settings.jsx` — Settings tab pattern (lines 272-525)
  - `/src/components/ui/collapsible.jsx` — Radix Collapsible wrapper
  - `/src/components/ui/sidebar.jsx` — SidebarMenuSub components (lines 554-592)
  - `/src/components/sync/SubtaskList.jsx` — Existing @dnd-kit pattern
  - `/src/contexts/AppModeContext.jsx` — Mode switching pattern
  - `/server/services/UserSettingsService.js` — Backend persistence
  - `/server/db/016_github_integration.sql` — user_settings table schema

- npm registry verification (2026-01-29):
  - @dnd-kit/core@6.3.1 (latest)
  - @dnd-kit/sortable@10.0.0 (latest)
  - @radix-ui/react-collapsible@1.1.3 (compatible with latest 1.1.12)

### Secondary (MEDIUM confidence)
- dnd-kit Sortable Documentation — ID collision patterns, items array ordering
- dnd-kit Accessibility Guide — Screen reader announcements, keyboard support
- Radix UI Collapsible — CSS animation variables, ARIA attributes

### Tertiary (LOW confidence)
- None — all patterns verified against existing codebase or official documentation

---
*Research completed: 2026-01-29*
*Ready for roadmap: yes*
