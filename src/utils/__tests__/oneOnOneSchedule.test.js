// src/utils/__tests__/oneOnOneSchedule.test.js
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { localClient } from '../../api/localClient.js';
import OneOnOneScheduleMigration from '../oneOnOneScheduleMigration.js';

describe('OneOnOneSchedule Entity', () => {
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
      }
    ]));
  });

  describe('create', () => {
    it('should create a new schedule with valid data', async () => {
      const scheduleData = {
        team_member_id: 'tm-1',
        frequency: 'biweekly',
        day_of_week: 1, // Monday
        time: '14:00',
        duration_minutes: 60,
        start_date: '2025-01-01',
        next_meeting_date: '2025-01-06'
      };

      const schedule = await localClient.entities.OneOnOneSchedule.create(scheduleData);

      expect(schedule).toBeDefined();
      expect(schedule.id).toBeDefined();
      expect(schedule.team_member_id).toBe('tm-1');
      expect(schedule.frequency).toBe('biweekly');
      expect(schedule.is_active).toBe(true);
      expect(schedule.created_date).toBeDefined();
      expect(schedule.updated_date).toBeDefined();
    });

    it('should throw error if required fields are missing', async () => {
      const invalidData = {
        frequency: 'weekly'
        // Missing team_member_id and other required fields
      };

      await expect(
        localClient.entities.OneOnOneSchedule.create(invalidData)
      ).rejects.toThrow('team_member_id is required');
    });

    it('should throw error for invalid frequency', async () => {
      const invalidData = {
        team_member_id: 'tm-1',
        frequency: 'invalid',
        day_of_week: 1,
        time: '14:00',
        duration_minutes: 60,
        start_date: '2025-01-01'
      };

      await expect(
        localClient.entities.OneOnOneSchedule.create(invalidData)
      ).rejects.toThrow('frequency must be one of');
    });

    it('should throw error for invalid day_of_week', async () => {
      const invalidData = {
        team_member_id: 'tm-1',
        frequency: 'weekly',
        day_of_week: 7, // Invalid (only 0-6 allowed)
        time: '14:00',
        duration_minutes: 60,
        start_date: '2025-01-01'
      };

      await expect(
        localClient.entities.OneOnOneSchedule.create(invalidData)
      ).rejects.toThrow('day_of_week must be between 0 (Sunday) and 6 (Saturday)');
    });

    it('should throw error for invalid time format', async () => {
      const invalidData = {
        team_member_id: 'tm-1',
        frequency: 'weekly',
        day_of_week: 1,
        time: '2:00 PM', // Invalid format
        duration_minutes: 60,
        start_date: '2025-01-01'
      };

      await expect(
        localClient.entities.OneOnOneSchedule.create(invalidData)
      ).rejects.toThrow('time must be in HH:mm format');
    });

    it('should throw error if team member already has active schedule', async () => {
      const scheduleData = {
        team_member_id: 'tm-1',
        frequency: 'weekly',
        day_of_week: 1,
        time: '14:00',
        duration_minutes: 60,
        start_date: '2025-01-01'
      };

      // Create first schedule
      await localClient.entities.OneOnOneSchedule.create(scheduleData);

      // Try to create second schedule for same team member
      await expect(
        localClient.entities.OneOnOneSchedule.create(scheduleData)
      ).rejects.toThrow('Team member already has an active schedule');
    });
  });

  describe('update', () => {
    it('should update an existing schedule', async () => {
      const schedule = await localClient.entities.OneOnOneSchedule.create({
        team_member_id: 'tm-1',
        frequency: 'weekly',
        day_of_week: 1,
        time: '14:00',
        duration_minutes: 60,
        start_date: '2025-01-01'
      });

      const updated = await localClient.entities.OneOnOneSchedule.update(schedule.id, {
        frequency: 'biweekly',
        time: '15:00'
      });

      expect(updated.frequency).toBe('biweekly');
      expect(updated.time).toBe('15:00');
      expect(updated.day_of_week).toBe(1); // Unchanged
    });

    it('should throw error when updating non-existent schedule', async () => {
      await expect(
        localClient.entities.OneOnOneSchedule.update('non-existent', { frequency: 'weekly' })
      ).rejects.toThrow('OneOnOneSchedule not found');
    });
  });

  describe('list and get', () => {
    it('should list all schedules', async () => {
      await localClient.entities.OneOnOneSchedule.create({
        team_member_id: 'tm-1',
        frequency: 'weekly',
        day_of_week: 1,
        time: '14:00',
        duration_minutes: 60,
        start_date: '2025-01-01'
      });

      const schedules = await localClient.entities.OneOnOneSchedule.list();
      expect(schedules).toHaveLength(1);
    });

    it('should get schedule by id', async () => {
      const created = await localClient.entities.OneOnOneSchedule.create({
        team_member_id: 'tm-1',
        frequency: 'weekly',
        day_of_week: 1,
        time: '14:00',
        duration_minutes: 60,
        start_date: '2025-01-01'
      });

      const fetched = await localClient.entities.OneOnOneSchedule.get(created.id);
      expect(fetched).toBeDefined();
      expect(fetched.id).toBe(created.id);
    });

    it('should get schedules by team member', async () => {
      await localClient.entities.OneOnOneSchedule.create({
        team_member_id: 'tm-1',
        frequency: 'weekly',
        day_of_week: 1,
        time: '14:00',
        duration_minutes: 60,
        start_date: '2025-01-01'
      });

      const schedules = await localClient.entities.OneOnOneSchedule.getByTeamMember('tm-1');
      expect(schedules).toHaveLength(1);
    });
  });

  describe('activate and deactivate', () => {
    it('should deactivate a schedule', async () => {
      const schedule = await localClient.entities.OneOnOneSchedule.create({
        team_member_id: 'tm-1',
        frequency: 'weekly',
        day_of_week: 1,
        time: '14:00',
        duration_minutes: 60,
        start_date: '2025-01-01'
      });

      expect(schedule.is_active).toBe(true);

      const deactivated = await localClient.entities.OneOnOneSchedule.deactivate(schedule.id);
      expect(deactivated.is_active).toBe(false);
    });

    it('should activate a schedule', async () => {
      const schedule = await localClient.entities.OneOnOneSchedule.create({
        team_member_id: 'tm-1',
        frequency: 'weekly',
        day_of_week: 1,
        time: '14:00',
        duration_minutes: 60,
        start_date: '2025-01-01'
      });

      await localClient.entities.OneOnOneSchedule.deactivate(schedule.id);
      const activated = await localClient.entities.OneOnOneSchedule.activate(schedule.id);

      expect(activated.is_active).toBe(true);
    });
  });

  describe('delete', () => {
    it('should delete a schedule', async () => {
      const schedule = await localClient.entities.OneOnOneSchedule.create({
        team_member_id: 'tm-1',
        frequency: 'weekly',
        day_of_week: 1,
        time: '14:00',
        duration_minutes: 60,
        start_date: '2025-01-01'
      });

      const result = await localClient.entities.OneOnOneSchedule.delete(schedule.id);
      expect(result).toBe(true);

      const schedules = await localClient.entities.OneOnOneSchedule.list();
      expect(schedules).toHaveLength(0);
    });
  });
});

