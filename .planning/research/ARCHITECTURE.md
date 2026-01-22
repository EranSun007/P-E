# Architecture: Configurable Web Capture Framework

**Domain:** Browser Extension + Backend Integration
**Research Focus:** Evolution from hardcoded Jira capture to configurable multi-site framework
**Researched:** 2026-01-22
**Overall Confidence:** HIGH (based on existing v1.0 implementation + Chrome Manifest V3 documentation)

---

## Executive Summary

The configurable web capture framework evolves the existing Jira extension (v1.0) into a rule-based system supporting multiple sites. Key architectural changes:

1. **Rules stored in backend** — Not hardcoded in extension
2. **Dynamic content script registration** — Via `chrome.scripting.registerContentScripts()` API
3. **Generic extraction engine** — Selector-based, not site-specific code
4. **Data staging layer** — Inbox table with review workflow before entity mapping
5. **Entity mapping system** — User-defined rules linking captured data to P&E entities

This preserves the working v1.0 architecture while adding configurability layers.

---

## Current Architecture (v1.0 Baseline)

### Component Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         JIRA WEB PAGE (jira.tools.sap)                       │
│  ┌─────────────────────────────────────────────────────────────────────────┐│
│  │  content.js (hardcoded page detection)                                   ││
│  │    └── detectPageType(url) → BOARD | BACKLOG | DETAIL | UNKNOWN         ││
│  │    └── loadExtractor(pageType) → board.js | backlog.js | detail.js      ││
│  │    └── extractAndSync() → sends data to service worker                   ││
│  └─────────────────────────────────────────────────────────────────────────┘│
└────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      │ chrome.runtime.sendMessage()
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                        CHROME EXTENSION RUNTIME                              │
│  ┌─────────────────────────────────────────────────────────────────────────┐│
│  │  service-worker.js                                                       ││
│  │    └── handleSyncIssues(issues) → POST to backend                        ││
│  │    └── Storage module → chrome.storage.local for auth/state              ││
│  │    └── Api module → backend communication with retry                     ││
│  └─────────────────────────────────────────────────────────────────────────┘│
└────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      │ fetch() with Bearer token
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                      EXPRESS.JS BACKEND (SAP BTP)                            │
│  ┌────────────────────────┐   ┌────────────────────────────────────────────┐│
│  │  jira.js (routes)      │   │  JiraService.js                            ││
│  │    POST /sync          │ → │    syncIssues(userId, issues)              ││
│  │    GET  /              │ → │    listIssues(userId, filters)             ││
│  │    POST /mappings      │ → │    createMapping(userId, ...)              ││
│  └────────────────────────┘   └────────────────────────────────────────────┘│
└────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                            POSTGRESQL                                        │
│  ┌────────────────────────┐   ┌────────────────────────────────────────────┐│
│  │  jira_issues           │   │  jira_team_mappings                        ││
│  │    user_id             │   │    jira_assignee_id → team_member_id       ││
│  │    issue_key (unique)  │   │                                             ││
│  │    summary, status...  │   │                                             ││
│  └────────────────────────┘   └────────────────────────────────────────────┘│
└────────────────────────────────────────────────────────────────────────────┘
```

### v1.0 Hardcoded Elements (to be replaced)

| Location | Hardcoded Element | Purpose |
|----------|-------------------|---------|
| `manifest.json` | `"matches": ["https://jira.tools.sap/*"]` | Only Jira site enabled |
| `content.js` | `detectPageType()` switch | Page type detection |
| `content.js` | `getExtractorPath()` switch | Extractor selection |
| `content.js` | `getContainerSelector()` switch | DOM container selectors |
| `extractors/board.js` | `BOARD_SELECTORS` object | 15+ hardcoded CSS selectors |
| `extractors/backlog.js` | `BACKLOG_SELECTORS` object | 15+ hardcoded CSS selectors |
| `extractors/detail.js` | `DETAIL_SELECTORS` object | 15+ hardcoded CSS selectors |
| `JiraService.js` | Upsert to `jira_issues` | Direct entity storage |

---

## Target Architecture (v1.1 Configurable)

### System Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         ANY CONFIGURED WEBSITE                               │
│  ┌─────────────────────────────────────────────────────────────────────────┐│
│  │  generic-content.js (rule-driven)                                        ││
│  │    └── Rules fetched from backend on activation                          ││
│  │    └── matchRule(url) → finds applicable capture rule                    ││
│  │    └── extractByRule(rule) → generic selector-based extraction          ││
│  │    └── sendToStaging() → sends to staging endpoint                       ││
│  └─────────────────────────────────────────────────────────────────────────┘│
└────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      │ chrome.runtime.sendMessage()
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                        CHROME EXTENSION RUNTIME                              │
│  ┌─────────────────────────────────────────────────────────────────────────┐│
│  │  service-worker.js (enhanced)                                            ││
│  │    └── fetchCaptureRules() → GET /api/capture-rules                      ││
│  │    └── updateContentScriptRegistrations() → dynamic script registration  ││
│  │    └── handleStagedCapture(data) → POST /api/capture-inbox               ││
│  │    └── LEGACY: handleSyncIssues() → preserved for Jira compatibility     ││
│  └─────────────────────────────────────────────────────────────────────────┘│
└────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      │ fetch() with Bearer token
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                      EXPRESS.JS BACKEND (SAP BTP)                            │
│                                                                              │
│  NEW COMPONENTS                                                              │
│  ┌────────────────────────┐   ┌────────────────────────────────────────────┐│
│  │  captureRules.js       │   │  CaptureRuleService.js                     ││
│  │    GET  /              │ → │    listRules(userId) → active rules        ││
│  │    POST /              │ → │    createRule(userId, ruleData)            ││
│  │    PUT  /:id           │ → │    updateRule(userId, id, updates)         ││
│  │    DELETE /:id         │ → │    deleteRule(userId, id)                  ││
│  └────────────────────────┘   └────────────────────────────────────────────┘│
│                                                                              │
│  ┌────────────────────────┐   ┌────────────────────────────────────────────┐│
│  │  captureInbox.js       │   │  CaptureInboxService.js                    ││
│  │    GET  /              │ → │    listPending(userId) → review queue      ││
│  │    POST /              │ → │    stageCapture(userId, data)              ││
│  │    PUT  /:id/approve   │ → │    approveAndMap(userId, id, mapping)      ││
│  │    PUT  /:id/reject    │ → │    rejectCapture(userId, id)               ││
│  │    DELETE /:id         │ → │    deleteCapture(userId, id)               ││
│  └────────────────────────┘   └────────────────────────────────────────────┘│
│                                                                              │
│  ┌────────────────────────┐   ┌────────────────────────────────────────────┐│
│  │  entityMappings.js     │   │  EntityMappingService.js                   ││
│  │    GET  /              │ → │    listMappings(userId)                    ││
│  │    POST /              │ → │    createMapping(userId, mappingData)      ││
│  │    PUT  /:id           │ → │    updateMapping(userId, id, updates)      ││
│  │    DELETE /:id         │ → │    deleteMapping(userId, id)               ││
│  └────────────────────────┘   └────────────────────────────────────────────┘│
│                                                                              │
│  PRESERVED (backwards compatibility)                                         │
│  ┌────────────────────────┐   ┌────────────────────────────────────────────┐│
│  │  jira.js (unchanged)   │   │  JiraService.js (unchanged)                ││
│  │    POST /sync          │ → │    syncIssues() - direct path for Jira     ││
│  └────────────────────────┘   └────────────────────────────────────────────┘│
└────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                            POSTGRESQL                                        │
│                                                                              │
│  NEW TABLES                                                                  │
│  ┌────────────────────────┐   ┌────────────────────────────────────────────┐│
│  │  capture_rules         │   │  capture_inbox                             ││
│  │    user_id             │   │    user_id                                 ││
│  │    name                │   │    rule_id (FK)                            ││
│  │    url_pattern         │   │    source_url                              ││
│  │    selectors (JSONB)   │   │    captured_data (JSONB)                   ││
│  │    enabled             │   │    status (pending|approved|rejected)      ││
│  │    site_type           │   │    approved_at, mapped_entity_type         ││
│  └────────────────────────┘   └────────────────────────────────────────────┘│
│                                                                              │
│  ┌────────────────────────┐                                                 │
│  │  entity_mappings       │                                                 │
│  │    user_id             │                                                 │
│  │    rule_id (FK)        │                                                 │
│  │    source_field        │                                                 │
│  │    target_entity       │                                                 │
│  │    target_field        │                                                 │
│  │    transform           │                                                 │
│  └────────────────────────┘                                                 │
│                                                                              │
│  PRESERVED                                                                   │
│  ┌────────────────────────┐   ┌────────────────────────────────────────────┐│
│  │  jira_issues           │   │  jira_team_mappings                        ││
│  │    (unchanged)         │   │    (unchanged)                             ││
│  └────────────────────────┘   └────────────────────────────────────────────┘│
└────────────────────────────────────────────────────────────────────────────┘
```

