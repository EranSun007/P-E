-- Migration: 018_capture_framework
-- Create tables for capture rules, inbox, and entity mappings (v1.1 Web Capture Framework)

-- Capture rules table for user-defined extraction rules
CREATE TABLE IF NOT EXISTS capture_rules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id VARCHAR(255) NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  url_pattern VARCHAR(1024) NOT NULL,
  enabled BOOLEAN DEFAULT true,
  selectors JSONB NOT NULL DEFAULT '[]',
  metadata JSONB DEFAULT '{}',
  created_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_capture_rules_user_id ON capture_rules(user_id);
CREATE INDEX IF NOT EXISTS idx_capture_rules_enabled ON capture_rules(enabled);

-- Capture inbox table for staging captured data before acceptance
CREATE TABLE IF NOT EXISTS capture_inbox (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id VARCHAR(255) NOT NULL,
  rule_id UUID REFERENCES capture_rules(id) ON DELETE SET NULL,
  rule_name VARCHAR(255),
  source_url VARCHAR(2048) NOT NULL,
  source_identifier VARCHAR(512),
  status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
  captured_data JSONB NOT NULL,
  target_entity_type VARCHAR(100),
  target_entity_id UUID,
  processed_at TIMESTAMP,
  created_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_capture_inbox_user_id ON capture_inbox(user_id);
CREATE INDEX IF NOT EXISTS idx_capture_inbox_status ON capture_inbox(status);
CREATE INDEX IF NOT EXISTS idx_capture_inbox_rule_id ON capture_inbox(rule_id);
CREATE INDEX IF NOT EXISTS idx_capture_inbox_created_date ON capture_inbox(created_date);

-- Entity mappings table for linking external identifiers to P&E entities
CREATE TABLE IF NOT EXISTS entity_mappings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id VARCHAR(255) NOT NULL,
  source_identifier VARCHAR(512) NOT NULL,
  source_type VARCHAR(100),
  source_display_name VARCHAR(255),
  target_entity_type VARCHAR(100) NOT NULL,
  target_entity_id UUID NOT NULL,
  auto_apply BOOLEAN DEFAULT true,
  created_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, source_identifier)
);

CREATE INDEX IF NOT EXISTS idx_entity_mappings_user_id ON entity_mappings(user_id);
CREATE INDEX IF NOT EXISTS idx_entity_mappings_source_identifier ON entity_mappings(source_identifier);
CREATE INDEX IF NOT EXISTS idx_entity_mappings_target ON entity_mappings(target_entity_type, target_entity_id);

-- Triggers for auto-updating updated_date
DROP TRIGGER IF EXISTS update_capture_rules_updated_date ON capture_rules;
CREATE TRIGGER update_capture_rules_updated_date BEFORE UPDATE ON capture_rules
  FOR EACH ROW EXECUTE FUNCTION update_updated_date_column();

DROP TRIGGER IF EXISTS update_entity_mappings_updated_date ON entity_mappings;
CREATE TRIGGER update_entity_mappings_updated_date BEFORE UPDATE ON entity_mappings
  FOR EACH ROW EXECUTE FUNCTION update_updated_date_column();
