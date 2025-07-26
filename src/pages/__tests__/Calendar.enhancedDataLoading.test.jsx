import React from 'react';
import { render, screen, waitFor, fireEvent, act } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import CalendarPage from '../Calendar';
import { Task, CalendarEvent, TeamMember, OutOfOffice, Duty } from '@/api/entities';
import { CalendarEventGenerationService } from '@/services/calendarEventGenerationService';
import { AgendaIndicatorService } from '@/services/agendaIndicatorService';
import { viewModeManager } from '@/services/viewModeManager';
import { addMonths, subMonths, format } from 'date-fns';

// Mock all dependencies
vi.mock('@/api/entities');
vi.mock('@/services/calendarEventGenerationService');
vi.mock('@/services/agendaIndicatorService');
vi.mock('@/services/viewModeManager', () => ({
  ViewModeManager: {
    VIEW_MODES: {
      MEETINGS: 'meetings',
      OUT_OF_OFFICE: 'out_of_office',
      DUTIES: 'duties',
      BIRTHDAYS: 'birthdays',
      ALL_EVENTS: 'all_events'
    }
  },
  viewModeManager: {
    getCurrentViewMode: vi.fn(() => 'all_events'),
    setViewMode: vi.fn(),
    filterEventsForView: vi.fn((events) => events || []),
    getEventCounts: vi.fn(() => ({
      meetings: 0,
      out_of_office: 0,
      duties: 0,
      birthdays: 0,
      all_events: 0
    }))
  }
}));

const mockEntities = {
  Task: {
    list: vi.fn(),
    create: vi.fn()
  },
  CalendarEvent: {
    list: vi.fn()
  },
  TeamMember: {
    list: vi.fn()
  },
  OutOfOffice: {
    list: vi.fn()
  },
  Duty: {
    list: vi.fn()
  }
};

const mockServices = {
  CalendarEventGenerationService: {
    synchronizeAllEvents: vi.fn()
  },
  AgendaIndicatorService: {
    getAgendaCountsForCalendarEvents: vi.fn()
  }
};

// Mock data
const mockTasks = [
  {
    id: 'task-1',
    title: 'Test Task',
    due_date: '2024-01-15T10:00:00Z',
    type: 'action'
  }
];

const mockCalendarEvents = [
  {
    id: 'event-1',
    title: 'Past Meeting',
    start_date: '2023-12-15T10:00:00Z',
    end_date: '2023-12-15T11:00:00Z',
    event_type: 'meeting'
  },
  {
    id: 'event-2',
    title: 'Current Meeting',
    start_date: '2024-01-15T10:00:00Z',
    end_date: '2024-01-15T11:00:00Z',
    event_type: 'one_on_one',
    team_member_id: 'member-1'
  },
  {
    id: 'event-3',
    title: 'Future Meeting',
    start_date: '2024-12-15T10:00:00Z',
    end_date: '2024-12-15T11:00:00Z',
    event_type: 'meeting'
  }
];

const mockTeamMembers = [
  {
    id: 'member-1',
    name: 'John Doe',
    email: 'john@example.com'
  }
];

const mockOutOfOffice = [];
const mockDuties = [];

function renderCalendarPage() {
  return render(
    <BrowserRouter>
      <CalendarPage />
    </BrowserRouter>
  );
}