---

## Component Details

### 1. Capture Rules (NEW)

**Purpose:** Store user-defined extraction rules that tell the extension what to capture from which sites.

**Database Schema:**

```sql
CREATE TABLE capture_rules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id VARCHAR(100) NOT NULL,

  -- Rule identification
  name VARCHAR(255) NOT NULL,                    -- "Grafana Dashboard Metrics"
  description TEXT,                              -- User notes

  -- URL matching
  url_pattern VARCHAR(1024) NOT NULL,            -- "https://grafana.example.com/d/*"
  site_type VARCHAR(50),                         -- grafana, jenkins, concourse, dynatrace, custom

  -- Extraction configuration
  selectors JSONB NOT NULL,                      -- Field selector definitions
  container_selector VARCHAR(512),               -- Optional: wait for this element
  extraction_mode VARCHAR(50) DEFAULT 'single',  -- single, list, table

  -- Behavior
  enabled BOOLEAN DEFAULT true,
  auto_capture BOOLEAN DEFAULT false,            -- Capture on page load vs manual trigger
  capture_interval_seconds INTEGER,              -- For polling (null = no polling)

  -- Metadata
  created_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  UNIQUE(user_id, name)
);

CREATE INDEX idx_capture_rules_user_id ON capture_rules(user_id);
CREATE INDEX idx_capture_rules_enabled ON capture_rules(user_id, enabled);
```

