// src/services/dutyRefreshService.js
// Service for managing duty list and calendar refresh mechanisms

import { Duty, CalendarEvent, TeamMember } from '../api/entities';
import { CalendarEventGenerationService } from './calendarEventGenerationService';

/**
 * Service for managing duty refresh operations across all views
 */
export class DutyRefreshService {
  static refreshCallbacks = new Set();
  static optimisticUpdates = new Map();
  static highlightedDuties = new Set();
  static refreshTimeouts = new Map();

  /**
   * Register a callback to be called when duties are refreshed
   * @param {Function} callback - Function to call on refresh
   * @param {string} viewId - Unique identifier for the view
   */
  static registerRefreshCallback(callback, viewId) {
    const callbackWithId = { callback, viewId };
    this.refreshCallbacks.add(callbackWithId);
    
    return () => {
      this.refreshCallbacks.delete(callbackWithId);
    };
  }

  /**
   * Trigger refresh across all registered views with optimized batching
   * @param {Object} options - Refresh options
   */
  static async triggerRefresh(options = {}) {
    const {
      immediate = false,
      includeCalendar = true,
      includeList = true,
      includeProfile = true,
      newDutyId = null,
      updatedDutyId = null,
      deletedDutyId = null
    } = options;

    // Clear any pending refresh timeouts for better batching
    this.refreshTimeouts.forEach(timeout => clearTimeout(timeout));
    this.refreshTimeouts.clear();

    const refreshData = {
      timestamp: Date.now(),
      newDutyId,
      updatedDutyId,
      deletedDutyId,
      includeCalendar,
      includeList,
      includeProfile
    };

    if (immediate) {
      await this._executeRefresh(refreshData);
    } else {
      // Increased debounce time for better performance batching
      const timeoutId = setTimeout(async () => {
        await this._executeRefresh(refreshData);
        this.refreshTimeouts.delete('main');
      }, 200);
      
      this.refreshTimeouts.set('main', timeoutId);
    }
  }

  /**
   * Execute the actual refresh operation with performance optimizations
   * @private
   */
  static async _executeRefresh(refreshData) {
    const promises = [];
    const startTime = performance.now();
    
    // Batch callbacks by priority for better performance
    const highPriorityCallbacks = [];
    const normalPriorityCallbacks = [];
    
    this.refreshCallbacks.forEach(({ callback, viewId }) => {
      try {
        // Calendar updates are high priority for user feedback
        if (viewId.includes('calendar') || refreshData.includeCalendar) {
          highPriorityCallbacks.push({ callback, viewId });
        } else {
          normalPriorityCallbacks.push({ callback, viewId });
        }
      } catch (error) {
        console.error(`Error categorizing refresh callback for view ${viewId}:`, error);
      }
    });

    // Execute high priority callbacks first
    for (const { callback, viewId } of highPriorityCallbacks) {
      try {
        const result = callback(refreshData);
        if (result && typeof result.then === 'function') {
          promises.push(result.catch(error => 
            console.error(`High priority refresh error for view ${viewId}:`, error)
          ));
        }
      } catch (error) {
        console.error(`Error in high priority refresh callback for view ${viewId}:`, error);
      }
    }

    // Execute normal priority callbacks with slight delay for better performance
    setTimeout(() => {
      for (const { callback, viewId } of normalPriorityCallbacks) {
        try {
          const result = callback(refreshData);
          if (result && typeof result.then === 'function') {
            promises.push(result.catch(error => 
              console.error(`Normal priority refresh error for view ${viewId}:`, error)
            ));
          }
        } catch (error) {
          console.error(`Error in normal priority refresh callback for view ${viewId}:`, error);
        }
      }
    }, 50);

    // Wait for all refresh operations to complete with timeout
    if (promises.length > 0) {
      try {
        await Promise.race([
          Promise.allSettled(promises),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Refresh timeout')), 5000)
          )
        ]);
      } catch (error) {
        console.error('Error during refresh operations:', error);
      }
    }

