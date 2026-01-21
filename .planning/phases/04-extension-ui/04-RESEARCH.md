# Phase 4: Extension UI - Research

**Researched:** 2026-01-21
**Domain:** Chrome Extension UI (Manifest V3), Badge API, Options Page, Popup
**Confidence:** HIGH

## Summary

This research covers the UI layer for the P&E Jira Sync Chrome extension. Phase 2 established the service worker, storage module, and API client. Phase 3 implemented content scripts for DOM extraction. Phase 4 completes the extension by building out the popup and options page UI, plus implementing the badge API for at-a-glance sync status.

The existing popup.html/popup.js and options.html/options.js files provide a solid foundation but need enhancement to meet requirements EXT-03 (badge status indicator) and UI-04 (settings management with sync history and manual sync trigger).

**Primary recommendation:** Enhance existing popup with sync button and badge integration, upgrade options page with storage change listeners for reactive updates.

## Standard Stack

The extension already uses Manifest V3 with the correct APIs. No new libraries needed.

### Core
| API | Version | Purpose | Why Standard |
|-----|---------|---------|--------------|
| chrome.action | MV3 | Badge text/color, popup management | Standard MV3 API for toolbar icon |
| chrome.storage.local | MV3 | Persistent settings storage | Used for auth token, sync state |
| chrome.runtime | MV3 | Message passing to service worker | Standard extension communication |

### Supporting
| API | Version | Purpose | When to Use |
|-----|---------|---------|-------------|
| chrome.storage.onChanged | MV3 | Reactive UI updates | When sync status changes in background |
| chrome.runtime.openOptionsPage | MV3 | Navigate to options | From popup "Settings" button |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Inline CSS | External CSS file | For larger extensions; inline is fine for simple UI |
| chrome.storage.sync | chrome.storage.local | sync is 100KB limit, local is 10MB; local preferred for auth tokens |
| Long-lived connections | One-time messages | Long-lived better for real-time updates; one-time simpler for request/response |

## Architecture Patterns

### Existing Extension Structure
```
extension/
├── manifest.json           # Already configured with action, options_page
├── service-worker.js       # Message handler with MessageType enum
├── popup/
│   ├── popup.html          # Basic structure exists
│   └── popup.js            # GET_STATUS, TEST_CONNECTION implemented
├── options/
│   ├── options.html        # Backend URL and auth token fields exist
│   └── options.js          # Save/load from chrome.storage.local
└── lib/
    ├── storage.js          # Storage wrapper with sync status methods
    └── api.js              # Backend API client
```

### Pattern 1: Badge Status Updates
**What:** Update extension icon badge when sync status changes
**When to use:** After every sync operation (success, error, syncing states)
**Example:**
```javascript
// Source: https://developer.chrome.com/docs/extensions/reference/api/action

// Badge states:
// - Empty: Never synced / idle
// - "..." : Syncing in progress (blue)
// - Check mark or count: Success (green)
// - "!" : Error (red)

async function updateBadge(status) {
  switch (status) {
    case 'syncing':
      await chrome.action.setBadgeText({ text: '...' });
      await chrome.action.setBadgeBackgroundColor({ color: '#2196F3' }); // Blue
      break;
    case 'success':
      await chrome.action.setBadgeText({ text: '' }); // Clear on success
      break;
    case 'error':
      await chrome.action.setBadgeText({ text: '!' });
      await chrome.action.setBadgeBackgroundColor({ color: '#F44336' }); // Red
      break;
    case 'never':
      await chrome.action.setBadgeText({ text: '' });
      break;
  }
}
```

### Pattern 2: Reactive Popup Updates via storage.onChanged
**What:** Popup updates automatically when sync status changes in background
**When to use:** Popup is open while sync happens in service worker
**Example:**
```javascript
// Source: https://developer.chrome.com/docs/extensions/reference/api/storage

// In popup.js - listen for storage changes
chrome.storage.onChanged.addListener((changes, namespace) => {
  if (namespace === 'local' && changes.lastSync) {
    const newStatus = changes.lastSync.newValue;
    updateStatusDisplay(newStatus);
  }
});
```

### Pattern 3: Message Passing for Actions
**What:** Popup sends messages to service worker for operations
**When to use:** Manual sync trigger, test connection
**Example:**
```javascript
// Source: https://developer.chrome.com/docs/extensions/develop/concepts/messaging

// Popup sends action request
const response = await chrome.runtime.sendMessage({
  type: 'MANUAL_SYNC'
});

// Service worker handles and responds
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  handleMessage(message, sender)
    .then(response => sendResponse(response));
  return true; // Keep channel open for async
});
```

