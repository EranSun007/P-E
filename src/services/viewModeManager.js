/**
 * ViewModeManager - Service for managing calendar view modes and event filtering
 * 
 * This service provides centralized management for calendar view modes including:
 * - View mode constants and state management
 * - Event filtering logic for each view mode
 * - View mode persistence using localStorage
 * - Event type classification and filtering
 */

export class ViewModeManager {
  // View mode constants
  static VIEW_MODES = {
    MEETINGS: 'meetings',
    OUT_OF_OFFICE: 'out_of_office',
    DUTIES: 'duties',
    BIRTHDAYS: 'birthdays',
    ALL_EVENTS: 'all_events'
  };

  // Local storage key for view mode persistence
  static STORAGE_KEY = 'calendar_view_mode_preference';

  // Default view mode
  static DEFAULT_VIEW_MODE = ViewModeManager.VIEW_MODES.ALL_EVENTS;

  /**
   * Current view mode state
   * @private
   */
  #currentViewMode = ViewModeManager.DEFAULT_VIEW_MODE;

  /**
   * Event listeners for view mode changes
   * @private
   */
  #listeners = [];

  constructor() {
    // Load saved view mode preference on initialization
    this.#currentViewMode = this.loadViewPreference();
  }

  /**
   * Get the current view mode
   * @returns {string} Current view mode
   */
  getCurrentViewMode() {
    return this.#currentViewMode;
  }

  /**
   * Set the current view mode
   * @param {string} mode - View mode to set
   * @throws {Error} If invalid view mode is provided
   */
  setViewMode(mode) {
    if (!this.isValidViewMode(mode)) {
      throw new Error(`Invalid view mode: ${mode}. Valid modes are: ${Object.values(ViewModeManager.VIEW_MODES).join(', ')}`);
    }

    const previousMode = this.#currentViewMode;
    this.#currentViewMode = mode;
    
    // Persist the preference
    this.saveViewPreference(mode);
    
    // Notify listeners of the change
    this.#notifyListeners(mode, previousMode);
  }

  /**
   * Check if a view mode is valid
   * @param {string} mode - View mode to validate
   * @returns {boolean} True if valid, false otherwise
   */
  isValidViewMode(mode) {
    return Object.values(ViewModeManager.VIEW_MODES).includes(mode);
  }

