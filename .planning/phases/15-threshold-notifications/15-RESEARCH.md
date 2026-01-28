# Phase 15: Threshold Detection & In-App Notifications - Research

**Researched:** 2026-01-28
**Domain:** Backend threshold detection, in-app notification system, React UI components
**Confidence:** HIGH

## Summary

Phase 15 implements threshold detection when KPIs cross into the red zone during CSV upload, creates in-app notifications, and displays them via a notification bell in the header. The existing codebase provides excellent foundation: KPI_THRESHOLDS and getKPIStatus() in KPICard.jsx, NotificationService with CRUD operations, and Radix UI components (Popover, ScrollArea, Badge) for the notification panel.

The implementation follows a fire-and-forget pattern where threshold evaluation runs asynchronously after upload completes. Notification deduplication uses a 24-hour window query to prevent spam on re-uploads. The existing notifications table schema is sufficient with minor enhancement for notification type classification.

**Primary recommendation:** Extend BugService.uploadCSV() with post-upload threshold check that calls NotificationService.create() for red-zone KPIs, add a dedicated ThresholdService for separation of concerns, create NotificationBell component using Radix Popover for the header UI.

## Standard Stack

The established libraries/tools for this domain:

### Core (Already in Codebase)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| @radix-ui/react-popover | Latest | Notification dropdown panel | Already used for other popovers |
| @radix-ui/react-scroll-area | Latest | Scrollable notification list | Already available in UI components |
| lucide-react | Latest | Bell icon with count badge | Already used throughout app |
| date-fns | Latest | 24-hour window calculation | Already used in CSV upload |

### Supporting (Already Available)
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| class-variance-authority | Latest | Badge variants | For unread count styling |
| cn (tailwind-merge) | Latest | Conditional classes | Styling notification items |

### No New Dependencies Required
This phase uses only existing libraries. No npm installs needed.

**Installation:**
```bash
# No new packages required - all dependencies already present
```

## Architecture Patterns

### Recommended Project Structure
```
server/
├── services/
│   ├── NotificationService.js    # Extended with new methods
│   └── ThresholdService.js       # NEW: KPI threshold evaluation logic
├── routes/
│   └── notifications.js          # Extended with unread count endpoint

src/
├── components/
│   └── notifications/            # NEW directory
│       ├── NotificationBell.jsx  # Bell icon with badge
│       └── NotificationPanel.jsx # Dropdown with notification list
├── contexts/
│   └── NotificationContext.jsx   # NEW: Notification state management
```

### Pattern 1: Fire-and-Forget Threshold Detection
**What:** Threshold evaluation runs asynchronously after upload succeeds, doesn't block upload response
**When to use:** After BugService.uploadCSV() completes successfully
**Example:**
```javascript
// In bugs.js route, after successful upload
router.post('/upload', upload.single('csvFile'), async (req, res) => {
  try {
    const result = await BugService.uploadCSV(
      req.user.id, req.file.buffer, req.file.originalname, weekEnding
    );

    // Return response immediately
    res.json(result);

    // Fire-and-forget threshold check (async, no await)
    ThresholdService.evaluateAndNotify(req.user.id, result.kpis, weekEnding)
      .catch(err => console.error('Threshold notification failed:', err));

  } catch (error) {
    // ... error handling
  }
});
```

### Pattern 2: 24-Hour Deduplication Window
**What:** Before creating notification, check if same KPI alert exists within last 24 hours
**When to use:** Prevent spam when user re-uploads or uploads multiple weeks
**Example:**
```javascript
// In ThresholdService
async createNotificationIfNotDuplicate(userId, kpiKey, weekEnding) {
  const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000); // 24 hours ago

  const existing = await query(`
    SELECT id FROM notifications
    WHERE user_id = $1
      AND notification_type = 'kpi_alert'
      AND metadata->>'kpi_key' = $2
      AND created_date > $3
    LIMIT 1
  `, [userId, kpiKey, cutoff.toISOString()]);

  if (existing.rows.length === 0) {
    await NotificationService.create(userId, {
      message: `KPI Alert: ${KPI_LABELS[kpiKey]} has crossed into the red zone`,
      notification_type: 'kpi_alert',
      metadata: { kpi_key: kpiKey, week_ending: weekEnding }
    });
  }
}
```

