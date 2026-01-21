# Technology Stack: Jira Sync Browser Extension

**Project:** P&E Manager - Jira Sync Extension
**Researched:** 2026-01-21
**Context:** Adding Jira DOM scraping capability to existing Express.js/PostgreSQL backend

## Executive Summary

This extension must scrape Jira board data from authenticated corporate Jira sessions (no API access) and sync to the P&E Manager Express.js backend on SAP BTP. The stack follows Chrome's Manifest V3 requirements (mandatory since June 2024) and mirrors the existing GitHub integration pattern.

**Key Constraints:**
- No Jira API access (corporate firewall/permissions)
- Must use DOM scraping from authenticated sessions
- Backend is Express.js on SAP BTP (already deployed)
- Must follow existing multi-tenancy pattern (user_id filtering)

---

## Recommended Stack

### Core Extension Framework

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| **Manifest V3** | 3 | Extension manifest format | Mandatory since June 2024. V2 deprecated and will stop working. No choice. |
| **@types/chrome** | ^0.0.278 | TypeScript definitions | Current types (as of Jan 2026). Provides autocomplete/type safety for Chrome APIs. |
| **Webpack** | ^5.96.0 | Bundler | Standard for browser extensions. Better tree-shaking than Vite for extension context. Handles background/content script separation cleanly. |
| **TypeScript** | ^5.7.0 | Type safety | Prevents runtime errors in content scripts. Chrome API types are excellent. Project already uses TS patterns. |

**Rationale:** Manifest V3 is mandatory (V2 extensions stopped loading in Chrome 127+). TypeScript + @types/chrome provides type safety for Chrome APIs which are unforgiving at runtime. Webpack is the de facto standard for extensions because it handles multiple entry points (background, content scripts, popup) better than Vite.

**Confidence:** HIGH (verified from Chrome official docs and npm registry)

---

### DOM Parsing & Scraping

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| **Native DOM APIs** | - | Primary scraping | querySelector/querySelectorAll are sufficient for Jira HTML. Zero bundle cost. |
| **MutationObserver** | - | Detect DOM changes | Jira boards update dynamically (React/SPA). Need to re-scrape when cards change. Built into browser. |
| **XPath (optional)** | - | Fallback selector | Use document.evaluate() for complex selectors if Jira's class names are unstable. |

**Anti-recommendation: Do NOT use:**
- ~~Cheerio~~ - Node.js library, doesn't run in browser context
- ~~jsdom~~ - Runs in Node, not in content script context
- ~~Puppeteer~~ - Server-side browser automation, not for extensions

**Rationale:** Content scripts run in the actual page context with full DOM access. Native APIs (querySelector, MutationObserver) are zero-overhead and sufficient for scraping. Cheerio/jsdom are for Node.js environments where you need to parse HTML strings, not live DOMs.

**Pattern for Jira scraping:**
```typescript
// Content script runs in page context
function scrapeJiraBoard(): JiraBoard {
  const cards = document.querySelectorAll('[data-testid="software-board.card-layout.card"]');
  return Array.from(cards).map(card => ({
    key: card.querySelector('.issue-key')?.textContent,
    summary: card.querySelector('.summary')?.textContent,
    assignee: card.querySelector('.assignee')?.getAttribute('title'),
    status: card.closest('[data-column-id]')?.getAttribute('data-column-id')
  }));
}

// Watch for changes
const observer = new MutationObserver(() => {
  const updated = scrapeJiraBoard();
  chrome.runtime.sendMessage({ type: 'JIRA_DATA_UPDATED', data: updated });
});
observer.observe(document.body, { childList: true, subtree: true });
```

**Confidence:** HIGH (standard pattern for extension DOM scraping)

---

### Extension-Backend Communication

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| **chrome.storage.sync** | - | Store auth tokens | Syncs user's backend token across devices. Max 100KB, perfect for tokens. |
| **fetch API** | - | HTTP requests | Background service worker can make cross-origin requests to backend. |
| **chrome.runtime.sendMessage** | - | Content → Background | Content scripts can't make cross-origin requests. Must proxy through background. |
| **chrome.alarms** | - | Periodic sync | Service workers are ephemeral. Alarms wake them up for polling (min 1 minute intervals). |