**Selectors JSONB Structure:**

```json
{
  "fields": [
    {
      "name": "dashboard_name",
      "selector": "h1.dashboard-title, [data-testid=\"dashboard-title\"]",
      "attribute": "textContent",
      "required": true
    },
    {
      "name": "panel_value",
      "selector": ".panel-content .stat-value",
      "attribute": "textContent",
      "transform": "parseNumber",
      "multiple": true
    },
    {
      "name": "timestamp",
      "selector": "[data-testid=\"time-range\"]",
      "attribute": "data-from",
      "transform": "parseDate"
    }
  ],
  "identifier": "dashboard_name"
}
```

**Service Interface:**

```javascript
class CaptureRuleService {
  async listRules(userId)                              // All rules for user
  async listEnabledRules(userId)                       // Only enabled rules (for extension)
  async createRule(userId, ruleData)                   // Create new rule
  async updateRule(userId, ruleId, updates)            // Modify rule
  async deleteRule(userId, ruleId)                     // Remove rule
  async testRule(userId, ruleId, sampleHtml)           // Validate selectors against sample
}
```

### 2. Capture Inbox (NEW)

**Purpose:** Stage captured data for user review before mapping to entities.

**Database Schema:**

```sql
CREATE TABLE capture_inbox (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id VARCHAR(100) NOT NULL,

  -- Source tracking
  rule_id UUID REFERENCES capture_rules(id) ON DELETE SET NULL,
  source_url VARCHAR(2048) NOT NULL,
  source_title VARCHAR(512),

  -- Captured data
  captured_data JSONB NOT NULL,                  -- Raw extracted fields
  captured_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  -- Review workflow
  status VARCHAR(20) DEFAULT 'pending',          -- pending, approved, rejected
  reviewed_at TIMESTAMP,

  -- Mapping result (after approval)
  mapped_entity_type VARCHAR(50),                -- task, project, note, metric
  mapped_entity_id UUID,                         -- FK to created entity

  -- Deduplication
  content_hash VARCHAR(64),                      -- SHA-256 of captured_data

  created_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  UNIQUE(user_id, content_hash)                  -- Prevent exact duplicates
);

CREATE INDEX idx_capture_inbox_user_status ON capture_inbox(user_id, status);
CREATE INDEX idx_capture_inbox_rule ON capture_inbox(rule_id);
CREATE INDEX idx_capture_inbox_captured_at ON capture_inbox(captured_at);
```

**Service Interface:**

```javascript
class CaptureInboxService {
  async listPending(userId, options)                   // Get items awaiting review
  async stageCapture(userId, ruleId, data)             // Add new captured data
  async approveAndMap(userId, captureId, mapping)      // Approve and create entity
  async rejectCapture(userId, captureId)               // Mark as rejected
  async bulkApprove(userId, captureIds, mappingRule)   // Batch approval
  async getStats(userId)                               // Counts by status
}
```

**Approval Flow:**

```
Extension captures data
        │
        ▼
POST /api/capture-inbox
        │
        ▼
┌───────────────────┐
│   capture_inbox   │   status = 'pending'
│   (staging table) │
└───────────────────┘
        │
        │  User reviews in Inbox UI
        ▼
┌───────────────────┐
│  Approve action   │   User selects entity type + field mapping
└───────────────────┘
        │
        ▼
EntityMappingService.applyMapping(captureData, mapping)
        │
        ▼
┌───────────────────┐
│  Target entity    │   e.g., tasks, projects, notes
│  table            │
└───────────────────┘
        │
        ▼
Update capture_inbox:
  status = 'approved'
  mapped_entity_type = 'task'
  mapped_entity_id = <new_task_id>
```

### 3. Entity Mappings (NEW)

**Purpose:** Define how captured fields map to P&E Manager entities.

**Database Schema:**

```sql
CREATE TABLE entity_mappings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id VARCHAR(100) NOT NULL,

  -- Association
  rule_id UUID REFERENCES capture_rules(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,                    -- "Grafana → Task"

  -- Target entity
  target_entity VARCHAR(50) NOT NULL,            -- task, project, note, metric

  -- Field mappings
  field_mappings JSONB NOT NULL,                 -- Source → target field rules

  -- Default values
  defaults JSONB,                                -- Static values to apply

  -- Auto-apply settings
  auto_apply BOOLEAN DEFAULT false,              -- Skip inbox for this mapping

  created_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  UNIQUE(user_id, rule_id, name)
);

CREATE INDEX idx_entity_mappings_user ON entity_mappings(user_id);
CREATE INDEX idx_entity_mappings_rule ON entity_mappings(rule_id);
```

**Field Mappings JSONB Structure:**

```json
{
  "mappings": [
    {
      "source": "dashboard_name",
      "target": "title",
      "transform": null
    },
    {
      "source": "panel_value",
      "target": "description",
      "transform": "template",
      "template": "Metric value: {{value}}"
    },
    {
      "source": "timestamp",
      "target": "due_date",
      "transform": "parseDate"
    }
  ]
}
```

**Service Interface:**

