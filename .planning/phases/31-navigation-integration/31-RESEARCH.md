# Phase 31: Navigation Integration - Research

**Researched:** 2026-01-29
**Domain:** React sidebar navigation with collapsible folder groups and persistent state
**Confidence:** HIGH

## Summary

Phase 31 integrates NavigationContext configuration into the Layout.jsx sidebar by replacing the flat menu list with collapsible folder groups. Users can expand/collapse folders by clicking headers, with state persisting across page reloads via localStorage.

The codebase already has all required dependencies:
- @radix-ui/react-collapsible v1.1.3 for accessible collapsible components
- Existing localStorage patterns in DisplayModeContext and AppModeContext
- NavigationContext providing folders and items configuration for both people/product modes

The key technical components are:
1. **Radix Collapsible** - Accessible expand/collapse with built-in ARIA attributes and keyboard support
2. **localStorage persistence** - Per-mode collapse state (people/product navigation states stored separately)
3. **Tailwind animations** - Smooth chevron rotation using `transition-transform` and `rotate-180` classes
4. **Hierarchical rendering** - Transform flat items array into folder-grouped structure

**Primary recommendation:** Use controlled Radix Collapsible components with chevron icons that rotate 180° on expand. Store collapse state in localStorage as `pe_manager_nav_collapsed_folders_<mode>` with JSON array of collapsed folder IDs.

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| @radix-ui/react-collapsible | 1.1.3 | Accessible collapsible component | WAI-ARIA compliant, built-in keyboard nav, data attributes for CSS |
| localStorage API | Native | Persist expand/collapse state | Browser standard, synchronous, simple API |
| Tailwind CSS | 3.4.17 | Chevron rotation animations | Utility classes for transitions and transforms |

**Status:** All dependencies already installed ✅

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| lucide-react | 0.475.0 | ChevronDown/ChevronRight icons | Already used throughout Layout.jsx |

### Key Imports
```javascript
// Collapsible
import {
  Collapsible,
  CollapsibleTrigger,
  CollapsibleContent
} from "@/components/ui/collapsible";

// Icons
import { ChevronDown } from "lucide-react";

// Context
import { useNavigation } from "@/contexts/NavigationContext";
import { useAppMode } from "@/contexts/AppModeContext";
```

## Architecture Patterns

### Recommended Component Structure

```
Layout.jsx (existing)
├── Sidebar navigation (lines 245-322)
│   ├── FolderGroup (new component)
│   │   ├── Collapsible (Radix)
│   │   │   ├── CollapsibleTrigger (folder header with chevron)
│   │   │   └── CollapsibleContent (nested menu items)
│   └── RootMenuItem (items not in folders)
├── useCollapsedFolders hook (new)
│   ├── localStorage: pe_manager_nav_collapsed_folders_people
│   └── localStorage: pe_manager_nav_collapsed_folders_product
```

**Integration point:** Replace existing `navigation.map()` (line 301) with hierarchical render logic.

### Pattern 1: Controlled Collapsible with Persistent State

**What:** Radix Collapsible in controlled mode with localStorage persistence

**When to use:** User preference that should persist across sessions (like theme or mode)

