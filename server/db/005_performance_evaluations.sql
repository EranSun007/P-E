-- Performance Evaluations table
CREATE TABLE IF NOT EXISTS performance_evaluations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id VARCHAR(255) NOT NULL,
  team_member_id UUID NOT NULL REFERENCES team_members(id) ON DELETE CASCADE,
  year INTEGER NOT NULL,
  summary TEXT,
  strengths TEXT,
  areas_for_improvement TEXT,
  main_points JSONB DEFAULT '[]',
  technical_rating INTEGER CHECK (technical_rating IS NULL OR (technical_rating >= 1 AND technical_rating <= 5)),
  collaboration_rating INTEGER CHECK (collaboration_rating IS NULL OR (collaboration_rating >= 1 AND collaboration_rating <= 5)),
  highlighted_work_items JSONB DEFAULT '[]',
  created_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, team_member_id, year)
);

CREATE INDEX IF NOT EXISTS idx_performance_evaluations_user_id ON performance_evaluations(user_id);
CREATE INDEX IF NOT EXISTS idx_performance_evaluations_team_member_id ON performance_evaluations(team_member_id);
CREATE INDEX IF NOT EXISTS idx_performance_evaluations_year ON performance_evaluations(year);

-- Add trigger for auto-updating updated_date
DROP TRIGGER IF EXISTS update_performance_evaluations_updated_date ON performance_evaluations;
CREATE TRIGGER update_performance_evaluations_updated_date
  BEFORE UPDATE ON performance_evaluations
  FOR EACH ROW EXECUTE FUNCTION update_updated_date_column();
