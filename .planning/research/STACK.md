# Technology Stack

**Project:** P&E Manager - KPI Trend Charts and Threshold Notifications
**Researched:** 2026-01-28
**Confidence:** HIGH

## Executive Summary

This milestone adds two new capabilities to the existing bug dashboard:
1. **KPI trend visualization** - Week-over-week line charts showing historical KPI trends
2. **Threshold notifications** - Email alerts when KPIs hit red zone thresholds

**Key decision:** Leverage existing stack (Recharts, Radix Toast, PostgreSQL) and add only email capability. NO new charting libraries, NO complex notification systems. Keep it simple.

---

## New Stack Additions

### Email Sending (REQUIRED - NEW)

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| **nodemailer** | 7.0.13 | Email delivery | Industry standard, 1.4M+ dependents, active maintenance (released 2026-01-27), zero-config for development, supports SMTP/OAuth2 |
| **@react-email/components** | 1.0.6 | Email templates | Type-safe React components for emails, renders to HTML, better DX than raw HTML strings |

**Installation:**
```bash
npm install nodemailer @react-email/components
```

**Why Nodemailer over alternatives:**
- **vs SendGrid/Mailgun:** Vendor-agnostic SMTP means no lock-in, works with any email provider
- **vs Resend (v6.9.1):** Nodemailer has 30x more dependents, proven stability, doesn't require paid API
- **vs EmailEngine:** Overkill for simple threshold alerts - EmailEngine adds webhook infrastructure we don't need

**SAP BTP integration:** Nodemailer works with SAP BTP's mail service binding via SMTP credentials from VCAP_SERVICES. No SAP-specific client needed.

---

### Task Scheduling (REQUIRED - NEW)

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| **node-cron** | 4.2.1 | Scheduled threshold checks | Simple cron syntax, in-process (no external daemon), 5M+ weekly downloads, battle-tested |

**Installation:**
```bash
npm install node-cron
```

**Why node-cron:**
- **vs node-schedule:** More concise cron syntax, simpler API
- **vs Bull/BullMQ:** Overkill - we don't need Redis, queue persistence, or distributed jobs
- **vs Cloud Foundry Tasks:** CF Tasks are for one-off jobs, not recurring schedules

**Use case:** Check KPIs every hour/day and trigger email if thresholds exceeded.

---

## Existing Stack (NO CHANGES NEEDED)

### Charting - Recharts (ALREADY INSTALLED)

| Technology | Version | Purpose | Status |
|------------|---------|---------|--------|
| **recharts** | 2.15.4 | Charts (line, bar, pie) | ✅ ALREADY IN USE |

**Why NO new charting library:**
- Recharts already used for MTTRBarChart and BugCategoryChart
- Recharts LineChart component supports time-series data out-of-box
- Has ResponsiveContainer, XAxis, YAxis, Tooltip, Legend - everything needed for trend charts
- Adding another library (Chart.js, Victory, Nivo) increases bundle size for zero benefit

**Trend chart implementation:**
```jsx
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

// Data from weekly_kpis table
const data = [
  { week: '2601a', mttr: 48, totalBugs: 245 },
  { week: '2601b', mttr: 52, totalBugs: 267 },
  { week: '2602a', mttr: 45, totalBugs: 223 }
];

<LineChart data={data}>
  <Line type="monotone" dataKey="mttr" stroke="#8884d8" />
  <XAxis dataKey="week" />
  <YAxis />
</LineChart>
```

---

### In-App Notifications - Radix Toast (ALREADY INSTALLED)

| Technology | Version | Purpose | Status |
|------------|---------|---------|--------|
| **@radix-ui/react-toast** | 1.2.14 | Toast notifications | ✅ ALREADY INSTALLED |
| **sonner** | 2.0.7 | Toast library | ✅ ALREADY INSTALLED (alternative) |

**Why NO new notification library:**
- Radix Toast primitives already in `/src/components/ui/toast.jsx`
- Sonner (alternative) also already installed
- Both support notification center pattern (persist, dismiss, actions)
- NO need for react-hot-toast, react-toastify, notistack, or any third-party solution

**Notification center implementation:**
```jsx
// Use existing notifications table + Radix Toast
// notifications table already has: message, read, scheduled_date, created_date
// Just add UI component to list/dismiss notifications
```

---

### Database - PostgreSQL (ALREADY CONFIGURED)

| Technology | Version | Purpose | Status |
|------------|---------|---------|--------|
| **pg** | 8.11.3 | PostgreSQL client | ✅ ALREADY IN USE |
| **notifications table** | - | In-app notifications | ✅ ALREADY EXISTS |
| **weekly_kpis table** | - | Pre-calculated KPI history | ✅ ALREADY EXISTS |

