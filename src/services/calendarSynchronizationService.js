// src/services/calendarSynchronizationService.js
// Service for synchronizing calendar events with OneOnOne records to ensure 1:1 meeting visibility

import { CalendarEvent, OneOnOne, TeamMember } from '../api/entities.js';
import { CalendarService } from '../utils/calendarService.js';
import { 
  ErrorHandlingService, 
  SynchronizationError, 
  ValidationError, 
  DataError,
  NetworkError 
} from './errorHandlingService.js';

/**
 * Legacy error classes - now using ErrorHandlingService
 * @deprecated Use ErrorHandlingService error classes instead
 */
export class NotFoundError extends DataError {
  constructor(message, entityType = null, entityId = null) {
    super(message, entityType, entityId);
    this.name = 'NotFoundError';
  }
}

export class OperationError extends SynchronizationError {
  constructor(message, operation = null, originalError = null) {
    super(message, operation, originalError);
    this.name = 'OperationError';
  }
}

/**
 * Service for synchronizing calendar events with OneOnOne records
 */
export class CalendarSynchronizationService {
  /**
   * Retry mechanism for synchronization operations using ErrorHandlingService
   * @param {Function} operation - The operation to retry
   * @param {string} operationName - Name of the operation for logging
   * @param {Object} options - Retry options
   * @returns {Promise<any>} Result of the operation
   */
  static async _retryOperation(operation, operationName = 'operation', options = {}) {
    return ErrorHandlingService.retryOperation(operation, {
      maxRetries: 3,
      baseDelay: 1000,
      operationName,
      shouldRetry: (error, attempt) => {
        // Don't retry validation errors or not found errors
        return !(error instanceof ValidationError || error instanceof NotFoundError);
      },
      ...options
    });
  }

