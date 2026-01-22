# Phase 7: Extension Core - Research

**Researched:** 2026-01-22
**Domain:** Chrome Extension Manifest V3, dynamic content script registration, generic DOM extraction
**Confidence:** HIGH

## Summary

Phase 7 transforms the v1.0 Jira-specific extension into a configurable multi-site capture framework. The existing extension provides a solid foundation with Manifest V3 architecture, service worker patterns, and content script communication via CustomEvents. The key evolution is replacing hardcoded Jira selectors with rule-based extraction driven by user-defined capture rules stored in the backend.

The Chrome `scripting.registerContentScripts()` API enables dynamic content script injection based on URL patterns from rules. The extension will fetch rules on startup and register content scripts for each enabled rule's URL pattern. A new generic extractor replaces the site-specific extractors (board.js, backlog.js, detail.js), applying selectors from the rule configuration to extract data.

**Primary recommendation:** Migrate incrementally - keep Jira extraction working during transition, add rule-based capture alongside it, then deprecate hardcoded extractors once the generic system is proven.

## Standard Stack

The established libraries/tools for this domain:

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| chrome.scripting | MV3 | Dynamic content script registration | Official API for runtime script injection |
| chrome.storage.local | MV3 | Persist rules, settings, pending captures | Already in use, proven pattern |
| chrome.action | MV3 | Badge text/color for pending count | Already in use for sync status |
| chrome.alarms | MV3 | Periodic rule refresh | Official API for background tasks |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| chrome.permissions | MV3 | Runtime host permission requests | When rules target new domains |
| chrome.runtime | MV3 | Message passing | Content script <-> service worker |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| scripting.registerContentScripts | Static manifest entries | Static can't handle user-defined patterns |
| chrome.alarms | setInterval | Alarms survive service worker restarts |
| optional_host_permissions | Broad host_permissions | Better security, user control |

**Installation:**
No new packages required - uses Chrome Extension APIs already available in Manifest V3.

## Architecture Patterns

### Recommended Project Structure
```
extension/
├── manifest.json              # Updated permissions, optional_host_permissions
├── service-worker.js          # Rule fetching, script registration, badge updates
├── lib/
│   ├── api.js                 # Add capture-rules and capture-inbox endpoints
│   ├── storage.js             # Add rules cache, pending inbox count
│   └── rule-matcher.js        # NEW: URL pattern matching utilities
├── content/
│   ├── content.js             # Keep for v1.0 compatibility (Jira)
│   ├── generic-extractor.js   # NEW: Rule-based DOM extraction
│   └── extractors/            # Keep for Jira fallback
├── popup/
│   ├── popup.html             # Add pending inbox count display
│   └── popup.js               # Add manual capture trigger, rule refresh
└── options/
    ├── options.html           # Keep existing config
    └── options.js             # Keep existing config
```

### Pattern 1: Dynamic Content Script Registration
**What:** Register content scripts at runtime based on rules fetched from backend
**When to use:** When URL patterns are not known at build time
**Example:**
```javascript
// Source: https://developer.chrome.com/docs/extensions/reference/api/scripting

// Service worker: Register scripts for enabled rules
async function registerRuleScripts(rules) {
  // First unregister all existing dynamic scripts
  const existing = await chrome.scripting.getRegisteredContentScripts();
  if (existing.length > 0) {
    await chrome.scripting.unregisterContentScripts({
      ids: existing.map(s => s.id)
    });
  }

  // Register new scripts for each enabled rule
  const scripts = rules
    .filter(r => r.enabled)
    .map(rule => ({
      id: `rule-${rule.id}`,
      matches: [rule.url_pattern],
      js: ['content/generic-extractor.js'],
      runAt: 'document_idle',
      persistAcrossSessions: true
    }));

  if (scripts.length > 0) {
    await chrome.scripting.registerContentScripts(scripts);
  }
}
```

