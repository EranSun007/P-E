// src/utils/__tests__/calendarService.test.js
// Tests for CalendarService utility

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CalendarService } from '../calendarService.js';

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
    get: vi.fn()
  }
}));

import { CalendarEvent, OneOnOne, TeamMember } from '../../api/entities.js';

describe('CalendarService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('generateOneOnOneTitle', () => {
    it('should generate proper title format', () => {
      const title = CalendarService.generateOneOnOneTitle('John Smith');
      expect(title).toBe('John Smith 1:1');
    });

    it('should throw error for missing team member name', () => {
      expect(() => CalendarService.generateOneOnOneTitle('')).toThrow('Team member name is required');
    });
  });

  describe('createOneOnOneMeeting', () => {
    it('should create calendar event with proper format', async () => {
      const mockEvent = {
        id: 'event-123',
        title: 'John Smith 1:1',
        start_date: '2024-01-15T10:00:00.000Z',
        end_date: '2024-01-15T10:30:00.000Z'
      };

      CalendarEvent.create.mockResolvedValue(mockEvent);

      const result = await CalendarService.createOneOnOneMeeting(
        'team-123',
        'John Smith',
        '2024-01-15T10:00:00.000Z'
      );

      expect(CalendarEvent.create).toHaveBeenCalledWith({
        title: 'John Smith 1:1',
        description: '1:1 meeting with John Smith',
        start_date: '2024-01-15T10:00:00.000Z',
        end_date: '2024-01-15T10:30:00.000Z',
        all_day: false,
        location: null,
        event_type: 'one_on_one',
        team_member_id: 'team-123',
        linked_entity_type: 'one_on_one',
        linked_entity_id: null
      });

      expect(result).toEqual(mockEvent);
    });

    it('should handle custom duration', async () => {
      const mockEvent = {
        id: 'event-123',
        title: 'John Smith 1:1',
        start_date: '2024-01-15T10:00:00.000Z',
        end_date: '2024-01-15T11:00:00.000Z'
      };

      CalendarEvent.create.mockResolvedValue(mockEvent);

      await CalendarService.createOneOnOneMeeting(
        'team-123',
        'John Smith',
        '2024-01-15T10:00:00.000Z',
        60 // 60 minutes
      );

      expect(CalendarEvent.create).toHaveBeenCalledWith(
        expect.objectContaining({
          end_date: '2024-01-15T11:00:00.000Z'
        })
      );
    });

    it('should throw error for missing required parameters', async () => {
      await expect(CalendarService.createOneOnOneMeeting('', 'John', '2024-01-15T10:00:00.000Z'))
        .rejects.toThrow('Team member ID, name, and date/time are required');
    });

    it('should throw error for invalid date format', async () => {
      await expect(CalendarService.createOneOnOneMeeting('team-123', 'John', 'invalid-date'))
        .rejects.toThrow('Invalid date/time format');
    });
  });

  describe('updateOneOnOneMeeting', () => {
    it('should update calendar event with new date/time', async () => {
      const mockUpdatedEvent = {
        id: 'event-123',
        start_date: '2024-01-16T14:00:00.000Z',
        end_date: '2024-01-16T14:30:00.000Z'
      };

      CalendarEvent.update.mockResolvedValue(mockUpdatedEvent);

      const result = await CalendarService.updateOneOnOneMeeting(
        'event-123',
        '2024-01-16T14:00:00.000Z'
      );

      expect(CalendarEvent.update).toHaveBeenCalledWith('event-123', {
        start_date: '2024-01-16T14:00:00.000Z',
        end_date: '2024-01-16T14:30:00.000Z'
      });

      expect(result).toEqual(mockUpdatedEvent);
    });
  });

  describe('deleteOneOnOneMeeting', () => {
    it('should delete calendar event', async () => {
      CalendarEvent.delete.mockResolvedValue(true);

      const result = await CalendarService.deleteOneOnOneMeeting('event-123');

      expect(CalendarEvent.delete).toHaveBeenCalledWith('event-123');
      expect(result).toBe(true);
    });
  });

  describe('getOneOnOneMeetings', () => {
    it('should filter and return only 1:1 meeting events', async () => {
      const mockEvents = [
        { id: '1', event_type: 'one_on_one', title: 'John 1:1' },
        { id: '2', event_type: 'meeting', title: 'Team Meeting' },
        { id: '3', event_type: 'one_on_one', title: 'Jane 1:1' }
      ];

      CalendarEvent.list.mockResolvedValue(mockEvents);

      const result = await CalendarService.getOneOnOneMeetings();

      expect(result).toHaveLength(2);
      expect(result[0].event_type).toBe('one_on_one');
      expect(result[1].event_type).toBe('one_on_one');
    });
  });

  describe('linkMeetingToCalendarEvent', () => {
    it('should link OneOnOne record to CalendarEvent', async () => {
      const mockUpdatedOneOnOne = {
        id: 'oneonone-123',
        next_meeting_calendar_event_id: 'event-123'
      };

      OneOnOne.update.mockResolvedValue(mockUpdatedOneOnOne);
      CalendarEvent.update.mockResolvedValue({});

      const result = await CalendarService.linkMeetingToCalendarEvent('oneonone-123', 'event-123');

      expect(OneOnOne.update).toHaveBeenCalledWith('oneonone-123', {
        next_meeting_calendar_event_id: 'event-123'
      });

      expect(CalendarEvent.update).toHaveBeenCalledWith('event-123', {
        linked_entity_id: 'oneonone-123'
      });

      expect(result).toEqual(mockUpdatedOneOnOne);
    });
  });

  describe('createAndLinkOneOnOneMeeting', () => {
    it('should create calendar event and link to OneOnOne record', async () => {
      const mockTeamMember = { id: 'team-123', name: 'John Smith' };
      const mockCalendarEvent = { id: 'event-123', title: 'John Smith 1:1' };
      const mockUpdatedOneOnOne = { id: 'oneonone-123', next_meeting_calendar_event_id: 'event-123' };

      TeamMember.get.mockResolvedValue(mockTeamMember);
      CalendarEvent.create.mockResolvedValue(mockCalendarEvent);
      OneOnOne.update.mockResolvedValue(mockUpdatedOneOnOne);
      CalendarEvent.update.mockResolvedValue({});

      const result = await CalendarService.createAndLinkOneOnOneMeeting(
        'oneonone-123',
        'team-123',
        '2024-01-15T10:00:00.000Z'
      );

      expect(TeamMember.get).toHaveBeenCalledWith('team-123');
      expect(CalendarEvent.create).toHaveBeenCalled();
      expect(result.calendarEvent).toEqual(mockCalendarEvent);
      expect(result.oneOnOne).toEqual(mockUpdatedOneOnOne);
    });

    it('should throw error if team member not found', async () => {
      TeamMember.get.mockResolvedValue(null);

      await expect(CalendarService.createAndLinkOneOnOneMeeting('oneonone-123', 'team-123', '2024-01-15T10:00:00.000Z'))
        .rejects.toThrow('Team member not found');
    });
  });

  describe('getOneOnOneMeetingsForTeamMember', () => {
    it('should return calendar events for specific team member', async () => {
      const mockEvents = [
        { id: '1', event_type: 'one_on_one', team_member_id: 'team-123' },
        { id: '2', event_type: 'one_on_one', team_member_id: 'team-456' },
        { id: '3', event_type: 'meeting', team_member_id: 'team-123' }
      ];

      CalendarEvent.list.mockResolvedValue(mockEvents);

      const result = await CalendarService.getOneOnOneMeetingsForTeamMember('team-123');

      expect(result).toHaveLength(1);
      expect(result[0].team_member_id).toBe('team-123');
      expect(result[0].event_type).toBe('one_on_one');
    });
  });
});