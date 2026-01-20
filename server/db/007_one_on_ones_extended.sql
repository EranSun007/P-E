-- Migration: Add extended fields to one_on_ones table
-- These fields support the full 1:1 meeting tracking features

-- Add mood tracking
ALTER TABLE one_on_ones ADD COLUMN IF NOT EXISTS mood VARCHAR(50);

-- Add topics discussed as array
ALTER TABLE one_on_ones ADD COLUMN IF NOT EXISTS topics_discussed TEXT[] DEFAULT '{}';

-- Add next meeting date scheduling
ALTER TABLE one_on_ones ADD COLUMN IF NOT EXISTS next_meeting_date TIMESTAMP;

-- Add action items as JSONB (supports structured action item objects)
ALTER TABLE one_on_ones ADD COLUMN IF NOT EXISTS action_items JSONB DEFAULT '[]';

-- Change notes column from TEXT to JSONB to support structured notes with tags
-- First check if it's already JSONB, if not convert it
DO $$
BEGIN
  -- Check if notes column is TEXT type
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'one_on_ones'
    AND column_name = 'notes'
    AND data_type = 'text'
  ) THEN
    -- Create a temporary column
    ALTER TABLE one_on_ones ADD COLUMN notes_new JSONB DEFAULT '[]';

    -- Migrate existing text notes to JSONB array format
    UPDATE one_on_ones
    SET notes_new = CASE
      WHEN notes IS NULL OR notes = '' THEN '[]'::jsonb
      ELSE jsonb_build_array(jsonb_build_object('text', notes, 'timestamp', created_date))
    END;

    -- Drop old column and rename new one
    ALTER TABLE one_on_ones DROP COLUMN notes;
    ALTER TABLE one_on_ones RENAME COLUMN notes_new TO notes;
  END IF;
END $$;
