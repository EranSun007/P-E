# Project Research Summary

**Project:** P&E Manager v1.1 - Web Capture Framework
**Domain:** Browser Extension + Configurable Web Scraping + Data Staging
**Researched:** 2026-01-22
**Confidence:** HIGH

## Executive Summary

The v1.1 Web Capture Framework evolves the existing hardcoded Jira extension into a configurable, multi-site data capture system. The critical insight from research: **this is primarily a schema design problem, not a library problem**. The existing stack (Express/PostgreSQL/React/Zod) provides everything needed. No new runtime dependencies are required. The architecture should preserve the working v1.0 Jira flow while adding configurability layers on top through new database tables, service classes, and a generic extraction engine.

The recommended approach is a layered architecture with three new core components: **Capture Rules** (JSONB-stored extraction configurations), **Data Staging/Inbox** (review workflow before entity mapping), and **Entity Mappings** (user-defined rules linking captured data to P&E entities). The extension evolves from static content scripts to dynamic registration via Chrome's `scripting` API, with a generic extractor replacing site-specific hardcoded code. Backwards compatibility with the existing Jira flow is preserved throughout.

The most significant risks are **configuration complexity explosion** (users struggling to configure CSS selectors), **selector brittleness multiplied across sites** (maintenance nightmare), and **data staging becoming a graveyard** (items piling up unreviewed). Mitigation strategies include: preset-based configuration with tiered complexity, multi-selector fallback chains with health monitoring, and trust-based auto-approval rules that limit human review to genuinely uncertain captures.

## Key Findings

### Recommended Stack

No new npm packages required. All additions are schema and code changes to the existing stack.

**Core technologies (already in place):**
- **PostgreSQL JSONB**: Store extraction rules as structured JSON — native feature, indexed, queryable
- **Zod 3.25.76**: Schema validation for rules on both frontend and backend — already integrated
- **react-hook-form 7.60.0**: Dynamic rule builder forms via `useFieldArray` — already installed
- **Chrome Extension MV3**: Extend with `scripting` permission for dynamic content script registration

