// src/services/dutyRotationService.js
// Service for managing duty rotations and scheduling

import { localClient } from '../api/localClient.js';

/**
 * Service for managing duty rotations and calculating rotation schedules
 */
export class DutyRotationService {
  /**
   * Create a new duty rotation
   * @param {Object} config - Rotation configuration
   * @param {string} config.name - Name of the rotation (e.g., "On-Call Rotation")
   * @param {string} config.type - Type of duty ('Reporting', 'Metering', 'DevOps')
   * @param {string[]} config.participants - Array of team member IDs
   * @param {number} config.cycle_weeks - Duration each person serves (in weeks)
   * @param {string} [config.start_date] - Start date for the rotation (ISO string)
   * @param {number} [config.current_assignee_index=0] - Index of current assignee
   * @returns {Promise<Object>} Created rotation object
   */
  static async createRotation(config) {
    const { name, type, participants, cycle_weeks, start_date, current_assignee_index = 0 } = config;
    
    // Calculate next rotation date if start_date is provided
    let next_rotation_date = null;
    if (start_date) {
      const startDate = new Date(start_date);
      const nextDate = new Date(startDate);
      nextDate.setDate(nextDate.getDate() + (cycle_weeks * 7));
      next_rotation_date = nextDate.toISOString();
    }

    const rotation = await localClient.entities.DutyRotation.create({
      name,
      type,
      participants,
      cycle_weeks,
      current_assignee_index,
      next_rotation_date,
      is_active: true
    });

    return rotation;
  }

  /**
   * Generate rotation schedule for multiple cycles
   * @param {string} rotationId - ID of the rotation
   * @param {string} startDate - Start date for schedule generation (ISO string)
   * @param {number} cycles - Number of complete rotation cycles to generate
   * @returns {Promise<Array>} Array of duty assignments for the rotation schedule
   */
  static async generateRotationSchedule(rotationId, startDate, cycles = 1) {
    const rotation = await localClient.entities.DutyRotation.get(rotationId);
    if (!rotation) {
      throw new Error(`Rotation with ID ${rotationId} not found`);
    }

    const { participants, cycle_weeks, type } = rotation;
    const schedule = [];
    const start = new Date(startDate);

    // Generate duties for the specified number of cycles
    for (let cycle = 0; cycle < cycles; cycle++) {
      for (let participantIndex = 0; participantIndex < participants.length; participantIndex++) {
        const teamMemberId = participants[participantIndex];
        
        // Calculate start and end dates for this participant's duty period
        const dutyStartDate = new Date(start);
        dutyStartDate.setDate(start.getDate() + (cycle * participants.length * cycle_weeks * 7) + (participantIndex * cycle_weeks * 7));
        
        const dutyEndDate = new Date(dutyStartDate);
        dutyEndDate.setDate(dutyStartDate.getDate() + (cycle_weeks * 7) - 1);

        const dutyAssignment = {
          team_member_id: teamMemberId,
          type: type.toLowerCase().replace(' ', '_'), // Convert to API format
          title: type,
          description: `${rotation.name} - Cycle ${cycle + 1}`,
          start_date: dutyStartDate.toISOString().split('T')[0],
          end_date: dutyEndDate.toISOString().split('T')[0],
          is_rotation: true,
          rotation_id: rotationId,
          rotation_participants: participants.length,
          rotation_sequence: participantIndex,
          rotation_cycle_weeks: cycle_weeks
        };

        schedule.push(dutyAssignment);
      }
    }

    return schedule;
  }

  /**
   * Advance rotation to the next assignee
   * @param {string} rotationId - ID of the rotation to advance
   * @returns {Promise<Object>} Updated rotation object
   */
  static async advanceRotation(rotationId) {
    const rotation = await localClient.entities.DutyRotation.get(rotationId);
    if (!rotation) {
      throw new Error(`Rotation with ID ${rotationId} not found`);
    }

    const { participants, cycle_weeks, current_assignee_index } = rotation;
    
    // Calculate next assignee index (wrap around to 0 after last participant)
    const nextAssigneeIndex = (current_assignee_index + 1) % participants.length;
    
    // Calculate next rotation date
    const currentDate = new Date();
    const nextRotationDate = new Date(currentDate);
    nextRotationDate.setDate(currentDate.getDate() + (cycle_weeks * 7));

    // Update the rotation
    const updatedRotation = await localClient.entities.DutyRotation.update(rotationId, {
      current_assignee_index: nextAssigneeIndex,
      next_rotation_date: nextRotationDate.toISOString()
    });

    return updatedRotation;
  }

