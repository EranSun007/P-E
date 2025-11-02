# Recurring 1:1 UI Components - Integration Guide

**Created**: November 2, 2025
**Phase**: Phase 2 - UI Components
**Status**: Complete

## Overview

This guide explains how to integrate the newly created UI components for recurring 1:1 meeting schedules into the application.

## Components Created

### 1. ScheduleConfigForm
**Location**: `src/components/team/ScheduleConfigForm.jsx`
**Purpose**: Form for creating and editing recurring schedules
**Features**:
- Frequency selection (weekly, biweekly, monthly, custom)
- Day of week picker
- Time selection (24-hour format)
- Duration options (15 min to 2 hours)
- Start/end date configuration
- Real-time schedule description preview
- Full validation

**Usage Example**:
```javascript
import ScheduleConfigForm from '@/components/team/ScheduleConfigForm';

<ScheduleConfigForm
  teamMemberId="team-member-123"
  initialData={existingSchedule} // Optional for editing
  onSubmit={() => {
    // Handle successful save
    loadSchedule();
  }}
  onCancel={() => {
    // Handle cancel
    setShowForm(false);
  }}
/>
```

### 2. ScheduleOverview
**Location**: `src/components/team/ScheduleOverview.jsx`
**Purpose**: Table view showing all recurring schedules
**Features**:
- Lists all schedules with team member names
- Shows schedule frequency and next meeting
- Status indicators (Active, Paused, Ended)
- Actions: Edit, Pause/Resume, Delete
- Empty state with helpful messaging

**Usage Example**:
```javascript
import ScheduleOverview from '@/components/team/ScheduleOverview';

<ScheduleOverview
  onEdit={(schedule) => {
    // Open edit form
    setEditingSchedule(schedule);
    setShowForm(true);
  }}
  onDelete={(schedule) => {
    // Handle deletion callback
    console.log('Deleted schedule:', schedule.id);
  }}
  onRefresh={refreshTrigger} // Optional: trigger for refresh
/>
```

### 3. ScheduleIndicator
**Location**: `src/components/team/ScheduleIndicator.jsx`
**Purpose**: Visual badge showing schedule status with tooltip
**Features**:
- Compact badge display
- Rich tooltip with full schedule details
- Shows next/last meeting dates
- Status-based styling
- Multiple size options

**Usage Example**:
```javascript
import ScheduleIndicator from '@/components/team/ScheduleIndicator';

<ScheduleIndicator
  schedule={scheduleObject}
  size="default" // Options: 'sm', 'default', 'lg'
  showNextMeeting={true}
/>
```

### 4. TeamMemberScheduleSection
**Location**: `src/components/team/TeamMemberScheduleSection.jsx`
**Purpose**: Complete schedule management section for team member profile
**Features**:
- Displays current schedule with all details
- Create/Edit/Delete schedule
- Pause/Resume schedule
- Integrated form dialog
- Status indicators
- Empty state with CTA

**Usage Example**:
```javascript
import TeamMemberScheduleSection from '@/components/team/TeamMemberScheduleSection';

<TeamMemberScheduleSection
  teamMemberId={memberId}
  teamMemberName={member.name}
  onScheduleChange={() => {
    // Refresh parent data if needed
    loadData();
  }}
/>
```

## Integration into TeamMemberProfile

### Step 1: Add Import

Add the import at the top of `src/pages/TeamMemberProfile.jsx`:

```javascript
import TeamMemberScheduleSection from '@/components/team/TeamMemberScheduleSection';
```

### Step 2: Add Schedule Section

Add the schedule section in the right sidebar, after the "Next 1:1 Meeting" section and before "Quick Stats":

```javascript
{/* Next 1:1 Meeting Section */}
<Card>
  {/* ... existing next meeting code ... */}
</Card>

{/* NEW: Recurring Schedule Section */}
<TeamMemberScheduleSection
  teamMemberId={memberId}
  teamMemberName={member?.name}
  onScheduleChange={() => {
    loadData(); // Refresh all data when schedule changes
  }}
/>

{/* Quick Stats */}
<Card>
  {/* ... existing quick stats code ... */}
</Card>
```

### Approximate Line Location

Based on the current file structure:
- Insert around line **1607**, between the "Next 1:1 Meeting" card and "Quick Stats" card

## Integration into Dashboard/Management Pages

### Option 1: Full Overview Page

Create a new page for schedule management:

```javascript
// src/pages/ScheduleManagement.jsx
import ScheduleOverview from '@/components/team/ScheduleOverview';

export default function ScheduleManagement() {
  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Recurring 1:1 Schedules</h1>
        <p className="text-muted-foreground">
          Manage all recurring one-on-one meeting schedules
        </p>
      </div>
      <ScheduleOverview />
    </div>
  );
}
```

### Option 2: Add to Team List

Add schedule indicators to the team list view:

