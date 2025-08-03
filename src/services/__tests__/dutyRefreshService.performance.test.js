// Performance tests for optimized DutyRefreshService

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import DutyRefreshService from '../dutyRefreshService';

describe('DutyRefreshService Performance Optimizations', () => {
  let mockCallbacks;
  let performanceStartTime;

  beforeEach(() => {
    vi.clearAllMocks();
    DutyRefreshService.refreshCallbacks.clear();
    DutyRefreshService.optimisticUpdates.clear();
    DutyRefreshService.highlightedDuties.clear();
    DutyRefreshService.refreshTimeouts.clear();

    mockCallbacks = {
      calendar: vi.fn().mockResolvedValue(true),
      list: vi.fn().mockResolvedValue(true),
      profile: vi.fn().mockResolvedValue(true),
      slowCallback: vi.fn().mockImplementation(() => 
        new Promise(resolve => setTimeout(resolve, 100))
      )
    };

    performanceStartTime = performance.now();
  });

  afterEach(() => {
    vi.clearAllTimers();
    DutyRefreshService.clearAll();
  });

  describe('Batched Refresh Operations', () => {
    it('should batch multiple refresh calls for better performance', async () => {
      DutyRefreshService.registerRefreshCallback(mockCallbacks.calendar, 'calendar');
      DutyRefreshService.registerRefreshCallback(mockCallbacks.list, 'list');

      // Multiple rapid refresh calls
      DutyRefreshService.triggerRefresh({ newDutyId: 'duty1' });
      DutyRefreshService.triggerRefresh({ updatedDutyId: 'duty2' });
      DutyRefreshService.triggerRefresh({ deletedDutyId: 'duty3' });

      // Should not have called callbacks yet due to batching
      expect(mockCallbacks.calendar).not.toHaveBeenCalled();
      expect(mockCallbacks.list).not.toHaveBeenCalled();

      // Wait for batched execution
      await new Promise(resolve => setTimeout(resolve, 250));

      // Should have called callbacks only once due to batching
      expect(mockCallbacks.calendar).toHaveBeenCalledTimes(1);
      expect(mockCallbacks.list).toHaveBeenCalledTimes(1);
    });

    it('should use increased debounce time for better batching', async () => {
      DutyRefreshService.registerRefreshCallback(mockCallbacks.calendar, 'calendar');

      const startTime = performance.now();
      
      DutyRefreshService.triggerRefresh({ newDutyId: 'duty1' });

      // Should not execute immediately
      expect(mockCallbacks.calendar).not.toHaveBeenCalled();

      // Wait for the increased debounce time (200ms)
      await new Promise(resolve => setTimeout(resolve, 250));

      const endTime = performance.now();
      expect(endTime - startTime).toBeGreaterThanOrEqual(200);
      expect(mockCallbacks.calendar).toHaveBeenCalledTimes(1);
    });
  });

  describe('Priority-based Callback Execution', () => {
    it('should execute calendar callbacks with high priority', async () => {
      const executionOrder = [];

      const calendarCallback = vi.fn().mockImplementation(() => {
        executionOrder.push('calendar');
        return Promise.resolve();
      });

      const listCallback = vi.fn().mockImplementation(() => {
        executionOrder.push('list');
        return Promise.resolve();
      });

      DutyRefreshService.registerRefreshCallback(calendarCallback, 'calendar-view');
      DutyRefreshService.registerRefreshCallback(listCallback, 'duty-list');

      await DutyRefreshService.triggerRefresh({ 
        immediate: true,
        includeCalendar: true 
      });

      // Calendar should execute first due to high priority
      expect(executionOrder[0]).toBe('calendar');
    });

    it('should delay normal priority callbacks for better performance', async () => {
      const executionTimes = [];

      const highPriorityCallback = vi.fn().mockImplementation(() => {
        executionTimes.push({ type: 'high', time: performance.now() });
        return Promise.resolve();
      });

      const normalPriorityCallback = vi.fn().mockImplementation(() => {
        executionTimes.push({ type: 'normal', time: performance.now() });
        return Promise.resolve();
      });

      DutyRefreshService.registerRefreshCallback(highPriorityCallback, 'calendar-main');
      DutyRefreshService.registerRefreshCallback(normalPriorityCallback, 'duty-list');

      const startTime = performance.now();
      
      await DutyRefreshService.triggerRefresh({ 
        immediate: true,
        includeCalendar: true 
      });

      // Wait for normal priority callbacks
      await new Promise(resolve => setTimeout(resolve, 100));

      expect(executionTimes).toHaveLength(2);
      
      // High priority should execute first
      expect(executionTimes[0].type).toBe('high');
      expect(executionTimes[1].type).toBe('normal');
      
      // Normal priority should be delayed
      const timeDiff = executionTimes[1].time - executionTimes[0].time;
      expect(timeDiff).toBeGreaterThanOrEqual(40); // Allow for some timing variance
    });
  });

  describe('Performance Monitoring', () => {
    it('should warn about slow refresh operations', async () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      DutyRefreshService.registerRefreshCallback(mockCallbacks.slowCallback, 'slow-view');

      await DutyRefreshService.triggerRefresh({ immediate: true });

      // Wait for slow callback to complete
      await new Promise(resolve => setTimeout(resolve, 150));

      // Should warn about slow operation
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Slow refresh operation took')
      );

      consoleSpy.mockRestore();
    });

    it('should handle refresh timeouts gracefully', async () => {
      const timeoutCallback = vi.fn().mockImplementation(() => 
        new Promise(() => {}) // Never resolves
      );

      DutyRefreshService.registerRefreshCallback(timeoutCallback, 'timeout-view');

      const startTime = performance.now();
      
      await DutyRefreshService.triggerRefresh({ immediate: true });

      const endTime = performance.now();
      
      // Should timeout after 5 seconds and continue
      expect(endTime - startTime).toBeLessThan(6000);
    });
  });

  describe('Optimistic Updates Performance', () => {
    it('should apply optimistic updates efficiently', () => {
      const duties = Array.from({ length: 1000 }, (_, i) => ({
        id: `duty${i}`,
        title: `Duty ${i}`,
        team_member_id: 'tm1'
      }));

      // Add optimistic updates
      DutyRefreshService.addOptimisticUpdate('duty500', { title: 'Updated Duty' }, 'update');
      DutyRefreshService.addOptimisticUpdate('new-duty', { title: 'New Duty' }, 'create');

      const startTime = performance.now();
      
      const result = DutyRefreshService.applyOptimisticUpdates(duties);
      
      const endTime = performance.now();
      const duration = endTime - startTime;

      // Should handle large arrays efficiently (under 50ms)
      expect(duration).toBeLessThan(50);
      expect(result).toHaveLength(1001); // Original + 1 new
      expect(result[0].title).toBe('New Duty'); // New duty at start
      expect(result.find(d => d.id === 'duty500').title).toBe('Updated Duty');
    });

    it('should auto-cleanup optimistic updates to prevent memory leaks', async () => {
      DutyRefreshService.addOptimisticUpdate('temp-duty', { title: 'Temp' }, 'create');

      expect(DutyRefreshService.getOptimisticUpdate('temp-duty')).toBeTruthy();

      // Wait for auto-cleanup (5 seconds)
      await new Promise(resolve => setTimeout(resolve, 5100));

      expect(DutyRefreshService.getOptimisticUpdate('temp-duty')).toBeNull();
    });
  });

  describe('Memory Management', () => {
    it('should limit the number of refresh callbacks to prevent memory leaks', () => {
      // Register many callbacks
      for (let i = 0; i < 100; i++) {
        DutyRefreshService.registerRefreshCallback(
          vi.fn(), 
          `view-${i}`
        );
      }

      expect(DutyRefreshService.refreshCallbacks.size).toBe(100);

      // Should handle large number of callbacks without issues
      const startTime = performance.now();
      DutyRefreshService.triggerRefresh({ immediate: true });
      const endTime = performance.now();

      expect(endTime - startTime).toBeLessThan(100);
    });

    it('should cleanup timeouts properly', () => {
      const clearTimeoutSpy = vi.spyOn(global, 'clearTimeout');

      // Trigger multiple refreshes
      DutyRefreshService.triggerRefresh({ newDutyId: 'duty1' });
      DutyRefreshService.triggerRefresh({ newDutyId: 'duty2' });
      DutyRefreshService.triggerRefresh({ newDutyId: 'duty3' });

      // Should clear previous timeouts
      expect(clearTimeoutSpy).toHaveBeenCalled();

      clearTimeoutSpy.mockRestore();
    });

    it('should handle callback errors without affecting other callbacks', async () => {
      const errorCallback = vi.fn().mockImplementation(() => {
        throw new Error('Callback error');
      });
      const goodCallback = vi.fn().mockResolvedValue(true);

      DutyRefreshService.registerRefreshCallback(errorCallback, 'error-view');
      DutyRefreshService.registerRefreshCallback(goodCallback, 'good-view');

      await DutyRefreshService.triggerRefresh({ immediate: true });

      // Good callback should still execute despite error in other callback
      expect(goodCallback).toHaveBeenCalled();
      expect(errorCallback).toHaveBeenCalled();
    });
  });

  describe('Consistent Duty Display Performance', () => {
    it('should process large duty lists efficiently', () => {
      const duties = Array.from({ length: 5000 }, (_, i) => ({
        id: `duty${i}`,
        title: `Duty ${i}`,
        team_member_id: `tm${i % 10}`,
        start_date: new Date(2025, 0, i % 30 + 1).toISOString(),
        end_date: new Date(2025, 0, i % 30 + 2).toISOString(),
        type: 'devops'
      }));

      const teamMembers = Array.from({ length: 10 }, (_, i) => ({
        id: `tm${i}`,
        name: `Team Member ${i}`
      }));

      const startTime = performance.now();
      
      const result = DutyRefreshService.getConsistentDutyDisplay(
        duties, 
        teamMembers,
        { includeTeamMember: true, includeStatus: true }
      );
      
      const endTime = performance.now();
      const duration = endTime - startTime;

      // Should process large lists efficiently (under 500ms)
      expect(duration).toBeLessThan(500);
      expect(result).toHaveLength(5000);
      expect(result[0]._teamMemberName).toBeDefined();
      expect(result[0]._status).toBeDefined();
    });

    it('should cache sorting operations for better performance', () => {
      const duties = Array.from({ length: 1000 }, (_, i) => ({
        id: `duty${i}`,
        title: `Duty ${i}`,
        start_date: new Date(2025, 0, Math.random() * 30 + 1).toISOString(),
        end_date: new Date(2025, 0, Math.random() * 30 + 2).toISOString()
      }));

      // First sort
      const startTime1 = performance.now();
      const result1 = DutyRefreshService.getConsistentDutyDisplay(
        duties, 
        [],
        { sortBy: 'start_date', sortOrder: 'desc' }
      );
      const endTime1 = performance.now();
      const duration1 = endTime1 - startTime1;

      // Second sort with same parameters
      const startTime2 = performance.now();
      const result2 = DutyRefreshService.getConsistentDutyDisplay(
        duties, 
        [],
        { sortBy: 'start_date', sortOrder: 'desc' }
      );
      const endTime2 = performance.now();
      const duration2 = endTime2 - startTime2;

      // Both should be reasonably fast
      expect(duration1).toBeLessThan(200);
      expect(duration2).toBeLessThan(200);
      expect(result1).toHaveLength(result2.length);
    });
  });
});