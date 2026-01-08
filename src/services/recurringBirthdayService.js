// src/services/recurringBirthdayService.js
// Service for handling automatic yearly birthday event generation

import { CalendarEvent, TeamMember } from '../api/entities.js';
import { 
  ErrorHandlingService, 
  ValidationError, 
  DataError,
  NetworkError 
} from './errorHandlingService.js';

/**
 * Service for managing recurring birthday events
 * Handles automatic yearly birthday event generation, updates, and cleanup
 */
export class RecurringBirthdayService {
  /**
   * Generate birthday events for a team member across multiple years
   * @param {Object} teamMember - Team member object with birthday information
   * @param {number} startYear - Starting year for event generation
   * @param {number} endYear - Ending year for event generation (inclusive)
   * @returns {Promise<Array>} Array of created birthday calendar events
   */
  static async generateBirthdayEventsForYears(teamMember, startYear, endYear) {
    const operationName = 'Birthday Event Generation';
    
    return ErrorHandlingService.wrapOperation(async () => {
      // Validate parameters
      ErrorHandlingService.validateParams({ teamMember, startYear, endYear }, {
        teamMember: { 
          required: true, 
          type: 'object',
          custom: (value) => value && value.id && value.name,
          customMessage: 'Team member must have id and name fields'
        },
        startYear: { 
          required: true, 
          type: 'number',
          custom: (value) => value > 1900 && value < 3000,
          customMessage: 'Start year must be a valid year'
        },
        endYear: { 
          required: true, 
          type: 'number',
          custom: (value) => value > 1900 && value < 3000,
          customMessage: 'End year must be a valid year'
        }
      });

      if (!teamMember.birthday) {
        console.log(`Team member ${teamMember.name} has no birthday date set`);
        return [];
      }

      // Validate year parameters
      if (startYear > endYear) {
        throw new ValidationError('Start year must be less than or equal to end year', 'startYear', startYear);
      }

      // Parse the birthday date
      const birthdayDate = new Date(teamMember.birthday);
      if (isNaN(birthdayDate.getTime())) {
        throw new ValidationError(
          `Invalid birthday date for team member ${teamMember.name}: ${teamMember.birthday}`,
          'birthday',
          teamMember.birthday
        );
      }

      const createdEvents = [];

      // Generate birthday events for each year in the range
      for (let year = startYear; year <= endYear; year++) {
        try {
          // Check if birthday event already exists for this team member and year
          const existingEvents = await ErrorHandlingService.retryOperation(
            () => CalendarEvent.getBirthdayEvents(),
            {
              maxRetries: 2,
              baseDelay: 500,
              operationName: `load birthday events for ${teamMember.name}`,
              shouldRetry: (error, attempt) => {
                // Don't retry validation errors
                if (error instanceof ValidationError) {
                  return false;
                }
                // Don't retry if it's a persistent data error
                if (error instanceof DataError && attempt > 1) {
                  return false;
                }
                // Retry network and temporary errors
                return error instanceof NetworkError || 
                       error.message?.includes('network') ||
                       error.message?.includes('timeout');
              }
            }
          );
          
          // Defensive check: ensure existingEvents is an array
          const eventsArray = Array.isArray(existingEvents) ? existingEvents : [];
          
          const existingBirthdayEvent = eventsArray.find(event => {
            // Defensive checks for event object
            if (!event || typeof event !== 'object') {
              return false;
            }
            
            if (event.team_member_id !== teamMember.id) {
              return false;
            }
            
            try {
              const eventYear = new Date(event.start_date).getFullYear();
              return eventYear === year;
            } catch (error) {
              console.warn('Error parsing event date:', event.start_date, error);
              return false;
            }
          });

          if (existingBirthdayEvent) {
            console.log(`Birthday event already exists for ${teamMember.name} in ${year}`);
            continue;
          }

          // Create birthday event for this year
          const birthdayThisYear = new Date(year, birthdayDate.getMonth(), birthdayDate.getDate());
          
          const birthdayEvent = await ErrorHandlingService.retryOperation(
            () => CalendarEvent.create({
              title: `🎂 ${teamMember.name}'s Birthday`,
              description: `Birthday celebration for ${teamMember.name}`,
              start_date: birthdayThisYear.toISOString(),
              end_date: birthdayThisYear.toISOString(),
              all_day: true,
              location: null,
              event_type: 'birthday',
              team_member_id: teamMember.id,
              linked_entity_type: 'team_member',
              linked_entity_id: teamMember.id,
              recurrence: {
                type: 'yearly',
                interval: 1
              }
            }),
            {
              maxRetries: 2,
              baseDelay: 1000,
              backoffMultiplier: 1.5,
              operationName: `create birthday event for ${teamMember.name} in ${year}`,
              shouldRetry: (error, attempt) => {
                // Don't retry validation errors
                if (error instanceof ValidationError) {
                  return false;
                }
                // Don't retry duplicate errors
                if (error.message?.includes('duplicate') || error.message?.includes('already exists')) {
                  return false;
                }
                // Retry network and temporary errors
                return error instanceof NetworkError || 
                       error.message?.includes('network') ||
                       error.message?.includes('timeout') ||
                       error.message?.includes('server error');
              },
              onRetry: (error, attempt, delay) => {
                console.warn(`Retrying birthday event creation for ${teamMember.name} in ${year}, attempt ${attempt}, delay ${delay}ms`);
              }
            }
          );

          createdEvents.push(birthdayEvent);
          console.log(`Created birthday event for ${teamMember.name} in ${year}: ${birthdayEvent.id}`);
        } catch (error) {
          const errorResult = ErrorHandlingService.handleError(error, {
            operation: `create birthday event for ${teamMember.name} in ${year}`,
            showToast: false, // Don't show individual toast for each failure
            context: { teamMemberId: teamMember.id, year }
          });
          
          // Continue with other years even if one fails
          console.error(`Error creating birthday event for ${teamMember.name} in ${year}:`, errorResult);
        }
      }

      return createdEvents;
    }, {
      operationName,
      showLoading: false, // Individual operations don't need loading indicators
      showSuccess: false, // Will be handled by the calling function
      successMessage: null, // Will be handled by the calling function
      retryOptions: {
        maxRetries: 0 // Don't retry the entire operation, individual steps have their own retry logic
      },
      errorOptions: {
        severity: ErrorHandlingService.SEVERITY.MEDIUM,
        context: { teamMemberId: teamMember?.id, startYear, endYear }
      }
    });
  }

