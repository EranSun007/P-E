# Feature Landscape: Jira Board Sync Extension

**Domain:** Browser extension for Jira board data synchronization
**Researched:** 2026-01-21
**Confidence:** MEDIUM (based on browser extension patterns, Jira data models, and existing GitHub integration in codebase)

## Executive Summary

Jira sync tools fall into three tiers: **API-based integrations** (not applicable here), **browser extensions with DOM scraping** (this project's approach), and **manual export tools**. Since API access isn't available, this extension must capture data from the Jira UI while authenticated users browse.

**Key insight:** For DOM-scraping extensions, the feature set is constrained by what's visible in the UI and extractable reliably. Focus on **high-value, stable data** (issue keys, titles, assignees, status) over **volatile UI elements** (board layouts, custom fields).

## Table Stakes

Features users expect. Missing these = extension feels incomplete.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| **Issue Key Extraction** | Fundamental identifier for linking Jira↔P&E | Low | Extract from DOM: `[data-issue-key]` or issue link URLs |
| **Issue Title/Summary** | Basic info for understanding what issue is about | Low | Text content from title elements |
| **Issue Status** | Critical for workload tracking (In Progress vs Done) | Low | Status badges/labels visible in board columns |
| **Assignee Extraction** | Core requirement for team workload view | Medium | Avatar elements, user IDs from data attributes |
| **Sprint Board Data** | Active sprint issues are the primary use case | Medium | Scrape issues from sprint board columns |
| **Backlog Items** | Need to see upcoming work for planning | Medium | Separate view from sprint board, similar scraping |
| **Issue Type** | Distinguish stories/bugs/tasks/epics | Low | Icon + data attributes |
| **Story Points** | Standard Jira metric for capacity planning | Low | Visible in card footer or estimates |
| **Priority** | Helps with workload assessment | Low | Priority badge/icon |
| **Manual Sync Trigger** | User control over when to capture/push data | Low | Browser action button or context menu |
| **Sync Status Indicator** | Show when last sync happened, if successful | Low | Badge on extension icon, popup UI |
| **Backend API Integration** | Push captured data to P&E Manager | Medium | POST to `/api/jira-issues` following GitHub pattern |
| **Error Handling** | Show when scraping fails or API unavailable | Medium | Toast notifications, error states in popup |
| **Team Member Mapping** | Link Jira assignees to P&E team members | High | Fuzzy matching by name/email, manual overrides |

## Differentiators

Features that set this extension apart. Not expected, but valued.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| **Automatic Background Sync** | Updates data while user browses Jira (no manual clicks) | Medium | Content script polls DOM periodically, debounced |
| **Delta Sync** | Only push changed issues, not full board every time | Medium | Track last-seen state in extension storage |
| **Multi-View Support** | Capture from board view, backlog view, issue detail view | High | Different DOM structures per view type |
| **Epic Hierarchy** | Show parent epic relationships in P&E workload view | Medium | Extract epic link from issue details |
| **Sprint Timeline** | Track sprint start/end dates for burn-down context | Low | Scrape sprint header metadata |
| **Offline Queue** | Queue sync requests when backend unavailable | Medium | IndexedDB queue with retry logic |
| **Conflict Detection** | Warn if Jira data changed since last sync | High | Compare timestamps, show diff in UI |
| **Custom Field Mapping** | Let user map Jira custom fields to P&E attributes | High | Config UI + flexible scraping logic |
| **Bulk Issue Details** | Fetch full details for each issue (not just board view) | High | Navigate to each issue URL, scrape detail page |
| **Workload Visualization** | Show team capacity chart in extension popup | Medium | Reuse P&E's existing chart components |
| **Filter by Sprint** | Let user choose which sprint to sync | Low | Dropdown in extension popup |
| **Export to CSV** | Fallback if backend unavailable | Low | Generate CSV from scraped data |

## Anti-Features

Features to explicitly NOT build. Common mistakes in this domain.

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| **Jira API Integration** | No API access available (technical constraint) | Stick to DOM scraping |
| **Write-Back to Jira** | Creates data consistency issues, out of scope | Read-only sync (stated in PROJECT.md) |
| **Real-Time Webhooks** | Extension can't receive server-push events | Polling while browser is open |
| **Support All Jira Instances** | Maintenance nightmare, each has custom fields/layouts | Hard-code for `jira.tools.sap rapidView=33598` |
| **Deep Custom Field Scraping** | Fragile, breaks with Jira UI changes | Focus on standard fields (assignee, status, points) |
| **Bi-Directional Sync** | Complexity explosion, unclear source of truth | Jira is master, P&E is read replica |
| **Full Issue History** | Too much data, scraping comments/changelog is fragile | Current state only |
| **Attachment Sync** | Large binary data, storage concerns | Link to Jira issue instead |
| **Advanced JQL Queries** | Can't execute JQL without API | Scrape what's visible in board |
| **Multi-Board Support** | User specified single board in PROJECT.md | Single board (rapidView=33598) only |

## Feature Dependencies

```
Issue Key Extraction
  ↓
Issue Basic Info (title, status, type)
  ↓
Assignee Extraction
  ↓
Team Member Mapping
  ↓
Workload View in P&E

Sprint Board Data
  ↓
Backlog Data
  ↓
Multi-View Support

Manual Sync Trigger
  ↓
Backend API Integration
  ↓
Sync Status Indicator

Automatic Background Sync (optional enhancement)
  ↓
Delta Sync (optimization)
```

## MVP Recommendation

For MVP (Milestone 1), prioritize core sync loop:

### Must Have (MVP)
1. **Issue Key Extraction** - Foundation for everything
2. **Issue Basic Info** - Title, status, type, priority
3. **Assignee Extraction** - Core use case is team workload
4. **Story Points** - Capacity planning metric
5. **Sprint Board Data** - Active sprint is primary view
6. **Manual Sync Trigger** - User-initiated sync
7. **Backend API Integration** - POST to `/api/jira-issues`
8. **Sync Status Indicator** - Basic success/failure feedback
9. **Team Member Mapping** - Link Jira users to P&E team members
10. **Error Handling** - Show scraping/API errors

### Nice to Have (Post-MVP)
- **Automatic Background Sync** - Improves UX but adds complexity
- **Backlog Items** - Secondary to active sprint
- **Delta Sync** - Optimization, not critical for MVP
- **Epic Hierarchy** - Useful but not blocking
- **Workload Visualization** - Can use P&E's main app initially

### Defer to Future
- **Multi-View Support** - Focus on sprint board first
- **Bulk Issue Details** - Too slow for initial sync
- **Custom Field Mapping** - Adds config complexity
- **Offline Queue** - Edge case, handle later
- **Export to CSV** - Fallback, low priority

## DOM Scraping Stability Considerations

**High Stability (safe to scrape):**
- Issue keys (data attributes: `data-issue-key`, `data-issue-id`)
- Issue links (href patterns: `/browse/ISSUE-123`)
- Assignee avatars (data attributes: `data-account-id`, `aria-label`)
- Status columns (board column headers, issue status badges)

**Medium Stability (may change):**
- Story points (text parsing from card footer)
- Priority icons (CSS classes, icon names)
- Issue type icons (CSS classes)
- Sprint metadata (header text)

**Low Stability (fragile):**
- Custom fields (vary by Jira config)
- Board layout (Jira UI updates)
- Tooltips (dynamic content)
- Comments/descriptions (rich text)

**Recommendation:** Focus MVP on high-stability elements. Add medium-stability features with defensive parsing and fallbacks. Avoid low-stability elements.

## Integration with Existing P&E Manager

**Follow GitHub Integration Pattern:**
```javascript
// server/services/GitHubService.js
class GitHubService {
  async syncRepos(userId) { /* ... */ }
  async syncPullRequests(userId, repoId) { /* ... */ }
}
```

**Apply to Jira:**
```javascript
// server/services/JiraService.js
class JiraService {
  async syncIssues(userId, issuesData) { /* ... */ }
  async linkIssueToTeamMember(userId, issueId, teamMemberId) { /* ... */ }
  async getTeamWorkload(userId) { /* ... */ }
}
```

**Database Schema Pattern:**
```sql
-- Follow existing tables pattern (UUID, user_id, timestamps)
CREATE TABLE jira_issues (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id TEXT NOT NULL,
  issue_key TEXT NOT NULL,
  summary TEXT,
  status TEXT,
  assignee_name TEXT,
  assignee_id TEXT,
  story_points INTEGER,
  priority TEXT,
  issue_type TEXT,
  sprint_name TEXT,
  epic_key TEXT,
  jira_url TEXT,
  synced_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, issue_key)
);

CREATE TABLE jira_team_mappings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id TEXT NOT NULL,
  jira_assignee_id TEXT NOT NULL,
  team_member_id UUID REFERENCES team_members(id) ON DELETE CASCADE,
  created_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, jira_assignee_id)
);
```

## Browser Extension Architecture

**Manifest V3 Structure:**
```json
{
  "manifest_version": 3,
  "name": "P&E Manager Jira Sync",
  "permissions": ["storage", "activeTab"],
  "host_permissions": ["https://jira.tools.sap/*"],
  "content_scripts": [{
    "matches": ["https://jira.tools.sap/secure/RapidBoard.jspa*"],
    "js": ["content-script.js"]
  }],
  "background": {
    "service_worker": "background.js"
  },
  "action": {
    "default_popup": "popup.html"
  }
}
```

**Component Responsibilities:**
- **content-script.js** - DOM scraping, extract issue data
- **background.js** - Coordinate sync, store state, API calls
- **popup.html** - User controls (manual sync, settings, status)

## Complexity Assessment

| Feature Category | Complexity | Rationale |
|-----------------|------------|-----------|
| Basic Issue Scraping | Low | Straightforward DOM queries |
| Assignee Extraction | Medium | Multiple data sources, fuzzy matching needed |
| Team Member Mapping | High | UI for manual overrides, conflict resolution |
| Automatic Background Sync | Medium | Polling logic, debouncing, resource management |
| Delta Sync | Medium | State tracking, diff computation |
| Multi-View Support | High | Different DOM structures per view, navigation |
| Bulk Issue Details | High | Sequential page loads, slow, rate limiting |
| Custom Field Mapping | High | Dynamic config, flexible scraping, validation |

## Security & Privacy Considerations

**Extension Permissions:**
- `storage` - Store last sync state, user mappings
- `activeTab` - Access current Jira tab content
- `host_permissions` - Inject content script into jira.tools.sap

**Data Handling:**
- Scrape only what's visible to authenticated user (no privilege escalation)
- Send to P&E Manager backend via HTTPS
- Store P&E Manager URL + user token in extension storage (encrypted)
- No third-party analytics or tracking

**Failure Modes:**
- Jira UI changes → Scraping fails → Show error, don't crash
- Backend unavailable → Queue sync or show error
- Invalid data → Validate before sending to backend

## Sources

**Confidence Assessment:**

This research is based on:
- **HIGH confidence:** Existing P&E Manager architecture (GitHub integration pattern, database schema, API conventions) - verified from codebase
- **MEDIUM confidence:** Browser extension patterns (Manifest V3, content scripts, DOM scraping) - standard practices as of my training
- **MEDIUM confidence:** Jira data model (issue keys, sprints, assignees, story points) - common across Jira instances
- **LOW confidence:** Specific jira.tools.sap DOM structure - not verified, will require inspection during implementation

**Verification needed during implementation:**
- Jira board DOM structure for rapidView=33598
- Available data attributes on issue cards
- Sprint metadata location
- Assignee data format
- Custom field presence/structure

**Note:** WebSearch tool was unavailable during research. Findings rely on domain knowledge of browser extensions, Jira systems, and the existing P&E Manager codebase patterns. Recommend verifying DOM structure with browser DevTools against actual jira.tools.sap board before implementing scrapers.
