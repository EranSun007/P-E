# Domain Pitfalls: Configurable Web Capture Framework

**Domain:** Multi-site configurable capture extension with data staging
**Researched:** 2026-01-22
**Confidence:** MEDIUM-HIGH (based on v1.0 Jira extension experience + domain expertise)

---

## Critical Pitfalls

Mistakes that cause rewrites, major production issues, or block multi-site scaling.

---

### Pitfall 1: Configuration Complexity Explosion

**Severity:** CRITICAL
**Phase to address:** Phase 1 (Configuration Architecture)

**What goes wrong:** Teams build "infinitely configurable" extraction systems where users can define any selector, any field mapping, any transformation. The configuration UI becomes unusable, the extraction logic becomes unmaintainable, and users can't actually configure anything without developer assistance.

**Why it happens:**
- Overestimating user sophistication ("they'll write CSS selectors")
- Fear of hardcoding anything ("what if they need different fields?")
- Treating configuration as a substitute for architecture decisions
- Confusing "flexible" with "good"

**Consequences:**
- Users struggle to create working configurations
- Invalid configurations crash extraction silently
- Debugging becomes nearly impossible (which config caused this?)
- Configuration schema changes break existing configs
- Developer time shifts from features to config support

**Warning signs:**
- Configuration schema exceeds 50 fields
- Users ask "how do I configure X?" more than "does it work?"
- Need a tutorial video to explain configuration
- Finding bugs requires reproducing user's exact config
- Config validation logic exceeds extraction logic

**Prevention:**

1. **Start with presets, not blank forms:**
```javascript
// BAD: User must configure everything
{
  siteName: "",
  selectors: {
    container: "",
    items: "",
    title: "",
    status: "",
    // ... 20 more fields
  }
}

// GOOD: Site-specific presets with optional overrides
{
  preset: "grafana-dashboard",  // Loads tested defaults
  overrides: {
    // Only fields that differ from preset
    titleSelector: ".custom-title"  // Override specific field
  }
}
```

2. **Tiered configuration model:**
   - **Level 0 (default):** Works with preset, zero config
   - **Level 1 (basic):** Change instance URL, enable/disable
   - **Level 2 (advanced):** Override specific selectors
   - **Level 3 (expert):** Custom field mappings (hidden by default)

3. **Visual selector builder:**
   - User clicks element on page, system generates selector
   - Show extracted data preview immediately
   - Validate selectors before saving

4. **Configuration versioning:**
   - Each config has version number
   - Breaking changes require migration path
   - Old configs continue working (deprecated, not broken)

**Detection:**
- Survey users: "Did you need help configuring?"
- Track: Configuration save attempts vs successful extractions
- Monitor: Support tickets about configuration

---

### Pitfall 2: Selector Brittleness Multiplied Across Sites

**Severity:** CRITICAL
**Phase to address:** Phase 2 (Site-Specific Extractors)

**What goes wrong:** The v1.0 Jira extension has selector stability issues with ONE site. Multi-site capture multiplies this problem - each site has different DOM patterns, different update cycles, different stability levels. When Grafana updates their UI, selectors break. When Jenkins updates, different selectors break. Maintenance becomes impossible.

**Why it happens:**
- Each internal tool (Grafana, Jenkins, Concourse, Dynatrace) uses different frontend frameworks
- Internal tools may be customized versions (SAP-specific builds)
- Update cycles are unpredictable and uncoordinated
- No data-testid attributes on internal tools
- React/Angular/Vue each produce different DOM structures

**Consequences from v1.0 Jira extension:**
```javascript
// Current hardcoded selectors that break:
const BOARD_SELECTORS = {
  boardContainer: '[data-test-id="software-board.board"]',  // Breaks on updates
  issueCard: '[data-test-id*="card-container"]',           // Inconsistent
  // Fallback chain helps but doesn't solve root cause
};
```

**Warning signs:**
- "Extraction stopped working" reports spike after tool updates
- Different sites break at different times (whack-a-mole)
- Need dedicated developer time for "selector maintenance"
- Users don't know extraction broke until they check staging

**Prevention:**

1. **Selector stability tier system:**
```javascript
const SELECTOR_TIERS = {
  // Tier 1: Most stable - use first
  stable: [
    'data-testid',
    'data-cy',
    'aria-label',
    'id with semantic name'
  ],

  // Tier 2: Moderately stable
  moderate: [
    'href patterns',
    'semantic HTML tags',
    'ARIA roles'
  ],

  // Tier 3: Fragile - last resort with fallback
  fragile: [
    'CSS classes',
    'DOM structure',
    'nth-child'
  ]
};
```

