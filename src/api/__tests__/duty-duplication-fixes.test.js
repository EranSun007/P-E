import { describe, it, expect, beforeEach } from 'vitest';
import { localClient } from '../localClient.js';

describe('Duty Duplication Fixes', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  describe('Exact Duplicate Prevention', () => {
    it('should prevent creating exact duplicate duties', async () => {
      // Create a team member first
      const teamMember = await localClient.entities.TeamMember.create({
        name: 'John Doe',
        role: 'Developer',
        email: 'john@example.com'
      });

      const dutyData = {
        team_member_id: teamMember.id,
        type: 'devops',
        title: 'DevOps',
        description: 'Responsible for deployments and monitoring',
        start_date: '2025-01-20',
        end_date: '2025-01-27'
      };

      // Create the first duty
      const firstDuty = await localClient.entities.Duty.create(dutyData);
      expect(firstDuty).toBeDefined();

      // Attempt to create an exact duplicate
      await expect(localClient.entities.Duty.create(dutyData))
        .rejects.toThrow('Duplicate duty detected: A duty with the same type "devops", title "DevOps", and date range already exists for this team member');
    });

    it('should prevent duties with same type and overlapping dates even with different titles', async () => {
      const teamMember = await localClient.entities.TeamMember.create({
        name: 'John Doe',
        role: 'Developer',
        email: 'john@example.com'
      });

      // Create first duty
      await localClient.entities.Duty.create({
        team_member_id: teamMember.id,
        type: 'devops',
        title: 'DevOps',
        start_date: '2025-01-20',
        end_date: '2025-01-27'
      });

      // Attempt to create second duty with different title but same type and overlapping dates
      await expect(localClient.entities.Duty.create({
        team_member_id: teamMember.id,
        type: 'devops',
        title: 'Metering', // Different title
        start_date: '2025-01-20',
        end_date: '2025-01-27'
      })).rejects.toThrow(/Duty assignment conflicts with existing duties of the same type for this team member.*Overlapping duty periods of the same type are not allowed/);
    });

    it('should allow duties with same title and dates but different types', async () => {
      const teamMember = await localClient.entities.TeamMember.create({
        name: 'John Doe',
        role: 'Developer',
        email: 'john@example.com'
      });

      // Create first duty
      await localClient.entities.Duty.create({
        team_member_id: teamMember.id,
        type: 'devops',
        title: 'DevOps',
        start_date: '2025-01-20',
        end_date: '2025-01-27'
      });

      // Create second duty with different type but same title and dates
      const secondDuty = await localClient.entities.Duty.create({
        team_member_id: teamMember.id,
        type: 'on_call', // Different type
        title: 'DevOps',
        start_date: '2025-01-20',
        end_date: '2025-01-27'
      });

      expect(secondDuty).toBeDefined();
      expect(secondDuty.type).toBe('on_call');
    });

    it('should allow duties with same type but different titles and non-overlapping dates', async () => {
      const teamMember = await localClient.entities.TeamMember.create({
        name: 'John Doe',
        role: 'Developer',
        email: 'john@example.com'
      });

      // Create first duty
      await localClient.entities.Duty.create({
        team_member_id: teamMember.id,
        type: 'devops',
        title: 'DevOps',
        start_date: '2025-01-20',
        end_date: '2025-01-27'
      });

      // Create second duty with same type but different title and non-overlapping dates
      const secondDuty = await localClient.entities.Duty.create({
        team_member_id: teamMember.id,
        type: 'devops',
        title: 'Metering', // Different title
        start_date: '2025-02-01', // Non-overlapping dates
        end_date: '2025-02-07'
      });

      expect(secondDuty).toBeDefined();
      expect(secondDuty.title).toBe('Metering');
    });

    it('should allow duties with same type and title but different dates', async () => {
      const teamMember = await localClient.entities.TeamMember.create({
        name: 'John Doe',
        role: 'Developer',
        email: 'john@example.com'
      });

      // Create first duty
      await localClient.entities.Duty.create({
        team_member_id: teamMember.id,
        type: 'devops',
        title: 'DevOps',
        start_date: '2025-01-20',
        end_date: '2025-01-27'
      });

      // Create second duty with different dates
      const secondDuty = await localClient.entities.Duty.create({
        team_member_id: teamMember.id,
        type: 'devops',
        title: 'DevOps',
        start_date: '2025-02-01', // Different dates
        end_date: '2025-02-07'
      });

      expect(secondDuty).toBeDefined();
      expect(secondDuty.start_date).toBe('2025-02-01');
    });
  });

  describe('Overlapping Period Prevention', () => {
    it('should prevent overlapping duty periods for same team member and same type', async () => {
      const teamMember = await localClient.entities.TeamMember.create({
        name: 'John Doe',
        role: 'Developer',
        email: 'john@example.com'
      });

      // Create first duty
      await localClient.entities.Duty.create({
        team_member_id: teamMember.id,
        type: 'devops',
        title: 'DevOps',
        start_date: '2025-01-20',
        end_date: '2025-01-27'
      });

      // Attempt to create overlapping duty of the same type
      await expect(localClient.entities.Duty.create({
        team_member_id: teamMember.id,
        type: 'devops', // Same type
        title: 'Metering',
        start_date: '2025-01-25', // Overlaps with existing duty
        end_date: '2025-02-01'
      })).rejects.toThrow(/Duty assignment conflicts with existing duties of the same type for this team member.*Overlapping duty periods of the same type are not allowed/);
    });

    it('should allow overlapping duty periods for same team member but different types', async () => {
      const teamMember = await localClient.entities.TeamMember.create({
        name: 'John Doe',
        role: 'Developer',
        email: 'john@example.com'
      });

      // Create first duty
      await localClient.entities.Duty.create({
        team_member_id: teamMember.id,
        type: 'devops',
        title: 'DevOps',
        start_date: '2025-01-20',
        end_date: '2025-01-27'
      });

      // Create overlapping duty of different type - should be allowed
      const secondDuty = await localClient.entities.Duty.create({
        team_member_id: teamMember.id,
        type: 'on_call', // Different type
        title: 'Reporting',
        start_date: '2025-01-25', // Overlaps with existing duty
        end_date: '2025-02-01'
      });

      expect(secondDuty).toBeDefined();
      expect(secondDuty.type).toBe('on_call');
    });

    it('should prevent duty that completely contains existing duty of same type', async () => {
      const teamMember = await localClient.entities.TeamMember.create({
        name: 'John Doe',
        role: 'Developer',
        email: 'john@example.com'
      });

      // Create first duty
      await localClient.entities.Duty.create({
        team_member_id: teamMember.id,
        type: 'devops',
        title: 'DevOps',
        start_date: '2025-01-22',
        end_date: '2025-01-25'
      });

      // Attempt to create duty that contains the existing one of the same type
      await expect(localClient.entities.Duty.create({
        team_member_id: teamMember.id,
        type: 'devops', // Same type
        title: 'DevOps',
        start_date: '2025-01-20', // Starts before existing
        end_date: '2025-01-27' // Ends after existing
      })).rejects.toThrow(/Duty assignment conflicts with existing duties of the same type for this team member.*Overlapping duty periods of the same type are not allowed/);
    });

    it('should prevent duty that is completely contained by existing duty of same type', async () => {
      const teamMember = await localClient.entities.TeamMember.create({
        name: 'John Doe',
        role: 'Developer',
        email: 'john@example.com'
      });

      // Create first duty (longer period)
      await localClient.entities.Duty.create({
        team_member_id: teamMember.id,
        type: 'devops',
        title: 'DevOps',
        start_date: '2025-01-20',
        end_date: '2025-01-27'
      });

      // Attempt to create duty that is contained within the existing one of the same type
      await expect(localClient.entities.Duty.create({
        team_member_id: teamMember.id,
        type: 'devops', // Same type
        title: 'DevOps',
        start_date: '2025-01-22', // Starts after existing
        end_date: '2025-01-25' // Ends before existing
      })).rejects.toThrow(/Duty assignment conflicts with existing duties of the same type for this team member.*Overlapping duty periods of the same type are not allowed/);
    });

    it('should allow adjacent duty periods of same type (no overlap)', async () => {
      const teamMember = await localClient.entities.TeamMember.create({
        name: 'John Doe',
        role: 'Developer',
        email: 'john@example.com'
      });

      // Create first duty
      await localClient.entities.Duty.create({
        team_member_id: teamMember.id,
        type: 'devops',
        title: 'DevOps',
        start_date: '2025-01-20',
        end_date: '2025-01-27'
      });

      // Create adjacent duty of same type (starts the day after first ends)
      const secondDuty = await localClient.entities.Duty.create({
        team_member_id: teamMember.id,
        type: 'devops', // Same type
        title: 'Metering',
        start_date: '2025-01-28', // Day after first duty ends
        end_date: '2025-02-03'
      });

      expect(secondDuty).toBeDefined();
      expect(secondDuty.start_date).toBe('2025-01-28');
    });

    it('should allow duties for different team members with same dates', async () => {
      const teamMember1 = await localClient.entities.TeamMember.create({
        name: 'John Doe',
        role: 'Developer',
        email: 'john@example.com'
      });

      const teamMember2 = await localClient.entities.TeamMember.create({
        name: 'Jane Smith',
        role: 'Developer',
        email: 'jane@example.com'
      });

      // Create duty for first team member
      await localClient.entities.Duty.create({
        team_member_id: teamMember1.id,
        type: 'devops',
        title: 'DevOps',
        start_date: '2025-01-20',
        end_date: '2025-01-27'
      });

      // Create duty for second team member with same dates
      const secondDuty = await localClient.entities.Duty.create({
        team_member_id: teamMember2.id,
        type: 'devops',
        title: 'DevOps',
        start_date: '2025-01-20',
        end_date: '2025-01-27'
      });

      expect(secondDuty).toBeDefined();
      expect(secondDuty.team_member_id).toBe(teamMember2.id);
    });
  });

  describe('Update Validation', () => {
    it('should prevent updating duty to create exact duplicate', async () => {
      const teamMember = await localClient.entities.TeamMember.create({
        name: 'John Doe',
        role: 'Developer',
        email: 'john@example.com'
      });

      // Create first duty
      await localClient.entities.Duty.create({
        team_member_id: teamMember.id,
        type: 'devops',
        title: 'DevOps',
        start_date: '2025-01-20',
        end_date: '2025-01-27'
      });

      // Create second duty
      const secondDuty = await localClient.entities.Duty.create({
        team_member_id: teamMember.id,
        type: 'on_call',
        title: 'Reporting',
        start_date: '2025-02-01',
        end_date: '2025-02-07'
      });

      // Attempt to update second duty to match first duty exactly
      await expect(localClient.entities.Duty.update(secondDuty.id, {
        type: 'devops',
        title: 'DevOps',
        start_date: '2025-01-20',
        end_date: '2025-01-27'
      })).rejects.toThrow('Duplicate duty detected: A duty with the same type "devops", title "DevOps", and date range already exists for this team member');
    });

    it('should prevent updating duty to create overlapping periods of same type', async () => {
      const teamMember = await localClient.entities.TeamMember.create({
        name: 'John Doe',
        role: 'Developer',
        email: 'john@example.com'
      });

      // Create first duty
      await localClient.entities.Duty.create({
        team_member_id: teamMember.id,
        type: 'devops',
        title: 'DevOps',
        start_date: '2025-01-20',
        end_date: '2025-01-27'
      });

      // Create second duty
      const secondDuty = await localClient.entities.Duty.create({
        team_member_id: teamMember.id,
        type: 'devops', // Same type
        title: 'Metering',
        start_date: '2025-02-01',
        end_date: '2025-02-07'
      });

      // Attempt to update second duty to overlap with first
      await expect(localClient.entities.Duty.update(secondDuty.id, {
        start_date: '2025-01-25', // Overlaps with first duty
        end_date: '2025-02-01'
      })).rejects.toThrow(/Duty assignment conflicts with existing duties of the same type for this team member.*Overlapping duty periods of the same type are not allowed/);
    });

    it('should allow updating duty to overlap with different type duties', async () => {
      const teamMember = await localClient.entities.TeamMember.create({
        name: 'John Doe',
        role: 'Developer',
        email: 'john@example.com'
      });

      // Create first duty
      await localClient.entities.Duty.create({
        team_member_id: teamMember.id,
        type: 'devops',
        title: 'DevOps',
        start_date: '2025-01-20',
        end_date: '2025-01-27'
      });

      // Create second duty of different type
      const secondDuty = await localClient.entities.Duty.create({
        team_member_id: teamMember.id,
        type: 'on_call', // Different type
        title: 'Reporting',
        start_date: '2025-02-01',
        end_date: '2025-02-07'
      });

      // Update second duty to overlap with first - should be allowed since different types
      const updatedDuty = await localClient.entities.Duty.update(secondDuty.id, {
        start_date: '2025-01-25', // Overlaps with first duty
        end_date: '2025-02-01'
      });

      expect(updatedDuty.start_date).toBe('2025-01-25');
    });

    it('should allow updating duty without creating conflicts', async () => {
      const teamMember = await localClient.entities.TeamMember.create({
        name: 'John Doe',
        role: 'Developer',
        email: 'john@example.com'
      });

      // Create duty
      const duty = await localClient.entities.Duty.create({
        team_member_id: teamMember.id,
        type: 'devops',
        title: 'DevOps',
        start_date: '2025-01-20',
        end_date: '2025-01-27'
      });

      // Update duty without conflicts
      const updatedDuty = await localClient.entities.Duty.update(duty.id, {
        title: 'DevOps',
        description: 'Updated description'
      });

      expect(updatedDuty.title).toBe('DevOps');
      expect(updatedDuty.description).toBe('Updated description');
    });
  });

  describe('Error Message Quality', () => {
    it('should provide detailed error message for overlapping duties of same type', async () => {
      const teamMember = await localClient.entities.TeamMember.create({
        name: 'John Doe',
        role: 'Developer',
        email: 'john@example.com'
      });

      // Create first duty
      await localClient.entities.Duty.create({
        team_member_id: teamMember.id,
        type: 'devops',
        title: 'DevOps',
        start_date: '2025-01-20',
        end_date: '2025-01-27'
      });

      // Create second duty of same type
      await localClient.entities.Duty.create({
        team_member_id: teamMember.id,
        type: 'devops',
        title: 'Metering',
        start_date: '2025-02-01',
        end_date: '2025-02-07'
      });

      // Attempt to create overlapping duty of same type
      try {
        await localClient.entities.Duty.create({
          team_member_id: teamMember.id,
          type: 'devops', // Same type as existing duties
          title: 'DevOps',
          start_date: '2025-01-25', // Overlaps with both existing duties
          end_date: '2025-02-05'
        });
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error.message).toContain('Duty assignment conflicts with existing duties of the same type for this team member');
        expect(error.message).toContain('"DevOps" (devops) from 2025-01-20 to 2025-01-27');
        expect(error.message).toContain('"Metering" (devops) from 2025-02-01 to 2025-02-07');
        expect(error.message).toContain('Overlapping duty periods of the same type are not allowed');
      }
    });

    it('should provide clear error message for exact duplicates', async () => {
      const teamMember = await localClient.entities.TeamMember.create({
        name: 'John Doe',
        role: 'Developer',
        email: 'john@example.com'
      });

      const dutyData = {
        team_member_id: teamMember.id,
        type: 'devops',
        title: 'DevOps',
        start_date: '2025-01-20',
        end_date: '2025-01-27'
      };

      // Create first duty
      await localClient.entities.Duty.create(dutyData);

      // Attempt to create exact duplicate
      try {
        await localClient.entities.Duty.create(dutyData);
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error.message).toBe('Duplicate duty detected: A duty with the same type "devops", title "DevOps", and date range already exists for this team member');
      }
    });
  });
});