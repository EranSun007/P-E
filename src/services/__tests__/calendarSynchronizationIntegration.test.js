// src/services/__tests__/calendarSynchronizationIntegration.test.js
// Integration tests for calendar synchronization service with OneOnOne workflows

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { CalendarSynchronizationService } from '../calendarSynchronizationService.js';
import { CalendarSyncStatusService } from '../calendarSyncStatusService.js';
import { OneOnOne, CalendarEvent, TeamMember } from '../../api/entities.js';
import { CalendarService } from '../../utils/calendarService.js';

// Mock the entities and services
vi.mock('../../api/entities.js', () => ({
  OneOnOne: {
    list: vi.fn(),
    get: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn()
  },
  CalendarEvent: {
    list: vi.fn(),
    get: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn()
  },
  TeamMember: {
    list: vi.fn(),
    get: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn()
  }
}));

vi.mock('../../utils/calendarService.js', () => ({
  CalendarService: {
    getOneOnOneMeetings: vi.fn(),
    createAndLinkOneOnOneMeeting: vi.fn(),
    updateOneOnOneMeeting: vi.fn(),
    deleteOneOnOneMeeting: vi.fn(),
    generateOneOnOneTitle: vi.fn()
  }
}));

describe('Calendar Synchronization Integration', () => {
  let mockTeamMembers;
  let mockOneOnOnes;
  let mockCalendarEvents;

  beforeEach(() => {
    // Reset all mocks
    vi.clearAllMocks();
    
    // Setup mock data
    mockTeamMembers = [
      {
        id: 'tm1',
        name: 'John Doe',
        birthday: '1990-05-15'
      },
      {
        id: 'tm2',
        name: 'Jane Smith',
        birthday: '1985-08-22'
      }
    ];

    mockOneOnOnes = [
      {
        id: 'oo1',
        team_member_id: 'tm1',
        next_meeting_date: '2024-02-15T10:00:00Z',
        next_meeting_calendar_event_id: null
      },
      {
        id: 'oo2',
        team_member_id: 'tm2',
        next_meeting_date: '2024-02-16T14:00:00Z',
        next_meeting_calendar_event_id: 'ce1'
      }
    ];

    mockCalendarEvents = [
      {
        id: 'ce1',
        title: '1:1 with Jane Smith',
        start_date: '2024-02-16T14:00:00Z',
        end_date: '2024-02-16T15:00:00Z',
        event_type: 'one_on_one',
        team_member_id: 'tm2',
        linked_entity_type: 'one_on_one',
        linked_entity_id: 'oo2'
      }
    ];

    // Setup entity mocks
    TeamMember.list.mockResolvedValue(mockTeamMembers);
    OneOnOne.list.mockResolvedValue(mockOneOnOnes);
    CalendarEvent.list.mockResolvedValue(mockCalendarEvents);
    CalendarEvent.get.mockImplementation(id => {
      const event = mockCalendarEvents.find(e => e.id === id);
      return Promise.resolve(event || null);
    });

    // Setup CalendarService mocks
    CalendarService.getOneOnOneMeetings.mockResolvedValue(mockCalendarEvents);
    CalendarService.createAndLinkOneOnOneMeeting.mockImplementation((oneOnOneId, teamMemberId, date) => {
      const teamMember = mockTeamMembers.find(tm => tm.id === teamMemberId);
      const newEvent = {
        id: `ce_${Date.now()}`,
        title: `1:1 with ${teamMember.name}`,
        start_date: date,
        end_date: new Date(new Date(date).getTime() + 60 * 60 * 1000).toISOString(),
        event_type: 'one_on_one',
        team_member_id: teamMemberId,
        linked_entity_type: 'one_on_one',
        linked_entity_id: oneOnOneId
      };
      mockCalendarEvents.push(newEvent);
      return Promise.resolve({
        calendarEvent: newEvent,
        oneOnOne: mockOneOnOnes.find(oo => oo.id === oneOnOneId)
      });
    });

    CalendarService.updateOneOnOneMeeting.mockResolvedValue(true);
    CalendarService.deleteOneOnOneMeeting.mockResolvedValue(true);
    CalendarService.generateOneOnOneTitle.mockImplementation(name => `1:1 with ${name}`);
  });

  afterEach(() => {
    // Clean up sync service
    CalendarSyncStatusService.cleanup();
  });

  describe('OneOnOne Creation Integration', () => {
    it('should sync calendar events after OneOnOne creation', async () => {
      // Simulate OneOnOne creation with next_meeting_date
      const newOneOnOne = {
        id: 'oo3',
        team_member_id: 'tm1',
        next_meeting_date: '2024-02-20T10:00:00Z',
        next_meeting_calendar_event_id: null
      };
      
      mockOneOnOnes.push(newOneOnOne);

      // Run sync to ensure visibility
      const results = await CalendarSynchronizationService.ensureOneOnOneVisibility({
        teamMemberId: 'tm1',
        createMissing: true
      });

      expect(results.summary.success).toBe(true);
      expect(results.summary.createdCount).toBeGreaterThan(0);
      expect(CalendarService.createAndLinkOneOnOneMeeting).toHaveBeenCalledWith(
        'oo1', // Original OneOnOne without calendar event
        'tm1',
        '2024-02-15T10:00:00Z'
      );
    });

    it('should handle OneOnOne creation without next_meeting_date', async () => {
      const newOneOnOne = {
        id: 'oo4',
        team_member_id: 'tm1',
        next_meeting_date: null,
        next_meeting_calendar_event_id: null
      };
      
      mockOneOnOnes.push(newOneOnOne);

      const results = await CalendarSynchronizationService.ensureOneOnOneVisibility({
        teamMemberId: 'tm1',
        createMissing: true
      });

      // Should still process existing OneOnOne with missing calendar event
      expect(results.summary.success).toBe(true);
      expect(results.totalChecked).toBe(1); // Only oo1 has next_meeting_date
    });
  });

  describe('OneOnOne Update Integration', () => {
    it('should sync calendar events after OneOnOne update', async () => {
      // Update OneOnOne with new meeting date
      const updatedOneOnOne = {
        ...mockOneOnOnes[1],
        next_meeting_date: '2024-02-17T15:00:00Z'
      };
      
      mockOneOnOnes[1] = updatedOneOnOne;

      const results = await CalendarSynchronizationService.syncOneOnOneMeetings({
        createMissing: true,
        updateExisting: true
      });

      expect(results.summary.success).toBe(true);
      expect(CalendarService.updateOneOnOneMeeting).toHaveBeenCalledWith(
        'ce1',
        '2024-02-17T15:00:00Z'
      );
    });

    it('should create calendar event when OneOnOne gets next_meeting_date', async () => {
      // Update OneOnOne to add next_meeting_date
      const updatedOneOnOne = {
        ...mockOneOnOnes[0],
        next_meeting_date: '2024-02-18T11:00:00Z'
      };
      
      mockOneOnOnes[0] = updatedOneOnOne;

      const results = await CalendarSynchronizationService.syncOneOnOneMeetings({
        createMissing: true,
        updateExisting: false
      });

      expect(results.summary.success).toBe(true);
      expect(results.summary.createdCount).toBe(1);
      expect(CalendarService.createAndLinkOneOnOneMeeting).toHaveBeenCalledWith(
        'oo1',
        'tm1',
        '2024-02-18T11:00:00Z'
      );
    });
  });

  describe('Data Consistency Validation', () => {
    it('should detect and report orphaned calendar events', async () => {
      // Add orphaned calendar event
      const orphanedEvent = {
        id: 'ce_orphaned',
        title: '1:1 with Unknown Person',
        start_date: '2024-02-20T10:00:00Z',
        end_date: '2024-02-20T11:00:00Z',
        event_type: 'one_on_one',
        team_member_id: 'tm_unknown',
        linked_entity_type: 'one_on_one',
        linked_entity_id: 'oo_unknown'
      };
      
      mockCalendarEvents.push(orphanedEvent);

      const results = await CalendarSynchronizationService.validateEventConsistency();

      expect(results.summary.isConsistent).toBe(false);
      expect(results.inconsistencies.orphanedEvents.length).toBeGreaterThan(0);
      expect(results.inconsistencies.orphanedEvents[0].eventId).toBe('ce_orphaned');
    });

    it('should detect missing calendar event links', async () => {
      const results = await CalendarSynchronizationService.validateEventConsistency();

      expect(results.summary.isConsistent).toBe(false);
      expect(results.inconsistencies.missingLinks.length).toBe(1);
      expect(results.inconsistencies.missingLinks[0].oneOnOneId).toBe('oo1');
    });

    it('should detect broken references', async () => {
      // Add OneOnOne with broken calendar event reference
      const brokenOneOnOne = {
        id: 'oo_broken',
        team_member_id: 'tm1',
        next_meeting_date: '2024-02-21T10:00:00Z',
        next_meeting_calendar_event_id: 'ce_nonexistent'
      };
      
      mockOneOnOnes.push(brokenOneOnOne);

      const results = await CalendarSynchronizationService.validateEventConsistency();

      expect(results.summary.isConsistent).toBe(false);
      expect(results.inconsistencies.brokenReferences.length).toBeGreaterThan(0);
      expect(results.inconsistencies.brokenReferences.some(br => 
        br.oneOnOneId === 'oo_broken' && br.referencedEventId === 'ce_nonexistent'
      )).toBe(true);
    });
  });

  describe('Repair Operations', () => {
    it('should repair missing calendar events', async () => {
      const results = await CalendarSynchronizationService.repairMissingEvents({
        repairMissing: true,
        repairOrphaned: false,
        repairBroken: false,
        removeDuplicates: false
      });

      expect(results.summary.success).toBe(true);
      expect(results.summary.missingCreatedCount).toBe(1);
      expect(CalendarService.createAndLinkOneOnOneMeeting).toHaveBeenCalledWith(
        'oo1',
        'tm1',
        '2024-02-15T10:00:00Z'
      );
    });

    it('should remove orphaned calendar events', async () => {
      // Add orphaned event
      const orphanedEvent = {
        id: 'ce_orphaned',
        title: '1:1 with Unknown Person',
        start_date: '2024-02-20T10:00:00Z',
        end_date: '2024-02-20T11:00:00Z',
        event_type: 'one_on_one',
        team_member_id: 'tm_unknown',
        linked_entity_type: 'one_on_one',
        linked_entity_id: 'oo_unknown'
      };
      
      mockCalendarEvents.push(orphanedEvent);
      CalendarEvent.delete = vi.fn().mockResolvedValue(true);

      const results = await CalendarSynchronizationService.repairMissingEvents({
        repairMissing: false,
        repairOrphaned: true,
        repairBroken: false,
        removeDuplicates: false
      });

      expect(results.summary.success).toBe(true);
      expect(results.summary.orphanedRemovedCount).toBe(1);
      expect(CalendarEvent.delete).toHaveBeenCalledWith('ce_orphaned');
    });
  });

  describe('Sync Status Service Integration', () => {
    it('should track sync status during operations', async () => {
      const statusUpdates = [];
      CalendarSyncStatusService.addStatusListener(status => {
        statusUpdates.push({ ...status });
      });

      await CalendarSyncStatusService.performBackgroundSync();

      expect(statusUpdates.length).toBeGreaterThan(0);
      expect(statusUpdates[0].isRunning).toBe(true);
      expect(statusUpdates[statusUpdates.length - 1].isRunning).toBe(false);
      expect(statusUpdates[statusUpdates.length - 1].lastSync).toBeTruthy();
    });

    it('should handle manual sync with user feedback', async () => {
      const results = await CalendarSyncStatusService.manualSync({
        createMissing: true,
        updateExisting: true,
        repairBroken: true
      });

      expect(results.summary.success).toBe(true);
      expect(results.summary.userMessage).toBeTruthy();
      expect(typeof results.summary.userMessage).toBe('string');
    });

    it('should generate appropriate user messages', () => {
      const validation = { summary: { isConsistent: false } };
      const repair = { summary: { totalRepairs: 2 } };
      const sync = { summary: { createdCount: 1, updatedCount: 0 }, errors: [] };
      const visibility = { summary: { createdCount: 0 }, errors: [] };

      const message = CalendarSyncStatusService.generateUserMessage(
        validation, repair, sync, visibility
      );

      expect(message).toContain('Fixed 2 data consistency issue(s)');
      expect(message).toContain('Created 1 missing calendar event(s)');
    });

    it('should handle sync errors gracefully', async () => {
      // Mock a sync failure by making the validation fail
      const originalValidate = CalendarSynchronizationService.validateEventConsistency;
      CalendarSynchronizationService.validateEventConsistency = vi.fn()
        .mockRejectedValue(new Error('Sync failed'));

      try {
        await CalendarSyncStatusService.manualSync();
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error.message).toBe('Sync failed');
      }

      const status = CalendarSyncStatusService.getSyncStatus();
      expect(status.lastError).toBe('Sync failed');
      expect(status.isRunning).toBe(false);

      // Restore original function
      CalendarSynchronizationService.validateEventConsistency = originalValidate;
    });
  });

  describe('Periodic Sync Integration', () => {
    it('should start and stop periodic sync', () => {
      CalendarSyncStatusService.startPeriodicSync(1000); // 1 second for testing
      
      const status = CalendarSyncStatusService.getSyncStatus();
      expect(status.periodicSyncInterval).toBeTruthy();

      CalendarSyncStatusService.stopPeriodicSync();
      
      const statusAfterStop = CalendarSyncStatusService.getSyncStatus();
      expect(statusAfterStop.periodicSyncInterval).toBeNull();
    });

    it('should provide sync statistics', () => {
      CalendarSyncStatusService.updateStatus({
        lastSync: '2024-02-15T10:00:00Z',
        lastError: null,
        syncResults: {
          summary: {
            success: true,
            totalOperations: 3,
            userMessage: 'Sync completed successfully'
          }
        }
      });

      const stats = CalendarSyncStatusService.getSyncStatistics();
      
      expect(stats.lastSync).toBe('2024-02-15T10:00:00Z');
      expect(stats.lastError).toBeNull();
      expect(stats.lastSyncResults.success).toBe(true);
      expect(stats.lastSyncResults.totalChanges).toBe(3);
      expect(stats.lastSyncResults.message).toBe('Sync completed successfully');
    });
  });

  describe('Error Handling and Recovery', () => {
    it('should handle CalendarService failures gracefully', async () => {
      // Reset mocks for this test
      vi.clearAllMocks();
      TeamMember.list.mockResolvedValue(mockTeamMembers);
      OneOnOne.list.mockResolvedValue(mockOneOnOnes);
      CalendarService.getOneOnOneMeetings.mockResolvedValue(mockCalendarEvents);
      
      CalendarService.createAndLinkOneOnOneMeeting.mockRejectedValue(
        new Error('Calendar service unavailable')
      );

      const results = await CalendarSynchronizationService.syncOneOnOneMeetings({
        createMissing: true
      });

      expect(results.summary.success).toBe(false);
      expect(results.errors.length).toBeGreaterThan(0);
      expect(results.errors[0].error).toContain('Calendar service unavailable');
    });

    it('should retry failed operations', async () => {
      // Reset mocks for this test
      vi.clearAllMocks();
      TeamMember.list.mockResolvedValue(mockTeamMembers);
      OneOnOne.list.mockResolvedValue(mockOneOnOnes);
      CalendarService.getOneOnOneMeetings.mockResolvedValue(mockCalendarEvents);
      
      let callCount = 0;
      CalendarService.createAndLinkOneOnOneMeeting.mockImplementation(() => {
        callCount++;
        if (callCount < 3) {
          throw new Error('Temporary failure');
        }
        return Promise.resolve({
          calendarEvent: { id: 'ce_retry_success' },
          oneOnOne: mockOneOnOnes[0]
        });
      });

      const results = await CalendarSynchronizationService.syncOneOnOneMeetings({
        createMissing: true
      });

      expect(callCount).toBe(3); // Should retry twice before succeeding
      expect(results.summary.success).toBe(true);
    });

    it('should handle entity not found errors', async () => {
      // Reset mocks for this test
      vi.clearAllMocks();
      TeamMember.list.mockResolvedValue([]); // No team members
      OneOnOne.list.mockResolvedValue(mockOneOnOnes);
      CalendarService.getOneOnOneMeetings.mockResolvedValue(mockCalendarEvents);

      const results = await CalendarSynchronizationService.syncOneOnOneMeetings({
        createMissing: true
      });

      expect(results.summary.success).toBe(false);
      expect(results.errors.length).toBe(mockOneOnOnes.length);
      expect(results.errors[0].error).toBe('Team member not found');
    });
  });
});