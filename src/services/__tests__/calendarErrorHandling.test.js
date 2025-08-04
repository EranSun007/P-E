/**
 * Comprehensive calendar services error handling tests
 * Consolidates error handling tests for CalendarSynchronizationService, RecurringBirthdayService, and CalendarEventGenerationService
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import { CalendarEvent, OneOnOne, TeamMember, OutOfOffice, Duty } from '@/api/entitiesjs;
import { CalendarEventGenerationService } from '../calendarEventGenerationServicejs;
import { CalendarService, ValidationError } from '@/utils/calendarServicejs;
import { CalendarSynchronizationService } from '../calendarSynchronizationServicejs;
import { ErrorHandlingService } from '../errorHandlingServicejs;
import { RecurringBirthdayService } from '../recurringBirthdayServicejs;
import { toast } from '@/components/ui/use-toast';
vi.mock('../../api/entities.js');
vi.mock('../../utils/calendarService.js', () => ({
  CalendarService: {
    getOneOnOneMeetings: vi.fn(),
    createAndLinkOneOnOneMeeting: vi.fn(),
    updateOneOnOneMeeting: vi.fn(),
    generateOneOnOneTitle: vi.fn(),
    _validateDateTime: vi.fn()
  },
  ValidationError: class ValidationError extends Error {
    constructor(message, field = null, value = null) {
      super(message);
      this.name = 'ValidationError';
      this.field = field;
      this.value = value;
    }
  }
}));
vi.mock('@/components/ui/use-toast', () => ({
  toast: vi.fn()
}));

describe('Calendar Services Error Handling - Comprehensive Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.spyOn(console, 'log').mockImplementation(() => {});
    
    // Setup default mock implementations
    CalendarService.generateOneOnOneTitle.mockImplementation((name) => `${name} 1:1`);
    CalendarService._validateDateTime.mockImplementation((dateTime) => {
      if (!dateTime || typeof dateTime !== 'string') {
        throw new ValidationError('Invalid dateTime format', 'dateTime', dateTime);
      }
      const date = new Date(dateTime);
      if (isNaN(date.getTime())) {
        throw new ValidationError('Invalid dateTime format', 'dateTime', dateTime);
      }
      return date;
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('CalendarSynchronizationService Error Handling', () => {
    describe('syncOneOnOneMeetings - Results Variable Handling', () => {
      it('should properly initialize and use results variable throughout the method', async () => {
        const mockOneOnOnes = [
          {
            id: 'oneonone-1',
            team_member_id: 'team-1',
            next_meeting_date: '2024-01-15T10:00:00.000Z',
            next_meeting_calendar_event_id: null
          }
        ];

        const mockTeamMembers = [
          { id: 'team-1', name: 'John Smith' }
        ];

        const mockCalendarResult = {
          calendarEvent: { id: 'event-1', title: 'John Smith 1:1' },
          oneOnOne: { id: 'oneonone-1', next_meeting_calendar_event_id: 'event-1' }
        };

        OneOnOne.list.mockResolvedValue(mockOneOnOnes);
        TeamMember.list.mockResolvedValue(mockTeamMembers);
        CalendarService.createAndLinkOneOnOneMeeting.mockResolvedValue(mockCalendarResult);

        const result = await CalendarSynchronizationService.syncOneOnOneMeetings();

        // Verify results object structure is properly initialized and populated
        expect(result).toHaveProperty('timestamp');
        expect(result).toHaveProperty('dryRun', false);
        expect(result).toHaveProperty('totalOneOnOnes', 1);
        expect(result).toHaveProperty('processed', 1);
        expect(result).toHaveProperty('created');
        expect(result).toHaveProperty('updated');
        expect(result).toHaveProperty('skipped');
        expect(result).toHaveProperty('errors');
        expect(result).toHaveProperty('summary');

        // Verify results arrays are properly initialized as arrays
        expect(Array.isArray(result.created)).toBe(true);
        expect(Array.isArray(result.updated)).toBe(true);
        expect(Array.isArray(result.skipped)).toBe(true);
        expect(Array.isArray(result.errors)).toBe(true);

        // Verify summary object is properly initialized and calculated
        expect(result.summary).toHaveProperty('success', true);
        expect(result.summary).toHaveProperty('createdCount', 1);
        expect(result.summary).toHaveProperty('updatedCount', 0);
        expect(result.summary).toHaveProperty('skippedCount', 0);
        expect(result.summary).toHaveProperty('errorCount', 0);

        // Verify created array contains proper data structure
        expect(result.created).toHaveLength(1);
        expect(result.created[0]).toHaveProperty('oneOnOneId', 'oneonone-1');
        expect(result.created[0]).toHaveProperty('teamMemberId', 'team-1');
        expect(result.created[0]).toHaveProperty('teamMemberName', 'John Smith');
        expect(result.created[0]).toHaveProperty('calendarEventId', 'event-1');
        expect(result.created[0]).toHaveProperty('meetingDate', '2024-01-15T10:00:00.000Z');
      });

      it('should handle results variable correctly when no OneOnOne records exist', async () => {
        OneOnOne.list.mockResolvedValue([]);
        TeamMember.list.mockResolvedValue([]);

        const result = await CalendarSynchronizationService.syncOneOnOneMeetings();

        // Verify results object is still properly initialized even with empty data
        expect(result.totalOneOnOnes).toBe(0);
        expect(result.processed).toBe(0);
        expect(result.created).toHaveLength(0);
        expect(result.updated).toHaveLength(0);
        expect(result.skipped).toHaveLength(0);
        expect(result.errors).toHaveLength(0);
        expect(result.summary.success).toBe(true);
        expect(result.summary.createdCount).toBe(0);
      });

      it('should handle results variable correctly with mixed success and failure scenarios', async () => {
        const mockOneOnOnes = [
          {
            id: 'oneonone-1',
            team_member_id: 'team-1',
            next_meeting_date: '2024-01-15T10:00:00.000Z',
            next_meeting_calendar_event_id: null
          },
          {
            id: 'oneonone-2',
            team_member_id: 'team-2',
            next_meeting_date: '2024-01-16T14:00:00.000Z',
            next_meeting_calendar_event_id: null
          },
          {
            id: 'oneonone-3',
            team_member_id: 'team-3',
            next_meeting_date: null, // Should be skipped
            next_meeting_calendar_event_id: null
          }
        ];

        const mockTeamMembers = [
          { id: 'team-1', name: 'John Smith' },
          { id: 'team-2', name: 'Jane Doe' }
          // team-3 missing - should cause error
        ];

        OneOnOne.list.mockResolvedValue(mockOneOnOnes);
        TeamMember.list.mockResolvedValue(mockTeamMembers);
        
        // First call succeeds, second call fails
        CalendarService.createAndLinkOneOnOneMeeting
          .mockResolvedValueOnce({
            calendarEvent: { id: 'event-1' },
            oneOnOne: { id: 'oneonone-1' }
          })
          .mockRejectedValue(new Error('Calendar service error'));

        const result = await CalendarSynchronizationService.syncOneOnOneMeetings();

        // Verify results object properly tracks all outcomes
        expect(result.totalOneOnOnes).toBe(3);
        expect(result.processed).toBe(3);
        expect(result.created).toHaveLength(1);
        expect(result.skipped).toHaveLength(1);
        expect(result.errors).toHaveLength(1); // Only one error for failed creation

        expect(result.summary.createdCount).toBe(1);
        expect(result.summary.skippedCount).toBe(1);
        expect(result.summary.errorCount).toBe(1);
        expect(result.summary.success).toBe(false); // Should be false due to errors

        // Verify specific error tracking
        expect(result.errors[0].oneOnOneId).toBe('oneonone-2');
        expect(result.errors[0].error).toContain('Calendar service error');
      });

      it('should handle defensive checks for invalid OneOnOne objects', async () => {
        const mockOneOnOnes = [
          null, // Invalid object
          { id: 'oneonone-1' }, // Missing required fields
          {
            id: 'oneonone-2',
            team_member_id: 'team-1',
            next_meeting_date: '2024-01-15T10:00:00.000Z',
            next_meeting_calendar_event_id: null
          }
        ];

        const mockTeamMembers = [
          { id: 'team-1', name: 'John Smith' }
        ];

        OneOnOne.list.mockResolvedValue(mockOneOnOnes);
        TeamMember.list.mockResolvedValue(mockTeamMembers);
        CalendarService.createAndLinkOneOnOneMeeting.mockResolvedValue({
          calendarEvent: { id: 'event-1' },
          oneOnOne: { id: 'oneonone-2' }
        });

        const result = await CalendarSynchronizationService.syncOneOnOneMeetings();

        // Verify results object properly handles invalid objects
        expect(result.totalOneOnOnes).toBe(3);
        expect(result.processed).toBe(2); // Only valid objects are processed
        expect(result.created).toHaveLength(1);
        expect(result.errors).toHaveLength(1);
        
        // Verify error tracking for invalid objects
        expect(result.errors[0].error).toBe('Invalid OneOnOne record - not an object');
      });
    });

    describe('Data Loading and Partial Failures', () => {
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

        const result = await CalendarSynchronizationService.syncOneOnOneMeetings({
          dryRun: true
        });

        expect(result.dryRun).toBe(true);
        expect(result.summary.createdCount).toBe(1);
        expect(result.created[0].calendarEventId).toBe('dry-run-placeholder');
        expect(CalendarService.createAndLinkOneOnOneMeeting).not.toHaveBeenCalled();
      });
    });
  });

  describe('RecurringBirthdayService Error Handling', () => {
    describe('ensureBirthdayEventsExist - CreatedEvents Tracking', () => {
      it('should properly initialize and track createdEvents variable', async () => {
        const mockTeamMembers = [
          {
            id: 'tm1',
            name: 'John Doe',
            birthday: '1990-05-15T00:00:00.000Z'
          },
          {
            id: 'tm2',
            name: 'Jane Smith',
            birthday: '1985-12-25T00:00:00.000Z'
          }
        ];

        const mockCreatedEvent = {
          id: 'event1',
          title: '🎂 John Doe\'s Birthday',
          event_type: 'birthday'
        };

        TeamMember.list.mockResolvedValue(mockTeamMembers);
        CalendarEvent.getBirthdayEvents.mockResolvedValue([]);
        CalendarEvent.create.mockResolvedValue(mockCreatedEvent);

        const result = await RecurringBirthdayService.ensureBirthdayEventsExist();

        // Verify createdEvents is properly tracked in results
        expect(result).toHaveProperty('createdEvents');
        expect(typeof result.createdEvents).toBe('number');
        expect(result.createdEvents).toBe(6); // 2 members × 3 years (default)

        // Verify summary properly reflects createdEvents count
        expect(result.summary).toHaveProperty('eventsCreated', 6);
        expect(result.summary).toHaveProperty('totalTeamMembers', 2);
        expect(result.summary).toHaveProperty('membersWithBirthdays', 2);
        expect(result.summary).toHaveProperty('membersWithoutBirthdays', 0);
      });

      it('should handle createdEvents variable when no team members have birthdays', async () => {
        const mockTeamMembers = [
          {
            id: 'tm1',
            name: 'John Doe'
            // No birthday field
          },
          {
            id: 'tm2',
            name: 'Jane Smith'
            // No birthday field
          }
        ];

        TeamMember.list.mockResolvedValue(mockTeamMembers);

        const result = await RecurringBirthdayService.ensureBirthdayEventsExist();

        // Verify createdEvents is properly initialized to 0
        expect(result.createdEvents).toBe(0);
        expect(result.summary.eventsCreated).toBe(0);
        expect(result.summary.membersWithBirthdays).toBe(0);
        expect(result.summary.membersWithoutBirthdays).toBe(2);
      });

      it('should handle createdEvents variable with mixed success and failure scenarios', async () => {
        const mockTeamMembers = [
          {
            id: 'tm1',
            name: 'John Doe',
            birthday: '1990-05-15T00:00:00.000Z'
          },
          {
            id: 'tm2',
            name: 'Jane Smith',
            birthday: 'invalid-date' // Should cause error
          },
          {
            id: 'tm3',
            name: 'Bob Wilson',
            birthday: '1985-12-25T00:00:00.000Z'
          }
        ];

        TeamMember.list.mockResolvedValue(mockTeamMembers);
        CalendarEvent.getBirthdayEvents.mockResolvedValue([]);
        CalendarEvent.create
          .mockResolvedValueOnce({ id: 'event1' })
          .mockResolvedValueOnce({ id: 'event2' })
          .mockResolvedValueOnce({ id: 'event3' })
          .mockResolvedValueOnce({ id: 'event4' })
          .mockResolvedValueOnce({ id: 'event5' })
          .mockResolvedValueOnce({ id: 'event6' });

        const result = await RecurringBirthdayService.ensureBirthdayEventsExist();

        // Verify createdEvents properly tracks successful creations despite errors
        expect(result.createdEvents).toBe(6); // 2 successful members × 3 years
        expect(result.summary.eventsCreated).toBe(6);
        expect(result.summary.errorsEncountered).toBe(1);
        expect(result.errors).toHaveLength(1);
        expect(result.errors[0].teamMemberName).toBe('Jane Smith');
      });
    });

    describe('Parameter Validation and Error Handling', () => {
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
    });

    describe('updateBirthdayEventsForTeamMember Enhanced Error Handling', () => {
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

    describe('Event Processing and Retry Logic', () => {
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
  });

  describe('CalendarEventGenerationService Error Handling', () => {
    describe('synchronizeAllEvents Enhanced Error Handling', () => {
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

  describe('Date Validation Edge Cases and Timezone Handling', () => {
    beforeEach(() => {
      // Reset the mock to use real validation logic for these tests
      CalendarService._validateDateTime.mockRestore?.();
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2024-01-15T10:00:00.000Z'));
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('should handle timezone edge cases correctly', () => {
      // Mock the actual validation method
      CalendarService._validateDateTime.mockImplementation((dateTime, fieldName = 'dateTime', allowPast = false, bufferMinutes = 5) => {
        if (!dateTime || typeof dateTime !== 'string') {
          throw new ValidationError(`${fieldName} is required and must be a string`, fieldName, dateTime);
        }

        const date = new Date(dateTime);
        if (isNaN(date.getTime())) {
          throw new ValidationError(`Invalid ${fieldName} format: ${dateTime}`, fieldName, dateTime);
        }

        if (!allowPast) {
          const now = new Date();
          const buffer = Math.max(bufferMinutes, 1) * 60 * 1000; // Minimum 1 minute buffer
          const earliestAllowed = new Date(now.getTime() - buffer);

          if (date < earliestAllowed) {
            const minutesAgo = Math.round((now.getTime() - date.getTime()) / (60 * 1000));
            throw new ValidationError(
              `${fieldName} cannot be in the past. Provided: ${dateTime} (${minutesAgo} minutes ago), Current: ${now.toISOString()}`,
              fieldName,
              dateTime
            );
          }
        }

        return date;
      });

      // Test UTC timezone
      const utcDate = '2024-01-15T15:00:00.000Z';
      const utcResult = CalendarService._validateDateTime(utcDate);
      expect(utcResult).toBeInstanceOf(Date);
      expect(utcResult.toISOString()).toBe(utcDate);

      // Test positive timezone offset
      const positiveOffsetDate = '2024-01-15T16:00:00+01:00'; // Same as 15:00 UTC
      const positiveResult = CalendarService._validateDateTime(positiveOffsetDate);
      expect(positiveResult).toBeInstanceOf(Date);
      expect(positiveResult.getTime()).toBe(new Date('2024-01-15T15:00:00.000Z').getTime());

      // Test negative timezone offset
      const negativeOffsetDate = '2024-01-15T10:00:00-05:00'; // Same as 15:00 UTC
      const negativeResult = CalendarService._validateDateTime(negativeOffsetDate);
      expect(negativeResult).toBeInstanceOf(Date);
      expect(negativeResult.getTime()).toBe(new Date('2024-01-15T15:00:00.000Z').getTime());
    });

    it('should provide detailed error messages for validation failures', () => {
      CalendarService._validateDateTime.mockImplementation((dateTime, fieldName = 'dateTime', allowPast = false, bufferMinutes = 5) => {
        if (!dateTime) {
          throw new ValidationError(`${fieldName} is required`, fieldName, dateTime);
        }

        if (typeof dateTime !== 'string') {
          throw new ValidationError(`${fieldName} must be a string`, fieldName, dateTime);
        }

        const date = new Date(dateTime);
        if (isNaN(date.getTime())) {
          throw new ValidationError(
            `Invalid ${fieldName} format: ${dateTime}. Expected ISO string format (YYYY-MM-DDTHH:mm:ss.sssZ)`,
            fieldName,
            dateTime
          );
        }

        if (!allowPast) {
          const now = new Date('2024-01-15T10:00:00.000Z');
          const buffer = Math.max(bufferMinutes, 1) * 60 * 1000;
          const earliestAllowed = new Date(now.getTime() - buffer);

          if (date < earliestAllowed) {
            const minutesAgo = Math.round((now.getTime() - date.getTime()) / (60 * 1000));
            throw new ValidationError(
              `${fieldName} cannot be in the past. Provided: ${dateTime} (${minutesAgo} minutes ago), Current: ${now.toISOString()}, Buffer: ${bufferMinutes} minutes`,
              fieldName,
              dateTime
            );
          }
        }

        return date;
      });

      // Test required field error
      try {
        CalendarService._validateDateTime(null, 'meetingStartTime');
      } catch (error) {
        expect(error.message).toBe('meetingStartTime is required');
        expect(error.field).toBe('meetingStartTime');
      }

      // Test type error
      try {
        CalendarService._validateDateTime(123, 'meetingStartTime');
      } catch (error) {
        expect(error.message).toBe('meetingStartTime must be a string');
        expect(error.field).toBe('meetingStartTime');
      }

      // Test format error
      try {
        CalendarService._validateDateTime('invalid-date', 'meetingStartTime');
      } catch (error) {
        expect(error.message).toContain('Invalid meetingStartTime format');
        expect(error.message).toContain('Expected ISO string format');
        expect(error.field).toBe('meetingStartTime');
      }
    });
  });

  describe('Error Recovery and User Experience', () => {
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