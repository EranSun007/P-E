/**
 * P&E Manager Jira Sync - Content Script
 *
 * Main entry point for content script injection on Jira pages.
 * Detects page type, sets up DOM observation, and coordinates extraction.
 *
 * CRITICAL: Content scripts CANNOT use ES modules in Chrome.
 * All dependencies are inlined in this IIFE.
 */

(function() {
  'use strict';

  console.log('[PE-Jira] Content script loaded');

  // ==========================================================================
  // INLINED: utils.js
  // ==========================================================================

  // Page type enum
  const PageType = {
    BOARD: 'board',
    BACKLOG: 'backlog',
    DETAIL: 'detail',
    UNKNOWN: 'unknown'
  };

  /**
   * Detect the current page type from URL
   */
  function detectPageType(url) {
    try {
      const urlObj = new URL(url);
      const path = urlObj.pathname;
      const params = urlObj.searchParams;

      // Sprint board: /secure/RapidBoard.jspa with rapidView and no view param
      if (path.includes('RapidBoard.jspa') && params.get('rapidView') && !params.get('view')) {
        return PageType.BOARD;
      }

      // Backlog: /secure/RapidBoard.jspa with view=planning
      if (path.includes('RapidBoard.jspa') && params.get('view') === 'planning') {
        return PageType.BACKLOG;
      }

      // Issue detail: /browse/PROJ-123
      if (path.includes('/browse/') && /[A-Z]+-\d+/.test(path)) {
        return PageType.DETAIL;
      }

      return PageType.UNKNOWN;
    } catch (error) {
      console.error('[PE-Jira] Error detecting page type:', error);
      return PageType.UNKNOWN;
    }
  }

  /**
   * Debounce function
   */
  function debounce(fn, delay) {
    let timeoutId = null;

    const debounced = function(...args) {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        fn.apply(this, args);
      }, delay);
    };

    debounced.cancel = function() {
      clearTimeout(timeoutId);
      timeoutId = null;
    };

    return debounced;
  }

  /**
   * Wait for element to appear in DOM
   */
  async function waitForElement(selector, timeout = 10000) {
    const startTime = Date.now();

    while (Date.now() - startTime < timeout) {
      const element = document.querySelector(selector);
      if (element) {
        return element;
      }
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    console.log('[PE-Jira] Timeout waiting for element:', selector);
    return null;
  }

  /**
   * Get container selector for a page type
   */
  function getContainerSelector(pageType) {
    switch (pageType) {
      case PageType.BOARD:
        return '[data-test-id="software-board"], #ghx-pool, .ghx-pool';
      case PageType.BACKLOG:
        return '[data-test-id="software-backlog"], #ghx-backlog, .ghx-backlog';
      case PageType.DETAIL:
        return '[data-test-id="issue.views.issue-base"], #jira-issue-header, .issue-header-content';
      default:
        return null;
    }
  }

  // ==========================================================================
  // INLINED: observer.js
  // ==========================================================================

  class ContentObserver {
    constructor(onContentReady) {
      this.onContentReady = onContentReady;
      this.observer = null;
      this.debounceTimer = null;
      this.DEBOUNCE_MS = 500;
    }

    observe(targetSelector) {
      const target = document.querySelector(targetSelector);
      if (!target) {
        console.log('[PE-Jira] Observer target not found:', targetSelector);
        return false;
      }

      this.observer = new MutationObserver((mutations) => {
        clearTimeout(this.debounceTimer);
        this.debounceTimer = setTimeout(() => {
          console.log('[PE-Jira] DOM mutation detected, triggering extraction');
          this.onContentReady();
        }, this.DEBOUNCE_MS);
      });

      this.observer.observe(target, {
        childList: true,
        subtree: true,
        attributes: false
      });

      console.log('[PE-Jira] Observer started on:', targetSelector);
      return true;
    }

    disconnect() {
      if (this.observer) {
        this.observer.disconnect();
        this.observer = null;
        console.log('[PE-Jira] Observer disconnected');
      }
      if (this.debounceTimer) {
        clearTimeout(this.debounceTimer);
        this.debounceTimer = null;
      }
    }

    isObserving() {
      return this.observer !== null;
    }
  }

  // ==========================================================================
  // CONTENT SCRIPT STATE
  // ==========================================================================

  // Current state
  let currentPageType = null;
  let observer = null;
  let lastSyncTime = 0;

  // Configuration
  const SYNC_THROTTLE_MS = 30000; // 30 seconds between syncs

  // Extractors - will be populated in Plan 02
  // Each extractor function returns an array of issue objects
  const extractors = {
    [PageType.BOARD]: null,    // extractBoardIssues() - Plan 02
    [PageType.BACKLOG]: null,  // extractBacklogIssues() - Plan 02
    [PageType.DETAIL]: null    // extractDetailIssue() - Plan 02
  };

  // ==========================================================================
  // SYNC LOGIC
  // ==========================================================================

  /**
   * Check if enough time has passed since last sync
   */
  function shouldSync() {
    const now = Date.now();
    return (now - lastSyncTime) >= SYNC_THROTTLE_MS;
  }

  /**
   * Extract issues and sync to backend via service worker
   */
  async function extractAndSync() {
    // Get extractor for current page type
    const extractor = extractors[currentPageType];

    if (!extractor) {
      // Extractors not yet implemented (Plan 02)
      console.log('[PE-Jira] No extractor for page type:', currentPageType, '(expected - extractors added in Plan 02)');
      return;
    }

    try {
      // Extract issues from DOM
      const issues = await extractor();

      if (!issues || issues.length === 0) {
        console.log('[PE-Jira] No issues extracted');
        return;
      }

      console.log('[PE-Jira] Extracted', issues.length, 'issues');

      // Check throttle
      if (!shouldSync()) {
        console.log('[PE-Jira] Sync throttled, skipping');
        return;
      }

      // Send to service worker for backend sync
      const response = await chrome.runtime.sendMessage({
        type: 'SYNC_ISSUES',
        payload: issues
      });

      if (response.success) {
        console.log('[PE-Jira] Sync successful:', response.data);
        lastSyncTime = Date.now();
      } else {
        console.error('[PE-Jira] Sync failed:', response.error);
      }
    } catch (error) {
      // Service worker may be inactive, handle gracefully
      if (error.message && error.message.includes('Could not establish connection')) {
        console.log('[PE-Jira] Service worker inactive, will retry on next extraction');
      } else {
        console.error('[PE-Jira] Extraction/sync error:', error);
      }
    }
  }

  // ==========================================================================
  // INITIALIZATION
  // ==========================================================================

  /**
   * Initialize content script for current page
   */
  async function init() {
    // Detect page type from URL
    const pageType = detectPageType(window.location.href);
    console.log('[PE-Jira] Page type:', pageType);

    if (pageType === PageType.UNKNOWN) {
      console.log('[PE-Jira] Not a tracked page type, content script idle');
      return;
    }

    currentPageType = pageType;

    // Placeholder: Will wait for content and set up observer once extractors exist
    // The extractors will be added in Plan 02, which will also enable:
    // 1. Waiting for container element to appear
    // 2. Initial extraction call
    // 3. Setting up observer for ongoing DOM changes
    //
    // For now, just log that we're ready
    console.log('[PE-Jira] Content script ready for', pageType, 'page');
    console.log('[PE-Jira] Extraction will be enabled in Plan 02');
  }

  // ==========================================================================
  // MESSAGE HANDLERS
  // ==========================================================================

  // Listen for messages from service worker
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    console.log('[PE-Jira] Message received:', message.type);

    switch (message.type) {
      case 'URL_CHANGED':
        // SPA navigation detected by service worker
        console.log('[PE-Jira] URL changed to:', message.url);

        // Cleanup existing observer
        if (observer) {
          observer.disconnect();
          observer = null;
        }

        // Re-initialize for new page
        init();
        sendResponse({ success: true });
        break;

      case 'REFRESH_DATA':
        // Manual refresh requested (from popup)
        console.log('[PE-Jira] Manual refresh requested');

        // Reset throttle to force sync
        lastSyncTime = 0;

        // Trigger extraction
        extractAndSync();
        sendResponse({ success: true });
        break;

      default:
        console.log('[PE-Jira] Unknown message type:', message.type);
        sendResponse({ success: false, error: 'Unknown message type' });
    }

    return true; // Keep channel open for async response
  });

  // ==========================================================================
  // START
  // ==========================================================================

  // Initialize on load
  init();

})();
