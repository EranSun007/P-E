-- Migration: Add global task attributes support
-- These attributes are used for statuses, priorities, tags, and task types

-- Add new columns for global task attribute management
ALTER TABLE task_attributes ADD COLUMN IF NOT EXISTS type VARCHAR(50);
ALTER TABLE task_attributes ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE task_attributes ADD COLUMN IF NOT EXISTS color VARCHAR(50);
ALTER TABLE task_attributes ADD COLUMN IF NOT EXISTS "order" INTEGER DEFAULT 0;
ALTER TABLE task_attributes ADD COLUMN IF NOT EXISTS "default" BOOLEAN DEFAULT false;

-- Make task_id optional (allow NULL for global attributes)
ALTER TABLE task_attributes ALTER COLUMN task_id DROP NOT NULL;

-- Add index for type lookups
CREATE INDEX IF NOT EXISTS idx_task_attributes_type ON task_attributes(type);
