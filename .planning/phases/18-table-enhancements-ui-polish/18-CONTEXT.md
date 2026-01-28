# Phase 18: Table Enhancements & UI Polish - Context

**Gathered:** 2026-01-28
**Status:** Ready for planning

<domain>
## Phase Boundary

Enhance the aging bugs table with visual age indicators, component column, and sorting capabilities. Add weekly inflow trend chart for multi-week data visualization. Polish filter UI with clear labels and active state indicators.

</domain>

<decisions>
## Implementation Decisions

### Age indicators
- Display as colored dot before the age number (e.g., "● 15 days")
- Color only — no icons or text labels inside the dot
- Use softer muted palette (coral/amber/sage) instead of harsh red/yellow/green
- Thresholds: red/coral >14 days, yellow/amber 7-14 days, green/sage <7 days

### Claude's Discretion
- Table sorting implementation (column headers, sort direction icons)
- Component column badge styling
- Weekly inflow trend chart design (line chart, bar chart, placement)
- Filter label text and badge styling
- Exact color hex values for the softer palette
- Dot size relative to text

</decisions>

<specifics>
## Specific Ideas

- Softer palette was chosen to reduce visual intensity compared to the existing KPI status colors
- Dot placement before the number follows common patterns (status dot → value)

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 18-table-enhancements-ui-polish*
*Context gathered: 2026-01-28*
