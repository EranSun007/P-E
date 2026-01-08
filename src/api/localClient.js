// src/api/localClient.js
// Local storage-based API client for migration from Base44

import { sanitizeInput, validateInput } from '../utils/validation.js';
import { logger } from '../utils/logger.js';

function getData(key) {
  try {
    const data = localStorage.getItem(key);
    if (!data) return [];
    return JSON.parse(data);
  } catch (error) {
    logger.error('Error reading data from localStorage', { key, error: String(error) });
    return [];
  }
}

function setData(key, data) {
  try {
    if (!validateInput.array(data)) {
      throw new Error('Invalid data format - must be an array');
    }
    localStorage.setItem(key, JSON.stringify(data));
  } catch (error) {
    logger.error('Error saving data to localStorage', { key, error: String(error) });
    throw error;
  }
}

function generateId() {
  // Use crypto.randomUUID() for secure ID generation
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  // Fallback for older browsers
  return '_' + Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
}

export const localClient = {
  entities: {
    Task: {
      async list() {
        return getData('tasks');
      },
      async create(task) {
        const tasks = getData('tasks');
        const newTask = { 
          ...task, 
          id: generateId(), 
          created_date: new Date().toISOString(), 
          updated_date: new Date().toISOString(),
          // Initialize new fields with defaults
          due_date: task.due_date || null,
          assignee: task.assignee || null,
          estimated_hours: task.estimated_hours || null,
          actual_hours: task.actual_hours || null,
          completion_date: null
        };
        tasks.unshift(newTask);
        setData('tasks', tasks);
        return newTask;
      },
      async update(id, updates) {
        const tasks = getData('tasks');
        const idx = tasks.findIndex(t => t.id === id);
        if (idx !== -1) {
          const currentTask = tasks[idx];
          const updatedTask = { 
            ...currentTask, 
            ...updates, 
            updated_date: new Date().toISOString() 
          };
          
          // Auto-set completion_date when status changes to "done"
          if (updates.status === "done" && currentTask.status !== "done") {
            updatedTask.completion_date = new Date().toISOString();
          }
          // Clear completion_date if status changes away from "done"
          else if (updates.status && updates.status !== "done" && currentTask.status === "done") {
            updatedTask.completion_date = null;
          }
          
          tasks[idx] = updatedTask;
          setData('tasks', tasks);
          return tasks[idx];
        }
        throw new Error('Task not found');
      },
      async delete(id) {
        let tasks = getData('tasks');
        tasks = tasks.filter(t => t.id !== id);
        setData('tasks', tasks);
        return true;
      }
    },
    Project: {
      async list() {
        return getData('projects');
      },
      async create(project) {
        const projects = getData('projects');
        const newProject = { 
          ...project, 
          id: generateId(), 
          created_date: new Date().toISOString(),
          // Initialize new fields with defaults
          deadline: project.deadline || null,
          budget: project.budget || null,
          cost: project.cost || null,
          priority_level: project.priority_level || 'medium',
          progress_percentage: project.progress_percentage || 0
        };
        projects.unshift(newProject);
        setData('projects', projects);
        return newProject;
      },
      async update(id, updates) {
        const projects = getData('projects');
        const idx = projects.findIndex(p => p.id === id);
        if (idx !== -1) {
          projects[idx] = { ...projects[idx], ...updates };
          setData('projects', projects);
          return projects[idx];
        }
        throw new Error('Project not found');
      },
      async delete(id) {
        let projects = getData('projects');
        projects = projects.filter(p => p.id !== id);
        setData('projects', projects);
        return true;
      }
    },
    Stakeholder: {
      async list() {
        return getData('stakeholders');
      },
      async create(stakeholder) {
        const stakeholders = getData('stakeholders');
        const newStakeholder = { 
          ...stakeholder, 
          id: generateId(), 
          created_date: new Date().toISOString(),
          // Initialize new fields with defaults
          phone: stakeholder.phone || null,
          contact_info: stakeholder.contact_info || null,
          // Rename organization to company for consistency
          company: stakeholder.company || stakeholder.organization || null
        };
        // Remove old organization field if it exists
        delete newStakeholder.organization;
        stakeholders.unshift(newStakeholder);
        setData('stakeholders', stakeholders);
        return newStakeholder;
      },
      async update(id, updates) {
        const stakeholders = getData('stakeholders');
        const idx = stakeholders.findIndex(s => s.id === id);
        if (idx !== -1) {
          const updatedStakeholder = { ...stakeholders[idx], ...updates };
          // Handle organization -> company migration during updates
          if (updates.organization && !updates.company) {
            updatedStakeholder.company = updates.organization;
            delete updatedStakeholder.organization;
          }
          stakeholders[idx] = updatedStakeholder;
          setData('stakeholders', stakeholders);
          return stakeholders[idx];
        }
        throw new Error('Stakeholder not found');
      },
      async delete(id) {
        let stakeholders = getData('stakeholders');
        stakeholders = stakeholders.filter(s => s.id !== id);
        setData('stakeholders', stakeholders);
        return true;
      }
    },
    TeamMember: {
      async list() {
        return getData('team_members');
      },
      async get(id) {
        const members = getData('team_members');
        return members.find(m => m.id === id) || null;
      },
      async create(member) {
        const members = getData('team_members');
        const newMember = { 
          ...member, 
          id: generateId(), 
          created_date: new Date().toISOString(),
          // Initialize new fields with defaults
          phone: member.phone || null,
          company: member.company || null,
          // Leave period fields for vacations/maternity, stored as ISO/date strings
          leave_from: member.leave_from || null,
          leave_to: member.leave_to || null,
          leave_title: member.leave_title || null,
          last_activity: null // Will be calculated dynamically
        };
        members.unshift(newMember);
        setData('team_members', members);
        return newMember;
      },
      async update(id, updates) {
        const members = getData('team_members');
        const idx = members.findIndex(m => m.id === id);
        if (idx !== -1) {
          members[idx] = { ...members[idx], ...updates };
          setData('team_members', members);
          return members[idx];
        }
        throw new Error('Team member not found');
      },
      async delete(id) {
        let members = getData('team_members');
        members = members.filter(m => m.id !== id);
        setData('team_members', members);
        return true;
      }
    },
    OneOnOne: {
      async list() {
        return getData('one_on_ones');
      },
      async create(oneOnOne) {
        const oneOnOnes = getData('one_on_ones');
        const newOneOnOne = { 
          ...oneOnOne, 
          id: generateId(), 
          created_date: new Date().toISOString(),
          updated_date: new Date().toISOString(),
          // Initialize new fields with defaults
          team_member_id: oneOnOne.team_member_id || oneOnOne.participant_id || null,
          status: oneOnOne.status || 'scheduled',
          location: oneOnOne.location || null
        };
        // Remove old participant_id field if it exists
        delete newOneOnOne.participant_id;
        oneOnOnes.unshift(newOneOnOne);
        setData('one_on_ones', oneOnOnes);
        return newOneOnOne;
      },
      async update(id, updates) {
        const oneOnOnes = getData('one_on_ones');
        const idx = oneOnOnes.findIndex(o => o.id === id);
        if (idx !== -1) {
          const updatedOneOnOne = { 
            ...oneOnOnes[idx], 
            ...updates, 
            updated_date: new Date().toISOString() 
          };
          // Handle participant_id -> team_member_id migration during updates
          if (updates.participant_id && !updates.team_member_id) {
            updatedOneOnOne.team_member_id = updates.participant_id;
            delete updatedOneOnOne.participant_id;
          }
          oneOnOnes[idx] = updatedOneOnOne;
          setData('one_on_ones', oneOnOnes);
          return oneOnOnes[idx];
        }
        throw new Error('OneOnOne not found');
      },
      async delete(id) {
        let oneOnOnes = getData('one_on_ones');
        oneOnOnes = oneOnOnes.filter(o => o.id !== id);
        setData('one_on_ones', oneOnOnes);
        return true;
      }
    },
    TaskAttribute: {
      async list() {
        return getData('task_attributes');
      },
      async create(attr) {
        const attrs = getData('task_attributes');
        const newAttr = { 
          ...attr, 
          id: generateId(), 
          created_date: new Date().toISOString(),
          updated_date: new Date().toISOString()
        };
        attrs.unshift(newAttr);
        setData('task_attributes', attrs);
        return newAttr;
      },
      async update(id, updates) {
        const attrs = getData('task_attributes');
        const idx = attrs.findIndex(a => a.id === id);
        if (idx !== -1) {
          attrs[idx] = { 
            ...attrs[idx], 
            ...updates, 
            updated_date: new Date().toISOString() 
          };
          setData('task_attributes', attrs);
          return attrs[idx];
        }
        throw new Error('TaskAttribute not found');
      },
      async delete(id) {
        let attrs = getData('task_attributes');
        attrs = attrs.filter(a => a.id !== id);
        setData('task_attributes', attrs);
        return true;
      }
    },
    Meeting: {
      async list() {
        return getData('meetings');
      },
      async get(id) {
        const meetings = getData('meetings');
        return meetings.find(m => m.id === id) || null;
      },
      async create(meeting) {
        const meetings = getData('meetings');
        const newMeeting = {
          ...meeting,
          id: generateId(),
          created_date: new Date().toISOString(),
          updated_date: new Date().toISOString(),
          // Initialize with defaults
          status: meeting.status || 'scheduled',
          participants: meeting.participants || [],
          agenda_items: meeting.agenda_items || [],
          action_items: meeting.action_items || []
        };
        meetings.unshift(newMeeting);
        setData('meetings', meetings);
        return newMeeting;
      },
      async update(id, updates) {
        const meetings = getData('meetings');
        const idx = meetings.findIndex(m => m.id === id);
        if (idx !== -1) {
          meetings[idx] = {
            ...meetings[idx],
            ...updates,
            updated_date: new Date().toISOString()
          };
          setData('meetings', meetings);
          return meetings[idx];
        }
        throw new Error('Meeting not found');
      },
      async delete(id) {
        let meetings = getData('meetings');
        meetings = meetings.filter(m => m.id !== id);
        setData('meetings', meetings);
        return true;
      }
    },
    CalendarEvent: {
      async list() {
        return getData('calendar_events');
      },
      async get(id) {
        const events = getData('calendar_events');
        return events.find(e => e.id === id) || null;
      },
      async create(event) {
        const events = getData('calendar_events');
        const newEvent = {
          ...event,
          id: generateId(),
          created_date: new Date().toISOString(),
          // Initialize with defaults
          all_day: event.all_day || false,
          recurrence_rule: event.recurrence_rule || null
        };
        events.unshift(newEvent);
        setData('calendar_events', events);
        return newEvent;
      },
      async update(id, updates) {
        const events = getData('calendar_events');
        const idx = events.findIndex(e => e.id === id);
        if (idx !== -1) {
          events[idx] = { ...events[idx], ...updates };
          setData('calendar_events', events);
          return events[idx];
        }
        throw new Error('Calendar event not found');
      },
      async delete(id) {
        let events = getData('calendar_events');
        events = events.filter(e => e.id !== id);
        setData('calendar_events', events);
        return true;
      }
    },
    Notification: {
      async list() {
        return getData('notifications');
      },
      async get(id) {
        const notifications = getData('notifications');
        return notifications.find(n => n.id === id) || null;
      },
      async create(notification) {
        const notifications = getData('notifications');
        const newNotification = {
          ...notification,
          id: generateId(),
          created_date: new Date().toISOString(),
          // Initialize with defaults
          read: notification.read || false,
          scheduled_date: notification.scheduled_date || null
        };
        notifications.unshift(newNotification);
        setData('notifications', notifications);
        return newNotification;
      },
      async update(id, updates) {
        const notifications = getData('notifications');
        const idx = notifications.findIndex(n => n.id === id);
        if (idx !== -1) {
          notifications[idx] = { ...notifications[idx], ...updates };
          setData('notifications', notifications);
          return notifications[idx];
        }
        throw new Error('Notification not found');
      },
      async delete(id) {
        let notifications = getData('notifications');
        notifications = notifications.filter(n => n.id !== id);
        setData('notifications', notifications);
        return true;
      }
    },
    Reminder: {
      async list() {
        return getData('reminders');
      },
      async get(id) {
        const reminders = getData('reminders');
        return reminders.find(r => r.id === id) || null;
      },
      async create(reminder) {
        const reminders = getData('reminders');
        const newReminder = {
          ...reminder,
          id: generateId(),
          created_date: new Date().toISOString(),
          // Initialize with defaults
          completed: reminder.completed || false
        };
        reminders.unshift(newReminder);
        setData('reminders', reminders);
        return newReminder;
      },
      async update(id, updates) {
        const reminders = getData('reminders');
        const idx = reminders.findIndex(r => r.id === id);
        if (idx !== -1) {
          reminders[idx] = { ...reminders[idx], ...updates };
          setData('reminders', reminders);
          return reminders[idx];
        }
        throw new Error('Reminder not found');
      },
      async delete(id) {
        let reminders = getData('reminders');
        reminders = reminders.filter(r => r.id !== id);
        setData('reminders', reminders);
        return true;
      }
    },
    Comment: {
      async list() {
        return getData('comments');
      },
      async get(id) {
        const comments = getData('comments');
        return comments.find(c => c.id === id) || null;
      },
      async create(comment) {
        const comments = getData('comments');
        const newComment = {
          ...comment,
          id: generateId(),
          created_date: new Date().toISOString(),
          updated_date: new Date().toISOString(),
          // Initialize with defaults
          author_name: comment.author_name || 'Local User'
        };
        comments.unshift(newComment);
        setData('comments', comments);
        return newComment;
      },
      async update(id, updates) {
        const comments = getData('comments');
        const idx = comments.findIndex(c => c.id === id);
        if (idx !== -1) {
          comments[idx] = {
            ...comments[idx],
            ...updates,
            updated_date: new Date().toISOString()
          };
          setData('comments', comments);
          return comments[idx];
        }
        throw new Error('Comment not found');
      },
      async delete(id) {
        let comments = getData('comments');
        comments = comments.filter(c => c.id !== id);
        setData('comments', comments);
        return true;
      }
    }
  },
  auth: {
    async me() {
      return { id: 'local-user', name: 'Local User' };
    },
    async logout() {
      return true;
    }
  }
};
