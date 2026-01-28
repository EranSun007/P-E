/**
 * Release Cycles Utility
 *
 * Manages release cycle calculations for duty scheduling.
 *
 * Cycle Structure:
 * - Format: YYNN (e.g., "2601" = 2026, cycle 01)
 * - Duration: 4 weeks per cycle
 * - Sprints: 2 per cycle ("a" = weeks 1-2, "b" = weeks 3-4)
 * - ~13 cycles per year
 * - First 2026 cycle (2601) starts January 11, 2026
 */

import { addDays, differenceInDays, format, startOfDay } from 'date-fns';

// Configuration: First cycle of 2026 starts Jan 11
const FIRST_CYCLE_START = new Date(2026, 0, 11); // Jan 11, 2026
const CYCLE_DURATION_DAYS = 28; // 4 weeks
const SPRINT_DURATION_DAYS = 14; // 2 weeks
const CYCLES_PER_YEAR = 13;

/**
 * Get cycle information by cycle ID
 * @param {string} cycleId - Cycle ID in YYNN format (e.g., "2601")
 * @returns {Object} Cycle object with id, year, cycle number, dates, and sprints
 */
export function getCycleById(cycleId) {
  const year = parseInt(cycleId.slice(0, 2)) + 2000;
  const cycleNum = parseInt(cycleId.slice(2));

  // Calculate days offset from first cycle (2601)
  const yearsFrom2026 = year - 2026;
  const cyclesOffset = yearsFrom2026 * CYCLES_PER_YEAR + (cycleNum - 1);

  const startDate = addDays(FIRST_CYCLE_START, cyclesOffset * CYCLE_DURATION_DAYS);
  const endDate = addDays(startDate, CYCLE_DURATION_DAYS - 1);

  const sprintAStart = startDate;
  const sprintAEnd = addDays(startDate, SPRINT_DURATION_DAYS - 1);
  const sprintBStart = addDays(startDate, SPRINT_DURATION_DAYS);
  const sprintBEnd = endDate;

  return {
    id: cycleId,
    year,
    cycle: cycleNum,
    startDate,
    endDate,
    sprints: [
      {
        id: `${cycleId}a`,
        cycleId,
        label: 'a',
        startDate: sprintAStart,
        endDate: sprintAEnd,
        weeks: [
          { week: 1, startDate: sprintAStart, endDate: addDays(sprintAStart, 6) },
          { week: 2, startDate: addDays(sprintAStart, 7), endDate: sprintAEnd }
        ]
      },
      {
        id: `${cycleId}b`,
        cycleId,
        label: 'b',
        startDate: sprintBStart,
        endDate: sprintBEnd,
        weeks: [
          { week: 1, startDate: sprintBStart, endDate: addDays(sprintBStart, 6) },
          { week: 2, startDate: addDays(sprintBStart, 7), endDate: sprintBEnd }
        ]
      }
    ]
  };
}

/**
 * Get sprint information by sprint ID
 * @param {string} sprintId - Sprint ID (e.g., "2601a")
 * @returns {Object} Sprint object with dates and week breakdown
 */
export function getSprintById(sprintId) {
  const cycleId = sprintId.slice(0, 4);
  const sprintLabel = sprintId.slice(4);
  const cycle = getCycleById(cycleId);

  return cycle.sprints.find(s => s.label === sprintLabel);
}

/**
 * Get cycle and sprint for a given date
 * @param {Date} date - The date to find the cycle for
 * @returns {Object} Object with cycle and sprint info
 */
export function getCycleForDate(date) {
  const normalizedDate = startOfDay(date);
  const daysSinceFirst = differenceInDays(normalizedDate, FIRST_CYCLE_START);

  if (daysSinceFirst < 0) {
    // Before first cycle - return 2601 as fallback
    return getCycleById('2601');
  }

  const cycleIndex = Math.floor(daysSinceFirst / CYCLE_DURATION_DAYS);
  const yearOffset = Math.floor(cycleIndex / CYCLES_PER_YEAR);
  const cycleInYear = (cycleIndex % CYCLES_PER_YEAR) + 1;

  const year = 2026 + yearOffset;
  const cycleId = `${String(year).slice(2)}${String(cycleInYear).padStart(2, '0')}`;

  const cycle = getCycleById(cycleId);

  // Determine which sprint the date falls in
  const daysIntoCycle = daysSinceFirst % CYCLE_DURATION_DAYS;
  const sprintLabel = daysIntoCycle < SPRINT_DURATION_DAYS ? 'a' : 'b';
  const sprint = cycle.sprints.find(s => s.label === sprintLabel);

  return {
    ...cycle,
    currentSprint: sprint
  };
}

