# Design Document

## Overview

The Out of Office feature extends the existing Team Member entity to track periods when employees are unavailable. The design integrates seamlessly with the current team management system, calendar view, and team member profiles while maintaining consistency with existing UI patterns and data structures.

## Architecture

### Data Layer
The feature follows the existing entity pattern using the local client architecture. A new `OutOfOffice` entity will be created alongside existing entities like `TeamMember`, `Task`, and `OneOnOne`.

### Component Layer
New components will be built using the established UI component library (shadcn/ui) and follow existing patterns from team member management and calendar functionality.

### Integration Points
- **Team Member Profile**: Display out of office counter and management interface
- **Team Page**: Show current out of office status indicators
- **Calendar Page**: Display aggregated out of office information with interactive popups
- **Navigation**: Seamless integration with existing routing patterns

## Components and Interfaces

### Data Models

#### OutOfOffice Entity
```javascript
{
  id: string,
  team_member_id: string,
  start_date: string, // ISO date string
  end_date: string,   // ISO date string
  reason: string,     // enum: vacation, sick_day, day_off, personal_leave, training
  notes: string,      // optional additional details
  created_date: string,
  updated_date: string
}
```

#### OutOfOfficeReason Configuration
```javascript
{
  id: string,
  name: string,       // display name
  value: string,      // internal value
  active: boolean,    // whether this reason is available for new entries
  color: string,      // hex color for UI display
  order: number       // display order
}
```

### API Interface

#### OutOfOffice Entity Methods
- `OutOfOffice.list()` - Get all out of office periods
- `OutOfOffice.get(id)` - Get specific period
- `OutOfOffice.create(data)` - Create new period
- `OutOfOffice.update(id, data)` - Update existing period
- `OutOfOffice.delete(id)` - Delete period
- `OutOfOffice.getByTeamMember(teamMemberId)` - Get periods for specific team member
- `OutOfOffice.getActiveForDate(date)` - Get all active periods for a specific date
- `OutOfOffice.getCountForYear(teamMemberId, year)` - Get total days for calendar year

### UI Components

#### OutOfOfficeManager Component
**Location**: `src/components/team/OutOfOfficeManager.jsx`
**Purpose**: Main management interface for team member's out of office periods
**Features**:
- List view of all periods for a team member
- Create/edit/delete functionality
- Date range picker integration
- Reason selection dropdown
- Validation for date ranges

#### OutOfOfficeForm Component
**Location**: `src/components/team/OutOfOfficeForm.jsx`
**Purpose**: Form for creating/editing out of office periods
**Features**:
- Date range selection with calendar picker
- Reason dropdown with configurable options
- Notes field for additional details
- Validation and error handling

#### OutOfOfficeCounter Component
**Location**: `src/components/team/OutOfOfficeCounter.jsx`
**Purpose**: Display total out of office days for current year
**Features**:
- Animated counter display
- Breakdown by reason type (optional)
- Year selector for historical data

#### OutOfOfficeCalendarPopup Component
**Location**: `src/components/calendar/OutOfOfficeCalendarPopup.jsx`
**Purpose**: Popup showing out of office details on calendar dates
**Features**:
- List of team members out of office
- Return dates for each member
- Reason indicators with color coding

#### OutOfOfficeStatusBadge Component
**Location**: `src/components/team/OutOfOfficeStatusBadge.jsx`
**Purpose**: Small badge showing current out of office status
**Features**:
- Current status indicator
- Return date display
- Reason color coding

### Service Layer

#### OutOfOfficeService
**Location**: `src/services/outOfOfficeService.js`
**Purpose**: Business logic for out of office operations
**Methods**:
- `calculateDaysInPeriod(startDate, endDate)` - Calculate total days including weekends
- `getActivePeriodsForDate(date)` - Get all active periods for specific date
- `getYearlyStats(teamMemberId, year)` - Get statistics for calendar year
- `validatePeriod(startDate, endDate)` - Validate date range
- `checkOverlaps(teamMemberId, startDate, endDate, excludeId)` - Check for overlapping periods

