/**
 * Tests for WeeklyMeetingSidebar error handling
 * Verifies error states, recovery actions, and graceful degradation
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import WeeklyMeetingSidebar from '../WeeklyMeetingSidebar';
import { ErrorHandlingService } from '../../../services/errorHandlingService';

// Mock the error handling service
vi.mock('../../../services/errorHandlingService');

// Mock date-fns to control dates in tests
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

describe('WeeklyMeetingSidebar Error Handling', () => {
  const mockCurrentWeek = new Date('2024-01-15T10:00:00Z'); // Monday
  const mockOnMeetingClick = vi.fn();
  const mockOnDateNavigate = vi.fn();
  const mockOnRetry = vi.fn();

  const validMeetings = [
    {
      id: '1',
      title: '1:1 with John',
      start_date: '2024-01-15T10:00:00Z',
      end_date: '2024-01-15T11:00:00Z',
      event_type: 'one_on_one',
      team_member_id: 'tm1'
    },
    {
      id: '2',
      title: 'Team Meeting',
      start_date: '2024-01-16T14:00:00Z',
      end_date: '2024-01-16T15:00:00Z',
      event_type: 'meeting'
    }
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    ErrorHandlingService.handleError.mockImplementation((error, options) => ({
      error,
      category: 'unknown',
      userMessage: 'An error occurred',
      isRetryable: true
    }));
  });

  describe('Error Display', () => {
    it('should display error message when error prop is provided', () => {
      render(
        <WeeklyMeetingSidebar
          currentWeek={mockCurrentWeek}
          meetings={validMeetings}
          error="Failed to load meetings"
          onRetry={mockOnRetry}
        />
      );

      expect(screen.getByText('Failed to load meetings')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
    });

    it('should display processing error when meeting processing fails', () => {
      const invalidMeetings = [
        {
          id: '1',
          title: 'Invalid Meeting',
          start_date: 'invalid-date',
          event_type: 'meeting'
        }
      ];

      render(
        <WeeklyMeetingSidebar
          currentWeek={mockCurrentWeek}
          meetings={invalidMeetings}
          onRetry={mockOnRetry}
        />
      );

      expect(screen.getByText('Error processing meetings')).toBeInTheDocument();
      expect(ErrorHandlingService.handleError).toHaveBeenCalled();
    });

    it('should show loading state', () => {
      render(
        <WeeklyMeetingSidebar
          currentWeek={mockCurrentWeek}
          meetings={[]}
          isLoading={true}
        />
      );

      expect(screen.getByText('Loading meetings...')).toBeInTheDocument();
      expect(screen.getByRole('status')).toBeInTheDocument();
    });

    it('should disable retry button when loading', () => {
      render(
        <WeeklyMeetingSidebar
          currentWeek={mockCurrentWeek}
          meetings={[]}
          error="Load failed"
          isLoading={true}
          onRetry={mockOnRetry}
        />
      );

      const retryButton = screen.getByRole('button', { name: /retry/i });
      expect(retryButton).toBeDisabled();
    });
  });

  describe('Error Recovery', () => {
    it('should call onRetry when retry button is clicked', () => {
      render(
        <WeeklyMeetingSidebar
          currentWeek={mockCurrentWeek}
          meetings={[]}
          error="Load failed"
          onRetry={mockOnRetry}
        />
      );

      const retryButton = screen.getByRole('button', { name: /retry/i });
      fireEvent.click(retryButton);

      expect(mockOnRetry).toHaveBeenCalledTimes(1);
    });

    it('should not show retry button when onRetry is not provided', () => {
      render(
        <WeeklyMeetingSidebar
          currentWeek={mockCurrentWeek}
          meetings={[]}
          error="Load failed"
        />
      );

      expect(screen.queryByRole('button', { name: /retry/i })).not.toBeInTheDocument();
    });

    it('should implement exponential backoff for retries', async () => {
      vi.useFakeTimers();
      
      render(
        <WeeklyMeetingSidebar
          currentWeek={mockCurrentWeek}
          meetings={[]}
          error="Load failed"
          onRetry={mockOnRetry}
        />
      );

      const retryButton = screen.getByRole('button', { name: /retry/i });
      
      // First retry - immediate
      fireEvent.click(retryButton);
      expect(mockOnRetry).toHaveBeenCalledTimes(0); // Not called yet due to setTimeout
      
      vi.advanceTimersByTime(1000); // First retry delay
      expect(mockOnRetry).toHaveBeenCalledTimes(1);
      
      // Second retry - longer delay
      fireEvent.click(retryButton);
      vi.advanceTimersByTime(1000); // Should not trigger yet
      expect(mockOnRetry).toHaveBeenCalledTimes(1);
      
      vi.advanceTimersByTime(1000); // Total 2000ms for second retry
      expect(mockOnRetry).toHaveBeenCalledTimes(2);
      
      vi.useRealTimers();
    });

    it('should show retry count in UI', () => {
      const { rerender } = render(
        <WeeklyMeetingSidebar
          currentWeek={mockCurrentWeek}
          meetings={[]}
          error="Load failed"
          onRetry={mockOnRetry}
        />
      );

      const retryButton = screen.getByRole('button', { name: /retry/i });
      fireEvent.click(retryButton);

      // Simulate retry count increase
      rerender(
        <WeeklyMeetingSidebar
          currentWeek={mockCurrentWeek}
          meetings={[]}
          error="Load failed"
          onRetry={mockOnRetry}
          isLoading={true}
        />
      );

      expect(screen.getByText(/attempt 2/i)).toBeInTheDocument();
    });

    it('should reset retry count when error is cleared', () => {
      const { rerender } = render(
        <WeeklyMeetingSidebar
          currentWeek={mockCurrentWeek}
          meetings={[]}
          error="Load failed"
          onRetry={mockOnRetry}
        />
      );

      const retryButton = screen.getByRole('button', { name: /retry/i });
      fireEvent.click(retryButton);

      // Clear error
      rerender(
        <WeeklyMeetingSidebar
          currentWeek={mockCurrentWeek}
          meetings={validMeetings}
          error={null}
          onRetry={mockOnRetry}
        />
      );

      // Add error back
      rerender(
        <WeeklyMeetingSidebar
          currentWeek={mockCurrentWeek}
          meetings={[]}
          error="New error"
          onRetry={mockOnRetry}
        />
      );

      // Should not show retry count since it was reset
      expect(screen.queryByText(/attempt/i)).not.toBeInTheDocument();
    });

    it('should show error suggestions when available', () => {
      const processingError = {
        userMessage: 'Processing failed',
        suggestions: [
          'Check your internet connection',
          'Try refreshing the page',
          'Contact support if issue persists'
        ]
      };

      // Mock ErrorHandlingService to return error with suggestions
      ErrorHandlingService.handleError.mockReturnValue(processingError);

      const invalidMeetings = [
        {
          id: '1',
          title: 'Invalid Meeting',
          start_date: 'invalid-date',
          event_type: 'meeting'
        }
      ];

      render(
        <WeeklyMeetingSidebar
          currentWeek={mockCurrentWeek}
          meetings={invalidMeetings}
          onRetry={mockOnRetry}
        />
      );

      expect(screen.getByText('Suggestions:')).toBeInTheDocument();
      expect(screen.getByText('Check your internet connection')).toBeInTheDocument();
      expect(screen.getByText('Try refreshing the page')).toBeInTheDocument();
      // Should only show first 2 suggestions
      expect(screen.queryByText('Contact support if issue persists')).not.toBeInTheDocument();
    });

    it('should handle retry button disabled state correctly', () => {
      render(
        <WeeklyMeetingSidebar
          currentWeek={mockCurrentWeek}
          meetings={[]}
          error="Load failed"
          isLoading={true}
          onRetry={mockOnRetry}
        />
      );

      const retryButton = screen.getByRole('button', { name: /retry/i });
      expect(retryButton).toBeDisabled();
      
      // Should show loading spinner in button
      expect(retryButton.querySelector('.animate-spin')).toBeInTheDocument();
    });

    it('should respect showRetryButton prop', () => {
      render(
        <WeeklyMeetingSidebar
          currentWeek={mockCurrentWeek}
          meetings={[]}
          error="Load failed"
          onRetry={mockOnRetry}
          showRetryButton={false}
        />
      );

      expect(screen.queryByRole('button', { name: /retry/i })).not.toBeInTheDocument();
    });
  });

  describe('Graceful Degradation', () => {
    it('should continue processing valid meetings when some are invalid', () => {
      const mixedMeetings = [
        ...validMeetings,
        {
          id: '3',
          title: 'Invalid Meeting',
          start_date: 'invalid-date',
          event_type: 'meeting'
        }
      ];

      render(
        <WeeklyMeetingSidebar
          currentWeek={mockCurrentWeek}
          meetings={mixedMeetings}
        />
      );

      // Should still show valid meetings
      expect(screen.getByText('1:1 with John')).toBeInTheDocument();
      expect(screen.getByText('Team Meeting')).toBeInTheDocument();
      
      // Should show error for processing issues
      expect(screen.getByText('Error processing meetings')).toBeInTheDocument();
    });

    it('should handle missing meeting data gracefully', () => {
      const incompleteeMeetings = [
        {
          id: '1',
          title: 'Meeting without date',
          event_type: 'meeting'
          // Missing start_date
        },
        {
          id: '2',
          // Missing title
          start_date: '2024-01-15T10:00:00Z',
          event_type: 'meeting'
        }
      ];

      render(
        <WeeklyMeetingSidebar
          currentWeek={mockCurrentWeek}
          meetings={incompleteeMeetings}
        />
      );

      // Should show empty state since no valid meetings
      expect(screen.getByText('No meetings this week')).toBeInTheDocument();
    });

    it('should handle meeting click errors gracefully', async () => {
      mockOnMeetingClick.mockImplementation(() => {
        throw new Error('Navigation failed');
      });

      render(
        <WeeklyMeetingSidebar
          currentWeek={mockCurrentWeek}
          meetings={validMeetings}
          onMeetingClick={mockOnMeetingClick}
        />
      );

      const meetingButton = screen.getByText('1:1 with John').closest('button');
      fireEvent.click(meetingButton);

      await waitFor(() => {
        expect(ErrorHandlingService.handleError).toHaveBeenCalledWith(
          expect.any(Error),
          expect.objectContaining({
            operation: 'navigate to meeting',
            context: expect.objectContaining({
              meetingId: '1',
              meetingTitle: '1:1 with John'
            })
          })
        );
      });
    });

    it('should handle date navigation errors gracefully', async () => {
      mockOnDateNavigate.mockImplementation(() => {
        throw new Error('Date navigation failed');
      });

      render(
        <WeeklyMeetingSidebar
          currentWeek={mockCurrentWeek}
          meetings={validMeetings}
          onDateNavigate={mockOnDateNavigate}
        />
      );

      const dateButton = screen.getByText('Monday').closest('button');
      fireEvent.click(dateButton);

      await waitFor(() => {
        expect(ErrorHandlingService.handleError).toHaveBeenCalledWith(
          expect.any(Error),
          expect.objectContaining({
            operation: 'navigate to date'
          })
        );
      });
    });
  });

  describe('Time Formatting Error Handling', () => {
    it('should handle invalid time formats gracefully', () => {
      const meetingsWithInvalidTime = [
        {
          id: '1',
          title: 'Meeting with invalid time',
          start_date: 'not-a-date',
          event_type: 'meeting'
        }
      ];

      // Mock console.warn to avoid test output noise
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      render(
        <WeeklyMeetingSidebar
          currentWeek={mockCurrentWeek}
          meetings={meetingsWithInvalidTime}
        />
      );

      // Should show fallback time text
      expect(screen.getByText('Time unavailable')).toBeInTheDocument();
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Error formatting meeting time'),
        expect.any(Error)
      );

      consoleSpy.mockRestore();
    });

    it('should handle all-day events correctly', () => {
      const allDayMeetings = [
        {
          id: '1',
          title: 'All Day Event',
          start_date: '2024-01-15T00:00:00Z',
          end_date: '2024-01-15T23:59:59Z',
          all_day: true,
          event_type: 'meeting'
        }
      ];

      render(
        <WeeklyMeetingSidebar
          currentWeek={mockCurrentWeek}
          meetings={allDayMeetings}
        />
      );

      expect(screen.getByText('All day')).toBeInTheDocument();
    });
  });

  describe('Accessibility During Errors', () => {
    it('should maintain accessibility during error states', () => {
      render(
        <WeeklyMeetingSidebar
          currentWeek={mockCurrentWeek}
          meetings={[]}
          error="Load failed"
          onRetry={mockOnRetry}
        />
      );

      const errorAlert = screen.getByRole('alert');
      expect(errorAlert).toBeInTheDocument();
      expect(errorAlert).toHaveAttribute('aria-live', 'polite');

      const retryButton = screen.getByRole('button', { name: /retry/i });
      expect(retryButton).toBeInTheDocument();
      expect(retryButton).not.toHaveAttribute('aria-disabled', 'true');
    });

    it('should provide appropriate ARIA labels for loading state', () => {
      render(
        <WeeklyMeetingSidebar
          currentWeek={mockCurrentWeek}
          meetings={[]}
          isLoading={true}
        />
      );

      const loadingIndicator = screen.getByRole('status');
      expect(loadingIndicator).toBeInTheDocument();
      expect(screen.getByText('Loading meetings...')).toBeInTheDocument();
    });

    it('should maintain keyboard navigation during errors', () => {
      render(
        <WeeklyMeetingSidebar
          currentWeek={mockCurrentWeek}
          meetings={validMeetings}
          error="Processing error"
          onRetry={mockOnRetry}
        />
      );

      const retryButton = screen.getByRole('button', { name: /retry/i });
      
      // Should be focusable
      retryButton.focus();
      expect(document.activeElement).toBe(retryButton);

      // Should respond to Enter key
      fireEvent.keyDown(retryButton, { key: 'Enter' });
      expect(mockOnRetry).toHaveBeenCalled();
    });
  });

  describe('Error State Transitions', () => {
    it('should clear processing error when meetings change', () => {
      const invalidMeetings = [
        {
          id: '1',
          title: 'Invalid Meeting',
          start_date: 'invalid-date',
          event_type: 'meeting'
        }
      ];

      const { rerender } = render(
        <WeeklyMeetingSidebar
          currentWeek={mockCurrentWeek}
          meetings={invalidMeetings}
        />
      );

      // Should show processing error
      expect(screen.getByText('Error processing meetings')).toBeInTheDocument();

      // Update with valid meetings
      rerender(
        <WeeklyMeetingSidebar
          currentWeek={mockCurrentWeek}
          meetings={validMeetings}
        />
      );

      // Error should be cleared
      expect(screen.queryByText('Error processing meetings')).not.toBeInTheDocument();
      expect(screen.getByText('1:1 with John')).toBeInTheDocument();
    });

    it('should handle transition from loading to error state', () => {
      const { rerender } = render(
        <WeeklyMeetingSidebar
          currentWeek={mockCurrentWeek}
          meetings={[]}
          isLoading={true}
        />
      );

      expect(screen.getByText('Loading meetings...')).toBeInTheDocument();

      // Transition to error state
      rerender(
        <WeeklyMeetingSidebar
          currentWeek={mockCurrentWeek}
          meetings={[]}
          isLoading={false}
          error="Load failed"
          onRetry={mockOnRetry}
        />
      );

      expect(screen.queryByText('Loading meetings...')).not.toBeInTheDocument();
      expect(screen.getByText('Failed to load meetings')).toBeInTheDocument();
    });

    it('should handle transition from error to success state', () => {
      const { rerender } = render(
        <WeeklyMeetingSidebar
          currentWeek={mockCurrentWeek}
          meetings={[]}
          error="Load failed"
          onRetry={mockOnRetry}
        />
      );

      expect(screen.getByText('Failed to load meetings')).toBeInTheDocument();

      // Transition to success state
      rerender(
        <WeeklyMeetingSidebar
          currentWeek={mockCurrentWeek}
          meetings={validMeetings}
          error={null}
        />
      );

      expect(screen.queryByText('Failed to load meetings')).not.toBeInTheDocument();
      expect(screen.getByText('1:1 with John')).toBeInTheDocument();
    });
  });
});