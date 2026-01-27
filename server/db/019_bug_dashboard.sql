-- Migration: 019_bug_dashboard
-- Create tables for DevOps Bug Dashboard (v1.2)

-- Bug uploads table - tracks weekly CSV uploads
CREATE TABLE IF NOT EXISTS bug_uploads (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id VARCHAR(255) NOT NULL,
  week_ending DATE NOT NULL,
  filename VARCHAR(255) NOT NULL,
  bug_count INTEGER NOT NULL DEFAULT 0,
  uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, week_ending)
);

CREATE INDEX IF NOT EXISTS idx_bug_uploads_user_id ON bug_uploads(user_id);
CREATE INDEX IF NOT EXISTS idx_bug_uploads_week_ending ON bug_uploads(week_ending);

-- Bugs table - individual bug records parsed from CSV
CREATE TABLE IF NOT EXISTS bugs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  upload_id UUID NOT NULL REFERENCES bug_uploads(id) ON DELETE CASCADE,
  bug_key VARCHAR(50) NOT NULL,
  summary TEXT,
  priority VARCHAR(50),
  status VARCHAR(100),
  created_date TIMESTAMP,
  resolved_date TIMESTAMP,
  resolution_time_hours FLOAT,
  reporter VARCHAR(255),
  assignee VARCHAR(255),
  labels TEXT[],
  component VARCHAR(100),
  raw_data JSONB,
  UNIQUE(upload_id, bug_key)
);

CREATE INDEX IF NOT EXISTS idx_bugs_upload_id ON bugs(upload_id);
CREATE INDEX IF NOT EXISTS idx_bugs_status ON bugs(status);
CREATE INDEX IF NOT EXISTS idx_bugs_priority ON bugs(priority);
CREATE INDEX IF NOT EXISTS idx_bugs_component ON bugs(component);
CREATE INDEX IF NOT EXISTS idx_bugs_created_date ON bugs(created_date);

-- Weekly KPIs table - pre-calculated KPI values per component
CREATE TABLE IF NOT EXISTS weekly_kpis (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  upload_id UUID NOT NULL REFERENCES bug_uploads(id) ON DELETE CASCADE,
  component VARCHAR(100),
  kpi_data JSONB NOT NULL DEFAULT '{}',
  calculated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(upload_id, component)
);

CREATE INDEX IF NOT EXISTS idx_weekly_kpis_upload_id ON weekly_kpis(upload_id);

-- Trigger for auto-updating updated_date on bug_uploads
DROP TRIGGER IF EXISTS update_bug_uploads_updated_date ON bug_uploads;
CREATE TRIGGER update_bug_uploads_updated_date BEFORE UPDATE ON bug_uploads
  FOR EACH ROW EXECUTE FUNCTION update_updated_date_column();
