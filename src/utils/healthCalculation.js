/**
 * Health calculation utility for Team Status dashboard
 * Determines member health status based on blockers, activity, and completion
 */

/**
 * Calculate health status from summary data
 * @param {Object} summary - Member summary with metrics
 * @returns {Object} { status: 'green'|'yellow'|'red', reasoning: string }
 */
export function calculateHealth(summary) {
  const {
    blockerCount = 0,
    completedCount = 0,
    lastUpdateDays = 0,
    itemCount = 0
  } = summary;

  // Red conditions (critical)
  if (blockerCount >= 2) {
    return {
      status: 'red',
      reasoning: `${blockerCount} blockers - immediate attention needed`
    };
  }

  if (lastUpdateDays > 3) {
    return {
      status: 'red',
      reasoning: `No updates in ${lastUpdateDays} days`
    };
  }

  // Yellow conditions (warning)
  if (blockerCount === 1) {
    return {
      status: 'yellow',
      reasoning: '1 blocker - monitor progress'
    };
  }

  if (completedCount === 0 && itemCount > 0 && lastUpdateDays > 1) {
    return {
      status: 'yellow',
      reasoning: 'Low activity, no completed items'
    };
  }

  // Green (healthy)
  const reasonText = completedCount > 0
    ? `${completedCount} items completed, on track`
    : 'No blockers, steady progress';

  return {
    status: 'green',
    reasoning: reasonText
  };
}

/**
 * Get Tailwind border color class for health status
 * @param {string} status - Health status
 * @returns {string} Tailwind class
 */
export function getHealthBorderClass(status) {
  const colors = {
    green: 'border-l-green-500',
    yellow: 'border-l-yellow-500',
    red: 'border-l-red-500'
  };
  return colors[status] || colors.green;
}

/**
 * Get text color class for health status
 * @param {string} status - Health status
 * @returns {string} Tailwind class
 */
export function getHealthTextClass(status) {
  const colors = {
    green: 'text-green-700 border-green-500',
    yellow: 'text-yellow-700 border-yellow-500',
    red: 'text-red-700 border-red-500'
  };
  return colors[status] || colors.green;
}
