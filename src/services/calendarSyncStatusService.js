// src/services/calendarSyncStatusService.js
// Service for managing calendar synchronization status and periodic checks

import { CalendarSynchronizationService } from './calendarSynchronizationService.js';

/**
 * Service for managing calendar sync status and periodic operations
 */
export class CalendarSyncStatusService {
  static syncStatus = {
    isRunning: false,
    lastSync: null,
    lastError: null,
    syncResults: null,
    periodicSyncInterval: null
  };

  static listeners = new Set();

  /**
   * Add a listener for sync status changes
   * @param {Function} listener - Function to call when status changes
   */
  static addStatusListener(listener) {
    this.listeners.add(listener);
  }

  /**
   * Remove a status listener
   * @param {Function} listener - Listener to remove
   */
  static removeStatusListener(listener) {
    this.listeners.delete(listener);
  }

  /**
   * Notify all listeners of status changes
   * @param {Object} status - Current sync status
   */
  static notifyListeners(status) {
    this.listeners.forEach(listener => {
      try {
        listener(status);
      } catch (error) {
        console.warn('Error in sync status listener:', error);
      }
    });
  }

  /**
   * Get current sync status
   * @returns {Object} Current sync status
   */
  static getSyncStatus() {
    return { ...this.syncStatus };
  }

  /**
   * Update sync status and notify listeners
   * @param {Object} updates - Status updates
   */
  static updateStatus(updates) {
    this.syncStatus = { ...this.syncStatus, ...updates };
    this.notifyListeners(this.getSyncStatus());
  }

  /**
   * Start periodic sync checks
   * @param {number} intervalMs - Interval in milliseconds (default: 5 minutes)
   */
  static startPeriodicSync(intervalMs = 5 * 60 * 1000) {
    // Clear existing interval if any
    this.stopPeriodicSync();

    console.log(`Starting periodic calendar sync with ${intervalMs}ms interval`);
    
    this.syncStatus.periodicSyncInterval = setInterval(async () => {
      try {
        await this.performBackgroundSync();
      } catch (error) {
        console.warn('Periodic sync failed:', error);
        this.updateStatus({
          lastError: error.message,
          lastSync: new Date().toISOString()
        });
      }
    }, intervalMs);

    // Run initial sync
    this.performBackgroundSync().catch(error => {
      console.warn('Initial periodic sync failed:', error);
    });
  }

  /**
   * Stop periodic sync checks
   */
  static stopPeriodicSync() {
    if (this.syncStatus.periodicSyncInterval) {
      clearInterval(this.syncStatus.periodicSyncInterval);
      this.syncStatus.periodicSyncInterval = null;
      console.log('Stopped periodic calendar sync');
    }
  }

  /**
   * Perform background sync without blocking UI
   * @returns {Promise<Object>} Sync results
   */
  static async performBackgroundSync() {
    if (this.syncStatus.isRunning) {
      console.log('Sync already running, skipping background sync');
      return this.syncStatus.syncResults;
    }

    try {
      this.updateStatus({
        isRunning: true,
        lastError: null
      });

      // Run sync operations in parallel for better performance
      const [syncResults, visibilityResults] = await Promise.all([
        CalendarSynchronizationService.syncOneOnOneMeetings({
          createMissing: true,
          updateExisting: false
        }),
        CalendarSynchronizationService.ensureOneOnOneVisibility({
          createMissing: true
        })
      ]);

      const combinedResults = {
        timestamp: new Date().toISOString(),
        sync: syncResults,
        visibility: visibilityResults,
        summary: {
          success: syncResults.summary.success && visibilityResults.summary.success,
          totalOperations: syncResults.summary.createdCount + visibilityResults.summary.createdCount,
          errors: [...(syncResults.errors || []), ...(visibilityResults.errors || [])]
        }
      };

      this.updateStatus({
        isRunning: false,
        lastSync: new Date().toISOString(),
        syncResults: combinedResults,
        lastError: null
      });

      // Log summary for debugging
      if (combinedResults.summary.totalOperations > 0) {
        console.log('Background sync completed with changes:', {
          syncCreated: syncResults.summary.createdCount,
          visibilityCreated: visibilityResults.summary.createdCount,
          errors: combinedResults.summary.errors.length
        });
      }

      return combinedResults;
    } catch (error) {
      console.error('Background sync failed:', error);
      this.updateStatus({
        isRunning: false,
        lastSync: new Date().toISOString(),
        lastError: error.message
      });
      throw error;
    }
  }

