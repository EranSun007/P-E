# Implementation Plan

- [x] 1. Fix Calendar Event Duplication Bug
  - Implement idempotent calendar event creation in `CalendarEvent.createDutyEvent`
  - Add unique constraint checking to prevent duplicate events for same duty
  - Create cleanup utility to remove existing duplicate calendar events
  - _Requirements: 3.1, 3.2, 3.3_

- [x] 2. Fix Duty Entry Duplication Bug
  - Enhance duplicate validation in `localClient.js` Duty entity to throw errors instead of warnings
  - Implement proper conflict detection that prevents save when duplicates exist
  - Add comprehensive validation for overlapping duty periods
  - _Requirements: 1.1, 1.2, 1.3, 1.4_

- [x] 3. Implement Duty Title Dropdown
  - Replace free-text title input with dropdown in `DutyForm.jsx`
  - Add predefined title options: "Reporting", "Metering", "DevOps"
  - Update form validation to require title selection
  - Modify existing duty data to use standardized titles
  - _Requirements: 2.1, 2.2, 2.3, 2.4_

- [x] 4. Create Duty Rotation Data Models
  - Add rotation fields to Duty entity in `localClient.js`
  - Create new DutyRotation entity with participant management
  - Implement rotation-specific validation and constraints
  - Add migration logic for existing duties to support rotation fields
  - _Requirements: 4.2, 4.3_

- [x] 5. Implement Duty Rotation Service
  - Create `dutyRotationService.js` with rotation calculation logic
  - Implement rotation schedule generation for multiple cycles
  - Add methods for advancing rotations and calculating next assignees
  - Create utility functions for rotation date calculations
  - _Requirements: 4.2, 4.3, 4.4, 4.5_

- [x] 6. Enhance DutyForm with Rotation Support
  - Add rotation toggle and participant count input to `DutyForm.jsx`
  - Implement rotation preview showing future assignments
  - Add validation for rotation configuration
  - Update form submission to handle rotation creation
  - _Requirements: 5.1, 5.2, 5.3, 5.4_

- [x] 7. Create DutyRotationManager Component
  - Build new component for managing duty rotations
  - Implement rotation timeline visualization
  - Add rotation creation and editing interfaces
  - Create participant management functionality
  - _Requirements: 5.4, 5.5, 5.6_

- [x] 8. Update DutyCard with Rotation Information
  - Add rotation badge display for rotating duties
  - Show next assignee and rotation schedule information
  - Add rotation management actions to duty cards
  - Update duty status indicators for rotation context
  - _Requirements: 4.4, 5.4_

- [x] 9. Implement Calendar Event Deduplication Cleanup
  - Create utility to identify and remove duplicate calendar events
  - Add data consistency validation for duty-calendar event relationships
  - Implement cleanup job for existing duplicate events
  - Add logging and reporting for cleanup operations
  - _Requirements: 3.1, 3.2, 3.3_

- [x] 10. Add Comprehensive Testing
  - Write unit tests for rotation service and calculations
  - Create integration tests for duty creation and calendar event generation
  - Add regression tests to prevent duplication bugs
  - Implement end-to-end tests for rotation workflow
  - _Requirements: 1.4, 3.3, 4.6, 5.6_

- [x] 11. Update UI Components for Error Handling
  - Enhance error display in DutyForm for duplicate prevention
  - Add user-friendly error messages for rotation conflicts
  - Implement proper loading states during duty operations
  - Add confirmation dialogs for rotation changes
  - _Requirements: 1.3, 1.4, 5.6_

- [x] 12. Integrate Rotation Management into Team Views
  - Add rotation display to team member profiles
  - Update team overview to show active rotations
  - Implement rotation status indicators across the application
  - Add rotation management to team management workflows
  - _Requirements: 4.4, 4.5, 5.4_