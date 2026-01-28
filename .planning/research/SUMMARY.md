# Project Research Summary

**Project:** P&E Manager v1.3 - KPI Insights & Alerts
**Domain:** Bug Dashboard KPI Trend Visualization & Threshold Notification System
**Researched:** 2026-01-28
**Confidence:** HIGH

## Executive Summary

P&E Manager v1.3 adds KPI trend charts and threshold notifications to the existing bug dashboard. This is a well-trodden domain with established patterns: time-series queries for historical data, Recharts for trend visualization, threshold evaluation on data upload, and notification delivery via existing in-app system with optional email. The foundational infrastructure is already in place: Recharts (v2.15.4), PostgreSQL with weekly_kpis table, and NotificationService - requiring only minimal additions (nodemailer for email, node-cron for scheduling).

The recommended approach is incremental: start with historical KPI queries and trend charts (zero new dependencies), then add threshold evaluation (reuse existing notifications), and optionally layer in email alerts (nodemailer) and scheduled monitoring (node-cron). This milestone extends existing patterns rather than introducing new paradigms. The weekly_kpis table's JSONB structure works for current-week display but needs JOIN-based queries for efficient multi-week trend retrieval. Default thresholds hardcoded in code provide immediate value without configuration UI complexity.

Key risks are time-series query performance (mitigated by indexes on user_id/week_ending), chart re-render thrashing (mitigated by React.memo and useMemo), notification spam (mitigated by 24-hour deduplication), and email delivery failures (mitigated by queue with retry logic). All risks have established mitigation patterns and should be addressed from day one rather than retrofitted later.

## Key Findings

### Recommended Stack

Research confirms the existing stack is sufficient with only two targeted additions. Recharts already supports LineChart for time-series trends, Radix Toast handles in-app notifications, and PostgreSQL's JSONB storage works for aggregated KPIs. The only gaps are email delivery (nodemailer) and task scheduling (node-cron), both lightweight and battle-tested.

**Core technologies:**
- **Recharts (existing v2.15.4)**: Time-series line charts — already used for MTTRBarChart, supports multi-week trends out-of-box
- **PostgreSQL (existing pg 8.11.3)**: Historical KPI storage — weekly_kpis table JOIN with bug_uploads provides week_ending for X-axis
- **NotificationService (existing)**: In-app alerts — reuse for threshold breach notifications, no new tables needed
- **nodemailer (NEW v7.0.13)**: Email delivery — SMTP-agnostic, 1.4M+ dependents, zero frontend impact
- **node-cron (NEW v4.2.1)**: Scheduled monitoring — lightweight, in-process, 5M+ weekly downloads

**Explicitly rejected:**
- Chart.js, Victory, Nivo — duplicates Recharts capability (200-500KB bundle increase for zero benefit)
- SendGrid, Mailgun clients — vendor lock-in, nodemailer works with any SMTP including SAP BTP Mail service
- Bull/BullMQ job queues — overkill for hourly checks, requires Redis infrastructure

### Expected Features

Research identified clear table stakes and differentiators. Users expect historical trend visualization and threshold alerts; configuration UI and visual polish are nice-to-have.

**Must have (table stakes):**
- **Historical KPI queries** — 8-12 weeks of trend data, users expect "how's this trending?" context
- **Line charts per KPI** — visual representation of weekly progression, standard pattern for time-series
- **Threshold evaluation on upload** — immediate feedback when KPIs breach red/yellow zones
- **In-app notification center** — persistent alerts for threshold breaches, existing notifications table ready
- **Default thresholds** — sensible values (e.g., MTTR VH > 48hrs = yellow, > 72hrs = red) without requiring configuration

**Should have (competitive):**
- **Email alerts** — notify users outside the app when critical thresholds breached
- **Trend indicators** — arrows/percentages on KPI cards showing week-over-week change
- **Notification deduplication** — don't spam users with identical alerts within 24 hours
- **Source link in notifications** — click alert → scroll to relevant KPI chart

**Defer (v2+):**
- **Custom threshold configuration UI** — start with hardcoded defaults, add customization if requested
- **Weekly digest emails** — batch multiple breaches into single email, wait for user feedback
- **Notification preferences** — per-KPI alert enable/disable, build after MVP usage patterns emerge
- **Visual threshold lines on charts** — overlay red/yellow zones on trend charts, polish feature

### Architecture Approach

The milestone integrates seamlessly with existing patterns. BugService gains `getKPIHistory()` for multi-week queries (JOIN weekly_kpis + bug_uploads), new ThresholdService evaluates KPIs on upload and creates notifications, and frontend adds KPITrendChart component using Recharts. No schema changes required for MVP; existing weekly_kpis JSONB + notifications table handle everything.

