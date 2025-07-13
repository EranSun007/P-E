// Shared utilities for status and priority mapping

// Task status constants
export const TASK_STATUS = {
  TODO: 'todo',
  IN_PROGRESS: 'in_progress',
  BLOCKED: 'blocked',
  DONE: 'done',
  BACKLOG: 'backlog'
};

// Task priority constants
export const TASK_PRIORITY = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
  URGENT: 'urgent'
};

// Task type constants
export const TASK_TYPE = {
  GENERIC: 'generic',
  MEETING: 'meeting',
  METRIC: 'metric',
  ACTION: 'action'
};

// Project status constants
export const PROJECT_STATUS = {
  NOT_STARTED: 'not_started',
  IN_PROGRESS: 'in_progress',
  ON_HOLD: 'on_hold',
  COMPLETED: 'completed'
};

// Task status styling
export const TASK_STATUS_STYLES = {
  [TASK_STATUS.TODO]: 'bg-gray-100 text-gray-800 border-gray-200',
  [TASK_STATUS.IN_PROGRESS]: 'bg-blue-100 text-blue-800 border-blue-200',
  [TASK_STATUS.BLOCKED]: 'bg-red-100 text-red-800 border-red-200',
  [TASK_STATUS.DONE]: 'bg-green-100 text-green-800 border-green-200',
  [TASK_STATUS.BACKLOG]: 'bg-purple-100 text-purple-800 border-purple-200'
};

// Task priority styling
export const TASK_PRIORITY_STYLES = {
  [TASK_PRIORITY.LOW]: 'bg-blue-100 text-blue-800 border-blue-200',
  [TASK_PRIORITY.MEDIUM]: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  [TASK_PRIORITY.HIGH]: 'bg-orange-100 text-orange-800 border-orange-200',
  [TASK_PRIORITY.URGENT]: 'bg-red-100 text-red-800 border-red-200'
};

// Task type styling
export const TASK_TYPE_STYLES = {
  [TASK_TYPE.GENERIC]: 'bg-gray-100 text-gray-800 border-gray-200',
  [TASK_TYPE.MEETING]: 'bg-blue-100 text-blue-800 border-blue-200',
  [TASK_TYPE.METRIC]: 'bg-green-100 text-green-800 border-green-200',
  [TASK_TYPE.ACTION]: 'bg-purple-100 text-purple-800 border-purple-200'
};

// Project status styling
export const PROJECT_STATUS_STYLES = {
  [PROJECT_STATUS.NOT_STARTED]: 'bg-gray-100 text-gray-800 border-gray-200',
  [PROJECT_STATUS.IN_PROGRESS]: 'bg-blue-100 text-blue-800 border-blue-200',
  [PROJECT_STATUS.ON_HOLD]: 'bg-amber-100 text-amber-800 border-amber-200',
  [PROJECT_STATUS.COMPLETED]: 'bg-green-100 text-green-800 border-green-200'
};

// Generic status badge function
export const getStatusBadge = (status, styleMap, defaultStyle = 'bg-gray-100 text-gray-800 border-gray-200') => {
  return styleMap[status] || defaultStyle;
};

// Specific helper functions
export const getTaskStatusStyle = (status) => getStatusBadge(status, TASK_STATUS_STYLES);
export const getTaskPriorityStyle = (priority) => getStatusBadge(priority, TASK_PRIORITY_STYLES);
export const getTaskTypeStyle = (type) => getStatusBadge(type, TASK_TYPE_STYLES);
export const getProjectStatusStyle = (status) => getStatusBadge(status, PROJECT_STATUS_STYLES);

// Status display names
export const TASK_STATUS_DISPLAY = {
  [TASK_STATUS.TODO]: 'To Do',
  [TASK_STATUS.IN_PROGRESS]: 'In Progress',
  [TASK_STATUS.BLOCKED]: 'Blocked',
  [TASK_STATUS.DONE]: 'Done',
  [TASK_STATUS.BACKLOG]: 'Backlog'
};

export const TASK_PRIORITY_DISPLAY = {
  [TASK_PRIORITY.LOW]: 'Low',
  [TASK_PRIORITY.MEDIUM]: 'Medium',
  [TASK_PRIORITY.HIGH]: 'High',
  [TASK_PRIORITY.URGENT]: 'Urgent'
};

export const TASK_TYPE_DISPLAY = {
  [TASK_TYPE.GENERIC]: 'Generic',
  [TASK_TYPE.MEETING]: 'Meeting',
  [TASK_TYPE.METRIC]: 'Metric',
  [TASK_TYPE.ACTION]: 'Action'
};

export const PROJECT_STATUS_DISPLAY = {
  [PROJECT_STATUS.NOT_STARTED]: 'Not Started',
  [PROJECT_STATUS.IN_PROGRESS]: 'In Progress',
  [PROJECT_STATUS.ON_HOLD]: 'On Hold',
  [PROJECT_STATUS.COMPLETED]: 'Completed'
};

// Options arrays for dropdowns
export const TASK_STATUS_OPTIONS = Object.values(TASK_STATUS);
export const TASK_PRIORITY_OPTIONS = Object.values(TASK_PRIORITY);
export const TASK_TYPE_OPTIONS = Object.values(TASK_TYPE);
export const PROJECT_STATUS_OPTIONS = Object.values(PROJECT_STATUS);

// Utility functions
export const getDisplayName = (value, displayMap) => {
  return displayMap[value] || value;
};

export const getTaskStatusDisplay = (status) => getDisplayName(status, TASK_STATUS_DISPLAY);
export const getTaskPriorityDisplay = (priority) => getDisplayName(priority, TASK_PRIORITY_DISPLAY);
export const getTaskTypeDisplay = (type) => getDisplayName(type, TASK_TYPE_DISPLAY);
export const getProjectStatusDisplay = (status) => getDisplayName(status, PROJECT_STATUS_DISPLAY);

// Status validation
export const isValidTaskStatus = (status) => Object.values(TASK_STATUS).includes(status);
export const isValidTaskPriority = (priority) => Object.values(TASK_PRIORITY).includes(priority);
export const isValidTaskType = (type) => Object.values(TASK_TYPE).includes(type);
export const isValidProjectStatus = (status) => Object.values(PROJECT_STATUS).includes(status);