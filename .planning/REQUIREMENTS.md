# Requirements: P&E Manager v1.1 Web Capture Framework

**Generated:** 2026-01-22
**Status:** Active
**Source:** User selections + research findings

---

## v1.1 Requirements (This Milestone)

### Rule Configuration (RULE)

- [x] **RULE-01**: User can create capture rule with URL pattern (e.g., `*.grafana.sap/*`)
- [x] **RULE-02**: User can define CSS selectors for data extraction in a rule
- [x] **RULE-03**: User can name extracted fields (e.g., "build_status", "job_name")
- [x] **RULE-04**: User can enable/disable rules without deleting them
- [x] **RULE-05**: User can test selectors against a live page before saving rule
- [x] **RULE-06**: User can create rules from preset templates (Jenkins, Grafana, Concourse, Dynatrace)

### Data Staging (STAGE)

- [x] **STAGE-01**: User can view captured items in an inbox before they enter main system
- [x] **STAGE-02**: User can preview raw captured data for each item
- [x] **STAGE-03**: User can accept or reject individual captured items
- [x] **STAGE-04**: User can select target entity type when accepting (project, team member, service)
- [x] **STAGE-05**: User can bulk accept/reject multiple captured items

### Entity Mapping (MAP)

- [x] **MAP-01**: User can map captured source identifier to a target entity
- [x] **MAP-02**: User can select target entity type (project, team member, service)
- [x] **MAP-03**: System auto-suggests mappings based on name similarity
- [x] **MAP-04**: User can create reusable mapping rules that auto-apply to future captures

### Extension Behavior (EXT)

- [x] **EXT-01**: Extension fetches capture rules from backend on startup/refresh
- [x] **EXT-02**: Extension activates on sites matching rule URL patterns (dynamic, not hardcoded)
- [x] **EXT-03**: Extension sends captured data to staging table (not directly to main tables)
- [x] **EXT-04**: Extension badge shows capture count on icon
- [x] **EXT-05**: User can trigger manual capture from extension popup

### Database Schema (DB)

- [x] **DB-01**: capture_rules table stores rule definitions with URL patterns and selectors (JSONB)
- [x] **DB-02**: capture_inbox table stores staged items awaiting review
- [x] **DB-03**: entity_mappings table stores source-to-target mappings (generic, not Jira-specific)
- [x] **DB-04**: Migration file following existing conventions

### Backend API (API)

- [x] **API-01**: GET /api/capture-rules - List rules for extension to fetch
- [x] **API-02**: POST/PUT/DELETE /api/capture-rules - CRUD for rule management
- [x] **API-03**: POST /api/capture-inbox - Receive captured items from extension
- [x] **API-04**: GET /api/capture-inbox - List items for inbox UI
- [x] **API-05**: POST /api/capture-inbox/:id/accept - Accept item with entity mapping
- [x] **API-06**: POST /api/capture-inbox/:id/reject - Reject item
- [x] **API-07**: GET/POST /api/entity-mappings - CRUD for mapping rules

---

## Future Requirements (v1.2+)

### Deferred Features

- **v2-01**: Visual selector picker (point-and-click in browser) — High complexity
- **v2-02**: Selector fallback chains (try A, then B, then C) — Nice-to-have
- **v2-03**: Edit captured data before accepting — Low priority
- **v2-04**: Auto-approve rules for trusted sources — After manual workflow proven
- **v2-05**: Capture history in extension popup — Polish feature
- **v2-06**: Field-level mapping (which captured field → which entity field) — After basic mapping works

---

## Out of Scope

| Feature | Reason |
|---------|--------|
| Visual rule builder (drag-drop) | 10x complexity, declarative rules sufficient |
| JavaScript in rules | Security risk, CSS selectors enough |
| Automatic entity creation | Map to existing only, prevents data sprawl |
| Write-back to source systems | Read-only capture, same as v1.0 |
| Real-time streaming | Extension captures while browsing |
| Complex transformations | Capture raw data, simple field naming |

---

## Traceability

| REQ-ID | Phase | Status |
|--------|-------|--------|
| RULE-01 | Phase 9 | Complete |
| RULE-02 | Phase 9 | Complete |
| RULE-03 | Phase 9 | Complete |
| RULE-04 | Phase 9 | Complete |
| RULE-05 | Phase 9 | Complete |
| RULE-06 | Phase 9 | Complete |
| STAGE-01 | Phase 8 | Complete |
| STAGE-02 | Phase 8 | Complete |
| STAGE-03 | Phase 8 | Complete |
| STAGE-04 | Phase 8 | Complete |
| STAGE-05 | Phase 8 | Complete |
| MAP-01 | Phase 8 | Complete |
| MAP-02 | Phase 8 | Complete |
| MAP-03 | Phase 8 | Complete |
| MAP-04 | Phase 8 | Complete |
| EXT-01 | Phase 7 | Complete |
| EXT-02 | Phase 7 | Complete |
| EXT-03 | Phase 7 | Complete |
| EXT-04 | Phase 7 | Complete |
| EXT-05 | Phase 7 | Complete |
| DB-01 | Phase 6 | Complete |
| DB-02 | Phase 6 | Complete |
| DB-03 | Phase 6 | Complete |
| DB-04 | Phase 6 | Complete |
| API-01 | Phase 6 | Complete |
| API-02 | Phase 6 | Complete |
| API-03 | Phase 6 | Complete |
| API-04 | Phase 6 | Complete |
| API-05 | Phase 6 | Complete |
| API-06 | Phase 6 | Complete |
| API-07 | Phase 6 | Complete |

*Traceability table updated by roadmap generator — 2026-01-22*

---

## Acceptance Criteria Summary

**Rule Configuration works when:**
1. User creates rule via UI with URL pattern and selectors
2. Rule appears in list, can be enabled/disabled
3. Test button shows what would be captured from current page
4. Preset templates available for Jenkins, Grafana

**Data Staging works when:**
1. Captured items appear in inbox (not main UI until approved)
2. User can preview raw data, see source site/rule
3. Accept sends to entity mapping, reject removes
4. Bulk operations handle 10+ items at once

**Entity Mapping works when:**
1. Accepted item prompts for target entity type
2. Auto-suggest shows likely matches
3. Created mapping applies to future captures from same source
4. Mapped data visible in main P&E Manager UI

**Extension works when:**
1. Extension fetches rules on startup
2. Activates on sites matching any enabled rule
3. Captures based on rule selectors, sends to inbox
4. Badge shows pending capture count

---

*Requirements generated from user selections and v1.1 research findings*
