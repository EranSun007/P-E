-- Email notification queue for failure logging and delivery tracking
-- Created for Phase 16: Email Notifications & Preferences

-- email_queue table stores email delivery attempts for audit and retry
CREATE TABLE IF NOT EXISTS email_queue (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id VARCHAR(255) NOT NULL,
  recipient_email VARCHAR(255) NOT NULL,
  subject VARCHAR(500) NOT NULL,
  template_type VARCHAR(50) NOT NULL,
  template_data JSONB DEFAULT '{}',
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  attempts INTEGER NOT NULL DEFAULT 0,
  last_error TEXT,
  created_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  sent_date TIMESTAMP WITH TIME ZONE,
  updated_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT email_queue_status_check CHECK (status IN ('pending', 'sent', 'failed'))
);

-- Indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_email_queue_user_id ON email_queue(user_id);
CREATE INDEX IF NOT EXISTS idx_email_queue_status ON email_queue(status);
CREATE INDEX IF NOT EXISTS idx_email_queue_created_date ON email_queue(created_date);

-- Trigger to update updated_date on modification
DROP TRIGGER IF EXISTS update_email_queue_updated_date ON email_queue;
CREATE TRIGGER update_email_queue_updated_date
  BEFORE UPDATE ON email_queue
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_date_column();
