// src/utils/calendarService.js
// Calendar service for managing 1:1 meeting events

import { CalendarEvent, OneOnOne, TeamMember } from '../api/entities.js';

/**
 * Custom error classes for calendar operations
 */
export class CalendarServiceError extends Error {
  constructor(message, code, originalError = null) {
    super(message);
    this.name = 'CalendarServiceError';
    this.code = code;
    this.originalError = originalError;
  }
}

export class ValidationError extends CalendarServiceError {
  constructor(message, field = null) {
    super(message, 'VALIDATION_ERROR');
    this.field = field;
  }
}

export class NotFoundError extends CalendarServiceError {
  constructor(message, entityType = null, entityId = null) {
    super(message, 'NOT_FOUND');
    this.entityType = entityType;
    this.entityId = entityId;
  }
}

export class DuplicateError extends CalendarServiceError {
  constructor(message, duplicateData = null) {
    super(message, 'DUPLICATE_ERROR');
    this.duplicateData = duplicateData;
  }
}

export class OperationError extends CalendarServiceError {
  constructor(message, operation = null, originalError = null) {
    super(message, 'OPERATION_ERROR', originalError);
    this.operation = operation;
  }
}

/**
 * Service for managing calendar events related to 1:1 meetings
 */
export class CalendarService {
  /**
   * Retry mechanism for calendar operations
   * @param {Function} operation - The operation to retry
   * @param {number} maxRetries - Maximum number of retry attempts
   * @param {string} operationName - Name of the operation for logging
   * @param {number} delayMs - Delay between retries in milliseconds
   * @returns {Promise<any>} Result of the operation
   */
  static async _retryOperation(operation, maxRetries = 3, operationName = 'operation', delayMs = 1000) {
    let lastError;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const result = await operation();
        if (attempt > 1) {
          console.log(`${operationName} succeeded on attempt ${attempt}`);
        }
        return result;
      } catch (error) {
        lastError = error;
        
        // Don't retry validation errors or not found errors
        if (error instanceof ValidationError || error instanceof NotFoundError) {
          throw error;
        }
        
        if (attempt < maxRetries) {
          console.warn(`${operationName} failed on attempt ${attempt}/${maxRetries}: ${error.message}. Retrying in ${delayMs}ms...`);
          await new Promise(resolve => setTimeout(resolve, delayMs));
          delayMs *= 1.5; // Exponential backoff
        } else {
          console.error(`${operationName} failed after ${maxRetries} attempts: ${error.message}`);
        }
      }
    }
    
    throw new OperationError(
      `Operation failed after ${maxRetries} attempts: ${lastError.message}`,
      operationName,
      lastError
    );
  }

  /**
   * Provide user feedback for calendar operations
   * @param {string} operation - The operation performed
   * @param {boolean} success - Whether the operation was successful
   * @param {Error} error - Error object if operation failed
   * @param {Object} context - Additional context for the feedback
   * @returns {Object} Feedback object with message and type
   */
  static _generateUserFeedback(operation, success, error = null, context = {}) {
    const feedback = {
      operation,
      success,
      timestamp: new Date().toISOString(),
      context
    };

    if (success) {
      switch (operation) {
        case 'createOneOnOneMeeting':
          feedback.message = `Successfully scheduled 1:1 meeting${context.teamMemberName ? ` with ${context.teamMemberName}` : ''}`;
          feedback.type = 'success';
          break;
        case 'updateOneOnOneMeeting':
          feedback.message = 'Meeting successfully rescheduled';
          feedback.type = 'success';
          break;
        case 'deleteOneOnOneMeeting':
          feedback.message = 'Meeting successfully cancelled';
          feedback.type = 'success';
          break;
        default:
          feedback.message = 'Calendar operation completed successfully';
          feedback.type = 'success';
      }
    } else {
      feedback.error = {
        message: error.message,
        code: error.code || 'UNKNOWN_ERROR',
        type: error.constructor.name
      };

      if (error instanceof ValidationError) {
        feedback.message = `Invalid input: ${error.message}`;
        feedback.type = 'validation_error';
        feedback.field = error.field;
      } else if (error instanceof NotFoundError) {
        feedback.message = `Not found: ${error.message}`;
        feedback.type = 'not_found_error';
      } else if (error instanceof DuplicateError) {
        feedback.message = `Duplicate meeting: ${error.message}`;
        feedback.type = 'duplicate_error';
      } else {
        feedback.message = `Failed to ${operation.replace(/([A-Z])/g, ' $1').toLowerCase()}: ${error.message}`;
        feedback.type = 'error';
      }
    }

    return feedback;
  }

  /**
   * Validate date/time format and constraints
   * @param {string} dateTime - ISO string of the date/time
   * @param {string} fieldName - Name of the field for error reporting
   * @param {boolean} allowPast - Whether to allow past dates
   * @returns {Date} Parsed and validated date
   */
  static _validateDateTime(dateTime, fieldName = 'dateTime', allowPast = false) {
    if (!dateTime) {
      throw new ValidationError(`${fieldName} is required`, fieldName);
    }

    if (typeof dateTime !== 'string') {
      throw new ValidationError(`${fieldName} must be a string`, fieldName);
    }

    // Parse the date/time
    const parsedDate = new Date(dateTime);
    if (isNaN(parsedDate.getTime())) {
      throw new ValidationError(`Invalid ${fieldName} format. Expected ISO string.`, fieldName);
    }

    // Check if date is too far in the future (more than 2 years)
    const twoYearsFromNow = new Date();
    twoYearsFromNow.setFullYear(twoYearsFromNow.getFullYear() + 2);
    if (parsedDate > twoYearsFromNow) {
      throw new ValidationError(`${fieldName} cannot be more than 2 years in the future`, fieldName);
    }

    // Check if date is in the past (with buffer)
    if (!allowPast) {
      const now = new Date();
      const fiveMinutesAgo = new Date(now.getTime() - (5 * 60 * 1000));
      if (parsedDate < fiveMinutesAgo) {
        throw new ValidationError(`${fieldName} cannot be in the past`, fieldName);
      }
    }

    return parsedDate;
  }

  /**
   * Validate team member ID and ensure team member exists
   * @param {string} teamMemberId - ID of the team member
   * @param {string} fieldName - Name of the field for error reporting
   * @returns {Promise<Object>} Team member object
   */
  static async _validateTeamMember(teamMemberId, fieldName = 'teamMemberId') {
    if (!teamMemberId) {
      throw new ValidationError(`${fieldName} is required`, fieldName);
    }

    if (typeof teamMemberId !== 'string') {
      throw new ValidationError(`${fieldName} must be a string`, fieldName);
    }

    const teamMember = await TeamMember.get(teamMemberId);
    if (!teamMember) {
      throw new NotFoundError('Team member not found', 'TeamMember', teamMemberId);
    }

    return teamMember;
  }

  /**
   * Validate calendar event ID and ensure event exists
   * @param {string} eventId - ID of the calendar event
   * @param {boolean} mustBeOneOnOne - Whether the event must be a 1:1 meeting
   * @param {string} fieldName - Name of the field for error reporting
   * @returns {Promise<Object>} Calendar event object
   */
  static async _validateCalendarEvent(eventId, mustBeOneOnOne = true, fieldName = 'eventId') {
    if (!eventId) {
      throw new ValidationError(`${fieldName} is required`, fieldName);
    }

    if (typeof eventId !== 'string') {
      throw new ValidationError(`${fieldName} must be a string`, fieldName);
    }

    const calendarEvent = await CalendarEvent.get(eventId);
    if (!calendarEvent) {
      throw new NotFoundError('Calendar event not found', 'CalendarEvent', eventId);
    }

    if (mustBeOneOnOne && calendarEvent.event_type !== 'one_on_one') {
      throw new ValidationError('Event is not a 1:1 meeting', 'eventType');
    }

    return calendarEvent;
  }

  /**
   * Check for duplicate calendar events for a team member on a specific date
   * @param {string} teamMemberId - ID of the team member
   * @param {Date} date - Date to check for duplicates
   * @param {string} excludeEventId - Event ID to exclude from duplicate check
   * @returns {Promise<Object|null>} Duplicate event if found, null otherwise
   */
  static async _checkForDuplicateEvents(teamMemberId, date, excludeEventId = null) {
    if (!teamMemberId || !date) {
      return null;
    }

    try {
      const existingEvents = await this.getOneOnOneMeetingsForTeamMember(teamMemberId);
      const dateString = date.toDateString();
      
      const duplicateEvent = existingEvents.find(event => {
        if (excludeEventId && event.id === excludeEventId) {
          return false; // Skip the excluded event
        }
        const eventDate = new Date(event.start_date);
        return eventDate.toDateString() === dateString;
      });
      
      return duplicateEvent || null;
    } catch (error) {
      console.warn('Error checking for duplicate events:', error);
      return null;
    }
  }

  /**
   * Validate OneOnOne record and ensure it exists
   * @param {string} oneOnOneId - ID of the OneOnOne record
   * @param {string} fieldName - Name of the field for error reporting
   * @returns {Promise<Object>} OneOnOne record object
   */
  static async _validateOneOnOne(oneOnOneId, fieldName = 'oneOnOneId') {
    if (!oneOnOneId) {
      throw new ValidationError(`${fieldName} is required`, fieldName);
    }

    if (typeof oneOnOneId !== 'string') {
      throw new ValidationError(`${fieldName} must be a string`, fieldName);
    }

    const oneOnOnes = await OneOnOne.list();
    const oneOnOne = oneOnOnes.find(o => o.id === oneOnOneId);
    
    if (!oneOnOne) {
      throw new NotFoundError('OneOnOne record not found', 'OneOnOne', oneOnOneId);
    }

    return oneOnOne;
  }

  /**
   * Validate meeting duration
   * @param {number} durationMinutes - Duration in minutes
   * @param {string} fieldName - Name of the field for error reporting
   * @returns {number} Validated duration
   */
  static _validateDuration(durationMinutes, fieldName = 'durationMinutes') {
    if (durationMinutes === null || durationMinutes === undefined) {
      return 30; // Default duration
    }

    if (typeof durationMinutes !== 'number') {
      throw new ValidationError(`${fieldName} must be a number`, fieldName);
    }

    if (durationMinutes <= 0) {
      throw new ValidationError(`${fieldName} must be greater than 0`, fieldName);
    }

    if (durationMinutes > 480) { // 8 hours max
      throw new ValidationError(`${fieldName} cannot exceed 8 hours (480 minutes)`, fieldName);
    }

    return durationMinutes;
  }

  /**
   * Comprehensive data consistency check for calendar events and OneOnOne records
   * @param {Object} options - Validation options
   * @returns {Promise<Object>} Validation results with detailed findings
   */
  static async validateDataConsistency(options = {}) {
    const {
      fixInconsistencies = false,
      includeOrphanedEvents = true,
      includeMissingLinks = true,
      includeInvalidData = true
    } = options;

    try {
      console.log('Starting comprehensive data consistency validation...');
      
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
        fixes: {
          applied: [],
          failed: []
        },
        summary: {
          isConsistent: true,
          totalIssues: 0,
          fixesApplied: 0,
          fixesFailed: 0
        }
      };

      // Get all data
      const [oneOnOneEvents, oneOnOnes, teamMembers] = await Promise.all([
        this.getOneOnOneMeetings(),
        OneOnOne.list(),
        TeamMember.list()
      ]);

      results.totalEventsChecked = oneOnOneEvents.length;
      results.totalOneOnOnesChecked = oneOnOnes.length;

      // Check for orphaned calendar events
      if (includeOrphanedEvents) {
        const validEventIds = new Set(
          oneOnOnes
            .filter(o => o.next_meeting_calendar_event_id)
            .map(o => o.next_meeting_calendar_event_id)
        );

        for (const event of oneOnOneEvents) {
          const isOrphaned = !validEventIds.has(event.id) && 
                           (!event.linked_entity_id || !oneOnOnes.find(o => o.id === event.linked_entity_id));
          
          if (isOrphaned) {
            results.inconsistencies.orphanedEvents.push({
              eventId: event.id,
              title: event.title,
              teamMemberId: event.team_member_id,
              startDate: event.start_date,
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

          if (oneOnOne.next_meeting_calendar_event_id) {
            const referencedEvent = oneOnOneEvents.find(e => e.id === oneOnOne.next_meeting_calendar_event_id);
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
          const teamMember = teamMembers.find(tm => tm.id === event.team_member_id);
          if (!teamMember) {
            issues.push('Team member not found');
          } else {
            // Check title format
            const expectedTitle = this.generateOneOnOneTitle(teamMember.name);
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

          if (issues.length > 0) {
            results.inconsistencies.invalidData.push({
              eventId: event.id,
              title: event.title,
              teamMemberId: event.team_member_id,
              issues
            });
          }
        }
      }

      // Check for duplicate events
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
          results.inconsistencies.duplicateEvents.push({
            key,
            teamMemberId: events[0].team_member_id,
            date: new Date(events[0].start_date).toDateString(),
            events: events.map(e => ({ id: e.id, title: e.title })),
            count: events.length
          });
        }
      }

      // Calculate summary
      const allInconsistencies = [
        ...results.inconsistencies.orphanedEvents,
        ...results.inconsistencies.missingLinks,
        ...results.inconsistencies.invalidData,
        ...results.inconsistencies.duplicateEvents,
        ...results.inconsistencies.brokenReferences
      ];

      results.summary.totalIssues = allInconsistencies.length;
      results.summary.isConsistent = allInconsistencies.length === 0;

      // Apply fixes if requested
      if (fixInconsistencies && allInconsistencies.length > 0) {
        console.log(`Attempting to fix ${allInconsistencies.length} inconsistencies...`);
        
        // Fix orphaned events by deleting them
        for (const orphaned of results.inconsistencies.orphanedEvents) {
          try {
            await this.deleteOneOnOneMeeting(orphaned.eventId);
            results.fixes.applied.push({
              type: 'orphaned_event_deleted',
              eventId: orphaned.eventId,
              title: orphaned.title
            });
          } catch (error) {
            results.fixes.failed.push({
              type: 'orphaned_event_deletion_failed',
              eventId: orphaned.eventId,
              error: error.message
            });
          }
        }

        // Fix broken references by clearing them
        for (const broken of results.inconsistencies.brokenReferences) {
          try {
            await OneOnOne.update(broken.oneOnOneId, {
              next_meeting_calendar_event_id: null
            });
            results.fixes.applied.push({
              type: 'broken_reference_cleared',
              oneOnOneId: broken.oneOnOneId,
              referencedEventId: broken.referencedEventId
            });
          } catch (error) {
            results.fixes.failed.push({
              type: 'broken_reference_fix_failed',
              oneOnOneId: broken.oneOnOneId,
              error: error.message
            });
          }
        }

        results.summary.fixesApplied = results.fixes.applied.length;
        results.summary.fixesFailed = results.fixes.failed.length;
      }

      console.log('Data consistency validation completed:', {
        totalIssues: results.summary.totalIssues,
        isConsistent: results.summary.isConsistent,
        fixesApplied: results.summary.fixesApplied
      });

      return results;
    } catch (error) {
      console.error('Error during data consistency validation:', error);
      throw new OperationError(
        `Data consistency validation failed: ${error.message}`,
        'validateDataConsistency',
        error
      );
    }
  }
  /**
   * Create a calendar event for a 1:1 meeting
   * @param {string} teamMemberId - ID of the team member
   * @param {string} teamMemberName - Name of the team member
   * @param {string} dateTime - ISO string of the meeting date/time
   * @param {number} durationMinutes - Duration in minutes (default: 30)
   * @returns {Promise<Object>} Created calendar event
   */
  static async createOneOnOneMeeting(teamMemberId, teamMemberName, dateTime, durationMinutes = 30) {
    const operation = 'createOneOnOneMeeting';
    
    try {
      // Enhanced input validation
      if (!teamMemberId) {
        throw new ValidationError('Team member ID is required', 'teamMemberId');
      }
      if (!teamMemberName || typeof teamMemberName !== 'string' || teamMemberName.trim().length === 0) {
        throw new ValidationError('Team member name is required and must be a non-empty string', 'teamMemberName');
      }
      if (!dateTime) {
        throw new ValidationError('Date/time is required', 'dateTime');
      }
      if (durationMinutes && (typeof durationMinutes !== 'number' || durationMinutes <= 0)) {
        throw new ValidationError('Duration must be a positive number', 'durationMinutes');
      }

      // Validate team member exists
      const teamMember = await TeamMember.get(teamMemberId);
      if (!teamMember) {
        throw new NotFoundError('Team member not found', 'TeamMember', teamMemberId);
      }

      // Parse and validate date/time
      const startDate = new Date(dateTime);
      if (isNaN(startDate.getTime())) {
        throw new ValidationError('Invalid date/time format. Expected ISO string.', 'dateTime');
      }

      // Validate date is not in the past (with 5 minute buffer)
      const now = new Date();
      const fiveMinutesAgo = new Date(now.getTime() - (5 * 60 * 1000));
      if (startDate < fiveMinutesAgo) {
        throw new ValidationError('Meeting date cannot be in the past', 'dateTime');
      }

      // Check for duplicate events on the same date
      const existingEvents = await this.getOneOnOneMeetingsForTeamMember(teamMemberId);
      const sameDate = existingEvents.find(event => {
        const eventDate = new Date(event.start_date);
        return eventDate.toDateString() === startDate.toDateString();
      });
      
      if (sameDate) {
        throw new DuplicateError(
          `A 1:1 meeting already exists for ${teamMemberName} on ${startDate.toDateString()}`,
          { existingEventId: sameDate.id, date: startDate.toDateString() }
        );
      }

      // Calculate end time
      const endDate = new Date(startDate.getTime() + (durationMinutes * 60 * 1000));

      // Generate event title in required format
      const title = this.generateOneOnOneTitle(teamMemberName);

      // Create calendar event with retry mechanism
      const calendarEvent = await this._retryOperation(async () => {
        return await CalendarEvent.create({
          title,
          description: `1:1 meeting with ${teamMemberName}`,
          start_date: startDate.toISOString(),
          end_date: endDate.toISOString(),
          all_day: false,
          location: null,
          event_type: 'one_on_one',
          team_member_id: teamMemberId,
          linked_entity_type: 'one_on_one',
          linked_entity_id: null // Will be set when linking to OneOnOne record
        });
      }, 3, `create calendar event for ${teamMemberName}`);

      console.log(`Successfully created calendar event: ${title} (${calendarEvent.id})`);
      return calendarEvent;
    } catch (error) {
      if (error instanceof CalendarServiceError) {
        throw error;
      }
      
      const wrappedError = new OperationError(
        `Failed to create 1:1 meeting calendar event: ${error.message}`,
        operation,
        error
      );
      console.error('Error creating 1:1 meeting calendar event:', wrappedError);
      throw wrappedError;
    }
  }

  /**
   * Update an existing 1:1 meeting calendar event
   * @param {string} eventId - ID of the calendar event to update
   * @param {string} dateTime - New ISO string of the meeting date/time
   * @param {number} durationMinutes - Duration in minutes (default: 30)
   * @returns {Promise<Object>} Updated calendar event
   */
  static async updateOneOnOneMeeting(eventId, dateTime, durationMinutes = 30) {
    const operation = 'updateOneOnOneMeeting';
    
    try {
      // Enhanced input validation
      if (!eventId) {
        throw new ValidationError('Event ID is required', 'eventId');
      }
      if (!dateTime) {
        throw new ValidationError('Date/time is required', 'dateTime');
      }
      if (durationMinutes && (typeof durationMinutes !== 'number' || durationMinutes <= 0)) {
        throw new ValidationError('Duration must be a positive number', 'durationMinutes');
      }

      // Verify the calendar event exists and is a 1:1 meeting
      const existingEvent = await CalendarEvent.get(eventId);
      if (!existingEvent) {
        throw new NotFoundError('Calendar event not found', 'CalendarEvent', eventId);
      }
      
      if (existingEvent.event_type !== 'one_on_one') {
        throw new ValidationError('Event is not a 1:1 meeting', 'eventType');
      }

      // Parse and validate new date/time
      const startDate = new Date(dateTime);
      if (isNaN(startDate.getTime())) {
        throw new ValidationError('Invalid date/time format. Expected ISO string.', 'dateTime');
      }

      // Validate date is not in the past (with 5 minute buffer)
      const now = new Date();
      const fiveMinutesAgo = new Date(now.getTime() - (5 * 60 * 1000));
      if (startDate < fiveMinutesAgo) {
        throw new ValidationError('Meeting date cannot be in the past', 'dateTime');
      }

      // Check for conflicts with other meetings for the same team member
      if (existingEvent.team_member_id) {
        const teamMemberEvents = await this.getOneOnOneMeetingsForTeamMember(existingEvent.team_member_id);
        const conflictingEvent = teamMemberEvents.find(event => {
          if (event.id === eventId) return false; // Skip the current event
          const eventDate = new Date(event.start_date);
          return eventDate.toDateString() === startDate.toDateString();
        });
        
        if (conflictingEvent) {
          throw new DuplicateError(
            `Another 1:1 meeting already exists on ${startDate.toDateString()}`,
            { conflictingEventId: conflictingEvent.id, date: startDate.toDateString() }
          );
        }
      }

      // Calculate new end time
      const endDate = new Date(startDate.getTime() + (durationMinutes * 60 * 1000));

      // Update the calendar event with retry mechanism
      const updatedEvent = await this._retryOperation(async () => {
        return await CalendarEvent.update(eventId, {
          start_date: startDate.toISOString(),
          end_date: endDate.toISOString()
        });
      }, 3, `update calendar event ${eventId}`);

      console.log(`Successfully updated calendar event: ${existingEvent.title} (${eventId})`);
      return updatedEvent;
    } catch (error) {
      if (error instanceof CalendarServiceError) {
        throw error;
      }
      
      const wrappedError = new OperationError(
        `Failed to update 1:1 meeting calendar event: ${error.message}`,
        operation,
        error
      );
      console.error('Error updating 1:1 meeting calendar event:', wrappedError);
      throw wrappedError;
    }
  }

  /**
   * Delete a 1:1 meeting calendar event
   * @param {string} eventId - ID of the calendar event to delete
   * @returns {Promise<boolean>} Success status
   */
  static async deleteOneOnOneMeeting(eventId) {
    const operation = 'deleteOneOnOneMeeting';
    
    try {
      // Enhanced input validation
      if (!eventId) {
        throw new ValidationError('Event ID is required', 'eventId');
      }

      // Verify the calendar event exists and is a 1:1 meeting
      const existingEvent = await CalendarEvent.get(eventId);
      if (!existingEvent) {
        throw new NotFoundError('Calendar event not found', 'CalendarEvent', eventId);
      }
      
      if (existingEvent.event_type !== 'one_on_one') {
        throw new ValidationError('Event is not a 1:1 meeting', 'eventType');
      }

      // Delete the calendar event with retry mechanism
      await this._retryOperation(async () => {
        await CalendarEvent.delete(eventId);
      }, 3, `delete calendar event ${eventId}`);

      console.log(`Successfully deleted calendar event: ${existingEvent.title} (${eventId})`);
      return true;
    } catch (error) {
      if (error instanceof CalendarServiceError) {
        throw error;
      }
      
      const wrappedError = new OperationError(
        `Failed to delete 1:1 meeting calendar event: ${error.message}`,
        operation,
        error
      );
      console.error('Error deleting 1:1 meeting calendar event:', wrappedError);
      throw wrappedError;
    }
  }

  /**
   * Get all 1:1 meeting calendar events
   * @returns {Promise<Array>} Array of 1:1 meeting calendar events
   */
  static async getOneOnOneMeetings() {
    try {
      const allEvents = await CalendarEvent.list();
      
      // Filter for 1:1 meeting events
      const oneOnOneMeetings = allEvents.filter(event => 
        event.event_type === 'one_on_one'
      );

      return oneOnOneMeetings;
    } catch (error) {
      console.error('Error fetching 1:1 meeting calendar events:', error);
      throw error;
    }
  }

  /**
   * Link a OneOnOne record to a CalendarEvent
   * @param {string} oneOnOneId - ID of the OneOnOne record
   * @param {string} calendarEventId - ID of the CalendarEvent
   * @returns {Promise<Object>} Updated OneOnOne record
   */
  static async linkMeetingToCalendarEvent(oneOnOneId, calendarEventId) {
    try {
      if (!oneOnOneId || !calendarEventId) {
        throw new Error('OneOnOne ID and Calendar Event ID are required');
      }

      // Update the OneOnOne record with the calendar event ID
      const updatedOneOnOne = await OneOnOne.update(oneOnOneId, {
        next_meeting_calendar_event_id: calendarEventId
      });

      // Update the calendar event with the OneOnOne ID
      await CalendarEvent.update(calendarEventId, {
        linked_entity_id: oneOnOneId
      });

      return updatedOneOnOne;
    } catch (error) {
      console.error('Error linking OneOnOne to CalendarEvent:', error);
      throw error;
    }
  }

  /**
   * Create a calendar event and link it to a OneOnOne record
   * @param {string} oneOnOneId - ID of the OneOnOne record
   * @param {string} teamMemberId - ID of the team member
   * @param {string} dateTime - ISO string of the meeting date/time
   * @param {number} durationMinutes - Duration in minutes (default: 30)
   * @returns {Promise<Object>} Object containing both the calendar event and updated OneOnOne record
   */
  static async createAndLinkOneOnOneMeeting(oneOnOneId, teamMemberId, dateTime, durationMinutes = 30) {
    const operation = 'createAndLinkOneOnOneMeeting';
    
    try {
      // Enhanced validation using validation utilities
      const oneOnOne = await this._validateOneOnOne(oneOnOneId);
      const teamMember = await this._validateTeamMember(teamMemberId);
      const validatedDate = this._validateDateTime(dateTime);
      const validatedDuration = this._validateDuration(durationMinutes);

      // Ensure team member IDs match between OneOnOne and provided teamMemberId
      if (oneOnOne.team_member_id !== teamMemberId) {
        throw new ValidationError(
          'Team member ID mismatch between OneOnOne record and provided team member ID',
          'teamMemberId'
        );
      }

      // Check for duplicate events
      const duplicateEvent = await this._checkForDuplicateEvents(teamMemberId, validatedDate);
      if (duplicateEvent) {
        throw new DuplicateError(
          `A 1:1 meeting already exists for ${teamMember.name} on ${validatedDate.toDateString()}`,
          { existingEventId: duplicateEvent.id, date: validatedDate.toDateString() }
        );
      }

      // Create the calendar event
      const calendarEvent = await this.createOneOnOneMeeting(
        teamMemberId, 
        teamMember.name, 
        dateTime, 
        validatedDuration
      );

      // Link the OneOnOne record to the calendar event
      const updatedOneOnOne = await this.linkMeetingToCalendarEvent(oneOnOneId, calendarEvent.id);

      console.log(`Successfully created and linked 1:1 meeting: ${teamMember.name} (${calendarEvent.id})`);
      return {
        calendarEvent,
        oneOnOne: updatedOneOnOne
      };
    } catch (error) {
      if (error instanceof CalendarServiceError) {
        throw error;
      }
      
      const wrappedError = new OperationError(
        `Failed to create and link 1:1 meeting: ${error.message}`,
        operation,
        error
      );
      console.error('Error creating and linking 1:1 meeting:', wrappedError);
      throw wrappedError;
    }
  }

  /**
   * Generate proper title format for 1:1 meetings
   * @param {string} teamMemberName - Name of the team member
   * @returns {string} Formatted title
   */
  static generateOneOnOneTitle(teamMemberName) {
    if (!teamMemberName) {
      throw new Error('Team member name is required');
    }
    return `${teamMemberName} 1:1`;
  }

  /**
   * Get calendar events for a specific team member
   * @param {string} teamMemberId - ID of the team member
   * @returns {Promise<Array>} Array of calendar events for the team member
   */
  static async getOneOnOneMeetingsForTeamMember(teamMemberId) {
    try {
      if (!teamMemberId) {
        throw new Error('Team member ID is required');
      }

      const allEvents = await CalendarEvent.list();
      
      // Filter for 1:1 meeting events for the specific team member
      const teamMemberMeetings = allEvents.filter(event => 
        event.event_type === 'one_on_one' && event.team_member_id === teamMemberId
      );

      return teamMemberMeetings;
    } catch (error) {
      console.error('Error fetching 1:1 meetings for team member:', error);
      throw error;
    }
  }

  /**
   * Update calendar event when OneOnOne next_meeting_date changes
   * @param {string} oneOnOneId - ID of the OneOnOne record
   * @param {string} newDateTime - New ISO string of the meeting date/time
   * @param {number} durationMinutes - Duration in minutes (default: 30)
   * @returns {Promise<Object>} Updated calendar event or newly created event
   */
  static async updateOneOnOneCalendarEvent(oneOnOneId, newDateTime, durationMinutes = 30) {
    try {
      if (!oneOnOneId || !newDateTime) {
        throw new Error('OneOnOne ID and new date/time are required');
      }

      // Get the OneOnOne record
      const oneOnOnes = await OneOnOne.list();
      const oneOnOne = oneOnOnes.find(o => o.id === oneOnOneId);
      
      if (!oneOnOne) {
        throw new Error('OneOnOne record not found');
      }

      // Clean up any existing calendar event first
      if (oneOnOne.next_meeting_calendar_event_id) {
        try {
          const updatedEvent = await this.updateOneOnOneMeeting(
            oneOnOne.next_meeting_calendar_event_id, 
            newDateTime, 
            durationMinutes
          );
          return updatedEvent;
        } catch (error) {
          // If the calendar event doesn't exist anymore, clean up the reference
          console.warn('Existing calendar event not found, cleaning up reference and creating new one');
          await OneOnOne.update(oneOnOneId, {
            next_meeting_calendar_event_id: null
          });
        }
      }

      // Before creating a new event, check for any orphaned events for this team member
      await this.cleanupDuplicateEventsForTeamMember(oneOnOne.team_member_id, newDateTime);

      // Create a new calendar event and link it
      const result = await this.createAndLinkOneOnOneMeeting(
        oneOnOneId, 
        oneOnOne.team_member_id, 
        newDateTime, 
        durationMinutes
      );

      return result.calendarEvent;
    } catch (error) {
      console.error('Error updating OneOnOne calendar event:', error);
      throw error;
    }
  }

  /**
   * Clean up duplicate calendar events for a specific team member and date
   * @param {string} teamMemberId - ID of the team member
   * @param {string} dateTime - ISO string of the meeting date/time
   * @returns {Promise<Object>} Cleanup results
   */
  static async cleanupDuplicateEventsForTeamMember(teamMemberId, dateTime) {
    try {
      if (!teamMemberId || !dateTime) {
        return { cleanedCount: 0, errors: [] };
      }

      // Get all calendar events for this team member
      const teamMemberEvents = await this.getOneOnOneMeetingsForTeamMember(teamMemberId);
      
      // Parse the target date for comparison
      const targetDate = new Date(dateTime);
      const targetDateStr = targetDate.toDateString();
      
      // Find events on the same date
      const duplicateEvents = teamMemberEvents.filter(event => {
        const eventDate = new Date(event.start_date);
        return eventDate.toDateString() === targetDateStr;
      });

      let cleanedCount = 0;
      const errors = [];

      // If there are multiple events on the same date, keep only the most recent one
      if (duplicateEvents.length > 1) {
        // Sort by creation time (assuming newer events have higher IDs or use created_at if available)
        const sortedEvents = duplicateEvents.sort((a, b) => {
          // If there's a created_at field, use it; otherwise use ID comparison
          if (a.created_at && b.created_at) {
            return new Date(b.created_at) - new Date(a.created_at);
          }
          return b.id - a.id;
        });

        // Delete all but the first (most recent) event
        const eventsToDelete = sortedEvents.slice(1);
        
        for (const eventToDelete of eventsToDelete) {
          try {
            await this.deleteOneOnOneMeeting(eventToDelete.id);
            cleanedCount++;
            console.log(`Cleaned up duplicate calendar event: ${eventToDelete.title} (${eventToDelete.id})`);
          } catch (error) {
            errors.push({
              eventId: eventToDelete.id,
              title: eventToDelete.title,
              error: error.message
            });
            console.error(`Failed to delete duplicate event ${eventToDelete.id}:`, error);
          }
        }
      }

      return {
        cleanedCount,
        errors,
        duplicatesFound: duplicateEvents.length,
        success: errors.length === 0
      };
    } catch (error) {
      console.error('Error during duplicate event cleanup:', error);
      return {
        cleanedCount: 0,
        errors: [{ error: error.message }],
        duplicatesFound: 0,
        success: false
      };
    }
  }

  /**
   * Remove calendar event link from OneOnOne when meeting is deleted
   * @param {string} oneOnOneId - ID of the OneOnOne record
   * @returns {Promise<boolean>} Success status
   */
  static async unlinkCalendarEventFromOneOnOne(oneOnOneId) {
    try {
      if (!oneOnOneId) {
        throw new Error('OneOnOne ID is required');
      }

      // Get the OneOnOne record
      const oneOnOnes = await OneOnOne.list();
      const oneOnOne = oneOnOnes.find(o => o.id === oneOnOneId);
      
      if (!oneOnOne) {
        throw new Error('OneOnOne record not found');
      }

      // If there's a linked calendar event, delete it
      if (oneOnOne.next_meeting_calendar_event_id) {
        try {
          await this.deleteOneOnOneMeeting(oneOnOne.next_meeting_calendar_event_id);
        } catch (error) {
          console.warn('Calendar event already deleted or not found');
        }
      }

      // Remove the calendar event ID from the OneOnOne record
      await OneOnOne.update(oneOnOneId, {
        next_meeting_calendar_event_id: null
      });

      return true;
    } catch (error) {
      console.error('Error unlinking calendar event from OneOnOne:', error);
      throw error;
    }
  }

  /**
   * Clean up orphaned calendar events that don't have corresponding OneOnOne records
   * @returns {Promise<Object>} Cleanup results with counts of processed and cleaned events
   */
  static async cleanupOrphanedCalendarEvents() {
    try {
      console.log('Starting cleanup of orphaned calendar events...');
      
      // Get all 1:1 calendar events
      const oneOnOneEvents = await this.getOneOnOneMeetings();
      
      // Get all OneOnOne records
      const oneOnOnes = await OneOnOne.list();
      
      // Create a set of valid calendar event IDs from OneOnOne records
      const validEventIds = new Set(
        oneOnOnes
          .filter(oneOnOne => oneOnOne.next_meeting_calendar_event_id)
          .map(oneOnOne => oneOnOne.next_meeting_calendar_event_id)
      );
      
      // Find orphaned events (calendar events that aren't linked to any OneOnOne)
      const orphanedEvents = oneOnOneEvents.filter(event => 
        !validEventIds.has(event.id) && 
        (!event.linked_entity_id || !oneOnOnes.find(o => o.id === event.linked_entity_id))
      );
      
      let cleanedCount = 0;
      const errors = [];
      
      // Delete orphaned events
      for (const orphanedEvent of orphanedEvents) {
        try {
          await this.deleteOneOnOneMeeting(orphanedEvent.id);
          cleanedCount++;
          console.log(`Cleaned up orphaned calendar event: ${orphanedEvent.title} (${orphanedEvent.id})`);
        } catch (error) {
          errors.push({
            eventId: orphanedEvent.id,
            title: orphanedEvent.title,
            error: error.message
          });
          console.error(`Failed to delete orphaned event ${orphanedEvent.id}:`, error);
        }
      }
      
      const results = {
        totalProcessed: oneOnOneEvents.length,
        orphanedFound: orphanedEvents.length,
        cleanedCount,
        errors,
        success: errors.length === 0
      };
      
      console.log('Cleanup completed:', results);
      return results;
    } catch (error) {
      console.error('Error during calendar event cleanup:', error);
      throw error;
    }
  }

  /**
   * Validate that calendar events match their corresponding OneOnOne records
   * @returns {Promise<Object>} Validation results with inconsistencies found
   */
  static async validateCalendarEventConsistency() {
    try {
      console.log('Starting calendar event consistency validation...');
      
      // Get all 1:1 calendar events and OneOnOne records
      const oneOnOneEvents = await this.getOneOnOneMeetings();
      const oneOnOnes = await OneOnOne.list();
      const teamMembers = await TeamMember.list();
      
      const inconsistencies = [];
      let validatedCount = 0;
      
      // Check each calendar event
      for (const event of oneOnOneEvents) {
        validatedCount++;
        const issues = [];
        
        // Check if team member exists
        const teamMember = teamMembers.find(tm => tm.id === event.team_member_id);
        if (!teamMember) {
          issues.push('Team member not found');
        } else {
          // Check if title format is correct
          const expectedTitle = this.generateOneOnOneTitle(teamMember.name);
          if (event.title !== expectedTitle) {
            issues.push(`Title mismatch: expected "${expectedTitle}", got "${event.title}"`);
          }
        }
        
        // Check if linked OneOnOne record exists and is consistent
        if (event.linked_entity_id) {
          const linkedOneOnOne = oneOnOnes.find(o => o.id === event.linked_entity_id);
          if (!linkedOneOnOne) {
            issues.push('Linked OneOnOne record not found');
          } else {
            // Check if OneOnOne points back to this calendar event
            if (linkedOneOnOne.next_meeting_calendar_event_id !== event.id) {
              issues.push('OneOnOne record does not reference this calendar event');
            }
            
            // Check if team member IDs match
            if (linkedOneOnOne.team_member_id !== event.team_member_id) {
              issues.push('Team member ID mismatch between calendar event and OneOnOne record');
            }
          }
        }
        
        // Check if event type is correct
        if (event.event_type !== 'one_on_one') {
          issues.push(`Incorrect event type: expected "one_on_one", got "${event.event_type}"`);
        }
        
        // Check if linked entity type is correct
        if (event.linked_entity_type !== 'one_on_one') {
          issues.push(`Incorrect linked entity type: expected "one_on_one", got "${event.linked_entity_type}"`);
        }
        
        if (issues.length > 0) {
          inconsistencies.push({
            eventId: event.id,
            title: event.title,
            teamMemberId: event.team_member_id,
            linkedEntityId: event.linked_entity_id,
            issues
          });
        }
      }
      
      // Check OneOnOne records that reference non-existent calendar events
      for (const oneOnOne of oneOnOnes) {
        if (oneOnOne.next_meeting_calendar_event_id) {
          const referencedEvent = oneOnOneEvents.find(e => e.id === oneOnOne.next_meeting_calendar_event_id);
          if (!referencedEvent) {
            inconsistencies.push({
              oneOnOneId: oneOnOne.id,
              teamMemberId: oneOnOne.team_member_id,
              referencedEventId: oneOnOne.next_meeting_calendar_event_id,
              issues: ['OneOnOne references non-existent calendar event']
            });
          }
        }
      }
      
      const results = {
        totalEventsValidated: validatedCount,
        totalOneOnOnesChecked: oneOnOnes.length,
        inconsistenciesFound: inconsistencies.length,
        inconsistencies,
        isValid: inconsistencies.length === 0
      };
      
      console.log('Validation completed:', results);
      return results;
    } catch (error) {
      console.error('Error during calendar event validation:', error);
      throw error;
    }
  }

  /**
   * Batch operation to create multiple calendar events
   * @param {Array} meetingData - Array of meeting data objects
   * @returns {Promise<Object>} Results of batch creation
   */
  static async batchCreateOneOnOneMeetings(meetingData) {
    try {
      if (!Array.isArray(meetingData) || meetingData.length === 0) {
        throw new Error('Meeting data array is required and must not be empty');
      }
      
      console.log(`Starting batch creation of ${meetingData.length} calendar events...`);
      
      const results = {
        total: meetingData.length,
        successful: [],
        failed: [],
        errors: []
      };
      
      for (const meeting of meetingData) {
        try {
          // Validate required fields
          if (!meeting.teamMemberId || !meeting.teamMemberName || !meeting.dateTime) {
            throw new Error('teamMemberId, teamMemberName, and dateTime are required');
          }
          
          const calendarEvent = await this.createOneOnOneMeeting(
            meeting.teamMemberId,
            meeting.teamMemberName,
            meeting.dateTime,
            meeting.durationMinutes || 30
          );
          
          // If oneOnOneId is provided, link the records
          if (meeting.oneOnOneId) {
            await this.linkMeetingToCalendarEvent(meeting.oneOnOneId, calendarEvent.id);
          }
          
          results.successful.push({
            teamMemberId: meeting.teamMemberId,
            teamMemberName: meeting.teamMemberName,
            calendarEventId: calendarEvent.id,
            oneOnOneId: meeting.oneOnOneId
          });
          
        } catch (error) {
          results.failed.push({
            teamMemberId: meeting.teamMemberId,
            teamMemberName: meeting.teamMemberName,
            error: error.message
          });
          results.errors.push(error);
        }
      }
      
      console.log(`Batch creation completed: ${results.successful.length} successful, ${results.failed.length} failed`);
      return results;
    } catch (error) {
      console.error('Error during batch calendar event creation:', error);
      throw error;
    }
  }

  /**
   * Batch operation to update multiple calendar events
   * @param {Array} updateData - Array of update data objects
   * @returns {Promise<Object>} Results of batch update
   */
  static async batchUpdateOneOnOneMeetings(updateData) {
    try {
      if (!Array.isArray(updateData) || updateData.length === 0) {
        throw new Error('Update data array is required and must not be empty');
      }
      
      console.log(`Starting batch update of ${updateData.length} calendar events...`);
      
      const results = {
        total: updateData.length,
        successful: [],
        failed: [],
        errors: []
      };
      
      for (const update of updateData) {
        try {
          // Validate required fields
          if (!update.eventId || !update.dateTime) {
            throw new Error('eventId and dateTime are required');
          }
          
          const updatedEvent = await this.updateOneOnOneMeeting(
            update.eventId,
            update.dateTime,
            update.durationMinutes || 30
          );
          
          results.successful.push({
            eventId: update.eventId,
            newDateTime: update.dateTime,
            updatedEvent
          });
          
        } catch (error) {
          results.failed.push({
            eventId: update.eventId,
            error: error.message
          });
          results.errors.push(error);
        }
      }
      
      console.log(`Batch update completed: ${results.successful.length} successful, ${results.failed.length} failed`);
      return results;
    } catch (error) {
      console.error('Error during batch calendar event update:', error);
      throw error;
    }
  }

  /**
   * Batch operation to delete multiple calendar events
   * @param {Array} eventIds - Array of calendar event IDs to delete
   * @returns {Promise<Object>} Results of batch deletion
   */
  static async batchDeleteOneOnOneMeetings(eventIds) {
    try {
      if (!Array.isArray(eventIds) || eventIds.length === 0) {
        throw new Error('Event IDs array is required and must not be empty');
      }
      
      console.log(`Starting batch deletion of ${eventIds.length} calendar events...`);
      
      const results = {
        total: eventIds.length,
        successful: [],
        failed: [],
        errors: []
      };
      
      for (const eventId of eventIds) {
        try {
          if (!eventId) {
            throw new Error('Event ID is required');
          }
          
          await this.deleteOneOnOneMeeting(eventId);
          results.successful.push(eventId);
          
        } catch (error) {
          results.failed.push({
            eventId,
            error: error.message
          });
          results.errors.push(error);
        }
      }
      
      console.log(`Batch deletion completed: ${results.successful.length} successful, ${results.failed.length} failed`);
      return results;
    } catch (error) {
      console.error('Error during batch calendar event deletion:', error);
      throw error;
    }
  }

  /**
   * Clean up all duplicate calendar events across all team members
   * @returns {Promise<Object>} Cleanup results
   */
  static async cleanupAllDuplicateEvents() {
    try {
      console.log('Starting cleanup of all duplicate calendar events...');
      
      // Get all 1:1 calendar events
      const oneOnOneEvents = await this.getOneOnOneMeetings();
      
      // Group events by team member and date
      const eventsByMemberAndDate = {};
      
      for (const event of oneOnOneEvents) {
        const eventDate = new Date(event.start_date).toDateString();
        const key = `${event.team_member_id}-${eventDate}`;
        
        if (!eventsByMemberAndDate[key]) {
          eventsByMemberAndDate[key] = [];
        }
        eventsByMemberAndDate[key].push(event);
      }
      
      let totalCleaned = 0;
      const errors = [];
      
      // Clean up duplicates for each team member/date combination
      for (const [key, events] of Object.entries(eventsByMemberAndDate)) {
        if (events.length > 1) {
          console.log(`Found ${events.length} duplicate events for ${key}`);
          
          // Sort by creation time (keep the most recent)
          const sortedEvents = events.sort((a, b) => {
            if (a.created_at && b.created_at) {
              return new Date(b.created_at) - new Date(a.created_at);
            }
            return b.id - a.id;
          });
          
          // Delete all but the first (most recent) event
          const eventsToDelete = sortedEvents.slice(1);
          
          for (const eventToDelete of eventsToDelete) {
            try {
              await this.deleteOneOnOneMeeting(eventToDelete.id);
              totalCleaned++;
              console.log(`Cleaned up duplicate: ${eventToDelete.title} (${eventToDelete.id})`);
            } catch (error) {
              errors.push({
                eventId: eventToDelete.id,
                title: eventToDelete.title,
                error: error.message
              });
              console.error(`Failed to delete duplicate event ${eventToDelete.id}:`, error);
            }
          }
        }
      }
      
      const results = {
        totalProcessed: oneOnOneEvents.length,
        duplicateGroupsFound: Object.values(eventsByMemberAndDate).filter(events => events.length > 1).length,
        totalCleaned,
        errors,
        success: errors.length === 0
      };
      
      console.log('Duplicate cleanup completed:', results);
      return results;
    } catch (error) {
      console.error('Error during duplicate cleanup:', error);
      throw error;
    }
  }

  /**
   * Comprehensive maintenance operation that cleans up and validates calendar events
   * @param {Object} options - Maintenance options
   * @returns {Promise<Object>} Complete maintenance results
   */
  static async performMaintenance(options = {}) {
    try {
      console.log('Starting comprehensive calendar event maintenance...');
      
      const results = {
        timestamp: new Date().toISOString(),
        cleanup: null,
        validation: null,
        success: false,
        errors: []
      };
      
      // Perform cleanup if requested (default: true)
      if (options.cleanup !== false) {
        try {
          results.cleanup = await this.cleanupOrphanedCalendarEvents();
        } catch (error) {
          results.errors.push(`Cleanup failed: ${error.message}`);
        }
      }
      
      // Perform validation if requested (default: true)
      if (options.validate !== false) {
        try {
          results.validation = await this.validateCalendarEventConsistency();
        } catch (error) {
          results.errors.push(`Validation failed: ${error.message}`);
        }
      }
      
      // Determine overall success
      results.success = results.errors.length === 0 && 
                       (results.cleanup?.success !== false) && 
                       (results.validation?.isValid !== false);
      
      console.log('Maintenance completed:', {
        success: results.success,
        cleanupPerformed: !!results.cleanup,
        validationPerformed: !!results.validation,
        errorsCount: results.errors.length
      });
      
      return results;
    } catch (error) {
      console.error('Error during calendar event maintenance:', error);
      throw error;
    }
  }
}

export default CalendarService;