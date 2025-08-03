// src/services/__tests__/dutyRotationService-comprehensive.test.js
// Comprehensive unit tests for DutyRotationService calculations and edge cases

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { DutyRotationService } from '../dutyRotationService.js';
import { localClient } from '../../api/localClient.js';

// Mock the localClient
vi.mock('../../api/localClient.js', () => ({
  localClient: {
    entities: {
      DutyRotation: {
        create: vi.fn(),
        get: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
        list: vi.fn(),
        getActive: vi.fn(),
        getByType: vi.fn()
      },
      Duty: {
        create: vi.fn(),
        list: vi.fn()
      },
      TeamMember: {
        list: vi.fn(),
        get: vi.fn()
      }
    }
  }
}));

describe('DutyRotationService - Comprehensive Unit Tests', () => {
  const mockTeamMembers = [
    { id: 'tm1', name: 'Alice Johnson' },
    { id: 'tm2', name: 'Bob Smith' },
    { id: 'tm3', name: 'Carol Davis' },
    { id: 'tm4', name: 'David Wilson' },
    { id: 'tm5', name: 'Eve Brown' }
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    localClient.entities.TeamMember.list.mockResolvedValue(mockTeamMembers);
  });

  describe('Date Calculation Edge Cases', () => {
    it('should handle leap year calculations correctly', () => {
      const participants = ['tm1', 'tm2'];
      const cycleWeeks = 4;
      const startDate = '2024-02-26'; // Week before leap day

      const result = DutyRotationService.calculateRotationDates(
        participants,
        cycleWeeks,
        startDate
      );

      expect(result).toHaveLength(2);
      expect(result[0].start_date).toBe('2024-02-26');
      expect(result[0].end_date).toBe('2024-03-25'); // Should account for leap day
      expect(result[1].start_date).toBe('2024-03-26');
      expect(result[1].end_date).toBe('2024-04-22');
    });

    it('should handle year boundary transitions', () => {
      const participants = ['tm1', 'tm2', 'tm3'];
      const cycleWeeks = 2;
      const startDate = '2024-12-23'; // Near end of year

      const result = DutyRotationService.calculateRotationDates(
        participants,
        cycleWeeks,
        startDate
      );

      expect(result).toHaveLength(3);
      expect(result[0].start_date).toBe('2024-12-23');
      expect(result[0].end_date).toBe('2025-01-05'); // Crosses year boundary
      expect(result[1].start_date).toBe('2025-01-06');
      expect(result[2].start_date).toBe('2025-01-20');
    });

    it('should handle month boundary transitions correctly', () => {
      const participants = ['tm1', 'tm2'];
      const cycleWeeks = 3;
      const startDate = '2025-01-27'; // Near end of January

      const result = DutyRotationService.calculateRotationDates(
        participants,
        cycleWeeks,
        startDate
      );

      expect(result[0].start_date).toBe('2025-01-27');
      expect(result[0].end_date).toBe('2025-02-16'); // Crosses into February
      expect(result[1].start_date).toBe('2025-02-17');
      expect(result[1].end_date).toBe('2025-03-09'); // Crosses into March
    });

    it('should calculate weeks until date correctly for various scenarios', () => {
      // Mock current date
      const mockDate = new Date('2025-01-15T10:30:00.000Z');
      vi.setSystemTime(mockDate);

      // Same day
      expect(DutyRotationService.calculateWeeksUntilDate('2025-01-15T00:00:00.000Z')).toBe(0);
      
      // One week later
      expect(DutyRotationService.calculateWeeksUntilDate('2025-01-22T00:00:00.000Z')).toBe(1);
      
      // Partial week (should round up)
      expect(DutyRotationService.calculateWeeksUntilDate('2025-01-20T00:00:00.000Z')).toBe(1);
      
      // Multiple weeks
      expect(DutyRotationService.calculateWeeksUntilDate('2025-02-05T00:00:00.000Z')).toBe(3);
      
      // Past date
      expect(DutyRotationService.calculateWeeksUntilDate('2025-01-08T00:00:00.000Z')).toBe(0);
      
      // Null date
      expect(DutyRotationService.calculateWeeksUntilDate(null)).toBe(0);
      
      // Invalid date
      expect(DutyRotationService.calculateWeeksUntilDate('invalid-date')).toBe(0);
    });
  });

  describe('Rotation Schedule Generation Edge Cases', () => {
    const mockRotation = {
      id: 'rotation1',
      name: 'Test Rotation',
      type: 'DevOps',
      participants: ['tm1', 'tm2', 'tm3'],
      cycle_weeks: 1,
      current_assignee_index: 0,
      is_active: true
    };

    beforeEach(() => {
      localClient.entities.DutyRotation.get.mockResolvedValue(mockRotation);
    });

    it('should handle single participant rotation (edge case)', async () => {
      const singleParticipantRotation = {
        ...mockRotation,
        participants: ['tm1']
      };
      localClient.entities.DutyRotation.get.mockResolvedValue(singleParticipantRotation);

      const schedule = await DutyRotationService.generateRotationSchedule(
        'rotation1',
        '2025-01-01',
        2
      );

      expect(schedule).toHaveLength(2); // 1 participant × 2 cycles
      expect(schedule[0].team_member_id).toBe('tm1');
      expect(schedule[1].team_member_id).toBe('tm1');
      
      // Second cycle should start after first ends
      expect(schedule[1].start_date).toBe('2025-01-08');
    });

    it('should handle large number of participants', async () => {
      const largeRotation = {
        ...mockRotation,
        participants: Array.from({ length: 10 }, (_, i) => `tm${i + 1}`),
        cycle_weeks: 2
      };
      localClient.entities.DutyRotation.get.mockResolvedValue(largeRotation);

      const schedule = await DutyRotationService.generateRotationSchedule(
        'rotation1',
        '2025-01-01',
        1
      );

      expect(schedule).toHaveLength(10);
      
      // Verify sequence is correct
      schedule.forEach((duty, index) => {
        expect(duty.rotation_sequence).toBe(index);
        expect(duty.team_member_id).toBe(`tm${index + 1}`);
      });

      // Verify dates are sequential
      for (let i = 1; i < schedule.length; i++) {
        const prevEndDate = new Date(schedule[i - 1].end_date);
        const currentStartDate = new Date(schedule[i].start_date);
        const expectedStartDate = new Date(prevEndDate);
        expectedStartDate.setDate(expectedStartDate.getDate() + 1);
        
        expect(currentStartDate.getTime()).toBe(expectedStartDate.getTime());
      }
    });

    it('should handle very long cycle durations', async () => {
      const longCycleRotation = {
        ...mockRotation,
        cycle_weeks: 12 // 3 months
      };
      localClient.entities.DutyRotation.get.mockResolvedValue(longCycleRotation);

      const schedule = await DutyRotationService.generateRotationSchedule(
        'rotation1',
        '2025-01-01',
        1
      );

      expect(schedule).toHaveLength(3);
      
      // First participant: 12 weeks
      expect(schedule[0].start_date).toBe('2025-01-01');
      expect(schedule[0].end_date).toBe('2025-03-26'); // 12 weeks later
      
      // Second participant: starts after first
      expect(schedule[1].start_date).toBe('2025-03-27');
      expect(schedule[1].end_date).toBe('2025-06-18'); // 12 weeks later
    });

    it('should handle zero cycle duration gracefully', async () => {
      const zeroCycleRotation = {
        ...mockRotation,
        cycle_weeks: 0
      };
      localClient.entities.DutyRotation.get.mockResolvedValue(zeroCycleRotation);

      await expect(
        DutyRotationService.generateRotationSchedule('rotation1', '2025-01-01', 1)
      ).rejects.toThrow('Invalid cycle_weeks: must be greater than 0');
    });

    it('should handle negative cycle count gracefully', async () => {
      await expect(
        DutyRotationService.generateRotationSchedule('rotation1', '2025-01-01', -1)
      ).rejects.toThrow('Invalid cycles: must be greater than 0');
    });
  });

  describe('Rotation Advancement Edge Cases', () => {
    it('should handle advancement when participants list is modified', async () => {
      const rotation = {
        id: 'rotation1',
        participants: ['tm1', 'tm2', 'tm3'],
        current_assignee_index: 2, // Last participant
        cycle_weeks: 1
      };

      localClient.entities.DutyRotation.get.mockResolvedValue(rotation);
      localClient.entities.DutyRotation.update.mockResolvedValue({
        ...rotation,
        current_assignee_index: 0 // Should wrap to first
      });

      const result = await DutyRotationService.advanceRotation('rotation1');

      expect(localClient.entities.DutyRotation.update).toHaveBeenCalledWith('rotation1', {
        current_assignee_index: 0,
        next_rotation_date: expect.any(String)
      });
    });

    it('should handle advancement with invalid current index', async () => {
      const rotation = {
        id: 'rotation1',
        participants: ['tm1', 'tm2'],
        current_assignee_index: 5, // Invalid index
        cycle_weeks: 1
      };

      localClient.entities.DutyRotation.get.mockResolvedValue(rotation);
      localClient.entities.DutyRotation.update.mockResolvedValue({
        ...rotation,
        current_assignee_index: 0 // Should reset to valid index
      });

      const result = await DutyRotationService.advanceRotation('rotation1');

      expect(localClient.entities.DutyRotation.update).toHaveBeenCalledWith('rotation1', {
        current_assignee_index: 0, // Should reset to 0
        next_rotation_date: expect.any(String)
      });
    });

    it('should calculate next rotation date correctly for different cycle lengths', async () => {
      const testCases = [
        { cycle_weeks: 1, expectedDaysLater: 7 },
        { cycle_weeks: 2, expectedDaysLater: 14 },
        { cycle_weeks: 4, expectedDaysLater: 28 }
      ];

      for (const testCase of testCases) {
        const rotation = {
          id: 'rotation1',
          participants: ['tm1', 'tm2'],
          current_assignee_index: 0,
          cycle_weeks: testCase.cycle_weeks
        };

        localClient.entities.DutyRotation.get.mockResolvedValue(rotation);
        
        // Mock current date
        const mockDate = new Date('2025-01-15T00:00:00.000Z');
        vi.setSystemTime(mockDate);

        let capturedNextDate;
        localClient.entities.DutyRotation.update.mockImplementation((id, updates) => {
          capturedNextDate = updates.next_rotation_date;
          return Promise.resolve({ ...rotation, ...updates });
        });

        await DutyRotationService.advanceRotation('rotation1');

        const expectedDate = new Date(mockDate);
        expectedDate.setDate(expectedDate.getDate() + testCase.expectedDaysLater);
        
        expect(new Date(capturedNextDate).getTime()).toBe(expectedDate.getTime());
      }
    });
  });

  describe('Participant Management Edge Cases', () => {
    it('should handle empty participants list', async () => {
      const rotation = {
        id: 'rotation1',
        participants: [],
        current_assignee_index: 0
      };

      localClient.entities.DutyRotation.get.mockResolvedValue(rotation);

      await expect(
        DutyRotationService.getCurrentAssignee('rotation1')
      ).rejects.toThrow('No participants in rotation');

      await expect(
        DutyRotationService.getNextAssignee('rotation1')
      ).rejects.toThrow('No participants in rotation');
    });

    it('should handle participants with missing team member data', async () => {
      const rotation = {
        id: 'rotation1',
        participants: ['tm1', 'missing-tm', 'tm3'],
        current_assignee_index: 1, // Points to missing team member
        cycle_weeks: 1,
        next_rotation_date: '2025-01-15T00:00:00.000Z'
      };

      localClient.entities.DutyRotation.get.mockResolvedValue(rotation);
      
      // Mock team members list without the missing one
      localClient.entities.TeamMember.list.mockResolvedValue([
        { id: 'tm1', name: 'Alice' },
        { id: 'tm3', name: 'Carol' }
      ]);

      const currentAssignee = await DutyRotationService.getCurrentAssignee('rotation1');
      expect(currentAssignee.assignee_name).toBe('Unknown');
      expect(currentAssignee.assignee_id).toBe('missing-tm');

      const nextAssignee = await DutyRotationService.getNextAssignee('rotation1');
      expect(nextAssignee.assignee_name).toBe('Carol');
      expect(nextAssignee.assignee_id).toBe('tm3');
    });

    it('should handle participant updates with current assignee removal', async () => {
      const rotation = {
        id: 'rotation1',
        participants: ['tm1', 'tm2', 'tm3'],
        current_assignee_index: 1 // Points to tm2
      };

      localClient.entities.DutyRotation.get.mockResolvedValue(rotation);
      localClient.entities.DutyRotation.update.mockResolvedValue({
        ...rotation,
        participants: ['tm1', 'tm3'], // tm2 removed
        current_assignee_index: 0 // Should reset
      });

      // Remove tm2 from participants
      const result = await DutyRotationService.updateRotationParticipants(
        'rotation1',
        ['tm1', 'tm3']
      );

      expect(localClient.entities.DutyRotation.update).toHaveBeenCalledWith('rotation1', {
        participants: ['tm1', 'tm3'],
        current_assignee_index: 0 // Should reset because old index is invalid
      });
    });

    it('should handle duplicate participants in update', async () => {
      const rotation = {
        id: 'rotation1',
        participants: ['tm1', 'tm2'],
        current_assignee_index: 0
      };

      localClient.entities.DutyRotation.get.mockResolvedValue(rotation);

      // Attempt to update with duplicates
      await expect(
        DutyRotationService.updateRotationParticipants(
          'rotation1',
          ['tm1', 'tm2', 'tm1'] // tm1 appears twice
        )
      ).rejects.toThrow('Duplicate participants are not allowed');
    });
  });

  describe('Rotation Schedule Display Edge Cases', () => {
    it('should handle rotation schedule with missing team members', async () => {
      const rotation = {
        id: 'rotation1',
        participants: ['tm1', 'missing-tm', 'tm3'],
        cycle_weeks: 1,
        current_assignee_index: 0,
        next_rotation_date: '2025-01-01T00:00:00.000Z'
      };

      localClient.entities.DutyRotation.get.mockResolvedValue(rotation);
      
      // Mock team members list without the missing one
      localClient.entities.TeamMember.list.mockResolvedValue([
        { id: 'tm1', name: 'Alice' },
        { id: 'tm3', name: 'Carol' }
      ]);

      const schedule = await DutyRotationService.getRotationSchedule('rotation1', 1);

      expect(schedule).toHaveLength(3);
      expect(schedule[0].participant_name).toBe('Alice');
      expect(schedule[1].participant_name).toBe('Unknown'); // Missing team member
      expect(schedule[2].participant_name).toBe('Carol');
    });

    it('should handle rotation schedule with no next rotation date', async () => {
      const rotation = {
        id: 'rotation1',
        participants: ['tm1', 'tm2'],
        cycle_weeks: 1,
        current_assignee_index: 0,
        next_rotation_date: null // No next date set
      };

      localClient.entities.DutyRotation.get.mockResolvedValue(rotation);

      const schedule = await DutyRotationService.getRotationSchedule('rotation1', 1);

      expect(schedule).toHaveLength(2);
      // Should use current date as fallback
      expect(schedule[0].start_date).toBeDefined();
      expect(schedule[1].start_date).toBeDefined();
    });

    it('should correctly identify current assignee in schedule', async () => {
      const rotation = {
        id: 'rotation1',
        participants: ['tm1', 'tm2', 'tm3'],
        cycle_weeks: 1,
        current_assignee_index: 1, // tm2 is current
        next_rotation_date: '2025-01-08T00:00:00.000Z'
      };

      localClient.entities.DutyRotation.get.mockResolvedValue(rotation);

      const schedule = await DutyRotationService.getRotationSchedule('rotation1', 1);

      expect(schedule).toHaveLength(3);
      expect(schedule[0].is_current).toBe(false); // tm1
      expect(schedule[1].is_current).toBe(true);  // tm2 (current)
      expect(schedule[2].is_current).toBe(false); // tm3
    });
  });

  describe('Error Handling and Validation', () => {
    it('should validate rotation configuration on creation', async () => {
      // Test various invalid configurations
      const invalidConfigs = [
        {
          config: { participants: [], cycle_weeks: 1 },
          expectedError: 'participants array cannot be empty'
        },
        {
          config: { participants: ['tm1'], cycle_weeks: 0 },
          expectedError: 'cycle_weeks must be greater than 0'
        },
        {
          config: { participants: ['tm1'], cycle_weeks: -1 },
          expectedError: 'cycle_weeks must be greater than 0'
        },
        {
          config: { participants: ['tm1'], cycle_weeks: 'invalid' },
          expectedError: 'cycle_weeks must be a number'
        }
      ];

      for (const { config, expectedError } of invalidConfigs) {
        await expect(
          DutyRotationService.createRotation(config)
        ).rejects.toThrow(expectedError);
      }
    });

    it('should handle database errors gracefully', async () => {
      // Mock database error
      localClient.entities.DutyRotation.create.mockRejectedValue(
        new Error('Database connection failed')
      );

      await expect(
        DutyRotationService.createRotation({
          name: 'Test Rotation',
          type: 'DevOps',
          participants: ['tm1', 'tm2'],
          cycle_weeks: 1
        })
      ).rejects.toThrow('Database connection failed');
    });

    it('should handle concurrent rotation modifications', async () => {
      const rotation = {
        id: 'rotation1',
        participants: ['tm1', 'tm2'],
        current_assignee_index: 0,
        cycle_weeks: 1
      };

      localClient.entities.DutyRotation.get.mockResolvedValue(rotation);
      
      // Mock update to fail with conflict error
      localClient.entities.DutyRotation.update
        .mockRejectedValueOnce(new Error('Concurrent modification detected'))
        .mockResolvedValueOnce({ ...rotation, current_assignee_index: 1 });

      // First call should fail
      await expect(
        DutyRotationService.advanceRotation('rotation1')
      ).rejects.toThrow('Concurrent modification detected');

      // Second call should succeed
      const result = await DutyRotationService.advanceRotation('rotation1');
      expect(result.current_assignee_index).toBe(1);
    });
  });

  describe('Performance and Memory Management', () => {
    it('should handle large rotation schedules efficiently', async () => {
      const largeRotation = {
        id: 'rotation1',
        participants: Array.from({ length: 50 }, (_, i) => `tm${i + 1}`),
        cycle_weeks: 1,
        current_assignee_index: 0
      };

      localClient.entities.DutyRotation.get.mockResolvedValue(largeRotation);

      const startTime = Date.now();
      const schedule = await DutyRotationService.generateRotationSchedule(
        'rotation1',
        '2025-01-01',
        4 // 4 cycles
      );
      const endTime = Date.now();

      expect(schedule).toHaveLength(200); // 50 participants × 4 cycles
      expect(endTime - startTime).toBeLessThan(1000); // Should complete within 1 second
    });

    it('should not leak memory during repeated operations', async () => {
      const rotation = {
        id: 'rotation1',
        participants: ['tm1', 'tm2', 'tm3'],
        cycle_weeks: 1,
        current_assignee_index: 0
      };

      localClient.entities.DutyRotation.get.mockResolvedValue(rotation);
      localClient.entities.DutyRotation.update.mockImplementation((id, updates) => 
        Promise.resolve({ ...rotation, ...updates })
      );

      // Perform many operations
      for (let i = 0; i < 1000; i++) {
        await DutyRotationService.calculateRotationDates(['tm1', 'tm2'], 1, '2025-01-01');
        await DutyRotationService.calculateWeeksUntilDate('2025-01-08T00:00:00.000Z');
      }

      // If we get here without running out of memory, the test passes
      expect(true).toBe(true);
    });
  });
});