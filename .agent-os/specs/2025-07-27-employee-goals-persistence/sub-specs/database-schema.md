# Database Schema

This is the database schema implementation for the spec detailed in @.agent-os/specs/2025-07-27-employee-goals-persistence/spec.md

> Created: 2025-07-27
> Version: 1.0.0

## Schema Changes

### New Entity: EmployeeGoals
Since the application currently uses local storage with a service layer abstraction, this represents the JSON structure that will be stored and the future database schema for cloud migration.

### Local Storage Schema
```javascript
// Storage key: 'employeeGoals'
{
  version: '1.0.0',
  data: {
    [goalId]: {
      id: string,                    // UUID
      employeeId: string,            // References team member ID
      title: string,                 // Goal title
      developmentNeed: string,       // Development areas
      developmentActivity: string,   // Planned activities
      developmentGoalDescription: string, // Detailed description
      status: 'active' | 'completed' | 'paused',
      createdAt: string,            // ISO date string
      updatedAt: string,            // ISO date string
      importSource?: string         // Optional source identifier
    }
  }
}
```

### Future Cloud Database Schema (PostgreSQL/SAP HANA)
```sql
CREATE TABLE employee_goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL,
  title VARCHAR(500) NOT NULL,
  development_need TEXT,
  development_activity TEXT,
  development_goal_description TEXT,
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'completed', 'paused')),
  import_source VARCHAR(100),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  CONSTRAINT fk_employee_goals_employee 
    FOREIGN KEY (employee_id) 
    REFERENCES team_members(id) 
    ON DELETE CASCADE
);

-- Indexes for performance
CREATE INDEX idx_employee_goals_employee_id ON employee_goals(employee_id);
CREATE INDEX idx_employee_goals_status ON employee_goals(status);
CREATE INDEX idx_employee_goals_created_at ON employee_goals(created_at);

-- Full-text search indexes for goal content
CREATE INDEX idx_employee_goals_title_search ON employee_goals USING gin(to_tsvector('english', title));
CREATE INDEX idx_employee_goals_content_search ON employee_goals USING gin(to_tsvector('english', coalesce(development_need, '') || ' ' || coalesce(development_activity, '') || ' ' || coalesce(development_goal_description, '')));
```

## Migration Strategy

### Data Migration Implementation
```javascript
// Migration from version 1.0.0 to future versions
const goalsMigrations = {
  '1.0.0': (data) => data, // Initial version
  '1.1.0': (data) => {
    // Example future migration
    return {
      ...data,
      version: '1.1.0',
      data: Object.fromEntries(
        Object.entries(data.data).map(([id, goal]) => [
          id,
          {
            ...goal,
            priority: 'medium', // New field with default
          }
        ])
      )
    };
  }
};
```

## Rationale

**Local Storage Structure:** Follows existing application patterns with version-controlled data and service layer abstraction. This ensures consistency with current architecture while enabling smooth migration to cloud storage.

**Foreign Key Relationships:** Goals are linked to team members via employeeId, maintaining referential integrity and enabling efficient queries for member-specific goals.

**Text Field Sizing:** Title uses VARCHAR(500) for reasonable length limits, while description fields use TEXT for unlimited content to accommodate detailed goal descriptions.

**Status Enumeration:** Limited set of status values ensures data consistency and enables efficient filtering and reporting.

**Indexing Strategy:** Includes performance indexes for common query patterns (by employee, status, date) and full-text search capabilities for goal content searching.

## Data Integrity

**Constraints:**
- NOT NULL on required fields (id, employee_id, title)
- CHECK constraint on status values for data validation
- Foreign key constraint ensures goals are always linked to valid team members

**Cascade Behavior:**
- ON DELETE CASCADE for employee_goals when team member is deleted
- Maintains data consistency and prevents orphaned goal records