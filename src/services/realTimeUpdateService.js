// src/services/realTimeUpdateService.js
// Real-time update service for calendar view modes

import { localClient } from '../api/localClient.js';

/**
 * Service for handling real-time updates to calendar data
 * Implements polling mechanism to detect changes and notify subscribers
 */
class RealTimeUpdateService {
  constructor() {
    this.isPolling = false;
    this.pollingInterval = null;
    this.pollIntervalMs = 30000; // 30 seconds as per requirements
    this.lastUpdateTimestamps = new Map();
    this.subscribers = new Map();
    this.connectionStatus = 'connected';
    this.retryCount = 0;
    this.maxRetries = 3;
    this.initialized = false;
    
    // Initialize last update timestamps asynchronously
    this.initializeTimestamps().then(() => {
      this.initialized = true;
    }).catch(error => {
      console.error('Error during initialization:', error);
    });
  }

  /**
   * Initialize timestamp tracking for all relevant entities
   */
  async initializeTimestamps() {
    try {
      const entities = ['meetings', 'out_of_office', 'duties', 'team_members', 'calendar_events'];
      
      for (const entityType of entities) {
        const data = await this.getEntityData(entityType);
        const latestTimestamp = this.getLatestTimestamp(data);
        this.lastUpdateTimestamps.set(entityType, latestTimestamp);
      }
    } catch (error) {
      console.error('Error initializing timestamps:', error);
    }
  }

  /**
   * Get data for a specific entity type
   */
  async getEntityData(entityType) {
    switch (entityType) {
      case 'meetings':
        return await localClient.entities.Meeting.list();
      case 'out_of_office':
        return await localClient.entities.OutOfOffice.list();
      case 'duties':
        return await localClient.entities.Duty.list();
      case 'team_members':
        return await localClient.entities.TeamMember.list();
      case 'calendar_events':
        return await localClient.entities.CalendarEvent.list();
      default:
        return [];
    }
  }

  /**
   * Get the latest timestamp from an array of entities
   */
  getLatestTimestamp(entities) {
    if (!entities || entities.length === 0) {
      return new Date(0).toISOString(); // Return epoch if no data
    }

    return entities.reduce((latest, entity) => {
      const entityTimestamp = entity.updated_date || entity.created_date;
      return entityTimestamp > latest ? entityTimestamp : latest;
    }, new Date(0).toISOString());
  }

  /**
   * Start polling for updates
   */
  startPolling() {
    if (this.isPolling) {
      return;
    }

    this.isPolling = true;
    this.connectionStatus = 'connected';
    this.retryCount = 0;
    
    console.log('RealTimeUpdateService: Starting polling');
    
    // Initial check
    this.checkForUpdates();
    
    // Set up interval
    this.pollingInterval = setInterval(() => {
      this.checkForUpdates();
    }, this.pollIntervalMs);
  }

  /**
   * Stop polling for updates
   */
  stopPolling() {
    if (!this.isPolling) {
      return;
    }

    this.isPolling = false;
    
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = null;
    }
    