**Architecture:**
```
┌──────────────────────────────────────────────────────────┐
│  Content Script (runs on jira.atlassian.net pages)       │
│  - Scrapes DOM                                           │
│  - Detects changes (MutationObserver)                    │
│  - Sends data via chrome.runtime.sendMessage()           │
└──────────────────────────────────────────────────────────┘
                      ↓
┌──────────────────────────────────────────────────────────┐
│  Background Service Worker (background.js)               │
│  - Receives messages from content scripts                │
│  - Makes fetch() requests to Express backend             │
│  - Handles chrome.alarms for periodic sync               │
│  - Stores auth tokens in chrome.storage.sync             │
└──────────────────────────────────────────────────────────┘
                      ↓
┌──────────────────────────────────────────────────────────┐
│  Express.js Backend (existing P&E Manager)               │
│  - POST /api/jira/sync - Receive scraped data            │
│  - Follows JiraService pattern (like GitHubService)      │
│  - Multi-tenant (user_id filtering)                      │
└──────────────────────────────────────────────────────────┘
```

**Rationale:** Content scripts run in isolated world - they can access page DOM but can't make cross-origin requests. Background service workers are the reverse - they can make any HTTP request but can't access page DOMs. This two-layer architecture is required by Chrome's security model.

**Confidence:** HIGH (standard Manifest V3 pattern)

---

### Authentication & Security

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| **chrome.storage.sync** | - | Store backend auth token | User logs into P&E Manager once, extension stores token. Encrypted at rest by Chrome. |
| **JWT (existing)** | - | Backend authentication | Backend already uses JWT for auth. Extension sends token in Authorization header. |
| **Content Security Policy** | - | Security headers | Manifest V3 enforces strict CSP. No inline scripts, no string-to-code execution. |

**Security Model:**
1. User logs into P&E Manager web app (existing flow)
2. Web app provides extension token (JWT) via postMessage or copy-paste
3. Extension stores token in chrome.storage.sync
4. Background worker includes token in all backend requests: `Authorization: Bearer ${token}`
5. Backend validates JWT using existing authMiddleware

**Critical Security Requirements:**
- **Never scrape passwords/credentials** - Only public Jira board data
- **HTTPS only** - Manifest V3 requires HTTPS for external requests
- **CSP compliance** - No string-to-code execution, no inline scripts, no remote script loading
- **Match patterns** - Restrict content scripts to Jira domains only

```json
// manifest.json permissions
{
  "permissions": [
    "storage",
    "alarms"
  ],
  "host_permissions": [
    "https://*.atlassian.net/*",
    "https://pe-manager-backend.cfapps.eu01-canary.hana.ondemand.com/*"
  ],
  "content_scripts": [{
    "matches": ["https://*.atlassian.net/jira/software/c/projects/*/boards/*"],
    "js": ["content.js"]
  }]
}
```

**Rationale:** Following least-privilege principle. Content scripts only run on Jira board pages. Backend requests use existing auth system (no new auth to implement).

**Confidence:** HIGH (standard extension security pattern, matches existing backend auth)

---

### Background Task Management

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| **chrome.alarms** | - | Periodic sync | Service workers are event-driven and shut down when idle. Alarms are persistent. |
| **Service Worker Lifecycle** | - | Event-driven execution | Manifest V3 requires service workers instead of persistent background pages. |

