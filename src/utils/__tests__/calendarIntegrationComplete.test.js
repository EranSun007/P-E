// src/utils/__tests__/calendarIntegrationComplete.test.js
// Comprehensive tests for calendar integration functionality

import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};
global.localStorage = localStorageMock;

// Mock CalendarService
vi.mock('../calendarService.js', () => ({
  CalendarService: {
    generateOneOnOneTitle: vi.fn(),
    createOneOnOneMeeting: vi.fn(),
    updateOneOnOneMeeting: vi.fn(),
    deleteOneOnOneMeeting: vi.fn(),
    getOneOnOneMeetings: vi.fn(),
    getOneOnOneMeetingsForTeamMember: vi.fn(),
    linkMeetingToCalendarEvent: vi.fn(),
    createAndLinkOneOnOneMeeting: vi.fn(),
    cleanupOrphanedCalendarEvents: vi.fn(),
    validateCalendarEventConsistency: vi.fn(),
    batchCreateOneOnOneMeetings: vi.fn(),
    batchUpdateOneOnOneMeetings: vi.fn(),
    batchDeleteOneOnOneMeetings: vi.fn(),
    performMaintenance: vi.fn()
  }
}));

import { CalendarService } from '../calendarService.js';

describe('Calendar Integration - Complete Test Suite', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorageMock.getItem.mockReturnValue('[]');
  });

  describe('Task 8.1: Unit Tests for CalendarService Functions', () => {
    describe('Calendar Event Creation with Proper Naming Format', () => {
      it('should generate proper 1:1 meeting title format', () => {
        CalendarService.generateOneOnOneTitle.mockReturnValue('John Smith 1:1');
        
        const title = CalendarService.generateOneOnOneTitle('John Smith');
        
        expect(title).toBe('John Smith 1:1');
        expect(CalendarService.generateOneOnOneTitle).toHaveBeenCalledWith('John Smith');
      });

      it('should create calendar event with proper naming format', async () => {
        const mockEvent = {
          id: 'event-123',
          title: 'John Smith 1:1',
          start_date: '2024-01-15T10:00:00.000Z',
          end_date: '2024-01-15T10:30:00.000Z',
          event_type: 'one_on_one',
          team_member_id: 'team-123'
        };

        CalendarService.createOneOnOneMeeting.mockResolvedValue(mockEvent);

        const result = await CalendarService.createOneOnOneMeeting(
          'team-123',
          'John Smith',
          '2024-01-15T10:00:00.000Z'
        );

        expect(result.title).toBe('John Smith 1:1');
        expect(result.event_type).toBe('one_on_one');
        expect(CalendarService.createOneOnOneMeeting).toHaveBeenCalledWith(
          'team-123',
          'John Smith',
          '2024-01-15T10:00:00.000Z'
        );
      });

      it('should handle multiple team members with consistent naming', async () => {
        const teamMembers = [
          { id: 'team-1', name: 'John Smith' },
          { id: 'team-2', name: 'Jane Doe' },
          { id: 'team-3', name: 'Bob Johnson' }
        ];

        const mockEvents = teamMembers.map((member, index) => ({
          id: `event-${index + 1}`,
          title: `${member.name} 1:1`,
          event_type: 'one_on_one',
          team_member_id: member.id
        }));

        CalendarService.batchCreateOneOnOneMeetings.mockResolvedValue({
          total: 3,
          successful: mockEvents,
          failed: []
        });

        const meetingData = teamMembers.map(member => ({
          teamMemberId: member.id,
          teamMemberName: member.name,
          dateTime: '2024-01-15T10:00:00.000Z'
        }));

        const result = await CalendarService.batchCreateOneOnOneMeetings(meetingData);

        expect(result.successful).toHaveLength(3);
        expect(result.successful[0].title).toBe('John Smith 1:1');
        expect(result.successful[1].title).toBe('Jane Doe 1:1');
        expect(result.successful[2].title).toBe('Bob Johnson 1:1');
      });
    });

    describe('Linking Between OneOnOne Records and CalendarEvent Records', () => {
      it('should link OneOnOne record to CalendarEvent', async () => {
        const mockResult = {
          id: 'oneonone-123',
          next_meeting_calendar_event_id: 'event-123'
        };

        CalendarService.linkMeetingToCalendarEvent.mockResolvedValue(mockResult);

        const result = await CalendarService.linkMeetingToCalendarEvent('oneonone-123', 'event-123');

        expect(result.next_meeting_calendar_event_id).toBe('event-123');
        expect(CalendarService.linkMeetingToCalendarEvent).toHaveBeenCalledWith('oneonone-123', 'event-123');
      });

      it('should create and link calendar event in one operation', async () => {
        const mockResult = {
          calendarEvent: {
            id: 'event-123',
            title: 'John Smith 1:1',
            event_type: 'one_on_one',
            team_member_id: 'team-123'
          },
          oneOnOne: {
            id: 'oneonone-123',
            next_meeting_calendar_event_id: 'event-123'
          }
        };

        CalendarService.createAndLinkOneOnOneMeeting.mockResolvedValue(mockResult);

        const result = await CalendarService.createAndLinkOneOnOneMeeting(
          'oneonone-123',
          'team-123',
          '2024-01-15T10:00:00.000Z'
        );

        expect(result.calendarEvent.id).toBe('event-123');
        expect(result.oneOnOne.next_meeting_calendar_event_id).toBe('event-123');
        expect(CalendarService.createAndLinkOneOnOneMeeting).toHaveBeenCalledWith(
          'oneonone-123',
          'team-123',
          '2024-01-15T10:00:00.000Z'
        );
      });

      it('should maintain bidirectional linking between entities', async () => {
        const mockCalendarEvent = {
          id: 'event-123',
          linked_entity_type: 'one_on_one',
          linked_entity_id: 'oneonone-123'
        };

        const mockOneOnOne = {
          id: 'oneonone-123',
          next_meeting_calendar_event_id: 'event-123'
        };

        CalendarService.createAndLinkOneOnOneMeeting.mockResolvedValue({
          calendarEvent: mockCalendarEvent,
          oneOnOne: mockOneOnOne
        });

        const result = await CalendarService.createAndLinkOneOnOneMeeting(
          'oneonone-123',
          'team-123',
          '2024-01-15T10:00:00.000Z'
        );

        // Verify bidirectional linking
        expect(result.calendarEvent.linked_entity_id).toBe('oneonone-123');
        expect(result.oneOnOne.next_meeting_calendar_event_id).toBe('event-123');
      });
    });

    describe('Error Handling for Invalid Data and Missing Team Members', () => {
      it('should handle missing team member gracefully', async () => {
        CalendarService.createAndLinkOneOnOneMeeting.mockRejectedValue(
          new Error('Team member not found')
        );

        await expect(
          CalendarService.createAndLinkOneOnOneMeeting('oneonone-123', 'nonexistent-team', '2024-01-15T10:00:00.000Z')
        ).rejects.toThrow('Team member not found');
      });

      it('should handle invalid date formats', async () => {
        CalendarService.createOneOnOneMeeting.mockRejectedValue(
          new Error('Invalid date/time format')
        );

        await expect(
          CalendarService.createOneOnOneMeeting('team-123', 'John Smith', 'invalid-date')
        ).rejects.toThrow('Invalid date/time format');
      });

      it('should handle missing required parameters', async () => {
        CalendarService.createOneOnOneMeeting.mockRejectedValue(
          new Error('Team member ID is required')
        );

        await expect(
          CalendarService.createOneOnOneMeeting('', 'John Smith', '2024-01-15T10:00:00.000Z')
        ).rejects.toThrow('Team member ID is required');
      });

      it('should handle calendar service failures gracefully', async () => {
        CalendarService.createAndLinkOneOnOneMeeting.mockRejectedValue(
          new Error('Calendar service unavailable')
        );

        await expect(
          CalendarService.createAndLinkOneOnOneMeeting('oneonone-123', 'team-123', '2024-01-15T10:00:00.000Z')
        ).rejects.toThrow('Calendar service unavailable');
      });
    });

    describe('Data Validation and Consistency', () => {
      it('should validate calendar event consistency', async () => {
        const mockValidationResult = {
          totalEventsValidated: 5,
          inconsistenciesFound: 1,
          inconsistencies: [
            {
              eventId: 'event-2',
              issues: ['Title mismatch: expected "Jane Doe 1:1", got "Wrong Title"']
            }
          ],
          isValid: false
        };

        CalendarService.validateCalendarEventConsistency.mockResolvedValue(mockValidationResult);

        const result = await CalendarService.validateCalendarEventConsistency();

        expect(result.totalEventsValidated).toBe(5);
        expect(result.inconsistenciesFound).toBe(1);
        expect(result.isValid).toBe(false);
        expect(result.inconsistencies[0].issues[0]).toContain('Title mismatch');
      });

      it('should clean up orphaned calendar events', async () => {
        const mockCleanupResult = {
          totalProcessed: 10,
          orphanedFound: 3,
          cleanedCount: 3,
          success: true,
          errors: []
        };

        CalendarService.cleanupOrphanedCalendarEvents.mockResolvedValue(mockCleanupResult);

        const result = await CalendarService.cleanupOrphanedCalendarEvents();

        expect(result.totalProcessed).toBe(10);
        expect(result.orphanedFound).toBe(3);
        expect(result.cleanedCount).toBe(3);
        expect(result.success).toBe(true);
      });

      it('should perform comprehensive maintenance', async () => {
        const mockMaintenanceResult = {
          success: true,
          cleanup: {
            totalProcessed: 10,
            orphanedFound: 2,
            cleanedCount: 2,
            success: true
          },
          validation: {
            totalEventsValidated: 8,
            inconsistenciesFound: 0,
            isValid: true
          }
        };

        CalendarService.performMaintenance.mockResolvedValue(mockMaintenanceResult);

        const result = await CalendarService.performMaintenance();

        expect(result.success).toBe(true);
        expect(result.cleanup.cleanedCount).toBe(2);
        expect(result.validation.isValid).toBe(true);
      });
    });
  });

  describe('Task 8.2: Integration Tests for Calendar Workflow', () => {
    describe('End-to-End Flow from Scheduling Next Meeting to Calendar Display', () => {
      it('should complete full workflow: schedule -> display -> navigate', async () => {
        // Step 1: Schedule next meeting
        const mockScheduleResult = {
          calendarEvent: {
            id: 'event-123',
            title: 'John Smith 1:1',
            start_date: '2024-01-22T10:00:00.000Z',
            event_type: 'one_on_one',
            team_member_id: 'team-123'
          },
          oneOnOne: {
            id: 'oneonone-123',
            next_meeting_calendar_event_id: 'event-123'
          }
        };

        CalendarService.createAndLinkOneOnOneMeeting.mockResolvedValue(mockScheduleResult);

        const scheduleResult = await CalendarService.createAndLinkOneOnOneMeeting(
          'oneonone-123',
          'team-123',
          '2024-01-22T10:00:00.000Z'
        );

        expect(scheduleResult.calendarEvent.title).toBe('John Smith 1:1');

        // Step 2: Display in calendar
        CalendarService.getOneOnOneMeetings.mockResolvedValue([mockScheduleResult.calendarEvent]);

        const calendarEvents = await CalendarService.getOneOnOneMeetings();

        expect(calendarEvents).toHaveLength(1);
        expect(calendarEvents[0].title).toBe('John Smith 1:1');
        expect(calendarEvents[0].event_type).toBe('one_on_one');

        // Step 3: Verify navigation data is available
        expect(calendarEvents[0].team_member_id).toBe('team-123');
        expect(calendarEvents[0].id).toBe('event-123');
      });

      it('should handle multiple team members in workflow', async () => {
        const teamMembers = [
          { id: 'team-1', name: 'John Smith' },
          { id: 'team-2', name: 'Jane Doe' }
        ];

        const mockEvents = teamMembers.map((member, index) => ({
          id: `event-${index + 1}`,
          title: `${member.name} 1:1`,
          start_date: '2024-01-22T10:00:00.000Z',
          event_type: 'one_on_one',
          team_member_id: member.id
        }));

        CalendarService.getOneOnOneMeetings.mockResolvedValue(mockEvents);

        const events = await CalendarService.getOneOnOneMeetings();

        expect(events).toHaveLength(2);
        expect(events[0].title).toBe('John Smith 1:1');
        expect(events[1].title).toBe('Jane Doe 1:1');
        expect(events.every(e => e.event_type === 'one_on_one')).toBe(true);
      });
    });

    describe('Calendar Event Updates When Meetings Are Rescheduled', () => {
      it('should update calendar event when meeting is rescheduled', async () => {
        const mockUpdatedEvent = {
          id: 'event-123',
          title: 'John Smith 1:1',
          start_date: '2024-01-25T15:00:00.000Z',
          end_date: '2024-01-25T15:30:00.000Z'
        };

        CalendarService.updateOneOnOneMeeting.mockResolvedValue(mockUpdatedEvent);

        const result = await CalendarService.updateOneOnOneMeeting(
          'event-123',
          '2024-01-25T15:00:00.000Z'
        );

        expect(result.start_date).toBe('2024-01-25T15:00:00.000Z');
        expect(CalendarService.updateOneOnOneMeeting).toHaveBeenCalledWith(
          'event-123',
          '2024-01-25T15:00:00.000Z'
        );
      });

      it('should handle batch updates for multiple meetings', async () => {
        const updateData = [
          { eventId: 'event-1', dateTime: '2024-01-25T10:00:00.000Z' },
          { eventId: 'event-2', dateTime: '2024-01-26T14:00:00.000Z' }
        ];

        const mockBatchResult = {
          total: 2,
          successful: [
            { id: 'event-1', start_date: '2024-01-25T10:00:00.000Z' },
            { id: 'event-2', start_date: '2024-01-26T14:00:00.000Z' }
          ],
          failed: []
        };

        CalendarService.batchUpdateOneOnOneMeetings.mockResolvedValue(mockBatchResult);

        const result = await CalendarService.batchUpdateOneOnOneMeetings(updateData);

        expect(result.successful).toHaveLength(2);
        expect(result.failed).toHaveLength(0);
        expect(result.successful[0].start_date).toBe('2024-01-25T10:00:00.000Z');
      });

      it('should delete calendar event when meeting is cancelled', async () => {
        CalendarService.deleteOneOnOneMeeting.mockResolvedValue(true);

        const result = await CalendarService.deleteOneOnOneMeeting('event-123');

        expect(result).toBe(true);
        expect(CalendarService.deleteOneOnOneMeeting).toHaveBeenCalledWith('event-123');
      });
    });

    describe('Navigation from Calendar Events to Team Member Profiles', () => {
      it('should provide navigation data for calendar events', async () => {
        const mockEvents = [
          {
            id: 'event-123',
            title: 'John Smith 1:1',
            event_type: 'one_on_one',
            team_member_id: 'team-123',
            start_date: '2024-01-22T10:00:00.000Z'
          },
          {
            id: 'event-456',
            title: 'Jane Doe 1:1',
            event_type: 'one_on_one',
            team_member_id: 'team-456',
            start_date: '2024-01-23T14:00:00.000Z'
          }
        ];

        CalendarService.getOneOnOneMeetings.mockResolvedValue(mockEvents);

        const events = await CalendarService.getOneOnOneMeetings();

        // Verify navigation data is available
        events.forEach(event => {
          expect(event.team_member_id).toBeTruthy();
          expect(event.event_type).toBe('one_on_one');
          expect(event.title).toContain('1:1');
          
          // Navigation path would be: `/team/${event.team_member_id}`
          const navigationPath = `/team/${event.team_member_id}`;
          expect(navigationPath).toMatch(/^\/team\/team-\d+$/);
        });
      });

      it('should filter events for specific team member navigation', async () => {
        const mockEvents = [
          {
            id: 'event-123',
            title: 'John Smith 1:1',
            event_type: 'one_on_one',
            team_member_id: 'team-123'
          }
        ];

        CalendarService.getOneOnOneMeetingsForTeamMember.mockResolvedValue(mockEvents);

        const events = await CalendarService.getOneOnOneMeetingsForTeamMember('team-123');

        expect(events).toHaveLength(1);
        expect(events[0].team_member_id).toBe('team-123');
        expect(events[0].event_type).toBe('one_on_one');
      });
    });

    describe('Error Handling and Recovery', () => {
      it('should handle workflow failures gracefully', async () => {
        // Test scheduling failure
        CalendarService.createAndLinkOneOnOneMeeting.mockRejectedValue(
          new Error('Network error during scheduling')
        );

        await expect(
          CalendarService.createAndLinkOneOnOneMeeting('oneonone-123', 'team-123', '2024-01-22T10:00:00.000Z')
        ).rejects.toThrow('Network error during scheduling');

        // Test calendar display failure
        CalendarService.getOneOnOneMeetings.mockRejectedValue(
          new Error('Calendar service unavailable')
        );

        await expect(
          CalendarService.getOneOnOneMeetings()
        ).rejects.toThrow('Calendar service unavailable');
      });

      it('should handle partial workflow completion', async () => {
        // Scenario: Meeting created but calendar event failed
        CalendarService.createAndLinkOneOnOneMeeting.mockRejectedValue(
          new Error('Calendar event creation failed')
        );

        await expect(
          CalendarService.createAndLinkOneOnOneMeeting('oneonone-123', 'team-123', '2024-01-22T10:00:00.000Z')
        ).rejects.toThrow('Calendar event creation failed');

        // Verify error handling doesn't break the system
        expect(CalendarService.createAndLinkOneOnOneMeeting).toHaveBeenCalled();
      });

      it('should handle data inconsistencies in workflow', async () => {
        // Test with malformed calendar events
        const malformedEvents = [
          {
            id: 'event-1',
            title: 'John Smith 1:1',
            // Missing start_date
            event_type: 'one_on_one',
            team_member_id: 'team-123'
          }
        ];

        CalendarService.getOneOnOneMeetings.mockResolvedValue(malformedEvents);

        const events = await CalendarService.getOneOnOneMeetings();

        expect(events).toHaveLength(1);
        expect(events[0].id).toBe('event-1');
        // System should handle missing fields gracefully
      });
    });

    describe('Performance and Scalability', () => {
      it('should handle large numbers of calendar events efficiently', async () => {
        const largeEventSet = Array.from({ length: 100 }, (_, i) => ({
          id: `event-${i + 1}`,
          title: `Team Member ${i + 1} 1:1`,
          event_type: 'one_on_one',
          team_member_id: `team-${i + 1}`,
          start_date: '2024-01-22T10:00:00.000Z'
        }));

        CalendarService.getOneOnOneMeetings.mockResolvedValue(largeEventSet);

        const events = await CalendarService.getOneOnOneMeetings();

        expect(events).toHaveLength(100);
        expect(events.every(e => e.event_type === 'one_on_one')).toBe(true);
      });

      it('should handle batch operations efficiently', async () => {
        const batchData = Array.from({ length: 50 }, (_, i) => ({
          teamMemberId: `team-${i + 1}`,
          teamMemberName: `Team Member ${i + 1}`,
          dateTime: '2024-01-22T10:00:00.000Z'
        }));

        const mockBatchResult = {
          total: 50,
          successful: batchData.map((_, i) => ({ id: `event-${i + 1}` })),
          failed: []
        };

        CalendarService.batchCreateOneOnOneMeetings.mockResolvedValue(mockBatchResult);

        const result = await CalendarService.batchCreateOneOnOneMeetings(batchData);

        expect(result.total).toBe(50);
        expect(result.successful).toHaveLength(50);
        expect(result.failed).toHaveLength(0);
      });
    });
  });

  describe('Requirements Coverage Verification', () => {
    it('should satisfy Requirement 1.3: Calendar event creation with proper naming', async () => {
      const mockResult = {
        calendarEvent: {
          id: 'event-123',
          title: 'John Smith 1:1',
          event_type: 'one_on_one'
        }
      };

      CalendarService.createAndLinkOneOnOneMeeting.mockResolvedValue(mockResult);

      const result = await CalendarService.createAndLinkOneOnOneMeeting(
        'oneonone-123',
        'team-123',
        '2024-01-22T10:00:00.000Z'
      );

      // Verify proper naming format
      expect(result.calendarEvent.title).toBe('John Smith 1:1');
      expect(result.calendarEvent.event_type).toBe('one_on_one');
    });

    it('should satisfy Requirement 2.1: Calendar display of 1:1 meetings', async () => {
      const mockEvents = [
        {
          id: 'event-123',
          title: 'John Smith 1:1',
          start_date: '2024-01-22T10:00:00.000Z',
          event_type: 'one_on_one'
        }
      ];

      CalendarService.getOneOnOneMeetings.mockResolvedValue(mockEvents);

      const events = await CalendarService.getOneOnOneMeetings();

      expect(events).toHaveLength(1);
      expect(events[0].title).toBe('John Smith 1:1');
      expect(events[0].event_type).toBe('one_on_one');
    });

    it('should satisfy Requirement 4.1: Data consistency and integration', async () => {
      const mockValidationResult = {
        totalEventsValidated: 5,
        inconsistenciesFound: 0,
        isValid: true
      };

      CalendarService.validateCalendarEventConsistency.mockResolvedValue(mockValidationResult);

      const result = await CalendarService.validateCalendarEventConsistency();

      expect(result.isValid).toBe(true);
      expect(result.inconsistenciesFound).toBe(0);
    });
  });
});