2. **Multi-selector fallback chains (already in v1.0, expand):**
```javascript
// Require 3+ fallback strategies per critical field
const extractTitle = (element) => {
  return element.querySelector('[data-testid*="title"]')?.textContent ||
         element.querySelector('[aria-label*="title"]')?.textContent ||
         element.querySelector('h1, h2, .title')?.textContent ||
         element.getAttribute('title') ||
         null;  // Explicit null for missing data
};
```

3. **Selector health monitoring:**
   - Track selector success rate per site per selector
   - Alert when success rate drops below 95%
   - Dashboard showing selector health across all sites
   - Automatic fallback to secondary selectors when primary fails

4. **Version/DOM fingerprinting:**
```javascript
// Detect tool version to use appropriate selector set
const detectGrafanaVersion = () => {
  const versionMeta = document.querySelector('meta[name="grafana-version"]');
  const bodyClass = document.body.className;

  if (versionMeta) return versionMeta.content;
  if (bodyClass.includes('grafana-10')) return '10.x';
  if (bodyClass.includes('grafana-9')) return '9.x';
  return 'unknown';
};

// Load version-specific selectors
const selectors = GRAFANA_SELECTORS[version] || GRAFANA_SELECTORS.fallback;
```

5. **Graceful degradation per site:**
   - Site A broken? Still capture from sites B, C, D
   - Partial extraction is better than no extraction
   - Clear indication which sites have issues

**Detection:**
- Per-site extraction success rate dashboard
- Automated alerts on selector failure
- Weekly selector health reports

---

### Pitfall 3: Data Staging Becomes Data Graveyard

**Severity:** CRITICAL
**Phase to address:** Phase 3 (Data Staging/Inbox)

**What goes wrong:** Team builds "staging area" for captured data before it enters the main system. Users are supposed to review and approve items. In practice: items pile up, nobody reviews them, staging becomes a dumping ground. Users either ignore staging entirely (defeating the purpose) or rubber-stamp approve everything (also defeating the purpose).

**Why it happens:**
- Review workflow is friction, not value
- No clear criteria for what needs review vs auto-approve
- Staging UI is separate from main workflow
- Volume exceeds human review capacity
- "Review later" becomes "never review"

**Consequences:**
- 1000+ items in staging, 0 reviewed
- Users bypass staging (direct import) losing data quality
- Duplicates and errors enter main system via bulk approve
- Staging becomes technical debt itself
- Team debates: "remove staging? it's not working"

**Warning signs:**
- Staging item count grows unbounded
- Average time-in-staging exceeds 7 days
- Most items approved in bulk, not individually
- Users ask to "skip staging"
- Staging UI rarely opened

**Prevention:**

1. **Trust tiers, not blanket staging:**
```javascript
const CAPTURE_TRUST_LEVELS = {
  HIGH_TRUST: {
    // Auto-approved, no staging
    conditions: ['selector_confidence > 95%', 'matches_known_entity'],
    action: 'direct_import'
  },
  MEDIUM_TRUST: {
    // Brief review, grouped
    conditions: ['selector_confidence > 80%', 'partial_entity_match'],
    action: 'batch_review'  // Review 10 at a time
  },
  LOW_TRUST: {
    // Individual review required
    conditions: ['selector_confidence < 80%', 'new_entity_type'],
    action: 'individual_review'
  },
  NO_TRUST: {
    // Discard or manual correction
    conditions: ['selector_failed', 'data_validation_failed'],
    action: 'quarantine'
  }
};
```

2. **Inline review, not separate staging:**
   - Show pending items in main UI with "pending" badge
   - One-click approve from anywhere
   - Review happens where data is used, not separate screen

3. **Auto-approve rules:**
```javascript
// If captured data matches existing entity by key, auto-merge
const autoApproveRules = [
  {
    name: 'exact_match',
    condition: (captured, existing) =>
      captured.issueKey === existing.issueKey,
    action: 'merge_update'
  },
  {
    name: 'trusted_source',
    condition: (captured) =>
      captured.source === 'jenkins' &&
      captured.confidence > 90,
    action: 'auto_import'
  }
];
```

4. **Aging + auto-actions:**
   - Items pending > 7 days: prompt for action
   - Items pending > 30 days: auto-archive or auto-approve based on trust
   - Never let staging grow unbounded

