-- Migration: Create work_items table for team member work tracking
-- Version: 002_work_items

-- Work Items table (BLIs/work tracking for team members)
CREATE TABLE IF NOT EXISTS work_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id VARCHAR(255) NOT NULL,
  team_member_id UUID NOT NULL REFERENCES team_members(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
  effort_estimation VARCHAR(100),
  status VARCHAR(50) DEFAULT 'active',
  insights JSONB DEFAULT '[]',
  created_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  completed_date TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_work_items_user_id ON work_items(user_id);
CREATE INDEX IF NOT EXISTS idx_work_items_team_member_id ON work_items(team_member_id);
CREATE INDEX IF NOT EXISTS idx_work_items_status ON work_items(status);
CREATE INDEX IF NOT EXISTS idx_work_items_project_id ON work_items(project_id);

-- Trigger for auto-updating updated_date
DROP TRIGGER IF EXISTS update_work_items_updated_date ON work_items;
CREATE TRIGGER update_work_items_updated_date BEFORE UPDATE ON work_items
  FOR EACH ROW EXECUTE FUNCTION update_updated_date_column();