**Example:**
```jsx
// Source: Radix Collapsible docs + DisplayModeContext pattern
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from '@/components/ui/collapsible';
import { ChevronDown } from 'lucide-react';

const STORAGE_KEY_PREFIX = 'pe_manager_nav_collapsed_folders';

function useCollapsedFolders() {
  const { currentMode } = useAppMode();
  const storageKey = `${STORAGE_KEY_PREFIX}_${currentMode}`;

  const [collapsedFolders, setCollapsedFolders] = useState(() => {
    try {
      const stored = localStorage.getItem(storageKey);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(collapsedFolders));
    } catch (error) {
      console.error('Failed to persist folder state:', error);
    }
  }, [collapsedFolders, storageKey]);

  const isCollapsed = (folderId) => collapsedFolders.includes(folderId);

  const toggleFolder = (folderId) => {
    setCollapsedFolders(prev =>
      prev.includes(folderId)
        ? prev.filter(id => id !== folderId)
        : [...prev, folderId]
    );
  };

  return { isCollapsed, toggleFolder };
}

function FolderGroup({ folder, items }) {
  const { isCollapsed, toggleFolder } = useCollapsedFolders();
  const isOpen = !isCollapsed(folder.id);

  return (
    <Collapsible open={isOpen} onOpenChange={() => toggleFolder(folder.id)}>
      <CollapsibleTrigger className="flex items-center w-full px-4 py-2">
        <ChevronDown
          className={cn(
            "h-4 w-4 mr-2 transition-transform duration-200",
            isOpen ? "rotate-0" : "-rotate-90"
          )}
        />
        <span>{folder.name}</span>
      </CollapsibleTrigger>
      <CollapsibleContent>
        {items.map(item => (
          <MenuItem key={item.id} item={item} />
        ))}
      </CollapsibleContent>
    </Collapsible>
  );
}
```

**Key points:**
- Controlled mode: `open={isOpen}` and `onOpenChange={handler}`
- Separate localStorage keys per mode (people/product)
- Store array of collapsed folder IDs, not expanded (opt-in to collapse)
- Error handling with try-catch on localStorage operations

### Pattern 2: Chevron Rotation Animation

**What:** Smooth 90° rotation for chevron icon indicating expand/collapse state

**When to use:** All collapsible UI elements with directional indicators

**Example:**
```jsx
// Source: Tailwind CSS rotate docs
<ChevronDown
  className={cn(
    "h-4 w-4 transition-transform duration-200",
    isOpen ? "rotate-0" : "-rotate-90"
  )}
/>
```

**Variations:**
```jsx
// 180° rotation (chevron points up when open)
className={isOpen ? "rotate-180" : "rotate-0"}

// Slower animation
className={cn("transition-transform duration-300", ...)}

// Ease-in-out timing
className={cn("transition-transform ease-in-out", ...)}
```

**Accessibility:** Icon rotation is purely visual - Radix Collapsible handles `aria-expanded` automatically.

### Pattern 3: Hierarchical Navigation Rendering

**What:** Transform flat config structure into folder-grouped menu hierarchy

**When to use:** Rendering navigation from NavigationContext folders/items arrays

**Example:**
```jsx
// Source: NavigationContext structure
import { useNavigation } from "@/contexts/NavigationContext";

function HierarchicalNavigation({ navigation }) {
  const { folders, items } = useNavigation();

  // Group items by folder
  const itemsByFolder = navigation.reduce((acc, navItem) => {
    const assignment = items.find(i => i.itemId === navItem.id);
    const folderId = assignment?.folderId || 'root';
    if (!acc[folderId]) acc[folderId] = [];
    acc[folderId].push(navItem);
    return acc;
  }, {});

  // Sort folders by order field
  const sortedFolders = [...folders].sort((a, b) => a.order - b.order);

  return (
    <>
      {/* Render folders with items */}
      {sortedFolders.map(folder => (
        <FolderGroup
          key={folder.id}
          folder={folder}
          items={itemsByFolder[folder.id] || []}
        />
      ))}

      {/* Render root-level items (not in any folder) */}
      {(itemsByFolder.root || []).map(item => (
        <MenuItem key={item.id} item={item} />
      ))}
    </>
  );
}
```

**Key points:**
- Preserve existing navigation array structure (peopleNavigation/productNavigation)
- Join with NavigationContext items via `itemId` field
- Items without assignment remain at root level
- Sort folders by `order` field (1, 2, 3...)

### Pattern 4: Mode-Aware State Management

**What:** Separate collapse state for people mode vs. product mode

**When to use:** Features that differ between dual-persona modes

