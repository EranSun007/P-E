# Phase 3: Content Script - Research

**Researched:** 2026-01-21
**Domain:** Chrome Extension Content Scripts, SPA DOM Scraping, Jira Board Integration
**Confidence:** MEDIUM (patterns HIGH, Jira DOM LOW - requires live inspection)

## Summary

Phase 3 implements content scripts that extract Jira issue data from DOM while users browse jira.tools.sap. The research covers Manifest V3 content script configuration, SPA navigation detection, MutationObserver patterns for dynamic content, and message passing to service workers.

The standard approach uses declarative content script registration via manifest.json with `document_idle` timing, combined with MutationObserver for detecting dynamically loaded content in Jira's React-based SPA. The content script extracts issue data and sends it to the service worker via `chrome.runtime.sendMessage()`.

**Critical unknown:** Jira's exact DOM structure will require live inspection during implementation. Research provides extraction patterns but not actual selectors.

**Primary recommendation:** Use declarative content script with MutationObserver for initial load detection, debounced extraction on DOM changes, and webNavigation API in service worker to detect SPA navigation and trigger re-scraping.

## Standard Stack

### Core (No Additional Libraries)
| Component | Version | Purpose | Why Standard |
|-----------|---------|---------|--------------|
| Content Script | Manifest V3 | DOM access on Jira pages | Native Chrome extension API |
| MutationObserver | Web API | Detect dynamic content changes | Standard DOM observation |
| chrome.runtime.sendMessage | Extension API | Content -> Service Worker comms | Native Manifest V3 messaging |

### Supporting APIs
| API | Purpose | When to Use |
|-----|---------|-------------|
| chrome.webNavigation | SPA navigation detection | Detect pushState/replaceState URL changes |
| chrome.tabs.sendMessage | Service Worker -> Content | Trigger manual refresh from popup |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| MutationObserver | Polling with setInterval | Polling misses changes, wastes CPU; Observer is event-driven |
| Declarative manifest | scripting.registerContentScripts | Dynamic registration adds complexity; declarative is simpler |
| webNavigation API | tabs.onUpdated | Both work; webNavigation.onHistoryStateUpdated is more specific for SPAs |

## Architecture Patterns

### Manifest Configuration

Add to existing `extension/manifest.json`:

```json
{
  "content_scripts": [
    {
      "matches": ["https://jira.tools.sap/*"],
      "js": ["content/content.js"],
      "run_at": "document_idle",
      "all_frames": false
    }
  ],
  "permissions": [
    "storage",
    "activeTab",
    "webNavigation"
  ]
}
```

