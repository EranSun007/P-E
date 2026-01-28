/**
 * AI Tool Definitions
 * Defines the tools available to the AI for agentic capabilities
 */

// ============================================================================
// READ TOOLS - Query data without modification
// ============================================================================

export const listTasksTool = {
  type: 'function',
  function: {
    name: 'list_tasks',
    description: 'Get a list of tasks for the current user. Can filter by status, priority, or date range.',
    parameters: {
      type: 'object',
      properties: {
        status: {
          type: 'string',
          enum: ['todo', 'in_progress', 'done'],
          description: 'Filter by task status'
        },
        priority: {
          type: 'string',
          enum: ['low', 'medium', 'high', 'critical'],
          description: 'Filter by priority level'
        },
        limit: {
          type: 'number',
          description: 'Maximum number of tasks to return (default: 20)'
        }
      },
      required: []
    }
  }
};

export const getTaskTool = {
  type: 'function',
  function: {
    name: 'get_task',
    description: 'Get details of a specific task by its ID',
    parameters: {
      type: 'object',
      properties: {
        task_id: {
          type: 'string',
          description: 'The unique ID of the task'
        }
      },
      required: ['task_id']
    }
  }
};

export const listProjectsTool = {
  type: 'function',
  function: {
    name: 'list_projects',
    description: 'Get a list of all projects for the current user',
    parameters: {
      type: 'object',
      properties: {
        status: {
          type: 'string',
          enum: ['active', 'completed', 'on_hold', 'cancelled'],
          description: 'Filter by project status'
        }
      },
      required: []
    }
  }
};

export const getProjectDetailsTool = {
  type: 'function',
  function: {
    name: 'get_project_details',
    description: 'Get full details of a project including associated tasks',
    parameters: {
      type: 'object',
      properties: {
        project_id: {
          type: 'string',
          description: 'The unique ID of the project'
        }
      },
      required: ['project_id']
    }
  }
};

export const listTeamMembersTool = {
  type: 'function',
  function: {
    name: 'list_team_members',
    description: 'Get a list of all team members',
    parameters: {
      type: 'object',
      properties: {
        department: {
          type: 'string',
          description: 'Filter by department'
        }
      },
      required: []
    }
  }
};

export const getTeamMemberWorkloadTool = {
  type: 'function',
  function: {
    name: 'get_team_member_workload',
    description: 'Get the current workload and assigned tasks for a specific team member',
    parameters: {
      type: 'object',
      properties: {
        team_member_id: {
          type: 'string',
          description: 'The unique ID of the team member'
        }
      },
      required: ['team_member_id']
    }
  }
};

export const listUpcomingDutiesTool = {
  type: 'function',
  function: {
    name: 'list_upcoming_duties',
    description: 'Get upcoming duty schedules for the team',
    parameters: {
      type: 'object',
      properties: {
        days: {
          type: 'number',
          description: 'Number of days to look ahead (default: 14)'
        },
        team: {
          type: 'string',
          description: 'Filter by team name'
        }
      },
      required: []
    }
  }
};

export const listCalendarEventsTool = {
  type: 'function',
  function: {
    name: 'list_calendar_events',
    description: 'Get calendar events within a date range',
    parameters: {
      type: 'object',
      properties: {
        start_date: {
          type: 'string',
          description: 'Start date in ISO format (YYYY-MM-DD)'
        },
        end_date: {
          type: 'string',
          description: 'End date in ISO format (YYYY-MM-DD)'
        }
      },
      required: []
    }
  }
};

export const getMetricsSummaryTool = {
  type: 'function',
  function: {
    name: 'get_metrics_summary',
    description: 'Get a summary of task and project metrics including completion rates and progress',
    parameters: {
      type: 'object',
      properties: {
        period: {
          type: 'string',
          enum: ['week', 'month', 'quarter', 'year'],
          description: 'Time period for metrics (default: month)'
        }
      },
      required: []
    }
  }
};

// ============================================================================
// WRITE TOOLS - Create, update, or delete data
// ============================================================================

export const createTaskTool = {
  type: 'function',
  function: {
    name: 'create_task',
    description: 'Create a new task for the user',
    parameters: {
      type: 'object',
      properties: {
        title: {
          type: 'string',
          description: 'Task title (required)'
        },
        description: {
          type: 'string',
          description: 'Detailed description of the task'
        },
        type: {
          type: 'string',
          enum: ['task', 'bug', 'feature', 'meeting', 'review'],
          description: 'Type of task'
        },
        status: {
          type: 'string',
          enum: ['todo', 'in_progress', 'done'],
          description: 'Initial status (default: todo)'
        },
        priority: {
          type: 'string',
          enum: ['low', 'medium', 'high', 'critical'],
          description: 'Priority level'
        },
        due_date: {
          type: 'string',
          description: 'Due date in ISO format (YYYY-MM-DD)'
        },
        assignee: {
          type: 'string',
          description: 'Team member ID to assign the task to'
        },
        tags: {
          type: 'array',
          items: { type: 'string' },
          description: 'Tags for categorizing the task'
        }
      },
      required: ['title', 'type', 'priority']
    }
  }
};