  /**
   * Update birthday events for a team member when their birthday date changes
   * This method deletes existing future birthday events and regenerates them with the new date
   * @param {string} teamMemberId - ID of the team member
   * @param {string} newBirthdayDate - New birthday date in ISO format
   * @returns {Promise<void>}
   */
  static async updateBirthdayEventsForTeamMember(teamMemberId, newBirthdayDate) {
    const operationName = 'Update Birthday Events';
    
    return ErrorHandlingService.wrapOperation(async () => {
      // Validate parameters
      ErrorHandlingService.validateParams({ teamMemberId, newBirthdayDate }, {
        teamMemberId: { required: true, type: 'string' },
        newBirthdayDate: { required: true, type: 'string' }
      });

      // Validate the new birthday date
      const birthdayDate = new Date(newBirthdayDate);
      if (isNaN(birthdayDate.getTime())) {
        throw new ValidationError(`Invalid birthday date: ${newBirthdayDate}`, 'newBirthdayDate', newBirthdayDate);
      }

      // Get the team member with error handling
      const teamMember = await ErrorHandlingService.retryOperation(
        () => TeamMember.get(teamMemberId),
        {
          operationName: `load team member ${teamMemberId}`,
          maxRetries: 2,
          baseDelay: 500,
          shouldRetry: (error, attempt) => {
            // Don't retry not found errors
            if (error instanceof DataError && error.entityType === 'TeamMember') {
              return false;
            }
            // Retry network errors
            return error instanceof NetworkError || 
                   error.message?.includes('network') ||
                   error.message?.includes('timeout');
          }
        }
      );
      
      if (!teamMember) {
        throw new DataError(`Team member not found: ${teamMemberId}`, 'TeamMember', teamMemberId);
      }

      // Get all existing birthday events for this team member with error handling
      const allBirthdayEvents = await ErrorHandlingService.retryOperation(
        () => CalendarEvent.getBirthdayEvents(),
        {
          operationName: 'load birthday events',
          maxRetries: 2,
          baseDelay: 500,
          shouldRetry: (error, attempt) => {
            // Don't retry validation errors
            if (error instanceof ValidationError) {
              return false;
            }
            // Retry network and temporary errors
            return error instanceof NetworkError || 
                   error.message?.includes('network') ||
                   error.message?.includes('timeout');
          }
        }
      );
      
      // Defensive check: ensure allBirthdayEvents is an array
      const eventsArray = Array.isArray(allBirthdayEvents) ? allBirthdayEvents : [];
      
      const memberBirthdayEvents = eventsArray.filter(event => {
        // Defensive checks for event object
        if (!event || typeof event !== 'object') {
          return false;
        }
        return event.team_member_id === teamMemberId;
      });

      const currentYear = new Date().getFullYear();
      const futureEvents = memberBirthdayEvents.filter(event => {
        // Defensive checks for event date
        if (!event || !event.start_date) {
          return false;
        }
        
        try {
          const eventYear = new Date(event.start_date).getFullYear();
          return !isNaN(eventYear) && eventYear >= currentYear;
        } catch (error) {
          console.warn('Error parsing event date:', event.start_date, error);
          return false;
        }
      });

      // Delete all future birthday events for this team member
      const deletionResults = [];
      for (const event of futureEvents) {
        try {
          await ErrorHandlingService.retryOperation(
            () => CalendarEvent.delete(event.id),
            {
              operationName: `delete birthday event ${event.id}`,
              maxRetries: 2,
              baseDelay: 500,
              shouldRetry: (error, attempt) => {
                // Don't retry validation errors
                if (error instanceof ValidationError) {
                  return false;
                }
                // Don't retry not found errors (already deleted)
                if (error instanceof DataError && error.code === 'NOT_FOUND') {
                  return false;
                }
                // Retry network and temporary errors
                return error instanceof NetworkError || 
                       error.message?.includes('network') ||
                       error.message?.includes('timeout');
              }
            }
          );
          
          deletionResults.push({ eventId: event.id, success: true });
          console.log(`Deleted existing birthday event ${event.id} for ${teamMember.name}`);
        } catch (error) {
          deletionResults.push({ eventId: event.id, success: false, error: error.message });
          console.error(`Error deleting birthday event ${event.id}:`, error);
          // Continue with other deletions
        }
      }

      // Update the team member's birthday date
      const updatedTeamMember = { ...teamMember, birthday: newBirthdayDate };

      // Regenerate birthday events for current year and next 2 years
      const endYear = currentYear + 2;
      const newEvents = await this.generateBirthdayEventsForYears(updatedTeamMember, currentYear, endYear);

      console.log(`Updated birthday events for ${teamMember.name} with new date: ${newBirthdayDate}`);
      
      return {
        teamMember: updatedTeamMember,
        deletedEvents: deletionResults.filter(r => r.success).length,
        createdEvents: newEvents.length,
        errors: deletionResults.filter(r => !r.success)
      };
    }, {
      operationName,
      showLoading: true,
      showSuccess: true,
      successMessage: `Updated birthday events for team member`,
      retryOptions: {
        maxRetries: 1 // Don't retry the entire operation
      },
      errorOptions: {
        severity: ErrorHandlingService.SEVERITY.MEDIUM,
        context: { teamMemberId, newBirthdayDate }
      }
    });
  }

