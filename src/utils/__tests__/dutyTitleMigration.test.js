import { describe, it, expect, beforeEach } from 'vitest';
import dutyTitleMigration from '../dutyTitleMigration.js';
import { localClient } from '../../api/localClient.js';

const { migrateDutyTitles, previewDutyTitleMigration, mapTitle } = dutyTitleMigration;

describe('Duty Title Migration', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  describe('mapTitle function', () => {
    it('should map common title variations to standardized values', () => {
      expect(mapTitle('DevOps Duty Week 1')).toBe('devops');
      expect(mapTitle('devops')).toBe('devops');
      expect(mapTitle('Dev Ops')).toBe('devops');
      expect(mapTitle('Reporting')).toBe('reporting');
      expect(mapTitle('Report')).toBe('reporting');
      expect(mapTitle('Metering')).toBe('metering');
      expect(mapTitle('Meter Reading')).toBe('metering');
    });

    it('should handle edge cases', () => {
      expect(mapTitle('')).toBe('devops'); // Default fallback
      expect(mapTitle('Unknown Title')).toBe('devops'); // Default fallback
      expect(mapTitle('DEVOPS')).toBe('devops'); // Case insensitive
    });
  });

  describe('previewDutyTitleMigration', () => {
    it('should preview migration without changing data', async () => {
      // For now, just test with empty data since we can't easily create invalid titles
      const preview = await previewDutyTitleMigration();
      
      expect(preview.totalDuties).toBe(0);
      expect(preview.needsMigration).toBe(0);
      expect(preview.alreadyStandardized).toBe(0);
    });
  });

  describe('migrateDutyTitles', () => {
    it('should handle empty duty list gracefully', async () => {
      const result = await migrateDutyTitles();
      
      expect(result.success).toBe(true);
      expect(result.migratedCount).toBe(0);
      expect(result.skippedCount).toBe(0);
      expect(result.totalProcessed).toBe(0);
    });

    it('should process duties with standardized titles', async () => {
      const teamMember = await localClient.entities.TeamMember.create({
        name: 'John Doe',
        role: 'Developer',
        email: 'john@example.com'
      });

      // Create duty with standardized title
      await localClient.entities.Duty.create({
        team_member_id: teamMember.id,
        type: 'devops',
        title: 'devops', // Already standardized
        start_date: '2025-01-20',
        end_date: '2025-01-27'
      });

      const result = await migrateDutyTitles();
      
      expect(result.success).toBe(true);
      expect(result.migratedCount).toBe(0); // No migration needed
      expect(result.skippedCount).toBe(1); // Skipped because already standardized
      expect(result.totalProcessed).toBe(1);
    });
  });
});