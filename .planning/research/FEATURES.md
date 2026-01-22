# Feature Landscape: Configurable Web Capture Framework

**Domain:** Rule-based web extraction with data staging and entity mapping
**Researched:** 2026-01-22
**Confidence:** MEDIUM (based on domain knowledge of web scraping patterns, ETL workflows, and existing v1.0 extension codebase)

---

## Executive Summary

Configurable web capture systems combine three core capabilities: **rule definition** (what to extract), **data staging** (review before commit), and **entity mapping** (connect to existing data). The v1.0 Jira extension hardcodes all three. Milestone v1.1 must externalize them.

**Key insight:** The value proposition is user control without code changes. But configurability has a complexity cliff: simple CSS selector rules are achievable; visual point-and-click rule builders are 10x harder. Stay on the simple side.

**Dependency on v1.0:** The existing extension (content script architecture, service worker patterns, DOM observer, backend sync) is solid foundation. v1.1 adds a configuration layer on top, not a rewrite.

---

## Table Stakes

Features users expect. Missing these = configurable capture feels incomplete.

### Rule Configuration (What to Extract)

| Feature | Why Expected | Complexity | v1.0 Dependency | Notes |
|---------|--------------|------------|-----------------|-------|
| **Site URL Pattern** | Define which sites to capture from | Low | `manifest.json` host_permissions | User specifies URL patterns like `https://grafana.example.com/*` |
| **CSS Selector Rules** | Point to elements containing data | Medium | Extractors use `querySelector` | Core of configurability. Text input for selector, not visual builder |
| **Field Name Mapping** | Name extracted values (e.g., "status", "service") | Low | Extractors return named fields | Simple key:selector pairs |
| **Multiple Fields per Rule** | Extract several values from one page | Low | Existing extractors do this | Array of field definitions |
| **Test Rule UI** | Preview what a rule extracts before saving | Medium | None (new) | Critical for debugging selectors. Show matched elements |
| **Rule Enable/Disable** | Turn rules on/off without deleting | Low | None (new) | Boolean toggle per rule |

### Data Staging (Review Before Commit)

| Feature | Why Expected | Complexity | v1.0 Dependency | Notes |
|---------|--------------|------------|-----------------|-------|
| **Capture Inbox** | Queue of captured data awaiting review | Medium | `pendingIssues` in Storage | New database table + UI page |
| **Preview Captured Data** | See what was extracted | Low | None (UI only) | Table view of staged records |
| **Accept/Reject Actions** | User approves or discards staged data | Low | None (new) | Buttons on each staged item |
| **Bulk Accept** | Accept multiple staged items at once | Low | None (new) | Checkbox selection + bulk action |
| **Staged Item Expiry** | Auto-delete old unreviewed items | Low | None (new) | 30-day TTL, configurable |
| **Source Link** | Show where data came from | Low | `jira_url` pattern exists | Store source URL with each capture |

### Entity Mapping (Connect to Existing Data)

| Feature | Why Expected | Complexity | v1.0 Dependency | Notes |
|---------|--------------|------------|-----------------|-------|
| **Target Entity Selection** | Map captured data to Projects, Services, Team Members | Medium | AssigneeMappingDialog pattern | Dropdown of entity types |
| **Field-to-Property Mapping** | Map "extracted_status" to "project.health" | Medium | JiraMapping table pattern | Config UI for field mappings |
| **Manual Override** | User can edit mapped values before commit | Low | None (new) | Inline edit in staging UI |
| **Duplicate Detection** | Warn if captured data matches existing record | Medium | `UNIQUE(user_id, issue_key)` pattern | Compare against existing entities |

### Extension Behavior

| Feature | Why Expected | Complexity | v1.0 Dependency | Notes |
|---------|--------------|------------|-----------------|-------|
| **Multi-Site Support** | One extension, many sites | Medium | Single-site manifest | Dynamic content script injection |
| **Site-Specific Rules** | Different rules for Grafana vs Jenkins | Low | Page type detection | Rules keyed by site pattern |
| **Capture Trigger** | When to extract (page load, button click, interval) | Medium | `document_idle` + MutationObserver | Configurable per site |
| **Sync to Staging** | Send to inbox, not directly to entities | Low | Backend sync exists | New `/api/capture-inbox` endpoint |

---

## Differentiators

Features that add polish. Not expected, but valued.

