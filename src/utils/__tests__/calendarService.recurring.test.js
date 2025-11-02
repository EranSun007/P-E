// src/utils/__tests__/calendarService.recurring.test.js
import { describe, it, expect, beforeEach } from 'vitest';
import { localClient } from '../../api/localClient.js';

describe('CalendarService - Recurring Meetings Integration', () => {
  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear();
    localStorage.setItem('calendar_events', JSON.stringify([]));
    localStorage.setItem('one_on_ones', JSON.stringify([]));
    localStorage.setItem('one_on_one_schedules', JSON.stringify([]));
    localStorage.setItem('team_members', JSON.stringify([
      {
        id: 'tm-1',
        name: 'John Doe',
        email: 'john@example.com'
      }
    ]));
  });

  describe('Integration with OneOnOneScheduleService', () => {
    it('should automatically create calendar event when schedule creates meeting', async () => {
      const { OneOnOneScheduleService } = await import('../../services/oneOnOneScheduleService.js');

      const scheduleConfig = {
        frequency: 'weekly',
        day_of_week: 1,
        time: '14:00',
        duration_minutes: 60,
        start_date: '2025-12-01'
      };

      const { schedule, firstMeeting, calendarEvent } = await OneOnOneScheduleService.createSchedule(
        'tm-1',
        scheduleConfig
      );

      expect(schedule).toBeDefined();
      expect(firstMeeting).toBeDefined();
      expect(calendarEvent).toBeDefined();

      // Check calendar event properties
      expect(calendarEvent.event_type).toBe('one_on_one');
      expect(calendarEvent.schedule_id).toBe(schedule.id);
      expect(calendarEvent.is_recurring).toBe(true);
      expect(calendarEvent.title).toBe('1:1 with John Doe');
    });

    it('should use schedule duration for calendar event', async () => {
      const { OneOnOneScheduleService } = await import('../../services/oneOnOneScheduleService.js');

      const scheduleConfig = {
        frequency: 'weekly',
        day_of_week: 1,
        time: '14:00',
        duration_minutes: 30, // 30 minute meeting
        start_date: '2025-12-01'
      };

      const { calendarEvent } = await OneOnOneScheduleService.createSchedule(
        'tm-1',
        scheduleConfig
      );

      expect(calendarEvent).toBeDefined();
      expect(calendarEvent.start_time).toContain('T14:00:00');
      // End time should be 30 minutes later
      const start = new Date(calendarEvent.start_time);
      const end = new Date(calendarEvent.end_time);
      const durationMs = end - start;
      expect(durationMs).toBe(30 * 60 * 1000); // 30 minutes in milliseconds
    });

    it('should link OneOnOne to calendar event', async () => {
      const { OneOnOneScheduleService } = await import('../../services/oneOnOneScheduleService.js');

      const scheduleConfig = {
        frequency: 'weekly',
        day_of_week: 1,
        time: '14:00',
        duration_minutes: 60,
        start_date: '2025-12-01'
      };

      const { firstMeeting, calendarEvent } = await OneOnOneScheduleService.createSchedule(
        'tm-1',
        scheduleConfig
      );

      // Check that the OneOnOne was updated with calendar event ID
      expect(firstMeeting.next_meeting_calendar_event_id).toBe(calendarEvent.id);
    });

    it('should create calendar event when generating next meeting', async () => {
      const { OneOnOneScheduleService } = await import('../../services/oneOnOneScheduleService.js');

      const scheduleConfig = {
        frequency: 'weekly',
        day_of_week: 1,
        time: '14:00',
        duration_minutes: 60,
        start_date: '2025-12-01'
      };

      const { schedule } = await OneOnOneScheduleService.createSchedule(
        'tm-1',
        scheduleConfig
      );

      // Generate next meeting
      const { nextMeeting, calendarEvent } = await OneOnOneScheduleService.generateNextMeeting(
        schedule.id,
        schedule.next_meeting_date
      );

      expect(nextMeeting).toBeDefined();
      expect(calendarEvent).toBeDefined();
      expect(calendarEvent.schedule_id).toBe(schedule.id);
      expect(calendarEvent.is_recurring).toBe(true);
      expect(nextMeeting.recurrence_instance).toBe(2);
    });
  });

  describe('CalendarEvent entity with schedule fields', () => {
    it('should create calendar event with schedule_id and is_recurring fields', async () => {
      const event = await localClient.entities.CalendarEvent.create({
        event_type: 'one_on_one',
        title: '1:1 with John Doe',
        start_time: '2025-12-08T14:00:00',
        end_time: '2025-12-08T15:00:00',
        team_member_id: 'tm-1',
        schedule_id: 'schedule-123',
        is_recurring: true
      });

      expect(event.schedule_id).toBe('schedule-123');
      expect(event.is_recurring).toBe(true);
    });

    it('should default schedule fields to null/false if not provided', async () => {
      const event = await localClient.entities.CalendarEvent.create({
        event_type: 'one_on_one',
        title: '1:1 with John Doe',
        start_time: '2025-12-08T14:00:00',
        end_time: '2025-12-08T15:00:00',
        team_member_id: 'tm-1'
      });

      expect(event.schedule_id).toBeNull();
      expect(event.is_recurring).toBe(false);
    });
  });
});
