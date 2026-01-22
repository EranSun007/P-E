/**
 * Backend API Client
 *
 * Handles all communication with P&E Manager backend.
 * Includes exponential backoff retry for failed requests.
 */

import { Storage } from './storage.js';

const MAX_RETRIES = 3;
const INITIAL_RETRY_DELAY = 1000; // 1 second

export class ApiError extends Error {
  constructor(message, status, data) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
  }
}

export const Api = {
  /**
   * Make authenticated request to backend
   */
  async request(endpoint, options = {}) {
    const backendUrl = await Storage.getBackendUrl();
    const authToken = await Storage.getAuthToken();

    if (!backendUrl) {
      throw new ApiError('Backend URL not configured', 0, null);
    }

    const url = `${backendUrl}${endpoint}`;
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers
    };

    if (authToken) {
      headers['Authorization'] = `Bearer ${authToken}`;
    }

    const response = await fetch(url, {
      ...options,
      headers
    });

    if (!response.ok) {
      const data = await response.json().catch(() => null);
      throw new ApiError(
        data?.message || `Request failed with status ${response.status}`,
        response.status,
        data
      );
    }

    return response.json();
  },

  /**
   * Test backend connection
   */
  async testConnection() {
    return this.request('/api/health');
  },

  /**
   * Get current user info
   */
  async getMe() {
    return this.request('/api/auth/me');
  },

  /**
   * Sync issues to backend with retry
   */
  async syncIssues(issues) {
    return this.requestWithRetry('/api/jira-issues/sync', {
      method: 'POST',
      body: JSON.stringify({ issues })
    });
  },

  /**
   * Get sync status from backend
   */
  async getSyncStatus() {
    return this.request('/api/jira-issues/status');
  },

  // =============================================================================
  // CAPTURE FRAMEWORK ENDPOINTS
  // =============================================================================

  /**
   * Get enabled capture rules from backend
   * @returns {Promise<Array>} Array of capture rule objects
   */
  async getCaptureRules() {
    return this.request('/api/capture-rules?enabled=true');
  },

  /**
   * Send captured data to inbox for review
   * @param {Object} captureData - { rule_id, rule_name, source_url, source_identifier, captured_data }
   * @returns {Promise<Object>} Created inbox item
   */
  async sendToInbox(captureData) {
    return this.requestWithRetry('/api/capture-inbox', {
      method: 'POST',
      body: JSON.stringify(captureData)
    });
  },

  /**
   * Get inbox items with optional filters
   * @param {Object} filters - Optional filters (status, limit, etc.)
   * @returns {Promise<Array>} Array of inbox items
   */
  async getInboxItems(filters = {}) {
    const params = new URLSearchParams(filters).toString();
    const endpoint = params ? `/api/capture-inbox?${params}` : '/api/capture-inbox';
    return this.request(endpoint);
  },

  /**
   * Get count of pending inbox items
   * @returns {Promise<number>} Count of pending items
   */
  async getPendingInboxCount() {
    const items = await this.request('/api/capture-inbox?status=pending');
    return Array.isArray(items) ? items.length : 0;
  },

  /**
   * Make request with exponential backoff retry
   */
  async requestWithRetry(endpoint, options, retryCount = 0) {
    try {
      return await this.request(endpoint, options);
    } catch (error) {
      // Don't retry auth errors or client errors (4xx)
      if (error.status >= 400 && error.status < 500) {
        throw error;
      }

      // Retry on network errors or server errors (5xx)
      if (retryCount < MAX_RETRIES) {
        const delay = INITIAL_RETRY_DELAY * Math.pow(2, retryCount);
        console.log(`[PE-Jira] Retry ${retryCount + 1}/${MAX_RETRIES} in ${delay}ms`);

        await this.sleep(delay);
        return this.requestWithRetry(endpoint, options, retryCount + 1);
      }

      throw error;
    }
  },

  /**
   * Sleep helper for retry delays
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
};