### Pattern 2: Generic Selector-Based Extraction
**What:** Apply rule-defined selectors to DOM, return extracted field values
**When to use:** When extraction logic is data-driven, not code-driven
**Example:**
```javascript
// Source: Based on existing board.js pattern, generalized

/**
 * Apply selectors from rule to extract data from page
 * @param {Array} selectors - Array of {field_name, selector, type, required}
 * @returns {Object} - Extracted data keyed by field_name
 */
function extractBySelectors(selectors) {
  const data = {};
  const errors = [];

  for (const config of selectors) {
    const { field_name, selector, type = 'text', required = false } = config;

    try {
      const element = document.querySelector(selector);

      if (!element) {
        if (required) {
          errors.push(`Required field "${field_name}" not found: ${selector}`);
        }
        data[field_name] = null;
        continue;
      }

      // Extract based on type
      switch (type) {
        case 'text':
          data[field_name] = element.textContent?.trim() || null;
          break;
        case 'html':
          data[field_name] = element.innerHTML?.trim() || null;
          break;
        case 'attribute':
          data[field_name] = element.getAttribute(config.attribute) || null;
          break;
        case 'href':
          data[field_name] = element.href || element.getAttribute('href') || null;
          break;
        case 'src':
          data[field_name] = element.src || element.getAttribute('src') || null;
          break;
        default:
          data[field_name] = element.textContent?.trim() || null;
      }
    } catch (error) {
      console.warn(`[PE-Capture] Selector error for "${field_name}":`, error);
      data[field_name] = null;
      if (required) {
        errors.push(`Error extracting "${field_name}": ${error.message}`);
      }
    }
  }

  return { data, errors };
}
```

### Pattern 3: Rule Caching with Periodic Refresh
**What:** Cache rules locally, refresh periodically via alarm
**When to use:** Reduce API calls, maintain responsiveness when backend unavailable
**Example:**
```javascript
// Service worker: Rule caching pattern

const RULES_CACHE_KEY = 'captureRules';
const RULES_REFRESH_ALARM = 'refresh-capture-rules';
const RULES_REFRESH_INTERVAL_MINUTES = 30;

// On startup, load cached rules and schedule refresh
chrome.runtime.onStartup.addListener(async () => {
  await loadRulesFromCache();
  await scheduleRuleRefresh();
});

async function loadRulesFromCache() {
  const { captureRules } = await chrome.storage.local.get(RULES_CACHE_KEY);
  if (captureRules?.rules) {
    await registerRuleScripts(captureRules.rules);
  }
}

async function refreshRulesFromBackend() {
  try {
    const rules = await Api.getCaptureRules();
    await chrome.storage.local.set({
      [RULES_CACHE_KEY]: {
        rules,
        lastRefresh: Date.now()
      }
    });
    await registerRuleScripts(rules);
    return { success: true, count: rules.length };
  } catch (error) {
    console.error('[PE-Capture] Failed to refresh rules:', error);
    return { success: false, error: error.message };
  }
}

async function scheduleRuleRefresh() {
  await chrome.alarms.create(RULES_REFRESH_ALARM, {
    periodInMinutes: RULES_REFRESH_INTERVAL_MINUTES
  });
}

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === RULES_REFRESH_ALARM) {
    refreshRulesFromBackend();
  }
});
```

### Pattern 4: Badge Count from Pending Inbox
**What:** Show pending inbox item count on extension badge
**When to use:** Give user visibility into captured items awaiting review
**Example:**
```javascript
// Source: https://developer.chrome.com/docs/extensions/reference/api/action

async function updateBadgeCount() {
  try {
    const items = await Api.getInboxItems({ status: 'pending' });
    const count = items.length;

    if (count === 0) {
      await chrome.action.setBadgeText({ text: '' });
    } else {
      await chrome.action.setBadgeText({ text: count > 99 ? '99+' : String(count) });
      await chrome.action.setBadgeBackgroundColor({ color: '#FF9800' }); // Orange
    }
  } catch (error) {
    // Don't update badge if API fails - keep previous state
    console.warn('[PE-Capture] Failed to update badge count:', error);
  }
}

// Call after successful capture
async function handleCaptureSuccess(capturedData) {
  await updateBadgeCount();
}
```

### Anti-Patterns to Avoid
- **Hardcoding URL patterns in manifest:** Use dynamic registration for user rules
- **Registering scripts without unregistering first:** Always clear existing before re-registering
- **Syncing rules on every page load:** Cache locally, refresh periodically
- **Blocking on badge updates:** Make badge refresh non-blocking
- **Storing rules in service worker variables:** Service workers restart; use chrome.storage

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| URL pattern matching | Regex matching | Chrome's Match Patterns | Browser validates/handles edge cases |
| Background timers | setInterval | chrome.alarms | Survives service worker restarts |
| Content script injection | Script injection via DOM | chrome.scripting API | Proper permissions, isolated world support |
| Cross-context messaging | postMessage hacks | chrome.runtime messaging | Type-safe, reliable, handled by Chrome |
| Persistent state | In-memory variables | chrome.storage.local | Service workers terminate unpredictably |

