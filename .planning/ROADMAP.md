# Roadmap: P&E Manager

## Milestones

- **v1.0 Jira Integration MVP** - Phases 1-5 (shipped 2026-01-21) — [Archive](milestones/v1.0-ROADMAP.md)
- **v1.1 Web Capture Framework** - Phases 6-9 (shipped 2026-01-22) — [Archive](milestones/v1.1-ROADMAP.md)
- **v1.2 DevOps Bug Dashboard** - Phases 10-12 (shipped 2026-01-28) — [Archive](milestones/v1.2-ROADMAP.md)
- **v1.3 KPI Insights & Alerts** - Phases 13-16 (in progress)

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

<details>
<summary>v1.2 DevOps Bug Dashboard (Phases 10-12) - SHIPPED 2026-01-28</summary>

**Milestone Goal:** Add a bug KPI dashboard that analyzes weekly JIRA exports to track DevOps duty team performance with actionable metrics and alerts.

- [x] **Phase 10: Backend Foundation** - Database schema, BugService, KPI calculations, REST API
- [x] **Phase 11: CSV Upload** - Upload UI with validation, parsing, progress feedback
- [x] **Phase 12: Dashboard UI** - KPI cards, filters, alerts, charts, aging bugs table

### Phase 10: Backend Foundation
**Goal**: Backend can store bug data, calculate KPIs, and serve analytics via REST API
**Depends on**: Phase 9 (v1.1 complete)
**Requirements**: DB-01, DB-02, DB-03, DB-04, DB-05, KPI-01 through KPI-09, API-02, API-03, API-04, API-05, UPLOAD-03
**Success Criteria** (what must be TRUE):
  1. Database tables (bug_uploads, bugs, weekly_kpis) exist with proper indexes
  2. BugService can parse CSV and validate required columns
  3. BugService calculates all 9 KPIs matching specification formulas
  4. GET /api/bugs/kpis returns pre-calculated KPIs for week + component
  5. GET /api/bugs/list returns bugs with filtering and pagination
  6. DELETE /api/bugs/uploads/:id cascades to bugs and KPIs
**Plans**: 2/2 complete

Plans:
- [x] 10-01-PLAN.md — Database schema, migration, and BugService foundation
- [x] 10-02-PLAN.md — KPI calculations and REST API routes

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
**Plans**: 1/1 complete

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
**Plans**: 2/2 complete

Plans:
- [x] 12-01-PLAN.md — KPI cards with status colors, filter dropdowns, critical alert banner
- [x] 12-02-PLAN.md — Aging bugs table with JIRA links, MTTR bar chart, category donut chart

</details>

## v1.3 KPI Insights & Alerts (In Progress)

**Milestone Goal:** Add historical KPI trend visualization and proactive notifications when performance degrades.

### Phase 13: Historical KPI Storage
**Goal**: Backend can query and return multi-week KPI trends for visualization
**Depends on**: Phase 12 (v1.2 complete)
**Requirements**: INFRA-01
**Success Criteria** (what must be TRUE):
  1. GET /api/bugs/kpis/history returns KPI data for last 12 weeks
  2. Query accepts week count parameter (4, 8, or 12 weeks)
  3. Query accepts component filter matching dashboard
  4. Response includes week_ending dates for X-axis rendering
  5. Query performance under 500ms for 12-week dataset
**Plans**: TBD

Plans:
- [ ] 13-01: Historical query implementation with JOIN optimization

### Phase 14: Trend Charts
**Goal**: User can view KPI trends over time with visual threshold zones
**Depends on**: Phase 13 (historical API must exist)
**Requirements**: TREND-01, TREND-02, TREND-03, TREND-04, TREND-05, TREND-06, TREND-07
**Success Criteria** (what must be TRUE):
  1. User can view line chart showing any KPI across multiple weeks
  2. User can switch between KPIs using dropdown selector
  3. User can select time range (4, 8, or 12 weeks)
  4. Chart displays colored threshold bands (green/yellow/red zones)
  5. Hovering over data point shows exact KPI value and date
  6. KPI cards show mini sparkline visualizations
  7. KPI cards display trend arrows indicating direction (up/down/flat)
**Plans**: TBD

Plans:
- [ ] 14-01: KPITrendChart component with Recharts LineChart
- [ ] 14-02: Sparklines and trend indicators on KPI cards

### Phase 15: Threshold Detection & In-App Notifications
**Goal**: System detects threshold breaches and alerts users within the app
**Depends on**: Phase 13 (historical data for trend calculation)
**Requirements**: NOTIF-01, NOTIF-02, NOTIF-03, NOTIF-04, NOTIF-05, INFRA-02
**Success Criteria** (what must be TRUE):
  1. System detects when KPI crosses into red zone during CSV upload
  2. System creates notification record when threshold breached
  3. Notification bell icon in header shows unread count badge
  4. User can click bell to view notification panel with alert list
  5. User can mark individual notifications as read
  6. System deduplicates notifications within 24-hour window
**Plans**: TBD

Plans:
- [ ] 15-01: ThresholdService with breach detection logic
- [ ] 15-02: NotificationBell component and notification panel UI

### Phase 16: Email Notifications & Preferences
**Goal**: Users receive email alerts when critical thresholds breached
**Depends on**: Phase 15 (threshold detection must exist)
**Requirements**: NOTIF-06, NOTIF-07, INFRA-03
**Success Criteria** (what must be TRUE):
  1. User receives email when any KPI hits red zone
  2. Email includes KPI name, value, threshold, and dashboard link
  3. User can enable/disable email notifications per KPI via settings
  4. Email delivery retries up to 3 times on failure
  5. Failed email deliveries logged for monitoring
**Plans**: TBD

Plans:
- [ ] 16-01: EmailService with nodemailer and SMTP configuration
- [ ] 16-02: Notification preferences UI and retry queue

## Progress

**Execution Order:**
v1.0: 1 -> 2 -> 3 -> 4/5 parallel
v1.1: 6 -> 7 (depends on 6), 8 (depends on 6), 9 (depends on 6+7)
v1.2: 10 -> 11 (depends on 10) -> 12 (depends on 10+11)
v1.3: 13 -> 14 (depends on 13) -> 15 (depends on 13) -> 16 (depends on 15)

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
| 12. Dashboard UI | v1.2 | 2/2 | Complete | 2026-01-28 |
| 13. Historical KPI Storage | v1.3 | 0/1 | Not started | - |
| 14. Trend Charts | v1.3 | 0/2 | Not started | - |
| 15. Threshold Detection & In-App Notifications | v1.3 | 0/2 | Not started | - |
| 16. Email Notifications & Preferences | v1.3 | 0/2 | Not started | - |
