// src/services/calendarEventDeduplicationService.js
// Service for calendar event deduplication cleanup and data consistency validation

import { CalendarEvent, Duty } from '../api/entities.js';
import { logAuditEvent, AUDIT_ACTIONS, AUDIT_RESOURCES } from './auditService.js';

/**
 * Service for managing calendar event deduplication and data consistency
 */
export class CalendarEventDeduplicationService {
  /**
   * Run comprehensive cleanup of duplicate calendar events
   * @param {Object} options - Cleanup options
   * @param {boolean} options.dryRun - If true, only report what would be cleaned up
   * @param {boolean} options.verbose - If true, provide detailed logging
   * @returns {Promise<Object>} Cleanup results with detailed reporting
   */
  static async runCleanup(options = {}) {
    const { dryRun = false, verbose = false } = options;
    const startTime = Date.now();
    
    try {
      if (verbose) {
        console.log('🧹 Starting calendar event deduplication cleanup...');
        console.log(`Mode: ${dryRun ? 'DRY RUN' : 'LIVE CLEANUP'}`);
      }

      // Step 1: Identify and remove duplicate events
      const deduplicationResult = await this._performDeduplication(dryRun, verbose);
      
      // Step 2: Validate data consistency
      const consistencyResult = await this._validateConsistency(verbose);
      
      // Step 3: Generate comprehensive report
      const report = this._generateReport(deduplicationResult, consistencyResult, startTime, dryRun);
      
      // Step 4: Log audit event
      await this._logCleanupAudit(report, dryRun);
      
      if (verbose) {
        console.log('✅ Cleanup completed successfully');
        this._printReport(report);
      }
      
      return report;
    } catch (error) {
      console.error('❌ Cleanup failed:', error);
      
      // Log error audit event
      await logAuditEvent(AUDIT_ACTIONS.ERROR, AUDIT_RESOURCES.CALENDAR_EVENT, null, {
        operation: 'deduplication_cleanup',
        error: error.message,
        dryRun
      });
      
      throw error;
    }
  }

  /**
   * Perform the actual deduplication of calendar events
   * @private
   */
  static async _performDeduplication(dryRun, verbose) {
    if (verbose) {
      console.log('🔍 Identifying duplicate calendar events...');
    }

    if (dryRun) {
      // For dry run, simulate the cleanup without actually removing events
      const events = await CalendarEvent.list();
      const duplicatesFound = [];
      const seenDutyIds = new Set();
      
      for (const event of events) {
        if (event.event_type === 'duty' && event.duty_id) {
          if (seenDutyIds.has(event.duty_id)) {
            duplicatesFound.push(event);
          } else {
            seenDutyIds.add(event.duty_id);
          }
        }
      }
      
      return {
        duplicatesRemoved: duplicatesFound.length,
        duplicateEvents: duplicatesFound,
        dryRun: true
      };
    } else {
      // Perform actual cleanup
      return await CalendarEvent.cleanupDuplicateEvents();
    }
  }

  /**
   * Validate data consistency between duties and calendar events
   * @private
   */
  static async _validateConsistency(verbose) {
    if (verbose) {
      console.log('🔍 Validating data consistency...');
    }

    const inconsistencies = await CalendarEvent.validateDutyEventConsistency();
    
    if (verbose && inconsistencies.length > 0) {
      console.log(`⚠️  Found ${inconsistencies.length} data consistency issues`);
    }
    
    return {
      inconsistencies,
      totalIssues: inconsistencies.length,
      issuesByType: this._groupInconsistenciesByType(inconsistencies)
    };
  }

  /**
   * Group inconsistencies by type for reporting
   * @private
   */
  static _groupInconsistenciesByType(inconsistencies) {
    const grouped = {};
    
    for (const issue of inconsistencies) {
      if (!grouped[issue.type]) {
        grouped[issue.type] = [];
      }
      grouped[issue.type].push(issue);
    }
    
    return grouped;
  }

  /**
   * Generate comprehensive cleanup report
   * @private
   */
  static _generateReport(deduplicationResult, consistencyResult, startTime, dryRun) {
    const endTime = Date.now();
    const duration = endTime - startTime;
    
    return {
      timestamp: new Date().toISOString(),
      duration: `${duration}ms`,
      dryRun,
      deduplication: {
        duplicatesFound: deduplicationResult.duplicatesRemoved,
        duplicateEvents: deduplicationResult.duplicateEvents,
        success: true
      },
      consistency: {
        totalIssues: consistencyResult.totalIssues,
        issuesByType: consistencyResult.issuesByType,
        details: consistencyResult.inconsistencies
      },
      summary: {
        duplicatesProcessed: deduplicationResult.duplicatesRemoved,
        consistencyIssuesFound: consistencyResult.totalIssues,
        totalIssuesResolved: dryRun ? 0 : deduplicationResult.duplicatesRemoved,
        status: 'completed'
      }
    };
  }