**Key decisions:**
- `run_at: "document_idle"` - Wait for initial DOM to be ready
- `all_frames: false` - Only inject in top frame (Jira doesn't use iframes for board)
- Match pattern covers all jira.tools.sap paths (board, backlog, issue detail)

### Recommended Project Structure

```
extension/
├── manifest.json              # Add content_scripts section
├── service-worker.js          # Add webNavigation listener (already handles SYNC_ISSUES)
├── content/
│   ├── content.js             # Main content script entry point
│   ├── extractors/
│   │   ├── board.js           # Sprint board extraction
│   │   ├── backlog.js         # Backlog view extraction
│   │   └── detail.js          # Issue detail page extraction
│   ├── observer.js            # MutationObserver management
│   └── utils.js               # Debounce, page detection utilities
├── lib/
│   ├── storage.js             # (existing)
│   └── api.js                 # (existing)
├── popup/                     # (existing)
└── options/                   # (existing)
```

### Pattern 1: Page Type Detection

**What:** Determine current page type from URL pattern
**When to use:** On page load and SPA navigation

```javascript
// Source: Custom pattern based on Jira URL structure
const PageType = {
  BOARD: 'board',
  BACKLOG: 'backlog',
  DETAIL: 'detail',
  UNKNOWN: 'unknown'
};

function detectPageType(url) {
  const urlObj = new URL(url);
  const path = urlObj.pathname;
  const params = urlObj.searchParams;

  // Sprint board: /secure/RapidBoard.jspa with rapidView and sprint params
  if (path.includes('RapidBoard.jspa') && params.get('rapidView') && !params.get('view')) {
    return PageType.BOARD;
  }

  // Backlog: /secure/RapidBoard.jspa with view=planning
  if (path.includes('RapidBoard.jspa') && params.get('view') === 'planning') {
    return PageType.BACKLOG;
  }

  // Issue detail: /browse/PROJ-123
  if (path.includes('/browse/') && /[A-Z]+-\d+/.test(path)) {
    return PageType.DETAIL;
  }

  return PageType.UNKNOWN;
}
```

### Pattern 2: MutationObserver for Dynamic Content

**What:** Observe DOM changes and trigger extraction when content loads
**When to use:** After initial page load to catch lazy-loaded issues

```javascript
// Source: MDN MutationObserver documentation + Chrome extension patterns
class ContentObserver {
  constructor(onContentReady) {
    this.onContentReady = onContentReady;
    this.observer = null;
    this.debounceTimer = null;
    this.DEBOUNCE_MS = 500; // Wait for DOM to settle
  }

  observe(targetSelector) {
    // Find the container that holds issue cards
    const target = document.querySelector(targetSelector);
    if (!target) {
      console.log('[PE-Jira] Target not found, will retry');
      return false;
    }

    this.observer = new MutationObserver((mutations) => {
      // Debounce rapid changes
      clearTimeout(this.debounceTimer);
      this.debounceTimer = setTimeout(() => {
        this.onContentReady();
      }, this.DEBOUNCE_MS);
    });

    this.observer.observe(target, {
      childList: true,   // Watch for added/removed nodes
      subtree: true,     // Watch entire subtree
      attributes: false  // Don't need attribute changes
    });

    return true;
  }

  disconnect() {
    if (this.observer) {
      this.observer.disconnect();
      this.observer = null;
    }
    clearTimeout(this.debounceTimer);
  }
}
```

### Pattern 3: Content Script to Service Worker Communication

**What:** Send extracted issues to service worker for backend sync
**When to use:** After successful extraction

```javascript
// Source: Chrome Extension documentation
async function sendIssuesToServiceWorker(issues) {
  try {
    const response = await chrome.runtime.sendMessage({
      type: 'SYNC_ISSUES',
      payload: issues
    });

    if (response.success) {
      console.log('[PE-Jira] Sync successful:', response.data);
    } else {
      console.error('[PE-Jira] Sync failed:', response.error);
    }

    return response;
  } catch (error) {
    // Service worker may be inactive, will retry on next extraction
    console.error('[PE-Jira] Failed to send message:', error);
    return { success: false, error: error.message };
  }
}
```

### Pattern 4: SPA Navigation Detection (Service Worker)

**What:** Detect URL changes in Jira SPA without full page reload
**When to use:** Add to service-worker.js to notify content script of navigation

```javascript
// Source: Chrome webNavigation API documentation
// Requires "webNavigation" permission in manifest

chrome.webNavigation.onHistoryStateUpdated.addListener(
  (details) => {
    // Only care about main frame, not iframes
    if (details.frameId !== 0) return;

    console.log('[PE-Jira] SPA navigation detected:', details.url);

    // Notify content script to re-extract
    chrome.tabs.sendMessage(details.tabId, {
      type: 'URL_CHANGED',
      url: details.url
    });
  },
  { url: [{ hostSuffix: 'jira.tools.sap' }] }
);
```

### Pattern 5: Extraction Timing Strategy

**What:** When and how often to extract and sync
**When to use:** Core extraction loop

```javascript
// Source: Best practices for DOM scraping in SPAs
const ExtractionStrategy = {
  // Initial extraction: wait for content to load
  INITIAL_DELAY_MS: 2000,

  // Re-extraction after DOM mutation
  MUTATION_DEBOUNCE_MS: 500,

  // Minimum time between syncs to backend
  SYNC_THROTTLE_MS: 30000, // 30 seconds per EXT-02

  // Maximum time to wait for board to load
  LOAD_TIMEOUT_MS: 10000
};

class ExtractionController {
  constructor() {
    this.lastSyncTime = 0;
    this.pendingExtraction = null;
  }

  shouldSync() {
    const now = Date.now();
    return (now - this.lastSyncTime) >= ExtractionStrategy.SYNC_THROTTLE_MS;
  }

  async extractAndSync() {
    const issues = await this.extract();

    if (issues.length === 0) {
      console.log('[PE-Jira] No issues found');
      return;
    }

    if (!this.shouldSync()) {
      console.log('[PE-Jira] Throttled, skipping sync');
      return;
    }

    await sendIssuesToServiceWorker(issues);
    this.lastSyncTime = Date.now();
  }
}
```

### Anti-Patterns to Avoid

- **Extracting on every DOM mutation:** Jira triggers many mutations; always debounce
- **Blocking the main thread:** Use async/await, avoid synchronous loops over large DOM trees
- **Assuming static selectors:** Jira may change class names in updates; use data attributes when available
- **Ignoring extraction failures:** Always handle partial extraction gracefully
- **Syncing empty arrays:** Check for meaningful data before sending to backend

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| DOM observation | Custom event polling | MutationObserver | Native API, event-driven, efficient |
| Debouncing | Inline setTimeout management | Utility function with clearTimeout | Proper cleanup, consistent behavior |
| SPA navigation | Polling location.href | webNavigation.onHistoryStateUpdated | Browser-level event, reliable |
| Message passing | Custom postMessage | chrome.runtime.sendMessage | Type-safe, extension-aware |

**Key insight:** Browser APIs (MutationObserver, webNavigation) are designed for these exact use cases. Custom polling solutions are less reliable and more resource-intensive.

## Common Pitfalls

### Pitfall 1: Content Script Runs Before DOM Ready

**What goes wrong:** Script executes before Jira's React app renders any content
**Why it happens:** `document_idle` waits for DOM but not for JavaScript frameworks to render
**How to avoid:** Use MutationObserver to wait for specific elements, or retry with exponential backoff
**Warning signs:** `document.querySelector()` returns null for elements that should exist

```javascript
// Wait for specific element to appear
async function waitForElement(selector, timeout = 10000) {
  const start = Date.now();

  while (Date.now() - start < timeout) {
    const element = document.querySelector(selector);
    if (element) return element;
    await new Promise(r => setTimeout(r, 100));
  }

  return null; // Timeout
}
```

### Pitfall 2: Service Worker Terminated During Extraction

**What goes wrong:** `chrome.runtime.sendMessage` throws error because service worker is inactive
**Why it happens:** Chrome terminates service workers after 30 seconds of inactivity
**How to avoid:** Handle error gracefully, store data locally for retry
**Warning signs:** "Could not establish connection" errors in console

```javascript
// Handle service worker not being available
async function safeSendMessage(message) {
  try {
    return await chrome.runtime.sendMessage(message);
  } catch (error) {
    if (error.message.includes('Could not establish connection')) {
      // Service worker inactive, store for retry
      console.log('[PE-Jira] Service worker inactive, will retry');
      return { success: false, error: 'service_worker_inactive' };
    }
    throw error;
  }
}
```

### Pitfall 3: Extracting Stale Data After Navigation

**What goes wrong:** Content script extracts old DOM after SPA navigation
**Why it happens:** URL changed but DOM hasn't updated yet
**How to avoid:** Delay extraction after navigation, or wait for specific element changes
**Warning signs:** Same issues appear even after switching to different sprint

### Pitfall 4: Memory Leaks from MutationObserver

**What goes wrong:** Observer continues running after page context changes
**Why it happens:** Not calling `disconnect()` when appropriate
**How to avoid:** Disconnect on SPA navigation, track observer lifecycle
**Warning signs:** Growing memory usage over time, duplicate callbacks

### Pitfall 5: Class Name Fragility

**What goes wrong:** Extraction breaks after Jira update
**Why it happens:** Relying on minified or generated class names (e.g., `css-1a2b3c`)
**How to avoid:** Prefer `data-*` attributes, `role` attributes, semantic selectors
**Warning signs:** Selectors contain random-looking strings, change between page loads

## Code Examples

### Complete Content Script Entry Point

```javascript
// content/content.js
// Source: Synthesized from Chrome extension documentation

console.log('[PE-Jira] Content script loaded');

// State
let currentPageType = null;
let observer = null;
let extractionController = null;

// Initialize on load
async function init() {
  const pageType = detectPageType(window.location.href);
  console.log('[PE-Jira] Page type:', pageType);

  if (pageType === PageType.UNKNOWN) {
    console.log('[PE-Jira] Not a tracked page type');
    return;
  }

  currentPageType = pageType;
  extractionController = new ExtractionController(pageType);

  // Wait for initial content
  const containerSelector = getContainerSelector(pageType);
  const container = await waitForElement(containerSelector, 10000);

  if (!container) {
    console.error('[PE-Jira] Container not found after timeout');
    return;
  }

  // Initial extraction
  await extractionController.extractAndSync();

  // Set up observer for dynamic content
  observer = new ContentObserver(() => {
    extractionController.extractAndSync();
  });
  observer.observe(containerSelector);
}

// Handle SPA navigation messages from service worker
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'URL_CHANGED') {
    console.log('[PE-Jira] URL changed:', message.url);

    // Cleanup old observer
    if (observer) observer.disconnect();

    // Re-initialize for new page
    init();

    sendResponse({ success: true });
  }
  return true;
});

// Handle manual refresh requests from popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'REFRESH_DATA') {
    console.log('[PE-Jira] Manual refresh requested');

    if (extractionController) {
      extractionController.lastSyncTime = 0; // Reset throttle
      extractionController.extractAndSync();
    }

    sendResponse({ success: true });
  }
  return true;
});

// Start
init();
```

### Issue Data Structure (Expected Output)

```javascript
// Issue structure sent to service worker
// Must match backend /api/jira-issues/sync expectation
const issueSchema = {
  issue_key: 'PROJ-123',        // Required: Jira issue key
  summary: 'Issue title',        // Required: Issue summary/title
  status: 'In Progress',         // Required: Status text
  assignee_name: 'John Doe',     // Optional: Assignee display name
  assignee_id: 'jdoe',           // Optional: Assignee ID for mapping
  story_points: 5,               // Optional: Story points (number)
  priority: 'High',              // Optional: Priority text
  issue_type: 'Story',           // Optional: Issue type
  epic_key: 'PROJ-100',          // Optional: Parent epic key
  sprint_name: 'Sprint 42',      // Optional: Current sprint name
  jira_url: 'https://jira.tools.sap/browse/PROJ-123'  // Constructed URL
};
```

## Jira DOM Structure (REQUIRES LIVE INSPECTION)

**Confidence: LOW - Based on general Jira patterns, needs verification**

### Expected Board Page Structure

Jira boards typically use React with a board/column/card hierarchy:

```
Board Container
├── Column (To Do)
│   ├── Issue Card
│   │   ├── Issue Key (link)
│   │   ├── Summary
│   │   ├── Assignee Avatar
│   │   └── Story Points Badge
│   └── Issue Card...
├── Column (In Progress)
│   └── Issue Card...
└── Column (Done)
    └── Issue Card...
```

**Likely selectors to investigate:**
- Board container: `[data-test-id="software-board"]` or class containing "board"
- Columns: `[data-test-id="software-board.column"]` or class containing "column"
- Cards: `[data-test-id="software-board.card"]` or class containing "card"
- Issue key: Usually a link element containing the key pattern

### Expected Backlog Page Structure

```
Backlog Container
├── Sprint Section
│   ├── Sprint Header
│   └── Issue Rows
│       ├── Issue Row (draggable)
│       │   ├── Issue Key
│       │   ├── Summary
│       │   ├── Assignee
│       │   └── Story Points
│       └── Issue Row...
└── Backlog Section
    └── Issue Rows...
```

### Expected Detail Page Structure

```
Issue Detail
├── Header
│   ├── Issue Key
│   └── Summary
├── Details Panel
│   ├── Status Field
│   ├── Assignee Field
│   ├── Story Points Field
│   └── Epic Link Field
└── Activity Section
```

**Action required:** During implementation, open Jira dev tools and inspect:
1. What container holds the board/cards
2. What data attributes are stable (prefer `data-*` over class names)
3. How issue data is stored (in DOM vs. fetched via API)
4. Whether React state is accessible (unlikely, but worth checking)

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Mutation Events | MutationObserver | 2015+ | Standard web API, use Observer always |
| Background pages | Service Workers | Manifest V3 (2021) | Ephemeral; can't store state in memory |
| chrome.runtime.sendMessage callback | Promise/async-await | Chrome 99+ | Cleaner code, better error handling |
| Polling for URL changes | webNavigation API | Always available | Efficient SPA detection |

**Deprecated/outdated:**
- Mutation Events (`DOMNodeInserted`, etc.): Replaced by MutationObserver; poor performance
- Manifest V2 background pages: Being phased out; use service workers
- Synchronous messaging: Use async/await pattern

## Open Questions

1. **Jira DOM selectors (CRITICAL)**
   - What we know: General structure patterns from Jira documentation
   - What's unclear: Exact selectors for SAP's Jira instance
   - Recommendation: First implementation task should be DOM inspection and selector mapping

2. **Data attribute stability**
   - What we know: `data-test-id` attributes are common in React apps
   - What's unclear: Whether jira.tools.sap has stable data attributes
   - Recommendation: Prefer data attributes; fall back to semantic selectors

3. **Board ID/Sprint ID extraction**
   - What we know: Required for filtering data
   - What's unclear: Where these appear in DOM vs URL
   - Recommendation: Parse from URL parameters first (rapidView=33598)

4. **Rate limiting on Jira pages**
   - What we know: Nothing specific
   - What's unclear: Whether Jira detects/blocks scraping extensions
   - Recommendation: Keep extraction passive; don't make additional HTTP requests

## Sources

### Primary (HIGH confidence)
- Chrome Extension Content Scripts: https://developer.chrome.com/docs/extensions/develop/concepts/content-scripts
- Chrome runtime.sendMessage: https://developer.chrome.com/docs/extensions/reference/api/runtime
- Chrome webNavigation API: https://developer.chrome.com/docs/extensions/reference/api/webNavigation
- Chrome Tabs API: https://developer.chrome.com/docs/extensions/reference/api/tabs
- Chrome Scripting API: https://developer.chrome.com/docs/extensions/reference/api/scripting
- Chrome Service Worker Lifecycle: https://developer.chrome.com/docs/extensions/develop/concepts/service-workers/lifecycle
- MDN MutationObserver: https://developer.mozilla.org/en-US/docs/Web/API/MutationObserver

### Secondary (MEDIUM confidence)
- Jira DOM patterns: General React SPA patterns, not Jira-specific

### Tertiary (LOW confidence)
- Jira exact selectors: Requires live inspection; patterns provided are hypothetical

## Metadata

**Confidence breakdown:**
- Content script configuration: HIGH - Official Chrome documentation
- MutationObserver patterns: HIGH - Standard web API with official docs
- Message passing: HIGH - Official Chrome extension docs
- SPA navigation detection: HIGH - webNavigation API documented
- Jira DOM structure: LOW - Requires live inspection
- Extraction selectors: LOW - Must be discovered during implementation

**Research date:** 2026-01-21
**Valid until:** 2026-02-21 (30 days for stable extension APIs; DOM selectors may change with Jira updates)

---

## Implementation Recommendations

### Task Sequencing

1. **First:** DOM inspection task - Open Jira, document actual selectors
2. **Second:** Page type detection and container waiting
3. **Third:** Board extraction (highest value)
4. **Fourth:** Backlog extraction
5. **Fifth:** Detail page extraction (fallback)
6. **Sixth:** Integration with service worker sync

### Risk Mitigations

| Risk | Mitigation |
|------|------------|
| Jira DOM changes break extraction | Use semantic/data-attribute selectors; graceful degradation |
| Service worker inactive | Handle messaging errors; content script stores data locally |
| Multiple tabs open | Each tab extracts independently; service worker dedupes |
| Extraction takes too long | Timeout and partial extraction support |
| Memory leaks | Proper observer cleanup on navigation |

### Testing Strategy

1. **Manual testing required:** Extension must be loaded in Chrome and tested on live Jira
2. **Test matrix:** Board view, backlog view, issue detail, SPA navigation between them
3. **Edge cases:** Empty sprint, unassigned issues, missing story points
