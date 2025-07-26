import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import CalendarPage from '../Calendar';

// Mock all dependencies
vi.mock('@/api/entities', () => ({
  Task: { list: vi.fn(() => Promise.resolve([])), create: vi.fn() },
  CalendarEvent: { list: vi.fn(() => Promise.resolve([])) },
  TeamMember: { list: vi.fn(() => Promise.resolve([])) },
  OutOfOffice: { list: vi.fn(() => Promise.resolve([])) },
  Duty: { list: vi.fn(() => Promise.resolve([])) },
}));

vi.mock('react-router-dom', () => ({
  useNavigate: () => vi.fn(),
}));

vi.mock('@/hooks/use-mobile.jsx', () => ({
  useIsMobile: vi.fn(() => false),
}));

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
        { id: 'all_events', label: 'All Events', description: 'View all calendar events combined', icon: 'calendar-days' }
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
    synchronizeAllEvents: vi.fn(() => Promise.resolve()),
  },
}));

vi.mock('@/services/agendaIndicatorService', () => ({
  AgendaIndicatorService: {
    getAgendaCountsForCalendarEvents: vi.fn(() => Promise.resolve({})),
  },
}));

describe('Calendar Sidebar Integration - Simple Test', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render calendar page with sidebar toggle button', async () => {
    render(<CalendarPage />);
    
    await waitFor(() => {
      expect(screen.getByText('Calendar')).toBeInTheDocument();
    });
    
    // Should have a sidebar toggle button
    const toggleButtons = screen.getAllByRole('button');
    const hasToggleButton = toggleButtons.some(button => 
      button.getAttribute('title')?.includes('weekly meetings') ||
      button.querySelector('svg')
    );
    
    expect(hasToggleButton).toBe(true);
  });

  it('should show weekly sidebar by default on desktop', async () => {
    render(<CalendarPage />);
    
    await waitFor(() => {
      expect(screen.getByText('Calendar')).toBeInTheDocument();
    });
    
    // Should show "This Week" text from the sidebar
    await waitFor(() => {
      expect(screen.getByText('This Week')).toBeInTheDocument();
    });
  });
});