describe('Calendar Enhanced Data Loading', () => {
  beforeEach(() => {
    // Reset all mocks
    vi.clearAllMocks();
    
    // Setup default mock implementations
    Task.list = mockEntities.Task.list.mockResolvedValue(mockTasks);
    Task.create = mockEntities.Task.create.mockResolvedValue({});
    CalendarEvent.list = mockEntities.CalendarEvent.list.mockResolvedValue(mockCalendarEvents);
    TeamMember.list = mockEntities.TeamMember.list.mockResolvedValue(mockTeamMembers);
    OutOfOffice.list = mockEntities.OutOfOffice.list.mockResolvedValue(mockOutOfOffice);
    Duty.list = mockEntities.Duty.list.mockResolvedValue(mockDuties);
    
    CalendarEventGenerationService.synchronizeAllEvents = mockServices.CalendarEventGenerationService.synchronizeAllEvents.mockResolvedValue();
    AgendaIndicatorService.getAgendaCountsForCalendarEvents = mockServices.AgendaIndicatorService.getAgendaCountsForCalendarEvents.mockResolvedValue({});
    
    // Setup viewModeManager mock
    viewModeManager.getCurrentViewMode.mockReturnValue('all_events');
    viewModeManager.filterEventsForView.mockImplementation((events) => events || []);
    viewModeManager.getEventCounts.mockReturnValue({
      meetings: 0,
      out_of_office: 0,
      duties: 0,
      birthdays: 0,
      all_events: 0
    });
    
    // Mock console methods to avoid noise in tests
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Initial Data Loading', () => {
    it('should load all data types on initial render', async () => {
      renderCalendarPage();

      await waitFor(() => {
        expect(Task.list).toHaveBeenCalledTimes(1);
        expect(CalendarEvent.list).toHaveBeenCalledTimes(2); // Initial + after sync
        expect(TeamMember.list).toHaveBeenCalledTimes(1);
        expect(OutOfOffice.list).toHaveBeenCalledTimes(1);
        expect(Duty.list).toHaveBeenCalledTimes(1);
      });
    });

    it('should synchronize events for multiple years', async () => {
      renderCalendarPage();

      await waitFor(() => {
        expect(CalendarEventGenerationService.synchronizeAllEvents).toHaveBeenCalledTimes(3);
      });

      const currentYear = new Date().getFullYear();
      expect(CalendarEventGenerationService.synchronizeAllEvents).toHaveBeenCalledWith({
        includeBirthdays: true,
        includeDuties: true,
        includeOutOfOffice: true,
        year: currentYear - 1
      });
      expect(CalendarEventGenerationService.synchronizeAllEvents).toHaveBeenCalledWith({
        includeBirthdays: true,
        includeDuties: true,
        includeOutOfOffice: true,
        year: currentYear
      });
      expect(CalendarEventGenerationService.synchronizeAllEvents).toHaveBeenCalledWith({
        includeBirthdays: true,
        includeDuties: true,
        includeOutOfOffice: true,
        year: currentYear + 1
      });
    });

    it('should display loading state during data fetch', async () => {
      // Make the API calls hang to test loading state
      CalendarEvent.list.mockImplementation(() => new Promise(() => {}));
      
      renderCalendarPage();

      // Should show loading state
      expect(screen.getByText('Today')).toBeDisabled();
    });

    it('should load agenda counts after events are loaded', async () => {
      renderCalendarPage();

      await waitFor(() => {
        expect(AgendaIndicatorService.getAgendaCountsForCalendarEvents).toHaveBeenCalledWith(mockCalendarEvents);
      });
    });
  });

  describe('Extended Date Range Support', () => {
    it('should display events from past, present, and future', async () => {
      renderCalendarPage();

      await waitFor(() => {
        expect(screen.queryByText('Past Meeting')).toBeInTheDocument();
        expect(screen.queryByText('Current Meeting')).toBeInTheDocument();
        expect(screen.queryByText('Future Meeting')).toBeInTheDocument();
      });
    });

    it('should handle events with invalid dates gracefully', async () => {
      const eventsWithInvalidDates = [
        ...mockCalendarEvents,
        {
          id: 'invalid-event',
          title: 'Invalid Date Event',
          start_date: 'invalid-date',
          event_type: 'meeting'
        }
      ];

      CalendarEvent.list.mockResolvedValue(eventsWithInvalidDates);
      
      renderCalendarPage();

      await waitFor(() => {
        expect(console.warn).toHaveBeenCalledWith(
          expect.stringContaining('Invalid date in calendar event'),
          'invalid-event',
          expect.any(Error)
        );
      });

      // Should still display valid events
      expect(screen.queryByText('Current Meeting')).toBeInTheDocument();
    });

    it('should filter events correctly for month navigation', async () => {
      renderCalendarPage();

      await waitFor(() => {
        expect(screen.queryByText('Current Meeting')).toBeInTheDocument();
      });

      // Navigate to next month
      const nextButton = screen.getByRole('button', { name: /chevronright/i });
      fireEvent.click(nextButton);

      // Should still show events (they're loaded for extended range)
      await waitFor(() => {
        expect(screen.queryByText('Current Meeting')).toBeInTheDocument();
      });
    });
  });

  describe('Caching Mechanism', () => {
    it('should use cached data on subsequent loads within cache validity period', async () => {
      renderCalendarPage();

      // Wait for initial load
      await waitFor(() => {
        expect(CalendarEvent.list).toHaveBeenCalledTimes(2);
      });

      // Clear mock call history
      vi.clearAllMocks();
      CalendarEvent.list.mockResolvedValue(mockCalendarEvents);
      AgendaIndicatorService.getAgendaCountsForCalendarEvents.mockResolvedValue({});

      // Navigate to next month and back (should use cache)
      const nextButton = screen.getByRole('button', { name: /chevronright/i });
      const prevButton = screen.getByRole('button', { name: /chevronleft/i });
      
      fireEvent.click(nextButton);
      fireEvent.click(prevButton);

      await waitFor(() => {
        // Should only call agenda service, not reload all data
        expect(CalendarEvent.list).toHaveBeenCalledTimes(0);
        expect(AgendaIndicatorService.getAgendaCountsForCalendarEvents).toHaveBeenCalled();
      });
    });

    it('should refresh data when force refresh is requested', async () => {
      renderCalendarPage();

      // Wait for initial load
      await waitFor(() => {
        expect(CalendarEvent.list).toHaveBeenCalledTimes(2);
      });

      // Clear mock call history
      vi.clearAllMocks();
      CalendarEvent.list.mockResolvedValue(mockCalendarEvents);

      // Click refresh button
      const refreshButton = screen.getByRole('button', { title: 'Refresh calendar data' });
      fireEvent.click(refreshButton);

      await waitFor(() => {
        expect(CalendarEvent.list).toHaveBeenCalledTimes(2); // Initial + after sync
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle API errors gracefully and show error message', async () => {
      const errorMessage = 'Network error';
      CalendarEvent.list.mockRejectedValue(new Error(errorMessage));

      renderCalendarPage();

      await waitFor(() => {
        expect(screen.getByText(/Error loading calendar data/)).toBeInTheDocument();
        expect(screen.getByText(errorMessage)).toBeInTheDocument();
      });
    });

    it('should provide retry functionality on error', async () => {
      CalendarEvent.list.mockRejectedValueOnce(new Error('Network error'))
                        .mockResolvedValue(mockCalendarEvents);

      renderCalendarPage();

      await waitFor(() => {
        expect(screen.getByText(/Error loading calendar data/)).toBeInTheDocument();
      });

      // Click retry button
      const retryButton = screen.getByRole('button', { name: 'Retry' });
      fireEvent.click(retryButton);

      await waitFor(() => {
        expect(screen.queryByText(/Error loading calendar data/)).not.toBeInTheDocument();
        expect(screen.queryByText('Current Meeting')).toBeInTheDocument();
      });
    });

    it('should use cached data as fallback when API fails', async () => {
      // First successful load
      renderCalendarPage();

      await waitFor(() => {
        expect(screen.queryByText('Current Meeting')).toBeInTheDocument();
      });

      // Make subsequent calls fail
      CalendarEvent.list.mockRejectedValue(new Error('Network error'));

      // Force refresh should show error but keep cached data
      const refreshButton = screen.getByRole('button', { title: 'Refresh calendar data' });
      fireEvent.click(refreshButton);

      await waitFor(() => {
        expect(screen.getByText(/Error loading calendar data/)).toBeInTheDocument();
        expect(screen.queryByText('Current Meeting')).toBeInTheDocument(); // Cached data still shown
      });
    });

    it('should handle individual service failures without breaking entire load', async () => {
      Task.list.mockRejectedValue(new Error('Task service error'));
      
      renderCalendarPage();

      await waitFor(() => {
        expect(console.warn).toHaveBeenCalledWith('Failed to load tasks:', expect.any(Error));
        expect(screen.queryByText('Current Meeting')).toBeInTheDocument(); // Other data still loads
      });
    });

    it('should handle sync service failures gracefully', async () => {
      CalendarEventGenerationService.synchronizeAllEvents.mockRejectedValue(new Error('Sync error'));
      
      renderCalendarPage();

      await waitFor(() => {
        expect(console.warn).toHaveBeenCalledWith('Failed to synchronize some calendar events:', expect.any(Error));
        expect(screen.queryByText('Current Meeting')).toBeInTheDocument(); // Still shows existing events
      });
    });

    it('should handle agenda service failures gracefully', async () => {
      AgendaIndicatorService.getAgendaCountsForCalendarEvents.mockRejectedValue(new Error('Agenda error'));
      
      renderCalendarPage();

      await waitFor(() => {
        expect(console.warn).toHaveBeenCalledWith('Failed to load agenda counts:', expect.any(Error));
        expect(screen.queryByText('Current Meeting')).toBeInTheDocument(); // Still shows events
      });
    });
  });

  describe('Performance Optimizations', () => {
    it('should not reload data unnecessarily when navigating between cached months', async () => {
      renderCalendarPage();

      // Wait for initial load
      await waitFor(() => {
        expect(CalendarEvent.list).toHaveBeenCalledTimes(2);
      });

      // Clear mock call history
      vi.clearAllMocks();

      // Navigate between months multiple times
      const nextButton = screen.getByRole('button', { name: /chevronright/i });
      const prevButton = screen.getByRole('button', { name: /chevronleft/i });
      
      fireEvent.click(nextButton);
      fireEvent.click(nextButton);
      fireEvent.click(prevButton);
      fireEvent.click(prevButton);

      // Should not trigger additional data loads
      expect(CalendarEvent.list).toHaveBeenCalledTimes(0);
    });

    it('should load data efficiently for year boundaries', async () => {
      // Mock current date to be near year boundary
      const mockDate = new Date('2024-12-15');
      vi.setSystemTime(mockDate);

      renderCalendarPage();

      await waitFor(() => {
        expect(CalendarEventGenerationService.synchronizeAllEvents).toHaveBeenCalledTimes(3);
      });

      // Should sync for 2023, 2024, and 2025
      expect(CalendarEventGenerationService.synchronizeAllEvents).toHaveBeenCalledWith(
        expect.objectContaining({ year: 2023 })
      );
      expect(CalendarEventGenerationService.synchronizeAllEvents).toHaveBeenCalledWith(
        expect.objectContaining({ year: 2024 })
      );
      expect(CalendarEventGenerationService.synchronizeAllEvents).toHaveBeenCalledWith(
        expect.objectContaining({ year: 2025 })
      );
    });
  });

  describe('Loading States', () => {
    it('should show proper loading states during data fetch', async () => {
      let resolvePromise;
      const loadingPromise = new Promise(resolve => {
        resolvePromise = resolve;
      });
      
      CalendarEvent.list.mockReturnValue(loadingPromise);

      renderCalendarPage();

      // Should show loading state
      expect(screen.getByText('Today')).toBeDisabled();

      // Resolve the promise
      act(() => {
        resolvePromise(mockCalendarEvents);
      });

      await waitFor(() => {
        expect(screen.getByText('Today')).not.toBeDisabled();
      });
    });

    it('should handle loading states during refresh', async () => {
      renderCalendarPage();

      // Wait for initial load
      await waitFor(() => {
        expect(screen.getByText('Today')).not.toBeDisabled();
      });

      // Make refresh take time
      let resolveRefresh;
      const refreshPromise = new Promise(resolve => {
        resolveRefresh = resolve;
      });
      CalendarEvent.list.mockReturnValue(refreshPromise);

      // Click refresh
      const refreshButton = screen.getByRole('button', { title: 'Refresh calendar data' });
      fireEvent.click(refreshButton);

      // Should show loading state
      expect(screen.getByText('Today')).toBeDisabled();

      // Resolve refresh
      act(() => {
        resolveRefresh(mockCalendarEvents);
      });

      await waitFor(() => {
        expect(screen.getByText('Today')).not.toBeDisabled();
      });
    });
  });
});