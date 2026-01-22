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
// BADGE STATUS INDICATOR
// =============================================================================

/**
 * Update extension icon badge based on sync status
 * @param {string} status - One of: 'never', 'syncing', 'success', 'error'
 */
async function updateBadge(status) {
  switch (status) {
    case 'syncing':
      await chrome.action.setBadgeText({ text: '...' });
      await chrome.action.setBadgeBackgroundColor({ color: '#2196F3' }); // Blue
      break;
    case 'success':
    case 'never':
      await chrome.action.setBadgeText({ text: '' }); // Clear badge
      break;
    case 'error':
      await chrome.action.setBadgeText({ text: '!' });
      await chrome.action.setBadgeBackgroundColor({ color: '#F44336' }); // Red
      break;
  }
}

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

    console.log('[PE-Capture] SPA navigation detected:', details.url);

    // Notify content script to re-extract for new page
    chrome.tabs.sendMessage(details.tabId, {
      type: 'URL_CHANGED',
      url: details.url
    }).catch(err => {
      // Content script may not be loaded yet, ignore
      console.log('[PE-Capture] Could not notify tab:', err.message);
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
  REFRESH_DATA: 'REFRESH_DATA',     // Sent TO content script (manual refresh)
  // Capture framework messages
  GET_RULE_FOR_URL: 'GET_RULE_FOR_URL',   // Content script asks for matching rule
  CAPTURE_DATA: 'CAPTURE_DATA',           // Content script sends extracted data
  REFRESH_RULES: 'REFRESH_RULES'          // Popup requests rule refresh
};

// Capture rules refresh alarm
const RULES_REFRESH_ALARM = 'refresh-capture-rules';
const RULES_REFRESH_INTERVAL_MINUTES = 30;

// Service worker lifecycle
chrome.runtime.onInstalled.addListener(async (details) => {
  console.log('[PE-Capture] Extension installed:', details.reason);

  // Initialize default storage on fresh install
  if (details.reason === 'install') {
    await Storage.initDefaults();
    console.log('[PE-Capture] Default settings initialized');
  }

  // Load rules from cache on install and update
  await loadRulesFromCache();
});

// Service worker startup (runs on wake from termination)
chrome.runtime.onStartup.addListener(async () => {
  console.log('[PE-Capture] Service worker started');
  // Restore badge state from storage
  const lastSync = await Storage.getLastSync();
  await updateBadge(lastSync.status);

  // Load capture rules from cache and schedule refresh
  await loadRulesFromCache();
  await scheduleRuleRefresh();
});

// Alarm listener for periodic rule refresh
chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name === RULES_REFRESH_ALARM) {
    console.log('[PE-Capture] Alarm triggered: refreshing capture rules');
    await refreshRulesFromBackend();
  }
});

// Message handler
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  const source = sender.tab ? `tab:${sender.tab.id}` : 'extension';
  console.log('[PE-Capture] Message:', message.type, 'from:', source);

  // Must return true for async response
  handleMessage(message, sender)
    .then(response => sendResponse(response))
    .catch(error => {
      console.error('[PE-Capture] Handler error:', error);
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

    // Capture framework handlers
    case MessageType.GET_RULE_FOR_URL:
      return await handleGetRuleForUrl(message.url);

    case MessageType.CAPTURE_DATA:
      return await handleCaptureData(message.payload);

    case MessageType.REFRESH_RULES:
      return await refreshRulesFromBackend();

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
    await updateBadge('syncing');

    // Send to backend
    const result = await Api.syncIssues(issues);

    // Update status to success
    await Storage.updateSyncStatus('success', result.total);
    await updateBadge('success');
    await Storage.clearPendingIssues();

    console.log('[PE-Capture] Sync complete:', result);
    return { success: true, data: result };

  } catch (error) {
    console.error('[PE-Capture] Sync failed:', error);

    // Store for retry
    await Storage.setPendingIssues(issues);
    await Storage.updateSyncStatus('error', null, error.message);
    await updateBadge('error');

    return { success: false, error: error.message };
  }
}

/**
 * Manual sync trigger - request fresh data from content script
 */
async function handleManualSync() {
  // First, try to get fresh data from the active Jira tab
  try {
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    const activeTab = tabs[0];

    if (activeTab && activeTab.url?.includes('jira.tools.sap')) {
      console.log('[PE-Capture] Requesting fresh data from content script');

      // Tell content script to extract and sync
      await chrome.tabs.sendMessage(activeTab.id, { type: 'REFRESH_DATA' });

      // Give content script time to extract and send SYNC_ISSUES
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Check if we now have pending issues
      const pending = await Storage.getPendingIssues();
      if (pending.length > 0) {
        return handleSyncIssues(pending);
      }

      // Check last sync status - content script may have synced directly
      const lastSync = await Storage.getLastSync();
      if (lastSync.status === 'success' && Date.now() - lastSync.timestamp < 5000) {
        return { success: true, data: { total: lastSync.issueCount } };
      }

      return { success: true, message: 'No issues found on current page. Check if you\'re on a Jira board/backlog page.' };
    }
  } catch (error) {
    console.log('[PE-Capture] Could not request fresh data:', error.message);
  }

  // Fallback: retry pending issues
  const pending = await Storage.getPendingIssues();

  if (pending.length === 0) {
    return { success: true, message: 'No pending issues to sync. Browse to a Jira page first.' };
  }

  return handleSyncIssues(pending);
}