**Key insight:** The Chrome Extension APIs handle complex scenarios (service worker lifecycle, cross-context security, permission management) that would be error-prone to implement manually.

## Common Pitfalls

### Pitfall 1: Service Worker Termination
**What goes wrong:** Rules lost, scripts not registered after browser restart
**Why it happens:** Service worker state is ephemeral; terminates after ~30 seconds idle
**How to avoid:**
- Store ALL state in chrome.storage.local
- Re-register scripts in onStartup and onInstalled handlers
- Load cached rules before registering scripts
**Warning signs:** Extension works initially but stops after period of inactivity

### Pitfall 2: Permission Denied for New Domains
**What goes wrong:** Content script injection fails with permission error
**Why it happens:** User rules may target domains not in host_permissions
**How to avoid:**
- Use optional_host_permissions with broad pattern (e.g., `"https://*/*"`)
- Request permission when user creates rule for new domain
- Fall back gracefully when permission denied
**Warning signs:** "Cannot access contents of url" errors in console

### Pitfall 3: Script ID Collisions
**What goes wrong:** Script registration fails or overwrites wrong script
**Why it happens:** Using same ID for different rules
**How to avoid:** Use `rule-${rule.id}` pattern for unique IDs
**Warning signs:** "A script with ID 'x' already exists" errors

### Pitfall 4: Race Condition on Startup
**What goes wrong:** Content script runs before rules loaded
**Why it happens:** Page loads faster than API fetch completes
**How to avoid:**
- Load cached rules immediately from storage
- Content script waits for rule before extracting
- Re-extract when rules update
**Warning signs:** Inconsistent extraction on first page load

### Pitfall 5: Match Pattern Syntax Errors
**What goes wrong:** Script registration fails silently
**Why it happens:** User enters invalid URL pattern
**How to avoid:**
- Validate patterns before saving rule
- Catch and report registration errors
- Test pattern in options UI before saving
**Warning signs:** Rule enabled but content script never runs

### Pitfall 6: Selector Timing Issues
**What goes wrong:** Selectors don't find elements
**Why it happens:** Content script runs before dynamic content loads
**How to avoid:**
- Use document_idle run timing
- Implement MutationObserver for SPA content
- Add optional delay before extraction
- Multiple extraction attempts with backoff
**Warning signs:** Works on some pages, fails on pages with heavy JS

## Code Examples

Verified patterns from official sources:

### Manifest V3 Permissions Update
```json
// Source: https://developer.chrome.com/docs/extensions/reference/api/scripting
// manifest.json changes for Phase 7
{
  "manifest_version": 3,
  "name": "P&E Manager Web Capture",
  "version": "1.1.0",

  "permissions": [
    "storage",
    "activeTab",
    "webNavigation",
    "scripting",      // NEW: Required for dynamic registration
    "alarms"          // NEW: Required for periodic refresh
  ],

  "optional_host_permissions": [
    "https://*/*",    // NEW: Allow user to capture any HTTPS site
    "http://*/*"      // NEW: Allow HTTP for internal tools
  ],

  "host_permissions": [
    "https://pe-manager-backend.cfapps.eu01-canary.hana.ondemand.com/*",
    "http://localhost:3001/*"
  ],

  "background": {
    "service_worker": "service-worker.js",
    "type": "module"
  },

  "content_scripts": [
    {
      "matches": ["https://jira.tools.sap/*"],
      "js": ["content/content.js"],
      "run_at": "document_idle"
    }
  ]
}
```

