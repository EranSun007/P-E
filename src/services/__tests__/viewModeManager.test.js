/**
 * Unit tests for ViewModeManager service
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import ViewModeManager, { viewModeManager } from '../viewModeManager.js';

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn()
};

// Replace global localStorage with mock
Object.defineProperty(window, 'localStorage', {
  value: localStorageMock
});

describe('ViewModeManager', () => {
  let manager;

  beforeEach(() => {
    // Reset localStorage mock
    localStorageMock.getItem.mockClear();
    localStorageMock.setItem.mockClear();
    localStorageMock.removeItem.mockClear();
    localStorageMock.clear.mockClear();
    
    // Create fresh instance for each test
    manager = new ViewModeManager();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Constants and Initialization', () => {
    it('should have correct view mode constants', () => {
      expect(ViewModeManager.VIEW_MODES).toEqual({
        MEETINGS: 'meetings',
        OUT_OF_OFFICE: 'out_of_office',
        DUTIES: 'duties',
        BIRTHDAYS: 'birthdays',
        ALL_EVENTS: 'all_events'
      });
    });

    it('should have correct default view mode', () => {
      expect(ViewModeManager.DEFAULT_VIEW_MODE).toBe('all_events');
    });

    it('should initialize with default view mode when no saved preference', () => {
      localStorageMock.getItem.mockReturnValue(null);
      const newManager = new ViewModeManager();
      expect(newManager.getCurrentViewMode()).toBe(ViewModeManager.DEFAULT_VIEW_MODE);
    });

    it('should initialize with saved preference when available', () => {
      localStorageMock.getItem.mockReturnValue('meetings');
      const newManager = new ViewModeManager();
      expect(newManager.getCurrentViewMode()).toBe('meetings');
    });

    it('should fallback to default when saved preference is invalid', () => {
      localStorageMock.getItem.mockReturnValue('invalid_mode');
      const newManager = new ViewModeManager();
      expect(newManager.getCurrentViewMode()).toBe(ViewModeManager.DEFAULT_VIEW_MODE);
    });
  });

  describe('View Mode Management', () => {
    it('should get current view mode', () => {
      expect(manager.getCurrentViewMode()).toBe(ViewModeManager.DEFAULT_VIEW_MODE);
    });

    it('should set valid view mode', () => {
      manager.setViewMode(ViewModeManager.VIEW_MODES.MEETINGS);
      expect(manager.getCurrentViewMode()).toBe(ViewModeManager.VIEW_MODES.MEETINGS);
    });

    it('should throw error for invalid view mode', () => {
      expect(() => {
        manager.setViewMode('invalid_mode');
      }).toThrow('Invalid view mode: invalid_mode');
    });

    it('should validate view modes correctly', () => {
      expect(manager.isValidViewMode('meetings')).toBe(true);
      expect(manager.isValidViewMode('out_of_office')).toBe(true);
      expect(manager.isValidViewMode('duties')).toBe(true);
      expect(manager.isValidViewMode('birthdays')).toBe(true);
      expect(manager.isValidViewMode('all_events')).toBe(true);
      expect(manager.isValidViewMode('invalid')).toBe(false);
      expect(manager.isValidViewMode('')).toBe(false);
      expect(manager.isValidViewMode(null)).toBe(false);
    });
  });

  describe('Event Filtering', () => {
    const mockEvents = [
      { id: '1', event_type: 'meeting', title: 'Team Meeting' },
      { id: '2', event_type: 'one_on_one', title: '1:1 with John' },
      { id: '3', event_type: 'out_of_office', title: 'John OOO' },
      { id: '4', event_type: 'duty', title: 'DevOps Duty' },
      { id: '5', event_type: 'birthday', title: 'Jane Birthday' },
      { id: '6', event_type: 'other', title: 'Other Event' }
    ];

    it('should filter meeting events correctly', () => {
      const filtered = manager.filterEventsForView(mockEvents, ViewModeManager.VIEW_MODES.MEETINGS);
      expect(filtered).toHaveLength(2);
      expect(filtered.map(e => e.id)).toEqual(['1', '2']);
    });

    it('should filter out-of-office events correctly', () => {
      const filtered = manager.filterEventsForView(mockEvents, ViewModeManager.VIEW_MODES.OUT_OF_OFFICE);
      expect(filtered).toHaveLength(1);
      expect(filtered[0].id).toBe('3');
    });

    it('should filter duty events correctly', () => {
      const filtered = manager.filterEventsForView(mockEvents, ViewModeManager.VIEW_MODES.DUTIES);
      expect(filtered).toHaveLength(1);
      expect(filtered[0].id).toBe('4');
    });

    it('should filter birthday events correctly', () => {
      const filtered = manager.filterEventsForView(mockEvents, ViewModeManager.VIEW_MODES.BIRTHDAYS);
      expect(filtered).toHaveLength(1);
      expect(filtered[0].id).toBe('5');
    });

    it('should return all events for all_events view', () => {
      const filtered = manager.filterEventsForView(mockEvents, ViewModeManager.VIEW_MODES.ALL_EVENTS);
      expect(filtered).toHaveLength(6);
      expect(filtered).toEqual(mockEvents);
    });

    it('should filter events for current view mode', () => {
      manager.setViewMode(ViewModeManager.VIEW_MODES.MEETINGS);
      const filtered = manager.filterEventsForCurrentView(mockEvents);
      expect(filtered).toHaveLength(2);
      expect(filtered.map(e => e.id)).toEqual(['1', '2']);
    });

    it('should handle empty events array', () => {
      const filtered = manager.filterEventsForView([], ViewModeManager.VIEW_MODES.MEETINGS);
      expect(filtered).toEqual([]);
    });

    it('should handle non-array events parameter', () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const filtered = manager.filterEventsForView(null, ViewModeManager.VIEW_MODES.MEETINGS);
      expect(filtered).toEqual([]);
      expect(consoleSpy).toHaveBeenCalledWith('ViewModeManager: events parameter is not an array, returning empty array');
      consoleSpy.mockRestore();
    });

    it('should throw error for invalid view mode in filtering', () => {
      expect(() => {
        manager.filterEventsForView(mockEvents, 'invalid_mode');
      }).toThrow('Invalid view mode: invalid_mode');
    });
  });

  describe('Event Counts', () => {
    const mockEvents = [
      { id: '1', event_type: 'meeting', title: 'Team Meeting' },
      { id: '2', event_type: 'one_on_one', title: '1:1 with John' },
      { id: '3', event_type: 'out_of_office', title: 'John OOO' },
      { id: '4', event_type: 'duty', title: 'DevOps Duty' },
      { id: '5', event_type: 'birthday', title: 'Jane Birthday' },
      { id: '6', event_type: 'other', title: 'Other Event' }
    ];

    it('should calculate event counts correctly', () => {
      const counts = manager.getEventCounts(mockEvents);
      expect(counts).toEqual({
        meetings: 2,
        out_of_office: 1,
        duties: 1,
        birthdays: 1,
        all_events: 6
      });
    });

    it('should handle empty events array for counts', () => {
      const counts = manager.getEventCounts([]);
      expect(counts).toEqual({
        meetings: 0,
        out_of_office: 0,
        duties: 0,
        birthdays: 0,
        all_events: 0
      });
    });

    it('should handle non-array events parameter for counts', () => {
      const counts = manager.getEventCounts(null);
      expect(counts).toEqual({
        meetings: 0,
        out_of_office: 0,
        duties: 0,
        birthdays: 0,
        all_events: 0
      });
    });
  });

  describe('Persistence', () => {
    it('should save view preference to localStorage', () => {
      manager.saveViewPreference('meetings');
      expect(localStorageMock.setItem).toHaveBeenCalledWith('calendar_view_mode_preference', 'meetings');
    });

    it('should load view preference from localStorage', () => {
      localStorageMock.getItem.mockReturnValue('duties');
      const preference = manager.loadViewPreference();
      expect(preference).toBe('duties');
      expect(localStorageMock.getItem).toHaveBeenCalledWith('calendar_view_mode_preference');
    });

    it('should return default when no saved preference', () => {
      localStorageMock.getItem.mockReturnValue(null);
      const preference = manager.loadViewPreference();
      expect(preference).toBe(ViewModeManager.DEFAULT_VIEW_MODE);
    });

    it('should return default when saved preference is invalid', () => {
      localStorageMock.getItem.mockReturnValue('invalid_mode');
      const preference = manager.loadViewPreference();
      expect(preference).toBe(ViewModeManager.DEFAULT_VIEW_MODE);
    });

    it('should handle localStorage errors gracefully when saving', () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      localStorageMock.setItem.mockImplementation(() => {
        throw new Error('localStorage error');
      });
      
      expect(() => manager.saveViewPreference('meetings')).not.toThrow();
      expect(consoleSpy).toHaveBeenCalledWith('ViewModeManager: Failed to save view preference to localStorage:', expect.any(Error));
      consoleSpy.mockRestore();
    });

    it('should handle localStorage errors gracefully when loading', () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      localStorageMock.getItem.mockImplementation(() => {
        throw new Error('localStorage error');
      });
      
      const preference = manager.loadViewPreference();
      expect(preference).toBe(ViewModeManager.DEFAULT_VIEW_MODE);
      expect(consoleSpy).toHaveBeenCalledWith('ViewModeManager: Failed to load view preference from localStorage:', expect.any(Error));
      consoleSpy.mockRestore();
    });

    it('should clear view preference', () => {
      manager.clearViewPreference();
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('calendar_view_mode_preference');
      expect(manager.getCurrentViewMode()).toBe(ViewModeManager.DEFAULT_VIEW_MODE);
    });

    it('should handle localStorage errors gracefully when clearing', () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      localStorageMock.removeItem.mockImplementation(() => {
        throw new Error('localStorage error');
      });
      
      expect(() => manager.clearViewPreference()).not.toThrow();
      expect(consoleSpy).toHaveBeenCalledWith('ViewModeManager: Failed to clear view preference from localStorage:', expect.any(Error));
      consoleSpy.mockRestore();
    });

    it('should persist view mode when setting', () => {
      manager.setViewMode('meetings');
      expect(localStorageMock.setItem).toHaveBeenCalledWith('calendar_view_mode_preference', 'meetings');
    });
  });

  describe('Event Listeners', () => {
    it('should add and notify view mode change listeners', () => {
      const listener = vi.fn();
      const unsubscribe = manager.addViewModeChangeListener(listener);
      
      manager.setViewMode('meetings');
      expect(listener).toHaveBeenCalledWith('meetings', 'all_events');
      
      // Test unsubscribe
      unsubscribe();
      manager.setViewMode('duties');
      expect(listener).toHaveBeenCalledTimes(1); // Should not be called again
    });

    it('should handle multiple listeners', () => {
      const listener1 = vi.fn();
      const listener2 = vi.fn();
      
      manager.addViewModeChangeListener(listener1);
      manager.addViewModeChangeListener(listener2);
      
      manager.setViewMode('meetings');
      
      expect(listener1).toHaveBeenCalledWith('meetings', 'all_events');
      expect(listener2).toHaveBeenCalledWith('meetings', 'all_events');
    });

    it('should handle listener errors gracefully', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const errorListener = vi.fn(() => {
        throw new Error('Listener error');
      });
      const goodListener = vi.fn();
      
      manager.addViewModeChangeListener(errorListener);
      manager.addViewModeChangeListener(goodListener);
      
      manager.setViewMode('meetings');
      
      expect(errorListener).toHaveBeenCalled();
      expect(goodListener).toHaveBeenCalled();
      expect(consoleSpy).toHaveBeenCalledWith('ViewModeManager: Error in view mode change listener:', expect.any(Error));
      consoleSpy.mockRestore();
    });

    it('should throw error for non-function listener', () => {
      expect(() => {
        manager.addViewModeChangeListener('not a function');
      }).toThrow('Listener must be a function');
    });
  });

  describe('Available View Modes', () => {
    it('should return correct available view modes', () => {
      const viewModes = manager.getAvailableViewModes();
      expect(viewModes).toHaveLength(5);
      
      const expectedModes = [
        { id: 'meetings', label: 'Meetings', description: 'View all scheduled meetings and one-on-ones', icon: 'calendar' },
        { id: 'out_of_office', label: 'Out of Office', description: 'View team member out-of-office periods', icon: 'user-x' },
        { id: 'duties', label: 'Duties', description: 'View team member duty assignments', icon: 'shield' },
        { id: 'birthdays', label: 'Birthdays', description: 'View team member birthdays', icon: 'cake' },
        { id: 'all_events', label: 'All Events', description: 'View all calendar events combined', icon: 'calendar-days' }
      ];
      
      expect(viewModes).toEqual(expectedModes);
    });
  });

  describe('Singleton Instance', () => {
    it('should export singleton instance', () => {
      expect(viewModeManager).toBeInstanceOf(ViewModeManager);
    });

    it('should maintain state across singleton usage', () => {
      viewModeManager.setViewMode('meetings');
      expect(viewModeManager.getCurrentViewMode()).toBe('meetings');
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle events with missing event_type', () => {
      const eventsWithMissingType = [
        { id: '1', title: 'Event without type' },
        { id: '2', event_type: 'meeting', title: 'Normal meeting' }
      ];
      
      const filtered = manager.filterEventsForView(eventsWithMissingType, ViewModeManager.VIEW_MODES.MEETINGS);
      expect(filtered).toHaveLength(1);
      expect(filtered[0].id).toBe('2');
    });

    it('should handle events with null or undefined event_type', () => {
      const eventsWithNullType = [
        { id: '1', event_type: null, title: 'Event with null type' },
        { id: '2', event_type: undefined, title: 'Event with undefined type' },
        { id: '3', event_type: 'meeting', title: 'Normal meeting' }
      ];
      
      const filtered = manager.filterEventsForView(eventsWithNullType, ViewModeManager.VIEW_MODES.MEETINGS);
      expect(filtered).toHaveLength(1);
      expect(filtered[0].id).toBe('3');
    });

    it('should handle unknown view mode gracefully in filtering', () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      
      // Temporarily add an unknown mode to test the default case
      const originalIsValid = manager.isValidViewMode;
      manager.isValidViewMode = vi.fn().mockReturnValue(true);
      
      const mockEvents = [{ id: '1', event_type: 'meeting' }];
      const filtered = manager.filterEventsForView(mockEvents, 'unknown_mode');
      
      expect(filtered).toEqual(mockEvents);
      expect(consoleSpy).toHaveBeenCalledWith('ViewModeManager: Unknown view mode unknown_mode, returning all events');
      
      // Restore original method
      manager.isValidViewMode = originalIsValid;
      consoleSpy.mockRestore();
    });
  });
});