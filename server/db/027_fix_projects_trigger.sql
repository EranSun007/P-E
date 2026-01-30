-- Migration: 027_fix_projects_trigger
-- Drop the broken update_projects_updated_date trigger that references non-existent updated_date column
-- The projects table doesn't have updated_date, so this trigger causes errors on UPDATE

DROP TRIGGER IF EXISTS update_projects_updated_date ON projects;
