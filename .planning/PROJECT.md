# P&E Manager

## What This Is

A unified people and engineering management system combining team management, web capture framework, and DevOps metrics. Features include a bug KPI dashboard that analyzes JIRA bug exports to track team DevOps duty performance with SLA compliance, resolution times, and backlog health.

## Core Value

Single dashboard showing health and status across all team tools without switching contexts, with full control over what gets captured and how it connects to your data.

## Current Milestone: v1.6 TeamSync Integration

**Goal:** Integrate TeamSync functionality into existing P-E entities, providing a team sync dashboard with Kanban/Gantt views for tracking goals, blockers, dependencies, and emphasis items across teams.

**Target features:**
- Extend projects table for sync items (category, sync_status, status_history audit trail)
- Extend tasks table for subtasks linked to sync items
- Team filtering by department (Metering, Reporting, Both)
- Kanban view grouped by category (goals, blockers, dependencies, emphasis)
- Gantt view using existing release cycle/sprint system
- Archive/restore workflow with full change tracking
- Subtask management per sync item
- Integration with existing team_members for assignment
- Sync settings for sprint configuration

**Architecture approach:** Extend existing entities rather than parallel tables:
- TeamSync Items → `projects` with `is_sync_item=true`
- TeamSync Subtasks → `tasks` with `is_subtask=true` and `project_id` FK
- TeamSync Teams → `team_members.department` filtering
- TeamSync Sprints → existing `releaseCycles.js` utilities

## Parallel Milestone: v1.5 Knowledge Base Integration (separate branch)

**Goal:** Integrate with the deployed MCP Knowledge Base server and build a Team Status page.
**Status:** In progress on `main` branch (Phases 19-22)

## Current State (v1.4 Shipped)

**Shipped:** 2026-01-28
**Milestones:** v1.0 (Jira Integration), v1.1 (Web Capture Framework), v1.2 (DevOps Bug Dashboard), v1.3 (KPI Insights & Alerts), v1.4 (Bug Dashboard Fixes & Enhancements)

**Tech Stack:**
- Frontend: React 18 + Vite + Tailwind CSS + Radix UI + Recharts
- Backend: Express.js + PostgreSQL
- Browser Extension: Manifest V3 + chrome.storage
- Deployment: SAP BTP Cloud Foundry

## Requirements

### Validated

- ✓ Full-stack React/Express/PostgreSQL application — existing
- ✓ GitHub integration with token-based sync — existing
- ✓ Team member management — existing
- ✓ Task tracking with status workflow — existing
- ✓ AI chat assistant with tool calling — existing
- ✓ Browser extension capturing Jira board data — v1.0
- ✓ Backend API receiving extension data — v1.0
- ✓ Database schema for Jira issues — v1.0
- ✓ Jira issues page with filtering — v1.0
- ✓ Team workload view — v1.0
- ✓ Jira assignee to team member mapping — v1.0
- ✓ Configurable capture rules via UI — v1.1
- ✓ Multi-site extension support (Grafana, Jenkins, Concourse, Dynatrace) — v1.1
- ✓ Data staging/inbox with review workflow — v1.1
- ✓ Flexible entity mapping system — v1.1
- ✓ Rule builder UI with preset templates — v1.1
- ✓ CSV upload for JIRA bug exports — v1.2
- ✓ Bug database schema (bug_uploads, bugs, weekly_kpis tables) — v1.2
- ✓ 9 KPI calculations (inflow, TTFR, MTTR, SLA, backlog health, etc.) — v1.2
- ✓ Bug dashboard page with KPI cards and status indicators — v1.2
- ✓ Filtering by component and week — v1.2
- ✓ Critical alerts when KPIs breach thresholds — v1.2
- ✓ Aging bugs table with JIRA links — v1.2
- ✓ Charts for MTTR by priority and category distribution — v1.2
- ✓ Component extraction and filtering fix — v1.4
- ✓ Table sorting with age indicators — v1.4
- ✓ Weekly inflow trend charts — v1.4
- ✓ Historical KPI trends and threshold notifications — v1.3
- ✓ Email notifications for KPI breaches — v1.3

### Active (v1.6 TeamSync Integration)

- [ ] Database schema extensions for sync items and subtasks
- [ ] Backend sync items service (CRUD, archive, restore, status tracking)
- [ ] Backend subtask service (CRUD, reorder, completion tracking)
- [ ] Sync settings service for user preferences
- [ ] REST API routes for sync operations
- [ ] Frontend API client for sync items
- [ ] SyncContext for state management
- [ ] TeamSync page with team department tabs
- [ ] Kanban view grouped by category
- [ ] Gantt view with sprint timeline
- [ ] Sync item card with status, assignee, subtask count
- [ ] Sync item modal for create/edit with team member assignment
- [ ] Status history timeline display
- [ ] Archive modal with date filtering
- [ ] Subtask list component with drag reorder
- [ ] Sync settings UI for sprint configuration