5. **Review metrics visibility:**
   - Show: "23 items awaiting review (5 high-priority)"
   - Gamification: "You reviewed 10 items today"
   - SLA: "Items should be reviewed within 48 hours"

**Detection:**
- Track average time-in-staging
- Track review rate (items reviewed / items captured)
- Track bulk-approve vs individual-approve ratio
- Survey: "Do you review staged items?"

---

### Pitfall 4: Entity Mapping Becomes N x M Problem

**Severity:** HIGH
**Phase to address:** Phase 4 (Entity Mapping)

**What goes wrong:** Each site (N) produces different data shapes. The main system has different entity types (M). Team attempts to build generic mappers for all combinations. N x M mapping combinations explode. Jenkins build status doesn't map to Jira status which doesn't map to Grafana alert state.

**Why it happens:**
- Semantic mismatch: "status" means different things per tool
- Field cardinality differs: Grafana has tags[], Jira has single assignee
- Temporal differences: Jenkins has build timestamps, Jira has update timestamps
- Identifiers are incompatible: UUIDs vs issue keys vs build numbers

**Consequences:**
- Mapping code is larger than extraction code
- Edge cases in mapping cause data corruption
- Users manually fix mappings constantly
- Different sites have different data quality
- "Why is this Grafana alert showing as a Jira task?"

**Warning signs:**
- Mapping functions exceed 100 lines
- Many if/else branches for source type
- Users report "wrong data in wrong place"
- Entity types proliferate to handle sources
- Need lookup tables for status mappings

**Prevention:**

1. **Canonical intermediate format:**
```typescript
// All sources map TO this, system maps FROM this
interface CapturedItem {
  // Universal fields
  id: string;              // Generated or extracted
  source: 'grafana' | 'jenkins' | 'concourse' | 'dynatrace';
  sourceUrl: string;       // Link back to source
  capturedAt: Date;

  // Normalized fields (source-agnostic semantics)
  title: string;
  description?: string;
  state: 'active' | 'resolved' | 'pending' | 'unknown';
  severity?: 'critical' | 'high' | 'medium' | 'low';
  assignees?: string[];    // Array to handle both single and multiple
  timestamp: Date;         // Most relevant timestamp (created, updated, triggered)

  // Source-specific data (preserved as-is)
  sourceData: Record<string, unknown>;
}
```