```javascript
class EntityMappingService {
  async listMappings(userId)                           // All mappings
  async listMappingsForRule(userId, ruleId)            // Mappings for specific rule
  async createMapping(userId, mappingData)             // Create new mapping
  async updateMapping(userId, mappingId, updates)      // Modify mapping
  async deleteMapping(userId, mappingId)               // Remove mapping
  async applyMapping(captureData, mappingId)           // Execute mapping → create entity
}
```

---

## Extension Changes

### 4. Dynamic Content Script Registration (MODIFY service-worker.js)

**Current:** Content scripts declared statically in manifest.json
**Target:** Dynamic registration based on backend rules

**Chrome API Used:** `chrome.scripting.registerContentScripts()`

```javascript
// service-worker.js additions

/**
 * Fetch capture rules from backend and register content scripts
 */
async function updateContentScriptRegistrations() {
  const rules = await Api.getCaptureRules();

  // Unregister all dynamic scripts first
  const registered = await chrome.scripting.getRegisteredContentScripts();
  const dynamicIds = registered
    .filter(s => s.id.startsWith('capture-rule-'))
    .map(s => s.id);

  if (dynamicIds.length > 0) {
    await chrome.scripting.unregisterContentScripts({ ids: dynamicIds });
  }

  // Register new scripts for enabled rules
  const scriptsToRegister = rules
    .filter(rule => rule.enabled)
    .map(rule => ({
      id: `capture-rule-${rule.id}`,
      matches: [rule.url_pattern],
      js: ['content/generic-extractor.js'],
      runAt: 'document_idle',
      world: 'ISOLATED'
    }));

  if (scriptsToRegister.length > 0) {
    await chrome.scripting.registerContentScripts(scriptsToRegister);
  }

  // Cache rules for content script access
  await chrome.storage.local.set({ captureRules: rules });
}

// Refresh registrations on extension startup
chrome.runtime.onStartup.addListener(updateContentScriptRegistrations);
chrome.runtime.onInstalled.addListener(updateContentScriptRegistrations);

// Message handler for rule refresh
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'REFRESH_RULES') {
    updateContentScriptRegistrations()
      .then(() => sendResponse({ success: true }))
      .catch(err => sendResponse({ success: false, error: err.message }));
    return true;
  }
});
```

**Manifest Changes:**

```json
{
  "permissions": [
    "storage",
    "activeTab",
    "webNavigation",
    "scripting"           // NEW: Required for dynamic registration
  ],

  "host_permissions": [
    "https://jira.tools.sap/*",
    "https://*.grafana.com/*",           // NEW: Example additional sites
    "https://*.jenkins.io/*",
    "https://pe-manager-backend.cfapps.eu01-canary.hana.ondemand.com/*",
    "http://localhost:3001/*"
  ],

  "content_scripts": [
    // PRESERVED: Jira hardcoded for backwards compatibility
    {
      "matches": ["https://jira.tools.sap/*"],
      "js": ["content/content.js"],
      "run_at": "document_idle",
      "all_frames": false
    }
    // Dynamic scripts registered via chrome.scripting API
  ]
}
```

### 5. Generic Extractor Content Script (NEW)

**Purpose:** Rule-driven extraction that works with any site's selectors.

**File:** `extension/content/generic-extractor.js`

