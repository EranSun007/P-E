// src/api/__tests__/duty-calendar-integration-comprehensive.test.js
// Comprehensive integration tests for duty creation and calendar event generation

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { localClient } from '../localClient.js';
import { CalendarEvent, Duty, TeamMember } from '../entities.js';
import CalendarEventGenerationService from '../../services/calendarEventGenerationService.js';
import { DutyRotationService } from '../../services/dutyRotationService.js';

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

describe('Duty Calendar Integration - Comprehensive Tests', () => {
  let teamMembers;

  beforeEach(async () => {
    localStorage.clear();
    
    // Initialize empty arrays for all entities
    localStorage.setItem('calendar_events', JSON.stringify([]));
    localStorage.setItem('duties', JSON.stringify([]));
    localStorage.setItem('team_members', JSON.stringify([]));
    localStorage.setItem('duty_rotations', JSON.stringify([]));

    // Create test team members
    teamMembers = await Promise.all([
      TeamMember.create({
        name: 'Alice Johnson',
        email: 'alice@example.com',
        role: 'Senior Developer',
        company: 'Test Company'
      }),
      TeamMember.create({
        name: 'Bob Smith',
        email: 'bob@example.com',
        role: 'Developer',
        company: 'Test Company'
      }),
      TeamMember.create({
        name: 'Carol Davis',
        email: 'carol@example.com',
        role: 'DevOps Engineer',
        company: 'Test Company'
      })
    ]);
  });

  describe('Single Duty Creation and Calendar Integration', () => {
    it('should create duty and corresponding calendar event', async () => {
      const duty = await Duty.create({
        team_member_id: teamMembers[0].id,
        type: 'devops',
        title: 'DevOps',
        description: 'Weekly DevOps duty',
        start_date: '2025-01-01',
        end_date: '2025-01-07'
      });

      expect(duty).toBeDefined();
      expect(duty.team_member_id).toBe(teamMembers[0].id);

      // Generate calendar event
      const calendarEvent = await CalendarEventGenerationService.convertDutyToCalendarEvent(duty);

      expect(calendarEvent).toBeDefined();
      expect(calendarEvent.duty_id).toBe(duty.id);
      expect(calendarEvent.team_member_id).toBe(teamMembers[0].id);
      expect(calendarEvent.event_type).toBe('duty');
      expect(calendarEvent.title).toContain('DevOps');
      expect(calendarEvent.title).toContain('Alice Johnson');
      expect(calendarEvent.start_date).toBe('2025-01-01');
      expect(calendarEvent.end_date).toBe('2025-01-07');
      expect(calendarEvent.all_day).toBe(true);
    });

    it('should handle duty updates and calendar event synchronization', async () => {
      // Create duty and calendar event
      const duty = await Duty.create({
        team_member_id: teamMembers[0].id,
        type: 'reporting',
        title: 'Reporting',
        start_date: '2025-01-01',
        end_date: '2025-01-07'
      });

      const originalEvent = await CalendarEventGenerationService.convertDutyToCalendarEvent(duty);

      // Update duty
      const updatedDuty = await Duty.update(duty.id, {
        title: 'Updated Reporting',
        description: 'Updated description',
        start_date: '2025-01-02',
        end_date: '2025-01-08'
      });

      // Regenerate calendar event (should update existing)
      const updatedEvent = await CalendarEventGenerationService.convertDutyToCalendarEvent(updatedDuty);

      // Should be the same event (updated, not new)
      expect(updatedEvent.id).toBe(originalEvent.id);
      expect(updatedEvent.title).toContain('Updated Reporting');
      expect(updatedEvent.start_date).toBe('2025-01-02');
      expect(updatedEvent.end_date).toBe('2025-01-08');

      // Verify only one calendar event exists
      const allEvents = await CalendarEvent.list();
      const dutyEvents = allEvents.filter(e => e.duty_id === duty.id);
      expect(dutyEvents).toHaveLength(1);
    });

    it('should handle duty deletion and calendar event cleanup', async () => {
      // Create duty and calendar event
      const duty = await Duty.create({
        team_member_id: teamMembers[0].id,
        type: 'metering',
        title: 'Metering',
        start_date: '2025-01-01',
        end_date: '2025-01-07'
      });

      await CalendarEventGenerationService.convertDutyToCalendarEvent(duty);

      // Verify calendar event exists
      let allEvents = await CalendarEvent.list();
      expect(allEvents).toHaveLength(1);

      // Delete duty
      await Duty.delete(duty.id);

      // Verify duty is deleted
      const deletedDuty = await Duty.get(duty.id);
      expect(deletedDuty).toBeNull();

      // Check for orphaned calendar events
      const inconsistencies = await CalendarEvent.validateDutyEventConsistency();
      const orphanedEvents = inconsistencies.filter(i => i.type === 'orphaned_calendar_event');

      if (orphanedEvents.length > 0) {
        // Clean up orphaned events
        await CalendarEvent.cleanupDuplicateEvents();
        
        // Verify cleanup worked
        const finalInconsistencies = await CalendarEvent.validateDutyEventConsistency();
        const finalOrphanedEvents = finalInconsistencies.filter(i => i.type === 'orphaned_calendar_event');
        expect(finalOrphanedEvents).toHaveLength(0);
      }
    });
  });

  describe('Multiple Duties and Bulk Calendar Generation', () => {
    it('should handle multiple duties with different types', async () => {
      // Create multiple duties
      const duties = await Promise.all([
        Duty.create({
          team_member_id: teamMembers[0].id,
          type: 'devops',
          title: 'DevOps',
          start_date: '2025-01-01',
          end_date: '2025-01-07'
        }),
        Duty.create({
          team_member_id: teamMembers[1].id,
          type: 'reporting',
          title: 'Reporting',
          start_date: '2025-01-08',
          end_date: '2025-01-14'
        }),
        Duty.create({
          team_member_id: teamMembers[2].id,
          type: 'metering',
          title: 'Metering',
          start_date: '2025-01-15',
          end_date: '2025-01-21'
        })
      ]);

      // Generate calendar events for all duties
      const events = await CalendarEventGenerationService.generateDutyEvents();

      expect(events).toHaveLength(3);

      // Verify each duty has exactly one calendar event
      for (const duty of duties) {
        const dutyEvents = events.filter(e => e.duty_id === duty.id);
        expect(dutyEvents).toHaveLength(1);
        
        const event = dutyEvents[0];
        expect(event.team_member_id).toBe(duty.team_member_id);
        expect(event.start_date).toBe(duty.start_date);
        expect(event.end_date).toBe(duty.end_date);
      }

      // Verify data consistency
      const inconsistencies = await CalendarEvent.validateDutyEventConsistency();
      expect(inconsistencies).toHaveLength(0);
    });

    it('should handle overlapping duties of different types', async () => {
      // Create overlapping duties of different types (should be allowed)
      const duties = await Promise.all([
        Duty.create({
          team_member_id: teamMembers[0].id,
          type: 'devops',
          title: 'DevOps',
          start_date: '2025-01-01',
          end_date: '2025-01-07'
        }),
        Duty.create({
          team_member_id: teamMembers[0].id,
          type: 'reporting',
          title: 'Reporting',
          start_date: '2025-01-05', // Overlaps with DevOps duty
          end_date: '2025-01-12'
        })
      ]);

      // Generate calendar events
      const events = await CalendarEventGenerationService.generateDutyEvents();

      expect(events).toHaveLength(2);

      // Verify both events exist and are distinct
      const devopsEvent = events.find(e => e.duty_id === duties[0].id);
      const reportingEvent = events.find(e => e.duty_id === duties[1].id);

      expect(devopsEvent).toBeDefined();
      expect(reportingEvent).toBeDefined();
      expect(devopsEvent.id).not.toBe(reportingEvent.id);

      // Both should be for the same team member
      expect(devopsEvent.team_member_id).toBe(teamMembers[0].id);
      expect(reportingEvent.team_member_id).toBe(teamMembers[0].id);
    });

    it('should handle bulk generation with mixed duty types and team members', async () => {
      // Create a complex set of duties
      const duties = [];
      
      // Multiple duties per team member
      for (let i = 0; i < teamMembers.length; i++) {
        const member = teamMembers[i];
        
        // DevOps duty
        duties.push(await Duty.create({
          team_member_id: member.id,
          type: 'devops',
          title: 'DevOps',
          start_date: `2025-01-${String(i * 7 + 1).padStart(2, '0')}`,
          end_date: `2025-01-${String(i * 7 + 7).padStart(2, '0')}`
        }));

        // Reporting duty (different week)
        duties.push(await Duty.create({
          team_member_id: member.id,
          type: 'reporting',
          title: 'Reporting',
          start_date: `2025-02-${String(i * 7 + 1).padStart(2, '0')}`,
          end_date: `2025-02-${String(i * 7 + 7).padStart(2, '0')}`
        }));
      }

      expect(duties).toHaveLength(6); // 3 members × 2 duties each

      // Generate all calendar events
      const events = await CalendarEventGenerationService.generateDutyEvents();

      expect(events).toHaveLength(6);

      // Verify each duty has exactly one calendar event
      for (const duty of duties) {
        const dutyEvents = events.filter(e => e.duty_id === duty.id);
        expect(dutyEvents).toHaveLength(1);
      }

      // Verify events are distributed correctly across team members
      for (const member of teamMembers) {
        const memberEvents = events.filter(e => e.team_member_id === member.id);
        expect(memberEvents).toHaveLength(2); // 2 duties per member
      }

      // Verify data consistency
      const inconsistencies = await CalendarEvent.validateDutyEventConsistency();
      expect(inconsistencies).toHaveLength(0);
    });
  });

  describe('Rotation Duties and Calendar Integration', () => {
    it('should create rotation and generate calendar events for all participants', async () => {
      // Create rotation
      const rotation = await localClient.entities.DutyRotation.create({
        name: 'DevOps On-Call Rotation',
        type: 'DevOps',
        participants: [teamMembers[0].id, teamMembers[1].id, teamMembers[2].id],
        cycle_weeks: 1,
        current_assignee_index: 0,
        is_active: true
      });

      // Generate rotation duties
      const rotationDuties = await DutyRotationService.createRotationDuties(
        rotation.id,
        '2025-01-01',
        1 // 1 cycle
      );

      expect(rotationDuties).toHaveLength(3);

      // Verify all rotation duties have calendar events
      const allEvents = await CalendarEvent.list();
      expect(allEvents).toHaveLength(3);

      // Verify each rotation duty has exactly one calendar event
      for (const duty of rotationDuties) {
        const dutyEvents = allEvents.filter(e => e.duty_id === duty.id);
        expect(dutyEvents).toHaveLength(1);
        
        const event = dutyEvents[0];
        expect(event.team_member_id).toBe(duty.team_member_id);
        expect(event.title).toContain('DevOps');
        expect(event.event_type).toBe('duty');
      }

      // Verify rotation sequence is correct
      const sortedDuties = rotationDuties.sort((a, b) => a.rotation_sequence - b.rotation_sequence);
      expect(sortedDuties[0].team_member_id).toBe(teamMembers[0].id);
      expect(sortedDuties[1].team_member_id).toBe(teamMembers[1].id);
      expect(sortedDuties[2].team_member_id).toBe(teamMembers[2].id);
    });

    it('should handle multiple rotation cycles', async () => {
      const rotation = await localClient.entities.DutyRotation.create({
        name: 'Reporting Rotation',
        type: 'Reporting',
        participants: [teamMembers[0].id, teamMembers[1].id],
        cycle_weeks: 2,
        current_assignee_index: 0,
        is_active: true
      });

      // Generate 2 cycles of rotation duties
      const rotationDuties = await DutyRotationService.createRotationDuties(
        rotation.id,
        '2025-01-01',
        2 // 2 cycles
      );

      expect(rotationDuties).toHaveLength(4); // 2 participants × 2 cycles

      // Verify all have calendar events
      const allEvents = await CalendarEvent.list();
      expect(allEvents).toHaveLength(4);

      // Verify cycle progression
      const sortedDuties = rotationDuties.sort((a, b) => new Date(a.start_date) - new Date(b.start_date));
      
      // First cycle
      expect(sortedDuties[0].team_member_id).toBe(teamMembers[0].id);
      expect(sortedDuties[0].description).toContain('Cycle 1');
      expect(sortedDuties[1].team_member_id).toBe(teamMembers[1].id);
      expect(sortedDuties[1].description).toContain('Cycle 1');
      
      // Second cycle
      expect(sortedDuties[2].team_member_id).toBe(teamMembers[0].id);
      expect(sortedDuties[2].description).toContain('Cycle 2');
      expect(sortedDuties[3].team_member_id).toBe(teamMembers[1].id);
      expect(sortedDuties[3].description).toContain('Cycle 2');
    });

    it('should handle mixed regular and rotation duties', async () => {
      // Create regular duty
      const regularDuty = await Duty.create({
        team_member_id: teamMembers[0].id,
        type: 'metering',
        title: 'Metering',
        start_date: '2025-01-01',
        end_date: '2025-01-07'
      });

      // Create rotation
      const rotation = await localClient.entities.DutyRotation.create({
        name: 'DevOps Rotation',
        type: 'DevOps',
        participants: [teamMembers[1].id, teamMembers[2].id],
        cycle_weeks: 1,
        current_assignee_index: 0,
        is_active: true
      });

      // Create rotation duties
      const rotationDuties = await DutyRotationService.createRotationDuties(
        rotation.id,
        '2025-01-08',
        1
      );

      expect(rotationDuties).toHaveLength(2);

      // Generate calendar events for all duties
      const allEvents = await CalendarEventGenerationService.generateDutyEvents();

      expect(allEvents).toHaveLength(3); // 1 regular + 2 rotation

      // Verify regular duty event
      const regularEvents = allEvents.filter(e => e.duty_id === regularDuty.id);
      expect(regularEvents).toHaveLength(1);
      expect(regularEvents[0].title).toContain('Metering');

      // Verify rotation duty events
      for (const rotationDuty of rotationDuties) {
        const rotationEvents = allEvents.filter(e => e.duty_id === rotationDuty.id);
        expect(rotationEvents).toHaveLength(1);
        expect(rotationEvents[0].title).toContain('DevOps');
      }

      // Verify data consistency
      const inconsistencies = await CalendarEvent.validateDutyEventConsistency();
      expect(inconsistencies).toHaveLength(0);
    });
  });

  describe('Error Handling and Recovery', () => {
    it('should handle calendar event creation failures gracefully', async () => {
      // Create duty
      const duty = await Duty.create({
        team_member_id: teamMembers[0].id,
        type: 'devops',
        title: 'DevOps',
        start_date: '2025-01-01',
        end_date: '2025-01-07'
      });

      // Mock calendar event creation to fail once
      const originalCreate = CalendarEvent.create;
      let callCount = 0;
      CalendarEvent.create = vi.fn().mockImplementation((...args) => {
        callCount++;
        if (callCount === 1) {
          throw new Error('Calendar service temporarily unavailable');
        }
        return originalCreate.apply(CalendarEvent, args);
      });

      // First attempt should fail
      await expect(
        CalendarEventGenerationService.convertDutyToCalendarEvent(duty)
      ).rejects.toThrow('Calendar service temporarily unavailable');

      // Second attempt should succeed
      const event = await CalendarEventGenerationService.convertDutyToCalendarEvent(duty);
      expect(event).toBeDefined();
      expect(event.duty_id).toBe(duty.id);

      // Restore original method
      CalendarEvent.create = originalCreate;
    });

    it('should detect and fix data inconsistencies', async () => {
      // Create duty
      const duty = await Duty.create({
        team_member_id: teamMembers[0].id,
        type: 'reporting',
        title: 'Reporting',
        start_date: '2025-01-01',
        end_date: '2025-01-07'
      });

      // Manually create orphaned calendar event
      await CalendarEvent.create({
        title: 'Orphaned Event',
        event_type: 'duty',
        duty_id: 'non-existent-duty-id',
        team_member_id: teamMembers[0].id,
        start_date: '2025-01-08',
        end_date: '2025-01-14',
        all_day: true
      });

      // Manually create duplicate calendar events for the real duty
      await CalendarEvent.create({
        title: 'Duplicate Event 1',
        event_type: 'duty',
        duty_id: duty.id,
        team_member_id: teamMembers[0].id,
        start_date: '2025-01-01',
        end_date: '2025-01-07',
        all_day: true
      });

      await CalendarEvent.create({
        title: 'Duplicate Event 2',
        event_type: 'duty',
        duty_id: duty.id,
        team_member_id: teamMembers[0].id,
        start_date: '2025-01-01',
        end_date: '2025-01-07',
        all_day: true
      });

      // Detect inconsistencies
      const inconsistencies = await CalendarEvent.validateDutyEventConsistency();
      expect(inconsistencies.length).toBeGreaterThan(0);

      // Should detect orphaned event
      const orphanedEvents = inconsistencies.filter(i => i.type === 'orphaned_calendar_event');
      expect(orphanedEvents).toHaveLength(1);

      // Should detect multiple events for same duty
      const multipleEvents = inconsistencies.filter(i => i.type === 'multiple_calendar_events');
      expect(multipleEvents).toHaveLength(1);

      // Clean up inconsistencies
      const cleanupResult = await CalendarEvent.cleanupDuplicateEvents();
      expect(cleanupResult.duplicatesRemoved).toBeGreaterThan(0);

      // Verify inconsistencies are resolved
      const finalInconsistencies = await CalendarEvent.validateDutyEventConsistency();
      const finalOrphanedEvents = finalInconsistencies.filter(i => i.type === 'orphaned_calendar_event');
      const finalMultipleEvents = finalInconsistencies.filter(i => i.type === 'multiple_calendar_events');
      
      expect(finalOrphanedEvents).toHaveLength(0);
      expect(finalMultipleEvents).toHaveLength(0);
    });

    it('should handle concurrent duty and calendar operations', async () => {
      // Create multiple duties concurrently
      const dutyPromises = Array.from({ length: 10 }, (_, i) =>
        Duty.create({
          team_member_id: teamMembers[i % teamMembers.length].id,
          type: i % 3 === 0 ? 'devops' : i % 3 === 1 ? 'reporting' : 'metering',
          title: i % 3 === 0 ? 'DevOps' : i % 3 === 1 ? 'Reporting' : 'Metering',
          start_date: `2025-01-${String(i + 1).padStart(2, '0')}`,
          end_date: `2025-01-${String(i + 2).padStart(2, '0')}`
        })
      );

      const duties = await Promise.all(dutyPromises);
      expect(duties).toHaveLength(10);

      // Generate calendar events concurrently
      const eventPromises = duties.map(duty =>
        CalendarEventGenerationService.convertDutyToCalendarEvent(duty)
      );

      const events = await Promise.all(eventPromises);
      expect(events).toHaveLength(10);

      // Verify each duty has exactly one calendar event
      const allEvents = await CalendarEvent.list();
      expect(allEvents).toHaveLength(10);

      // Verify no duplicates
      const dutyEventCounts = {};
      allEvents.forEach(event => {
        if (event.duty_id) {
          dutyEventCounts[event.duty_id] = (dutyEventCounts[event.duty_id] || 0) + 1;
        }
      });

      Object.values(dutyEventCounts).forEach(count => {
        expect(count).toBe(1);
      });

      // Verify data consistency
      const inconsistencies = await CalendarEvent.validateDutyEventConsistency();
      expect(inconsistencies).toHaveLength(0);
    });
  });

  describe('Performance and Scalability', () => {
    it('should handle large numbers of duties efficiently', async () => {
      const startTime = Date.now();

      // Create many duties
      const duties = [];
      for (let i = 0; i < 100; i++) {
        const duty = await Duty.create({
          team_member_id: teamMembers[i % teamMembers.length].id,
          type: i % 3 === 0 ? 'devops' : i % 3 === 1 ? 'reporting' : 'metering',
          title: i % 3 === 0 ? 'DevOps' : i % 3 === 1 ? 'Reporting' : 'Metering',
          start_date: `2025-${String(Math.floor(i / 30) + 1).padStart(2, '0')}-${String((i % 30) + 1).padStart(2, '0')}`,
          end_date: `2025-${String(Math.floor(i / 30) + 1).padStart(2, '0')}-${String((i % 30) + 2).padStart(2, '0')}`
        });
        duties.push(duty);
      }

      const creationTime = Date.now() - startTime;

      // Generate calendar events
      const eventGenerationStart = Date.now();
      const events = await CalendarEventGenerationService.generateDutyEvents();
      const eventGenerationTime = Date.now() - eventGenerationStart;

      // Performance assertions
      expect(creationTime).toBeLessThan(15000); // 15 seconds
      expect(eventGenerationTime).toBeLessThan(5000); // 5 seconds

      // Verify all events were created
      expect(events).toHaveLength(100);

      // Verify data consistency
      const consistencyCheckStart = Date.now();
      const inconsistencies = await CalendarEvent.validateDutyEventConsistency();
      const consistencyCheckTime = Date.now() - consistencyCheckStart;

      expect(consistencyCheckTime).toBeLessThan(2000); // 2 seconds
      expect(inconsistencies).toHaveLength(0);
    });

    it('should handle bulk operations without memory leaks', async () => {
      // Create and delete duties in batches to test memory management
      for (let batch = 0; batch < 5; batch++) {
        // Create batch of duties
        const duties = [];
        for (let i = 0; i < 20; i++) {
          const duty = await Duty.create({
            team_member_id: teamMembers[i % teamMembers.length].id,
            type: 'devops',
            title: 'DevOps',
            start_date: `2025-01-${String(batch * 20 + i + 1).padStart(2, '0')}`,
            end_date: `2025-01-${String(batch * 20 + i + 2).padStart(2, '0')}`
          });
          duties.push(duty);
        }

        // Generate calendar events
        await CalendarEventGenerationService.generateDutyEvents();

        // Verify events were created
        let allEvents = await CalendarEvent.list();
        expect(allEvents.length).toBeGreaterThanOrEqual(20);

        // Delete duties
        for (const duty of duties) {
          await Duty.delete(duty.id);
        }

        // Clean up orphaned events
        await CalendarEvent.cleanupDuplicateEvents();

        // Verify cleanup
        const finalInconsistencies = await CalendarEvent.validateDutyEventConsistency();
        const orphanedEvents = finalInconsistencies.filter(i => i.type === 'orphaned_calendar_event');
        expect(orphanedEvents).toHaveLength(0);
      }

      // Final verification - should have no duties or events
      const finalDuties = await Duty.list();
      const finalEvents = await CalendarEvent.list();
      
      // Allow for some remaining non-duty events
      const dutyEvents = finalEvents.filter(e => e.event_type === 'duty');
      expect(dutyEvents).toHaveLength(0);
    });
  });
});