2. **Source-specific normalizers:**
```javascript
// Each source has ONE normalizer to canonical format
const normalizers = {
  grafana: (raw) => ({
    title: raw.alertName,
    state: mapGrafanaState(raw.state),  // 'alerting' -> 'active'
    severity: mapGrafanaSeverity(raw.labels?.severity),
    timestamp: new Date(raw.activeAt),
    sourceData: raw  // Preserve original
  }),

  jenkins: (raw) => ({
    title: `Build #${raw.number}: ${raw.displayName}`,
    state: mapJenkinsResult(raw.result),  // 'SUCCESS' -> 'resolved'
    timestamp: new Date(raw.timestamp),
    sourceData: raw
  })
};
```

3. **Explicit state mapping tables (not code):**
```javascript
const STATE_MAPPINGS = {
  grafana: {
    'alerting': 'active',
    'pending': 'pending',
    'ok': 'resolved',
    'nodata': 'unknown',
    'paused': 'resolved'
  },
  jenkins: {
    'SUCCESS': 'resolved',
    'FAILURE': 'active',
    'UNSTABLE': 'active',
    'ABORTED': 'unknown',
    'NOT_BUILT': 'pending'
  }
  // Easy to add new sources or adjust mappings
};
```

4. **Validation at mapping boundaries:**
```javascript
const validateCapturedItem = (item) => {
  const errors = [];

  if (!item.title) errors.push('Missing title');
  if (!['active', 'resolved', 'pending', 'unknown'].includes(item.state)) {
    errors.push(`Invalid state: ${item.state}`);
  }
  if (!item.timestamp || isNaN(item.timestamp.getTime())) {
    errors.push('Invalid timestamp');
  }

  return { valid: errors.length === 0, errors };
};
```

5. **Unmappable data handling:**
   - Preserve in sourceData, don't force into wrong field
   - UI can display sourceData for advanced users
   - Log unmapped fields for future mapping improvements

**Detection:**
- Track mapping errors per source
- Track unmapped field frequency
- Compare data quality scores per source

---

### Pitfall 5: Multi-Site Extension Becomes Multi-Extension Chaos

**Severity:** HIGH
**Phase to address:** Phase 1 (Extension Architecture)

**What goes wrong:** Team builds separate extensions for each site (Grafana extension, Jenkins extension, Concourse extension) OR builds one monolithic extension that loads all code for all sites regardless of which site user visits. Both approaches fail at scale.

**Why it happens:**
- Separate extensions: Easier initially, diverge over time
- Monolithic extension: Simpler architecture, bloated performance
- Chrome extension architecture makes code-splitting non-obvious
- Content scripts are per-match pattern, not per-feature

**Consequences (separate extensions):**
- Inconsistent UI across extensions
- Duplicated boilerplate (storage, auth, sync logic)
- Users manage multiple extensions
- Bug fixes need N deployments
- Configuration scattered

**Consequences (monolithic extension):**
- 500KB+ extension size (slow load)
- All site code runs regardless of current site
- Memory footprint multiplied
- CSP conflicts between sites
- Testing requires all sites accessible

**Warning signs:**
- Extension size > 200KB
- Content script runs on sites it doesn't understand
- Multiple manifest.json files
- "This extension slows down my browser"
- Debugging requires clearing ALL extension data

**Prevention:**

1. **Single extension, dynamic content scripts:**
```json
// manifest.json - Register ALL potential sites
{
  "host_permissions": [
    "https://*.grafana.internal/*",
    "https://jenkins.internal/*",
    "https://concourse.internal/*",
    "https://dynatrace.internal/*"
  ],
  "content_scripts": [
    {
      "matches": ["https://*.grafana.internal/*"],
      "js": ["content/loader.js"],  // Tiny loader
      "run_at": "document_idle"
    },
    // ... per-site entries with same loader
  ]
}
```

2. **Lazy-load site-specific extractors:**
```javascript
// content/loader.js - Minimal, runs on all sites
(async function() {
  const siteType = detectSiteType(window.location.hostname);
  if (!siteType) return;  // Not a recognized site

  // Dynamically load only the needed extractor
  const extractorPath = `extractors/${siteType}.js`;
  await import(chrome.runtime.getURL(extractorPath));
})();
```

3. **Shared core, site-specific modules:**
```
extension/
  manifest.json
  service-worker.js       # Shared: storage, sync, messaging
  content/
    loader.js             # Shared: site detection, dynamic loading
    extractors/
      grafana.js          # Site-specific: Grafana extraction
      jenkins.js          # Site-specific: Jenkins extraction
      base.js             # Shared: extraction utilities
  lib/
    storage.js            # Shared
    api.js               # Shared
  popup/
    popup.html           # Shared UI
    popup.js