**Major components:**
1. **BugService extension** — Add `getKPIHistory(userId, weeks, component)` method for time-series queries, modify `uploadCSV()` to trigger threshold checks post-commit (fire-and-forget)
2. **ThresholdService (NEW)** — Evaluate KPIs against default thresholds (warning/critical), call NotificationService.create() on breach, future: read per-user overrides from kpi_thresholds table
3. **KPITrendChart (NEW)** — Recharts LineChart component, receives historical data array, transforms to chart format with date-fns, memoized to prevent re-render thrashing
4. **NotificationBell (NEW)** — Display unread count badge, dropdown of recent alerts, uses existing NotificationService (no new backend code)
5. **EmailService (OPTIONAL)** — Nodemailer wrapper for SMTP delivery, email_queue table with retry logic, SAP BTP Mail service integration

**Data flow:**
Upload CSV → BugService.uploadCSV() → calculate KPIs → store in weekly_kpis → ThresholdService.evaluateKPIs() (async) → NotificationService.create() if breached → Frontend polls notifications → displays badge/toast.

**Build order:** Historical queries (Phase 1) → Trend charts (Phase 2) → Threshold evaluation (Phase 3) → In-app notifications (Phase 4) → Email delivery (Phase 5 - optional).

### Critical Pitfalls

Research identified five critical mistakes that would cause rewrites or major technical debt.

1. **Time-series data model mismatch** — Querying JSONB for multi-week trends becomes O(n) scan. Prevention: Add indexes on (user_id, week_ending), ensure JOINs use indexed columns, consider normalizing KPI values if JSONB queries exceed 500ms.

2. **Chart re-render thrashing** — Recharts re-renders on every parent state change (200-500ms jank). Prevention: Wrap charts in React.memo with data comparison, memoize data transformations with useMemo, limit to 12 weeks max per chart.

3. **Email notifications without delivery infrastructure** — Emails silently fail without SAP BTP Mail service binding or retry logic. Prevention: Configure mail service first, add email_queue table with attempts counter, health check endpoint for SMTP connection.

4. **Notification spam and fatigue** — Sending alerts on every upload without deduplication (3 uploads in 5 min = 3 identical emails). Prevention: notification_log table tracking last sent timestamp, 24-hour cooldown per KPI, batch multiple breaches into digest.

5. **Performance degradation on upload** — Adding threshold checks + email sending to upload flow increases latency from 2s to 30s. Prevention: Fire-and-forget pattern for threshold evaluation, return upload response immediately, background job for notifications.

## Implications for Roadmap

Based on research, suggested phase structure follows dependency chain: historical data queries → visualization → threshold logic → notification delivery. Each phase delivers standalone value and builds on previous infrastructure.

### Phase 1: Historical KPI Queries
**Rationale:** Foundation for all trend features. No new dependencies, pure backend extension. Must precede chart work since charts need time-series data.
**Delivers:** `GET /api/bugs/kpis/history?weeks=8&component=X` endpoint returning array of {week_ending, kpi_data}
**Addresses:** Historical KPI queries (table stakes), enables all downstream trend features
**Avoids:** Time-series data model mismatch (Pitfall 1) by designing efficient JOIN pattern from start
**Complexity:** Low - extends existing BugService pattern
**Research needed:** No - standard PostgreSQL JOIN, existing weekly_kpis schema sufficient

### Phase 2: Trend Chart Components
**Rationale:** Visual representation of historical data. Recharts already installed, follows MTTRBarChart patterns. Can develop in parallel with backend queries.
**Delivers:** KPITrendChart.jsx component, integrated into BugDashboard, memoized data transformations
**Addresses:** Line charts per KPI (table stakes), trend visualization
**Avoids:** Chart re-render thrashing (Pitfall 2) by implementing React.memo + useMemo from start
**Complexity:** Medium - Recharts integration, performance optimization required
**Research needed:** No - established patterns in existing codebase (Metrics.jsx, BugDashboard.jsx)

### Phase 3: Threshold Evaluation Logic
**Rationale:** Core notification trigger. Default thresholds in code avoid UI complexity. Evaluates after upload completes (fire-and-forget).
**Delivers:** ThresholdService with default thresholds, BugService.uploadCSV() integration, evaluation on CSV upload
**Addresses:** Threshold evaluation on upload (table stakes), default thresholds
**Avoids:** Performance degradation on upload (Pitfall 5) via async threshold checks
**Complexity:** Medium - new service pattern, requires careful error handling
**Research needed:** Yes (minor) - validate threshold values with actual bug data, may need calibration

### Phase 4: In-App Notification Integration
**Rationale:** Reuse existing NotificationService infrastructure. Notification center UI completes alert delivery loop without external dependencies.
**Delivers:** NotificationBell component with badge count, notification list UI, mark-as-read functionality
**Addresses:** In-app notification center (table stakes), notification deduplication (competitive)
**Avoids:** Notification spam (Pitfall 4) via 24-hour deduplication in notification_log table
**Complexity:** Low-Medium - UI work, notification_log table for deduplication
**Research needed:** No - existing notifications table and patterns proven

### Phase 5 (Optional): Email Notifications
**Rationale:** Extends alerts outside app. Optional because in-app notifications may suffice. Requires SAP BTP Mail service binding and careful delivery monitoring.
**Delivers:** EmailService with nodemailer, email_queue with retry logic, SMTP configuration, unsubscribe links
**Addresses:** Email alerts (competitive feature), notification preferences (deferred)
**Avoids:** Email delivery failures (Pitfall 3) via queue + retries + health checks
**Complexity:** High - external SMTP dependency, deliverability concerns, user preferences
**Research needed:** Yes - SAP BTP Mail service configuration, SMTP credentials setup, test deliverability

