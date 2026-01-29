# P&E Manager

## What This Is

A unified people and engineering management system combining team management, web capture framework, DevOps metrics, knowledge base search, and team synchronization. Features include a bug KPI dashboard, semantic code/doc search via MCP, team status page with health indicators, and a Kanban board for tracking team goals, blockers, dependencies, and emphasis items.

## Core Value

Single dashboard showing health and status across all team tools without switching contexts, with full control over what gets captured and how it connects to your data.

## Current Milestone: v1.8 Entity Model Viewer

**Goal:** Build a read-only visual schema viewer that displays current database structure as an interactive node graph for understanding entity relationships.

**Target features:**
- Schema introspection reading current PostgreSQL structure (tables, columns, types, constraints, FKs)
- Interactive node graph visualization (@xyflow/react)
- Click entity nodes to view field details
- Pan and zoom navigation
- Foreign key relationships as connecting edges

## Shipped State (v1.6)

**Last shipped:** 2026-01-29
**Milestones:** v1.0 (Jira Integration), v1.1 (Web Capture Framework), v1.2 (DevOps Bug Dashboard), v1.3 (KPI Insights & Alerts), v1.4 (Bug Dashboard Fixes), v1.5 (Knowledge Base Integration), v1.6 (TeamSync Integration), v1.7 (Menu Clustering)

**Tech Stack:**
- Frontend: React 18 + Vite + Tailwind CSS + Radix UI + Recharts + @dnd-kit
- Backend: Express.js + PostgreSQL
- Browser Extension: Manifest V3 + chrome.storage
- Deployment: SAP BTP Cloud Foundry

## Requirements

### Validated

**Pre-existing:**
- ✓ Full-stack React/Express/PostgreSQL application — existing
- ✓ GitHub integration with token-based sync — existing
- ✓ Team member management — existing
- ✓ Task tracking with status workflow — existing
- ✓ AI chat assistant with tool calling — existing

**v1.0 Jira Integration:**
- ✓ Browser extension capturing Jira board data — v1.0
- ✓ Backend API receiving extension data — v1.0
- ✓ Database schema for Jira issues — v1.0
- ✓ Jira issues page with filtering — v1.0
- ✓ Team workload view — v1.0
- ✓ Jira assignee to team member mapping — v1.0

**v1.1 Web Capture Framework:**
- ✓ Configurable capture rules via UI — v1.1
- ✓ Multi-site extension support (Grafana, Jenkins, Concourse, Dynatrace) — v1.1
- ✓ Data staging/inbox with review workflow — v1.1
- ✓ Flexible entity mapping system — v1.1
- ✓ Rule builder UI with preset templates — v1.1

**v1.2 DevOps Bug Dashboard:**
- ✓ CSV upload for JIRA bug exports — v1.2
- ✓ Bug database schema (bug_uploads, bugs, weekly_kpis tables) — v1.2
- ✓ 9 KPI calculations (inflow, TTFR, MTTR, SLA, backlog health, etc.) — v1.2
- ✓ Bug dashboard page with KPI cards and status indicators — v1.2
- ✓ Filtering by component and week — v1.2
- ✓ Critical alerts when KPIs breach thresholds — v1.2
- ✓ Aging bugs table with JIRA links — v1.2
- ✓ Charts for MTTR by priority and category distribution — v1.2

**v1.3 KPI Insights & Alerts:**
- ✓ Historical KPI trends and threshold notifications — v1.3
- ✓ Email notifications for KPI breaches — v1.3

**v1.4 Bug Dashboard Fixes:**
- ✓ Component extraction and filtering fix — v1.4
- ✓ Table sorting with age indicators — v1.4
- ✓ Weekly inflow trend charts — v1.4

**v1.5 Knowledge Base Integration:**
- ✓ MCP client service with session management and JSON-RPC 2.0 protocol — v1.5
- ✓ Semantic code and documentation search via MCP tools — v1.5
- ✓ Knowledge search UI with dual-pane results and syntax highlighting — v1.5
- ✓ AI chat /search command with inline results — v1.5
- ✓ Team Status page with health indicators — v1.5
- ✓ PostgreSQL team_summaries table for status data — v1.5