### API Client Extensions for Capture
```javascript
// Source: Extension of existing lib/api.js pattern

export const Api = {
  // ... existing methods ...

  /**
   * Fetch capture rules for the current user
   * Used on startup and periodic refresh
   */
  async getCaptureRules() {
    return this.request('/api/capture-rules?enabled=true');
  },

  /**
   * Send captured data to inbox
   * Returns created inbox item
   */
  async sendToInbox(captureData) {
    return this.requestWithRetry('/api/capture-inbox', {
      method: 'POST',
      body: JSON.stringify(captureData)
    });
  },

  /**
   * Get inbox items (for badge count)
   * @param {Object} filters - { status: 'pending' }
   */
  async getInboxItems(filters = {}) {
    const params = new URLSearchParams(filters);
    return this.request(`/api/capture-inbox?${params}`);
  }
};
```

### Storage Extensions for Rules
```javascript
// Source: Extension of existing lib/storage.js pattern

const STORAGE_KEYS = {
  // ... existing keys ...
  CAPTURE_RULES: 'captureRules',
  PENDING_COUNT: 'pendingInboxCount'
};

const DEFAULTS = {
  // ... existing defaults ...
  [STORAGE_KEYS.CAPTURE_RULES]: { rules: [], lastRefresh: null },
  [STORAGE_KEYS.PENDING_COUNT]: 0
};

export const Storage = {
  // ... existing methods ...

  /**
   * Get cached capture rules
   */
  async getCaptureRules() {
    const data = await chrome.storage.local.get(STORAGE_KEYS.CAPTURE_RULES);
    return data[STORAGE_KEYS.CAPTURE_RULES] || DEFAULTS[STORAGE_KEYS.CAPTURE_RULES];
  },

  /**
   * Set capture rules cache
   */
  async setCaptureRules(rules) {
    await chrome.storage.local.set({
      [STORAGE_KEYS.CAPTURE_RULES]: {
        rules,
        lastRefresh: Date.now()
      }
    });
  },

  /**
   * Get pending inbox count
   */
  async getPendingCount() {
    const data = await chrome.storage.local.get(STORAGE_KEYS.PENDING_COUNT);
    return data[STORAGE_KEYS.PENDING_COUNT] || DEFAULTS[STORAGE_KEYS.PENDING_COUNT];
  },

  /**
   * Set pending inbox count
   */
  async setPendingCount(count) {
    await chrome.storage.local.set({ [STORAGE_KEYS.PENDING_COUNT]: count });
  }
};
```

### Generic Extractor Content Script
```javascript
// content/generic-extractor.js
// Injected dynamically for rule-matched URLs

(function() {
  'use strict';

  console.log('[PE-Capture] Generic extractor loaded');

  // Request rule from service worker for current URL
  async function getRuleForUrl() {
    const response = await chrome.runtime.sendMessage({
      type: 'GET_RULE_FOR_URL',
      url: window.location.href
    });
    return response.rule;
  }

  // Extract data using rule selectors
  function extractBySelectors(selectors) {
    const data = {};
    const errors = [];

    for (const config of selectors) {
      const { field_name, selector, type = 'text', required = false } = config;

      try {
        const element = document.querySelector(selector);

        if (!element) {
          if (required) {
            errors.push(`Required: ${field_name}`);
          }
          data[field_name] = null;
          continue;
        }

        switch (type) {
          case 'text':
            data[field_name] = element.textContent?.trim() || null;
            break;
          case 'attribute':
            data[field_name] = element.getAttribute(config.attribute) || null;
            break;
          case 'href':
            data[field_name] = element.href || null;
            break;
          default:
            data[field_name] = element.textContent?.trim() || null;
        }
      } catch (error) {
        data[field_name] = null;
        if (required) {
          errors.push(`Error: ${field_name}`);
        }
      }
    }

    return { data, errors };
  }

  // Build source identifier from URL and extracted data
  function buildSourceIdentifier(url, data, rule) {
    // Use page URL by default, but allow rule to specify identifier field
    if (rule.metadata?.identifier_field && data[rule.metadata.identifier_field]) {
      return `${rule.name}:${data[rule.metadata.identifier_field]}`;
    }
    return url;
  }

  // Main extraction and send flow
  async function extractAndSend() {
    const rule = await getRuleForUrl();

    if (!rule || !rule.selectors || rule.selectors.length === 0) {
      console.log('[PE-Capture] No rule or selectors for this URL');
      return;
    }

    console.log('[PE-Capture] Applying rule:', rule.name);

    const { data, errors } = extractBySelectors(rule.selectors);

    // Skip if required fields missing
    if (errors.length > 0) {
      console.warn('[PE-Capture] Extraction errors:', errors);
      return;
    }

    // Add metadata
    data._extracted_at = new Date().toISOString();
    data._page_title = document.title;
    data._page_url = window.location.href;

    // Send to service worker
    const response = await chrome.runtime.sendMessage({
      type: 'CAPTURE_DATA',
      payload: {
        rule_id: rule.id,
        rule_name: rule.name,
        source_url: window.location.href,
        source_identifier: buildSourceIdentifier(window.location.href, data, rule),
        captured_data: data
      }
    });

    if (response.success) {
      console.log('[PE-Capture] Data sent to inbox');
    } else {
      console.error('[PE-Capture] Failed to send:', response.error);
    }
  }

  // Run extraction after page settles
  setTimeout(extractAndSend, 1000);

  // Listen for manual capture trigger
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'MANUAL_CAPTURE') {
      extractAndSend().then(() => sendResponse({ success: true }));
      return true;
    }
  });

})();
```

