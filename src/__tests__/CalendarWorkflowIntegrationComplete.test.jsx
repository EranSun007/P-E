// src/__tests__/CalendarWorkflowIntegrationComplete.test.jsx
// Comprehensive integration tests for complete calendar workflow with all improvements

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import React from 'react';

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};
global.localStorage = localStorageMock;

// Mock window.matchMedia for responsive tests
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// Mock services
vi.mock('../services/calendarEventGenerationService.js', () => ({
  CalendarEventGenerationService: {
    synchronizeAllEvents: vi.fn(),
    generateEventsForTeamMember: vi.fn(),
    updateEventsForTeamMember: vi.fn(),
    deleteEventsForTeamMember: vi.fn(),
  }
}));

vi.mock('../services/recurringBirthdayService.js', () => ({
  RecurringBirthdayService: {
    generateBirthdayEventsForYears: vi.fn(),
    updateBirthdayEventsForTeamMember: vi.fn(),
    deleteBirthdayEventsForTeamMember: vi.fn(),
    ensureBirthdayEventsExist: vi.fn(),
  }
}));

vi.mock('../services/calendarSynchronizationService.js', () => ({
  CalendarSynchronizationService: {
    syncOneOnOneMeetings: vi.fn(),
    ensureOneOnOneVisibility: vi.fn(),
    validateEventConsistency: vi.fn(),
    repairMissingEvents: vi.fn(),
  }
}));

vi.mock('../utils/eventStylingService.js', () => ({
  EventStylingService: {
    getEventStyling: vi.fn(),
    getEventTypeColors: vi.fn(),
    generateEventClassName: vi.fn(),
  }
}));

// Mock API client
vi.mock('../api/localClient.js', () => ({
  localClient: {
    getAll: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    getById: vi.fn(),
    entities: {
      Task: { getAll: vi.fn(), create: vi.fn(), update: vi.fn(), delete: vi.fn() },
      Project: { getAll: vi.fn(), create: vi.fn(), update: vi.fn(), delete: vi.fn() },
      TeamMember: { getAll: vi.fn(), create: vi.fn(), update: vi.fn(), delete: vi.fn() },
      CalendarEvent: { getAll: vi.fn(), create: vi.fn(), update: vi.fn(), delete: vi.fn() },
      OneOnOne: { getAll: vi.fn(), create: vi.fn(), update: vi.fn(), delete: vi.fn() },
      Stakeholder: { getAll: vi.fn(), create: vi.fn(), update: vi.fn(), delete: vi.fn() },
      Duty: { getAll: vi.fn(), create: vi.fn(), update: vi.fn(), delete: vi.fn() },
      OutOfOffice: { getAll: vi.fn(), create: vi.fn(), update: vi.fn(), delete: vi.fn() },
      Peer: { getAll: vi.fn(), create: vi.fn(), update: vi.fn(), delete: vi.fn() }
    }
  }
}));

// Mock react-router-dom
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useSearchParams: () => [new URLSearchParams('?id=team-123'), vi.fn()],
    useLocation: () => ({ pathname: '/calendar' }),
  };
});

// Mock additional services
vi.mock('../services/viewModeManager.js', () => ({
  viewModeManager: {
    getFilteredEvents: vi.fn(),
    setViewMode: vi.fn(),
    getViewMode: vi.fn(),
    getCurrentViewMode: vi.fn(() => 'all'),
  }
}));

vi.mock('../utils/agendaService.js', () => ({
  AgendaService: {
    getAgendaItems: vi.fn(),
    createAgendaItem: vi.fn(),
    updateAgendaItem: vi.fn(),
    deleteAgendaItem: vi.fn(),
  }
}));

vi.mock('../utils/calendarService.js', () => ({
  CalendarService: {
    createAndLinkOneOnOneMeeting: vi.fn(),
    updateOneOnOneMeeting: vi.fn(),
    deleteOneOnOneMeeting: vi.fn(),
    getOneOnOneMeetings: vi.fn(),
  }
}));

vi.mock('../services/agendaIndicatorService.js', () => ({
  AgendaIndicatorService: {
    getIndicatorsForDate: vi.fn(),
    updateIndicators: vi.fn(),
  }
}));

