// src/services/__tests__/calendarEventDeduplicationService.test.js
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CalendarEventDeduplicationService } from '../calendarEventDeduplicationService.js';
import { CalendarEvent, Duty } from '../../api/entities.js';
import { logAuditEvent } from '../auditService.js';

// Mock the entities and audit service
vi.mock('../../api/entities.js', () => ({
  CalendarEvent: {
    list: vi.fn(),
    cleanupDuplicateEvents: vi.fn(),
    validateDutyEventConsistency: vi.fn(),
    delete: vi.fn()
  },
  Duty: {
    list: vi.fn()
  }
}));

vi.mock('../auditService.js', () => ({
  logAuditEvent: vi.fn(),
  AUDIT_ACTIONS: {
    READ: 'read',
    DELETE: 'delete',
    ERROR: 'error'
  },
  AUDIT_RESOURCES: {
    CALENDAR_EVENT: 'calendar_event'
  }
}));

// Mock console methods to avoid noise in tests
const originalConsole = { ...console };
beforeEach(() => {
  console.log = vi.fn();
  console.error = vi.fn();
});

describe('CalendarEventDeduplicationService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Restore console for specific tests that need it
    console.log = originalConsole.log;
    console.error = originalConsole.error;
  });

  describe('runCleanup', () => {
    it('should perform dry run cleanup successfully', async () => {
      const mockEvents = [
        { id: 'event1', event_type: 'duty', duty_id: 'duty1' },
        { id: 'event2', event_type: 'duty', duty_id: 'duty1' }, // duplicate
        { id: 'event3', event_type: 'meeting' }
      ];

      CalendarEvent.list.mockResolvedValue(mockEvents);
      CalendarEvent.validateDutyEventConsistency.mockResolvedValue([]);

      const result = await CalendarEventDeduplicationService.runCleanup({ 
        dryRun: true, 
        verbose: false 
      });

      expect(result.dryRun).toBe(true);
      expect(result.deduplication.duplicatesFound).toBe(1);
      expect(result.consistency.totalIssues).toBe(0);
      expect(result.summary.status).toBe('completed');
      expect(logAuditEvent).toHaveBeenCalledWith(
        'read',
        'calendar_event',
        null,
        expect.objectContaining({
          operation: 'deduplication_cleanup',
          dryRun: true
        })
      );
    });

    it('should perform live cleanup successfully', async () => {
      const mockCleanupResult = {
        duplicatesRemoved: 2,
        duplicateEvents: [
          { id: 'event2', duty_id: 'duty1' },
          { id: 'event4', duty_id: 'duty2' }
        ]
      };

      CalendarEvent.cleanupDuplicateEvents.mockResolvedValue(mockCleanupResult);
      CalendarEvent.validateDutyEventConsistency.mockResolvedValue([]);

      const result = await CalendarEventDeduplicationService.runCleanup({ 
        dryRun: false, 
        verbose: false 
      });

      expect(result.dryRun).toBe(false);
      expect(result.deduplication.duplicatesFound).toBe(2);
      expect(result.summary.totalIssuesResolved).toBe(2);
      expect(logAuditEvent).toHaveBeenCalledWith(
        'delete',
        'calendar_event',
        null,
        expect.objectContaining({
          operation: 'deduplication_cleanup',
          dryRun: false
        })
      );
    });

    it('should handle consistency issues in report', async () => {
      const mockInconsistencies = [
        {
          type: 'orphaned_calendar_event',
          event: { id: 'event1' },
          issue: 'Orphaned event'
        },
        {
          type: 'missing_calendar_event',
          duty: { id: 'duty1' },
          issue: 'Missing event'
        }
      ];

      CalendarEvent.list.mockResolvedValue([]);
      CalendarEvent.validateDutyEventConsistency.mockResolvedValue(mockInconsistencies);

      const result = await CalendarEventDeduplicationService.runCleanup({ 
        dryRun: true, 
        verbose: false 
      });

      expect(result.consistency.totalIssues).toBe(2);
      expect(result.consistency.issuesByType).toHaveProperty('orphaned_calendar_event');
      expect(result.consistency.issuesByType).toHaveProperty('missing_calendar_event');
      expect(result.consistency.issuesByType.orphaned_calendar_event).toHaveLength(1);
      expect(result.consistency.issuesByType.missing_calendar_event).toHaveLength(1);
    });

    it('should handle errors gracefully', async () => {
      const error = new Error('Database connection failed');
      CalendarEvent.list.mockRejectedValue(error);

      await expect(
        CalendarEventDeduplicationService.runCleanup({ dryRun: true })
      ).rejects.toThrow('Database connection failed');

      expect(logAuditEvent).toHaveBeenCalledWith(
        'error',
        'calendar_event',
        null,
        expect.objectContaining({
          operation: 'deduplication_cleanup',
          error: 'Database connection failed'
        })
      );
    });

    it('should provide verbose logging when requested', async () => {
      console.log = vi.fn();
      
      CalendarEvent.list.mockResolvedValue([]);
      CalendarEvent.validateDutyEventConsistency.mockResolvedValue([]);

      await CalendarEventDeduplicationService.runCleanup({ 
        dryRun: true, 
        verbose: true 
      });

      expect(console.log).toHaveBeenCalledWith('🧹 Starting calendar event deduplication cleanup...');
      expect(console.log).toHaveBeenCalledWith('Mode: DRY RUN');
      expect(console.log).toHaveBeenCalledWith('✅ Cleanup completed successfully');
    });
  });

  describe('getCleanupStatistics', () => {
    it('should return cleanup statistics without performing cleanup', async () => {
      const mockEvents = [
        { id: 'event1', event_type: 'duty', duty_id: 'duty1' },
        { id: 'event2', event_type: 'duty', duty_id: 'duty1' } // duplicate
      ];

      const mockInconsistencies = [
        { type: 'orphaned_calendar_event', event: { id: 'event3' } }
      ];

      CalendarEvent.list.mockResolvedValue(mockEvents);
      CalendarEvent.validateDutyEventConsistency.mockResolvedValue(mockInconsistencies);

      const stats = await CalendarEventDeduplicationService.getCleanupStatistics();

      expect(stats.duplicatesFound).toBe(1);
      expect(stats.consistencyIssues).toBe(1);
      expect(stats.wouldResolve).toBe(1);
      expect(stats.issuesByType).toHaveProperty('orphaned_calendar_event');
      expect(stats.timestamp).toBeDefined();
    });
  });

  describe('fixConsistencyIssues', () => {
    it('should fix orphaned calendar events', async () => {
      const inconsistencies = [
        {
          type: 'orphaned_calendar_event',
          event: { id: 'event1' },
          issue: 'Orphaned event'
        }
      ];

      CalendarEvent.delete.mockResolvedValue(true);

      const result = await CalendarEventDeduplicationService.fixConsistencyIssues(
        inconsistencies,
        { dryRun: false }
      );

      expect(result.fixed).toHaveLength(1);
      expect(result.fixed[0].type).toBe('orphaned_calendar_event');
      expect(result.fixed[0].action).toBe('deleted_orphaned_event');
      expect(CalendarEvent.delete).toHaveBeenCalledWith('event1');
    });

    it('should skip missing calendar events', async () => {
      const inconsistencies = [
        {
          type: 'missing_calendar_event',
          duty: { id: 'duty1' },
          issue: 'Missing event'
        }
      ];

      const result = await CalendarEventDeduplicationService.fixConsistencyIssues(
        inconsistencies,
        { dryRun: false }
      );

      expect(result.skipped).toHaveLength(1);
      expect(result.skipped[0].type).toBe('missing_calendar_event');
      expect(result.skipped[0].reason).toBe('requires_manual_intervention');
    });

    it('should fix multiple calendar events for same duty', async () => {
      const inconsistencies = [
        {
          type: 'multiple_calendar_events',
          duty: { id: 'duty1' },
          events: [
            { id: 'event1' },
            { id: 'event2' },
            { id: 'event3' }
          ],
          issue: 'Multiple events'
        }
      ];

      CalendarEvent.delete.mockResolvedValue(true);

      const result = await CalendarEventDeduplicationService.fixConsistencyIssues(
        inconsistencies,
        { dryRun: false }
      );

      expect(result.fixed).toHaveLength(1);
      expect(result.fixed[0].type).toBe('multiple_calendar_events');
      expect(result.fixed[0].eventsRemoved).toBe(2);
      expect(CalendarEvent.delete).toHaveBeenCalledWith('event2');
      expect(CalendarEvent.delete).toHaveBeenCalledWith('event3');
    });

    it('should perform dry run without making changes', async () => {
      const inconsistencies = [
        {
          type: 'orphaned_calendar_event',
          event: { id: 'event1' },
          issue: 'Orphaned event'
        }
      ];

      const result = await CalendarEventDeduplicationService.fixConsistencyIssues(
        inconsistencies,
        { dryRun: true }
      );

      expect(result.fixed).toHaveLength(1);
      expect(CalendarEvent.delete).not.toHaveBeenCalled();
    });

    it('should handle errors during fix operations', async () => {
      const inconsistencies = [
        {
          type: 'orphaned_calendar_event',
          event: { id: 'event1' },
          issue: 'Orphaned event'
        }
      ];

      CalendarEvent.delete.mockRejectedValue(new Error('Delete failed'));

      const result = await CalendarEventDeduplicationService.fixConsistencyIssues(
        inconsistencies,
        { dryRun: false }
      );

      expect(result.failed).toHaveLength(1);
      expect(result.failed[0].type).toBe('orphaned_calendar_event');
      expect(result.failed[0].error).toBe('Delete failed');
    });

    it('should skip unknown issue types', async () => {
      const inconsistencies = [
        {
          type: 'unknown_issue_type',
          issue: 'Unknown issue'
        }
      ];

      const result = await CalendarEventDeduplicationService.fixConsistencyIssues(
        inconsistencies,
        { dryRun: false }
      );

      expect(result.skipped).toHaveLength(1);
      expect(result.skipped[0].type).toBe('unknown_issue_type');
      expect(result.skipped[0].reason).toBe('unknown_issue_type');
    });
  });

  describe('_groupInconsistenciesByType', () => {
    it('should group inconsistencies by type correctly', () => {
      const inconsistencies = [
        { type: 'orphaned_calendar_event', issue: 'Issue 1' },
        { type: 'missing_calendar_event', issue: 'Issue 2' },
        { type: 'orphaned_calendar_event', issue: 'Issue 3' }
      ];

      const grouped = CalendarEventDeduplicationService._groupInconsistenciesByType(inconsistencies);

      expect(grouped.orphaned_calendar_event).toHaveLength(2);
      expect(grouped.missing_calendar_event).toHaveLength(1);
    });
  });
});