**Service Worker Pattern:**
```typescript
// background.js - Service Worker
chrome.alarms.create('jira-sync', { periodInMinutes: 5 });

chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name === 'jira-sync') {
    // Query all Jira tabs
    const tabs = await chrome.tabs.query({
      url: 'https://*.atlassian.net/jira/software/*/boards/*'
    });

    // Request fresh scrape from each tab
    for (const tab of tabs) {
      chrome.tabs.sendMessage(tab.id, { action: 'SCRAPE_NOW' });
    }
  }
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'JIRA_DATA_UPDATED') {
    // Send to backend
    syncToBackend(message.data).then(sendResponse);
    return true; // Keep channel open for async response
  }
});

async function syncToBackend(jiraData) {
  const token = await chrome.storage.sync.get('backendToken');
  const response = await fetch('https://pe-manager-backend.../api/jira/sync', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token.backendToken}`
    },
    body: JSON.stringify(jiraData)
  });
  return response.json();
}
```

**Critical Differences from Manifest V2:**
- ❌ No persistent background pages (was common in V2)
- ✅ Service workers shut down when idle (save memory)
- ✅ chrome.alarms persist across worker shutdowns
- ❌ No DOM access in service workers (need content scripts)
- ❌ No XMLHttpRequest (use fetch API instead)

**Rationale:** Service workers are mandatory in Manifest V3. They're event-driven and ephemeral (shut down after 30 seconds of inactivity). chrome.alarms is the only reliable way to trigger periodic work because alarms persist even when the service worker is inactive.

**Confidence:** HIGH (Manifest V3 requirements, verified from Chrome docs)

---

### Backend Integration (Following GitHub Pattern)

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| **Express.js** | ^4.18.2 | Existing backend | Already deployed. Add new /api/jira routes. |
| **PostgreSQL** | ^8.11.3 | Database | Existing. Add jira_boards, jira_issues tables. |
| **Multi-tenancy** | - | User isolation | Follow existing pattern: all queries filter by user_id. |

**Backend Service Pattern (mirrors GitHubService.js):**

```javascript
// server/services/JiraService.js
class JiraService {
  async syncBoard(userId, boardData) {
    // Validate user owns this board (multi-tenancy)
    // Upsert board data
    const sql = `
      INSERT INTO jira_boards (user_id, board_id, board_name, project_key)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (user_id, board_id) DO UPDATE SET
        board_name = $3, updated_date = CURRENT_TIMESTAMP
      RETURNING *
    `;
    return query(sql, [userId, boardData.id, boardData.name, boardData.project]);
  }

  async syncIssues(userId, boardId, issues) {
    // Clear old issues
    await query('DELETE FROM jira_issues WHERE board_id = $1 AND user_id = $2', [boardId, userId]);

    // Insert fresh issues
    for (const issue of issues) {
      await query(`
        INSERT INTO jira_issues (
          user_id, board_id, issue_key, summary, status, assignee, story_points
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      `, [userId, boardId, issue.key, issue.summary, issue.status, issue.assignee, issue.points]);
    }
  }

  async listBoards(userId) {
    const sql = 'SELECT * FROM jira_boards WHERE user_id = $1 ORDER BY board_name';
    const result = await query(sql, [userId]);
    return result.rows;
  }

  async getIssues(userId, boardId) {
    const sql = `
      SELECT * FROM jira_issues
      WHERE user_id = $1 AND board_id = $2
      ORDER BY status, issue_key
    `;
    const result = await query(sql, [userId, boardId]);
    return result.rows;
  }
}

export default new JiraService();
```

**REST Routes (mirrors github.js):**
```javascript
// server/routes/jira.js
router.post('/boards/sync', async (req, res) => {
  const { boardData, issues } = req.body;
  const board = await JiraService.syncBoard(req.user.id, boardData);
  await JiraService.syncIssues(req.user.id, board.id, issues);
  res.json({ success: true, board });
});

router.get('/boards', async (req, res) => {
  const boards = await JiraService.listBoards(req.user.id);
  res.json(boards);
});

router.get('/boards/:id/issues', async (req, res) => {
  const issues = await JiraService.getIssues(req.user.id, req.params.id);
  res.json(issues);
});
```

**Database Schema:**
```sql
-- server/db/017_jira_integration.sql
CREATE TABLE jira_boards (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id VARCHAR(255) NOT NULL,
  board_id VARCHAR(50) NOT NULL,
  board_name VARCHAR(255) NOT NULL,
  project_key VARCHAR(50),
  board_url TEXT,
  last_synced_at TIMESTAMP,
  created_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, board_id)
);