| Feature | Value Proposition | Complexity | v1.0 Dependency | Notes |
|---------|-------------------|------------|-----------------|-------|
| **Visual Selector Helper** | Click on page element to generate selector | High | None | Browser DevTools integration is hard. Defer. |
| **Rule Templates** | Pre-built rules for common sites (Grafana, Jenkins) | Low | None | JSON files shipped with extension |
| **Capture History** | Log of all captures (accepted + rejected) | Medium | None | Audit trail |
| **Auto-Accept Rules** | Skip staging for trusted sources | Medium | None | Dangerous but useful for high-volume |
| **Scheduled Capture** | Run capture periodically even without browsing | High | MutationObserver is passive | Requires background fetch, likely blocked |
| **Conditional Rules** | Only capture if field X matches pattern Y | Medium | None | Filter expression in rule config |
| **Data Transformation** | Parse/format extracted values before staging | Medium | None | Regex replace, date parsing, etc. |
| **Capture Notifications** | Alert when new data arrives in inbox | Low | Badge on extension icon | Desktop notification optional |
| **Export Staged Data** | Download inbox as CSV/JSON | Low | None | Fallback if entity mapping fails |
| **Rule Sharing** | Export/import rules as JSON | Low | None | Power user feature |
| **Capture Rate Limiting** | Prevent duplicate captures within time window | Medium | SYNC_THROTTLE_MS exists | Per-site throttle |
| **Field Validation** | Reject captures with missing required fields | Low | None | Mark fields as required in rule |

---

## Anti-Features

Features to explicitly NOT build. Common mistakes in configurable extraction systems.

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| **Visual Rule Builder** | 10x complexity for point-and-click selector creation | Text input with test preview. Users can use browser DevTools for selectors |
| **JavaScript in Rules** | Security risk, maintenance nightmare | Declarative selectors + built-in transforms only |
| **XPath Support** | More complex than CSS selectors, rarely needed | CSS selectors cover 95% of cases |
| **Cross-Site Capture** | iframe injection into other sites is blocked | One site per capture rule |
| **Automatic Entity Creation** | Creates orphan/duplicate entities | Map to existing entities only; create manually first |
| **Two-Way Sync** | Captured data is read-only; editing back to source is scope creep | Source is master, P&E is replica |
| **AI Selector Generation** | "Just look at the page and figure it out" is unreliable | User provides explicit selectors |
| **Shadow DOM Piercing** | Grafana/Jenkins may use Shadow DOM; piercing is fragile | Document limitation; some sites may not work |
| **Auth Credential Storage** | Storing passwords for auto-login | Rely on user's browser session |
| **Headless Capture** | Running captures without browser open | Extension requires user's authenticated session |
| **Complex Scheduling** | Cron-like expressions for capture timing | Simple: on-navigate, on-click, or interval |
| **Multi-Page Workflows** | Navigate between pages to collect data | Single-page extraction only |

---

## Feature Dependencies

```
RULE CONFIGURATION
==================
Site URL Pattern (define where)
        |
        v
CSS Selector Rules (define what)
        |
        v
Field Name Mapping (name the fields)
        |
        v
Test Rule UI (verify it works)
        |
        v
Rule Enable/Disable (control activation)


DATA STAGING
============
Capture Inbox (store captured data)
        |
        +----> Preview Captured Data
        |
        +----> Source Link
        |
        v
Accept/Reject Actions (review workflow)
        |
        +----> Bulk Accept
        |
        +----> Staged Item Expiry


ENTITY MAPPING
==============
Target Entity Selection (which type?)
        |
        v
Field-to-Property Mapping (which fields?)
        |
        v
Manual Override (edit before commit)
        |
        v
Duplicate Detection (warn on conflicts)


INTEGRATION FLOW
================
Rule fires on site visit
        |
        v
Extension extracts data
        |
        v
Sync to Staging (inbox)
        |
        v
User reviews in P&E app
        |
        v
Accept maps to entities
        |
        v
Data in main system
```

---

## MVP Recommendation

For v1.1 (first configurable capture milestone), prioritize core configurability loop.

### Must Have (v1.1 MVP)

**Rule Configuration:**
1. Site URL Pattern - Foundation for multi-site
2. CSS Selector Rules - Core extraction logic
3. Field Name Mapping - Structure captured data
4. Test Rule UI - Users can't debug without this
5. Rule Enable/Disable - Basic lifecycle management

