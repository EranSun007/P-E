# Design Document

## Overview

This design addresses the calendar improvements needed to fix visibility issues with past/future meetings, enhance visual differentiation between event types, add a weekly meeting overview sidebar, and implement recurring birthday events. The solution builds upon the existing calendar architecture while introducing new components and services to provide a more comprehensive and user-friendly calendar experience.

## Architecture

### Current Architecture Analysis

The existing calendar system consists of:
- **Calendar Page Component** (`src/pages/Calendar.jsx`) - Main calendar interface with month view
- **ViewModeManager Service** (`src/services/viewModeManager.js`) - Handles filtering events by type
- **CalendarEventGenerationService** (`src/services/calendarEventGenerationService.js`) - Generates events from various data sources
- **CalendarService** (`src/utils/calendarService.js`) - Manages 1:1 meeting calendar events
- **LocalClient API** (`src/api/localClient.js`) - Data persistence layer with CalendarEvent entity

### Enhanced Architecture

The improved architecture will extend the existing system with:

1. **Enhanced Event Loading Strategy** - Modify data loading to include all time periods
2. **Weekly Meeting Sidebar Component** - New component for weekly overview
3. **Enhanced Event Styling System** - Improved visual differentiation
4. **Recurring Birthday Event System** - Automatic yearly birthday generation
5. **Calendar Event Synchronization Service** - Ensure 1:1 meetings appear properly

## Components and Interfaces

### 1. Enhanced Calendar Page Component

**Location:** `src/pages/Calendar.jsx`

**Modifications:**
- Update `loadCalendarData()` to load events for extended date ranges (past and future)
- Add weekly meeting sidebar integration
- Enhance event styling with new color system
- Improve 1:1 meeting visibility logic

**New Props/State:**
```javascript
// Additional state for weekly overview
const [weeklyMeetings, setWeeklyMeetings] = useState([]);
const [currentWeekStart, setCurrentWeekStart] = useState(startOfWeek(new Date()));
```

### 2. Weekly Meeting Sidebar Component

**Location:** `src/components/calendar/WeeklyMeetingSidebar.jsx`

**Interface:**
```javascript
interface WeeklyMeetingSidebarProps {
  currentWeek: Date;
  meetings: CalendarEvent[];
  onMeetingClick: (meeting: CalendarEvent, date: Date) => void;
  onDateNavigate: (date: Date) => void;
  className?: string;
}
```

**Features:**
- Display meetings for current week (Monday to Sunday)
- Group meetings by day with clear date headers
- Show meeting time, title, and type indicators
- Handle empty states when no meetings exist
- Clickable meetings that navigate to specific dates
- Responsive design for different screen sizes

### 3. Enhanced Event Styling System

**Location:** `src/utils/eventStylingService.js`

**Interface:**
```javascript
interface EventStyling {
  className: string;
  icon: LucideIcon;
  color: string;
  backgroundColor: string;
  borderColor: string;
  textColor: string;
}

interface EventStylingService {
  getEventStyling(event: CalendarEvent): EventStyling;
  getEventTypeColors(): Record<string, EventStyling>;
  generateEventClassName(eventType: string, variant?: 'default' | 'compact' | 'sidebar'): string;
}
```

