// src/services/calendarEventGenerationService.js
// Service for generating calendar events from various data sources

import { CalendarEvent, TeamMember, OutOfOffice, Duty } from '../api/entities.js';

/**
 * Service for generating calendar events from team member data, duties, and out-of-office periods
 */
export class CalendarEventGenerationService {
  /**
   * Generate birthday calendar events from team member data
   * @param {Array} teamMembers - Array of team member objects
   * @param {number} year - Year to generate birthday events for (default: current year)
   * @returns {Promise<Array>} Array of created birthday calendar events
   */
  static async generateBirthdayEvents(teamMembers = null, year = new Date().getFullYear()) {
    try {
      // Get team members if not provided
      if (!teamMembers) {
        teamMembers = await TeamMember.list();
      }

      const birthdayEvents = [];

      for (const teamMember of teamMembers) {
        if (!teamMember.birthday) {
          continue; // Skip team members without birthday data
        }

        try {
          // Parse the birthday date
          const birthdayDate = new Date(teamMember.birthday);
          if (isNaN(birthdayDate.getTime())) {
            console.warn(`Invalid birthday date for team member ${teamMember.name}: ${teamMember.birthday}`);
            continue;
          }

          // Create birthday event for the specified year
          const birthdayThisYear = new Date(year, birthdayDate.getMonth(), birthdayDate.getDate());
          
          // Check if birthday event already exists for this team member and year
          const existingEvents = await CalendarEvent.getBirthdayEvents();
          const existingBirthdayEvent = existingEvents.find(event => 
            event.team_member_id === teamMember.id && 
            new Date(event.start_date).getFullYear() === year
          );

          if (existingBirthdayEvent) {
            console.log(`Birthday event already exists for ${teamMember.name} in ${year}`);
            continue;
          }

          // Create the birthday calendar event
          const birthdayEvent = await CalendarEvent.create({
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
          });

          birthdayEvents.push(birthdayEvent);
          console.log(`Created birthday event for ${teamMember.name}: ${birthdayEvent.id}`);
        } catch (error) {
          console.error(`Error creating birthday event for ${teamMember.name}:`, error);
        }
      }

      return birthdayEvents;
    } catch (error) {
      console.error('Error generating birthday events:', error);
      throw new Error(`Failed to generate birthday events: ${error.message}`);
    }
  }

  /**
   * Convert duty assignment to calendar event
   * @param {Object} duty - Duty object
   * @param {boolean} forceCreate - Force creation of new event even if one exists
   * @returns {Promise<Object>} Created calendar event
   */
  static async convertDutyToCalendarEvent(duty, forceCreate = false) {
    try {
      if (!duty) {
        throw new Error('Duty object is required');
      }

      // Validate required duty fields
      if (!duty.id || !duty.team_member_id || !duty.title || !duty.start_date || !duty.end_date) {
        throw new Error('Duty object missing required fields: id, team_member_id, title, start_date, end_date');
      }

      // Get team member information
      const teamMember = await TeamMember.get(duty.team_member_id);
      if (!teamMember) {
        throw new Error(`Team member not found: ${duty.team_member_id}`);
      }

      // Check if calendar event already exists for this duty
      if (!forceCreate) {
        const existingEvents = await CalendarEvent.getByDutyId(duty.id);
        if (existingEvents.length > 0) {
          console.log(`Calendar event already exists for duty ${duty.id}`);
          return existingEvents[0];
        }
      }

      // Create duty type icon mapping
      const dutyIcons = {
        'devops': '⚙️',
        'on_call': '📞',
        'other': '🛡️'
      };

      const icon = dutyIcons[duty.type] || '🛡️';

      // Create the duty calendar event
      const dutyEvent = await CalendarEvent.createDutyEvent(
        duty.id,
        duty.team_member_id,
        `${icon} ${duty.title} - ${teamMember.name}`,
        duty.start_date,
        duty.end_date,
        duty.description || `${duty.type} duty assignment for ${teamMember.name}`
      );

      console.log(`Created calendar event for duty ${duty.title}: ${dutyEvent.id}`);
      return dutyEvent;
    } catch (error) {
      console.error('Error converting duty to calendar event:', error);
      throw new Error(`Failed to convert duty to calendar event: ${error.message}`);
    }
  }

