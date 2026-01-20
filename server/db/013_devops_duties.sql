-- Migration 013: Create devops_duties table
-- Tracks DevOps duty periods for team members with bug metrics and learnings

CREATE TABLE IF NOT EXISTS devops_duties (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id VARCHAR(255) NOT NULL,
  team_member_id UUID NOT NULL REFERENCES team_members(id) ON DELETE CASCADE,
  start_date DATE NOT NULL,
  end_date DATE,
  bugs_at_start INTEGER DEFAULT 0,
  bugs_at_end INTEGER DEFAULT 0,
  bugs_solved INTEGER DEFAULT 0,
  escalations INTEGER DEFAULT 0,
  duration_days INTEGER,
  insights TEXT[] DEFAULT '{}',
  notes TEXT,
  status VARCHAR(50) DEFAULT 'active',
  created_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_devops_duties_user_id ON devops_duties(user_id);
CREATE INDEX IF NOT EXISTS idx_devops_duties_team_member_id ON devops_duties(team_member_id);
CREATE INDEX IF NOT EXISTS idx_devops_duties_status ON devops_duties(status);

-- Trigger for updated_date (uses update_updated_date_column from schema.sql)
DROP TRIGGER IF EXISTS update_devops_duties_updated_date ON devops_duties;
CREATE TRIGGER update_devops_duties_updated_date
  BEFORE UPDATE ON devops_duties
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_date_column();