  /**
   * Delete all birthday events for a team member when they are removed
   * @param {string} teamMemberId - ID of the team member to delete events for
   * @returns {Promise<Object>} Deletion results
   */
  static async deleteBirthdayEventsForTeamMember(teamMemberId) {
    const operationName = 'Delete Birthday Events';
    
    return ErrorHandlingService.wrapOperation(async () => {
      // Validate parameters
      ErrorHandlingService.validateParams({ teamMemberId }, {
        teamMemberId: { required: true, type: 'string' }
      });

      // Get all birthday events for this team member with error handling
      const allBirthdayEvents = await ErrorHandlingService.retryOperation(
        () => CalendarEvent.getBirthdayEvents(),
        {
          operationName: 'load birthday events for deletion',
          maxRetries: 2
        }
      );
      
      const memberBirthdayEvents = allBirthdayEvents.filter(event => 
        event.team_member_id === teamMemberId
      );

      if (memberBirthdayEvents.length === 0) {
        console.log(`No birthday events found for team member ${teamMemberId}`);
        return {
          deletedCount: 0,
          errorCount: 0,
          errors: []
        };
      }

      // Delete all birthday events for this team member
      const deletionResults = [];
      for (const event of memberBirthdayEvents) {
        try {
          await ErrorHandlingService.retryOperation(
            () => CalendarEvent.delete(event.id),
            {
              operationName: `delete birthday event ${event.id}`,
              maxRetries: 2,
              baseDelay: 500,
              shouldRetry: (error, attempt) => {
                // Don't retry validation errors
                if (error instanceof ValidationError) {
                  return false;
                }
                // Don't retry not found errors (already deleted)
                if (error instanceof DataError && error.code === 'NOT_FOUND') {
                  return false;
                }
                // Retry network and temporary errors
                return error instanceof NetworkError || 
                       error.message?.includes('network') ||
                       error.message?.includes('timeout');
              }
            }
          );
          
          deletionResults.push({ eventId: event.id, success: true });
          console.log(`Deleted birthday event ${event.id} for team member ${teamMemberId}`);
        } catch (error) {
          const errorResult = ErrorHandlingService.handleError(error, {
            operation: `delete birthday event ${event.id}`,
            showToast: false,
            context: { eventId: event.id, teamMemberId }
          });
          
          deletionResults.push({ 
            eventId: event.id, 
            success: false, 
            error: errorResult.userMessage 
          });
        }
      }

      const successCount = deletionResults.filter(result => result.success).length;
      const failureCount = deletionResults.filter(result => !result.success).length;
      const failedEvents = deletionResults.filter(result => !result.success);

      console.log(`Birthday event deletion completed for team member ${teamMemberId}: ${successCount} successful, ${failureCount} failed`);

      if (failureCount > 0) {
        console.warn('Some birthday events could not be deleted:', failedEvents);
      }

      return {
        deletedCount: successCount,
        errorCount: failureCount,
        errors: failedEvents,
        totalEvents: memberBirthdayEvents.length
      };
    }, {
      operationName,
      showLoading: true,
      showSuccess: true,
      successMessage: `Deleted birthday events for team member`,
      retryOptions: {
        maxRetries: 1 // Don't retry the entire operation
      },
      errorOptions: {
        severity: ErrorHandlingService.SEVERITY.MEDIUM,
        context: { teamMemberId }
      }
    });
  }