describe('OneOnOne Entity - Schedule Fields', () => {
  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem('one_on_ones', JSON.stringify([]));
    localStorage.setItem('one_on_one_schedules', JSON.stringify([]));
    localStorage.setItem('team_members', JSON.stringify([
      {
        id: 'tm-1',
        name: 'John Doe'
      }
    ]));
  });

  it('should create OneOnOne with schedule fields', async () => {
    const oneOnOne = await localClient.entities.OneOnOne.create({
      team_member_id: 'tm-1',
      next_meeting_date: '2025-01-15',
      schedule_id: 'schedule-123',
      is_recurring: true,
      recurrence_instance: 1
    });

    expect(oneOnOne.schedule_id).toBe('schedule-123');
    expect(oneOnOne.is_recurring).toBe(true);
    expect(oneOnOne.recurrence_instance).toBe(1);
  });

  it('should default schedule fields to null/false if not provided', async () => {
    const oneOnOne = await localClient.entities.OneOnOne.create({
      team_member_id: 'tm-1',
      next_meeting_date: '2025-01-15'
    });

    expect(oneOnOne.schedule_id).toBeNull();
    expect(oneOnOne.is_recurring).toBe(false);
    expect(oneOnOne.recurrence_instance).toBeNull();
  });
});

describe('OneOnOne Schedule Migration', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('should initialize schedules storage', () => {
    const result = OneOnOneScheduleMigration.initializeSchedulesStorage();
    expect(result.initialized).toBe(true);

    const stored = localStorage.getItem('one_on_one_schedules');
    expect(stored).toBe('[]');
  });

  it('should not reinitialize existing storage', () => {
    localStorage.setItem('one_on_one_schedules', JSON.stringify([{ id: 'test' }]));

    const result = OneOnOneScheduleMigration.initializeSchedulesStorage();
    expect(result.initialized).toBe(false);

    const stored = JSON.parse(localStorage.getItem('one_on_one_schedules'));
    expect(stored).toHaveLength(1);
  });

  it('should migrate existing OneOnOne records', async () => {
    // Set up old data without schedule fields
    localStorage.setItem('one_on_ones', JSON.stringify([
      {
        id: '1',
        team_member_id: 'tm-1',
        next_meeting_date: '2025-01-15'
      }
    ]));

    const result = await OneOnOneScheduleMigration.migrateOneOnOneScheduleFields();

    expect(result.success).toBe(true);
    expect(result.updated).toBe(1);

    const oneOnOnes = await localClient.entities.OneOnOne.list();
    expect(oneOnOnes[0].schedule_id).toBeNull();
    expect(oneOnOnes[0].is_recurring).toBe(false);
    expect(oneOnOnes[0].recurrence_instance).toBeNull();
  });
});