```javascript
/**
 * Generic Extractor - Rule-driven DOM extraction
 *
 * Loaded dynamically by chrome.scripting.registerContentScripts()
 * for URLs matching user-defined capture rules.
 */

(function() {
  'use strict';

  console.log('[PE-Capture] Generic extractor loaded for:', window.location.href);

  let currentRule = null;

  /**
   * Find matching rule for current URL
   */
  async function findMatchingRule() {
    const { captureRules = [] } = await chrome.storage.local.get('captureRules');

    return captureRules.find(rule => {
      if (!rule.enabled) return false;

      // Convert glob pattern to regex
      const pattern = rule.url_pattern
        .replace(/\*/g, '.*')
        .replace(/\?/g, '.');
      const regex = new RegExp(`^${pattern}$`);

      return regex.test(window.location.href);
    });
  }

  /**
   * Extract data using rule's selectors
   */
  function extractByRule(rule) {
    const { selectors } = rule;
    const extracted = {};

    for (const field of selectors.fields) {
      try {
        if (field.multiple) {
          const elements = document.querySelectorAll(field.selector);
          extracted[field.name] = Array.from(elements).map(el =>
            extractValue(el, field)
          );
        } else {
          const element = document.querySelector(field.selector);
          extracted[field.name] = element ? extractValue(element, field) : null;
        }
      } catch (error) {
        console.warn(`[PE-Capture] Failed to extract ${field.name}:`, error);
        extracted[field.name] = null;
      }
    }

    return extracted;
  }

  /**
   * Extract value from element based on field config
   */
  function extractValue(element, field) {
    let value;

    switch (field.attribute) {
      case 'textContent':
        value = element.textContent?.trim();
        break;
      case 'innerHTML':
        value = element.innerHTML;
        break;
      case 'href':
        value = element.href;
        break;
      default:
        value = element.getAttribute(field.attribute);
    }

    if (field.transform && value) {
      value = applyTransform(value, field.transform);
    }

    return value;
  }

  /**
   * Apply transform function to extracted value
   */
  function applyTransform(value, transform) {
    switch (transform) {
      case 'parseNumber':
        return parseFloat(value.replace(/[^0-9.-]/g, ''));
      case 'parseDate':
        return new Date(value).toISOString();
      case 'trim':
        return value.trim();
      case 'lowercase':
        return value.toLowerCase();
      default:
        return value;
    }
  }

  /**
   * Send extracted data to service worker for staging
   */
  async function sendToStaging(data) {
    if (!currentRule || Object.values(data).every(v => v === null)) {
      console.log('[PE-Capture] No data to capture');
      return;
    }

    const payload = {
      rule_id: currentRule.id,
      source_url: window.location.href,
      source_title: document.title,
      captured_data: data
    };

    try {
      const response = await chrome.runtime.sendMessage({
        type: 'STAGE_CAPTURE',
        payload
      });

      if (response.success) {
        console.log('[PE-Capture] Data staged successfully');
      } else {
        console.error('[PE-Capture] Staging failed:', response.error);
      }
    } catch (error) {
      console.error('[PE-Capture] Failed to send to service worker:', error);
    }
  }

  /**
   * Initialize extraction
   */
  async function init() {
    currentRule = await findMatchingRule();

    if (!currentRule) {
      console.log('[PE-Capture] No matching rule for this URL');
      return;
    }

    console.log('[PE-Capture] Using rule:', currentRule.name);

    // Wait for container element if specified
    if (currentRule.container_selector) {
      await waitForElement(currentRule.container_selector);
    }

    // Perform extraction
    if (currentRule.auto_capture) {
      const data = extractByRule(currentRule);
      await sendToStaging(data);
    }

    // Set up polling if configured
    if (currentRule.capture_interval_seconds) {
      setInterval(async () => {
        const data = extractByRule(currentRule);
        await sendToStaging(data);
      }, currentRule.capture_interval_seconds * 1000);
    }
  }

  /**
   * Wait for element to appear
   */
  function waitForElement(selector, timeout = 15000) {
    return new Promise((resolve) => {
      const element = document.querySelector(selector);
      if (element) {
        resolve(element);
        return;
      }

      const observer = new MutationObserver(() => {
        const el = document.querySelector(selector);
        if (el) {
          observer.disconnect();
          resolve(el);
        }
      });

      observer.observe(document.body, { childList: true, subtree: true });

      setTimeout(() => {
        observer.disconnect();
        resolve(null);
      }, timeout);
    });
  }

  // Listen for manual extraction trigger
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'TRIGGER_EXTRACTION') {
      (async () => {
        if (!currentRule) {
          currentRule = await findMatchingRule();
        }
        if (currentRule) {
          const data = extractByRule(currentRule);
          await sendToStaging(data);
          sendResponse({ success: true, data });
        } else {
          sendResponse({ success: false, error: 'No matching rule' });
        }
      })();
      return true;
    }
  });

  // Initialize
  init();
})();
```

### 6. Service Worker Additions (MODIFY service-worker.js)

**New message handlers for configurable capture:**

```javascript
// Add to handleMessage() switch statement

case 'STAGE_CAPTURE':
  return await handleStageCapture(message.payload);

case 'GET_CAPTURE_RULES':
  return await handleGetCaptureRules();

case 'TRIGGER_EXTRACTION':
  // Forward to active tab's content script
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (tab) {
    return await chrome.tabs.sendMessage(tab.id, message);
  }
  return { success: false, error: 'No active tab' };

// New handlers

async function handleStageCapture(payload) {
  const isConfigured = await Storage.isConfigured();
  if (!isConfigured) {
    return { success: false, error: 'Extension not configured' };
  }

  try {
    const result = await Api.stageCapture(payload);
    return { success: true, data: result };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

async function handleGetCaptureRules() {
  const { captureRules = [] } = await chrome.storage.local.get('captureRules');
  return { success: true, data: captureRules };
}
```

---

## Backend Routes

### 7. New API Endpoints

**File:** `server/routes/captureRules.js`

```javascript
import express from 'express';
import CaptureRuleService from '../services/CaptureRuleService.js';
import { authMiddleware } from '../middleware/auth.js';

const router = express.Router();
router.use(authMiddleware);

// GET /api/capture-rules - List all rules (for UI)
router.get('/', async (req, res) => {
  const rules = await CaptureRuleService.listRules(req.user.id);
  res.json(rules);
});

// GET /api/capture-rules/enabled - List enabled rules (for extension)
router.get('/enabled', async (req, res) => {
  const rules = await CaptureRuleService.listEnabledRules(req.user.id);
  res.json(rules);
});

// POST /api/capture-rules - Create rule
router.post('/', async (req, res) => {
  const rule = await CaptureRuleService.createRule(req.user.id, req.body);
  res.status(201).json(rule);
});

// PUT /api/capture-rules/:id - Update rule
router.put('/:id', async (req, res) => {
  const rule = await CaptureRuleService.updateRule(req.user.id, req.params.id, req.body);
  res.json(rule);
});

// DELETE /api/capture-rules/:id - Delete rule
router.delete('/:id', async (req, res) => {
  await CaptureRuleService.deleteRule(req.user.id, req.params.id);
  res.status(204).send();
});

export default router;
```

