# Domain Pitfalls: Browser Extension + DOM Scraping + Backend Sync

**Domain:** Chrome extension scraping corporate Jira (DOM-based, no API)
**Researched:** 2026-01-21
**Confidence:** MEDIUM (based on domain expertise, WebSearch unavailable)

## Critical Pitfalls

Mistakes that cause rewrites or major production issues.

### Pitfall 1: Manifest V3 Service Worker Lifecycle Misunderstanding

**What goes wrong:** Background scripts in Manifest V3 are service workers that terminate after 30 seconds of inactivity. Developers treat them like persistent background pages (Manifest V2), storing state in global variables or assuming continuous execution. When the service worker terminates, all in-memory state is lost, timers are cancelled, and polling stops.

**Why it happens:**
- Migration from Manifest V2 mental model
- Chrome DevTools showing service worker as "active" during development (doesn't reflect production behavior)
- Assuming `setInterval()` will keep service worker alive

**Consequences:**
- Polling stops unexpectedly after 30 seconds
- Lost scraping state (which boards were being monitored)
- Duplicate data syncs when service worker restarts
- Race conditions between service worker termination and network requests

**Prevention:**
1. Use `chrome.alarms` API for polling (persists across service worker restarts)
2. Store all state in `chrome.storage.local` or `chrome.storage.session`
3. Implement idempotent sync operations (handle duplicate syncs gracefully)
4. Design for stateless service workers - every wake-up should recover state from storage

**Detection:**
- Extension stops polling after leaving Jira tab idle for minutes
- Console logs disappear after 30 seconds of inactivity
- `chrome.alarms` not firing after service worker restart
- Duplicate data appearing in backend after service worker reactivation

**Phase:** Phase 1 (Architecture) - Service worker lifecycle must be core to design

---

### Pitfall 2: Brittle CSS/DOM Selectors

**What goes wrong:** Scrapers rely on fragile selectors like `.css-12345`, `div:nth-child(3)`, or hardcoded data attributes that Jira changes without notice. Corporate Jira updates break scraping silently - extension keeps running but returns empty/incorrect data.

**Why it happens:**
- Using auto-generated class names (e.g., CSS modules, styled-components hashes)
- Relying on DOM structure (child/sibling relationships) instead of semantic markers
- Not understanding that corporate Jira customizations differ from cloud Jira
- Single-point-of-failure selectors with no fallback strategy

**Consequences:**
- Silent data loss (scraper returns empty results, no error thrown)
- Incorrect data mapping (scraping wrong fields after DOM restructure)
- Extension works in dev (Jira version X) but fails in production (Jira version Y)
- Costly emergency maintenance when Atlassian pushes updates

**Prevention:**
1. **Selector strategy hierarchy:**
   - Primary: `data-*` attributes (most stable)
   - Secondary: Semantic HTML + ARIA attributes (`role`, `aria-label`)
   - Tertiary: Structural patterns (fallback only)
   - NEVER: Auto-generated class names alone

2. **Multi-selector fallback chains:**
```javascript
// BAD
const title = document.querySelector('.css-1234 > span');

// GOOD
const title =
  document.querySelector('[data-testid="issue-title"]') ||
  document.querySelector('[aria-label*="issue"] h1') ||
  document.querySelector('.issue-view-header h1');
```

3. **Validation layer:**
   - Every scrape validates expected data shape
   - Missing fields trigger warnings
   - Track selector success rates in backend

4. **Version detection:**
   - Detect Jira version from meta tags or DOM markers
   - Store known-working selector sets per version
   - Graceful degradation when version unrecognized

**Detection:**
- Empty arrays returned where data should exist
- Null/undefined values in scraped objects
- Backend showing 0 updates when Jira board has activity
- Error logs: "Cannot read property X of null"
- Selector success rate drops below threshold

**Phase:** Phase 2 (Scraping Logic) - Needs robust selector architecture from start

---

### Pitfall 3: DOM Not Ready / SPA Navigation Race Conditions

**What goes wrong:** Jira is a React SPA that loads content asynchronously. Scrapers run immediately on `DOMContentLoaded` but the actual board data hasn't rendered yet. Navigation between boards doesn't trigger full page loads, causing scrapers to miss new content or scrape stale data.

**Why it happens:**
- Assuming traditional page load lifecycle (static HTML)
- Not accounting for React hydration delays
- Missing SPA navigation events (pushState/replaceState)
- Race conditions between AJAX requests completing and DOM updates

**Consequences:**
- Scraper captures loading states ("Loading...") as real data
- Missed updates when users navigate between boards
- Inconsistent scraping results (sometimes works, sometimes empty)
- Duplicated scraping logic across content script and navigation handlers

**Prevention:**
1. **Wait for content strategies:**
```javascript
// Use MutationObserver to detect when content actually loads
const waitForSelector = (selector, timeout = 5000) => {
  return new Promise((resolve, reject) => {
    if (document.querySelector(selector)) {
      return resolve(document.querySelector(selector));
    }

    const observer = new MutationObserver(() => {
      if (document.querySelector(selector)) {
        observer.disconnect();
        resolve(document.querySelector(selector));
      }
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true
    });

    setTimeout(() => {
      observer.disconnect();
      reject(new Error('Timeout waiting for selector'));
    }, timeout);
  });
};
```

2. **SPA navigation detection:**
   - Listen to `popstate` events
   - Intercept History API (`pushState`, `replaceState`)
   - Watch URL changes via `chrome.webNavigation.onHistoryStateUpdated`

3. **Idempotency checks:**
   - Hash scraped content, only sync if changed
   - Track last-scraped board ID/timestamp
   - Deduplicate within backend

4. **Retry with exponential backoff:**
   - First attempt may hit loading state
   - Retry 2-3 times with increasing delays (500ms, 1s, 2s)

**Detection:**
- Scraped data contains "Loading..." text
- Empty results on first navigation, populated on second
- Console warnings: "Selector not found"
- Backend receives duplicate identical payloads
- Scraping works when page is refreshed but not on SPA navigation

**Phase:** Phase 2 (Scraping Logic) - Critical for reliability

---

### Pitfall 4: Memory Leaks from Unmanaged MutationObservers

**What goes wrong:** MutationObservers watch the DOM for changes but are never disconnected. Each page navigation or scraping attempt creates new observers that accumulate in memory. Over time (hours/days), the extension consumes gigabytes of RAM, causing browser slowdown and crashes.

**Why it happens:**
- Creating observers in content scripts without cleanup
- Not disconnecting observers after scraping completes
- Re-scraping on every DOM mutation (infinite loop)
- Multiple content script injections creating duplicate observers

**Consequences:**
- Browser memory usage grows unbounded (GB+ after hours)
- Tab freezes or crashes
- Extension disabled by Chrome for excessive resource usage
- User complaints about browser performance

**Prevention:**
1. **Always disconnect observers:**
```javascript
let observer = null;

function startScraping() {
  // Cleanup previous observer if exists
  if (observer) {
    observer.disconnect();
  }

  observer = new MutationObserver((mutations) => {
    // Scraping logic
    scrapeBoard();
  });

  observer.observe(target, config);
}

function cleanup() {
  if (observer) {
    observer.disconnect();
    observer = null;
  }
}

// Cleanup on navigation away
window.addEventListener('beforeunload', cleanup);
```

2. **Debounce mutation callbacks:**
   - DOM mutations fire hundreds of times per second
   - Debounce to run scraping max once per 500ms-1s

3. **Use specific observe targets:**
   - Don't observe `document.body` with `subtree: true` unless necessary
   - Target specific containers (board container, issue list)

4. **Content script lifecycle management:**
   - Track if content script already injected
   - Prevent duplicate injections
   - Use `run_at: "document_idle"` in manifest

**Detection:**
- Chrome Task Manager shows extension using 500MB+ memory
- Memory profiler shows MutationObserver count growing unbounded
- Browser tab becomes sluggish after extension runs for hours
- Console shows "too many mutations" warnings

**Phase:** Phase 2 (Scraping Logic) - Must be addressed during implementation

---

### Pitfall 5: Backend Sync Without Deduplication/Conflict Resolution

**What goes wrong:** Extension sends every scraped payload to backend without checking if data already exists or has changed. Race conditions between multiple tabs, duplicate scrapes, and service worker restarts cause:
- Duplicate records in database (same Jira issue inserted 5 times)
- Conflicting updates (older scrape overwrites newer data)
- Backend overwhelmed with redundant API calls
- Data integrity issues (inconsistent state between Jira and backend)

**Why it happens:**
- Assuming extension is single-threaded (ignoring multi-tab scenarios)
- No client-side caching or diffing before sync
- Backend using POST instead of upsert logic
- Not using Jira issue keys as idempotent identifiers

**Consequences:**
- Database bloat (10x actual data size)
- "Duplicate key" errors from backend
- Stale data displayed to users (old scrape overwrites new)
- Backend performance degradation from unnecessary writes
- Audit trail corrupted (can't determine source of truth)

**Prevention:**
1. **Client-side deduplication:**
```javascript
// Hash scraped data, only sync if changed
const currentHash = hashObject(scrapedData);
const previousHash = await chrome.storage.local.get('lastSyncHash');

if (currentHash !== previousHash.lastSyncHash) {
  await syncToBackend(scrapedData);
  await chrome.storage.local.set({ lastSyncHash: currentHash });
}
```

2. **Backend upsert logic:**
```javascript
// Use Jira issue key as unique identifier
const upsertIssue = async (issueData) => {
  const sql = `
    INSERT INTO jira_issues (jira_key, title, status, updated_date)
    VALUES ($1, $2, $3, $4)
    ON CONFLICT (jira_key)
    DO UPDATE SET
      title = EXCLUDED.title,
      status = EXCLUDED.status,
      updated_date = EXCLUDED.updated_date
    WHERE jira_issues.updated_date < EXCLUDED.updated_date;
  `;
  await query(sql, [issueData.key, issueData.title, issueData.status, new Date()]);
};
```

3. **Optimistic locking with timestamps:**
   - Backend compares `scraped_at` timestamp with existing record
   - Only update if scraped version is newer
   - Return conflict status to extension

4. **Multi-tab coordination:**
   - Use `chrome.storage.local` with mutex pattern
   - One tab becomes "leader" for syncing
   - Others defer to leader or use exponential backoff

5. **Batch sync with diffs:**
   - Don't sync every field change
   - Collect changes, compute diff, send batch update
   - Include "deleted" issues (removed from board)

**Detection:**
- Database has multiple rows with same Jira issue key
- Backend logs show identical payloads sent seconds apart
- Users report seeing duplicate issues in UI
- Database `updated_date` timestamps don't match Jira modification times
- Backend API rate limits triggered

**Phase:** Phase 3 (Backend Sync) - Core sync architecture

---

### Pitfall 6: Content Security Policy (CSP) Violations

**What goes wrong:** Corporate Jira has strict CSP that blocks extension's content scripts from executing inline scripts, accessing certain APIs, or making network requests. Extension installs successfully but fails silently at runtime.

**Why it happens:**
- Not declaring required permissions in manifest
- Attempting inline script execution in content scripts
- Using dynamic code execution (forbidden by CSP)
- Making requests to backend without `host_permissions`

**Consequences:**
- Content scripts fail to inject
- Network requests to backend blocked by CSP
- Console errors: "Refused to execute inline script"
- Extension appears broken with no visible errors to user

**Prevention:**
1. **Manifest V3 permission declarations:**
```json
{
  "permissions": [
    "storage",
    "alarms",
    "scripting"
  ],
  "host_permissions": [
    "https://jira.tools.sap/*"
  ],
  "content_security_policy": {
    "extension_pages": "script-src 'self'; object-src 'self'"
  }
}
```

2. **Avoid inline scripts:**
   - All scripts must be external files
   - No `onclick="..."` handlers
   - Use event listeners: `element.addEventListener()`

3. **Use message passing for network requests:**
   - Content scripts can't bypass CSP
   - Send message to background script
   - Background script makes backend API call (not subject to page CSP)

4. **Test in actual corporate environment:**
   - Dev environment may have relaxed CSP
   - Production Jira at `jira.tools.sap` may differ significantly

**Detection:**
- Console errors: "Refused to load/execute due to CSP"
- Network requests show CORS errors
- Extension permissions warning during installation
- Features work in local Jira but fail in corporate instance

**Phase:** Phase 1 (Architecture) - Manifest configuration upfront

---

## Moderate Pitfalls

Mistakes that cause delays or technical debt.

### Pitfall 7: Polling Too Aggressively

**What goes wrong:** Extension polls Jira every 5-10 seconds, consuming CPU, battery, and network bandwidth unnecessarily.

**Prevention:**
- Start with conservative polling (5 minutes)
- Use exponential backoff if no changes detected
- Only poll when user has Jira tab active (use `chrome.tabs.query` + `active: true`)
- Consider user-configurable polling interval

**Detection:**
- High CPU usage in background
- Battery drain complaints
- Network traffic shows constant requests

**Phase:** Phase 3 (Backend Sync) - Optimize after MVP

---

### Pitfall 8: No Offline Handling

**What goes wrong:** Extension crashes or loses data when network is unavailable. Backend sync failures are not retried.

**Prevention:**
- Queue failed syncs in `chrome.storage.local`
- Retry queue on network reconnection (`online` event)
- Show offline indicator in popup
- Implement exponential backoff for failed requests

**Detection:**
- Extension stops working on spotty WiFi
- Data loss after network interruptions
- Backend missing data that was scraped

**Phase:** Phase 4 (Resilience) - After core sync working

---

### Pitfall 9: Missing Error Observability

**What goes wrong:** Extension fails silently in production. Users report "not working" but no logs available.

**Prevention:**
- Log all errors to `chrome.storage.local` with timestamps
- Implement error reporting to backend (opt-in)
- Surface error count in extension popup
- Include Jira version, selector success rates in diagnostics

**Detection:**
- User complaints with no reproducible steps
- "Works on my machine" debugging loops
- No visibility into production failure modes

**Phase:** Phase 4 (Resilience) - Before wider rollout

---

### Pitfall 10: Scope Creep: Trying to Scrape Everything

**What goes wrong:** Attempting to scrape all Jira fields, comments, attachments, history in MVP. Complexity explodes, selectors break constantly.

**Prevention:**
- Start with minimal viable fields (title, status, assignee, board)
- Expand incrementally based on user feedback
- Document "out of scope" fields explicitly
- Prioritize fields least likely to change DOM structure

**Detection:**
- Scraping code becomes unmaintainable (1000+ lines)
- Constant selector breakage
- Performance issues from over-scraping

**Phase:** Phase 2 (Scraping Logic) - Scope definition

---

## Minor Pitfalls

Mistakes that cause annoyance but are fixable.

### Pitfall 11: No User Feedback During Scraping

**What goes wrong:** Users don't know if extension is working. Silent failures look like success.

**Prevention:**
- Show badge count with scraped issue count
- Display last sync timestamp in popup
- Visual indicator when scraping active
- Error messages when scraping fails

**Phase:** Phase 5 (Polish) - UX improvements

---

### Pitfall 12: Hardcoded Jira URL

**What goes wrong:** Extension hardcoded to `jira.tools.sap`, can't be used for other Jira instances.

**Prevention:**
- Make Jira base URL configurable
- Auto-detect from current tab URL
- Support multiple Jira instances per user

**Phase:** Phase 5 (Polish) - If reusability desired

---

### Pitfall 13: No Data Versioning in Backend

**What goes wrong:** Backend schema changes break existing data. No migration path.

**Prevention:**
- Version API responses (`{ version: 1, data: {...} }`)
- Backend supports multiple schema versions
- Extension sends version number with syncs
- Plan migration strategy for schema changes

**Phase:** Phase 3 (Backend Sync) - API design

---

## Phase-Specific Warnings

| Phase Topic | Likely Pitfall | Mitigation |
|-------------|---------------|------------|
| Manifest configuration | CSP violations, missing permissions | Phase 1: Declare all permissions upfront, test in corporate Jira |
| Service worker architecture | Treating as persistent background page | Phase 1: Design stateless, use chrome.alarms, storage APIs |
| Scraping logic | Brittle selectors, DOM not ready | Phase 2: Fallback chains, MutationObserver, validation layer |
| Backend sync | Duplicate data, no conflict resolution | Phase 3: Upsert logic, client-side deduplication, timestamps |
| Polling strategy | Too aggressive, battery drain | Phase 3: Start conservative (5 min), optimize later |
| Error handling | Silent failures in production | Phase 4: Logging, error reporting, diagnostics panel |
| Multi-tab coordination | Race conditions, duplicate syncs | Phase 4: Leader election or mutex pattern |
| Performance | Memory leaks from observers | Phase 2: Always disconnect, debounce, specific targets |

---

## Corporate Jira-Specific Warnings

### Atlassian Updates Break Selectors

**Frequency:** Monthly Jira Cloud updates, quarterly on-premise updates

**Mitigation:**
- Subscribe to Atlassian developer changelogs
- Automated tests that scrape staging Jira
- Fallback selector chains
- Version detection and compatibility matrix

### Custom Jira Configurations

Corporate Jira often has:
- Custom fields (different DOM structure)
- Custom workflows (status values differ)
- Renamed default fields
- Plugins that modify DOM

**Mitigation:**
- Make field mappings configurable
- Detect custom fields dynamically
- Graceful degradation for unsupported customizations

### Network Restrictions

Corporate networks may:
- Block external API calls from browser extensions
- Require VPN for backend connectivity
- Have proxy servers that modify requests

**Mitigation:**
- Backend hosted on same corporate network (or accessible via VPN)
- CORS properly configured
- Test in actual corporate network environment

---

## Confidence Assessment

| Category | Confidence | Notes |
|----------|------------|-------|
| Service Worker Lifecycle | HIGH | Well-documented Manifest V3 limitation |
| DOM Scraping Brittleness | HIGH | Universal web scraping challenge |
| SPA Navigation | HIGH | React-based apps have consistent patterns |
| Memory Leaks | HIGH | Common MutationObserver pitfall |
| Backend Sync | MEDIUM | Depends on specific backend architecture |
| CSP Violations | MEDIUM | Corporate Jira CSP not verified (no WebSearch) |
| Corporate Jira Specifics | LOW | Based on general enterprise Jira knowledge |

---

## Sources

**Note:** WebSearch tool unavailable during research. This document is based on:
- Domain expertise: Browser extension development (Manifest V3)
- Domain expertise: Web scraping and SPA interaction patterns
- Domain expertise: Backend sync patterns for distributed clients
- General knowledge: Corporate Atlassian Jira deployment patterns

**Verification recommended:**
- Test actual CSP policies on `jira.tools.sap`
- Verify Jira version and customizations in target environment
- Confirm network restrictions for extension → backend communication
- Review Atlassian documentation for DOM structure stability commitments

**Confidence level:** MEDIUM overall due to lack of verified sources for corporate Jira specifics, but HIGH for general browser extension + scraping patterns.
