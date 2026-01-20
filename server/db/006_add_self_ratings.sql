-- Add self-assessment ratings columns to performance_evaluations
-- This enables dual ratings: developer self-assessment + manager assessment

ALTER TABLE performance_evaluations
  ADD COLUMN IF NOT EXISTS self_technical_rating INTEGER
    CHECK (self_technical_rating IS NULL OR (self_technical_rating >= 1 AND self_technical_rating <= 5)),
  ADD COLUMN IF NOT EXISTS self_collaboration_rating INTEGER
    CHECK (self_collaboration_rating IS NULL OR (self_collaboration_rating >= 1 AND self_collaboration_rating <= 5));

COMMENT ON COLUMN performance_evaluations.self_technical_rating IS 'Developer self-assessment of technical skills (1-5)';
COMMENT ON COLUMN performance_evaluations.self_collaboration_rating IS 'Developer self-assessment of collaboration skills (1-5)';
COMMENT ON COLUMN performance_evaluations.technical_rating IS 'Manager assessment of technical skills (1-5)';
COMMENT ON COLUMN performance_evaluations.collaboration_rating IS 'Manager assessment of collaboration skills (1-5)';
