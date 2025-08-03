import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CalendarEvent, Duty } from '../entities.js';

// Mock localStorage
const mockStorage = {};
global.localStorage = {
  getItem: vi.fn((key) => mockStorage[key] || null),
  setItem: vi.fn((key, value) => {
    mockStorage[key] = value;
  }),
  clear: vi.fn(() => {
    Object.keys(mockStorage).forEach(key => delete mockStorage[key]);
  })
};

describe('CalendarEvent Deduplication', () => {
  beforeEach(() => {
    localStorage.clear();
    // Initialize empty arrays for all entities
    localStorage.setItem('calendar_events', JSON.stringify([]));
    localStorage.setItem('duties', JSON.stringify([]));
  });

  describe('createDutyEvent idempotent behavior', () => {
    it('should create duty event only once for the same duty ID', async () => {
      const dutyId = 'duty-123';
      const teamMemberId = 'team-456';
      const title = 'Test Duty';
      const startDate = '2025-01-01';
      const endDate = '2025-01-02';

      // First call should create the event
      const firstEvent = await CalendarEvent.createDutyEvent(
        dutyId, teamMemberId, title, startDate, endDate
      );

      expect(firstEvent).toBeDefined();
      expect(firstEvent.duty_id).toBe(dutyId);
      expect(firstEvent.title).toBe(title);

      // Second call should return the existing event
      const secondEvent = await CalendarEvent.createDutyEvent(
        dutyId, teamMemberId, title, startDate, endDate
      );

      expect(secondEvent).toBeDefined();
      expect(secondEvent.id).toBe(firstEvent.id);

      // Verify only one event exists
      const allEvents = await CalendarEvent.list();
      const dutyEvents = allEvents.filter(e => e.duty_id === dutyId);
      expect(dutyEvents).toHaveLength(1);
    });

    it('should allow different duty IDs to create separate events', async () => {
      const teamMemberId = 'team-456';
      const title = 'Test Duty';
      const startDate = '2025-01-01';
      const endDate = '2025-01-02';

      // Create events for different duties
      const event1 = await CalendarEvent.createDutyEvent(
        'duty-1', teamMemberId, title, startDate, endDate
      );
      const event2 = await CalendarEvent.createDutyEvent(
        'duty-2', teamMemberId, title, startDate, endDate
      );

      expect(event1.id).not.toBe(event2.id);
      expect(event1.duty_id).toBe('duty-1');
      expect(event2.duty_id).toBe('duty-2');

      const allEvents = await CalendarEvent.list();
      expect(allEvents).toHaveLength(2);
    });
  });

  describe('cleanupDuplicateEvents', () => {
    it('should remove duplicate events for the same duty', async () => {
      // Manually create duplicate events to simulate the bug
      const dutyId = 'duty-123';
      const event1 = await CalendarEvent.create({
        title: 'Duty Event 1',
        event_type: 'duty',
        duty_id: dutyId,
        start_date: '2025-01-01',
        end_date: '2025-01-02',
        all_day: true
      });

      const event2 = await CalendarEvent.create({
        title: 'Duty Event 2',
        event_type: 'duty',
        duty_id: dutyId,
        start_date: '2025-01-01',
        end_date: '2025-01-02',
        all_day: true
      });

      // Verify duplicates exist
      let allEvents = await CalendarEvent.list();
      expect(allEvents).toHaveLength(2);

      // Run cleanup
      const result = await CalendarEvent.cleanupDuplicateEvents();

      expect(result.duplicatesRemoved).toBe(1);
      expect(result.duplicateEvents).toHaveLength(1);

      // Verify only one event remains
      allEvents = await CalendarEvent.list();
      expect(allEvents).toHaveLength(1);
      expect(allEvents[0].duty_id).toBe(dutyId);
    });

    it('should preserve non-duty events during cleanup', async () => {
      const dutyId = 'duty-123';
      
      // Create duplicate duty events
      await CalendarEvent.create({
        title: 'Duty Event 1',
        event_type: 'duty',
        duty_id: dutyId,
        start_date: '2025-01-01',
        end_date: '2025-01-02',
        all_day: true
      });

      await CalendarEvent.create({
        title: 'Duty Event 2',
        event_type: 'duty',
        duty_id: dutyId,
        start_date: '2025-01-01',
        end_date: '2025-01-02',
        all_day: true
      });

      // Create non-duty event
      const meetingEvent = await CalendarEvent.create({
        title: 'Meeting Event',
        event_type: 'meeting',
        start_date: '2025-01-01',
        end_date: '2025-01-02',
        all_day: false
      });

      // Run cleanup
      const result = await CalendarEvent.cleanupDuplicateEvents();

      expect(result.duplicatesRemoved).toBe(1);

      // Verify meeting event is preserved
      const allEvents = await CalendarEvent.list();
      expect(allEvents).toHaveLength(2); // 1 duty + 1 meeting
      
      const meetingEvents = allEvents.filter(e => e.event_type === 'meeting');
      expect(meetingEvents).toHaveLength(1);
      expect(meetingEvents[0].id).toBe(meetingEvent.id);
    });

    it('should handle multiple different duties with duplicates', async () => {
      // Create duplicates for duty-1
      await CalendarEvent.create({
        title: 'Duty 1 Event A',
        event_type: 'duty',
        duty_id: 'duty-1',
        start_date: '2025-01-01',
        end_date: '2025-01-02',
        all_day: true
      });

      await CalendarEvent.create({
        title: 'Duty 1 Event B',
        event_type: 'duty',
        duty_id: 'duty-1',
        start_date: '2025-01-01',
        end_date: '2025-01-02',
        all_day: true
      });

      // Create duplicates for duty-2
      await CalendarEvent.create({
        title: 'Duty 2 Event A',
        event_type: 'duty',
        duty_id: 'duty-2',
        start_date: '2025-01-01',
        end_date: '2025-01-02',
        all_day: true
      });

      await CalendarEvent.create({
        title: 'Duty 2 Event B',
        event_type: 'duty',
        duty_id: 'duty-2',
        start_date: '2025-01-01',
        end_date: '2025-01-02',
        all_day: true
      });

      // Run cleanup
      const result = await CalendarEvent.cleanupDuplicateEvents();

      expect(result.duplicatesRemoved).toBe(2);

      // Verify one event per duty remains
      const allEvents = await CalendarEvent.list();
      expect(allEvents).toHaveLength(2);
      
      const duty1Events = allEvents.filter(e => e.duty_id === 'duty-1');
      const duty2Events = allEvents.filter(e => e.duty_id === 'duty-2');
      expect(duty1Events).toHaveLength(1);
      expect(duty2Events).toHaveLength(1);
    });
  });

  describe('validateDutyEventConsistency', () => {
    it('should detect orphaned calendar events', async () => {
      // Create calendar event without corresponding duty
      await CalendarEvent.create({
        title: 'Orphaned Event',
        event_type: 'duty',
        duty_id: 'non-existent-duty',
        start_date: '2025-01-01',
        end_date: '2025-01-02',
        all_day: true
      });

      const inconsistencies = await CalendarEvent.validateDutyEventConsistency();

      expect(inconsistencies).toHaveLength(1);
      expect(inconsistencies[0].type).toBe('orphaned_calendar_event');
      expect(inconsistencies[0].issue).toContain('non-existent-duty');
    });

    it('should detect duties without calendar events', async () => {
      // Create duty without calendar event
      await Duty.create({
        team_member_id: 'team-123',
        type: 'devops',
        title: 'DevOps',
        start_date: '2025-01-01',
        end_date: '2025-01-02'
      });

      const inconsistencies = await CalendarEvent.validateDutyEventConsistency();

      expect(inconsistencies).toHaveLength(1);
      expect(inconsistencies[0].type).toBe('missing_calendar_event');
    });

    it('should detect duties with multiple calendar events', async () => {
      // Create duty
      const duty = await Duty.create({
        team_member_id: 'team-123',
        type: 'devops',
        title: 'DevOps',
        start_date: '2025-01-01',
        end_date: '2025-01-02'
      });

      // Create multiple calendar events for the same duty
      await CalendarEvent.create({
        title: 'Event 1',
        event_type: 'duty',
        duty_id: duty.id,
        start_date: '2025-01-01',
        end_date: '2025-01-02',
        all_day: true
      });

      await CalendarEvent.create({
        title: 'Event 2',
        event_type: 'duty',
        duty_id: duty.id,
        start_date: '2025-01-01',
        end_date: '2025-01-02',
        all_day: true
      });

      const inconsistencies = await CalendarEvent.validateDutyEventConsistency();

      expect(inconsistencies).toHaveLength(1);
      expect(inconsistencies[0].type).toBe('multiple_calendar_events');
      expect(inconsistencies[0].events).toHaveLength(2);
    });

    it('should return empty array when data is consistent', async () => {
      // Create duty
      const duty = await Duty.create({
        team_member_id: 'team-123',
        type: 'devops',
        title: 'DevOps',
        start_date: '2025-01-01',
        end_date: '2025-01-02'
      });

      // Create corresponding calendar event
      await CalendarEvent.create({
        title: 'Duty Event',
        event_type: 'duty',
        duty_id: duty.id,
        start_date: '2025-01-01',
        end_date: '2025-01-02',
        all_day: true
      });

      const inconsistencies = await CalendarEvent.validateDutyEventConsistency();

      expect(inconsistencies).toHaveLength(0);
    });
  });
});