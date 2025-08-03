// src/services/__tests__/dutyRefreshService.test.js
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import DutyRefreshService from '../dutyRefreshService';
import { Duty, CalendarEvent, TeamMember } from '../../api/entities';

// Mock the entities
vi.mock('../../api/entities', () => ({
  Duty: {
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    get: vi.fn(),
    list: vi.fn()
  },
  CalendarEvent: {
    getByDutyId: vi.fn(),
    createDutyEvent: vi.fn(),
    delete: vi.fn()
  },
  TeamMember: {
    list: vi.fn()
  }
}));

describe('DutyRefreshService', () => {
  beforeEach(() => {
    // Clear all mocks and service state
    vi.clearAllMocks();
    DutyRefreshService.clearAll();
  });

  afterEach(() => {
    // Clean up after each test
    DutyRefreshService.clearAll();
  });

  describe('Refresh Callbacks', () => {
    it('should register and unregister refresh callbacks', () => {
      const callback = vi.fn();
      const unregister = DutyRefreshService.registerRefreshCallback(callback, 'test-view');
      
      expect(typeof unregister).toBe('function');
      
      // Unregister should work
      unregister();
      expect(callback).not.toHaveBeenCalled();
    });

    it('should trigger refresh callbacks', async () => {
      const callback1 = vi.fn();
      const callback2 = vi.fn();
      
      DutyRefreshService.registerRefreshCallback(callback1, 'view1');
      DutyRefreshService.registerRefreshCallback(callback2, 'view2');
      
      await DutyRefreshService.triggerRefresh({ immediate: true });
      
      expect(callback1).toHaveBeenCalledWith(expect.objectContaining({
        timestamp: expect.any(Number)
      }));
      expect(callback2).toHaveBeenCalledWith(expect.objectContaining({
        timestamp: expect.any(Number)
      }));
    });

    it('should handle callback errors gracefully', async () => {
      const errorCallback = vi.fn(() => {
        throw new Error('Callback error');
      });
      const goodCallback = vi.fn();
      
      DutyRefreshService.registerRefreshCallback(errorCallback, 'error-view');
      DutyRefreshService.registerRefreshCallback(goodCallback, 'good-view');
      
      // Should not throw despite error in one callback
      await expect(DutyRefreshService.triggerRefresh({ immediate: true })).resolves.toBeUndefined();
      
      expect(errorCallback).toHaveBeenCalled();
      expect(goodCallback).toHaveBeenCalled();
    });
  });

  describe('Optimistic Updates', () => {
    it('should add and remove optimistic updates', () => {
      const dutyId = 'duty-1';
      const optimisticData = { id: dutyId, title: 'Test Duty' };
      
      DutyRefreshService.addOptimisticUpdate(dutyId, optimisticData, 'create');
      
      const update = DutyRefreshService.getOptimisticUpdate(dutyId);
      expect(update).toEqual({
        data: optimisticData,
        operation: 'create',
        timestamp: expect.any(Number)
      });
      
      DutyRefreshService.removeOptimisticUpdate(dutyId);
      expect(DutyRefreshService.getOptimisticUpdate(dutyId)).toBeNull();
    });

    it('should apply optimistic updates to duty list', () => {
      const originalDuties = [
        { id: 'duty-1', title: 'Original Duty 1' },
        { id: 'duty-2', title: 'Original Duty 2' }
      ];
      
      // Add create optimistic update
      DutyRefreshService.addOptimisticUpdate('duty-3', { id: 'duty-3', title: 'New Duty' }, 'create');
      
      // Add update optimistic update
      DutyRefreshService.addOptimisticUpdate('duty-1', { title: 'Updated Duty 1' }, 'update');
      
      // Add delete optimistic update
      DutyRefreshService.addOptimisticUpdate('duty-2', {}, 'delete');
      
      const result = DutyRefreshService.applyOptimisticUpdates(originalDuties);
      
      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({ id: 'duty-3', title: 'New Duty' }); // New duty at start
      expect(result[1]).toEqual({ id: 'duty-1', title: 'Updated Duty 1' }); // Updated duty
      // duty-2 should be removed
    });

    it('should auto-remove optimistic updates after timeout', (done) => {
      const dutyId = 'duty-1';
      const optimisticData = { id: dutyId, title: 'Test Duty' };
      
      DutyRefreshService.addOptimisticUpdate(dutyId, optimisticData, 'create');
      
      expect(DutyRefreshService.getOptimisticUpdate(dutyId)).toBeTruthy();
      
      // Wait for auto-removal (mocked timeout)
      setTimeout(() => {
        expect(DutyRefreshService.getOptimisticUpdate(dutyId)).toBeNull();
        done();
      }, 5100); // Slightly longer than the 5000ms timeout
    }, 6000);
  });

  describe('Duty Highlighting', () => {
    it('should highlight and unhighlight duties', (done) => {
      const dutyId = 'duty-1';
      
      expect(DutyRefreshService.isDutyHighlighted(dutyId)).toBe(false);
      
      DutyRefreshService.highlightDuty(dutyId, 100); // Short duration for test
      
      expect(DutyRefreshService.isDutyHighlighted(dutyId)).toBe(true);
      
      setTimeout(() => {
        expect(DutyRefreshService.isDutyHighlighted(dutyId)).toBe(false);
        done();
      }, 150);
    });
  });

  describe('Create Duty with Refresh', () => {
    it('should create duty with optimistic updates and refresh', async () => {
      const dutyData = {
        team_member_id: 'member-1',
        type: 'devops',
        title: 'Test Duty',
        start_date: '2024-01-01',
        end_date: '2024-01-02'
      };
      
      const createdDuty = { ...dutyData, id: 'duty-1', created_date: '2024-01-01T00:00:00Z' };
      Duty.create.mockResolvedValue(createdDuty);
      
      const callback = vi.fn();
      DutyRefreshService.registerRefreshCallback(callback, 'test-view');
      
      const result = await DutyRefreshService.createDutyWithRefresh(dutyData);
      
      expect(Duty.create).toHaveBeenCalledWith(dutyData);
      expect(result).toEqual(createdDuty);
      expect(callback).toHaveBeenCalledWith(expect.objectContaining({
        newDutyId: createdDuty.id
      }));
      expect(DutyRefreshService.isDutyHighlighted(createdDuty.id)).toBe(true);
    });

    it('should handle create errors and rollback optimistic updates', async () => {
      const dutyData = {
        team_member_id: 'member-1',
        type: 'devops',
        title: 'Test Duty',
        start_date: '2024-01-01',
        end_date: '2024-01-02'
      };
      
      const error = new Error('Creation failed');
      Duty.create.mockRejectedValue(error);
      
      const callback = vi.fn();
      DutyRefreshService.registerRefreshCallback(callback, 'test-view');
      
      await expect(DutyRefreshService.createDutyWithRefresh(dutyData)).rejects.toThrow('Creation failed');
      
      // Should trigger refresh to remove optimistic data
      expect(callback).toHaveBeenCalled();
    });
  });

  describe('Update Duty with Refresh', () => {
    it('should update duty with optimistic updates and refresh', async () => {
      const dutyId = 'duty-1';
      const currentDuty = { id: dutyId, title: 'Original Title' };
      const updates = { title: 'Updated Title' };
      const updatedDuty = { ...currentDuty, ...updates };
      
      Duty.get.mockResolvedValue(currentDuty);
      Duty.update.mockResolvedValue(updatedDuty);
      
      const callback = vi.fn();
      DutyRefreshService.registerRefreshCallback(callback, 'test-view');
      
      const result = await DutyRefreshService.updateDutyWithRefresh(dutyId, updates);
      
      expect(Duty.get).toHaveBeenCalledWith(dutyId);
      expect(Duty.update).toHaveBeenCalledWith(dutyId, updates);
      expect(result).toEqual(updatedDuty);
      expect(callback).toHaveBeenCalledWith(expect.objectContaining({
        updatedDutyId: dutyId
      }));
      expect(DutyRefreshService.isDutyHighlighted(dutyId)).toBe(true);
    });

    it('should handle update errors and rollback optimistic updates', async () => {
      const dutyId = 'duty-1';
      const currentDuty = { id: dutyId, title: 'Original Title' };
      const updates = { title: 'Updated Title' };
      
      Duty.get.mockResolvedValue(currentDuty);
      Duty.update.mockRejectedValue(new Error('Update failed'));
      
      const callback = vi.fn();
      DutyRefreshService.registerRefreshCallback(callback, 'test-view');
      
      await expect(DutyRefreshService.updateDutyWithRefresh(dutyId, updates)).rejects.toThrow('Update failed');
      
      // Should trigger refresh to restore original data
      expect(callback).toHaveBeenCalled();
    });
  });

  describe('Delete Duty with Refresh', () => {
    it('should delete duty with optimistic updates and refresh', async () => {
      const dutyId = 'duty-1';
      const currentDuty = { id: dutyId, title: 'Test Duty' };
      
      Duty.get.mockResolvedValue(currentDuty);
      Duty.delete.mockResolvedValue(true);
      
      const callback = vi.fn();
      DutyRefreshService.registerRefreshCallback(callback, 'test-view');
      
      const result = await DutyRefreshService.deleteDutyWithRefresh(dutyId);
      
      expect(Duty.get).toHaveBeenCalledWith(dutyId);
      expect(Duty.delete).toHaveBeenCalledWith(dutyId);
      expect(result).toBe(true);
      expect(callback).toHaveBeenCalledWith(expect.objectContaining({
        deletedDutyId: dutyId
      }));
      expect(DutyRefreshService.isDutyHighlighted(dutyId)).toBe(false);
    });

    it('should handle delete errors and rollback optimistic updates', async () => {
      const dutyId = 'duty-1';
      const currentDuty = { id: dutyId, title: 'Test Duty' };
      
      Duty.get.mockResolvedValue(currentDuty);
      Duty.delete.mockRejectedValue(new Error('Delete failed'));
      
      const callback = vi.fn();
      DutyRefreshService.registerRefreshCallback(callback, 'test-view');
      
      await expect(DutyRefreshService.deleteDutyWithRefresh(dutyId)).rejects.toThrow('Delete failed');
      
      // Should trigger refresh to restore original data
      expect(callback).toHaveBeenCalled();
    });
  });

  describe('Consistent Duty Display', () => {
    it('should process duties for consistent display', () => {
      const duties = [
        {
          id: 'duty-1',
          team_member_id: 'member-1',
          title: 'Active Duty',
          type: 'devops',
          start_date: '2024-01-01',
          end_date: '2024-12-31'
        },
        {
          id: 'duty-2',
          team_member_id: 'member-2',
          title: 'Past Duty',
          type: 'on_call',
          start_date: '2023-01-01',
          end_date: '2023-12-31'
        }
      ];
      
      const teamMembers = [
        { id: 'member-1', name: 'John Doe' },
        { id: 'member-2', name: 'Jane Smith' }
      ];
      
      const result = DutyRefreshService.getConsistentDutyDisplay(duties, teamMembers);
      
      expect(result).toHaveLength(2);
      
      // Check that team member info is added
      expect(result[0]._teamMember).toEqual(teamMembers[0]);
      expect(result[0]._teamMemberName).toBe('John Doe');
      expect(result[0]._teamMemberInitials).toBe('JD');
      
      // Check that status info is added
      expect(result[0]._status).toBeDefined();
      expect(result[0]._isActive).toBeDefined();
      expect(result[0]._isPast).toBeDefined();
      expect(result[0]._isFuture).toBeDefined();
      
      // Check that formatted dates are added
      expect(result[0]._formattedStartDate).toBeDefined();
      expect(result[0]._formattedEndDate).toBeDefined();
      expect(result[0]._formattedDateRange).toBeDefined();
      
      // Check that duration info is added
      expect(result[0]._durationDays).toBeDefined();
      expect(result[0]._durationText).toBeDefined();
    });

    it('should sort duties correctly', () => {
      const duties = [
        { id: 'duty-1', title: 'B Duty', start_date: '2024-01-02', end_date: '2024-01-03' },
        { id: 'duty-2', title: 'A Duty', start_date: '2024-01-01', end_date: '2024-01-02' },
        { id: 'duty-3', title: 'C Duty', start_date: '2024-01-03', end_date: '2024-01-04' }
      ];
      
      // Sort by start_date ascending
      const result1 = DutyRefreshService.getConsistentDutyDisplay(duties, [], {
        sortBy: 'start_date',
        sortOrder: 'asc'
      });
      
      expect(result1[0].id).toBe('duty-2');
      expect(result1[1].id).toBe('duty-1');
      expect(result1[2].id).toBe('duty-3');
      
      // Sort by title ascending
      const result2 = DutyRefreshService.getConsistentDutyDisplay(duties, [], {
        sortBy: 'title',
        sortOrder: 'asc'
      });
      
      expect(result2[0].title).toBe('A Duty');
      expect(result2[1].title).toBe('B Duty');
      expect(result2[2].title).toBe('C Duty');
    });
  });

  describe('Calendar Event Refresh', () => {
    it('should refresh calendar events for duties', async () => {
      const duties = [
        { id: 'duty-1', team_member_id: 'member-1', title: 'Test Duty 1', start_date: '2024-01-01', end_date: '2024-01-02' },
        { id: 'duty-2', team_member_id: 'member-2', title: 'Test Duty 2', start_date: '2024-01-03', end_date: '2024-01-04' }
      ];
      
      Duty.list.mockResolvedValue(duties);
      CalendarEvent.getByDutyId.mockResolvedValue([]); // No existing events
      CalendarEvent.createDutyEvent.mockResolvedValue({ id: 'event-1' });
      
      await DutyRefreshService.refreshCalendarEvents();
      
      expect(Duty.list).toHaveBeenCalled();
      expect(CalendarEvent.getByDutyId).toHaveBeenCalledTimes(2);
      expect(CalendarEvent.createDutyEvent).toHaveBeenCalledTimes(2);
    });

    it('should handle duplicate calendar events', async () => {
      const duties = [
        { id: 'duty-1', team_member_id: 'member-1', title: 'Test Duty', start_date: '2024-01-01', end_date: '2024-01-02' }
      ];
      
      const duplicateEvents = [
        { id: 'event-1', duty_id: 'duty-1' },
        { id: 'event-2', duty_id: 'duty-1' }
      ];
      
      CalendarEvent.getByDutyId.mockResolvedValue(duplicateEvents);
      CalendarEvent.delete.mockResolvedValue(true);
      
      await DutyRefreshService.refreshCalendarEvents(duties);
      
      expect(CalendarEvent.delete).toHaveBeenCalledWith('event-2'); // Remove duplicate
    });
  });
});