-- Team summaries table for storing structured team status data
CREATE TABLE IF NOT EXISTS team_summaries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id VARCHAR(255) NOT NULL,
  member_id VARCHAR(255) NOT NULL,
  member_name VARCHAR(255) NOT NULL,
  team_department VARCHAR(100) DEFAULT 'metering',
  week_ending_date DATE NOT NULL,
  completed_count INTEGER DEFAULT 0,
  blocker_count INTEGER DEFAULT 0,
  one_line TEXT,
  items JSONB DEFAULT '[]',
  last_update_days INTEGER DEFAULT 0,
  created_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, member_id, week_ending_date)
);

CREATE INDEX IF NOT EXISTS idx_team_summaries_user_id ON team_summaries(user_id);
CREATE INDEX IF NOT EXISTS idx_team_summaries_team ON team_summaries(team_department);
CREATE INDEX IF NOT EXISTS idx_team_summaries_week ON team_summaries(week_ending_date);
CREATE INDEX IF NOT EXISTS idx_team_summaries_member ON team_summaries(member_id);

-- Trigger for updated_date
CREATE OR REPLACE FUNCTION update_team_summaries_updated_date()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_date = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS team_summaries_updated_date ON team_summaries;
CREATE TRIGGER team_summaries_updated_date
  BEFORE UPDATE ON team_summaries
  FOR EACH ROW
  EXECUTE FUNCTION update_team_summaries_updated_date();