### Pattern 3: Optimistic UI for Mark-as-Read
**What:** Update UI immediately when marking notification read, reconcile with server
**When to use:** Better UX, instant feedback for user action
**Example:**
```javascript
// In NotificationContext
const markAsRead = async (notificationId) => {
  // Optimistic update
  setNotifications(prev =>
    prev.map(n => n.id === notificationId ? { ...n, read: true } : n)
  );

  try {
    await Notification.update(notificationId, { read: true });
  } catch (error) {
    // Rollback on failure
    setNotifications(prev =>
      prev.map(n => n.id === notificationId ? { ...n, read: false } : n)
    );
  }
};
```

### Anti-Patterns to Avoid
- **Blocking upload on notification creation:** Never await notification creation in upload flow - use fire-and-forget
- **Polling for notifications:** Don't poll server - fetch on mount and after user actions
- **Storing threshold values in DB:** Thresholds are in KPICard.jsx - keep them in code per STATE.md decision
- **Creating service for each notification type:** Single NotificationService handles all types via notification_type field

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| KPI status evaluation | Custom threshold logic | getKPIStatus() from KPICard.jsx | Already handles all 5 KPIs with proper comparison logic |
| Notification dropdown | Custom dropdown | Radix Popover + ScrollArea | Accessibility, animations, portal handling |
| Badge count styling | Manual CSS | Badge component + destructive variant | Consistent with existing UI patterns |
| Date comparison | Manual date math | date-fns isWithinInterval | Handles edge cases, timezone-safe |

**Key insight:** The KPI threshold logic is already implemented and tested in KPICard.jsx. Import and reuse getKPIStatus() and KPI_THRESHOLDS on the backend by extracting to a shared module or duplicating the minimal logic needed.

## Common Pitfalls

### Pitfall 1: Race Condition in Deduplication
**What goes wrong:** Two uploads for same week in quick succession both pass deduplication check and create duplicate notifications
**Why it happens:** Database query returns false for both before either insert completes
**How to avoid:** Use database-level uniqueness constraint or SELECT FOR UPDATE with transaction
**Warning signs:** Multiple identical notifications appearing for same KPI on re-upload

### Pitfall 2: Notification Count Mismatch
**What goes wrong:** Badge shows wrong count after marking read
**Why it happens:** Local state out of sync with server, especially after network errors
**How to avoid:** Re-fetch unread count after any mutation, use React Query or similar
**Warning signs:** Count doesn't update after clicking "mark as read"

### Pitfall 3: Memory Leak in Notification Context
**What goes wrong:** Notification fetching continues after component unmount
**Why it happens:** Async operation completes after unmount, tries to setState
**How to avoid:** Use AbortController for fetch, cleanup in useEffect return
**Warning signs:** "Can't perform a React state update on an unmounted component" warning

### Pitfall 4: Threshold Thresholds Drift
**What goes wrong:** Backend uses different thresholds than frontend KPICard.jsx
**Why it happens:** Thresholds duplicated instead of shared, one gets updated
**How to avoid:** Extract KPI_THRESHOLDS to shared constants file importable by both frontend and backend
**Warning signs:** Notifications fire for KPIs that appear yellow/green on dashboard

### Pitfall 5: Notification Flooding on Bulk Upload
**What goes wrong:** User uploads 12 weeks of historical data, gets 60 notifications
**Why it happens:** Each week with red KPI triggers notification
**How to avoid:** 24-hour deduplication window per KPI (not per week)
**Warning signs:** Notification count jumps dramatically after historical data upload

## Code Examples

Verified patterns from official sources and existing codebase:

### Notification Bell Component Structure
```jsx
// Source: Codebase pattern from Layout.jsx header area
import { Bell } from 'lucide-react';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';

function NotificationBell({ unreadCount, notifications, onMarkRead }) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button className="relative p-2 rounded-full hover:bg-gray-100">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-red-500 text-white text-xs flex items-center justify-center">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <div className="p-3 border-b">
          <h3 className="font-semibold">Notifications</h3>
        </div>
        <ScrollArea className="h-[300px]">
          {notifications.map(notification => (
            <NotificationItem
              key={notification.id}
              notification={notification}
              onMarkRead={onMarkRead}
            />
          ))}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
```

### Threshold Evaluation Logic
```javascript
// Source: KPICard.jsx getKPIStatus pattern
// Backend-compatible version for ThresholdService

const KPI_THRESHOLDS = {
  bug_inflow_rate: { type: 'lower_is_better', green: 6, yellow: 8 },
  median_ttfr_hours: { type: 'lower_is_better', green: 24, yellow: 48 },
  sla_vh_percent: { type: 'higher_is_better', green: 80, yellow: 60 },
  sla_high_percent: { type: 'higher_is_better', green: 80, yellow: 60 },
  backlog_health_score: { type: 'higher_is_better', green: 70, yellow: 50 }
};

function getKPIStatus(kpiKey, value) {
  const threshold = KPI_THRESHOLDS[kpiKey];
  if (!threshold || value === null || value === undefined) return 'neutral';

  if (threshold.type === 'lower_is_better') {
    if (value <= threshold.green) return 'green';
    if (value <= threshold.yellow) return 'yellow';
    return 'red';
  } else {
    if (value >= threshold.green) return 'green';
    if (value >= threshold.yellow) return 'yellow';
    return 'red';
  }
}
```

