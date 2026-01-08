import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import CalendarPage from '../Calendar';
import { Task, CalendarEvent, TeamMember, OutOfOffice, Duty } from '@/api/entities';
import { CalendarEventGenerationService } from '@/services/calendarEventGenerationService';
import { AgendaIndicatorService } from '@/services/agendaIndicatorService';

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
    },
    prototype: {
      getAvailableViewModes: () => [
        { id: 'all_events', label: 'All Events', description: 'View all events', icon: 'calendar-days' }
      ]
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

// Mock data
const mockTasks = [];
const mockCalendarEvents = [
  {
    id: 'event-1',
    title: 'Test Meeting',
    start_date: '2024-01-15T10:00:00Z',
    end_date: '2024-01-15T11:00:00Z',
    event_type: 'meeting'
  }
];
const mockTeamMembers = [];
const mockOutOfOffice = [];
const mockDuties = [];

function renderCalendarPage() {
  return render(
    <BrowserRouter>
      <CalendarPage />
    </BrowserRouter>
  );
}

describe('Calendar Enhanced Data Loading - Simple Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Setup default mock implementations
    Task.list = vi.fn().mockResolvedValue(mockTasks);
    CalendarEvent.list = vi.fn().mockResolvedValue(mockCalendarEvents);
    TeamMember.list = vi.fn().mockResolvedValue(mockTeamMembers);
    OutOfOffice.list = vi.fn().mockResolvedValue(mockOutOfOffice);
    Duty.list = vi.fn().mockResolvedValue(mockDuties);
    
    CalendarEventGenerationService.synchronizeAllEvents = vi.fn().mockResolvedValue();
    AgendaIndicatorService.getAgendaCountsForCalendarEvents = vi.fn().mockResolvedValue({});
    
    // Mock console methods to avoid noise in tests
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  it('should load calendar data successfully', async () => {
    renderCalendarPage();

    await waitFor(() => {
      expect(Task.list).toHaveBeenCalled();
      expect(CalendarEvent.list).toHaveBeenCalled();
      expect(TeamMember.list).toHaveBeenCalled();
      expect(OutOfOffice.list).toHaveBeenCalled();
      expect(Duty.list).toHaveBeenCalled();
    });
  });

  it('should synchronize events for multiple years', async () => {
    renderCalendarPage();

    await waitFor(() => {
      expect(CalendarEventGenerationService.synchronizeAllEvents).toHaveBeenCalled();
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

  it('should handle API errors gracefully', async () => {
    const errorMessage = 'Network error';
    CalendarEvent.list.mockRejectedValue(new Error(errorMessage));

    renderCalendarPage();

    await waitFor(() => {
      expect(console.warn).toHaveBeenCalledWith(
        'Failed to load calendar events:',
        expect.any(Error)
      );
    });
  });

  it('should reload calendar events after synchronization', async () => {
    renderCalendarPage();

    await waitFor(() => {
      // Should be called twice: initial load + after sync
      expect(CalendarEvent.list).toHaveBeenCalledTimes(2);
    });
  });

  it('should load agenda counts for calendar events', async () => {
    renderCalendarPage();

    await waitFor(() => {
      expect(AgendaIndicatorService.getAgendaCountsForCalendarEvents).toHaveBeenCalledWith(mockCalendarEvents);
    });
  });
});