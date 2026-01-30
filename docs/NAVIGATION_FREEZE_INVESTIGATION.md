# Navigation Click Freeze - Investigation Report

## Investigation Date: 2026-01-29

## Problem Description
After 2-3 page navigations, menu clicks stop working and the site becomes frozen. This is a UI interaction bug where:
- Initial navigation works fine
- After 2-3 clicks, the menu links stop responding
- No visual errors - the UI appears responsive but clicks don't trigger navigation
- Page doesn't fully freeze (scrolling may still work)

---

## Diagnostic Instrumentation Added

### Phase 1: Click & Render Tracking

**Files Modified:**

1. **`src/pages/Layout.jsx`**
   - Added global click tracking in capture and bubble phases
   - Added render count logging
   - Logs: `[Layout] Click captured:`, `[Layout] Click bubbled to document`, `[Layout] Render #`

2. **`src/components/navigation/HierarchicalNavigation.jsx`**
   - Added render count tracking
   - Added link click logging
   - Added toggle for switching between Radix and Native collapsible
   - Logs: `[HierarchicalNavigation] Render #`, `[HierarchicalNavigation] Link clicked:`

3. **`src/pages/index.jsx`**
   - Added navigation count tracking
   - Added location change logging
   - Logs: `[PagesContent] Render #`, `[PagesContent] Navigation #`

4. **`src/components/navigation/CollapsibleFolder.jsx`**
   - Added instance tracking
   - Added render count per instance
   - Added mount/unmount logging
   - Added onOpenChange logging
   - Logs: `[CollapsibleFolder] Instance X render #`, `[CollapsibleFolder] Mounted/Unmounted`

5. **`src/hooks/useCollapsedFolders.js`**
   - Added hook call tracking
   - Logs: `[useCollapsedFolders] Hook call #`

6. **`src/components/ui/error-boundaries.jsx`**
   - Added error boundary instance tracking
   - Added lifecycle logging (mount, update, unmount)
   - Logs: `[PageChunkErrorBoundary] Instance X created/mounted/updated/unmounting`

7. **`src/contexts/NavigationContext.jsx`**
   - Added provider render tracking
   - Logs: `[NavigationProvider] Render #`

8. **`src/contexts/AppModeContext.jsx`**
   - Added provider render tracking
   - Added mode toggle logging
   - Logs: `[AppModeProvider] Render #`, `[AppModeProvider] toggleAppMode called`

### Phase 2: Native Collapsible Alternative

**New File Created:**
- `src/components/navigation/NativeCollapsibleFolder.jsx`
  - Native HTML implementation using CSS max-height transitions
  - No Radix dependency
  - Toggle via `USE_NATIVE_COLLAPSIBLE` flag in HierarchicalNavigation.jsx

---

## Testing Results

### Test Environment - Local (2026-01-29)
- Local development server (localhost:5173)
- Browser: Playwright/Chromium
- Backend: Running on localhost:3001

### Local Tests Performed

1. **Basic Navigation (5 pages)**
   - Result: ✅ PASSED
   - All clicks captured and bubbled correctly
   - Navigation worked without issues

2. **Intensive Navigation (15+ pages)**
   - Result: ✅ PASSED
   - 15 successful clicks, 0 failed
   - Click capture/bubble ratio: 16/16
   - App remained responsive after test

3. **Collapsible Folder Interaction**
   - Result: ⚠️ NOT TESTED (folders not configured)
   - No collapsible folders visible in current environment
   - API returning "Unauthorized" for menu-config

---

### Test Environment - Production (2026-01-29)
- Production URL: https://pe-manager-frontend.cfapps.eu01-canary.hana.ondemand.com
- Browser: Playwright/Chromium (headless)
- Deployed commit: c5be8cbe (with debug instrumentation)

### Production Tests Performed

1. **Intensive Navigation with Folders (30+ clicks)**
   - Result: ✅ PASSED
   - All clicks captured AND bubbled correctly
   - Navigation working without issues
   - 2 folders configured: "Teams" and "Engineering"

2. **Folder Collapse/Expand Cycles**
   - Result: ✅ PASSED
   - CollapsibleFolder Instance 1: 11 renders
   - CollapsibleFolder Instance 2: 9 renders
   - Radix Collapsible functioning correctly
   - No event propagation issues observed

3. **Rapid Navigation Sequence**
   - Tested: Calendar → Projects → Team → GitHub → Bug Dashboard → Metrics → Team Sync → Duties → Stakeholders → Peers → Jira → Team Status → Tasks
   - All clicks captured in capture phase
   - All clicks bubbled to document
   - Every navigation completed successfully

### Key Observations - Production

1. **Click Events Are Working**
   - Every click was captured in the capture phase
   - Every click bubbled to the document
   - No evidence of event propagation being blocked
   - Pattern: `[Layout] Click captured:` always followed by `[Layout] Click bubbled to document`

2. **Radix Collapsible Working Correctly**
   - `onOpenChange` triggered for every folder toggle
   - `useCollapsedFolders` hook called as expected
   - Renders incrementing normally (not exponentially)
   - Smooth expand/collapse animations

