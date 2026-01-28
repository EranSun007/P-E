# Phase 2 Context: Extension Core

## Phase Goal
Extension can authenticate with backend, store data, and sync via service worker

## Requirements Covered
- EXT-01: Manifest V3 structure
- EXT-08: Extension storage management
- EXT-09: Backend API communication

## Success Criteria
1. Extension installs in Chrome with Manifest V3 structure
2. Service worker responds to messages from popup and content script
3. Auth token persists in chrome.storage.local across browser restarts
4. Service worker successfully POSTs test data to backend /api/jira-issues/sync
5. Sync status (success/error/timestamp) stored and retrievable

## Decisions Made

### 1. Auth Token Source
**Decision**: Manual entry in options page
**Rationale**: Users copy auth token from P&E Manager settings page. Simple, no OAuth complexity for MVP.

### 2. Backend URL Configuration
**Decision**: Configurable via options page with production default
**Default URL**: `https://pe-manager-backend.cfapps.eu01-canary.hana.ondemand.com`
**Rationale**: Allows testing against local backend during development.

### 3. Message Protocol
**Decision**: Simple `{type, payload}` JSON messages
**Message Types**:
- `SYNC_ISSUES` - Content script → Service worker (with issues array)
- `GET_STATUS` - Popup → Service worker (request sync status)
- `STATUS_UPDATE` - Service worker → Popup (broadcast status changes)
- `MANUAL_SYNC` - Popup → Service worker (trigger sync)

### 4. Sync Trigger Strategy
**Decision**: Hybrid approach
- **Automatic**: When content script extracts data, send to service worker
- **On-demand**: Manual sync button in popup
- **No periodic sync**: Only sync when user is actively on Jira pages

### 5. Error Retry Strategy
**Decision**: Exponential backoff with 3 retries max
- Retry 1: 1 second delay
- Retry 2: 2 second delay
- Retry 3: 4 second delay
- After 3 failures: Store error state, show in popup, wait for manual retry

## Extension Structure (Manifest V3)

```
extension/
├── manifest.json          # Extension manifest
├── service-worker.js      # Background service worker
├── popup/
│   ├── popup.html         # Popup UI
│   └── popup.js           # Popup logic
├── options/
│   ├── options.html       # Options page
│   └── options.js         # Options logic
├── content/
│   └── content.js         # Content script (Phase 3)
└── lib/
    ├── storage.js         # chrome.storage wrapper
    └── api.js             # Backend API client
```

## Storage Schema (chrome.storage.local)

```javascript
{
  // Authentication
  "authToken": "jwt-token-here",
  "backendUrl": "https://pe-manager-backend.cfapps.eu01-canary.hana.ondemand.com",

  // Sync state
  "lastSync": {
    "timestamp": "2026-01-21T14:30:00Z",
    "status": "success", // "success" | "error" | "syncing"
    "issueCount": 42,
    "error": null
  },

  // Pending data (for retry)
  "pendingIssues": []
}
```

## Key Implementation Notes

1. **Service Worker Lifecycle**: Manifest V3 service workers can be terminated by Chrome. All state must be in chrome.storage, not in-memory variables.

2. **Message Passing**: Use `chrome.runtime.sendMessage()` for popup/content → service worker. Use `chrome.runtime.onMessage` listener in service worker.

3. **CORS**: Backend already has CORS configured. Extension requests bypass CORS via background service worker.

4. **Security**: Auth token stored in chrome.storage.local (not sync) - stays on device, not synced to cloud.

## Dependencies on Phase 1
- Backend `/api/jira-issues/sync` endpoint (verified working)
- Auth middleware accepts JWT tokens
- Backend CORS allows extension origin (chrome-extension://)

## What Phase 2 Does NOT Include
- Content script DOM scraping (Phase 3)
- Popup UI styling (Phase 4)
- Options page styling (Phase 4)
- Web app integration (Phase 5)
