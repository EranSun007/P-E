// src/services/__tests__/dutyRotationService.test.js
// Tests for DutyRotationService

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
        getActive: vi.fn(),
        getByType: vi.fn()
      },
      Duty: {
        create: vi.fn()
      },
      TeamMember: {
        list: vi.fn()
      }
    }
  }
}));

describe('DutyRotationService', () => {
  const mockTeamMembers = [
    { id: 'tm1', name: 'Alice Johnson' },
    { id: 'tm2', name: 'Bob Smith' },
    { id: 'tm3', name: 'Carol Davis' },
    { id: 'tm4', name: 'David Wilson' },
    { id: 'tm5', name: 'Eve Brown' }
  ];

  const mockRotation = {
    id: 'rotation1',
    name: 'DevOps On-Call',
    type: 'DevOps',
    participants: ['tm1', 'tm2', 'tm3', 'tm4', 'tm5'],
    cycle_weeks: 1,
    current_assignee_index: 0,
    next_rotation_date: '2025-08-06T00:00:00.000Z',
    is_active: true,
    created_date: '2025-07-30T00:00:00.000Z',
    updated_date: '2025-07-30T00:00:00.000Z'
  };

  beforeEach(() => {
    vi.clearAllMocks();
    localClient.entities.TeamMember.list.mockResolvedValue(mockTeamMembers);
  });

  describe('createRotation', () => {
    it('should create a new rotation with proper configuration', async () => {
      const config = {
        name: 'DevOps On-Call',
        type: 'DevOps',
        participants: ['tm1', 'tm2', 'tm3'],
        cycle_weeks: 1,
        start_date: '2025-07-30T00:00:00.000Z'
      };

      localClient.entities.DutyRotation.create.mockResolvedValue({
        ...config,
        id: 'rotation1',
        current_assignee_index: 0,
        next_rotation_date: '2025-08-06T00:00:00.000Z',
        is_active: true
      });

      const result = await DutyRotationService.createRotation(config);

      expect(localClient.entities.DutyRotation.create).toHaveBeenCalledWith({
        name: 'DevOps On-Call',
        type: 'DevOps',
        participants: ['tm1', 'tm2', 'tm3'],
        cycle_weeks: 1,
        current_assignee_index: 0,
        next_rotation_date: '2025-08-06T00:00:00.000Z',
        is_active: true
      });

      expect(result.id).toBe('rotation1');
      expect(result.is_active).toBe(true);
    });

    it('should create rotation without start_date', async () => {
      const config = {
        name: 'Reporting Rotation',
        type: 'Reporting',
        participants: ['tm1', 'tm2'],
        cycle_weeks: 2
      };

      localClient.entities.DutyRotation.create.mockResolvedValue({
        ...config,
        id: 'rotation2',
        current_assignee_index: 0,
        next_rotation_date: null,
        is_active: true
      });

      const result = await DutyRotationService.createRotation(config);

      expect(localClient.entities.DutyRotation.create).toHaveBeenCalledWith({
        name: 'Reporting Rotation',
        type: 'Reporting',
        participants: ['tm1', 'tm2'],
        cycle_weeks: 2,
        current_assignee_index: 0,
        next_rotation_date: null,
        is_active: true
      });

      expect(result.next_rotation_date).toBe(null);
    });
  });

  describe('generateRotationSchedule', () => {
    it('should generate correct schedule for single cycle', async () => {
      localClient.entities.DutyRotation.get.mockResolvedValue(mockRotation);

      const schedule = await DutyRotationService.generateRotationSchedule(
        'rotation1',
        '2025-07-30',
        1
      );

      expect(schedule).toHaveLength(5); // 5 participants
      
      // Check first assignment
      expect(schedule[0]).toEqual({
        team_member_id: 'tm1',
        type: 'devops',
        title: 'DevOps',
        description: 'DevOps On-Call - Cycle 1',
        start_date: '2025-07-30',
        end_date: '2025-08-05',
        is_rotation: true,
        rotation_id: 'rotation1',
        rotation_participants: 5,
        rotation_sequence: 0,
        rotation_cycle_weeks: 1
      });

      // Check second assignment (should start after first ends)
      expect(schedule[1]).toEqual({
        team_member_id: 'tm2',
        type: 'devops',
        title: 'DevOps',
        description: 'DevOps On-Call - Cycle 1',
        start_date: '2025-08-06',
        end_date: '2025-08-12',
        is_rotation: true,
        rotation_id: 'rotation1',
        rotation_participants: 5,
        rotation_sequence: 1,
        rotation_cycle_weeks: 1
      });
    });

    it('should generate correct schedule for multiple cycles', async () => {
      localClient.entities.DutyRotation.get.mockResolvedValue(mockRotation);

      const schedule = await DutyRotationService.generateRotationSchedule(
        'rotation1',
        '2025-07-30',
        2
      );

      expect(schedule).toHaveLength(10); // 5 participants × 2 cycles

      // Check that cycle 2 starts after cycle 1 ends
      const lastOfCycle1 = schedule[4];
      const firstOfCycle2 = schedule[5];

      expect(lastOfCycle1.description).toBe('DevOps On-Call - Cycle 1');
      expect(firstOfCycle2.description).toBe('DevOps On-Call - Cycle 2');
      expect(firstOfCycle2.team_member_id).toBe('tm1'); // Should start with first participant again
    });

    it('should throw error for non-existent rotation', async () => {
      localClient.entities.DutyRotation.get.mockResolvedValue(null);

      await expect(
        DutyRotationService.generateRotationSchedule('nonexistent', '2025-07-30', 1)
      ).rejects.toThrow('Rotation with ID nonexistent not found');
    });
  });

  describe('advanceRotation', () => {
    it('should advance to next assignee', async () => {
      localClient.entities.DutyRotation.get.mockResolvedValue(mockRotation);
      localClient.entities.DutyRotation.update.mockResolvedValue({
        ...mockRotation,
        current_assignee_index: 1,
        next_rotation_date: '2025-08-13T00:00:00.000Z'
      });

      const result = await DutyRotationService.advanceRotation('rotation1');

      expect(localClient.entities.DutyRotation.update).toHaveBeenCalledWith('rotation1', {
        current_assignee_index: 1,
        next_rotation_date: expect.any(String)
      });

      expect(result.current_assignee_index).toBe(1);
    });

    it('should wrap around to first assignee after last', async () => {
      const rotationAtEnd = {
        ...mockRotation,
        current_assignee_index: 4 // Last participant (index 4 of 5 participants)
      };

      localClient.entities.DutyRotation.get.mockResolvedValue(rotationAtEnd);
      localClient.entities.DutyRotation.update.mockResolvedValue({
        ...rotationAtEnd,
        current_assignee_index: 0
      });

      const result = await DutyRotationService.advanceRotation('rotation1');

      expect(localClient.entities.DutyRotation.update).toHaveBeenCalledWith('rotation1', {
        current_assignee_index: 0, // Should wrap to 0
        next_rotation_date: expect.any(String)
      });

      expect(result.current_assignee_index).toBe(0);
    });

    it('should throw error for non-existent rotation', async () => {
      localClient.entities.DutyRotation.get.mockResolvedValue(null);

      await expect(
        DutyRotationService.advanceRotation('nonexistent')
      ).rejects.toThrow('Rotation with ID nonexistent not found');
    });
  });

  describe('getNextAssignee', () => {
    it('should return correct next assignee info', async () => {
      localClient.entities.DutyRotation.get.mockResolvedValue(mockRotation);

      const result = await DutyRotationService.getNextAssignee('rotation1');

      expect(result).toEqual({
        assignee_id: 'tm2', // Next after tm1 (index 0)
        assignee_name: 'Bob Smith',
        assignee_index: 1,
        rotation_date: '2025-08-06T00:00:00.000Z',
        weeks_until_rotation: expect.any(Number)
      });
    });

    it('should wrap around to first participant when at end', async () => {
      const rotationAtEnd = {
        ...mockRotation,
        current_assignee_index: 4 // Last participant
      };

      localClient.entities.DutyRotation.get.mockResolvedValue(rotationAtEnd);

      const result = await DutyRotationService.getNextAssignee('rotation1');

      expect(result.assignee_id).toBe('tm1'); // Should wrap to first
      expect(result.assignee_index).toBe(0);
    });

    it('should handle unknown team member', async () => {
      const rotationWithUnknownMember = {
        ...mockRotation,
        participants: ['unknown_id', 'tm2', 'tm3'],
        current_assignee_index: 2 // Current is tm3, next should be unknown_id (index 0)
      };

      localClient.entities.DutyRotation.get.mockResolvedValue(rotationWithUnknownMember);

      const result = await DutyRotationService.getNextAssignee('rotation1');

      expect(result.assignee_name).toBe('Unknown');
      expect(result.assignee_id).toBe('unknown_id');
    });
  });

  describe('getCurrentAssignee', () => {
    it('should return current assignee info', async () => {
      localClient.entities.DutyRotation.get.mockResolvedValue(mockRotation);

      const result = await DutyRotationService.getCurrentAssignee('rotation1');

      expect(result).toEqual({
        assignee_id: 'tm1',
        assignee_name: 'Alice Johnson',
        assignee_index: 0
      });
    });
  });

  describe('calculateRotationDates', () => {
    it('should calculate correct dates for all participants', () => {
      const participants = ['tm1', 'tm2', 'tm3'];
      const cycleWeeks = 2;
      const startDate = '2025-07-30';

      const result = DutyRotationService.calculateRotationDates(
        participants,
        cycleWeeks,
        startDate
      );

      expect(result).toHaveLength(3);
      
      expect(result[0]).toEqual({
        participant_id: 'tm1',
        sequence: 0,
        start_date: '2025-07-30',
        end_date: '2025-08-12',
        weeks_duration: 2
      });

      expect(result[1]).toEqual({
        participant_id: 'tm2',
        sequence: 1,
        start_date: '2025-08-13',
        end_date: '2025-08-26',
        weeks_duration: 2
      });

      expect(result[2]).toEqual({
        participant_id: 'tm3',
        sequence: 2,
        start_date: '2025-08-27',
        end_date: '2025-09-09',
        weeks_duration: 2
      });
    });
  });

  describe('getRotationSchedule', () => {
    it('should return formatted schedule with team member names', async () => {
      localClient.entities.DutyRotation.get.mockResolvedValue({
        ...mockRotation,
        next_rotation_date: '2025-08-06T00:00:00.000Z'
      });

      const result = await DutyRotationService.getRotationSchedule('rotation1', 1);

      expect(result).toHaveLength(5);
      expect(result[0]).toEqual({
        participant_id: 'tm1',
        participant_name: 'Alice Johnson',
        sequence: 0,
        cycle: 1,
        start_date: '2025-08-06',
        end_date: '2025-08-12',
        weeks_duration: 1,
        is_current: true
      });

      expect(result[1]).toEqual({
        participant_id: 'tm2',
        participant_name: 'Bob Smith',
        sequence: 1,
        cycle: 1,
        start_date: '2025-08-13',
        end_date: '2025-08-19',
        weeks_duration: 1,
        is_current: false
      });
    });
  });

  describe('createRotationDuties', () => {
    it('should create duties for rotation schedule', async () => {
      localClient.entities.DutyRotation.get.mockResolvedValue(mockRotation);
      localClient.entities.Duty.create.mockResolvedValue({ id: 'duty1' });

      const result = await DutyRotationService.createRotationDuties(
        'rotation1',
        '2025-07-30',
        1
      );

      expect(localClient.entities.Duty.create).toHaveBeenCalledTimes(5);
      expect(result).toHaveLength(5);
    });

    it('should continue creating duties even if one fails', async () => {
      localClient.entities.DutyRotation.get.mockResolvedValue(mockRotation);
      localClient.entities.Duty.create
        .mockResolvedValueOnce({ id: 'duty1' })
        .mockRejectedValueOnce(new Error('Creation failed'))
        .mockResolvedValueOnce({ id: 'duty3' })
        .mockResolvedValueOnce({ id: 'duty4' })
        .mockResolvedValueOnce({ id: 'duty5' });

      const result = await DutyRotationService.createRotationDuties(
        'rotation1',
        '2025-07-30',
        1
      );

      expect(localClient.entities.Duty.create).toHaveBeenCalledTimes(5);
      expect(result).toHaveLength(4); // One failed, so 4 successful
    });
  });

  describe('updateRotationParticipants', () => {
    it('should update participants and adjust current assignee index', async () => {
      localClient.entities.DutyRotation.get.mockResolvedValue(mockRotation);
      localClient.entities.DutyRotation.update.mockResolvedValue({
        ...mockRotation,
        participants: ['tm1', 'tm2']
      });

      const result = await DutyRotationService.updateRotationParticipants(
        'rotation1',
        ['tm1', 'tm2']
      );

      expect(localClient.entities.DutyRotation.update).toHaveBeenCalledWith('rotation1', {
        participants: ['tm1', 'tm2'],
        current_assignee_index: 0 // Should remain valid
      });
    });

    it('should reset current assignee index if out of bounds', async () => {
      const rotationWithHighIndex = {
        ...mockRotation,
        current_assignee_index: 3 // Index 3, but new participants array will have only 2 items
      };

      localClient.entities.DutyRotation.get.mockResolvedValue(rotationWithHighIndex);
      localClient.entities.DutyRotation.update.mockResolvedValue({
        ...rotationWithHighIndex,
        participants: ['tm1', 'tm2'],
        current_assignee_index: 0
      });

      await DutyRotationService.updateRotationParticipants('rotation1', ['tm1', 'tm2']);

      expect(localClient.entities.DutyRotation.update).toHaveBeenCalledWith('rotation1', {
        participants: ['tm1', 'tm2'],
        current_assignee_index: 0 // Should reset to 0
      });
    });
  });

  describe('calculateWeeksUntilDate', () => {
    it('should calculate weeks correctly', () => {
      // Mock current date
      const mockDate = new Date('2025-07-30T00:00:00.000Z');
      vi.setSystemTime(mockDate);

      const targetDate = '2025-08-13T00:00:00.000Z'; // 2 weeks later
      const result = DutyRotationService.calculateWeeksUntilDate(targetDate);

      expect(result).toBe(2);
    });

    it('should return 0 for past dates', () => {
      const mockDate = new Date('2025-07-30T00:00:00.000Z');
      vi.setSystemTime(mockDate);

      const targetDate = '2025-07-20T00:00:00.000Z'; // Past date
      const result = DutyRotationService.calculateWeeksUntilDate(targetDate);

      expect(result).toBe(0);
    });

    it('should return 0 for null date', () => {
      const result = DutyRotationService.calculateWeeksUntilDate(null);
      expect(result).toBe(0);
    });
  });

  describe('utility methods', () => {
    it('should get active rotations', async () => {
      const activeRotations = [mockRotation];
      localClient.entities.DutyRotation.getActive.mockResolvedValue(activeRotations);

      const result = await DutyRotationService.getActiveRotations();

      expect(result).toEqual(activeRotations);
      expect(localClient.entities.DutyRotation.getActive).toHaveBeenCalled();
    });

    it('should get rotations by type', async () => {
      const devopsRotations = [mockRotation];
      localClient.entities.DutyRotation.getByType.mockResolvedValue(devopsRotations);

      const result = await DutyRotationService.getRotationsByType('DevOps');

      expect(result).toEqual(devopsRotations);
      expect(localClient.entities.DutyRotation.getByType).toHaveBeenCalledWith('DevOps');
    });

    it('should deactivate rotation', async () => {
      const deactivatedRotation = { ...mockRotation, is_active: false };
      localClient.entities.DutyRotation.update.mockResolvedValue(deactivatedRotation);

      const result = await DutyRotationService.deactivateRotation('rotation1');

      expect(localClient.entities.DutyRotation.update).toHaveBeenCalledWith('rotation1', {
        is_active: false
      });
      expect(result.is_active).toBe(false);
    });

    it('should activate rotation', async () => {
      const activatedRotation = { ...mockRotation, is_active: true };
      localClient.entities.DutyRotation.update.mockResolvedValue(activatedRotation);

      const result = await DutyRotationService.activateRotation('rotation1');

      expect(localClient.entities.DutyRotation.update).toHaveBeenCalledWith('rotation1', {
        is_active: true
      });
      expect(result.is_active).toBe(true);
    });
  });
});