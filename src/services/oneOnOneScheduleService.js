// src/services/oneOnOneScheduleService.js
// Service layer for OneOnOne recurring schedule management

import { localClient } from '../api/localClient.js';

/**
 * OneOnOneScheduleService
 * Handles all business logic for recurring 1:1 meeting schedules
 */
export const OneOnOneScheduleService = {
  /**
   * Calculate the next meeting date based on a schedule configuration
   *
   * @param {Object} schedule - Schedule configuration
   * @param {string} schedule.frequency - 'weekly' | 'biweekly' | 'monthly' | 'custom'
   * @param {number} schedule.day_of_week - 0 (Sunday) to 6 (Saturday)
   * @param {number} schedule.custom_interval_weeks - For custom frequency
   * @param {string} afterDate - ISO date string (YYYY-MM-DD) to calculate from
   * @returns {string} Next meeting date in YYYY-MM-DD format
   */
  calculateNextMeetingDate(schedule, afterDate) {
    const { frequency, day_of_week, custom_interval_weeks } = schedule;
    const after = new Date(afterDate);

    // Ensure we're working with a valid date
    if (isNaN(after.getTime())) {
      throw new Error('Invalid afterDate provided');
    }

    // Calculate interval in days based on frequency
    let intervalDays;
    switch (frequency) {
      case 'weekly':
        intervalDays = 7;
        break;
      case 'biweekly':
        intervalDays = 14;
        break;
      case 'monthly':
        intervalDays = 30; // Approximate - will be adjusted
        break;
      case 'custom':
        if (!custom_interval_weeks || custom_interval_weeks < 1) {
          throw new Error('custom_interval_weeks is required for custom frequency');
        }
        intervalDays = custom_interval_weeks * 7;
        break;
      default:
        throw new Error(`Invalid frequency: ${frequency}`);
    }

    // Start from the day after afterDate
    let nextDate = new Date(after);
    nextDate.setDate(nextDate.getDate() + 1);

    // Special handling for monthly frequency
    if (frequency === 'monthly') {
      // Move to the next month
      nextDate.setMonth(nextDate.getMonth() + 1);

      // Find the first occurrence of the target day of week in that month
      while (nextDate.getDay() !== day_of_week) {
        nextDate.setDate(nextDate.getDate() + 1);

        // Safety check: if we've moved to the next month, something went wrong
        const expectedMonth = (after.getMonth() + 1) % 12;
        if (nextDate.getMonth() !== expectedMonth && nextDate.getMonth() !== (expectedMonth + 1) % 12) {
          // We've gone too far, reset and try again
          nextDate = new Date(after);
          nextDate.setMonth(nextDate.getMonth() + 1);
          nextDate.setDate(1);
        }
      }
    } else {
      // For weekly, biweekly, and custom frequencies
      // Find the next occurrence of the target day of week
      while (nextDate.getDay() !== day_of_week) {
        nextDate.setDate(nextDate.getDate() + 1);
      }

      // For weekly: this is correct - the next occurrence of the day
      // For biweekly/custom: check if we need to skip ahead
      if (frequency !== 'weekly') {
        const daysDiff = Math.floor((nextDate - after) / (1000 * 60 * 60 * 24));

        if (daysDiff < intervalDays) {
          // We need to move forward to the next valid occurrence
          // Calculate how many more days we need
          const additionalDays = intervalDays - daysDiff;
          nextDate.setDate(nextDate.getDate() + additionalDays);

          // Adjust to the correct day of week if needed
          while (nextDate.getDay() !== day_of_week) {
            nextDate.setDate(nextDate.getDate() + 1);
          }
        }
      }
    }

    // Return in YYYY-MM-DD format
    return nextDate.toISOString().split('T')[0];
  },

  /**
   * Create a new recurring schedule and generate the first meeting
   *
   * @param {string} teamMemberId - ID of the team member
   * @param {Object} scheduleConfig - Schedule configuration
   * @returns {Object} Created schedule and first meeting
   */
  async createSchedule(teamMemberId, scheduleConfig) {
    try {
      // Validate team member exists
      const teamMembers = await localClient.entities.TeamMember.list();
      const teamMember = teamMembers.find(tm => tm.id === teamMemberId);
      if (!teamMember) {
        throw new Error(`Team member ${teamMemberId} not found`);
      }

      // Check if team member already has an active schedule
      const existingSchedule = await localClient.entities.OneOnOneSchedule.getActiveByTeamMember(teamMemberId);
      if (existingSchedule) {
        throw new Error(`Team member ${teamMember.name} already has an active schedule`);
      }

      // Calculate the first meeting date
      const startDate = scheduleConfig.start_date || new Date().toISOString().split('T')[0];
      const firstMeetingDate = this.calculateNextMeetingDate(
        scheduleConfig,
        new Date(startDate).toISOString().split('T')[0]
      );

      // Create the schedule record
      const schedule = await localClient.entities.OneOnOneSchedule.create({
        team_member_id: teamMemberId,
        frequency: scheduleConfig.frequency,
        day_of_week: scheduleConfig.day_of_week,
        time: scheduleConfig.time,
        duration_minutes: scheduleConfig.duration_minutes,
        custom_interval_weeks: scheduleConfig.custom_interval_weeks || null,
        start_date: startDate,
        end_date: scheduleConfig.end_date || null,
        next_meeting_date: firstMeetingDate
      });

      // Create the first OneOnOne meeting instance WITHOUT auto-calendar creation
      const firstMeeting = await localClient.entities.OneOnOne.create({
        team_member_id: teamMemberId,
        next_meeting_date: null, // Don't set date to avoid auto-calendar creation
        schedule_id: schedule.id,
        is_recurring: true,
        recurrence_instance: 1,
        status: 'scheduled'
      });

      // Now create the recurring calendar event manually
      try {
        const { CalendarService } = await import('../utils/calendarService.js');
        const calendarResult = await CalendarService.createRecurringOneOnOneMeeting(
          firstMeeting.id,
          teamMemberId,
          schedule,
          firstMeetingDate
        );

        // Update the OneOnOne with the meeting date and calendar event ID
        await localClient.entities.OneOnOne.update(firstMeeting.id, {
          next_meeting_date: firstMeetingDate,
          next_meeting_calendar_event_id: calendarResult.calendarEvent.id
        });

        return {
          schedule,
          firstMeeting: calendarResult.oneOnOne,
          calendarEvent: calendarResult.calendarEvent,
          success: true
        };
      } catch (calendarError) {
        console.warn('Failed to create calendar event for recurring meeting:', calendarError);
        // Update the OneOnOne with just the meeting date
        await localClient.entities.OneOnOne.update(firstMeeting.id, {
          next_meeting_date: firstMeetingDate
        });

        return {
          schedule,
          firstMeeting,
          success: true,
          calendarError: calendarError.message
        };
      }
    } catch (error) {
      console.error('Error creating schedule:', error);
      throw error;
    }
  },

  /**
   * Generate the next meeting after the current one is completed
   *
   * @param {string} scheduleId - ID of the schedule
   * @param {string} completedMeetingDate - Date of the completed meeting (YYYY-MM-DD)
   * @returns {Object} Created next meeting
   */
  async generateNextMeeting(scheduleId, completedMeetingDate) {
    try {
      // Get the schedule
      const schedule = await localClient.entities.OneOnOneSchedule.get(scheduleId);
      if (!schedule) {
        throw new Error(`Schedule ${scheduleId} not found`);
      }

      if (!schedule.is_active) {
        throw new Error('Cannot generate meeting for inactive schedule');
      }

      // Check if schedule has ended
      if (schedule.end_date) {
        const endDate = new Date(schedule.end_date);
        const completedDate = new Date(completedMeetingDate);
        if (completedDate >= endDate) {
          console.log('Schedule has ended, deactivating...');
          await localClient.entities.OneOnOneSchedule.deactivate(scheduleId);
          return {
            scheduleEnded: true,
            message: 'Schedule has reached its end date'
          };
        }
      }

      // Calculate next meeting date
      const nextMeetingDate = this.calculateNextMeetingDate(schedule, completedMeetingDate);

      // Get the last recurrence instance number
      const allMeetings = await localClient.entities.OneOnOne.list();
      const scheduleMeetings = allMeetings.filter(m => m.schedule_id === scheduleId);
      const lastInstance = scheduleMeetings.reduce((max, m) => {
        return m.recurrence_instance > max ? m.recurrence_instance : max;
      }, 0);

      // Create the next meeting WITHOUT auto-calendar creation
      const nextMeeting = await localClient.entities.OneOnOne.create({
        team_member_id: schedule.team_member_id,
        next_meeting_date: null, // Don't set date to avoid auto-calendar creation
        schedule_id: scheduleId,
        is_recurring: true,
        recurrence_instance: lastInstance + 1,
        status: 'scheduled'
      });

      // Create the recurring calendar event
      try {
        const { CalendarService } = await import('../utils/calendarService.js');
        const calendarResult = await CalendarService.createRecurringOneOnOneMeeting(
          nextMeeting.id,
          schedule.team_member_id,
          schedule,
          nextMeetingDate
        );

        // Update the OneOnOne with the meeting date and calendar event ID
        await localClient.entities.OneOnOne.update(nextMeeting.id, {
          next_meeting_date: nextMeetingDate,
          next_meeting_calendar_event_id: calendarResult.calendarEvent.id
        });

        // Update schedule tracking
        await localClient.entities.OneOnOneSchedule.update(scheduleId, {
          last_meeting_date: completedMeetingDate,
          next_meeting_date: nextMeetingDate
        });

        return {
          nextMeeting: calendarResult.oneOnOne,
          calendarEvent: calendarResult.calendarEvent,
          success: true
        };
      } catch (calendarError) {
        console.warn('Failed to create calendar event for next meeting:', calendarError);
        // Update the OneOnOne with just the meeting date
        await localClient.entities.OneOnOne.update(nextMeeting.id, {
          next_meeting_date: nextMeetingDate
        });

        // Update schedule tracking
        await localClient.entities.OneOnOneSchedule.update(scheduleId, {
          last_meeting_date: completedMeetingDate,
          next_meeting_date: nextMeetingDate
        });

        return {
          nextMeeting,
          success: true,
          calendarError: calendarError.message
        };
      }
    } catch (error) {
      console.error('Error generating next meeting:', error);
      throw error;
    }
  },

  /**
   * Update an existing schedule configuration
   *
   * @param {string} scheduleId - ID of the schedule to update
   * @param {Object} updates - Fields to update
   * @param {boolean} applyToFuture - Whether to recalculate future meetings
   * @returns {Object} Updated schedule
   */
  async updateSchedule(scheduleId, updates, applyToFuture = true) {
    try {
      const schedule = await localClient.entities.OneOnOneSchedule.get(scheduleId);
      if (!schedule) {
        throw new Error(`Schedule ${scheduleId} not found`);
      }

      // Update the schedule
      const updatedSchedule = await localClient.entities.OneOnOneSchedule.update(scheduleId, updates);

      // If applyToFuture is true, recalculate the next meeting date
      if (applyToFuture) {
        const baseDate = schedule.last_meeting_date || schedule.start_date;
        const newNextDate = this.calculateNextMeetingDate(updatedSchedule, baseDate);

        // Update the schedule with new next meeting date
        await localClient.entities.OneOnOneSchedule.update(scheduleId, {
          next_meeting_date: newNextDate
        });

        // Update any upcoming scheduled meetings for this schedule
        const allMeetings = await localClient.entities.OneOnOne.list();
        const upcomingMeetings = allMeetings.filter(
          m => m.schedule_id === scheduleId && m.status === 'scheduled'
        );

        // Update the next scheduled meeting with the new date
        if (upcomingMeetings.length > 0) {
          const nextMeeting = upcomingMeetings[0]; // Assuming they're ordered
          await localClient.entities.OneOnOne.update(nextMeeting.id, {
            next_meeting_date: newNextDate
          });
        }
      }

      return updatedSchedule;
    } catch (error) {
      console.error('Error updating schedule:', error);
      throw error;
    }
  },

  /**
   * Deactivate a schedule (pause it)
   *
   * @param {string} scheduleId - ID of the schedule
   * @returns {Object} Deactivated schedule
   */
  async deactivateSchedule(scheduleId) {
    return await localClient.entities.OneOnOneSchedule.deactivate(scheduleId);
  },

  /**
   * Activate a schedule (resume it)
   *
   * @param {string} scheduleId - ID of the schedule
   * @returns {Object} Activated schedule
   */
  async activateSchedule(scheduleId) {
    return await localClient.entities.OneOnOneSchedule.activate(scheduleId);
  },

  /**
   * Get all active schedules
   *
   * @returns {Array} Active schedules
   */
  async getActiveSchedules() {
    return await localClient.entities.OneOnOneSchedule.getActive();
  },

  /**
   * Get schedule for a specific team member
   *
   * @param {string} teamMemberId - ID of the team member
   * @returns {Object|null} Active schedule or null
   */
  async getScheduleByTeamMember(teamMemberId) {
    return await localClient.entities.OneOnOneSchedule.getActiveByTeamMember(teamMemberId);
  },

  /**
   * Get a human-readable description of the schedule
   *
   * @param {Object} schedule - Schedule object
   * @returns {string} Description like "Every 2 weeks on Monday at 2:00 PM"
   */
  getScheduleDescription(schedule) {
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const dayName = dayNames[schedule.day_of_week];

    // Convert 24-hour time to 12-hour format
    const [hours, minutes] = schedule.time.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
    const timeStr = `${displayHour}:${minutes} ${ampm}`;

    let frequencyStr;
    switch (schedule.frequency) {
      case 'weekly':
        frequencyStr = 'Every week';
        break;
      case 'biweekly':
        frequencyStr = 'Every 2 weeks';
        break;
      case 'monthly':
        frequencyStr = 'Monthly';
        break;
      case 'custom':
        frequencyStr = `Every ${schedule.custom_interval_weeks} weeks`;
        break;
      default:
        frequencyStr = schedule.frequency;
    }

    return `${frequencyStr} on ${dayName} at ${timeStr}`;
  },

  /**
   * Delete a schedule and optionally clean up associated meetings
   *
   * @param {string} scheduleId - ID of the schedule
   * @param {boolean} deleteUpcomingMeetings - Whether to delete upcoming scheduled meetings
   * @returns {Object} Result of deletion
   */
  async deleteSchedule(scheduleId, deleteUpcomingMeetings = false) {
    try {
      let deletedCount = 0;

      if (deleteUpcomingMeetings) {
        // Delete all upcoming meetings for this schedule
        const allMeetings = await localClient.entities.OneOnOne.list();
        const upcomingMeetings = allMeetings.filter(
          m => m.schedule_id === scheduleId && m.status === 'scheduled'
        );

        for (const meeting of upcomingMeetings) {
          await localClient.entities.OneOnOne.delete(meeting.id);
        }

        deletedCount = upcomingMeetings.length;
      }

      // Delete the schedule
      await localClient.entities.OneOnOneSchedule.delete(scheduleId);

      return {
        success: true,
        deletedMeetings: deletedCount
      };
    } catch (error) {
      console.error('Error deleting schedule:', error);
      throw error;
    }
  }
};

export default OneOnOneScheduleService;
