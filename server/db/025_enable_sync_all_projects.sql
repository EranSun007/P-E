-- Migration: 025_enable_sync_all_projects
-- Enable sync for all existing projects so they appear in Team Sync view
-- This is a one-time data migration to include pre-existing projects

-- Disable only the user-defined trigger (if it exists)
ALTER TABLE projects DISABLE TRIGGER update_projects_updated_date;

UPDATE projects
SET is_sync_item = true
WHERE is_sync_item = false OR is_sync_item IS NULL;

-- Re-enable the trigger
ALTER TABLE projects ENABLE TRIGGER update_projects_updated_date;
