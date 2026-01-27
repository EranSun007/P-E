# P&E Manager - DevOps Bug Dashboard

## What This Is

A unified people and engineering management system combining team management, web capture framework, and DevOps metrics. The current milestone adds a bug KPI dashboard that analyzes JIRA bug exports to track team DevOps duty performance with SLA compliance, resolution times, and backlog health.

## Core Value

Single dashboard showing health and status across all team tools without switching contexts, with full control over what gets captured and how it connects to your data.

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

### Active

- [ ] CSV upload for JIRA bug exports
- [ ] Bug database schema (bug_uploads, bugs, weekly_kpis tables)
- [ ] 10 KPI calculations (inflow, TTFR, MTTR, SLA, backlog health, etc.)
- [ ] Bug dashboard page with KPI cards and status indicators
- [ ] Filtering by component and week
- [ ] Critical alerts when KPIs breach thresholds
- [ ] Aging bugs table with JIRA links
- [ ] Charts for MTTR by priority and category distribution

### Out of Scope

- Direct JIRA API integration — CSV export is the data source
- Real-time bug updates — weekly CSV upload workflow
- Bug modification/write-back — read-only analytics
- Custom KPI definitions — fixed set of 10 KPIs
- Historical data import — starts fresh with new uploads

## Current Milestone: v1.2 DevOps Bug Dashboard

**Goal:** Add a bug KPI dashboard that analyzes weekly JIRA exports to track DevOps duty team performance with actionable metrics and alerts.

**Target features:**
- CSV upload with validation and duplicate detection
- 10 KPIs calculated per upload (bug inflow, TTFR, MTTR, SLA compliance, backlog health)
- Dashboard with KPI cards showing status (green/yellow/red)
- Filtering by component and week
- Critical alerts when thresholds breached
- Aging bugs table with direct JIRA links
- Charts: MTTR by priority, bug category distribution

## Context

**DevOps Duty Context:**
Team rotates weekly DevOps duty. Each week the duty person exports bugs from JIRA and uploads CSV. Dashboard shows health of bug handling process across the team.

**KPI Targets (from specification):**
- Bug Inflow Rate: ≤6 bugs/week
- Time to First Response: <24h for Very High, <48h median overall
- MTTR: Very High <72h, High <168h, Medium <336h
- SLA Compliance: 80% VH resolved <24h, 70% High <48h
- Backlog Health Score: 100 - (VH×10) - (High×5)

**Data Flow:**
1. User exports bugs from JIRA as CSV
2. Uploads CSV via P&E Manager with week-ending date
3. Backend parses CSV, validates columns, calculates resolution times
4. All 10 KPIs calculated and stored in weekly_kpis table
5. Dashboard displays KPIs with status indicators
6. Alerts shown when thresholds breached

**Component Extraction:**
Bugs categorized by labels/summary into: deploy-metering, service-broker, foss-vulnerabilities, cm-metering, sdm-metering, other

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
| CSV upload for bugs | JIRA API not available, CSV export is standard workflow | — Pending |
| Pre-calculated KPIs | Performance optimization, avoid recalculating on page load | — Pending |
| 3-table schema | bug_uploads (meta), bugs (data), weekly_kpis (calculated) | — Pending |

---
*Last updated: 2026-01-27 after v1.2 milestone start*
