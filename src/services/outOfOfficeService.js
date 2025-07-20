/**
 * Out of Office Service
 * Handles business logic for out of office periods including date calculations,
 * validation, yearly statistics, and active period queries
 */

import { OutOfOffice } from '../api/entities.js';

/**
 * Default reason types configuration
 */
const DEFAULT_REASON_TYPES = [
  { id: 'vacation', name: 'Vacation', value: 'vacation', active: true, color: '#3b82f6', order: 1 },
  { id: 'sick_day', name: 'Sick Day', value: 'sick_day', active: true, color: '#ef4444', order: 2 },
  { id: 'day_off', name: 'Day Off', value: 'day_off', active: true, color: '#10b981', order: 3 },
  { id: 'personal_leave', name: 'Personal Leave', value: 'personal_leave', active: true, color: '#f59e0b', order: 4 },
  { id: 'training', name: 'Training', value: 'training', active: true, color: '#8b5cf6', order: 5 }
];

/**
 * Out of Office Service Class
 * Provides methods for managing out of office periods and calculations
 */
class OutOfOfficeService {
  /**
   * Calculates the total number of days in a period (inclusive)
   * Includes weekends if they fall within the period
   * @param {string} startDate - ISO date string for start date
   * @param {string} endDate - ISO date string for end date
   * @returns {number} - Total number of days in the period
   */
  static calculateDaysInPeriod(startDate, endDate) {
    if (!startDate || !endDate) {
      throw new Error('Start date and end date are required');
    }

    const start = new Date(startDate);
    const end = new Date(endDate);

    // Validate dates
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      throw new Error('Invalid date format');
    }

    if (end < start) {
      throw new Error('End date must be after or equal to start date');
    }

    // Calculate difference in milliseconds and convert to days
    const timeDifference = end.getTime() - start.getTime();
    const daysDifference = Math.floor(timeDifference / (1000 * 60 * 60 * 24));
    