  /**
   * Get the next assignee in the rotation
   * @param {string} rotationId - ID of the rotation
   * @returns {Promise<Object>} Object containing next assignee info
   */
  static async getNextAssignee(rotationId) {
    const rotation = await localClient.entities.DutyRotation.get(rotationId);
    if (!rotation) {
      throw new Error(`Rotation with ID ${rotationId} not found`);
    }

    const { participants, current_assignee_index, cycle_weeks, next_rotation_date } = rotation;
    const nextAssigneeIndex = (current_assignee_index + 1) % participants.length;
    const nextAssigneeId = participants[nextAssigneeIndex];

    // Get team member details
    const teamMembers = await localClient.entities.TeamMember.list();
    const nextAssignee = teamMembers.find(tm => tm.id === nextAssigneeId);

    return {
      assignee_id: nextAssigneeId,
      assignee_name: nextAssignee ? nextAssignee.name : 'Unknown',
      assignee_index: nextAssigneeIndex,
      rotation_date: next_rotation_date,
      weeks_until_rotation: this.calculateWeeksUntilDate(next_rotation_date)
    };
  }

  /**
   * Calculate rotation dates for all participants
   * @param {string[]} participants - Array of team member IDs
   * @param {number} cycleWeeks - Duration each person serves (in weeks)
   * @param {string} startDate - Start date for calculations (ISO string)
   * @returns {Array} Array of rotation date assignments
   */
  static calculateRotationDates(participants, cycleWeeks, startDate) {
    const start = new Date(startDate);
    const rotationDates = [];

    participants.forEach((participantId, index) => {
      const assignmentStartDate = new Date(start);
      assignmentStartDate.setDate(start.getDate() + (index * cycleWeeks * 7));
      
      const assignmentEndDate = new Date(assignmentStartDate);
      assignmentEndDate.setDate(assignmentStartDate.getDate() + (cycleWeeks * 7) - 1);

      rotationDates.push({
        participant_id: participantId,
        sequence: index,
        start_date: assignmentStartDate.toISOString().split('T')[0],
        end_date: assignmentEndDate.toISOString().split('T')[0],
        weeks_duration: cycleWeeks
      });
    });

    return rotationDates;
  }

  /**
   * Get current assignee for a rotation
   * @param {string} rotationId - ID of the rotation
   * @returns {Promise<Object>} Object containing current assignee info
   */
  static async getCurrentAssignee(rotationId) {
    const rotation = await localClient.entities.DutyRotation.get(rotationId);
    if (!rotation) {
      throw new Error(`Rotation with ID ${rotationId} not found`);
    }

    const { participants, current_assignee_index } = rotation;
    const currentAssigneeId = participants[current_assignee_index];

    // Get team member details
    const teamMembers = await localClient.entities.TeamMember.list();
    const currentAssignee = teamMembers.find(tm => tm.id === currentAssigneeId);

    return {
      assignee_id: currentAssigneeId,
      assignee_name: currentAssignee ? currentAssignee.name : 'Unknown',
      assignee_index: current_assignee_index
    };
  }

  /**
   * Get full rotation schedule for a rotation
   * @param {string} rotationId - ID of the rotation
   * @param {number} [cycles=2] - Number of cycles to show in schedule
   * @returns {Promise<Array>} Array of upcoming rotation assignments
   */
  static async getRotationSchedule(rotationId, cycles = 2) {
    const rotation = await localClient.entities.DutyRotation.get(rotationId);
    if (!rotation) {
      throw new Error(`Rotation with ID ${rotationId} not found`);
    }

    const { participants, cycle_weeks, next_rotation_date } = rotation;
    const schedule = [];
    
    // Use next_rotation_date as starting point, or current date if not set
    const startDate = next_rotation_date ? new Date(next_rotation_date) : new Date();
    
    // Get team member details for names
    const teamMembers = await localClient.entities.TeamMember.list();
    const teamMemberMap = new Map(teamMembers.map(tm => [tm.id, tm.name]));

    // Generate schedule for specified cycles
    for (let cycle = 0; cycle < cycles; cycle++) {
      for (let participantIndex = 0; participantIndex < participants.length; participantIndex++) {
        const participantId = participants[participantIndex];
        
        const assignmentStartDate = new Date(startDate);
        assignmentStartDate.setDate(startDate.getDate() + (cycle * participants.length * cycle_weeks * 7) + (participantIndex * cycle_weeks * 7));
        
        const assignmentEndDate = new Date(assignmentStartDate);
        assignmentEndDate.setDate(assignmentStartDate.getDate() + (cycle_weeks * 7) - 1);

        schedule.push({
          participant_id: participantId,
          participant_name: teamMemberMap.get(participantId) || 'Unknown',
          sequence: participantIndex,
          cycle: cycle + 1,
          start_date: assignmentStartDate.toISOString().split('T')[0],
          end_date: assignmentEndDate.toISOString().split('T')[0],
          weeks_duration: cycle_weeks,
          is_current: cycle === 0 && participantIndex === 0
        });
      }
    }

    return schedule;
  }