  /**
   * Manually trigger sync with user feedback
   * @param {Object} options - Sync options
   * @returns {Promise<Object>} Sync results with user-friendly messages
   */
  static async manualSync(options = {}) {
    const {
      createMissing = true,
      updateExisting = true,
      repairBroken = true,
      showProgress = true
    } = options;

    if (this.syncStatus.isRunning) {
      throw new Error('Sync is already running. Please wait for it to complete.');
    }

    try {
      this.updateStatus({
        isRunning: true,
        lastError: null
      });

      if (showProgress) {
        console.log('Starting manual calendar synchronization...');
      }

      // Step 1: Validate current state
      const validationResults = await CalendarSynchronizationService.validateEventConsistency();
      
      if (showProgress) {
        console.log('Validation completed:', {
          totalIssues: validationResults.summary.totalIssues,
          isConsistent: validationResults.summary.isConsistent
        });
      }

      // Step 2: Repair issues if found
      let repairResults = null;
      if (!validationResults.summary.isConsistent && repairBroken) {
        repairResults = await CalendarSynchronizationService.repairMissingEvents({
          repairOrphaned: true,
          repairMissing: true,
          repairBroken: true,
          removeDuplicates: true
        });
        
        if (showProgress) {
          console.log('Repair completed:', {
            totalRepairs: repairResults.summary.totalRepairs
          });
        }
      }

      // Step 3: Sync OneOnOne meetings
      const syncResults = await CalendarSynchronizationService.syncOneOnOneMeetings({
        createMissing,
        updateExisting
      });

      // Step 4: Ensure visibility
      const visibilityResults = await CalendarSynchronizationService.ensureOneOnOneVisibility({
        createMissing
      });

      const manualSyncResults = {
        timestamp: new Date().toISOString(),
        validation: validationResults,
        repair: repairResults,
        sync: syncResults,
        visibility: visibilityResults,
        summary: {
          success: syncResults.summary.success && visibilityResults.summary.success,
          totalChanges: (repairResults?.summary.totalRepairs || 0) + 
                       syncResults.summary.createdCount + 
                       syncResults.summary.updatedCount + 
                       visibilityResults.summary.createdCount,
          userMessage: this.generateUserMessage(validationResults, repairResults, syncResults, visibilityResults)
        }
      };

      this.updateStatus({
        isRunning: false,
        lastSync: new Date().toISOString(),
        syncResults: manualSyncResults,
        lastError: null
      });

      if (showProgress) {
        console.log('Manual sync completed:', manualSyncResults.summary.userMessage);
      }

      return manualSyncResults;
    } catch (error) {
      console.error('Manual sync failed:', error);
      this.updateStatus({
        isRunning: false,
        lastSync: new Date().toISOString(),
        lastError: error.message
      });
      throw error;
    }
  }

  /**
   * Generate user-friendly message for sync results
   * @param {Object} validation - Validation results
   * @param {Object} repair - Repair results
   * @param {Object} sync - Sync results
   * @param {Object} visibility - Visibility results
   * @returns {string} User-friendly message
   */
  static generateUserMessage(validation, repair, sync, visibility) {
    const messages = [];
    
    if (validation.summary.isConsistent && sync.summary.createdCount === 0 && visibility.summary.createdCount === 0) {
      return 'Calendar is already synchronized. No changes needed.';
    }

    if (repair && repair.summary.totalRepairs > 0) {
      messages.push(`Fixed ${repair.summary.totalRepairs} data consistency issue(s)`);
    }

    if (sync.summary.createdCount > 0) {
      messages.push(`Created ${sync.summary.createdCount} missing calendar event(s)`);
    }

    if (sync.summary.updatedCount > 0) {
      messages.push(`Updated ${sync.summary.updatedCount} calendar event(s)`);
    }

    if (visibility.summary.createdCount > 0) {
      messages.push(`Ensured visibility for ${visibility.summary.createdCount} meeting(s)`);
    }

    const totalErrors = (sync.errors?.length || 0) + (visibility.errors?.length || 0);
    if (totalErrors > 0) {
      messages.push(`${totalErrors} error(s) occurred during sync`);
    }

    return messages.length > 0 
      ? `Synchronization completed: ${messages.join(', ')}.`
      : 'Synchronization completed successfully.';
  }

  /**
   * Get sync statistics for display
   * @returns {Object} Sync statistics
   */
  static getSyncStatistics() {
    const status = this.getSyncStatus();
    
    return {
      isRunning: status.isRunning,
      lastSync: status.lastSync,
      lastError: status.lastError,
      hasPeriodicSync: status.periodicSyncInterval !== null,
      lastSyncResults: status.syncResults ? {
        success: status.syncResults.summary?.success || false,
        totalChanges: status.syncResults.summary?.totalOperations || 0,
        message: status.syncResults.summary?.userMessage || 'No details available'
      } : null
    };
  }

  /**
   * Initialize sync service (call this when app starts)
   */
  static initialize() {
    // Start periodic sync by default
    this.startPeriodicSync();
    
    // Clean up on page unload
    if (typeof window !== 'undefined') {
      window.addEventListener('beforeunload', () => {
        this.stopPeriodicSync();
      });
    }
  }

  /**
   * Cleanup sync service (call this when app shuts down)
   */
  static cleanup() {
    this.stopPeriodicSync();
    this.listeners.clear();
  }
}