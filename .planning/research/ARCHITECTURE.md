# Architecture Patterns: Browser Extension + Backend Sync

**Domain:** Chrome Extension with Backend Integration
**Researched:** 2026-01-21
**Overall Confidence:** HIGH (based on established patterns in codebase + Manifest V3 knowledge)

## Executive Summary

Browser extensions that sync with backend APIs follow a multi-layered architecture with clear separation between:
1. **Content layer** - DOM access and page interaction
2. **Extension runtime** - Message passing, storage, background tasks
3. **Backend API layer** - Data persistence and cross-device sync
4. **Database layer** - Multi-tenant storage

For the Jira integration, this architecture will mirror the existing GitHub integration pattern already successfully implemented in P&E Manager.

## Recommended Architecture

### System Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    JIRA WEB PAGE (jira.com)                  │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  Content Script (content.js)                           │ │
│  │  - DOM observation/scraping                            │ │
│  │  - Extract ticket data                                 │ │
│  │  - Inject UI elements                                  │ │
│  └─────────────┬──────────────────────────────────────────┘ │
└────────────────┼────────────────────────────────────────────┘
                 │ chrome.runtime.sendMessage()
                 ↓
┌─────────────────────────────────────────────────────────────┐
│              CHROME EXTENSION RUNTIME                        │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  Service Worker (background.js) - Manifest V3          │ │
│  │  - Message routing                                     │ │
│  │  - API authentication                                  │ │
│  │  - Periodic sync coordination                          │ │
│  │  - chrome.storage management                           │ │
│  └─────────────┬──────────────────────────────────────────┘ │
│                │                                             │
│  ┌────────────┴────────────────────────────────────────────┐│
│  │  Popup UI (popup.html/jsx)                              ││
│  │  - Manual sync trigger                                  ││
│  │  - Configuration                                        ││
│  │  - Status display                                       ││
│  └─────────────┬──────────────────────────────────────────┘ │
└────────────────┼────────────────────────────────────────────┘
                 │ fetch() with auth headers
                 ↓
┌─────────────────────────────────────────────────────────────┐
│           EXPRESS.JS BACKEND (SAP BTP)                       │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  Routes (server/routes/jira.js)                        │ │
│  │  - POST /api/jira/sync                                 │ │
│  │  - GET /api/jira/tickets                               │ │
│  │  - POST /api/jira/tickets                              │ │
│  │  - DELETE /api/jira/tickets/:id                        │ │
│  └─────────────┬──────────────────────────────────────────┘ │
│                │                                             │
│  ┌────────────┴────────────────────────────────────────────┐│
│  │  Service (server/services/JiraService.js)               ││
│  │  - Data validation                                      ││
│  │  - Multi-tenancy enforcement (user_id filter)           ││
│  │  - Business logic                                       ││
│  └─────────────┬──────────────────────────────────────────┘ │
└────────────────┼────────────────────────────────────────────┘
                 │ SQL queries
                 ↓
┌─────────────────────────────────────────────────────────────┐
│              POSTGRESQL DATABASE                             │
│  - jira_tickets (user_id, ticket_key, summary, etc.)        │
│  - jira_sync_history (last_synced_at, status, errors)       │
│  - user_settings (jira_instance_url, preferences)           │
└─────────────────────────────────────────────────────────────┘
```

## Component Boundaries

### Extension Components

| Component | Responsibility | Access | Lifespan |
|-----------|---------------|--------|----------|
| **Content Script** | DOM scraping, page observation, data extraction | Full DOM access, no cross-origin fetch | Per-page load |
| **Service Worker** | Message hub, API calls, alarm scheduling, storage | Cross-origin fetch, chrome.* APIs | Event-driven (terminates when idle) |
| **Popup** | User interface, manual triggers, settings | Limited (must message service worker for data) | Opened/closed by user |
| **Options Page** | Extension configuration | Similar to popup | Rarely accessed |

### Backend Components (Matches GitHub Pattern)

| Component | Responsibility | Communicates With |
|-----------|---------------|-------------------|
| **Auth Middleware** | Verify JWT, extract user_id | All protected routes |
| **Routes** | HTTP endpoint definitions, validation | Service layer |
| **Service** | Business logic, multi-tenancy, data transformation | Database via connection pool |
| **Database** | Data persistence with user_id isolation | Service layer only |

## Data Flow Patterns

### Pattern 1: Manual Sync from Extension Popup

**Trigger:** User clicks "Sync Now" button in extension popup

```
1. popup.js: User clicks sync button
   ↓