**v1.6 TeamSync Integration:**
- ✓ Database schema extensions for sync items and subtasks — v1.6
- ✓ Backend sync items service (CRUD, archive, restore, status tracking) — v1.6
- ✓ Backend subtask service (CRUD, reorder, completion tracking) — v1.6
- ✓ Sync settings service for user preferences — v1.6
- ✓ REST API routes for sync operations — v1.6
- ✓ Frontend API client and SyncContext for state management — v1.6
- ✓ TeamSync page with team department tabs — v1.6
- ✓ Kanban view grouped by category (Goals, Blockers, Dependencies, Emphasis) — v1.6
- ✓ Sync item card with status, assignee, subtask count — v1.6
- ✓ Sync item modal for create/edit with team member assignment — v1.6
- ✓ Archive modal with date filtering — v1.6
- ✓ Subtask list with drag-and-drop reordering — v1.6
- ✓ Auto-archive on status="Done" — v1.6

### Active

**v1.8 Entity Model Viewer:**
- [ ] Schema introspection API to read current PostgreSQL structure
- [ ] Interactive node graph visualization (@xyflow/react)
- [ ] Entity nodes with field lists visible
- [ ] Foreign key relationships as connecting edges
- [ ] Pan and zoom navigation
- [ ] Click entity to view details

### Future Candidates (v1.9+)

- Gantt view with sprint timeline
- Status history timeline display
- Sync settings UI for sprint configuration
- Multi-team comparison dashboard
- Search history and saved queries

### Out of Scope

- Direct JIRA API integration — CSV export is the data source
- Real-time bug updates — weekly CSV upload workflow
- Bug modification/write-back — read-only analytics
- Custom KPI definitions — fixed set of 9 KPIs
- Custom MCP server deployment — using existing deployed server
- Direct database access to knowledge base — MCP protocol only
- Data migration from standalone TeamSync — fresh start
- Separate sync_items/subtasks tables — reuse projects/tasks with flags
- Real-time collaborative editing — single-user updates
- Item drag between Kanban categories — edit via modal

## Context

**DevOps Duty Context:**
Team rotates weekly DevOps duty. Each week the duty person exports bugs from JIRA and uploads CSV. Dashboard shows health of bug handling process across the team.

**Knowledge Base MCP Server:**
Deployed MCP server at `https://knowledge-base-mcp-server.cfapps.eu01-canary.hana.ondemand.com` provides semantic search over ~19,000 indexed chunks from 27 SAP repositories. Two teams: Metering and Reporting, with separate status views.

**TeamSync Context:**
- Categories: goals, blockers, dependencies, emphasis (4 fixed categories)
- Sync statuses: new, in_progress, done, blocked
- Team departments: Metering, Reporting, Both
- Auto-archive: Items archive when status changes to "Done"

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Browser extension approach | No API access, extension can access authenticated sessions | ✓ Good (v1.0) |
| Follow GitHub integration pattern | Proven architecture in existing codebase | ✓ Good (v1.0) |
| Configurable extractors via UI | Don't rebuild extension for each new site | ✓ Good (v1.1) |
| Data staging workflow | Quality control before data enters main system | ✓ Good (v1.1) |
| CSV upload for bugs | JIRA API not available, CSV export is standard workflow | ✓ Good (v1.2) |
| Pre-calculated KPIs | Performance optimization, avoid recalculating on page load | ✓ Good (v1.2) |
| MCP protocol for knowledge base | Standard protocol, deployed server available | ✓ Good (v1.5) |
| PostgreSQL for team summaries | Structured data, fits existing stack | ✓ Good (v1.5) |
| Extend projects/tasks tables | Reuse existing entities with flags instead of new tables | ✓ Good (v1.6) |
| JSONB status_history | Full audit trail without separate history table | ✓ Good (v1.6) |
| @dnd-kit for drag-and-drop | Accessible, modern library with React hooks | ✓ Good (v1.6) |
| Optimistic updates with rollback | Better UX, handles failures gracefully | ✓ Good (v1.6) |

## Constraints

- **CSV format**: JIRA export columns (Key, Summary, Priority, Status, Created, Resolved, Reporter, Assignee, Labels)
- **Week-ending date**: User must specify Saturday date for each upload
- **SAP BTP deployment**: Backend deploys via cf push
- **No API access**: Cannot fetch bugs directly from JIRA
- **Single upload per week**: Duplicate detection, replace option available

---
*Last updated: 2026-01-29 after v1.8 milestone started*
