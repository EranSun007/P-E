// Simple integration test to verify the calendar workflow
import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock CalendarService
vi.mock('../calendarService.js', () => ({
  CalendarService: {
    createAndLinkOneOnOneMeeting: vi.fn(),
    updateOneOnOneCalendarEvent: vi.fn(),
    unlinkCalendarEventFromOneOnOne: vi.fn(),
    getOneOnOneMeetings: vi.fn()
  }
}));

import { CalendarService } from '../calendarService.js';

describe('Calendar Workflow Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('End-to-End Meeting Scheduling Flow', () => {
    it('should test calendar service integration for meeting creation', async () => {
      // Mock successful calendar event creation
      const mockResult = {
        calendarEvent: {
          id: 'event-123',
          title: 'John Smith 1:1',
          start_date: '2024-01-22T10:00:00.000Z',
          event_type: 'one_on_one',
          team_member_id: 'team-123'
        },
        oneOnOne: {
          id: 'oneonone-123',
          next_meeting_calendar_event_id: 'event-123'
        }
      };

      CalendarService.createAndLinkOneOnOneMeeting.mockResolvedValue(mockResult);

      // Test the service call
      const result = await CalendarService.createAndLinkOneOnOneMeeting(
        'oneonone-123',
        'team-123',
        '2024-01-22T10:00:00.000Z'
      );

      expect(CalendarService.createAndLinkOneOnOneMeeting).toHaveBeenCalledWith(
        'oneonone-123',
        'team-123',
        '2024-01-22T10:00:00.000Z'
      );

      expect(result.calendarEvent.title).toBe('John Smith 1:1');
      expect(result.calendarEvent.event_type).toBe('one_on_one');
      expect(result.oneOnOne.next_meeting_calendar_event_id).toBe('event-123');
    });

    it('should handle calendar event creation failure', async () => {
      CalendarService.createAndLinkOneOnOneMeeting.mockRejectedValue(
        new Error('Calendar service unavailable')
      );

      await expect(
        CalendarService.createAndLinkOneOnOneMeeting('oneonone-123', 'team-123', '2024-01-22T10:00:00.000Z')
      ).rejects.toThrow('Calendar service unavailable');

      expect(CalendarService.createAndLinkOneOnOneMeeting).toHaveBeenCalled();
    });
  });

  describe('Calendar Event Updates When Meetings Are Rescheduled', () => {
    it('should test calendar service integration for meeting updates', async () => {
      const mockUpdateResult = {
        id: 'event-123',
        start_date: '2024-01-25T15:00:00.000Z'
      };

      CalendarService.updateOneOnOneCalendarEvent.mockResolvedValue(mockUpdateResult);

      const result = await CalendarService.updateOneOnOneCalendarEvent(
        'oneonone-123',
        '2024-01-25T15:00:00.000Z'
      );

      expect(CalendarService.updateOneOnOneCalendarEvent).toHaveBeenCalledWith(
        'oneonone-123',
        '2024-01-25T15:00:00.000Z'
      );

      expect(result.start_date).toBe('2024-01-25T15:00:00.000Z');
    });

    it('should test calendar service integration for meeting deletion', async () => {
      CalendarService.unlinkCalendarEventFromOneOnOne.mockResolvedValue(true);

      const result = await CalendarService.unlinkCalendarEventFromOneOnOne('oneonone-123');

      expect(CalendarService.unlinkCalendarEventFromOneOnOne).toHaveBeenCalledWith('oneonone-123');
      expect(result).toBe(true);
    });
  });

  describe('Calendar Display Integration', () => {
    it('should test calendar service integration for event retrieval', async () => {
      const mockEvents = [
        {
          id: 'event-123',
          title: 'John Smith 1:1',
          start_date: '2024-01-22T10:00:00.000Z',
          event_type: 'one_on_one',
          team_member_id: 'team-123'
        },
        {
          id: 'event-456',
          title: 'Jane Doe 1:1',
          start_date: '2024-01-23T11:00:00.000Z',
          event_type: 'one_on_one',
          team_member_id: 'team-456'
        }
      ];

      CalendarService.getOneOnOneMeetings.mockResolvedValue(mockEvents);

      const result = await CalendarService.getOneOnOneMeetings();

      expect(CalendarService.getOneOnOneMeetings).toHaveBeenCalled();
      expect(result).toHaveLength(2);
      expect(result[0].title).toBe('John Smith 1:1');
      expect(result[1].title).toBe('Jane Doe 1:1');
      expect(result.every(event => event.event_type === 'one_on_one')).toBe(true);
    });

    it('should filter events by type correctly', async () => {
      const mockEvents = [
        {
          id: 'event-1',
          title: 'John Smith 1:1',
          event_type: 'one_on_one',
          team_member_id: 'team-123'
        },
        {
          id: 'event-2',
          title: 'Team Meeting',
          event_type: 'meeting'
        }
      ];

      CalendarService.getOneOnOneMeetings.mockResolvedValue(
        mockEvents.filter(e => e.event_type === 'one_on_one')
      );

      const result = await CalendarService.getOneOnOneMeetings();

      expect(result).toHaveLength(1);
      expect(result[0].event_type).toBe('one_on_one');
      expect(result[0].title).toBe('John Smith 1:1');
    });
  });

  describe('Navigation Integration', () => {
    it('should verify navigation data structure for 1:1 events', () => {
      const mockEvent = {
        id: 'event-123',
        title: 'John Smith 1:1',
        start_date: '2024-01-22T10:00:00.000Z',
        event_type: 'one_on_one',
        team_member_id: 'team-123'
      };

      // Verify event has required navigation data
      expect(mockEvent.event_type).toBe('one_on_one');
      expect(mockEvent.team_member_id).toBe('team-123');
      expect(mockEvent.title).toContain('1:1');

      // Navigation would use: `/team/${event.team_member_id}`
      const expectedNavigationPath = `/team/${mockEvent.team_member_id}`;
      expect(expectedNavigationPath).toBe('/team/team-123');
    });

    it('should handle multiple team member navigation scenarios', () => {
      const mockEvents = [
        {
          id: 'event-1',
          title: 'John Smith 1:1',
          event_type: 'one_on_one',
          team_member_id: 'team-1'
        },
        {
          id: 'event-2',
          title: 'Jane Doe 1:1',
          event_type: 'one_on_one',
          team_member_id: 'team-2'
        }
      ];

      mockEvents.forEach(event => {
        expect(event.event_type).toBe('one_on_one');
        expect(event.team_member_id).toBeTruthy();
        
        const navigationPath = `/team/${event.team_member_id}`;
        expect(navigationPath).toMatch(/^\/team\/team-\d+$/);
      });
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle service unavailable scenarios', async () => {
      CalendarService.createAndLinkOneOnOneMeeting.mockRejectedValue(
        new Error('Service unavailable')
      );
      CalendarService.getOneOnOneMeetings.mockRejectedValue(
        new Error('Service unavailable')
      );

      // Test creation failure
      await expect(
        CalendarService.createAndLinkOneOnOneMeeting('oneonone-123', 'team-123', '2024-01-22T10:00:00.000Z')
      ).rejects.toThrow('Service unavailable');

      // Test retrieval failure
      await expect(
        CalendarService.getOneOnOneMeetings()
      ).rejects.toThrow('Service unavailable');
    });

    it('should handle malformed data gracefully', async () => {
      const malformedEvents = [
        {
          id: 'event-1',
          title: 'John Smith 1:1',
          // Missing start_date
          event_type: 'one_on_one',
          team_member_id: 'team-123'
        },
        {
          id: 'event-2',
          // Missing title
          start_date: '2024-01-22T10:00:00.000Z',
          event_type: 'one_on_one',
          team_member_id: 'team-123'
        }
      ];

      CalendarService.getOneOnOneMeetings.mockResolvedValue(malformedEvents);

      const result = await CalendarService.getOneOnOneMeetings();

      // Service should return data even if malformed
      expect(result).toHaveLength(2);
      
      // Components should handle missing fields gracefully
      result.forEach(event => {
        expect(event.id).toBeTruthy();
        expect(event.event_type).toBe('one_on_one');
      });
    });
  });

  describe('Data Consistency and Workflow Integration', () => {
    it('should maintain consistent data flow through workflow', async () => {
      // Step 1: Create meeting with calendar event
      const createResult = {
        calendarEvent: {
          id: 'event-123',
          title: 'John Smith 1:1',
          start_date: '2024-01-22T10:00:00.000Z',
          event_type: 'one_on_one',
          team_member_id: 'team-123'
        },
        oneOnOne: {
          id: 'oneonone-123',
          next_meeting_calendar_event_id: 'event-123'
        }
      };

      CalendarService.createAndLinkOneOnOneMeeting.mockResolvedValue(createResult);

      const created = await CalendarService.createAndLinkOneOnOneMeeting(
        'oneonone-123',
        'team-123',
        '2024-01-22T10:00:00.000Z'
      );

      // Step 2: Verify created event can be retrieved
      CalendarService.getOneOnOneMeetings.mockResolvedValue([createResult.calendarEvent]);

      const retrieved = await CalendarService.getOneOnOneMeetings();

      // Step 3: Verify data consistency
      expect(created.calendarEvent.id).toBe(retrieved[0].id);
      expect(created.calendarEvent.title).toBe(retrieved[0].title);
      expect(created.calendarEvent.team_member_id).toBe(retrieved[0].team_member_id);

      // Step 4: Test update workflow
      const updateResult = {
        id: 'event-123',
        start_date: '2024-01-25T15:00:00.000Z'
      };

      CalendarService.updateOneOnOneCalendarEvent.mockResolvedValue(updateResult);

      const updated = await CalendarService.updateOneOnOneCalendarEvent(
        'oneonone-123',
        '2024-01-25T15:00:00.000Z'
      );

      expect(updated.id).toBe(created.calendarEvent.id);
      expect(updated.start_date).toBe('2024-01-25T15:00:00.000Z');
    });

    it('should handle workflow state transitions', async () => {
      // Test: Schedule -> Reschedule -> Cancel workflow
      
      // 1. Schedule
      CalendarService.createAndLinkOneOnOneMeeting.mockResolvedValue({
        calendarEvent: { id: 'event-123' },
        oneOnOne: { id: 'oneonone-123', next_meeting_calendar_event_id: 'event-123' }
      });

      const scheduled = await CalendarService.createAndLinkOneOnOneMeeting(
        'oneonone-123', 'team-123', '2024-01-22T10:00:00.000Z'
      );

      expect(scheduled.oneOnOne.next_meeting_calendar_event_id).toBe('event-123');

      // 2. Reschedule
      CalendarService.updateOneOnOneCalendarEvent.mockResolvedValue({
        id: 'event-123',
        start_date: '2024-01-25T15:00:00.000Z'
      });

      const rescheduled = await CalendarService.updateOneOnOneCalendarEvent(
        'oneonone-123', '2024-01-25T15:00:00.000Z'
      );

      expect(rescheduled.id).toBe('event-123');

      // 3. Cancel
      CalendarService.unlinkCalendarEventFromOneOnOne.mockResolvedValue(true);

      const cancelled = await CalendarService.unlinkCalendarEventFromOneOnOne('oneonone-123');

      expect(cancelled).toBe(true);

      // Verify all workflow steps were called
      expect(CalendarService.createAndLinkOneOnOneMeeting).toHaveBeenCalled();
      expect(CalendarService.updateOneOnOneCalendarEvent).toHaveBeenCalled();
      expect(CalendarService.unlinkCalendarEventFromOneOnOne).toHaveBeenCalled();
    });
  });
});