### Anti-Patterns to Avoid
- **Polling for status:** Don't use setInterval to check status. Use storage.onChanged for reactive updates.
- **Storing state in popup.js variables:** Popup can be closed/reopened. Always read from chrome.storage.
- **Blocking UI on sync:** Show "syncing" state immediately, let background complete asynchronously.
- **Large badge text:** Keep to 4 characters or less. "..." or "!" are ideal.

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Badge colors | CSS color conversion | chrome.action.setBadgeBackgroundColor accepts CSS colors directly | API accepts '#FF0000', 'red', or [255,0,0,255] formats |
| Options page navigation | window.open() | chrome.runtime.openOptionsPage() | Works with both embedded and full-page options |
| Reactive updates | setTimeout polling | chrome.storage.onChanged | Event-driven, no wasted cycles |
| Relative timestamps | Custom date logic | Built-in Date.toLocaleString() or minimal date-fns | Already in project |

**Key insight:** Chrome extension APIs are designed for exactly these use cases. The badge API, storage listeners, and message passing handle all the cross-context coordination that would be complex to build manually.

## Common Pitfalls

### Pitfall 1: Badge Not Updating
**What goes wrong:** Badge updates don't appear on icon
**Why it happens:** Calling setBadgeText without awaiting, or missing action permission
**How to avoid:** Always await badge API calls; verify "action" in manifest
**Warning signs:** Badge stays blank despite console logs showing updates

### Pitfall 2: Popup Loses State on Reopen
**What goes wrong:** Popup shows stale data when reopened
**Why it happens:** State stored in JS variables, not chrome.storage
**How to avoid:** Load fresh from storage on DOMContentLoaded every time
**Warning signs:** Opening popup shows old sync time, closing/reopening fixes it

### Pitfall 3: Options Page Saves But Service Worker Ignores
**What goes wrong:** User changes settings but sync uses old values
**Why it happens:** Service worker caches config in memory variables
**How to avoid:** Service worker should read from Storage module on every operation
**Warning signs:** Works after extension reload but not immediately

### Pitfall 4: Sync Button Clicks Multiple Times
**What goes wrong:** Multiple sync operations triggered
**Why it happens:** No debounce or button disable during operation
**How to avoid:** Disable button and show loading state immediately on click
**Warning signs:** Console shows multiple MANUAL_SYNC messages

### Pitfall 5: Error Messages Too Long for Badge
**What goes wrong:** Error details don't fit in badge
**Why it happens:** Trying to show full error in badge text
**How to avoid:** Badge shows "!" only; full error in popup info area
**Warning signs:** Truncated or unreadable badge text

## Code Examples

Verified patterns from official Chrome documentation:

### Badge API - Set Status Colors
```javascript
// Source: https://developer.chrome.com/docs/extensions/reference/api/action

// Green for success
await chrome.action.setBadgeBackgroundColor({ color: '#4CAF50' });
await chrome.action.setBadgeText({ text: '' }); // Clear badge on success

// Red for error
await chrome.action.setBadgeBackgroundColor({ color: '#F44336' });
await chrome.action.setBadgeText({ text: '!' });

// Blue for syncing
await chrome.action.setBadgeBackgroundColor({ color: '#2196F3' });
await chrome.action.setBadgeText({ text: '...' });
```

### Storage Change Listener for Reactive UI
```javascript
// Source: https://developer.chrome.com/docs/extensions/reference/api/storage

chrome.storage.onChanged.addListener((changes, namespace) => {
  if (namespace !== 'local') return;

  if (changes.lastSync) {
    const { newValue } = changes.lastSync;
    updateStatusDisplay(newValue);
  }

  if (changes.backendUrl || changes.authToken) {
    // Re-validate configuration state
    checkConfiguration();
  }
});
```

### Message Passing with Async Response
```javascript
// Source: https://developer.chrome.com/docs/extensions/develop/concepts/messaging

// In popup.js
async function triggerManualSync() {
  const btn = document.getElementById('syncBtn');
  btn.disabled = true;
  btn.textContent = 'Syncing...';

  try {
    const response = await chrome.runtime.sendMessage({ type: 'MANUAL_SYNC' });
    if (response.success) {
      showStatus('success', 'Sync complete');
    } else {
      showStatus('error', response.error);
    }
  } catch (error) {
    showStatus('error', error.message);
  } finally {
    btn.disabled = false;
    btn.textContent = 'Sync Now';
  }
}
```

