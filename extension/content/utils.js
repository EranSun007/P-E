/**
 * P&E Manager Jira Sync - Content Script Utilities
 *
 * Page detection and utility functions for content scripts.
 * NOTE: Content scripts cannot use ES modules, so this file is loaded via
 * concatenation or IIFE pattern in content.js
 */

// Page type enum
const PageType = {
  BOARD: 'board',
  BACKLOG: 'backlog',
  DETAIL: 'detail',
  UNKNOWN: 'unknown'
};

/**
 * Detect the current page type from URL
 * @param {string} url - Current page URL
 * @returns {string} PageType value
 */
function detectPageType(url) {
  try {
    const urlObj = new URL(url);
    const path = urlObj.pathname;
    const params = urlObj.searchParams;

    // Sprint board: /secure/RapidBoard.jspa with rapidView and no view param
    // Example: /secure/RapidBoard.jspa?rapidView=12345
    if (path.includes('RapidBoard.jspa') && params.get('rapidView') && !params.get('view')) {
      return PageType.BOARD;
    }

    // Backlog: /secure/RapidBoard.jspa with view=planning
    // Example: /secure/RapidBoard.jspa?rapidView=12345&view=planning
    if (path.includes('RapidBoard.jspa') && params.get('view') === 'planning') {
      return PageType.BACKLOG;
    }

    // Issue detail: /browse/PROJ-123
    // Example: /browse/MYPROJ-456
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
 * Debounce function - delays execution until calls stop for given delay
 * @param {Function} fn - Function to debounce
 * @param {number} delay - Delay in milliseconds
 * @returns {Function} Debounced function with .cancel() method
 */
function debounce(fn, delay) {
  let timeoutId = null;

  const debounced = function(...args) {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => {
      fn.apply(this, args);
    }, delay);
  };

  // Allow manual cancellation
  debounced.cancel = function() {
    clearTimeout(timeoutId);
    timeoutId = null;
  };

  return debounced;
}

/**
 * Wait for element to appear in DOM
 * Polls every 100ms until element found or timeout
 * @param {string} selector - CSS selector
 * @param {number} timeout - Timeout in milliseconds (default 10000)
 * @returns {Promise<Element|null>} Element or null on timeout
 */
async function waitForElement(selector, timeout = 10000) {
  const startTime = Date.now();

  while (Date.now() - startTime < timeout) {
    const element = document.querySelector(selector);
    if (element) {
      return element;
    }
    // Wait 100ms before next check
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  console.log('[PE-Jira] Timeout waiting for element:', selector);
  return null;
}

/**
 * Get container selector for a page type
 * Used to know what element to observe for changes
 * @param {string} pageType - PageType value
 * @returns {string|null} CSS selector or null if unknown
 */
function getContainerSelector(pageType) {
  // These selectors will be refined after live DOM inspection
  // Using common Jira patterns as starting point
  switch (pageType) {
    case PageType.BOARD:
      // Sprint board container
      return '[data-test-id="software-board"], #ghx-pool, .ghx-pool';
    case PageType.BACKLOG:
      // Backlog container
      return '[data-test-id="software-backlog"], #ghx-backlog, .ghx-backlog';
    case PageType.DETAIL:
      // Issue detail container
      return '[data-test-id="issue.views.issue-base"], #jira-issue-header, .issue-header-content';
    default:
      return null;
  }
}