  /**
   * Filter events based on the current view mode
   * @param {Array} events - Array of calendar events to filter
   * @returns {Array} Filtered events based on current view mode
   */
  filterEventsForCurrentView(events) {
    return this.filterEventsForView(events, this.#currentViewMode);
  }

  /**
   * Filter events for a specific view mode
   * @param {Array} events - Array of calendar events to filter
   * @param {string} viewMode - View mode to filter for
   * @returns {Array} Filtered events
   * @throws {Error} If invalid view mode is provided
   */
  filterEventsForView(events, viewMode) {
    if (!this.isValidViewMode(viewMode)) {
      throw new Error(`Invalid view mode: ${viewMode}`);
    }

    if (!Array.isArray(events)) {
      console.warn('ViewModeManager: events parameter is not an array, returning empty array');
      return [];
    }

    switch (viewMode) {
      case ViewModeManager.VIEW_MODES.MEETINGS:
        return this.#filterMeetingEvents(events);
      
      case ViewModeManager.VIEW_MODES.OUT_OF_OFFICE:
        return this.#filterOutOfOfficeEvents(events);
      
      case ViewModeManager.VIEW_MODES.DUTIES:
        return this.#filterDutyEvents(events);
      
      case ViewModeManager.VIEW_MODES.BIRTHDAYS:
        return this.#filterBirthdayEvents(events);
      
      case ViewModeManager.VIEW_MODES.ALL_EVENTS:
        return this.#filterAllEvents(events);
      
      default:
        console.warn(`ViewModeManager: Unknown view mode ${viewMode}, returning all events`);
        return events;
    }
  }

  /**
   * Get event count for each view mode
   * @param {Array} events - Array of calendar events
   * @returns {Object} Object with event counts for each view mode
   */
  getEventCounts(events) {
    if (!Array.isArray(events)) {
      return this.#getEmptyEventCounts();
    }

    return {
      [ViewModeManager.VIEW_MODES.MEETINGS]: this.#filterMeetingEvents(events).length,
      [ViewModeManager.VIEW_MODES.OUT_OF_OFFICE]: this.#filterOutOfOfficeEvents(events).length,
      [ViewModeManager.VIEW_MODES.DUTIES]: this.#filterDutyEvents(events).length,
      [ViewModeManager.VIEW_MODES.BIRTHDAYS]: this.#filterBirthdayEvents(events).length,
      [ViewModeManager.VIEW_MODES.ALL_EVENTS]: this.#filterAllEvents(events).length
    };
  }

  /**
   * Save view mode preference to localStorage
   * @param {string} mode - View mode to save
   */
  saveViewPreference(mode) {
    try {
      localStorage.setItem(ViewModeManager.STORAGE_KEY, mode);
    } catch (error) {
      console.warn('ViewModeManager: Failed to save view preference to localStorage:', error);
    }
  }

  /**
   * Load view mode preference from localStorage
   * @returns {string} Saved view mode or default if none found
   */
  loadViewPreference() {
    try {
      const savedMode = localStorage.getItem(ViewModeManager.STORAGE_KEY);
      if (savedMode && this.isValidViewMode(savedMode)) {
        return savedMode;
      }
    } catch (error) {
      console.warn('ViewModeManager: Failed to load view preference from localStorage:', error);
    }
    
    return ViewModeManager.DEFAULT_VIEW_MODE;
  }

  /**
   * Clear saved view mode preference
   */
  clearViewPreference() {
    try {
      localStorage.removeItem(ViewModeManager.STORAGE_KEY);
      this.#currentViewMode = ViewModeManager.DEFAULT_VIEW_MODE;
    } catch (error) {
      console.warn('ViewModeManager: Failed to clear view preference from localStorage:', error);
    }
  }

  /**
   * Add event listener for view mode changes
   * @param {Function} listener - Callback function to call on view mode change
   * @returns {Function} Unsubscribe function
   */
  addViewModeChangeListener(listener) {
    if (typeof listener !== 'function') {
      throw new Error('Listener must be a function');
    }

    this.#listeners.push(listener);

    // Return unsubscribe function
    return () => {
      const index = this.#listeners.indexOf(listener);
      if (index > -1) {
        this.#listeners.splice(index, 1);
      }
    };
  }

  /**
   * Get all available view modes with display information
   * @returns {Array} Array of view mode objects with id, label, and description
   */
  getAvailableViewModes() {
    return [
      {
        id: ViewModeManager.VIEW_MODES.MEETINGS,
        label: 'Meetings',
        description: 'View all scheduled meetings and one-on-ones',
        icon: 'calendar'
      },
      {
        id: ViewModeManager.VIEW_MODES.OUT_OF_OFFICE,
        label: 'Out of Office',
        description: 'View team member out-of-office periods',
        icon: 'user-x'
      },
      {
        id: ViewModeManager.VIEW_MODES.DUTIES,
        label: 'Duties',
        description: 'View team member duty assignments',
        icon: 'shield'
      },
      {
        id: ViewModeManager.VIEW_MODES.BIRTHDAYS,
        label: 'Birthdays',
        description: 'View team member birthdays',
        icon: 'cake'
      },
      {
        id: ViewModeManager.VIEW_MODES.ALL_EVENTS,
        label: 'All Events',
        description: 'View all calendar events combined',
        icon: 'calendar-days'
      }
    ];
  }

  // Private filtering methods

  /**
   * Filter events for meetings view
   * @private
   * @param {Array} events - Events to filter
   * @returns {Array} Meeting events
   */
  #filterMeetingEvents(events) {
    return events.filter(event => 
      event.event_type === 'meeting' || 
      event.event_type === 'one_on_one'
    );
  }

  /**
   * Filter events for out-of-office view
   * @private
   * @param {Array} events - Events to filter
   * @returns {Array} Out-of-office events
   */
  #filterOutOfOfficeEvents(events) {
    return events.filter(event => 
      event.event_type === 'out_of_office'
    );
  }

  /**
   * Filter events for duties view
   * @private
   * @param {Array} events - Events to filter
   * @returns {Array} Duty events
   */
  #filterDutyEvents(events) {
    return events.filter(event => 
      event.event_type === 'duty'
    );
  }

  /**
   * Filter events for birthdays view
   * @private
   * @param {Array} events - Events to filter
   * @returns {Array} Birthday events
   */
  #filterBirthdayEvents(events) {
    return events.filter(event => 
      event.event_type === 'birthday'
    );
  }

  /**
   * Filter events for all events view (no filtering)
   * @private
   * @param {Array} events - Events to filter
   * @returns {Array} All events
   */
  #filterAllEvents(events) {
    return events; // No filtering for all events view
  }

  /**
   * Get empty event counts object
   * @private
   * @returns {Object} Object with all counts set to 0
   */
  #getEmptyEventCounts() {
    return {
      [ViewModeManager.VIEW_MODES.MEETINGS]: 0,
      [ViewModeManager.VIEW_MODES.OUT_OF_OFFICE]: 0,
      [ViewModeManager.VIEW_MODES.DUTIES]: 0,
      [ViewModeManager.VIEW_MODES.BIRTHDAYS]: 0,
      [ViewModeManager.VIEW_MODES.ALL_EVENTS]: 0
    };
  }

  /**
   * Notify all listeners of view mode change
   * @private
   * @param {string} newMode - New view mode
   * @param {string} previousMode - Previous view mode
   */
  #notifyListeners(newMode, previousMode) {
    this.#listeners.forEach(listener => {
      try {
        listener(newMode, previousMode);
      } catch (error) {
        console.error('ViewModeManager: Error in view mode change listener:', error);
      }
    });
  }
}

// Export singleton instance for convenience
export const viewModeManager = new ViewModeManager();

// Export class for testing and custom instances
export default ViewModeManager;