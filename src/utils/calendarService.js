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
      console.error('Error creating and linking 1:1 meeting:', error);
      throw error;
    }
  }
}