**Example:**
```jsx
// Source: AppModeContext + DisplayModeContext patterns
const { isProductMode, currentMode } = useAppMode();

// Storage keys:
// - pe_manager_nav_collapsed_folders_people
// - pe_manager_nav_collapsed_folders_product

const storageKey = `pe_manager_nav_collapsed_folders_${currentMode}`;
```

**Rationale:** People mode has 16 menu items, Product mode has 6. Users may want different folder organizations collapsed in each mode.

### Anti-Patterns to Avoid

- **Uncontrolled Collapsible with persistence:** Can't sync state with localStorage
- **Single collapsed state for both modes:** User loses preference when switching modes
- **Storing expanded folder IDs:** Grows unbounded; store collapsed IDs (smaller array)
- **Complex animation libraries:** CSS transitions sufficient for simple rotation
- **Hardcoded chevron direction:** Always derive from `isOpen` state

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Collapsible component | DIY expand/collapse with CSS | Radix Collapsible | Accessibility, keyboard nav, ARIA attributes |
| Persistent state | Custom storage abstraction | localStorage with useEffect pattern | Simple, proven pattern in codebase |
| Icon rotation | CSS animations or JS transforms | Tailwind transition classes | Declarative, no JS needed |
| Folder grouping | Complex recursive tree renderer | Simple reduce + map pattern | Navigation is only 2 levels (folders + items) |

**Key insight:** Radix Collapsible provides all the complexity (accessibility, keyboard, ARIA). Just wire up state persistence and styling.

## Common Pitfalls

### Pitfall 1: localStorage Quota Exceeded

**What goes wrong:** Storing large collapsed folder arrays causes `QuotaExceededError`

**Why it happens:** localStorage has 5-10MB limit per origin

**How to avoid:**
```javascript
try {
  localStorage.setItem(storageKey, JSON.stringify(collapsedFolders));
} catch (error) {
  if (error.name === 'QuotaExceededError') {
    console.warn('localStorage quota exceeded, clearing old data');
    localStorage.removeItem(storageKey);
  } else {
    console.error('Failed to persist folder state:', error);
  }
}
```

**Warning signs:**
- Error console logs on state changes
- Collapse state not persisting after page reload
- User reports "settings not saving"

**Reality check:** With max 20 folders, array is ~500 bytes. Extremely unlikely to hit quota.

### Pitfall 2: State Not Updating After Mode Switch

**What goes wrong:** Collapsing a folder in People mode affects Product mode

**Why it happens:** Single storage key used for both modes

**How to avoid:**
```javascript
// ❌ Wrong - shared state
const storageKey = 'pe_manager_nav_collapsed_folders';

// ✅ Correct - mode-specific state
const storageKey = `pe_manager_nav_collapsed_folders_${currentMode}`;
```

**Warning signs:**
- Folders collapse unexpectedly when switching modes
- User confusion about folder state persistence

### Pitfall 3: Chevron Animation Not Smooth

**What goes wrong:** Chevron jumps instead of rotating smoothly

**Why it happens:** Missing `transition-transform` class or conflicting CSS

**How to avoid:**
```jsx
// ✅ Correct - transition applied
<ChevronDown className="h-4 w-4 transition-transform duration-200" />

// ❌ Wrong - no transition
<ChevronDown className="h-4 w-4" />
```

**Testing:** Toggle folder multiple times rapidly - should animate smoothly each time.

### Pitfall 4: Folder State Lost on NavigationContext Refresh

**What goes wrong:** User collapses folders, then NavigationSettings changes config, folders reset to expanded

**Why it happens:** Component re-renders with new folders array, localStorage state not reapplied

**How to avoid:**
```javascript
// Ensure useCollapsedFolders hook doesn't reset on folders prop change
const [collapsedFolders, setCollapsedFolders] = useState(() => {
  // Only read from localStorage on mount
  try {
    const stored = localStorage.getItem(storageKey);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
});
```

**Key insight:** localStorage is source of truth for collapse state, not folders array from context.

