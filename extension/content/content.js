/**
 * P&E Manager Jira Sync - Content Script
 *
 * Main entry point for content script injection on Jira pages.
 * Detects page type, loads appropriate extractor, sets up DOM observation,
 * and coordinates extraction and sync to backend.
 *
 * CRITICAL: Content scripts CANNOT use ES modules in Chrome.
 * All dependencies are inlined in this IIFE.
 * Extractors are loaded dynamically as web_accessible_resources.
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
  async function waitForElement(selector, timeout = 15000) {
    const startTime = Date.now();

    while (Date.now() - startTime < timeout) {
      // Handle comma-separated selectors
      const selectors = selector.split(',').map(s => s.trim());
      for (const sel of selectors) {
        const element = document.querySelector(sel);
        if (element) {
          return element;
        }
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
        return '[data-test-id="software-board"], [data-testid*="board"], #ghx-pool, .ghx-pool, #ghx-board';
      case PageType.BACKLOG:
        return '[data-test-id="software-backlog"], [data-testid*="backlog"], #ghx-backlog, .ghx-backlog, .js-sprint-container';
      case PageType.DETAIL:
        return '[data-test-id*="issue"], [data-testid*="issue"], #jira-issue-header, .issue-header-content, #details-module';
      default:
        return null;
    }
  }

  /**
   * Get extractor script path for a page type
   */
  function getExtractorPath(pageType) {
    switch (pageType) {
      case PageType.BOARD:
        return 'content/extractors/board.js';
      case PageType.BACKLOG:
        return 'content/extractors/backlog.js';
      case PageType.DETAIL:
        return 'content/extractors/detail.js';
      default:
        return null;
    }
  }

  /**
   * Get extractor function name for a page type
   */
  function getExtractorFunctionName(pageType) {
    switch (pageType) {
      case PageType.BOARD:
        return 'extractBoardIssues';
      case PageType.BACKLOG:
        return 'extractBacklogIssues';
      case PageType.DETAIL:
        return 'extractDetailIssue';
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
      // Handle comma-separated selectors
      const selectors = targetSelector.split(',').map(s => s.trim());
      let target = null;

      for (const sel of selectors) {
        target = document.querySelector(sel);
        if (target) break;
      }

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
  // EXTRACTOR LOADER
  // ==========================================================================

  /**
   * Dynamically load an extractor script
   * Scripts are loaded as web_accessible_resources and attach to window
   */
  async function loadExtractorScript(path) {
    return new Promise((resolve, reject) => {
      // Check if already loaded
      const funcName = getExtractorFunctionName(currentPageType);
      if (window[funcName]) {
        console.log('[PE-Jira] Extractor already loaded:', funcName);
        resolve();
        return;
      }

      const script = document.createElement('script');
      script.src = chrome.runtime.getURL(path);
      script.type = 'text/javascript';

      script.onload = () => {
        console.log('[PE-Jira] Extractor script loaded:', path);
        // Remove script element after execution
        script.remove();
        resolve();
      };

      script.onerror = (error) => {
        console.error('[PE-Jira] Failed to load extractor:', path, error);
        script.remove();
        reject(new Error(`Failed to load ${path}`));
      };

      // Inject into page
      (document.head || document.documentElement).appendChild(script);
    });
  }

  // ==========================================================================
  // CONTENT SCRIPT STATE
  // ==========================================================================

  // Current state
  let currentPageType = null;
  let observer = null;
  let lastSyncTime = 0;
  let extractorLoaded = false;

  // Configuration
  const SYNC_THROTTLE_MS = 30000; // 30 seconds between syncs

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
   * Get the current extractor function
   */
  function getExtractor() {
    const funcName = getExtractorFunctionName(currentPageType);
    return funcName ? window[funcName] : null;
  }

  /**
   * Extract issues and sync to backend via service worker
   */
  async function extractAndSync() {
    if (!currentPageType || currentPageType === PageType.UNKNOWN) {
      console.log('[PE-Jira] Unknown page type, skipping extraction');
      return;
    }

    // Get extractor function from window
    const extractor = getExtractor();

    if (!extractor) {
      console.log('[PE-Jira] No extractor available for:', currentPageType);
      return;
    }

    try {
      // Extract issues from DOM
      const issues = extractor();

      if (!issues || issues.length === 0) {
        console.log('[PE-Jira] No issues extracted');
        return;
      }

      console.log('[PE-Jira] Extracted', issues.length, 'issues from', currentPageType);

      // Check throttle
      if (!shouldSync()) {
        console.log('[PE-Jira] Sync throttled, will sync later');
        return;
      }

      // Send to service worker for backend sync
      console.log('[PE-Jira] Sending issues to service worker for sync');
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

  // Debounced extraction for DOM mutations
  const debouncedExtractAndSync = debounce(extractAndSync, 1000);

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
    extractorLoaded = false;

    // Load the appropriate extractor script
    const extractorPath = getExtractorPath(pageType);
    if (extractorPath) {
      try {
        await loadExtractorScript(extractorPath);
        extractorLoaded = true;
        console.log('[PE-Jira] Extractor ready for', pageType);
      } catch (error) {
        console.error('[PE-Jira] Failed to load extractor:', error);
        return;
      }
    }

    // Wait for content container to appear
    const containerSelector = getContainerSelector(pageType);
    console.log('[PE-Jira] Waiting for container:', containerSelector);

    const container = await waitForElement(containerSelector, 15000);

    if (!container) {
      console.error('[PE-Jira] Container not found after timeout');
      // Try extraction anyway - content might be loaded differently
      console.log('[PE-Jira] Attempting extraction without container...');
    }

    // Small delay to let Jira fully render
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Perform initial extraction
    console.log('[PE-Jira] Starting initial extraction');
    await extractAndSync();

    // Set up observer for dynamic content updates
    if (containerSelector) {
      observer = new ContentObserver(debouncedExtractAndSync);
      const observing = observer.observe(containerSelector);

      if (!observing) {
        // Try to observe body as fallback
        console.log('[PE-Jira] Falling back to body observer');
        observer.observe('body');
      }
    }

    console.log('[PE-Jira] Content script fully initialized for', pageType);
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

        // Reset state
        extractorLoaded = false;

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

      case 'GET_PAGE_INFO':
        // Return current page info for popup/debugging
        sendResponse({
          success: true,
          data: {
            pageType: currentPageType,
            extractorLoaded: extractorLoaded,
            lastSyncTime: lastSyncTime,
            isObserving: observer?.isObserving() || false
          }
        });
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
