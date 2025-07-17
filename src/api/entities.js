import { localClient } from './localClient';

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

// Remove Base44 auth, use local user only
export const User = { me: async () => ({ id: 'local-user', name: 'Local User' }), logout: async () => true };