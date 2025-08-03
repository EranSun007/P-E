// src/api/__tests__/duty-duplication-regression.test.js
// Comprehensive regression tests to prevent duty and calendar event duplication bugs

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { localClient } from '../localClient.js';
import { CalendarEvent } from '../entities.js';
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

describe('Duty Duplication Regression Tests', () => {
  let teamMember;

  beforeEach(async () => {
    localStorage.clear();
    
    // Initialize empty arrays for all entities
    localStorage.setItem('calendar_events', JSON.stringify([]));
    localStorage.setItem('duties', JSON.stringify([]));
    localStorage.setItem('team_members', JSON.stringify([]));
    localStorage.setItem('duty_rotations', JSON.stringify([]));

    // Create a test team member
    teamMember = await localClient.entities.TeamMember.create({
      name: 'Test User',
      email: 'test@example.com',
      role: 'Developer',
      company: 'Test Company'
    });
  });

  describe('Calendar Event Duplication Prevention', () => {
    it('should prevent 4x calendar event duplication bug', async () => {
      // Create a duty
      const duty = await localClient.entities.Duty.create({
        team_member_id: teamMember.id,
        type: 'devops',
        title: 'DevOps',
        description: 'Weekly DevOps duty',
        start_date: '2025-01-01',
        end_date: '2025-01-07'
      });

      // Simulate the bug scenario - multiple calendar event creation attempts
      const event1 = await CalendarEvent.createDutyEvent(
        duty.id, teamMember.id, 'DevOps - Test User', '2025-01-01', '2025-01-07', 'Weekly DevOps duty'
      );
      const event2 = await CalendarEvent.createDutyEvent(
        duty.id, teamMember.id, 'DevOps - Test User', '2025-01-01', '2025-01-07', 'Weekly DevOps duty'
      );
      const event3 = await CalendarEvent.createDutyEvent(
        duty.id, teamMember.id, 'DevOps - Test User', '2025-01-01', '2025-01-07', 'Weekly DevOps duty'
      );
      const event4 = await CalendarEvent.createDutyEvent(
        duty.id, teamMember.id, 'DevOps - Test User', '2025-01-01', '2025-01-07', 'Weekly DevOps duty'
      );

      // All calls should return the same event (idempotent)
      expect(event1.id).toBe(event2.id);
      expect(event2.id).toBe(event3.id);
      expect(event3.id).toBe(event4.id);

      // Verify only one calendar event exists
      const allEvents = await CalendarEvent.list();
      const dutyEvents = allEvents.filter(e => e.duty_id === duty.id);
      expect(dutyEvents).toHaveLength(1);
    });

    it('should handle concurrent calendar event creation attempts', async () => {
      const duty = await localClient.entities.Duty.create({
        team_member_id: teamMember.id,
        type: 'on_call',
        title: 'Reporting',
        start_date: '2025-01-01',
        end_date: '2025-01-07'
      });

      // Simulate concurrent creation attempts
      const promises = Array.from({ length: 10 }, () =>
        CalendarEvent.createDutyEvent(
          duty.id, teamMember.id, 'Reporting - Test User', '2025-01-01', '2025-01-07'
        )
      );

      const events = await Promise.all(promises);

      // All should return the same event (idempotent behavior)
      const firstEventId = events[0].id;
      events.forEach(event => {
        expect(event.id).toBe(firstEventId);
      });

      // Verify only one calendar event exists
      const allEvents = await CalendarEvent.list();
      const dutyEvents = allEvents.filter(e => e.duty_id === duty.id);
      expect(dutyEvents).toHaveLength(1);
    });

    it('should prevent duplication during bulk calendar event generation', async () => {
      // Create multiple duties
      const duties = await Promise.all([
        localClient.entities.Duty.create({
          team_member_id: teamMember.id,
          type: 'devops',
          title: 'DevOps',
          start_date: '2025-01-01',
          end_date: '2025-01-07'
        }),
        localClient.entities.Duty.create({
          team_member_id: teamMember.id,
          type: 'on_call',
          title: 'Reporting',
          start_date: '2025-01-08',
          end_date: '2025-01-14'
        }),
        localClient.entities.Duty.create({
          team_member_id: teamMember.id,
          type: 'other',
          title: 'Metering',
          start_date: '2025-01-15',
          end_date: '2025-01-21'
        })
      ]);

      // Run bulk generation multiple times
      await CalendarEventGenerationService.generateDutyEvents();
      await CalendarEventGenerationService.generateDutyEvents();
      await CalendarEventGenerationService.generateDutyEvents();

      // Verify each duty has exactly one calendar event
      const allEvents = await CalendarEvent.list();
      expect(allEvents).toHaveLength(3);

      for (const duty of duties) {
        const dutyEvents = allEvents.filter(e => e.duty_id === duty.id);
        expect(dutyEvents).toHaveLength(1);
      }
    });
  });

  describe('Duty Entry Duplication Prevention', () => {
    it('should prevent exact duty duplication regression', async () => {
      const dutyData = {
        team_member_id: teamMember.id,
        type: 'devops',
        title: 'DevOps',
        description: 'Weekly DevOps duty',
        start_date: '2025-01-01',
        end_date: '2025-01-07'
      };

      // Create first duty
      const firstDuty = await localClient.entities.Duty.create(dutyData);
      expect(firstDuty).toBeDefined();

      // Attempt to create exact duplicate - should fail
      await expect(localClient.entities.Duty.create(dutyData))
        .rejects.toThrow(/Duplicate duty detected/);

      // Verify only one duty exists
      const allDuties = await localClient.entities.Duty.list();
      expect(allDuties).toHaveLength(1);
    });

    it('should prevent overlapping duty periods regression', async () => {
      // Create first duty
      await localClient.entities.Duty.create({
        team_member_id: teamMember.id,
        type: 'devops',
        title: 'DevOps',
        start_date: '2025-01-01',
        end_date: '2025-01-07'
      });

      // Attempt to create overlapping duty of same type - should fail
      await expect(localClient.entities.Duty.create({
        team_member_id: teamMember.id,
        type: 'devops',
        title: 'DevOps',
        start_date: '2025-01-05', // Overlaps with existing
        end_date: '2025-01-12'
      })).rejects.toThrow(/Duty assignment conflicts with existing duties/);
    });

    it('should prevent update-induced duplication regression', async () => {
      // Create two non-conflicting duties
      const duty1 = await localClient.entities.Duty.create({
        team_member_id: teamMember.id,
        type: 'devops',
        title: 'DevOps',
        start_date: '2025-01-01',
        end_date: '2025-01-07'
      });

      const duty2 = await localClient.entities.Duty.create({
        team_member_id: teamMember.id,
        type: 'on_call',
        title: 'Reporting',
        start_date: '2025-01-08',
        end_date: '2025-01-14'
      });

      // Attempt to update duty2 to match duty1 exactly - should fail
      await expect(localClient.entities.Duty.update(duty2.id, {
        type: 'devops',
        title: 'DevOps',
        start_date: '2025-01-01',
        end_date: '2025-01-07'
      })).rejects.toThrow(/Duplicate duty detected/);
    });
  });

  describe('Data Consistency Regression', () => {
    it('should maintain duty-calendar event consistency', async () => {
      // Create duty
      const duty = await localClient.entities.Duty.create({
        team_member_id: teamMember.id,
        type: 'devops',
        title: 'DevOps',
        start_date: '2025-01-01',
        end_date: '2025-01-07'
      });

      // Generate calendar event
      await CalendarEventGenerationService.convertDutyToCalendarEvent(duty);

      // Validate consistency
      const inconsistencies = await CalendarEvent.validateDutyEventConsistency();
      expect(inconsistencies).toHaveLength(0);

      // Update duty and ensure calendar event is updated
      const updatedDuty = await localClient.entities.Duty.update(duty.id, {
        description: 'Updated description'
      });

      // Re-generate calendar event (should update existing)
      await CalendarEventGenerationService.convertDutyToCalendarEvent(updatedDuty);

      // Verify still only one calendar event
      const allEvents = await CalendarEvent.list();
      const dutyEvents = allEvents.filter(e => e.duty_id === duty.id);
      expect(dutyEvents).toHaveLength(1);

      // Verify consistency maintained
      const finalInconsistencies = await CalendarEvent.validateDutyEventConsistency();
      expect(finalInconsistencies).toHaveLength(0);
    });

    it('should handle duty deletion without orphaning calendar events', async () => {
      // Create duty and calendar event
      const duty = await localClient.entities.Duty.create({
        team_member_id: teamMember.id,
        type: 'devops',
        title: 'DevOps',
        start_date: '2025-01-01',
        end_date: '2025-01-07'
      });

      await CalendarEventGenerationService.convertDutyToCalendarEvent(duty);

      // Verify calendar event exists
      let allEvents = await CalendarEvent.list();
      expect(allEvents).toHaveLength(1);

      // Delete duty
      await localClient.entities.Duty.delete(duty.id);

      // Check for orphaned calendar events and clean them up if they exist
      const inconsistencies = await CalendarEvent.validateDutyEventConsistency();
      const orphanedEvents = inconsistencies.filter(i => i.type === 'orphaned_calendar_event');
      
      if (orphanedEvents.length > 0) {
        // Clean up orphaned events
        await CalendarEvent.cleanupDuplicateEvents();
      }

      // Final verification - should have no orphaned events
      const finalInconsistencies = await CalendarEvent.validateDutyEventConsistency();
      const finalOrphanedEvents = finalInconsistencies.filter(i => i.type === 'orphaned_calendar_event');
      expect(finalOrphanedEvents).toHaveLength(0);
    });
  });

  describe('Rotation Duplication Prevention', () => {
    it('should prevent duplicate rotation duties', async () => {
      // Create second team member for rotation
      const teamMember2 = await localClient.entities.TeamMember.create({
        name: 'Test User 2',
        email: 'test2@example.com',
        role: 'Developer',
        company: 'Test Company'
      });

      // Create rotation
      const rotation = await localClient.entities.DutyRotation.create({
        name: 'Test Rotation',
        type: 'DevOps',
        participants: [teamMember.id, teamMember2.id],
        cycle_weeks: 1,
        current_assignee_index: 0,
        is_active: true
      });

      // Create rotation duty
      const rotationDuty = await localClient.entities.Duty.create({
        team_member_id: teamMember.id,
        type: 'devops',
        title: 'DevOps',
        start_date: '2025-01-01',
        end_date: '2025-01-07',
        is_rotation: true,
        rotation_id: rotation.id,
        rotation_participants: 2,
        rotation_sequence: 0,
        rotation_cycle_weeks: 1
      });

      // Attempt to create duplicate rotation duty - should fail
      await expect(localClient.entities.Duty.create({
        team_member_id: teamMember.id,
        type: 'devops',
        title: 'DevOps',
        start_date: '2025-01-01',
        end_date: '2025-01-07',
        is_rotation: true,
        rotation_id: rotation.id,
        rotation_participants: 2,
        rotation_sequence: 0,
        rotation_cycle_weeks: 1
      })).rejects.toThrow(/Duplicate duty detected/);
    });

    it('should prevent overlapping rotation duties of same type', async () => {
      // Create second team member for rotation
      const teamMember2 = await localClient.entities.TeamMember.create({
        name: 'Test User 2',
        email: 'test2@example.com',
        role: 'Developer',
        company: 'Test Company'
      });

      const rotation = await localClient.entities.DutyRotation.create({
        name: 'Test Rotation',
        type: 'DevOps',
        participants: [teamMember.id, teamMember2.id],
        cycle_weeks: 1,
        current_assignee_index: 0,
        is_active: true
      });

      // Create first rotation duty
      await localClient.entities.Duty.create({
        team_member_id: teamMember.id,
        type: 'devops',
        title: 'DevOps',
        start_date: '2025-01-01',
        end_date: '2025-01-07',
        is_rotation: true,
        rotation_id: rotation.id,
        rotation_participants: 2,
        rotation_sequence: 0,
        rotation_cycle_weeks: 1
      });

      // Attempt to create overlapping rotation duty - should fail
      await expect(localClient.entities.Duty.create({
        team_member_id: teamMember.id,
        type: 'devops',
        title: 'DevOps',
        start_date: '2025-01-05', // Overlaps
        end_date: '2025-01-12',
        is_rotation: true,
        rotation_id: rotation.id,
        rotation_participants: 2,
        rotation_sequence: 1,
        rotation_cycle_weeks: 1
      })).rejects.toThrow(/Duty assignment conflicts with existing duties/);
    });
  });

  describe('Performance Regression Prevention', () => {
    it('should handle large numbers of duties without performance degradation', async () => {
      const startTime = Date.now();

      // Create many duties with non-overlapping dates
      const duties = [];
      for (let i = 0; i < 50; i++) {
        const startDay = (i * 2) + 1; // Each duty gets 2 days, non-overlapping
        const endDay = startDay + 1;
        const duty = await localClient.entities.Duty.create({
          team_member_id: teamMember.id,
          type: i % 3 === 0 ? 'devops' : i % 3 === 1 ? 'on_call' : 'other',
          title: i % 3 === 0 ? 'DevOps' : i % 3 === 1 ? 'Reporting' : 'Metering',
          start_date: `2025-${String(Math.floor(startDay / 30) + 1).padStart(2, '0')}-${String((startDay % 30) + 1).padStart(2, '0')}`,
          end_date: `2025-${String(Math.floor(endDay / 30) + 1).padStart(2, '0')}-${String((endDay % 30) + 1).padStart(2, '0')}`
        });
        duties.push(duty);
      }

      const creationTime = Date.now() - startTime;

      // Test duplicate detection performance
      const duplicateTestStart = Date.now();
      
      try {
        await localClient.entities.Duty.create({
          team_member_id: teamMember.id,
          type: 'devops',
          title: 'DevOps',
          start_date: '2025-01-01',
          end_date: '2025-01-01'
        });
        expect.fail('Should have detected duplicate');
      } catch (error) {
        expect(error.message).toContain('Duplicate duty detected');
      }

      const duplicateTestTime = Date.now() - duplicateTestStart;

      // Performance assertions (should complete within reasonable time)
      expect(creationTime).toBeLessThan(10000); // 10 seconds
      expect(duplicateTestTime).toBeLessThan(1000); // 1 second

      // Verify all duties were created
      const allDuties = await localClient.entities.Duty.list();
      expect(allDuties).toHaveLength(50);
    });

    it('should handle bulk calendar event generation efficiently', async () => {
      // Create many duties with non-overlapping dates
      const duties = [];
      for (let i = 0; i < 20; i++) {
        const startDay = (i * 2) + 1; // Each duty gets 2 days, non-overlapping
        const endDay = startDay + 1;
        const duty = await localClient.entities.Duty.create({
          team_member_id: teamMember.id,
          type: 'devops',
          title: 'DevOps',
          start_date: `2025-01-${String(startDay).padStart(2, '0')}`,
          end_date: `2025-01-${String(endDay).padStart(2, '0')}`
        });
        duties.push(duty);
      }

      const startTime = Date.now();

      // Generate calendar events
      await CalendarEventGenerationService.generateDutyEvents();

      const generationTime = Date.now() - startTime;

      // Performance assertion
      expect(generationTime).toBeLessThan(5000); // 5 seconds

      // Verify all calendar events were created
      const allEvents = await CalendarEvent.list();
      expect(allEvents).toHaveLength(20);

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
    });
  });
});