  /**
   * Convert out-of-office period to calendar event
   * @param {Object} outOfOffice - OutOfOffice object
   * @param {boolean} forceCreate - Force creation of new event even if one exists
   * @returns {Promise<Object>} Created calendar event
   */
  static async convertOutOfOfficeToCalendarEvent(outOfOffice, forceCreate = false) {
    try {
      if (!outOfOffice) {
        throw new Error('OutOfOffice object is required');
      }

      // Validate required out-of-office fields
      if (!outOfOffice.id || !outOfOffice.team_member_id || !outOfOffice.start_date || !outOfOffice.end_date) {
        throw new Error('OutOfOffice object missing required fields: id, team_member_id, start_date, end_date');
      }

      // Get team member information
      const teamMember = await TeamMember.get(outOfOffice.team_member_id);
      if (!teamMember) {
        throw new Error(`Team member not found: ${outOfOffice.team_member_id}`);
      }

      // Check if calendar event already exists for this out-of-office period
      if (!forceCreate) {
        const existingEvents = await CalendarEvent.getByOutOfOfficeId(outOfOffice.id);
        if (existingEvents.length > 0) {
          console.log(`Calendar event already exists for out-of-office ${outOfOffice.id}`);
          return existingEvents[0];
        }
      }

      // Create out-of-office type icon mapping
      const oooIcons = {
        'vacation': '🏖️',
        'sick': '🤒',
        'personal': '👤',
        'conference': '🎤',
        'training': '📚',
        'other': '📅'
      };

      const icon = oooIcons[outOfOffice.type] || '📅';
      const typeLabel = outOfOffice.type ? outOfOffice.type.charAt(0).toUpperCase() + outOfOffice.type.slice(1) : 'Out of Office';

      // Create the out-of-office calendar event
      const oooEvent = await CalendarEvent.createOutOfOfficeEvent(
        outOfOffice.id,
        outOfOffice.team_member_id,
        teamMember.name,
        outOfOffice.start_date,
        outOfOffice.end_date,
        outOfOffice.type || 'other'
      );

      console.log(`Created calendar event for out-of-office ${teamMember.name}: ${oooEvent.id}`);
      return oooEvent;
    } catch (error) {
      console.error('Error converting out-of-office to calendar event:', error);
      throw new Error(`Failed to convert out-of-office to calendar event: ${error.message}`);
    }
  }

  /**
   * Generate all calendar events from duties
   * @param {Array} duties - Array of duty objects (optional, will fetch if not provided)
   * @returns {Promise<Array>} Array of created calendar events
   */
  static async generateDutyEvents(duties = null) {
    try {
      // Get duties if not provided
      if (!duties) {
        duties = await Duty.list();
      }

      const dutyEvents = [];

      for (const duty of duties) {
        try {
          const dutyEvent = await this.convertDutyToCalendarEvent(duty);
          dutyEvents.push(dutyEvent);
        } catch (error) {
          console.error(`Error generating calendar event for duty ${duty.id}:`, error);
        }
      }

      return dutyEvents;
    } catch (error) {
      console.error('Error generating duty events:', error);
      throw new Error(`Failed to generate duty events: ${error.message}`);
    }
  }

  /**
   * Generate all calendar events from out-of-office periods
   * @param {Array} outOfOfficeRecords - Array of out-of-office objects (optional, will fetch if not provided)
   * @returns {Promise<Array>} Array of created calendar events
   */
  static async generateOutOfOfficeEvents(outOfOfficeRecords = null) {
    try {
      // Get out-of-office records if not provided
      if (!outOfOfficeRecords) {
        outOfOfficeRecords = await OutOfOffice.list();
      }

      const oooEvents = [];

      for (const outOfOffice of outOfOfficeRecords) {
        try {
          const oooEvent = await this.convertOutOfOfficeToCalendarEvent(outOfOffice);
          oooEvents.push(oooEvent);
        } catch (error) {
          console.error(`Error generating calendar event for out-of-office ${outOfOffice.id}:`, error);
        }
      }

      return oooEvents;
    } catch (error) {
      console.error('Error generating out-of-office events:', error);
      throw new Error(`Failed to generate out-of-office events: ${error.message}`);
    }
  }