  /**
   * Synchronize OneOnOne meetings to ensure all have corresponding calendar events
   * @param {Object} options - Synchronization options
   * @returns {Promise<Object>} Synchronization results
   */
  static async syncOneOnOneMeetings(options = {}) {
    const {
      createMissing = true,
      updateExisting = false,
      dryRun = false,
      showProgress = false
    } = options;

    const operationName = 'OneOnOne Meeting Synchronization';
    
    return ErrorHandlingService.wrapOperation(async () => {
      // Validate parameters
      ErrorHandlingService.validateParams(options, {
        createMissing: { type: 'boolean' },
        updateExisting: { type: 'boolean' },
        dryRun: { type: 'boolean' }
      });

      console.log('Starting OneOnOne meeting synchronization...');
      
      const results = {
        timestamp: new Date().toISOString(),
        dryRun,
        totalOneOnOnes: 0,
        processed: 0,
        created: [],
        updated: [],
        skipped: [],
        errors: [],
        summary: {
          success: true,
          createdCount: 0,
          updatedCount: 0,
          skippedCount: 0,
          errorCount: 0
        }
      };

      // Get all OneOnOne records and team members with error handling
      const [oneOnOnes, teamMembers] = await Promise.all([
        OneOnOne.list().catch(error => {
          throw new DataError('Failed to load OneOnOne records', 'OneOnOne', null, error);
        }),
        TeamMember.list().catch(error => {
          throw new DataError('Failed to load team members', 'TeamMember', null, error);
        })
      ]);

      results.totalOneOnOnes = oneOnOnes.length;

      // Create a map of team members for quick lookup
      const teamMemberMap = new Map(teamMembers.map(tm => [tm.id, tm]));

      // Process each OneOnOne record
      for (const oneOnOne of oneOnOnes) {
        try {
          results.processed++;

          // Skip if no next meeting date is set
          if (!oneOnOne.next_meeting_date) {
            results.skipped.push({
              oneOnOneId: oneOnOne.id,
              teamMemberId: oneOnOne.team_member_id,
              reason: 'No next_meeting_date set'
            });
            continue;
          }

          // Skip if team member doesn't exist
          const teamMember = teamMemberMap.get(oneOnOne.team_member_id);
          if (!teamMember) {
            results.errors.push({
              oneOnOneId: oneOnOne.id,
              teamMemberId: oneOnOne.team_member_id,
              error: 'Team member not found',
              action: 'skipped'
            });
            continue;
          }

          // Check if calendar event already exists
          let needsCalendarEvent = false;
          let existingEvent = null;

          if (oneOnOne.next_meeting_calendar_event_id) {
            // Verify the referenced calendar event exists
            existingEvent = await CalendarEvent.get(oneOnOne.next_meeting_calendar_event_id);
            if (!existingEvent) {
              needsCalendarEvent = true;
              console.warn(`OneOnOne ${oneOnOne.id} references non-existent calendar event ${oneOnOne.next_meeting_calendar_event_id}`);
            } else if (updateExisting) {
              // Check if the existing event needs updating
              const existingDate = new Date(existingEvent.start_date);
              const expectedDate = new Date(oneOnOne.next_meeting_date);
              
              if (existingDate.getTime() !== expectedDate.getTime()) {
                if (!dryRun) {
                  await this._retryOperation(async () => {
                    await CalendarService.updateOneOnOneMeeting(
                      existingEvent.id,
                      oneOnOne.next_meeting_date
                    );
                  }, `update calendar event for OneOnOne ${oneOnOne.id}`);
                }

                results.updated.push({
                  oneOnOneId: oneOnOne.id,
                  teamMemberId: oneOnOne.team_member_id,
                  teamMemberName: teamMember.name,
                  calendarEventId: existingEvent.id,
                  oldDate: existingEvent.start_date,
                  newDate: oneOnOne.next_meeting_date
                });
              }
            }
          } else {
            needsCalendarEvent = true;
          }

          // Create missing calendar event
          if (needsCalendarEvent && createMissing) {
            if (!dryRun) {
              const result = await this._retryOperation(async () => {
                return await CalendarService.createAndLinkOneOnOneMeeting(
                  oneOnOne.id,
                  oneOnOne.team_member_id,
                  oneOnOne.next_meeting_date
                );
              }, `create calendar event for OneOnOne ${oneOnOne.id}`);

              results.created.push({
                oneOnOneId: oneOnOne.id,
                teamMemberId: oneOnOne.team_member_id,
                teamMemberName: teamMember.name,
                calendarEventId: result.calendarEvent.id,
                meetingDate: oneOnOne.next_meeting_date
              });
            } else {
              results.created.push({
                oneOnOneId: oneOnOne.id,
                teamMemberId: oneOnOne.team_member_id,
                teamMemberName: teamMember.name,
                calendarEventId: 'dry-run-placeholder',
                meetingDate: oneOnOne.next_meeting_date
              });
            }
          } else if (needsCalendarEvent && !createMissing) {
            results.skipped.push({
              oneOnOneId: oneOnOne.id,
              teamMemberId: oneOnOne.team_member_id,
              reason: 'Missing calendar event but createMissing is false'
            });
          }

        } catch (error) {
          console.error(`Error processing OneOnOne ${oneOnOne.id}:`, error);
          results.errors.push({
            oneOnOneId: oneOnOne.id,
            teamMemberId: oneOnOne.team_member_id,
            error: error.message,
            action: 'failed'
          });
        }
      }

      // Calculate summary
      results.summary.createdCount = results.created.length;
      results.summary.updatedCount = results.updated.length;
      results.summary.skippedCount = results.skipped.length;
      results.summary.errorCount = results.errors.length;
      results.summary.success = results.errors.length === 0;

      console.log('OneOnOne meeting synchronization completed:', {
        total: results.totalOneOnOnes,
        created: results.summary.createdCount,
        updated: results.summary.updatedCount,
        skipped: results.summary.skippedCount,
        errors: results.summary.errorCount,
        success: results.summary.success
      });

      return results;
    }, {
      operationName,
      showLoading: showProgress,
      showSuccess: true,
      successMessage: `Synchronized ${results?.summary?.createdCount || 0} OneOnOne meetings`,
      retryOptions: {
        maxRetries: 1 // Don't retry the entire sync operation
      },
      errorOptions: {
        severity: ErrorHandlingService.SEVERITY.HIGH,
        context: { dryRun, createMissing, updateExisting }
      }
    });
  }