### Pitfall 5: Items Not Visible in Collapsed Folders

**What goes wrong:** User expects to see item count badge on collapsed folders

**Why it happens:** No visual indicator of folder contents when collapsed

**How to avoid:**
```jsx
// Optional enhancement (not required for Phase 31)
<CollapsibleTrigger className="flex items-center justify-between w-full">
  <div className="flex items-center">
    <ChevronDown className="..." />
    <span>{folder.name}</span>
  </div>
  {!isOpen && items.length > 0 && (
    <Badge variant="secondary">{items.length}</Badge>
  )}
</CollapsibleTrigger>
```

**Note:** Phase 31 doesn't require item count badges, but good UX consideration.

## Code Examples

Verified patterns from official sources:

### Complete useCollapsedFolders Hook

```javascript
// Source: DisplayModeContext.jsx pattern + Radix docs
import { useState, useEffect } from 'react';
import { useAppMode } from '@/contexts/AppModeContext';

const STORAGE_KEY_PREFIX = 'pe_manager_nav_collapsed_folders';

export function useCollapsedFolders() {
  const { currentMode } = useAppMode();
  const storageKey = `${STORAGE_KEY_PREFIX}_${currentMode}`;

  const [collapsedFolders, setCollapsedFolders] = useState(() => {
    try {
      const stored = localStorage.getItem(storageKey);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(collapsedFolders));
    } catch (error) {
      console.error('Failed to persist folder state:', error);
    }
  }, [collapsedFolders, storageKey]);

  const isCollapsed = (folderId) => collapsedFolders.includes(folderId);

  const toggleFolder = (folderId) => {
    setCollapsedFolders(prev =>
      prev.includes(folderId)
        ? prev.filter(id => id !== folderId)
        : [...prev, folderId]
    );
  };

  return { isCollapsed, toggleFolder };
}
```

### FolderGroup Component with Theming

```jsx
// Source: Layout.jsx styling patterns
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from '@/components/ui/collapsible';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

function FolderGroup({ folder, items, isProductMode }) {
  const { isCollapsed, toggleFolder } = useCollapsedFolders();
  const isOpen = !isCollapsed(folder.id);

  return (
    <Collapsible open={isOpen} onOpenChange={() => toggleFolder(folder.id)}>
      <CollapsibleTrigger
        className={cn(
          "flex items-center w-full px-4 py-2 text-sm font-medium rounded-md transition-colors",
          isProductMode
            ? "text-gray-400 hover:bg-gray-800 hover:text-white"
            : "text-gray-600 hover:bg-gray-100"
        )}
      >
        <ChevronDown
          className={cn(
            "h-4 w-4 mr-2 transition-transform duration-200",
            isOpen ? "rotate-0" : "-rotate-90"
          )}
        />
        <span>{folder.name}</span>
      </CollapsibleTrigger>

      <CollapsibleContent className="pl-6">
        {items.map(item => (
          <Link
            key={item.id}
            to={item.href}
            className={cn(
              "flex items-center px-4 py-3 text-sm font-medium rounded-md",
              isProductMode
                ? item.current
                  ? "bg-purple-900/50 text-purple-300"
                  : "text-gray-300 hover:bg-gray-800"
                : item.current
                  ? "bg-indigo-50 text-indigo-700"
                  : "text-gray-700 hover:bg-gray-100"
            )}
          >
            <item.icon className="h-5 w-5 mr-3" />
            {item.name}
          </Link>
        ))}
      </CollapsibleContent>
    </Collapsible>
  );
}
```

### Hierarchical Navigation Integration