  /**
   * Synchronize all calendar events with their source data
   * This method ensures all duties, out-of-office periods, and birthdays have corresponding calendar events
   * @param {Object} options - Synchronization options
   * @returns {Promise<Object>} Synchronization results
   */
  static async synchronizeAllEvents(options = {}) {
    const {
      includeBirthdays = true,
      includeDuties = true,
      includeOutOfOffice = true,
      year = new Date().getFullYear()
    } = options;

    try {
      const results = {
        timestamp: new Date().toISOString(),
        birthdayEvents: [],
        dutyEvents: [],
        outOfOfficeEvents: [],
        errors: [],
        summary: {
          totalCreated: 0,
          totalErrors: 0
        }
      };

      // Generate birthday events
      if (includeBirthdays) {
        try {
          const teamMembers = await TeamMember.list();
          const birthdayEvents = await this.generateBirthdayEvents(teamMembers, year);
          results.birthdayEvents = birthdayEvents;
          results.summary.totalCreated += birthdayEvents.length;
        } catch (error) {
          results.errors.push({
            type: 'birthday_generation',
            message: error.message
          });
          results.summary.totalErrors++;
        }
      }

      // Generate duty events
      if (includeDuties) {
        try {
          const dutyEvents = await this.generateDutyEvents();
          results.dutyEvents = dutyEvents;
          results.summary.totalCreated += dutyEvents.length;
        } catch (error) {
          results.errors.push({
            type: 'duty_generation',
            message: error.message
          });
          results.summary.totalErrors++;
        }
      }

      // Generate out-of-office events
      if (includeOutOfOffice) {
        try {
          const oooEvents = await this.generateOutOfOfficeEvents();
          results.outOfOfficeEvents = oooEvents;
          results.summary.totalCreated += oooEvents.length;
        } catch (error) {
          results.errors.push({
            type: 'out_of_office_generation',
            message: error.message
          });
          results.summary.totalErrors++;
        }
      }

      console.log('Calendar event synchronization completed:', {
        totalCreated: results.summary.totalCreated,
        totalErrors: results.summary.totalErrors
      });

      return results;
    } catch (error) {
      console.error('Error during calendar event synchronization:', error);
      throw new Error(`Failed to synchronize calendar events: ${error.message}`);
    }
  }

  /**
   * Update calendar event when source data changes
   * @param {string} sourceType - Type of source data ('duty', 'out_of_office', 'team_member')
   * @param {string} sourceId - ID of the source record
   * @param {Object} sourceData - Updated source data
   * @returns {Promise<Object|null>} Updated calendar event or null if not found
   */
  static async updateCalendarEventFromSource(sourceType, sourceId, sourceData) {
    try {
      let calendarEvent = null;

      switch (sourceType) {
        case 'duty':
          // Find existing calendar event for this duty
          const dutyEvents = await CalendarEvent.getByDutyId(sourceId);
          if (dutyEvents.length > 0) {
            // Delete existing event and create new one with updated data
            await CalendarEvent.delete(dutyEvents[0].id);
            calendarEvent = await this.convertDutyToCalendarEvent(sourceData, true);
          }
          break;

        case 'out_of_office':
          // Find existing calendar event for this out-of-office period
          const oooEvents = await CalendarEvent.getByOutOfOfficeId(sourceId);
          if (oooEvents.length > 0) {
            // Delete existing event and create new one with updated data
            await CalendarEvent.delete(oooEvents[0].id);
            calendarEvent = await this.convertOutOfOfficeToCalendarEvent(sourceData, true);
          }
          break;

        case 'team_member':
          // Handle birthday updates
          if (sourceData.birthday) {
            const birthdayEvents = await this.generateBirthdayEvents([sourceData]);
            calendarEvent = birthdayEvents.length > 0 ? birthdayEvents[0] : null;
          }
          break;

        default:
          throw new Error(`Unsupported source type: ${sourceType}`);
      }

      return calendarEvent;
    } catch (error) {
      console.error(`Error updating calendar event from ${sourceType} source:`, error);
      throw new Error(`Failed to update calendar event from ${sourceType}: ${error.message}`);
    }
  }

  /**
   * Delete calendar events when source data is deleted
   * @param {string} sourceType - Type of source data ('duty', 'out_of_office', 'team_member')
   * @param {string} sourceId - ID of the deleted source record
   * @returns {Promise<boolean>} Success status
   */
  static async deleteCalendarEventsForSource(sourceType, sourceId) {
    try {
      let eventsToDelete = [];

      switch (sourceType) {
        case 'duty':
          eventsToDelete = await CalendarEvent.getByDutyId(sourceId);
          break;

        case 'out_of_office':
          eventsToDelete = await CalendarEvent.getByOutOfOfficeId(sourceId);
          break;

        case 'team_member':
          // Delete all events for this team member
          const allEvents = await CalendarEvent.list();
          eventsToDelete = allEvents.filter(event => event.team_member_id === sourceId);
          break;

        default:
          throw new Error(`Unsupported source type: ${sourceType}`);
      }

      // Delete all found events
      for (const event of eventsToDelete) {
        try {
          await CalendarEvent.delete(event.id);
          console.log(`Deleted calendar event ${event.id} for ${sourceType} ${sourceId}`);
        } catch (error) {
          console.error(`Error deleting calendar event ${event.id}:`, error);
        }
      }

      return true;
    } catch (error) {
      console.error(`Error deleting calendar events for ${sourceType} source:`, error);
      throw new Error(`Failed to delete calendar events for ${sourceType}: ${error.message}`);
    }
  }
}

export default CalendarEventGenerationService;