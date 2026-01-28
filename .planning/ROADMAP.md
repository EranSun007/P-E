# Roadmap: P&E Manager

## Milestones

- **v1.0 Jira Integration MVP** - Phases 1-5 (shipped 2026-01-21)
- **v1.1 Web Capture Framework** - Phases 6-9 (shipped 2026-01-22)
- **v1.2 DevOps Bug Dashboard** - Phases 10-12 (in progress)

## Phases

<details>
<summary>v1.0 Jira Integration MVP (Phases 1-5) - SHIPPED 2026-01-21</summary>

### Phase 1: Backend Foundation
**Goal**: Backend can receive, store, and return Jira issue data via REST API
**Depends on**: Nothing (first phase)
**Requirements**: DB-01, DB-02, DB-03, API-01, API-02, API-03, API-04, API-05
**Success Criteria** (what must be TRUE):
  1. Database tables (jira_issues, jira_team_mappings) exist with proper indexes
  2. POST /api/jira-issues/sync accepts batch of issues and returns sync counts
  3. GET /api/jira-issues returns user's synced issues (multi-tenancy enforced)
  4. Jira assignees can be mapped to team members via /api/jira-mappings
  5. All endpoints reject unauthenticated requests (401 response)
**Plans**: 3/3 complete

Plans:
- [x] 01-01-PLAN.md - Database schema and migration
- [x] 01-02-PLAN.md - JiraService implementation
- [x] 01-03-PLAN.md - REST API routes and authentication

### Phase 2: Extension Core
**Goal**: Extension can authenticate with backend, store data, and sync via service worker
**Depends on**: Phase 1
**Requirements**: EXT-01, EXT-08, EXT-09
**Success Criteria** (what must be TRUE):
  1. Extension installs in Chrome with Manifest V3 structure
  2. Service worker responds to messages from popup and content script
  3. Auth token persists in chrome.storage.local across browser restarts
  4. Service worker successfully POSTs test data to backend /api/jira-issues/sync
  5. Sync status (success/error/timestamp) stored and retrievable
**Plans**: 2/2 complete

Plans:
- [x] 02-01-PLAN.md - Extension manifest and service worker scaffold
- [x] 02-02-PLAN.md - Storage management and backend API client

### Phase 3: Content Script
**Goal**: Extension extracts Jira issue data from DOM while user browses Jira
**Depends on**: Phase 2
**Requirements**: EXT-02, EXT-04, EXT-05, EXT-06, EXT-07
**Success Criteria** (what must be TRUE):
  1. Content script activates on jira.tools.sap board pages
  2. Sprint board view extracts issues with key, summary, status, assignee, points
  3. Backlog view extracts items with sprint assignment and ranking
  4. Issue detail pages provide fallback data extraction
  5. Extracted data automatically syncs to backend within 60 seconds
**Plans**: 2/2 complete

Plans:
- [x] 03-01-PLAN.md - Content script scaffold, page detection, SPA navigation
- [x] 03-02-PLAN.md - Board, backlog, and detail extractors

### Phase 4: Extension UI
**Goal**: User can configure extension, view sync status, and trigger manual syncs
**Depends on**: Phase 2
**Requirements**: EXT-03, UI-04
**Success Criteria** (what must be TRUE):
  1. Popup displays current sync status (syncing, success, error, stale)
  2. Popup shows last sync timestamp
  3. User can trigger manual sync from popup
  4. Options page allows configuring backend URL and auth token
  5. Extension icon badge shows sync state at a glance
**Plans**: 1/1 complete

Plans:
- [x] 04-01-PLAN.md - Badge status indicator and popup sync button

### Phase 5: Web App Integration
**Goal**: Users can view and manage synced Jira data in P&E Manager web app
**Depends on**: Phase 1
**Requirements**: UI-01, UI-02, UI-03, UI-05
**Success Criteria** (what must be TRUE):
  1. Jira Issues page lists all synced issues with filtering
  2. Team workload view shows issues grouped by assignee
  3. Users can link Jira assignees to existing team members
  4. Sync status indicator shows data freshness
  5. Clicking an issue opens it in Jira
**Plans**: 2/2 complete

Plans:
- [x] 05-01-PLAN.md - JiraIssues page, API client, routing, navigation
- [x] 05-02-PLAN.md - Team workload view and assignee mapping

</details>

<details>
<summary>v1.1 Web Capture Framework (Phases 6-9) - SHIPPED 2026-01-22</summary>

**Milestone Goal:** Evolve the Jira-specific extension into a configurable multi-site capture framework with data staging and entity mapping.

