/**
 * Board View Extractor
 * Extracts issues from Jira sprint board columns
 *
 * SELECTORS NOTE: These selectors are educated guesses based on common Jira patterns.
 * They use fallback chains to maximize compatibility with different Jira configurations:
 * 1. data-testid attributes (most stable - React testing patterns)
 * 2. data-* attributes (stable - semantic data attributes)
 * 3. ghx-* classes (Jira classic patterns)
 * 4. href patterns (URL-based extraction as last resort)
 *
 * Live DOM inspection may be needed to refine selectors for specific Jira instances.
 */

// Primary selectors - Modern Jira (React-based)
const BOARD_SELECTORS = {
  // Board container
  boardContainer: '[data-test-id="software-board.board"], [data-testid="software-board.board"]',
  // Individual issue cards
  issueCard: '[data-test-id*="card-container"], [data-testid*="card"], [data-rbd-draggable-id]',
  // Issue key link
  issueKey: '[data-test-id*="card.key"], [data-testid*="key"], a[href*="/browse/"]',
  // Issue summary/title
  summary: '[data-test-id*="card.summary"], [data-testid*="summary"]',
  // Assignee avatar/element
  assignee: '[data-test-id*="assignee"], [data-testid*="assignee"], [data-testid*="avatar"]',
  // Story points badge
  storyPoints: '[data-test-id*="estimate"], [data-testid*="estimate"], [data-testid*="story-point"]',
  // Column header (for status)
  columnHeader: '[data-test-id*="column-header"], [data-testid*="column-header"]',
  // Column container
  column: '[data-test-id*="column"], [data-testid*="column"]'
};

// Fallback selectors - Classic Jira (ghx-* classes)
const FALLBACK_SELECTORS = {
  boardContainer: '#ghx-pool, .ghx-pool, #ghx-board',
  issueCard: '.ghx-issue, .ghx-issue-content, [data-issue-id]',
  issueKey: '.ghx-key, .ghx-key a',
  summary: '.ghx-summary',
  assignee: '.ghx-avatar, .ghx-avatar-img',
  storyPoints: '.ghx-statistic-badge, .ghx-estimate, .aui-badge',
  columnHeader: '.ghx-column-header-name, .ghx-column-title',
  column: '.ghx-column, .ghx-swimlane-header'
};

/**
 * Extract issues from sprint board view
 * @returns {Array} Array of issue objects
 */
function extractBoardIssues() {
  console.log('[PE-Jira] Extracting board issues');
  const issues = [];

  // Find all issue cards using selector chain
  const cards = findElements([
    BOARD_SELECTORS.issueCard,
    FALLBACK_SELECTORS.issueCard
  ]);

  console.log(`[PE-Jira] Found ${cards.length} issue cards on board`);

  cards.forEach((card, index) => {
    try {
      const issue = extractIssueFromCard(card);
      if (issue && issue.issue_key) {
        issues.push(issue);
      }
    } catch (error) {
      console.warn(`[PE-Jira] Failed to extract card ${index}:`, error.message);
    }
  });

  console.log(`[PE-Jira] Successfully extracted ${issues.length} issues from board`);
  return issues;
}

/**
 * Extract issue data from a single card element
 * @param {HTMLElement} card - The card DOM element
 * @returns {Object|null} Issue object or null if extraction failed
 */
function extractIssueFromCard(card) {
  // Issue key - try multiple extraction methods
  const issueKey = extractIssueKey(card);

  if (!issueKey) {
    return null; // Can't identify issue without key
  }

  // Summary - the issue title
  const summary = extractSummary(card);

  // Status - from parent column or card attributes
  const status = extractStatusFromCard(card);

  // Assignee name
  const assigneeName = extractAssigneeFromCard(card);

  // Story points
  const storyPoints = extractStoryPointsFromCard(card);

  // Issue type (if available)
  const issueType = extractIssueType(card);

  return {
    issue_key: issueKey,
    summary: summary,
    status: status,
    assignee_name: assigneeName,
    story_points: storyPoints,
    issue_type: issueType,
    jira_url: buildJiraUrl(issueKey)
  };
}

/**
 * Extract issue key from card
 */
function extractIssueKey(card) {
  // Method 1: Data attribute
  const dataKey = card.dataset?.issueKey ||
                  card.dataset?.key ||
                  card.getAttribute('data-issue-key');
  if (dataKey && isValidIssueKey(dataKey)) {
    return dataKey;
  }

  // Method 2: Key element text
  const keyEl = card.querySelector(BOARD_SELECTORS.issueKey) ||
                card.querySelector(FALLBACK_SELECTORS.issueKey);
  const keyText = extractText(keyEl);
  if (keyText && isValidIssueKey(keyText)) {
    return keyText;
  }

  // Method 3: Extract from href
  const linkEl = card.querySelector('a[href*="/browse/"]');
  const keyFromHref = extractKeyFromHref(linkEl);
  if (keyFromHref) {
    return keyFromHref;
  }

  // Method 4: Search all links in card
  const allLinks = card.querySelectorAll('a[href]');
  for (const link of allLinks) {
    const key = extractKeyFromHref(link);
    if (key) return key;
  }

  return null;
}

/**
 * Extract summary text from card
 */
function extractSummary(card) {
  // Try summary selectors
  const summaryEl = card.querySelector(BOARD_SELECTORS.summary) ||
                    card.querySelector(FALLBACK_SELECTORS.summary);
  if (summaryEl) {
    return extractText(summaryEl);
  }

  // Fallback: Look for prominent text that's not the key
  const textElements = card.querySelectorAll('span, div, p');
  for (const el of textElements) {
    const text = extractText(el);
    if (text && text.length > 10 && !isValidIssueKey(text)) {
      return text;
    }
  }

  return 'Untitled';
}