### Options Page - Save with Feedback
```javascript
// Source: https://developer.chrome.com/docs/extensions/develop/ui/options-page

async function saveOptions() {
  const backendUrl = document.getElementById('backendUrl').value.trim();
  const authToken = document.getElementById('authToken').value.trim();

  // Validate URL format
  try {
    new URL(backendUrl);
  } catch {
    showMessage('Invalid URL format', 'error');
    return;
  }

  await chrome.storage.local.set({ backendUrl, authToken });

  // Show confirmation
  const status = document.getElementById('status');
  status.textContent = 'Settings saved!';
  status.className = 'message success';
  setTimeout(() => { status.textContent = ''; }, 2000);
}
```

### Timestamp Formatting
```javascript
// Simple relative time display
function formatSyncTime(timestamp) {
  if (!timestamp) return 'Never';

  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;

  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;

  return date.toLocaleDateString();
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| chrome.browserAction | chrome.action | MV3 (Chrome 88) | Unified badge API |
| Background pages | Service workers | MV3 (Chrome 88) | No persistent state in JS |
| chrome.storage callbacks | async/await with Promises | Chrome 93+ | Cleaner async code |

**Deprecated/outdated:**
- `chrome.browserAction` replaced by `chrome.action` in Manifest V3
- Callback-style storage APIs still work but Promises preferred

## Existing Code Analysis

### popup.html (Current)
- Basic structure with status div, test button, options button
- CSS classes for loading/success/error/warning states
- Width set to 300px (appropriate for popup)
- **Missing:** Manual sync button, issue count display

### popup.js (Current)
- Loads status on DOMContentLoaded via GET_STATUS message
- Handles TEST_CONNECTION for backend verification
- Opens options page via chrome.runtime.openOptionsPage()
- **Missing:** Manual sync trigger, storage.onChanged listener, badge updates

### options.html (Current)
- Backend URL input with placeholder showing production URL
- Auth token textarea for JWT paste
- Save button with success/error message display
- **Missing:** Connection test, sync history view

### options.js (Current)
- Loads settings from chrome.storage.local on page load
- Validates URL format before save
- Shows confirmation message with timeout
- **Complete for MVP** - handles URL and auth token

### service-worker.js (Current)
- Handles MANUAL_SYNC message type
- Updates sync status in storage
- **Missing:** Badge update calls on sync status change

## Implementation Gaps

To meet requirements EXT-03 and UI-04, the following needs to be added:

### For EXT-03 (Badge Status Indicator)
1. Add badge update function in service-worker.js
2. Call badge update after each sync status change
3. Badge states: empty (idle/success), "..." (syncing), "!" (error)

### For UI-04 (Extension Settings Management)
1. Popup: Add "Sync Now" button triggering MANUAL_SYNC
2. Popup: Add storage.onChanged listener for reactive updates
3. Popup: Show issue count from lastSync.issueCount
4. Options: Already complete for backend URL and auth token
5. Options: Optional - add "Test Connection" button

## Open Questions

Things that couldn't be fully resolved:

1. **Badge text for issue count?**
   - What we know: Badge can show short text (4 chars max)
   - What's unclear: Should success show issue count (e.g., "42") or stay empty?
   - Recommendation: Keep empty on success (clean), show count only in popup

2. **Stale data warning threshold?**
   - What we know: Requirements mention "stale" state
   - What's unclear: How many hours before data is considered stale?
   - Recommendation: 1 hour threshold, show "Last sync: 2h ago" in yellow

## Sources

### Primary (HIGH confidence)
- Chrome Extension Action API: https://developer.chrome.com/docs/extensions/reference/api/action
  - Badge methods: setBadgeText, setBadgeBackgroundColor, setBadgeTextColor
  - Tab-specific vs global badge settings

- Chrome Extension Storage API: https://developer.chrome.com/docs/extensions/reference/api/storage
  - onChanged event for reactive updates
  - local vs sync storage guidance

- Chrome Extension Messaging: https://developer.chrome.com/docs/extensions/develop/concepts/messaging
  - One-time messages with sendMessage
  - Async response patterns

- Chrome Extension Options Page: https://developer.chrome.com/docs/extensions/develop/ui/options-page
  - Storage patterns for preferences
  - Save confirmation UI patterns

### Secondary (MEDIUM confidence)
- Existing extension code review (Phase 2 implementation)
- Phase 2 CONTEXT.md decisions on message protocol and storage schema

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Official Chrome APIs, no third-party libraries
- Architecture: HIGH - Built on Phase 2 patterns, verified with official docs
- Pitfalls: HIGH - Common issues documented in Chrome extension forums

**Research date:** 2026-01-21
**Valid until:** 90 days (Chrome extension APIs are stable)
