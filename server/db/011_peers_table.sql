-- Migration 011: Create peers table
-- Peers are external collaborators/contacts (different from team_members)

CREATE TABLE IF NOT EXISTS peers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id VARCHAR(255) NOT NULL,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255),
  phone VARCHAR(100),
  role VARCHAR(255),
  department VARCHAR(255),
  organization VARCHAR(255),
  collaboration_context TEXT,
  relationship_type VARCHAR(50) DEFAULT 'other',
  availability VARCHAR(255),
  skills TEXT[] DEFAULT '{}',
  notes TEXT,
  avatar VARCHAR(500),
  last_activity TIMESTAMP,
  created_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_peers_user_id ON peers(user_id);
CREATE INDEX IF NOT EXISTS idx_peers_name ON peers(name);

-- Trigger for updated_date (uses update_updated_date_column from schema.sql)
DROP TRIGGER IF EXISTS update_peers_updated_date ON peers;
CREATE TRIGGER update_peers_updated_date
  BEFORE UPDATE ON peers
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_date_column();