/**
 * Get the current cycle based on today's date
 * @returns {Object} Current cycle object
 */
export function getCurrentCycle() {
  return getCycleForDate(new Date());
}

/**
 * List multiple cycles starting from a given cycle
 * @param {string} startCycleId - Starting cycle ID
 * @param {number} count - Number of cycles to return
 * @returns {Array} Array of cycle objects
 */
export function listCycles(startCycleId, count = 3) {
  const cycles = [];
  let currentId = startCycleId;

  for (let i = 0; i < count; i++) {
    cycles.push(getCycleById(currentId));
    currentId = getNextCycleId(currentId);
  }

  return cycles;
}

/**
 * Get all sprints for a range of cycles
 * @param {string} startCycleId - Starting cycle ID
 * @param {number} cycleCount - Number of cycles
 * @returns {Array} Array of sprint objects
 */
export function listSprints(startCycleId, cycleCount = 3) {
  const cycles = listCycles(startCycleId, cycleCount);
  return cycles.flatMap(c => c.sprints);
}

/**
 * Get the next cycle ID
 * @param {string} cycleId - Current cycle ID
 * @returns {string} Next cycle ID
 */
export function getNextCycleId(cycleId) {
  const year = parseInt(cycleId.slice(0, 2)) + 2000;
  const cycleNum = parseInt(cycleId.slice(2));

  if (cycleNum >= CYCLES_PER_YEAR) {
    // Move to next year
    return `${String(year + 1).slice(2)}01`;
  }
  return `${String(year).slice(2)}${String(cycleNum + 1).padStart(2, '0')}`;
}

/**
 * Get the previous cycle ID
 * @param {string} cycleId - Current cycle ID
 * @returns {string} Previous cycle ID
 */
export function getPreviousCycleId(cycleId) {
  const year = parseInt(cycleId.slice(0, 2)) + 2000;
  const cycleNum = parseInt(cycleId.slice(2));

  if (cycleNum <= 1) {
    // Move to previous year
    return `${String(year - 1).slice(2)}${String(CYCLES_PER_YEAR).padStart(2, '0')}`;
  }
  return `${String(year).slice(2)}${String(cycleNum - 1).padStart(2, '0')}`;
}

/**
 * Format cycle label for display
 * @param {string} cycleId - Cycle ID
 * @param {boolean} full - Whether to include "Release Cycle" prefix
 * @returns {string} Formatted label
 */
export function formatCycleLabel(cycleId, full = false) {
  const cycle = getCycleById(cycleId);
  const dateRange = `${format(cycle.startDate, 'MMM d')} - ${format(cycle.endDate, 'MMM d')}`;

  if (full) {
    return `Release Cycle ${cycleId} (${dateRange})`;
  }
  return cycleId;
}

/**
 * Format sprint label for display
 * @param {string} sprintId - Sprint ID (e.g., "2601a")
 * @param {boolean} includeDates - Whether to include date range
 * @returns {string} Formatted label
 */
export function formatSprintLabel(sprintId, includeDates = false) {
  const sprint = getSprintById(sprintId);
  if (!sprint) return sprintId;

  if (includeDates) {
    return `Sprint ${sprintId} (${format(sprint.startDate, 'MMM d')}-${format(sprint.endDate, 'd')})`;
  }
  return `Sprint ${sprintId}`;
}

/**
 * Format date range for display
 * @param {Date} startDate - Start date
 * @param {Date} endDate - End date
 * @returns {string} Formatted date range
 */
export function formatDateRange(startDate, endDate) {
  const startMonth = format(startDate, 'MMM');
  const endMonth = format(endDate, 'MMM');

  if (startMonth === endMonth) {
    return `${format(startDate, 'MMM d')}-${format(endDate, 'd')}`;
  }
  return `${format(startDate, 'MMM d')} - ${format(endDate, 'MMM d')}`;
}

/**
 * Find sprint ID for a given date range (for existing duties)
 * @param {Date} startDate - Duty start date
 * @returns {string|null} Sprint ID if dates align, null otherwise
 */
export function findSprintForDate(startDate) {
  const cycle = getCycleForDate(startDate);

  // Check if start date matches either sprint
  for (const sprint of cycle.sprints) {
    if (startOfDay(sprint.startDate).getTime() === startOfDay(startDate).getTime()) {
      return sprint.id;
    }
    // Also check week starts within sprint
    for (const week of sprint.weeks) {
      if (startOfDay(week.startDate).getTime() === startOfDay(startDate).getTime()) {
        return sprint.id;
      }
    }
  }

  return cycle.currentSprint?.id || null;
}
