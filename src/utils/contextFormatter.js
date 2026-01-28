/**
 * Context Formatter
 * Converts page data into natural language summaries for AI context
 */

import { format, isToday, isTomorrow, isThisWeek, isPast } from 'date-fns';

/**
 * Format a date for display in context
 */
function formatDate(dateStr) {
  if (!dateStr) return null;
  const date = new Date(dateStr);
  if (isToday(date)) return 'today';
  if (isTomorrow(date)) return 'tomorrow';
  return format(date, 'MMM d, yyyy');
}

/**
 * Format a time for display
 */
function formatTime(dateStr) {
  if (!dateStr) return null;
  return format(new Date(dateStr), 'h:mm a');
}

/**
 * Format active filters into readable text
 */
function formatFilters(filters) {
  if (!filters || Object.keys(filters).length === 0) return 'no filters applied';

  const parts = [];
  if (filters.status) parts.push(`status "${filters.status}"`);
  if (filters.priority) parts.push(`priority "${filters.priority}"`);
  if (filters.assignee) parts.push(`assigned to "${filters.assignee}"`);
  if (filters.project) parts.push(`project "${filters.project}"`);
  if (filters.type) parts.push(`type "${filters.type}"`);
  if (filters.search) parts.push(`search "${filters.search}"`);

  return parts.length > 0 ? parts.join(', ') : 'no filters applied';
}

/**
 * Format Tasks page context
 */
export function formatTasksContext(tasks = [], filters = {}, selectedTask = null) {
  const lines = ['You are viewing the Tasks page.'];

  // Task counts
  const totalCount = tasks.length;
  const highPriorityCount = tasks.filter(t => t.priority === 'high' || t.priority === 'critical').length;
  const overdueCount = tasks.filter(t => t.due_date && isPast(new Date(t.due_date)) && t.status !== 'done').length;
  const inProgressCount = tasks.filter(t => t.status === 'in_progress').length;
  const todoCount = tasks.filter(t => t.status === 'todo').length;
  const doneCount = tasks.filter(t => t.status === 'done').length;

  if (totalCount === 0) {
    lines.push('There are no tasks visible.');
  } else {
    lines.push(`There are ${totalCount} tasks visible, filtered by: ${formatFilters(filters)}.`);
    lines.push(`Status breakdown: ${todoCount} to-do, ${inProgressCount} in progress, ${doneCount} done.`);

    if (highPriorityCount > 0) {
      lines.push(`${highPriorityCount} ${highPriorityCount === 1 ? 'is' : 'are'} high priority.`);
    }
    if (overdueCount > 0) {
      lines.push(`${overdueCount} ${overdueCount === 1 ? 'is' : 'are'} overdue.`);
    }
  }

  // Selected task details
  if (selectedTask) {
    lines.push('');
    lines.push(`The user has selected task: "${selectedTask.title}" (ID: ${selectedTask.id}).`);
    lines.push(`  - Status: ${selectedTask.status || 'not set'}`);
    lines.push(`  - Priority: ${selectedTask.priority || 'not set'}`);
    if (selectedTask.due_date) {
      lines.push(`  - Due: ${formatDate(selectedTask.due_date)}`);
    }
    if (selectedTask.description) {
      lines.push(`  - Description: ${selectedTask.description.substring(0, 100)}${selectedTask.description.length > 100 ? '...' : ''}`);
    }
  }

  return lines.join('\n');
}

/**
 * Format Calendar page context
 */
