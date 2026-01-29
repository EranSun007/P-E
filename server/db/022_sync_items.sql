-- Migration: 022_sync_items
-- Create sync item schema extensions for TeamSync Integration (v1.6)

-- ========================================
-- Projects table extensions (for sync items)
-- ========================================
ALTER TABLE projects ADD COLUMN IF NOT EXISTS category VARCHAR(100);
ALTER TABLE projects ADD COLUMN IF NOT EXISTS sync_status VARCHAR(50) DEFAULT 'not-started';
ALTER TABLE projects ADD COLUMN IF NOT EXISTS team_department VARCHAR(255);
ALTER TABLE projects ADD COLUMN IF NOT EXISTS assigned_to_id UUID REFERENCES team_members(id) ON DELETE SET NULL;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS sprint_id VARCHAR(50);
ALTER TABLE projects ADD COLUMN IF NOT EXISTS week_start_date DATE;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS status_history JSONB DEFAULT '[]';
ALTER TABLE projects ADD COLUMN IF NOT EXISTS archived BOOLEAN DEFAULT false;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS is_sync_item BOOLEAN DEFAULT false;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS display_order INTEGER DEFAULT 0;

-- ========================================
-- Tasks table extensions (for subtasks)
-- ========================================
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS project_id UUID REFERENCES projects(id) ON DELETE CASCADE;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS is_subtask BOOLEAN DEFAULT false;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS completed BOOLEAN DEFAULT false;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS display_order INTEGER DEFAULT 0;

-- ========================================
-- Team members table extensions
-- ========================================
ALTER TABLE team_members ADD COLUMN IF NOT EXISTS display_order INTEGER DEFAULT 0;

-- ========================================
-- Sync settings table (new)
-- ========================================
CREATE TABLE IF NOT EXISTS sync_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id VARCHAR(255) NOT NULL UNIQUE,
  sprint_weeks INTEGER DEFAULT 2,
  default_view VARCHAR(50) DEFAULT 'sprint',
  default_team VARCHAR(255),
  settings_data JSONB DEFAULT '{}',
  created_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ========================================
-- Indexes for query performance
-- ========================================

-- Projects indexes
CREATE INDEX IF NOT EXISTS idx_projects_category ON projects(category);
CREATE INDEX IF NOT EXISTS idx_projects_sync_status ON projects(sync_status);
CREATE INDEX IF NOT EXISTS idx_projects_team_department ON projects(team_department);
CREATE INDEX IF NOT EXISTS idx_projects_is_sync_item ON projects(is_sync_item);
CREATE INDEX IF NOT EXISTS idx_projects_archived ON projects(archived);
CREATE INDEX IF NOT EXISTS idx_projects_is_sync_archived ON projects(is_sync_item, archived);

-- Tasks indexes
CREATE INDEX IF NOT EXISTS idx_tasks_project_id ON tasks(project_id);
CREATE INDEX IF NOT EXISTS idx_tasks_is_subtask ON tasks(is_subtask);
CREATE INDEX IF NOT EXISTS idx_tasks_project_order ON tasks(project_id, display_order);

-- Sync settings index
CREATE INDEX IF NOT EXISTS idx_sync_settings_user_id ON sync_settings(user_id);

-- ========================================
-- Triggers for updated_date
-- ========================================

-- Projects trigger (may already exist, use DROP IF EXISTS first)
DROP TRIGGER IF EXISTS update_projects_updated_date ON projects;
CREATE TRIGGER update_projects_updated_date BEFORE UPDATE ON projects
  FOR EACH ROW EXECUTE FUNCTION update_updated_date_column();

-- Team members trigger
DROP TRIGGER IF EXISTS update_team_members_updated_date ON team_members;
CREATE TRIGGER update_team_members_updated_date BEFORE UPDATE ON team_members
  FOR EACH ROW EXECUTE FUNCTION update_updated_date_column();

-- Sync settings trigger
DROP TRIGGER IF EXISTS update_sync_settings_updated_date ON sync_settings;
CREATE TRIGGER update_sync_settings_updated_date BEFORE UPDATE ON sync_settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_date_column();