/**
 * Extract status from card's parent column or data attributes
 */
function extractStatusFromCard(card) {
  // Method 1: Data attribute on card
  const dataStatus = card.dataset?.status ||
                     card.getAttribute('data-issue-status') ||
                     card.getAttribute('data-status');
  if (dataStatus) {
    return normalizeStatus(dataStatus);
  }

  // Method 2: Find parent column and get its header
  const column = card.closest('[data-test-id*="column"], [data-testid*="column"], .ghx-column');
  if (column) {
    // Check column data attribute
    const columnStatus = column.dataset?.status ||
                        column.getAttribute('data-column-id') ||
                        column.getAttribute('data-status');
    if (columnStatus) {
      return normalizeStatus(columnStatus);
    }

    // Check column header text
    const header = column.querySelector(BOARD_SELECTORS.columnHeader) ||
                   column.querySelector(FALLBACK_SELECTORS.columnHeader);
    if (header) {
      return extractText(header);
    }
  }

  // Method 3: Look for status badge on card
  const statusBadge = card.querySelector('[data-test-id*="status"], .ghx-status, .status-lozenge');
  if (statusBadge) {
    return extractText(statusBadge);
  }

  return 'Unknown';
}

/**
 * Extract assignee from card
 */
function extractAssigneeFromCard(card) {
  const assigneeEl = card.querySelector(BOARD_SELECTORS.assignee) ||
                     card.querySelector(FALLBACK_SELECTORS.assignee);

  if (!assigneeEl) return null;

  // Try aria-label (common for avatars)
  const ariaLabel = assigneeEl.getAttribute('aria-label');
  if (ariaLabel) {
    return cleanAssigneeName(ariaLabel);
  }

  // Try title attribute
  const title = assigneeEl.getAttribute('title');
  if (title) {
    return cleanAssigneeName(title);
  }

  // Try alt text on img
  const img = assigneeEl.querySelector('img') || assigneeEl;
  if (img.alt) {
    return cleanAssigneeName(img.alt);
  }

  // Try text content
  const text = extractText(assigneeEl);
  if (text) {
    return cleanAssigneeName(text);
  }

  return null;
}

/**
 * Extract story points from card
 */
function extractStoryPointsFromCard(card) {
  const pointsEl = card.querySelector(BOARD_SELECTORS.storyPoints) ||
                   card.querySelector(FALLBACK_SELECTORS.storyPoints);

  if (!pointsEl) return null;

  const text = extractText(pointsEl);
  if (!text) return null;

  // Parse number from text (handles "5", "5 pts", "Story Points: 5", etc.)
  const match = text.match(/[\d.]+/);
  if (match) {
    const num = parseFloat(match[0]);
    return isNaN(num) ? null : num;
  }

  return null;
}

/**
 * Extract issue type from card
 */
function extractIssueType(card) {
  // Look for issue type indicator
  const typeEl = card.querySelector('[data-test-id*="issue-type"], [data-testid*="type"], .ghx-type');

  if (typeEl) {
    // Try aria-label first (common for icons)
    const ariaLabel = typeEl.getAttribute('aria-label');
    if (ariaLabel) return ariaLabel;

    // Try title attribute
    const title = typeEl.getAttribute('title');
    if (title) return title;

    // Try text content
    return extractText(typeEl);
  }

  return null;
}

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Find elements using multiple selector chains
 */
function findElements(selectorChains) {
  for (const selectors of selectorChains) {
    const elements = document.querySelectorAll(selectors);
    if (elements.length > 0) {
      return Array.from(elements);
    }
  }
  return [];
}

/**
 * Extract and trim text content from element
 */
function extractText(el) {
  if (!el) return null;
  const text = el.textContent?.trim();
  return text || null;
}

/**
 * Extract issue key from href attribute
 */
function extractKeyFromHref(el) {
  if (!el) return null;
  const href = el.getAttribute('href');
  if (!href) return null;

  // Match /browse/PROJ-123 or selectedIssue=PROJ-123
  const browseMatch = href.match(/\/browse\/([A-Z][A-Z0-9]+-\d+)/);
  if (browseMatch) return browseMatch[1];

  const paramMatch = href.match(/[?&]selectedIssue=([A-Z][A-Z0-9]+-\d+)/);
  if (paramMatch) return paramMatch[1];

  return null;
}

/**
 * Check if string is a valid Jira issue key
 */
function isValidIssueKey(str) {
  if (!str) return false;
  return /^[A-Z][A-Z0-9]+-\d+$/.test(str.trim());
}

/**
 * Clean assignee name (remove prefixes like "Assignee:")
 */
function cleanAssigneeName(name) {
  if (!name) return null;
  return name
    .replace(/^Assignee:\s*/i, '')
    .replace(/^Assigned to:\s*/i, '')
    .trim();
}

/**
 * Normalize status text
 */
function normalizeStatus(status) {
  if (!status) return 'Unknown';
  // Clean up status text
  return status
    .replace(/_/g, ' ')
    .replace(/-/g, ' ')
    .trim();
}

/**
 * Build Jira URL for an issue
 */
function buildJiraUrl(issueKey) {
  // Extract base URL from current page
  const baseUrl = window.location.origin;
  return `${baseUrl}/browse/${issueKey}`;
}

// Export to window for content script access
window.extractBoardIssues = extractBoardIssues;
