# Feature Landscape: Menu Clustering / Folder Navigation

**Domain:** Collapsible folder navigation for admin dashboard sidebar
**Researched:** 2026-01-29
**Confidence:** HIGH (based on existing codebase analysis and authoritative UI documentation)

## Context

P&E Manager has a sidebar navigation with:
- **People mode:** 16 navigation items
- **Product mode:** 6 navigation items

The user wants to organize these items into collapsible folders configurable via Settings UI.

### Current State Analysis

**Existing Navigation (Layout.jsx):**
- Flat list of navigation items
- Each item has: name, icon, href, current (boolean)
- Two separate arrays: `peopleNavigation` and `productNavigation`
- Items rendered as `<Link>` components with Lucide icons

**Available Components:**
- `@radix-ui/react-collapsible` (v1.1.11) - Already installed
- `@radix-ui/react-accordion` (v1.1.11) - Already installed
- `@dnd-kit/core` and `@dnd-kit/sortable` - Used in SubtaskList for drag-drop reordering

**Existing Patterns:**
- `AppModeContext.jsx` - localStorage persistence pattern with `pe_manager_` prefix
- `user_settings` table - Key-value store for user preferences (supports encrypted values)
- Settings page with tabs pattern for configuration UI

---

## Table Stakes

Features users expect. Missing = product feels incomplete for folder navigation.

| Feature | Why Expected | Complexity | Dependencies | Notes |
|---------|--------------|------------|--------------|-------|
| Collapse/expand folders | Core interaction pattern for folder navigation | Low | Radix Collapsible (installed) | Use existing `<Collapsible>` component |
| Visual collapse indicator | Users need affordance showing expand/collapse state | Low | Lucide ChevronDown icon | Rotate on expand (existing pattern in Accordion) |
| Persist folder open/closed state | User expects folders to stay open/closed on refresh | Low | localStorage or user_settings table | Follow AppModeContext pattern |
| Folder labels | Folders need descriptive names | Low | None | Plain text input in Settings |
| Create folders | User must be able to create groupings | Medium | Settings UI, state management | Modal or inline form |
| Assign items to folders | Core functionality - moving items into folders | Medium | Settings UI, drag-drop or select | Either drag-drop or dropdown selection |
| Ungrouped items section | Items not in any folder must remain visible | Low | None | Render at root level or "Ungrouped" pseudo-folder |
| Mode-specific groupings | People vs Product modes have different items | Low | Existing `isProductMode` context | Store separate configs per mode |
| Delete folders | User must be able to remove groupings | Low | Confirmation dialog (existing pattern) | Items return to ungrouped |
| Empty folder handling | Folders with no items need visual treatment | Low | None | Either hide or show "empty" state |

---

## Differentiators

Features that set product apart. Not expected by default, but valued when present.

| Feature | Value Proposition | Complexity | Dependencies | Notes |
|---------|-------------------|------------|--------------|-------|
| Drag-drop folder reordering | Power users can customize folder order | Medium | @dnd-kit (installed) | Reuse SubtaskList pattern |
| Drag-drop item assignment | Intuitive way to move items into folders | High | @dnd-kit with drop targets | More complex than list reordering |
| Folder icons | Visual customization for folders | Low | Lucide icon picker | Optional enhancement |
| Folder colors | Visual grouping differentiation | Low | Color picker (existing in Settings) | Reuse TaskAttribute color system |
| Expand all / Collapse all | Quick navigation control | Low | Simple state toggle | Button in sidebar header |
| Remember scroll position | Preserves context when switching modes | Low | localStorage | Minor UX polish |
| Default expanded folders | Set which folders open by default for new sessions | Low | Settings checkbox | Config stored in user_settings |
| Keyboard navigation | Accessibility: arrow keys to navigate folders | Medium | ARIA patterns, focus management | Important for a11y compliance |
| Auto-collapse others (accordion mode) | Only one folder open at a time | Low | Accordion vs Collapsible choice | User preference in Settings |
| Folder item count badges | Show number of items in collapsed folder | Low | Computed value | Nice-to-have visual feedback |
| Quick add item to folder | Right-click or button to add new nav item | High | Complex UI, affects core nav | Probably not needed - nav items are fixed |