  /**
   * Ensure birthday events exist for all team members with birthdays
   * This method checks for missing birthday events and creates them for specified years
   * @param {Array} teamMembers - Array of team member objects (optional, will fetch if not provided)
   * @param {Array} targetYears - Array of years to ensure events exist for (default: current + next 2 years)
   * @returns {Promise<Object>} Summary of operations performed
   */
  static async ensureBirthdayEventsExist(teamMembers = null, targetYears = null) {
    const operationName = 'Ensure Birthday Events Exist';
    
    return ErrorHandlingService.wrapOperation(async () => {
      // Get team members if not provided
      if (!teamMembers) {
        teamMembers = await ErrorHandlingService.retryOperation(
          () => TeamMember.list(),
          {
            operationName: 'load team members for birthday sync',
            maxRetries: 2,
            baseDelay: 500,
            shouldRetry: (error, attempt) => {
              // Don't retry validation errors
              if (error instanceof ValidationError) {
                return false;
              }
              // Retry network and temporary errors
              return error instanceof NetworkError || 
                     error.message?.includes('network') ||
                     error.message?.includes('timeout');
            }
          }
        );
      }

      // Set default target years if not provided
      if (!targetYears) {
        const currentYear = new Date().getFullYear();
        targetYears = [currentYear, currentYear + 1, currentYear + 2];
      }

      const results = {
        timestamp: new Date().toISOString(),
        processedMembers: 0,
        createdEvents: 0,
        skippedMembers: 0,
        errors: [],
        summary: {}
      };

      // Defensive check: ensure teamMembers is an array
      const membersArray = Array.isArray(teamMembers) ? teamMembers : [];
      
      // Filter team members who have birthdays with defensive checks
      const membersWithBirthdays = membersArray.filter(member => {
        // Defensive checks for member object
        if (!member || typeof member !== 'object') {
          return false;
        }
        return member.birthday && typeof member.birthday === 'string';
      });
      
      results.processedMembers = membersWithBirthdays.length;
      results.skippedMembers = membersArray.length - membersWithBirthdays.length;

      // Process each team member with individual error handling
      for (const teamMember of membersWithBirthdays) {
        try {
          // Defensive check: ensure targetYears is an array
          const yearsArray = Array.isArray(targetYears) ? targetYears : [];
          
          for (const year of yearsArray) {
            // Defensive check: ensure year is a valid number
            if (typeof year !== 'number' || isNaN(year)) {
              console.warn('Invalid year in targetYears:', year);
              continue;
            }
            
            const createdEvents = await this.generateBirthdayEventsForYears(
              teamMember, 
              year, 
              year
            );
            
            // Defensive check: ensure createdEvents is an array
            const eventsArray = Array.isArray(createdEvents) ? createdEvents : [];
            results.createdEvents += eventsArray.length;
          }
        } catch (error) {
          const errorResult = ErrorHandlingService.handleError(error, {
            operation: `ensure birthday events for ${teamMember.name}`,
            showToast: false,
            context: { teamMemberId: teamMember.id, targetYears }
          });
          
          results.errors.push({
            teamMemberId: teamMember.id,
            teamMemberName: teamMember.name,
            error: errorResult.userMessage,
            category: errorResult.category
          });
        }
      }

      results.summary = {
        totalTeamMembers: teamMembers.length,
        membersWithBirthdays: membersWithBirthdays.length,
        membersWithoutBirthdays: results.skippedMembers,
        targetYears: targetYears,
        eventsCreated: results.createdEvents,
        errorsEncountered: results.errors.length,
        successRate: results.processedMembers > 0 ? 
          ((results.processedMembers - results.errors.length) / results.processedMembers * 100).toFixed(1) + '%' : 
          '100%'
      };

      console.log('Birthday event synchronization completed:', results.summary);
      return results;
    }, {
      operationName,
      showLoading: false, // Don't show loading for background operations
      showSuccess: false, // Don't show success for background operations
      retryOptions: {
        maxRetries: 1
      },
      errorOptions: {
        severity: ErrorHandlingService.SEVERITY.MEDIUM,
        context: { targetYears, teamMemberCount: teamMembers?.length }
      }
    });
  }

