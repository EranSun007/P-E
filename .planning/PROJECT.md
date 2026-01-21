# P&E Manager - Jira Integration

## What This Is

A browser extension and backend integration that syncs Jira board data (sprint backlog, issue details, team workload) into P&E Manager. Since direct Jira API access isn't available, the extension captures data from the Jira UI while browsing and pushes it to P&E Manager's backend.

## Core Value

See team's Jira workload alongside existing P&E Manager data (tasks, GitHub, calendar) without switching contexts or manually copying information.

## Requirements

### Validated

- ✓ Full-stack React/Express/PostgreSQL application — existing
- ✓ GitHub integration with token-based sync — existing
- ✓ Team member management — existing
- ✓ Task tracking with status workflow — existing
- ✓ AI chat assistant with tool calling — existing

### Active

- [ ] Browser extension that captures Jira board data
- [ ] Backend API endpoints to receive extension data
- [ ] Database schema for Jira issues, sprints, assignees
- [ ] Sprint board view in P&E Manager frontend
- [ ] Issue status tracking with sync status indicators
- [ ] Team workload view (who's assigned to what)
- [ ] Link Jira issues to existing team members

### Out of Scope

- Direct Jira API integration — no API access available
- Creating/editing Jira issues from P&E Manager — read-only sync
- Real-time webhooks — extension polls while browser is open
- Other Jira instances — only jira.tools.sap rapidView=33598

## Context

**Existing Integration Pattern:**
The GitHub integration (`server/services/GitHubService.js`) provides a template:
- User stores token in settings
- Background sync fetches data
- Dedicated tables store synced data
- Frontend displays alongside other P&E data

**Jira Board:**
- URL: https://jira.tools.sap/secure/RapidBoard.jspa?rapidView=33598
- Scope: Whole board (all team members)
- Views: Sprint board, backlog, issue details

**Technical Constraint:**
No Jira Personal Access Token or OAuth available, so traditional API integration isn't possible. Browser extension workaround captures DOM data from authenticated Jira sessions.

## Constraints

- **No Jira API**: Extension must scrape/capture from browser DOM
- **Same-origin policy**: Extension needs content script permissions for jira.tools.sap
- **Sync freshness**: Data only updates when user has Jira open in browser
- **SAP BTP deployment**: Backend changes deploy via cf push

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Browser extension approach | No API access, extension can access authenticated Jira session | — Pending |
| Background polling | User wants automatic sync while browsing, not manual clicks | — Pending |
| Whole board scope | Team workload requires all issues, not just personal | — Pending |
| Follow GitHub integration pattern | Proven architecture in existing codebase | — Pending |

---
*Last updated: 2026-01-21 after initialization*