    console.log('RealTimeUpdateService: Stopped polling');
  }

  /**
   * Check for updates across all entity types
   */
  async checkForUpdates() {
    try {
      const entities = ['meetings', 'out_of_office', 'duties', 'team_members', 'calendar_events'];
      const updates = new Map();
      
      for (const entityType of entities) {
        const data = await this.getEntityData(entityType);
        const latestTimestamp = this.getLatestTimestamp(data);
        const lastKnownTimestamp = this.lastUpdateTimestamps.get(entityType);
        
        if (latestTimestamp > lastKnownTimestamp) {
          updates.set(entityType, {
            data,
            previousTimestamp: lastKnownTimestamp,
            currentTimestamp: latestTimestamp
          });
          this.lastUpdateTimestamps.set(entityType, latestTimestamp);
        }
      }
      
      // Notify subscribers of updates
      if (updates.size > 0) {
        this.notifySubscribers(updates);
      }
      
      // Reset connection status and retry count on successful check
      this.connectionStatus = 'connected';
      this.retryCount = 0;
      
    } catch (error) {
      console.error('Error checking for updates:', error);
      this.handleUpdateError(error);
    }
  }

  /**
   * Handle update check errors with retry logic
   */
  handleUpdateError(error) {
    this.retryCount++;
    
    if (this.retryCount >= this.maxRetries) {
      this.connectionStatus = 'error';
      console.error('Max retries reached, marking connection as error');
    } else {
      this.connectionStatus = 'retrying';
      console.warn(`Update check failed, retry ${this.retryCount}/${this.maxRetries}`);
    }
    
    // Notify subscribers of connection status change
    this.notifyConnectionStatusChange();
  }

  /**
   * Notify all subscribers of updates
   */
  notifySubscribers(updates) {
    console.log('RealTimeUpdateService: Notifying subscribers of updates', updates);
    
    for (const [callbackId, callback] of this.subscribers) {
      try {
        callback(updates);
      } catch (error) {
        console.error(`Error notifying subscriber ${callbackId}:`, error);
      }
    }
  }

  /**
   * Notify subscribers of connection status changes
   */
  notifyConnectionStatusChange() {
    const statusUpdate = new Map();
    statusUpdate.set('connection_status', {
      status: this.connectionStatus,
      retryCount: this.retryCount
    });
    
    this.notifySubscribers(statusUpdate);
  }

  /**
   * Subscribe to meeting updates
   */
  onMeetingUpdate(callback) {
    return this.subscribe('meetings', callback);
  }

  /**
   * Subscribe to out-of-office updates
   */
  onOutOfOfficeUpdate(callback) {
    return this.subscribe('out_of_office', callback);
  }

  /**
   * Subscribe to duty updates
   */
  onDutyUpdate(callback) {
    return this.subscribe('duties', callback);
  }

  /**
   * Subscribe to all updates
   */
  onUpdate(callback) {
    return this.subscribe('all', callback);
  }

  /**
   * Generic subscription method
   */
  subscribe(entityType, callback) {
    const callbackId = this.generateCallbackId();
    
    // Wrap callback to filter by entity type if needed
    const wrappedCallback = (updates) => {
      if (entityType === 'all') {
        callback(updates);
      } else if (updates.has(entityType)) {
        const filteredUpdates = new Map();
        filteredUpdates.set(entityType, updates.get(entityType));
        callback(filteredUpdates);
      }
    };
    
    this.subscribers.set(callbackId, wrappedCallback);
    
    // Return unsubscribe function
    return () => {
      this.subscribers.delete(callbackId);
    };
  }

  /**
   * Generate unique callback ID
   */
  generateCallbackId() {
    return `callback_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Force refresh - manually check for updates
   */
  async forceRefresh() {
    console.log('RealTimeUpdateService: Force refresh requested');
    
    try {
      // Reset timestamps to force detection of all current data
      await this.initializeTimestamps();
      
      // Perform immediate update check
      await this.checkForUpdates();
      
      return { success: true, message: 'Refresh completed successfully' };
    } catch (error) {
      console.error('Error during force refresh:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get current connection status
   */
  getConnectionStatus() {
    return {
      status: this.connectionStatus,
      isPolling: this.isPolling,
      retryCount: this.retryCount,
      pollInterval: this.pollIntervalMs
    };
  }

  /**
   * Update polling interval
   */
  setPollInterval(intervalMs) {
    this.pollIntervalMs = intervalMs;
    
    // Restart polling with new interval if currently active
    if (this.isPolling) {
      this.stopPolling();
      this.startPolling();
    }
  }

  /**
   * Get last update timestamps for debugging
   */
  getLastUpdateTimestamps() {
    return Object.fromEntries(this.lastUpdateTimestamps);
  }

  /**
   * Clean up resources
   */
  destroy() {
    this.stopPolling();
    this.subscribers.clear();
    this.lastUpdateTimestamps.clear();
  }
}

// Create singleton instance
const realTimeUpdateService = new RealTimeUpdateService();

export { realTimeUpdateService, RealTimeUpdateService };