  /**
   * Create duties for a rotation schedule
   * @param {string} rotationId - ID of the rotation
   * @param {string} startDate - Start date for duty creation (ISO string)
   * @param {number} [cycles=1] - Number of cycles to create duties for
   * @returns {Promise<Array>} Array of created duty objects
   */
  static async createRotationDuties(rotationId, startDate, cycles = 1) {
    const schedule = await this.generateRotationSchedule(rotationId, startDate, cycles);
    const createdDuties = [];

    for (const dutyAssignment of schedule) {
      try {
        const duty = await localClient.entities.Duty.create(dutyAssignment);
        createdDuties.push(duty);
      } catch (error) {
        console.error(`Failed to create duty for rotation ${rotationId}:`, error);
        // Continue creating other duties even if one fails
      }
    }

    return createdDuties;
  }

  /**
   * Update rotation participants
   * @param {string} rotationId - ID of the rotation
   * @param {string[]} newParticipants - New array of participant IDs
   * @returns {Promise<Object>} Updated rotation object
   */
  static async updateRotationParticipants(rotationId, newParticipants) {
    const rotation = await localClient.entities.DutyRotation.get(rotationId);
    if (!rotation) {
      throw new Error(`Rotation with ID ${rotationId} not found`);
    }

    // Ensure current assignee index is still valid
    let newCurrentAssigneeIndex = rotation.current_assignee_index;
    if (newCurrentAssigneeIndex >= newParticipants.length) {
      newCurrentAssigneeIndex = 0; // Reset to first participant if current index is out of bounds
    }

    const updatedRotation = await localClient.entities.DutyRotation.update(rotationId, {
      participants: newParticipants,
      current_assignee_index: newCurrentAssigneeIndex
    });

    return updatedRotation;
  }

  /**
   * Calculate weeks until a specific date
   * @param {string} targetDate - Target date (ISO string)
   * @returns {number} Number of weeks until the target date
   */
  static calculateWeeksUntilDate(targetDate) {
    if (!targetDate) return 0;
    
    const now = new Date();
    const target = new Date(targetDate);
    const diffTime = target.getTime() - now.getTime();
    const diffWeeks = Math.ceil(diffTime / (1000 * 60 * 60 * 24 * 7));
    
    return Math.max(0, diffWeeks);
  }

  /**
   * Get all active rotations
   * @returns {Promise<Array>} Array of active rotation objects
   */
  static async getActiveRotations() {
    return await localClient.entities.DutyRotation.getActive();
  }

  /**
   * Get rotations by type
   * @param {string} type - Rotation type ('Reporting', 'Metering', 'DevOps')
   * @returns {Promise<Array>} Array of rotation objects of the specified type
   */
  static async getRotationsByType(type) {
    return await localClient.entities.DutyRotation.getByType(type);
  }

  /**
   * Deactivate a rotation
   * @param {string} rotationId - ID of the rotation to deactivate
   * @returns {Promise<Object>} Updated rotation object
   */
  static async deactivateRotation(rotationId) {
    return await localClient.entities.DutyRotation.update(rotationId, {
      is_active: false
    });
  }

  /**
   * Activate a rotation
   * @param {string} rotationId - ID of the rotation to activate
   * @returns {Promise<Object>} Updated rotation object
   */
  static async activateRotation(rotationId) {
    return await localClient.entities.DutyRotation.update(rotationId, {
      is_active: true
    });
  }
}

export default DutyRotationService;