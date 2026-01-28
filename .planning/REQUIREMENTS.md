# Requirements: P&E Manager v1.3

**Defined:** 2026-01-28
**Core Value:** Single dashboard showing health and status across all team tools without switching contexts

## v1.3 Requirements

Requirements for KPI Insights & Alerts milestone. Each maps to roadmap phases.

### Trend Charts

- [x] **TREND-01**: User can view time-series line chart of any KPI over multiple weeks
- [x] **TREND-02**: User can select which KPI to display on trend chart
- [x] **TREND-03**: User can select time range (4, 8, or 12 weeks)
- [x] **TREND-04**: Trend chart shows threshold zones as colored bands (green/yellow/red areas)
- [x] **TREND-05**: Tooltip on hover shows exact KPI value and date
- [x] **TREND-06**: KPI cards display sparklines showing mini trend visualization
- [x] **TREND-07**: KPI cards show trend direction indicators (↑↓→ arrows)

### Notifications

- [x] **NOTIF-01**: System detects when KPI crosses into red zone on CSV upload
- [x] **NOTIF-02**: System creates in-app notification when threshold breached
- [x] **NOTIF-03**: Notification bell icon shows unread count badge in header
- [x] **NOTIF-04**: User can view notification panel with list of alerts
- [x] **NOTIF-05**: User can mark notifications as read
- [ ] **NOTIF-06**: System sends email notification when KPI hits red zone
- [ ] **NOTIF-07**: User can configure notification preferences per KPI

### Infrastructure

- [x] **INFRA-01**: Historical KPI data stored for trend queries
- [x] **INFRA-02**: Notification deduplication prevents alert spam on re-uploads
- [ ] **INFRA-03**: Email delivery with retry logic for reliability

## Future Requirements

Deferred to v1.4 or later. Tracked but not in current roadmap.

### Advanced Trends

- **TREND-F01**: Multi-KPI comparison view on single chart
- **TREND-F02**: Export trend data to CSV
- **TREND-F03**: Trend annotations with comments

### Advanced Notifications

- **NOTIF-F01**: Slack/Teams integration for alerts
- **NOTIF-F02**: Notification snooze for X weeks
- **NOTIF-F03**: Notification grouping (multiple red KPIs = single notification)
- **NOTIF-F04**: Scheduled monitoring (check thresholds even without upload)

## Out of Scope

Explicitly excluded. Documented to prevent scope creep.

| Feature | Reason |
|---------|--------|
| Real-time KPI updates | Weekly CSV workflow is the data source |
| Predictive forecasting | Complexity exceeds value for current use case |
| Custom threshold definitions | Fixed thresholds from specification sufficient |
| Mobile push notifications | Web-only application |
| AI-based anomaly detection | Over-engineering for v1 |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| INFRA-01 | Phase 13 | Complete |
| TREND-01 | Phase 14 | Complete |
| TREND-02 | Phase 14 | Complete |
| TREND-03 | Phase 14 | Complete |
| TREND-04 | Phase 14 | Complete |
| TREND-05 | Phase 14 | Complete |
| TREND-06 | Phase 14 | Complete |
| TREND-07 | Phase 14 | Complete |
| NOTIF-01 | Phase 15 | Complete |
| NOTIF-02 | Phase 15 | Complete |
| NOTIF-03 | Phase 15 | Complete |
| NOTIF-04 | Phase 15 | Complete |
| NOTIF-05 | Phase 15 | Complete |
| INFRA-02 | Phase 15 | Complete |
| NOTIF-06 | Phase 16 | Pending |
| NOTIF-07 | Phase 16 | Pending |
| INFRA-03 | Phase 16 | Pending |

**Coverage:**
- v1.3 requirements: 17 total
- Mapped to phases: 17 (100%)
- Unmapped: 0 ✓

**Phase distribution:**
- Phase 13: 1 requirement (INFRA-01)
- Phase 14: 7 requirements (TREND-01 through TREND-07)
- Phase 15: 6 requirements (NOTIF-01 through NOTIF-05, INFRA-02)
- Phase 16: 3 requirements (NOTIF-06, NOTIF-07, INFRA-03)

---
*Requirements defined: 2026-01-28*
*Last updated: 2026-01-28 after Phase 15 completion*