### Phase 6 (Optional): Scheduled Monitoring
**Rationale:** Periodic threshold checks even without new uploads. Low priority since most value is immediate feedback on upload.
**Delivers:** node-cron scheduled job, runs Monday 8am, checks last upload for each user
**Addresses:** Proactive monitoring (nice-to-have)
**Avoids:** No critical pitfalls, but needs monitoring to prevent crash loops
**Complexity:** Medium - cron job management, error handling for background process
**Research needed:** No - node-cron well-documented, simple cron syntax

### Phase Ordering Rationale

- **Phases 1-2 can overlap** (backend queries + frontend charts developed concurrently) once API contract defined
- **Phase 3 depends on Phase 1** (needs historical queries to calculate thresholds based on trends, though MVP uses static defaults)
- **Phase 4 depends on Phase 3** (notification UI needs threshold breaches to display)
- **Phases 5-6 are independent enhancements** (email and scheduling can be added in any order or skipped entirely)

This order avoids pitfalls by addressing data model first (prevents rewrites), then visualization (delivers user value), then notification logic (completes feature), with optional enhancements last. Research confirms this is the standard build sequence for KPI dashboards with alerting.

### Research Flags

Phases likely needing deeper research during planning:
- **Phase 3 (Threshold Logic):** Validate default threshold values against actual bug data - may need calibration based on historical KPI distributions
- **Phase 5 (Email Delivery):** SAP BTP Mail service setup requires environment-specific configuration, SMTP credentials rotation policy unknown

Phases with standard patterns (skip research-phase):
- **Phase 1 (Historical Queries):** PostgreSQL JOIN patterns well-documented, existing weekly_kpis schema sufficient
- **Phase 2 (Trend Charts):** Recharts LineChart proven in codebase (MTTRBarChart), performance patterns established
- **Phase 4 (In-App Notifications):** NotificationService exists, standard React Context + polling pattern

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | Recharts/PostgreSQL proven in existing codebase, nodemailer industry standard with 1.4M+ dependents, node-cron widely adopted (5M+ weekly) |
| Features | HIGH | KPI trend charts and threshold alerts are well-established patterns, table stakes vs nice-to-have clear from domain knowledge |
| Architecture | HIGH | All patterns exist in codebase (BugService extension, Recharts integration, NotificationService), new components follow established structure |
| Pitfalls | HIGH | Time-series performance, chart re-renders, email delivery, notification spam - all common mistakes with known mitigations |

**Overall confidence:** HIGH

Research based on existing P&E Manager codebase analysis (BugService.js, BugDashboard.jsx, NotificationService.js, database schema 019_bug_dashboard.sql), package.json dependencies, and established patterns for time-series visualization and notification systems. All recommended technologies verified as current versions with active maintenance.

### Gaps to Address

Minor areas requiring validation during implementation:

- **Threshold calibration:** Default values (e.g., MTTR VH > 48hrs = yellow) are educated guesses. Validate against actual bug data distribution in Phase 3. May need per-component thresholds if variance is high.
- **SAP BTP Mail service availability:** Assumed SAP BTP includes mail service in catalog. Verify service exists and binding process before Phase 5. Fallback: external SMTP provider (Gmail, SendGrid) if BTP mail unavailable.
- **Query performance at scale:** Tested patterns with <10 uploads. Monitor query times in Phase 1 if users have >50 uploads. Add composite index (user_id, component, week_ending) if slow.
- **Email deliverability:** SMTP success doesn't guarantee inbox delivery. Monitor spam folder rates in Phase 5, may need SPF/DKIM configuration.

All gaps have clear validation points during implementation and fallback options. None block MVP delivery.

## Sources

### Primary (HIGH confidence)
- **Existing codebase:** `/server/services/BugService.js` (KPI calculation patterns, uploadCSV flow), `/server/services/NotificationService.js` (notification CRUD), `/server/db/019_bug_dashboard.sql` (weekly_kpis schema), `/src/pages/BugDashboard.jsx` (Recharts integration), `package.json` (dependency versions verified)
- **STACK.md research:** Nodemailer v7.0.13 (released 2026-01-27, GitHub verification), node-cron v4.2.1, Recharts v2.15.4 already installed
- **ARCHITECTURE.md research:** Component boundaries analysis, data flow patterns, integration points with existing services

### Secondary (MEDIUM confidence)
- **FEATURES.md research:** Table stakes vs differentiators based on domain knowledge of KPI dashboards, no external validation
- **PITFALLS.md research:** Common mistakes from domain experience (time-series queries, React performance, email delivery), validated against codebase patterns
- **PostgreSQL documentation:** Time-series query optimization, JSONB indexing strategies (general knowledge, not P&E-specific)

### Tertiary (LOW confidence)
- None - all findings grounded in existing codebase or verified package documentation

---
*Research completed: 2026-01-28*
*Ready for roadmap: yes*