2. popup.js: chrome.runtime.sendMessage({ action: 'syncJira' })
   ↓
3. background.js: Receives message in chrome.runtime.onMessage
   ↓
4. background.js: Reads auth token from chrome.storage.local
   ↓
5. background.js: fetch('https://backend.btp/api/jira/sync', {
     headers: { Authorization: 'Bearer <token>' }
   })
   ↓
6. backend/routes/jira.js: authMiddleware validates JWT
   ↓
7. backend/services/JiraService.js: Processes sync request
   ↓
8. PostgreSQL: INSERT/UPDATE jira_tickets WHERE user_id = <extracted_from_jwt>
   ↓
9. Response: { success: true, synced_count: 5 }
   ↓
10. background.js: chrome.runtime.sendMessage({ action: 'syncComplete', data })
   ↓
11. popup.js: Updates UI with sync results
```

### Pattern 2: Automatic DOM Observation (Content Script)

**Trigger:** User navigates to Jira ticket page

```
1. content.js: MutationObserver detects DOM changes
   ↓
2. content.js: Extracts ticket data from DOM
   {
     key: 'PROJ-123',
     summary: 'Fix login bug',
     status: 'In Progress',
     assignee: 'john.doe',
     priority: 'High'
   }
   ↓
3. content.js: chrome.runtime.sendMessage({
     action: 'ticketViewed',
     ticket: { ... }
   })
   ↓
4. background.js: Receives ticket data
   ↓
5. background.js: Stores in chrome.storage.local (temporary cache)
   ↓
6. background.js: Queues for backend sync
   ↓
7. [Later] background.js: Batch sends to backend
   ↓
8. backend: Stores in PostgreSQL with user_id
```

### Pattern 3: Periodic Background Sync

**Trigger:** chrome.alarms API (every 15 minutes)

```
1. background.js: chrome.alarms.onAlarm.addListener((alarm) => {
     if (alarm.name === 'jiraSyncAlarm') { ... }
   })
   ↓
2. background.js: Check if user has Jira token configured
   ↓
3. background.js: Collect cached tickets from chrome.storage.local
   ↓
4. background.js: POST batch to /api/jira/sync
   ↓
5. backend: Processes batch, deduplicates by ticket key
   ↓
6. PostgreSQL: UPSERT with ON CONFLICT (user_id, ticket_key)
   ↓
7. background.js: Clear synced items from cache
   ↓
8. background.js: Update sync timestamp
```

### Pattern 4: Backend to Frontend Web App

**Trigger:** User opens P&E Manager web app

```
1. Frontend: useEffect(() => { loadJiraTickets(); }, [])
   ↓
2. Frontend: fetch('/api/jira/tickets', {
     headers: { Authorization: 'Bearer <session_token>' }
   })
   ↓
3. backend/routes/jira.js: GET /api/jira/tickets
   ↓
4. backend/services/JiraService.js:
   SELECT * FROM jira_tickets WHERE user_id = $1
   ↓
5. Response: [{ key, summary, status, ... }]
   ↓
6. Frontend: Displays tickets in UI
```

## Authentication Flow

### Extension → Backend Authentication

**Storage Location:** `chrome.storage.local.get('authToken')`

**Token Lifecycle:**

```
1. User logs into P&E Manager web app
   ↓
2. Web app receives JWT token from backend
   ↓
3. Web app triggers postMessage() to extension (if installed)
   ↓
4. Extension content script: window.addEventListener('message', (e) => {
     if (e.data.type === 'PE_AUTH_TOKEN') {
       chrome.runtime.sendMessage({
         action: 'saveAuthToken',
         token: e.data.token
       });
     }
   })
   ↓
5. Service worker: chrome.storage.local.set({ authToken: token })
   ↓
