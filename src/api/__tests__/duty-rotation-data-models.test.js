// src/api/__tests__/duty-rotation-data-models.test.js
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { localClient } from '../localClient.js';

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

Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage
});

describe('Duty Rotation Data Models', () => {
  beforeEach(() => {
    mockLocalStorage.clear();
    vi.clearAllMocks();
    
    // Setup test data
    const teamMembers = [
      { id: 'tm1', name: 'Alice', email: 'alice@test.com' },
      { id: 'tm2', name: 'Bob', email: 'bob@test.com' },
      { id: 'tm3', name: 'Charlie', email: 'charlie@test.com' }
    ];
    mockLocalStorage.setItem('team_members', JSON.stringify(teamMembers));
    mockLocalStorage.setItem('duties', JSON.stringify([]));
    mockLocalStorage.setItem('duty_rotations', JSON.stringify([]));
  });

  describe('Enhanced Duty Entity with Rotation Fields', () => {
    it('should create a non-rotation duty with default rotation fields', async () => {
      const duty = {
        team_member_id: 'tm1',
        type: 'devops',
        title: 'Reporting',
        description: 'Weekly reporting duty',
        start_date: '2025-01-01',
        end_date: '2025-01-07'
      };

      const result = await localClient.entities.Duty.create(duty);

      expect(result).toMatchObject({
        ...duty,
        is_rotation: false,
        rotation_id: null,
        rotation_participants: null,
        rotation_sequence: null,
        rotation_cycle_weeks: null
      });
      expect(result.id).toBeDefined();
      expect(result.created_date).toBeDefined();
      expect(result.updated_date).toBeDefined();
    });

    it('should create a rotation duty with all rotation fields', async () => {
      const duty = {
        team_member_id: 'tm1',
        type: 'devops',
        title: 'Reporting',
        description: 'Rotation reporting duty',
        start_date: '2025-01-01',
        end_date: '2025-01-07',
        is_rotation: true,
        rotation_id: 'rot1',
        rotation_participants: 3,
        rotation_sequence: 0,
        rotation_cycle_weeks: 1
      };

      const result = await localClient.entities.Duty.create(duty);

      expect(result).toMatchObject(duty);
      expect(result.id).toBeDefined();
    });

    it('should validate rotation fields when is_rotation is true', async () => {
      const duty = {
        team_member_id: 'tm1',
        type: 'devops',
        title: 'Reporting',
        start_date: '2025-01-01',
        end_date: '2025-01-07',
        is_rotation: true
        // Missing rotation fields
      };

      await expect(localClient.entities.Duty.create(duty))
        .rejects.toThrow('rotation_id is required when is_rotation is true');
    });

    it('should validate rotation_participants is >= 2', async () => {
      const duty = {
        team_member_id: 'tm1',
        type: 'devops',
        title: 'Reporting',
        start_date: '2025-01-01',
        end_date: '2025-01-07',
        is_rotation: true,
        rotation_id: 'rot1',
        rotation_participants: 1, // Invalid
        rotation_sequence: 0,
        rotation_cycle_weeks: 1
      };

      await expect(localClient.entities.Duty.create(duty))
        .rejects.toThrow('rotation_participants must be a number >= 2 when is_rotation is true');
    });

    it('should validate rotation_sequence is within participants range', async () => {
      const duty = {
        team_member_id: 'tm1',
        type: 'devops',
        title: 'Reporting',
        start_date: '2025-01-01',
        end_date: '2025-01-07',
        is_rotation: true,
        rotation_id: 'rot1',
        rotation_participants: 3,
        rotation_sequence: 3, // Invalid (should be 0-2)
        rotation_cycle_weeks: 1
      };

      await expect(localClient.entities.Duty.create(duty))
        .rejects.toThrow('rotation_sequence must be less than rotation_participants');
    });

    it('should reject rotation fields when is_rotation is false', async () => {
      const duty = {
        team_member_id: 'tm1',
        type: 'devops',
        title: 'Reporting',
        start_date: '2025-01-01',
        end_date: '2025-01-07',
        is_rotation: false,
        rotation_id: 'rot1' // Should not be allowed
      };

      await expect(localClient.entities.Duty.create(duty))
        .rejects.toThrow('Rotation fields must be null when is_rotation is false');
    });

    it('should update rotation fields correctly', async () => {
      // Create a non-rotation duty first
      const duty = await localClient.entities.Duty.create({
        team_member_id: 'tm1',
        type: 'devops',
        title: 'Reporting',
        start_date: '2025-01-01',
        end_date: '2025-01-07'
      });

      // Update to make it a rotation duty
      const updated = await localClient.entities.Duty.update(duty.id, {
        is_rotation: true,
        rotation_id: 'rot1',
        rotation_participants: 3,
        rotation_sequence: 0,
        rotation_cycle_weeks: 1
      });

      expect(updated.is_rotation).toBe(true);
      expect(updated.rotation_id).toBe('rot1');
      expect(updated.rotation_participants).toBe(3);
    });
  });

  describe('DutyRotation Entity', () => {
    it('should create a duty rotation with valid data', async () => {
      const rotation = {
        name: 'DevOps On-Call Rotation',
        type: 'DevOps',
        participants: ['tm1', 'tm2', 'tm3'],
        cycle_weeks: 1,
        current_assignee_index: 0,
        next_rotation_date: '2025-01-08T00:00:00.000Z'
      };

      const result = await localClient.entities.DutyRotation.create(rotation);

      expect(result).toMatchObject({
        ...rotation,
        is_active: true
      });
      expect(result.id).toBeDefined();
      expect(result.created_date).toBeDefined();
      expect(result.updated_date).toBeDefined();
    });

    it('should validate required fields', async () => {
      const rotation = {
        // Missing name
        type: 'DevOps',
        participants: ['tm1', 'tm2'],
        cycle_weeks: 1
      };

      await expect(localClient.entities.DutyRotation.create(rotation))
        .rejects.toThrow('name is required');
    });

    it('should validate rotation type', async () => {
      const rotation = {
        name: 'Test Rotation',
        type: 'invalid_type',
        participants: ['tm1', 'tm2'],
        cycle_weeks: 1
      };

      await expect(localClient.entities.DutyRotation.create(rotation))
        .rejects.toThrow('Invalid rotation type. Must be one of: Reporting, Metering, DevOps');
    });

    it('should validate minimum participants', async () => {
      const rotation = {
        name: 'Test Rotation',
        type: 'DevOps',
        participants: ['tm1'], // Only 1 participant
        cycle_weeks: 1
      };

      await expect(localClient.entities.DutyRotation.create(rotation))
        .rejects.toThrow('rotation must have at least 2 participants');
    });

    it('should validate participant existence', async () => {
      const rotation = {
        name: 'Test Rotation',
        type: 'DevOps',
        participants: ['tm1', 'nonexistent'], // Invalid participant
        cycle_weeks: 1
      };

      await expect(localClient.entities.DutyRotation.create(rotation))
        .rejects.toThrow('Invalid participants: nonexistent do not exist');
    });

    it('should prevent duplicate participants', async () => {
      const rotation = {
        name: 'Test Rotation',
        type: 'DevOps',
        participants: ['tm1', 'tm2', 'tm1'], // Duplicate tm1
        cycle_weeks: 1
      };

      await expect(localClient.entities.DutyRotation.create(rotation))
        .rejects.toThrow('Duplicate participants are not allowed in a rotation');
    });

    it('should get current assignee', async () => {
      const rotation = await localClient.entities.DutyRotation.create({
        name: 'Test Rotation',
        type: 'DevOps',
        participants: ['tm1', 'tm2', 'tm3'],
        cycle_weeks: 1,
        current_assignee_index: 1
      });

      const currentAssignee = await localClient.entities.DutyRotation.getCurrentAssignee(rotation.id);
      
      expect(currentAssignee).toMatchObject({
        id: 'tm2',
        name: 'Bob'
      });
    });

    it('should get next assignee', async () => {
      const rotation = await localClient.entities.DutyRotation.create({
        name: 'Test Rotation',
        type: 'DevOps',
        participants: ['tm1', 'tm2', 'tm3'],
        cycle_weeks: 1,
        current_assignee_index: 1
      });

      const nextAssignee = await localClient.entities.DutyRotation.getNextAssignee(rotation.id);
      
      expect(nextAssignee).toMatchObject({
        id: 'tm3',
        name: 'Charlie'
      });
    });

    it('should wrap around to first participant for next assignee', async () => {
      const rotation = await localClient.entities.DutyRotation.create({
        name: 'Test Rotation',
        type: 'DevOps',
        participants: ['tm1', 'tm2', 'tm3'],
        cycle_weeks: 1,
        current_assignee_index: 2 // Last participant
      });

      const nextAssignee = await localClient.entities.DutyRotation.getNextAssignee(rotation.id);
      
      expect(nextAssignee).toMatchObject({
        id: 'tm1',
        name: 'Alice'
      });
    });

    it('should advance rotation correctly', async () => {
      const rotation = await localClient.entities.DutyRotation.create({
        name: 'Test Rotation',
        type: 'DevOps',
        participants: ['tm1', 'tm2', 'tm3'],
        cycle_weeks: 1,
        current_assignee_index: 0
      });

      const advanced = await localClient.entities.DutyRotation.advanceRotation(rotation.id);
      
      expect(advanced.current_assignee_index).toBe(1);
      expect(advanced.next_rotation_date).toBeDefined();
    });

    it('should filter rotations by type', async () => {
      await localClient.entities.DutyRotation.create({
        name: 'DevOps Rotation',
        type: 'DevOps',
        participants: ['tm1', 'tm2'],
        cycle_weeks: 1
      });

      await localClient.entities.DutyRotation.create({
        name: 'Reporting Rotation',
        type: 'Reporting',
        participants: ['tm2', 'tm3'],
        cycle_weeks: 1
      });

      const devopsRotations = await localClient.entities.DutyRotation.getByType('DevOps');
      const reportingRotations = await localClient.entities.DutyRotation.getByType('Reporting');

      expect(devopsRotations).toHaveLength(1);
      expect(devopsRotations[0].name).toBe('DevOps Rotation');
      expect(reportingRotations).toHaveLength(1);
      expect(reportingRotations[0].name).toBe('Reporting Rotation');
    });

    it('should filter active rotations', async () => {
      await localClient.entities.DutyRotation.create({
        name: 'Active Rotation',
        type: 'DevOps',
        participants: ['tm1', 'tm2'],
        cycle_weeks: 1,
        is_active: true
      });

      await localClient.entities.DutyRotation.create({
        name: 'Inactive Rotation',
        type: 'Reporting',
        participants: ['tm2', 'tm3'],
        cycle_weeks: 1,
        is_active: false
      });

      const activeRotations = await localClient.entities.DutyRotation.getActive();

      expect(activeRotations).toHaveLength(1);
      expect(activeRotations[0].name).toBe('Active Rotation');
    });
  });

  describe('Migration Functions', () => {
    it('should migrate existing duties to support rotation fields', async () => {
      // Setup existing duties without rotation fields
      const existingDuties = [
        {
          id: 'duty1',
          team_member_id: 'tm1',
          type: 'devops',
          title: 'Reporting',
          start_date: '2025-01-01',
          end_date: '2025-01-07'
        },
        {
          id: 'duty2',
          team_member_id: 'tm2',
          type: 'devops',
          title: 'Metering',
          start_date: '2025-01-08',
          end_date: '2025-01-14'
        }
      ];
      mockLocalStorage.setItem('duties', JSON.stringify(existingDuties));

      const result = await localClient.migrations.migrateDutiesForRotationSupport();

      expect(result.migrated).toBe(2);
      expect(result.total).toBe(2);

      const migratedDuties = JSON.parse(mockLocalStorage.getItem('duties'));
      expect(migratedDuties[0]).toMatchObject({
        id: 'duty1',
        is_rotation: false,
        rotation_id: null,
        rotation_participants: null,
        rotation_sequence: null,
        rotation_cycle_weeks: null
      });
    });

    it('should not migrate duties that already have rotation fields', async () => {
      // Setup duties that already have rotation fields
      const existingDuties = [
        {
          id: 'duty1',
          team_member_id: 'tm1',
          type: 'devops',
          title: 'Reporting',
          start_date: '2025-01-01',
          end_date: '2025-01-07',
          is_rotation: false,
          rotation_id: null
        }
      ];
      mockLocalStorage.setItem('duties', JSON.stringify(existingDuties));

      const result = await localClient.migrations.migrateDutiesForRotationSupport();

      expect(result.migrated).toBe(0);
      expect(result.total).toBe(1);
    });

    it('should validate rotation data integrity', async () => {
      // Setup test data with integrity issues
      const duties = [
        {
          id: 'duty1',
          is_rotation: true,
          rotation_id: 'nonexistent_rotation'
        },
        {
          id: 'duty2',
          is_rotation: true
          // Missing rotation_id
        }
      ];
      const rotations = [
        {
          id: 'unused_rotation',
          name: 'Unused Rotation'
        }
      ];
      
      mockLocalStorage.setItem('duties', JSON.stringify(duties));
      mockLocalStorage.setItem('duty_rotations', JSON.stringify(rotations));

      const issues = await localClient.migrations.validateRotationDataIntegrity();

      expect(issues).toHaveLength(3);
      expect(issues.some(i => i.type === 'orphaned_rotation_duty')).toBe(true);
      expect(issues.some(i => i.type === 'missing_rotation_id')).toBe(true);
      expect(issues.some(i => i.type === 'unused_rotation')).toBe(true);
    });

    it('should cleanup unused rotation data', async () => {
      // Setup test data with unused rotation
      const duties = [
        {
          id: 'duty1',
          is_rotation: true,
          rotation_id: 'used_rotation'
        }
      ];
      const rotations = [
        {
          id: 'used_rotation',
          name: 'Used Rotation'
        },
        {
          id: 'unused_rotation',
          name: 'Unused Rotation'
        }
      ];
      
      mockLocalStorage.setItem('duties', JSON.stringify(duties));
      mockLocalStorage.setItem('duty_rotations', JSON.stringify(rotations));

      const result = await localClient.migrations.cleanupRotationData();

      expect(result.removed).toBe(1);
      expect(result.remaining).toBe(1);

      const cleanedRotations = JSON.parse(mockLocalStorage.getItem('duty_rotations'));
      expect(cleanedRotations).toHaveLength(1);
      expect(cleanedRotations[0].id).toBe('used_rotation');
    });
  });
});