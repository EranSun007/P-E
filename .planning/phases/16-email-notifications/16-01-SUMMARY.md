---
phase: 16-email-notifications
plan: 01
subsystem: notifications
tags: [email, nodemailer, smtp, alerts, preferences]
dependency_graph:
  requires:
    - 15-01-SUMMARY (ThresholdService for KPI alerts)
    - 15-02-SUMMARY (NotificationService for in-app notifications)
  provides:
    - EmailService with SMTP delivery and retry logic
    - Email preferences REST API
    - email_queue table for delivery logging
  affects:
    - 16-02 (UI for email preferences)
    - Future email notification types
tech_stack:
  added:
    - nodemailer@7.0.13
    - p-retry@7.1.1
  patterns:
    - Fire-and-forget email delivery
    - Exponential backoff retry (1s, 2s, 4s)
    - AbortError for permanent failures
    - User preference check before send
key_files:
  created:
    - server/services/EmailService.js
    - server/db/021_email_notifications.sql
    - server/routes/emailPreferences.js
  modified:
    - package.json
    - package-lock.json
    - server/db/migrate.js
    - server/services/ThresholdService.js
    - server/index.js
decisions:
  - key: smtp-config-pattern
    choice: Environment variables with ethereal.email fallback
    why: Production-ready config with safe dev default
  - key: email-retry-strategy
    choice: p-retry with 3 retries, exponential backoff
    why: Handles transient failures while avoiding infinite loops
  - key: permanent-failure-detection
    choice: AbortError on codes 550, 553, EAUTH, EENVELOPE
    why: Don't retry permanent failures like invalid addresses
  - key: preference-storage
    choice: JSON in UserSettingsService with email_pref_ prefix
    why: Reuse existing settings infrastructure
metrics:
  duration: ~10 minutes
  completed: 2026-01-28
---

# Phase 16 Plan 01: EmailService and Preferences API Summary

Email delivery infrastructure with nodemailer SMTP transport, p-retry for resilience, integration with ThresholdService for KPI alert emails, and REST API for user email preferences.

## What Was Built

### EmailService (`server/services/EmailService.js`)

Core email delivery service with:

1. **SMTP Configuration**
   - Reads from SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM
   - Falls back to ethereal.email for dev testing
   - Auto-detects secure mode (port 465 = SSL)

2. **Retry Logic with p-retry**
   - 3 retries with exponential backoff (1s, 2s, 4s)
   - AbortError for permanent failures (550, 553, EAUTH)
   - Logs attempt number and retries left on failure

3. **KPI Alert Email Template**
   - Professional HTML email with red zone styling
   - Plain text fallback for email clients
   - Dashboard link button for quick access
   - Settings link in footer for preference management

4. **sendKPIAlert Method**
   - Checks user preference via UserSettingsService
   - Returns early if disabled or no email configured
   - Logs delivery attempt to email_queue table
   - Fire-and-forget pattern (non-blocking)

### email_queue Table (`server/db/021_email_notifications.sql`)

Stores email delivery attempts for audit and debugging:

| Column | Type | Purpose |
|--------|------|---------|
| id | UUID | Primary key |
| user_id | VARCHAR | User who triggered email |
| recipient_email | VARCHAR | Destination address |
| subject | VARCHAR | Email subject line |
| template_type | VARCHAR | Type (e.g., kpi_alert) |
| template_data | JSONB | Template variables |
| status | VARCHAR | pending/sent/failed |
| attempts | INTEGER | Retry count |
| last_error | TEXT | Most recent error message |
| created_date | TIMESTAMP | Queue entry time |
| sent_date | TIMESTAMP | Successful delivery time |

### ThresholdService Integration

Added fire-and-forget email trigger after in-app notification:

```javascript
// Fire-and-forget email - don't await, don't block
EmailService.sendKPIAlert(userId, kpiKey, value, weekEnding)
  .catch(err => console.error('ThresholdService: Email failed for', kpiKey, err.message));
```

### Email Preferences API (`server/routes/emailPreferences.js`)

REST endpoints for managing email notification preferences:

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | /api/email-preferences | List all preferences |
| GET | /api/email-preferences/:kpiKey | Get single preference |
| PUT | /api/email-preferences/:kpiKey | Set preference |
| DELETE | /api/email-preferences/:kpiKey | Remove preference |

**Supported KPI Keys:**
- bug_inflow_rate
- median_ttfr_hours
- sla_vh_percent
- sla_high_percent
- backlog_health_score

**Preference Format:**
```json
{
  "enabled": true,
  "email": "user@example.com"
}
```

## Data Flow

```
CSV Upload → BugService → ThresholdService.evaluateAndNotify()
                                ↓
                        KPI in red zone?
                                ↓ yes
                NotificationService.createWithType() ← In-app notification
                                ↓
                EmailService.sendKPIAlert() ← Fire-and-forget
                                ↓
                Check user preference (email_pref_{kpiKey})
                                ↓ enabled
                sendWithRetry() with p-retry
                                ↓
                Log to email_queue table
```

## Commits

| Hash | Description |
|------|-------------|
| 903e5e1e | create EmailService with nodemailer and p-retry |
| ae69a04a | integrate EmailService with ThresholdService and add preferences API |

## Verification

1. **Dependencies installed:** `npm ls nodemailer p-retry` shows both packages
2. **Migration added:** 021_email_notifications.sql creates email_queue table
3. **EmailService exports:** sendKPIAlert function available
4. **ThresholdService integration:** Calls EmailService after notification
5. **API endpoints:** GET/PUT/DELETE routes mounted at /api/email-preferences

## Deviations from Plan

None - plan executed exactly as written.

## Next Phase Readiness

**16-02 Prerequisites Met:**
- EmailService ready for UI integration
- Preferences API available for Settings page
- Email template renders correctly

**Required for Production:**
- Configure SMTP environment variables on BTP
- Test with real SMTP server (not ethereal.email)
- Consider SAP BTP Mail service for enterprise deployment