6. All backend requests include: Authorization: Bearer <authToken>
```

**Alternative (Simpler Initial Approach):** Extension popup opens Settings page in web app, user copies auth token from web app, pastes into extension settings (similar to GitHub PAT pattern).

### Jira Instance Configuration

**Storage:** `chrome.storage.sync` for cross-device sync
**Keys:**
- `jira_instance_url` - e.g., "https://yourcompany.atlassian.net"
- `jira_project_keys` - e.g., ["PROJ", "ENG", "SUPPORT"]
- `auto_sync_enabled` - boolean
- `sync_interval_minutes` - 15, 30, 60

## Database Schema (Follows GitHub Pattern)

### Table: jira_tickets

```sql
CREATE TABLE jira_tickets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id VARCHAR(100) NOT NULL,

  -- Jira identifiers
  ticket_key VARCHAR(50) NOT NULL,        -- PROJ-123
  jira_instance_url VARCHAR(512) NOT NULL, -- https://company.atlassian.net

  -- Ticket data
  summary TEXT,
  description TEXT,
  status VARCHAR(100),
  ticket_type VARCHAR(50),                -- Bug, Story, Task, Epic
  priority VARCHAR(50),
  assignee VARCHAR(255),
  reporter VARCHAR(255),

  -- Dates
  created_at TIMESTAMP,
  updated_at TIMESTAMP,
  resolved_at TIMESTAMP,

  -- Metadata
  project_key VARCHAR(50),
  labels JSONB DEFAULT '[]',
  components JSONB DEFAULT '[]',
  fix_versions JSONB DEFAULT '[]',

  -- Sync metadata
  last_synced_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  source VARCHAR(50) DEFAULT 'extension',  -- extension, api, manual

  -- Optional link to P&E project
  project_id UUID REFERENCES projects(id) ON DELETE SET NULL,

  created_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  UNIQUE(user_id, jira_instance_url, ticket_key)
);

CREATE INDEX idx_jira_tickets_user_id ON jira_tickets(user_id);
CREATE INDEX idx_jira_tickets_key ON jira_tickets(ticket_key);
CREATE INDEX idx_jira_tickets_status ON jira_tickets(status);
CREATE INDEX idx_jira_tickets_assignee ON jira_tickets(assignee);
```

### Table: jira_sync_history

```sql
CREATE TABLE jira_sync_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id VARCHAR(100) NOT NULL,

  sync_type VARCHAR(50),               -- manual, automatic, extension
  tickets_synced INTEGER DEFAULT 0,
  tickets_created INTEGER DEFAULT 0,
  tickets_updated INTEGER DEFAULT 0,

  status VARCHAR(50),                  -- success, partial, failed
  error_message TEXT,

  started_at TIMESTAMP,
  completed_at TIMESTAMP,

  created_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_jira_sync_user_id ON jira_sync_history(user_id);
