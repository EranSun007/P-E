# Design Document

## Overview

This feature enhances the team member experience by surfacing relevant agenda items and meeting notes that reference specific team members. The design leverages the existing `referenced_entity` tagging system in OneOnOne meeting notes to create a cross-referenced agenda view that helps users prepare for meetings and track action items that involve them.

The solution integrates seamlessly with the current Team.jsx and TeamMemberProfile.jsx components, adding new UI sections and data processing logic without disrupting existing workflows.

## Architecture

### Data Flow

```mermaid
graph TD
    A[OneOnOne Meetings] --> B[Meeting Notes with referenced_entity tags]
    B --> C[Agenda Processing Service]
    C --> D[Team Member Profile Display]
    C --> E[Team Members List Indicators]
    
    F[User Creates Tagged Note] --> G[referenced_entity: {type: 'team_member', id: 'xyz'}]
    G --> H[Real-time Agenda Update]
    H --> I[Profile Badge/Counter Update]
```

### Component Architecture

The design follows the existing component structure:

1. **Team.jsx** - Enhanced with agenda indicators
2. **TeamMemberProfile.jsx** - Enhanced with agenda sections  
3. **New AgendaService** - Utility for processing tagged notes
4. **New AgendaComponents** - Reusable UI components for agenda display

## Components and Interfaces

### 1. AgendaService Utility

A new utility service to handle agenda-related data processing:

```javascript
// src/utils/agendaService.js
export class AgendaService {
  // Get all notes that reference a specific team member
  static async getAgendaItemsForMember(memberId)
  
  // Get agenda summary counts for all team members
  static async getAgendaSummaryForAllMembers()
  
  // Mark agenda items as discussed/resolved
  static async markAgendaItemDiscussed(meetingId, noteIndex)
}
```

### 2. Enhanced Team.jsx Component

**New Features:**
- Agenda indicator badges on team member cards
- Quick preview of pending agenda items
- Visual cues for members with tagged items

**Data Structure:**
```javascript
const enhancedMembers = members.map(member => ({
  ...member,
  agendaItems: {
    count: number,
    recentItems: Array<AgendaItem>,
    hasUnresolved: boolean
  }
}));
```

### 3. Enhanced TeamMemberProfile.jsx Component

**New Sections:**
- "Next Agenda Items" card in sidebar
- "Tagged in Other Meetings" section in main content
- Action buttons for marking items as discussed

**AgendaItem Interface:**
```javascript
interface AgendaItem {
  id: string;
  meetingId: string;
  meetingDate: string;
  noteText: string;
  createdBy: string;
  isDiscussed: boolean;
  meetingOwner: string;
}
```

### 4. New UI Components

#### AgendaItemCard Component
```javascript
// src/components/agenda/AgendaItemCard.jsx
// Displays individual agenda items with meeting context
```

#### AgendaBadge Component  
```javascript
// src/components/agenda/AgendaBadge.jsx
// Shows agenda count indicators on team member cards
```

## Data Models

### Extended OneOnOne Model

The existing OneOnOne model already supports the required structure:

```javascript
{
  id: string,
  team_member_id: string,
  date: string,
  notes: Array<{
    text: string,
    referenced_entity: {
      type: 'team_member' | 'stakeholder' | 'project',
      id: string
    },
    created_by: string,
    timestamp: string
  }>,
  // ... other existing fields
}
```

### New AgendaItem Processing Model

```javascript
interface ProcessedAgendaItem {
  noteId: string;
  meetingId: string;
  meetingDate: Date;
  noteText: string;
  referencedMemberId: string;
  createdBy: string;
  meetingOwner: string;
  isDiscussed: boolean;
  discussedAt?: Date;
}
```

## Error Handling

### Data Consistency
- Handle cases where referenced team members no longer exist
- Graceful degradation when OneOnOne data is malformed
- Fallback UI states for empty agenda items

### Performance Considerations
- Implement caching for agenda item calculations
- Lazy loading of agenda data on team member profile pages
- Debounced updates when marking items as discussed

### Error States
- Display appropriate messages when agenda data fails to load
- Handle network errors gracefully with retry mechanisms
- Provide fallback UI when referenced entities are missing

## Testing Strategy

### Unit Tests
- AgendaService utility functions
- Data processing and filtering logic
- Component rendering with various data states

### Integration Tests
- End-to-end agenda item creation and display flow
- Cross-component data consistency
- Real-time updates between team list and profile pages

### User Acceptance Tests
- Verify agenda items appear correctly on team member profiles
- Test marking items as discussed functionality
- Validate agenda indicators on main team page
- Ensure seamless integration with existing 1:1 meeting workflow

## Implementation Phases

### Phase 1: Core Data Processing
- Implement AgendaService utility
- Add agenda data processing to existing components
- Basic agenda item display on team member profiles

### Phase 2: Enhanced UI Components
- Create dedicated agenda UI components
- Add agenda indicators to team member cards
- Implement "mark as discussed" functionality

### Phase 3: Real-time Updates & Polish
- Add real-time agenda updates
- Performance optimizations
- Enhanced error handling and edge cases
- UI polish and accessibility improvements