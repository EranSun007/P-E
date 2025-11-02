// src/services/__tests__/oneOnOneScheduleService.test.js
import { describe, it, expect, beforeEach } from 'vitest';
import { OneOnOneScheduleService } from '../oneOnOneScheduleService.js';
import { localClient } from '../../api/localClient.js';

describe('OneOnOneScheduleService', () => {
  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear();
    localStorage.setItem('one_on_one_schedules', JSON.stringify([]));
    localStorage.setItem('one_on_ones', JSON.stringify([]));
    localStorage.setItem('team_members', JSON.stringify([
      {
        id: 'tm-1',
        name: 'John Doe',
        email: 'john@example.com'
      },
      {
        id: 'tm-2',
        name: 'Jane Smith',
        email: 'jane@example.com'
      }
    ]));
  });

  describe('calculateNextMeetingDate', () => {
    it('should calculate next weekly meeting correctly', () => {
      const schedule = {
        frequency: 'weekly',
        day_of_week: 1, // Monday
        custom_interval_weeks: null
      };

      // If today is Tuesday (2), next Monday should be in 6 days
      const nextDate = OneOnOneScheduleService.calculateNextMeetingDate(
        schedule,
        '2025-01-07' // Tuesday
      );

      expect(nextDate).toBe('2025-01-13'); // Next Monday
    });

    it('should calculate next biweekly meeting correctly', () => {
      const schedule = {
        frequency: 'biweekly',
        day_of_week: 1, // Monday
        custom_interval_weeks: null
      };

      const nextDate = OneOnOneScheduleService.calculateNextMeetingDate(
        schedule,
        '2025-01-06' // Monday
      );

      expect(nextDate).toBe('2025-01-20'); // Two weeks later on Monday
    });

    it('should calculate next monthly meeting correctly', () => {
      const schedule = {
        frequency: 'monthly',
        day_of_week: 1, // Monday
        custom_interval_weeks: null
      };

      const nextDate = OneOnOneScheduleService.calculateNextMeetingDate(
        schedule,
        '2025-01-15' // Mid-January
      );

      // Should be the first Monday of February
      const result = new Date(nextDate);
      expect(result.getMonth()).toBe(1); // February (0-indexed)
      expect(result.getDay()).toBe(1); // Monday
    });

    it('should calculate next custom interval meeting correctly', () => {
      const schedule = {
        frequency: 'custom',
        day_of_week: 3, // Wednesday
        custom_interval_weeks: 3
      };

      const nextDate = OneOnOneScheduleService.calculateNextMeetingDate(
        schedule,
        '2025-01-08' // Wednesday
      );

      expect(nextDate).toBe('2025-01-29'); // 3 weeks later on Wednesday
    });

    it('should handle different days of the week', () => {
      const schedule = {
        frequency: 'weekly',
        day_of_week: 5, // Friday
        custom_interval_weeks: null
      };

      const nextDate = OneOnOneScheduleService.calculateNextMeetingDate(
        schedule,
        '2025-01-06' // Monday
      );

      expect(nextDate).toBe('2025-01-10'); // This Friday
    });

    it('should throw error for invalid afterDate', () => {
      const schedule = {
        frequency: 'weekly',
        day_of_week: 1,
        custom_interval_weeks: null
      };

      expect(() => {
        OneOnOneScheduleService.calculateNextMeetingDate(schedule, 'invalid-date');
      }).toThrow('Invalid afterDate provided');
    });

    it('should throw error for custom frequency without interval', () => {
      const schedule = {
        frequency: 'custom',
        day_of_week: 1,
        custom_interval_weeks: null
      };

      expect(() => {
        OneOnOneScheduleService.calculateNextMeetingDate(schedule, '2025-01-01');
      }).toThrow('custom_interval_weeks is required');
    });
  });

  describe('createSchedule', () => {
    it('should create a new schedule and first meeting', async () => {
      const scheduleConfig = {
        frequency: 'biweekly',
        day_of_week: 1,
        time: '14:00',
        duration_minutes: 60,
        start_date: '2025-11-04' // Monday in the future
      };

      const result = await OneOnOneScheduleService.createSchedule('tm-1', scheduleConfig);

      expect(result.success).toBe(true);
      expect(result.schedule).toBeDefined();
      expect(result.schedule.team_member_id).toBe('tm-1');
      expect(result.schedule.frequency).toBe('biweekly');
      expect(result.firstMeeting).toBeDefined();
      expect(result.firstMeeting.is_recurring).toBe(true);
      expect(result.firstMeeting.recurrence_instance).toBe(1);
    });

    it('should throw error if team member not found', async () => {
      const scheduleConfig = {
        frequency: 'weekly',
        day_of_week: 1,
        time: '14:00',
        duration_minutes: 60,
        start_date: '2025-11-04'
      };

      await expect(
        OneOnOneScheduleService.createSchedule('non-existent', scheduleConfig)
      ).rejects.toThrow('not found');
    });

    it('should throw error if team member already has active schedule', async () => {
      const scheduleConfig = {
        frequency: 'weekly',
        day_of_week: 1,
        time: '14:00',
        duration_minutes: 60,
        start_date: '2025-11-04'
      };

      // Create first schedule
      await OneOnOneScheduleService.createSchedule('tm-1', scheduleConfig);

      // Try to create another for the same team member
      await expect(
        OneOnOneScheduleService.createSchedule('tm-1', scheduleConfig)
      ).rejects.toThrow('already has an active schedule');
    });
  });

  describe('generateNextMeeting', () => {
    it('should generate the next meeting after completion', async () => {
      // First create a schedule
      const scheduleConfig = {
        frequency: 'weekly',
        day_of_week: 1,
        time: '14:00',
        duration_minutes: 60,
        start_date: '2025-11-04'
      };

      const { schedule } = await OneOnOneScheduleService.createSchedule('tm-1', scheduleConfig);

      // Generate next meeting
      const result = await OneOnOneScheduleService.generateNextMeeting(
        schedule.id,
        '2025-11-11' // Complete the first meeting (Tuesday)
      );

      expect(result.success).toBe(true);
      expect(result.nextMeeting).toBeDefined();
      expect(result.nextMeeting.recurrence_instance).toBe(2);
      expect(result.nextMeeting.next_meeting_date).toBe('2025-11-17'); // Next Monday
    });

    it('should deactivate schedule if end date reached', async () => {
      const scheduleConfig = {
        frequency: 'weekly',
        day_of_week: 1,
        time: '14:00',
        duration_minutes: 60,
        start_date: '2025-11-04',
        end_date: '2025-11-11'
      };

      const { schedule } = await OneOnOneScheduleService.createSchedule('tm-1', scheduleConfig);

      // Try to generate next meeting after end date
      const result = await OneOnOneScheduleService.generateNextMeeting(
        schedule.id,
        '2025-11-11'
      );

      expect(result.scheduleEnded).toBe(true);

      // Check that schedule was deactivated
      const updatedSchedule = await localClient.entities.OneOnOneSchedule.get(schedule.id);
      expect(updatedSchedule.is_active).toBe(false);
    });

    it('should throw error for inactive schedule', async () => {
      const scheduleConfig = {
        frequency: 'weekly',
        day_of_week: 1,
        time: '14:00',
        duration_minutes: 60,
        start_date: '2025-11-04'
      };

      const { schedule } = await OneOnOneScheduleService.createSchedule('tm-1', scheduleConfig);

      // Deactivate the schedule
      await OneOnOneScheduleService.deactivateSchedule(schedule.id);

      // Try to generate next meeting
      await expect(
        OneOnOneScheduleService.generateNextMeeting(schedule.id, '2025-11-11')
      ).rejects.toThrow('inactive schedule');
    });
  });

  describe('updateSchedule', () => {
    it('should update schedule and recalculate next meeting', async () => {
      const scheduleConfig = {
        frequency: 'weekly',
        day_of_week: 1, // Monday
        time: '14:00',
        duration_minutes: 60,
        start_date: '2025-11-04'
      };

      const { schedule } = await OneOnOneScheduleService.createSchedule('tm-1', scheduleConfig);

      // Update to biweekly on Friday
      const updated = await OneOnOneScheduleService.updateSchedule(
        schedule.id,
        {
          frequency: 'biweekly',
          day_of_week: 5 // Friday
        },
        true // Apply to future
      );

      expect(updated.frequency).toBe('biweekly');
      expect(updated.day_of_week).toBe(5);
    });

    it('should update schedule without recalculating if applyToFuture is false', async () => {
      const scheduleConfig = {
        frequency: 'weekly',
        day_of_week: 1,
        time: '14:00',
        duration_minutes: 60,
        start_date: '2025-11-04'
      };

      const { schedule } = await OneOnOneScheduleService.createSchedule('tm-1', scheduleConfig);
      const originalNextDate = schedule.next_meeting_date;

      // Update without applying to future
      await OneOnOneScheduleService.updateSchedule(
        schedule.id,
        { time: '15:00' },
        false
      );

      const updatedSchedule = await localClient.entities.OneOnOneSchedule.get(schedule.id);
      expect(updatedSchedule.time).toBe('15:00');
      // Next meeting date should remain the same since applyToFuture is false
      expect(updatedSchedule.next_meeting_date).toBe(originalNextDate);
    });
  });

  describe('getScheduleDescription', () => {
    it('should generate correct description for weekly schedule', () => {
      const schedule = {
        frequency: 'weekly',
        day_of_week: 1,
        time: '14:00',
        custom_interval_weeks: null
      };

      const description = OneOnOneScheduleService.getScheduleDescription(schedule);
      expect(description).toBe('Every week on Monday at 2:00 PM');
    });

    it('should generate correct description for biweekly schedule', () => {
      const schedule = {
        frequency: 'biweekly',
        day_of_week: 3,
        time: '09:30',
        custom_interval_weeks: null
      };

      const description = OneOnOneScheduleService.getScheduleDescription(schedule);
      expect(description).toBe('Every 2 weeks on Wednesday at 9:30 AM');
    });

    it('should generate correct description for monthly schedule', () => {
      const schedule = {
        frequency: 'monthly',
        day_of_week: 5,
        time: '15:00',
        custom_interval_weeks: null
      };

      const description = OneOnOneScheduleService.getScheduleDescription(schedule);
      expect(description).toBe('Monthly on Friday at 3:00 PM');
    });

    it('should generate correct description for custom schedule', () => {
      const schedule = {
        frequency: 'custom',
        day_of_week: 2,
        time: '10:00',
        custom_interval_weeks: 3
      };

      const description = OneOnOneScheduleService.getScheduleDescription(schedule);
      expect(description).toBe('Every 3 weeks on Tuesday at 10:00 AM');
    });

    it('should handle midnight correctly', () => {
      const schedule = {
        frequency: 'weekly',
        day_of_week: 1,
        time: '00:00',
        custom_interval_weeks: null
      };

      const description = OneOnOneScheduleService.getScheduleDescription(schedule);
      expect(description).toBe('Every week on Monday at 12:00 AM');
    });
  });

  describe('deleteSchedule', () => {
    it('should delete schedule without deleting meetings', async () => {
      const scheduleConfig = {
        frequency: 'weekly',
        day_of_week: 1,
        time: '14:00',
        duration_minutes: 60,
        start_date: '2025-11-04'
      };

      const { schedule, firstMeeting } = await OneOnOneScheduleService.createSchedule('tm-1', scheduleConfig);

      const result = await OneOnOneScheduleService.deleteSchedule(schedule.id, false);

      expect(result.success).toBe(true);
      expect(result.deletedMeetings).toBe(0);

      // Schedule should be deleted
      const schedules = await localClient.entities.OneOnOneSchedule.list();
      expect(schedules).toHaveLength(0);

      // Meeting should still exist
      const meetings = await localClient.entities.OneOnOne.list();
      expect(meetings).toHaveLength(1);
    });

    it('should delete schedule and upcoming meetings', async () => {
      const scheduleConfig = {
        frequency: 'weekly',
        day_of_week: 1,
        time: '14:00',
        duration_minutes: 60,
        start_date: '2025-11-04'
      };

      const { schedule } = await OneOnOneScheduleService.createSchedule('tm-1', scheduleConfig);

      const result = await OneOnOneScheduleService.deleteSchedule(schedule.id, true);

      expect(result.success).toBe(true);
      expect(result.deletedMeetings).toBeGreaterThan(0);

      // Both schedule and meetings should be deleted
      const schedules = await localClient.entities.OneOnOneSchedule.list();
      expect(schedules).toHaveLength(0);

      const meetings = await localClient.entities.OneOnOne.list();
      expect(meetings).toHaveLength(0);
    });
  });

  describe('activate and deactivate', () => {
    it('should deactivate schedule', async () => {
      const scheduleConfig = {
        frequency: 'weekly',
        day_of_week: 1,
        time: '14:00',
        duration_minutes: 60,
        start_date: '2025-11-04'
      };

      const { schedule } = await OneOnOneScheduleService.createSchedule('tm-1', scheduleConfig);

      const deactivated = await OneOnOneScheduleService.deactivateSchedule(schedule.id);
      expect(deactivated.is_active).toBe(false);
    });

    it('should activate schedule', async () => {
      const scheduleConfig = {
        frequency: 'weekly',
        day_of_week: 1,
        time: '14:00',
        duration_minutes: 60,
        start_date: '2025-11-04'
      };

      const { schedule } = await OneOnOneScheduleService.createSchedule('tm-1', scheduleConfig);

      await OneOnOneScheduleService.deactivateSchedule(schedule.id);
      const activated = await OneOnOneScheduleService.activateSchedule(schedule.id);

      expect(activated.is_active).toBe(true);
    });
  });

  describe('getActiveSchedules', () => {
    it('should return only active schedules', async () => {
      // Create two schedules
      const config1 = {
        frequency: 'weekly',
        day_of_week: 1,
        time: '14:00',
        duration_minutes: 60,
        start_date: '2025-11-04'
      };

      const config2 = {
        frequency: 'biweekly',
        day_of_week: 3,
        time: '10:00',
        duration_minutes: 60,
        start_date: '2025-11-06'
      };

      const { schedule: schedule1 } = await OneOnOneScheduleService.createSchedule('tm-1', config1);
      await OneOnOneScheduleService.createSchedule('tm-2', config2);

      // Deactivate first schedule
      await OneOnOneScheduleService.deactivateSchedule(schedule1.id);

      const activeSchedules = await OneOnOneScheduleService.getActiveSchedules();
      expect(activeSchedules).toHaveLength(1);
      expect(activeSchedules[0].team_member_id).toBe('tm-2');
    });
  });

  describe('getScheduleByTeamMember', () => {
    it('should return schedule for specific team member', async () => {
      const scheduleConfig = {
        frequency: 'weekly',
        day_of_week: 1,
        time: '14:00',
        duration_minutes: 60,
        start_date: '2025-11-04'
      };

      await OneOnOneScheduleService.createSchedule('tm-1', scheduleConfig);

      const schedule = await OneOnOneScheduleService.getScheduleByTeamMember('tm-1');
      expect(schedule).toBeDefined();
      expect(schedule.team_member_id).toBe('tm-1');
    });

    it('should return null if no schedule exists', async () => {
      const schedule = await OneOnOneScheduleService.getScheduleByTeamMember('tm-1');
      expect(schedule).toBeNull();
    });
  });
});
