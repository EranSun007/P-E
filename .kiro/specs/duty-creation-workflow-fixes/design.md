# Design Document

## Overview

This design addresses the duty creation workflow issues by implementing proper form state management, user feedback mechanisms, and duplicate prevention. The solution focuses on creating a consistent, reliable user experience across all duty creation entry points while preventing the technical issues that lead to duplicate entries.

## Architecture

### Component Structure

```
DutyForm (Enhanced)
├── Form State Management
│   ├── Loading States
│   ├── Success States
│   ├── Error States
│   └── Reset Mechanisms
├── Duplicate Prevention
│   ├── Client-side Validation
│   ├── Server-side Checks
│   └── User Confirmation
└── Feedback Systems
    ├── Success Messages
    ├── Error Messages
    └── Loading Indicators
```

### State Management Flow

```
Form Submission Flow:
1. User clicks Save
2. Form enters loading state (button disabled)
3. Client-side validation
4. Duplicate check
5. API call to save duty
6. Handle response (success/error)
7. Update UI accordingly
8. Reset form if successful
```

## Components and Interfaces

### Enhanced DutyForm Component

**Props Interface:**
```javascript
interface DutyFormProps {
  duty?: Duty;
  onSuccess: (duty: Duty) => void;
  onCancel: () => void;
  onError?: (error: Error) => void;
  teamMemberId?: string;
  initialData?: Partial<Duty>;
}
```

**State Interface:**
```javascript
interface DutyFormState {
  isLoading: boolean;
  isSubmitting: boolean;
  errors: Record<string, string>;
  showSuccess: boolean;
  duplicateWarning?: DuplicateWarning;
}
```

### Form State Management

**Loading States:**
- `isLoading`: General loading state for form initialization
- `isSubmitting`: Specific state for save operation
- Button states: Disabled during submission
- Visual indicators: Spinner on save button

**Success Handling:**
- Success message display (3-second auto-hide)
- Automatic form reset
- Parent callback with created duty
- Dialog/popup closure

**Error Handling:**
- Field-level validation errors
- API error messages
- Network error handling
- Form data preservation on error

### Duplicate Prevention System

**Client-side Checks:**
```javascript
interface DuplicateCheck {
  teamMemberId: string;
  startDate: Date;
  endDate: Date;
  dutyType: string;
}

function checkForDuplicates(newDuty: DuplicateCheck): Promise<DuplicateWarning[]>
```

**Duplicate Detection Logic:**
1. Check existing duties for same team member
2. Check for overlapping date ranges
3. Check for same duty type in overlapping period
4. Return warnings with conflict details

**User Confirmation Flow:**
- Show warning dialog if potential duplicates found
- Allow user to proceed or cancel
- Provide details about conflicting duties
- Option to edit conflicting duty instead

### API Integration

**Enhanced Save Operation:**
```javascript
async function saveDuty(dutyData: DutyData): Promise<SaveResult> {
  // 1. Server-side duplicate check
  // 2. Atomic save operation
  // 3. Calendar event creation
  // 4. Return comprehensive result
}

interface SaveResult {
  success: boolean;
  duty?: Duty;
  error?: string;
  warnings?: string[];
  duplicatesCreated?: boolean;
}
```

**Idempotency Handling:**
- Request deduplication using temporary IDs
- Server-side duplicate prevention
- Transaction rollback on conflicts

## Data Models

### Enhanced Duty Model

```javascript
interface Duty {
  id: string;
  team_member_id: string;
  type: 'devops' | 'on_call' | 'other';
  title: string;
  description?: string;
  start_date: string;
  end_date: string;
  is_rotation: boolean;
  rotation_id?: string;
  created_at: string;
  updated_at: string;
  // New fields for duplicate prevention
  creation_session_id?: string; // Prevent double-submission
  source: 'manual' | 'rotation' | 'import';
}
```

### Form Validation Schema