**Data Staging:**
6. Capture Inbox - Central to review workflow
7. Preview Captured Data - See what was captured
8. Accept/Reject Actions - Core review actions
9. Source Link - Traceability to origin

**Entity Mapping:**
10. Target Entity Selection - Connect to existing data
11. Field-to-Property Mapping - Map fields to entity properties

**Extension:**
12. Multi-Site Support - Dynamic host permissions
13. Sync to Staging - Route to inbox, not entities

### Nice to Have (v1.1+)

- Bulk Accept - Efficiency for high volume
- Rule Templates - Ship Grafana/Jenkins defaults
- Conditional Rules - Filter unwanted captures
- Duplicate Detection - Prevent duplicates
- Capture Notifications - Awareness of new data
- Manual Override - Edit before commit
- Staged Item Expiry - Cleanup old items

### Defer to Future

- Visual Selector Helper - Too complex for v1.1
- Data Transformation - Add when patterns emerge
- Capture History - Nice audit trail, not blocking
- Auto-Accept Rules - Trust must be earned first
- Export Staged Data - Fallback, low priority
- Rule Sharing - Power user, post-MVP

---

## Complexity Assessment by Feature Category

| Category | Complexity | Rationale |
|----------|------------|-----------|
| Site URL Pattern | Low | String matching, already in manifest |
| CSS Selector Rules | Medium | Need UI for editing + validation |
| Test Rule UI | Medium | Must inject into target page, show results |
| Capture Inbox | Medium | New table, API, and full CRUD UI |
| Accept/Reject | Low | Buttons that call API endpoints |
| Target Entity Selection | Medium | Generic entity picker UI |
| Field-to-Property Mapping | Medium | Dynamic form based on entity schema |
| Multi-Site Support | Medium | Dynamic content script registration |
| Duplicate Detection | Medium | Query + fuzzy matching |
| Visual Selector Helper | High | Browser integration, element highlighting |
| Conditional Rules | Medium | Expression parsing and evaluation |
| Data Transformation | Medium | Plugin architecture for transforms |

---

## UI Complexity Map

### P&E Manager Web App (New Screens)

| Screen | Purpose | Complexity | Components Needed |
|--------|---------|------------|-------------------|
| **Capture Rules** | CRUD for extraction rules | Medium | Form with dynamic fields, selector tester |
| **Capture Inbox** | Review staged data | Medium | Table with actions, bulk operations |
| **Rule Test Panel** | Preview extraction results | Medium | Split view: rule config + results |
| **Entity Mapping Config** | Configure field mappings | Medium | Nested dropdowns, schema-aware |

### Extension (Modifications)

| Component | Change | Complexity | Notes |
|-----------|--------|------------|-------|
| **manifest.json** | Dynamic host_permissions | Low | Add optional_host_permissions |
| **content.js** | Load rules from backend, apply dynamically | Medium | Replace hardcoded extractors |
| **service-worker.js** | Sync rules on startup, route to staging | Low | Fetch rules from /api/capture-rules |
| **options.js** | Add rule management link | Low | Link to P&E app settings |
| **popup.js** | Show capture status per site | Low | Multi-site status display |

---

## Database Schema Additions

```sql
-- Capture rules defined by user
CREATE TABLE capture_rules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id TEXT NOT NULL,
  name TEXT NOT NULL,
  site_pattern TEXT NOT NULL,  -- URL pattern (e.g., https://grafana.example.com/*)
  enabled BOOLEAN DEFAULT true,
  trigger_type TEXT DEFAULT 'navigate',  -- navigate, click, interval
  selectors JSONB NOT NULL,  -- [{field: "status", selector: ".health-badge"}]
  target_entity_type TEXT,  -- projects, services, team_members
  field_mappings JSONB,  -- {status: "health", name: "name"}
  created_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Staging inbox for captured data
CREATE TABLE capture_inbox (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id TEXT NOT NULL,
  rule_id UUID REFERENCES capture_rules(id) ON DELETE SET NULL,
  source_url TEXT NOT NULL,
  captured_data JSONB NOT NULL,  -- Raw extracted data
  status TEXT DEFAULT 'pending',  -- pending, accepted, rejected
  target_entity_id UUID,  -- Linked entity after acceptance
  captured_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  reviewed_at TIMESTAMP,
  expires_at TIMESTAMP DEFAULT (CURRENT_TIMESTAMP + INTERVAL '30 days')
);

-- Index for inbox queries
CREATE INDEX idx_capture_inbox_user_status ON capture_inbox(user_id, status);
CREATE INDEX idx_capture_inbox_expires ON capture_inbox(expires_at) WHERE status = 'pending';
```

