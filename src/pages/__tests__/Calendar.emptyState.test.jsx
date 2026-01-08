import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import CalendarPage from '../Calendar';
import * as entities from '@/api/entities';

// Mock the entities
vi.mock('@/api/entities', () => ({
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
}));

// Mock the calendar event generation service
vi.mock('@/services/calendarEventGenerationService', () => ({
  CalendarEventGenerationService: {
    synchronizeAllEvents: vi.fn().mockResolvedValue(undefined)
  }
}));

// Mock react-router-dom navigate
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate
  };
});

const renderCalendarPage = () => {
  return render(
    <BrowserRouter>
      <CalendarPage />
    </BrowserRouter>
  );
};

describe('Calendar Empty States', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Default empty data setup
    entities.Task.list.mockResolvedValue([]);
    entities.CalendarEvent.list.mockResolvedValue([]);
    entities.TeamMember.list.mockResolvedValue([]);
    entities.OutOfOffice.list.mockResolvedValue([]);
    entities.Duty.list.mockResolvedValue([]);
  });

  describe('Loading State', () => {
    it('should show loading empty state while data is loading', async () => {
      // Make the API calls hang to simulate loading
      entities.Task.list.mockImplementation(() => new Promise(() => {}));
      entities.CalendarEvent.list.mockImplementation(() => new Promise(() => {}));
      entities.TeamMember.list.mockImplementation(() => new Promise(() => {}));
      entities.OutOfOffice.list.mockImplementation(() => new Promise(() => {}));
      entities.Duty.list.mockImplementation(() => new Promise(() => {}));

      renderCalendarPage();

      expect(screen.getByText('Loading calendar...')).toBeInTheDocument();
      expect(screen.getByText('Please wait while we load your events and tasks.')).toBeInTheDocument();
    });
  });

  describe('Empty Calendar States', () => {
    it('should show all events empty state when no data exists', async () => {
      renderCalendarPage();

      await waitFor(() => {
        expect(screen.getByText('Your calendar is empty')).toBeInTheDocument();
      });

      expect(screen.getByText(/You don't have any events, meetings, or tasks scheduled/)).toBeInTheDocument();
      expect(screen.getAllByText('Create Task')).toHaveLength(2); // One in main area, one in sidebar
      expect(screen.getByText('Schedule your first meeting')).toBeInTheDocument();
    });

    it('should show meetings empty state when switching to meetings view with no meetings', async () => {
      // Add some non-meeting events to ensure the empty state is view-mode specific
      entities.CalendarEvent.list.mockResolvedValue([
        {
          id: '1',
          title: 'Birthday Party',
          event_type: 'birthday',
          start_date: '2024-01-15T00:00:00Z',
          team_member_id: 'tm1'
        }
      ]);

      renderCalendarPage();

      await waitFor(() => {
        expect(screen.getByText('Birthdays')).toBeInTheDocument();
      });

      // Click on Meetings tab
      const meetingsTab = screen.getByText('Meetings');
      meetingsTab.click();

      await waitFor(() => {
        expect(screen.getByText('No meetings scheduled')).toBeInTheDocument();
      });

      expect(screen.getByText(/You don't have any meetings or one-on-ones scheduled/)).toBeInTheDocument();
      expect(screen.getAllByText('Create Meeting Task')).toHaveLength(2); // One in main area, one in sidebar
    });

    it('should show duties empty state when switching to duties view with no duties', async () => {
      renderCalendarPage();

      await waitFor(() => {
        expect(screen.getByText('Duties')).toBeInTheDocument();
      });

      // Click on Duties tab
      const dutiesTab = screen.getByText('Duties');
      dutiesTab.click();

      await waitFor(() => {
        expect(screen.getByText('No duty assignments')).toBeInTheDocument();
      });

      expect(screen.getByText(/No team member duties are currently assigned/)).toBeInTheDocument();
      expect(screen.getByText('Manage Duties')).toBeInTheDocument();
    });

    it('should show out-of-office empty state when switching to out-of-office view', async () => {
      renderCalendarPage();

      await waitFor(() => {
        expect(screen.getByText('Out of Office')).toBeInTheDocument();
      });

      // Click on Out of Office tab
      const oooTab = screen.getByText('Out of Office');
      oooTab.click();

      await waitFor(() => {
        expect(screen.getByText('No out-of-office periods')).toBeInTheDocument();
      });

      expect(screen.getByText(/No team members have scheduled out-of-office periods/)).toBeInTheDocument();
      expect(screen.getByText('Manage Team')).toBeInTheDocument();
    });

    it('should show birthdays empty state when switching to birthdays view', async () => {
      renderCalendarPage();

      await waitFor(() => {
        expect(screen.getByText('Birthdays')).toBeInTheDocument();
      });

      // Click on Birthdays tab
      const birthdaysTab = screen.getByText('Birthdays');
      birthdaysTab.click();

      await waitFor(() => {
        expect(screen.getByText('No birthdays this month')).toBeInTheDocument();
      });

      expect(screen.getByText(/No team member birthdays are scheduled/)).toBeInTheDocument();
      expect(screen.getByText('Add Team Members')).toBeInTheDocument();
    });
  });

  describe('Sidebar Empty States', () => {
    it('should show sidebar empty state when no events on selected date', async () => {
      // Add some events so the main calendar doesn't show empty state, but not for today
      entities.CalendarEvent.list.mockResolvedValue([
        {
          id: '1',
          title: 'Future Event',
          event_type: 'meeting',
          start_date: '2025-12-25T00:00:00Z', // Christmas, not today
          team_member_id: 'tm1'
        }
      ]);

      renderCalendarPage();

      await waitFor(() => {
        expect(screen.getByText('Nothing scheduled today')).toBeInTheDocument();
      });

      expect(screen.getByText(/No tasks or events are scheduled for this date/)).toBeInTheDocument();
    });

    it('should show view-mode specific sidebar empty state', async () => {
      // Add a birthday event but no meetings
      entities.CalendarEvent.list.mockResolvedValue([
        {
          id: '1',
          title: 'Birthday Party',
          event_type: 'birthday',
          start_date: '2024-01-15T00:00:00Z',
          team_member_id: 'tm1'
        }
      ]);

      renderCalendarPage();

      await waitFor(() => {
        expect(screen.getByText('Meetings')).toBeInTheDocument();
      });

      // Switch to meetings view
      const meetingsTab = screen.getByText('Meetings');
      meetingsTab.click();

      // The sidebar should show meetings-specific empty state for the selected date
      await waitFor(() => {
        expect(screen.getByText('No meetings today')).toBeInTheDocument();
      });
    });
  });

  describe('Action Buttons', () => {
    it('should handle create task action from empty state', async () => {
      renderCalendarPage();

      await waitFor(() => {
        expect(screen.getByText('Your calendar is empty')).toBeInTheDocument();
      });

      const createTaskButtons = screen.getAllByText('Create Task');
      createTaskButtons[0].click(); // Click the first one (main area)

      // Should open the task creation dialog
      await waitFor(() => {
        expect(screen.getByText(/Add Task for/)).toBeInTheDocument();
      });
    });

    it('should handle navigation actions from empty states', async () => {
      renderCalendarPage();

      await waitFor(() => {
        expect(screen.getByText('Duties')).toBeInTheDocument();
      });

      // Switch to duties view
      const dutiesTab = screen.getByText('Duties');
      dutiesTab.click();

      await waitFor(() => {
        expect(screen.getByText('Manage Duties')).toBeInTheDocument();
      });

      const manageDutiesButton = screen.getByText('Manage Duties');
      manageDutiesButton.click();

      // Should navigate to team page
      expect(mockNavigate).toHaveBeenCalledWith('/team');
    });
  });

  describe('Empty State Suggestions', () => {
    it('should show relevant suggestions for each view mode', async () => {
      renderCalendarPage();

      await waitFor(() => {
        expect(screen.getByText('Meetings')).toBeInTheDocument();
      });

      // Switch to meetings view
      const meetingsTab = screen.getByText('Meetings');
      meetingsTab.click();

      await waitFor(() => {
        expect(screen.getByText('Schedule a one-on-one with a team member')).toBeInTheDocument();
      });

      expect(screen.getByText('Plan your next team meeting')).toBeInTheDocument();
      expect(screen.getByText('Block time for important discussions')).toBeInTheDocument();
    });

    it('should show different suggestions for different view modes', async () => {
      renderCalendarPage();

      await waitFor(() => {
        expect(screen.getByText('Duties')).toBeInTheDocument();
      });

      // Switch to duties view
      const dutiesTab = screen.getByText('Duties');
      dutiesTab.click();

      await waitFor(() => {
        expect(screen.getByText('Set up DevOps duty rotations')).toBeInTheDocument();
      });

      expect(screen.getByText('Assign on-call responsibilities')).toBeInTheDocument();
      expect(screen.getByText('Track team member duties')).toBeInTheDocument();
    });
  });
});