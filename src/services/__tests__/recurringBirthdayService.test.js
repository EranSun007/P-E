// src/services/__tests__/recurringBirthdayService.test.js
// Tests for RecurringBirthdayService

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { RecurringBirthdayService } from '../recurringBirthdayService.js';
import { CalendarEvent, TeamMember } from '../../api/entities.js';

// Mock the entities
vi.mock('../../api/entities.js', () => ({
  CalendarEvent: {
    create: vi.fn(),
    delete: vi.fn(),
    getBirthdayEvents: vi.fn()
  },
  TeamMember: {
    get: vi.fn(),
    list: vi.fn()
  }
}));

describe('RecurringBirthdayService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('generateBirthdayEventsForYears', () => {
    const mockTeamMember = {
      id: 'tm1',
      name: 'John Doe',
      birthday: '1990-05-15T00:00:00.000Z'
    };

    it('should generate birthday events for multiple years', async () => {
      const mockCreatedEvent = {
        id: 'event1',
        title: '🎂 John Doe\'s Birthday',
        event_type: 'birthday'
      };

      CalendarEvent.getBirthdayEvents.mockResolvedValue([]);
      CalendarEvent.create.mockResolvedValue(mockCreatedEvent);

      const result = await RecurringBirthdayService.generateBirthdayEventsForYears(
        mockTeamMember, 
        2024, 
        2026
      );

      expect(result).toHaveLength(3);
      expect(CalendarEvent.create).toHaveBeenCalledTimes(3);
      
      // Verify the first call
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

    it('should skip existing birthday events', async () => {
      const existingEvent = {
        id: 'existing1',
        team_member_id: 'tm1',
        start_date: '2024-05-15T00:00:00.000Z'
      };

      CalendarEvent.getBirthdayEvents.mockResolvedValue([existingEvent]);

      const result = await RecurringBirthdayService.generateBirthdayEventsForYears(
        mockTeamMember, 
        2024, 
        2024
      );

      expect(result).toHaveLength(0);
      expect(CalendarEvent.create).not.toHaveBeenCalled();
    });

    it('should return empty array for team member without birthday', async () => {
      const memberWithoutBirthday = {
        id: 'tm2',
        name: 'Jane Smith'
        // No birthday field
      };

      const result = await RecurringBirthdayService.generateBirthdayEventsForYears(
        memberWithoutBirthday, 
        2024, 
        2024
      );

      expect(result).toHaveLength(0);
      expect(CalendarEvent.create).not.toHaveBeenCalled();
    });

    it('should throw error for missing team member', async () => {
      await expect(
        RecurringBirthdayService.generateBirthdayEventsForYears(null, 2024, 2024)
      ).rejects.toThrow('Team member object is required');
    });

    it('should throw error for team member without required fields', async () => {
      const incompleteTeamMember = {
        name: 'John Doe'
        // Missing id field
      };

      await expect(
        RecurringBirthdayService.generateBirthdayEventsForYears(incompleteTeamMember, 2024, 2024)
      ).rejects.toThrow('Team member must have id and name fields');
    });

    it('should throw error for invalid year range', async () => {
      await expect(
        RecurringBirthdayService.generateBirthdayEventsForYears(mockTeamMember, 2025, 2024)
      ).rejects.toThrow('Start year must be less than or equal to end year');
    });

    it('should throw error for invalid birthday date', async () => {
      const memberWithInvalidBirthday = {
        id: 'tm1',
        name: 'John Doe',
        birthday: 'invalid-date'
      };

      await expect(
        RecurringBirthdayService.generateBirthdayEventsForYears(memberWithInvalidBirthday, 2024, 2024)
      ).rejects.toThrow('Invalid birthday date for team member John Doe: invalid-date');
    });

    it('should handle individual year failures gracefully', async () => {
      CalendarEvent.getBirthdayEvents.mockResolvedValue([]);
      CalendarEvent.create
        .mockResolvedValueOnce({ id: 'event1' })
        .mockRejectedValueOnce(new Error('Creation failed'))
        .mockResolvedValueOnce({ id: 'event3' });

      const result = await RecurringBirthdayService.generateBirthdayEventsForYears(
        mockTeamMember, 
        2024, 
        2026
      );

      // Should return successful events even if some fail
      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('event1');
      expect(result[1].id).toBe('event3');
    });
  });

  describe('updateBirthdayEventsForTeamMember', () => {
    const mockTeamMember = {
      id: 'tm1',
      name: 'John Doe',
      birthday: '1990-05-15T00:00:00.000Z'
    };

    it('should update birthday events with new date', async () => {
      const currentYear = new Date().getFullYear();
      const existingEvents = [
        {
          id: 'event1',
          team_member_id: 'tm1',
          start_date: `${currentYear}-05-15T00:00:00.000Z`
        },
        {
          id: 'event2',
          team_member_id: 'tm1',
          start_date: `${currentYear + 1}-05-15T00:00:00.000Z`
        }
      ];

      const mockCreatedEvent = {
        id: 'new-event',
        title: '🎂 John Doe\'s Birthday'
      };

      TeamMember.get.mockResolvedValue(mockTeamMember);
      CalendarEvent.getBirthdayEvents
        .mockResolvedValueOnce(existingEvents) // First call for deletion
        .mockResolvedValue([]); // Subsequent calls for creation (no existing events)
      CalendarEvent.delete.mockResolvedValue(true);
      CalendarEvent.create.mockResolvedValue(mockCreatedEvent);

      await RecurringBirthdayService.updateBirthdayEventsForTeamMember(
        'tm1', 
        '1990-06-20T00:00:00.000Z'
      );

      // Should delete existing future events
      expect(CalendarEvent.delete).toHaveBeenCalledTimes(2);
      expect(CalendarEvent.delete).toHaveBeenCalledWith('event1');
      expect(CalendarEvent.delete).toHaveBeenCalledWith('event2');

      // Should create new events for current + next 2 years
      expect(CalendarEvent.create).toHaveBeenCalledTimes(3);
    });

    it('should throw error for missing team member ID', async () => {
      await expect(
        RecurringBirthdayService.updateBirthdayEventsForTeamMember(null, '1990-06-20T00:00:00.000Z')
      ).rejects.toThrow('Team member ID is required');
    });

    it('should throw error for missing birthday date', async () => {
      await expect(
        RecurringBirthdayService.updateBirthdayEventsForTeamMember('tm1', null)
      ).rejects.toThrow('New birthday date is required');
    });

    it('should throw error for invalid birthday date', async () => {
      await expect(
        RecurringBirthdayService.updateBirthdayEventsForTeamMember('tm1', 'invalid-date')
      ).rejects.toThrow('Invalid birthday date: invalid-date');
    });

    it('should throw error for non-existent team member', async () => {
      TeamMember.get.mockResolvedValue(null);

      await expect(
        RecurringBirthdayService.updateBirthdayEventsForTeamMember('nonexistent', '1990-06-20T00:00:00.000Z')
      ).rejects.toThrow('Team member not found: nonexistent');
    });

    it('should handle deletion errors gracefully', async () => {
      const existingEvents = [
        {
          id: 'event1',
          team_member_id: 'tm1',
          start_date: '2024-05-15T00:00:00.000Z'
        }
      ];

      TeamMember.get.mockResolvedValue(mockTeamMember);
      CalendarEvent.getBirthdayEvents.mockResolvedValue(existingEvents);
      CalendarEvent.delete.mockRejectedValue(new Error('Deletion failed'));
      CalendarEvent.create.mockResolvedValue({ id: 'new-event' });

      // Should not throw error even if deletion fails
      await expect(
        RecurringBirthdayService.updateBirthdayEventsForTeamMember('tm1', '1990-06-20T00:00:00.000Z')
      ).resolves.not.toThrow();

      // Should still attempt to create new events
      expect(CalendarEvent.create).toHaveBeenCalled();
    });
  });

  describe('deleteBirthdayEventsForTeamMember', () => {
    it('should delete all birthday events for team member', async () => {
      const birthdayEvents = [
        {
          id: 'event1',
          team_member_id: 'tm1',
          start_date: '2024-05-15T00:00:00.000Z'
        },
        {
          id: 'event2',
          team_member_id: 'tm1',
          start_date: '2025-05-15T00:00:00.000Z'
        },
        {
          id: 'event3',
          team_member_id: 'tm2',
          start_date: '2024-06-20T00:00:00.000Z'
        }
      ];

      CalendarEvent.getBirthdayEvents.mockResolvedValue(birthdayEvents);
      CalendarEvent.delete.mockResolvedValue(true);

      await RecurringBirthdayService.deleteBirthdayEventsForTeamMember('tm1');

      // Should only delete events for tm1
      expect(CalendarEvent.delete).toHaveBeenCalledTimes(2);
      expect(CalendarEvent.delete).toHaveBeenCalledWith('event1');
      expect(CalendarEvent.delete).toHaveBeenCalledWith('event2');
      expect(CalendarEvent.delete).not.toHaveBeenCalledWith('event3');
    });

    it('should throw error for missing team member ID', async () => {
      await expect(
        RecurringBirthdayService.deleteBirthdayEventsForTeamMember(null)
      ).rejects.toThrow('Team member ID is required');
    });

    it('should handle no events found gracefully', async () => {
      CalendarEvent.getBirthdayEvents.mockResolvedValue([]);

      await expect(
        RecurringBirthdayService.deleteBirthdayEventsForTeamMember('tm1')
      ).resolves.not.toThrow();

      expect(CalendarEvent.delete).not.toHaveBeenCalled();
    });

    it('should handle individual deletion failures gracefully', async () => {
      const birthdayEvents = [
        {
          id: 'event1',
          team_member_id: 'tm1',
          start_date: '2024-05-15T00:00:00.000Z'
        },
        {
          id: 'event2',
          team_member_id: 'tm1',
          start_date: '2025-05-15T00:00:00.000Z'
        }
      ];

      CalendarEvent.getBirthdayEvents.mockResolvedValue(birthdayEvents);
      CalendarEvent.delete
        .mockResolvedValueOnce(true)
        .mockRejectedValueOnce(new Error('Deletion failed'));

      // Should not throw error even if some deletions fail
      await expect(
        RecurringBirthdayService.deleteBirthdayEventsForTeamMember('tm1')
      ).resolves.not.toThrow();

      expect(CalendarEvent.delete).toHaveBeenCalledTimes(2);
    });
  });

  describe('ensureBirthdayEventsExist', () => {
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
      },
      {
        id: 'tm3',
        name: 'Bob Wilson'
        // No birthday
      }
    ];

    it('should ensure birthday events exist for all team members with birthdays', async () => {
      const mockCreatedEvent = {
        id: 'event1',
        title: '🎂 John Doe\'s Birthday'
      };

      TeamMember.list.mockResolvedValue(mockTeamMembers);
      CalendarEvent.getBirthdayEvents.mockResolvedValue([]);
      CalendarEvent.create.mockResolvedValue(mockCreatedEvent);

      const result = await RecurringBirthdayService.ensureBirthdayEventsExist();

      expect(result.summary.totalTeamMembers).toBe(3);
      expect(result.summary.membersWithBirthdays).toBe(2);
      expect(result.summary.membersWithoutBirthdays).toBe(1);
      expect(result.summary.eventsCreated).toBe(6); // 2 members × 3 years
      expect(result.summary.errorsEncountered).toBe(0);
    });

    it('should use provided team members and target years', async () => {
      const providedMembers = [mockTeamMembers[0]]; // Only John Doe
      const targetYears = [2024, 2025];

      CalendarEvent.getBirthdayEvents.mockResolvedValue([]);
      CalendarEvent.create.mockResolvedValue({ id: 'event1' });

      const result = await RecurringBirthdayService.ensureBirthdayEventsExist(
        providedMembers, 
        targetYears
      );

      expect(result.summary.totalTeamMembers).toBe(1);
      expect(result.summary.eventsCreated).toBe(2); // 1 member × 2 years
      expect(result.summary.targetYears).toEqual([2024, 2025]);
    });

    it('should handle individual member errors gracefully', async () => {
      const membersWithInvalidBirthday = [
        {
          id: 'tm1',
          name: 'John Doe',
          birthday: '1990-05-15T00:00:00.000Z'
        },
        {
          id: 'tm2',
          name: 'Jane Smith',
          birthday: 'invalid-date'
        }
      ];

      CalendarEvent.getBirthdayEvents.mockResolvedValue([]);
      CalendarEvent.create.mockResolvedValue({ id: 'event1' });

      const result = await RecurringBirthdayService.ensureBirthdayEventsExist(
        membersWithInvalidBirthday, 
        [2024]
      );

      expect(result.summary.eventsCreated).toBe(1); // Only John Doe's event
      expect(result.summary.errorsEncountered).toBe(1); // Jane Smith's error
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].teamMemberName).toBe('Jane Smith');
    });

    it('should use default target years when not provided', async () => {
      const currentYear = new Date().getFullYear();
      const expectedYears = [currentYear, currentYear + 1, currentYear + 2];

      TeamMember.list.mockResolvedValue([mockTeamMembers[0]]);
      CalendarEvent.getBirthdayEvents.mockResolvedValue([]);
      CalendarEvent.create.mockResolvedValue({ id: 'event1' });

      const result = await RecurringBirthdayService.ensureBirthdayEventsExist();

      expect(result.summary.targetYears).toEqual(expectedYears);
    });
  });

  describe('getBirthdayEventsForTeamMember', () => {
    it('should return birthday events for specific team member', async () => {
      const allBirthdayEvents = [
        {
          id: 'event1',
          team_member_id: 'tm1',
          start_date: '2024-05-15T00:00:00.000Z'
        },
        {
          id: 'event2',
          team_member_id: 'tm2',
          start_date: '2024-06-20T00:00:00.000Z'
        },
        {
          id: 'event3',
          team_member_id: 'tm1',
          start_date: '2025-05-15T00:00:00.000Z'
        }
      ];

      CalendarEvent.getBirthdayEvents.mockResolvedValue(allBirthdayEvents);

      const result = await RecurringBirthdayService.getBirthdayEventsForTeamMember('tm1');

      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('event1');
      expect(result[1].id).toBe('event3');
    });

    it('should throw error for missing team member ID', async () => {
      await expect(
        RecurringBirthdayService.getBirthdayEventsForTeamMember(null)
      ).rejects.toThrow('Team member ID is required');
    });

    it('should return empty array when no events found', async () => {
      CalendarEvent.getBirthdayEvents.mockResolvedValue([]);

      const result = await RecurringBirthdayService.getBirthdayEventsForTeamMember('tm1');

      expect(result).toHaveLength(0);
    });
  });

  describe('removeDuplicateBirthdayEvents', () => {
    it('should remove duplicate birthday events', async () => {
      const birthdayEvents = [
        {
          id: 'event1',
          team_member_id: 'tm1',
          start_date: '2024-05-15T00:00:00.000Z'
        },
        {
          id: 'event2',
          team_member_id: 'tm1',
          start_date: '2024-05-15T00:00:00.000Z' // Duplicate
        },
        {
          id: 'event3',
          team_member_id: 'tm1',
          start_date: '2025-05-15T00:00:00.000Z'
        },
        {
          id: 'event4',
          team_member_id: 'tm2',
          start_date: '2024-06-20T00:00:00.000Z'
        }
      ];

      CalendarEvent.getBirthdayEvents.mockResolvedValue(birthdayEvents);
      CalendarEvent.delete.mockResolvedValue(true);

      const result = await RecurringBirthdayService.removeDuplicateBirthdayEvents();

      expect(result.duplicatesFound).toBe(1);
      expect(result.duplicatesRemoved).toBe(1);
      expect(CalendarEvent.delete).toHaveBeenCalledTimes(1);
      expect(CalendarEvent.delete).toHaveBeenCalledWith('event2'); // Should delete the second duplicate
    });

    it('should handle no duplicates found', async () => {
      const birthdayEvents = [
        {
          id: 'event1',
          team_member_id: 'tm1',
          start_date: '2024-05-15T00:00:00.000Z'
        },
        {
          id: 'event2',
          team_member_id: 'tm1',
          start_date: '2025-05-15T00:00:00.000Z'
        }
      ];

      CalendarEvent.getBirthdayEvents.mockResolvedValue(birthdayEvents);

      const result = await RecurringBirthdayService.removeDuplicateBirthdayEvents();

      expect(result.duplicatesFound).toBe(0);
      expect(result.duplicatesRemoved).toBe(0);
      expect(CalendarEvent.delete).not.toHaveBeenCalled();
    });

    it('should handle deletion errors gracefully', async () => {
      const birthdayEvents = [
        {
          id: 'event1',
          team_member_id: 'tm1',
          start_date: '2024-05-15T00:00:00.000Z'
        },
        {
          id: 'event2',
          team_member_id: 'tm1',
          start_date: '2024-05-15T00:00:00.000Z' // Duplicate
        }
      ];

      CalendarEvent.getBirthdayEvents.mockResolvedValue(birthdayEvents);
      CalendarEvent.delete.mockRejectedValue(new Error('Deletion failed'));

      const result = await RecurringBirthdayService.removeDuplicateBirthdayEvents();

      expect(result.duplicatesFound).toBe(1);
      expect(result.duplicatesRemoved).toBe(0);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].eventId).toBe('event2');
    });

    it('should handle multiple duplicates for same member-year', async () => {
      const birthdayEvents = [
        {
          id: 'event1',
          team_member_id: 'tm1',
          start_date: '2024-05-15T00:00:00.000Z'
        },
        {
          id: 'event2',
          team_member_id: 'tm1',
          start_date: '2024-05-15T00:00:00.000Z' // Duplicate 1
        },
        {
          id: 'event3',
          team_member_id: 'tm1',
          start_date: '2024-05-15T00:00:00.000Z' // Duplicate 2
        }
      ];

      CalendarEvent.getBirthdayEvents.mockResolvedValue(birthdayEvents);
      CalendarEvent.delete.mockResolvedValue(true);

      const result = await RecurringBirthdayService.removeDuplicateBirthdayEvents();

      expect(result.duplicatesFound).toBe(2);
      expect(result.duplicatesRemoved).toBe(2);
      expect(CalendarEvent.delete).toHaveBeenCalledTimes(2);
      expect(CalendarEvent.delete).toHaveBeenCalledWith('event2');
      expect(CalendarEvent.delete).toHaveBeenCalledWith('event3');
    });
  });
});