import { localClient } from './localClient';

// Use localClient entities (Task, Project, Stakeholder, TeamMember)
export const Task = localClient.entities.Task;
export const Project = localClient.entities.Project;
export const Stakeholder = localClient.entities.Stakeholder;
export const TeamMember = localClient.entities.TeamMember;
// Optionally add TaskAttribute, OneOnOne if needed
export const TaskAttribute = localClient.entities.TaskAttribute || {};
export const OneOnOne = localClient.entities.OneOnOne || {};

// Remove Base44 auth, use local user only
export const User = { me: async () => ({ id: 'local-user', name: 'Local User' }), logout: async () => true };