```javascript
import ScheduleIndicator from '@/components/team/ScheduleIndicator';

// In your team list mapping:
{teamMembers.map(member => (
  <div key={member.id}>
    <div className="flex items-center gap-2">
      <span>{member.name}</span>
      {member.schedule && (
        <ScheduleIndicator
          schedule={member.schedule}
          size="sm"
          showNextMeeting={false}
        />
      )}
    </div>
  </div>
))}
```

## Testing the Integration

### 1. Create a Schedule

1. Navigate to a team member's profile
2. Scroll to the "Recurring 1:1 Schedule" section
3. Click "Create Recurring Schedule"
4. Fill out the form:
   - Frequency: Weekly
   - Day: Monday
   - Time: 14:00
   - Duration: 60 minutes
5. Click "Create Schedule"
6. Verify schedule appears with all details

### 2. Verify Automatic Meeting Generation

1. Check that a OneOnOne record was created
2. Verify calendar event was created
3. Confirm next meeting date is correct

### 3. Test Edit Functionality

1. Click "Edit" in the schedule section
2. Change the time or frequency
3. Save and verify changes are reflected
4. Check that next meeting date recalculated correctly

### 4. Test Pause/Resume

1. Click "Pause" button
2. Verify status badge shows "Paused"
3. Click "Resume" button
4. Verify status returns to "Active"

### 5. Test Delete

1. Click "Delete" button
2. Confirm deletion in dialog
3. Verify schedule is removed
4. Confirm upcoming meetings were deleted

## Styling and Customization

### Component Sizes

All components respect TailwindCSS and Radix UI theming:

```javascript
// Small indicator for compact views
<ScheduleIndicator schedule={schedule} size="sm" />

// Large indicator for emphasis
<ScheduleIndicator schedule={schedule} size="lg" />
```

### Status Colors

- **Active**: Default blue badge
- **Paused**: Secondary gray badge
- **Ended**: Destructive red badge

### Responsive Design

All components are fully responsive:
- Forms adapt to mobile viewports
- Tables scroll horizontally on small screens
- Dialogs adjust to viewport height

## Known Limitations

1. **No conflict detection UI**: While the backend detects conflicts, the UI doesn't show warnings yet
2. **No bulk operations**: Can't create/edit multiple schedules at once
3. **No schedule templates**: Every schedule must be configured manually
4. **No holiday awareness**: Schedules don't skip holidays automatically

## Future Enhancements

### Phase 3 Considerations

1. **Schedule Templates**: Pre-defined schedule configurations
2. **Bulk Operations**: Apply schedule patterns to multiple team members
3. **Conflict Warnings**: Visual indicators for scheduling conflicts
4. **Holiday Integration**: Option to skip holidays automatically
5. **Analytics**: Dashboard showing schedule effectiveness
6. **Mobile App**: Native mobile interface for schedule management

## Troubleshooting

### Schedule not appearing after creation

**Issue**: Created schedule but it doesn't show up
**Solution**:
1. Check browser console for errors
2. Verify `OneOnOneScheduleService.createSchedule` succeeded
3. Check localStorage key `one_on_one_schedules`
4. Refresh the page to reload data

### Calendar events not being created

**Issue**: Schedule created but no calendar events
**Solution**:
1. Check `CalendarService` logs in console
2. Verify `CalendarEvent` entity has `schedule_id` and `is_recurring` fields
3. Check for duplicate calendar events
4. Try manual sync with `CalendarSynchronizationService`

### Form validation errors

**Issue**: Can't save schedule due to validation
**Solution**:
1. Verify time is in HH:mm 24-hour format
2. Check day_of_week is 0-6
3. Confirm duration is 15-480 minutes
4. Ensure no existing active schedule for team member

## API Reference

### OneOnOneScheduleService Methods

```javascript
// Create schedule
const { schedule, firstMeeting, calendarEvent } =
  await OneOnOneScheduleService.createSchedule(teamMemberId, {
    frequency: 'weekly',
    day_of_week: 1,
    time: '14:00',
    duration_minutes: 60,
    start_date: '2025-12-01'
  });

// Update schedule
await OneOnOneScheduleService.updateSchedule(scheduleId, updates, applyToFuture);

// Get schedule description
const description = OneOnOneScheduleService.getScheduleDescription(schedule);
// Returns: "Every week on Monday at 2:00 PM"

// Generate next meeting
const { nextMeeting, calendarEvent } =
  await OneOnOneScheduleService.generateNextMeeting(scheduleId, completedDate);

// Activate/Deactivate
await OneOnOneScheduleService.activateSchedule(scheduleId);
await OneOnOneScheduleService.deactivateSchedule(scheduleId);

// Delete with cleanup
await OneOnOneScheduleService.deleteSchedule(scheduleId, deleteUpcomingMeetings);
```

## Support

For questions or issues with the UI components:
1. Check this integration guide
2. Review component PropTypes in source files
3. Check browser console for error messages
4. Review Phase 1 implementation doc for backend behavior

---

*Phase 2 UI Components completed November 2, 2025*
*Ready for integration into TeamMemberProfile and other views*
