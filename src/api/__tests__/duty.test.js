import { describe, it, expect, beforeEach } from 'vitest';
import { Duty, TeamMember } from '../entities.js';

describe('Duty Entity', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  describe('CRUD Operations', () => {
    it('should create a duty with valid data', async () => {
      const teamMember = await TeamMember.create({
        name: 'John Doe',
        role: 'Developer',
        email: 'john@example.com'
      });

      const dutyData = {
        team_member_id: teamMember.id,
        type: 'devops',
        title: 'DevOps Duty Week 1',
        description: 'Responsible for deployments and monitoring',
        start_date: '2025-01-20',
        end_date: '2025-01-27'
      };

      const duty = await Duty.create(dutyData);

      expect(duty).toBeDefined();
      expect(duty.id).toBeDefined();
      expect(duty.team_member_id).toBe(teamMember.id);
      expect(duty.type).toBe('devops');
      expect(duty.title).toBe('DevOps Duty Week 1');
      expect(duty.description).toBe('Responsible for deployments and monitoring');
      expect(duty.start_date).toBe('2025-01-20');
      expect(duty.end_date).toBe('2025-01-27');
      expect(duty.created_date).toBeDefined();
      expect(duty.updated_date).toBeDefined();
    });

    it('should get duty by id', async () => {
      const teamMember = await TeamMember.create({
        name: 'John Doe',
        role: 'Developer',
        email: 'john@example.com'
      });

      const duty = await Duty.create({
        team_member_id: teamMember.id,
        type: 'devops',
        title: 'DevOps Duty 1',
        start_date: '2025-01-20',
        end_date: '2025-01-27'
      });

      const retrievedDuty = await Duty.get(duty.id);
      expect(retrievedDuty).toBeDefined();
      expect(retrievedDuty.id).toBe(duty.id);
      expect(retrievedDuty.title).toBe('DevOps Duty 1');
    });

    it('should return null for non-existent duty', async () => {
      const retrievedDuty = await Duty.get('non-existent-id');
      expect(retrievedDuty).toBeNull();
    });

    it('should list all duties', async () => {
      const teamMember = await TeamMember.create({
        name: 'John Doe',
        role: 'Developer',
        email: 'john@example.com'
      });

      await Duty.create({
        team_member_id: teamMember.id,
        type: 'devops',
        title: 'DevOps Duty 1',
        start_date: '2025-01-20',
        end_date: '2025-01-27'
      });

      await Duty.create({
        team_member_id: teamMember.id,
        type: 'on_call',
        title: 'On-Call Duty 1',
        start_date: '2025-02-01',
        end_date: '2025-02-07'
      });

      const duties = await Duty.list();
      expect(duties).toHaveLength(2);
      expect(duties[0].title).toBe('On-Call Duty 1'); // Most recent first
      expect(duties[1].title).toBe('DevOps Duty 1');
    });

    it('should update duty', async () => {
      const teamMember = await TeamMember.create({
        name: 'John Doe',
        role: 'Developer',
        email: 'john@example.com'
      });

      const duty = await Duty.create({
        team_member_id: teamMember.id,
        type: 'devops',
        title: 'DevOps Duty 1',
        start_date: '2025-01-20',
        end_date: '2025-01-27'
      });

      const updatedDuty = await Duty.update(duty.id, {
        title: 'Updated DevOps Duty',
        description: 'Updated description'
      });

      expect(updatedDuty.title).toBe('Updated DevOps Duty');
      expect(updatedDuty.description).toBe('Updated description');
      expect(updatedDuty.updated_date).not.toBe(duty.updated_date);
    });

    it('should delete duty', async () => {
      const teamMember = await TeamMember.create({
        name: 'John Doe',
        role: 'Developer',
        email: 'john@example.com'
      });

      const duty = await Duty.create({
        team_member_id: teamMember.id,
        type: 'devops',
        title: 'DevOps Duty 1',
        start_date: '2025-01-20',
        end_date: '2025-01-27'
      });

      await Duty.delete(duty.id);

      const duties = await Duty.list();
      expect(duties).toHaveLength(0);

      const retrievedDuty = await Duty.get(duty.id);
      expect(retrievedDuty).toBeNull();
    });
  });

  describe('Validation', () => {
    it('should validate required fields', async () => {
      await expect(Duty.create({
        type: 'devops',
        title: 'Test Duty',
        start_date: '2025-01-20',
        end_date: '2025-01-27'
      })).rejects.toThrow('team_member_id is required');

      await expect(Duty.create({
        team_member_id: 'test-id',
        title: 'Test Duty',
        start_date: '2025-01-20',
        end_date: '2025-01-27'
      })).rejects.toThrow('duty type is required');

      await expect(Duty.create({
        team_member_id: 'test-id',
        type: 'devops',
        start_date: '2025-01-20',
        end_date: '2025-01-27'
      })).rejects.toThrow('duty title is required');

      await expect(Duty.create({
        team_member_id: 'test-id',
        type: 'devops',
        title: 'Test Duty',
        end_date: '2025-01-27'
      })).rejects.toThrow('start_date is required');

      await expect(Duty.create({
        team_member_id: 'test-id',
        type: 'devops',
        title: 'Test Duty',
        start_date: '2025-01-20'
      })).rejects.toThrow('end_date is required');
    });

    it('should validate duty type', async () => {
      const teamMember = await TeamMember.create({
        name: 'John Doe',
        role: 'Developer',
        email: 'john@example.com'
      });

      await expect(Duty.create({
        team_member_id: teamMember.id,
        type: 'invalid_type',
        title: 'Test Duty',
        start_date: '2025-01-20',
        end_date: '2025-01-27'
      })).rejects.toThrow('Invalid duty type. Must be one of: devops, on_call, other');
    });

    it('should validate date range', async () => {
      const teamMember = await TeamMember.create({
        name: 'John Doe',
        role: 'Developer',
        email: 'john@example.com'
      });

      await expect(Duty.create({
        team_member_id: teamMember.id,
        type: 'devops',
        title: 'Test Duty',
        start_date: '2025-01-27',
        end_date: '2025-01-20'
      })).rejects.toThrow('start_date must be before end_date');
    });
  });

  describe('Query Methods', () => {
    it('should get duties by team member', async () => {
      const teamMember1 = await TeamMember.create({
        name: 'John Doe',
        role: 'Developer',
        email: 'john@example.com'
      });

      const teamMember2 = await TeamMember.create({
        name: 'Jane Smith',
        role: 'Developer',
        email: 'jane@example.com'
      });

      await Duty.create({
        team_member_id: teamMember1.id,
        type: 'devops',
        title: 'John DevOps Duty',
        start_date: '2025-01-20',
        end_date: '2025-01-27'
      });

      await Duty.create({
        team_member_id: teamMember2.id,
        type: 'on_call',
        title: 'Jane On-Call Duty',
        start_date: '2025-01-20',
        end_date: '2025-01-27'
      });

      const johnDuties = await Duty.getByTeamMember(teamMember1.id);
      expect(johnDuties).toHaveLength(1);
      expect(johnDuties[0].title).toBe('John DevOps Duty');

      const janeDuties = await Duty.getByTeamMember(teamMember2.id);
      expect(janeDuties).toHaveLength(1);
      expect(janeDuties[0].title).toBe('Jane On-Call Duty');
    });

    it('should get active duties for date', async () => {
      const teamMember = await TeamMember.create({
        name: 'John Doe',
        role: 'Developer',
        email: 'john@example.com'
      });

      // Past duty
      await Duty.create({
        team_member_id: teamMember.id,
        type: 'devops',
        title: 'Past Duty',
        start_date: '2025-01-01',
        end_date: '2025-01-07'
      });

      // Active duty
      await Duty.create({
        team_member_id: teamMember.id,
        type: 'devops',
        title: 'Active Duty',
        start_date: '2025-01-20',
        end_date: '2025-01-27'
      });

      // Future duty
      await Duty.create({
        team_member_id: teamMember.id,
        type: 'on_call',
        title: 'Future Duty',
        start_date: '2025-02-01',
        end_date: '2025-02-07'
      });

      const activeDuties = await Duty.getActiveForDate('2025-01-25');
      expect(activeDuties).toHaveLength(1);
      expect(activeDuties[0].title).toBe('Active Duty');
    });

    it('should get conflicts for duty assignment', async () => {
      const teamMember = await TeamMember.create({
        name: 'John Doe',
        role: 'Developer',
        email: 'john@example.com'
      });

      const existingDuty = await Duty.create({
        team_member_id: teamMember.id,
        type: 'devops',
        title: 'Existing Duty',
        start_date: '2025-01-20',
        end_date: '2025-01-27'
      });

      // Test overlapping duty
      const conflicts = await Duty.getConflicts(
        teamMember.id,
        '2025-01-25',
        '2025-02-01'
      );

      expect(conflicts).toHaveLength(1);
      expect(conflicts[0].id).toBe(existingDuty.id);

      // Test excluding current duty from conflicts
      const conflictsExcluding = await Duty.getConflicts(
        teamMember.id,
        '2025-01-25',
        '2025-02-01',
        existingDuty.id
      );

      expect(conflictsExcluding).toHaveLength(0);
    });
  });
});