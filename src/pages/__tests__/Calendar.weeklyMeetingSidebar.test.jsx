import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { format, startOfWeek, endOfWeek, addDays } from 'date-fns';
import CalendarPage from '../Calendar';
import { Task, CalendarEvent, TeamMember, OutOfOffice, Duty } from '@/api/entities';
import { viewModeManager } from '@/services/viewModeManager';
import { CalendarEventGenerationService } from '@/services/calendarEventGenerationService';
import { AgendaIndicatorService } from '@/services/agendaIndicatorService';

// Mock the router
const mockNavigate = vi.fn();
vi.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
}));

// Mock the mobile hook
vi.mock('@/hooks/use-mobile', () => ({
  useIsMobile: vi.fn(() => false), // Default to desktop
}));

// Mock entities
vi.mock('@/api/entities', () => ({
  Task: {
    list: vi.fn(),
    create: vi.fn(),
  },
  CalendarEvent: {
    list: vi.fn(),
  },
  TeamMember: {
    list: vi.fn(),
  },
  OutOfOffice: {
    list: vi.fn(),
  },
  Duty: {
    list: vi.fn(),
  },
}));

// Mock services
vi.mock('@/services/viewModeManager', () => ({
  ViewModeManager: {
    VIEW_MODES: {
      MEETINGS: 'meetings',
      OUT_OF_OFFICE: 'out_of_office',
      DUTIES: 'duties',
      BIRTHDAYS: 'birthdays',
      ALL_EVENTS: 'all_events'
    },
    prototype: {
      getAvailableViewModes: vi.fn(() => [
        { key: 'all_events', label: 'All Events', icon: 'Calendar' },
        { key: 'meetings', label: 'Meetings', icon: 'Users' },
        { key: 'out_of_office', label: 'Out of Office', icon: 'UserX' },
        { key: 'duties', label: 'Duties', icon: 'Shield' },
        { key: 'birthdays', label: 'Birthdays', icon: 'Cake' }
      ])
    }
  },
  viewModeManager: {
    getCurrentViewMode: vi.fn(() => 'all_events'),
    setViewMode: vi.fn(),
    filterEventsForView: vi.fn((events) => events),
    getEventCounts: vi.fn(() => ({})),
  },
}));

vi.mock('@/services/calendarEventGenerationService', () => ({
  CalendarEventGenerationService: {
    synchronizeAllEvents: vi.fn(),
  },
}));

vi.mock('@/services/agendaIndicatorService', () => ({
  AgendaIndicatorService: {
    getAgendaCountsForCalendarEvents: vi.fn(() => Promise.resolve({})),
  },
}));