**Color Scheme:**
- **1:1 Meetings:** Orange/Amber (#f97316) with User icon
- **Regular Meetings:** Blue (#3b82f6) with Calendar icon  
- **Birthdays:** Pink (#ec4899) with Cake icon
- **Duties:** Purple (#8b5cf6) with Shield icon
- **Out of Office:** Orange (#f97316) with UserX icon

### 4. Recurring Birthday Event Service

**Location:** `src/services/recurringBirthdayService.js`

**Interface:**
```javascript
interface RecurringBirthdayService {
  generateBirthdayEventsForYears(teamMember: TeamMember, startYear: number, endYear: number): Promise<CalendarEvent[]>;
  updateBirthdayEventsForTeamMember(teamMemberId: string, newBirthdayDate: string): Promise<void>;
  deleteBirthdayEventsForTeamMember(teamMemberId: string): Promise<void>;
  ensureBirthdayEventsExist(teamMembers: TeamMember[], targetYears: number[]): Promise<void>;
}
```

**Features:**
- Generate birthday events for multiple years (current + next 2 years)
- Handle birthday date updates by regenerating future events
- Clean up birthday events when team members are deleted
- Prevent duplicate birthday events for the same year

### 5. Calendar Event Synchronization Service

**Location:** `src/services/calendarSynchronizationService.js`

**Interface:**
```javascript
interface CalendarSynchronizationService {
  syncOneOnOneMeetings(): Promise<SyncResult>;
  ensureOneOnOneVisibility(): Promise<void>;
  validateEventConsistency(): Promise<ValidationResult>;
  repairMissingEvents(): Promise<RepairResult>;
}
```

**Features:**
- Ensure all OneOnOne records with next_meeting_date have corresponding calendar events
- Repair missing calendar events for existing 1:1 meetings
- Validate data consistency between OneOnOne and CalendarEvent entities
- Provide detailed sync reports for debugging

## Data Models

### Enhanced CalendarEvent Entity

**Existing Fields:**
- `id`, `title`, `description`, `start_date`, `end_date`
- `all_day`, `event_type`, `team_member_id`
- `linked_entity_type`, `linked_entity_id`

**New/Enhanced Fields:**
```javascript
{
  // Enhanced recurrence support
  recurrence: {
    type: 'yearly' | 'monthly' | 'weekly' | 'daily',
    interval: number,
    endDate?: string,
    occurrences?: number
  },
  
  // Enhanced styling metadata
  styling: {
    color: string,
    backgroundColor: string,
    borderColor: string,
    icon: string
  },
  
  // Visibility and filtering
  isVisible: boolean,
  priority: 'low' | 'medium' | 'high',
  
  // Enhanced linking for better data integrity
  sourceEntityType: 'one_on_one' | 'duty' | 'out_of_office' | 'team_member',
  sourceEntityId: string
}
```

### Weekly Meeting Data Structure

```javascript
interface WeeklyMeetingData {
  weekStart: Date;
  weekEnd: Date;
  meetingsByDay: {
    [dayKey: string]: {
      date: Date;
      meetings: CalendarEvent[];
    }
  };
  totalMeetings: number;
  hasConflicts: boolean;
}
```

## Error Handling

### Event Loading Errors
- **Graceful Degradation:** If event loading fails, show cached events with warning
- **Retry Logic:** Implement exponential backoff for failed API calls
- **User Feedback:** Clear error messages with actionable suggestions

### Synchronization Errors
- **Partial Sync Recovery:** Continue sync process even if individual events fail
- **Conflict Resolution:** Handle cases where OneOnOne and CalendarEvent data conflicts
- **Audit Logging:** Log all sync operations for debugging

### Birthday Event Generation Errors
- **Individual Failure Isolation:** One team member's birthday failure shouldn't affect others
- **Validation Errors:** Handle invalid birthday dates gracefully
- **Duplicate Prevention:** Robust checking to prevent duplicate birthday events

## Testing Strategy

### Unit Tests

1. **Event Styling Service Tests**
   - Test color assignment for each event type
   - Verify icon mapping correctness
   - Test className generation for different variants

2. **Weekly Meeting Sidebar Tests**
   - Test meeting grouping by day
   - Verify empty state handling
   - Test meeting click navigation

3. **Recurring Birthday Service Tests**
   - Test multi-year birthday generation
   - Verify update and deletion logic
   - Test duplicate prevention

### Integration Tests

1. **Calendar Page Integration**
   - Test complete calendar loading with all event types
   - Verify weekly sidebar updates with calendar navigation
   - Test event filtering and view mode switching

2. **Data Synchronization Tests**
   - Test OneOnOne to CalendarEvent sync
   - Verify data consistency after operations
   - Test repair functionality for missing events

### End-to-End Tests

1. **Complete Calendar Workflow**
   - Create 1:1 meeting and verify calendar visibility
   - Navigate through months and verify event persistence
   - Test weekly sidebar functionality

2. **Birthday Event Lifecycle**
   - Add team member with birthday
   - Verify automatic birthday event creation
   - Test birthday date updates and event regeneration

### Performance Tests

1. **Large Dataset Handling**
   - Test calendar with 1000+ events
   - Measure rendering performance with weekly sidebar
   - Test memory usage with recurring events

2. **Date Range Loading**
   - Test performance with extended date ranges
   - Verify efficient event filtering
   - Test lazy loading for future/past events

## Implementation Considerations

### Performance Optimizations
- **Event Caching:** Cache loaded events to reduce API calls
- **Lazy Loading:** Load events for visible date ranges first
- **Memoization:** Use React.memo for expensive calendar calculations
- **Virtual Scrolling:** For weekly sidebar with many meetings

### Accessibility
- **Keyboard Navigation:** Full keyboard support for calendar and sidebar
- **Screen Reader Support:** Proper ARIA labels and announcements
- **Color Contrast:** Ensure all event colors meet WCAG standards
- **Focus Management:** Logical focus flow between calendar and sidebar

### Mobile Responsiveness
- **Responsive Sidebar:** Collapsible sidebar on mobile devices
- **Touch Interactions:** Proper touch targets for mobile users
- **Swipe Navigation:** Consider swipe gestures for month navigation
- **Compact Event Display:** Optimized event display for small screens

### Data Migration
- **Backward Compatibility:** Ensure existing calendar events continue to work
- **Gradual Migration:** Migrate event styling and recurrence data progressively
- **Fallback Handling:** Handle events without new styling metadata gracefully