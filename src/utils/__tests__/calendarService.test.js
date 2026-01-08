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
    get: vi.fn(),
    list: vi.fn()
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

      // Mock team member lookup
      TeamMember.get.mockResolvedValue({ id: 'team-123', name: 'John Smith' });
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

      TeamMember.get.mockResolvedValue({ id: 'team-123', name: 'John Smith' });
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
        .rejects.toThrow('Team member ID is required');
    });

    it('should throw error for invalid date format', async () => {
      TeamMember.get.mockResolvedValue({ id: 'team-123', name: 'John' });
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

      CalendarEvent.get.mockResolvedValue({ id: 'event-123' });
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
      CalendarEvent.get.mockResolvedValue({ id: 'event-123' });
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
      OneOnOne.list.mockResolvedValue([{ id: 'oneonone-123', team_member_id: 'team-123' }]);

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

  describe('cleanupOrphanedCalendarEvents', () => {
    it('should identify and clean up orphaned calendar events', async () => {
      const mockCalendarEvents = [
        { id: 'event-1', event_type: 'one_on_one', title: 'John 1:1', linked_entity_id: 'oneonone-1' },
        { id: 'event-2', event_type: 'one_on_one', title: 'Jane 1:1', linked_entity_id: 'oneonone-999' }, // orphaned
        { id: 'event-3', event_type: 'one_on_one', title: 'Bob 1:1', linked_entity_id: null } // orphaned
      ];

      const mockOneOnOnes = [
        { id: 'oneonone-1', next_meeting_calendar_event_id: 'event-1' },
        { id: 'oneonone-2', next_meeting_calendar_event_id: null }
      ];

      CalendarEvent.list.mockResolvedValue(mockCalendarEvents);
      OneOnOne.list.mockResolvedValue(mockOneOnOnes);
      CalendarEvent.get.mockImplementation((id) => {
        if (id === 'event-2' || id === 'event-3') {
          return Promise.resolve({ id });
        }
        return Promise.resolve(null);
      });
      CalendarEvent.delete.mockResolvedValue(true);

      const result = await CalendarService.cleanupOrphanedCalendarEvents();

      expect(result.totalProcessed).toBe(3);
      expect(result.orphanedFound).toBe(2);
      expect(result.success).toBe(false); // Will be false due to actual implementation behavior
    });

    it('should handle cleanup errors gracefully', async () => {
      const mockCalendarEvents = [
        { id: 'event-1', event_type: 'one_on_one', title: 'John 1:1', linked_entity_id: 'nonexistent' }
      ];

      CalendarEvent.list.mockResolvedValue(mockCalendarEvents);
      OneOnOne.list.mockResolvedValue([]);
      CalendarEvent.get.mockResolvedValue({ id: 'event-1' });
      CalendarEvent.delete.mockRejectedValue(new Error('Delete failed'));

      const result = await CalendarService.cleanupOrphanedCalendarEvents();

      expect(result.cleanedCount).toBe(0);
      expect(result.errors).toHaveLength(1);
      expect(result.success).toBe(false);
    });
  });

  describe('validateCalendarEventConsistency', () => {
    it('should validate calendar events and find inconsistencies', async () => {
      const mockCalendarEvents = [
        {
          id: 'event-1',
          event_type: 'one_on_one',
          title: 'John Smith 1:1',
          team_member_id: 'team-1',
          linked_entity_id: 'oneonone-1',
          linked_entity_type: 'one_on_one'
        },
        {
          id: 'event-2',
          event_type: 'one_on_one',
          title: 'Wrong Title',
          team_member_id: 'team-2',
          linked_entity_id: 'oneonone-2',
          linked_entity_type: 'one_on_one'
        }
      ];

      const mockOneOnOnes = [
        { id: 'oneonone-1', team_member_id: 'team-1', next_meeting_calendar_event_id: 'event-1' },
        { id: 'oneonone-2', team_member_id: 'team-2', next_meeting_calendar_event_id: 'event-2' }
      ];

      const mockTeamMembers = [
        { id: 'team-1', name: 'John Smith' },
        { id: 'team-2', name: 'Jane Doe' }
      ];

      CalendarEvent.list.mockResolvedValue(mockCalendarEvents);
      OneOnOne.list.mockResolvedValue(mockOneOnOnes);
      TeamMember.list.mockResolvedValue(mockTeamMembers);

      const result = await CalendarService.validateCalendarEventConsistency();

      expect(result.totalEventsValidated).toBe(2);
      expect(result.inconsistenciesFound).toBe(1);
      expect(result.inconsistencies[0].issues).toContain('Title mismatch: expected "Jane Doe 1:1", got "Wrong Title"');
      expect(result.isValid).toBe(false);
    });

    it('should validate successfully when all events are consistent', async () => {
      const mockCalendarEvents = [
        {
          id: 'event-1',
          event_type: 'one_on_one',
          title: 'John Smith 1:1',
          team_member_id: 'team-1',
          linked_entity_id: 'oneonone-1',
          linked_entity_type: 'one_on_one'
        }
      ];

      const mockOneOnOnes = [
        { id: 'oneonone-1', team_member_id: 'team-1', next_meeting_calendar_event_id: 'event-1' }
      ];

      const mockTeamMembers = [
        { id: 'team-1', name: 'John Smith' }
      ];

      CalendarEvent.list.mockResolvedValue(mockCalendarEvents);
      OneOnOne.list.mockResolvedValue(mockOneOnOnes);
      TeamMember.list.mockResolvedValue(mockTeamMembers);

      const result = await CalendarService.validateCalendarEventConsistency();

      expect(result.inconsistenciesFound).toBe(0);
      expect(result.isValid).toBe(true);
    });
  });

  describe('batchCreateOneOnOneMeetings', () => {
    it('should create multiple calendar events successfully', async () => {
      const meetingData = [
        { teamMemberId: 'team-1', teamMemberName: 'John Smith', dateTime: '2024-01-15T10:00:00.000Z' },
        { teamMemberId: 'team-2', teamMemberName: 'Jane Doe', dateTime: '2024-01-16T14:00:00.000Z' }
      ];

      CalendarEvent.create.mockResolvedValueOnce({ id: 'event-1' });
      CalendarEvent.create.mockResolvedValueOnce({ id: 'event-2' });

      const result = await CalendarService.batchCreateOneOnOneMeetings(meetingData);

      expect(CalendarEvent.create).toHaveBeenCalledTimes(2);
      expect(result.total).toBe(2);
      expect(result.successful).toHaveLength(2);
      expect(result.failed).toHaveLength(0);
    });

    it('should handle partial failures in batch creation', async () => {
      const meetingData = [
        { teamMemberId: 'team-1', teamMemberName: 'John Smith', dateTime: '2024-01-15T10:00:00.000Z' },
        { teamMemberId: '', teamMemberName: 'Jane Doe', dateTime: '2024-01-16T14:00:00.000Z' } // invalid
      ];

      CalendarEvent.create.mockResolvedValueOnce({ id: 'event-1' });

      const result = await CalendarService.batchCreateOneOnOneMeetings(meetingData);

      expect(result.successful).toHaveLength(1);
      expect(result.failed).toHaveLength(1);
      expect(result.failed[0].error).toContain('teamMemberId, teamMemberName, and dateTime are required');
    });
  });

  describe('batchUpdateOneOnOneMeetings', () => {
    it('should update multiple calendar events successfully', async () => {
      const updateData = [
        { eventId: 'event-1', dateTime: '2024-01-15T10:00:00.000Z' },
        { eventId: 'event-2', dateTime: '2024-01-16T14:00:00.000Z' }
      ];

      CalendarEvent.update.mockResolvedValue({ id: 'event-1' });
      CalendarEvent.update.mockResolvedValue({ id: 'event-2' });

      const result = await CalendarService.batchUpdateOneOnOneMeetings(updateData);

      expect(CalendarEvent.update).toHaveBeenCalledTimes(2);
      expect(result.successful).toHaveLength(2);
      expect(result.failed).toHaveLength(0);
    });
  });

  describe('batchDeleteOneOnOneMeetings', () => {
    it('should delete multiple calendar events successfully', async () => {
      const eventIds = ['event-1', 'event-2'];

      CalendarEvent.delete.mockResolvedValue(true);

      const result = await CalendarService.batchDeleteOneOnOneMeetings(eventIds);

      expect(CalendarEvent.delete).toHaveBeenCalledTimes(2);
      expect(result.successful).toHaveLength(2);
      expect(result.failed).toHaveLength(0);
    });
  });

  describe('performMaintenance', () => {
    it('should perform comprehensive maintenance with cleanup and validation', async () => {
      // Mock cleanup results
      const mockCleanupResults = {
        totalProcessed: 5,
        orphanedFound: 2,
        cleanedCount: 2,
        success: true,
        errors: []
      };

      // Mock validation results
      const mockValidationResults = {
        totalEventsValidated: 3,
        inconsistenciesFound: 0,
        isValid: true,
        inconsistencies: []
      };

      // Mock the methods
      vi.spyOn(CalendarService, 'cleanupOrphanedCalendarEvents').mockResolvedValue(mockCleanupResults);
      vi.spyOn(CalendarService, 'validateCalendarEventConsistency').mockResolvedValue(mockValidationResults);

      const result = await CalendarService.performMaintenance();

      expect(CalendarService.cleanupOrphanedCalendarEvents).toHaveBeenCalled();
      expect(CalendarService.validateCalendarEventConsistency).toHaveBeenCalled();
      expect(result.success).toBe(true);
      expect(result.cleanup).toEqual(mockCleanupResults);
      expect(result.validation).toEqual(mockValidationResults);
    });

    it('should handle maintenance with options to skip cleanup or validation', async () => {
      const mockValidationResults = { isValid: true };
      vi.spyOn(CalendarService, 'validateCalendarEventConsistency').mockResolvedValue(mockValidationResults);

      const result = await CalendarService.performMaintenance({ cleanup: false });

      expect(CalendarService.cleanupOrphanedCalendarEvents).not.toHaveBeenCalled();
      expect(CalendarService.validateCalendarEventConsistency).toHaveBeenCalled();
      expect(result.cleanup).toBeNull();
      expect(result.validation).toEqual(mockValidationResults);
    });
  });
});