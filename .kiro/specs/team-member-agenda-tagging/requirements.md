# Requirements Document

## Introduction

This feature enhances the team members page by utilizing the existing tagging system from 1:1 meetings to display relevant agenda information for tagged team members. When team members are tagged in meeting notes, this information will be surfaced on their profile to provide better visibility into upcoming discussion topics and action items that involve them.

## Requirements

### Requirement 1

**User Story:** As a manager, I want to see agenda items and notes that reference specific team members on their profile page, so that I can prepare for upcoming discussions and understand what topics involve each person.

#### Acceptance Criteria

1. WHEN viewing a team member's profile THEN the system SHALL display all meeting notes where the team member is tagged via referenced_entity
2. WHEN a team member is tagged in a meeting note THEN the system SHALL show this note in a dedicated "Next Agenda Items" or "Upcoming Topics" section on their profile
3. WHEN displaying tagged notes THEN the system SHALL show the meeting date, note content, and which meeting it came from
4. WHEN multiple notes reference the same team member THEN the system SHALL group them by meeting and sort by most recent first

### Requirement 2

**User Story:** As a team lead, I want to quickly identify which team members have pending agenda items, so that I can prioritize my 1:1 meetings and follow-up conversations.

#### Acceptance Criteria

1. WHEN viewing the main team members page THEN the system SHALL display a visual indicator (badge, count, or icon) for members who have tagged agenda items
2. WHEN a team member has tagged notes from recent meetings THEN the system SHALL show a count or summary of pending items
3. WHEN clicking on the agenda indicator THEN the system SHALL navigate to the team member's profile showing the relevant tagged items
4. WHEN no tagged items exist for a team member THEN the system SHALL not display any agenda indicators

### Requirement 3

**User Story:** As a team member, I want to see what topics and action items from other people's meetings involve me, so that I can prepare for discussions and understand my responsibilities.

#### Acceptance Criteria

1. WHEN viewing my own team member profile THEN the system SHALL display notes from other people's meetings where I am tagged
2. WHEN tagged in someone else's meeting note THEN the system SHALL show the context of who created the note and when
3. WHEN tagged notes contain action items or follow-up topics THEN the system SHALL highlight these prominently
4. WHEN viewing tagged items THEN the system SHALL provide a way to mark items as "discussed" or "resolved"

### Requirement 4

**User Story:** As a user, I want the agenda tagging feature to integrate seamlessly with the existing 1:1 meeting system, so that I don't need to learn new workflows or duplicate information.

#### Acceptance Criteria

1. WHEN creating meeting notes with tags THEN the system SHALL use the existing referenced_entity tagging mechanism
2. WHEN displaying tagged agenda items THEN the system SHALL maintain consistency with existing UI patterns and styling
3. WHEN navigating between team profiles and meeting details THEN the system SHALL provide clear navigation paths
4. WHEN the tagging system is updated THEN the agenda display SHALL reflect changes in real-time without requiring page refresh