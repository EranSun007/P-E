/**
 * Integration tests for calendar services error handling
 * Tests error handling across CalendarSynchronizationService, RecurringBirthdayService, and UI components
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { CalendarSynchronizationService } from '../calendarSynchronizationService.js';
import { RecurringBirthdayService } from '../recurringBirthdayService.js';
import { ErrorHandlingService } from '../errorHandlingService.js';
import { CalendarEvent, OneOnOne, TeamMember } from '../../api/entities.js';

// Mock dependencies
vi.mock('../../api/entities.js');
vi.mock('../../utils/calendarService.js');
vi.mock('@/components/ui/use-toast', () => ({
  toast: vi.fn()
}));

describe('Calendar Services Error Handling Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('CalendarSynchronizationService Error Handling', () => {
    it('should handle data loading failures gracefully', async () => {
      // Mock OneOnOne.list to fail
      OneOnOne.list.mockRejectedValue(new Error('Database connection failed'));
      TeamMember.list.mockResolvedValue([]);

      await expect(CalendarSynchronizationService.syncOneOnOneMeetings())
        .rejects.toThrow();

      // Verify error was properly categorized and handled
      expect(console.error).toHaveBeenCalled();
    });

    it('should handle partial failures during sync', async () => {
      const mockOneOnOnes = [
        { id: '1', team_member_id: 'tm1', next_meeting_date: '2024-01-15T10:00:00Z' },
        { id: '2', team_member_id: 'tm2', next_meeting_date: '2024-01-16T10:00:00Z' }
      ];
      const mockTeamMembers = [
        { id: 'tm1', name: 'John Doe' },
        { id: 'tm2', name: 'Jane Smith' }
      ];

      OneOnOne.list.mockResolvedValue(mockOneOnOnes);
      TeamMember.list.mockResolvedValue(mockTeamMembers);
      CalendarEvent.get.mockResolvedValue(null); // No existing events

      // Mock CalendarService to fail for one meeting
      const { CalendarService } = await import('../../utils/calendarService.js');
      CalendarService.createAndLinkOneOnOneMeeting
        .mockResolvedValueOnce({ calendarEvent: { id: 'ce1' } })
        .mockRejectedValueOnce(new Error('Creation failed'));

      const result = await CalendarSynchronizationService.syncOneOnOneMeetings();

      expect(result.summary.createdCount).toBe(1);
      expect(result.summary.errorCount).toBe(1);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].oneOnOneId).toBe('2');
    });

    it('should retry failed operations with exponential backoff', async () => {
      const mockOneOnOnes = [
        { id: '1', team_member_id: 'tm1', next_meeting_date: '2024-01-15T10:00:00Z' }
      ];
      const mockTeamMembers = [
        { id: 'tm1', name: 'John Doe' }
      ];

      OneOnOne.list.mockResolvedValue(mockOneOnOnes);
      TeamMember.list.mockResolvedValue(mockTeamMembers);
      CalendarEvent.get.mockResolvedValue(null);

      const { CalendarService } = await import('../../utils/calendarService.js');
      
      // Mock to fail twice then succeed
      let attempts = 0;
      CalendarService.createAndLinkOneOnOneMeeting.mockImplementation(() => {
        attempts++;
        if (attempts < 3) {
          throw new Error('Network timeout');
        }
        return { calendarEvent: { id: 'ce1' } };
      });

      const result = await CalendarSynchronizationService.syncOneOnOneMeetings();

      expect(result.summary.createdCount).toBe(1);
      expect(result.summary.errorCount).toBe(0);
      expect(CalendarService.createAndLinkOneOnOneMeeting).toHaveBeenCalledTimes(3);
    });

    it('should not retry validation errors', async () => {
      const mockOneOnOnes = [
        { id: '1', team_member_id: 'tm1', next_meeting_date: 'invalid-date' }
      ];
      const mockTeamMembers = [
        { id: 'tm1', name: 'John Doe' }
      ];

      OneOnOne.list.mockResolvedValue(mockOneOnOnes);
      TeamMember.list.mockResolvedValue(mockTeamMembers);
      CalendarEvent.get.mockResolvedValue(null);

      const { CalendarService } = await import('../../utils/calendarService.js');
      const { ValidationError } = await import('../errorHandlingService.js');
      
      CalendarService.createAndLinkOneOnOneMeeting.mockRejectedValue(
        new ValidationError('Invalid date format')
      );

      const result = await CalendarSynchronizationService.syncOneOnOneMeetings();

      expect(result.summary.errorCount).toBe(1);
      expect(CalendarService.createAndLinkOneOnOneMeeting).toHaveBeenCalledTimes(1);
    });

    it('should handle dry run mode correctly', async () => {
      const mockOneOnOnes = [
        { id: '1', team_member_id: 'tm1', next_meeting_date: '2024-01-15T10:00:00Z' }
      ];
      const mockTeamMembers = [
        { id: 'tm1', name: 'John Doe' }
      ];

      OneOnOne.list.mockResolvedValue(mockOneOnOnes);
      TeamMember.list.mockResolvedValue(mockTeamMembers);
      CalendarEvent.get.mockResolvedValue(null);

      const { CalendarService } = await import('../../utils/calendarService.js');

      const result = await CalendarSynchronizationService.syncOneOnOneMeetings({
        dryRun: true
      });

      expect(result.dryRun).toBe(true);
      expect(result.summary.createdCount).toBe(1);
      expect(result.created[0].calendarEventId).toBe('dry-run-placeholder');
      expect(CalendarService.createAndLinkOneOnOneMeeting).not.toHaveBeenCalled();
    });
  });

  describe('RecurringBirthdayService Error Handling', () => {
    it('should validate team member parameters', async () => {
      await expect(RecurringBirthdayService.generateBirthdayEventsForYears(
        null, 2024, 2025
      )).rejects.toThrow('Team member must have id and name fields');

      await expect(RecurringBirthdayService.generateBirthdayEventsForYears(
        { id: '1' }, 2024, 2025
      )).rejects.toThrow('Team member must have id and name fields');
    });

    it('should validate year parameters', async () => {
      const teamMember = { id: '1', name: 'John Doe', birthday: '1990-01-15' };

      await expect(RecurringBirthdayService.generateBirthdayEventsForYears(
        teamMember, 2025, 2024
      )).rejects.toThrow('Start year must be less than or equal to end year');

      await expect(RecurringBirthdayService.generateBirthdayEventsForYears(
        teamMember, 'invalid', 2024
      )).rejects.toThrow('Start year must be a valid year');
    });

    it('should handle invalid birthday dates', async () => {
      const teamMember = { id: '1', name: 'John Doe', birthday: 'invalid-date' };

      await expect(RecurringBirthdayService.generateBirthdayEventsForYears(
        teamMember, 2024, 2025
      )).rejects.toThrow('Invalid birthday date');
    });

    it('should handle missing birthday gracefully', async () => {
      const teamMember = { id: '1', name: 'John Doe' };

      const result = await RecurringBirthdayService.generateBirthdayEventsForYears(
        teamMember, 2024, 2025
      );

      expect(result).toEqual([]);
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('has no birthday date set')
      );
    });

    it('should continue processing other years when one fails', async () => {
      const teamMember = { id: '1', name: 'John Doe', birthday: '1990-01-15' };

      CalendarEvent.getBirthdayEvents.mockResolvedValue([]);
      
      // Mock CalendarEvent.create to fail for 2024 but succeed for 2025
      CalendarEvent.create
        .mockRejectedValueOnce(new Error('Database error'))
        .mockResolvedValueOnce({ id: 'ce2', title: "🎂 John Doe's Birthday" });

      const result = await RecurringBirthdayService.generateBirthdayEventsForYears(
        teamMember, 2024, 2025
      );

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('ce2');
      expect(console.error).toHaveBeenCalledWith(
        expect.stringContaining('Error creating birthday event for John Doe in 2024')
      );
    });

    it('should skip existing birthday events', async () => {
      const teamMember = { id: '1', name: 'John Doe', birthday: '1990-01-15' };

      CalendarEvent.getBirthdayEvents.mockResolvedValue([
        { 
          id: 'existing', 
          team_member_id: '1', 
          start_date: '2024-01-15T00:00:00Z' 
        }
      ]);

      const result = await RecurringBirthdayService.generateBirthdayEventsForYears(
        teamMember, 2024, 2024
      );

      expect(result).toHaveLength(0);
      expect(CalendarEvent.create).not.toHaveBeenCalled();
      expect(console.log).toHaveBeenCalledWith(
        'Birthday event already exists for John Doe in 2024'
      );
    });

    it('should retry failed birthday event creation', async () => {
      const teamMember = { id: '1', name: 'John Doe', birthday: '1990-01-15' };

      CalendarEvent.getBirthdayEvents.mockResolvedValue([]);
      
      // Mock to fail once then succeed
      let attempts = 0;
      CalendarEvent.create.mockImplementation(() => {
        attempts++;
        if (attempts === 1) {
          throw new Error('Network timeout');
        }
        return { id: 'ce1', title: "🎂 John Doe's Birthday" };
      });

      const result = await RecurringBirthdayService.generateBirthdayEventsForYears(
        teamMember, 2024, 2024
      );

      expect(result).toHaveLength(1);
      expect(CalendarEvent.create).toHaveBeenCalledTimes(2);
    });
  });

  describe('Error Recovery Scenarios', () => {
    it('should provide meaningful error messages for common failures', async () => {
      const networkError = new Error('fetch failed');
      const validationError = new Error('validation failed for field email');
      const permissionError = new Error('permission denied');

      const networkResult = ErrorHandlingService.handleError(networkError, {
        operation: 'sync calendar',
        showToast: false
      });

      const validationResult = ErrorHandlingService.handleError(validationError, {
        operation: 'create event',
        showToast: false
      });

      const permissionResult = ErrorHandlingService.handleError(permissionError, {
        operation: 'access data',
        showToast: false
      });

      expect(networkResult.category).toBe(ErrorHandlingService.CATEGORIES.NETWORK);
      expect(networkResult.isRetryable).toBe(true);
      expect(networkResult.suggestions).toContain('Check your internet connection');

      expect(validationResult.category).toBe(ErrorHandlingService.CATEGORIES.VALIDATION);
      expect(validationResult.isRetryable).toBe(false);
      expect(validationResult.suggestions).toContain('Verify all required fields are filled');

      expect(permissionResult.category).toBe(ErrorHandlingService.CATEGORIES.PERMISSION);
      expect(permissionResult.suggestions).toContain('Check your user permissions');
    });

    it('should handle cascading failures gracefully', async () => {
      // Simulate a scenario where multiple services fail
      OneOnOne.list.mockRejectedValue(new Error('Database unavailable'));
      CalendarEvent.getBirthdayEvents.mockRejectedValue(new Error('Storage error'));

      // Both operations should fail but not crash the application
      await expect(CalendarSynchronizationService.syncOneOnOneMeetings())
        .rejects.toThrow();

      const teamMember = { id: '1', name: 'John Doe', birthday: '1990-01-15' };
      await expect(RecurringBirthdayService.generateBirthdayEventsForYears(
        teamMember, 2024, 2024
      )).rejects.toThrow();

      // Verify errors were logged appropriately
      expect(console.error).toHaveBeenCalledTimes(2);
    });
  });

  describe('User Experience During Errors', () => {
    it('should provide progressive error disclosure', () => {
      const minorError = new Error('Minor validation issue');
      const majorError = new Error('Critical system failure');

      const minorResult = ErrorHandlingService.handleError(minorError, {
        operation: 'validate input',
        severity: ErrorHandlingService.SEVERITY.LOW,
        showToast: false
      });

      const majorResult = ErrorHandlingService.handleError(majorError, {
        operation: 'system operation',
        severity: ErrorHandlingService.SEVERITY.CRITICAL,
        showToast: false
      });

      expect(minorResult.userMessage).toContain('try again');
      expect(majorResult.userMessage).toContain('unexpected error');
      
      // Critical errors should have more detailed suggestions
      expect(majorResult.suggestions.length).toBeGreaterThan(minorResult.suggestions.length);
    });

    it('should provide contextual recovery suggestions', () => {
      const syncError = new Error('Synchronization failed');
      
      const result = ErrorHandlingService.handleError(syncError, {
        operation: 'calendar sync',
        category: ErrorHandlingService.CATEGORIES.SYNC,
        showToast: false
      });

      expect(result.suggestions).toContain('Try manual sync from the calendar toolbar');
      expect(result.suggestions).toContain('Refresh the page to reload data');
      expect(result.isRetryable).toBe(true);
    });
  });
});