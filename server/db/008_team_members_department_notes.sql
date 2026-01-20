-- Add department and notes columns to team_members table
ALTER TABLE team_members ADD COLUMN IF NOT EXISTS department VARCHAR(255);
ALTER TABLE team_members ADD COLUMN IF NOT EXISTS notes TEXT;
