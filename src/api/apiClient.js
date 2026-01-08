// src/api/apiClient.js
// HTTP-based API client for PostgreSQL backend

import { logger } from '../utils/logger.js';

// Get API base URL from environment
const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

// Helper function to handle HTTP errors
function handleHttpError(response, endpoint) {
  if (!response.ok) {
    const error = new Error(`HTTP ${response.status} - ${response.statusText} at ${endpoint}`);
    error.status = response.status;
    logger.error('HTTP request failed', {
      endpoint,
      status: response.status,
      statusText: response.statusText
    });
    throw error;
  }
}

// Helper function to make authenticated requests
async function fetchWithAuth(url, options = {}) {
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  // In development mode, no Authorization header needed (auth middleware bypasses)
  // In production, XSUAA token would be added here
  const authMode = import.meta.env.VITE_AUTH_MODE || 'development';
  if (authMode !== 'development') {
    // TODO: Add XSUAA token from session/auth context
    // const token = getAuthToken();
    // if (token) headers['Authorization'] = `Bearer ${token}`;
  }

  try {
    const response = await fetch(url, {
      ...options,
      headers,
    });

    handleHttpError(response, url);

    // Handle 204 No Content responses
    if (response.status === 204) {
      return null;
    }

    return await response.json();
  } catch (error) {
    logger.error('API request failed', { url, error: String(error) });
    throw error;
  }
}

// Create entity client with standard CRUD operations
function createEntityClient(endpoint) {
  return {
    async list() {
      return fetchWithAuth(`${API_BASE_URL}${endpoint}`);
    },

    async get(id) {
      return fetchWithAuth(`${API_BASE_URL}${endpoint}/${id}`);
    },

    async create(data) {
      return fetchWithAuth(`${API_BASE_URL}${endpoint}`, {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },

    async update(id, updates) {
      return fetchWithAuth(`${API_BASE_URL}${endpoint}/${id}`, {
        method: 'PUT',
        body: JSON.stringify(updates),
      });
    },

    async delete(id) {
      await fetchWithAuth(`${API_BASE_URL}${endpoint}/${id}`, {
        method: 'DELETE',
      });
      return true;
    },
  };
}

export const apiClient = {
  entities: {
    Task: createEntityClient('/tasks'),
    Project: createEntityClient('/projects'),
    Stakeholder: createEntityClient('/stakeholders'),
    TeamMember: createEntityClient('/team-members'),
    OneOnOne: createEntityClient('/one-on-ones'),
    Meeting: createEntityClient('/meetings'),
    CalendarEvent: createEntityClient('/calendar-events'),
    Notification: createEntityClient('/notifications'),
    Reminder: createEntityClient('/reminders'),
    Comment: createEntityClient('/comments'),
    TaskAttribute: createEntityClient('/task-attributes'),
  },

  auth: {
    async me() {
      return fetchWithAuth(`${API_BASE_URL}/auth/me`);
    },

    async logout() {
      // TODO: Implement XSUAA logout
      return true;
    },
  },
};