export function formatCalendarContext(events = [], viewMode = 'month', selectedDate = null, dateRange = null) {
  const lines = ['You are viewing the Calendar page.'];

  // View info
  const viewModeText = viewMode === 'week' ? 'week' : viewMode === 'day' ? 'day' : 'month';
  if (dateRange) {
    lines.push(`Viewing ${viewModeText} view for ${format(new Date(dateRange.start), 'MMMM yyyy')}.`);
  } else {
    lines.push(`Viewing in ${viewModeText} mode.`);
  }

  // Event count
  if (events.length === 0) {
    lines.push('There are no events in the current view.');
  } else {
    lines.push(`There are ${events.length} events in the current view:`);

    // List up to 10 events
    const displayEvents = events.slice(0, 10);
    displayEvents.forEach(event => {
      const dateStr = formatDate(event.start_date || event.date);
      const timeStr = formatTime(event.start_date || event.date);
      lines.push(`  - "${event.title}" on ${dateStr}${timeStr ? ` at ${timeStr}` : ''}`);
    });

    if (events.length > 10) {
      lines.push(`  ... and ${events.length - 10} more events.`);
    }
  }

  // Selected date
  if (selectedDate) {
    const formattedDate = format(new Date(selectedDate), 'EEEE, MMMM d, yyyy');
    lines.push(`The user is looking at ${formattedDate}.`);
  }

  return lines.join('\n');
}

/**
 * Format Projects page context
 */
export function formatProjectsContext(projects = [], filters = {}, selectedProject = null) {
  const lines = ['You are viewing the Projects page.'];

  const totalCount = projects.length;
  const activeCount = projects.filter(p => p.status === 'active' || p.status === 'in_progress').length;
  const completedCount = projects.filter(p => p.status === 'completed' || p.status === 'done').length;
  const plannedCount = projects.filter(p => p.status === 'planned' || p.status === 'not_started').length;

  if (totalCount === 0) {
    lines.push('There are no projects visible.');
  } else {
    lines.push(`There are ${totalCount} projects: ${activeCount} active, ${completedCount} completed, ${plannedCount} planned.`);

    if (Object.keys(filters).length > 0) {
      lines.push(`Filtered by: ${formatFilters(filters)}.`);
    }
  }

  // Selected project details
  if (selectedProject) {
    lines.push('');
    lines.push(`The user has selected project: "${selectedProject.name}" (ID: ${selectedProject.id}).`);
    lines.push(`  - Status: ${selectedProject.status || 'not set'}`);
    if (selectedProject.description) {
      lines.push(`  - Description: ${selectedProject.description.substring(0, 100)}${selectedProject.description.length > 100 ? '...' : ''}`);
    }
    if (selectedProject.deadline) {
      lines.push(`  - Deadline: ${formatDate(selectedProject.deadline)}`);
    }
    if (selectedProject.tasks) {
      const tasksDone = selectedProject.tasks.filter(t => t.status === 'done').length;
      lines.push(`  - Tasks: ${selectedProject.tasks.length} total (${tasksDone} completed)`);
    }
  }

  return lines.join('\n');
}

/**
 * Format Team page context
 */
export function formatTeamContext(members = [], filters = {}, selectedMember = null) {
  const lines = ['You are viewing the Team page.'];

  if (members.length === 0) {
    lines.push('There are no team members visible.');
  } else {
    lines.push(`There are ${members.length} team members displayed.`);

    // Group by role if available
    const byRole = {};
    members.forEach(m => {
      const role = m.role || 'No role';
      byRole[role] = (byRole[role] || 0) + 1;
    });

    if (Object.keys(byRole).length > 1) {
      const roleBreakdown = Object.entries(byRole)
        .map(([role, count]) => `${count} ${role}`)
        .join(', ');
      lines.push(`Roles: ${roleBreakdown}.`);
    }
  }

  // Selected member details
  if (selectedMember) {
    lines.push('');
    lines.push(`The user has selected: ${selectedMember.name} (ID: ${selectedMember.id}).`);
    if (selectedMember.role) lines.push(`  - Role: ${selectedMember.role}`);
    if (selectedMember.email) lines.push(`  - Email: ${selectedMember.email}`);
    if (selectedMember.skills && selectedMember.skills.length > 0) {
      lines.push(`  - Skills: ${selectedMember.skills.join(', ')}`);
    }
    if (selectedMember.assigned_tasks !== undefined) {
      lines.push(`  - Assigned tasks: ${selectedMember.assigned_tasks}`);
    }
  }

  return lines.join('\n');
}

/**
 * Format Stakeholders page context
 */
