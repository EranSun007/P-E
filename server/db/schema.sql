-- P&E Manager Database Schema
-- PostgreSQL Schema for all entity types

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create migrations tracking table
CREATE TABLE IF NOT EXISTS migrations (
  id SERIAL PRIMARY KEY,
  version VARCHAR(255) NOT NULL UNIQUE,
  executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tasks table
CREATE TABLE IF NOT EXISTS tasks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id VARCHAR(255) NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  type VARCHAR(100) NOT NULL,
  status VARCHAR(100) NOT NULL,
  priority VARCHAR(100) NOT NULL,
  tags TEXT[] DEFAULT '{}',
  stakeholders TEXT[] DEFAULT '{}',
  due_date TIMESTAMP,
  assignee VARCHAR(255),
  estimated_hours NUMERIC(10, 2),
  actual_hours NUMERIC(10, 2),
  completion_date TIMESTAMP,
  metadata JSONB DEFAULT '{}',
  created_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_tasks_user_id ON tasks(user_id);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_priority ON tasks(priority);
CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON tasks(due_date);
CREATE INDEX IF NOT EXISTS idx_tasks_created_date ON tasks(created_date);

-- Stakeholders table (must be before projects due to FK reference)
CREATE TABLE IF NOT EXISTS stakeholders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id VARCHAR(255) NOT NULL,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255),
  role VARCHAR(100),
  phone VARCHAR(50),
  contact_info TEXT,
  company VARCHAR(255),
  influence_level VARCHAR(50) DEFAULT 'medium',
  engagement_level VARCHAR(50) DEFAULT 'active',
  notes TEXT,
  tags TEXT[] DEFAULT '{}',
  department VARCHAR(255),
  stakeholder_group VARCHAR(255),
  created_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_stakeholders_user_id ON stakeholders(user_id);
CREATE INDEX IF NOT EXISTS idx_stakeholders_email ON stakeholders(email);
CREATE INDEX IF NOT EXISTS idx_stakeholders_department ON stakeholders(department);
CREATE INDEX IF NOT EXISTS idx_stakeholders_group ON stakeholders(stakeholder_group);

-- Projects table
CREATE TABLE IF NOT EXISTS projects (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id VARCHAR(255) NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  status VARCHAR(100) NOT NULL,
  start_date TIMESTAMP,
  deadline TIMESTAMP,
  budget NUMERIC(15, 2),
  cost NUMERIC(15, 2),
  priority_level VARCHAR(100) DEFAULT 'medium',
  progress_percentage INTEGER DEFAULT 0 CHECK (progress_percentage >= 0 AND progress_percentage <= 100),
  tags TEXT[] DEFAULT '{}',
  stakeholder_id UUID REFERENCES stakeholders(id) ON DELETE SET NULL,
  created_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_projects_user_id ON projects(user_id);
CREATE INDEX IF NOT EXISTS idx_projects_status ON projects(status);
CREATE INDEX IF NOT EXISTS idx_projects_deadline ON projects(deadline);
CREATE INDEX IF NOT EXISTS idx_projects_created_date ON projects(created_date);
CREATE INDEX IF NOT EXISTS idx_projects_stakeholder_id ON projects(stakeholder_id);

-- Team Members table
CREATE TABLE IF NOT EXISTS team_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id VARCHAR(255) NOT NULL,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255),
  role VARCHAR(100),
  department VARCHAR(255),
  skills TEXT[] DEFAULT '{}',
  phone VARCHAR(50),
  company VARCHAR(255),
  notes TEXT,
  leave_from TIMESTAMP,
  leave_to TIMESTAMP,
  leave_title VARCHAR(255),
  last_activity TIMESTAMP,
  created_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_team_members_user_id ON team_members(user_id);
CREATE INDEX IF NOT EXISTS idx_team_members_email ON team_members(email);