```jsx
// Source: Layout.jsx navigation structure
function HierarchicalNavigation() {
  const { folders, items } = useNavigation();
  const { isProductMode } = useAppMode();

  // Current mode's navigation array
  const navigation = isProductMode ? productNavigation : peopleNavigation;

  // Group items by folder
  const itemsByFolder = navigation.reduce((acc, navItem) => {
    const assignment = items.find(i => i.itemId === navItem.id);
    const folderId = assignment?.folderId || 'root';
    if (!acc[folderId]) acc[folderId] = [];
    acc[folderId].push(navItem);
    return acc;
  }, {});

  // Sort folders by order field
  const sortedFolders = [...folders].sort((a, b) => a.order - b.order);

  return (
    <nav className="flex-1 p-4 overflow-y-auto">
      <div className="space-y-1">
        {/* Render folders with nested items */}
        {sortedFolders.map(folder => (
          <FolderGroup
            key={folder.id}
            folder={folder}
            items={itemsByFolder[folder.id] || []}
            isProductMode={isProductMode}
          />
        ))}

        {/* Render root-level items (not in any folder) */}
        {(itemsByFolder.root || []).map(item => (
          <Link
            key={item.id}
            to={item.href}
            className={cn(
              "flex items-center px-4 py-3 text-sm font-medium rounded-md",
              isProductMode
                ? item.current
                  ? "bg-purple-900/50 text-purple-300"
                  : "text-gray-300 hover:bg-gray-800"
                : item.current
                  ? "bg-indigo-50 text-indigo-700"
                  : "text-gray-700 hover:bg-gray-100"
            )}
          >
            <item.icon className="h-5 w-5 mr-3" />
            {item.name}
          </Link>
        ))}
      </div>
    </nav>
  );
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Custom accordion | Radix Collapsible | 2021 | Accessibility, keyboard nav included |
| CSS-only collapse | Radix with data attributes | 2022 | Better animation control, React state integration |
| Manual ARIA attributes | Radix automatic ARIA | Always | Radix handles aria-expanded, roles automatically |
| Cookies for preferences | localStorage | 2015+ | Simpler API, more storage space |

**Deprecated/outdated:**
- **Bootstrap Collapse:** Requires jQuery, not React-friendly
- **react-collapse:** Outdated, Radix is more modern
- **Manual max-height animations:** Radix uses CSS variables for smooth height transitions

**Current best practice (2026):** Radix Collapsible is the standard for accessible React collapsible components. Combined with localStorage for persistence.

## Integration with Existing Code

### Layout.jsx Modifications Required

**Current navigation rendering (lines 299-322):**
```jsx
<nav className="flex-1 p-4 overflow-y-auto">
  <div className="space-y-1">
    {navigation.map((item) => (
      <Link key={item.name} to={item.href} ...>
        <item.icon className="h-5 w-5 mr-3" />
        {item.name}
      </Link>
    ))}
  </div>
</nav>
```

**New hierarchical rendering:**
```jsx
<nav className="flex-1 p-4 overflow-y-auto">
  <div className="space-y-1">
    <HierarchicalNavigation />
  </div>
</nav>
```

**Required imports:**
```javascript
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from "@/components/ui/collapsible";
import { ChevronDown } from "lucide-react";
import { useNavigation } from "@/contexts/NavigationContext";
```

### NavigationContext Integration

NavigationContext already provides everything needed:
- `folders` - Array of folder objects with `{ id, name, order }`
- `items` - Array of assignments with `{ itemId, folderId }`
- `currentMode` - 'people' or 'product'
- `loading` - Boolean for loading state
- `error` - Error message if config load failed

**No changes needed to NavigationContext** - it's a pure data layer.

**Layout.jsx will:**
1. Read `folders` and `items` from NavigationContext
2. Group navigation items by folder
3. Render folders as Collapsible components
4. Manage collapse state independently in localStorage

### Collapsible.jsx Already Exists

The shadcn/ui collapsible component wrapper is already at `src/components/ui/collapsible.jsx`:

```javascript
import * as CollapsiblePrimitive from "@radix-ui/react-collapsible"

const Collapsible = CollapsiblePrimitive.Root
const CollapsibleTrigger = CollapsiblePrimitive.CollapsibleTrigger
const CollapsibleContent = CollapsiblePrimitive.CollapsibleContent

