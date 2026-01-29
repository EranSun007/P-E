// Switch between localStorage (localClient) and PostgreSQL (apiClient)
// Controlled by environment variable for gradual migration
import { localClient } from './localClient.js';
import { apiClient } from './apiClient';

// Use API_MODE=local to keep using localStorage during testing
const USE_API = import.meta.env.VITE_API_MODE !== 'local';
const client = USE_API ? apiClient : localClient;

// Export all existing entities
export const Task = client.entities.Task;
export const Project = client.entities.Project;
export const Stakeholder = client.entities.Stakeholder;
export const TeamMember = client.entities.TeamMember;
export const TaskAttribute = client.entities.TaskAttribute;
export const OneOnOne = client.entities.OneOnOne;

// Export new entities
export const Meeting = client.entities.Meeting;
export const CalendarEvent = client.entities.CalendarEvent;
export const Notification = client.entities.Notification;
export const Reminder = client.entities.Reminder;
export const Comment = client.entities.Comment;
export const WorkItem = client.entities.WorkItem;
export const OutOfOffice = client.entities.OutOfOffice;
export const Peer = client.entities.Peer;
export const Duty = client.entities.Duty;
export const AgendaItem = client.entities.AgendaItem;
export const PersonalFileItem = client.entities.PersonalFileItem;
export const DeveloperGoal = client.entities.DeveloperGoal;
export const PerformanceEvaluation = client.entities.PerformanceEvaluation;
export const DevOpsDuty = client.entities.DevOpsDuty;
export const DutySchedule = client.entities.DutySchedule;
export const TimeOff = client.entities.TimeOff;

// Export Backup API (only available with API mode)
export const Backup = USE_API ? apiClient.backup : {
  export: async () => { throw new Error('Backup not available in local mode'); },
  import: async () => { throw new Error('Backup not available in local mode'); }
};

// GitHub Integration API (only available with API mode)
export const GitHub = USE_API ? apiClient.github : {
  listRepos: async () => { throw new Error('GitHub integration not available in local mode'); },
  addRepo: async () => { throw new Error('GitHub integration not available in local mode'); },
  getRepo: async () => { throw new Error('GitHub integration not available in local mode'); },
  removeRepo: async () => { throw new Error('GitHub integration not available in local mode'); },
  searchRepos: async () => { throw new Error('GitHub integration not available in local mode'); },
  linkRepoToProject: async () => { throw new Error('GitHub integration not available in local mode'); },
  syncRepo: async () => { throw new Error('GitHub integration not available in local mode'); },
  syncAllRepos: async () => { throw new Error('GitHub integration not available in local mode'); },
  getPullRequests: async () => { throw new Error('GitHub integration not available in local mode'); },
  getIssues: async () => { throw new Error('GitHub integration not available in local mode'); },
  getCommits: async () => { throw new Error('GitHub integration not available in local mode'); },
};

// User Settings API (only available with API mode)
export const UserSettings = USE_API ? apiClient.userSettings : {
  getGitHubStatus: async () => ({ connected: false, message: 'Not available in local mode' }),
  setGitHubToken: async () => { throw new Error('User settings not available in local mode'); },
  deleteGitHubToken: async () => { throw new Error('User settings not available in local mode'); },
  get: async () => null,
  set: async () => { throw new Error('User settings not available in local mode'); },
  delete: async () => { throw new Error('User settings not available in local mode'); },
};

// Jira Integration API (only available with API mode)
export const JiraIssue = USE_API ? apiClient.entities.JiraIssue : {
  list: async () => { throw new Error('Jira integration not available in local mode'); },
  listWithFilters: async () => { throw new Error('Jira integration not available in local mode'); },
  getFilterOptions: async () => { throw new Error('Jira integration not available in local mode'); },
  getSyncStatus: async () => { throw new Error('Jira integration not available in local mode'); },
  get: async () => { throw new Error('Jira integration not available in local mode'); },
  create: async () => { throw new Error('Jira integration not available in local mode'); },
  update: async () => { throw new Error('Jira integration not available in local mode'); },
  delete: async () => { throw new Error('Jira integration not available in local mode'); },
};

