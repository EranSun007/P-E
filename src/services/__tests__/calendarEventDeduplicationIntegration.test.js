// src/services/__tests__/calendarEventDeduplicationIntegration.test.js
// Integration test for the complete calendar event deduplication workflow

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CalendarEventDeduplicationService } from '../calendarEventDeduplicationService.js';
import { CalendarEvent, Duty, TeamMember } from '../../api/entities.js';

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

describe('Calendar Event Deduplication Integration', () => {
  beforeEach(() => {
    localStorage.clear();
    // Initialize empty arrays for all entities
    localStorage.setItem('calendar_events', JSON.stringify([]));
    localStorage.setItem('duties', JSON.stringify([]));
    localStorage.setItem('team_members', JSON.stringify([]));
  });

  it('should perform complete cleanup workflow with real data', async () => {
    // Setup: Create team member
    const teamMember = await TeamMember.create({
      name: 'John Doe',
      email: 'john@example.com',
      company: 'Test Company'
    });

    // Setup: Create duties
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

    // Setup: Create duplicate calendar events manually (simulating the bug)
    await CalendarEvent.create({
      title: 'DevOps - John Doe',
      event_type: 'duty',
      duty_id: duty1.id,
      start_date: '2025-01-01',
      end_date: '2025-01-07',
      all_day: true
    });

    await CalendarEvent.create({
      title: 'DevOps - John Doe (Duplicate)',
      event_type: 'duty',
      duty_id: duty1.id,
      start_date: '2025-01-01',
      end_date: '2025-01-07',
      all_day: true
    });

    // Setup: Create orphaned calendar event
    await CalendarEvent.create({
      title: 'Orphaned Event',
      event_type: 'duty',
      duty_id: 'non-existent-duty',
      start_date: '2025-01-15',
      end_date: '2025-01-21',
      all_day: true
    });

    // Verify initial state
    let allEvents = await CalendarEvent.list();
    expect(allEvents).toHaveLength(3);

    // Step 1: Get cleanup statistics
    const stats = await CalendarEventDeduplicationService.getCleanupStatistics();
    expect(stats.duplicatesFound).toBe(1);
    expect(stats.consistencyIssues).toBe(3); // 1 orphaned event + 1 missing event for duty2 + 1 multiple events for duty1

    // Step 2: Perform dry run cleanup
    const dryRunResult = await CalendarEventDeduplicationService.runCleanup({
      dryRun: true,
      verbose: false
    });

    expect(dryRunResult.dryRun).toBe(true);
    expect(dryRunResult.deduplication.duplicatesFound).toBe(1);
    expect(dryRunResult.consistency.totalIssues).toBe(3);
    expect(dryRunResult.summary.totalIssuesResolved).toBe(0); // No changes in dry run

    // Verify no changes were made
    allEvents = await CalendarEvent.list();
    expect(allEvents).toHaveLength(3);

    // Step 3: Perform live cleanup
    const liveResult = await CalendarEventDeduplicationService.runCleanup({
      dryRun: false,
      verbose: false
    });

    expect(liveResult.dryRun).toBe(false);
    expect(liveResult.deduplication.duplicatesFound).toBe(1);
    expect(liveResult.summary.totalIssuesResolved).toBe(1); // Duplicates removed

    // Verify duplicates were removed
    allEvents = await CalendarEvent.list();
    expect(allEvents).toHaveLength(2); // 1 duty event + 1 orphaned event

    // Step 4: Fix consistency issues
    const fixResult = await CalendarEventDeduplicationService.fixConsistencyIssues(
      liveResult.consistency.details,
      { dryRun: false, verbose: false }
    );

    expect(fixResult.fixed).toHaveLength(1); // Orphaned event removed
    expect(fixResult.skipped).toHaveLength(1); // Missing event skipped

    // Verify orphaned event was removed
    allEvents = await CalendarEvent.list();
    expect(allEvents).toHaveLength(1); // Only the valid duty event remains

    // Step 5: Final validation
    const finalStats = await CalendarEventDeduplicationService.getCleanupStatistics();
    expect(finalStats.duplicatesFound).toBe(0);
    expect(finalStats.consistencyIssues).toBe(1); // Only the missing event for duty2 remains
  });

  it('should handle empty data gracefully', async () => {
    const result = await CalendarEventDeduplicationService.runCleanup({
      dryRun: true,
      verbose: false
    });

    expect(result.deduplication.duplicatesFound).toBe(0);
    expect(result.consistency.totalIssues).toBe(0);
    expect(result.summary.status).toBe('completed');
  });

  it('should provide detailed reporting for complex scenarios', async () => {
    // Create multiple team members
    const teamMember1 = await TeamMember.create({
      name: 'Alice Smith',
      email: 'alice@example.com'
    });

    const teamMember2 = await TeamMember.create({
      name: 'Bob Johnson',
      email: 'bob@example.com'
    });

    // Create duties with various issues
    const duty1 = await Duty.create({
      team_member_id: teamMember1.id,
      type: 'devops',
      title: 'DevOps',
      start_date: '2025-01-01',
      end_date: '2025-01-07'
    });

    const duty2 = await Duty.create({
      team_member_id: teamMember2.id,
      type: 'on_call',
      title: 'Reporting',
      start_date: '2025-01-08',
      end_date: '2025-01-14'
    });

    // Create multiple duplicates for duty1
    for (let i = 0; i < 3; i++) {
      await CalendarEvent.create({
        title: `DevOps - Alice Smith (${i + 1})`,
        event_type: 'duty',
        duty_id: duty1.id,
        start_date: '2025-01-01',
        end_date: '2025-01-07',
        all_day: true
      });
    }

    // Create multiple duplicates for duty2
    for (let i = 0; i < 2; i++) {
      await CalendarEvent.create({
        title: `Reporting - Bob Johnson (${i + 1})`,
        event_type: 'duty',
        duty_id: duty2.id,
        start_date: '2025-01-08',
        end_date: '2025-01-14',
        all_day: true
      });
    }

    // Run cleanup
    const result = await CalendarEventDeduplicationService.runCleanup({
      dryRun: false,
      verbose: false
    });

    expect(result.deduplication.duplicatesFound).toBe(3); // 2 for duty1 + 1 for duty2
    expect(result.consistency.totalIssues).toBe(0); // After cleanup, no consistency issues remain

    // Verify final state
    const allEvents = await CalendarEvent.list();
    expect(allEvents).toHaveLength(2); // One event per duty

    const duty1Events = allEvents.filter(e => e.duty_id === duty1.id);
    const duty2Events = allEvents.filter(e => e.duty_id === duty2.id);
    expect(duty1Events).toHaveLength(1);
    expect(duty2Events).toHaveLength(1);
  });
});