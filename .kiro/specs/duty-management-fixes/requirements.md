# Requirements Document

## Introduction

This feature addresses critical bugs in the duty management system and adds rotation functionality for team duty assignments. The current system has duplicate entry issues, calendar event duplication, and lacks proper rotation scheduling for team duties like on-call rotations.

## Requirements

### Requirement 1: Fix Duty Entry Duplication

**User Story:** As a manager, I want to assign duties to team members without creating duplicate entries, so that the duty assignments are clean and conflict-free.

#### Acceptance Criteria

1. WHEN I create a new duty assignment THEN the system SHALL prevent duplicate entries for the same team member and duty type
2. WHEN I save a duty assignment THEN the system SHALL validate against existing duties before creating the entry
3. IF a duplicate duty is detected THEN the system SHALL show a clear error message and prevent creation
4. WHEN I view duty assignments THEN the system SHALL display each duty only once without conflicts

### Requirement 2: Implement Duty Title Dropdown

**User Story:** As a manager, I want to select duty titles from a predefined list, so that duty assignments are consistent and standardized.

#### Acceptance Criteria

1. WHEN I create or edit a duty assignment THEN the system SHALL provide a dropdown with options: "Reporting", "Metering", "DevOps"
2. WHEN I select a duty title THEN the system SHALL use the selected value consistently
3. WHEN I save a duty assignment THEN the system SHALL validate that the title is one of the allowed values
4. IF no title is selected THEN the system SHALL require selection before allowing save

### Requirement 3: Fix Calendar Event Duplication

**User Story:** As a manager, I want to see each duty event only once per day in the calendar, so that the calendar view is clean and accurate.

#### Acceptance Criteria

1. WHEN I view the calendar THEN the system SHALL display each duty event only once per day
2. WHEN a duty spans multiple days THEN the system SHALL show the event on each relevant day without duplication within the same day
3. WHEN I create a duty assignment THEN the system SHALL generate calendar events without creating duplicates
4. WHEN I update a duty assignment THEN the system SHALL update calendar events without creating additional duplicates

### Requirement 4: Implement Duty Rotation System

**User Story:** As a manager, I want to set up rotating duty assignments for my team, so that duties like on-call are fairly distributed among team members.

#### Acceptance Criteria

1. WHEN I create a duty assignment THEN the system SHALL allow me to specify the number of team members in the rotation
2. WHEN I set up a rotation THEN the system SHALL calculate the cycle length based on the number of participants
3. WHEN a team member's duty period ends THEN the system SHALL automatically schedule their next duty after the appropriate waiting period
4. WHEN I specify 5 team members in rotation THEN each member SHALL wait 4 weeks before their next duty assignment
5. WHEN I view rotation schedules THEN the system SHALL show the complete rotation cycle with all participants and their scheduled periods

### Requirement 5: Rotation Management Interface

**User Story:** As a manager, I want to manage duty rotations easily, so that I can set up, modify, and monitor rotating duties efficiently.

#### Acceptance Criteria

1. WHEN I create a new duty THEN the system SHALL provide an option to make it part of a rotation
2. WHEN I enable rotation THEN the system SHALL prompt for the number of team members in the cycle
3. WHEN I save a rotation duty THEN the system SHALL automatically generate future assignments for all participants
4. WHEN I view a rotation THEN the system SHALL show current assignee, next assignee, and full rotation schedule
5. WHEN I modify a rotation THEN the system SHALL update all future assignments accordingly
6. WHEN a rotation participant is unavailable THEN the system SHALL allow temporary adjustments without breaking the rotation cycle