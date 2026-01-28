# P&E Manager

## What This Is

A unified people and engineering management system combining team management, web capture framework, and DevOps metrics. Features include a bug KPI dashboard that analyzes JIRA bug exports to track team DevOps duty performance with SLA compliance, resolution times, and backlog health.

## Core Value

Single dashboard showing health and status across all team tools without switching contexts, with full control over what gets captured and how it connects to your data.

## Current Milestone: v1.4 Bug Dashboard Fixes & Enhancements

**Goal:** Fix component extraction/filtering bugs and add missing UI features to complete the bug dashboard vision.

**Target features:**
- Fix component extraction logic (currently all bugs categorized as one component)
- Working component filter dropdown that updates all KPIs, charts, and table
- Table enhancements: search, age indicators, component column, sortable columns
- Weekly inflow trend chart when multiple weeks uploaded
- KPI status badges and UI polish

## Current State (v1.2 Shipped)

**Shipped:** 2026-01-28
**Milestones:** v1.0 (Jira Integration), v1.1 (Web Capture Framework), v1.2 (DevOps Bug Dashboard)

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

### Active

- [ ] Component extraction logic fix (currently categorizing all bugs as one component)
- [ ] Component filter dropdown working properly (updates KPIs, charts, table)
- [ ] Category distribution chart showing correct breakdown
- [ ] Bug inflow rate calculation verification
- [ ] Table search functionality
- [ ] Visual age indicators in aging bugs table
- [ ] Component column in aging bugs table
- [ ] Weekly inflow trend chart (when multiple weeks uploaded)
- [ ] KPI status badges on cards
- [ ] Sortable table columns
- [ ] UI/UX improvements (dropdown labels, filter badges)

### Out of Scope

- Direct JIRA API integration — CSV export is the data source
- Real-time bug updates — weekly CSV upload workflow
- Bug modification/write-back — read-only analytics
- Custom KPI definitions — fixed set of 9 KPIs
- Historical data import — starts fresh with new uploads

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

---
*Last updated: 2026-01-28 after v1.4 milestone started*
