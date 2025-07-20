import { localClient } from './localClient.js';

// Export all existing entities
export const Task = localClient.entities.Task;
export const Project = localClient.entities.Project;
export const Stakeholder = localClient.entities.Stakeholder;
export const TeamMember = localClient.entities.TeamMember;
export const TaskAttribute = localClient.entities.TaskAttribute;
export const OneOnOne = localClient.entities.OneOnOne;

// Export new entities
export const Meeting = localClient.entities.Meeting;
export const CalendarEvent = localClient.entities.CalendarEvent;
export const Notification = localClient.entities.Notification;
export const Reminder = localClient.entities.Reminder;
export const Comment = localClient.entities.Comment;
export const OutOfOffice = localClient.entities.OutOfOffice;
export const Peer = localClient.entities.Peer;

// User entity that works with new authentication system
export const User = {
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