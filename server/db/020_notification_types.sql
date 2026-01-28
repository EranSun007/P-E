-- Add notification type and metadata for KPI alerts
-- notification_type: 'general', 'kpi_alert', etc.
-- metadata: JSONB for kpi_key, week_ending, threshold values

ALTER TABLE notifications
ADD COLUMN IF NOT EXISTS notification_type VARCHAR(50) DEFAULT 'general',
ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}';

-- Index for efficient type queries
CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications(notification_type);

-- Index for deduplication queries by KPI key
CREATE INDEX IF NOT EXISTS idx_notifications_metadata_kpi ON notifications((metadata->>'kpi_key'));

-- Composite index for deduplication: user + type + kpi_key + created_date
CREATE INDEX IF NOT EXISTS idx_notifications_dedup ON notifications(user_id, notification_type, created_date);
