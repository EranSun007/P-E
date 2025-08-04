# P&E Manager - Entity Relationship Diagram (Updated)

## Core Entities and Relationships

```mermaid
erDiagram
    USER {
        string id PK
        string name
        string email
    }
    
    PROJECT {
        string id PK
        string name
        string description
        string status
        string start_date
        string end_date
        string deadline
        string owner
        string budget
        string cost
        string priority_level
        number progress_percentage
        string color
        array tags
        array stakeholders
        array analyses
        string created_date
    }
    
    TASK {
        string id PK
        string title
        string description
        string status
        string priority
        string type
        string project
        string due_date
        string assignee
        string estimated_hours
        string actual_hours
        string completion_date
        boolean strategic
        array tags
        array updates
        object metadata
        string created_date
        string updated_date
    }
    
    TEAM_MEMBER {
        string id PK
        string name
        string role
        string email
        string phone
        string company
        string department
        string availability
        array skills
        string notes
        string avatar
        string last_activity
        string created_date
    }
    
    STAKEHOLDER {
        string id PK
        string name
        string role
        string email
        string phone
        string company
        string influence_level
        string engagement_level
        string contact_info
        array tags
        string notes
        string created_date
    }
    
    ONE_ON_ONE {
        string id PK
        string team_member_id
        string date
        string status
        string location
        string notes
        array action_items
        string created_date
        string updated_date
    }
    
    TASK_ATTRIBUTE {
        string id PK
        string task_id
        string attribute_name
        string attribute_value
        string created_date
        string updated_date
    }
    
    MEETING {
        string id PK
        string title
        string description
        string date_time
        string duration
        string location
        array participants
        array agenda_items
        string status
        string project_id
        array action_items
        string created_date
        string updated_date
    }
    
    CALENDAR_EVENT {
        string id PK
        string title
        string description
        string start_date
        string end_date
        string event_type
        string related_id
        boolean all_day
        string recurrence_rule
        string created_date
    }
    
    NOTIFICATION {
        string id PK
        string title
        string message
        string type
        string related_entity
        string related_id
        boolean read
        string created_date
        string scheduled_date
    }
    
    REMINDER {
        string id PK
        string title
        string description
        string remind_date
        string related_entity
        string related_id
        boolean completed
        string created_date
    }
    
    COMMENT {
        string id PK
        string content
        string author_name
        string entity_type
        string entity_id
        string created_date
        string updated_date
    }

    %% Relationships
    PROJECT ||--o{ TASK : "contains"
    PROJECT ||--o{ STAKEHOLDER : "involves"
    PROJECT ||--o{ MEETING : "has_meetings"
    PROJECT ||--o{ COMMENT : "has_comments"
    TASK ||--o{ TASK_ATTRIBUTE : "has_attributes"
    TASK ||--o{ COMMENT : "has_comments"
    TASK ||--o{ CALENDAR_EVENT : "creates_events"
    TEAM_MEMBER ||--o{ ONE_ON_ONE : "participates_in"
    TEAM_MEMBER ||--o{ MEETING : "attends"
    MEETING ||--o{ CALENDAR_EVENT : "scheduled_as"
    CALENDAR_EVENT ||--o{ NOTIFICATION : "triggers"
    CALENDAR_EVENT ||--o{ REMINDER : "creates"
```

## Detailed Entity Descriptions

### 1. **USER** (Local User Entity)
- **Purpose**: Represents the local application user
- **Storage**: Not persisted (hardcoded local user)
- **Relationships**: Implicit owner of all data

### 2. **PROJECT** 
- **Purpose**: Main organizational unit for work
- **Key Fields**:
  - `status`: not_started, in_progress, on_hold, completed
  - `stakeholders`: Array of stakeholder IDs
  - `analyses`: AI-generated project analyses
- **Relationships**:
  - One-to-many with Tasks (via `task.project` field)
  - Many-to-many with Stakeholders (via `project.stakeholders` array)

### 3. **TASK**
- **Purpose**: Individual work items and activities
- **Key Fields**:
  - `type`: meeting, action, metric, etc.
  - `project`: String reference to project name
  - `metadata.meeting.participants`: Array of team member names
  - `updates`: Array of progress updates
- **Relationships**:
  - Many-to-one with Project (via `project` field)
  - Implicit many-to-many with Team Members (via meeting participants)

### 4. **TEAM_MEMBER**
- **Purpose**: People involved in projects and meetings
- **Key Fields**:
  - `availability`: full_time, part_time, contractor, remote
  - `skills`: Array of skill tags
- **Relationships**:
  - Implicit many-to-many with Tasks (via meeting participants)
  - One-to-many with OneOnOne sessions

### 5. **STAKEHOLDER**
- **Purpose**: External parties with project interest
- **Key Fields**:
  - `influence_level`: High, Medium, Low
  - `engagement_level`: Active, Passive, Resistant
- **Relationships**:
  - Many-to-many with Projects (via project.stakeholders)

### 6. **ONE_ON_ONE**
- **Purpose**: Individual meeting records
- **Relationships**:
  - Many-to-one with Team Members

### 7. **TASK_ATTRIBUTE**
- **Purpose**: Extended metadata for tasks
- **Relationships**:
  - Many-to-one with Tasks

## Key Relationship Patterns

### Project-Centric Organization
- Projects are the primary organizational unit
- Tasks belong to projects via string reference (`task.project = project.name`)
- Stakeholders are associated with projects via array references

### Flexible Team Collaboration
- Team members are linked to tasks through meeting participants
- No rigid assignment structure - allows for flexible collaboration
- Meeting-based task tracking captures actual participation

### Tag-Based Categorization
- Multiple entities use tag arrays for flexible categorization
- Projects, Tasks, and Stakeholders all support tagging
- Enables cross-cutting concerns and filtering

### Temporal Tracking
- All entities have creation timestamps
- Tasks have both created and updated dates
- Project analyses include timestamps for historical tracking

## Data Flow Patterns

1. **Project Creation** → **Task Assignment** → **Team Collaboration**
2. **Stakeholder Identification** → **Project Association** → **Engagement Tracking**
3. **Meeting Planning** → **Participant Assignment** → **Task Creation**
4. **Progress Updates** → **Task Status Changes** → **Project Progress Calculation**

## Storage Implementation
- All data stored in browser localStorage
- Each entity type has its own storage key
- No foreign key constraints - relationships maintained through naming conventions
- Soft references allow for flexible data management