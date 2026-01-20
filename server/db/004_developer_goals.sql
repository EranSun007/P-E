-- Developer Goals table
CREATE TABLE IF NOT EXISTS developer_goals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id VARCHAR(255) NOT NULL,
  team_member_id UUID NOT NULL REFERENCES team_members(id) ON DELETE CASCADE,
  year INTEGER NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  progress INTEGER DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
  created_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_developer_goals_user_id ON developer_goals(user_id);
CREATE INDEX IF NOT EXISTS idx_developer_goals_team_member_id ON developer_goals(team_member_id);
CREATE INDEX IF NOT EXISTS idx_developer_goals_year ON developer_goals(year);

-- Add trigger for auto-updating updated_date
DROP TRIGGER IF EXISTS update_developer_goals_updated_date ON developer_goals;
CREATE TRIGGER update_developer_goals_updated_date
  BEFORE UPDATE ON developer_goals
  FOR EACH ROW EXECUTE FUNCTION update_updated_date_column();
