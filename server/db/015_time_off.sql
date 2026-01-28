-- Migration: 015_time_off
-- Description: Create time_off table for tracking team member absences

-- Create time_off table
CREATE TABLE IF NOT EXISTS time_off (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL,
  team_member_id UUID NOT NULL REFERENCES team_members(id) ON DELETE CASCADE,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  type VARCHAR(50) NOT NULL DEFAULT 'other',
  half_day VARCHAR(10) DEFAULT NULL,
  notes TEXT,
  status VARCHAR(20) DEFAULT 'approved',
  created_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for common queries
CREATE INDEX IF NOT EXISTS idx_time_off_user_id ON time_off(user_id);
CREATE INDEX IF NOT EXISTS idx_time_off_team_member_id ON time_off(team_member_id);
CREATE INDEX IF NOT EXISTS idx_time_off_dates ON time_off(start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_time_off_type ON time_off(type);

-- Create trigger for auto-updating updated_date
DROP TRIGGER IF EXISTS update_time_off_updated_date ON time_off;
CREATE TRIGGER update_time_off_updated_date
  BEFORE UPDATE ON time_off
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_date_column();

-- Add comments for documentation
COMMENT ON TABLE time_off IS 'Tracks team member time off / absences';
COMMENT ON COLUMN time_off.type IS 'Type of time off: vacation, sick, personal, conference, other';
COMMENT ON COLUMN time_off.half_day IS 'NULL for full day, morning or afternoon for half days';
COMMENT ON COLUMN time_off.status IS 'Status: pending, approved, rejected, cancelled';