### Database Schema Extension
```sql
-- Add columns to existing notifications table
ALTER TABLE notifications
ADD COLUMN IF NOT EXISTS notification_type VARCHAR(50) DEFAULT 'general',
ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}';

CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications(notification_type);
CREATE INDEX IF NOT EXISTS idx_notifications_metadata_kpi ON notifications((metadata->>'kpi_key'));
```

### Unread Count Endpoint
```javascript
// Add to notifications.js route
router.get('/unread-count', async (req, res) => {
  try {
    const result = await query(
      'SELECT COUNT(*) FROM notifications WHERE user_id = $1 AND read = false',
      [req.user.id]
    );
    res.json({ count: parseInt(result.rows[0].count, 10) });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| localStorage notifications | PostgreSQL + API | v1.0 (Jan 2026) | Multi-device sync, persistence |
| Polling for updates | Fetch on mount + after actions | Codebase pattern | Reduced server load |
| Modal for notifications | Popover dropdown | Codebase pattern | Less intrusive UX |

**Deprecated/outdated:**
- localClient for notifications: Use apiClient.entities.Notification (already in codebase)
- Custom threshold numbers in multiple places: Centralize in shared constants

## Open Questions

Things that couldn't be fully resolved:

1. **Threshold Constants Sharing Strategy**
   - What we know: KPI_THRESHOLDS defined in KPICard.jsx (frontend)
   - What's unclear: Best way to share with backend - duplicate, extract to shared folder, or use build-time copy
   - Recommendation: Duplicate minimally in ThresholdService.js with code comment pointing to KPICard.jsx as source of truth. Refactor to shared module in v2.

2. **Notification Retention Policy**
   - What we know: Notifications stored in PostgreSQL indefinitely
   - What's unclear: Should old notifications be auto-deleted? What's the retention period?
   - Recommendation: Defer retention policy to v2. Current volume is low (max 5 KPIs * weekly uploads).

3. **Mark All as Read**
   - What we know: Requirement NOTIF-05 says "mark notifications as read" (individual)
   - What's unclear: Should there be a "mark all as read" feature?
   - Recommendation: Implement individual mark-as-read per requirement. Add mark-all-as-read if time permits as bonus.

## Sources

### Primary (HIGH confidence)
- Codebase: src/components/bugs/KPICard.jsx - KPI_THRESHOLDS and getKPIStatus()
- Codebase: server/services/NotificationService.js - Existing CRUD patterns
- Codebase: server/db/schema.sql - Notifications table structure
- Codebase: src/components/ui/popover.jsx - Radix Popover implementation
- Codebase: src/pages/Layout.jsx - Header structure for bell placement

### Secondary (MEDIUM confidence)
- Codebase: src/components/bugs/CriticalAlertBanner.jsx - KPI alert message patterns
- Codebase: server/routes/bugs.js - Upload endpoint for fire-and-forget integration point

### Tertiary (LOW confidence)
- None - all findings verified against codebase

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - All components already in codebase
- Architecture: HIGH - Follows established codebase patterns
- Pitfalls: MEDIUM - Based on common patterns, not production experience with this codebase

**Research date:** 2026-01-28
**Valid until:** 2026-02-28 (30 days - stable patterns, no external dependencies)

---

## Implementation Checklist

For planner reference:

### Backend Tasks
- [ ] Create ThresholdService.js with KPI evaluation and notification logic
- [ ] Add notification_type and metadata columns to notifications table (migration)
- [ ] Add /unread-count endpoint to notifications.js route
- [ ] Integrate fire-and-forget threshold check in bugs.js upload route
- [ ] Implement 24-hour deduplication query

### Frontend Tasks
- [ ] Create NotificationContext.jsx for notification state management
- [ ] Create NotificationBell.jsx component with Popover
- [ ] Create NotificationPanel.jsx with notification list
- [ ] Add NotificationBell to Layout.jsx header (next to mode toggle)
- [ ] Implement mark-as-read functionality

### Database Tasks
- [ ] Migration 020_notification_types.sql with new columns and indexes
