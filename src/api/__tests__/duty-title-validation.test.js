import { describe, it, expect, beforeEach } from 'vitest';
import { localClient } from '../localClient.js';

describe('Duty Title Validation', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  describe('Title Dropdown Validation', () => {
    it('should accept valid standardized titles', async () => {
      const teamMember = await localClient.entities.TeamMember.create({
        name: 'John Doe',
        role: 'Developer',
        email: 'john@example.com'
      });

      // Test each valid title separately to avoid overlap conflicts
      const reportingDuty = await localClient.entities.Duty.create({
        team_member_id: teamMember.id,
        type: 'devops',
        title: 'Reporting',
        start_date: '2025-01-10',
        end_date: '2025-01-15'
      });
      expect(reportingDuty).toBeDefined();
      expect(reportingDuty.title).toBe('Reporting');

      const meteringDuty = await localClient.entities.Duty.create({
        team_member_id: teamMember.id,
        type: 'on_call', // Different type to avoid overlap
        title: 'Metering',
        start_date: '2025-01-20',
        end_date: '2025-01-25'
      });
      expect(meteringDuty).toBeDefined();
      expect(meteringDuty.title).toBe('Metering');

      const devopsDuty = await localClient.entities.Duty.create({
        team_member_id: teamMember.id,
        type: 'other', // Different type to avoid overlap
        title: 'DevOps',
        start_date: '2025-01-30',
        end_date: '2025-02-05'
      });
      expect(devopsDuty).toBeDefined();
      expect(devopsDuty.title).toBe('DevOps');
    });

    it('should reject invalid titles', async () => {
      const teamMember = await localClient.entities.TeamMember.create({
        name: 'John Doe',
        role: 'Developer',
        email: 'john@example.com'
      });

      const invalidTitles = [
        'DevOps Duty Week 1',
        'Custom Title',
        'invalid-title',
        'REPORTING',
        'Metering Duty'
      ];

      for (const title of invalidTitles) {
        await expect(localClient.entities.Duty.create({
          team_member_id: teamMember.id,
          type: 'devops',
          title: title,
          start_date: '2025-01-20',
          end_date: '2025-01-27'
        })).rejects.toThrow('Invalid duty title. Must be one of: Reporting, Metering, DevOps');
      }
    });

    it('should validate titles during update operations', async () => {
      const teamMember = await localClient.entities.TeamMember.create({
        name: 'John Doe',
        role: 'Developer',
        email: 'john@example.com'
      });

      // Create duty with valid title
      const duty = await localClient.entities.Duty.create({
        team_member_id: teamMember.id,
        type: 'devops',
        title: 'DevOps',
        start_date: '2025-01-20',
        end_date: '2025-01-27'
      });

      // Valid update
      const updatedDuty = await localClient.entities.Duty.update(duty.id, {
        title: 'Reporting'
      });
      expect(updatedDuty.title).toBe('Reporting');

      // Invalid update
      await expect(localClient.entities.Duty.update(duty.id, {
        title: 'Invalid Title'
      })).rejects.toThrow('Invalid duty title. Must be one of: Reporting, Metering, DevOps');
    });

    it('should maintain existing validation for other fields', async () => {
      const teamMember = await localClient.entities.TeamMember.create({
        name: 'John Doe',
        role: 'Developer',
        email: 'john@example.com'
      });

      // Test that other validations still work
      await expect(localClient.entities.Duty.create({
        team_member_id: teamMember.id,
        type: 'invalid_type',
        title: 'devops',
        start_date: '2025-01-20',
        end_date: '2025-01-27'
      })).rejects.toThrow('Invalid duty type');

      await expect(localClient.entities.Duty.create({
        team_member_id: teamMember.id,
        type: 'devops',
        title: 'DevOps',
        start_date: '2025-01-27',
        end_date: '2025-01-20' // Invalid date range
      })).rejects.toThrow('start_date must be before end_date');
    });
  });
});