### Service Worker Message Handler for Capture
```javascript
// Service worker additions for capture flow

const MessageType = {
  // ... existing types ...
  GET_RULE_FOR_URL: 'GET_RULE_FOR_URL',
  CAPTURE_DATA: 'CAPTURE_DATA',
  REFRESH_RULES: 'REFRESH_RULES',
  MANUAL_CAPTURE: 'MANUAL_CAPTURE'
};

async function handleMessage(message, sender) {
  switch (message.type) {
    // ... existing handlers ...

    case MessageType.GET_RULE_FOR_URL:
      return await handleGetRuleForUrl(message.url);

    case MessageType.CAPTURE_DATA:
      return await handleCaptureData(message.payload);

    case MessageType.REFRESH_RULES:
      return await refreshRulesFromBackend();
  }
}

async function handleGetRuleForUrl(url) {
  const { captureRules } = await chrome.storage.local.get('captureRules');
  if (!captureRules?.rules) {
    return { rule: null };
  }

  // Find first matching enabled rule
  for (const rule of captureRules.rules) {
    if (rule.enabled && urlMatchesPattern(url, rule.url_pattern)) {
      return { rule };
    }
  }

  return { rule: null };
}

async function handleCaptureData(payload) {
  const isConfigured = await Storage.isConfigured();
  if (!isConfigured) {
    return { success: false, error: 'Extension not configured' };
  }

  try {
    const result = await Api.sendToInbox(payload);
    await updateBadgeCount();
    return { success: true, data: result };
  } catch (error) {
    return { success: false, error: error.message };
  }
}
```

## URL Pattern Matching

Chrome Match Patterns have specific syntax that differs from regular expressions:

### Valid Match Pattern Examples
| Pattern | Matches | Does Not Match |
|---------|---------|----------------|
| `https://*.example.com/*` | https://www.example.com/page, https://sub.example.com/any | http://example.com, https://example.com |
| `https://example.com/*` | https://example.com/, https://example.com/any/path | https://www.example.com |
| `*://example.com/*` | http://example.com/x, https://example.com/x | ftp://example.com |
| `https://*.grafana.sap/*` | https://metrics.grafana.sap/dashboard | https://grafana.sap/ |