- [x] **Phase 6: Backend Foundation** - Database schema, services, and REST API for capture rules, inbox, and mappings
- [x] **Phase 7: Extension Core** - Dynamic rule loading, generic extractor, and staging capture flow
- [x] **Phase 8: Inbox and Mapping UI** - Review workflow and entity mapping interface
- [x] **Phase 9: Rule Builder UI** - Create and test capture rules via web app

### Phase 6: Backend Foundation
**Goal**: Backend can store capture rules, receive staged captures, and manage entity mappings
**Depends on**: Phase 5 (v1.0 complete)
**Requirements**: DB-01, DB-02, DB-03, DB-04, API-01, API-02, API-03, API-04, API-05, API-06, API-07
**Success Criteria** (what must be TRUE):
  1. User can retrieve their capture rules via GET /api/capture-rules (extension fetches these on startup)
  2. User can create/update/delete capture rules via REST API (foundation for Rule Builder UI)
  3. Extension can POST captured data to /api/capture-inbox (data stages, not visible in main app)
  4. User can accept or reject inbox items via /api/capture-inbox/:id/accept and /reject
  5. Entity mappings persist and can be retrieved for auto-application to future captures
**Plans**: 2 plans

Plans:
- [x] 06-01-PLAN.md — Database schema and migration (capture_rules, capture_inbox, entity_mappings)
- [x] 06-02-PLAN.md — CaptureService and REST API routes

### Phase 7: Extension Core
**Goal**: Extension dynamically loads capture rules and sends extracted data to inbox
**Depends on**: Phase 6 (API must exist)
**Requirements**: EXT-01, EXT-02, EXT-03, EXT-04, EXT-05
**Success Criteria** (what must be TRUE):
  1. Extension fetches capture rules from backend on startup and when user triggers refresh
  2. Extension activates content scripts on sites matching enabled rule URL patterns (dynamic, not hardcoded)
  3. Generic extractor applies rule-defined CSS selectors and field names to page DOM
  4. Captured data is sent to /api/capture-inbox (staged for review)
  5. Extension badge shows count of captures pending review
**Plans**: 3 plans

Plans:
- [x] 07-01-PLAN.md — Rule fetching, storage, API client, dynamic script registration
- [x] 07-02-PLAN.md — Generic extractor content script and capture flow
- [x] 07-03-PLAN.md — Badge status and manual capture trigger in popup

### Phase 8: Inbox and Mapping UI
**Goal**: User can review captured data and map it to P&E Manager entities
**Depends on**: Phase 6 (API must exist)
**Requirements**: STAGE-01, STAGE-02, STAGE-03, STAGE-04, STAGE-05, MAP-01, MAP-02, MAP-03, MAP-04
**Success Criteria** (what must be TRUE):
  1. Capture Inbox page shows all pending items with source site, rule name, and capture timestamp
  2. User can preview raw captured data for each item before deciding
  3. User can accept (with entity mapping) or reject individual items
  4. User can select target entity type (project, team member, service) when accepting
  5. Bulk accept/reject allows processing 10+ items at once without page-by-page clicking
**Plans**: 2 plans

Plans:
- [x] 08-01-PLAN.md — Capture Inbox page with API client, table, filtering, preview, and basic accept/reject
- [x] 08-02-PLAN.md — Entity mapping dialog with auto-suggest and bulk operations

