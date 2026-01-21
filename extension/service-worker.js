/**
 * P&E Manager Jira Sync - Service Worker
 *
 * Handles:
 * - Message routing from popup and content scripts
 * - Backend API communication
 * - Sync state management
 */

// Message types
const MessageType = {
  SYNC_ISSUES: 'SYNC_ISSUES',
  GET_STATUS: 'GET_STATUS',
  MANUAL_SYNC: 'MANUAL_SYNC',
  TEST_CONNECTION: 'TEST_CONNECTION'
};

// Service worker lifecycle
chrome.runtime.onInstalled.addListener((details) => {
  console.log('[PE-Jira] Extension installed:', details.reason);

  // Initialize default storage on fresh install
  if (details.reason === 'install') {
    chrome.storage.local.set({
      backendUrl: 'https://pe-manager-backend.cfapps.eu01-canary.hana.ondemand.com',
      authToken: '',
      lastSync: {
        timestamp: null,
        status: 'never',
        issueCount: 0,
        error: null
      },
      pendingIssues: []
    });
  }
});

// Message handler
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('[PE-Jira] Received message:', message.type, 'from:', sender.id ? 'extension' : sender.tab?.url);

  // Must return true for async response
  handleMessage(message, sender)
    .then(response => sendResponse(response))
    .catch(error => sendResponse({ success: false, error: error.message }));

  return true; // Keep channel open for async response
});

/**
 * Route messages to appropriate handlers
 */
async function handleMessage(message, sender) {
  switch (message.type) {
    case MessageType.GET_STATUS:
      return await getStatus();

    case MessageType.TEST_CONNECTION:
      return await testConnection();

    case MessageType.SYNC_ISSUES:
      return await syncIssues(message.payload);

    case MessageType.MANUAL_SYNC:
      return await manualSync();

    default:
      return { success: false, error: `Unknown message type: ${message.type}` };
  }
}

/**
 * Get current sync status from storage
 */
async function getStatus() {
  const data = await chrome.storage.local.get(['lastSync', 'authToken', 'backendUrl']);
  return {
    success: true,
    data: {
      lastSync: data.lastSync,
      isConfigured: Boolean(data.authToken && data.backendUrl)
    }
  };
}

/**
 * Test connection to backend
 */
async function testConnection() {
  const { backendUrl, authToken } = await chrome.storage.local.get(['backendUrl', 'authToken']);

  if (!backendUrl || !authToken) {
    return { success: false, error: 'Backend URL or auth token not configured' };
  }

  try {
    const response = await fetch(`${backendUrl}/api/health`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${authToken}`
      }
    });

    if (response.ok) {
      return { success: true, data: await response.json() };
    } else {
      return { success: false, error: `Backend returned ${response.status}` };
    }
  } catch (error) {
    return { success: false, error: error.message };
  }
}

/**
 * Sync issues to backend (placeholder - full implementation in 02-02)
 */
async function syncIssues(issues) {
  console.log('[PE-Jira] syncIssues called with', issues?.length || 0, 'issues');
  return { success: true, message: 'Sync not yet implemented' };
}

/**
 * Manual sync trigger (placeholder - full implementation in 02-02)
 */
async function manualSync() {
  console.log('[PE-Jira] manualSync called');
  return { success: true, message: 'Manual sync not yet implemented' };
}

console.log('[PE-Jira] Service worker loaded');
