// src/api/__tests__/calendarEvent-enhanced.test.js
// Tests for enhanced CalendarEvent model with new event types

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CalendarEvent } from '../entities.js';

// Mock localStorage
const mockLocalStorage = {
  data: {},
  getItem: vi.fn((key) => mockLocalStorage.data[key] || null),
  setItem: vi.fn((key, value) => {
    mockLocalStorage.data[key] = value;
  }),
  clear: vi.fn(() => {
    mockLocalStorage.data = {};
  })
};

Object.defineProperty(global, 'localStorage', {
  value: mockLocalStorage,
  writable: true
});

describe('Enhanced CalendarEvent Model', () => {
  beforeEach(() => {
    mockLocalStorage.clear();
    vi.clearAllMocks();
  });

  describe('Event Type Validation', () => {
    it('should create event with valid event_type', async () => {
      const eventData = {
        title: 'Test Meeting',
        start_date: '2024-01-15T10:00:00.000Z',
        end_date: '2024-01-15T11:00:00.000Z',
        event_type: 'meeting'
      };

      const event = await CalendarEvent.create(eventData);

      expect(event.event_type).toBe('meeting');
      expect(event.title).toBe('Test Meeting');
      expect(event.id).toBeDefined();
    });

    it('should reject invalid event_type', async () => {
      const eventData = {
        title: 'Test Event',
        start_date: '2024-01-15T10:00:00.000Z',
        end_date: '2024-01-15T11:00:00.000Z',
        event_type: 'invalid_type'
      };

      await expect(CalendarEvent.create(eventData)).rejects.toThrow(
        'Invalid event_type. Must be one of: meeting, one_on_one, duty, birthday, out_of_office'
      );
    });

    it('should default to meeting type when event_type is not provided', async () => {
      const eventData = {
        title: 'Test Event',
        start_date: '2024-01-15T10:00:00.000Z',
        end_date: '2024-01-15T11:00:00.000Z'
      };

      const event = await CalendarEvent.create(eventData);

      expect(event.event_type).toBe('meeting');
    });
  });

  describe('Duty Events', () => {
    it('should create duty event with duty_id', async () => {
      const dutyEvent = await CalendarEvent.createDutyEvent(
        'duty-123',
        'team-456',
        'DevOps Duty',
        '2024-01-15T00:00:00.000Z',
        '2024-01-17T23:59:59.000Z',
        'DevOps duty assignment for John'
      );

      expect(dutyEvent.event_type).toBe('duty');
      expect(dutyEvent.duty_id).toBe('duty-123');
      expect(dutyEvent.team_member_id).toBe('team-456');
      expect(dutyEvent.title).toBe('DevOps Duty');
      expect(dutyEvent.all_day).toBe(true);
      expect(dutyEvent.linked_entity_type).toBe('duty');
      expect(dutyEvent.linked_entity_id).toBe('duty-123');
    });

    it('should warn when creating duty event without duty_id', async () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      const eventData = {
        title: 'Duty Event',
        start_date: '2024-01-15T00:00:00.000Z',
        end_date: '2024-01-17T23:59:59.000Z',
        event_type: 'duty'
      };

      const event = await CalendarEvent.create(eventData);

      expect(consoleSpy).toHaveBeenCalledWith(
        'Duty event created without duty_id - this may cause display issues'
      );
      expect(event.event_type).toBe('duty');
      expect(event.duty_id).toBeNull();

      consoleSpy.mockRestore();
    });
  });

  describe('Birthday Events', () => {
    it('should create birthday event with automatic yearly recurrence', async () => {
      const birthdayEvent = await CalendarEvent.createBirthdayEvent(
        'team-123',
        'John Smith',
        '2024-03-15T00:00:00.000Z'
      );

      expect(birthdayEvent.event_type).toBe('birthday');
      expect(birthdayEvent.title).toBe('🎂 John Smith\'s Birthday');
      expect(birthdayEvent.team_member_id).toBe('team-123');
      expect(birthdayEvent.all_day).toBe(true);
      expect(birthdayEvent.recurrence).toEqual({
        type: 'yearly',
        interval: 1
      });
      expect(birthdayEvent.linked_entity_type).toBe('team_member');
      expect(birthdayEvent.linked_entity_id).toBe('team-123');
    });

    it('should automatically add yearly recurrence to birthday events', async () => {
      const eventData = {
        title: 'Birthday Event',
        start_date: '2024-03-15T00:00:00.000Z',
        end_date: '2024-03-15T23:59:59.000Z',
        event_type: 'birthday'
      };

      const event = await CalendarEvent.create(eventData);

      expect(event.recurrence).toEqual({
        type: 'yearly',
        interval: 1
      });
    });
  });

  describe('Out of Office Events', () => {
    it('should create out of office event with out_of_office_id', async () => {
      const oooEvent = await CalendarEvent.createOutOfOfficeEvent(
        'ooo-123',
        'team-456',
        'Jane Doe',
        '2024-01-20T00:00:00.000Z',
        '2024-01-25T23:59:59.000Z',
        'vacation'
      );

      expect(oooEvent.event_type).toBe('out_of_office');
      expect(oooEvent.out_of_office_id).toBe('ooo-123');
      expect(oooEvent.team_member_id).toBe('team-456');
      expect(oooEvent.title).toBe('Jane Doe - Out of Office (vacation)');
      expect(oooEvent.all_day).toBe(true);
      expect(oooEvent.linked_entity_type).toBe('out_of_office');
      expect(oooEvent.linked_entity_id).toBe('ooo-123');
    });

    it('should warn when creating out of office event without out_of_office_id', async () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      const eventData = {
        title: 'Out of Office',
        start_date: '2024-01-20T00:00:00.000Z',
        end_date: '2024-01-25T23:59:59.000Z',
        event_type: 'out_of_office'
      };

      const event = await CalendarEvent.create(eventData);

      expect(consoleSpy).toHaveBeenCalledWith(
        'Out of office event created without out_of_office_id - this may cause display issues'
      );
      expect(event.event_type).toBe('out_of_office');
      expect(event.out_of_office_id).toBeNull();

      consoleSpy.mockRestore();
    });
  });

  describe('Query Helper Methods', () => {
    beforeEach(async () => {
      // Create test events of different types
      await CalendarEvent.create({
        title: 'Team Meeting',
        start_date: '2024-01-15T10:00:00.000Z',
        end_date: '2024-01-15T11:00:00.000Z',
        event_type: 'meeting'
      });

      await CalendarEvent.create({
        title: '1:1 with John',
        start_date: '2024-01-16T14:00:00.000Z',
        end_date: '2024-01-16T14:30:00.000Z',
        event_type: 'one_on_one'
      });

      await CalendarEvent.createDutyEvent(
        'duty-123',
        'team-456',
        'DevOps Duty',
        '2024-01-17T00:00:00.000Z',
        '2024-01-19T23:59:59.000Z'
      );

      await CalendarEvent.createBirthdayEvent(
        'team-789',
        'Jane Smith',
        '2024-01-20T00:00:00.000Z'
      );

      await CalendarEvent.createOutOfOfficeEvent(
        'ooo-456',
        'team-101',
        'Bob Johnson',
        '2024-01-21T00:00:00.000Z',
        '2024-01-25T23:59:59.000Z'
      );
    });

    it('should get events by type', async () => {
      const meetingEvents = await CalendarEvent.getByType('meeting');
      const dutyEvents = await CalendarEvent.getByType('duty');
      const birthdayEvents = await CalendarEvent.getByType('birthday');
      const oooEvents = await CalendarEvent.getByType('out_of_office');

      expect(meetingEvents).toHaveLength(1);
      expect(meetingEvents[0].title).toBe('Team Meeting');

      expect(dutyEvents).toHaveLength(1);
      expect(dutyEvents[0].title).toBe('DevOps Duty');

      expect(birthdayEvents).toHaveLength(1);
      expect(birthdayEvents[0].title).toBe('🎂 Jane Smith\'s Birthday');

      expect(oooEvents).toHaveLength(1);
      expect(oooEvents[0].title).toBe('Bob Johnson - Out of Office (vacation)');
    });

    it('should get meeting events (including one_on_one)', async () => {
      const meetingEvents = await CalendarEvent.getMeetingEvents();

      expect(meetingEvents).toHaveLength(2);
      expect(meetingEvents.some(e => e.event_type === 'meeting')).toBe(true);
      expect(meetingEvents.some(e => e.event_type === 'one_on_one')).toBe(true);
    });

    it('should get events by duty_id', async () => {
      const dutyEvents = await CalendarEvent.getByDutyId('duty-123');

      expect(dutyEvents).toHaveLength(1);
      expect(dutyEvents[0].duty_id).toBe('duty-123');
      expect(dutyEvents[0].title).toBe('DevOps Duty');
    });

    it('should get events by out_of_office_id', async () => {
      const oooEvents = await CalendarEvent.getByOutOfOfficeId('ooo-456');

      expect(oooEvents).toHaveLength(1);
      expect(oooEvents[0].out_of_office_id).toBe('ooo-456');
      expect(oooEvents[0].title).toBe('Bob Johnson - Out of Office (vacation)');
    });

    it('should get birthday events using helper method', async () => {
      const birthdayEvents = await CalendarEvent.getBirthdayEvents();

      expect(birthdayEvents).toHaveLength(1);
      expect(birthdayEvents[0].event_type).toBe('birthday');
    });

    it('should get duty events using helper method', async () => {
      const dutyEvents = await CalendarEvent.getDutyEvents();

      expect(dutyEvents).toHaveLength(1);
      expect(dutyEvents[0].event_type).toBe('duty');
    });

    it('should get out of office events using helper method', async () => {
      const oooEvents = await CalendarEvent.getOutOfOfficeEvents();

      expect(oooEvents).toHaveLength(1);
      expect(oooEvents[0].event_type).toBe('out_of_office');
    });
  });

  describe('Recurrence Support', () => {
    it('should preserve custom recurrence settings', async () => {
      const eventData = {
        title: 'Weekly Team Meeting',
        start_date: '2024-01-15T10:00:00.000Z',
        end_date: '2024-01-15T11:00:00.000Z',
        event_type: 'meeting',
        recurrence: {
          type: 'weekly',
          interval: 1
        }
      };

      const event = await CalendarEvent.create(eventData);

      expect(event.recurrence).toEqual({
        type: 'weekly',
        interval: 1
      });
    });

    it('should not override existing recurrence for birthday events', async () => {
      const eventData = {
        title: 'Special Birthday Event',
        start_date: '2024-03-15T00:00:00.000Z',
        end_date: '2024-03-15T23:59:59.000Z',
        event_type: 'birthday',
        recurrence: {
          type: 'monthly',
          interval: 6
        }
      };

      const event = await CalendarEvent.create(eventData);

      expect(event.recurrence).toEqual({
        type: 'monthly',
        interval: 6
      });
    });
  });

  describe('Linking Fields', () => {
    it('should initialize linking fields correctly', async () => {
      const eventData = {
        title: 'Test Event',
        start_date: '2024-01-15T10:00:00.000Z',
        end_date: '2024-01-15T11:00:00.000Z',
        event_type: 'duty',
        duty_id: 'duty-123'
      };

      const event = await CalendarEvent.create(eventData);

      expect(event.duty_id).toBe('duty-123');
      expect(event.out_of_office_id).toBeNull();
    });

    it('should handle both duty_id and out_of_office_id', async () => {
      const eventData = {
        title: 'Test Event',
        start_date: '2024-01-15T10:00:00.000Z',
        end_date: '2024-01-15T11:00:00.000Z',
        event_type: 'meeting',
        duty_id: 'duty-123',
        out_of_office_id: 'ooo-456'
      };

      const event = await CalendarEvent.create(eventData);

      expect(event.duty_id).toBe('duty-123');
      expect(event.out_of_office_id).toBe('ooo-456');
    });
  });
});