### Phase 9: Rule Builder UI
**Goal**: User can create and configure capture rules without editing code
**Depends on**: Phase 6 (API must exist), Phase 7 (rules are used by extension)
**Requirements**: RULE-01, RULE-02, RULE-03, RULE-04, RULE-05, RULE-06
**Success Criteria** (what must be TRUE):
  1. User can create a new rule with URL pattern (e.g., *.grafana.sap/*)
  2. User can define CSS selectors and name the extracted fields (e.g., "status", "job_name")
  3. User can test selectors against a live page before saving the rule
  4. User can enable/disable rules without deleting them
  5. Preset templates available for Jenkins, Grafana, Concourse, Dynatrace (jump-start configuration)
**Plans**: 2 plans

Plans:
- [x] 09-01-PLAN.md — Rule CRUD page with URL pattern and dynamic selector array
- [x] 09-02-PLAN.md — Preset templates and selector testing guidance

</details>

## v1.2 DevOps Bug Dashboard (In Progress)

**Milestone Goal:** Add a bug KPI dashboard that analyzes weekly JIRA exports to track DevOps duty team performance with actionable metrics and alerts.

- [x] **Phase 10: Backend Foundation** - Database schema, BugService, KPI calculations, REST API
- [x] **Phase 11: CSV Upload** - Upload UI with validation, parsing, progress feedback
- [ ] **Phase 12: Dashboard UI** - KPI cards, filters, alerts, charts, aging bugs table

### Phase 10: Backend Foundation
**Goal**: Backend can store bug data, calculate KPIs, and serve analytics via REST API
**Depends on**: Phase 9 (v1.1 complete)
**Requirements**: DB-01, DB-02, DB-03, DB-04, DB-05, KPI-01 through KPI-09, API-02, API-03, API-04, API-05, UPLOAD-03
**Success Criteria** (what must be TRUE):
  1. Database tables (bug_uploads, bugs, weekly_kpis) exist with proper indexes
  2. BugService can parse CSV and validate required columns
  3. BugService calculates all 10 KPIs matching specification formulas
  4. GET /api/bugs/kpis returns pre-calculated KPIs for week + component
  5. GET /api/bugs/list returns bugs with filtering and pagination
  6. DELETE /api/bugs/uploads/:id cascades to bugs and KPIs
**Plans**: 2 plans (Wave 1: 10-01, Wave 2: 10-02)

Plans:
- [x] 10-01-PLAN.md — Database schema, migration, and BugService foundation (Wave 1)
- [x] 10-02-PLAN.md — KPI calculations and REST API routes (Wave 2)

### Phase 11: CSV Upload
**Goal**: User can upload JIRA CSV exports with validation and progress feedback
**Depends on**: Phase 10 (backend must exist)
**Requirements**: UPLOAD-01, UPLOAD-02, UPLOAD-04, UPLOAD-05, UPLOAD-06, API-01
**Success Criteria** (what must be TRUE):
  1. User can upload CSV via drag-and-drop or file picker
  2. User must specify week-ending date (Saturday) for each upload
  3. System shows clear error messages for invalid CSV format
  4. Duplicate upload detection prompts for replace/cancel
  5. Upload progress and summary displayed (total bugs, components)
**Plans**: 1 plan

Plans:
- [x] 11-01-PLAN.md — Upload page with validation, progress, and duplicate detection

### Phase 12: Dashboard UI
**Goal**: User can view KPIs with status indicators, filters, alerts, and charts
**Depends on**: Phase 10 (API must exist), Phase 11 (data must be uploadable)
**Requirements**: DASH-01 through DASH-08
**Success Criteria** (what must be TRUE):
  1. Dashboard shows all KPIs in card layout with green/yellow/red status
  2. Filter by component dropdown updates all KPIs
  3. Filter by week dropdown loads historical data
  4. Critical alert banner appears when any KPI in red zone
  5. Aging bugs table shows open VH/High bugs with clickable JIRA links
  6. MTTR by priority bar chart renders correctly
  7. Bug category pie/donut chart renders correctly
**Plans**: 2 plans

Plans:
- [ ] 12-01-PLAN.md — KPI cards with status colors, filter dropdowns, critical alert banner
- [ ] 12-02-PLAN.md — Aging bugs table with JIRA links, MTTR bar chart, category donut chart

## Progress

**Execution Order:**
v1.0: 1 -> 2 -> 3 -> 4/5 parallel
v1.1: 6 -> 7 (depends on 6), 8 (depends on 6), 9 (depends on 6+7)
v1.2: 10 -> 11 (depends on 10) -> 12 (depends on 10+11)

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 1. Backend Foundation | v1.0 | 3/3 | Complete | 2026-01-21 |
| 2. Extension Core | v1.0 | 2/2 | Complete | 2026-01-21 |
| 3. Content Script | v1.0 | 2/2 | Complete | 2026-01-21 |
| 4. Extension UI | v1.0 | 1/1 | Complete | 2026-01-21 |
| 5. Web App Integration | v1.0 | 2/2 | Complete | 2026-01-21 |
| 6. Backend Foundation | v1.1 | 2/2 | Complete | 2026-01-22 |
| 7. Extension Core | v1.1 | 3/3 | Complete | 2026-01-22 |
| 8. Inbox and Mapping UI | v1.1 | 2/2 | Complete | 2026-01-22 |
| 9. Rule Builder UI | v1.1 | 2/2 | Complete | 2026-01-22 |
| 10. Backend Foundation | v1.2 | 2/2 | Complete | 2026-01-27 |
| 11. CSV Upload | v1.2 | 1/1 | Complete | 2026-01-28 |
| 12. Dashboard UI | v1.2 | 0/2 | Planned | — |

## v1.2 Requirement Coverage

| REQ-ID | Phase | Description |
|--------|-------|-------------|
| DB-01 | 10 | bug_uploads table with metadata |
| DB-02 | 10 | bugs table with parsed data |
| DB-03 | 10 | weekly_kpis table for pre-calculated metrics |
| DB-04 | 10 | Indexes on user_id, status, priority, component |
| DB-05 | 10 | CASCADE DELETE from bug_uploads |
| UPLOAD-03 | 10 | CSV column validation |
| KPI-01 | 10 | Bug Inflow Rate calculation |
| KPI-02 | 10 | Time to First Response calculation |
| KPI-03 | 10 | MTTR by Priority calculation |
| KPI-04 | 10 | SLA Compliance calculation |
| KPI-05 | 10 | Open Bug Age Distribution calculation |
| KPI-06 | 10 | Automated vs Actionable Ratio calculation |
| KPI-07 | 10 | Bug Category Distribution calculation |
| KPI-08 | 10 | Duty Rotation Workload calculation |
| KPI-09 | 10 | Backlog Health Score calculation |
| API-02 | 10 | GET /api/bugs/uploads endpoint |
| API-03 | 10 | GET /api/bugs/kpis endpoint |
| API-04 | 10 | GET /api/bugs/list endpoint |
| API-05 | 10 | DELETE /api/bugs/uploads/:id endpoint |
| UPLOAD-01 | 11 | Drag-and-drop or file picker upload |
| UPLOAD-02 | 11 | Week-ending date picker (Saturday) |
| UPLOAD-04 | 11 | Duplicate upload detection |
| UPLOAD-05 | 11 | Upload progress and summary |
| UPLOAD-06 | 11 | Clear error messages |
| API-01 | 11 | POST /api/bugs/upload endpoint |
| DASH-01 | 12 | KPI card layout |
| DASH-02 | 12 | Green/yellow/red status indicators |
| DASH-03 | 12 | Component filter dropdown |
| DASH-04 | 12 | Week filter dropdown |
| DASH-05 | 12 | Critical alert banner |
| DASH-06 | 12 | Aging bugs table with JIRA links |
| DASH-07 | 12 | MTTR by priority bar chart |
| DASH-08 | 12 | Bug category pie/donut chart |

**Coverage:** 33/33 v1.2 requirements mapped

<details>
<summary>v1.1 Requirement Coverage (Archived)</summary>

| REQ-ID | Phase | Description |
|--------|-------|-------------|
| DB-01 | 6 | capture_rules table with URL patterns and selectors |
| DB-02 | 6 | capture_inbox table for staged items |
| DB-03 | 6 | entity_mappings table for source-to-target mappings |
| DB-04 | 6 | Migration file following conventions |
| API-01 | 6 | GET /api/capture-rules for extension fetch |
| API-02 | 6 | CRUD for /api/capture-rules |
| API-03 | 6 | POST /api/capture-inbox for captured items |
| API-04 | 6 | GET /api/capture-inbox for inbox UI |
| API-05 | 6 | POST /api/capture-inbox/:id/accept |
| API-06 | 6 | POST /api/capture-inbox/:id/reject |
| API-07 | 6 | CRUD for /api/entity-mappings |
| EXT-01 | 7 | Extension fetches rules on startup/refresh |
| EXT-02 | 7 | Extension activates on matching URL patterns |
| EXT-03 | 7 | Extension sends to staging table |
| EXT-04 | 7 | Badge shows capture count |
| EXT-05 | 7 | Manual capture trigger |
| STAGE-01 | 8 | View captured items in inbox |
| STAGE-02 | 8 | Preview raw captured data |
| STAGE-03 | 8 | Accept or reject items |
| STAGE-04 | 8 | Select target entity type |
| STAGE-05 | 8 | Bulk accept/reject |
| MAP-01 | 8 | Map source identifier to target entity |
| MAP-02 | 8 | Select target entity type |
| MAP-03 | 8 | Auto-suggest mappings by name similarity |
| MAP-04 | 8 | Reusable mapping rules |
| RULE-01 | 9 | Create rule with URL pattern |
| RULE-02 | 9 | Define CSS selectors in rule |
| RULE-03 | 9 | Name extracted fields |
| RULE-04 | 9 | Enable/disable rules |
| RULE-05 | 9 | Test selectors against live page |
| RULE-06 | 9 | Preset templates for common sites |

**Coverage:** 31/31 v1.1 requirements mapped

</details>
