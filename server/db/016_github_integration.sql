-- Migration: 016_github_integration
-- Create tables for GitHub repository tracking and user settings

-- User settings table for storing encrypted tokens and preferences
CREATE TABLE IF NOT EXISTS user_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id VARCHAR(100) NOT NULL,
  setting_key VARCHAR(100) NOT NULL,
  setting_value TEXT,
  encrypted BOOLEAN DEFAULT false,
  created_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, setting_key)
);

CREATE INDEX IF NOT EXISTS idx_user_settings_user_id ON user_settings(user_id);
CREATE INDEX IF NOT EXISTS idx_user_settings_key ON user_settings(setting_key);

-- GitHub repositories table for tracking repos and caching metrics
CREATE TABLE IF NOT EXISTS github_repos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id VARCHAR(100) NOT NULL,
  owner VARCHAR(255) NOT NULL,
  name VARCHAR(255) NOT NULL,
  full_name VARCHAR(512) NOT NULL,
  description TEXT,
  html_url VARCHAR(1024),
  default_branch VARCHAR(100) DEFAULT 'main',
  is_private BOOLEAN DEFAULT false,

  -- Cached metrics (updated on sync)
  stars_count INTEGER DEFAULT 0,
  forks_count INTEGER DEFAULT 0,
  open_issues_count INTEGER DEFAULT 0,
  open_prs_count INTEGER DEFAULT 0,

  -- PR metrics
  merged_prs_last_30_days INTEGER DEFAULT 0,
  avg_pr_merge_time_hours NUMERIC(10,2),

  -- Commit metrics
  commits_last_30_days INTEGER DEFAULT 0,
  contributors_count INTEGER DEFAULT 0,

  -- Sync metadata
  last_synced_at TIMESTAMP,
  sync_error TEXT,

  -- Optional link to P&E project
  project_id UUID REFERENCES projects(id) ON DELETE SET NULL,

  created_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, full_name)
);

CREATE INDEX IF NOT EXISTS idx_github_repos_user_id ON github_repos(user_id);
CREATE INDEX IF NOT EXISTS idx_github_repos_full_name ON github_repos(full_name);
CREATE INDEX IF NOT EXISTS idx_github_repos_project_id ON github_repos(project_id);

-- GitHub pull requests cache (recent PRs for display)
CREATE TABLE IF NOT EXISTS github_pull_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  repo_id UUID NOT NULL REFERENCES github_repos(id) ON DELETE CASCADE,
  pr_number INTEGER NOT NULL,
  title VARCHAR(512),
  state VARCHAR(50), -- open, closed, merged
  author VARCHAR(255),
  author_avatar_url VARCHAR(1024),
  html_url VARCHAR(1024),
  created_at TIMESTAMP,
  updated_at TIMESTAMP,
  merged_at TIMESTAMP,
  closed_at TIMESTAMP,
  additions INTEGER DEFAULT 0,
  deletions INTEGER DEFAULT 0,
  changed_files INTEGER DEFAULT 0,
  review_decision VARCHAR(50), -- APPROVED, CHANGES_REQUESTED, REVIEW_REQUIRED
  labels JSONB DEFAULT '[]',
  created_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(repo_id, pr_number)
);

CREATE INDEX IF NOT EXISTS idx_github_prs_repo_id ON github_pull_requests(repo_id);
CREATE INDEX IF NOT EXISTS idx_github_prs_state ON github_pull_requests(state);
CREATE INDEX IF NOT EXISTS idx_github_prs_author ON github_pull_requests(author);

-- GitHub issues cache (recent issues for display)
CREATE TABLE IF NOT EXISTS github_issues (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  repo_id UUID NOT NULL REFERENCES github_repos(id) ON DELETE CASCADE,
  issue_number INTEGER NOT NULL,
  title VARCHAR(512),
  state VARCHAR(50), -- open, closed
  author VARCHAR(255),
  author_avatar_url VARCHAR(1024),
  html_url VARCHAR(1024),
  created_at TIMESTAMP,
  updated_at TIMESTAMP,
  closed_at TIMESTAMP,
  labels JSONB DEFAULT '[]',
  milestone VARCHAR(255),
  assignees JSONB DEFAULT '[]',
  comments_count INTEGER DEFAULT 0,
  created_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(repo_id, issue_number)
);

CREATE INDEX IF NOT EXISTS idx_github_issues_repo_id ON github_issues(repo_id);
CREATE INDEX IF NOT EXISTS idx_github_issues_state ON github_issues(state);

-- GitHub commits cache (recent commits for display)
CREATE TABLE IF NOT EXISTS github_commits (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  repo_id UUID NOT NULL REFERENCES github_repos(id) ON DELETE CASCADE,
  sha VARCHAR(64) NOT NULL,
  message TEXT,
  author_name VARCHAR(255),
  author_email VARCHAR(255),
  author_avatar_url VARCHAR(1024),
  committed_at TIMESTAMP,
  html_url VARCHAR(1024),
  additions INTEGER DEFAULT 0,
  deletions INTEGER DEFAULT 0,
  created_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(repo_id, sha)
);

CREATE INDEX IF NOT EXISTS idx_github_commits_repo_id ON github_commits(repo_id);
CREATE INDEX IF NOT EXISTS idx_github_commits_committed_at ON github_commits(committed_at);

-- Triggers for auto-updating updated_date
DROP TRIGGER IF EXISTS update_user_settings_updated_date ON user_settings;
CREATE TRIGGER update_user_settings_updated_date BEFORE UPDATE ON user_settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_date_column();

DROP TRIGGER IF EXISTS update_github_repos_updated_date ON github_repos;
CREATE TRIGGER update_github_repos_updated_date BEFORE UPDATE ON github_repos
  FOR EACH ROW EXECUTE FUNCTION update_updated_date_column();