### Pattern Validation
```javascript
// Validate user-entered pattern before saving rule
function isValidMatchPattern(pattern) {
  // Chrome Match Pattern regex (simplified)
  const matchPatternRegex = /^(\*|https?|ftp):\/\/(\*|\*\.[^/*]+|[^/*]+)(\/.*)?$/;
  return matchPatternRegex.test(pattern);
}

// Convert user-friendly pattern to match pattern
function normalizePattern(userPattern) {
  // If user enters "grafana.sap", convert to "*://grafana.sap/*"
  if (!userPattern.includes('://')) {
    return `*://${userPattern}/*`;
  }
  // Ensure trailing path
  if (!userPattern.endsWith('/*') && !userPattern.endsWith('/')) {
    return userPattern + '/*';
  }
  return userPattern;
}
```

## State of the Art

| Old Approach (v1.0) | Current Approach (v1.1) | Impact |
|---------------------|-------------------------|--------|
| Hardcoded Jira URL in manifest | Dynamic script registration | Any site supported |
| Site-specific extractors | Generic selector-based extractor | No code changes for new sites |
| Direct sync to jira_issues | Send to capture_inbox staging | User reviews before commit |
| Badge shows sync status | Badge shows pending count | Actionable indicator |
| Refresh on page load | Periodic alarm-based refresh | Reduced API calls |

**Migration strategy:**
1. Keep existing Jira content script in manifest (backward compatibility)
2. Add generic extractor for rule-based capture alongside
3. When rule matches Jira URL, both may trigger - handle deduplication
4. After v1.1 stable, remove hardcoded Jira entries in v1.2

**Deprecated after v1.1:**
- content/extractors/board.js, backlog.js, detail.js - replaced by generic extractor
- Direct sync to jira_issues table - use capture_inbox workflow

## Open Questions

Things that couldn't be fully resolved:

1. **Deduplication When Jira Rule + Legacy Both Match**
   - What we know: Both old Jira extractor and new rule-based extractor may run
   - What's unclear: How to prevent double-capture
   - Recommendation: In v1.1, accept both and deduplicate in inbox by source_url. In v1.2, remove legacy extractor.

2. **Permission Request UX**
   - What we know: Need user gesture to request host permissions
   - What's unclear: Best UX for requesting permission (inline in options? popup?)
   - Recommendation: Request in options page when user saves rule for new domain. Show clear explanation.

3. **Capture Trigger Strategy**
   - What we know: Can capture on page load, on click, or on interval
   - What's unclear: Best default behavior (auto vs manual)
   - Recommendation: Start with manual trigger only (EXT-05). Add auto-capture as opt-in in rule metadata.

4. **Multiple Items Per Page**
   - What we know: Some pages have lists (like Jira board with multiple issues)
   - What's unclear: Should generic extractor support `querySelectorAll` for lists?
   - Recommendation: v1.1 extracts single item per page. Add list extraction in v1.2 if needed.

## Sources

### Primary (HIGH confidence)
- https://developer.chrome.com/docs/extensions/reference/api/scripting - Dynamic script registration
- https://developer.chrome.com/docs/extensions/reference/api/action - Badge API
- https://developer.chrome.com/docs/extensions/reference/api/alarms - Background timers
- https://developer.chrome.com/docs/extensions/reference/api/permissions - Runtime permissions
- https://developer.chrome.com/docs/extensions/develop/concepts/content-scripts - Content script patterns

### Secondary (MEDIUM confidence)
- /Users/i306072/Documents/GitHub/P-E/extension/service-worker.js - Existing v1.0 patterns
- /Users/i306072/Documents/GitHub/P-E/extension/content/content.js - Existing content script patterns
- /Users/i306072/Documents/GitHub/P-E/extension/content/extractors/board.js - Existing extractor patterns

### Tertiary (LOW confidence)
- Phase 6 research assumptions about API contracts (verified against actual CaptureService.js)

## API Contract (From Phase 6)

The extension will interact with these backend endpoints:

### GET /api/capture-rules?enabled=true
Returns: Array of enabled rules
```json
[
  {
    "id": "uuid",
    "name": "Jenkins Build Status",
    "url_pattern": "https://*.jenkins.sap/*",
    "enabled": true,
    "selectors": [
      { "field_name": "status", "selector": ".build-status", "type": "text", "required": true },
      { "field_name": "job_name", "selector": "h1.job-name", "type": "text", "required": true }
    ],
    "metadata": {}
  }
]
```

### POST /api/capture-inbox
Body:
```json
{
  "rule_id": "uuid",
  "rule_name": "Jenkins Build Status",
  "source_url": "https://jenkins.tools.sap/job/my-app/",
  "source_identifier": "jenkins:my-app",
  "captured_data": {
    "status": "SUCCESS",
    "job_name": "my-app",
    "_extracted_at": "2026-01-22T10:00:00Z",
    "_page_title": "Jenkins - my-app"
  }
}
```
Returns: Created inbox item

### GET /api/capture-inbox?status=pending
Returns: Array of pending items (for badge count)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Official Chrome Extension APIs, well-documented
- Architecture: HIGH - Based on existing v1.0 patterns, Chrome docs
- Pitfalls: HIGH - Common issues from Chrome extension development experience
- API integration: HIGH - Verified against actual Phase 6 implementation

**Research date:** 2026-01-22
**Valid until:** 2026-02-22 (Chrome APIs stable, MV3 is current standard)