  /**
   * Ensure all 1:1 meetings appear in calendar by creating missing events
   * @param {Object} options - Visibility options
   * @returns {Promise<Object>} Visibility check results
   */
  static async ensureOneOnOneVisibility(options = {}) {
    const {
      teamMemberId = null,
      dateRange = null,
      createMissing = true
    } = options;

    const operation = 'ensureOneOnOneVisibility';
    
    try {
      console.log('Ensuring OneOnOne meeting visibility...');
      
      const results = {
        timestamp: new Date().toISOString(),
        scope: {
          teamMemberId,
          dateRange
        },
        totalChecked: 0,
        visible: [],
        missing: [],
        created: [],
        errors: [],
        summary: {
          success: true,
          visibleCount: 0,
          missingCount: 0,
          createdCount: 0,
          errorCount: 0
        }
      };

      // Get OneOnOne records (filtered by team member if specified)
      let oneOnOnes = await OneOnOne.list();
      if (teamMemberId) {
        oneOnOnes = oneOnOnes.filter(o => o.team_member_id === teamMemberId);
      }

      // Filter by date range if specified
      if (dateRange && dateRange.start && dateRange.end) {
        const startDate = new Date(dateRange.start);
        const endDate = new Date(dateRange.end);
        
        oneOnOnes = oneOnOnes.filter(o => {
          if (!o.next_meeting_date) return false;
          const meetingDate = new Date(o.next_meeting_date);
          return meetingDate >= startDate && meetingDate <= endDate;
        });
      }

      // Only check OneOnOnes that have a next meeting date
      oneOnOnes = oneOnOnes.filter(o => o.next_meeting_date);
      results.totalChecked = oneOnOnes.length;

      // Get all calendar events for comparison
      const calendarEvents = await CalendarService.getOneOnOneMeetings();
      const eventMap = new Map(calendarEvents.map(e => [e.id, e]));

      // Get team members for name lookup
      const teamMembers = await TeamMember.list();
      const teamMemberMap = new Map(teamMembers.map(tm => [tm.id, tm]));

      // Check visibility for each OneOnOne
      for (const oneOnOne of oneOnOnes) {
        try {
          const teamMember = teamMemberMap.get(oneOnOne.team_member_id);
          if (!teamMember) {
            results.errors.push({
              oneOnOneId: oneOnOne.id,
              teamMemberId: oneOnOne.team_member_id,
              error: 'Team member not found'
            });
            continue;
          }

          if (oneOnOne.next_meeting_calendar_event_id) {
            const calendarEvent = eventMap.get(oneOnOne.next_meeting_calendar_event_id);
            if (calendarEvent) {
              results.visible.push({
                oneOnOneId: oneOnOne.id,
                teamMemberId: oneOnOne.team_member_id,
                teamMemberName: teamMember.name,
                calendarEventId: calendarEvent.id,
                meetingDate: oneOnOne.next_meeting_date
              });
            } else {
              // Referenced calendar event doesn't exist
              results.missing.push({
                oneOnOneId: oneOnOne.id,
                teamMemberId: oneOnOne.team_member_id,
                teamMemberName: teamMember.name,
                meetingDate: oneOnOne.next_meeting_date,
                reason: 'Referenced calendar event not found'
              });

              // Create missing calendar event if requested
              if (createMissing) {
                try {
                  const result = await this._retryOperation(async () => {
                    return await CalendarService.createAndLinkOneOnOneMeeting(
                      oneOnOne.id,
                      oneOnOne.team_member_id,
                      oneOnOne.next_meeting_date
                    );
                  }, 3, `create missing calendar event for OneOnOne ${oneOnOne.id}`);

                  results.created.push({
                    oneOnOneId: oneOnOne.id,
                    teamMemberId: oneOnOne.team_member_id,
                    teamMemberName: teamMember.name,
                    calendarEventId: result.calendarEvent.id,
                    meetingDate: oneOnOne.next_meeting_date
                  });
                } catch (error) {
                  results.errors.push({
                    oneOnOneId: oneOnOne.id,
                    teamMemberId: oneOnOne.team_member_id,
                    error: `Failed to create calendar event: ${error.message}`
                  });
                }
              }
            }
          } else {
            // No calendar event linked
            results.missing.push({
              oneOnOneId: oneOnOne.id,
              teamMemberId: oneOnOne.team_member_id,
              teamMemberName: teamMember.name,
              meetingDate: oneOnOne.next_meeting_date,
              reason: 'No calendar event linked'
            });

            // Create missing calendar event if requested
            if (createMissing) {
              try {
                const result = await this._retryOperation(async () => {
                  return await CalendarService.createAndLinkOneOnOneMeeting(
                    oneOnOne.id,
                    oneOnOne.team_member_id,
                    oneOnOne.next_meeting_date
                  );
                }, 3, `create calendar event for OneOnOne ${oneOnOne.id}`);

                results.created.push({
                  oneOnOneId: oneOnOne.id,
                  teamMemberId: oneOnOne.team_member_id,
                  teamMemberName: teamMember.name,
                  calendarEventId: result.calendarEvent.id,
                  meetingDate: oneOnOne.next_meeting_date
                });
              } catch (error) {
                results.errors.push({
                  oneOnOneId: oneOnOne.id,
                  teamMemberId: oneOnOne.team_member_id,
                  error: `Failed to create calendar event: ${error.message}`
                });
              }
            }
          }
        } catch (error) {
          console.error(`Error checking visibility for OneOnOne ${oneOnOne.id}:`, error);
          results.errors.push({
            oneOnOneId: oneOnOne.id,
            teamMemberId: oneOnOne.team_member_id,
            error: error.message
          });
        }
      }

      // Calculate summary
      results.summary.visibleCount = results.visible.length;
      results.summary.missingCount = results.missing.length;
      results.summary.createdCount = results.created.length;
      results.summary.errorCount = results.errors.length;
      results.summary.success = results.errors.length === 0;

      console.log('OneOnOne visibility check completed:', {
        checked: results.totalChecked,
        visible: results.summary.visibleCount,
        missing: results.summary.missingCount,
        created: results.summary.createdCount,
        errors: results.summary.errorCount,
        success: results.summary.success
      });

      return results;
    } catch (error) {
      console.error('Error during OneOnOne visibility check:', error);
      throw new OperationError(
        `OneOnOne visibility check failed: ${error.message}`,
        operation,
        error
      );
    }
  }

