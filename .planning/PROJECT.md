# P&E Manager - Web Capture Framework

## What This Is

A configurable web capture system that extracts status, health, and activity data from multiple internal tools (Jira, Grafana, Jenkins, Concourse, Dynatrace) via browser extension, stages it for review, and maps it to P&E Manager entities (projects, team members, services).

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

### Active

- [ ] Configurable capture rules (define what to extract from each site via UI)
- [ ] Multi-site extension support (Grafana, Jenkins, Concourse, Dynatrace)
- [ ] Data staging/inbox (captured data awaits review before visible)
- [ ] Review & approval workflow (approve, edit, reject captured data)
- [ ] Flexible entity mapping (connect captured data to projects, team members, services)
- [ ] Rule editor UI (configure extraction selectors in P&E Manager)
- [ ] Generic captured_data schema (not Jira-specific)

### Out of Scope

- Direct API integrations — same constraint as Jira, no API access
- Write-back to source systems — read-only capture
- Real-time streaming — extension captures while browsing
- Custom entity creation — map to existing entities only (for now)
- Complex transformations — capture raw data, simple field mapping

## Current Milestone: v1.1 Web Capture Framework

**Goal:** Evolve the Jira-specific extension into a configurable multi-site capture framework with data staging and entity mapping.

**Target features:**
- Capture rule configuration via UI (not hardcoded extractors)
- Data inbox for review/approval workflow
- Generic entity mapping (beyond just Jira assignee → team member)
- Support for additional sites (Grafana, Jenkins as first targets)

## Context

**Extension Architecture (v1.0):**
The Jira extension uses hardcoded extractors in content scripts. Each page type (board, backlog, detail) has specific DOM selectors. This worked for Jira but doesn't scale to multiple sites.

**Target Sites:**
- Grafana — dashboard status, alerts, panel data
- Jenkins — build status, job results, pipeline health
- Concourse — pipeline states, resource status
- Dynatrace — service health, problems, metrics

**Data Flow Vision:**
1. User configures capture rules in P&E Manager UI
2. Extension fetches rules, activates on configured sites
3. Extension captures data based on rules, sends to backend
4. Data lands in staging table (not visible in main app)
5. User reviews in inbox UI, approves/rejects/edits
6. Approved data moves to main tables with entity mappings

**Entity Mapping Model:**
Generic mapping system: `{source_type, source_identifier} → {target_entity_type, target_entity_id}`
- `{jenkins_job, "pe-manager-build"} → {project, uuid-of-pe-manager}`
- `{grafana_dashboard, "team-metrics"} → {team_member, uuid-of-eran}`
- `{jira_assignee, "john.doe"} → {team_member, uuid-of-john}`

## Constraints

- **No API access**: Extension must scrape DOM from authenticated sessions
- **Same-origin policy**: Extension needs content script permissions per site
- **Selector fragility**: UI changes break extractors (configurable rules help isolate changes)
- **SAP BTP deployment**: Backend deploys via cf push
- **Browser must be open**: Data only captures while user browses target sites

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Browser extension approach | No API access, extension can access authenticated sessions | ✓ Good (v1.0) |
| Follow GitHub integration pattern | Proven architecture in existing codebase | ✓ Good (v1.0) |
| Configurable extractors via UI | Don't rebuild extension for each new site | — Pending |
| Data staging workflow | Quality control before data enters main system | — Pending |
| Generic entity mapping | Flexible connections, not hardcoded per source | — Pending |
| Rule-based extraction | Selectors defined in config, not code | — Pending |

---
*Last updated: 2026-01-22 after v1.1 milestone start*
