import { base44 } from './base44Client';

// Use localClient entities (Task, Project, Stakeholder, TeamMember)
export const Task = base44.entities.Task;
export const Project = base44.entities.Project;
export const Stakeholder = base44.entities.Stakeholder;
export const TeamMember = base44.entities.TeamMember;
// Optionally add TaskAttribute, OneOnOne if needed
export const TaskAttribute = base44.entities.TaskAttribute || {};
export const OneOnOne = base44.entities.OneOnOne || {};

// Remove Base44 auth, use local user only
export const User = { me: async () => ({ id: 'local-user', name: 'Local User' }), logout: async () => true };