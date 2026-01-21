/**
 * Options page script - manages extension settings
 */

const backendUrlInput = document.getElementById('backendUrl');
const authTokenInput = document.getElementById('authToken');
const saveBtn = document.getElementById('saveBtn');
const messageEl = document.getElementById('message');

// Load saved settings on page load
document.addEventListener('DOMContentLoaded', async () => {
  const data = await chrome.storage.local.get(['backendUrl', 'authToken']);
  backendUrlInput.value = data.backendUrl || '';
  authTokenInput.value = data.authToken || '';
});

// Save settings
saveBtn.addEventListener('click', async () => {
  const backendUrl = backendUrlInput.value.trim();
  const authToken = authTokenInput.value.trim();

  // Basic validation
  if (!backendUrl) {
    showMessage('Backend URL is required', 'error');
    return;
  }

  try {
    new URL(backendUrl); // Validate URL format
  } catch {
    showMessage('Invalid Backend URL format', 'error');
    return;
  }

  // Save to storage
  await chrome.storage.local.set({ backendUrl, authToken });
  showMessage('Settings saved!', 'success');
});

function showMessage(text, type) {
  messageEl.textContent = text;
  messageEl.className = `message ${type}`;
  messageEl.style.display = 'block';

  setTimeout(() => {
    messageEl.style.display = 'none';
  }, 3000);
}
