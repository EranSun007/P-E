// src/api/apiClient.js
// HTTP-based API client for PostgreSQL backend

import { logger } from '../utils/logger.js';
import AuthService from '../services/authService.js';

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

    // Handle 401 Unauthorized by clearing auth data
    // Note: Don't reload here - let the AuthContext handle the redirect to login
    // Reloading causes an infinite loop when AppContext loads before authentication
    if (response.status === 401) {
      AuthService.clearAuthData();
    }

    throw error;
  }
}

// Default request timeout in milliseconds (30 seconds)
const DEFAULT_TIMEOUT = 30000;

// Helper function to make authenticated requests with timeout
async function fetchWithAuth(url, options = {}) {
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  // Add JWT token if available
  const token = AuthService.getToken();
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  // Set up AbortController for timeout
  const controller = new AbortController();
  const timeout = options.timeout || DEFAULT_TIMEOUT;
  const timeoutId = setTimeout(() => {
    controller.abort();
  }, timeout);

  try {
    const response = await fetch(url, {
      ...options,
      headers,
      signal: controller.signal,
    });

    handleHttpError(response, url);

    // Handle 204 No Content responses
    if (response.status === 204) {
      return null;
    }

    return await response.json();
  } catch (error) {
    // Handle abort/timeout errors
    if (error.name === 'AbortError') {
      const timeoutError = new Error(`Request timeout after ${timeout}ms: ${url}`);
      timeoutError.name = 'TimeoutError';
      timeoutError.url = url;
      logger.error('API request timeout', { url, timeout });
      throw timeoutError;
    }
    logger.error('API request failed', { url, error: String(error) });
    throw error;
  } finally {
    clearTimeout(timeoutId);
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

// Create WorkItem client with custom addInsight method
function createWorkItemClient() {
  const baseClient = createEntityClient('/work-items');

  return {
    ...baseClient,

    async listByTeamMember(teamMemberId, status = null) {
      let url = `${API_BASE_URL}/work-items?team_member_id=${teamMemberId}`;
      if (status) {
        url += `&status=${status}`;
      }
      return fetchWithAuth(url);
    },

    async addInsight(workItemId, insight) {
      return fetchWithAuth(`${API_BASE_URL}/work-items/${workItemId}/insights`, {
        method: 'POST',
        body: JSON.stringify(insight),
      });
    },
  };
}

// Create DeveloperGoal client with custom list method
function createDeveloperGoalClient() {
  const baseClient = createEntityClient('/developer-goals');

  return {
    ...baseClient,

    async list(teamMemberId, year = null) {
      let url = `${API_BASE_URL}/developer-goals?team_member_id=${teamMemberId}`;
      if (year) {
        url += `&year=${year}`;
      }
      return fetchWithAuth(url);
    },
  };
}

// Create PerformanceEvaluation client with custom methods
function createPerformanceEvaluationClient() {
  const baseClient = createEntityClient('/performance-evaluations');

  return {
    ...baseClient,

    async list(teamMemberId) {
      return fetchWithAuth(`${API_BASE_URL}/performance-evaluations?team_member_id=${teamMemberId}`);
    },

    async getByYear(teamMemberId, year) {
      return fetchWithAuth(`${API_BASE_URL}/performance-evaluations/by-year?team_member_id=${teamMemberId}&year=${year}`);
    },
  };
}

// Create TaskAttribute client with bulkCreate method
function createTaskAttributeClient() {
  const baseClient = createEntityClient('/task-attributes');

  return {
    ...baseClient,

    async bulkCreate(attributes) {
      // Create attributes one at a time (backend doesn't have bulk endpoint)
      const results = [];
      for (const attr of attributes) {
        try {
          const result = await fetchWithAuth(`${API_BASE_URL}/task-attributes`, {
            method: 'POST',
            body: JSON.stringify(attr),
          });
          results.push(result);
        } catch (error) {
          // Skip duplicates silently
          console.warn('Failed to create attribute:', attr.name, error);
        }
      }
      return results;
    },
  };
}

// Create DevOpsDuty client with custom methods
function createDevOpsDutyClient() {
  const baseClient = createEntityClient('/devops-duties');

  return {
    ...baseClient,

    async listByTeamMember(teamMemberId) {
      return fetchWithAuth(`${API_BASE_URL}/devops-duties/team-member/${teamMemberId}`);
    },

    async addInsight(dutyId, insight) {
      return fetchWithAuth(`${API_BASE_URL}/devops-duties/${dutyId}/insights`, {
        method: 'POST',
        body: JSON.stringify({ insight }),
      });
    },

    async complete(dutyId, endData) {
      return fetchWithAuth(`${API_BASE_URL}/devops-duties/${dutyId}/complete`, {
        method: 'POST',
        body: JSON.stringify(endData),
      });
    },
  };
}

// Create DutySchedule client with custom methods for duty rotation scheduling
function createDutyScheduleClient() {
  const baseClient = createEntityClient('/duty-schedule');

  return {
    ...baseClient,

    async listUpcoming(team = null) {
      let url = `${API_BASE_URL}/duty-schedule/upcoming`;
      if (team) {
        url += `?team=${encodeURIComponent(team)}`;
      }
      return fetchWithAuth(url);
    },

    async listByDateRange(startDate, endDate, filters = {}) {
      let url = `${API_BASE_URL}/duty-schedule/date-range?start_date=${startDate}&end_date=${endDate}`;
      if (filters.team) {
        url += `&team=${encodeURIComponent(filters.team)}`;
      }
      if (filters.duty_type) {
        url += `&duty_type=${encodeURIComponent(filters.duty_type)}`;
      }
      return fetchWithAuth(url);
    },

    async listByTeam(team) {
      return fetchWithAuth(`${API_BASE_URL}/duty-schedule?team=${encodeURIComponent(team)}`);
    },

    async getTeamMembers(department) {
      return fetchWithAuth(`${API_BASE_URL}/duty-schedule/team-members/${encodeURIComponent(department)}`);
    },
  };
}

// Create TimeOff client with custom methods for time off / OOO tracking
function createTimeOffClient() {
  const baseClient = createEntityClient('/time-off');

  return {
    ...baseClient,

    async listByDateRange(startDate, endDate, filters = {}) {
      let url = `${API_BASE_URL}/time-off/date-range?start_date=${startDate}&end_date=${endDate}`;
      if (filters.team_member_id) {
        url += `&team_member_id=${encodeURIComponent(filters.team_member_id)}`;
      }
      if (filters.type) {
        url += `&type=${encodeURIComponent(filters.type)}`;
      }
      return fetchWithAuth(url);
    },

    async listUpcoming(days = 30) {
      return fetchWithAuth(`${API_BASE_URL}/time-off/upcoming?days=${days}`);
    },

    async listByTeamMember(teamMemberId) {
      return fetchWithAuth(`${API_BASE_URL}/time-off/team-member/${teamMemberId}`);
    },
  };
}

// Create CaptureInbox client with custom methods for inbox workflow
function createCaptureInboxClient() {
  const baseClient = createEntityClient('/capture-inbox');

  return {
    ...baseClient,

    // Accept item with optional entity mapping
    async accept(id, data = {}) {
      return fetchWithAuth(`${API_BASE_URL}/capture-inbox/${id}/accept`, {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },

    // Reject item with optional reason
    async reject(id, data = {}) {
      return fetchWithAuth(`${API_BASE_URL}/capture-inbox/${id}/reject`, {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },

    // Bulk accept multiple items
    async bulkAccept(itemIds, options = {}) {
      return fetchWithAuth(`${API_BASE_URL}/capture-inbox/bulk-accept`, {
        method: 'POST',
        body: JSON.stringify({ item_ids: itemIds, ...options }),
      });
    },

    // Bulk reject multiple items
    async bulkReject(itemIds) {
      return fetchWithAuth(`${API_BASE_URL}/capture-inbox/bulk-reject`, {
        method: 'POST',
        body: JSON.stringify({ item_ids: itemIds }),
      });
    },
  };
}

// Create EntityMapping client with lookup method
function createEntityMappingClient() {
  const baseClient = createEntityClient('/entity-mappings');

  return {
    ...baseClient,

    // Lookup existing mapping by source identifier
    async lookup(sourceIdentifier) {
      return fetchWithAuth(
        `${API_BASE_URL}/entity-mappings/lookup/${encodeURIComponent(sourceIdentifier)}`
      );
    },
  };
}

// Create SyncItem client with custom list, archive, and subtask methods
function createSyncItemClient() {
  const baseClient = createEntityClient('/sync');

  return {
    ...baseClient,

    // List sync items with optional filtering
    async list(filters = {}) {
      const params = new URLSearchParams();
      if (filters.category) params.append('category', filters.category);
      if (filters.teamDepartment) params.append('teamDepartment', filters.teamDepartment);
      if (filters.archived !== undefined) params.append('archived', filters.archived);
      const queryString = params.toString();
      return fetchWithAuth(`${API_BASE_URL}/sync${queryString ? '?' + queryString : ''}`);
    },

    // Get archived sync items with date filtering
    async getArchived(filters = {}) {
      const params = new URLSearchParams();
      if (filters.from_date) params.append('from_date', filters.from_date);
      if (filters.to_date) params.append('to_date', filters.to_date);
      const queryString = params.toString();
      return fetchWithAuth(`${API_BASE_URL}/sync/archived${queryString ? '?' + queryString : ''}`);
    },

    // Get count of archived sync items
    async getArchivedCount() {
      return fetchWithAuth(`${API_BASE_URL}/sync/archived/count`);
    },

    // Restore an archived sync item
    async restore(id) {
      return fetchWithAuth(`${API_BASE_URL}/sync/${id}/restore`, {
        method: 'PUT',
      });
    },

    // Subtask operations
    async listSubtasks(itemId) {
      return fetchWithAuth(`${API_BASE_URL}/sync/${itemId}/subtasks`);
    },

    async createSubtask(itemId, data) {
      return fetchWithAuth(`${API_BASE_URL}/sync/${itemId}/subtasks`, {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },

    async updateSubtask(itemId, subtaskId, updates) {
      return fetchWithAuth(`${API_BASE_URL}/sync/${itemId}/subtasks/${subtaskId}`, {
        method: 'PUT',
        body: JSON.stringify(updates),
      });
    },

    async deleteSubtask(itemId, subtaskId) {
      await fetchWithAuth(`${API_BASE_URL}/sync/${itemId}/subtasks/${subtaskId}`, {
        method: 'DELETE',
      });
      return true;
    },

    async reorderSubtasks(itemId, orderedSubtaskIds) {
      return fetchWithAuth(`${API_BASE_URL}/sync/${itemId}/subtasks/reorder`, {
        method: 'PUT',
        body: JSON.stringify({ orderedSubtaskIds }),
      });
    },
  };
}

// Create SyncSettings client
function createSyncSettingsClient() {
  return {
    async get() {
      return fetchWithAuth(`${API_BASE_URL}/sync/settings`);
    },

    async update(updates) {
      return fetchWithAuth(`${API_BASE_URL}/sync/settings`, {
        method: 'PUT',
        body: JSON.stringify(updates),
      });
    },
  };
}

// Create Notification client with custom methods
function createNotificationClient() {
  const baseClient = createEntityClient('/notifications');

  return {
    ...baseClient,

    // Get count of unread notifications
    async getUnreadCount() {
      return fetchWithAuth(`${API_BASE_URL}/notifications/unread-count`);
    },

    // Mark notification as read (convenience wrapper)
    async markAsRead(id) {
      return baseClient.update(id, { read: true });
    },

    // Mark all notifications as read
    async markAllAsRead() {
      const notifications = await baseClient.list();
      const unread = notifications.filter(n => !n.read);
      await Promise.all(unread.map(n => baseClient.update(n.id, { read: true })));
      return { updated: unread.length };
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
    Notification: createNotificationClient(),
    Reminder: createEntityClient('/reminders'),
    Comment: createEntityClient('/comments'),
    TaskAttribute: createTaskAttributeClient(),
    WorkItem: createWorkItemClient(),
    DeveloperGoal: createDeveloperGoalClient(),
    PerformanceEvaluation: createPerformanceEvaluationClient(),
    DevOpsDuty: createDevOpsDutyClient(),
    DutySchedule: createDutyScheduleClient(),
    TimeOff: createTimeOffClient(),

    // Jira Integration
    JiraIssue: {
      ...createEntityClient('/jira-issues'),

      // Get all issues with optional filters
      async listWithFilters(filters = {}) {
        const params = new URLSearchParams();
        if (filters.status) params.append('status', filters.status);
        if (filters.assignee) params.append('assignee', filters.assignee);
        if (filters.sprint) params.append('sprint', filters.sprint);
        const queryString = params.toString();
        const url = `${API_BASE_URL}/jira-issues${queryString ? '?' + queryString : ''}`;
        return fetchWithAuth(url);
      },

      // Get unique filter options (statuses, assignees, sprints)
      async getFilterOptions() {
        return fetchWithAuth(`${API_BASE_URL}/jira-issues/filters`);
      },

      // Get sync status (last synced timestamp, issue count)
      async getSyncStatus() {
        return fetchWithAuth(`${API_BASE_URL}/jira-issues/status`);
      }
    },

    JiraMapping: createEntityClient('/jira-issues/mappings'),

    // Additional entities (stored in localStorage until backend routes are created)
    Peer: createEntityClient('/peers'),
    Duty: createEntityClient('/duties'),
    AgendaItem: createEntityClient('/agenda-items'),
    PersonalFileItem: createEntityClient('/personal-file-items'),

    // Capture Framework
    CaptureInbox: createCaptureInboxClient(),
    EntityMapping: createEntityMappingClient(),
    CaptureRule: createEntityClient('/capture-rules'),

    // TeamSync Integration (v1.6)
    SyncItem: createSyncItemClient(),
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

  backup: {
    async export() {
      return fetchWithAuth(`${API_BASE_URL}/backup/export`);
    },

    async import(data, mode = 'merge') {
      return fetchWithAuth(`${API_BASE_URL}/backup/import`, {
        method: 'POST',
        body: JSON.stringify({ data, mode }),
      });
    },
  },

  // User Settings API
  userSettings: {
    async getGitHubStatus() {
      return fetchWithAuth(`${API_BASE_URL}/user-settings/github/status`);
    },

    async setGitHubToken(token) {
      return fetchWithAuth(`${API_BASE_URL}/user-settings/github/token`, {
        method: 'POST',
        body: JSON.stringify({ token }),
      });
    },

    async deleteGitHubToken() {
      return fetchWithAuth(`${API_BASE_URL}/user-settings/github/token`, {
        method: 'DELETE',
      });
    },

    async get(key) {
      return fetchWithAuth(`${API_BASE_URL}/user-settings/${key}`);
    },

    async set(key, value, encrypted = false) {
      return fetchWithAuth(`${API_BASE_URL}/user-settings/${key}`, {
        method: 'PUT',
        body: JSON.stringify({ value, encrypted }),
      });
    },

    async delete(key) {
      return fetchWithAuth(`${API_BASE_URL}/user-settings/${key}`, {
        method: 'DELETE',
      });
    },
  },

  // Metrics API
  metrics: {
    async getOneOnOneCompliance(rollingDays = 30) {
      return fetchWithAuth(`${API_BASE_URL}/metrics/one-on-one-compliance?rollingDays=${rollingDays}`);
    },

    async getOneOnOneCadenceRules() {
      return fetchWithAuth(`${API_BASE_URL}/metrics/one-on-one-compliance/cadence-rules`);
    },
  },

  // GitHub Integration API
  github: {
    // Repository management
    async listRepos() {
      return fetchWithAuth(`${API_BASE_URL}/github/repos`);
    },

    async addRepo(fullName) {
      return fetchWithAuth(`${API_BASE_URL}/github/repos`, {
        method: 'POST',
        body: JSON.stringify({ full_name: fullName }),
      });
    },

    async getRepo(id) {
      return fetchWithAuth(`${API_BASE_URL}/github/repos/${id}`);
    },

    async removeRepo(id) {
      return fetchWithAuth(`${API_BASE_URL}/github/repos/${id}`, {
        method: 'DELETE',
      });
    },

    async searchRepos(query) {
      return fetchWithAuth(`${API_BASE_URL}/github/repos/search?q=${encodeURIComponent(query)}`);
    },

    async linkRepoToProject(repoId, projectId) {
      return fetchWithAuth(`${API_BASE_URL}/github/repos/${repoId}/link`, {
        method: 'PUT',
        body: JSON.stringify({ project_id: projectId }),
      });
    },

    // Sync operations
    async syncRepo(id) {
      return fetchWithAuth(`${API_BASE_URL}/github/repos/${id}/sync`, {
        method: 'POST',
      });
    },

    async syncAllRepos() {
      return fetchWithAuth(`${API_BASE_URL}/github/sync`, {
        method: 'POST',
      });
    },

    // Repository data
    async getPullRequests(repoId, state = null) {
      let url = `${API_BASE_URL}/github/repos/${repoId}/pulls`;
      if (state) url += `?state=${state}`;
      return fetchWithAuth(url);
    },

    async getIssues(repoId, state = null) {
      let url = `${API_BASE_URL}/github/repos/${repoId}/issues`;
      if (state) url += `?state=${state}`;
      return fetchWithAuth(url);
    },

    async getCommits(repoId, limit = 50) {
      return fetchWithAuth(`${API_BASE_URL}/github/repos/${repoId}/commits?limit=${limit}`);
    },
  },

  // Bug Dashboard API (v1.2)
  bugs: {
    // Check for duplicate upload before submitting
    async checkDuplicate(weekEnding) {
      return fetchWithAuth(`${API_BASE_URL}/bugs/uploads/check?weekEnding=${weekEnding}`);
    },

    // List all uploads for current user
    async listUploads() {
      return fetchWithAuth(`${API_BASE_URL}/bugs/uploads`);
    },

    // Get a single upload by ID
    async getUpload(id) {
      return fetchWithAuth(`${API_BASE_URL}/bugs/uploads/${id}`);
    },

    // Delete an upload (cascades to bugs and KPIs)
    async deleteUpload(id) {
      await fetchWithAuth(`${API_BASE_URL}/bugs/uploads/${id}`, {
        method: 'DELETE',
      });
      return true;
    },

    // Get KPIs for an upload
    async getKPIs(uploadId, component = null) {
      let url = `${API_BASE_URL}/bugs/kpis?uploadId=${uploadId}`;
      if (component) url += `&component=${encodeURIComponent(component)}`;
      return fetchWithAuth(url);
    },

    // List bugs with filtering and pagination
    async listBugs(uploadId, filters = {}) {
      const params = new URLSearchParams();
      params.append('uploadId', uploadId);
      if (filters.component) params.append('component', filters.component);
      if (filters.status) params.append('status', filters.status);
      if (filters.priority) params.append('priority', filters.priority);
      if (filters.limit) params.append('limit', filters.limit);
      if (filters.offset) params.append('offset', filters.offset);
      return fetchWithAuth(`${API_BASE_URL}/bugs/list?${params.toString()}`);
    },

    // Date-range queries (Sprint/Takt filter)
    async listBugsByDateRange(startDate, endDate, filters = {}) {
      const params = new URLSearchParams();
      params.append('startDate', startDate);
      params.append('endDate', endDate);
      if (filters.component) params.append('component', filters.component);
      if (filters.status) params.append('status', filters.status);
      if (filters.priority) params.append('priority', filters.priority);
      if (filters.limit) params.append('limit', filters.limit);
      if (filters.offset) params.append('offset', filters.offset);
      return fetchWithAuth(`${API_BASE_URL}/bugs/by-date-range?${params.toString()}`);
    },

    async getKPIsByDateRange(startDate, endDate, component = null) {
      let url = `${API_BASE_URL}/bugs/kpis-by-date-range?startDate=${startDate}&endDate=${endDate}`;
      if (component) url += `&component=${encodeURIComponent(component)}`;
      return fetchWithAuth(url);
    },

    // Get historical KPIs for trend analysis
    async getKPIHistory(weeks = 12, component = null) {
      let url = `${API_BASE_URL}/bugs/kpis/history?weeks=${weeks}`;
      if (component) url += `&component=${encodeURIComponent(component)}`;
      return fetchWithAuth(url);
    },

    // Note: Upload uses XMLHttpRequest for progress tracking, not fetchWithAuth
    // See CSVUploadDialog for upload implementation
  },

  // Email Preferences API (v1.3)
  emailPreferences: {
    // List all email preferences for current user
    async list() {
      return fetchWithAuth(`${API_BASE_URL}/email-preferences`);
    },

    // Get single preference by KPI key
    async get(kpiKey) {
      return fetchWithAuth(`${API_BASE_URL}/email-preferences/${kpiKey}`);
    },

    // Update preference for a KPI
    async update(kpiKey, data) {
      return fetchWithAuth(`${API_BASE_URL}/email-preferences/${kpiKey}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      });
    },

    // Delete preference for a KPI
    async delete(kpiKey) {
      await fetchWithAuth(`${API_BASE_URL}/email-preferences/${kpiKey}`, {
        method: 'DELETE',
      });
      return true;
    },
  },

  // Knowledge Base API (v1.5 - MCP integration)
  knowledge: {
    // Semantic code search
    async searchCode(options) {
      return fetchWithAuth(`${API_BASE_URL}/knowledge/search/code`, {
        method: 'POST',
        body: JSON.stringify({
          query: options.query,
          limit: options.limit || 20,
          threshold: options.threshold,
          repoName: options.repoName,
          language: options.language,
          artifactType: options.artifactType,
          ownership: options.ownership,
        }),
      });
    },

    // Documentation search
    async searchDocs(options) {
      return fetchWithAuth(`${API_BASE_URL}/knowledge/search/docs`, {
        method: 'POST',
        body: JSON.stringify({
          query: options.query,
          limit: options.limit || 20,
          threshold: options.threshold,
          domain: options.domain,
          category: options.category,
        }),
      });
    },

    // Retrieve stored insights
    async searchInsights(options) {
      const params = new URLSearchParams();
      if (options.startDate) params.append('startDate', options.startDate);
      if (options.endDate) params.append('endDate', options.endDate);
      if (options.teamDepartment) params.append('teamDepartment', options.teamDepartment);
      if (options.category) params.append('category', options.category);
      if (options.limit) params.append('limit', options.limit);
      return fetchWithAuth(`${API_BASE_URL}/knowledge/insights?${params.toString()}`);
    },

    // Get repository statistics
    async getStats(options = {}) {
      const params = new URLSearchParams();
      if (options.repoName) params.append('repoName', options.repoName);
      if (options.statsType) params.append('statsType', options.statsType);
      const queryString = params.toString();
      return fetchWithAuth(`${API_BASE_URL}/knowledge/stats${queryString ? '?' + queryString : ''}`);
    },

    // Health check
    async getHealth() {
      return fetchWithAuth(`${API_BASE_URL}/knowledge/health`);
    },
  },

  // TeamSync Integration API (v1.6)
  sync: {
    settings: createSyncSettingsClient(),
  },

  // Menu Configuration API (v1.7)
  menuConfig: {
    async get(mode) {
      // mode is 'people' or 'product'
      return fetchWithAuth(`${API_BASE_URL}/menu-config/${mode}`);
    },

    async set(mode, config) {
      // mode is 'people' or 'product'
      // config is { folders: [], items: [] }
      return fetchWithAuth(`${API_BASE_URL}/menu-config/${mode}`, {
        method: 'PUT',
        body: JSON.stringify(config),
      });
    },

    async getDefaults(mode) {
      return fetchWithAuth(`${API_BASE_URL}/menu-config/${mode}/defaults`);
    },
  },
};