**Why NO database changes:**
- `weekly_kpis` table already stores historical KPI data (upload_id, component, kpi_data JSONB)
- `notifications` table already exists (message, read, scheduled_date)
- Just need to:
  1. Query weekly_kpis for trend data (GROUP BY upload_id ORDER BY calculated_at)
  2. Insert notification when threshold exceeded
  3. Send email using nodemailer

**Threshold storage:** Add new table `kpi_thresholds` to store red/yellow/green zones per KPI:
```sql
CREATE TABLE kpi_thresholds (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  kpi_name VARCHAR(100) NOT NULL,  -- 'mttr', 'total_bugs', etc.
  red_min NUMERIC,     -- Red zone starts here
  yellow_min NUMERIC,  -- Yellow zone starts here
  green_max NUMERIC,   -- Green zone ends here
  email_enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

---

## What NOT to Add

### ❌ Chart.js, Victory, Nivo, D3
**Why:** Recharts already installed and sufficient for line charts. Adding another charting library increases bundle size (Chart.js = 200KB, D3 = 500KB+) with no functional benefit.

### ❌ react-notifications, react-toastify, notistack
**Why:** Radix Toast and Sonner already installed. These are duplicative and add unnecessary dependencies.

### ❌ Bull, BullMQ, Agenda (job queues)
**Why:** Overkill for hourly threshold checks. Require Redis or MongoDB. node-cron is sufficient for simple schedules.

### ❌ SendGrid, Mailgun, Postmark clients
**Why:** Vendor lock-in. Nodemailer is SMTP-agnostic, works with any email provider, no recurring API costs.

### ❌ SAP @sap/mail-client
**Why:** Not necessary. Nodemailer works with SAP BTP mail service via standard SMTP credentials from VCAP_SERVICES.

### ❌ WebSockets (Socket.io, Pusher)
**Why:** Real-time notifications not required. Hourly threshold checks via cron + in-app notifications on next page load is sufficient.

### ❌ Redis for caching
**Why:** PostgreSQL query performance adequate. weekly_kpis table is pre-calculated. No latency issues to justify Redis.

---

## Integration Points

### Backend Service Layer

**New service:** `server/services/KPIThresholdService.js`
- `checkThresholds()` - Compare current KPIs to thresholds
- `sendEmailAlert(userId, kpiName, value, threshold)` - Send email via Nodemailer
- `createNotification(userId, message)` - Insert into notifications table

**Email configuration (server/.env.development):**
```env
# Email settings (Nodemailer SMTP)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_SECURE=false
EMAIL_USER=alerts@example.com
EMAIL_PASSWORD=app-specific-password
EMAIL_FROM=P&E Manager Alerts <alerts@example.com>
```

**Scheduled job (server/index.js):**
```javascript
import cron from 'node-cron';
import KPIThresholdService from './services/KPIThresholdService.js';