CREATE INDEX idx_jira_sync_started_at ON jira_sync_history(started_at);
```

### Reuse: user_settings table (already exists from GitHub integration)

```sql
-- Already exists, just add new keys:
-- 'jira_instance_url'
-- 'jira_auto_sync'
-- 'jira_sync_interval'
-- 'jira_project_filter'
```

## Manifest V3 Configuration

### manifest.json Structure

```json
{
  "manifest_version": 3,
  "name": "P&E Jira Sync",
  "version": "1.0.0",
  "description": "Sync Jira tickets to P&E Manager",

  "permissions": [
    "storage",
    "alarms",
    "activeTab"
  ],

  "host_permissions": [
    "https://*.atlassian.net/*",
    "https://pe-manager-backend.cfapps.eu01-canary.hana.ondemand.com/*"
  ],

  "background": {
    "service_worker": "background.js",
    "type": "module"
  },

  "content_scripts": [
    {
      "matches": [
        "https://*.atlassian.net/browse/*",
        "https://*.atlassian.net/jira/software/projects/*"
      ],
      "js": ["content.js"],
      "run_at": "document_idle"
    }
  ],

  "action": {
    "default_popup": "popup.html",
    "default_icon": {
      "16": "icons/icon16.png",
      "48": "icons/icon48.png",
      "128": "icons/icon128.png"
    }
  },

  "options_page": "options.html"
}
```

## Build Order & Dependencies

### Phase 1: Foundation (Backend First)

**Why backend first:** Allows testing with manual data before extension complexity.

1. **Database schema** - `017_jira_integration.sql`
   - jira_tickets table
   - jira_sync_history table
   - Triggers for auto-timestamps

2. **Backend service** - `server/services/JiraService.js`
   - CRUD operations following multi-tenancy pattern
   - Sync history tracking
   - Deduplication logic (UPSERT on ticket_key)

3. **Backend routes** - `server/routes/jira.js`
   - POST /api/jira/tickets (create/update)
   - GET /api/jira/tickets (list with filters)
   - POST /api/jira/sync (batch sync endpoint)
   - DELETE /api/jira/tickets/:id

**Test with:** curl or Postman to verify API works before building extension.

### Phase 2: Extension Core (Service Worker)

**Why service worker next:** Core message routing and storage before UI.

4. **Service worker** - `extension/background.js`
   - Message routing (chrome.runtime.onMessage)
   - chrome.storage.local management
   - Backend API client with auth headers
   - Alarm scheduling for periodic sync

5. **Storage schema**
   - authToken (string)
   - jiraInstanceUrl (string)
   - pendingTickets (array) - tickets waiting to sync
   - lastSyncTimestamp (number)

**Test with:** Extension loaded unpacked, use chrome.runtime.sendMessage() from console.

### Phase 3: Content Script (DOM Scraping)

**Why after service worker:** Needs service worker to handle messages.

6. **Content script** - `extension/content.js`
   - DOM selectors for Jira ticket fields
   - MutationObserver for dynamic content
   - Message sending to service worker
   - Error handling for DOM structure changes

**Test with:** Navigate to Jira tickets, verify extraction in console logs.

### Phase 4: UI Components

**Why last:** User interface depends on working data flow.

7. **Popup UI** - `extension/popup.html` + `popup.js`
   - Manual sync trigger button
   - Connection status display
   - Configuration inputs (Jira URL)
   - Sync history log

8. **Options page** - `extension/options.html`
   - Advanced settings
   - Project filter configuration
   - Sync interval selection

### Phase 5: Frontend Integration (Web App)

**Why after extension works:** Extension can work standalone first.

9. **Frontend API client** - Add JiraTicket to `src/api/entities.js`

10. **Frontend components** - `src/components/jira/`
    - JiraSettings.jsx (similar to GitHubSettings.jsx)
    - JiraTicketList.jsx
    - JiraTicketCard.jsx

11. **Frontend page** - `src/pages/JiraTickets.jsx`

## Patterns to Follow

### Pattern 1: Multi-Tenancy Enforcement

**CRITICAL:** All database queries MUST filter by user_id.

```javascript
// ✅ CORRECT - Always include user_id filter
async listTickets(userId, filters = {}) {
  const sql = `
    SELECT * FROM jira_tickets
    WHERE user_id = $1
    ORDER BY updated_at DESC
  `;
  return await query(sql, [userId]);
}

// ❌ WRONG - Missing user_id allows data leakage
async listTickets(filters = {}) {
  const sql = 'SELECT * FROM jira_tickets ORDER BY updated_at DESC';
  return await query(sql);
}
```

### Pattern 2: Idempotent Sync

**Use UPSERT to handle duplicate syncs:**

```javascript
async syncTicket(userId, ticketData) {
  const sql = `
    INSERT INTO jira_tickets (
      user_id, jira_instance_url, ticket_key,
      summary, status, assignee, updated_at
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7)
    ON CONFLICT (user_id, jira_instance_url, ticket_key)
    DO UPDATE SET
      summary = $4,
      status = $5,
      assignee = $6,
      updated_at = $7,
      last_synced_at = CURRENT_TIMESTAMP
    RETURNING *
  `;

  return await query(sql, [
    userId,
    ticketData.instanceUrl,
    ticketData.key,
    ticketData.summary,
    ticketData.status,
    ticketData.assignee,
    ticketData.updatedAt
  ]);
}
```

### Pattern 3: Service Worker Lifecycle (Manifest V3)

**Service workers terminate when idle - use chrome.storage for persistence:**

```javascript
// ❌ WRONG - Variables don't persist across service worker restarts
let authToken = null;
let pendingTickets = [];

// ✅ CORRECT - Store in chrome.storage
async function getAuthToken() {
  const { authToken } = await chrome.storage.local.get('authToken');
  return authToken;
}