    const endTime = performance.now();
    if (endTime - startTime > 1000) {
      console.warn(`Slow refresh operation took ${endTime - startTime}ms`);
    }
  }

  /**
   * Add optimistic update for immediate UI feedback
   * @param {string} dutyId - ID of the duty being updated
   * @param {Object} optimisticData - Data to show optimistically
   * @param {string} operation - Type of operation ('create', 'update', 'delete')
   */
  static addOptimisticUpdate(dutyId, optimisticData, operation = 'update') {
    this.optimisticUpdates.set(dutyId, {
      data: optimisticData,
      operation,
      timestamp: Date.now()
    });

    // Auto-remove optimistic update after 5 seconds
    setTimeout(() => {
      this.optimisticUpdates.delete(dutyId);
    }, 5000);
  }

  /**
   * Remove optimistic update (usually after real data is loaded)
   * @param {string} dutyId - ID of the duty
   */
  static removeOptimisticUpdate(dutyId) {
    this.optimisticUpdates.delete(dutyId);
  }

  /**
   * Get optimistic update for a duty
   * @param {string} dutyId - ID of the duty
   * @returns {Object|null} Optimistic update data or null
   */
  static getOptimisticUpdate(dutyId) {
    return this.optimisticUpdates.get(dutyId) || null;
  }

  /**
   * Apply optimistic updates to a list of duties
   * @param {Array} duties - Original duties array
   * @returns {Array} Duties with optimistic updates applied
   */
  static applyOptimisticUpdates(duties) {
    const result = [...duties];
    
    this.optimisticUpdates.forEach((update, dutyId) => {
      const index = result.findIndex(d => d.id === dutyId);
      
      switch (update.operation) {
        case 'create':
          // Add new duty if not already in list
          if (index === -1) {
            result.unshift(update.data);
          }
          break;
          
        case 'update':
          // Update existing duty
          if (index !== -1) {
            result[index] = { ...result[index], ...update.data };
          }
          break;
          
        case 'delete':
          // Remove duty from list
          if (index !== -1) {
            result.splice(index, 1);
          }
          break;
      }
    });
    
    return result;
  }

  /**
   * Highlight a duty as newly created/updated
   * @param {string} dutyId - ID of the duty to highlight
   * @param {number} duration - Duration in milliseconds (default: 3000)
   */
  static highlightDuty(dutyId, duration = 3000) {
    this.highlightedDuties.add(dutyId);
    
    setTimeout(() => {
      this.highlightedDuties.delete(dutyId);
      // Trigger a refresh to remove highlighting
      this.triggerRefresh({ immediate: false });
    }, duration);
  }

  /**
   * Check if a duty should be highlighted
   * @param {string} dutyId - ID of the duty
   * @returns {boolean} True if duty should be highlighted
   */
  static isDutyHighlighted(dutyId) {
    return this.highlightedDuties.has(dutyId);
  }

  /**
   * Create a duty with immediate refresh and optimistic updates
   * @param {Object} dutyData - Duty data to create
   * @param {Object} options - Creation options
   * @returns {Promise<Object>} Created duty
   */
  static async createDutyWithRefresh(dutyData, options = {}) {
    const {
      showOptimistic = true,
      highlightNew = true,
      refreshViews = true
    } = options;

    // Generate temporary ID for optimistic update
    const tempId = `temp_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
    
    try {
      // Add optimistic update if requested
      if (showOptimistic) {
        const optimisticDuty = {
          ...dutyData,
          id: tempId,
          created_date: new Date().toISOString(),
          updated_date: new Date().toISOString(),
          _isOptimistic: true
        };
        
        this.addOptimisticUpdate(tempId, optimisticDuty, 'create');
        
        // Trigger immediate optimistic refresh
        if (refreshViews) {
          await this.triggerRefresh({ 
            immediate: true, 
            newDutyId: tempId 
          });
        }
      }

      // Create the actual duty
      const createdDuty = await Duty.create(dutyData);
      
      // Remove optimistic update
      this.removeOptimisticUpdate(tempId);
      
      // Highlight the new duty
      if (highlightNew) {
        this.highlightDuty(createdDuty.id);
      }
      
      // Trigger refresh with real data
      if (refreshViews) {
        await this.triggerRefresh({ 
          immediate: true, 
          newDutyId: createdDuty.id,
          includeCalendar: true 
        });
      }
      
      return createdDuty;
      
    } catch (error) {
      // Remove optimistic update on error
      this.removeOptimisticUpdate(tempId);
      
      // Trigger refresh to remove optimistic data
      if (refreshViews) {
        await this.triggerRefresh({ immediate: true });
      }
      
      throw error;
    }
  }

  /**
   * Update a duty with immediate refresh and optimistic updates
   * @param {string} dutyId - ID of the duty to update
   * @param {Object} updates - Updates to apply
   * @param {Object} options - Update options
   * @returns {Promise<Object>} Updated duty
   */
  static async updateDutyWithRefresh(dutyId, updates, options = {}) {
    const {
      showOptimistic = true,
      highlightUpdated = true,
      refreshViews = true
    } = options;

    // Get current duty for rollback
    const currentDuty = await Duty.get(dutyId);
    if (!currentDuty) {
      throw new Error('Duty not found');
    }

    try {
      // Add optimistic update if requested
      if (showOptimistic) {
        const optimisticDuty = {
          ...currentDuty,
          ...updates,
          updated_date: new Date().toISOString(),
          _isOptimistic: true
        };
        
        this.addOptimisticUpdate(dutyId, optimisticDuty, 'update');
        
        // Trigger immediate optimistic refresh
        if (refreshViews) {
          await this.triggerRefresh({ 
            immediate: true, 
            updatedDutyId: dutyId 
          });
        }
      }

      // Update the actual duty
      const updatedDuty = await Duty.update(dutyId, updates);
      
      // Remove optimistic update
      this.removeOptimisticUpdate(dutyId);
      
      // Highlight the updated duty
      if (highlightUpdated) {
        this.highlightDuty(dutyId);
      }
      
      // Trigger refresh with real data
      if (refreshViews) {
        await this.triggerRefresh({ 
          immediate: true, 
          updatedDutyId: dutyId,
          includeCalendar: true 
        });
      }
      
      return updatedDuty;
      
    } catch (error) {
      // Remove optimistic update and rollback on error
      this.removeOptimisticUpdate(dutyId);
      
      // Trigger refresh to restore original data
      if (refreshViews) {
        await this.triggerRefresh({ immediate: true });
      }
      
      throw error;
    }
  }

  /**
   * Delete a duty with immediate refresh and optimistic updates
   * @param {string} dutyId - ID of the duty to delete
   * @param {Object} options - Delete options
   * @returns {Promise<boolean>} Success status
   */
  static async deleteDutyWithRefresh(dutyId, options = {}) {
    const {
      showOptimistic = true,
      refreshViews = true
    } = options;

    // Get current duty for rollback
    const currentDuty = await Duty.get(dutyId);
    if (!currentDuty) {
      throw new Error('Duty not found');
    }

    try {
      // Add optimistic update if requested
      if (showOptimistic) {
        this.addOptimisticUpdate(dutyId, currentDuty, 'delete');
        
        // Trigger immediate optimistic refresh
        if (refreshViews) {
          await this.triggerRefresh({ 
            immediate: true, 
            deletedDutyId: dutyId 
          });
        }
      }

      // Delete the actual duty
      const result = await Duty.delete(dutyId);
      
      // Remove optimistic update
      this.removeOptimisticUpdate(dutyId);
      
      // Remove any highlighting
      this.highlightedDuties.delete(dutyId);
      
      // Trigger refresh with real data
      if (refreshViews) {
        await this.triggerRefresh({ 
          immediate: true, 
          deletedDutyId: dutyId,
          includeCalendar: true 
        });
      }
      
      return result;
      
    } catch (error) {
      // Remove optimistic update and rollback on error
      this.removeOptimisticUpdate(dutyId);
      
      // Trigger refresh to restore original data
      if (refreshViews) {
        await this.triggerRefresh({ immediate: true });
      }
      
      throw error;
    }
  }

  /**
   * Refresh calendar events for duties
   * @param {Array} duties - Duties to sync calendar events for
   * @returns {Promise<void>}
   */
  static async refreshCalendarEvents(duties = null) {
    try {
      if (!duties) {
        duties = await Duty.list();
      }

      // Ensure calendar events exist for all duties
      for (const duty of duties) {
        try {
          const existingEvents = await CalendarEvent.getByDutyId(duty.id);
          
          if (existingEvents.length === 0) {
            // Create missing calendar event
            await CalendarEvent.createDutyEvent(
              duty.id,
              duty.team_member_id,
              duty.title,
              duty.start_date,
              duty.end_date,
              duty.description
            );
          } else if (existingEvents.length > 1) {
            // Remove duplicate calendar events, keep the first one
            for (let i = 1; i < existingEvents.length; i++) {
              await CalendarEvent.delete(existingEvents[i].id);
            }
          }
        } catch (error) {
          console.error(`Failed to sync calendar event for duty ${duty.id}:`, error);
        }
      }
    } catch (error) {
      console.error('Failed to refresh calendar events:', error);
    }
  }

  /**
   * Get consistent duty display data for all views
   * @param {Array} duties - Raw duties data
   * @param {Array} teamMembers - Team members data
   * @param {Object} options - Display options
   * @returns {Array} Processed duties with consistent display data
   */
  static getConsistentDutyDisplay(duties, teamMembers = [], options = {}) {
    const {
      includeTeamMember = true,
      includeStatus = true,
      includeHighlighting = true,
      sortBy = 'start_date',
      sortOrder = 'desc'
    } = options;

    // Apply optimistic updates
    const dutiesWithOptimistic = this.applyOptimisticUpdates(duties);

    // Process each duty for consistent display
    const processedDuties = dutiesWithOptimistic.map(duty => {
      const processed = { ...duty };

      // Add team member information
      if (includeTeamMember) {
        const teamMember = teamMembers.find(tm => tm.id === duty.team_member_id);
        processed._teamMember = teamMember || null;
        processed._teamMemberName = teamMember?.name || 'Unknown';
        processed._teamMemberInitials = teamMember?.name
          ?.split(' ')
          .map(n => n[0])
          .join('')
          .toUpperCase()
          .slice(0, 2) || '??';
      }

      // Add status information
      if (includeStatus) {
        const now = new Date();
        const startDate = new Date(duty.start_date);
        const endDate = new Date(duty.end_date);
        
        processed._isActive = now >= startDate && now <= endDate;
        processed._isPast = now > endDate;
        processed._isFuture = now < startDate;
        processed._isUpcoming = processed._isFuture && 
          Math.ceil((startDate - now) / (1000 * 60 * 60 * 24)) <= 7;
        
        processed._status = processed._isActive ? 'active' : 
                           processed._isPast ? 'completed' : 'upcoming';
        
        // Calculate duration
        const diffTime = Math.abs(endDate - startDate);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
        processed._durationDays = diffDays;
        processed._durationText = this._formatDuration(diffDays);
        
        // Calculate progress for active duties
        if (processed._isActive) {
          const totalDuration = endDate - startDate;
          const elapsed = now - startDate;
          processed._progressPercent = Math.min(100, Math.max(0, (elapsed / totalDuration) * 100));
        } else {
          processed._progressPercent = processed._isPast ? 100 : 0;
        }
      }

      // Add highlighting information
      if (includeHighlighting) {
        processed._isHighlighted = this.isDutyHighlighted(duty.id);
        processed._isOptimistic = duty._isOptimistic || false;
      }

      // Add formatted dates
      processed._formattedStartDate = this._formatDate(new Date(duty.start_date));
      processed._formattedEndDate = this._formatDate(new Date(duty.end_date));
      processed._formattedDateRange = this._formatDateRange(
        new Date(duty.start_date), 
        new Date(duty.end_date)
      );

      return processed;
    });

    // Sort duties
    const sortedDuties = this._sortDuties(processedDuties, sortBy, sortOrder);

    return sortedDuties;
  }

  /**
   * Format duration in human-readable format
   * @private
   */
  static _formatDuration(days) {
    if (days === 1) {
      return '1 day';
    } else if (days < 7) {
      return `${days} days`;
    } else if (days < 30) {
      const weeks = Math.floor(days / 7);
      const remainingDays = days % 7;
      if (remainingDays === 0) {
        return `${weeks} week${weeks > 1 ? 's' : ''}`;
      }
      return `${weeks}w ${remainingDays}d`;
    } else {
      const months = Math.floor(days / 30);
      const remainingDays = days % 30;
      if (remainingDays === 0) {
        return `${months} month${months > 1 ? 's' : ''}`;
      }
      return `${months}m ${remainingDays}d`;
    }
  }

  /**
   * Format date for display
   * @private
   */
  static _formatDate(date) {
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  }

  /**
   * Format date range for display
   * @private
   */
  static _formatDateRange(startDate, endDate) {
    const start = this._formatDate(startDate);
    const end = this._formatDate(endDate);
    
    if (start === end) {
      return start;
    }
    
    return `${start} - ${end}`;
  }

  /**
   * Sort duties by specified criteria
   * @private
   */
  static _sortDuties(duties, sortBy, sortOrder) {
    return duties.sort((a, b) => {
      let aValue, bValue;
      
      switch (sortBy) {
        case 'start_date':
          aValue = new Date(a.start_date);
          bValue = new Date(b.start_date);
          break;
        case 'end_date':
          aValue = new Date(a.end_date);
          bValue = new Date(b.end_date);
          break;
        case 'created_date':
          aValue = new Date(a.created_date);
          bValue = new Date(b.created_date);
          break;
        case 'title':
          aValue = a.title.toLowerCase();
          bValue = b.title.toLowerCase();
          break;
        case 'team_member':
          aValue = a._teamMemberName?.toLowerCase() || '';
          bValue = b._teamMemberName?.toLowerCase() || '';
          break;
        case 'status':
          // Sort by status priority: active, upcoming, completed
          const statusPriority = { active: 0, upcoming: 1, completed: 2 };
          aValue = statusPriority[a._status] || 3;
          bValue = statusPriority[b._status] || 3;
          break;
        default:
          aValue = a[sortBy];
          bValue = b[sortBy];
      }
      
      if (aValue < bValue) {
        return sortOrder === 'asc' ? -1 : 1;
      }
      if (aValue > bValue) {
        return sortOrder === 'asc' ? 1 : -1;
      }
      return 0;
    });
  }

  /**
   * Clear all optimistic updates and highlights
   */
  static clearAll() {
    this.optimisticUpdates.clear();
    this.highlightedDuties.clear();
    this.refreshTimeouts.forEach(timeout => clearTimeout(timeout));
    this.refreshTimeouts.clear();
  }
}

export default DutyRefreshService;