/**
 * AI Agent Service
 * Executes tool calls from the AI by invoking existing services
 */

import TaskService from './TaskService.js';
import ProjectService from './ProjectService.js';
import TeamMemberService from './TeamMemberService.js';
import CalendarEventService from './CalendarEventService.js';
import ReminderService from './ReminderService.js';
import DutyScheduleService from './DutyScheduleService.js';

class AIAgentService {
  /**
   * Execute a tool call
   * @param {string} toolName - Name of the tool to execute
   * @param {Object} args - Arguments for the tool
   * @param {string} userId - The authenticated user's ID
   * @returns {Promise<Object>} Tool execution result
   */
  async executeTool(toolName, args, userId) {
    console.log(`AIAgentService executing tool: ${toolName}`, { args, userId });

    switch (toolName) {
      // ============ READ TOOLS ============
      case 'list_tasks':
        return this.listTasks(userId, args);
      case 'get_task':
        return this.getTask(userId, args.task_id);
      case 'list_projects':
        return this.listProjects(userId, args);
      case 'get_project_details':
        return this.getProjectDetails(userId, args.project_id);
      case 'list_team_members':
        return this.listTeamMembers(userId, args);
      case 'get_team_member_workload':
        return this.getTeamMemberWorkload(userId, args.team_member_id);
      case 'list_upcoming_duties':
        return this.listUpcomingDuties(userId, args);
      case 'list_calendar_events':
        return this.listCalendarEvents(userId, args);
      case 'get_metrics_summary':
        return this.getMetricsSummary(userId, args);

      // ============ WRITE TOOLS ============
      case 'create_task':
        return this.createTask(userId, args);
      case 'update_task':
        return this.updateTask(userId, args);
      case 'delete_task':
        return this.deleteTask(userId, args);
      case 'create_project':
        return this.createProject(userId, args);
      case 'update_project':
        return this.updateProject(userId, args);
      case 'create_calendar_event':
        return this.createCalendarEvent(userId, args);
      case 'update_calendar_event':
        return this.updateCalendarEvent(userId, args);
      case 'create_reminder':
        return this.createReminder(userId, args);

      default:
        throw new Error(`Unknown tool: ${toolName}`);
    }
  }

  // ============================================================================
  // READ TOOL IMPLEMENTATIONS
  // ============================================================================

  async listTasks(userId, args) {
    const tasks = await TaskService.list(userId);
    let filtered = tasks;

    // Apply filters
    if (args.status) {
      filtered = filtered.filter(t => t.status === args.status);
    }
    if (args.priority) {
      filtered = filtered.filter(t => t.priority === args.priority);
    }

    // Apply limit
    const limit = args.limit || 20;
    filtered = filtered.slice(0, limit);

    return {
      count: filtered.length,
      tasks: filtered.map(t => ({
        id: t.id,
        title: t.title,
        status: t.status,
        priority: t.priority,
        type: t.type,
        due_date: t.due_date,
        assignee: t.assignee
      }))
    };
  }

  async getTask(userId, taskId) {
    const tasks = await TaskService.list(userId);
    const task = tasks.find(t => t.id === taskId);
    if (!task) {
      return { error: 'Task not found' };
    }
    return task;
  }

  async listProjects(userId, args) {
    const projects = await ProjectService.list(userId);
    let filtered = projects;

    if (args.status) {
      filtered = filtered.filter(p => p.status === args.status);
    }

    return {
      count: filtered.length,
      projects: filtered.map(p => ({
        id: p.id,
        name: p.name,
        status: p.status,
        deadline: p.deadline,
        priority: p.priority
      }))
    };
  }

  async getProjectDetails(userId, projectId) {
    const projects = await ProjectService.list(userId);
    const project = projects.find(p => p.id === projectId);
    if (!project) {
      return { error: 'Project not found' };
    }

    // Get tasks related to this project
    const tasks = await TaskService.list(userId);
    const projectTasks = tasks.filter(t =>
      t.metadata?.project_id === projectId ||
      t.stakeholders?.includes(projectId)
    );

    return {
      ...project,
      tasks: projectTasks.map(t => ({
        id: t.id,
        title: t.title,
        status: t.status
      }))
    };
  }

