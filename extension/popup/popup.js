/**
 * Popup script - communicates with service worker
 */

const statusEl = document.getElementById('status');
const infoEl = document.getElementById('info');
const testBtn = document.getElementById('testBtn');
const syncBtn = document.getElementById('syncBtn');
const optionsBtn = document.getElementById('optionsBtn');
const pendingSection = document.getElementById('pendingSection');
const pendingCountEl = document.getElementById('pendingCount');
const viewInboxLink = document.getElementById('viewInbox');
const captureBtn = document.getElementById('captureBtn');
const createRuleBtn = document.getElementById('createRuleBtn');
const refreshRulesBtn = document.getElementById('refreshRulesBtn');

// Load status on popup open
document.addEventListener('DOMContentLoaded', async () => {
  await loadStatus();
});

async function loadStatus() {
  try {
    const response = await chrome.runtime.sendMessage({ type: 'GET_STATUS' });

    if (response.success) {
      const { lastSync, isConfigured } = response.data;

      if (!isConfigured) {
        statusEl.className = 'status warning';
        statusEl.textContent = 'Not configured';
        infoEl.textContent = 'Click Settings to configure backend URL and auth token';
        syncBtn.disabled = true;
        captureBtn.disabled = true;
      } else if (lastSync.status === 'never') {
        statusEl.className = 'status warning';
        statusEl.textContent = 'Never synced';
        infoEl.textContent = 'Browse to a Jira board to start syncing';
        syncBtn.disabled = false;
        captureBtn.disabled = false;
      } else if (lastSync.status === 'success') {
        statusEl.className = 'status success';
        statusEl.textContent = `Last sync: ${formatTime(lastSync.timestamp)}`;
        infoEl.textContent = `${lastSync.issueCount} issues synced`;
        syncBtn.disabled = false;
        captureBtn.disabled = false;
      } else if (lastSync.status === 'error') {
        statusEl.className = 'status error';
        statusEl.textContent = 'Sync failed';
        infoEl.textContent = lastSync.error || 'Unknown error';
        syncBtn.disabled = false;
        captureBtn.disabled = false;
      } else if (lastSync.status === 'syncing') {
        statusEl.className = 'status syncing';
        statusEl.textContent = 'Syncing...';
        infoEl.textContent = 'Sync in progress';
        syncBtn.disabled = true;
        captureBtn.disabled = true;
      }

      // Load pending inbox count
      await loadPendingCount();
    } else {
      showError(response.error);
    }
  } catch (error) {
    showError(error.message);
  }
}

/**
 * Load pending inbox count from service worker
 */
async function loadPendingCount() {
  try {
    const pendingResponse = await chrome.runtime.sendMessage({ type: 'GET_PENDING_COUNT' });
    if (pendingResponse.success && pendingResponse.count > 0) {
      pendingSection.style.display = 'flex';
      pendingCountEl.textContent = pendingResponse.count;
    } else {
      pendingSection.style.display = 'none';
    }
  } catch (e) {
    // Ignore if service worker doesn't support this yet
    pendingSection.style.display = 'none';
  }
}

testBtn.addEventListener('click', async () => {
  statusEl.className = 'status loading';
  statusEl.textContent = 'Testing...';

  try {
    const response = await chrome.runtime.sendMessage({ type: 'TEST_CONNECTION' });

    if (response.success) {
      statusEl.className = 'status success';
      statusEl.textContent = 'Connection successful!';
      infoEl.textContent = `Backend: ${response.data?.environment || 'connected'}`;
    } else {
      statusEl.className = 'status error';
      statusEl.textContent = 'Connection failed';
      infoEl.textContent = response.error;
    }
  } catch (error) {
    showError(error.message);
  }
});

syncBtn.addEventListener('click', async () => {
  syncBtn.disabled = true;
  statusEl.className = 'status syncing';
  statusEl.textContent = 'Syncing...';
  infoEl.textContent = '';

  try {
    const response = await chrome.runtime.sendMessage({ type: 'MANUAL_SYNC' });

    if (response.success) {
      if (response.message) {
        // No pending issues to sync
        statusEl.className = 'status success';
        statusEl.textContent = response.message;
      }
      // Status will update via storage listener
    } else {
      statusEl.className = 'status error';
      statusEl.textContent = 'Sync failed';
      infoEl.textContent = response.error;
    }
  } catch (error) {
    showError(error.message);
  } finally {
    syncBtn.disabled = false;
  }
});

optionsBtn.addEventListener('click', () => {
  chrome.runtime.openOptionsPage();
});

/**
 * Capture button - triggers manual capture on current page
 */