async function addPendingTicket(ticket) {
  const { pendingTickets = [] } = await chrome.storage.local.get('pendingTickets');
  pendingTickets.push(ticket);
  await chrome.storage.local.set({ pendingTickets });
}
```

### Pattern 4: Content Script Isolation

**Content scripts can't use chrome.storage directly - must message service worker:**

```javascript
// content.js - Extract ticket data and send to service worker
function extractTicketData() {
  const ticketKey = document.querySelector('[data-testid="issue.views.issue-base.foundation.breadcrumbs.current-issue.item"]')?.textContent;
  const summary = document.querySelector('[data-testid="issue.views.issue-base.foundation.summary.heading"]')?.textContent;

  chrome.runtime.sendMessage({
    action: 'ticketViewed',
    ticket: {
      key: ticketKey,
      summary: summary,
      url: window.location.href
    }
  });
}

// background.js - Receive and store
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'ticketViewed') {
    addPendingTicket(message.ticket).then(() => {
      sendResponse({ success: true });
    });
    return true; // Required for async sendResponse
  }
});
```

### Pattern 5: Token Storage Strategy

**Follow GitHub pattern: Store auth token in user_settings, reference from extension:**

```javascript
// Backend: UserSettingsService.js (already exists)
async getJiraInstanceUrl(userId) {
  return this.get(userId, 'jira_instance_url');
}

async setJiraInstanceUrl(userId, url) {
  return this.set(userId, 'jira_instance_url', url);
}

// Extension: Store backend auth token
chrome.storage.local.set({
  authToken: '<jwt_from_webapp>',
  backendUrl: 'https://pe-manager-backend.cfapps.eu01-canary.hana.ondemand.com'
});
```

## Communication Patterns

### Extension Internal Communication

```javascript
// Popup → Service Worker
chrome.runtime.sendMessage(
  { action: 'syncNow' },
  (response) => console.log(response)
);

// Content Script → Service Worker
chrome.runtime.sendMessage(
  { action: 'ticketData', data: {...} }
);