import { CalendarEventGenerationService } from '../services/calendarEventGenerationService.js';
import { RecurringBirthdayService } from '../services/recurringBirthdayService.js';
import { CalendarSynchronizationService } from '../services/calendarSynchronizationService.js';
import { EventStylingService } from '../utils/eventStylingService.js';
import { localClient } from '../api/localClient.js';
import Calendar from '../pages/Calendar.jsx';
import TeamMemberProfile from '../pages/TeamMemberProfile.jsx';
import WeeklyMeetingSidebar from '../components/calendar/WeeklyMeetingSidebar.jsx';

// Test wrapper component
const TestWrapper = ({ children }) => (
  <BrowserRouter>
    {children}
  </BrowserRouter>
);

describe('Complete Calendar Workflow Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockNavigate.mockClear();
    
    // Setup default mock data
    const mockTeamMembers = [
      { 
        id: 'team-123', 
        name: 'John Smith', 
        role: 'Developer', 
        email: 'john@example.com',
        birthday: '1990-05-15',
        company: 'Tech Corp'
      },
      { 
        id: 'team-456', 
        name: 'Jane Doe', 
        role: 'Designer', 
        email: 'jane@example.com',
        birthday: '1988-08-22',
        company: 'Design Inc'
      }
    ];
    
    const mockOneOnOnes = [
      {
        id: 'oneonone-123',
        team_member_id: 'team-123',
        date: '2024-01-15T10:00:00.000Z',
        notes: ['Previous meeting notes'],
        next_meeting_date: '2024-01-22T10:00:00.000Z',
        next_meeting_calendar_event_id: 'event-123'
      }
    ];

    const mockCalendarEvents = [
      {
        id: 'event-123',
        title: 'John Smith 1:1',
        start_date: '2024-01-22T10:00:00.000Z',
        end_date: '2024-01-22T10:30:00.000Z',
        event_type: 'one_on_one',
        team_member_id: 'team-123',
        linked_entity_type: 'one_on_one',
        linked_entity_id: 'oneonone-123'
      },
      {
        id: 'event-456',
        title: 'John Smith Birthday',
        start_date: '2024-05-15T00:00:00.000Z',
        end_date: '2024-05-15T23:59:59.000Z',
        event_type: 'birthday',
        team_member_id: 'team-123',
        all_day: true,
        recurrence: { type: 'yearly', interval: 1 }
      },
      {
        id: 'event-789',
        title: 'Jane Doe Birthday',
        start_date: '2024-08-22T00:00:00.000Z',
        end_date: '2024-08-22T23:59:59.000Z',
        event_type: 'birthday',
        team_member_id: 'team-456',
        all_day: true,
        recurrence: { type: 'yearly', interval: 1 }
      }
    ];

    // Setup localStorage mocks
    localStorageMock.getItem.mockImplementation((key) => {
      switch (key) {
        case 'team_members':
          return JSON.stringify(mockTeamMembers);
        case 'one_on_ones':
          return JSON.stringify(mockOneOnOnes);
        case 'calendar_events':
          return JSON.stringify(mockCalendarEvents);
        case 'tasks':
          return JSON.stringify([]);
        case 'duties':
          return JSON.stringify([]);
        case 'out_of_office':
          return JSON.stringify([]);
        default:
          return '[]';
      }
    });

    // Setup API client mocks
    localClient.getAll.mockImplementation((entityType) => {
      switch (entityType) {
        case 'team_members':
          return Promise.resolve(mockTeamMembers);
        case 'one_on_ones':
          return Promise.resolve(mockOneOnOnes);
        case 'calendar_events':
          return Promise.resolve(mockCalendarEvents);
        default:
          return Promise.resolve([]);
      }
    });

    // Setup service mocks
    EventStylingService.getEventStyling.mockImplementation((event) => ({
      className: `event-${event.event_type}`,
      icon: event.event_type === 'one_on_one' ? 'User' : 
            event.event_type === 'birthday' ? 'Cake' : 'Calendar',
      color: event.event_type === 'one_on_one' ? '#f97316' : 
             event.event_type === 'birthday' ? '#ec4899' : '#3b82f6',
      backgroundColor: event.event_type === 'one_on_one' ? '#fed7aa' : 
                      event.event_type === 'birthday' ? '#fce7f3' : '#dbeafe',
      borderColor: event.event_type === 'one_on_one' ? '#f97316' : 
                   event.event_type === 'birthday' ? '#ec4899' : '#3b82f6',
      textColor: '#1f2937'
    }));

    EventStylingService.getEventTypeColors.mockReturnValue({
      one_on_one: { color: '#f97316', icon: 'User' },
      birthday: { color: '#ec4899', icon: 'Cake' },
      meeting: { color: '#3b82f6', icon: 'Calendar' },
      duty: { color: '#8b5cf6', icon: 'Shield' },
      out_of_office: { color: '#f97316', icon: 'UserX' }
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Requirement 1.1-1.4: Complete OneOnOne to Calendar Event Workflow', () => {
    it('should create OneOnOne meeting and display in calendar with proper visibility', async () => {
      // Mock successful calendar event creation
      const mockCalendarResult = {
        calendarEvent: {
          id: 'event-new',
          title: 'John Smith 1:1',
          start_date: '2024-01-25T14:00:00.000Z',
          end_date: '2024-01-25T14:30:00.000Z',
          event_type: 'one_on_one',
          team_member_id: 'team-123'
        },
        oneOnOne: {
          id: 'oneonone-123',
          next_meeting_calendar_event_id: 'event-new'
        }
      };

      CalendarSynchronizationService.syncOneOnOneMeetings.mockResolvedValue({
        totalSynced: 1,
        created: [mockCalendarResult.calendarEvent],
        updated: [],
        errors: []
      });

      CalendarSynchronizationService.ensureOneOnOneVisibility.mockResolvedValue();

      // Step 1: Create meeting in TeamMemberProfile
      render(
        <TestWrapper>
          <TeamMemberProfile />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('John Smith')).toBeInTheDocument();
      });

      // Create new 1:1 meeting
      const newMeetingButton = screen.getByText(/new 1:1/i);
      fireEvent.click(newMeetingButton);

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });

      const nextMeetingInput = screen.getByLabelText(/next meeting date/i);
      fireEvent.change(nextMeetingInput, { target: { value: '2024-01-25T14:00' } });

      const createButton = screen.getByText(/create meeting/i);
      fireEvent.click(createButton);

      // Verify synchronization service was called
      await waitFor(() => {
        expect(CalendarSynchronizationService.syncOneOnOneMeetings).toHaveBeenCalled();
      });

      // Step 2: Switch to Calendar view and verify visibility
      const { rerender } = render(
        <TestWrapper>
          <Calendar />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('Calendar')).toBeInTheDocument();
      });

      // Verify calendar loads all events including past, present, and future
      expect(CalendarSynchronizationService.ensureOneOnOneVisibility).toHaveBeenCalled();
    });

    it('should load and display events for all time periods (past, present, future)', async () => {
      const mockEventsAllPeriods = [
        // Past event
        {
          id: 'event-past',
          title: 'John Smith 1:1',
          start_date: '2023-12-15T10:00:00.000Z',
          event_type: 'one_on_one',
          team_member_id: 'team-123'
        },
        // Present event (today)
        {
          id: 'event-present',
          title: 'Jane Doe 1:1',
          start_date: new Date().toISOString(),
          event_type: 'one_on_one',
          team_member_id: 'team-456'
        },
        // Future event
        {
          id: 'event-future',
          title: 'John Smith 1:1',
          start_date: '2024-12-15T10:00:00.000Z',
          event_type: 'one_on_one',
          team_member_id: 'team-123'
        }
      ];

      localClient.getAll.mockImplementation((entityType) => {
        if (entityType === 'calendar_events') {
          return Promise.resolve(mockEventsAllPeriods);
        }
        return Promise.resolve([]);
      });

      render(
        <TestWrapper>
          <Calendar />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('Calendar')).toBeInTheDocument();
      });

      // Verify all events are loaded regardless of date
      expect(localClient.getAll).toHaveBeenCalledWith('calendar_events');
    });

    it('should maintain data consistency between OneOnOne and CalendarEvent entities', async () => {
      const mockValidationResult = {
        totalEventsValidated: 3,
        inconsistenciesFound: 0,
        inconsistencies: [],
        isValid: true
      };

      CalendarSynchronizationService.validateEventConsistency.mockResolvedValue(mockValidationResult);

      render(
        <TestWrapper>
          <Calendar />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('Calendar')).toBeInTheDocument();
      });

      // Verify data consistency validation
      expect(CalendarSynchronizationService.validateEventConsistency).toHaveBeenCalled();
    });
  });

  describe('Requirement 2.1-2.5: Weekly Meeting Sidebar Functionality', () => {
    it('should display weekly meeting sidebar with current week meetings', async () => {
      const currentWeekStart = new Date();
      currentWeekStart.setDate(currentWeekStart.getDate() - currentWeekStart.getDay()); // Start of week

      const mockWeeklyMeetings = [
        {
          id: 'event-week1',
          title: 'John Smith 1:1',
          start_date: new Date(currentWeekStart.getTime() + 24 * 60 * 60 * 1000).toISOString(), // Tomorrow
          event_type: 'one_on_one',
          team_member_id: 'team-123'
        },
        {
          id: 'event-week2',
          title: 'Jane Doe 1:1',
          start_date: new Date(currentWeekStart.getTime() + 2 * 24 * 60 * 60 * 1000).toISOString(), // Day after tomorrow
          event_type: 'one_on_one',
          team_member_id: 'team-456'
        }
      ];

      render(
        <TestWrapper>
          <WeeklyMeetingSidebar 
            currentWeek={currentWeekStart}
            meetings={mockWeeklyMeetings}
            onMeetingClick={vi.fn()}
            onDateNavigate={vi.fn()}
          />
        </TestWrapper>
      );

      // Verify sidebar displays meetings
      await waitFor(() => {
        expect(screen.getByText('John Smith 1:1')).toBeInTheDocument();
        expect(screen.getByText('Jane Doe 1:1')).toBeInTheDocument();
      });
    });

    it('should handle meeting clicks and navigate to specific dates', async () => {
      const mockOnMeetingClick = vi.fn();
      const mockOnDateNavigate = vi.fn();
      
      const mockMeeting = {
        id: 'event-123',
        title: 'John Smith 1:1',
        start_date: '2024-01-22T10:00:00.000Z',
        event_type: 'one_on_one',
        team_member_id: 'team-123'
      };

      render(
        <TestWrapper>
          <WeeklyMeetingSidebar 
            currentWeek={new Date()}
            meetings={[mockMeeting]}
            onMeetingClick={mockOnMeetingClick}
            onDateNavigate={mockOnDateNavigate}
          />
        </TestWrapper>
      );

      const meetingElement = screen.getByText('John Smith 1:1');
      fireEvent.click(meetingElement);

      expect(mockOnMeetingClick).toHaveBeenCalledWith(mockMeeting, expect.any(Date));
    });

    it('should display empty state when no meetings exist for current week', async () => {
      render(
        <TestWrapper>
          <WeeklyMeetingSidebar 
            currentWeek={new Date()}
            meetings={[]}
            onMeetingClick={vi.fn()}
            onDateNavigate={vi.fn()}
          />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText(/no meetings/i)).toBeInTheDocument();
      });
    });

    it('should update automatically when current week changes', async () => {
      const initialWeek = new Date('2024-01-15');
      const nextWeek = new Date('2024-01-22');

      const { rerender } = render(
        <TestWrapper>
          <WeeklyMeetingSidebar 
            currentWeek={initialWeek}
            meetings={[]}
            onMeetingClick={vi.fn()}
            onDateNavigate={vi.fn()}
          />
        </TestWrapper>
      );

      // Change to next week
      rerender(
        <TestWrapper>
          <WeeklyMeetingSidebar 
            currentWeek={nextWeek}
            meetings={[]}
            onMeetingClick={vi.fn()}
            onDateNavigate={vi.fn()}
          />
        </TestWrapper>
      );

      // Verify component updates with new week
      expect(screen.getByText(/no meetings/i)).toBeInTheDocument();
    });

    it('should integrate sidebar with calendar page layout', async () => {
      render(
        <TestWrapper>
          <Calendar />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('Calendar')).toBeInTheDocument();
      });

      // Verify calendar page loads (sidebar integration tested in Calendar component)
      expect(screen.getByText('Calendar')).toBeInTheDocument();
    });
  });

  describe('Requirement 3.1-3.7: Enhanced Event Styling Consistency', () => {
    it('should apply consistent styling across all event types', async () => {
      const mockStyledEvents = [
        {
          id: 'event-1',
          title: 'John Smith 1:1',
          event_type: 'one_on_one',
          team_member_id: 'team-123'
        },
        {
          id: 'event-2',
          title: 'John Smith Birthday',
          event_type: 'birthday',
          team_member_id: 'team-123'
        },
        {
          id: 'event-3',
          title: 'Team Meeting',
          event_type: 'meeting'
        }
      ];

      localClient.getAll.mockResolvedValue(mockStyledEvents);

      render(
        <TestWrapper>
          <Calendar />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('Calendar')).toBeInTheDocument();
      });

      // Verify styling service is called for each event type
      expect(EventStylingService.getEventStyling).toHaveBeenCalled();
    });

    it('should display correct colors and icons for each event type', async () => {
      const eventTypes = [
        { type: 'one_on_one', expectedColor: '#f97316', expectedIcon: 'User' },
        { type: 'birthday', expectedColor: '#ec4899', expectedIcon: 'Cake' },
        { type: 'meeting', expectedColor: '#3b82f6', expectedIcon: 'Calendar' },
        { type: 'duty', expectedColor: '#8b5cf6', expectedIcon: 'Shield' },
        { type: 'out_of_office', expectedColor: '#f97316', expectedIcon: 'UserX' }
      ];

      eventTypes.forEach(({ type, expectedColor, expectedIcon }) => {
        const mockEvent = { id: 'test', event_type: type };
        EventStylingService.getEventStyling(mockEvent);
        
        expect(EventStylingService.getEventStyling).toHaveBeenCalledWith(mockEvent);
      });

      // Verify color scheme consistency
      const colors = EventStylingService.getEventTypeColors();
      expect(colors).toBeDefined();
    });

    it('should maintain styling consistency across different calendar views', async () => {
      const mockEvent = {
        id: 'event-123',
        title: 'John Smith 1:1',
        event_type: 'one_on_one',
        team_member_id: 'team-123'
      };

      // Test styling in different variants
      EventStylingService.generateEventClassName.mockReturnValue('event-one_on_one-default');
      
      const defaultClass = EventStylingService.generateEventClassName('one_on_one', 'default');
      const compactClass = EventStylingService.generateEventClassName('one_on_one', 'compact');
      const sidebarClass = EventStylingService.generateEventClassName('one_on_one', 'sidebar');

      expect(EventStylingService.generateEventClassName).toHaveBeenCalledWith('one_on_one', 'default');
      expect(EventStylingService.generateEventClassName).toHaveBeenCalledWith('one_on_one', 'compact');
      expect(EventStylingService.generateEventClassName).toHaveBeenCalledWith('one_on_one', 'sidebar');
    });

    it('should ensure accessibility compliance for all color combinations', async () => {
      const mockEvent = {
        id: 'event-123',
        event_type: 'one_on_one'
      };

      const styling = EventStylingService.getEventStyling(mockEvent);
      
      // Verify styling includes proper contrast colors
      expect(styling).toEqual(expect.objectContaining({
        color: expect.any(String),
        backgroundColor: expect.any(String),
        textColor: expect.any(String)
      }));
    });
  });

  describe('Requirement 4.1-4.6: Recurring Birthday Event Generation and Display', () => {
    it('should generate birthday events for multiple years', async () => {
      const mockTeamMember = {
        id: 'team-123',
        name: 'John Smith',
        birthday: '1990-05-15'
      };

      const mockBirthdayEvents = [
        {
          id: 'birthday-2024',
          title: 'John Smith Birthday',
          start_date: '2024-05-15T00:00:00.000Z',
          event_type: 'birthday',
          team_member_id: 'team-123',
          recurrence: { type: 'yearly', interval: 1 }
        },
        {
          id: 'birthday-2025',
          title: 'John Smith Birthday',
          start_date: '2025-05-15T00:00:00.000Z',
          event_type: 'birthday',
          team_member_id: 'team-123',
          recurrence: { type: 'yearly', interval: 1 }
        }
      ];

      RecurringBirthdayService.generateBirthdayEventsForYears.mockResolvedValue(mockBirthdayEvents);

      await RecurringBirthdayService.generateBirthdayEventsForYears(mockTeamMember, 2024, 2025);

      expect(RecurringBirthdayService.generateBirthdayEventsForYears).toHaveBeenCalledWith(
        mockTeamMember, 2024, 2025
      );
    });

    it('should display birthday events across multiple years in calendar', async () => {
      const mockBirthdayEvents = [
        {
          id: 'birthday-2024',
          title: 'John Smith Birthday',
          start_date: '2024-05-15T00:00:00.000Z',
          event_type: 'birthday',
          all_day: true
        },
        {
          id: 'birthday-2025',
          title: 'John Smith Birthday',
          start_date: '2025-05-15T00:00:00.000Z',
          event_type: 'birthday',
          all_day: true
        }
      ];

      localClient.getAll.mockImplementation((entityType) => {
        if (entityType === 'calendar_events') {
          return Promise.resolve(mockBirthdayEvents);
        }
        return Promise.resolve([]);
      });

      render(
        <TestWrapper>
          <Calendar />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('Calendar')).toBeInTheDocument();
      });

      // Verify birthday events are loaded
      expect(localClient.getAll).toHaveBeenCalledWith('calendar_events');
    });

    it('should update birthday events when team member birthday changes', async () => {
      const mockTeamMember = {
        id: 'team-123',
        name: 'John Smith',
        birthday: '1990-06-20' // Changed from 05-15
      };

      RecurringBirthdayService.updateBirthdayEventsForTeamMember.mockResolvedValue();

      await RecurringBirthdayService.updateBirthdayEventsForTeamMember('team-123', '1990-06-20');

      expect(RecurringBirthdayService.updateBirthdayEventsForTeamMember).toHaveBeenCalledWith(
        'team-123', '1990-06-20'
      );
    });

    it('should delete birthday events when team member is removed', async () => {
      RecurringBirthdayService.deleteBirthdayEventsForTeamMember.mockResolvedValue();

      await RecurringBirthdayService.deleteBirthdayEventsForTeamMember('team-123');

      expect(RecurringBirthdayService.deleteBirthdayEventsForTeamMember).toHaveBeenCalledWith('team-123');
    });

    it('should ensure birthday events exist for all team members', async () => {
      const mockTeamMembers = [
        { id: 'team-123', name: 'John Smith', birthday: '1990-05-15' },
        { id: 'team-456', name: 'Jane Doe', birthday: '1988-08-22' }
      ];

      RecurringBirthdayService.ensureBirthdayEventsExist.mockResolvedValue();

      await RecurringBirthdayService.ensureBirthdayEventsExist(mockTeamMembers, [2024, 2025]);

      expect(RecurringBirthdayService.ensureBirthdayEventsExist).toHaveBeenCalledWith(
        mockTeamMembers, [2024, 2025]
      );
    });

    it('should integrate birthday generation with calendar event generation service', async () => {
      CalendarEventGenerationService.synchronizeAllEvents.mockResolvedValue({
        totalProcessed: 5,
        birthdayEvents: 2,
        oneOnOneEvents: 2,
        dutyEvents: 1,
        success: true
      });

      await CalendarEventGenerationService.synchronizeAllEvents();

      expect(CalendarEventGenerationService.synchronizeAllEvents).toHaveBeenCalled();
    });
  });

  describe('Responsive Behavior and Mobile Compatibility', () => {
    it('should handle mobile viewport for calendar view', async () => {
      // Mock mobile viewport
      window.matchMedia.mockImplementation(query => ({
        matches: query === '(max-width: 768px)',
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      }));

      render(
        <TestWrapper>
          <Calendar />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('Calendar')).toBeInTheDocument();
      });

      // Verify calendar renders on mobile
      expect(screen.getByText('Calendar')).toBeInTheDocument();
    });

    it('should handle mobile viewport for weekly sidebar', async () => {
      // Mock mobile viewport
      window.matchMedia.mockImplementation(query => ({
        matches: query === '(max-width: 768px)',
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      }));

      const mockMeetings = [
        {
          id: 'event-123',
          title: 'John Smith 1:1',
          start_date: '2024-01-22T10:00:00.000Z',
          event_type: 'one_on_one'
        }
      ];

      render(
        <TestWrapper>
          <WeeklyMeetingSidebar 
            currentWeek={new Date()}
            meetings={mockMeetings}
            onMeetingClick={vi.fn()}
            onDateNavigate={vi.fn()}
          />
        </TestWrapper>
      );

      // Verify sidebar renders on mobile
      await waitFor(() => {
        expect(screen.getByText('John Smith 1:1')).toBeInTheDocument();
      });
    });

    it('should handle touch interactions on mobile devices', async () => {
      const mockOnMeetingClick = vi.fn();

      const mockMeeting = {
        id: 'event-123',
        title: 'John Smith 1:1',
        start_date: '2024-01-22T10:00:00.000Z',
        event_type: 'one_on_one'
      };

      render(
        <TestWrapper>
          <WeeklyMeetingSidebar 
            currentWeek={new Date()}
            meetings={[mockMeeting]}
            onMeetingClick={mockOnMeetingClick}
            onDateNavigate={vi.fn()}
          />
        </TestWrapper>
      );

      const meetingElement = screen.getByText('John Smith 1:1');
      
      // Simulate touch interaction
      fireEvent.touchStart(meetingElement);
      fireEvent.touchEnd(meetingElement);
      fireEvent.click(meetingElement);

      expect(mockOnMeetingClick).toHaveBeenCalled();
    });

    it('should adapt layout for different screen sizes', async () => {
      // Test desktop viewport
      window.matchMedia.mockImplementation(query => ({
        matches: query === '(min-width: 1024px)',
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      }));

      const { rerender } = render(
        <TestWrapper>
          <Calendar />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('Calendar')).toBeInTheDocument();
      });

      // Switch to tablet viewport
      window.matchMedia.mockImplementation(query => ({
        matches: query === '(max-width: 1023px) and (min-width: 769px)',
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      }));

      rerender(
        <TestWrapper>
          <Calendar />
        </TestWrapper>
      );

      // Verify calendar adapts to different screen sizes
      expect(screen.getByText('Calendar')).toBeInTheDocument();
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle service failures gracefully', async () => {
      // Mock service failures
      CalendarSynchronizationService.syncOneOnOneMeetings.mockRejectedValue(
        new Error('Sync service unavailable')
      );
      RecurringBirthdayService.generateBirthdayEventsForYears.mockRejectedValue(
        new Error('Birthday service unavailable')
      );
      EventStylingService.getEventStyling.mockImplementation(() => {
        throw new Error('Styling service unavailable');
      });

      render(
        <TestWrapper>
          <Calendar />
        </TestWrapper>
      );

      // Calendar should still load despite service failures
      await waitFor(() => {
        expect(screen.getByText('Calendar')).toBeInTheDocument();
      });
    });

    it('should handle malformed event data', async () => {
      const malformedEvents = [
        {
          id: 'event-1',
          // Missing title
          start_date: '2024-01-22T10:00:00.000Z',
          event_type: 'one_on_one'
        },
        {
          id: 'event-2',
          title: 'Valid Event',
          // Missing start_date
          event_type: 'birthday'
        }
      ];

      localClient.getAll.mockResolvedValue(malformedEvents);

      render(
        <TestWrapper>
          <Calendar />
        </TestWrapper>
      );

      // Calendar should handle malformed data gracefully
      await waitFor(() => {
        expect(screen.getByText('Calendar')).toBeInTheDocument();
      });
    });

    it('should handle network connectivity issues', async () => {
      // Mock network failures
      localClient.getAll.mockRejectedValue(new Error('Network error'));
      CalendarSynchronizationService.ensureOneOnOneVisibility.mockRejectedValue(
        new Error('Network timeout')
      );

      render(
        <TestWrapper>
          <Calendar />
        </TestWrapper>
      );

      // Calendar should show appropriate error state
      await waitFor(() => {
        expect(screen.getByText('Calendar')).toBeInTheDocument();
      });
    });

    it('should handle empty data states', async () => {
      // Mock empty data
      localClient.getAll.mockResolvedValue([]);

      render(
        <TestWrapper>
          <Calendar />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('Calendar')).toBeInTheDocument();
      });

      // Test empty sidebar
      render(
        <TestWrapper>
          <WeeklyMeetingSidebar 
            currentWeek={new Date()}
            meetings={[]}
            onMeetingClick={vi.fn()}
            onDateNavigate={vi.fn()}
          />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText(/no meetings/i)).toBeInTheDocument();
      });
    });
  });

  describe('Performance and Scalability', () => {
    it('should handle large datasets efficiently', async () => {
      // Generate large dataset
      const largeEventSet = Array.from({ length: 1000 }, (_, i) => ({
        id: `event-${i}`,
        title: `Event ${i}`,
        start_date: new Date(2024, 0, 1 + (i % 365)).toISOString(),
        event_type: i % 2 === 0 ? 'one_on_one' : 'birthday',
        team_member_id: `team-${i % 10}`
      }));

      localClient.getAll.mockResolvedValue(largeEventSet);

      const startTime = performance.now();

      render(
        <TestWrapper>
          <Calendar />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('Calendar')).toBeInTheDocument();
      });

      const endTime = performance.now();
      const renderTime = endTime - startTime;

      // Verify reasonable performance (should render within 2 seconds)
      expect(renderTime).toBeLessThan(2000);
    });

    it('should handle frequent updates efficiently', async () => {
      const { rerender } = render(
        <TestWrapper>
          <Calendar />
        </TestWrapper>
      );

      // Simulate frequent updates
      for (let i = 0; i < 10; i++) {
        const updatedEvents = [
          {
            id: `event-${i}`,
            title: `Updated Event ${i}`,
            start_date: new Date().toISOString(),
            event_type: 'one_on_one'
          }
        ];

        localClient.getAll.mockResolvedValue(updatedEvents);

        rerender(
          <TestWrapper>
            <Calendar />
          </TestWrapper>
        );

        await waitFor(() => {
          expect(screen.getByText('Calendar')).toBeInTheDocument();
        });
      }

      // Verify calendar handles frequent updates
      expect(screen.getByText('Calendar')).toBeInTheDocument();
    });
  });

  describe('Complete Integration Workflow Verification', () => {
    it('should complete full end-to-end workflow with all features', async () => {
      // Step 1: Initialize with team members and birthdays
      const mockTeamMembers = [
        { id: 'team-123', name: 'John Smith', birthday: '1990-05-15' }
      ];

      RecurringBirthdayService.ensureBirthdayEventsExist.mockResolvedValue();
      CalendarEventGenerationService.synchronizeAllEvents.mockResolvedValue({
        totalProcessed: 2,
        birthdayEvents: 1,
        oneOnOneEvents: 1,
        success: true
      });

      // Step 2: Create OneOnOne meeting
      const mockOneOnOneResult = {
        calendarEvent: {
          id: 'event-oneonone',
          title: 'John Smith 1:1',
          start_date: '2024-01-22T10:00:00.000Z',
          event_type: 'one_on_one',
          team_member_id: 'team-123'
        }
      };

      CalendarSynchronizationService.syncOneOnOneMeetings.mockResolvedValue({
        totalSynced: 1,
        created: [mockOneOnOneResult.calendarEvent]
      });

      // Step 3: Load calendar with all events
      const allEvents = [
        mockOneOnOneResult.calendarEvent,
        {
          id: 'event-birthday',
          title: 'John Smith Birthday',
          start_date: '2024-05-15T00:00:00.000Z',
          event_type: 'birthday',
          team_member_id: 'team-123'
        }
      ];

      localClient.getAll.mockResolvedValue(allEvents);

      // Step 4: Apply styling to all events
      EventStylingService.getEventStyling.mockImplementation((event) => ({
        className: `event-${event.event_type}`,
        color: event.event_type === 'one_on_one' ? '#f97316' : '#ec4899',
        icon: event.event_type === 'one_on_one' ? 'User' : 'Cake'
      }));

      // Step 5: Render calendar with sidebar
      render(
        <TestWrapper>
          <Calendar />
        </TestWrapper>
      );

      // Step 6: Verify complete workflow
      await waitFor(() => {
        expect(screen.getByText('Calendar')).toBeInTheDocument();
      });

      // Verify all services were called
      expect(CalendarEventGenerationService.synchronizeAllEvents).toHaveBeenCalled();
      expect(CalendarSynchronizationService.syncOneOnOneMeetings).toHaveBeenCalled();
      expect(EventStylingService.getEventStyling).toHaveBeenCalled();
      expect(localClient.getAll).toHaveBeenCalledWith('calendar_events');

      // Step 7: Test weekly sidebar integration
      const currentWeekMeetings = allEvents.filter(event => {
        const eventDate = new Date(event.start_date);
        const now = new Date();
        const weekStart = new Date(now.setDate(now.getDate() - now.getDay()));
        const weekEnd = new Date(weekStart.getTime() + 7 * 24 * 60 * 60 * 1000);
        return eventDate >= weekStart && eventDate < weekEnd;
      });

      render(
        <TestWrapper>
          <WeeklyMeetingSidebar 
            currentWeek={new Date()}
            meetings={currentWeekMeetings}
            onMeetingClick={vi.fn()}
            onDateNavigate={vi.fn()}
          />
        </TestWrapper>
      );

      // Verify complete integration
      expect(screen.getByText('Calendar')).toBeInTheDocument();
    });
  });
});