**File:** `server/routes/captureInbox.js`

```javascript
import express from 'express';
import CaptureInboxService from '../services/CaptureInboxService.js';
import { authMiddleware } from '../middleware/auth.js';

const router = express.Router();
router.use(authMiddleware);

// GET /api/capture-inbox - List pending items
router.get('/', async (req, res) => {
  const { status = 'pending', limit = 50, offset = 0 } = req.query;
  const items = await CaptureInboxService.listItems(req.user.id, { status, limit, offset });
  res.json(items);
});

// GET /api/capture-inbox/stats - Get counts by status
router.get('/stats', async (req, res) => {
  const stats = await CaptureInboxService.getStats(req.user.id);
  res.json(stats);
});

// POST /api/capture-inbox - Stage new capture (from extension)
router.post('/', async (req, res) => {
  const capture = await CaptureInboxService.stageCapture(req.user.id, req.body);
  res.status(201).json(capture);
});

// PUT /api/capture-inbox/:id/approve - Approve and map to entity
router.put('/:id/approve', async (req, res) => {
  const { mapping } = req.body;
  const result = await CaptureInboxService.approveAndMap(
    req.user.id,
    req.params.id,
    mapping
  );
  res.json(result);
});

// PUT /api/capture-inbox/:id/reject - Reject capture
router.put('/:id/reject', async (req, res) => {
  await CaptureInboxService.rejectCapture(req.user.id, req.params.id);
  res.status(204).send();
});

// DELETE /api/capture-inbox/:id - Delete capture
router.delete('/:id', async (req, res) => {
  await CaptureInboxService.deleteCapture(req.user.id, req.params.id);
  res.status(204).send();
});

export default router;
```

---

## Data Flow Diagrams

### Flow 1: Rule Creation and Extension Sync

```
┌──────────────┐    1. User creates rule    ┌──────────────────┐
│  Frontend    │ ─────────────────────────► │  Backend         │
│  (Rule UI)   │    POST /capture-rules     │  (CaptureRule    │
│              │                            │   Service)       │
└──────────────┘                            └──────────────────┘
                                                    │
                                                    │ 2. Stored in DB
                                                    ▼
                                            ┌──────────────────┐
                                            │  capture_rules   │
                                            │  table           │
                                            └──────────────────┘
┌──────────────┐    3. Extension fetches    ┌──────────────────┐
│  Extension   │ ◄───────────────────────── │  Backend         │
│  (Service    │    GET /capture-rules/     │                  │
│   Worker)    │       enabled              │                  │
└──────────────┘                            └──────────────────┘
       │
       │ 4. chrome.scripting.registerContentScripts()
       ▼
┌──────────────────────────────────────────────────────────────┐
│  Chrome registers content script for rule.url_pattern        │
│  Next visit to matching URL → generic-extractor.js loads     │
└──────────────────────────────────────────────────────────────┘
```

### Flow 2: Capture and Staging

```
┌──────────────┐    1. User visits URL     ┌──────────────────┐
│  Website     │ ─────────────────────────►│  Content Script  │
│  (Grafana)   │    matching rule pattern  │  (generic-       │
│              │                           │   extractor.js)  │
└──────────────┘                           └──────────────────┘
                                                   │
                                                   │ 2. Extract by selectors
                                                   ▼
                                           ┌──────────────────┐
                                           │  Extracted data: │
                                           │  { dashboard:    │
                                           │    "Prod-API",   │
                                           │    value: 99.5 } │
                                           └──────────────────┘
                                                   │
                                                   │ 3. chrome.runtime.sendMessage()
                                                   ▼
┌──────────────┐    4. POST /capture-inbox ┌──────────────────┐
│  Service     │ ─────────────────────────►│  Backend         │
│  Worker      │                           │  (CaptureInbox   │
│              │                           │   Service)       │
└──────────────┘                           └──────────────────┘
                                                   │
                                                   │ 5. Staged (pending)
                                                   ▼
                                           ┌──────────────────┐
                                           │  capture_inbox   │
                                           │  status='pending'│
                                           └──────────────────┘
```

### Flow 3: Review and Approval

```
┌──────────────┐    1. Load inbox          ┌──────────────────┐
│  Frontend    │ ─────────────────────────►│  Backend         │
│  (Inbox UI)  │    GET /capture-inbox     │                  │
│              │    ?status=pending        │                  │
└──────────────┘                           └──────────────────┘
       │
       │ 2. Display pending items
       ▼
┌──────────────────────────────────────────────────────────────┐
│  User sees: "Prod-API Dashboard - Grafana - 2 hours ago"     │
│  [Approve as Task] [Approve as Note] [Reject]                │
└──────────────────────────────────────────────────────────────┘
       │
       │ 3. User clicks "Approve as Task" with mapping
       ▼
┌──────────────┐    4. PUT /:id/approve    ┌──────────────────┐
│  Frontend    │ ─────────────────────────►│  Backend         │
│              │    { mapping: {           │  (CaptureInbox   │
│              │      entity: 'task',      │   Service)       │
│              │      fields: {...}        │                  │
│              │    }}                     └──────────────────┘
└──────────────┘                                   │
                                                   │ 5. Create entity
                                                   ▼
                                           ┌──────────────────┐
                                           │  tasks table     │
                                           │  (new task)      │
                                           └──────────────────┘
                                                   │
                                                   │ 6. Update inbox
                                                   ▼
                                           ┌──────────────────┐
                                           │  capture_inbox   │
                                           │  status='approved'│
                                           │  mapped_entity_id│
                                           └──────────────────┘
```

