---
phase: 06
plan: 01
subsystem: database
tags: [postgresql, jsonb, migration, capture-framework]

dependency-graph:
  requires: [017_jira_integration]
  provides: [capture_rules-table, capture_inbox-table, entity_mappings-table]
  affects: [06-02, 07-backend-services, 08-ui]

tech-stack:
  added: []
  patterns: [jsonb-selectors, status-workflow, unique-constraint-multi-tenancy]

key-files:
  created:
    - server/db/018_capture_framework.sql
  modified:
    - server/db/migrate.js

decisions:
  - id: D-0601-01
    choice: "JSONB array for selectors column"
    rationale: "Flexible schema for field extraction rules"

metrics:
  duration: "2m 6s"
  completed: 2026-01-22
---

# Phase 6 Plan 01: Database Schema Summary

**One-liner:** Database foundation with capture_rules (JSONB selectors), capture_inbox (status workflow), and entity_mappings (unique source mapping) tables for v1.1 Web Capture Framework.

## What Was Built

### Tables Created

1. **capture_rules** - User-defined extraction rules
   - JSONB `selectors` column for flexible field definitions
   - `url_pattern` for matching target sites
   - `enabled` flag for quick toggling
   - Indexes on user_id and enabled

2. **capture_inbox** - Staging area for captured data
   - Status workflow: pending -> accepted/rejected
   - Foreign key to capture_rules with ON DELETE SET NULL
   - Denormalized rule_name for display after rule deletion
   - Indexes on user_id, status, rule_id, created_date

3. **entity_mappings** - External identifier to P&E entity links
   - UNIQUE constraint on (user_id, source_identifier)
   - `auto_apply` flag for automatic matching
   - Composite index on target_entity_type + target_entity_id

### Migration Infrastructure

- Migration file: `server/db/018_capture_framework.sql`
- Registered in migrate.js MIGRATIONS array
- Follows existing patterns from 017_jira_integration.sql

## Key Implementation Details

### Multi-Tenancy
All tables include `user_id VARCHAR(255) NOT NULL` with indexes for query performance.

### JSONB Defaults
```sql
selectors JSONB NOT NULL DEFAULT '[]'
metadata JSONB DEFAULT '{}'
captured_data JSONB NOT NULL
```

### Status Constraint
```sql
CHECK (status IN ('pending', 'accepted', 'rejected'))
```

### Updated Date Triggers
Applied to capture_rules and entity_mappings using existing `update_updated_date_column()` function.

## Commits

| Hash | Type | Description |
|------|------|-------------|
| 59288bfa | feat | Create database schema for capture framework |
| c0af0dcf | chore | Register capture framework migration |

## Verification Results

### Migration Output
```
Running migration: Create tables for capture rules, inbox, and entity mappings...
Migration 018_capture_framework completed successfully
Successfully ran 1 migration(s)
```

### Table Verification
- capture_rules: 10 columns, 2 indexes, 1 trigger
- capture_inbox: 12 columns, 4 indexes, 1 check constraint, 1 FK
- entity_mappings: 10 columns, 4 indexes (incl. UNIQUE), 1 trigger

## Deviations from Plan

None - plan executed exactly as written.

## Next Phase Readiness

Phase 6 Plan 02 (Backend Services) can now proceed:
- Tables exist for CaptureRuleService, CaptureInboxService, EntityMappingService
- Schema supports all planned CRUD operations
- Status workflow ready for inbox processing endpoints
