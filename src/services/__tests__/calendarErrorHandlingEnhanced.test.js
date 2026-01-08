/**
 * Enhanced tests for calendar services error handling
 * Tests comprehensive error handling, user feedback, and recovery mechanisms
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { RecurringBirthdayService } from '../recurringBirthdayService.js';
import { CalendarEventGenerationService } from '../calendarEventGenerationService.js';
import { ErrorHandlingService } from '../errorHandlingService.js';
import { CalendarEvent, TeamMember, OutOfOffice, Duty } from '../../api/entities.js';
import { toast } from '@/components/ui/use-toast';

// Mock dependencies
vi.mock('../../api/entities.js');
vi.mock('@/components/ui/use-toast', () => ({
  toast: vi.fn()
}));

describe('Enhanced Calendar Services Error Handling', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('RecurringBirthdayService Enhanced Error Handling', () => {
    describe('updateBirthdayEventsForTeamMember', () => {
      it('should validate parameters and show appropriate error messages', async () => {
        await expect(RecurringBirthdayService.updateBirthdayEventsForTeamMember(null, '1990-01-15'))
          .rejects.toThrow('teamMemberId is required');

        await expect(RecurringBirthdayService.updateBirthdayEventsForTeamMember('tm1', null))
          .rejects.toThrow('newBirthdayDate is required');

        await expect(RecurringBirthdayService.updateBirthdayEventsForTeamMember('tm1', 'invalid-date'))
          .rejects.toThrow('Invalid birthday date');
      });

      it('should handle team member not found gracefully', async () => {
        TeamMember.get.mockResolvedValue(null);

        await expect(RecurringBirthdayService.updateBirthdayEventsForTeamMember('nonexistent', '1990-01-15'))
          .rejects.toThrow('Team member not found');
      });

      it('should retry failed operations with exponential backoff', async () => {
        const mockTeamMember = { id: 'tm1', name: 'John Doe', birthday: '1990-01-15' };
        TeamMember.get.mockResolvedValue(mockTeamMember);
        CalendarEvent.getBirthdayEvents.mockResolvedValue([
          { id: 'ce1', team_member_id: 'tm1', start_date: '2024-01-15T00:00:00Z' }
        ]);

        // Mock delete to fail twice then succeed
        let deleteAttempts = 0;
        CalendarEvent.delete.mockImplementation(() => {
          deleteAttempts++;
          if (deleteAttempts < 3) {
            throw new Error('Network timeout');
          }
          return Promise.resolve();
        });

        // Mock generateBirthdayEventsForYears to succeed
        vi.spyOn(RecurringBirthdayService, 'generateBirthdayEventsForYears')
          .mockResolvedValue([{ id: 'new-ce1' }]);

        const result = await RecurringBirthdayService.updateBirthdayEventsForTeamMember('tm1', '1990-02-15');

        expect(result.deletedEvents).toBe(1);
        expect(result.createdEvents).toBe(1);
        expect(CalendarEvent.delete).toHaveBeenCalledTimes(3); // 2 failures + 1 success
      });

      it('should continue with creation even if some deletions fail', async () => {
        const mockTeamMember = { id: 'tm1', name: 'John Doe', birthday: '1990-01-15' };
        TeamMember.get.mockResolvedValue(mockTeamMember);
        CalendarEvent.getBirthdayEvents.mockResolvedValue([
          { id: 'ce1', team_member_id: 'tm1', start_date: '2024-01-15T00:00:00Z' },
          { id: 'ce2', team_member_id: 'tm1', start_date: '2025-01-15T00:00:00Z' }
        ]);

        // Mock delete to fail for first event, succeed for second
        CalendarEvent.delete
          .mockRejectedValueOnce(new Error('Delete failed'))
          .mockResolvedValueOnce();

        vi.spyOn(RecurringBirthdayService, 'generateBirthdayEventsForYears')
          .mockResolvedValue([{ id: 'new-ce1' }]);

        const result = await RecurringBirthdayService.updateBirthdayEventsForTeamMember('tm1', '1990-02-15');

        expect(result.deletedEvents).toBe(1);
        expect(result.errors).toHaveLength(1);
        expect(result.createdEvents).toBe(1);
      });

      it('should show loading and success notifications', async () => {
        const mockTeamMember = { id: 'tm1', name: 'John Doe', birthday: '1990-01-15' };
        TeamMember.get.mockResolvedValue(mockTeamMember);
        CalendarEvent.getBirthdayEvents.mockResolvedValue([]);
        
        vi.spyOn(RecurringBirthdayService, 'generateBirthdayEventsForYears')
          .mockResolvedValue([{ id: 'new-ce1' }]);

        await RecurringBirthdayService.updateBirthdayEventsForTeamMember('tm1', '1990-02-15');

        // Should show loading toast
        expect(toast).toHaveBeenCalledWith(expect.objectContaining({
          title: 'Loading...',
          description: expect.stringContaining('Update Birthday Events'),
          duration: 0
        }));

        // Should show success toast
        expect(toast).toHaveBeenCalledWith(expect.objectContaining({
          title: 'Success',
          description: expect.stringContaining('Updated birthday events'),
          variant: 'default'
        }));
      });
    });

    describe('deleteBirthdayEventsForTeamMember', () => {
      it('should handle no events gracefully', async () => {
        CalendarEvent.getBirthdayEvents.mockResolvedValue([]);

        const result = await RecurringBirthdayService.deleteBirthdayEventsForTeamMember('tm1');

        expect(result.deletedCount).toBe(0);
        expect(result.errorCount).toBe(0);
        expect(result.totalEvents).toBe(0);
      });

      it('should continue deleting other events when some fail', async () => {
        CalendarEvent.getBirthdayEvents.mockResolvedValue([
          { id: 'ce1', team_member_id: 'tm1' },
          { id: 'ce2', team_member_id: 'tm1' },
          { id: 'ce3', team_member_id: 'tm1' }
        ]);

        // Mock delete to fail for middle event
        CalendarEvent.delete
          .mockResolvedValueOnce()
          .mockRejectedValueOnce(new Error('Delete failed'))
          .mockResolvedValueOnce();

        const result = await RecurringBirthdayService.deleteBirthdayEventsForTeamMember('tm1');

        expect(result.deletedCount).toBe(2);
        expect(result.errorCount).toBe(1);
        expect(result.totalEvents).toBe(3);
        expect(result.errors).toHaveLength(1);
        expect(result.errors[0].eventId).toBe('ce2');
      });

      it('should retry failed deletions', async () => {
        CalendarEvent.getBirthdayEvents.mockResolvedValue([
          { id: 'ce1', team_member_id: 'tm1' }
        ]);

        // Mock delete to fail once then succeed
        let attempts = 0;
        CalendarEvent.delete.mockImplementation(() => {
          attempts++;
          if (attempts === 1) {
            throw new Error('Network error');
          }
          return Promise.resolve();
        });

        const result = await RecurringBirthdayService.deleteBirthdayEventsForTeamMember('tm1');

        expect(result.deletedCount).toBe(1);
        expect(result.errorCount).toBe(0);
        expect(CalendarEvent.delete).toHaveBeenCalledTimes(2);
      });
    });

    describe('ensureBirthdayEventsExist', () => {
      it('should handle team member loading failure', async () => {
        TeamMember.list.mockRejectedValue(new Error('Database connection failed'));

        await expect(RecurringBirthdayService.ensureBirthdayEventsExist())
          .rejects.toThrow();

        // Should retry team member loading
        expect(TeamMember.list).toHaveBeenCalledTimes(3); // Initial + 2 retries
      });

      it('should continue processing other members when one fails', async () => {
        const mockTeamMembers = [
          { id: 'tm1', name: 'John Doe', birthday: '1990-01-15' },
          { id: 'tm2', name: 'Jane Smith', birthday: '1985-05-20' },
          { id: 'tm3', name: 'Bob Wilson', birthday: '1992-12-10' }
        ];

        TeamMember.list.mockResolvedValue(mockTeamMembers);

        // Mock generateBirthdayEventsForYears to fail for middle member
        vi.spyOn(RecurringBirthdayService, 'generateBirthdayEventsForYears')
          .mockResolvedValueOnce([{ id: 'ce1' }])
          .mockRejectedValueOnce(new Error('Generation failed'))
          .mockResolvedValueOnce([{ id: 'ce3' }]);

        const result = await RecurringBirthdayService.ensureBirthdayEventsExist(mockTeamMembers);

        expect(result.summary.membersWithBirthdays).toBe(3);
        expect(result.summary.errorsEncountered).toBe(1);
        expect(result.errors).toHaveLength(1);
        expect(result.errors[0].teamMemberName).toBe('Jane Smith');
      });

      it('should calculate success rate correctly', async () => {
        const mockTeamMembers = [
          { id: 'tm1', name: 'John Doe', birthday: '1990-01-15' },
          { id: 'tm2', name: 'Jane Smith', birthday: '1985-05-20' },
          { id: 'tm3', name: 'Bob Wilson', birthday: '1992-12-10' },
          { id: 'tm4', name: 'Alice Brown', birthday: '1988-08-30' }
        ];

        TeamMember.list.mockResolvedValue(mockTeamMembers);

        // Mock to fail for 1 out of 4 members
        vi.spyOn(RecurringBirthdayService, 'generateBirthdayEventsForYears')
          .mockResolvedValueOnce([{ id: 'ce1' }])
          .mockRejectedValueOnce(new Error('Generation failed'))
          .mockResolvedValueOnce([{ id: 'ce3' }])
          .mockResolvedValueOnce([{ id: 'ce4' }]);

        const result = await RecurringBirthdayService.ensureBirthdayEventsExist(mockTeamMembers);

        expect(result.summary.successRate).toBe('75.0%'); // 3 out of 4 succeeded
      });
    });
  });

  describe('CalendarEventGenerationService Enhanced Error Handling', () => {
    describe('synchronizeAllEvents', () => {
      it('should handle partial failures gracefully', async () => {
        TeamMember.list.mockResolvedValue([
          { id: 'tm1', name: 'John Doe', birthday: '1990-01-15' }
        ]);

        // Mock birthday service to succeed
        vi.spyOn(RecurringBirthdayService, 'ensureBirthdayEventsExist')
          .mockResolvedValue({
            createdEvents: 2,
            errors: []
          });

        // Mock duty generation to fail
        vi.spyOn(CalendarEventGenerationService, 'generateDutyEvents')
          .mockRejectedValue(new Error('Duty generation failed'));

        // Mock out-of-office generation to succeed
        vi.spyOn(CalendarEventGenerationService, 'generateOutOfOfficeEvents')
          .mockResolvedValue([{ id: 'ooo1' }]);

        const result = await CalendarEventGenerationService.synchronizeAllEvents();

        expect(result.summary.totalCreated).toBe(3); // 2 birthday + 1 out-of-office
        expect(result.summary.totalErrors).toBe(1); // 1 duty error
        expect(result.summary.success).toBe(false); // Has errors
        expect(result.errors).toHaveLength(1);
        expect(result.errors[0].type).toBe('duty_generation');
      });

      it('should retry failed operations', async () => {
        TeamMember.list.mockResolvedValue([]);

        // Mock duty generation to fail twice then succeed
        let dutyAttempts = 0;
        vi.spyOn(CalendarEventGenerationService, 'generateDutyEvents')
          .mockImplementation(() => {
            dutyAttempts++;
            if (dutyAttempts < 3) {
              throw new Error('Network timeout');
            }
            return Promise.resolve([{ id: 'duty1' }]);
          });

        vi.spyOn(CalendarEventGenerationService, 'generateOutOfOfficeEvents')
          .mockResolvedValue([]);

        vi.spyOn(RecurringBirthdayService, 'ensureBirthdayEventsExist')
          .mockResolvedValue({ createdEvents: 0, errors: [] });

        const result = await CalendarEventGenerationService.synchronizeAllEvents();

        expect(result.summary.totalCreated).toBe(1);
        expect(result.summary.totalErrors).toBe(0);
        expect(dutyAttempts).toBe(3); // 2 failures + 1 success
      });

      it('should not retry validation errors', async () => {
        TeamMember.list.mockResolvedValue([]);

        // Mock duty generation to fail with validation error
        vi.spyOn(CalendarEventGenerationService, 'generateDutyEvents')
          .mockRejectedValue(new Error('validation failed'));

        vi.spyOn(CalendarEventGenerationService, 'generateOutOfOfficeEvents')
          .mockResolvedValue([]);

        vi.spyOn(RecurringBirthdayService, 'ensureBirthdayEventsExist')
          .mockResolvedValue({ createdEvents: 0, errors: [] });

        const result = await CalendarEventGenerationService.synchronizeAllEvents();

        expect(result.summary.totalErrors).toBe(1);
        // Should only be called once (no retries for validation errors)
        expect(CalendarEventGenerationService.generateDutyEvents).toHaveBeenCalledTimes(1);
      });

      it('should provide detailed error context', async () => {
        TeamMember.list.mockResolvedValue([]);

        const testError = new Error('Specific failure reason');
        vi.spyOn(CalendarEventGenerationService, 'generateDutyEvents')
          .mockRejectedValue(testError);

        vi.spyOn(CalendarEventGenerationService, 'generateOutOfOfficeEvents')
          .mockResolvedValue([]);

        vi.spyOn(RecurringBirthdayService, 'ensureBirthdayEventsExist')
          .mockResolvedValue({ createdEvents: 0, errors: [] });

        const result = await CalendarEventGenerationService.synchronizeAllEvents({
          year: 2024
        });

        expect(result.errors[0]).toEqual(expect.objectContaining({
          type: 'duty_generation',
          message: expect.any(String),
          category: expect.any(String)
        }));
      });

      it('should show success notification for created events', async () => {
        TeamMember.list.mockResolvedValue([]);

        vi.spyOn(CalendarEventGenerationService, 'generateDutyEvents')
          .mockResolvedValue([{ id: 'duty1' }, { id: 'duty2' }]);

        vi.spyOn(CalendarEventGenerationService, 'generateOutOfOfficeEvents')
          .mockResolvedValue([{ id: 'ooo1' }]);

        vi.spyOn(RecurringBirthdayService, 'ensureBirthdayEventsExist')
          .mockResolvedValue({ createdEvents: 1, errors: [] });

        await CalendarEventGenerationService.synchronizeAllEvents();

        expect(toast).toHaveBeenCalledWith(expect.objectContaining({
          title: 'Success',
          description: expect.stringContaining('Synchronized 4 calendar events'),
          variant: 'default'
        }));
      });
    });
  });

  describe('Error Recovery Scenarios', () => {
    it('should provide contextual error messages for different failure types', async () => {
      const networkError = new Error('fetch failed');
      const validationError = new Error('Invalid birthday date format');
      const permissionError = new Error('Access denied to calendar data');

      // Test network error categorization
      TeamMember.get.mockRejectedValue(networkError);
      await expect(RecurringBirthdayService.updateBirthdayEventsForTeamMember('tm1', '1990-01-15'))
        .rejects.toThrow();

      // Test validation error categorization  
      await expect(RecurringBirthdayService.updateBirthdayEventsForTeamMember('tm1', 'invalid-date'))
        .rejects.toThrow();

      // Verify appropriate error handling was applied
      expect(console.error).toHaveBeenCalled();
    });

    it('should handle cascading service failures', async () => {
      // Simulate multiple service failures
      TeamMember.list.mockRejectedValue(new Error('Database unavailable'));
      CalendarEvent.getBirthdayEvents.mockRejectedValue(new Error('Storage error'));

      // Both operations should fail but not crash
      await expect(RecurringBirthdayService.ensureBirthdayEventsExist())
        .rejects.toThrow();

      await expect(RecurringBirthdayService.deleteBirthdayEventsForTeamMember('tm1'))
        .rejects.toThrow();

      // Verify errors were logged appropriately
      expect(console.error).toHaveBeenCalled();
    });

    it('should maintain data consistency during partial failures', async () => {
      const mockTeamMembers = [
        { id: 'tm1', name: 'John Doe', birthday: '1990-01-15' },
        { id: 'tm2', name: 'Jane Smith', birthday: '1985-05-20' }
      ];

      TeamMember.list.mockResolvedValue(mockTeamMembers);

      // Mock first member to succeed, second to fail
      vi.spyOn(RecurringBirthdayService, 'generateBirthdayEventsForYears')
        .mockResolvedValueOnce([{ id: 'ce1' }])
        .mockRejectedValueOnce(new Error('Generation failed'));

      const result = await RecurringBirthdayService.ensureBirthdayEventsExist(mockTeamMembers);

      // Should have processed both members
      expect(result.summary.membersWithBirthdays).toBe(2);
      // Should have created events for successful member
      expect(result.createdEvents).toBe(1);
      // Should have recorded error for failed member
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].teamMemberName).toBe('Jane Smith');
    });
  });

  describe('Performance and Resource Management', () => {
    it('should handle large datasets without memory issues', async () => {
      // Create a large number of team members
      const largeTeamMemberList = Array.from({ length: 100 }, (_, i) => ({
        id: `tm${i}`,
        name: `Team Member ${i}`,
        birthday: '1990-01-15'
      }));

      TeamMember.list.mockResolvedValue(largeTeamMemberList);

      // Mock generation to succeed for all
      vi.spyOn(RecurringBirthdayService, 'generateBirthdayEventsForYears')
        .mockResolvedValue([{ id: 'ce1' }]);

      const result = await RecurringBirthdayService.ensureBirthdayEventsExist(largeTeamMemberList);

      expect(result.summary.membersWithBirthdays).toBe(100);
      expect(result.summary.errorsEncountered).toBe(0);
      expect(result.createdEvents).toBe(300); // 100 members * 3 years
    });

    it('should handle timeout scenarios gracefully', async () => {
      TeamMember.list.mockImplementation(() => 
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Request timeout')), 100)
        )
      );

      await expect(RecurringBirthdayService.ensureBirthdayEventsExist())
        .rejects.toThrow();

      // Should have attempted retries
      expect(TeamMember.list).toHaveBeenCalledTimes(3);
    });
  });
});