3. **Navigation Context Renders**
   - NavigationProvider renders 5 times on initial load (expected due to auth flow)
   - HierarchicalNavigation renders 4 times on initial load
   - No runaway re-render cycles observed

4. **No Memory Leaks Detected**
   - CollapsibleFolder instances mounting and rendering as expected
   - No duplicate mounts without unmounts
   - Render counts stable and predictable

---

## Theories & Status

### Theory 1: Radix UI Collapsible Bug
**Status: ⚠️ NOT REPRODUCED (but not ruled out)**
- Production testing with folders: 30+ clicks, no freeze
- Radix Collapsible rendering and toggling correctly
- All onOpenChange events firing as expected
- Possible: Bug requires specific timing/conditions not captured in automated testing

### Theory 2: React Router + Suspense Interaction
**Status: LIKELY NOT THE CAUSE**
- 30+ navigations on production worked without issues
- ErrorBoundary didn't catch any errors
- Lazy loading working correctly
- PageChunkErrorBoundary lifecycle normal

### Theory 3: Context Provider State Corruption
**Status: LIKELY NOT THE CAUSE**
- Render counts stable on production
- No excessive re-renders observed
- State appears to be managed correctly
- NavigationProvider renders reasonable (5 on load)

---

## Next Steps to Reproduce Bug

1. **Configure Folders in Test Environment**
   ```bash
   # Ensure backend has menu config with folders
   # Check /api/menu-config/people endpoint
   ```

2. **Test with Collapsible Folders**
   - Create folders via Settings UI
   - Assign items to folders
   - Test collapse/expand + navigation

3. **Test on Production Environment**
   - The bug was reported on production
   - May be environment-specific issue

4. **Enable Native Collapsible for Comparison**
   ```javascript
   // In HierarchicalNavigation.jsx, change:
   const USE_NATIVE_COLLAPSIBLE = true;
   ```
   Then test if bug still occurs

5. **Check for Memory Leaks**
   - Use Chrome DevTools Performance Monitor
   - Watch for increasing JS heap during navigation
   - Look for detached DOM nodes

---

## How to Use Debug Logging

Open browser DevTools Console and filter by:
- `[Layout]` - Click tracking
- `[HierarchicalNavigation]` - Navigation renders
- `[PagesContent]` - Route changes
- `[CollapsibleFolder]` - Folder state
- `[NavigationProvider]` - Context updates
- `[AppModeProvider]` - Mode switches

### Expected vs Problem Behavior

**Normal Click:**
```
[Layout] Click captured: {target: A, isLink: true, linkHref: http://...}
[HierarchicalNavigation] Link clicked: Projects http://localhost:5173/projects
[Layout] Click bubbled to document
[PagesContent] Navigation # X {from: /tasks, to: /projects}
```

**Problem Click (if bug occurs):**
```
[Layout] Click captured: {target: A, isLink: true, linkHref: http://...}
// Missing: [HierarchicalNavigation] Link clicked
// Missing: [Layout] Click bubbled to document
// Missing: [PagesContent] Navigation
```

---

## Files to Remove Debug Logging (After Investigation)

Once the bug is found and fixed, remove debug logging from:
- `src/pages/Layout.jsx` (lines 45-90)
- `src/components/navigation/HierarchicalNavigation.jsx` (lines 16-32)
- `src/pages/index.jsx` (lines 1, 155-175)
- `src/components/navigation/CollapsibleFolder.jsx` (lines 11, 24-47)
- `src/hooks/useCollapsedFolders.js` (lines 9, 21-26)
- `src/components/ui/error-boundaries.jsx` (lines 180-195)
- `src/contexts/NavigationContext.jsx` (lines 17-20)
- `src/contexts/AppModeContext.jsx` (lines 14, 31-33, 57)

Also remove the test file:
- `src/components/navigation/NativeCollapsibleFolder.jsx` (if not needed)

---

## Summary

The click freeze bug could not be reproduced in either local or production testing despite extensive attempts:

- **Local testing**: 15+ clicks, no folders (not fully testing Radix)
- **Production testing**: 30+ clicks with 2 folders configured, extensive folder toggling

### What We Know
1. Debug instrumentation is working correctly and deployed to production
2. All click events are captured and bubbled properly in our tests
3. Radix Collapsible is functioning normally with proper state management
4. No event propagation blocking detected
5. No runaway re-renders or memory issues observed

### What We Don't Know
1. The exact trigger conditions for the bug
2. Whether it requires specific timing (rapid double-clicks, interruptions)
3. Whether it requires longer session time (hours of usage)
4. Whether it's browser-specific or device-specific

### Possible Causes Still Under Investigation
1. **Race condition** - Specific timing between folder toggle and navigation
2. **User interaction pattern** - Human clicking behavior differs from automated
3. **Browser state accumulation** - Bug may only appear after prolonged browser session
4. **Specific navigation sequence** - May require a particular path combination

### Recommendation
Keep the debug instrumentation deployed. When the bug occurs for a user:
1. Have them open DevTools Console
2. Look for missing `[Layout] Click bubbled to document` after a click
3. Check render counts for exponential growth
4. Note the exact sequence of actions that triggered it
