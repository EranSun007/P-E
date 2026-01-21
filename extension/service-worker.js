/**
 * P&E Manager Jira Sync - Service Worker
 *
 * Handles:
 * - Message routing from popup and content scripts
 * - Backend API communication via Api module
 * - Sync state management via Storage module
 */

import { Storage } from './lib/storage.js';
import { Api, ApiError } from './lib/api.js';

// =============================================================================
// SPA NAVIGATION DETECTION
// =============================================================================

/**
 * Detect SPA navigation in Jira (pushState/replaceState URL changes)
 * Notifies content script to re-initialize when user navigates within Jira
 */
chrome.webNavigation.onHistoryStateUpdated.addListener(
  (details) => {
    // Only care about main frame, not iframes
    if (details.frameId !== 0) return;

    console.log('[PE-Jira] SPA navigation detected:', details.url);

    // Notify content script to re-extract for new page
    chrome.tabs.sendMessage(details.tabId, {
      type: 'URL_CHANGED',
      url: details.url
    }).catch(err => {
      // Content script may not be loaded yet, ignore
      console.log('[PE-Jira] Could not notify tab:', err.message);
    });
  },
  { url: [{ hostSuffix: 'jira.tools.sap' }] }
);

// =============================================================================
// MESSAGE TYPES
// =============================================================================

// Message types
const MessageType = {
  SYNC_ISSUES: 'SYNC_ISSUES',
  GET_STATUS: 'GET_STATUS',
  MANUAL_SYNC: 'MANUAL_SYNC',
  TEST_CONNECTION: 'TEST_CONNECTION',
  URL_CHANGED: 'URL_CHANGED',       // Sent TO content script (SPA navigation)
  REFRESH_DATA: 'REFRESH_DATA'      // Sent TO content script (manual refresh)
};

// Service worker lifecycle
chrome.runtime.onInstalled.addListener(async (details) => {
  console.log('[PE-Jira] Extension installed:', details.reason);

  // Initialize default storage on fresh install
  if (details.reason === 'install') {
    await Storage.initDefaults();
    console.log('[PE-Jira] Default settings initialized');
  }
});

// Service worker startup (runs on wake from termination)
chrome.runtime.onStartup.addListener(() => {
  console.log('[PE-Jira] Service worker started');
});

// Message handler
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  const source = sender.tab ? `tab:${sender.tab.id}` : 'extension';
  console.log('[PE-Jira] Message:', message.type, 'from:', source);

  // Must return true for async response
  handleMessage(message, sender)
    .then(response => sendResponse(response))
    .catch(error => {
      console.error('[PE-Jira] Handler error:', error);
      sendResponse({ success: false, error: error.message });
    });

  return true; // Keep channel open for async response
});

/**
 * Route messages to appropriate handlers
 */
async function handleMessage(message, sender) {
  switch (message.type) {
    case MessageType.GET_STATUS:
      return await handleGetStatus();

    case MessageType.TEST_CONNECTION:
      return await handleTestConnection();

    case MessageType.SYNC_ISSUES:
      return await handleSyncIssues(message.payload);

    case MessageType.MANUAL_SYNC:
      return await handleManualSync();

    default:
      return { success: false, error: `Unknown message type: ${message.type}` };
  }
}

/**
 * Get current sync status
 */
async function handleGetStatus() {
  const [lastSync, isConfigured] = await Promise.all([
    Storage.getLastSync(),
    Storage.isConfigured()
  ]);

  return {
    success: true,
    data: { lastSync, isConfigured }
  };
}

/**
 * Test connection to backend
 */
async function handleTestConnection() {
  const isConfigured = await Storage.isConfigured();

  if (!isConfigured) {
    return { success: false, error: 'Backend URL or auth token not configured' };
  }

  try {
    const health = await Api.testConnection();
    return { success: true, data: health };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

/**
 * Sync issues from content script
 */
async function handleSyncIssues(issues) {
  if (!issues || !Array.isArray(issues) || issues.length === 0) {
    return { success: false, error: 'No issues to sync' };
  }

  const isConfigured = await Storage.isConfigured();
  if (!isConfigured) {
    // Store pending issues for later
    await Storage.setPendingIssues(issues);
    return { success: false, error: 'Extension not configured' };
  }

  try {
    // Update status to syncing
    await Storage.updateSyncStatus('syncing');

    // Send to backend
    const result = await Api.syncIssues(issues);

    // Update status to success
    await Storage.updateSyncStatus('success', result.total);
    await Storage.clearPendingIssues();

    console.log('[PE-Jira] Sync complete:', result);
    return { success: true, data: result };

  } catch (error) {
    console.error('[PE-Jira] Sync failed:', error);

    // Store for retry
    await Storage.setPendingIssues(issues);
    await Storage.updateSyncStatus('error', null, error.message);

    return { success: false, error: error.message };
  }
}

/**
 * Manual sync trigger - retry pending issues
 */
async function handleManualSync() {
  const pending = await Storage.getPendingIssues();

  if (pending.length === 0) {
    return { success: true, message: 'No pending issues to sync' };
  }

  return handleSyncIssues(pending);
}

console.log('[PE-Jira] Service worker loaded');
