# Phase 16: Email Notifications & Preferences - Research

**Researched:** 2026-01-28
**Domain:** Email delivery with nodemailer, user preferences storage, retry patterns
**Confidence:** HIGH

## Summary

Phase 16 adds email notifications when KPIs breach red zone thresholds. The existing ThresholdService already detects breaches and creates in-app notifications - this phase extends that to email delivery with retry logic and user preferences.

Key findings:
1. **Nodemailer** is the standard Node.js email library - zero dependencies, simple SMTP configuration
2. **No Redis required** - use p-retry library for lightweight in-process retry with exponential backoff
3. **UserSettingsService already exists** - perfect pattern for storing email preferences per KPI
4. **Integration point is clear** - ThresholdService.createNotificationIfNotDuplicate() should trigger email after in-app notification

**Primary recommendation:** Add nodemailer for SMTP delivery, p-retry for retry logic, extend UserSettingsService for email preferences, and create EmailService as orchestrator.

## Standard Stack

The established libraries/tools for this domain:

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| nodemailer | ^6.9.x | SMTP email delivery | De-facto Node.js email library, MIT license, zero dependencies |
| p-retry | ^6.x | Retry with exponential backoff | Lightweight, no Redis needed, promise-based |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| (none needed) | - | - | p-retry handles retry, nodemailer handles templates |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| nodemailer | SendGrid SDK | More features but adds vendor lock-in |
| p-retry | Bull queue | More robust but requires Redis infrastructure |
| In-process retry | PostgreSQL-backed queue | More durable but over-engineered for this use case |

**Installation:**
```bash
npm install nodemailer p-retry
```

## Architecture Patterns

### Recommended Project Structure
```
server/
├── services/
│   ├── EmailService.js           # NEW: Email orchestration + templates
│   ├── EmailPreferencesService.js # NEW: User preference management
│   ├── ThresholdService.js       # MODIFY: Call EmailService after notification
│   ├── UserSettingsService.js    # EXISTING: Reuse for preference storage
│   └── NotificationService.js    # EXISTING: No changes needed
├── routes/
│   └── emailPreferences.js       # NEW: API for preferences UI
└── db/
    └── 021_email_notifications.sql # NEW: email_queue table + preferences columns
```

### Pattern 1: Fire-and-Forget Email Trigger

**What:** ThresholdService triggers email asynchronously after creating in-app notification
**When to use:** When in-app notification succeeds and user has email enabled for that KPI
**Example:**
```javascript
// In ThresholdService.createNotificationIfNotDuplicate()
const notification = await NotificationService.createWithType(userId, { ... });

// Fire-and-forget email - don't await, don't block
EmailService.sendKPIAlert(userId, kpiKey, value, weekEnding)
  .catch(err => console.error('Email failed:', err));

return notification;
```

### Pattern 2: Retry with p-retry

**What:** Wrap nodemailer sendMail in p-retry for automatic retry on transient failures
**When to use:** Every email send operation
**Example:**
```javascript
// Source: p-retry GitHub documentation
import pRetry from 'p-retry';

async function sendWithRetry(mailOptions) {
  return pRetry(
    async () => {
      const info = await transporter.sendMail(mailOptions);
      return info;
    },
    {
      retries: 3,
      minTimeout: 1000,      // 1 second initial delay
      factor: 2,             // Exponential backoff: 1s, 2s, 4s
      onFailedAttempt: (error) => {
        console.log(`Email attempt ${error.attemptNumber} failed. ${error.retriesLeft} retries left.`);
        // Log to database for monitoring (INFRA-03 requirement)
        logEmailFailure(error);
      },
    }
  );
}
```

### Pattern 3: User Preferences via UserSettingsService

**What:** Store email preferences per KPI using existing user_settings table
**When to use:** All preference reads/writes
**Example:**
```javascript
// Setting key pattern: email_pref_{kpi_key}
// Value: JSON { enabled: boolean, email: string }

// Read preference
const pref = await UserSettingsService.get(userId, 'email_pref_bug_inflow_rate');
const { enabled, email } = JSON.parse(pref || '{"enabled":false}');

// Write preference
await UserSettingsService.set(
  userId,
  'email_pref_bug_inflow_rate',
  JSON.stringify({ enabled: true, email: 'user@example.com' }),
  false // Not encrypted
);
```

