# Phase 22: Team Status Page - Context

**Gathered:** 2026-01-29
**Status:** Ready for planning

<domain>
## Phase Boundary

Display team health and daily summaries from knowledge base insights. Users view progress metrics, blockers, velocity, and health indicators per team member. Data comes from MCP store_insight API. Creating/editing summaries is out of scope — this is a read-only dashboard.

</domain>

<decisions>
## Implementation Decisions

### Dashboard Layout
- Team tabs at top, starting with Metering team (scaffold for future teams)
- Member cards below team tab, compact view with avatar, name, health indicator, 1-line summary
- Click card to expand full summary with all items
- Aggregate metrics banner above member cards showing team totals

### Health Indicators
- Combined factors determine health: blockers, activity, and completion rate
- Visual style: card border color (red/yellow/green left border)
- Quick tooltip on hover explains status ("2 blockers, no updates in 3 days")
- Full health reasoning shown in expanded card view
- Team-level shows count breakdown: "3 green, 1 yellow, 1 red"

### Timeline Navigation
- Weekly view only — no daily granularity
- Prev/Next arrows to navigate weeks
- Week format: Calendar week number + sprint name (e.g., "Week 4 • Sprint 2601a")
- 4 weeks of history available
- Week view shows aggregated summary at top, day-by-day breakdown when expanded

### Metrics Display
- Team aggregate banner shows: Completed / Blockers / Velocity
- Velocity = items completed this week (simple count)
- Blockers = items explicitly tagged as blockers in store_insight data
- Member cards show small metric badges ("3 done" / "1 blocker")

### Claude's Discretion
- Exact health calculation thresholds (what triggers yellow vs red)
- Card spacing and visual polish
- Empty state when no data for a week
- Loading skeleton design

</decisions>

<specifics>
## Specific Ideas

- Sprint naming convention follows existing pattern: YYWW + letter (e.g., 2601a)
- Metering team is first/only team for now — other teams scaffold for future
- Keep cards compact to see team at a glance without scrolling

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 22-team-status-page*
*Context gathered: 2026-01-29*