CREATE TABLE jira_issues (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id VARCHAR(255) NOT NULL,
  board_id UUID NOT NULL REFERENCES jira_boards(id) ON DELETE CASCADE,
  issue_key VARCHAR(50) NOT NULL,
  summary TEXT,
  description TEXT,
  status VARCHAR(50),
  priority VARCHAR(50),
  assignee VARCHAR(255),
  reporter VARCHAR(255),
  story_points INTEGER,
  labels TEXT[],
  issue_url TEXT,
  created_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, board_id, issue_key)
);

CREATE INDEX idx_jira_boards_user ON jira_boards(user_id);
CREATE INDEX idx_jira_issues_user_board ON jira_issues(user_id, board_id);
CREATE INDEX idx_jira_issues_status ON jira_issues(status);
```

**Rationale:** Exact same pattern as GitHubService. This is proven to work on SAP BTP with multi-tenancy. Minimal changes to existing codebase (just add new routes and service).

**Confidence:** HIGH (existing proven pattern)

---

## Development Dependencies

```json
{
  "devDependencies": {
    "@types/chrome": "^0.0.278",
    "typescript": "^5.7.0",
    "webpack": "^5.96.0",
    "webpack-cli": "^5.1.4",
    "ts-loader": "^9.5.1",
    "copy-webpack-plugin": "^12.0.2"
  }
}
```

---

## Alternatives Considered

### Bundler: Webpack vs Vite vs Rollup

| Tool | Pros | Cons | Verdict |
|------|------|------|---------|
| **Webpack** | Industry standard for extensions. Handles multiple entry points well. Mature plugin ecosystem. | More verbose config. | ✅ **RECOMMENDED** |
| Vite | Already in project. Fast HMR. | Poor support for multiple entry points. Extensions need separate background/content builds. | ❌ Not ideal for extensions |
| Rollup | Excellent tree-shaking. | Requires more manual config for extensions. Less popular for this use case. | ⚠️ Possible but not recommended |

**Recommendation:** Use Webpack for extension, keep Vite for main web app. They can coexist.

### DOM Parsing: Native vs Library

| Approach | Pros | Cons | Verdict |
|----------|------|------|---------|
| **Native DOM APIs** | Zero bundle size. Runs in page context. querySelector is sufficient. | More verbose than jQuery. | ✅ **RECOMMENDED** |
| Cheerio | Nice API. | Node.js only. Doesn't run in browser. | ❌ Wrong environment |
| jsdom | Full DOM emulation. | Node.js only. Extension content scripts run in real browser. | ❌ Wrong environment |

**Recommendation:** Native APIs only. Content scripts have full DOM access - no parsing library needed.

### Communication: Message Passing vs Storage

| Approach | Pros | Cons | Verdict |
|----------|------|------|---------|
| **chrome.runtime.sendMessage** | Real-time. Event-driven. | Requires background worker to be alive (but alarms wake it). | ✅ **RECOMMENDED** |
| chrome.storage.local | Persistent. | Polling required. Not real-time. | ⚠️ Use for cache only |

**Recommendation:** Message passing for data sync, storage for auth tokens and config.

---

## Installation Commands

### Extension Setup
```bash
# In new extension/ directory
npm init -y
npm install --save-dev @types/chrome typescript webpack webpack-cli ts-loader copy-webpack-plugin

# Build extension
npm run build  # Outputs to dist/

# Load in Chrome
# 1. Open chrome://extensions/
# 2. Enable "Developer mode"
# 3. Click "Load unpacked"
# 4. Select dist/ folder
```

### Backend Integration
```bash
# Add to existing P&E Manager backend
cd /Users/i306072/Documents/GitHub/P-E

# Run new migration
npm run migrate

# Add routes to server/index.js
# import jiraRoutes from './routes/jira.js';
# app.use('/api/jira', jiraRoutes);

