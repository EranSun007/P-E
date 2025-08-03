import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CalendarEvent, Duty, TeamMember } from '../entities.js';
import CalendarEventGenerationService from '../../services/calendarEventGenerationService.js';

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

describe('Duty Calendar Integration - Deduplication Fix', () => {
  beforeEach(() => {
    localStorage.clear();
    // Initialize empty arrays for all entities
    localStorage.setItem('calendar_events', JSON.stringify([]));
    localStorage.setItem('duties', JSON.stringify([]));
    localStorage.setItem('team_members', JSON.stringify([]));
  });

  it('should prevent duplicate calendar events when creating duty multiple times', async () => {
    // Create a team member
    const teamMember = await TeamMember.create({
      name: 'John Doe',
      email: 'john@example.com',
      company: 'Test Company'
    });

    // Create a duty
    const duty = await Duty.create({
      team_member_id: teamMember.id,
      type: 'devops',
      title: 'DevOps',
      start_date: '2025-01-01',
      end_date: '2025-01-07',
      description: 'Weekly DevOps duty'
    });

    // Convert duty to calendar event multiple times (simulating the bug)
    const event1 = await CalendarEventGenerationService.convertDutyToCalendarEvent(duty);
    const event2 = await CalendarEventGenerationService.convertDutyToCalendarEvent(duty);
    const event3 = await CalendarEventGenerationService.convertDutyToCalendarEvent(duty);

    // All should return the same event (idempotent)
    expect(event1.id).toBe(event2.id);
    expect(event2.id).toBe(event3.id);

    // Verify only one calendar event exists
    const allEvents = await CalendarEvent.list();
    const dutyEvents = allEvents.filter(e => e.duty_id === duty.id);
    expect(dutyEvents).toHaveLength(1);
  });

  it('should clean up existing duplicate events', async () => {
    // Create a team member
    const teamMember = await TeamMember.create({
      name: 'Jane Smith',
      email: 'jane@example.com',
      company: 'Test Company'
    });

    // Create a duty
    const duty = await Duty.create({
      team_member_id: teamMember.id,
      type: 'on_call',
      title: 'Reporting',
      start_date: '2025-01-01',
      end_date: '2025-01-07'
    });

    // Manually create duplicate calendar events (simulating existing bug data)
    const event1 = await CalendarEvent.create({
      title: '📞 Reporting - Jane Smith',
      event_type: 'duty',
      duty_id: duty.id,
      team_member_id: teamMember.id,
      start_date: '2025-01-01',
      end_date: '2025-01-07',
      all_day: true,
      linked_entity_type: 'duty',
      linked_entity_id: duty.id
    });

    const event2 = await CalendarEvent.create({
      title: '📞 Reporting - Jane Smith (Duplicate)',
      event_type: 'duty',
      duty_id: duty.id,
      team_member_id: teamMember.id,
      start_date: '2025-01-01',
      end_date: '2025-01-07',
      all_day: true,
      linked_entity_type: 'duty',
      linked_entity_id: duty.id
    });

    // Verify duplicates exist
    let allEvents = await CalendarEvent.list();
    expect(allEvents).toHaveLength(2);

    // Run cleanup
    const cleanupResult = await CalendarEvent.cleanupDuplicateEvents();

    expect(cleanupResult.duplicatesRemoved).toBe(1);

    // Verify only one event remains
    allEvents = await CalendarEvent.list();
    expect(allEvents).toHaveLength(1);
    expect(allEvents[0].duty_id).toBe(duty.id);
  });

  it('should validate data consistency between duties and calendar events', async () => {
    // Create a team member
    const teamMember = await TeamMember.create({
      name: 'Bob Wilson',
      email: 'bob@example.com',
      company: 'Test Company'
    });

    // Create a duty
    const duty = await Duty.create({
      team_member_id: teamMember.id,
      type: 'devops',
      title: 'DevOps',
      start_date: '2025-01-01',
      end_date: '2025-01-07'
    });

    // Create orphaned calendar event (references non-existent duty)
    await CalendarEvent.create({
      title: 'Orphaned Event',
      event_type: 'duty',
      duty_id: 'non-existent-duty',
      team_member_id: teamMember.id,
      start_date: '2025-01-01',
      end_date: '2025-01-07',
      all_day: true
    });

    // Validate consistency
    const inconsistencies = await CalendarEvent.validateDutyEventConsistency();

    expect(inconsistencies).toHaveLength(2);
    
    // Should detect orphaned calendar event
    const orphanedEvent = inconsistencies.find(i => i.type === 'orphaned_calendar_event');
    expect(orphanedEvent).toBeDefined();
    expect(orphanedEvent.issue).toContain('non-existent-duty');

    // Should detect duty without calendar event
    const missingEvent = inconsistencies.find(i => i.type === 'missing_calendar_event');
    expect(missingEvent).toBeDefined();
    expect(missingEvent.duty.id).toBe(duty.id);
  });

  it('should handle end-to-end workflow without duplicates', async () => {
    // Create a team member
    const teamMember = await TeamMember.create({
      name: 'Alice Johnson',
      email: 'alice@example.com',
      company: 'Test Company'
    });

    // Create multiple duties
    const duty1 = await Duty.create({
      team_member_id: teamMember.id,
      type: 'devops',
      title: 'DevOps',
      start_date: '2025-01-01',
      end_date: '2025-01-07'
    });

    const duty2 = await Duty.create({
      team_member_id: teamMember.id,
      type: 'on_call',
      title: 'Reporting',
      start_date: '2025-01-08',
      end_date: '2025-01-14'
    });

    // Generate calendar events for all duties
    const events = await CalendarEventGenerationService.generateDutyEvents();

    expect(events).toHaveLength(2);

    // Verify each duty has exactly one calendar event
    const duty1Events = await CalendarEvent.getByDutyId(duty1.id);
    const duty2Events = await CalendarEvent.getByDutyId(duty2.id);

    expect(duty1Events).toHaveLength(1);
    expect(duty2Events).toHaveLength(1);

    // Run the generation again (should be idempotent)
    const eventsSecondRun = await CalendarEventGenerationService.generateDutyEvents();

    expect(eventsSecondRun).toHaveLength(2);

    // Verify still only one event per duty
    const allEvents = await CalendarEvent.list();
    expect(allEvents).toHaveLength(2);

    // Validate consistency
    const inconsistencies = await CalendarEvent.validateDutyEventConsistency();
    expect(inconsistencies).toHaveLength(0);
  });
});