    // Add 1 to include both start and end dates
    return daysDifference + 1;
  }

  /**
   * Validates an out of office period
   * @param {string} startDate - ISO date string for start date
   * @param {string} endDate - ISO date string for end date
   * @param {string} reason - Reason for out of office
   * @param {string} teamMemberId - Team member ID
   * @param {string} peerId - Peer ID
   * @returns {object} - Validation result with isValid and errors array
   */
  static validatePeriod(startDate, endDate, reason, teamMemberId, peerId) {
    const errors = [];
    if (!startDate) errors.push('Start date is required');
    if (!endDate) errors.push('End date is required');
    if (!reason) errors.push('Reason is required');
    if (!teamMemberId && !peerId) errors.push('Reference (team member or peer) is required');

    // Date format validation
    if (startDate) {
      const start = new Date(startDate);
      if (isNaN(start.getTime())) {
        errors.push('Invalid start date format');
      }
    }

    if (endDate) {
      const end = new Date(endDate);
      if (isNaN(end.getTime())) {
        errors.push('Invalid end date format');
      }
    }

    // Date range validation
    if (startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);
      
      if (!isNaN(start.getTime()) && !isNaN(end.getTime()) && end < start) {
        errors.push('End date must be after or equal to start date');
      }
    }

    // Reason validation
    if (reason) {
      const validReasons = DEFAULT_REASON_TYPES.filter(r => r.active).map(r => r.value);
      if (!validReasons.includes(reason)) {
        errors.push('Invalid reason type');
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Gets all active out of office periods for a specific date
   * @param {string} date - ISO date string to check
   * @returns {Promise<Array>} - Array of active out of office periods
   */
  static async getActivePeriodsForDate(date) {
    if (!date) {
      throw new Error('Date is required');
    }

    const checkDate = new Date(date);
    if (isNaN(checkDate.getTime())) {
      throw new Error('Invalid date format');
    }

    try {
      const allPeriods = await OutOfOffice.list();
      
      return allPeriods.filter(period => {
        const startDate = new Date(period.start_date);
        const endDate = new Date(period.end_date);
        
        // Check if the date falls within the period (inclusive)
        return checkDate >= startDate && checkDate <= endDate;
      });
    } catch (error) {
      throw new Error(`Failed to get active periods: ${error.message}`);
    }
  }

  /**
   * Gets yearly statistics for a team member
   * @param {string} teamMemberId - Team member ID
   * @param {number} year - Calendar year (defaults to current year)
   * @returns {Promise<object>} - Statistics object with total days and breakdown by reason
   */
  static async getYearlyStats(teamMemberId, year = new Date().getFullYear()) {
    if (!teamMemberId) {
      throw new Error('Team member ID is required');
    }

    if (!year || year < 1900 || year > 3000) {
      throw new Error('Invalid year');
    }

    try {
      const allPeriods = await OutOfOffice.list();
      const memberPeriods = allPeriods.filter(period => period.team_member_id === teamMemberId);

      const yearStartStr = `${year}-01-01`;
      const yearEndStr = `${year}-12-31`;

      let totalDays = 0;
      const reasonBreakdown = {};

      memberPeriods.forEach(period => {
        const periodStart = period.start_date;
        const periodEnd = period.end_date;

        // Calculate overlap with the target year
        const overlapStart = periodStart > yearStartStr ? periodStart : yearStartStr;
        const overlapEnd = periodEnd < yearEndStr ? periodEnd : yearEndStr;

        // Only count if there's an overlap (start <= end)
        if (overlapStart <= overlapEnd) {
          const daysInYear = this.calculateDaysInPeriod(overlapStart, overlapEnd);

          totalDays += daysInYear;

          // Track breakdown by reason
          if (!reasonBreakdown[period.reason]) {
            reasonBreakdown[period.reason] = 0;
          }
          reasonBreakdown[period.reason] += daysInYear;
        }
      });

      return {
        teamMemberId,
        year,
        totalDays,
        reasonBreakdown,
        periods: memberPeriods.filter(period => {
          const periodStart = period.start_date;
          const periodEnd = period.end_date;
          const overlapStart = periodStart > yearStartStr ? periodStart : yearStartStr;
          const overlapEnd = periodEnd < yearEndStr ? periodEnd : yearEndStr;
          return overlapStart <= overlapEnd;
        })
      };
    } catch (error) {
      throw new Error(`Failed to get yearly statistics: ${error.message}`);
    }
  }

  /**
   * Gets yearly statistics for a peer
   * @param {string} peerId
   * @param {number} year
   * @returns {Promise<object>}
   */
  static async getYearlyStatsForPeer(peerId, year = new Date().getFullYear()) {
    if (!peerId) throw new Error('Peer ID is required');
    if (!year || year < 1900 || year > 3000) throw new Error('Invalid year');
    try {
      const allPeriods = await OutOfOffice.list();
      const peerPeriods = allPeriods.filter(period => period.peer_id === peerId);
      const yearStartStr = `${year}-01-01`;
      const yearEndStr = `${year}-12-31`;
      let totalDays = 0;
      const reasonBreakdown = {};
      peerPeriods.forEach(period => {
        const periodStart = period.start_date;
        const periodEnd = period.end_date;
        const overlapStart = periodStart > yearStartStr ? periodStart : yearStartStr;
        const overlapEnd = periodEnd < yearEndStr ? periodEnd : yearEndStr;
        if (overlapStart <= overlapEnd) {
          const daysInYear = this.calculateDaysInPeriod(overlapStart, overlapEnd);
          totalDays += daysInYear;
          if (!reasonBreakdown[period.reason]) reasonBreakdown[period.reason] = 0;
          reasonBreakdown[period.reason] += daysInYear;
        }
      });
      return {
        peerId,
        year,
        totalDays,
        reasonBreakdown,
        periods: peerPeriods.filter(period => {
          const periodStart = period.start_date;
          const periodEnd = period.end_date;
          const overlapStart = periodStart > yearStartStr ? periodStart : yearStartStr;
          const overlapEnd = periodEnd < yearEndStr ? periodEnd : yearEndStr;
          return overlapStart <= overlapEnd;
        })
      };
    } catch (error) {
      throw new Error(`Failed to get yearly statistics: ${error.message}`);
    }
  }

  /**
   * Checks for overlapping periods for a team member
   * @param {string} teamMemberId - Team member ID
   * @param {string} startDate - ISO date string for start date
   * @param {string} endDate - ISO date string for end date
   * @param {string} excludeId - Optional ID to exclude from overlap check (for updates)
   * @returns {Promise<Array>} - Array of overlapping periods
   */
  static async checkOverlaps(teamMemberId, startDate, endDate, excludeId = null) {
    if (!teamMemberId || !startDate || !endDate) {
      throw new Error('Team member ID, start date, and end date are required');
    }

    const start = new Date(startDate);
    const end = new Date(endDate);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      throw new Error('Invalid date format');
    }

    try {
      const allPeriods = await OutOfOffice.list();
      const memberPeriods = allPeriods.filter(period => 
        period.team_member_id === teamMemberId && 
        (!excludeId || period.id !== excludeId)
      );

      return memberPeriods.filter(period => {
        const periodStart = new Date(period.start_date);
        const periodEnd = new Date(period.end_date);

        // Check for overlap: periods overlap if start <= other.end && end >= other.start
        return start <= periodEnd && end >= periodStart;
      });
    } catch (error) {
      throw new Error(`Failed to check overlaps: ${error.message}`);
    }
  }

  /**
   * Checks for overlapping periods for a peer
   * @param {string} peerId
   * @param {string} startDate
   * @param {string} endDate
   * @param {string} excludeId
   * @returns {Promise<Array>}
   */
  static async checkOverlapsForPeer(peerId, startDate, endDate, excludeId = null) {
    if (!peerId || !startDate || !endDate) throw new Error('Peer ID, start date, and end date are required');
    const start = new Date(startDate);
    const end = new Date(endDate);
    if (isNaN(start.getTime()) || isNaN(end.getTime())) throw new Error('Invalid date format');
    try {
      const allPeriods = await OutOfOffice.list();
      const peerPeriods = allPeriods.filter(period => period.peer_id === peerId && (!excludeId || period.id !== excludeId));
      return peerPeriods.filter(period => {
        const periodStart = new Date(period.start_date);
        const periodEnd = new Date(period.end_date);
        return start <= periodEnd && end >= periodStart;
      });
    } catch (error) {
      throw new Error(`Failed to check overlaps: ${error.message}`);
    }
  }

  /**
   * Gets the current out of office status for a team member
   * @param {string} teamMemberId - Team member ID
   * @param {string} currentDate - ISO date string for current date (defaults to today)
   * @returns {Promise<object|null>} - Current out of office period or null if not out
   */
  static async getCurrentStatus(teamMemberId, currentDate = new Date().toISOString().split('T')[0]) {
    if (!teamMemberId) {
      throw new Error('Team member ID is required');
    }

    try {
      const activePeriods = await this.getActivePeriodsForDate(currentDate);
      const memberPeriod = activePeriods.find(period => period.team_member_id === teamMemberId);

      if (!memberPeriod) {
        return null;
      }

      // Calculate return date (next day after end date)
      const endDate = new Date(memberPeriod.end_date);
      const returnDate = new Date(endDate);
      returnDate.setDate(returnDate.getDate() + 1);

      return {
        ...memberPeriod,
        returnDate: returnDate.toISOString().split('T')[0],
        daysRemaining: this.calculateDaysInPeriod(currentDate, memberPeriod.end_date)
      };
    } catch (error) {
      throw new Error(`Failed to get current status: ${error.message}`);
    }
  }

  /**
   * Gets the current out of office status for a peer
   * @param {string} peerId
   * @param {string} currentDate
   * @returns {Promise<object|null>}
   */
  static async getCurrentStatusForPeer(peerId, currentDate = new Date().toISOString().split('T')[0]) {
    if (!peerId) throw new Error('Peer ID is required');
    try {
      const activePeriods = await this.getActivePeriodsForDate(currentDate);
      const peerPeriod = activePeriods.find(period => period.peer_id === peerId);
      if (!peerPeriod) return null;
      const endDate = new Date(peerPeriod.end_date);
      const returnDate = new Date(endDate);
      returnDate.setDate(returnDate.getDate() + 1);
      return {
        ...peerPeriod,
        returnDate: returnDate.toISOString().split('T')[0],
        daysRemaining: this.calculateDaysInPeriod(currentDate, peerPeriod.end_date)
      };
    } catch (error) {
      throw new Error(`Failed to get current status: ${error.message}`);
    }
  }

  /**
   * Gets available reason types
   * @returns {Array} - Array of available reason types
   */
  static getReasonTypes() {
    return DEFAULT_REASON_TYPES.filter(reason => reason.active)
      .sort((a, b) => a.order - b.order);
  }

  /**
   * Gets reason type by value
   * @param {string} value - Reason value
   * @returns {object|null} - Reason type object or null if not found
   */
  static getReasonType(value) {
    return DEFAULT_REASON_TYPES.find(reason => reason.value === value) || null;
  }
}

export default OutOfOfficeService;