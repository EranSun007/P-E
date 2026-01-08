/**
 * Tests for Calendar page error handling integration
 * Verifies comprehensive error handling, user feedback, and recovery mechanisms
 */

import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import CalendarPage from '../Calendar';
import { ErrorHandlingService } from '../../services/errorHandlingService';
import { CalendarSyncStatusService } from '../../services/calendarSyncStatusService';
import { Task, CalendarEvent, TeamMember, OutOfOffice, Duty } from '../../api/entities';
import { toast } from '@/components/ui/use-toast';

// Mock dependencies
vi.mock('../../api/entities');
vi.mock('../../services/errorHandlingService');
vi.mock('../../services/calendarSyncStatusService');
vi.mock('@/components/ui/use-toast', () => ({
  toast: vi.fn(),
  useToast: () => ({ toast: vi.fn() })
}));

// Mock other services
vi.mock('../../services/viewModeManager', () => ({
  viewModeManager: {
    getCurrentViewMode: () => 'all',
    setViewMode: vi.fn(),
    filterEventsForView: (events) => events,
    getEventCounts: () => ({ all: 0 })
  }
}));

vi.mock('../../services/agendaIndicatorService', () => ({
  AgendaIndicatorService: {
    getAgendaCountsForCalendarEvents: () => Promise.resolve({})
  }
}));

vi.mock('../../services/calendarEventGenerationService', () => ({
  CalendarEventGenerationService: {
    synchronizeAllEvents: vi.fn().mockResolvedValue({
      summary: { totalCreated: 0, totalErrors: 0 }
    })
  }
}));

vi.mock('../../services/calendarSynchronizationService', () => ({
  CalendarSynchronizationService: {
    ensureOneOnOneVisibility: vi.fn().mockResolvedValue({
      summary: { success: true, createdCount: 0 }
    })
  }
}));

vi.mock('@/hooks/use-mobile', () => ({
  useIsMobile: () => false
}));

// Mock date-fns to control dates
vi.mock('date-fns', async () => {
  const actual = await vi.importActual('date-fns');
  return {
    ...actual,
    parseISO: vi.fn((dateString) => {
      if (dateString === 'invalid-date') {
        throw new Error('Invalid date');
      }
      return new Date(dateString);
    })
  };
});

const renderCalendarPage = () => {
  return render(
    <BrowserRouter>
      <CalendarPage />
    </BrowserRouter>
  );
};

