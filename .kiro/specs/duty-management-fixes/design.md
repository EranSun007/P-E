# Design Document

## Overview

This design addresses critical bugs in the duty management system and implements a rotation feature for team duty assignments. The current system has several issues:

1. **Duty Entry Duplication**: The conflict detection system warns but doesn't prevent duplicate entries, leading to multiple identical duties
2. **Calendar Event Duplication**: Calendar events are being created multiple times for the same duty, causing 4x duplication per day
3. **Missing Title Standardization**: Duty titles are free-form text instead of standardized dropdown options
4. **No Rotation Support**: The system lacks functionality for rotating duties among team members

## Architecture

### Component Structure
```
src/
├── components/duty/
│   ├── DutyForm.jsx (Enhanced with dropdown and rotation)
│   ├── DutyCard.jsx (Updated to show rotation info)
│   └── DutyRotationManager.jsx (New component)
├── services/
│   ├── dutyRotationService.js (New service)
│   └── calendarEventGenerationService.js (Fixed duplication)
├── api/
│   └── localClient.js (Enhanced duty validation)
└── utils/
    └── dutyUtils.js (New utility functions)
```

### Data Model Changes

#### Enhanced Duty Entity
```javascript
{
  id: string,
  team_member_id: string,
  type: 'reporting' | 'metering' | 'devops', // Standardized types
  title: string, // From dropdown selection
  description: string,
  start_date: string (ISO),
  end_date: string (ISO),
  // New rotation fields
  is_rotation: boolean,
  rotation_id: string, // Links duties in same rotation
  rotation_participants: number, // Total participants in rotation
  rotation_sequence: number, // Order in rotation (0-based)
  rotation_cycle_weeks: number, // Calculated cycle length
  created_date: string (ISO),
  updated_date: string (ISO)
}
```

#### New DutyRotation Entity
```javascript
{
  id: string,
  name: string, // e.g., "On-Call Rotation"
  type: 'reporting' | 'metering' | 'devops',
  participants: string[], // Array of team member IDs
  cycle_weeks: number, // Duration each person serves
  current_assignee_index: number, // Current person in rotation
  next_rotation_date: string (ISO),
  is_active: boolean,
  created_date: string (ISO),
  updated_date: string (ISO)
}
```

## Components and Interfaces

### 1. Enhanced DutyForm Component

**Purpose**: Fix duplication issues and add rotation support

**Key Changes**:
- Replace free-text title with dropdown (Reporting, Metering, DevOps)
- Add rotation toggle and participant count input
- Implement proper duplicate prevention (not just warnings)
- Add rotation preview showing future assignments

**Interface**:
```javascript
<DutyForm
  duty={duty}
  onSave={handleSave}
  onCancel={handleCancel}
  teamMembers={teamMembers}
  enableRotation={true} // New prop
/>
```

### 2. DutyRotationManager Component (New)

**Purpose**: Manage duty rotations and visualize rotation schedules

**Features**:
- Create and edit rotation configurations
- View rotation timeline with all participants
- Handle rotation transitions
- Manage participant changes

**Interface**:
```javascript
<DutyRotationManager
  rotations={rotations}
  teamMembers={teamMembers}
  onCreateRotation={handleCreate}
  onUpdateRotation={handleUpdate}
  onDeleteRotation={handleDelete}
/>
```

### 3. Enhanced DutyCard Component

**Purpose**: Display rotation information and next assignments

**Key Changes**:
- Show rotation badge for rotating duties
- Display "Next: [Name] in X weeks" for rotations
- Add rotation management actions

### 4. DutyRotationService (New)

**Purpose**: Handle all rotation logic and scheduling

**Key Methods**:
```javascript
class DutyRotationService {
  static async createRotation(config)
  static async generateRotationSchedule(rotationId, startDate, cycles)
  static async advanceRotation(rotationId)
  static async getNextAssignee(rotationId)
  static async calculateRotationDates(participants, cycleWeeks, startDate)
}
```

## Data Models

### Duty Title Standardization

**Current**: Free-form text input
**New**: Dropdown with predefined options

```javascript
const DUTY_TITLES = [
  { value: 'reporting', label: 'Reporting' },
  { value: 'metering', label: 'Metering' },
  { value: 'devops', label: 'DevOps' }
];
```

### Rotation Calculation Logic

For a rotation with N participants and cycle length C weeks:
- Each participant serves for C weeks
- After serving, they wait (N-1) * C weeks before next turn
- Total rotation cycle = N * C weeks

Example: 5 participants, 1-week cycles
- Person 1: Week 1, then waits 4 weeks (Week 6, 11, 16...)
- Person 2: Week 2, then waits 4 weeks (Week 7, 12, 17...)
- etc.

## Error Handling

### Duplicate Prevention Strategy

1. **Form Level**: Check for conflicts before allowing save
2. **API Level**: Strict validation with error throwing (not just warnings)
3. **Calendar Level**: Prevent duplicate event creation with proper deduplication

### Calendar Event Deduplication

**Root Cause**: Multiple calendar event creation calls for the same duty

**Solution**:
1. Add unique constraint checking in `CalendarEvent.createDutyEvent`
2. Implement idempotent event creation
3. Add cleanup job to remove duplicate events

```javascript
// Enhanced createDutyEvent with deduplication
async createDutyEvent(dutyId, teamMemberId, title, startDate, endDate, description) {
  // Check for existing events first
  const existing = await this.getByDutyId(dutyId);
  if (existing.length > 0) {
    console.log(`Calendar event already exists for duty ${dutyId}`);
    return existing[0];
  }
  
  // Create new event only if none exists
  return await this.create({...});
}
```

### Rotation Error Handling

1. **Participant Validation**: Ensure all participants exist and are active
2. **Date Conflicts**: Check for overlapping duties when creating rotations
3. **Rotation Integrity**: Validate rotation sequences and prevent gaps

## Testing Strategy

### Unit Tests

1. **DutyForm Tests**:
   - Dropdown selection validation
   - Duplicate prevention
   - Rotation configuration

2. **DutyRotationService Tests**:
   - Rotation schedule generation
   - Date calculations
   - Participant management

3. **Calendar Event Tests**:
   - Deduplication logic
   - Event creation idempotency
   - Cleanup operations

### Integration Tests

1. **End-to-End Duty Creation**:
   - Form submission → API → Calendar event creation
   - Verify single event creation per duty

2. **Rotation Workflow**:
   - Create rotation → Generate schedule → Advance rotation
   - Verify correct participant sequencing

### Bug Reproduction Tests

1. **Duplication Bug**: Create test that reproduces the 4x calendar event issue
2. **Conflict Bug**: Test that reproduces the duplicate duty creation
3. **Regression Tests**: Ensure fixes don't break existing functionality

## Implementation Phases

### Phase 1: Fix Existing Bugs
1. Fix calendar event duplication
2. Implement proper duplicate prevention
3. Add title dropdown

### Phase 2: Add Rotation Support
1. Create rotation data models
2. Implement rotation service
3. Add rotation UI components

### Phase 3: Enhanced Features
1. Rotation management interface
2. Advanced scheduling options
3. Notification system for rotation changes

## Migration Strategy

### Data Migration
- Add new rotation fields to existing duties (default: non-rotating)
- Create migration script to clean up duplicate calendar events
- Standardize existing duty titles to dropdown values

### Backward Compatibility
- Maintain existing duty structure
- Add rotation fields as optional
- Preserve existing calendar events (after deduplication)