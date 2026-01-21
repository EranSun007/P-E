-- Migration: 017_jira_integration
-- Create tables for Jira issue tracking and team member mappings

-- Jira issues table for storing synced issues from browser extension
CREATE TABLE IF NOT EXISTS jira_issues (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id VARCHAR(100) NOT NULL,
  issue_key VARCHAR(50) NOT NULL,
  summary TEXT,
  status VARCHAR(100),
  assignee_name VARCHAR(255),
  assignee_id VARCHAR(100),
  story_points NUMERIC(5,1),
  priority VARCHAR(50),
  issue_type VARCHAR(50),
  sprint_name VARCHAR(255),
  epic_key VARCHAR(50),
  jira_url VARCHAR(1024),
  synced_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, issue_key)
);

CREATE INDEX IF NOT EXISTS idx_jira_issues_user_id ON jira_issues(user_id);
CREATE INDEX IF NOT EXISTS idx_jira_issues_status ON jira_issues(status);
CREATE INDEX IF NOT EXISTS idx_jira_issues_assignee_id ON jira_issues(assignee_id);
CREATE INDEX IF NOT EXISTS idx_jira_issues_sprint ON jira_issues(sprint_name);

-- Jira team mappings table for linking Jira assignees to P&E team members
CREATE TABLE IF NOT EXISTS jira_team_mappings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id VARCHAR(100) NOT NULL,
  jira_assignee_id VARCHAR(100) NOT NULL,
  jira_assignee_name VARCHAR(255),
  team_member_id UUID REFERENCES team_members(id) ON DELETE CASCADE,
  created_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, jira_assignee_id)
);

CREATE INDEX IF NOT EXISTS idx_jira_mappings_user_id ON jira_team_mappings(user_id);
CREATE INDEX IF NOT EXISTS idx_jira_mappings_team_member ON jira_team_mappings(team_member_id);

-- Triggers for auto-updating updated_date
DROP TRIGGER IF EXISTS update_jira_issues_updated_date ON jira_issues;
CREATE TRIGGER update_jira_issues_updated_date BEFORE UPDATE ON jira_issues
  FOR EACH ROW EXECUTE FUNCTION update_updated_date_column();

DROP TRIGGER IF EXISTS update_jira_mappings_updated_date ON jira_team_mappings;
CREATE TRIGGER update_jira_mappings_updated_date BEFORE UPDATE ON jira_team_mappings
  FOR EACH ROW EXECUTE FUNCTION update_updated_date_column();