captureBtn.addEventListener('click', async () => {
  captureBtn.disabled = true;
  captureBtn.textContent = 'Capturing...';

  try {
    const response = await chrome.runtime.sendMessage({ type: 'MANUAL_CAPTURE' });

    if (response.success) {
      captureBtn.textContent = 'Captured!';
      // Refresh pending count
      await loadPendingCount();
    } else {
      captureBtn.textContent = 'Capture Failed';
      infoEl.textContent = response.error || 'Unknown error';
    }
  } catch (error) {
    captureBtn.textContent = 'Capture Failed';
    infoEl.textContent = error.message;
  }

  // Reset button after 2 seconds
  setTimeout(() => {
    captureBtn.textContent = 'Capture This Page';
    captureBtn.disabled = false;
  }, 2000);
});

/**
 * Create rule button - injects element picker into current page
 */
createRuleBtn.addEventListener('click', async () => {
  createRuleBtn.disabled = true;
  createRuleBtn.textContent = 'Starting...';

  try {
    // Get the current active tab
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    if (!tab || !tab.id) {
      throw new Error('No active tab found');
    }

    // Inject the element picker script into the page
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      files: ['content/element-picker.js']
    });

    // Close popup - picker takes over
    window.close();

  } catch (error) {
    console.error('Failed to start picker:', error);
    createRuleBtn.textContent = 'Failed';
    infoEl.textContent = error.message;

    // Reset button after 2 seconds
    setTimeout(() => {
      createRuleBtn.textContent = 'Create Rule for This Page';
      createRuleBtn.disabled = false;
    }, 2000);
  }
});

/**
 * Refresh rules button - fetches latest capture rules from backend
 */
refreshRulesBtn.addEventListener('click', async () => {
  refreshRulesBtn.disabled = true;
  refreshRulesBtn.textContent = 'Refreshing...';

  try {
    const response = await chrome.runtime.sendMessage({ type: 'REFRESH_RULES' });

    if (response.success) {
      refreshRulesBtn.textContent = `${response.count} rules loaded`;
    } else {
      refreshRulesBtn.textContent = 'Refresh Failed';
      infoEl.textContent = response.error || 'Unknown error';
    }
  } catch (error) {
    refreshRulesBtn.textContent = 'Refresh Failed';
    infoEl.textContent = error.message;
  }

  // Reset button after 2 seconds
  setTimeout(() => {
    refreshRulesBtn.textContent = 'Refresh Rules';
    refreshRulesBtn.disabled = false;
  }, 2000);
});

/**
 * View inbox link - opens P&E Manager capture inbox page
 */
viewInboxLink.addEventListener('click', async (e) => {
  e.preventDefault();
  // Open P&E Manager capture inbox page
  const backendUrl = await chrome.storage.local.get('backendUrl');
  const baseUrl = backendUrl.backendUrl || 'https://pe-manager-frontend.cfapps.eu01-canary.hana.ondemand.com';
  // Remove -backend from URL if present and construct frontend inbox URL
  const frontendUrl = baseUrl.replace('-backend', '-frontend').replace('/api', '');
  chrome.tabs.create({ url: `${frontendUrl}/capture-inbox` });
});

function showError(message) {
  statusEl.className = 'status error';
  statusEl.textContent = 'Error';
  infoEl.textContent = message;
}

function formatTime(timestamp) {
  if (!timestamp) return 'Never';
  const date = new Date(timestamp);
  return date.toLocaleTimeString();
}

// Listen for sync status and pending count changes from background
chrome.storage.onChanged.addListener((changes, namespace) => {
  if (namespace === 'local') {
    if (changes.lastSync) {
      const newStatus = changes.lastSync.newValue;
      updateStatusFromSync(newStatus);
    }
    if (changes.pendingInboxCount) {
      const count = changes.pendingInboxCount.newValue || 0;
      if (count > 0) {
        pendingSection.style.display = 'flex';
        pendingCountEl.textContent = count;
      } else {
        pendingSection.style.display = 'none';
      }
    }
  }
});

function updateStatusFromSync(lastSync) {
  if (lastSync.status === 'syncing') {
    statusEl.className = 'status syncing';
    statusEl.textContent = 'Syncing...';
    infoEl.textContent = 'Sync in progress';
    syncBtn.disabled = true;
  } else if (lastSync.status === 'success') {
    statusEl.className = 'status success';
    statusEl.textContent = `Last sync: ${formatTime(lastSync.timestamp)}`;
    infoEl.textContent = `${lastSync.issueCount} issues synced`;
    syncBtn.disabled = false;
  } else if (lastSync.status === 'error') {
    statusEl.className = 'status error';
    statusEl.textContent = 'Sync failed';
    infoEl.textContent = lastSync.error || 'Unknown error';
    syncBtn.disabled = false;
  }
}