  async listTeamMembers(userId, args) {
    const members = await TeamMemberService.list(userId);
    let filtered = members;

    if (args.department) {
      filtered = filtered.filter(m =>
        m.department?.toLowerCase().includes(args.department.toLowerCase())
      );
    }

    return {
      count: filtered.length,
      team_members: filtered.map(m => ({
        id: m.id,
        name: m.name,
        email: m.email,
        role: m.role,
        department: m.department
      }))
    };
  }

  async getTeamMemberWorkload(userId, teamMemberId) {
    const members = await TeamMemberService.list(userId);
    const member = members.find(m => m.id === teamMemberId);
    if (!member) {
      return { error: 'Team member not found' };
    }

    // Get tasks assigned to this team member
    const tasks = await TaskService.list(userId);
    const assignedTasks = tasks.filter(t => t.assignee === teamMemberId);

    const todoCount = assignedTasks.filter(t => t.status === 'todo').length;
    const inProgressCount = assignedTasks.filter(t => t.status === 'in_progress').length;
    const doneCount = assignedTasks.filter(t => t.status === 'done').length;

    return {
      team_member: {
        id: member.id,
        name: member.name
      },
      workload: {
        total_tasks: assignedTasks.length,
        todo: todoCount,
        in_progress: inProgressCount,
        done: doneCount
      },
      assigned_tasks: assignedTasks.slice(0, 10).map(t => ({
        id: t.id,
        title: t.title,
        status: t.status,
        priority: t.priority
      }))
    };
  }

  async listUpcomingDuties(userId, args) {
    const team = args.team || null;
    const duties = await DutyScheduleService.listUpcoming(userId, team);

    return {
      count: duties.length,
      duties: duties.slice(0, args.days || 14)
    };
  }

  async listCalendarEvents(userId, args) {
    const events = await CalendarEventService.list(userId);
    let filtered = events;

    if (args.start_date) {
      const startDate = new Date(args.start_date);
      filtered = filtered.filter(e => new Date(e.start_date) >= startDate);
    }
    if (args.end_date) {
      const endDate = new Date(args.end_date);
      filtered = filtered.filter(e => new Date(e.start_date) <= endDate);
    }

    return {
      count: filtered.length,
      events: filtered.map(e => ({
        id: e.id,
        title: e.title,
        start_date: e.start_date,
        end_date: e.end_date,
        event_type: e.event_type
      }))
    };
  }

  async getMetricsSummary(userId, args) {
    const tasks = await TaskService.list(userId);
    const projects = await ProjectService.list(userId);

    // Calculate metrics
    const tasksByStatus = {
      todo: tasks.filter(t => t.status === 'todo').length,
      in_progress: tasks.filter(t => t.status === 'in_progress').length,
      done: tasks.filter(t => t.status === 'done').length
    };

    const projectsByStatus = {
      active: projects.filter(p => p.status === 'active').length,
      completed: projects.filter(p => p.status === 'completed').length,
      on_hold: projects.filter(p => p.status === 'on_hold').length
    };

    // Calculate completion rate
    const totalTasks = tasks.length;
    const completionRate = totalTasks > 0
      ? Math.round((tasksByStatus.done / totalTasks) * 100)
      : 0;

    // Tasks due soon (next 7 days)
    const now = new Date();
    const weekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    const tasksDueSoon = tasks.filter(t => {
      if (!t.due_date) return false;
      const dueDate = new Date(t.due_date);
      return dueDate >= now && dueDate <= weekFromNow && t.status !== 'done';
    }).length;

    // Overdue tasks
    const overdueTasks = tasks.filter(t => {
      if (!t.due_date) return false;
      return new Date(t.due_date) < now && t.status !== 'done';
    }).length;

    return {
      period: args.period || 'month',
      tasks: {
        total: totalTasks,
        by_status: tasksByStatus,
        completion_rate: `${completionRate}%`,
        due_soon: tasksDueSoon,
        overdue: overdueTasks
      },
      projects: {
        total: projects.length,
        by_status: projectsByStatus
      }
    };
  }

  // ============================================================================
  // WRITE TOOL IMPLEMENTATIONS
  // ============================================================================

