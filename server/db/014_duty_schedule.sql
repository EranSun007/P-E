-- Migration 014: Create duty_schedule table
-- Manages upcoming duty rotation assignments per team (Metering, Reporting)
-- Supports three duty types: devops (2 weeks), dev_on_duty (1 week), replacement (variable)

CREATE TABLE IF NOT EXISTS duty_schedule (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id VARCHAR(255) NOT NULL,
  team_member_id UUID NOT NULL REFERENCES team_members(id) ON DELETE CASCADE,
  team VARCHAR(100) NOT NULL,            -- 'Metering' | 'Reporting'
  duty_type VARCHAR(50) NOT NULL,        -- 'devops' | 'dev_on_duty' | 'replacement'
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  notes TEXT,
  created_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_duty_schedule_user_id ON duty_schedule(user_id);
CREATE INDEX IF NOT EXISTS idx_duty_schedule_team ON duty_schedule(team);
CREATE INDEX IF NOT EXISTS idx_duty_schedule_duty_type ON duty_schedule(duty_type);
CREATE INDEX IF NOT EXISTS idx_duty_schedule_dates ON duty_schedule(start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_duty_schedule_team_member_id ON duty_schedule(team_member_id);

-- Trigger for updated_date (uses update_updated_date_column from schema.sql)
DROP TRIGGER IF EXISTS update_duty_schedule_updated_date ON duty_schedule;
CREATE TRIGGER update_duty_schedule_updated_date
  BEFORE UPDATE ON duty_schedule
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_date_column();
