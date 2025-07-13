// src/api/localClient.js
// Local storage-based API client for migration from Base44

import { sanitizeInput, validateInput } from '../utils/validation.js';

function getData(key) {
  try {
    const data = localStorage.getItem(key);
    if (!data) return [];
    return JSON.parse(data);
  } catch (error) {
    console.error(`Error reading data from localStorage key "${key}":`, error);
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
    console.error(`Error saving data to localStorage key "${key}":`, error);
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
        const newTask = { ...task, id: generateId(), created_date: new Date().toISOString(), updated_date: new Date().toISOString() };
        tasks.unshift(newTask);
        setData('tasks', tasks);
        return newTask;
      },
      async update(id, updates) {
        const tasks = getData('tasks');
        const idx = tasks.findIndex(t => t.id === id);
        if (idx !== -1) {
          tasks[idx] = { ...tasks[idx], ...updates, updated_date: new Date().toISOString() };
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
        const newProject = { ...project, id: generateId(), created_date: new Date().toISOString() };
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
        const newStakeholder = { ...stakeholder, id: generateId(), created_date: new Date().toISOString() };
        stakeholders.unshift(newStakeholder);
        setData('stakeholders', stakeholders);
        return newStakeholder;
      },
      async update(id, updates) {
        const stakeholders = getData('stakeholders');
        const idx = stakeholders.findIndex(s => s.id === id);
        if (idx !== -1) {
          stakeholders[idx] = { ...stakeholders[idx], ...updates };
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
        const newMember = { ...member, id: generateId(), created_date: new Date().toISOString() };
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
        const newOneOnOne = { ...oneOnOne, id: generateId(), created_date: new Date().toISOString() };
        oneOnOnes.unshift(newOneOnOne);
        setData('one_on_ones', oneOnOnes);
        return newOneOnOne;
      },
      async update(id, updates) {
        const oneOnOnes = getData('one_on_ones');
        const idx = oneOnOnes.findIndex(o => o.id === id);
        if (idx !== -1) {
          oneOnOnes[idx] = { ...oneOnOnes[idx], ...updates };
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
        const newAttr = { ...attr, id: generateId(), created_date: new Date().toISOString() };
        attrs.unshift(newAttr);
        setData('task_attributes', attrs);
        return newAttr;
      },
      async update(id, updates) {
        const attrs = getData('task_attributes');
        const idx = attrs.findIndex(a => a.id === id);
        if (idx !== -1) {
          attrs[idx] = { ...attrs[idx], ...updates };
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
    // Add more entities as needed
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
