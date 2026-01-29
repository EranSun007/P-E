# Requirements: P&E Manager v1.7 Menu Clustering

**Defined:** 2026-01-29
**Core Value:** Single dashboard showing health and status across all team tools without switching contexts

## v1.7 Requirements

Requirements for Menu Clustering milestone. Each maps to roadmap phases.

### Data Layer

- [x] **DATA-01**: Menu folder configuration stored in user_settings table as JSON
- [x] **DATA-02**: Separate configurations for People and Product navigation modes
- [x] **DATA-03**: Folder expand/collapse state persisted in localStorage

### Folder Management (Settings UI)

- [x] **FOLDER-01**: User can create a folder with a name
- [x] **FOLDER-02**: User can rename an existing folder
- [x] **FOLDER-03**: User can delete a folder (items return to root level)
- [x] **FOLDER-04**: User can assign menu items to folders via dropdown
- [x] **FOLDER-05**: User can remove items from folders
- [x] **FOLDER-06**: User can drag-and-drop items between folders and root
- [x] **FOLDER-07**: User can reorder folders via drag-and-drop
- [x] **FOLDER-08**: User can reorder items within a folder via drag-and-drop

### Navigation Rendering

- [x] **NAV-01**: Sidebar displays collapsible folder groups with nested items
- [x] **NAV-02**: User can click folder to expand/collapse nested items
- [x] **NAV-03**: Chevron icon indicates folder expand/collapse state
- [x] **NAV-04**: Folder expand/collapse has smooth CSS animation
- [x] **NAV-05**: Expand/collapse state persists across page reloads
- [x] **NAV-06**: Folders work in both People and Product navigation modes
- [x] **NAV-07**: Items not assigned to folders display at root level

### Backend API

- [x] **API-01**: GET /api/menu-config returns user's menu configuration
- [x] **API-02**: PUT /api/menu-config saves updated menu configuration
- [x] **API-03**: Menu config scoped to user_id (multi-tenancy)

## Future Requirements (v1.8+)

### Enhancements

- **ENH-01**: Folder icons (select from Lucide icon library)
- **ENH-02**: Folder colors/themes
- **ENH-03**: Auto-expand folder containing current page on navigation
- **ENH-04**: Keyboard navigation (Enter/Space to toggle folders)
- **ENH-05**: Suggested folder presets (e.g., "Capture" group, "External Tools" group)

## Out of Scope

| Feature | Reason |
|---------|--------|
| Nested folders (folders within folders) | High complexity, limited value for 13-item menu |
| Dynamic navigation items | Menu items are code-defined, not user-configurable |
| Per-item visibility toggle | Out of scope for clustering feature |
| Cross-device sync | User settings already handle this via backend |
| Real-time collaborative editing | Single-user configuration |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| DATA-01 | Phase 28 | Complete |
| DATA-02 | Phase 28 | Complete |
| DATA-03 | Phase 28 | Complete |
| API-01 | Phase 28 | Complete |
| API-02 | Phase 28 | Complete |
| API-03 | Phase 28 | Complete |
| FOLDER-01 | Phase 29 | Complete |
| FOLDER-02 | Phase 29 | Complete |
| FOLDER-03 | Phase 29 | Complete |
| FOLDER-04 | Phase 29 | Complete |
| FOLDER-05 | Phase 29 | Complete |
| FOLDER-06 | Phase 30 | Complete |
| FOLDER-07 | Phase 30 | Complete |
| FOLDER-08 | Phase 30 | Complete |
| NAV-01 | Phase 31 | Complete |
| NAV-02 | Phase 31 | Complete |
| NAV-03 | Phase 31 | Complete |
| NAV-04 | Phase 31 | Complete |
| NAV-05 | Phase 31 | Complete |
| NAV-06 | Phase 31 | Complete |
| NAV-07 | Phase 31 | Complete |

**Coverage:**
- v1.7 requirements: 18 total
- Mapped to phases: 18
- Unmapped: 0

---
*Requirements defined: 2026-01-29*
*Roadmap created: 2026-01-29*