---

## Anti-Features

Features to explicitly NOT build. Common mistakes in this domain.

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| Nested folders (folders within folders) | Over-complexity for 16-22 items; increases cognitive load | Single level of grouping only |
| Dynamic navigation items | Users should not create new pages from Settings | Keep navigation items fixed; only grouping is configurable |
| Per-item visibility toggle | Hiding nav items creates confusion about app capabilities | All items always visible, just organized into folders |
| Complex folder permissions | Admin-only vs user folders adds unnecessary complexity | All users have same navigation, each user configures their own groupings |
| Sync folder config across devices | localStorage is simpler; user_settings sync adds complexity | localStorage for v1; consider sync as future enhancement |
| Animated folder transitions beyond collapse | Complex animations slow down navigation | Simple CSS transitions only (rotate chevron, slide content) |
| Folder search/filter | Overkill for 16 items; adds UI clutter | Just use collapse/expand |
| Mandatory folder assignment | Some items work fine ungrouped | Allow mix of folders and ungrouped items |
| Lock folder order | No good reason to prevent reordering | Allow full customization |
| Real-time collaboration on folder structure | Adds complexity, user-specific anyway | Each user has their own folder config |

---

## Feature Dependencies

```
Core Flow (must implement in order):
  1. Folder data model (config structure)
     |
     v
  2. Create/Delete folders (Settings UI)
     |
     v
  3. Assign items to folders (Settings UI)
     |
     v
  4. Render collapsible folders (Layout.jsx)
     |
     v
  5. Persist open/closed state (localStorage)

Optional Enhancements (can add independently):
  - Drag-drop reordering (depends on: folder data model)
  - Folder icons/colors (depends on: Settings UI)
  - Keyboard navigation (depends on: folder rendering)
```

---

## MVP Recommendation

For MVP, prioritize these features:

### Must Have (Phase 1)
1. **Create folders** - Settings UI with name input
2. **Assign items to folders** - Dropdown or multi-select in Settings
3. **Render collapsible folders** - Use Radix Collapsible in Layout.jsx
4. **Persist folder config** - localStorage with AppModeContext pattern
5. **Persist open/closed state** - localStorage
6. **Delete folders** - With confirmation dialog

### Defer to Post-MVP
- **Drag-drop folder reordering** - Nice but not essential
- **Drag-drop item assignment** - Complex; dropdown is simpler
- **Folder icons/colors** - Visual polish
- **Keyboard navigation** - Important but can follow
- **Sync to database** - localStorage is sufficient for single device

---

## Configuration Data Model

Recommended structure for folder configuration:

```typescript
interface FolderConfig {
  id: string;                    // UUID
  name: string;                  // "Work Management"
  items: string[];              // ["Tasks", "Calendar", "Projects"]
  order: number;                // Display order (1, 2, 3...)
  icon?: string;                // Optional: Lucide icon name
  color?: string;               // Optional: Tailwind color
  defaultExpanded?: boolean;    // Whether to expand by default
}

interface NavigationConfig {
  version: number;              // Schema version for migrations
  peopleMode: {
    folders: FolderConfig[];
    ungroupedItems: string[];   // Items not in any folder
  };
  productMode: {
    folders: FolderConfig[];
    ungroupedItems: string[];
  };
}

// Separate state for open/closed (changes frequently):
interface FolderExpandState {
  [folderId: string]: boolean;
}
```

**Storage Keys:**
- `pe_manager_nav_config` - NavigationConfig (rarely changes)
- `pe_manager_folder_state_people` - FolderExpandState for People mode
- `pe_manager_folder_state_product` - FolderExpandState for Product mode

---

## Settings UI Recommendation

Add a new Settings tab: **"Navigation"**

