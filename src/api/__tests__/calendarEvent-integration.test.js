// src/api/__tests__/calendarEvent-integration.test.js
// Integration test to verify enhanced CalendarEvent model works with existing functionality

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

describe('CalendarEvent Integration Tests', () => {
  beforeEach(() => {
    mockLocalStorage.clear();
    vi.clearAllMocks();
  });

  describe('Backward Compatibility', () => {
    it('should create existing one_on_one events without issues', async () => {
      const oneOnOneEvent = {
        title: 'John Smith 1:1',
        description: '1:1 meeting with John Smith',
        start_date: '2024-01-15T10:00:00.000Z',
        end_date: '2024-01-15T10:30:00.000Z',
        all_day: false,
        location: null,
        event_type: 'one_on_one',
        team_member_id: 'team-123',
        linked_entity_type: 'one_on_one',
        linked_entity_id: 'oneonone-456'
      };

      const event = await CalendarEvent.create(oneOnOneEvent);

      expect(event.event_type).toBe('one_on_one');
      expect(event.title).toBe('John Smith 1:1');
      expect(event.team_member_id).toBe('team-123');
      expect(event.linked_entity_type).toBe('one_on_one');
      expect(event.linked_entity_id).toBe('oneonone-456');
      // New fields should be null for existing event types
      expect(event.duty_id).toBeNull();
      expect(event.out_of_office_id).toBeNull();
    });

    it('should create meeting events with default event_type', async () => {
      const meetingEvent = {
        title: 'Team Meeting',
        description: 'Weekly team sync',
        start_date: '2024-01-15T14:00:00.000Z',
        end_date: '2024-01-15T15:00:00.000Z',
        all_day: false
      };

      const event = await CalendarEvent.create(meetingEvent);

      expect(event.event_type).toBe('meeting'); // Should default to meeting
      expect(event.title).toBe('Team Meeting');
      expect(event.duty_id).toBeNull();
      expect(event.out_of_office_id).toBeNull();
      expect(event.recurrence).toBeNull();
    });
  });

  describe('New Event Types Integration', () => {
    it('should create and query duty events correctly', async () => {
      // Create a duty event
      const dutyEvent = await CalendarEvent.createDutyEvent(
        'duty-123',
        'team-456',
        'DevOps Duty',
        '2024-01-15T00:00:00.000Z',
        '2024-01-17T23:59:59.000Z',
        'DevOps duty assignment'
      );

      expect(dutyEvent.event_type).toBe('duty');
      expect(dutyEvent.duty_id).toBe('duty-123');

      // Query duty events
      const dutyEvents = await CalendarEvent.getDutyEvents();
      expect(dutyEvents).toHaveLength(1);
      expect(dutyEvents[0].id).toBe(dutyEvent.id);

      // Query by duty_id
      const eventsByDutyId = await CalendarEvent.getByDutyId('duty-123');
      expect(eventsByDutyId).toHaveLength(1);
      expect(eventsByDutyId[0].id).toBe(dutyEvent.id);
    });

    it('should create and query birthday events correctly', async () => {
      // Create a birthday event
      const birthdayEvent = await CalendarEvent.createBirthdayEvent(
        'team-789',
        'Jane Smith',
        '2024-03-15T00:00:00.000Z'
      );

      expect(birthdayEvent.event_type).toBe('birthday');
      expect(birthdayEvent.recurrence).toEqual({
        type: 'yearly',
        interval: 1
      });

      // Query birthday events
      const birthdayEvents = await CalendarEvent.getBirthdayEvents();
      expect(birthdayEvents).toHaveLength(1);
      expect(birthdayEvents[0].id).toBe(birthdayEvent.id);
    });

    it('should create and query out of office events correctly', async () => {
      // Create an out of office event
      const oooEvent = await CalendarEvent.createOutOfOfficeEvent(
        'ooo-123',
        'team-456',
        'Bob Johnson',
        '2024-01-20T00:00:00.000Z',
        '2024-01-25T23:59:59.000Z',
        'vacation'
      );

      expect(oooEvent.event_type).toBe('out_of_office');
      expect(oooEvent.out_of_office_id).toBe('ooo-123');

      // Query out of office events
      const oooEvents = await CalendarEvent.getOutOfOfficeEvents();
      expect(oooEvents).toHaveLength(1);
      expect(oooEvents[0].id).toBe(oooEvent.id);

      // Query by out_of_office_id
      const eventsByOooId = await CalendarEvent.getByOutOfOfficeId('ooo-123');
      expect(eventsByOooId).toHaveLength(1);
      expect(eventsByOooId[0].id).toBe(oooEvent.id);
    });
  });

  describe('Mixed Event Types', () => {
    it('should handle multiple event types correctly', async () => {
      // Create events of different types
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

      // Verify all events exist
      const allEvents = await CalendarEvent.list();
      expect(allEvents).toHaveLength(5);

      // Verify meeting events (including one_on_one)
      const meetingEvents = await CalendarEvent.getMeetingEvents();
      expect(meetingEvents).toHaveLength(2);

      // Verify specific event types
      const dutyEvents = await CalendarEvent.getDutyEvents();
      expect(dutyEvents).toHaveLength(1);

      const birthdayEvents = await CalendarEvent.getBirthdayEvents();
      expect(birthdayEvents).toHaveLength(1);

      const oooEvents = await CalendarEvent.getOutOfOfficeEvents();
      expect(oooEvents).toHaveLength(1);

      // Verify event type filtering
      const meetingTypeEvents = await CalendarEvent.getByType('meeting');
      expect(meetingTypeEvents).toHaveLength(1);

      const oneOnOneTypeEvents = await CalendarEvent.getByType('one_on_one');
      expect(oneOnOneTypeEvents).toHaveLength(1);
    });
  });

  describe('CRUD Operations', () => {
    it('should support update operations on enhanced events', async () => {
      // Create a duty event
      const dutyEvent = await CalendarEvent.createDutyEvent(
        'duty-123',
        'team-456',
        'DevOps Duty',
        '2024-01-15T00:00:00.000Z',
        '2024-01-17T23:59:59.000Z'
      );

      // Update the event
      const updatedEvent = await CalendarEvent.update(dutyEvent.id, {
        title: 'Updated DevOps Duty',
        description: 'Updated description'
      });

      expect(updatedEvent.title).toBe('Updated DevOps Duty');
      expect(updatedEvent.description).toBe('Updated description');
      expect(updatedEvent.duty_id).toBe('duty-123'); // Should preserve linking fields
      expect(updatedEvent.event_type).toBe('duty'); // Should preserve event type
    });

    it('should support delete operations on enhanced events', async () => {
      // Create events
      const dutyEvent = await CalendarEvent.createDutyEvent(
        'duty-123',
        'team-456',
        'DevOps Duty',
        '2024-01-15T00:00:00.000Z',
        '2024-01-17T23:59:59.000Z'
      );

      const birthdayEvent = await CalendarEvent.createBirthdayEvent(
        'team-789',
        'Jane Smith',
        '2024-03-15T00:00:00.000Z'
      );

      // Verify events exist
      let allEvents = await CalendarEvent.list();
      expect(allEvents).toHaveLength(2);

      // Delete duty event
      await CalendarEvent.delete(dutyEvent.id);

      // Verify only birthday event remains
      allEvents = await CalendarEvent.list();
      expect(allEvents).toHaveLength(1);
      expect(allEvents[0].id).toBe(birthdayEvent.id);
      expect(allEvents[0].event_type).toBe('birthday');
    });
  });
});