```javascript
const dutyValidationSchema = {
  team_member_id: {
    required: true,
    message: 'Team member is required'
  },
  title: {
    required: true,
    minLength: 1,
    maxLength: 100,
    message: 'Title is required and must be under 100 characters'
  },
  start_date: {
    required: true,
    validate: (value, formData) => {
      // Must be valid date
      // Must be before end_date
      // Cannot be more than 1 year in the past
    }
  },
  end_date: {
    required: true,
    validate: (value, formData) => {
      // Must be valid date
      // Must be after start_date
      // Cannot be more than 2 years in the future
    }
  }
};
```

## Error Handling

### Error Categories

**Validation Errors:**
- Field-level validation (required, format, length)
- Cross-field validation (date ranges, conflicts)
- Business rule validation (team member availability)

**API Errors:**
- Network connectivity issues
- Server errors (500, 503)
- Authentication/authorization errors
- Data conflicts (409)

**User Experience Errors:**
- Duplicate prevention warnings
- Confirmation dialogs
- Recovery suggestions

### Error Display Strategy

**Field-level Errors:**
- Red border on invalid fields
- Error message below field
- Icon indicator for error state

**Form-level Errors:**
- Alert banner at top of form
- Specific error messages
- Action buttons for resolution

**Success Feedback:**
- Green checkmark animation
- Success message with duty details
- Auto-close after confirmation

## Testing Strategy

### Unit Tests

**Form Component Tests:**
- Form validation logic
- State management transitions
- Error handling scenarios
- Success flow completion

**Duplicate Prevention Tests:**
- Duplicate detection algorithms
- Edge cases (same day, overlapping)
- Performance with large datasets

### Integration Tests

**API Integration:**
- Save operation success/failure
- Network error handling
- Duplicate prevention server-side

**User Workflow Tests:**
- Complete creation flow
- Error recovery flows
- Multiple entry point consistency

### End-to-End Tests

**User Journey Tests:**
- Create duty from team member profile
- Create duty from calendar
- Create duty from duty management page
- Handle duplicate scenarios
- Verify calendar updates

## Performance Considerations

### Form Optimization

**Debounced Validation:**
- Validate fields after user stops typing (300ms delay)
- Avoid excessive API calls during typing
- Cache validation results

**Duplicate Check Optimization:**
- Client-side filtering before API call
- Indexed database queries
- Batch duplicate checks

### Memory Management

**Form State Cleanup:**
- Clear form data on unmount
- Remove event listeners
- Cancel pending API requests

**Calendar Update Optimization:**
- Optimistic updates for better UX
- Rollback on failure
- Efficient re-rendering

## Security Considerations

### Input Validation

**Client-side Validation:**
- Sanitize all user inputs
- Validate date ranges
- Check for XSS attempts

**Server-side Validation:**
- Duplicate all client-side checks
- Additional business rule validation
- Rate limiting for form submissions

### Data Integrity

**Atomic Operations:**
- Duty creation and calendar event creation in single transaction
- Rollback on partial failures
- Consistent state across all views

**Audit Trail:**
- Log all duty creation attempts
- Track duplicate prevention actions
- Monitor for suspicious patterns

## Migration Strategy

### Existing Data

**Current Duty Records:**
- No changes required to existing duties
- Add new fields with default values
- Maintain backward compatibility

### Deployment Plan

**Phase 1: Enhanced Form Component**
- Deploy improved DutyForm with better state management
- Add loading states and success feedback
- Maintain existing API compatibility

**Phase 2: Duplicate Prevention**
- Add client-side duplicate detection
- Implement user confirmation flows
- Add server-side duplicate checks

**Phase 3: Cross-component Consistency**
- Update all duty creation entry points
- Ensure consistent behavior
- Add comprehensive error handling

### Rollback Plan

**Component Rollback:**
- Keep previous DutyForm version as backup
- Feature flags for new functionality
- Quick rollback capability

**Data Rollback:**
- No data migration required
- New fields are optional
- Existing functionality preserved