**Tab Contents:**
1. Mode toggle (People / Product) - to configure each mode separately
2. Folder list with:
   - Folder name (editable)
   - Delete button
   - Drag handle (if implementing reorder)
3. "Add Folder" button
4. Item assignment:
   - For each folder: multi-select dropdown of nav items
   - OR drag-drop interface
5. Preview of current navigation structure (optional)

**Suggested Tab Position:** After "Tags" and before "Account"

---

## Implementation Complexity Estimates

| Component | Complexity | Effort | Notes |
|-----------|------------|--------|-------|
| NavigationConfig context/hook | Low | 2h | Similar to AppModeContext |
| Settings "Navigation" tab | Medium | 4h | Multi-select for item assignment |
| CollapsibleNavFolder component | Low | 2h | Wrapper around Radix Collapsible |
| Layout.jsx integration | Medium | 3h | Transform flat list to folder structure |
| localStorage persistence | Low | 1h | Existing pattern |
| Folder expand state persistence | Low | 1h | Separate from config |
| Add/delete folder logic | Low | 1h | CRUD operations |
| Default config seeding | Low | 1h | Pre-populate sensible defaults |

**Total estimated effort:** ~15 hours for MVP

---

## Expected Behavior Patterns

Based on research of shadcn/ui Sidebar, Ant Design Menu, Chakra UI Accordion, and Radix UI patterns:

### Collapsible State Behavior

| Scenario | Expected Behavior |
|----------|-------------------|
| Click folder header | Toggle open/closed state |
| Page refresh | Restore previous open/closed state from localStorage |
| Click nav item inside folder | Navigate to page, folder stays open |
| Switch app mode (People/Product) | Load that mode's folder config and expand state |
| New folder created | Default to expanded |
| Folder deleted | Items move to ungrouped section |

### Visual Indicators

| State | Visual Treatment |
|-------|------------------|
| Folder collapsed | Chevron pointing right, content hidden |
| Folder expanded | Chevron pointing down, content visible |
| Current page in folder | Folder auto-expanded, item highlighted |
| Empty folder | Show "(empty)" or hide entirely (configurable) |

### Animation Recommendations

- **Chevron rotation:** 200ms ease-in-out (existing Accordion pattern)
- **Content slide:** 200ms ease-in-out for height transition
- **No complex animations:** Keep navigation fast and responsive

---

## Accessibility Considerations

| Feature | Implementation |
|---------|----------------|
| Keyboard navigation | Arrow keys to move between folders/items |
| Focus management | Focus trap within expanded folder |
| ARIA attributes | `aria-expanded`, `aria-controls`, `aria-labelledby` |
| Screen reader support | Announce folder names and item counts |
| Reduced motion | Respect `prefers-reduced-motion` media query |

**Note:** Radix Collapsible handles most ARIA attributes automatically.

---

## Sources

**Codebase Analysis (HIGH confidence):**
- `/Users/i306072/Documents/GitHub/P-E/src/pages/Layout.jsx` - Current navigation structure
- `/Users/i306072/Documents/GitHub/P-E/src/pages/Settings.jsx` - Settings tab pattern
- `/Users/i306072/Documents/GitHub/P-E/src/contexts/AppModeContext.jsx` - localStorage persistence pattern
- `/Users/i306072/Documents/GitHub/P-E/src/components/ui/collapsible.jsx` - Available Radix component
- `/Users/i306072/Documents/GitHub/P-E/src/components/sync/SubtaskList.jsx` - @dnd-kit usage pattern
- `/Users/i306072/Documents/GitHub/P-E/server/db/016_github_integration.sql` - user_settings table structure

**External Documentation (MEDIUM confidence):**
- Radix UI Navigation Menu - Best practices for navigation patterns, accessibility
- shadcn/ui Sidebar component - Collapsible states, nested menus, persisted state via cookies
- Chakra UI Accordion - Multiple expansion modes, default state control
- Ant Design Menu - Group functionality, sub-menu support, collapsed states
