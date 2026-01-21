# Requirements: P&E Manager Jira Integration

**Generated:** 2026-01-21
**Status:** Draft
**Source:** User selections + research findings

---

## v1 Requirements (MVP)

### Extension Core (EXT)

- [ ] **EXT-01**: Chrome Extension with Manifest V3 structure
  - Service worker background script
  - Content scripts for jira.tools.sap domain
  - Popup UI for status and settings
  - Host permissions for https://jira.tools.sap/*

- [ ] **EXT-02**: Automatic background sync while browsing Jira
  - Content script detects Jira board pages
  - Polls DOM at configurable interval (default 30s)
  - Debounces rapid page changes
  - Service worker coordinates sync timing

- [ ] **EXT-03**: Sync status indicator in extension icon
  - Badge shows sync state (syncing, success, error, stale)
  - Last sync timestamp in popup
  - Error details accessible in popup

- [ ] **EXT-04**: DOM scraping for sprint board view
  - Extract issues from board columns
  - Capture column/status mapping
  - Handle dynamic content loading (MutationObserver)

- [ ] **EXT-05**: DOM scraping for backlog view
  - Extract backlog items with ranking
  - Capture sprint assignment
  - Handle pagination/lazy loading

- [ ] **EXT-06**: DOM scraping for issue detail pages
  - Extract full issue metadata
  - Capture epic links
  - Fallback data source when board scraping incomplete

- [ ] **EXT-07**: Core issue data extraction
  - Issue key (e.g., PROJ-123)
  - Summary/title
  - Status
  - Assignee (name and ID)
  - Story points
  - Priority
  - Issue type (story, bug, task, epic)
  - Epic link/parent

- [ ] **EXT-08**: Extension storage management
  - Store P&E Manager backend URL
  - Store authentication token (encrypted)
  - Cache last sync state for delta detection
  - Persist across service worker restarts

- [ ] **EXT-09**: Backend API communication
  - POST scraped data to P&E Manager backend
  - Handle authentication (JWT token)
  - Retry logic for failed requests
  - Offline queue when backend unavailable

### Backend API (API)

- [ ] **API-01**: Jira issues sync endpoint
  - POST /api/jira-issues/sync
  - Accept batch of issues from extension
  - Validate payload structure
  - Return sync result with counts

- [ ] **API-02**: Jira issues CRUD endpoints
  - GET /api/jira-issues - List synced issues
  - GET /api/jira-issues/:id - Get single issue
  - DELETE /api/jira-issues/:id - Remove issue
  - (No PUT - issues are read-only from Jira)

- [ ] **API-03**: Team member mapping endpoints
  - GET /api/jira-mappings - List Jira→team member mappings
  - POST /api/jira-mappings - Create/update mapping
  - DELETE /api/jira-mappings/:id - Remove mapping

- [ ] **API-04**: JiraService following GitHubService pattern
  - syncIssues(userId, issuesData) - Upsert batch
  - getIssues(userId, filters) - Query with filtering
  - getTeamWorkload(userId) - Aggregate by assignee
  - linkToTeamMember(userId, jiraAssigneeId, teamMemberId)

- [ ] **API-05**: Authentication for extension requests
  - Reuse existing JWT middleware
  - Token validation for extension API calls
  - User ID extraction for multi-tenancy

### Database (DB)

- [ ] **DB-01**: jira_issues table
  - UUID primary key
  - user_id for multi-tenancy
  - issue_key (unique per user)
  - summary, status, assignee_name, assignee_id
  - story_points, priority, issue_type
  - sprint_name, epic_key, jira_url
  - synced_at timestamp
  - Indexes on user_id, status, assignee_id

- [ ] **DB-02**: jira_team_mappings table
  - UUID primary key
  - user_id for multi-tenancy
  - jira_assignee_id (unique per user)
  - team_member_id (FK to team_members)
  - Auto-timestamps

- [ ] **DB-03**: Migration file following conventions
  - Version-tracked migration (017_jira_integration.sql)
  - Idempotent execution
  - Proper indexes and constraints

### Frontend Integration (UI)

- [ ] **UI-01**: Jira Issues page in P&E Manager
  - List view of synced issues
  - Filter by status, assignee, sprint
  - Sort by priority, points, updated
  - Link to Jira (open in new tab)