export const updateTaskTool = {
  type: 'function',
  function: {
    name: 'update_task',
    description: 'Update an existing task. Only provide the fields you want to change.',
    parameters: {
      type: 'object',
      properties: {
        task_id: {
          type: 'string',
          description: 'The unique ID of the task to update'
        },
        title: {
          type: 'string',
          description: 'New task title'
        },
        description: {
          type: 'string',
          description: 'New description'
        },
        status: {
          type: 'string',
          enum: ['todo', 'in_progress', 'done'],
          description: 'New status'
        },
        priority: {
          type: 'string',
          enum: ['low', 'medium', 'high', 'critical'],
          description: 'New priority'
        },
        due_date: {
          type: 'string',
          description: 'New due date in ISO format'
        },
        assignee: {
          type: 'string',
          description: 'New assignee team member ID'
        }
      },
      required: ['task_id']
    }
  }
};

export const deleteTaskTool = {
  type: 'function',
  function: {
    name: 'delete_task',
    description: 'Delete a task. This action cannot be undone.',
    parameters: {
      type: 'object',
      properties: {
        task_id: {
          type: 'string',
          description: 'The unique ID of the task to delete'
        },
        confirm: {
          type: 'boolean',
          description: 'Must be true to confirm deletion'
        }
      },
      required: ['task_id', 'confirm']
    }
  }
};

export const createProjectTool = {
  type: 'function',
  function: {
    name: 'create_project',
    description: 'Create a new project',
    parameters: {
      type: 'object',
      properties: {
        name: {
          type: 'string',
          description: 'Project name (required)'
        },
        description: {
          type: 'string',
          description: 'Project description'
        },
        status: {
          type: 'string',
          enum: ['active', 'on_hold'],
          description: 'Initial status (default: active)'
        },
        deadline: {
          type: 'string',
          description: 'Project deadline in ISO format'
        },
        priority: {
          type: 'string',
          enum: ['low', 'medium', 'high', 'critical'],
          description: 'Project priority'
        }
      },
      required: ['name']
    }
  }
};

export const updateProjectTool = {
  type: 'function',
  function: {
    name: 'update_project',
    description: 'Update an existing project',
    parameters: {
      type: 'object',
      properties: {
        project_id: {
          type: 'string',
          description: 'The unique ID of the project'
        },
        name: {
          type: 'string',
          description: 'New project name'
        },
        description: {
          type: 'string',
          description: 'New description'
        },
        status: {
          type: 'string',
          enum: ['active', 'completed', 'on_hold', 'cancelled'],
          description: 'New status'
        },
        deadline: {
          type: 'string',
          description: 'New deadline'
        }
      },
      required: ['project_id']
    }
  }
};

export const createCalendarEventTool = {
  type: 'function',
  function: {
    name: 'create_calendar_event',
    description: 'Schedule a new calendar event',
    parameters: {
      type: 'object',
      properties: {
        title: {
          type: 'string',
          description: 'Event title (required)'
        },
        description: {
          type: 'string',
          description: 'Event description'
        },
        start_date: {
          type: 'string',
          description: 'Start date and time in ISO format'
        },
        end_date: {
          type: 'string',
          description: 'End date and time in ISO format'
        },
        event_type: {
          type: 'string',
          enum: ['meeting', 'deadline', 'reminder', 'other'],
          description: 'Type of event'
        },
        participants: {
          type: 'array',
          items: { type: 'string' },
          description: 'Team member IDs to invite'
        }
      },
      required: ['title', 'start_date']
    }
  }
};

export const updateCalendarEventTool = {
  type: 'function',
  function: {
    name: 'update_calendar_event',
    description: 'Update an existing calendar event',
    parameters: {
      type: 'object',
      properties: {
        event_id: {
          type: 'string',
          description: 'The unique ID of the event'
        },
        title: {
          type: 'string',
          description: 'New event title'
        },
        start_date: {
          type: 'string',
          description: 'New start date and time'
        },
        end_date: {
          type: 'string',
          description: 'New end date and time'
        }
      },
      required: ['event_id']
    }
  }
};

export const createReminderTool = {
  type: 'function',
  function: {
    name: 'create_reminder',
    description: 'Create a reminder for a task or standalone',
    parameters: {
      type: 'object',
      properties: {
        title: {
          type: 'string',
          description: 'Reminder title (required)'
        },
        reminder_date: {
          type: 'string',
          description: 'When to remind in ISO format'
        },
        task_id: {
          type: 'string',
          description: 'Optional task ID to link the reminder to'
        }
      },
      required: ['title', 'reminder_date']
    }
  }
};

// ============================================================================
// Export all tools as a collection
// ============================================================================

export const ALL_TOOLS = [
  // Read tools
  listTasksTool,
  getTaskTool,
  listProjectsTool,
  getProjectDetailsTool,
  listTeamMembersTool,
  getTeamMemberWorkloadTool,
  listUpcomingDutiesTool,
  listCalendarEventsTool,
  getMetricsSummaryTool,
  // Write tools
  createTaskTool,
  updateTaskTool,
  deleteTaskTool,
  createProjectTool,
  updateProjectTool,
  createCalendarEventTool,
  updateCalendarEventTool,
  createReminderTool
];

export const READ_ONLY_TOOLS = [
  listTasksTool,
  getTaskTool,
  listProjectsTool,
  getProjectDetailsTool,
  listTeamMembersTool,
  getTeamMemberWorkloadTool,
  listUpcomingDutiesTool,
  listCalendarEventsTool,
  getMetricsSummaryTool
];
