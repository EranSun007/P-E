// src/utils/__tests__/calendarService.dateValidation.integration.test.js
// Integration tests for improved date validation in CalendarService methods

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CalendarService, ValidationError } from '../calendarService.js';

// Mock the entities
vi.mock('../../api/entities.js', () => ({
  CalendarEvent: {
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    list: vi.fn(),
    get: vi.fn()
  },
  OneOnOne: {
    update: vi.fn(),
    list: vi.fn()
  },
  TeamMember: {
    get: vi.fn(),
    list: vi.fn()
  }
}));

import { CalendarEvent, OneOnOne, TeamMember } from '../../api/entities.js';

describe('CalendarService - Date Validation Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('createOneOnOneMeeting with improved validation', () => {
    it('should create meeting with future date and detailed error messages', async () => {
      const futureDate = new Date();
      futureDate.setHours(futureDate.getHours() + 2); // 2 hours from now
      const futureDateISO = futureDate.toISOString();

      const mockEvent = {
        id: 'event-123',
        title: 'John Smith 1:1',
        start_date: futureDateISO,
        end_date: new Date(futureDate.getTime() + 30 * 60 * 1000).toISOString()
      };

      // Mock team member lookup
      TeamMember.get.mockResolvedValue({ id: 'team-123', name: 'John Smith' });
      CalendarEvent.create.mockResolvedValue(mockEvent);
      CalendarService.getOneOnOneMeetingsForTeamMember = vi.fn().mockResolvedValue([]);

      const result = await CalendarService.createOneOnOneMeeting(
        'team-123',
        'John Smith',
        futureDateISO
      );

      expect(result).toEqual(mockEvent);
      expect(CalendarEvent.create).toHaveBeenCalledWith({
        title: 'John Smith 1:1',
        description: '1:1 meeting with John Smith',
        start_date: futureDateISO,
        end_date: new Date(futureDate.getTime() + 30 * 60 * 1000).toISOString(),
        all_day: false,
        location: null,
        event_type: 'one_on_one',
        team_member_id: 'team-123',
        linked_entity_type: 'one_on_one',
        linked_entity_id: null
      });
    });

    it('should reject past dates with detailed error message', async () => {
      const pastDate = new Date();
      pastDate.setHours(pastDate.getHours() - 1); // 1 hour ago
      const pastDateISO = pastDate.toISOString();

      TeamMember.get.mockResolvedValue({ id: 'team-123', name: 'John Smith' });

      await expect(
        CalendarService.createOneOnOneMeeting('team-123', 'John Smith', pastDateISO)
      ).rejects.toThrow(ValidationError);

      try {
        await CalendarService.createOneOnOneMeeting('team-123', 'John Smith', pastDateISO);
      } catch (error) {
        expect(error.message).toContain('cannot be in the past');
        expect(error.message).toContain(pastDateISO);
        expect(error.message).toContain('current time:');
        expect(error.message).toContain('minutes ago');
      }
    });

    it('should provide detailed error for invalid date format', async () => {
      const invalidDate = 'not-a-valid-date';

      TeamMember.get.mockResolvedValue({ id: 'team-123', name: 'John Smith' });

      await expect(
        CalendarService.createOneOnOneMeeting('team-123', 'John Smith', invalidDate)
      ).rejects.toThrow(ValidationError);

      try {
        await CalendarService.createOneOnOneMeeting('team-123', 'John Smith', invalidDate);
      } catch (error) {
        expect(error.message).toContain('Invalid dateTime format');
        expect(error.message).toContain('Expected ISO string');
        expect(error.message).toContain(invalidDate);
      }
    });
  });

  describe('updateOneOnOneMeeting with improved validation', () => {
    it('should update meeting with future date', async () => {
      const futureDate = new Date();
      futureDate.setHours(futureDate.getHours() + 3); // 3 hours from now
      const futureDateISO = futureDate.toISOString();

      const mockExistingEvent = {
        id: 'event-123',
        event_type: 'one_on_one',
        team_member_id: 'team-123'
      };

      const mockUpdatedEvent = {
        id: 'event-123',
        start_date: futureDateISO,
        end_date: new Date(futureDate.getTime() + 30 * 60 * 1000).toISOString()
      };

      CalendarEvent.get.mockResolvedValue(mockExistingEvent);
      CalendarEvent.update.mockResolvedValue(mockUpdatedEvent);
      CalendarService.getOneOnOneMeetingsForTeamMember = vi.fn().mockResolvedValue([]);

      const result = await CalendarService.updateOneOnOneMeeting('event-123', futureDateISO);

      expect(result).toEqual(mockUpdatedEvent);
      expect(CalendarEvent.update).toHaveBeenCalledWith('event-123', {
        start_date: futureDateISO,
        end_date: new Date(futureDate.getTime() + 30 * 60 * 1000).toISOString()
      });
    });

    it('should reject past dates with detailed error message', async () => {
      const pastDate = new Date();
      pastDate.setMinutes(pastDate.getMinutes() - 10); // 10 minutes ago
      const pastDateISO = pastDate.toISOString();

      const mockExistingEvent = {
        id: 'event-123',
        event_type: 'one_on_one',
        team_member_id: 'team-123'
      };

      CalendarEvent.get.mockResolvedValue(mockExistingEvent);

      await expect(
        CalendarService.updateOneOnOneMeeting('event-123', pastDateISO)
      ).rejects.toThrow(ValidationError);

      try {
        await CalendarService.updateOneOnOneMeeting('event-123', pastDateISO);
      } catch (error) {
        expect(error.message).toContain('cannot be in the past');
        expect(error.message).toContain(pastDateISO);
        expect(error.message).toContain('current time:');
      }
    });
  });

  describe('Buffer time functionality', () => {
    it('should allow dates within the 5-minute buffer', async () => {
      const nearCurrentDate = new Date();
      nearCurrentDate.setMinutes(nearCurrentDate.getMinutes() - 2); // 2 minutes ago (within 5-minute buffer)
      const nearCurrentDateISO = nearCurrentDate.toISOString();

      const mockEvent = {
        id: 'event-123',
        title: 'John Smith 1:1',
        start_date: nearCurrentDateISO
      };

      TeamMember.get.mockResolvedValue({ id: 'team-123', name: 'John Smith' });
      CalendarEvent.create.mockResolvedValue(mockEvent);
      CalendarService.getOneOnOneMeetingsForTeamMember = vi.fn().mockResolvedValue([]);

      // Should not throw an error
      const result = await CalendarService.createOneOnOneMeeting(
        'team-123',
        'John Smith',
        nearCurrentDateISO
      );

      expect(result).toEqual(mockEvent);
    });

    it('should reject dates outside the 5-minute buffer', async () => {
      const pastDate = new Date();
      pastDate.setMinutes(pastDate.getMinutes() - 10); // 10 minutes ago (outside 5-minute buffer)
      const pastDateISO = pastDate.toISOString();

      TeamMember.get.mockResolvedValue({ id: 'team-123', name: 'John Smith' });

      await expect(
        CalendarService.createOneOnOneMeeting('team-123', 'John Smith', pastDateISO)
      ).rejects.toThrow(ValidationError);
    });
  });
});