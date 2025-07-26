// src/services/__tests__/calendarEventGenerationService.test.js
// Tests for CalendarEventGenerationService

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CalendarEventGenerationService } from '../calendarEventGenerationService.js';
import { CalendarEvent, TeamMember, OutOfOffice, Duty } from '../../api/entities.js';

// Mock the entities
vi.mock('../../api/entities.js', () => ({
  CalendarEvent: {
    create: vi.fn(),
    list: vi.fn(),
    getBirthdayEvents: vi.fn(),
    getByDutyId: vi.fn(),
    getByOutOfOfficeId: vi.fn(),
    createDutyEvent: vi.fn(),
    createOutOfOfficeEvent: vi.fn(),
    delete: vi.fn()
  },
  TeamMember: {
    list: vi.fn(),
    get: vi.fn()
  },
  OutOfOffice: {
    list: vi.fn()
  },
  Duty: {
    list: vi.fn()
  }
}));

describe('CalendarEventGenerationService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('generateBirthdayEvents', () => {
    it('should generate birthday events for team members with birthdays', async () => {
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

      const result = await CalendarEventGenerationService.generateBirthdayEvents();

      expect(result).toHaveLength(2);
      expect(CalendarEvent.create).toHaveBeenCalledTimes(2);
      expect(CalendarEvent.create).toHaveBeenCalledWith(
        expect.objectContaining({
          title: '🎂 John Doe\'s Birthday',
          event_type: 'birthday',
          team_member_id: 'tm1',
          all_day: true,
          recurrence: {
            type: 'yearly',
            interval: 1
          }
        })
      );
    });

    it('should skip team members without birthdays', async () => {
      const mockTeamMembers = [
        {
          id: 'tm1',
          name: 'John Doe',
          birthday: '1990-05-15T00:00:00.000Z'
        },
        {
          id: 'tm2',
          name: 'Jane Smith'
          // No birthday field
        }
      ];

      TeamMember.list.mockResolvedValue(mockTeamMembers);
      CalendarEvent.getBirthdayEvents.mockResolvedValue([]);
      CalendarEvent.create.mockResolvedValue({ id: 'event1' });

      const result = await CalendarEventGenerationService.generateBirthdayEvents();

      expect(result).toHaveLength(1);
      expect(CalendarEvent.create).toHaveBeenCalledTimes(1);
    });

    it('should skip existing birthday events', async () => {
      const mockTeamMembers = [
        {
          id: 'tm1',
          name: 'John Doe',
          birthday: '1990-05-15T00:00:00.000Z'
        }
      ];

      const existingEvent = {
        id: 'existing1',
        team_member_id: 'tm1',
        start_date: '2024-05-15T00:00:00.000Z'
      };

      TeamMember.list.mockResolvedValue(mockTeamMembers);
      CalendarEvent.getBirthdayEvents.mockResolvedValue([existingEvent]);

      const result = await CalendarEventGenerationService.generateBirthdayEvents(null, 2024);

      expect(result).toHaveLength(0);
      expect(CalendarEvent.create).not.toHaveBeenCalled();
    });

    it('should handle invalid birthday dates gracefully', async () => {
      const mockTeamMembers = [
        {
          id: 'tm1',
          name: 'John Doe',
          birthday: 'invalid-date'
        }
      ];

      TeamMember.list.mockResolvedValue(mockTeamMembers);
      CalendarEvent.getBirthdayEvents.mockResolvedValue([]);

      const result = await CalendarEventGenerationService.generateBirthdayEvents();

      expect(result).toHaveLength(0);
      expect(CalendarEvent.create).not.toHaveBeenCalled();
    });
  });

  describe('convertDutyToCalendarEvent', () => {
    it('should convert duty to calendar event successfully', async () => {
      const mockDuty = {
        id: 'duty1',
        team_member_id: 'tm1',
        title: 'DevOps Duty',
        type: 'devops',
        start_date: '2024-01-01T00:00:00.000Z',
        end_date: '2024-01-07T23:59:59.999Z',
        description: 'Weekly DevOps duty'
      };

      const mockTeamMember = {
        id: 'tm1',
        name: 'John Doe'
      };

      const mockCreatedEvent = {
        id: 'event1',
        title: '⚙️ DevOps Duty - John Doe',
        event_type: 'duty'
      };

      TeamMember.get.mockResolvedValue(mockTeamMember);
      CalendarEvent.getByDutyId.mockResolvedValue([]);
      CalendarEvent.createDutyEvent.mockResolvedValue(mockCreatedEvent);

      const result = await CalendarEventGenerationService.convertDutyToCalendarEvent(mockDuty);

      expect(result).toEqual(mockCreatedEvent);
      expect(CalendarEvent.createDutyEvent).toHaveBeenCalledWith(
        'duty1',
        'tm1',
        '⚙️ DevOps Duty - John Doe',
        '2024-01-01T00:00:00.000Z',
        '2024-01-07T23:59:59.999Z',
        'Weekly DevOps duty'
      );
    });

    it('should return existing calendar event if already exists', async () => {
      const mockDuty = {
        id: 'duty1',
        team_member_id: 'tm1',
        title: 'DevOps Duty',
        type: 'devops',
        start_date: '2024-01-01T00:00:00.000Z',
        end_date: '2024-01-07T23:59:59.999Z'
      };

      const existingEvent = {
        id: 'existing1',
        title: '⚙️ DevOps Duty - John Doe'
      };

      CalendarEvent.getByDutyId.mockResolvedValue([existingEvent]);

      const result = await CalendarEventGenerationService.convertDutyToCalendarEvent(mockDuty);

      expect(result).toEqual(existingEvent);
      expect(CalendarEvent.createDutyEvent).not.toHaveBeenCalled();
    });

    it('should throw error for missing duty object', async () => {
      await expect(
        CalendarEventGenerationService.convertDutyToCalendarEvent(null)
      ).rejects.toThrow('Duty object is required');
    });

    it('should throw error for duty with missing required fields', async () => {
      const incompleteDuty = {
        id: 'duty1',
        title: 'DevOps Duty'
        // Missing team_member_id, start_date, end_date
      };

      await expect(
        CalendarEventGenerationService.convertDutyToCalendarEvent(incompleteDuty)
      ).rejects.toThrow('Duty object missing required fields');
    });

    it('should throw error when team member not found', async () => {
      const mockDuty = {
        id: 'duty1',
        team_member_id: 'nonexistent',
        title: 'DevOps Duty',
        type: 'devops',
        start_date: '2024-01-01T00:00:00.000Z',
        end_date: '2024-01-07T23:59:59.999Z'
      };

      TeamMember.get.mockResolvedValue(null);
      CalendarEvent.getByDutyId.mockResolvedValue([]);

      await expect(
        CalendarEventGenerationService.convertDutyToCalendarEvent(mockDuty)
      ).rejects.toThrow('Team member not found: nonexistent');
    });

    it('should use correct icons for different duty types', async () => {
      const dutyTypes = [
        { type: 'devops', expectedIcon: '⚙️' },
        { type: 'on_call', expectedIcon: '📞' },
        { type: 'other', expectedIcon: '🛡️' }
      ];

      const mockTeamMember = { id: 'tm1', name: 'John Doe' };
      TeamMember.get.mockResolvedValue(mockTeamMember);
      CalendarEvent.getByDutyId.mockResolvedValue([]);
      CalendarEvent.createDutyEvent.mockResolvedValue({ id: 'event1' });

      for (const { type, expectedIcon } of dutyTypes) {
        const mockDuty = {
          id: `duty-${type}`,
          team_member_id: 'tm1',
          title: 'Test Duty',
          type,
          start_date: '2024-01-01T00:00:00.000Z',
          end_date: '2024-01-07T23:59:59.999Z'
        };

        await CalendarEventGenerationService.convertDutyToCalendarEvent(mockDuty);

        expect(CalendarEvent.createDutyEvent).toHaveBeenCalledWith(
          expect.any(String),
          expect.any(String),
          expect.stringContaining(expectedIcon),
          expect.any(String),
          expect.any(String),
          expect.any(String)
        );
      }
    });
  });

  describe('convertOutOfOfficeToCalendarEvent', () => {
    it('should convert out-of-office to calendar event successfully', async () => {
      const mockOutOfOffice = {
        id: 'ooo1',
        team_member_id: 'tm1',
        type: 'vacation',
        start_date: '2024-01-01T00:00:00.000Z',
        end_date: '2024-01-05T23:59:59.999Z'
      };

      const mockTeamMember = {
        id: 'tm1',
        name: 'John Doe'
      };

      const mockCreatedEvent = {
        id: 'event1',
        title: 'John Doe - Out of Office (vacation)',
        event_type: 'out_of_office'
      };

      TeamMember.get.mockResolvedValue(mockTeamMember);
      CalendarEvent.getByOutOfOfficeId.mockResolvedValue([]);
      CalendarEvent.createOutOfOfficeEvent.mockResolvedValue(mockCreatedEvent);

      const result = await CalendarEventGenerationService.convertOutOfOfficeToCalendarEvent(mockOutOfOffice);

      expect(result).toEqual(mockCreatedEvent);
      expect(CalendarEvent.createOutOfOfficeEvent).toHaveBeenCalledWith(
        'ooo1',
        'tm1',
        'John Doe',
        '2024-01-01T00:00:00.000Z',
        '2024-01-05T23:59:59.999Z',
        'vacation'
      );
    });

    it('should return existing calendar event if already exists', async () => {
      const mockOutOfOffice = {
        id: 'ooo1',
        team_member_id: 'tm1',
        type: 'vacation',
        start_date: '2024-01-01T00:00:00.000Z',
        end_date: '2024-01-05T23:59:59.999Z'
      };

      const existingEvent = {
        id: 'existing1',
        title: 'John Doe - Out of Office (vacation)'
      };

      CalendarEvent.getByOutOfOfficeId.mockResolvedValue([existingEvent]);

      const result = await CalendarEventGenerationService.convertOutOfOfficeToCalendarEvent(mockOutOfOffice);

      expect(result).toEqual(existingEvent);
      expect(CalendarEvent.createOutOfOfficeEvent).not.toHaveBeenCalled();
    });

    it('should throw error for missing out-of-office object', async () => {
      await expect(
        CalendarEventGenerationService.convertOutOfOfficeToCalendarEvent(null)
      ).rejects.toThrow('OutOfOffice object is required');
    });

    it('should throw error for out-of-office with missing required fields', async () => {
      const incompleteOoo = {
        id: 'ooo1',
        type: 'vacation'
        // Missing team_member_id, start_date, end_date
      };

      await expect(
        CalendarEventGenerationService.convertOutOfOfficeToCalendarEvent(incompleteOoo)
      ).rejects.toThrow('OutOfOffice object missing required fields');
    });

    it('should throw error when team member not found', async () => {
      const mockOutOfOffice = {
        id: 'ooo1',
        team_member_id: 'nonexistent',
        type: 'vacation',
        start_date: '2024-01-01T00:00:00.000Z',
        end_date: '2024-01-05T23:59:59.999Z'
      };

      TeamMember.get.mockResolvedValue(null);
      CalendarEvent.getByOutOfOfficeId.mockResolvedValue([]);

      await expect(
        CalendarEventGenerationService.convertOutOfOfficeToCalendarEvent(mockOutOfOffice)
      ).rejects.toThrow('Team member not found: nonexistent');
    });
  });

  describe('generateDutyEvents', () => {
    it('should generate calendar events for all duties', async () => {
      const mockDuties = [
        {
          id: 'duty1',
          team_member_id: 'tm1',
          title: 'DevOps Duty',
          type: 'devops',
          start_date: '2024-01-01T00:00:00.000Z',
          end_date: '2024-01-07T23:59:59.999Z'
        },
        {
          id: 'duty2',
          team_member_id: 'tm2',
          title: 'On-Call Duty',
          type: 'on_call',
          start_date: '2024-01-08T00:00:00.000Z',
          end_date: '2024-01-14T23:59:59.999Z'
        }
      ];

      const mockTeamMember = { id: 'tm1', name: 'John Doe' };
      const mockEvent = { id: 'event1' };

      Duty.list.mockResolvedValue(mockDuties);
      TeamMember.get.mockResolvedValue(mockTeamMember);
      CalendarEvent.getByDutyId.mockResolvedValue([]);
      CalendarEvent.createDutyEvent.mockResolvedValue(mockEvent);

      const result = await CalendarEventGenerationService.generateDutyEvents();

      expect(result).toHaveLength(2);
      expect(CalendarEvent.createDutyEvent).toHaveBeenCalledTimes(2);
    });

    it('should handle errors for individual duties gracefully', async () => {
      const mockDuties = [
        {
          id: 'duty1',
          team_member_id: 'tm1',
          title: 'Valid Duty',
          type: 'devops',
          start_date: '2024-01-01T00:00:00.000Z',
          end_date: '2024-01-07T23:59:59.999Z'
        },
        {
          id: 'duty2',
          team_member_id: 'nonexistent',
          title: 'Invalid Duty',
          type: 'devops',
          start_date: '2024-01-08T00:00:00.000Z',
          end_date: '2024-01-14T23:59:59.999Z'
        }
      ];

      const mockTeamMember = { id: 'tm1', name: 'John Doe' };
      const mockEvent = { id: 'event1' };

      Duty.list.mockResolvedValue(mockDuties);
      TeamMember.get.mockImplementation((id) => {
        if (id === 'tm1') return Promise.resolve(mockTeamMember);
        return Promise.resolve(null);
      });
      CalendarEvent.getByDutyId.mockResolvedValue([]);
      CalendarEvent.createDutyEvent.mockResolvedValue(mockEvent);

      const result = await CalendarEventGenerationService.generateDutyEvents();

      // Should still return the successful event
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual(mockEvent);
    });
  });

  describe('generateOutOfOfficeEvents', () => {
    it('should generate calendar events for all out-of-office periods', async () => {
      const mockOutOfOfficeRecords = [
        {
          id: 'ooo1',
          team_member_id: 'tm1',
          type: 'vacation',
          start_date: '2024-01-01T00:00:00.000Z',
          end_date: '2024-01-05T23:59:59.999Z'
        },
        {
          id: 'ooo2',
          team_member_id: 'tm2',
          type: 'sick',
          start_date: '2024-01-08T00:00:00.000Z',
          end_date: '2024-01-10T23:59:59.999Z'
        }
      ];

      const mockTeamMember = { id: 'tm1', name: 'John Doe' };
      const mockEvent = { id: 'event1' };

      OutOfOffice.list.mockResolvedValue(mockOutOfOfficeRecords);
      TeamMember.get.mockResolvedValue(mockTeamMember);
      CalendarEvent.getByOutOfOfficeId.mockResolvedValue([]);
      CalendarEvent.createOutOfOfficeEvent.mockResolvedValue(mockEvent);

      const result = await CalendarEventGenerationService.generateOutOfOfficeEvents();

      expect(result).toHaveLength(2);
      expect(CalendarEvent.createOutOfOfficeEvent).toHaveBeenCalledTimes(2);
    });
  });

  describe('synchronizeAllEvents', () => {
    it('should synchronize all event types successfully', async () => {
      const mockTeamMembers = [
        { id: 'tm1', name: 'John Doe', birthday: '1990-05-15T00:00:00.000Z' }
      ];
      const mockDuties = [
        {
          id: 'duty1',
          team_member_id: 'tm1',
          title: 'DevOps Duty',
          type: 'devops',
          start_date: '2024-01-01T00:00:00.000Z',
          end_date: '2024-01-07T23:59:59.999Z'
        }
      ];
      const mockOutOfOffice = [
        {
          id: 'ooo1',
          team_member_id: 'tm1',
          type: 'vacation',
          start_date: '2024-01-01T00:00:00.000Z',
          end_date: '2024-01-05T23:59:59.999Z'
        }
      ];

      TeamMember.list.mockResolvedValue(mockTeamMembers);
      TeamMember.get.mockResolvedValue(mockTeamMembers[0]);
      Duty.list.mockResolvedValue(mockDuties);
      OutOfOffice.list.mockResolvedValue(mockOutOfOffice);
      CalendarEvent.getBirthdayEvents.mockResolvedValue([]);
      CalendarEvent.getByDutyId.mockResolvedValue([]);
      CalendarEvent.getByOutOfOfficeId.mockResolvedValue([]);
      CalendarEvent.create.mockResolvedValue({ id: 'birthday-event' });
      CalendarEvent.createDutyEvent.mockResolvedValue({ id: 'duty-event' });
      CalendarEvent.createOutOfOfficeEvent.mockResolvedValue({ id: 'ooo-event' });

      const result = await CalendarEventGenerationService.synchronizeAllEvents();

      expect(result.summary.totalCreated).toBe(5); // 3 birthday events (3 years) + 1 duty + 1 out-of-office
      expect(result.summary.totalErrors).toBe(0);
      expect(result.birthdayEvents).toBe(3); // Birthday events count for 3 years
      expect(result.dutyEvents).toHaveLength(1);
      expect(result.outOfOfficeEvents).toHaveLength(1);
    });

    it('should handle partial failures gracefully', async () => {
      TeamMember.list.mockRejectedValue(new Error('Database error'));
      Duty.list.mockResolvedValue([]);
      OutOfOffice.list.mockResolvedValue([]);

      const result = await CalendarEventGenerationService.synchronizeAllEvents();

      expect(result.summary.totalCreated).toBe(0);
      expect(result.summary.totalErrors).toBe(1);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].type).toBe('birthday_generation');
    });

    it('should respect synchronization options', async () => {
      const options = {
        includeBirthdays: false,
        includeDuties: true,
        includeOutOfOffice: false
      };

      Duty.list.mockResolvedValue([]);

      const result = await CalendarEventGenerationService.synchronizeAllEvents(options);

      expect(result.birthdayEvents).toHaveLength(0);
      expect(result.dutyEvents).toHaveLength(0);
      expect(result.outOfOfficeEvents).toHaveLength(0);
      expect(TeamMember.list).not.toHaveBeenCalled();
      expect(OutOfOffice.list).not.toHaveBeenCalled();
    });
  });

  describe('updateCalendarEventFromSource', () => {
    it('should update calendar event for duty source', async () => {
      const mockDuty = {
        id: 'duty1',
        team_member_id: 'tm1',
        title: 'Updated Duty',
        type: 'devops',
        start_date: '2024-01-01T00:00:00.000Z',
        end_date: '2024-01-07T23:59:59.999Z'
      };

      const existingEvent = { id: 'event1' };
      const updatedEvent = { id: 'event2', title: 'Updated Event' };

      CalendarEvent.getByDutyId.mockResolvedValue([existingEvent]);
      CalendarEvent.delete.mockResolvedValue(true);
      TeamMember.get.mockResolvedValue({ id: 'tm1', name: 'John Doe' });
      CalendarEvent.createDutyEvent.mockResolvedValue(updatedEvent);

      const result = await CalendarEventGenerationService.updateCalendarEventFromSource('duty', 'duty1', mockDuty);

      expect(result).toEqual(updatedEvent);
      expect(CalendarEvent.delete).toHaveBeenCalledWith('event1');
    });

    it('should throw error for unsupported source type', async () => {
      await expect(
        CalendarEventGenerationService.updateCalendarEventFromSource('invalid', 'id1', {})
      ).rejects.toThrow('Unsupported source type: invalid');
    });
  });

  describe('deleteCalendarEventsForSource', () => {
    it('should delete calendar events for duty source', async () => {
      const eventsToDelete = [
        { id: 'event1' },
        { id: 'event2' }
      ];

      CalendarEvent.getByDutyId.mockResolvedValue(eventsToDelete);
      CalendarEvent.delete.mockResolvedValue(true);

      const result = await CalendarEventGenerationService.deleteCalendarEventsForSource('duty', 'duty1');

      expect(result).toBe(true);
      expect(CalendarEvent.delete).toHaveBeenCalledTimes(2);
      expect(CalendarEvent.delete).toHaveBeenCalledWith('event1');
      expect(CalendarEvent.delete).toHaveBeenCalledWith('event2');
    });

    it('should delete all events for team member source', async () => {
      const allEvents = [
        { id: 'event1', team_member_id: 'tm1' },
        { id: 'event2', team_member_id: 'tm2' },
        { id: 'event3', team_member_id: 'tm1' }
      ];

      CalendarEvent.list.mockResolvedValue(allEvents);
      CalendarEvent.delete.mockResolvedValue(true);

      const result = await CalendarEventGenerationService.deleteCalendarEventsForSource('team_member', 'tm1');

      expect(result).toBe(true);
      expect(CalendarEvent.delete).toHaveBeenCalledTimes(2);
      expect(CalendarEvent.delete).toHaveBeenCalledWith('event1');
      expect(CalendarEvent.delete).toHaveBeenCalledWith('event3');
    });

    it('should handle deletion errors gracefully', async () => {
      const eventsToDelete = [{ id: 'event1' }];

      CalendarEvent.getByDutyId.mockResolvedValue(eventsToDelete);
      CalendarEvent.delete.mockRejectedValue(new Error('Deletion failed'));

      const result = await CalendarEventGenerationService.deleteCalendarEventsForSource('duty', 'duty1');

      expect(result).toBe(true); // Should still return true even if individual deletions fail
    });

    it('should throw error for unsupported source type', async () => {
      await expect(
        CalendarEventGenerationService.deleteCalendarEventsForSource('invalid', 'id1')
      ).rejects.toThrow('Unsupported source type: invalid');
    });
  });
});