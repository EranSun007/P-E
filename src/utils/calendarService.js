// src/utils/calendarService.js
// Calendar service for managing 1:1 meeting events

import { CalendarEvent, OneOnOne, TeamMember } from '../api/entities.js';

/**
 * Service for managing calendar events related to 1:1 meetings
 */
export class CalendarService {
  /**
   * Create a calendar event for a 1:1 meeting
   * @param {string} teamMemberId - ID of the team member
   * @param {string} teamMemberName - Name of the team member
   * @param {string} dateTime - ISO string of the meeting date/time
   * @param {number} durationMinutes - Duration in minutes (default: 30)
   * @returns {Promise<Object>} Created calendar event
   */
  static async createOneOnOneMeeting(teamMemberId, teamMemberName, dateTime, durationMinutes = 30) {
    try {
      // Validate inputs
      if (!teamMemberId || !teamMemberName || !dateTime) {
        throw new Error('Team member ID, name, and date/time are required');
      }

      // Parse the date/time
      const startDate = new Date(dateTime);
      if (isNaN(startDate.getTime())) {
        throw new Error('Invalid date/time format');
      }

      // Calculate end time
      const endDate = new Date(startDate.getTime() + (durationMinutes * 60 * 1000));

      // Generate event title in required format
      const title = this.generateOneOnOneTitle(teamMemberName);

      // Create calendar event
      const calendarEvent = await CalendarEvent.create({
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

      return calendarEvent;
    } catch (error) {
      console.error('Error creating 1:1 meeting calendar event:', error);
      throw error;
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
    try {
      if (!eventId || !dateTime) {
        throw new Error('Event ID and date/time are required');
      }

      // Parse the new date/time
      const startDate = new Date(dateTime);
      if (isNaN(startDate.getTime())) {
        throw new Error('Invalid date/time format');
      }

      // Calculate new end time
      const endDate = new Date(startDate.getTime() + (durationMinutes * 60 * 1000));

      // Update the calendar event
      const updatedEvent = await CalendarEvent.update(eventId, {
        start_date: startDate.toISOString(),
        end_date: endDate.toISOString()
      });

      return updatedEvent;
    } catch (error) {
      console.error('Error updating 1:1 meeting calendar event:', error);
      throw error;
    }
  }

  /**
   * Delete a 1:1 meeting calendar event
   * @param {string} eventId - ID of the calendar event to delete
   * @returns {Promise<boolean>} Success status
   */
  static async deleteOneOnOneMeeting(eventId) {
    try {
      if (!eventId) {
        throw new Error('Event ID is required');
      }

      await CalendarEvent.delete(eventId);
      return true;
    } catch (error) {
      console.error('Error deleting 1:1 meeting calendar event:', error);
      throw error;
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
    try {
      // Get team member details for proper naming
      const teamMember = await TeamMember.get(teamMemberId);
      if (!teamMember) {
        throw new Error('Team member not found');
      }

      // Create the calendar event
      const calendarEvent = await this.createOneOnOneMeeting(
        teamMemberId, 
        teamMember.name, 
        dateTime, 
        durationMinutes
      );

      // Link the OneOnOne record to the calendar event
      const updatedOneOnOne = await this.linkMeetingToCalendarEvent(oneOnOneId, calendarEvent.id);

      return {
        calendarEvent,
        oneOnOne: updatedOneOnOne
      };
    } catch (error) {
      console.error('Error creating and linking 1:1 meeting:', error);
      throw error;
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

      // If there's an existing calendar event, update it
      if (oneOnOne.next_meeting_calendar_event_id) {
        try {
          const updatedEvent = await this.updateOneOnOneMeeting(
            oneOnOne.next_meeting_calendar_event_id, 
            newDateTime, 
            durationMinutes
          );
          return updatedEvent;
        } catch (error) {
          // If the calendar event doesn't exist anymore, create a new one
          console.warn('Existing calendar event not found, creating new one');
        }
      }

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
}

export default CalendarService;