export { Collapsible, CollapsibleTrigger, CollapsibleContent }
```

**Status:** Ready to use ✅

## Accessibility

Radix Collapsible automatically provides:
- `role="button"` on CollapsibleTrigger
- `aria-expanded="true/false"` based on open state
- `aria-controls` linking trigger to content
- Keyboard support: Space/Enter to toggle

**Additional considerations:**
- Folder labels should be descriptive (handled by user in NavigationSettings)
- Chevron icon is decorative (no alt text needed)
- Focus styles already handled by Tailwind hover classes

## Performance Considerations

**localStorage operations:**
- Read: Once on component mount (useState initializer)
- Write: On every folder toggle (useEffect)
- Size: ~500 bytes for 20 folders (negligible)

**Rendering:**
- Hierarchical grouping: O(n) where n = number of menu items (max 16 in People mode)
- Folder sorting: O(m log m) where m = number of folders (max 10-20)
- Total: < 1ms on modern devices

**Animation performance:**
- CSS transforms (rotate) are GPU-accelerated
- No JavaScript animation loops
- Radix Collapsible uses CSS height transitions with CSS variables

**Conclusion:** No performance concerns. All operations are fast and synchronous.

## Open Questions

1. **Should folders default to expanded or collapsed on first visit?**
   - What we know: Empty `collapsedFolders` array means all expanded
   - What's unclear: User expectation for first visit
   - Recommendation: Default to all expanded (empty array) - discoverable, matches current flat list behavior

2. **Should there be a "Collapse All" / "Expand All" button?**
   - What we know: Phase 31 requirements don't mention global controls
   - What's unclear: User need for bulk operations with many folders
   - Recommendation: Not required for Phase 31, consider for future enhancement

3. **Should folder collapse state sync between tabs/windows?**
   - What we know: localStorage is per-origin, shared across tabs
   - What's unclear: Multi-tab usage patterns for this app
   - Recommendation: Current implementation syncs automatically via localStorage (happens for free)

## Sources

### Primary (HIGH confidence)
- https://www.radix-ui.com/primitives/docs/components/collapsible - Radix Collapsible API documentation
- /Users/i306072/Documents/GitHub/P-E/src/components/ui/collapsible.jsx - Existing implementation
- /Users/i306072/Documents/GitHub/P-E/src/contexts/DisplayModeContext.jsx - localStorage pattern reference
- /Users/i306072/Documents/GitHub/P-E/src/contexts/AppModeContext.jsx - Mode-aware state pattern
- /Users/i306072/Documents/GitHub/P-E/src/pages/Layout.jsx - Current navigation structure
- https://tailwindcss.com/docs/rotate - Tailwind rotation classes
- https://tailwindcss.com/docs/transition-property - Tailwind transitions

### Secondary (MEDIUM confidence)
- https://developer.mozilla.org/en-US/docs/Web/API/Window/localStorage - localStorage best practices
- /Users/i306072/Documents/GitHub/P-E/package.json - Verified @radix-ui/react-collapsible v1.1.3 installed

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Radix Collapsible installed, localStorage is native browser API
- Architecture: HIGH - Clear patterns from existing codebase (DisplayModeContext, Layout.jsx)
- Pitfalls: MEDIUM - localStorage pitfalls are general, specific folder state issues are hypothetical
- Integration: HIGH - All integration points identified, no breaking changes needed

**Research date:** 2026-01-29
**Valid until:** 2026-03-29 (60 days - Radix Collapsible API is stable)

**Tech stack verification:**
- @radix-ui/react-collapsible: v1.1.3 ✅ (current stable)
- lucide-react: v0.475.0 ✅ (ChevronDown icon available)
- Tailwind CSS: v3.4.17 ✅ (transition and rotate classes)
- React: v18.2.0 ✅ (hooks compatible)
