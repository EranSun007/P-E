// Switch between localStorage (localClient) and PostgreSQL (apiClient)
// Controlled by environment variable for gradual migration
import { localClient } from './localClient';
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

// Auth - use apiClient for authentication
export const User = USE_API ? apiClient.auth : localClient.auth;