// src/services/agendaIndicatorService.js
// Service for managing agenda item indicators in calendar events

import { AgendaItem } from '@/api/oneOnOneAgenda';

/**
 * Service for calculating and managing agenda item indicators
 */
export class AgendaIndicatorService {
  /**
   * Get agenda item counts for a specific team member
   * @param {string} teamMemberId - ID of the team member
   * @returns {Promise<Object>} Object with count and status information
   */
  static async getAgendaCountsForTeamMember(teamMemberId) {
    try {
      if (!teamMemberId) {
        return { count: 0, unresolvedCount: 0, hasUnresolved: false };
      }

      const agendaItems = await AgendaItem.getByTeamMember(teamMemberId);
      
      if (!Array.isArray(agendaItems)) {
        return { count: 0, unresolvedCount: 0, hasUnresolved: false };
      }

      const totalCount = agendaItems.length;
      const unresolvedItems = agendaItems.filter(item => 
        item.status === 'pending' || item.status === 'in_progress'
      );
      const unresolvedCount = unresolvedItems.length;

      return {
        count: totalCount,
        unresolvedCount,
        hasUnresolved: unresolvedCount > 0,
        items: agendaItems
      };
    } catch (error) {
      console.error('Error getting agenda counts for team member:', error);
      return { count: 0, unresolvedCount: 0, hasUnresolved: false };
    }
  }

  /**
   * Get agenda item counts for multiple team members
   * @param {Array<string>} teamMemberIds - Array of team member IDs
   * @returns {Promise<Object>} Object mapping team member IDs to their counts
   */
  static async getAgendaCountsForTeamMembers(teamMemberIds) {
    try {
      if (!Array.isArray(teamMemberIds) || teamMemberIds.length === 0) {
        return {};
      }

      const counts = {};
      
      // Get counts for each team member in parallel
      const countPromises = teamMemberIds.map(async (teamMemberId) => {
        const count = await this.getAgendaCountsForTeamMember(teamMemberId);
        return { teamMemberId, count };
      });

      const results = await Promise.all(countPromises);
      
      results.forEach(({ teamMemberId, count }) => {
        counts[teamMemberId] = count;
      });

      return counts;
    } catch (error) {
      console.error('Error getting agenda counts for team members:', error);
      return {};
    }
  }

  /**
   * Get agenda item counts for all calendar events
   * @param {Array} calendarEvents - Array of calendar events
   * @returns {Promise<Object>} Object mapping event IDs to their agenda counts
   */
  static async getAgendaCountsForCalendarEvents(calendarEvents) {
    try {
      if (!Array.isArray(calendarEvents)) {
        return {};
      }

      // Filter for 1:1 meetings and extract unique team member IDs
      const oneOnOneMeetings = calendarEvents.filter(event => 
        event.event_type === 'one_on_one' && event.team_member_id
      );

      if (oneOnOneMeetings.length === 0) {
        return {};
      }

      const uniqueTeamMemberIds = [...new Set(
        oneOnOneMeetings.map(event => event.team_member_id)
      )];

      // Get agenda counts for all team members
      const teamMemberCounts = await this.getAgendaCountsForTeamMembers(uniqueTeamMemberIds);

      // Map counts to calendar events
      const eventCounts = {};
      oneOnOneMeetings.forEach(event => {
        const teamMemberCount = teamMemberCounts[event.team_member_id];
        if (teamMemberCount) {
          eventCounts[event.id] = {
            ...teamMemberCount,
            teamMemberId: event.team_member_id
          };
        }
      });

      return eventCounts;
    } catch (error) {
      console.error('Error getting agenda counts for calendar events:', error);
      return {};
    }
  }

  /**
   * Check if a calendar event has pending agenda items
   * @param {Object} calendarEvent - Calendar event object
   * @returns {Promise<boolean>} True if event has pending agenda items
   */
  static async hasAgendaItems(calendarEvent) {
    try {
      if (!calendarEvent || calendarEvent.event_type !== 'one_on_one' || !calendarEvent.team_member_id) {
        return false;
      }

      const counts = await this.getAgendaCountsForTeamMember(calendarEvent.team_member_id);
      return counts.count > 0;
    } catch (error) {
      console.error('Error checking if event has agenda items:', error);
      return false;
    }
  }

  /**
   * Get agenda items for the next meeting with a team member
   * @param {string} teamMemberId - ID of the team member
   * @returns {Promise<Array>} Array of agenda items for the next meeting
   */
  static async getAgendaItemsForNextMeeting(teamMemberId) {
    try {
      if (!teamMemberId) {
        return [];
      }

      const agendaItems = await AgendaItem.getForNextMeeting(teamMemberId);
      return Array.isArray(agendaItems) ? agendaItems : [];
    } catch (error) {
      console.error('Error getting agenda items for next meeting:', error);
      return [];
    }
  }
}