  /**
   * Validate data integrity between OneOnOne and CalendarEvent entities
   * @param {Object} options - Validation options
   * @returns {Promise<Object>} Validation results
   */
  static async validateEventConsistency(options = {}) {
    const {
      includeOrphanedEvents = true,
      includeMissingLinks = true,
      includeInvalidData = true,
      includeDuplicates = true,
      includeBrokenReferences = true
    } = options;

    const operation = 'validateEventConsistency';
    
    try {
      console.log('Starting event consistency validation...');
      
      const results = {
        timestamp: new Date().toISOString(),
        totalEventsChecked: 0,
        totalOneOnOnesChecked: 0,
        inconsistencies: {
          orphanedEvents: [],
          missingLinks: [],
          invalidData: [],
          duplicateEvents: [],
          brokenReferences: []
        },
        summary: {
          isConsistent: true,
          totalIssues: 0,
          orphanedCount: 0,
          missingLinksCount: 0,
          invalidDataCount: 0,
          duplicatesCount: 0,
          brokenReferencesCount: 0
        }
      };

      // Get all data
      const [oneOnOneEvents, oneOnOnes, teamMembers] = await Promise.all([
        CalendarService.getOneOnOneMeetings(),
        OneOnOne.list(),
        TeamMember.list()
      ]);

      results.totalEventsChecked = oneOnOneEvents.length;
      results.totalOneOnOnesChecked = oneOnOnes.length;

      // Create lookup maps
      const oneOnOneMap = new Map(oneOnOnes.map(o => [o.id, o]));
      const teamMemberMap = new Map(teamMembers.map(tm => [tm.id, tm]));
      const eventMap = new Map(oneOnOneEvents.map(e => [e.id, e]));

      // Check for orphaned calendar events
      if (includeOrphanedEvents) {
        const validEventIds = new Set(
          oneOnOnes
            .filter(o => o.next_meeting_calendar_event_id)
            .map(o => o.next_meeting_calendar_event_id)
        );

        for (const event of oneOnOneEvents) {
          const isOrphaned = !validEventIds.has(event.id) && 
                           (!event.linked_entity_id || !oneOnOneMap.has(event.linked_entity_id));
          
          if (isOrphaned) {
            results.inconsistencies.orphanedEvents.push({
              eventId: event.id,
              title: event.title,
              teamMemberId: event.team_member_id,
              startDate: event.start_date,
              linkedEntityId: event.linked_entity_id,
              issue: 'Calendar event not linked to any OneOnOne record'
            });
          }
        }
      }

      // Check for missing calendar event links
      if (includeMissingLinks) {
        for (const oneOnOne of oneOnOnes) {
          if (oneOnOne.next_meeting_date && !oneOnOne.next_meeting_calendar_event_id) {
            results.inconsistencies.missingLinks.push({
              oneOnOneId: oneOnOne.id,
              teamMemberId: oneOnOne.team_member_id,
              nextMeetingDate: oneOnOne.next_meeting_date,
              issue: 'OneOnOne has next_meeting_date but no calendar event'
            });
          }
        }
      }

      // Check for broken references
      if (includeBrokenReferences) {
        for (const oneOnOne of oneOnOnes) {
          if (oneOnOne.next_meeting_calendar_event_id) {
            const referencedEvent = eventMap.get(oneOnOne.next_meeting_calendar_event_id);
            if (!referencedEvent) {
              results.inconsistencies.brokenReferences.push({
                oneOnOneId: oneOnOne.id,
                teamMemberId: oneOnOne.team_member_id,
                referencedEventId: oneOnOne.next_meeting_calendar_event_id,
                issue: 'OneOnOne references non-existent calendar event'
              });
            }
          }
        }
      }

      // Check for invalid data
      if (includeInvalidData) {
        for (const event of oneOnOneEvents) {
          const issues = [];

          // Check team member exists
          const teamMember = teamMemberMap.get(event.team_member_id);
          if (!teamMember) {
            issues.push('Team member not found');
          } else {
            // Check title format
            const expectedTitle = CalendarService.generateOneOnOneTitle(teamMember.name);
            if (event.title !== expectedTitle) {
              issues.push(`Title mismatch: expected "${expectedTitle}", got "${event.title}"`);
            }
          }

          // Check event type
          if (event.event_type !== 'one_on_one') {
            issues.push(`Incorrect event type: expected "one_on_one", got "${event.event_type}"`);
          }

          // Check linked entity type
          if (event.linked_entity_type !== 'one_on_one') {
            issues.push(`Incorrect linked entity type: expected "one_on_one", got "${event.linked_entity_type}"`);
          }

          // Check date validity
          const startDate = new Date(event.start_date);
          const endDate = new Date(event.end_date);
          if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
            issues.push('Invalid date format');
          } else if (endDate <= startDate) {
            issues.push('End date must be after start date');
          }

          // Check if linked OneOnOne exists and has matching date
          if (event.linked_entity_id) {
            const linkedOneOnOne = oneOnOneMap.get(event.linked_entity_id);
            if (linkedOneOnOne) {
              if (linkedOneOnOne.next_meeting_date) {
                const oneOnOneDate = new Date(linkedOneOnOne.next_meeting_date);
                if (Math.abs(startDate.getTime() - oneOnOneDate.getTime()) > 60000) { // Allow 1 minute difference
                  issues.push('Calendar event date does not match OneOnOne next_meeting_date');
                }
              }
            }
          }

          if (issues.length > 0) {
            results.inconsistencies.invalidData.push({
              eventId: event.id,
              title: event.title,
              teamMemberId: event.team_member_id,
              linkedEntityId: event.linked_entity_id,
              issues
            });
          }
        }
      }

      // Check for duplicate events
      if (includeDuplicates) {
        const eventsByMemberAndDate = {};
        for (const event of oneOnOneEvents) {
          const eventDate = new Date(event.start_date).toDateString();
          const key = `${event.team_member_id}-${eventDate}`;
          
          if (!eventsByMemberAndDate[key]) {
            eventsByMemberAndDate[key] = [];
          }
          eventsByMemberAndDate[key].push(event);
        }

        for (const [key, events] of Object.entries(eventsByMemberAndDate)) {
          if (events.length > 1) {
            const teamMember = teamMemberMap.get(events[0].team_member_id);
            results.inconsistencies.duplicateEvents.push({
              key,
              teamMemberId: events[0].team_member_id,
              teamMemberName: teamMember ? teamMember.name : 'Unknown',
              date: new Date(events[0].start_date).toDateString(),
              events: events.map(e => ({ 
                id: e.id, 
                title: e.title,
                linkedEntityId: e.linked_entity_id 
              })),
              count: events.length
            });
          }
        }
      }

      // Calculate summary
      results.summary.orphanedCount = results.inconsistencies.orphanedEvents.length;
      results.summary.missingLinksCount = results.inconsistencies.missingLinks.length;
      results.summary.invalidDataCount = results.inconsistencies.invalidData.length;
      results.summary.duplicatesCount = results.inconsistencies.duplicateEvents.length;
      results.summary.brokenReferencesCount = results.inconsistencies.brokenReferences.length;

      results.summary.totalIssues = 
        results.summary.orphanedCount +
        results.summary.missingLinksCount +
        results.summary.invalidDataCount +
        results.summary.duplicatesCount +
        results.summary.brokenReferencesCount;

      results.summary.isConsistent = results.summary.totalIssues === 0;

      console.log('Event consistency validation completed:', {
        eventsChecked: results.totalEventsChecked,
        oneOnOnesChecked: results.totalOneOnOnesChecked,
        totalIssues: results.summary.totalIssues,
        isConsistent: results.summary.isConsistent
      });

      return results;
    } catch (error) {
      console.error('Error during event consistency validation:', error);
      throw new OperationError(
        `Event consistency validation failed: ${error.message}`,
        operation,
        error
      );
    }
  }

  /**
   * Repair missing or broken calendar event links
   * @param {Object} options - Repair options
   * @returns {Promise<Object>} Repair results
   */
  static async repairMissingEvents(options = {}) {
    const {
      repairOrphaned = true,
      repairMissing = true,
      repairBroken = true,
      removeDuplicates = true,
      dryRun = false
    } = options;

    const operation = 'repairMissingEvents';
    
    try {
      console.log('Starting calendar event repair...');
      
      const results = {
        timestamp: new Date().toISOString(),
        dryRun,
        repairs: {
          orphanedRemoved: [],
          missingCreated: [],
          brokenFixed: [],
          duplicatesRemoved: []
        },
        errors: [],
        summary: {
          success: true,
          totalRepairs: 0,
          orphanedRemovedCount: 0,
          missingCreatedCount: 0,
          brokenFixedCount: 0,
          duplicatesRemovedCount: 0,
          errorCount: 0
        }
      };

      // First, validate to find issues
      const validation = await this.validateEventConsistency();
      
      if (validation.summary.isConsistent) {
        console.log('No inconsistencies found, no repairs needed');
        return results;
      }

      // Repair orphaned events by removing them
      if (repairOrphaned && validation.inconsistencies.orphanedEvents.length > 0) {
        console.log(`Repairing ${validation.inconsistencies.orphanedEvents.length} orphaned events...`);
        
        for (const orphaned of validation.inconsistencies.orphanedEvents) {
          try {
            if (!dryRun) {
              await this._retryOperation(async () => {
                await CalendarEvent.delete(orphaned.eventId);
              }, 3, `delete orphaned event ${orphaned.eventId}`);
            }

            results.repairs.orphanedRemoved.push({
              eventId: orphaned.eventId,
              title: orphaned.title,
              teamMemberId: orphaned.teamMemberId,
              action: dryRun ? 'would_delete' : 'deleted'
            });
          } catch (error) {
            results.errors.push({
              type: 'orphaned_removal_failed',
              eventId: orphaned.eventId,
              error: error.message
            });
          }
        }
      }

      // Repair missing calendar events by creating them
      if (repairMissing && validation.inconsistencies.missingLinks.length > 0) {
        console.log(`Repairing ${validation.inconsistencies.missingLinks.length} missing calendar events...`);
        
        for (const missing of validation.inconsistencies.missingLinks) {
          try {
            if (!dryRun) {
              const result = await this._retryOperation(async () => {
                return await CalendarService.createAndLinkOneOnOneMeeting(
                  missing.oneOnOneId,
                  missing.teamMemberId,
                  missing.nextMeetingDate
                );
              }, 3, `create missing calendar event for OneOnOne ${missing.oneOnOneId}`);

              results.repairs.missingCreated.push({
                oneOnOneId: missing.oneOnOneId,
                teamMemberId: missing.teamMemberId,
                calendarEventId: result.calendarEvent.id,
                meetingDate: missing.nextMeetingDate,
                action: 'created'
              });
            } else {
              results.repairs.missingCreated.push({
                oneOnOneId: missing.oneOnOneId,
                teamMemberId: missing.teamMemberId,
                calendarEventId: 'dry-run-placeholder',
                meetingDate: missing.nextMeetingDate,
                action: 'would_create'
              });
            }
          } catch (error) {
            results.errors.push({
              type: 'missing_creation_failed',
              oneOnOneId: missing.oneOnOneId,
              error: error.message
            });
          }
        }
      }

      // Repair broken references by clearing them
      if (repairBroken && validation.inconsistencies.brokenReferences.length > 0) {
        console.log(`Repairing ${validation.inconsistencies.brokenReferences.length} broken references...`);
        
        for (const broken of validation.inconsistencies.brokenReferences) {
          try {
            if (!dryRun) {
              await this._retryOperation(async () => {
                await OneOnOne.update(broken.oneOnOneId, {
                  next_meeting_calendar_event_id: null
                });
              }, 3, `clear broken reference for OneOnOne ${broken.oneOnOneId}`);
            }

            results.repairs.brokenFixed.push({
              oneOnOneId: broken.oneOnOneId,
              teamMemberId: broken.teamMemberId,
              referencedEventId: broken.referencedEventId,
              action: dryRun ? 'would_clear' : 'cleared'
            });
          } catch (error) {
            results.errors.push({
              type: 'broken_reference_fix_failed',
              oneOnOneId: broken.oneOnOneId,
              error: error.message
            });
          }
        }
      }

      // Remove duplicate events (keep the first one, remove others)
      if (removeDuplicates && validation.inconsistencies.duplicateEvents.length > 0) {
        console.log(`Removing ${validation.inconsistencies.duplicateEvents.length} duplicate event groups...`);
        
        for (const duplicate of validation.inconsistencies.duplicateEvents) {
          try {
            // Keep the first event, remove the rest
            const eventsToRemove = duplicate.events.slice(1);
            
            for (const eventToRemove of eventsToRemove) {
              if (!dryRun) {
                await this._retryOperation(async () => {
                  await CalendarEvent.delete(eventToRemove.id);
                }, 3, `delete duplicate event ${eventToRemove.id}`);
              }

              results.repairs.duplicatesRemoved.push({
                eventId: eventToRemove.id,
                title: eventToRemove.title,
                teamMemberId: duplicate.teamMemberId,
                date: duplicate.date,
                action: dryRun ? 'would_delete' : 'deleted'
              });
            }
          } catch (error) {
            results.errors.push({
              type: 'duplicate_removal_failed',
              duplicateKey: duplicate.key,
              error: error.message
            });
          }
        }
      }

      // Calculate summary
      results.summary.orphanedRemovedCount = results.repairs.orphanedRemoved.length;
      results.summary.missingCreatedCount = results.repairs.missingCreated.length;
      results.summary.brokenFixedCount = results.repairs.brokenFixed.length;
      results.summary.duplicatesRemovedCount = results.repairs.duplicatesRemoved.length;
      results.summary.errorCount = results.errors.length;
      
      results.summary.totalRepairs = 
        results.summary.orphanedRemovedCount +
        results.summary.missingCreatedCount +
        results.summary.brokenFixedCount +
        results.summary.duplicatesRemovedCount;

      results.summary.success = results.errors.length === 0;

      console.log('Calendar event repair completed:', {
        totalRepairs: results.summary.totalRepairs,
        orphanedRemoved: results.summary.orphanedRemovedCount,
        missingCreated: results.summary.missingCreatedCount,
        brokenFixed: results.summary.brokenFixedCount,
        duplicatesRemoved: results.summary.duplicatesRemovedCount,
        errors: results.summary.errorCount,
        success: results.summary.success
      });

      return results;
    } catch (error) {
      console.error('Error during calendar event repair:', error);
      throw new OperationError(
        `Calendar event repair failed: ${error.message}`,
        operation,
        error
      );
    }
  }
}