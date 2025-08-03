import { describe, it, expect, beforeEach } from 'vitest';
import { localClient } from '../localClient.js';

describe('Duty Requirements Validation', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  describe('Requirement 1.1: Prevent duplicate entries for same team member and duty type', () => {
    it('should prevent exact duplicate duties (same type, title, dates)', async () => {
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

      // Attempt to create exact duplicate - should fail
      await expect(localClient.entities.Duty.create(dutyData))
        .rejects.toThrow('Duplicate duty detected');
    });

    it('should prevent overlapping duties of same type', async () => {
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

      // Attempt to create overlapping duty of same type - should fail
      await expect(localClient.entities.Duty.create({
        team_member_id: teamMember.id,
        type: 'devops',
        title: 'DevOps',
        start_date: '2025-01-25', // Overlaps
        end_date: '2025-02-01'
      })).rejects.toThrow('Duty assignment conflicts with existing duties of the same type');
    });

    it('should allow overlapping duties of different types', async () => {
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

      // Create overlapping duty of different type - should succeed
      const secondDuty = await localClient.entities.Duty.create({
        team_member_id: teamMember.id,
        type: 'on_call', // Different type
        title: 'Reporting', // Different title from different category
        start_date: '2025-01-25', // Overlaps
        end_date: '2025-02-01'
      });

      expect(secondDuty).toBeDefined();
      expect(secondDuty.type).toBe('on_call');
    });
  });

  describe('Requirement 1.2: Validate against existing duties before creating entry', () => {
    it('should validate during create operation', async () => {
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

      // Validation should happen before save
      await expect(localClient.entities.Duty.create({
        team_member_id: teamMember.id,
        type: 'devops',
        title: 'DevOps',
        start_date: '2025-01-20',
        end_date: '2025-01-27'
      })).rejects.toThrow();
    });

    it('should validate during update operation', async () => {
      const teamMember = await localClient.entities.TeamMember.create({
        name: 'John Doe',
        role: 'Developer',
        email: 'john@example.com'
      });

      // Create two duties
      const duty1 = await localClient.entities.Duty.create({
        team_member_id: teamMember.id,
        type: 'devops',
        title: 'DevOps',
        start_date: '2025-01-20',
        end_date: '2025-01-27'
      });

      const duty2 = await localClient.entities.Duty.create({
        team_member_id: teamMember.id,
        type: 'on_call',
        title: 'Reporting',
        start_date: '2025-02-01',
        end_date: '2025-02-07'
      });

      // Attempt to update duty2 to duplicate duty1
      await expect(localClient.entities.Duty.update(duty2.id, {
        type: 'devops',
        title: 'DevOps',
        start_date: '2025-01-20',
        end_date: '2025-01-27'
      })).rejects.toThrow('Duplicate duty detected');
    });
  });

  describe('Requirement 1.3: Show clear error message and prevent creation', () => {
    it('should provide clear error message for duplicates', async () => {
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

      await localClient.entities.Duty.create(dutyData);

      try {
        await localClient.entities.Duty.create(dutyData);
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error.message).toContain('Duplicate duty detected');
        expect(error.message).toContain('devops');
        expect(error.message).toContain('DevOps');
        expect(error.message).toContain('already exists for this team member');
      }
    });

    it('should provide clear error message for overlapping periods', async () => {
      const teamMember = await localClient.entities.TeamMember.create({
        name: 'John Doe',
        role: 'Developer',
        email: 'john@example.com'
      });

      await localClient.entities.Duty.create({
        team_member_id: teamMember.id,
        type: 'devops',
        title: 'DevOps',
        start_date: '2025-01-20',
        end_date: '2025-01-27'
      });

      try {
        await localClient.entities.Duty.create({
          team_member_id: teamMember.id,
          type: 'devops',
          title: 'DevOps',
          start_date: '2025-01-25',
          end_date: '2025-02-01'
        });
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error.message).toContain('Duty assignment conflicts');
        expect(error.message).toContain('existing duties of the same type');
        expect(error.message).toContain('devops');
        expect(error.message).toContain('2025-01-20 to 2025-01-27');
        expect(error.message).toContain('Overlapping duty periods of the same type are not allowed');
      }
    });

    it('should prevent creation when validation fails', async () => {
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

      await localClient.entities.Duty.create(dutyData);

      // Attempt to create duplicate
      await expect(localClient.entities.Duty.create(dutyData)).rejects.toThrow();

      // Verify only one duty exists
      const duties = await localClient.entities.Duty.list();
      expect(duties).toHaveLength(1);
    });
  });

  describe('Requirement 1.4: Display each duty only once without conflicts', () => {
    it('should maintain data integrity after validation', async () => {
      const teamMember = await localClient.entities.TeamMember.create({
        name: 'John Doe',
        role: 'Developer',
        email: 'john@example.com'
      });

      // Create valid duties
      await localClient.entities.Duty.create({
        team_member_id: teamMember.id,
        type: 'devops',
        title: 'DevOps',
        start_date: '2025-01-20',
        end_date: '2025-01-27'
      });

      await localClient.entities.Duty.create({
        team_member_id: teamMember.id,
        type: 'on_call',
        title: 'Reporting',
        start_date: '2025-01-25', // Overlaps but different type
        end_date: '2025-02-01'
      });

      await localClient.entities.Duty.create({
        team_member_id: teamMember.id,
        type: 'devops',
        title: 'Metering',
        start_date: '2025-02-10', // Non-overlapping
        end_date: '2025-02-17'
      });

      // Verify all duties are stored correctly
      const duties = await localClient.entities.Duty.list();
      expect(duties).toHaveLength(3);

      // Verify no duplicates exist
      const dutyTitles = duties.map(d => `${d.type}-${d.title}-${d.start_date}-${d.end_date}`);
      const uniqueTitles = [...new Set(dutyTitles)];
      expect(dutyTitles).toHaveLength(uniqueTitles.length);
    });
  });
});