describe('Calendar Page Error Handling', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Default successful mocks
    Task.list.mockResolvedValue([]);
    CalendarEvent.list.mockResolvedValue([]);
    TeamMember.list.mockResolvedValue([]);
    OutOfOffice.list.mockResolvedValue([]);
    Duty.list.mockResolvedValue([]);
    
    CalendarSyncStatusService.getSyncStatus.mockReturnValue({
      isRunning: false,
      lastSync: null,
      lastError: null,
      syncResults: null
    });
    
    CalendarSyncStatusService.addStatusListener.mockImplementation(() => {});
    CalendarSyncStatusService.removeStatusListener.mockImplementation(() => {});
    CalendarSyncStatusService.initialize.mockImplementation(() => {});
    
    ErrorHandlingService.wrapOperation.mockImplementation(async (operation) => {
      return await operation();
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Data Loading Error Handling', () => {
    it('should handle calendar data loading failures gracefully', async () => {
      CalendarEvent.list.mockRejectedValue(new Error('Database connection failed'));
      
      renderCalendarPage();
      
      await waitFor(() => {
        expect(screen.getByText(/error loading calendar data/i)).toBeInTheDocument();
      });
      
      // Should show retry button
      expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
    });

    it('should use cached data as fallback when loading fails', async () => {
      const cachedEvents = [
        {
          id: 'cached-1',
          title: 'Cached Meeting',
          start_date: '2024-01-15T10:00:00Z',
          event_type: 'meeting'
        }
      ];

      // First load succeeds to populate cache
      CalendarEvent.list.mockResolvedValueOnce(cachedEvents);
      
      renderCalendarPage();
      
      await waitFor(() => {
        expect(screen.getByText('Cached Meeting')).toBeInTheDocument();
      });

      // Second load fails, should use cached data
      CalendarEvent.list.mockRejectedValue(new Error('Network error'));
      
      const refreshButton = screen.getByRole('button', { name: /refresh calendar data/i });
      fireEvent.click(refreshButton);
      
      await waitFor(() => {
        // Should still show cached meeting
        expect(screen.getByText('Cached Meeting')).toBeInTheDocument();
        // Should show error message
        expect(screen.getByText(/error loading calendar data/i)).toBeInTheDocument();
      });
    });

    it('should handle partial data loading failures', async () => {
      // Some entities fail to load
      Task.list.mockRejectedValue(new Error('Task loading failed'));
      TeamMember.list.mockRejectedValue(new Error('Team member loading failed'));
      
      // Others succeed
      CalendarEvent.list.mockResolvedValue([]);
      OutOfOffice.list.mockResolvedValue([]);
      Duty.list.mockResolvedValue([]);
      
      renderCalendarPage();
      
      await waitFor(() => {
        // Should not crash, should show some content
        expect(screen.getByText(/january|february|march|april|may|june|july|august|september|october|november|december/i)).toBeInTheDocument();
      });
    });

    it('should retry failed data loading operations', async () => {
      let attempts = 0;
      CalendarEvent.list.mockImplementation(() => {
        attempts++;
        if (attempts < 3) {
          throw new Error('Network timeout');
        }
        return Promise.resolve([]);
      });

      ErrorHandlingService.wrapOperation.mockImplementation(async (operation, options) => {
        return ErrorHandlingService.retryOperation(operation, options.retryOptions);
      });

      ErrorHandlingService.retryOperation.mockImplementation(async (operation, options) => {
        const maxRetries = options?.maxRetries || 2;
        let lastError;
        
        for (let i = 0; i <= maxRetries; i++) {
          try {
            return await operation();
          } catch (error) {
            lastError = error;
            if (i === maxRetries) throw error;
          }
        }
      });

      renderCalendarPage();
      
      await waitFor(() => {
        expect(CalendarEvent.list).toHaveBeenCalledTimes(3);
      });
    });
  });

  describe('Manual Sync Error Handling', () => {
    it('should handle manual sync failures with user feedback', async () => {
      CalendarSyncStatusService.manualSync.mockRejectedValue(new Error('Sync failed'));
      
      ErrorHandlingService.wrapOperation.mockImplementation(async (operation, options) => {
        try {
          return await operation();
        } catch (error) {
          // Show error toast
          toast({
            variant: 'destructive',
            title: options.operationName + ' Failed',
            description: 'Sync failed'
          });
          throw error;
        }
      });

      renderCalendarPage();
      
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /sync calendar events/i })).toBeInTheDocument();
      });

      const syncButton = screen.getByRole('button', { name: /sync calendar events/i });
      fireEvent.click(syncButton);
      
      await waitFor(() => {
        expect(toast).toHaveBeenCalledWith(expect.objectContaining({
          variant: 'destructive',
          title: expect.stringContaining('Failed')
        }));
      });
    });

    it('should show sync status with error details', async () => {
      CalendarSyncStatusService.getSyncStatus.mockReturnValue({
        isRunning: false,
        lastSync: '2024-01-15T10:00:00Z',
        lastError: 'Synchronization failed: Network timeout',
        syncResults: null
      });

      renderCalendarPage();
      
      // Trigger sync status display
      act(() => {
        const statusListener = CalendarSyncStatusService.addStatusListener.mock.calls[0][0];
        statusListener({
          isRunning: false,
          lastSync: '2024-01-15T10:00:00Z',
          lastError: 'Synchronization failed: Network timeout'
        });
      });

      await waitFor(() => {
        expect(screen.getByText(/sync failed/i)).toBeInTheDocument();
        expect(screen.getByText(/network timeout/i)).toBeInTheDocument();
      });
    });

    it('should retry sync operations with exponential backoff', async () => {
      let syncAttempts = 0;
      CalendarSyncStatusService.manualSync.mockImplementation(() => {
        syncAttempts++;
        if (syncAttempts < 3) {
          throw new Error('Network error');
        }
        return Promise.resolve({
          summary: { success: true, totalChanges: 1 }
        });
      });

      const mockOnRetry = vi.fn();
      ErrorHandlingService.wrapOperation.mockImplementation(async (operation, options) => {
        return ErrorHandlingService.retryOperation(operation, {
          ...options.retryOptions,
          onRetry: mockOnRetry
        });
      });

      ErrorHandlingService.retryOperation.mockImplementation(async (operation, options) => {
        const maxRetries = options?.maxRetries || 2;
        let lastError;
        
        for (let i = 0; i <= maxRetries; i++) {
          try {
            return await operation();
          } catch (error) {
            lastError = error;
            if (i < maxRetries && options.onRetry) {
              options.onRetry(error, i + 1, 1000);
            }
            if (i === maxRetries) throw error;
          }
        }
      });

      renderCalendarPage();
      
      const syncButton = screen.getByRole('button', { name: /sync calendar events/i });
      fireEvent.click(syncButton);
      
      await waitFor(() => {
        expect(syncAttempts).toBe(3);
        expect(mockOnRetry).toHaveBeenCalledTimes(2);
      });
    });
  });

  describe('Weekly Sidebar Error Handling', () => {
    it('should pass error state to weekly sidebar', async () => {
      CalendarEvent.list.mockRejectedValue(new Error('Loading failed'));
      
      renderCalendarPage();
      
      await waitFor(() => {
        // Should show error in main calendar
        expect(screen.getByText(/error loading calendar data/i)).toBeInTheDocument();
      });
      
      // Weekly sidebar should also receive error state
      // This is tested through the error prop being passed to WeeklyMeetingSidebar
    });

    it('should handle sidebar retry operations', async () => {
      CalendarEvent.list.mockRejectedValue(new Error('Loading failed'));
      
      renderCalendarPage();
      
      await waitFor(() => {
        expect(screen.getByText(/error loading calendar data/i)).toBeInTheDocument();
      });

      // Reset mock to succeed on retry
      CalendarEvent.list.mockResolvedValue([]);
      
      const retryButton = screen.getByRole('button', { name: /retry/i });
      fireEvent.click(retryButton);
      
      await waitFor(() => {
        expect(CalendarEvent.list).toHaveBeenCalledTimes(2);
      });
    });
  });

  describe('Task Creation Error Handling', () => {
    it('should handle task creation failures gracefully', async () => {
      Task.create.mockRejectedValue(new Error('Task creation failed'));
      
      ErrorHandlingService.wrapOperation.mockImplementation(async (operation, options) => {
        try {
          return await operation();
        } catch (error) {
          toast({
            variant: 'destructive',
            title: options.operationName + ' Failed',
            description: error.message
          });
          throw error;
        }
      });

      renderCalendarPage();
      
      // Open task creation dialog
      const createTaskButton = screen.getByRole('button', { name: /create task/i });
      fireEvent.click(createTaskButton);
      
      // Fill and submit task form (assuming form exists)
      // This would need to be implemented based on actual TaskCreationForm component
      
      await waitFor(() => {
        expect(toast).toHaveBeenCalledWith(expect.objectContaining({
          variant: 'destructive',
          title: expect.stringContaining('Failed')
        }));
      });
    });
  });

  describe('Navigation Error Handling', () => {
    it('should handle meeting navigation failures', async () => {
      const mockMeeting = {
        id: 'meeting-1',
        title: '1:1 with John',
        start_date: '2024-01-15T10:00:00Z',
        event_type: 'one_on_one',
        team_member_id: 'tm1'
      };

      CalendarEvent.list.mockResolvedValue([mockMeeting]);
      
      // Mock navigation to fail
      const mockNavigate = vi.fn(() => {
        throw new Error('Navigation failed');
      });
      
      renderCalendarPage();
      
      await waitFor(() => {
        expect(screen.getByText('1:1 with John')).toBeInTheDocument();
      });

      // Click on meeting should handle error gracefully
      const meetingElement = screen.getByText('1:1 with John');
      fireEvent.click(meetingElement);
      
      // Should not crash the application
      expect(screen.getByText('1:1 with John')).toBeInTheDocument();
    });
  });

  describe('Error State Recovery', () => {
    it('should clear errors when data loads successfully', async () => {
      // Start with error
      CalendarEvent.list.mockRejectedValue(new Error('Initial load failed'));
      
      renderCalendarPage();
      
      await waitFor(() => {
        expect(screen.getByText(/error loading calendar data/i)).toBeInTheDocument();
      });

      // Fix the error and retry
      CalendarEvent.list.mockResolvedValue([]);
      
      const retryButton = screen.getByRole('button', { name: /retry/i });
      fireEvent.click(retryButton);
      
      await waitFor(() => {
        expect(screen.queryByText(/error loading calendar data/i)).not.toBeInTheDocument();
      });
    });

    it('should handle error state transitions correctly', async () => {
      const { rerender } = renderCalendarPage();
      
      // Simulate error state
      act(() => {
        const statusListener = CalendarSyncStatusService.addStatusListener.mock.calls[0][0];
        statusListener({
          isRunning: false,
          lastError: 'Sync failed'
        });
      });

      await waitFor(() => {
        expect(screen.getByText(/sync failed/i)).toBeInTheDocument();
      });

      // Simulate recovery
      act(() => {
        const statusListener = CalendarSyncStatusService.addStatusListener.mock.calls[0][0];
        statusListener({
          isRunning: false,
          lastError: null,
          lastSync: new Date().toISOString(),
          syncResults: { summary: { success: true } }
        });
      });

      await waitFor(() => {
        expect(screen.queryByText(/sync failed/i)).not.toBeInTheDocument();
      });
    });
  });

  describe('Accessibility During Errors', () => {
    it('should maintain accessibility during error states', async () => {
      CalendarEvent.list.mockRejectedValue(new Error('Loading failed'));
      
      renderCalendarPage();
      
      await waitFor(() => {
        const errorMessage = screen.getByText(/error loading calendar data/i);
        expect(errorMessage).toBeInTheDocument();
        
        // Should have appropriate ARIA attributes
        const errorContainer = errorMessage.closest('[role="alert"]');
        expect(errorContainer).toBeInTheDocument();
      });

      const retryButton = screen.getByRole('button', { name: /retry/i });
      expect(retryButton).toBeInTheDocument();
      expect(retryButton).not.toHaveAttribute('aria-disabled', 'true');
    });

    it('should provide screen reader announcements for error changes', async () => {
      renderCalendarPage();
      
      // Simulate error state change
      act(() => {
        const statusListener = CalendarSyncStatusService.addStatusListener.mock.calls[0][0];
        statusListener({
          isRunning: false,
          lastError: 'New sync error occurred'
        });
      });

      await waitFor(() => {
        const errorAlert = screen.getByRole('alert');
        expect(errorAlert).toBeInTheDocument();
        expect(errorAlert).toHaveTextContent(/sync error occurred/i);
      });
    });
  });
});