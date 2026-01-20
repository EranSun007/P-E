-- Migration: Add sprint_name column to work_items table
-- Version: 003_work_items_sprint

ALTER TABLE work_items ADD COLUMN IF NOT EXISTS sprint_name VARCHAR(100);