// Service Worker → Popup (if open)
chrome.runtime.sendMessage(
  { action: 'syncProgress', progress: 75 }
);
```

### Extension → Backend Communication

```javascript
// Service worker makes authenticated requests
async function syncToBackend(tickets) {
  const { authToken } = await chrome.storage.local.get('authToken');
  const { backendUrl } = await chrome.storage.local.get('backendUrl');

  const response = await fetch(`${backendUrl}/api/jira/sync`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${authToken}`
    },
    body: JSON.stringify({ tickets })
  });

  if (!response.ok) {
    throw new Error(`Sync failed: ${response.status}`);
  }

  return response.json();
}
```

### Web App → Backend Communication

```javascript
// Reuses existing apiClient pattern
import { JiraTicket } from '@/api/entities';

// In component
const tickets = await JiraTicket.list();
const ticket = await JiraTicket.create({
  key: 'PROJ-123',
  summary: 'Bug fix'
});
```

## Anti-Patterns to Avoid

### Anti-Pattern 1: Storing Sensitive Data in chrome.storage.sync

**Problem:** chrome.storage.sync uploads to Google servers, not encrypted.

```javascript
// ❌ WRONG - Exposes auth token to Google sync
chrome.storage.sync.set({ authToken: 'sensitive-token' });

// ✅ CORRECT - Use chrome.storage.local for sensitive data
chrome.storage.local.set({ authToken: 'sensitive-token' });
```

### Anti-Pattern 2: Long-Running Service Worker Tasks

**Problem:** Service workers auto-terminate after 30 seconds of inactivity.

```javascript
// ❌ WRONG - May terminate mid-sync
async function syncAllTickets() {
  const tickets = await fetchAllTicketsFromJira(); // Takes 2 minutes
  await sendToBackend(tickets);
}

// ✅ CORRECT - Batch and queue
async function syncAllTickets() {
  const tickets = await fetchAllTicketsFromJira();
  const batches = chunk(tickets, 10);

  for (const batch of batches) {
    await sendBatch(batch);
    await delay(100); // Prevent termination
  }
}
```

### Anti-Pattern 3: Direct DOM Manipulation from Service Worker

**Problem:** Service workers have no DOM access.

```javascript
// ❌ WRONG - Service worker can't access DOM
chrome.runtime.onMessage.addListener((msg) => {
  document.querySelector('.ticket').textContent = msg.data;
});

// ✅ CORRECT - Send message back to content script
chrome.tabs.sendMessage(tabId, {
  action: 'updateTicket',
  data: msg.data
});
```

### Anti-Pattern 4: Ignoring CORS in Extension

**Problem:** Extensions still need host_permissions for cross-origin requests.

```json
// ❌ WRONG - Missing host_permissions
{
  "permissions": ["storage"],
  "background": { "service_worker": "background.js" }
}

// ✅ CORRECT - Declare host_permissions
{
  "permissions": ["storage"],
  "host_permissions": [
    "https://backend.example.com/*"
  ],
  "background": { "service_worker": "background.js" }
}
```

## Scalability Considerations

### At 100 tickets/user

**Approach:** Direct sync on each ticket view

- Content script sends ticket immediately
- Service worker syncs to backend instantly
- No batching needed

### At 1000 tickets/user

**Approach:** Batch and queue

- Content script queues tickets in chrome.storage.local
- Service worker syncs batches every 15 minutes
- Backend uses UPSERT to deduplicate

### At 10K+ tickets/user

**Approach:** Differential sync

- Track last_synced_at per ticket
- Only sync tickets updated since last sync
- Backend API accepts `since` parameter:
  `GET /api/jira/tickets?since=2026-01-20T10:00:00Z`
- Consider pagination: `GET /api/jira/tickets?page=1&limit=100`

## Error Handling Strategy

### Extension Error Handling

```javascript
// Graceful degradation in content script
function extractTicketData() {
  try {
    const key = document.querySelector(SELECTOR_KEY)?.textContent;
    if (!key) {
      console.warn('Jira ticket key not found - page structure may have changed');
      return null;
    }
    return { key, ... };
  } catch (error) {
    console.error('Failed to extract ticket data:', error);
    chrome.runtime.sendMessage({
      action: 'logError',
      error: error.message
    });
    return null;
  }
}
```

### Backend Error Handling

```javascript
// Consistent error responses
router.post('/api/jira/sync', async (req, res) => {
  try {
    const result = await JiraService.sync(req.user.id, req.body.tickets);
    res.json(result);
  } catch (error) {
    console.error('Jira sync error:', error);
    res.status(500).json({
      error: error.message,
      code: 'SYNC_FAILED'
    });
  }
});
```

### Retry Logic

```javascript
// Service worker retry with exponential backoff
async function syncWithRetry(tickets, maxRetries = 3) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await syncToBackend(tickets);
    } catch (error) {
      if (attempt === maxRetries) throw error;

      const delay = Math.pow(2, attempt) * 1000; // 2s, 4s, 8s
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
}
```

## Security Considerations

### 1. Token Storage

- **Extension:** chrome.storage.local (device-only, not synced)
- **Backend:** user_settings table (encrypted at rest via BTP)
- **Never:** Log tokens, send in GET parameters, store in chrome.storage.sync

### 2. Content Script Injection

- **Only inject on Jira domains:** Use `matches` in manifest.json
- **Validate DOM structure:** Check for expected elements before scraping
- **Sanitize extracted data:** Prevent XSS from malicious ticket content

### 3. Backend Authentication

- **Every request:** Validate JWT token via authMiddleware
- **Extract user_id from JWT:** Never trust client-provided user_id
- **CORS whitelist:** Only allow extension and web app origins

### 4. Multi-Tenancy

- **All queries filter by user_id:** No user should see another's data
- **Database indexes on user_id:** Prevent full table scans
- **Test with multiple users:** Verify isolation in staging

## Performance Optimizations

### Extension Performance

1. **Debounce DOM observations:** Don't trigger on every DOM mutation
   ```javascript
   let debounceTimer;
   observer.observe(target, {
     childList: true,
     subtree: true
   });

   function handleMutation() {
     clearTimeout(debounceTimer);
     debounceTimer = setTimeout(() => {
       extractAndSync();
     }, 500); // Wait 500ms of inactivity
   }
   ```

2. **Lazy load content script:** Use `run_at: "document_idle"` in manifest

3. **Minimize chrome.storage writes:** Batch updates instead of per-ticket writes

### Backend Performance

1. **Database indexes:** Already planned on user_id, ticket_key, status

2. **Batch inserts:** Use single INSERT with multiple rows instead of loop
   ```javascript
   const values = tickets.map((t, i) =>
     `($${i*6+1}, $${i*6+2}, $${i*6+3}, $${i*6+4}, $${i*6+5}, $${i*6+6})`
   ).join(',');

   const sql = `INSERT INTO jira_tickets (user_id, ticket_key, ...) VALUES ${values}`;
   ```

3. **Pagination:** Implement `?page=&limit=` for large ticket lists

4. **Caching:** Consider Redis for frequently accessed ticket lists (future enhancement)

## Testing Strategy

### Extension Testing

1. **Manual testing:**
   - Load unpacked extension
   - Navigate to Jira tickets
   - Verify extraction in console
   - Test popup interactions

2. **Automated testing (future):**
   - Jest for business logic
   - Puppeteer for end-to-end

### Backend Testing

1. **Unit tests:** Service layer (JiraService.js)
   ```javascript
   describe('JiraService', () => {
     it('should enforce user_id in all queries', async () => {
       const tickets = await JiraService.list('user-1');
       expect(tickets.every(t => t.user_id === 'user-1')).toBe(true);
     });
   });
   ```

2. **Integration tests:** API routes with test database

3. **Multi-tenancy tests:** Verify user isolation

### Regression Testing

- **Jira DOM changes:** Content script selectors may break when Jira updates
- **Monitor:** Log extraction failures to backend
- **Fallback:** Gracefully degrade if selectors fail

## Deployment Checklist

### Extension Deployment

1. Build: `npm run build:extension`
2. Test unpacked in Chrome
3. Package as .zip
4. Submit to Chrome Web Store
5. Provide backend URL in extension options

### Backend Deployment

1. Run migration: `npm run migrate` (adds jira tables)
2. Deploy to BTP: `cf push pe-manager-backend`
3. Verify health check: `GET /api/health`
4. Test endpoints: `curl -H "Authorization: Bearer <token>" /api/jira/tickets`

### Coordination

- **Version compatibility:** Extension v1.0 works with backend API v1
- **Breaking changes:** Version extension and backend together
- **Rollback plan:** Keep old API endpoints during transition period

## Roadmap Implications

### Phase Structure Recommendation

Based on dependency analysis:

1. **Phase 1: Backend Foundation** (1-2 weeks)
   - Database schema
   - Service layer
   - REST API routes
   - Test with curl/Postman

2. **Phase 2: Extension Core** (1-2 weeks)
   - Service worker
   - Storage management
   - Backend API integration
   - Test with manual messages

3. **Phase 3: Content Script** (1 week)
   - DOM scraping
   - Data extraction
   - Message passing
   - Test on real Jira pages

4. **Phase 4: Extension UI** (1 week)
   - Popup interface
   - Options page
   - Status displays

5. **Phase 5: Web App Integration** (1 week)
   - Frontend API client
   - Jira page component
   - Settings integration

### Critical Path

```
Database schema → Service layer → Routes → Service worker → Content script → UI
```

**Cannot parallelize:**
- Content script depends on service worker
- Service worker depends on backend routes
- Backend routes depend on service layer
- Service layer depends on database schema

**Can parallelize:**
- Popup UI + Options page (both depend on service worker, independent of each other)
- Frontend web app components (depends on backend routes, independent of extension UI)

## Sources

**Confidence Level:** HIGH

**Based on:**
1. Existing GitHub integration pattern in codebase (PRIMARY SOURCE)
   - `/server/services/GitHubService.js` - Service layer pattern
   - `/server/routes/github.js` - REST API pattern
   - `/server/db/016_github_integration.sql` - Database schema pattern
   - `/src/components/github/GitHubSettings.jsx` - Frontend integration pattern

2. Chrome Extension Manifest V3 architecture (from training data, Jan 2025)
   - Service worker lifecycle
   - Content script isolation
   - Message passing APIs
   - chrome.storage patterns

3. Express.js + PostgreSQL patterns already established in P&E Manager
   - Multi-tenancy enforcement via user_id
   - Auth middleware pattern
   - Service → Routes → Database layering
   - SAP BTP deployment configuration

**Notes:**
- Architecture directly mirrors successful GitHub integration
- All patterns already proven in production deployment
- Manifest V3 knowledge current as of training date (Jan 2025)
- DOM scraping specifics for Jira will require live testing (selectors change)
