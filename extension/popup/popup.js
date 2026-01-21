/**
 * Popup script - communicates with service worker
 */

const statusEl = document.getElementById('status');
const infoEl = document.getElementById('info');
const testBtn = document.getElementById('testBtn');
const syncBtn = document.getElementById('syncBtn');
const optionsBtn = document.getElementById('optionsBtn');

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
      } else if (lastSync.status === 'never') {
        statusEl.className = 'status warning';
        statusEl.textContent = 'Never synced';
        infoEl.textContent = 'Browse to a Jira board to start syncing';
        syncBtn.disabled = false;
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
      } else if (lastSync.status === 'syncing') {
        statusEl.className = 'status syncing';
        statusEl.textContent = 'Syncing...';
        infoEl.textContent = 'Sync in progress';
        syncBtn.disabled = true;
      }
    } else {
      showError(response.error);
    }
  } catch (error) {
    showError(error.message);
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

// Listen for sync status changes from background
chrome.storage.onChanged.addListener((changes, namespace) => {
  if (namespace === 'local' && changes.lastSync) {
    const newStatus = changes.lastSync.newValue;
    updateStatusFromSync(newStatus);
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