  /**
   * Log audit event for cleanup operation
   * @private
   */
  static async _logCleanupAudit(report, dryRun) {
    await logAuditEvent(
      dryRun ? AUDIT_ACTIONS.READ : AUDIT_ACTIONS.DELETE,
      AUDIT_RESOURCES.CALENDAR_EVENT,
      null,
      {
        operation: 'deduplication_cleanup',
        dryRun,
        duplicatesProcessed: report.deduplication.duplicatesFound,
        consistencyIssues: report.consistency.totalIssues,
        duration: report.duration
      }
    );
  }

  /**
   * Print detailed report to console
   * @private
   */
  static _printReport(report) {
    console.log('\n📊 CLEANUP REPORT');
    console.log('==================');
    console.log(`Timestamp: ${report.timestamp}`);
    console.log(`Duration: ${report.duration}`);
    console.log(`Mode: ${report.dryRun ? 'DRY RUN' : 'LIVE CLEANUP'}`);
    console.log('');
    
    console.log('🔄 DEDUPLICATION RESULTS:');
    console.log(`  Duplicates found: ${report.deduplication.duplicatesFound}`);
    if (report.deduplication.duplicateEvents.length > 0) {
      console.log('  Duplicate events:');
      report.deduplication.duplicateEvents.forEach((event, index) => {
        console.log(`    ${index + 1}. Event ${event.id} (Duty: ${event.duty_id})`);
      });
    }
    console.log('');
    
    console.log('🔍 CONSISTENCY VALIDATION:');
    console.log(`  Total issues found: ${report.consistency.totalIssues}`);
    
    Object.entries(report.consistency.issuesByType).forEach(([type, issues]) => {
      console.log(`  ${type}: ${issues.length} issues`);
      issues.forEach((issue, index) => {
        console.log(`    ${index + 1}. ${issue.issue}`);
      });
    });
    
    console.log('');
    console.log('📈 SUMMARY:');
    console.log(`  Duplicates processed: ${report.summary.duplicatesProcessed}`);
    console.log(`  Consistency issues found: ${report.summary.consistencyIssuesFound}`);
    console.log(`  Issues resolved: ${report.summary.totalIssuesResolved}`);
    console.log(`  Status: ${report.summary.status}`);
    console.log('==================\n');
  }

  /**
   * Get cleanup statistics without performing cleanup
   * @returns {Promise<Object>} Statistics about potential cleanup
   */
  static async getCleanupStatistics() {
    const dryRunResult = await this.runCleanup({ dryRun: true, verbose: false });
    
    return {
      duplicatesFound: dryRunResult.deduplication.duplicatesFound,
      consistencyIssues: dryRunResult.consistency.totalIssues,
      issuesByType: dryRunResult.consistency.issuesByType,
      wouldResolve: dryRunResult.deduplication.duplicatesFound,
      timestamp: dryRunResult.timestamp
    };
  }

  /**
   * Fix specific consistency issues
   * @param {Array} inconsistencies - Array of inconsistency objects to fix
   * @param {Object} options - Fix options
   * @returns {Promise<Object>} Fix results
   */
  static async fixConsistencyIssues(inconsistencies, options = {}) {
    const { dryRun = false, verbose = false } = options;
    const results = {
      fixed: [],
      failed: [],
      skipped: []
    };

    for (const issue of inconsistencies) {
      try {
        switch (issue.type) {
          case 'orphaned_calendar_event':
            if (!dryRun) {
              await CalendarEvent.delete(issue.event.id);
            }
            results.fixed.push({
              type: issue.type,
              action: 'deleted_orphaned_event',
              eventId: issue.event.id
            });
            break;
            
          case 'missing_calendar_event':
            // This would require creating a calendar event from duty data
            // For now, we'll skip this as it requires more complex logic
            results.skipped.push({
              type: issue.type,
              reason: 'requires_manual_intervention',
              dutyId: issue.duty.id
            });
            break;
            
          case 'multiple_calendar_events':
            // Keep the first event, remove the rest
            const eventsToRemove = issue.events.slice(1);
            for (const event of eventsToRemove) {
              if (!dryRun) {
                await CalendarEvent.delete(event.id);
              }
            }
            results.fixed.push({
              type: issue.type,
              action: 'removed_duplicate_events',
              dutyId: issue.duty.id,
              eventsRemoved: eventsToRemove.length
            });
            break;
            
          default:
            results.skipped.push({
              type: issue.type,
              reason: 'unknown_issue_type'
            });
        }
      } catch (error) {
        results.failed.push({
          type: issue.type,
          error: error.message,
          issue
        });
      }
    }

    if (verbose) {
      console.log(`Fixed: ${results.fixed.length}, Failed: ${results.failed.length}, Skipped: ${results.skipped.length}`);
    }

    return results;
  }
}

export default CalendarEventDeduplicationService;