### Active (v1.5 - parallel on main branch)

- [ ] MCP client service with session management and JSON-RPC 2.0 protocol
- [ ] Integration with Knowledge Base MCP server
- [ ] Knowledge search UI with code highlighting and filters
- [ ] Team Status page with daily summaries

### Out of Scope

- Direct JIRA API integration — CSV export is the data source
- Real-time bug updates — weekly CSV upload workflow
- Bug modification/write-back — read-only analytics
- Custom KPI definitions — fixed set of 9 KPIs
- Historical data import — starts fresh with new uploads
- Custom MCP server deployment — using existing deployed server
- Direct database access to knowledge base — MCP protocol only
- Data migration from standalone TeamSync — fresh start, no legacy data
- Separate sync_items/subtasks tables — reuse projects/tasks with flags
- Real-time collaborative editing — single-user updates

## Context

**DevOps Duty Context:**
Team rotates weekly DevOps duty. Each week the duty person exports bugs from JIRA and uploads CSV. Dashboard shows health of bug handling process across the team.

**KPI Targets (from specification):**
- Bug Inflow Rate: ≤6 bugs/week
- Time to First Response: <24h for Very High, <48h median overall
- MTTR: Very High <72h, High <168h, Medium <336h
- SLA Compliance: 80% VH resolved <24h, 70% High <48h
- Backlog Health Score: 100 - (VH×10) - (High×5)

**Component Extraction:**
Bugs categorized by labels/summary into: deploy-metering, service-broker, foss-vulnerabilities, cm-metering, sdm-metering, other

**Knowledge Base MCP Server:**
Deployed MCP server at `https://knowledge-base-mcp-server.cfapps.eu01-canary.hana.ondemand.com` provides semantic search over ~19,000 indexed chunks from 27 SAP repositories. Daily summaries are stored via `store_insight` tool by reporting-hub. Two teams: Metering and Reporting, with separate status views.

**MCP Protocol Details:**
- JSON-RPC 2.0 over HTTP/SSE
- Session management via `Mcp-Session-Id` header
- 4 tools: consult_code_base, consult_documentation, store_insight, get_repository_stats

## Constraints

- **CSV format**: JIRA export columns (Key, Summary, Priority, Status, Created, Resolved, Reporter, Assignee, Labels)
- **Week-ending date**: User must specify Saturday date for each upload
- **SAP BTP deployment**: Backend deploys via cf push
- **No API access**: Cannot fetch bugs directly from JIRA
- **Single upload per week**: Duplicate detection, replace option available

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Browser extension approach | No API access, extension can access authenticated sessions | ✓ Good (v1.0) |
| Follow GitHub integration pattern | Proven architecture in existing codebase | ✓ Good (v1.0) |
| Configurable extractors via UI | Don't rebuild extension for each new site | ✓ Good (v1.1) |
| Data staging workflow | Quality control before data enters main system | ✓ Good (v1.1) |
| Generic entity mapping | Flexible connections, not hardcoded per source | ✓ Good (v1.1) |
| Rule-based extraction | Selectors defined in config, not code | ✓ Good (v1.1) |
| CSV upload for bugs | JIRA API not available, CSV export is standard workflow | ✓ Good (v1.2) |
| Pre-calculated KPIs | Performance optimization, avoid recalculating on page load | ✓ Good (v1.2) |
| 3-table schema | bug_uploads (meta), bugs (data), weekly_kpis (calculated) | ✓ Good (v1.2) |
| fast-csv for parsing | Streaming CSV parsing efficient for large files | ✓ Good (v1.2) |
| XMLHttpRequest for uploads | fetch lacks progress events needed for upload UI | ✓ Good (v1.2) |

**TeamSync Integration Context:**
- Categories: goals, blockers, dependencies, emphasis (4 fixed categories)
- Sync statuses: new, in_progress, resolved, blocked (maps to standard project statuses)
- Team departments: Metering, Reporting, Both (filter via team_members.department)
- Sprints: Use existing releaseCycles.js utilities, not new tables
- Status history: JSONB audit trail tracking all field changes
- Auto-archive: Items automatically archive when status changes to "resolved"

---
*Last updated: 2026-01-29 after v1.6 milestone started (feature/v1.6 branch)*