---

## Build Order and Dependencies

### Dependency Graph

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           INFRASTRUCTURE                                     │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │  018_configurable_capture.sql (migration)                              │  │
│  │    - capture_rules table                                               │  │
│  │    - capture_inbox table                                               │  │
│  │    - entity_mappings table                                             │  │
│  │    - Indexes and triggers                                              │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────────┘
                                       │
                                       │ depends on
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                           BACKEND SERVICES                                   │
│  ┌─────────────────────┐  ┌─────────────────────┐  ┌─────────────────────┐  │
│  │  CaptureRuleService │  │  CaptureInboxService│  │EntityMappingService │  │
│  │                     │  │                     │  │                     │  │
│  │  - CRUD operations  │  │  - Stage capture    │  │  - Define mappings  │  │
│  │  - Rule validation  │  │  - Approve/reject   │  │  - Apply mappings   │  │
│  │                     │  │  - Deduplication    │  │  - Transform data   │  │
│  └─────────────────────┘  └─────────────────────┘  └─────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────────┘
                                       │
                                       │ depends on
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                           BACKEND ROUTES                                     │
│  ┌─────────────────────┐  ┌─────────────────────┐  ┌─────────────────────┐  │
│  │  captureRules.js    │  │  captureInbox.js    │  │  entityMappings.js  │  │
│  │  /api/capture-rules │  │  /api/capture-inbox │  │  /api/entity-       │  │
│  │                     │  │                     │  │      mappings       │  │
│  └─────────────────────┘  └─────────────────────┘  └─────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────────┘
                                       │
                    ┌──────────────────┴──────────────────┐
                    │                                      │
                    ▼                                      ▼
┌─────────────────────────────────┐    ┌─────────────────────────────────────┐
│       EXTENSION CHANGES         │    │         FRONTEND UI                  │
│  ┌───────────────────────────┐  │    │  ┌─────────────────────────────────┐│
│  │  service-worker.js mods   │  │    │  │  Rule Builder UI                ││
│  │  - Dynamic registration   │  │    │  │  - Create/edit capture rules    ││
│  │  - STAGE_CAPTURE handler  │  │    │  │  - Selector tester              ││
│  │  - Rule sync              │  │    │  │                                 ││
│  └───────────────────────────┘  │    │  └─────────────────────────────────┘│
│  ┌───────────────────────────┐  │    │  ┌─────────────────────────────────┐│
│  │  generic-extractor.js     │  │    │  │  Inbox UI                       ││
│  │  - Rule-driven extraction │  │    │  │  - Review pending captures      ││
│  │  - Selector execution     │  │    │  │  - Approve/reject workflow      ││
│  │  - Transform application  │  │    │  │  - Entity mapping selection     ││
│  └───────────────────────────┘  │    │  └─────────────────────────────────┘│
│  ┌───────────────────────────┐  │    │  ┌─────────────────────────────────┐│
│  │  manifest.json mods       │  │    │  │  Mapping Editor UI              ││
│  │  - scripting permission   │  │    │  │  - Field mapping configuration  ││
│  │  - Host permissions       │  │    │  │  - Transform selection          ││
│  └───────────────────────────┘  │    │  │  - Auto-apply settings          ││
└─────────────────────────────────┘    │  └─────────────────────────────────┘│
                                       └─────────────────────────────────────┘