**Explicitly NOT adding:**
- Puppeteer/Playwright (extension already has DOM access)
- Cheerio (live DOM exists, no need to parse HTML strings)
- Dedicated rule engines (simple selector-to-field mapping suffices)
- Redis/Message queues (volume doesn't justify complexity)

### Expected Features

**Must have (v1.1 MVP):**
- Site URL Pattern — foundation for multi-site
- CSS Selector Rules — core extraction logic
- Field Name Mapping — structure captured data
- Test Rule UI — users cannot debug without preview
- Capture Inbox — central review workflow
- Accept/Reject Actions — core review workflow
- Target Entity Selection — connect to existing data
- Multi-Site Support — dynamic host permissions

**Should have (competitive):**
- Rule Templates — pre-built rules for Grafana/Jenkins
- Bulk Accept — efficiency for high volume
- Duplicate Detection — prevent duplicates
- Conditional Rules — filter unwanted captures

**Defer (v2+):**
- Visual Selector Helper — 10x complexity for point-and-click builder
- Data Transformation plugins — add when patterns emerge
- Auto-Accept Rules — trust must be earned first
- AI Selector Generation — unreliable approach

### Architecture Approach

The architecture preserves v1.0 patterns while adding configurability layers. Three new database tables (`capture_rules`, `capture_inbox`, `entity_mappings`) store user-defined extraction configurations. The extension gains dynamic content script registration via `chrome.scripting.registerContentScripts()` based on rules fetched from backend. A new generic extractor (`generic-extractor.js`) replaces site-specific hardcoded extractors, using rule-defined selectors. The existing Jira flow remains untouched for backwards compatibility.

**Major components:**
1. **CaptureRuleService** — CRUD for extraction rules, validation, extension sync
2. **CaptureInboxService** — data staging, approve/reject workflow, entity creation
3. **EntityMappingService** — field mapping definitions, transform application
4. **generic-extractor.js** — rule-driven DOM extraction, runs in content script context
5. **Dynamic registration** — service worker manages content script registration per rule

### Critical Pitfalls

1. **Configuration Complexity Explosion** — Build presets with tiered configuration (Level 0: works out of box, Level 1: change URL, Level 2: override selectors, Level 3: expert custom mappings). Never require CSS selector knowledge for basic usage.

2. **Selector Brittleness Multiplied Across Sites** — Implement multi-selector fallback chains (3+ strategies per critical field), selector health monitoring with alerts, and version-specific selector sets. Graceful degradation: Site A broken should not affect Sites B, C, D.

3. **Data Staging Becomes Graveyard** — Implement trust tiers (HIGH_TRUST auto-approves, LOW_TRUST requires individual review). Items pending >30 days get auto-action. Inline review in main UI, not separate staging screen.

4. **Entity Mapping N x M Explosion** — Use canonical intermediate format. All sources normalize TO common schema, system maps FROM common schema. State mapping tables instead of if/else code.

5. **Multi-Site Extension Architecture** — Single extension with lazy-loaded site-specific extractors, not N separate extensions or one monolith loading all code everywhere.

## Implications for Roadmap

Based on research, suggested phase structure:

### Phase 1: Backend Foundation
**Rationale:** Services and database must exist before extension or frontend can interact with them.
**Delivers:** Database schema (capture_rules, capture_inbox, entity_mappings tables), CaptureRuleService, CaptureInboxService, EntityMappingService, REST routes
**Addresses:** Core infrastructure enabling all features
**Avoids:** Building frontend/extension without working backend (integration chaos)

### Phase 2: Extension Core
**Rationale:** Dynamic registration depends on backend API; must complete before generic extractor can function.
**Delivers:** manifest.json updates (scripting permission), service worker rule sync, STAGE_CAPTURE message handler, Api.js additions
**Addresses:** Multi-site support, dynamic content script registration
**Avoids:** Monolithic extension (Pitfall 5)

### Phase 3: Generic Extractor
**Rationale:** Depends on extension core for message handling; core extraction capability needed before UI.
**Delivers:** generic-extractor.js, selector execution engine, transform functions
**Addresses:** CSS Selector Rules, Field Name Mapping
**Avoids:** Selector brittleness (with fallback chains built in from start)

### Phase 4: Inbox UI
**Rationale:** Depends on backend services; essential review workflow needed before rule builder.
**Delivers:** CaptureInbox page, pending items list, approve/reject workflow, entity type selection
**Addresses:** Capture Inbox, Accept/Reject Actions, Target Entity Selection
**Avoids:** Staging graveyard (with trust tiers and aging policies)

### Phase 5: Rule Builder UI
**Rationale:** Users need to see captured data working before investing in rule configuration.
**Delivers:** CaptureRules page, rule creation form, URL pattern builder, selector tester
**Addresses:** Site URL Pattern, Test Rule UI, Rule Enable/Disable
**Avoids:** Configuration complexity (with presets and tiered UI)

### Phase 6: Advanced Features
**Rationale:** Polish after core loop is complete.
**Delivers:** Entity mapping configuration UI, auto-apply rules, bulk approval, polling configuration
**Addresses:** Field-to-Property Mapping, Bulk Accept, Rule Templates

### Phase Ordering Rationale

- **Backend-first:** Extension and frontend both depend on API endpoints existing
- **Extension before UI:** Users need data flowing before configuration UI matters
- **Inbox before Rules:** "See it working" validates approach before "configure it yourself"
- **Jira preserved throughout:** No breaking changes, v1.0 flow continues working

### Research Flags

**Phases likely needing deeper research during planning:**
- **Phase 3 (Generic Extractor):** DOM structure varies by target site — recommend live inspection of SAP Grafana/Jenkins instances
- **Phase 4 (Inbox UI):** User workflow preferences unclear — recommend user interviews on review workflow

**Phases with standard patterns (skip research-phase):**
- **Phase 1 (Backend Foundation):** Well-established service pattern from existing codebase
- **Phase 2 (Extension Core):** Chrome scripting API is documented, pattern is clear

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | Verified all needed features exist in current stack — no new dependencies |
| Features | MEDIUM | Based on domain knowledge; no user research conducted |
| Architecture | HIGH | Based on working v1.0 implementation and Chrome extension documentation |
| Pitfalls | MEDIUM-HIGH | Drawn from v1.0 experience and domain expertise; per-site DOM stability needs live verification |

**Overall confidence:** HIGH

The recommendation to add no new dependencies is strongly supported by codebase analysis. Architecture patterns extend existing working code. Main uncertainty is per-site selector stability which can only be validated during implementation.

### Gaps to Address

- **DOM structure of target sites:** Need live inspection of SAP internal Grafana, Jenkins, Concourse, Dynatrace to validate selector approaches
- **User configuration experience:** No user feedback on v1.0 Jira configuration — should survey during Phase 5
- **Shadow DOM limitations:** Some target sites may use Shadow DOM; document as limitation or research piercing strategies
- **Multi-site performance:** Extension loading extractors for multiple sites — needs performance testing

## Sources

### Primary (HIGH confidence)
- **Existing v1.0 codebase** — `/Users/i306072/Documents/GitHub/P-E/extension/` for extension patterns, `/server/` for service patterns
- **package.json analysis** — Verified versions: react-hook-form 7.60.0, zod 3.25.76, pg 8.11.3
- **Chrome Extension Documentation** — scripting API, content script registration, Manifest V3 patterns

### Secondary (MEDIUM confidence)
- **Domain expertise** — Web scraping patterns, ETL staging workflows, data mapping patterns
- **CLAUDE.md project context** — Service layer patterns, multi-tenancy enforcement

### Tertiary (LOW confidence)
- **Per-site DOM stability** — Inferred from framework knowledge; needs live verification for SAP instances

---
*Research completed: 2026-01-22*
*Ready for roadmap: yes*
