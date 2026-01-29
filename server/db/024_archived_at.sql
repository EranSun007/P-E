-- Migration: 024_archived_at
-- Add archived_at timestamp column for tracking when items were archived

-- Add archived_at column to projects table
ALTER TABLE projects ADD COLUMN IF NOT EXISTS archived_at TIMESTAMP;

-- Create index for date range filtering on archived items
CREATE INDEX IF NOT EXISTS idx_projects_archived_at ON projects(archived_at);

-- Backfill: Set archived_at to created_date for existing archived items
-- (production may not have updated_date column)
UPDATE projects
SET archived_at = COALESCE(created_date, NOW())
WHERE archived = true AND archived_at IS NULL;