```

### Suggested Phase Order

**Phase 1: Backend Foundation (Week 1)**
- Database migration (`018_configurable_capture.sql`)
- CaptureRuleService
- CaptureInboxService
- EntityMappingService
- REST routes for all three
- Test with curl/Postman

**Phase 2: Extension Core (Week 2)**
- Modify manifest.json (add `scripting` permission)
- Service worker changes for dynamic registration
- Service worker changes for STAGE_CAPTURE
- Api.js additions (getCaptureRules, stageCapture)
- Test rule sync and dynamic registration

**Phase 3: Generic Extractor (Week 3)**
- generic-extractor.js implementation
- Selector execution engine
- Transform functions
- Test with sample rule on real site

**Phase 4: Inbox UI (Week 4)**
- CaptureInbox page component
- Pending items list
- Approve/reject workflow
- Entity type selection
- Field mapping UI

**Phase 5: Rule Builder UI (Week 5)**
- CaptureRules page component
- Rule creation form
- URL pattern builder
- Selector tester (paste HTML, test selectors)
- Enable/disable toggle

**Phase 6: Advanced Features (Week 6)**
- Entity mapping configuration UI
- Auto-apply rules
- Bulk approval
- Polling configuration

### Critical Path

```
Migration → Services → Routes → Extension Core → Generic Extractor → Inbox UI
```

**Cannot parallelize:**
- Services depend on migration
- Routes depend on services
- Extension changes depend on routes (need API endpoints)
- Generic extractor depends on extension core (message handling)
- Inbox UI depends on all backend pieces

**Can parallelize:**
- Rule Builder UI and Inbox UI (both need backend, independent of each other)
- Entity Mapping UI can start after Phase 4

---

## Migration Path from v1.0

### Backwards Compatibility Strategy

**The existing Jira flow remains untouched:**

1. **Content scripts:** `content.js` + extractors remain for `jira.tools.sap`
2. **Service worker:** `handleSyncIssues()` preserved for Jira
3. **Backend:** `/api/jira-issues/sync` unchanged
4. **Database:** `jira_issues` table unchanged

**New capture system runs in parallel:**

1. Dynamic scripts registered for non-Jira rules only
2. New data flows to `capture_inbox`, not `jira_issues`
3. After approval, mapped to appropriate entity tables

### Migration Options

**Option A: Gradual (Recommended)**
- Keep Jira hardcoded indefinitely
- New sites use configurable system
- Eventually create Jira rule + mapping for consistency

**Option B: Full Migration (Future)**
- Create Jira capture rule that matches existing selectors
- Create entity mapping: Jira fields → jira_issues table
- Set auto_apply=true to skip inbox
- Remove hardcoded Jira content scripts
- Jira data still goes to jira_issues via mapping

---

## Integration Points with v1.0 Extension

| Component | Status | Integration Notes |
|-----------|--------|-------------------|
| `manifest.json` | MODIFY | Add `scripting` permission, expand `host_permissions` |
| `service-worker.js` | MODIFY | Add rule sync, dynamic registration, STAGE_CAPTURE handler |
| `lib/storage.js` | MODIFY | Add captureRules cache key |
| `lib/api.js` | MODIFY | Add getCaptureRules(), stageCapture() methods |
| `content/content.js` | PRESERVE | Keep for Jira backwards compatibility |
| `content/extractors/*.js` | PRESERVE | Keep for Jira backwards compatibility |
| `content/generic-extractor.js` | NEW | Rule-driven extraction engine |
| `popup/popup.html` | MODIFY | Add rule status indicator |

---

## New vs Modified Components Summary

### New Components

| Component | Type | Location |
|-----------|------|----------|
| capture_rules table | Database | migration 018 |
| capture_inbox table | Database | migration 018 |
| entity_mappings table | Database | migration 018 |
| CaptureRuleService.js | Backend Service | server/services/ |
| CaptureInboxService.js | Backend Service | server/services/ |
| EntityMappingService.js | Backend Service | server/services/ |
| captureRules.js | Backend Route | server/routes/ |
| captureInbox.js | Backend Route | server/routes/ |
| entityMappings.js | Backend Route | server/routes/ |
| generic-extractor.js | Extension Content | extension/content/ |
| CaptureRules.jsx | Frontend Page | src/pages/ |
| CaptureInbox.jsx | Frontend Page | src/pages/ |
| RuleBuilder.jsx | Frontend Component | src/components/capture/ |
| InboxItem.jsx | Frontend Component | src/components/capture/ |

### Modified Components

| Component | Changes |
|-----------|---------|
| manifest.json | Add scripting permission, expand host_permissions |
| service-worker.js | Add dynamic registration, STAGE_CAPTURE handler |
| lib/storage.js | Add captureRules cache key |
| lib/api.js | Add getCaptureRules(), stageCapture() methods |
| server/index.js | Mount new routes |
| src/pages/Layout.jsx | Add Inbox nav item with badge |

### Preserved Components (No Changes)

| Component | Reason |
|-----------|--------|
| content/content.js | Jira backwards compatibility |
| content/extractors/*.js | Jira backwards compatibility |
| server/routes/jira.js | Jira backwards compatibility |
| server/services/JiraService.js | Jira backwards compatibility |
| jira_issues table | Jira backwards compatibility |
| jira_team_mappings table | Jira backwards compatibility |

---

## Sources

**Confidence Level:** HIGH

**Based on:**

1. **Existing v1.0 Implementation (PRIMARY SOURCE)**
   - `/extension/manifest.json` - Current manifest structure
   - `/extension/service-worker.js` - Message handling patterns
   - `/extension/content/content.js` - Page detection and extraction flow
   - `/extension/content/extractors/*.js` - Selector-based extraction patterns
   - `/server/services/JiraService.js` - Service layer patterns
   - `/server/routes/jira.js` - Route handler patterns

2. **Chrome Extension Documentation (Verified)**
   - `chrome.scripting.registerContentScripts()` API for dynamic registration
   - `chrome.scripting.executeScript()` for programmatic injection
   - Content script isolated world execution model
   - Service worker lifecycle and storage patterns

3. **P&E Manager Codebase Patterns (Verified)**
   - Multi-tenancy enforcement via user_id
   - Service → Routes → Database layering
   - Entity abstraction in frontend
   - PostgreSQL JSONB for flexible schemas

**Sources:**
- [Chrome Content Scripts Documentation](https://developer.chrome.com/docs/extensions/develop/concepts/content-scripts)
- [Chrome Scripting API Reference](https://developer.chrome.com/docs/extensions/reference/api/scripting)

---

*Research generated: 2026-01-22*
