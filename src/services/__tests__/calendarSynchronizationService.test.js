// src/services/__tests__/calendarSynchronizationService.test.js
// Integration tests for CalendarSynchronizationService

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CalendarSynchronizationService } from '../calendarSynchronizationService.js';

// Mock the entities and services
vi.mock('../../api/entities.js', () => ({
  CalendarEvent: {
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    list: vi.fn(),
    get: vi.fn()
  },
  OneOnOne: {
    update: vi.fn(),
    list: vi.fn()
  },
  TeamMember: {
    get: vi.fn(),
    list: vi.fn()
  }
}));

vi.mock('../../utils/calendarService.js', () => ({
  CalendarService: {
    getOneOnOneMeetings: vi.fn(),
    createAndLinkOneOnOneMeeting: vi.fn(),
    updateOneOnOneMeeting: vi.fn(),
    generateOneOnOneTitle: vi.fn()
  }
}));

import { CalendarEvent, OneOnOne, TeamMember } from '../../api/entities.js';
import { CalendarService } from '../../utils/calendarService.js';

describe('CalendarSynchronizationService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Setup default mock implementations
    CalendarService.generateOneOnOneTitle.mockImplementation((name) => `${name} 1:1`);
  });

  describe('syncOneOnOneMeetings', () => {
    it('should create missing calendar events for OneOnOne records', async () => {
      const mockOneOnOnes = [
        {
          id: 'oneonone-1',
          team_member_id: 'team-1',
          next_meeting_date: '2024-01-15T10:00:00.000Z',
          next_meeting_calendar_event_id: null
        },
        {
          id: 'oneonone-2',
          team_member_id: 'team-2',
          next_meeting_date: '2024-01-16T14:00:00.000Z',
          next_meeting_calendar_event_id: null
        }
      ];

      const mockTeamMembers = [
        { id: 'team-1', name: 'John Smith' },
        { id: 'team-2', name: 'Jane Doe' }
      ];

      const mockCalendarResult = {
        calendarEvent: { id: 'event-1', title: 'John Smith 1:1' },
        oneOnOne: { id: 'oneonone-1', next_meeting_calendar_event_id: 'event-1' }
      };

      OneOnOne.list.mockResolvedValue(mockOneOnOnes);
      TeamMember.list.mockResolvedValue(mockTeamMembers);
      CalendarService.createAndLinkOneOnOneMeeting
        .mockResolvedValueOnce(mockCalendarResult)
        .mockResolvedValueOnce({
          calendarEvent: { id: 'event-2', title: 'Jane Doe 1:1' },
          oneOnOne: { id: 'oneonone-2', next_meeting_calendar_event_id: 'event-2' }
        });

      const result = await CalendarSynchronizationService.syncOneOnOneMeetings();

      expect(CalendarService.createAndLinkOneOnOneMeeting).toHaveBeenCalledTimes(2);
      expect(CalendarService.createAndLinkOneOnOneMeeting).toHaveBeenCalledWith(
        'oneonone-1',
        'team-1',
        '2024-01-15T10:00:00.000Z'
      );
      expect(CalendarService.createAndLinkOneOnOneMeeting).toHaveBeenCalledWith(
        'oneonone-2',
        'team-2',
        '2024-01-16T14:00:00.000Z'
      );

      expect(result.summary.createdCount).toBe(2);
      expect(result.summary.success).toBe(true);
      expect(result.created).toHaveLength(2);
      expect(result.created[0].teamMemberName).toBe('John Smith');
      expect(result.created[1].teamMemberName).toBe('Jane Doe');
    });

    it('should skip OneOnOne records without next_meeting_date', async () => {
      const mockOneOnOnes = [
        {
          id: 'oneonone-1',
          team_member_id: 'team-1',
          next_meeting_date: null,
          next_meeting_calendar_event_id: null
        },
        {
          id: 'oneonone-2',
          team_member_id: 'team-2',
          next_meeting_date: '2024-01-16T14:00:00.000Z',
          next_meeting_calendar_event_id: null
        }
      ];

      const mockTeamMembers = [
        { id: 'team-1', name: 'John Smith' },
        { id: 'team-2', name: 'Jane Doe' }
      ];

      OneOnOne.list.mockResolvedValue(mockOneOnOnes);
      TeamMember.list.mockResolvedValue(mockTeamMembers);
      CalendarService.createAndLinkOneOnOneMeeting.mockResolvedValue({
        calendarEvent: { id: 'event-2' },
        oneOnOne: { id: 'oneonone-2' }
      });

      const result = await CalendarSynchronizationService.syncOneOnOneMeetings();

      expect(CalendarService.createAndLinkOneOnOneMeeting).toHaveBeenCalledTimes(1);
      expect(result.summary.createdCount).toBe(1);
      expect(result.summary.skippedCount).toBe(1);
      expect(result.skipped[0].reason).toBe('No next_meeting_date set');
    });

    it('should update existing calendar events when updateExisting is true', async () => {
      const mockOneOnOnes = [
        {
          id: 'oneonone-1',
          team_member_id: 'team-1',
          next_meeting_date: '2024-01-15T14:00:00.000Z', // Different time
          next_meeting_calendar_event_id: 'event-1'
        }
      ];

      const mockTeamMembers = [
        { id: 'team-1', name: 'John Smith' }
      ];

      const mockExistingEvent = {
        id: 'event-1',
        start_date: '2024-01-15T10:00:00.000Z', // Original time
        title: 'John Smith 1:1'
      };

      OneOnOne.list.mockResolvedValue(mockOneOnOnes);
      TeamMember.list.mockResolvedValue(mockTeamMembers);
      CalendarEvent.get.mockResolvedValue(mockExistingEvent);
      CalendarService.updateOneOnOneMeeting.mockResolvedValue({
        ...mockExistingEvent,
        start_date: '2024-01-15T14:00:00.000Z'
      });

      const result = await CalendarSynchronizationService.syncOneOnOneMeetings({
        updateExisting: true
      });

      expect(CalendarService.updateOneOnOneMeeting).toHaveBeenCalledWith(
        'event-1',
        '2024-01-15T14:00:00.000Z'
      );
      expect(result.summary.updatedCount).toBe(1);
      expect(result.updated[0].oldDate).toBe('2024-01-15T10:00:00.000Z');
      expect(result.updated[0].newDate).toBe('2024-01-15T14:00:00.000Z');
    });

    it('should handle errors gracefully and continue processing', async () => {
      const mockOneOnOnes = [
        {
          id: 'oneonone-1',
          team_member_id: 'team-1',
          next_meeting_date: '2024-01-15T10:00:00.000Z',
          next_meeting_calendar_event_id: null
        },
        {
          id: 'oneonone-2',
          team_member_id: 'team-2',
          next_meeting_date: '2024-01-16T14:00:00.000Z',
          next_meeting_calendar_event_id: null
        }
      ];

      const mockTeamMembers = [
        { id: 'team-1', name: 'John Smith' },
        { id: 'team-2', name: 'Jane Doe' }
      ];

      OneOnOne.list.mockResolvedValue(mockOneOnOnes);
      TeamMember.list.mockResolvedValue(mockTeamMembers);
      
      // Mock the first call (oneonone-1) to fail after retries, second call (oneonone-2) to succeed
      CalendarService.createAndLinkOneOnOneMeeting
        .mockRejectedValueOnce(new Error('Persistent calendar service error'))
        .mockRejectedValueOnce(new Error('Persistent calendar service error'))
        .mockRejectedValueOnce(new Error('Persistent calendar service error'))
        .mockResolvedValueOnce({
          calendarEvent: { id: 'event-2' },
          oneOnOne: { id: 'oneonone-2' }
        });

      const result = await CalendarSynchronizationService.syncOneOnOneMeetings();

      expect(result.summary.createdCount).toBe(1);
      expect(result.summary.errorCount).toBe(1);
      expect(result.errors[0].oneOnOneId).toBe('oneonone-1');
      expect(result.errors[0].error).toContain('Persistent calendar service error');
    });

    it('should support dry run mode', async () => {
      const mockOneOnOnes = [
        {
          id: 'oneonone-1',
          team_member_id: 'team-1',
          next_meeting_date: '2024-01-15T10:00:00.000Z',
          next_meeting_calendar_event_id: null
        }
      ];

      const mockTeamMembers = [
        { id: 'team-1', name: 'John Smith' }
      ];

      OneOnOne.list.mockResolvedValue(mockOneOnOnes);
      TeamMember.list.mockResolvedValue(mockTeamMembers);

      const result = await CalendarSynchronizationService.syncOneOnOneMeetings({
        dryRun: true
      });

      expect(CalendarService.createAndLinkOneOnOneMeeting).not.toHaveBeenCalled();
      expect(result.dryRun).toBe(true);
      expect(result.summary.createdCount).toBe(1);
      expect(result.created[0].calendarEventId).toBe('dry-run-placeholder');
    });
  });

  describe('ensureOneOnOneVisibility', () => {
    it('should identify visible and missing calendar events', async () => {
      const mockOneOnOnes = [
        {
          id: 'oneonone-1',
          team_member_id: 'team-1',
          next_meeting_date: '2024-01-15T10:00:00.000Z',
          next_meeting_calendar_event_id: 'event-1'
        },
        {
          id: 'oneonone-2',
          team_member_id: 'team-2',
          next_meeting_date: '2024-01-16T14:00:00.000Z',
          next_meeting_calendar_event_id: null
        }
      ];

      const mockTeamMembers = [
        { id: 'team-1', name: 'John Smith' },
        { id: 'team-2', name: 'Jane Doe' }
      ];

      const mockCalendarEvents = [
        {
          id: 'event-1',
          event_type: 'one_on_one',
          team_member_id: 'team-1',
          title: 'John Smith 1:1'
        }
      ];

      OneOnOne.list.mockResolvedValue(mockOneOnOnes);
      TeamMember.list.mockResolvedValue(mockTeamMembers);
      CalendarService.getOneOnOneMeetings.mockResolvedValue(mockCalendarEvents);
      CalendarService.createAndLinkOneOnOneMeeting.mockResolvedValue({
        calendarEvent: { id: 'event-2' },
        oneOnOne: { id: 'oneonone-2' }
      });

      const result = await CalendarSynchronizationService.ensureOneOnOneVisibility();

      expect(result.summary.visibleCount).toBe(1);
      expect(result.summary.missingCount).toBe(1);
      expect(result.summary.createdCount).toBe(1);
      expect(result.visible[0].teamMemberName).toBe('John Smith');
      expect(result.missing[0].teamMemberName).toBe('Jane Doe');
      expect(result.missing[0].reason).toBe('No calendar event linked');
    });

    it('should filter by team member when specified', async () => {
      const mockOneOnOnes = [
        {
          id: 'oneonone-1',
          team_member_id: 'team-1',
          next_meeting_date: '2024-01-15T10:00:00.000Z',
          next_meeting_calendar_event_id: 'event-1'
        },
        {
          id: 'oneonone-2',
          team_member_id: 'team-2',
          next_meeting_date: '2024-01-16T14:00:00.000Z',
          next_meeting_calendar_event_id: null
        }
      ];

      const mockTeamMembers = [
        { id: 'team-1', name: 'John Smith' },
        { id: 'team-2', name: 'Jane Doe' }
      ];

      const mockCalendarEvents = [
        {
          id: 'event-1',
          event_type: 'one_on_one',
          team_member_id: 'team-1',
          title: 'John Smith 1:1'
        }
      ];

      OneOnOne.list.mockResolvedValue(mockOneOnOnes);
      TeamMember.list.mockResolvedValue(mockTeamMembers);
      CalendarService.getOneOnOneMeetings.mockResolvedValue(mockCalendarEvents);

      const result = await CalendarSynchronizationService.ensureOneOnOneVisibility({
        teamMemberId: 'team-1'
      });

      expect(result.totalChecked).toBe(1);
      expect(result.summary.visibleCount).toBe(1);
      expect(result.visible[0].teamMemberName).toBe('John Smith');
    });

    it('should filter by date range when specified', async () => {
      const mockOneOnOnes = [
        {
          id: 'oneonone-1',
          team_member_id: 'team-1',
          next_meeting_date: '2024-01-15T10:00:00.000Z',
          next_meeting_calendar_event_id: 'event-1'
        },
        {
          id: 'oneonone-2',
          team_member_id: 'team-2',
          next_meeting_date: '2024-02-16T14:00:00.000Z', // Outside range
          next_meeting_calendar_event_id: null
        }
      ];

      const mockTeamMembers = [
        { id: 'team-1', name: 'John Smith' },
        { id: 'team-2', name: 'Jane Doe' }
      ];

      const mockCalendarEvents = [
        {
          id: 'event-1',
          event_type: 'one_on_one',
          team_member_id: 'team-1',
          title: 'John Smith 1:1'
        }
      ];

      OneOnOne.list.mockResolvedValue(mockOneOnOnes);
      TeamMember.list.mockResolvedValue(mockTeamMembers);
      CalendarService.getOneOnOneMeetings.mockResolvedValue(mockCalendarEvents);

      const result = await CalendarSynchronizationService.ensureOneOnOneVisibility({
        dateRange: {
          start: '2024-01-01T00:00:00.000Z',
          end: '2024-01-31T23:59:59.999Z'
        }
      });

      expect(result.totalChecked).toBe(1);
      expect(result.summary.visibleCount).toBe(1);
      expect(result.visible[0].teamMemberName).toBe('John Smith');
    });

    it('should handle broken references', async () => {
      const mockOneOnOnes = [
        {
          id: 'oneonone-1',
          team_member_id: 'team-1',
          next_meeting_date: '2024-01-15T10:00:00.000Z',
          next_meeting_calendar_event_id: 'nonexistent-event'
        }
      ];

      const mockTeamMembers = [
        { id: 'team-1', name: 'John Smith' }
      ];

      const mockCalendarEvents = []; // No events exist

      OneOnOne.list.mockResolvedValue(mockOneOnOnes);
      TeamMember.list.mockResolvedValue(mockTeamMembers);
      CalendarService.getOneOnOneMeetings.mockResolvedValue(mockCalendarEvents);
      CalendarService.createAndLinkOneOnOneMeeting.mockResolvedValue({
        calendarEvent: { id: 'event-1' },
        oneOnOne: { id: 'oneonone-1' }
      });

      const result = await CalendarSynchronizationService.ensureOneOnOneVisibility();

      expect(result.summary.missingCount).toBe(1);
      expect(result.summary.createdCount).toBe(1);
      expect(result.missing[0].reason).toBe('Referenced calendar event not found');
    });
  });

  describe('validateEventConsistency', () => {
    it('should identify orphaned calendar events', async () => {
      const mockOneOnOneEvents = [
        {
          id: 'event-1',
          event_type: 'one_on_one',
          title: 'John Smith 1:1',
          team_member_id: 'team-1',
          linked_entity_id: 'oneonone-1',
          linked_entity_type: 'one_on_one'
        },
        {
          id: 'event-2',
          event_type: 'one_on_one',
          title: 'Jane Doe 1:1',
          team_member_id: 'team-2',
          linked_entity_id: 'nonexistent-oneonone',
          linked_entity_type: 'one_on_one'
        }
      ];

      const mockOneOnOnes = [
        {
          id: 'oneonone-1',
          team_member_id: 'team-1',
          next_meeting_calendar_event_id: 'event-1'
        }
      ];

      const mockTeamMembers = [
        { id: 'team-1', name: 'John Smith' },
        { id: 'team-2', name: 'Jane Doe' }
      ];

      CalendarService.getOneOnOneMeetings.mockResolvedValue(mockOneOnOneEvents);
      OneOnOne.list.mockResolvedValue(mockOneOnOnes);
      TeamMember.list.mockResolvedValue(mockTeamMembers);

      const result = await CalendarSynchronizationService.validateEventConsistency();

      expect(result.summary.isConsistent).toBe(false);
      expect(result.summary.orphanedCount).toBe(1);
      expect(result.inconsistencies.orphanedEvents[0].eventId).toBe('event-2');
      expect(result.inconsistencies.orphanedEvents[0].issue).toBe('Calendar event not linked to any OneOnOne record');
    });

    it('should identify missing calendar event links', async () => {
      const mockOneOnOneEvents = [];

      const mockOneOnOnes = [
        {
          id: 'oneonone-1',
          team_member_id: 'team-1',
          next_meeting_date: '2024-01-15T10:00:00.000Z',
          next_meeting_calendar_event_id: null
        }
      ];

      const mockTeamMembers = [
        { id: 'team-1', name: 'John Smith' }
      ];

      CalendarService.getOneOnOneMeetings.mockResolvedValue(mockOneOnOneEvents);
      OneOnOne.list.mockResolvedValue(mockOneOnOnes);
      TeamMember.list.mockResolvedValue(mockTeamMembers);

      const result = await CalendarSynchronizationService.validateEventConsistency();

      expect(result.summary.isConsistent).toBe(false);
      expect(result.summary.missingLinksCount).toBe(1);
      expect(result.inconsistencies.missingLinks[0].oneOnOneId).toBe('oneonone-1');
      expect(result.inconsistencies.missingLinks[0].issue).toBe('OneOnOne has next_meeting_date but no calendar event');
    });

    it('should identify broken references', async () => {
      const mockOneOnOneEvents = [];

      const mockOneOnOnes = [
        {
          id: 'oneonone-1',
          team_member_id: 'team-1',
          next_meeting_calendar_event_id: 'nonexistent-event'
        }
      ];

      const mockTeamMembers = [
        { id: 'team-1', name: 'John Smith' }
      ];

      CalendarService.getOneOnOneMeetings.mockResolvedValue(mockOneOnOneEvents);
      OneOnOne.list.mockResolvedValue(mockOneOnOnes);
      TeamMember.list.mockResolvedValue(mockTeamMembers);

      const result = await CalendarSynchronizationService.validateEventConsistency();

      expect(result.summary.isConsistent).toBe(false);
      expect(result.summary.brokenReferencesCount).toBe(1);
      expect(result.inconsistencies.brokenReferences[0].oneOnOneId).toBe('oneonone-1');
      expect(result.inconsistencies.brokenReferences[0].referencedEventId).toBe('nonexistent-event');
    });

    it('should identify invalid data', async () => {
      const mockOneOnOneEvents = [
        {
          id: 'event-1',
          event_type: 'meeting', // Wrong type
          title: 'Wrong Title',
          team_member_id: 'team-1',
          linked_entity_id: 'oneonone-1',
          linked_entity_type: 'meeting', // Wrong type
          start_date: '2024-01-15T10:00:00.000Z',
          end_date: '2024-01-15T10:30:00.000Z'
        }
      ];

      const mockOneOnOnes = [
        {
          id: 'oneonone-1',
          team_member_id: 'team-1',
          next_meeting_calendar_event_id: 'event-1',
          next_meeting_date: '2024-01-15T10:00:00.000Z'
        }
      ];

      const mockTeamMembers = [
        { id: 'team-1', name: 'John Smith' }
      ];

      CalendarService.getOneOnOneMeetings.mockResolvedValue(mockOneOnOneEvents);
      OneOnOne.list.mockResolvedValue(mockOneOnOnes);
      TeamMember.list.mockResolvedValue(mockTeamMembers);

      const result = await CalendarSynchronizationService.validateEventConsistency();

      expect(result.summary.isConsistent).toBe(false);
      expect(result.summary.invalidDataCount).toBe(1);
      expect(result.inconsistencies.invalidData[0].eventId).toBe('event-1');
      expect(result.inconsistencies.invalidData[0].issues).toContain('Title mismatch: expected "John Smith 1:1", got "Wrong Title"');
      expect(result.inconsistencies.invalidData[0].issues).toContain('Incorrect event type: expected "one_on_one", got "meeting"');
      expect(result.inconsistencies.invalidData[0].issues).toContain('Incorrect linked entity type: expected "one_on_one", got "meeting"');
    });

    it('should identify duplicate events', async () => {
      const mockOneOnOneEvents = [
        {
          id: 'event-1',
          event_type: 'one_on_one',
          title: 'John Smith 1:1',
          team_member_id: 'team-1',
          start_date: '2024-01-15T10:00:00.000Z',
          end_date: '2024-01-15T10:30:00.000Z'
        },
        {
          id: 'event-2',
          event_type: 'one_on_one',
          title: 'John Smith 1:1',
          team_member_id: 'team-1',
          start_date: '2024-01-15T14:00:00.000Z', // Same date, different time
          end_date: '2024-01-15T14:30:00.000Z'
        }
      ];

      const mockOneOnOnes = [];
      const mockTeamMembers = [
        { id: 'team-1', name: 'John Smith' }
      ];

      CalendarService.getOneOnOneMeetings.mockResolvedValue(mockOneOnOneEvents);
      OneOnOne.list.mockResolvedValue(mockOneOnOnes);
      TeamMember.list.mockResolvedValue(mockTeamMembers);

      const result = await CalendarSynchronizationService.validateEventConsistency();

      expect(result.summary.isConsistent).toBe(false);
      expect(result.summary.duplicatesCount).toBe(1);
      expect(result.inconsistencies.duplicateEvents[0].teamMemberId).toBe('team-1');
      expect(result.inconsistencies.duplicateEvents[0].count).toBe(2);
    });

    it('should return consistent when no issues found', async () => {
      const mockOneOnOneEvents = [
        {
          id: 'event-1',
          event_type: 'one_on_one',
          title: 'John Smith 1:1',
          team_member_id: 'team-1',
          linked_entity_id: 'oneonone-1',
          linked_entity_type: 'one_on_one',
          start_date: '2024-01-15T10:00:00.000Z',
          end_date: '2024-01-15T10:30:00.000Z'
        }
      ];

      const mockOneOnOnes = [
        {
          id: 'oneonone-1',
          team_member_id: 'team-1',
          next_meeting_calendar_event_id: 'event-1',
          next_meeting_date: '2024-01-15T10:00:00.000Z'
        }
      ];

      const mockTeamMembers = [
        { id: 'team-1', name: 'John Smith' }
      ];

      CalendarService.getOneOnOneMeetings.mockResolvedValue(mockOneOnOneEvents);
      OneOnOne.list.mockResolvedValue(mockOneOnOnes);
      TeamMember.list.mockResolvedValue(mockTeamMembers);

      const result = await CalendarSynchronizationService.validateEventConsistency();

      expect(result.summary.isConsistent).toBe(true);
      expect(result.summary.totalIssues).toBe(0);
    });
  });

  describe('repairMissingEvents', () => {
    it('should repair orphaned events by removing them', async () => {
      const mockValidation = {
        summary: { isConsistent: false },
        inconsistencies: {
          orphanedEvents: [
            {
              eventId: 'event-1',
              title: 'Orphaned Event',
              teamMemberId: 'team-1'
            }
          ],
          missingLinks: [],
          brokenReferences: [],
          duplicateEvents: []
        }
      };

      vi.spyOn(CalendarSynchronizationService, 'validateEventConsistency')
        .mockResolvedValue(mockValidation);
      CalendarEvent.delete.mockResolvedValue(true);

      const result = await CalendarSynchronizationService.repairMissingEvents();

      expect(CalendarEvent.delete).toHaveBeenCalledWith('event-1');
      expect(result.summary.orphanedRemovedCount).toBe(1);
      expect(result.repairs.orphanedRemoved[0].eventId).toBe('event-1');
      expect(result.repairs.orphanedRemoved[0].action).toBe('deleted');
    });

    it('should repair missing calendar events by creating them', async () => {
      const mockValidation = {
        summary: { isConsistent: false },
        inconsistencies: {
          orphanedEvents: [],
          missingLinks: [
            {
              oneOnOneId: 'oneonone-1',
              teamMemberId: 'team-1',
              nextMeetingDate: '2024-01-15T10:00:00.000Z'
            }
          ],
          brokenReferences: [],
          duplicateEvents: []
        }
      };

      vi.spyOn(CalendarSynchronizationService, 'validateEventConsistency')
        .mockResolvedValue(mockValidation);
      CalendarService.createAndLinkOneOnOneMeeting.mockResolvedValue({
        calendarEvent: { id: 'event-1' },
        oneOnOne: { id: 'oneonone-1' }
      });

      const result = await CalendarSynchronizationService.repairMissingEvents();

      expect(CalendarService.createAndLinkOneOnOneMeeting).toHaveBeenCalledWith(
        'oneonone-1',
        'team-1',
        '2024-01-15T10:00:00.000Z'
      );
      expect(result.summary.missingCreatedCount).toBe(1);
      expect(result.repairs.missingCreated[0].oneOnOneId).toBe('oneonone-1');
      expect(result.repairs.missingCreated[0].action).toBe('created');
    });

    it('should repair broken references by clearing them', async () => {
      const mockValidation = {
        summary: { isConsistent: false },
        inconsistencies: {
          orphanedEvents: [],
          missingLinks: [],
          brokenReferences: [
            {
              oneOnOneId: 'oneonone-1',
              teamMemberId: 'team-1',
              referencedEventId: 'nonexistent-event'
            }
          ],
          duplicateEvents: []
        }
      };

      vi.spyOn(CalendarSynchronizationService, 'validateEventConsistency')
        .mockResolvedValue(mockValidation);
      OneOnOne.update.mockResolvedValue({});

      const result = await CalendarSynchronizationService.repairMissingEvents();

      expect(OneOnOne.update).toHaveBeenCalledWith('oneonone-1', {
        next_meeting_calendar_event_id: null
      });
      expect(result.summary.brokenFixedCount).toBe(1);
      expect(result.repairs.brokenFixed[0].oneOnOneId).toBe('oneonone-1');
      expect(result.repairs.brokenFixed[0].action).toBe('cleared');
    });

    it('should remove duplicate events keeping the first one', async () => {
      const mockValidation = {
        summary: { isConsistent: false },
        inconsistencies: {
          orphanedEvents: [],
          missingLinks: [],
          brokenReferences: [],
          duplicateEvents: [
            {
              key: 'team-1-Mon Jan 15 2024',
              teamMemberId: 'team-1',
              date: 'Mon Jan 15 2024',
              events: [
                { id: 'event-1', title: 'John Smith 1:1' },
                { id: 'event-2', title: 'John Smith 1:1' },
                { id: 'event-3', title: 'John Smith 1:1' }
              ],
              count: 3
            }
          ]
        }
      };

      vi.spyOn(CalendarSynchronizationService, 'validateEventConsistency')
        .mockResolvedValue(mockValidation);
      CalendarEvent.delete.mockResolvedValue(true);

      const result = await CalendarSynchronizationService.repairMissingEvents();

      expect(CalendarEvent.delete).toHaveBeenCalledTimes(2); // Remove event-2 and event-3
      expect(CalendarEvent.delete).toHaveBeenCalledWith('event-2');
      expect(CalendarEvent.delete).toHaveBeenCalledWith('event-3');
      expect(result.summary.duplicatesRemovedCount).toBe(2);
    });

    it('should support dry run mode', async () => {
      const mockValidation = {
        summary: { isConsistent: false },
        inconsistencies: {
          orphanedEvents: [
            {
              eventId: 'event-1',
              title: 'Orphaned Event',
              teamMemberId: 'team-1'
            }
          ],
          missingLinks: [],
          brokenReferences: [],
          duplicateEvents: []
        }
      };

      vi.spyOn(CalendarSynchronizationService, 'validateEventConsistency')
        .mockResolvedValue(mockValidation);

      const result = await CalendarSynchronizationService.repairMissingEvents({
        dryRun: true
      });

      expect(CalendarEvent.delete).not.toHaveBeenCalled();
      expect(result.dryRun).toBe(true);
      expect(result.summary.orphanedRemovedCount).toBe(1);
      expect(result.repairs.orphanedRemoved[0].action).toBe('would_delete');
    });

    it('should handle repair errors gracefully', async () => {
      const mockValidation = {
        summary: { isConsistent: false },
        inconsistencies: {
          orphanedEvents: [
            {
              eventId: 'event-1',
              title: 'Orphaned Event',
              teamMemberId: 'team-1'
            }
          ],
          missingLinks: [],
          brokenReferences: [],
          duplicateEvents: []
        }
      };

      vi.spyOn(CalendarSynchronizationService, 'validateEventConsistency')
        .mockResolvedValue(mockValidation);
      CalendarEvent.delete.mockRejectedValue(new Error('Delete failed'));

      const result = await CalendarSynchronizationService.repairMissingEvents();

      expect(result.summary.orphanedRemovedCount).toBe(0);
      expect(result.summary.errorCount).toBe(1);
      expect(result.errors[0].type).toBe('orphaned_removal_failed');
      expect(result.errors[0].error).toContain('Delete failed');
    });

    it('should return early when no inconsistencies found', async () => {
      const mockValidation = {
        summary: { isConsistent: true },
        inconsistencies: {
          orphanedEvents: [],
          missingLinks: [],
          brokenReferences: [],
          duplicateEvents: []
        }
      };

      vi.spyOn(CalendarSynchronizationService, 'validateEventConsistency')
        .mockResolvedValue(mockValidation);

      const result = await CalendarSynchronizationService.repairMissingEvents();

      expect(result.summary.totalRepairs).toBe(0);
      expect(CalendarEvent.delete).not.toHaveBeenCalled();
      expect(CalendarService.createAndLinkOneOnOneMeeting).not.toHaveBeenCalled();
    });
  });

  describe('error handling', () => {
    it('should handle API errors with retry mechanism', async () => {
      const mockOneOnOnes = [
        {
          id: 'oneonone-1',
          team_member_id: 'team-1',
          next_meeting_date: '2024-01-15T10:00:00.000Z',
          next_meeting_calendar_event_id: null
        }
      ];

      const mockTeamMembers = [
        { id: 'team-1', name: 'John Smith' }
      ];

      OneOnOne.list.mockResolvedValue(mockOneOnOnes);
      TeamMember.list.mockResolvedValue(mockTeamMembers);
      CalendarService.createAndLinkOneOnOneMeeting
        .mockRejectedValueOnce(new Error('Temporary failure'))
        .mockRejectedValueOnce(new Error('Temporary failure'))
        .mockResolvedValueOnce({
          calendarEvent: { id: 'event-1' },
          oneOnOne: { id: 'oneonone-1' }
        });

      const result = await CalendarSynchronizationService.syncOneOnOneMeetings();

      expect(CalendarService.createAndLinkOneOnOneMeeting).toHaveBeenCalledTimes(3);
      expect(result.summary.createdCount).toBe(1);
      expect(result.summary.success).toBe(true);
    });

    it('should throw OperationError after max retries exceeded', async () => {
      const mockOneOnOnes = [
        {
          id: 'oneonone-1',
          team_member_id: 'team-1',
          next_meeting_date: '2024-01-15T10:00:00.000Z',
          next_meeting_calendar_event_id: null
        }
      ];

      const mockTeamMembers = [
        { id: 'team-1', name: 'John Smith' }
      ];

      OneOnOne.list.mockResolvedValue(mockOneOnOnes);
      TeamMember.list.mockResolvedValue(mockTeamMembers);
      CalendarService.createAndLinkOneOnOneMeeting.mockRejectedValue(new Error('Persistent failure'));

      const result = await CalendarSynchronizationService.syncOneOnOneMeetings();

      expect(result.summary.errorCount).toBe(1);
      expect(result.errors[0].error).toContain('Persistent failure');
    });
  });
});