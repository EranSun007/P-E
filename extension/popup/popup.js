/**
 * Popup script - communicates with service worker
 */

const statusEl = document.getElementById('status');
const infoEl = document.getElementById('info');
const testBtn = document.getElementById('testBtn');
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
      } else if (lastSync.status === 'never') {
        statusEl.className = 'status warning';
        statusEl.textContent = 'Never synced';
        infoEl.textContent = 'Browse to a Jira board to start syncing';
      } else if (lastSync.status === 'success') {
        statusEl.className = 'status success';
        statusEl.textContent = `Last sync: ${formatTime(lastSync.timestamp)}`;
        infoEl.textContent = `${lastSync.issueCount} issues synced`;
      } else if (lastSync.status === 'error') {
        statusEl.className = 'status error';
        statusEl.textContent = 'Sync failed';
        infoEl.textContent = lastSync.error || 'Unknown error';
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