# Restart backend
npm run dev:server
```

---

## Critical Anti-Patterns

### ❌ Do NOT: Use Manifest V2
**Why:** Chrome removed support in June 2024. Extensions will not load.
**Instead:** Use Manifest V3 (mandatory).

### ❌ Do NOT: Make API calls from content scripts
**Why:** Content scripts can't make cross-origin requests (CORS blocked).
**Instead:** Send message to background worker, make fetch() there.

### ❌ Do NOT: Use persistent background pages
**Why:** Manifest V3 doesn't support them. Will fail review.
**Instead:** Use service workers with chrome.alarms for periodic tasks.

### ❌ Do NOT: Use inline scripts or string-to-code execution
**Why:** Manifest V3 CSP blocks them (security requirement).
**Instead:** Pre-bundle all code with Webpack.

### ❌ Do NOT: Access DOM from background worker
**Why:** Service workers don't have DOM access.
**Instead:** Use content scripts for scraping, message results to background.

### ❌ Do NOT: Scrape Jira without user consent
**Why:** Privacy violation. Extension review will reject.
**Instead:** Require explicit user action to enable sync. Show what data is collected.

### ❌ Do NOT: Bypass multi-tenancy in backend
**Why:** Data leak between users.
**Instead:** ALWAYS filter by user_id in SQL queries (follow GitHubService pattern).

---

## Version Strategy

**Chrome Extension Versioning:**
- Use semantic versioning in manifest.json: `"version": "1.0.0"`
- Increment on each Chrome Web Store release
- Chrome auto-updates extensions within 5 hours

**Backend API Versioning:**
- No API versioning needed (private API, not public)
- Add new endpoints without breaking old ones
- Extension and backend deploy independently

---

## Testing Strategy

### Extension Testing

```typescript
// Manual testing checklist
// 1. Load unpacked extension in chrome://extensions/
// 2. Navigate to Jira board
// 3. Open extension popup - verify board detected
// 4. Click "Sync Now" - verify data appears in P&E Manager
// 5. Check background worker logs: chrome://extensions/ > service worker > Inspect

// Automated testing (optional, complex)
// - Puppeteer with chrome.debugger API
// - Not recommended for MVP - manual testing is faster
```

### Backend Testing

```bash
# Test Jira sync endpoint
curl -X POST http://localhost:3001/api/jira/boards/sync \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "boardData": { "id": "123", "name": "Sprint Board", "project": "PROJ" },
    "issues": [
      { "key": "PROJ-1", "summary": "Task 1", "status": "In Progress" }
    ]
  }'

# Verify multi-tenancy
psql pe_manager -c "SELECT user_id, COUNT(*) FROM jira_issues GROUP BY user_id;"
```

---

## Sources & Confidence Assessment

| Technology | Source | Confidence |
|------------|--------|------------|
| Manifest V3 | Chrome official docs (chrome://extensions/develop) | HIGH |
| @types/chrome | npm registry (verified current version) | HIGH |
| Webpack | Industry standard for extensions (verified in open source extensions) | HIGH |
| Service Workers | Chrome Manifest V3 requirements | HIGH |
| chrome.alarms | Chrome API documentation | HIGH |
| DOM Scraping | Standard browser APIs | HIGH |
| Multi-tenancy | Existing GitHubService.js pattern | HIGH |
| Express Integration | Existing backend architecture | HIGH |

**Overall Confidence: HIGH**

All recommendations based on:
1. Chrome official documentation (Manifest V3 requirements)
2. Existing P&E Manager patterns (GitHubService proven on SAP BTP)
3. Industry standard extension architecture (verified from multiple open-source extensions)

**Known Gaps:**
- Jira's DOM structure is proprietary and may change (requires maintenance)
- Corporate Jira instances may have different HTML than Jira Cloud
- Extension needs field testing with actual corporate Jira to verify selectors

---

## Next Steps

**For roadmap planning:**

1. **Phase 1: Extension Scaffold** - Set up Manifest V3 extension with TypeScript + Webpack
2. **Phase 2: DOM Scraping** - Content script extracts Jira board data (likely needs research flag)
3. **Phase 3: Backend Integration** - Add JiraService following GitHub pattern
4. **Phase 4: Sync Orchestration** - Background worker + chrome.alarms
5. **Phase 5: UI & Settings** - Extension popup for configuration

**Research flags:**
- Phase 2 will need deeper research - Jira's DOM structure is complex and varies by instance
- May need to support multiple Jira versions (Server vs Cloud vs Data Center)
- Corporate SSO/auth might complicate content script injection