  /**
   * Get all birthday events for a specific team member
   * @param {string} teamMemberId - ID of the team member
   * @returns {Promise<Array>} Array of birthday events for the team member
   */
  static async getBirthdayEventsForTeamMember(teamMemberId) {
    try {
      if (!teamMemberId) {
        throw new Error('Team member ID is required');
      }

      const allBirthdayEvents = await CalendarEvent.getBirthdayEvents();
      return allBirthdayEvents.filter(event => event.team_member_id === teamMemberId);
    } catch (error) {
      console.error('Error getting birthday events for team member:', error);
      throw new Error(`Failed to get birthday events for team member: ${error.message}`);
    }
  }

  /**
   * Check for duplicate birthday events and remove them
   * This method ensures only one birthday event exists per team member per year
   * @returns {Promise<Object>} Summary of duplicate removal operations
   */
  static async removeDuplicateBirthdayEvents() {
    try {
      const allBirthdayEvents = await CalendarEvent.getBirthdayEvents();
      
      // Group events by team member and year
      const eventsByMemberAndYear = {};
      
      for (const event of allBirthdayEvents) {
        const year = new Date(event.start_date).getFullYear();
        const key = `${event.team_member_id}-${year}`;
        
        if (!eventsByMemberAndYear[key]) {
          eventsByMemberAndYear[key] = [];
        }
        eventsByMemberAndYear[key].push(event);
      }

      const results = {
        timestamp: new Date().toISOString(),
        duplicatesFound: 0,
        duplicatesRemoved: 0,
        errors: []
      };

      // Find and remove duplicates
      for (const [key, events] of Object.entries(eventsByMemberAndYear)) {
        if (events.length > 1) {
          results.duplicatesFound += events.length - 1;
          
          // Keep the first event, delete the rest
          const eventsToDelete = events.slice(1);
          
          for (const event of eventsToDelete) {
            try {
              await CalendarEvent.delete(event.id);
              results.duplicatesRemoved++;
              console.log(`Removed duplicate birthday event ${event.id} for ${key}`);
            } catch (error) {
              results.errors.push({
                eventId: event.id,
                key: key,
                error: error.message
              });
              console.error(`Error removing duplicate birthday event ${event.id}:`, error);
            }
          }
        }
      }

      console.log('Duplicate birthday event removal completed:', {
        duplicatesFound: results.duplicatesFound,
        duplicatesRemoved: results.duplicatesRemoved,
        errors: results.errors.length
      });

      return results;
    } catch (error) {
      console.error('Error removing duplicate birthday events:', error);
      throw new Error(`Failed to remove duplicate birthday events: ${error.message}`);
    }
  }
}

export default RecurringBirthdayService;