## Data Models

### Database Schema Extensions

The existing local client storage will be extended to include out of office data:

```javascript
// Added to localClient entity definitions
OutOfOffice: {
  tableName: 'out_of_office',
  fields: {
    id: { type: 'string', primary: true },
    team_member_id: { type: 'string', required: true, foreign: 'TeamMember.id' },
    start_date: { type: 'string', required: true },
    end_date: { type: 'string', required: true },
    reason: { type: 'string', required: true },
    notes: { type: 'string' },
    created_date: { type: 'string', required: true },
    updated_date: { type: 'string', required: true }
  }
}
```

### Data Relationships

- **OutOfOffice → TeamMember**: Many-to-one relationship via `team_member_id`
- **OutOfOffice periods**: Can overlap for the same team member (with warnings)
- **Calendar integration**: Out of office periods appear as calendar events

## Error Handling

### Validation Rules
1. **Date Validation**: End date must be after or equal to start date
2. **Required Fields**: team_member_id, start_date, end_date, reason are required
3. **Date Format**: All dates must be valid ISO strings
4. **Reason Validation**: Must be from predefined list of active reasons

### Error States
- **Network Errors**: Graceful degradation with retry options
- **Validation Errors**: Clear field-level error messages
- **Conflict Warnings**: Non-blocking warnings for overlapping periods
- **Loading States**: Skeleton loaders during data operations

### Error Messages
```javascript
const ERROR_MESSAGES = {
  INVALID_DATE_RANGE: "End date must be after start date",
  REQUIRED_FIELD: "This field is required",
  NETWORK_ERROR: "Unable to save changes. Please try again.",
  OVERLAP_WARNING: "This period overlaps with an existing out of office period"
};
```

## Testing Strategy

### Unit Tests
- **OutOfOfficeService**: Test all business logic methods
- **Date calculations**: Verify day counting accuracy
- **Validation logic**: Test all validation rules
- **Component rendering**: Test UI component states

### Integration Tests
- **API operations**: Test CRUD operations with local client
- **Calendar integration**: Test calendar display and interactions
- **Team member profile**: Test counter updates and management interface
- **Cross-component communication**: Test data flow between components

### Test Files Structure
```
src/components/team/__tests__/
  - OutOfOfficeManager.test.jsx
  - OutOfOfficeForm.test.jsx
  - OutOfOfficeCounter.test.jsx

src/services/__tests__/
  - outOfOfficeService.test.js

src/utils/__tests__/
  - outOfOfficeIntegration.test.js
```

### Test Scenarios
1. **Creating out of office periods** with various date ranges and reasons
2. **Editing existing periods** and handling validation
3. **Calendar year transitions** and counter calculations
4. **Calendar popup interactions** and data display
5. **Team member status updates** and badge displays
6. **Error handling** for network failures and validation errors

## UI/UX Considerations

### Design Consistency
- Follow existing color schemes and component patterns
- Use established spacing and typography from current team pages
- Maintain consistent interaction patterns with existing forms

### Accessibility
- Proper ARIA labels for screen readers
- Keyboard navigation support
- Color contrast compliance for reason indicators
- Focus management in dialogs and forms

### Responsive Design
- Mobile-friendly calendar popup design
- Responsive layout for out of office management interface
- Touch-friendly interaction targets

### Performance
- Lazy loading of out of office data
- Efficient calendar rendering with minimal re-renders
- Optimistic updates for better user experience

## Integration Points

### Team Member Profile Integration
- Add out of office counter section below existing profile information
- Include management interface accessible via expandable section
- Show current status prominently if team member is currently out

### Team Page Integration
- Add out of office status badges to team member cards
- Include filter option for currently out of office members
- Show return dates in team member listings

### Calendar Integration
- Display out of office periods as calendar events
- Show aggregated counts on dates with multiple team members out
- Implement popup with detailed information on click
- Color-code different reasons for visual distinction

### Navigation Integration
- No new navigation items required
- All functionality accessible through existing team and calendar pages
- Deep linking support for team member out of office management