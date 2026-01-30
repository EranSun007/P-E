-- Migration: 026_default_category_for_projects
-- Set default category for existing projects without a category
-- This ensures they appear in Team Sync's Kanban board

-- Disable the trigger to avoid update_date issues
ALTER TABLE projects DISABLE TRIGGER update_projects_updated_date;

-- Set 'emphasis' as default category for projects without one
UPDATE projects
SET category = 'emphasis'
WHERE category IS NULL AND is_sync_item = true;

-- Re-enable the trigger
ALTER TABLE projects ENABLE TRIGGER update_projects_updated_date;
