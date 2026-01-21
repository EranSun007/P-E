# Roadmap: P&E Manager Jira Integration

## v1.0 Jira Integration MVP

## Overview

This roadmap delivers a browser extension that captures Jira board data from the browser DOM and syncs it to P&E Manager's PostgreSQL backend. The backend-first approach enables testing with curl before tackling extension complexity. Phases 1-3 build the critical path (backend -> service worker -> content script), while Phases 4-5 can parallelize (extension UI and web app both depend on earlier phases but not each other).

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3, 4, 5): Planned milestone work
- Decimal phases (e.g., 2.1): Urgent insertions (marked with INSERTED)

- [ ] **Phase 1: Backend Foundation** - Database schema, JiraService, REST API endpoints
- [ ] **Phase 2: Extension Core** - Service worker, chrome.storage, backend API communication
- [ ] **Phase 3: Content Script** - DOM scraping for Jira board, backlog, and issue detail pages
- [ ] **Phase 4: Extension UI** - Popup interface and options page for configuration
- [ ] **Phase 5: Web App Integration** - Frontend components for viewing synced Jira data

## Phase Details

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
**Plans**: TBD

Plans:
- [ ] 01-01: Database schema and migration
- [ ] 01-02: JiraService implementation
- [ ] 01-03: REST API routes and authentication

### Phase 2: Extension Core
**Goal**: Extension can authenticate with backend, store data, and sync via service worker
**Depends on**: Phase 1 (backend must exist to receive syncs)
**Requirements**: EXT-01, EXT-08, EXT-09
**Success Criteria** (what must be TRUE):
  1. Extension installs in Chrome with Manifest V3 structure
  2. Service worker responds to messages from popup and content script
  3. Auth token persists in chrome.storage.local across browser restarts
  4. Service worker successfully POSTs test data to backend /api/jira-issues/sync
  5. Sync status (success/error/timestamp) stored and retrievable
**Plans**: TBD

Plans:
- [ ] 02-01: Extension manifest and service worker scaffold
- [ ] 02-02: Storage management and backend API client

### Phase 3: Content Script
**Goal**: Extension extracts Jira issue data from DOM while user browses Jira
**Depends on**: Phase 2 (service worker must handle extracted data)
**Requirements**: EXT-02, EXT-04, EXT-05, EXT-06, EXT-07
**Success Criteria** (what must be TRUE):
  1. Content script activates on jira.tools.sap board pages
  2. Sprint board view extracts issues with key, summary, status, assignee, points
  3. Backlog view extracts items with sprint assignment and ranking
  4. Issue detail pages provide fallback data extraction
  5. Extracted data automatically syncs to backend within 60 seconds
**Plans**: TBD

Plans:
- [ ] 03-01: DOM scraping for sprint board view
- [ ] 03-02: DOM scraping for backlog and issue details

### Phase 4: Extension UI
**Goal**: User can configure extension, view sync status, and trigger manual syncs
**Depends on**: Phase 2 (service worker provides data and handles actions)
**Requirements**: EXT-03, UI-04
**Success Criteria** (what must be TRUE):
  1. Popup displays current sync status (syncing, success, error, stale)
  2. Popup shows last sync timestamp
  3. User can trigger manual sync from popup
  4. Options page allows configuring backend URL and auth token
  5. Extension icon badge shows sync state at a glance
**Plans**: TBD

Plans:
- [ ] 04-01: Popup UI and status display
- [ ] 04-02: Options page for configuration

### Phase 5: Web App Integration
**Goal**: Users can view and manage synced Jira data in P&E Manager web app
**Depends on**: Phase 1 (backend API must exist; independent of extension UI)
**Requirements**: UI-01, UI-02, UI-03, UI-05
**Success Criteria** (what must be TRUE):
  1. Jira Issues page lists all synced issues with filtering (status, assignee, sprint)
  2. Team workload view shows issues grouped by assignee with point totals
  3. Users can link Jira assignees to existing team members
  4. Sync status indicator shows data freshness in web app
  5. Clicking an issue opens it in Jira (new tab)
**Plans**: TBD

Plans:
- [ ] 05-01: JiraIssues page and API client
- [ ] 05-02: Team workload view and assignee mapping

## Parallelization Notes

**Sequential dependencies (cannot parallelize):**
- Phase 2 depends on Phase 1 (backend must exist)
- Phase 3 depends on Phase 2 (service worker must receive messages)

**Can parallelize:**
- Phase 4 + Phase 5 (both depend on Phase 2/1, but not each other)

After completing Phase 3, begin Phase 4 and Phase 5 in parallel if desired.

## Progress

**Execution Order:**
Phases 1 -> 2 -> 3 -> (4 | 5 in parallel)

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Backend Foundation | 0/3 | Not started | - |
| 2. Extension Core | 0/2 | Not started | - |
| 3. Content Script | 0/2 | Not started | - |
| 4. Extension UI | 0/2 | Not started | - |
| 5. Web App Integration | 0/2 | Not started | - |

## Requirement Coverage

| REQ-ID | Phase | Description |
|--------|-------|-------------|
| DB-01 | 1 | jira_issues table |
| DB-02 | 1 | jira_team_mappings table |
| DB-03 | 1 | Migration file |
| API-01 | 1 | Sync endpoint |
| API-02 | 1 | CRUD endpoints |
| API-03 | 1 | Team member mapping endpoints |
| API-04 | 1 | JiraService implementation |
| API-05 | 1 | Authentication for extension |
| EXT-01 | 2 | Manifest V3 structure |
| EXT-08 | 2 | Extension storage management |
| EXT-09 | 2 | Backend API communication |
| EXT-02 | 3 | Automatic background sync |
| EXT-04 | 3 | DOM scraping for sprint board |
| EXT-05 | 3 | DOM scraping for backlog |
| EXT-06 | 3 | DOM scraping for issue details |
| EXT-07 | 3 | Core issue data extraction |
| EXT-03 | 4 | Sync status indicator |
| UI-04 | 4 | Extension settings management |
| UI-01 | 5 | Jira Issues page |
| UI-02 | 5 | Team workload view |
| UI-03 | 5 | Link Jira assignees to team members |
| UI-05 | 5 | Sync status in web app |

**Coverage:** 22/22 v1 requirements mapped