### Anti-Patterns to Avoid
- **Blocking on email delivery:** Never await email in the main request path - fire-and-forget
- **Redis/Bull for simple retry:** Over-engineered for 3-retry requirement
- **Separate email_preferences table:** Unnecessary - UserSettingsService pattern already exists
- **Inline HTML in code:** Use template strings or external files for maintainability

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Retry logic | Custom retry loop | p-retry | Handles exponential backoff, attempt counting, abort |
| Email templating | String concatenation | Nodemailer HTML templates | Proper escaping, multipart text/html |
| SMTP connection | Raw net/tls | Nodemailer transporter | Connection pooling, TLS negotiation |
| Preference storage | New table | UserSettingsService | Pattern already established in codebase |

**Key insight:** The codebase already has UserSettingsService with encryption support and upsert pattern - reuse it rather than creating a separate preferences system.

## Common Pitfalls

### Pitfall 1: Blocking Main Request on Email

**What goes wrong:** Awaiting email delivery in CSV upload response causes slow UX
**Why it happens:** Natural instinct to await async operations
**How to avoid:** Fire-and-forget pattern - call EmailService without await
**Warning signs:** CSV upload taking 3-10 seconds instead of <1 second

### Pitfall 2: Missing Email Address

**What goes wrong:** User enables notifications but hasn't set email address
**Why it happens:** Preference enabled before email configured
**How to avoid:**
1. Check email exists before attempting send
2. Store email as part of preference object or pull from user profile
3. Gracefully skip if no email (log warning, don't throw)
**Warning signs:** Errors in logs with "missing recipient"

### Pitfall 3: Retry Loop on Permanent Failures

**What goes wrong:** Retrying on invalid email address (won't ever succeed)
**Why it happens:** Not distinguishing transient vs permanent failures
**How to avoid:** Abort retry on certain error codes (invalid recipient, authentication)
**Warning signs:** Same email failing 3 times repeatedly

```javascript
// p-retry with abort on permanent failures
import pRetry, { AbortError } from 'p-retry';

async function sendWithRetry(mailOptions) {
  return pRetry(
    async () => {
      try {
        return await transporter.sendMail(mailOptions);
      } catch (error) {
        // Don't retry on permanent failures
        if (error.responseCode === 550 || // Invalid recipient
            error.responseCode === 553 || // Mailbox name not allowed
            error.code === 'EAUTH') {     // Authentication failed
          throw new AbortError(error.message);
        }
        throw error; // Transient failure - retry
      }
    },
    { retries: 3 }
  );
}
```

### Pitfall 4: SAP BTP Mail Service Configuration

**What goes wrong:** Email works locally but fails on BTP
**Why it happens:** BTP may require destination service or mail service binding
**How to avoid:**
1. Check if VCAP_SERVICES contains mail credentials
2. Fall back to environment variables for local dev
3. Support both patterns in EmailService initialization
**Warning signs:** "Connection refused" only in production

## Code Examples

Verified patterns from official sources:

### Nodemailer Basic Setup
```javascript
// Source: https://nodemailer.com/
import nodemailer from 'nodemailer';

// Create transporter - configure via environment
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.ethereal.email',
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: process.env.SMTP_SECURE === 'true', // true for 465, false for 587
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});
```

### KPI Alert Email Template
```javascript
// Source: Derived from existing KPI_LABELS in ThresholdService.js
function buildKPIAlertEmail(kpiKey, value, threshold, weekEnding, dashboardUrl) {
  const KPI_LABELS = {
    bug_inflow_rate: 'Bug Inflow Rate',
    median_ttfr_hours: 'Time to First Response',
    sla_vh_percent: 'SLA Compliance (VH)',
    sla_high_percent: 'SLA Compliance (High)',
    backlog_health_score: 'Backlog Health Score',
  };

  const label = KPI_LABELS[kpiKey] || kpiKey;
  const unit = kpiKey.includes('percent') ? '%' : '';

  return {
    subject: `[Alert] ${label} in Red Zone (${value}${unit})`,
    text: `
KPI Alert: ${label}

Current Value: ${value}${unit}
Threshold: ${threshold}${unit}
Week Ending: ${weekEnding}

This KPI has crossed into the red zone and requires attention.

View Dashboard: ${dashboardUrl}
    `.trim(),
    html: `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
    .alert-box { background: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; padding: 20px; margin: 20px 0; }
    .kpi-value { font-size: 32px; font-weight: bold; color: #dc2626; }
    .threshold { color: #6b7280; }
    .btn { display: inline-block; background: #3b82f6; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; }
  </style>
</head>
<body>
  <h2>KPI Alert: ${label}</h2>
  <div class="alert-box">
    <p>Current Value: <span class="kpi-value">${value}${unit}</span></p>
    <p class="threshold">Threshold: ${threshold}${unit}</p>
    <p>Week Ending: ${weekEnding}</p>
  </div>
  <p>This KPI has crossed into the red zone and requires attention.</p>
  <p><a href="${dashboardUrl}" class="btn">View Dashboard</a></p>
</body>
</html>
    `.trim(),
  };
}
```

### Email Preferences API Pattern
```javascript
// Source: Based on existing userSettings.js route pattern
import express from 'express';
import UserSettingsService from '../services/UserSettingsService.js';
import { authMiddleware } from '../middleware/auth.js';

const router = express.Router();
router.use(authMiddleware);

// Get all email preferences
router.get('/email-preferences', async (req, res) => {
  try {
    const settings = await UserSettingsService.listForUser(req.user.id);
    const emailPrefs = settings
      .filter(s => s.key.startsWith('email_pref_'))
      .map(s => ({
        kpi_key: s.key.replace('email_pref_', ''),
        ...JSON.parse(s.value || '{}'),
      }));
    res.json(emailPrefs);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update preference for single KPI
router.put('/email-preferences/:kpiKey', async (req, res) => {
  try {
    const { enabled, email } = req.body;
    await UserSettingsService.set(
      req.user.id,
      `email_pref_${req.params.kpiKey}`,
      JSON.stringify({ enabled, email }),
      false
    );
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
```

### Email Queue Table (for failure logging)
```sql
-- Migration: 021_email_notifications
-- Table for logging email delivery attempts (INFRA-03 requirement)

CREATE TABLE IF NOT EXISTS email_queue (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id VARCHAR(100) NOT NULL,
  recipient_email VARCHAR(255) NOT NULL,
  subject VARCHAR(512) NOT NULL,
  template_type VARCHAR(50) NOT NULL,  -- 'kpi_alert', etc.
  template_data JSONB DEFAULT '{}',
  status VARCHAR(20) DEFAULT 'pending',  -- pending, sent, failed
  attempts INTEGER DEFAULT 0,
  last_error TEXT,
  created_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  sent_date TIMESTAMP,
  updated_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_email_queue_user_id ON email_queue(user_id);
CREATE INDEX IF NOT EXISTS idx_email_queue_status ON email_queue(status);
CREATE INDEX IF NOT EXISTS idx_email_queue_created ON email_queue(created_date);

DROP TRIGGER IF EXISTS update_email_queue_updated_date ON email_queue;
CREATE TRIGGER update_email_queue_updated_date BEFORE UPDATE ON email_queue
  FOR EACH ROW EXECUTE FUNCTION update_updated_date_column();
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Custom retry loops | p-retry library | 2020+ | Simpler, more reliable backoff |
| Inline HTML strings | Template literals | Always | Better maintainability |
| Sync email in request | Fire-and-forget async | Always | Don't block user experience |

**Deprecated/outdated:**
- **sendmail transport**: Unreliable, use SMTP instead
- **nodemailer < 6.x**: Major API changes in v6

## Open Questions

Things that couldn't be fully resolved:

1. **SAP BTP Mail Service binding**
   - What we know: BTP has mail service but exact binding pattern unclear
   - What's unclear: Whether VCAP_SERVICES contains SMTP credentials or requires destination service
   - Recommendation: Start with environment variables, add VCAP_SERVICES support if needed

2. **User email source**
   - What we know: Preferences need email address, AuthContext has user object
   - What's unclear: Is email reliably available on user object in production?
   - Recommendation: Allow email in preference object, fall back to user.email

3. **Rate limiting**
   - What we know: Multiple KPIs can breach simultaneously
   - What's unclear: Should we batch alerts or send individually?
   - Recommendation: Send individually for v1 (simpler), consider digest in v2

## Sources

### Primary (HIGH confidence)
- Nodemailer official site (https://nodemailer.com/) - SMTP configuration, API patterns
- Nodemailer GitHub (https://github.com/nodemailer/nodemailer) - Error handling, TLS options
- p-retry GitHub (https://github.com/sindresorhus/p-retry) - Retry API, AbortError pattern

### Secondary (MEDIUM confidence)
- Existing codebase patterns (ThresholdService.js, UserSettingsService.js) - Integration patterns
- Existing migration files - Schema patterns

### Tertiary (LOW confidence)
- SAP BTP mail service - Configuration pattern needs validation at deploy time

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Nodemailer is de-facto standard, p-retry well-established
- Architecture: HIGH - Follows existing codebase patterns (UserSettingsService, fire-and-forget)
- Pitfalls: MEDIUM - Based on general email delivery experience, not project-specific
- SAP BTP integration: LOW - Needs validation during implementation

**Research date:** 2026-01-28
**Valid until:** 2026-02-28 (30 days - stable domain)
