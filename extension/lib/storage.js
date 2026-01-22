/**
 * Storage Manager - Typed wrapper for chrome.storage.local
 *
 * All extension state lives here. Service workers are ephemeral,
 * so we never store state in JS variables.
 */

const STORAGE_KEYS = {
  AUTH_TOKEN: 'authToken',
  BACKEND_URL: 'backendUrl',
  LAST_SYNC: 'lastSync',
  PENDING_ISSUES: 'pendingIssues',
  CAPTURE_RULES: 'captureRules',
  PENDING_COUNT: 'pendingInboxCount'
};

const DEFAULTS = {
  [STORAGE_KEYS.BACKEND_URL]: 'https://pe-manager-backend.cfapps.eu01-canary.hana.ondemand.com',
  [STORAGE_KEYS.AUTH_TOKEN]: '',
  [STORAGE_KEYS.LAST_SYNC]: {
    timestamp: null,
    status: 'never',
    issueCount: 0,
    error: null
  },
  [STORAGE_KEYS.PENDING_ISSUES]: [],
  [STORAGE_KEYS.CAPTURE_RULES]: {
    rules: [],
    lastRefresh: null
  },
  [STORAGE_KEYS.PENDING_COUNT]: 0
};

export const Storage = {
  /**
   * Get auth token
   */
  async getAuthToken() {
    const data = await chrome.storage.local.get(STORAGE_KEYS.AUTH_TOKEN);
    return data[STORAGE_KEYS.AUTH_TOKEN] || DEFAULTS[STORAGE_KEYS.AUTH_TOKEN];
  },

  /**
   * Set auth token
   */
  async setAuthToken(token) {
    await chrome.storage.local.set({ [STORAGE_KEYS.AUTH_TOKEN]: token });
  },

  /**
   * Get backend URL
   */
  async getBackendUrl() {
    const data = await chrome.storage.local.get(STORAGE_KEYS.BACKEND_URL);
    return data[STORAGE_KEYS.BACKEND_URL] || DEFAULTS[STORAGE_KEYS.BACKEND_URL];
  },

  /**
   * Set backend URL
   */
  async setBackendUrl(url) {
    await chrome.storage.local.set({ [STORAGE_KEYS.BACKEND_URL]: url });
  },

  /**
   * Get last sync status
   */
  async getLastSync() {
    const data = await chrome.storage.local.get(STORAGE_KEYS.LAST_SYNC);
    return data[STORAGE_KEYS.LAST_SYNC] || DEFAULTS[STORAGE_KEYS.LAST_SYNC];
  },

  /**
   * Update sync status
   */
  async updateSyncStatus(status, issueCount = null, error = null) {
    const lastSync = {
      timestamp: new Date().toISOString(),
      status,
      issueCount: issueCount ?? (await this.getLastSync()).issueCount,
      error
    };
    await chrome.storage.local.set({ [STORAGE_KEYS.LAST_SYNC]: lastSync });
    return lastSync;
  },

  /**
   * Get pending issues (for retry)
   */
  async getPendingIssues() {
    const data = await chrome.storage.local.get(STORAGE_KEYS.PENDING_ISSUES);
    return data[STORAGE_KEYS.PENDING_ISSUES] || DEFAULTS[STORAGE_KEYS.PENDING_ISSUES];
  },

  /**
   * Set pending issues
   */
  async setPendingIssues(issues) {
    await chrome.storage.local.set({ [STORAGE_KEYS.PENDING_ISSUES]: issues });
  },

  /**
   * Clear pending issues after successful sync
   */
  async clearPendingIssues() {
    await chrome.storage.local.set({ [STORAGE_KEYS.PENDING_ISSUES]: [] });
  },

  /**
   * Check if extension is configured
   */
  async isConfigured() {
    const [token, url] = await Promise.all([
      this.getAuthToken(),
      this.getBackendUrl()
    ]);
    return Boolean(token && url);
  },

  /**
   * Get cached capture rules
   * @returns {{ rules: Array, lastRefresh: string|null }}
   */
  async getCaptureRules() {
    const data = await chrome.storage.local.get(STORAGE_KEYS.CAPTURE_RULES);
    return data[STORAGE_KEYS.CAPTURE_RULES] || DEFAULTS[STORAGE_KEYS.CAPTURE_RULES];
  },

  /**
   * Set capture rules with refresh timestamp
   * @param {Array} rules - Array of capture rule objects
   */
  async setCaptureRules(rules) {
    await chrome.storage.local.set({
      [STORAGE_KEYS.CAPTURE_RULES]: {
        rules,
        lastRefresh: new Date().toISOString()
      }
    });
  },

  /**
   * Get pending inbox count for badge display
   * @returns {number}
   */
  async getPendingCount() {
    const data = await chrome.storage.local.get(STORAGE_KEYS.PENDING_COUNT);
    return data[STORAGE_KEYS.PENDING_COUNT] || DEFAULTS[STORAGE_KEYS.PENDING_COUNT];
  },

  /**
   * Set pending inbox count
   * @param {number} count
   */
  async setPendingCount(count) {
    await chrome.storage.local.set({ [STORAGE_KEYS.PENDING_COUNT]: count });
  },

  /**
   * Get all config for debugging
   */
  async getAll() {
    return chrome.storage.local.get(null);
  },

  /**
   * Initialize defaults (called on install)
   */
  async initDefaults() {
    const current = await chrome.storage.local.get(null);
    const toSet = {};

    for (const [key, value] of Object.entries(DEFAULTS)) {
      if (!(key in current)) {
        toSet[key] = value;
      }
    }

    if (Object.keys(toSet).length > 0) {
      await chrome.storage.local.set(toSet);
    }
  }
};

export { STORAGE_KEYS };