- [ ] **UI-02**: Team workload view
  - Issues grouped by assignee
  - Story points sum per person
  - Status distribution per person
  - Visual capacity indicator

- [ ] **UI-03**: Link Jira assignees to team members
  - Auto-suggest based on name matching
  - Manual override capability
  - Unlinked assignees highlighted
  - Bulk linking interface

- [ ] **UI-04**: Extension settings management
  - Configure P&E Manager backend URL
  - Manage authentication token
  - View sync history/status
  - Manual sync trigger (backup option)

- [ ] **UI-05**: Sync status in P&E Manager
  - Last sync timestamp display
  - Sync health indicator
  - Data freshness warning (if stale)

---

## v2 Requirements (Post-MVP)

### Deferred Features

- [ ] **v2-01**: Delta sync optimization
  - Track last-seen state per issue
  - Only push changed issues
  - Reduces API payload size
  - *Rationale: Optimization, not blocking for MVP*

- [ ] **v2-02**: Offline queue with IndexedDB
  - Queue syncs when backend unavailable
  - Auto-retry when connection restored
  - Conflict detection
  - *Rationale: Edge case, basic error handling sufficient for MVP*

- [ ] **v2-03**: Sprint timeline tracking
  - Sprint start/end dates
  - Sprint velocity calculation
  - Burn-down chart data
  - *Rationale: Nice-to-have, not core workload view*

- [ ] **v2-04**: Custom field mapping
  - User-defined field extraction
  - Config UI for selector mapping
  - *Rationale: High complexity, standard fields sufficient for MVP*

- [ ] **v2-05**: Workload visualization in extension popup
  - Mini chart of team capacity
  - Quick glance without opening P&E Manager
  - *Rationale: UI polish, can use main app initially*

- [ ] **v2-06**: Export to CSV fallback
  - Download synced data as CSV
  - Useful if backend unavailable
  - *Rationale: Fallback feature, low priority*

---

## Out of Scope

| Feature | Reason |
|---------|--------|
| Direct Jira API integration | No API access available (technical constraint) |
| Write-back to Jira | Read-only sync per PROJECT.md |
| Real-time webhooks | Extension cannot receive server-push |
| Multiple Jira instances | Only jira.tools.sap rapidView=33598 |
| Full issue history/changelog | Too fragile to scrape, current state only |
| Attachment sync | Binary data, storage concerns |
| Comments sync | Rich text scraping unreliable |
| JQL query execution | Requires API access |
| Multi-board support | Single board scope per PROJECT.md |

---

## Traceability

| REQ-ID | Phase | Tasks | Status |
|--------|-------|-------|--------|
| EXT-01 | — | — | Pending |
| EXT-02 | — | — | Pending |
| EXT-03 | — | — | Pending |
| EXT-04 | — | — | Pending |
| EXT-05 | — | — | Pending |
| EXT-06 | — | — | Pending |
| EXT-07 | — | — | Pending |
| EXT-08 | — | — | Pending |
| EXT-09 | — | — | Pending |
| API-01 | — | — | Pending |
| API-02 | — | — | Pending |
| API-03 | — | — | Pending |
| API-04 | — | — | Pending |
| API-05 | — | — | Pending |
| DB-01 | — | — | Pending |
| DB-02 | — | — | Pending |
| DB-03 | — | — | Pending |
| UI-01 | — | — | Pending |
| UI-02 | — | — | Pending |
| UI-03 | — | — | Pending |
| UI-04 | — | — | Pending |
| UI-05 | — | — | Pending |

*Traceability table updated by roadmap generator*

---

## Acceptance Criteria Summary

**Extension works when:**
1. User installs extension from unpacked source
2. Extension activates on jira.tools.sap board page
3. Issues appear in P&E Manager within 60 seconds
4. Sync status shows in extension icon

**Backend works when:**
1. Extension can authenticate with JWT
2. Issues persist in PostgreSQL
3. Data isolated by user_id
4. API returns synced issues

**Frontend works when:**
1. Jira Issues page shows synced data
2. Team workload aggregates correctly
3. Assignees linkable to team members
4. Sync status visible

---

*Requirements generated from user selections and research findings*
