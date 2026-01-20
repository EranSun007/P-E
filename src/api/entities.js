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

// Export Backup API (only available with API mode)
export const Backup = USE_API ? apiClient.backup : {
  export: async () => { throw new Error('Backup not available in local mode'); },
  import: async () => { throw new Error('Backup not available in local mode'); }
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