-- One-on-Ones table
CREATE TABLE IF NOT EXISTS one_on_ones (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id VARCHAR(255) NOT NULL,
  team_member_id UUID REFERENCES team_members(id) ON DELETE CASCADE,
  date TIMESTAMP NOT NULL,
  notes TEXT,
  status VARCHAR(100) DEFAULT 'scheduled',
  location VARCHAR(255),
  created_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_one_on_ones_user_id ON one_on_ones(user_id);
CREATE INDEX IF NOT EXISTS idx_one_on_ones_team_member_id ON one_on_ones(team_member_id);
CREATE INDEX IF NOT EXISTS idx_one_on_ones_date ON one_on_ones(date);

-- Meetings table
CREATE TABLE IF NOT EXISTS meetings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id VARCHAR(255) NOT NULL,
  title VARCHAR(255) NOT NULL,
  date TIMESTAMP NOT NULL,
  notes TEXT,
  status VARCHAR(100) DEFAULT 'scheduled',
  participants TEXT[] DEFAULT '{}',
  agenda_items TEXT[] DEFAULT '{}',
  action_items TEXT[] DEFAULT '{}',
  created_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_meetings_user_id ON meetings(user_id);
CREATE INDEX IF NOT EXISTS idx_meetings_date ON meetings(date);
CREATE INDEX IF NOT EXISTS idx_meetings_status ON meetings(status);

-- Calendar Events table
CREATE TABLE IF NOT EXISTS calendar_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id VARCHAR(255) NOT NULL,
  title VARCHAR(255) NOT NULL,
  date TIMESTAMP NOT NULL,
  start_time TIME,
  end_time TIME,
  all_day BOOLEAN DEFAULT false,
  recurrence_rule VARCHAR(255),
  created_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_calendar_events_user_id ON calendar_events(user_id);
CREATE INDEX IF NOT EXISTS idx_calendar_events_date ON calendar_events(date);

-- Notifications table
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  read BOOLEAN DEFAULT false,
  scheduled_date TIMESTAMP,
  created_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(read);
CREATE INDEX IF NOT EXISTS idx_notifications_scheduled_date ON notifications(scheduled_date);

-- Reminders table
CREATE TABLE IF NOT EXISTS reminders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id VARCHAR(255) NOT NULL,
  title VARCHAR(255) NOT NULL,
  date TIMESTAMP NOT NULL,
  completed BOOLEAN DEFAULT false,
  created_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_reminders_user_id ON reminders(user_id);
CREATE INDEX IF NOT EXISTS idx_reminders_date ON reminders(date);
CREATE INDEX IF NOT EXISTS idx_reminders_completed ON reminders(completed);

-- Comments table
CREATE TABLE IF NOT EXISTS comments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id VARCHAR(255) NOT NULL,
  content TEXT NOT NULL,
  author_name VARCHAR(255) DEFAULT 'Local User',
  task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  created_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_comments_user_id ON comments(user_id);
CREATE INDEX IF NOT EXISTS idx_comments_task_id ON comments(task_id);
CREATE INDEX IF NOT EXISTS idx_comments_project_id ON comments(project_id);

-- Task Attributes table
CREATE TABLE IF NOT EXISTS task_attributes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id VARCHAR(255) NOT NULL,
  name VARCHAR(255) NOT NULL,
  value TEXT,
  task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
  created_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_task_attributes_user_id ON task_attributes(user_id);
CREATE INDEX IF NOT EXISTS idx_task_attributes_task_id ON task_attributes(task_id);

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

-- Function to automatically update updated_date
CREATE OR REPLACE FUNCTION update_updated_date_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_date = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for auto-updating updated_date
DROP TRIGGER IF EXISTS update_tasks_updated_date ON tasks;
CREATE TRIGGER update_tasks_updated_date BEFORE UPDATE ON tasks
  FOR EACH ROW EXECUTE FUNCTION update_updated_date_column();

DROP TRIGGER IF EXISTS update_one_on_ones_updated_date ON one_on_ones;
CREATE TRIGGER update_one_on_ones_updated_date BEFORE UPDATE ON one_on_ones
  FOR EACH ROW EXECUTE FUNCTION update_updated_date_column();

DROP TRIGGER IF EXISTS update_meetings_updated_date ON meetings;
CREATE TRIGGER update_meetings_updated_date BEFORE UPDATE ON meetings
  FOR EACH ROW EXECUTE FUNCTION update_updated_date_column();

DROP TRIGGER IF EXISTS update_comments_updated_date ON comments;
CREATE TRIGGER update_comments_updated_date BEFORE UPDATE ON comments
  FOR EACH ROW EXECUTE FUNCTION update_updated_date_column();

DROP TRIGGER IF EXISTS update_task_attributes_updated_date ON task_attributes;
CREATE TRIGGER update_task_attributes_updated_date BEFORE UPDATE ON task_attributes
  FOR EACH ROW EXECUTE FUNCTION update_updated_date_column();

DROP TRIGGER IF EXISTS update_work_items_updated_date ON work_items;
CREATE TRIGGER update_work_items_updated_date BEFORE UPDATE ON work_items
  FOR EACH ROW EXECUTE FUNCTION update_updated_date_column();