// =============================================================================
// CAPTURE FRAMEWORK FUNCTIONS
// =============================================================================

/**
 * Load capture rules from storage cache and register content scripts
 */
async function loadRulesFromCache() {
  try {
    const cached = await Storage.getCaptureRules();
    if (cached.rules && cached.rules.length > 0) {
      console.log(`[PE-Capture] Loading ${cached.rules.length} rules from cache`);
      await registerRuleScripts(cached.rules);
    } else {
      console.log('[PE-Capture] No cached rules found');
    }
  } catch (error) {
    console.error('[PE-Capture] Error loading rules from cache:', error);
  }
}

/**
 * Fetch capture rules from backend and update cache
 * @returns {{ success: boolean, count?: number, error?: string }}
 */
async function refreshRulesFromBackend() {
  const isConfigured = await Storage.isConfigured();
  if (!isConfigured) {
    return { success: false, error: 'Not configured' };
  }

  try {
    console.log('[PE-Capture] Fetching rules from backend...');
    const rules = await Api.getCaptureRules();

    // Store in cache
    await Storage.setCaptureRules(rules);

    // Register content scripts for the rules
    await registerRuleScripts(rules);

    console.log(`[PE-Capture] Loaded ${rules.length} capture rules`);
    return { success: true, count: rules.length };
  } catch (error) {
    console.error('[PE-Capture] Failed to fetch rules:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Register dynamic content scripts for capture rules
 * Uses chrome.scripting API for Manifest V3 dynamic registration
 * @param {Array} rules - Array of capture rule objects
 */
async function registerRuleScripts(rules) {
  try {
    // Get existing registered scripts
    const existing = await chrome.scripting.getRegisteredContentScripts();

    // Filter to only rule-* IDs (preserve any non-rule scripts like static Jira script)
    const ruleScriptIds = existing
      .filter(script => script.id.startsWith('rule-'))
      .map(script => script.id);

    // Unregister existing rule scripts
    if (ruleScriptIds.length > 0) {
      await chrome.scripting.unregisterContentScripts({ ids: ruleScriptIds });
      console.log(`[PE-Capture] Unregistered ${ruleScriptIds.length} old rule scripts`);
    }

    // Filter to enabled rules only
    const enabledRules = rules.filter(rule => rule.enabled);

    if (enabledRules.length === 0) {
      console.log('[PE-Capture] No enabled rules to register');
      return;
    }

    // Map rules to content script registrations
    const scripts = enabledRules.map(rule => ({
      id: `rule-${rule.id}`,
      matches: [rule.url_pattern],
      js: ['content/generic-extractor.js'],
      runAt: 'document_idle',
      persistAcrossSessions: true
    }));

    // Register new scripts
    await chrome.scripting.registerContentScripts(scripts);
    console.log(`[PE-Capture] Registered ${scripts.length} content scripts for capture rules`);
  } catch (error) {
    console.error('[PE-Capture] Error registering content scripts:', error);
    throw error;
  }
}

/**
 * Schedule periodic rule refresh using Chrome alarms
 */
async function scheduleRuleRefresh() {
  await chrome.alarms.create(RULES_REFRESH_ALARM, {
    periodInMinutes: RULES_REFRESH_INTERVAL_MINUTES
  });
  console.log(`[PE-Capture] Scheduled rule refresh every ${RULES_REFRESH_INTERVAL_MINUTES} minutes`);
}

/**
 * Convert Chrome match pattern to regex for URL matching
 * Supports patterns like: https://*.example.com/*, *://example.com/path/*
 * @param {string} url - URL to test
 * @param {string} pattern - Chrome match pattern
 * @returns {boolean} - True if URL matches pattern
 */
function urlMatchesPattern(url, pattern) {
  try {
    // Escape special regex chars, then convert pattern wildcards
    let regexStr = pattern
      .replace(/[.+?^${}()|[\]\\]/g, '\\$&')  // Escape regex special chars except *
      .replace(/\*/g, '.*');  // Convert * to .*

    // Handle scheme wildcard (*://)
    regexStr = regexStr.replace('.*://', '(https?|ftp)://');

    const regex = new RegExp(`^${regexStr}$`, 'i');
    return regex.test(url);
  } catch (error) {
    console.error('[PE-Capture] Invalid URL pattern:', pattern, error);
    return false;
  }
}

/**
 * Find matching capture rule for a given URL
 * @param {string} url - The URL to find a rule for
 * @returns {{ success: boolean, rule: Object|null }}
 */
async function handleGetRuleForUrl(url) {
  try {
    const cached = await Storage.getCaptureRules();
    const rules = cached.rules || [];

    // Find first enabled rule that matches the URL
    const matchingRule = rules.find(rule =>
      rule.enabled && urlMatchesPattern(url, rule.url_pattern)
    );

    return {
      success: true,
      rule: matchingRule || null
    };
  } catch (error) {
    console.error('[PE-Capture] Error finding rule for URL:', error);
    return { success: false, error: error.message, rule: null };
  }
}

/**
 * Handle captured data from content script
 * Placeholder - full implementation in 07-02
 * @param {Object} payload - Captured data payload
 */
async function handleCaptureData(payload) {
  // TODO: Implement in plan 07-02
  console.log('[PE-Capture] Received capture data (not yet implemented):', payload);
  return { success: false, error: 'Not implemented' };
}

console.log('[PE-Capture] Service worker loaded');