---

## API Endpoints

```
Capture Rules:
  GET    /api/capture-rules          - List user's rules
  POST   /api/capture-rules          - Create rule
  GET    /api/capture-rules/:id      - Get single rule
  PUT    /api/capture-rules/:id      - Update rule
  DELETE /api/capture-rules/:id      - Delete rule
  POST   /api/capture-rules/:id/test - Test rule against URL (returns preview)

Capture Inbox:
  GET    /api/capture-inbox          - List pending items (default: pending only)
  POST   /api/capture-inbox          - Create staged item (from extension)
  GET    /api/capture-inbox/:id      - Get single item
  POST   /api/capture-inbox/:id/accept  - Accept and map to entity
  POST   /api/capture-inbox/:id/reject  - Reject (soft delete)
  POST   /api/capture-inbox/bulk-accept - Accept multiple items
  DELETE /api/capture-inbox/expired  - Cleanup expired items (cron job)
```

---

## Extension Architecture Changes

### Current (v1.0 Hardcoded)

```
manifest.json
  |- host_permissions: ["https://jira.tools.sap/*"]
  |- content_scripts: [{ matches: ["https://jira.tools.sap/*"], js: [...] }]

content.js
  |- detectPageType() -> board | backlog | detail
  |- loadExtractorScript('content/extractors/board.js')
  |- extractBoardIssues() -> send to backend

service-worker.js
  |- POST /api/jira-issues (direct to entities)
```

### Target (v1.1 Configurable)

```
manifest.json
  |- optional_host_permissions: ["<all_urls>"] or user-approved list
  |- content_scripts: [{ matches: ["<all_urls>"], js: [...] }] + programmatic injection

content.js
  |- On page load: fetch rules for current URL from service-worker
  |- If rule matches: apply CSS selectors, extract data
  |- Send to service-worker for staging

service-worker.js
  |- Fetch rules from /api/capture-rules on startup/install
  |- Cache rules in chrome.storage
  |- POST /api/capture-inbox (to staging, not entities)

P&E Manager Web App
  |- /settings/capture-rules - Rule CRUD
  |- /capture-inbox - Review staged items
```

---

## Migration from v1.0

**Jira rules become "built-in" rules:**
- Convert existing Jira extractors to capture_rules format
- Mark as system rules (non-editable) or user-customizable
- Existing JiraMapping becomes a field_mapping example

**No breaking changes:**
- `/api/jira-issues` continues to work
- Existing sync flow preserved
- Inbox is additive, not replacement

---

## Confidence Assessment

| Area | Level | Reason |
|------|-------|--------|
| Rule Configuration Model | HIGH | Standard pattern in web scraping tools |
| CSS Selector Extraction | HIGH | Proven in v1.0 extension |
| Data Staging Pattern | HIGH | Common ETL staging pattern |
| Entity Mapping | MEDIUM | Generic mapping is harder than Jira-specific |
| Multi-Site Extension | MEDIUM | Manifest V3 optional permissions need testing |
| Test Rule UI | MEDIUM | Browser integration complexity unknown |
| Visual Selector Helper | LOW | Not researched deeply; deferred as anti-feature |

---

## Sources and Verification

**Based on:**
- **HIGH confidence:** Existing v1.0 extension codebase (extractors, storage patterns, sync flow)
- **HIGH confidence:** Existing P&E Manager backend patterns (services, routes, migrations)
- **MEDIUM confidence:** Browser extension configurability patterns (Manifest V3 optional permissions)
- **MEDIUM confidence:** ETL staging/inbox patterns (common in data integration tools)

**Needs verification during implementation:**
- Dynamic content script injection with optional_host_permissions
- Performance of rule matching on every page navigation
- Shadow DOM limitations on target sites (Grafana, Jenkins, etc.)
- Test rule UI implementation approach

**Note:** WebSearch was unavailable during research. Findings based on domain knowledge and v1.0 codebase analysis. Recommend prototyping multi-site injection early to validate approach.
