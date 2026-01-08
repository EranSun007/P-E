# Implementation Plan

- [x] 1. Create AgendaService utility for data processing
  - Implement utility functions to extract and process agenda items from OneOnOne meeting notes
  - Create functions to filter notes by referenced_entity team member tags
  - Add agenda summary calculation methods for team member counts
  - _Requirements: 1.1, 1.4, 2.2_

- [x] 2. Create reusable agenda UI components
  - [x] 2.1 Implement AgendaItemCard component
    - Create component to display individual agenda items with meeting context
    - Include meeting date, note text, and meeting owner information
    - Add "mark as discussed" action button functionality
    - _Requirements: 1.3, 3.2, 3.4_

  - [x] 2.2 Implement AgendaBadge component
    - Create badge component to show agenda item counts on team member cards
    - Include visual indicators for pending/unresolved items
    - Add hover states and click navigation to member profiles
    - _Requirements: 2.1, 2.2, 2.3_

- [x] 3. Enhance Team.jsx with agenda indicators
  - [x] 3.1 Add agenda data loading to Team.jsx
    - Integrate AgendaService to load agenda summaries for all team members
    - Enhance existing team member data structure with agenda information
    - Add error handling for agenda data loading failures
    - _Requirements: 2.1, 2.2, 4.2_

  - [x] 3.2 Display agenda indicators on team member cards
    - Add AgendaBadge components to existing team member cards
    - Implement conditional rendering based on agenda item presence
    - Ensure consistent styling with existing card design
    - _Requirements: 2.1, 2.2, 2.4, 4.2_

- [x] 4. Enhance TeamMemberProfile.jsx with agenda sections
  - [x] 4.1 Add agenda data loading to team member profiles
    - Integrate AgendaService to load agenda items for specific team member
    - Filter and process notes where current member is tagged via referenced_entity
    - Add loading states and error handling for agenda data
    - _Requirements: 1.1, 1.2, 3.1, 4.1_

  - [x] 4.2 Create "Next Agenda Items" sidebar section
    - Add new card component in sidebar showing upcoming agenda items
    - Display agenda items from other people's meetings where member is tagged
    - Include meeting context and creation details
    - _Requirements: 1.3, 3.1, 3.2_

  - [x] 4.3 Implement "mark as discussed" functionality
    - Add action buttons to mark agenda items as discussed/resolved
    - Update OneOnOne meeting notes with discussed status
    - Implement local storage or database persistence for discussed state
    - _Requirements: 3.4, 4.4_

- [x] 5. Add real-time agenda updates
  - [x] 5.1 Implement agenda data refresh on note creation
    - Update agenda displays when new tagged notes are created in meetings
    - Refresh team member agenda counts after OneOnOne updates
    - Ensure consistency between team list and profile views
    - _Requirements: 4.4, 1.4_

  - [x] 5.2 Add agenda filtering and sorting
    - Sort agenda items by meeting date (most recent first)
    - Filter out discussed/resolved items with toggle option
    - Group agenda items by meeting when multiple items exist
    - _Requirements: 1.4, 3.3_

- [x] 6. Implement comprehensive error handling
  - [x] 6.1 Add graceful handling for missing referenced entities
    - Handle cases where tagged team members no longer exist
    - Display appropriate fallback text for deleted or invalid references
    - Prevent crashes when OneOnOne data structure is malformed
    - _Requirements: 4.1, 4.2_

  - [x] 6.2 Add empty state handling for agenda sections
    - Display appropriate messages when no agenda items exist
    - Provide helpful guidance for users on how agenda tagging works
    - Ensure consistent empty state styling with existing components
    - _Requirements: 2.4, 4.2_

- [x] 7. Write comprehensive tests for agenda functionality
  - [x] 7.1 Create unit tests for AgendaService
    - Test agenda item extraction from OneOnOne notes
    - Test filtering logic for referenced_entity team member tags
    - Test agenda summary calculations and edge cases
    - _Requirements: 1.1, 1.4, 2.2_

  - [x] 7.2 Create component tests for agenda UI elements
    - Test AgendaItemCard rendering with various data states
    - Test AgendaBadge display logic and click interactions
    - Test integration with existing Team and TeamMemberProfile components
    - _Requirements: 1.3, 2.1, 3.2_