  async createTask(userId, args) {
    const taskData = {
      title: args.title,
      description: args.description || null,
      type: args.type || 'task',
      status: args.status || 'todo',
      priority: args.priority,
      due_date: args.due_date || null,
      assignee: args.assignee || null,
      tags: args.tags || [],
      stakeholders: [],
      metadata: {}
    };

    const task = await TaskService.create(userId, taskData);
    return {
      success: true,
      message: `Task "${task.title}" created successfully`,
      task: {
        id: task.id,
        title: task.title,
        status: task.status,
        priority: task.priority
      }
    };
  }

  async updateTask(userId, args) {
    const { task_id, ...updates } = args;

    // Map task_id to id if present in updates
    const cleanUpdates = {};
    for (const [key, value] of Object.entries(updates)) {
      if (value !== undefined) {
        cleanUpdates[key] = value;
      }
    }

    const task = await TaskService.update(userId, task_id, cleanUpdates);
    return {
      success: true,
      message: `Task "${task.title}" updated successfully`,
      task: {
        id: task.id,
        title: task.title,
        status: task.status,
        priority: task.priority
      }
    };
  }

  async deleteTask(userId, args) {
    if (!args.confirm) {
      return {
        success: false,
        message: 'Deletion not confirmed. Set confirm: true to delete.'
      };
    }

    await TaskService.delete(userId, args.task_id);
    return {
      success: true,
      message: 'Task deleted successfully'
    };
  }

  async createProject(userId, args) {
    const projectData = {
      name: args.name,
      description: args.description || null,
      status: args.status || 'active',
      deadline: args.deadline || null,
      priority: args.priority || 'medium'
    };

    const project = await ProjectService.create(userId, projectData);
    return {
      success: true,
      message: `Project "${project.name}" created successfully`,
      project: {
        id: project.id,
        name: project.name,
        status: project.status
      }
    };
  }

  async updateProject(userId, args) {
    const { project_id, ...updates } = args;

    const cleanUpdates = {};
    for (const [key, value] of Object.entries(updates)) {
      if (value !== undefined) {
        cleanUpdates[key] = value;
      }
    }

    const project = await ProjectService.update(userId, project_id, cleanUpdates);
    return {
      success: true,
      message: `Project "${project.name}" updated successfully`,
      project: {
        id: project.id,
        name: project.name,
        status: project.status
      }
    };
  }

  async createCalendarEvent(userId, args) {
    const eventData = {
      title: args.title,
      description: args.description || null,
      start_date: args.start_date,
      end_date: args.end_date || args.start_date,
      event_type: args.event_type || 'meeting',
      participants: args.participants || []
    };

    const event = await CalendarEventService.create(userId, eventData);
    return {
      success: true,
      message: `Event "${event.title}" scheduled for ${event.start_date}`,
      event: {
        id: event.id,
        title: event.title,
        start_date: event.start_date
      }
    };
  }

  async updateCalendarEvent(userId, args) {
    const { event_id, ...updates } = args;

    const cleanUpdates = {};
    for (const [key, value] of Object.entries(updates)) {
      if (value !== undefined) {
        cleanUpdates[key] = value;
      }
    }

    const event = await CalendarEventService.update(userId, event_id, cleanUpdates);
    return {
      success: true,
      message: `Event "${event.title}" updated successfully`,
      event: {
        id: event.id,
        title: event.title,
        start_date: event.start_date
      }
    };
  }

  async createReminder(userId, args) {
    const reminderData = {
      title: args.title,
      reminder_date: args.reminder_date,
      task_id: args.task_id || null,
      is_completed: false
    };

    const reminder = await ReminderService.create(userId, reminderData);
    return {
      success: true,
      message: `Reminder "${reminder.title}" set for ${reminder.reminder_date}`,
      reminder: {
        id: reminder.id,
        title: reminder.title,
        reminder_date: reminder.reminder_date
      }
    };
  }

  /**
   * Create a tool executor function bound to a specific user
   * @param {string} userId - The authenticated user's ID
   * @returns {Function} Bound tool executor
   */
  createToolExecutor(userId) {
    return async (toolName, args) => {
      return this.executeTool(toolName, args, userId);
    };
  }
}

export default new AIAgentService();