export function formatStakeholdersContext(stakeholders = [], filters = {}, selectedStakeholder = null) {
  const lines = ['You are viewing the Stakeholders page.'];

  if (stakeholders.length === 0) {
    lines.push('There are no stakeholders visible.');
  } else {
    lines.push(`There are ${stakeholders.length} stakeholders displayed.`);

    // Group by type if available
    const byType = {};
    stakeholders.forEach(s => {
      const type = s.type || 'Other';
      byType[type] = (byType[type] || 0) + 1;
    });

    if (Object.keys(byType).length > 1) {
      const typeBreakdown = Object.entries(byType)
        .map(([type, count]) => `${count} ${type}`)
        .join(', ');
      lines.push(`Types: ${typeBreakdown}.`);
    }
  }

  // Selected stakeholder
  if (selectedStakeholder) {
    lines.push('');
    lines.push(`The user has selected: ${selectedStakeholder.name} (ID: ${selectedStakeholder.id}).`);
    if (selectedStakeholder.type) lines.push(`  - Type: ${selectedStakeholder.type}`);
    if (selectedStakeholder.organization) lines.push(`  - Organization: ${selectedStakeholder.organization}`);
    if (selectedStakeholder.email) lines.push(`  - Email: ${selectedStakeholder.email}`);
  }

  return lines.join('\n');
}

/**
 * Format Duties page context
 */
export function formatDutiesContext(duties = [], schedules = [], selectedDuty = null) {
  const lines = ['You are viewing the Duties page.'];

  if (duties.length === 0 && schedules.length === 0) {
    lines.push('There are no duties or schedules visible.');
  } else {
    if (duties.length > 0) {
      lines.push(`There are ${duties.length} duty types defined.`);
    }
    if (schedules.length > 0) {
      lines.push(`There are ${schedules.length} duty schedules assigned.`);

      // Show upcoming duties
      const upcoming = schedules
        .filter(s => new Date(s.start_date) >= new Date())
        .slice(0, 5);

      if (upcoming.length > 0) {
        lines.push('Upcoming duties:');
        upcoming.forEach(s => {
          lines.push(`  - ${s.duty_name || 'Duty'}: ${s.assignee_name || 'Unassigned'} (${formatDate(s.start_date)})`);
        });
      }
    }
  }

  if (selectedDuty) {
    lines.push('');
    lines.push(`The user has selected duty: "${selectedDuty.name}" (ID: ${selectedDuty.id}).`);
  }

  return lines.join('\n');
}

/**
 * Format Metrics page context
 */
export function formatMetricsContext(metrics = {}) {
  const lines = ['You are viewing the Metrics page.'];

  if (Object.keys(metrics).length === 0) {
    lines.push('No metrics data is currently displayed.');
  } else {
    lines.push('Current metrics summary:');

    if (metrics.taskCompletion !== undefined) {
      lines.push(`  - Task completion rate: ${metrics.taskCompletion}%`);
    }
    if (metrics.projectsActive !== undefined) {
      lines.push(`  - Active projects: ${metrics.projectsActive}`);
    }
    if (metrics.tasksOverdue !== undefined) {
      lines.push(`  - Overdue tasks: ${metrics.tasksOverdue}`);
    }
    if (metrics.teamUtilization !== undefined) {
      lines.push(`  - Team utilization: ${metrics.teamUtilization}%`);
    }
    if (metrics.upcomingDeadlines !== undefined) {
      lines.push(`  - Upcoming deadlines this week: ${metrics.upcomingDeadlines}`);
    }
  }

  return lines.join('\n');
}

/**
 * Generic page context for pages without specific formatters
 */
export function formatGenericContext(pageName, itemCount = 0, selectedItem = null) {
  const lines = [`You are viewing the ${pageName} page.`];

  if (itemCount > 0) {
    lines.push(`There are ${itemCount} items visible.`);
  }

  if (selectedItem) {
    lines.push(`The user has selected: "${selectedItem.name || selectedItem.title || selectedItem.id}".`);
  }

  return lines.join('\n');
}

export default {
  formatTasksContext,
  formatCalendarContext,
  formatProjectsContext,
  formatTeamContext,
  formatStakeholdersContext,
  formatDutiesContext,
  formatMetricsContext,
  formatGenericContext
};