```

4. **Configuration-driven site registration:**
```javascript
// Sites defined in config, not hardcoded in manifest
const REGISTERED_SITES = {
  grafana: {
    hostPattern: /.*\.grafana\.internal$/,
    extractorModule: 'grafana',
    displayName: 'Grafana',
    icon: 'grafana.png'
  },
  jenkins: {
    hostPattern: /jenkins\.internal$/,
    extractorModule: 'jenkins',
    displayName: 'Jenkins',
    icon: 'jenkins.png'
  }
  // Easy to add new sites without manifest changes
};
```

5. **Per-site enable/disable:**
   - Users can disable sites they don't use
   - Disabled sites: content script doesn't load extractor
   - Reduces memory and potential conflicts

**Detection:**
- Monitor extension size per release
- Track per-site memory usage
- User survey: "Which sites do you use?"

---

## Moderate Pitfalls

Mistakes that cause delays, technical debt, or degraded UX.

---

### Pitfall 6: Cross-Site Identity Confusion

**Severity:** MODERATE
**Phase to address:** Phase 4 (Entity Mapping)

**What goes wrong:** Same person appears as "john.smith" in Jira, "jsmith@company.com" in Jenkins, "John Smith" in Grafana. System can't correlate these are the same person. Workload views show duplicates. Team member assignments are fragmented.

**Prevention:**
- User identity mapping table (Jira ID <-> Jenkins ID <-> Display Name)
- Fuzzy matching with manual confirmation
- "Same person?" UI for disambiguation
- Store all source identifiers on team member record

**Detection:**
- Duplicate names with slight variations in UI
- Users report "I show up twice"
- Entity counts exceed expected

---

### Pitfall 7: Rate Limiting and Extraction Throttling

**Severity:** MODERATE
**Phase to address:** Phase 2 (Site-Specific Extractors)

**What goes wrong:** Extension extracts data too aggressively. Internal tools notice load. IT/DevOps complains about "rogue scraping." Extension gets blocked or user gets warnings.

**Prevention:**
- Conservative default throttling (1 extraction per 5 minutes per site)
- Exponential backoff on errors
- Respect robots.txt patterns even for internal tools
- User-configurable extraction frequency with sane limits
- "Idle detection" - only extract when user is actively viewing

**Detection:**
- HTTP 429 responses from targets
- Complaints from tool administrators
- Extraction suddenly stops working (IP blocked)

---

### Pitfall 8: Configuration UI Doesn't Match Mental Model

**Severity:** MODERATE
**Phase to address:** Phase 3 (Configuration UI)

**What goes wrong:** Configuration UI organized by technical concepts (selectors, mappings, transformations) rather than user tasks (capture from Grafana, send alerts to inbox, ignore low-priority items).

**Prevention:**
- Task-oriented configuration: "Set up Grafana capture" not "Configure selectors"
- Wizard-style onboarding for first-time setup
- Preview extracted data during configuration
- "Test this configuration" button with real data

**Detection:**
- Users abandon configuration mid-flow
- Support tickets: "I don't understand configuration"
- Configuration left at defaults despite not working

---

### Pitfall 9: No Visibility Into Capture Health

**Severity:** MODERATE
**Phase to address:** Phase 2 (Extraction Core)

**What goes wrong:** Extension silently succeeds or fails. Users don't know if capture is working until they check the main app and notice stale data. Problems accumulate undetected.

**Prevention:**
- Badge showing capture status on extension icon
- Last successful capture timestamp per site
- Error summary: "Jenkins: 3 failures in last hour"
- Push notification for persistent failures
- Weekly health report email (optional)

**Detection:**
- Users report stale data days after extraction broke
- Support tickets start with "I didn't know it wasn't working"

---

### Pitfall 10: Breaking Changes in Configuration Schema

**Severity:** MODERATE
**Phase to address:** Phase 1 (Configuration Architecture)

**What goes wrong:** Team ships config schema v1. Later, schema changes break existing user configs. Migration is incomplete. Users face cryptic errors or lost configurations.

**Prevention:**
- Config schema versioning from day 1
- Forward migration for all schema changes
- Never delete fields, deprecate then remove after N versions
- Config validation with helpful error messages
- Test suite for config migrations

**Detection:**
- Errors after extension update
- Users report "my configuration is gone"
- Config validation failures in logs

---

## Minor Pitfalls

Annoyances that are fixable without major rework.

---

### Pitfall 11: Inconsistent Field Naming Across Sites

**What goes wrong:** Same concept has different names: "priority" (Jira), "severity" (Grafana), "importance" (internal). UI is confusing, queries don't work as expected.

**Prevention:**
- Canonical field vocabulary document
- Map site-specific terms to canonical terms
- UI shows canonical names with "from X" tooltips

---

### Pitfall 12: Extraction Timing Misalignment

**What goes wrong:** Jenkins build completes at 10:00, extraction runs at 10:05, Grafana alert fires at 10:03, extraction runs at 10:10. Related events captured with different timestamps, correlation is lost.

**Prevention:**
- Capture source timestamp, not extraction timestamp
- Display source timestamps prominently
- Event correlation based on source time windows

---

### Pitfall 13: Tab Management Overhead

**What goes wrong:** Extension needs active tab on target site to extract. Users must keep Grafana, Jenkins, etc. tabs open. Browser becomes cluttered. Or: extraction only works when tab is visited.

**Prevention:**
- Background extraction where possible (service worker + webRequest)
- Document which sites require active tab
- Tab rotation strategy for multi-site capture
- Consider: "focus tab briefly to extract" automation

---

## Phase-Specific Warnings

| Phase | Topic | Likely Pitfall | Mitigation |
|-------|-------|----------------|------------|
| Phase 1 | Config architecture | Complexity explosion | Presets + tiered configuration |
| Phase 1 | Extension architecture | Monolith vs. N extensions | Single extension, lazy-load extractors |
| Phase 2 | Selector stability | Multi-site selector maintenance | Fallback chains + health monitoring |
| Phase 2 | Site-specific extractors | DOM differences per tool | Version detection + graceful degradation |
| Phase 3 | Data staging | Staging becomes graveyard | Trust tiers + auto-approve rules |
| Phase 3 | Configuration UI | Technical vs. task-oriented | Wizard + preview + test buttons |
| Phase 4 | Entity mapping | N x M mapping explosion | Canonical intermediate format |
| Phase 4 | Identity mapping | Cross-site identity confusion | Identity mapping table + fuzzy match |
| Phase 5 | Observability | Silent failures | Per-site health dashboard |
| Phase 5 | Updates | Config schema breaking changes | Versioning + forward migration |

---

## Multi-Site Specific Warnings

### DOM Variability by Tool

| Tool | Frontend Stack | DOM Stability | Notes |
|------|---------------|---------------|-------|
| Grafana | React + Angular | Medium | Version-specific selectors needed |
| Jenkins | Java + Jelly templates | High | Classic HTML, stable patterns |
| Concourse | Elm | Medium-High | Consistent but uncommon patterns |
| Dynatrace | Angular | Low-Medium | Frequent UI updates |
| Jira | React (Cloud) | Low | Updates break selectors regularly |

**Recommendation:** Prioritize Jenkins (most stable), then Grafana, then Concourse. Dynatrace and Jira require most maintenance.

### Data Model Differences

| Tool | Primary Entity | Identifier | State Model |
|------|---------------|------------|-------------|
| Grafana | Alert | alertId + org | alerting/pending/ok/nodata/paused |
| Jenkins | Build | job/build# | SUCCESS/FAILURE/UNSTABLE/ABORTED |
| Concourse | Build | pipeline/job/build | succeeded/failed/errored/aborted |
| Dynatrace | Problem | problemId | open/resolved |
| Jira | Issue | issueKey | Custom per workflow |

**Recommendation:** Build normalizers early. State mapping tables are easier to maintain than code.

---

## Lessons from v1.0 Jira Extension

The current Jira extension demonstrates several patterns and anti-patterns relevant to multi-site expansion:

**What worked:**
- Fallback selector chains (board.js has 2-3 selectors per field)
- Page type detection from URL patterns
- MutationObserver with debouncing
- CustomEvent communication between page context and content script
- Sync throttling (30 second minimum between syncs)

**What needs improvement for multi-site:**
- Selectors are hardcoded per page type (not configurable)
- No selector health monitoring
- No visual selector builder
- No per-site enable/disable
- Monolithic content script loads all extractors
- Configuration only via options page (not in-context)

**Code patterns to extract and generalize:**
```javascript
// From board.js - reusable pattern
function findElements(selectorChains) {
  for (const selectors of selectorChains) {
    const elements = document.querySelectorAll(selectors);
    if (elements.length > 0) {
      return Array.from(elements);
    }
  }
  return [];
}
```

---

## Confidence Assessment

| Category | Confidence | Basis |
|----------|------------|-------|
| Configuration complexity | HIGH | Universal software UX problem |
| Selector brittleness | HIGH | Direct v1.0 experience |
| Staging workflow | HIGH | Common pattern failure mode |
| Entity mapping | MEDIUM-HIGH | Domain expertise, some verification needed |
| Multi-extension architecture | MEDIUM | Chrome extension patterns established |
| Cross-site identity | MEDIUM | Depends on source tools |
| Per-tool DOM stability | LOW-MEDIUM | Needs live verification for SAP instances |

---

## Sources

**Primary:**
- v1.0 Jira extension implementation (`/Users/i306072/Documents/GitHub/P-E/extension/`)
- Existing research files (`/Users/i306072/Documents/GitHub/P-E/.planning/research/`)
- Chrome Extension Manifest V3 documentation (from training data)

**Verification needed:**
- DOM structure of SAP internal Grafana, Jenkins, Concourse, Dynatrace instances
- Actual selector stability across tool versions
- User feedback on v1.0 Jira configuration experience

**Recommendations for phase-specific research:**
- Phase 2: Live DOM inspection of each target tool
- Phase 3: User interviews on data review workflow preferences
- Phase 4: Entity model analysis of each source tool

---

## Quality Gate Verification

- [x] Pitfalls are specific to configurable capture (not generic advice)
- [x] Multi-site complexity addressed (Pitfalls 2, 4, 5, 6)
- [x] Data staging/review pitfalls covered (Pitfall 3)
- [x] Prevention strategies are actionable (code examples, specific approaches)
- [x] Phase assignments provided for each pitfall
- [x] Severity indicators included (CRITICAL, HIGH, MODERATE, MINOR)
- [x] Warning signs documented for early detection
- [x] Lessons from v1.0 Jira extension incorporated
