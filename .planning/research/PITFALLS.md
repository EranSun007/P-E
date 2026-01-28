# Domain Pitfalls: Adding KPI Trends and Notifications

**Domain:** Bug Dashboard with KPI Trend Visualization and Notification System
**Researched:** 2026-01-28
**Context:** Adding trend charts and notifications to existing React dashboard with weekly CSV uploads

## Critical Pitfalls

Mistakes that cause rewrites, data loss, or major architectural issues.

### Pitfall 1: Time Series Data Model Mismatch

**What goes wrong:** Adding trend charts without restructuring the data model for time-series queries. Current schema stores KPIs in JSONB blobs (`weekly_kpis.kpi_data`), which prevents efficient historical queries and chart rendering.

**Why it happens:**
- Existing system designed for single-point-in-time analysis (per upload)
- JSONB storage optimized for current week, not historical trends
- No time-series indexes (GIN/GiST on JSONB doesn't help with temporal queries)
- Query pattern becomes "scan all uploads, parse all JSONB" (O(n) with uploads)

**Consequences:**
- Chart rendering times explode as historical data grows (500ms → 5s+)
- PostgreSQL can't optimize JSONB time-series queries effectively
- Forced to fetch all data to frontend and calculate there (defeats backend purpose)
- Impossible to add "show last 12 weeks" without full table scan

**Prevention:**
1. **Normalize KPI data into columns or time-series table**
   ```sql
   CREATE TABLE kpi_history (
     id UUID PRIMARY KEY,
     user_id VARCHAR(255),
     upload_id UUID REFERENCES bug_uploads(id),
     week_ending DATE,
     kpi_name VARCHAR(50),  -- 'bug_inflow_rate', 'mttr_vh', etc.
     kpi_value NUMERIC,
     component VARCHAR(100),
     metadata JSONB,
     created_at TIMESTAMP DEFAULT NOW()
   );
   CREATE INDEX idx_kpi_history_time_series
     ON kpi_history (user_id, kpi_name, component, week_ending);
   ```

2. **Add migration to backfill from existing JSONB**
   - Extract all KPIs from `weekly_kpis.kpi_data` JSONB
   - Insert into normalized structure
   - Keep JSONB for dashboard UI (current week), use normalized for trends

3. **Design API for time-series from day one**
   ```javascript
   GET /api/bugs/kpis/trends?kpi=bug_inflow_rate&weeks=12&component=all
   // Returns array of {week_ending, value}
   ```

**Detection:** Query slow (>500ms) once you have >10 uploads, or you're fetching all KPIs to frontend for charting.

**Phase to address:** Phase 1 (Data Model) - must precede chart implementation.

---

### Pitfall 2: Chart Re-render Thrashing

**What goes wrong:** React charts (Recharts) re-render on every parent state change, causing UI freezes and dropped frames. With multiple trend charts on the same page, the compound effect causes 200-500ms jank on filter changes.

**Why it happens:**
- Recharts components are expensive to render (SVG path calculations)
- Parent dashboard updates filters → all charts re-render even if data unchanged
- No memoization of chart data transformations
- Loading multiple charts simultaneously blocks the main thread

**Consequences:**
- Selecting a filter dropdown feels sluggish (visible delay)
- Scrolling dashboard with visible charts causes dropped frames
- Mobile devices become nearly unusable
- User perception: "The new features made the app slower"

**Prevention:**
1. **Memoize chart data transformations**
   ```javascript
   const chartData = useMemo(() => {
     return kpiTrends.map(week => ({
       date: format(new Date(week.week_ending), 'MMM d'),
       value: week.value,
       status: getThresholdStatus(week.value)
     }));
   }, [kpiTrends]); // Only recompute if actual data changes
   ```

2. **Wrap charts in React.memo with custom comparison**
   ```javascript
   const TrendChart = React.memo(({ data, title }) => {
     return <ResponsiveContainer>...</ResponsiveContainer>;
   }, (prevProps, nextProps) => {
     // Only re-render if data actually changed
     return prevProps.data === nextProps.data;
   });
   ```

3. **Lazy load off-screen charts**
   ```javascript
   import { lazy, Suspense } from 'react';
   const TrendChart = lazy(() => import('./TrendChart'));

   // In component
   <Suspense fallback={<ChartSkeleton />}>
     <TrendChart data={data} />
   </Suspense>
   ```

4. **Limit chart complexity**
   - Max 52 data points (1 year weekly data) per chart
   - Aggregate older data into monthly buckets
   - Use `<Line>` not `<Area>` for simpler SVG paths
   - Disable animations on trend charts (only needed for dashboard KPI cards)

**Detection:**
- React DevTools Profiler shows chart components taking >50ms to render
- Filters/dropdowns have visible delay between click and update
- Browser performance timeline shows long tasks (>50ms) during state updates

**Phase to address:** Phase 2 (Chart Implementation) - add memoization from start.

---

### Pitfall 3: Email Notifications Without Delivery Infrastructure

**What goes wrong:** Adding email notifications without properly configuring SAP BTP email service, SMTP credentials, or error handling. Emails silently fail in production, users never receive alerts, and you only discover it weeks later.

**Why it happens:**
- SAP BTP doesn't include SMTP service by default (must bind separately)
- Development uses nodemailer with fake SMTP that "succeeds" without sending
- No monitoring/logging of email delivery failures
- Missing retry logic for transient failures (SMTP timeouts, rate limits)
- Email service credentials expire or get rotated without warning

**Consequences:**
- Users configure thresholds but never receive alerts (trust broken)
- P0 bug threshold breaches go unnoticed (defeats purpose)
- Email queue grows unbounded on persistent failures (memory leak)
- Manual support tickets: "I never got the alert email"

**Prevention:**
1. **Use SAP BTP Mail Service or external provider from day one**
   ```javascript
   // manifest.yml
   services:
     - pe-manager-postgres
     - pe-manager-mail  // SAP Mail service instance

   // server/services/EmailService.js
   import { getServices } from '@sap/xsenv';
   const mailService = getServices({ mail: { tag: 'mail' } });
   ```

2. **Implement email queue with retry logic**
   ```javascript
   // Don't send email synchronously in request handler
   // Queue for async processing with retries

   class EmailQueue {
     async enqueue(email) {
       await query(`
         INSERT INTO email_queue (user_id, to_email, subject, body, attempts)
         VALUES ($1, $2, $3, $4, 0)
       `, [userId, email, subject, body]);
     }

     async processQueue() {
       // Background job: every 1 minute
       const pending = await query(`
         SELECT * FROM email_queue
         WHERE sent_at IS NULL AND attempts < 3
         ORDER BY created_at ASC
         LIMIT 10
       `);

       for (const email of pending.rows) {
         try {
           await this.sendEmail(email);
           await query(`UPDATE email_queue SET sent_at = NOW() WHERE id = $1`, [email.id]);
         } catch (err) {
           await query(`
             UPDATE email_queue
             SET attempts = attempts + 1, last_error = $2
             WHERE id = $1
           `, [email.id, err.message]);
         }
       }
     }
   }
   ```

3. **Add email_queue table to schema**
   ```sql
   CREATE TABLE email_queue (
     id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
     user_id VARCHAR(255) NOT NULL,
     to_email VARCHAR(255) NOT NULL,
     subject VARCHAR(255) NOT NULL,
     body TEXT NOT NULL,
     attempts INTEGER DEFAULT 0,
     sent_at TIMESTAMP,
     last_error TEXT,
     created_at TIMESTAMP DEFAULT NOW()
   );
   CREATE INDEX idx_email_queue_pending ON email_queue(sent_at) WHERE sent_at IS NULL;
   ```

4. **Comprehensive error handling and logging**
   ```javascript
   try {
     await emailService.send(email);
     logger.info('Email sent', { to: email.to, subject: email.subject });
   } catch (err) {
     logger.error('Email failed', {
       error: err.message,
       code: err.code,  // SMTP error codes
       to: email.to
     });
     // Don't throw - queue for retry
   }
   ```

5. **Health check endpoint for email service**
   ```javascript
   // GET /api/health/email
   async healthCheckEmail() {
     try {
       await emailService.verify(); // SMTP connection test
       return { status: 'healthy', service: 'email' };
     } catch (err) {
       return { status: 'unhealthy', error: err.message };
     }
   }
   ```

**Detection:**
- Emails don't arrive in inbox/spam during testing
- SAP BTP logs show "Connection refused" or "Authentication failed"
- No email-related logs in application logs (means not even attempting)

**Phase to address:** Phase 3 (Email Setup) - infrastructure before notification logic.

---

### Pitfall 4: Notification Spam and Fatigue

**What goes wrong:** Sending notifications on every CSV upload without debouncing or smart batching. User uploads 3 CSVs (fixing errors), gets 3 identical "MTTR threshold exceeded" emails in 5 minutes. Users disable all notifications.

**Why it happens:**
- Threshold checks run on every upload (makes sense for data consistency)
- No deduplication logic ("already sent this notification today")
- No batching of multiple threshold breaches into single email
- No user preference for notification frequency (immediate vs daily digest)

**Consequences:**
- Email fatigue → users ignore/delete without reading
- Important alerts buried in noise (P0 bugs lost among Medium priority noise)
- Support requests to "turn off all these emails"
- Defeats purpose of notification system

**Prevention:**
1. **Add notification_sent tracking table**
   ```sql
   CREATE TABLE notification_log (
     id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
     user_id VARCHAR(255) NOT NULL,
     notification_type VARCHAR(50), -- 'threshold_breach', 'weekly_summary'
     kpi_name VARCHAR(50),
     sent_at TIMESTAMP DEFAULT NOW(),
     metadata JSONB
   );
   CREATE INDEX idx_notification_log_recent
     ON notification_log(user_id, notification_type, sent_at DESC);
   ```

2. **Implement smart notification logic**
   ```javascript
   async shouldSendNotification(userId, kpiName, currentValue, threshold) {
     // Check if already sent in last 24 hours
     const recent = await query(`
       SELECT id FROM notification_log
       WHERE user_id = $1
         AND notification_type = 'threshold_breach'
         AND kpi_name = $2
         AND sent_at > NOW() - INTERVAL '24 hours'
       LIMIT 1
     `, [userId, kpiName]);

     if (recent.rows.length > 0) {
       return false; // Already notified recently
     }

     // Check if value significantly changed (>10% change)
     const lastNotification = await getLastNotificationValue(userId, kpiName);
     if (lastNotification && Math.abs(currentValue - lastNotification) < threshold * 0.1) {
       return false; // Value hasn't changed meaningfully
     }

     return true;
   }
   ```

3. **Batch multiple breaches into single email**
   ```javascript
   async sendWeeklyDigest(userId) {
     // Check all thresholds, collect breaches
     const breaches = await getAllThresholdBreaches(userId);

     if (breaches.length === 0) return;

     // Group by severity
     const critical = breaches.filter(b => b.status === 'red');
     const warnings = breaches.filter(b => b.status === 'yellow');

     // Single email with sections
     await emailService.send({
       to: user.email,
       subject: `Bug Dashboard Alert: ${critical.length} critical issues`,
       body: renderDigestTemplate({ critical, warnings, weekEnding })
     });
   }
   ```

4. **User preferences for notification frequency**
   ```javascript
   // user_settings table
   notification_preferences: {
     threshold_alerts: 'immediate', // or 'daily', 'weekly', 'off'
     summary_emails: 'weekly',
     min_severity: 'yellow' // Don't notify for green zone
   }
   ```

5. **Rate limiting per notification type**
   ```javascript
   // Max 1 email per KPI per day
   // Max 5 total notification emails per user per day
   ```

**Detection:**
- User complaints about too many emails
- Email open rates <20% (normal is 30-40%)
- Multiple notifications sent within 5 minutes for same KPI

**Phase to address:** Phase 4 (Notification Logic) - before enabling for production users.

---

## Moderate Pitfalls

Mistakes that cause delays, poor UX, or technical debt.

### Pitfall 5: In-App Notification State Management Complexity

**What goes wrong:** Adding in-app notifications (toast messages, bell icon badge) without centralized state management. Notification state scattered across components, causing:
- Badge count wrong after dismissing notification
- Stale notifications showing after refresh
- No way to mark all as read
- Duplicate notifications rendered

**Prevention:**
1. **Use existing NotificationService and React Context**
   ```javascript
   // src/contexts/NotificationContext.jsx
   const NotificationContext = createContext();

   export function NotificationProvider({ children }) {
     const [notifications, setNotifications] = useState([]);
     const [unreadCount, setUnreadCount] = useState(0);

     const fetchNotifications = async () => {
       const data = await apiClient.notifications.list();
       setNotifications(data);
       setUnreadCount(data.filter(n => !n.is_read).length);
     };

     const markAsRead = async (id) => {
       await apiClient.notifications.update(id, { is_read: true });
       await fetchNotifications(); // Refresh
     };

     useEffect(() => {
       fetchNotifications();
       const interval = setInterval(fetchNotifications, 60000); // Poll every minute
       return () => clearInterval(interval);
     }, []);

     return (
       <NotificationContext.Provider value={{
         notifications,
         unreadCount,
         markAsRead,
         refresh: fetchNotifications
       }}>
         {children}
       </NotificationContext.Provider>
     );
   }
   ```

2. **Existing notifications table already in schema** (lines 1-61 in notifications.js)
   - Don't recreate infrastructure
   - Extend existing NotificationService for threshold alerts

3. **Badge count in navigation**
   ```javascript
   const { unreadCount } = useNotifications();
   <Bell className="h-4 w-4" />
   {unreadCount > 0 && <span className="badge">{unreadCount}</span>}
   ```

**Detection:** Badge count doesn't update, or shows wrong number after actions.

**Phase to address:** Phase 5 (In-App Notifications) - UI layer.

---

### Pitfall 6: Threshold Configuration Without Validation

**What goes wrong:** Users can set thresholds that make no sense (yellow > red, negative values, thresholds beyond data range). Leads to constant false positives or notifications never triggering.

**Prevention:**
1. **Validation in threshold settings form**
   ```javascript
   const thresholdSchema = z.object({
     kpi_name: z.string(),
     yellow_threshold: z.number().positive(),
     red_threshold: z.number().positive(),
   }).refine(data => {
     // Yellow must be better than red
     if (data.kpi_name === 'mttr_vh') {
       return data.yellow_threshold < data.red_threshold; // Lower is better
     } else if (data.kpi_name === 'backlog_health_score') {
       return data.yellow_threshold > data.red_threshold; // Higher is better
     }
     return true;
   }, {
     message: "Threshold ordering is invalid"
   });
   ```

2. **Store threshold direction metadata**
   ```javascript
   const KPI_METADATA = {
     mttr_vh: {
       direction: 'lower_is_better',
       unit: 'hours',
       typical_range: [0, 48]
     },
     backlog_health_score: {
       direction: 'higher_is_better',
       unit: 'score',
       typical_range: [0, 100]
     }
   };
   ```

3. **Show suggested thresholds based on historical data**
   ```javascript
   // Calculate p75, p90 from last 12 weeks
   // Suggest yellow = p75, red = p90
   ```

**Detection:** Users report "never getting alerts" or "getting alerts when things look fine".

**Phase to address:** Phase 6 (Threshold UI) - add validation before allowing input.

---

### Pitfall 7: Missing Historical Context in Alerts

**What goes wrong:** Email says "MTTR is 36 hours" but doesn't show if this is getting better, worse, or how it compares to average. User can't assess urgency without opening dashboard.

**Prevention:**
1. **Include trend context in email**
   ```javascript
   emailTemplate = `
     MTTR for Very High priority bugs: 36 hours (RED)
     - Your threshold: 24 hours
     - Last week: 28 hours (↑ 29%)
     - 4-week average: 22 hours

     This is the worst MTTR in 8 weeks. [View Dashboard →]
   `;
   ```

2. **Inline sparkline charts in email (optional)**
   - Use Chart.js or similar to generate PNG
   - Embed as inline image in HTML email

3. **Link directly to relevant chart**
   ```javascript
   const dashboardLink = `${frontendUrl}/bugs?highlight=mttr_vh&scroll=trends`;
   ```

**Detection:** Email click-through rates are low (users can't tell if they need to act).

**Phase to address:** Phase 4 (Notification Logic) - enhance email content.

---

### Pitfall 8: Performance Degradation on Weekly Upload

**What goes wrong:** CSV upload takes 30+ seconds once you add:
- Historical KPI calculations for trends
- Notification threshold checks
- Email sending
All running synchronously in the upload request.

**Prevention:**
1. **Split upload into phases**
   ```javascript
   async uploadCSV(userId, fileBuffer, filename, weekEnding) {
     // Phase 1: Parse and store (synchronous)
     const uploadId = await this.storeUploadData(userId, fileBuffer, ...);

     // Phase 2: Background processing
     // Don't await - return immediately to user
     this.processUploadBackground(uploadId, userId).catch(err => {
       logger.error('Background processing failed', { uploadId, error: err });
     });

     return { uploadId, status: 'processing' };
   }

   async processUploadBackground(uploadId, userId) {
     // Calculate KPIs
     await this.calculateKPIs(uploadId);

     // Check thresholds and send notifications
     await this.checkThresholdsAndNotify(uploadId, userId);
   }
   ```

2. **Add processing status to bug_uploads table**
   ```sql
   ALTER TABLE bug_uploads ADD COLUMN processing_status VARCHAR(20) DEFAULT 'pending';
   -- Values: 'pending', 'calculating', 'complete', 'error'
   ```

3. **Show processing indicator in UI**
   ```javascript
   if (upload.processing_status === 'pending') {
     return <div>Calculating KPIs... <Loader2 className="animate-spin" /></div>;
   }
   ```

**Detection:** CSV upload request takes >10 seconds, UI feels sluggish.

**Phase to address:** Phase 2 (Data Model) - design for async from start.

---

### Pitfall 9: No Notification Unsubscribe Mechanism

**What goes wrong:** Users have no way to disable notifications except contacting support. Violates email best practices and could flag as spam.

**Prevention:**
1. **Add notification preferences to user settings**
   ```javascript
   // In existing UserSettingsService
   notification_preferences: {
     email_enabled: true,
     threshold_alerts: ['mttr_vh', 'sla_compliance'], // Which KPIs to alert on
     frequency: 'immediate', // or 'daily_digest'
   }
   ```

2. **Unsubscribe link in every email**
   ```javascript
   emailTemplate += `
     <hr>
     <small>
       <a href="${frontendUrl}/settings/notifications?token=${unsubToken}">
         Manage notification preferences
       </a>
     </small>
   `;
   ```

3. **One-click unsubscribe (RFC 8058)**
   ```javascript
   headers: {
     'List-Unsubscribe': `<${apiUrl}/unsubscribe?token=${token}>`,
     'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click'
   }
   ```

**Detection:** Users report "can't turn off emails" or mark emails as spam.

**Phase to address:** Phase 4 (Notification Logic) - must have before sending to users.

---

## Minor Pitfalls

Mistakes that cause annoyance but are easily fixable.

### Pitfall 10: Chart Accessibility Issues

**What goes wrong:** Charts are pure visual (SVG) without text alternatives. Screen readers can't interpret data, keyboard navigation doesn't work.

**Prevention:**
1. **Add ARIA labels to charts**
   ```javascript
   <ResponsiveContainer aria-label="MTTR trend chart showing weekly values">
     <LineChart data={data} aria-describedby="chart-description">
       ...
     </LineChart>
   </ResponsiveContainer>
   <div id="chart-description" className="sr-only">
     Line chart showing MTTR trend over 12 weeks, from {firstWeek} to {lastWeek}.
     Current value is {currentValue} hours.
   </div>
   ```

2. **Provide data table alternative**
   ```javascript
   <details>
     <summary>View data table</summary>
     <table>
       <thead><tr><th>Week</th><th>Value</th></tr></thead>
       <tbody>
         {data.map(d => <tr><td>{d.week}</td><td>{d.value}</td></tr>)}
       </tbody>
     </table>
   </details>
   ```

**Detection:** Run Lighthouse accessibility audit, or test with screen reader.

**Phase to address:** Phase 2 (Chart Implementation) - add as part of component creation.

---

### Pitfall 11: Date/Time Zone Confusion in Trends

**What goes wrong:** CSV uploaded in timezone A, displayed in timezone B, weekly groupings get misaligned (Friday bugs show up in next week).

**Prevention:**
1. **Store all dates in UTC** (already done in schema: `created_date TIMESTAMP`)
2. **Week boundaries use UTC** (Saturday 00:00 UTC = end of week)
3. **Display in user's timezone, but calculate in UTC**
   ```javascript
   // In chart data transformation
   const weekLabel = formatInTimeZone(
     new Date(row.week_ending),
     userTimezone,
     'MMM d'
   );
   ```

4. **Document timezone behavior in UI**
   ```
   "All dates displayed in your local timezone (PST).
    Weekly boundaries calculated in UTC."
   ```

**Detection:** Users report "bugs from Friday showing in wrong week".

**Phase to address:** Phase 2 (Chart Implementation) - clarify from start.

---

### Pitfall 12: No Loading States for Trend Charts

**What goes wrong:** Trend chart area is blank for 2-3 seconds during data fetch, users think it's broken.

**Prevention:**
1. **Chart skeleton loader**
   ```javascript
   {trendDataLoading ? (
     <Card>
       <CardHeader><Skeleton className="h-6 w-32" /></CardHeader>
       <CardContent>
         <Skeleton className="h-64 w-full" />
       </CardContent>
     </Card>
   ) : (
     <TrendChart data={trendData} />
   )}
   ```

2. **Stale-while-revalidate pattern**
   ```javascript
   // Show cached data immediately, fetch in background
   const [data, setData] = useState(cachedData);
   useEffect(() => {
     fetchTrendData().then(fresh => {
       setData(fresh);
       updateCache(fresh);
     });
   }, [filters]);
   ```

**Detection:** Blank chart areas during loading.

**Phase to address:** Phase 2 (Chart Implementation) - add with initial component.

---

## Phase-Specific Warnings

| Phase Topic | Likely Pitfall | Mitigation |
|-------------|---------------|------------|
| Phase 1: Data Model | Time series schema mismatch (Pitfall 1) | Normalize KPI data into time-series table before implementing charts |
| Phase 2: Trend Charts | Chart re-render thrashing (Pitfall 2) | Memoize data transformations, use React.memo, limit data points |
| Phase 3: Email Setup | Silent email failures (Pitfall 3) | Configure SAP BTP Mail service, add email queue with retries |
| Phase 4: Notification Logic | Notification spam (Pitfall 4) | Implement deduplication, batching, and rate limiting |
| Phase 5: In-App Notifications | State management chaos (Pitfall 5) | Use existing NotificationService + React Context |
| Phase 6: Threshold UI | Invalid threshold configs (Pitfall 6) | Add validation, show suggested values, prevent nonsensical inputs |
| Phase 7: Testing | Performance regression on upload (Pitfall 8) | Move heavy calculations to background, add status tracking |

---

## Critical Integration Points (Existing System)

**Don't break these:**

1. **Weekly CSV upload workflow**
   - Current: Synchronous parse → store → calculate → return
   - With trends: Must stay under 10s for UX, move heavy work to background

2. **BugService.calculateKPIs() is called on every upload**
   - Currently stores in JSONB (`weekly_kpis.kpi_data`)
   - Must also populate normalized time-series table for trend queries

3. **Existing notification infrastructure** (NotificationService + routes)
   - Don't create duplicate notification system
   - Extend for threshold alerts

4. **Multi-tenancy via user_id**
   - All time-series queries MUST filter by user_id
   - All notifications MUST filter by user_id
   - Email queue MUST be per-user

5. **Recharts already used** (MTTRBarChart, BugCategoryChart)
   - Performance patterns established (ResponsiveContainer, Cell colors)
   - Use same patterns for trend charts

---

## Sources and Confidence

**Confidence:** HIGH - Based on codebase analysis and domain knowledge of:
- PostgreSQL time-series data modeling
- React performance optimization (Recharts memoization)
- Email notification systems in Node.js/Express
- SAP BTP Cloud Foundry deployment constraints

**Evidence:**
- Analyzed existing BugService.js (weekly upload pattern, JSONB KPI storage)
- Analyzed existing BugDashboard.jsx (filter state management, Recharts usage)
- Analyzed existing NotificationService (infrastructure already present)
- Analyzed database schema (019_bug_dashboard.sql - no time-series indexes)
- Reviewed package.json (Recharts 2.15.1, React 18.2.0, pg 8.11.3)

**Low confidence areas:**
- SAP BTP Mail service configuration specifics (would need to verify service catalog)
- Exact email delivery rates and spam filter behavior (depends on domain reputation)

These pitfalls are specific to this project's architecture (weekly CSV uploads, PostgreSQL JSONB KPIs, Recharts on React, SAP BTP deployment) and reflect actual integration challenges, not generic advice.