describe('Calendar Weekly Meeting Sidebar Integration', () => {
  const mockCurrentDate = new Date('2024-01-15T10:00:00Z'); // Monday
  const weekStart = startOfWeek(mockCurrentDate, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(mockCurrentDate, { weekStartsOn: 1 });

  const mockTeamMembers = [
    {
      id: 'tm1',
      name: 'John Doe',
      email: 'john@example.com',
    },
    {
      id: 'tm2',
      name: 'Jane Smith',
      email: 'jane@example.com',
    },
  ];

  const mockCalendarEvents = [
    {
      id: 'event1',
      title: '1:1 with John',
      event_type: 'one_on_one',
      start_date: addDays(weekStart, 1).toISOString(), // Tuesday
      end_date: addDays(weekStart, 1).toISOString(),
      team_member_id: 'tm1',
      all_day: false,
    },
    {
      id: 'event2',
      title: 'Team Meeting',
      event_type: 'meeting',
      start_date: addDays(weekStart, 2).toISOString(), // Wednesday
      end_date: addDays(weekStart, 2).toISOString(),
      all_day: false,
    },
    {
      id: 'event3',
      title: 'Jane Birthday',
      event_type: 'birthday',
      start_date: addDays(weekStart, 4).toISOString(), // Friday
      end_date: addDays(weekStart, 4).toISOString(),
      team_member_id: 'tm2',
      all_day: true,
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Mock current date
    vi.setSystemTime(mockCurrentDate);
    
    // Setup entity mocks
    Task.list.mockResolvedValue([]);
    CalendarEvent.list.mockResolvedValue(mockCalendarEvents);
    TeamMember.list.mockResolvedValue(mockTeamMembers);
    OutOfOffice.list.mockResolvedValue([]);
    Duty.list.mockResolvedValue([]);
    
    // Setup service mocks
    CalendarEventGenerationService.synchronizeAllEvents.mockResolvedValue();
    AgendaIndicatorService.getAgendaCountsForCalendarEvents.mockResolvedValue({});
  });

  it('should display weekly meeting sidebar by default on desktop', async () => {
    render(<CalendarPage />);
    
    await waitFor(() => {
      expect(screen.getByText('This Week')).toBeInTheDocument();
    });
    
    // Should show the week range
    const weekRange = `${format(weekStart, 'MMM d')} - ${format(weekEnd, 'MMM d, yyyy')}`;
    expect(screen.getByText(weekRange)).toBeInTheDocument();
    
    // Should show meetings count
    expect(screen.getByText('3 meetings')).toBeInTheDocument();
  });

  it('should group meetings by day in the sidebar', async () => {
    render(<CalendarPage />);
    
    await waitFor(() => {
      expect(screen.getByText('This Week')).toBeInTheDocument();
    });
    
    // Should show day headers for days with meetings
    expect(screen.getByText('Tuesday')).toBeInTheDocument();
    expect(screen.getByText('Wednesday')).toBeInTheDocument();
    expect(screen.getByText('Friday')).toBeInTheDocument();
    
    // Should show meeting titles
    expect(screen.getByText('1:1 with John')).toBeInTheDocument();
    expect(screen.getByText('Team Meeting')).toBeInTheDocument();
    expect(screen.getByText('Jane Birthday')).toBeInTheDocument();
  });

  it('should navigate to date when clicking on day header in sidebar', async () => {
    render(<CalendarPage />);
    
    await waitFor(() => {
      expect(screen.getByText('This Week')).toBeInTheDocument();
    });
    
    // Click on Tuesday day header
    const tuesdayButton = screen.getByRole('button', { name: /Navigate to Tuesday/ });
    fireEvent.click(tuesdayButton);
    
    // Should update the selected date display
    const expectedDate = format(addDays(weekStart, 1), 'MMMM d, yyyy');
    await waitFor(() => {
      expect(screen.getByText(expectedDate)).toBeInTheDocument();
    });
  });

  it('should handle meeting click in sidebar', async () => {
    render(<CalendarPage />);
    
    await waitFor(() => {
      expect(screen.getByText('This Week')).toBeInTheDocument();
    });
    
    // Click on the 1:1 meeting
    const meetingButton = screen.getByRole('button', { name: /1:1 with John/ });
    fireEvent.click(meetingButton);
    
    // Should navigate to the meeting date and show meeting details
    const expectedDate = format(addDays(weekStart, 1), 'MMMM d, yyyy');
    await waitFor(() => {
      expect(screen.getByText(expectedDate)).toBeInTheDocument();
    });
  });

  it('should update weekly meetings when month changes', async () => {
    render(<CalendarPage />);
    
    await waitFor(() => {
      expect(screen.getByText('This Week')).toBeInTheDocument();
    });
    
    // Navigate to next month
    const nextMonthButton = screen.getByRole('button', { name: '' }); // ChevronRight button
    fireEvent.click(nextMonthButton);
    
    // The sidebar should update to show the new current week
    await waitFor(() => {
      // The week range should be different now
      const newWeekStart = startOfWeek(new Date('2024-02-15T10:00:00Z'), { weekStartsOn: 1 });
      const newWeekEnd = endOfWeek(new Date('2024-02-15T10:00:00Z'), { weekStartsOn: 1 });
      const newWeekRange = `${format(newWeekStart, 'MMM d')} - ${format(newWeekEnd, 'MMM d, yyyy')}`;
      expect(screen.getByText(newWeekRange)).toBeInTheDocument();
    });
  });

  it('should show empty state when no meetings in current week', async () => {
    // Mock empty calendar events
    CalendarEvent.list.mockResolvedValue([]);
    
    render(<CalendarPage />);
    
    await waitFor(() => {
      expect(screen.getByText('This Week')).toBeInTheDocument();
    });
    
    // Should show empty state
    expect(screen.getByText('No meetings this week')).toBeInTheDocument();
    expect(screen.getByText('Your calendar is clear for the week')).toBeInTheDocument();
  });

  it('should toggle sidebar visibility', async () => {
    render(<CalendarPage />);
    
    await waitFor(() => {
      expect(screen.getByText('This Week')).toBeInTheDocument();
    });
    
    // Find and click the sidebar toggle button
    const toggleButton = screen.getByRole('button', { name: /Hide weekly meetings/ });
    fireEvent.click(toggleButton);
    
    // Sidebar should be hidden
    await waitFor(() => {
      expect(screen.queryByText('This Week')).not.toBeInTheDocument();
    });
    
    // Click toggle again to show sidebar
    const showButton = screen.getByRole('button', { name: /Show weekly meetings/ });
    fireEvent.click(showButton);
    
    // Sidebar should be visible again
    await waitFor(() => {
      expect(screen.getByText('This Week')).toBeInTheDocument();
    });
  });

  it('should filter meetings based on view mode', async () => {
    // Mock view mode manager to filter only one_on_one events
    viewModeManager.filterEventsForView.mockImplementation((events, viewMode) => {
      if (viewMode === 'one_on_one') {
        return events.filter(event => event.event_type === 'one_on_one');
      }
      return events;
    });
    
    render(<CalendarPage />);
    
    await waitFor(() => {
      expect(screen.getByText('This Week')).toBeInTheDocument();
    });
    
    // Change view mode to one_on_one (this would typically be done through ViewModeSelector)
    // For this test, we'll simulate the effect by checking the filtered results
    expect(viewModeManager.filterEventsForView).toHaveBeenCalled();
  });

  it('should show agenda counts for 1:1 meetings in sidebar', async () => {
    // Mock agenda counts
    const mockAgendaCounts = {
      'event1': {
        count: 3,
        unresolvedCount: 2,
        hasUnresolved: true,
      },
    };
    
    AgendaIndicatorService.getAgendaCountsForCalendarEvents.mockResolvedValue(mockAgendaCounts);
    
    render(<CalendarPage />);
    
    await waitFor(() => {
      expect(screen.getByText('This Week')).toBeInTheDocument();
    });
    
    // Should show agenda count badge for the 1:1 meeting
    await waitFor(() => {
      expect(screen.getByText('2')).toBeInTheDocument(); // unresolvedCount
    });
  });
});

describe('Calendar Weekly Meeting Sidebar Mobile Integration', () => {
  const mockCurrentDate = new Date('2024-01-15T10:00:00Z');
  
  beforeEach(() => {
    vi.clearAllMocks();
    vi.setSystemTime(mockCurrentDate);
    
    // Mock mobile hook to return true
    const { useIsMobile } = require('@/hooks/use-mobile');
    useIsMobile.mockReturnValue(true);
    
    // Setup entity mocks
    Task.list.mockResolvedValue([]);
    CalendarEvent.list.mockResolvedValue([]);
    TeamMember.list.mockResolvedValue([]);
    OutOfOffice.list.mockResolvedValue([]);
    Duty.list.mockResolvedValue([]);
    
    CalendarEventGenerationService.synchronizeAllEvents.mockResolvedValue();
    AgendaIndicatorService.getAgendaCountsForCalendarEvents.mockResolvedValue({});
  });

  it('should hide sidebar by default on mobile', async () => {
    render(<CalendarPage />);
    
    await waitFor(() => {
      expect(screen.getByText('Calendar')).toBeInTheDocument();
    });
    
    // Sidebar should not be visible
    expect(screen.queryByText('This Week')).not.toBeInTheDocument();
    
    // Should show mobile toggle button in header
    expect(screen.getByRole('button', { name: /Show weekly meetings/ })).toBeInTheDocument();
  });

  it('should show sidebar as overlay on mobile when toggled', async () => {
    render(<CalendarPage />);
    
    await waitFor(() => {
      expect(screen.getByText('Calendar')).toBeInTheDocument();
    });
    
    // Click mobile toggle button
    const toggleButton = screen.getByRole('button', { name: /Show weekly meetings/ });
    fireEvent.click(toggleButton);
    
    // Sidebar should be visible as overlay
    await waitFor(() => {
      expect(screen.getByText('This Week')).toBeInTheDocument();
      expect(screen.getByText('Weekly Meetings')).toBeInTheDocument(); // Mobile header
    });
    
    // Should show backdrop
    expect(document.querySelector('.bg-black.bg-opacity-50')).toBeInTheDocument();
  });

  it('should close mobile sidebar when clicking backdrop', async () => {
    render(<CalendarPage />);
    
    await waitFor(() => {
      expect(screen.getByText('Calendar')).toBeInTheDocument();
    });
    
    // Open sidebar
    const toggleButton = screen.getByRole('button', { name: /Show weekly meetings/ });
    fireEvent.click(toggleButton);
    
    await waitFor(() => {
      expect(screen.getByText('This Week')).toBeInTheDocument();
    });
    
    // Click backdrop
    const backdrop = document.querySelector('.bg-black.bg-opacity-50');
    fireEvent.click(backdrop);
    
    // Sidebar should be hidden
    await waitFor(() => {
      expect(screen.queryByText('This Week')).not.toBeInTheDocument();
    });
  });

  it('should close mobile sidebar after meeting selection', async () => {
    const mockCalendarEvents = [
      {
        id: 'event1',
        title: '1:1 with John',
        event_type: 'one_on_one',
        start_date: new Date().toISOString(),
        end_date: new Date().toISOString(),
        team_member_id: 'tm1',
        all_day: false,
      },
    ];
    
    CalendarEvent.list.mockResolvedValue(mockCalendarEvents);
    
    render(<CalendarPage />);
    
    await waitFor(() => {
      expect(screen.getByText('Calendar')).toBeInTheDocument();
    });
    
    // Open sidebar
    const toggleButton = screen.getByRole('button', { name: /Show weekly meetings/ });
    fireEvent.click(toggleButton);
    
    await waitFor(() => {
      expect(screen.getByText('This Week')).toBeInTheDocument();
    });
    
    // Click on a meeting
    const meetingButton = screen.getByRole('button', { name: /1:1 with John/ });
    fireEvent.click(meetingButton);
    
    // Sidebar should be hidden after selection
    await waitFor(() => {
      expect(screen.queryByText('This Week')).not.toBeInTheDocument();
    });
  });
});