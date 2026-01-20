-- Add missing columns to stakeholders table for persistence fix
ALTER TABLE stakeholders ADD COLUMN IF NOT EXISTS influence_level VARCHAR(50) DEFAULT 'medium';
ALTER TABLE stakeholders ADD COLUMN IF NOT EXISTS engagement_level VARCHAR(50) DEFAULT 'active';
ALTER TABLE stakeholders ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE stakeholders ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}';

-- Add department and group columns for clustering
ALTER TABLE stakeholders ADD COLUMN IF NOT EXISTS department VARCHAR(255);
ALTER TABLE stakeholders ADD COLUMN IF NOT EXISTS stakeholder_group VARCHAR(255);

-- Add stakeholder_id to projects for assignment
ALTER TABLE projects ADD COLUMN IF NOT EXISTS stakeholder_id UUID REFERENCES stakeholders(id) ON DELETE SET NULL;

-- Add indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_stakeholders_department ON stakeholders(department);
CREATE INDEX IF NOT EXISTS idx_stakeholders_group ON stakeholders(stakeholder_group);
CREATE INDEX IF NOT EXISTS idx_projects_stakeholder_id ON projects(stakeholder_id);