export const JiraMapping = USE_API ? apiClient.entities.JiraMapping : {
  list: async () => { throw new Error('Jira mapping not available in local mode'); },
  get: async () => { throw new Error('Jira mapping not available in local mode'); },
  create: async () => { throw new Error('Jira mapping not available in local mode'); },
  update: async () => { throw new Error('Jira mapping not available in local mode'); },
  delete: async () => { throw new Error('Jira mapping not available in local mode'); },
};

// Capture Framework (only available with API mode)
export const CaptureInbox = USE_API ? apiClient.entities.CaptureInbox : {
  list: async () => { throw new Error('Capture inbox not available in local mode'); },
  get: async () => { throw new Error('Capture inbox not available in local mode'); },
  create: async () => { throw new Error('Capture inbox not available in local mode'); },
  accept: async () => { throw new Error('Capture inbox not available in local mode'); },
  reject: async () => { throw new Error('Capture inbox not available in local mode'); },
  bulkAccept: async () => { throw new Error('Capture inbox not available in local mode'); },
  bulkReject: async () => { throw new Error('Capture inbox not available in local mode'); },
};

export const EntityMapping = USE_API ? apiClient.entities.EntityMapping : {
  list: async () => { throw new Error('Entity mapping not available in local mode'); },
  get: async () => { throw new Error('Entity mapping not available in local mode'); },
  create: async () => { throw new Error('Entity mapping not available in local mode'); },
  update: async () => { throw new Error('Entity mapping not available in local mode'); },
  delete: async () => { throw new Error('Entity mapping not available in local mode'); },
  lookup: async () => { throw new Error('Entity mapping not available in local mode'); },
};

export const CaptureRule = USE_API ? apiClient.entities.CaptureRule : {
  list: async () => { throw new Error('Capture rules not available in local mode'); },
  get: async () => { throw new Error('Capture rules not available in local mode'); },
  create: async () => { throw new Error('Capture rules not available in local mode'); },
  update: async () => { throw new Error('Capture rules not available in local mode'); },
  delete: async () => { throw new Error('Capture rules not available in local mode'); },
};

// User entity that works with both authentication systems
export const User = USE_API ? apiClient.auth : {
  me: async () => {
    // Import AuthService to get current user from token
    const AuthService = (await import('../services/authService.js')).default;
    const token = AuthService.getStoredToken();

    if (!token) {
      throw new Error('No authenticated user found');
    }

    // Create user display name based on username
    const displayName = token.username === 'admin'
      ? 'Administrator'
      : token.username.charAt(0).toUpperCase() + token.username.slice(1);

    return {
      id: 'local-user',
      name: displayName,
      username: token.username,
      isAuthenticated: true,
      loginTime: new Date(token.timestamp).toISOString()
    };
  },
  logout: async () => {
    // Import AuthService to handle logout
    const AuthService = (await import('../services/authService.js')).default;
    AuthService.clearAuthData();
    return true;
  }
};

// TeamSync Integration (v1.6)
export const SyncItem = USE_API ? apiClient.entities.SyncItem : {
  list: async () => { throw new Error('Sync not available in local mode'); },
  get: async () => { throw new Error('Sync not available in local mode'); },
  create: async () => { throw new Error('Sync not available in local mode'); },
  update: async () => { throw new Error('Sync not available in local mode'); },
  delete: async () => { throw new Error('Sync not available in local mode'); },
  getArchived: async () => { throw new Error('Sync not available in local mode'); },
  getArchivedCount: async () => { throw new Error('Sync not available in local mode'); },
  restore: async () => { throw new Error('Sync not available in local mode'); },
  listSubtasks: async () => { throw new Error('Sync not available in local mode'); },
  createSubtask: async () => { throw new Error('Sync not available in local mode'); },
  updateSubtask: async () => { throw new Error('Sync not available in local mode'); },
  deleteSubtask: async () => { throw new Error('Sync not available in local mode'); },
  reorderSubtasks: async () => { throw new Error('Sync not available in local mode'); },
};

export const SyncSettings = USE_API ? apiClient.sync.settings : {
  get: async () => { throw new Error('Sync settings not available in local mode'); },
  update: async () => { throw new Error('Sync settings not available in local mode'); },
};