// Check thresholds every hour
cron.schedule('0 * * * *', async () => {
  console.log('Running threshold check...');
  await KPIThresholdService.checkAllThresholds();
});
```

---

### Frontend Components

**New components:**
1. `src/components/bugs/KPITrendChart.jsx` - Line chart showing week-over-week KPI trends using Recharts
2. `src/components/notifications/NotificationCenter.jsx` - Dropdown showing recent notifications using existing notifications table
3. `src/components/bugs/ThresholdSettings.jsx` - Form to configure red/yellow/green thresholds per KPI

**No new UI library needed:** All components use existing Radix UI primitives (Dialog, Popover, Form, Toast).

---

## Environment Configuration

### Development
```env
# .env.development (backend)
EMAIL_HOST=smtp.mailtrap.io  # Use Mailtrap for dev testing
EMAIL_PORT=2525
EMAIL_USER=dev-user
EMAIL_PASSWORD=dev-password
EMAIL_FROM=dev@pe-manager.local
CRON_ENABLED=false  # Disable cron in dev (manual triggers)
```

### Production (SAP BTP)
```env
# Read from VCAP_SERVICES mail service binding
# No .env needed - credentials auto-injected
```

**SAP BTP mail service:** Bind mail service to backend app, Nodemailer reads from `VCAP_SERVICES`:
```javascript
const vcapServices = JSON.parse(process.env.VCAP_SERVICES || '{}');
const mailService = vcapServices['mail']?.[0]?.credentials;
const emailConfig = {
  host: mailService?.hostname,
  port: mailService?.port,
  auth: {
    user: mailService?.username,
    pass: mailService?.password
  }
};
```

---

## Migration Path

### Phase 1: Trend Charts (No new dependencies)
1. Add KPITrendChart component using existing Recharts
2. Query weekly_kpis table for historical data
3. Display line chart on dashboard

### Phase 2: Email Notifications (Add nodemailer)
1. `npm install nodemailer @react-email/components`
2. Create KPIThresholdService with email sending
3. Add threshold configuration UI
4. Test with Mailtrap in development

### Phase 3: Scheduled Checks (Add node-cron)
1. `npm install node-cron`
2. Add cron job to server/index.js
3. Check thresholds hourly
4. Deploy to SAP BTP with mail service binding

### Phase 4: In-App Notification Center (No new dependencies)
1. Create NotificationCenter component using Radix Popover
2. Query existing notifications table
3. Add bell icon to nav with unread count
4. Mark as read on click

---

## Bundle Size Impact

**Current bundle size:** ~800KB (gzipped: ~250KB)

**New additions:**
- nodemailer: Backend only (no frontend impact)
- @react-email/components: Backend only (no frontend impact)
- node-cron: Backend only (no frontend impact)

**Frontend impact:** 0 bytes (all new features use existing libraries)

---

## Testing Strategy

### Email Testing
- **Development:** Mailtrap.io (free, catches all emails, no real sending)
- **Staging:** Real SMTP with test email addresses
- **Production:** SAP BTP mail service with real recipients

### Notification Testing
- Unit tests for NotificationService (existing pattern)
- Integration tests for threshold checks
- E2E tests for notification center UI

### Chart Testing
- Unit tests for data transformation (weekly_kpis → chart data)
- Snapshot tests for KPITrendChart rendering
- Visual regression tests (optional, use Percy/Chromatic)

---

## Security Considerations

### Email
- **SMTP credentials:** Never commit to git, use environment variables or VCAP_SERVICES
- **Rate limiting:** Limit emails to 1 per KPI per day (prevent spam)
- **Recipient validation:** Only send to verified user emails in database
- **Content sanitization:** Escape user input in email templates (XSS prevention)

### Scheduled Jobs
- **Error handling:** Catch exceptions in cron jobs (prevent crash loops)
- **Logging:** Log all threshold checks and email sends (audit trail)
- **Idempotency:** Don't send duplicate emails (check last_notified_at timestamp)

---

## Alternatives Considered

### Charting Libraries
| Library | Pros | Cons | Decision |
|---------|------|------|----------|
| Recharts | Already installed, React-native, composable | - | ✅ USE THIS |
| Chart.js | Popular, feature-rich | 200KB, not React-native | ❌ Skip |
| Victory | Highly customizable | 300KB, steep learning curve | ❌ Skip |
| Nivo | Beautiful defaults | 500KB, opinionated | ❌ Skip |

### Email Libraries
| Library | Pros | Cons | Decision |
|---------|------|------|----------|
| Nodemailer | Universal SMTP, 1.4M dependents | Lower-level API | ✅ USE THIS |
| SendGrid | Easy API, reliable | Vendor lock-in, costs $$ | ❌ Skip |
| Resend | Modern API, good DX | New (less proven), requires API key | ❌ Skip |
| EmailEngine | Feature-rich, webhooks | Overkill for alerts | ❌ Skip |

### Task Scheduling
| Library | Pros | Cons | Decision |
|---------|------|------|----------|
| node-cron | Simple, in-process | Single-instance only | ✅ USE THIS |
| node-schedule | Flexible API | More complex | ❌ Skip |
| Bull/BullMQ | Distributed, persistent | Requires Redis | ❌ Skip |
| CF Tasks | Cloud-native | One-off only (not recurring) | ❌ Skip |

---

## Sources

### Official Documentation
- Nodemailer GitHub (verified 2026-01-28): https://github.com/nodemailer/nodemailer
- Nodemailer v7.0.13 (latest, released 2026-01-27)
- Recharts documentation: Already in use (v2.15.4)
- Radix Toast: Already installed (v1.2.14)
- node-cron npm package: v4.2.1 (verified via npm registry)

### Package Verification
- Nodemailer: 1.4M+ dependent repositories on GitHub
- node-cron: 5M+ weekly downloads on npm
- @react-email/components: v1.0.6 (verified via npm registry)
- Resend: v6.9.1 (considered but rejected)

### Confidence Assessment
- **Email solution:** HIGH (Nodemailer is industry standard, actively maintained, recent release)
- **Charting:** HIGH (Recharts already in use, proven for time-series)
- **Scheduling:** HIGH (node-cron is simple, widely adopted)
- **Notifications:** HIGH (Radix Toast already installed and sufficient)

---

## Summary

**Total new dependencies:** 3 (all backend, zero frontend impact)
- nodemailer (7.0.13)
- @react-email/components (1.0.6)
- node-cron (4.2.1)

**Total bundle size increase:** 0 bytes (frontend)
**Backend runtime increase:** ~5MB (Nodemailer + dependencies)

**Stack philosophy:** Maximize existing investments (Recharts, Radix, PostgreSQL), minimize new dependencies. Only add email capability (Nodemailer) and scheduling (node-cron) which are unavoidable requirements.
