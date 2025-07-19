// src/utils/__tests__/oneOnOneIntegration.test.js
// Tests for OneOnOne entity calendar integration

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
    createAndLinkOneOnOneMeeting: vi.fn(),
    updateOneOnOneMeeting: vi.fn(),
    deleteOneOnOneMeeting: vi.fn()
  }
}));

import { CalendarService } from '../calendarService.js';
import { localClient } from '../../api/localClient.js';

describe('OneOnOne Calendar Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorageMock.getItem.mockReturnValue('[]');
  });

  describe('OneOnOne.create', () => {
    it('should add next_meeting_calendar_event_id field to new OneOnOne records', async () => {
      const oneOnOneData = {
        team_member_id: 'team-123',
        date: '2024-01-15T10:00:00.000Z',
        notes: 'Test meeting',
        next_meeting_date: '2024-01-22T10:00:00.000Z'
      };

      const mockCalendarResult = {
        calendarEvent: { id: 'event-123' },
        oneOnOne: { id: 'oneonone-123', next_meeting_calendar_event_id: 'event-123' }
      };

      CalendarService.createAndLinkOneOnOneMeeting.mockResolvedValue(mockCalendarResult);

      const result = await localClient.entities.OneOnOne.create(oneOnOneData);

      expect(result).toHaveProperty('next_meeting_calendar_event_id');
      expect(CalendarService.createAndLinkOneOnOneMeeting).toHaveBeenCalledWith(
        result.id,
        'team-123',
        '2024-01-22T10:00:00.000Z'
      );
    });

    it('should not create calendar event if next_meeting_date is not provided', async () => {
      const oneOnOneData = {
        team_member_id: 'team-123',
        date: '2024-01-15T10:00:00.000Z',
        notes: 'Test meeting'
      };

      const result = await localClient.entities.OneOnOne.create(oneOnOneData);

      expect(result).toHaveProperty('next_meeting_calendar_event_id', null);
      expect(CalendarService.createAndLinkOneOnOneMeeting).not.toHaveBeenCalled();
    });

    it('should handle calendar service errors gracefully', async () => {
      const oneOnOneData = {
        team_member_id: 'team-123',
        date: '2024-01-15T10:00:00.000Z',
        notes: 'Test meeting',
        next_meeting_date: '2024-01-22T10:00:00.000Z'
      };

      CalendarService.createAndLinkOneOnOneMeeting.mockRejectedValue(new Error('Calendar service error'));

      const result = await localClient.entities.OneOnOne.create(oneOnOneData);

      expect(result).toHaveProperty('next_meeting_calendar_event_id', null);
      expect(result.id).toBeDefined();
    });
  });

  describe('OneOnOne.update', () => {
    it('should update calendar event when next_meeting_date changes', async () => {
      const existingOneOnOnes = [{
        id: 'oneonone-123',
        team_member_id: 'team-123',
        next_meeting_date: '2024-01-22T10:00:00.000Z',
        next_meeting_calendar_event_id: 'event-123'
      }];

      localStorageMock.getItem.mockReturnValue(JSON.stringify(existingOneOnOnes));
      CalendarService.updateOneOnOneMeeting.mockResolvedValue({ id: 'event-123' });

      const updates = {
        next_meeting_date: '2024-01-23T14:00:00.000Z'
      };

      await localClient.entities.OneOnOne.update('oneonone-123', updates);

      expect(CalendarService.updateOneOnOneMeeting).toHaveBeenCalledWith(
        'event-123',
        '2024-01-23T14:00:00.000Z'
      );
    });

    it('should create new calendar event if none exists', async () => {
      const existingOneOnOnes = [{
        id: 'oneonone-123',
        team_member_id: 'team-123',
        next_meeting_date: null,
        next_meeting_calendar_event_id: null
      }];

      localStorageMock.getItem.mockReturnValue(JSON.stringify(existingOneOnOnes));
      
      const mockCalendarResult = {
        calendarEvent: { id: 'event-456' },
        oneOnOne: { id: 'oneonone-123', next_meeting_calendar_event_id: 'event-456' }
      };

      CalendarService.createAndLinkOneOnOneMeeting.mockResolvedValue(mockCalendarResult);

      const updates = {
        next_meeting_date: '2024-01-23T14:00:00.000Z'
      };

      await localClient.entities.OneOnOne.update('oneonone-123', updates);

      expect(CalendarService.createAndLinkOneOnOneMeeting).toHaveBeenCalledWith(
        'oneonone-123',
        'team-123',
        '2024-01-23T14:00:00.000Z'
      );
    });

    it('should delete calendar event when next_meeting_date is cleared', async () => {
      const existingOneOnOnes = [{
        id: 'oneonone-123',
        team_member_id: 'team-123',
        next_meeting_date: '2024-01-22T10:00:00.000Z',
        next_meeting_calendar_event_id: 'event-123'
      }];

      localStorageMock.getItem.mockReturnValue(JSON.stringify(existingOneOnOnes));
      CalendarService.deleteOneOnOneMeeting.mockResolvedValue(true);

      const updates = {
        next_meeting_date: null
      };

      await localClient.entities.OneOnOne.update('oneonone-123', updates);

      expect(CalendarService.deleteOneOnOneMeeting).toHaveBeenCalledWith('event-123');
    });
  });

  describe('OneOnOne.delete', () => {
    it('should delete associated calendar event when OneOnOne is deleted', async () => {
      const existingOneOnOnes = [{
        id: 'oneonone-123',
        team_member_id: 'team-123',
        next_meeting_calendar_event_id: 'event-123'
      }];

      localStorageMock.getItem.mockReturnValue(JSON.stringify(existingOneOnOnes));
      CalendarService.deleteOneOnOneMeeting.mockResolvedValue(true);

      await localClient.entities.OneOnOne.delete('oneonone-123');

      expect(CalendarService.deleteOneOnOneMeeting).toHaveBeenCalledWith('event-123');
    });

    it('should handle deletion when no calendar event exists', async () => {
      const existingOneOnOnes = [{
        id: 'oneonone-123',
        team_member_id: 'team-123',
        next_meeting_calendar_event_id: null
      }];

      localStorageMock.getItem.mockReturnValue(JSON.stringify(existingOneOnOnes));

      const result = await localClient.entities.OneOnOne.delete('oneonone-123');

      expect(result).toBe(true);
      expect(CalendarService.deleteOneOnOneMeeting).not.toHaveBeenCalled();
    });
  });
});