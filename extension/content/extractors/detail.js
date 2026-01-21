/**
 * Issue Detail Page Extractor
 * Extracts full issue metadata from individual issue view (/browse/PROJ-123)
 *
 * Detail pages provide the richest data source with access to all issue fields.
 * This extractor captures comprehensive metadata including epic links, sprints,
 * and custom fields that may not be visible on board/backlog views.
 *
 * SELECTORS NOTE: These selectors are educated guesses. Live inspection needed.
 */

// Primary selectors - Modern Jira issue view
const DETAIL_SELECTORS = {
  // Issue key (breadcrumb or header)
  issueKey: '[data-test-id*="breadcrumb"] [data-test-id*="current"], [data-testid*="issue-key"]',
  // Summary/title
  summary: '[data-test-id*="summary.heading"], [data-testid*="summary"], h1[data-testid]',
  // Status badge
  status: '[data-test-id*="status-field"], [data-testid*="status"]',
  // Assignee field
  assignee: '[data-test-id*="assignee"], [data-testid*="assignee"]',
  // Story points field
  storyPoints: '[data-test-id*="story-points"], [data-testid*="estimate"]',
  // Priority field
  priority: '[data-test-id*="priority"], [data-testid*="priority"]',
  // Issue type
  issueType: '[data-test-id*="issue-type"], [data-testid*="issue-type"]',
  // Epic link field
  epicLink: '[data-test-id*="epic-link"], [data-testid*="parent"], [data-testid*="epic"]',
  // Sprint field
  sprint: '[data-test-id*="sprint"], [data-testid*="sprint"]',
  // Labels
  labels: '[data-test-id*="labels"], [data-testid*="labels"]',
  // Description
  description: '[data-test-id*="description"], [data-testid*="description"]'
};

// Fallback selectors - Classic Jira issue view
const FALLBACK_SELECTORS = {
  issueKey: '#key-val, .issue-link, #issuekey-val',
  summary: '#summary-val, .summary, h1.ghx-summary',
  status: '#status-val, .status-lozenge, #opsbar-transitions_more',
  assignee: '#assignee-val, .assignee, #peoplemodule .user-hover',
  storyPoints: '#customfield_10106-val, [data-field-id="customfield_10106"]',
  priority: '#priority-val, .priority',
  issueType: '#type-val, .issue-type',
  epicLink: '#customfield_10100-val, [data-field-id*="epic"]',
  sprint: '#customfield_10104-val, [data-field-id*="sprint"]',
  labels: '#labels-val, .labels',
  description: '#description-val, .description'
};

/**
 * Extract issue data from detail page
 * @returns {Array} Single-element array with full issue data
 */
function extractDetailIssue() {
  console.log('[PE-Jira] Extracting from detail page');

  // Primary: Get issue key from URL
  const issueKey = extractIssueKeyFromUrl() || extractIssueKeyFromDom();

  if (!issueKey) {
    console.warn('[PE-Jira] Could not determine issue key from detail page');
    return [];
  }

  console.log(`[PE-Jira] Extracting details for ${issueKey}`);

  const issue = {
    issue_key: issueKey,
    summary: extractFieldText(DETAIL_SELECTORS.summary, FALLBACK_SELECTORS.summary) || 'Untitled',
    status: extractFieldText(DETAIL_SELECTORS.status, FALLBACK_SELECTORS.status) || 'Unknown',
    assignee_name: extractAssignee(),
    story_points: extractNumber(DETAIL_SELECTORS.storyPoints, FALLBACK_SELECTORS.storyPoints),
    priority: extractFieldText(DETAIL_SELECTORS.priority, FALLBACK_SELECTORS.priority),
    issue_type: extractIssueType(),
    epic_key: extractEpicKey(),
    sprint_name: extractSprintName(),
    labels: extractLabels(),
    description: extractDescription(),
    jira_url: window.location.href.split('?')[0] // Clean URL without params
  };

  console.log('[PE-Jira] Extracted issue:', issue.issue_key, 'with', Object.keys(issue).filter(k => issue[k]).length, 'fields');
  return [issue];
}

/**
 * Extract issue key from URL path
 */
function extractIssueKeyFromUrl() {
  const path = window.location.pathname;
  const match = path.match(/\/browse\/([A-Z][A-Z0-9]+-\d+)/);
  return match ? match[1] : null;
}

/**
 * Extract issue key from DOM elements
 */
function extractIssueKeyFromDom() {
  const keyEl = document.querySelector(DETAIL_SELECTORS.issueKey) ||
                document.querySelector(FALLBACK_SELECTORS.issueKey);

  if (keyEl) {
    const text = keyEl.textContent?.trim();
    if (text && /^[A-Z][A-Z0-9]+-\d+$/.test(text)) {
      return text;
    }
  }

  // Try page title
  const title = document.title;
  const match = title.match(/\[([A-Z][A-Z0-9]+-\d+)\]/);
  return match ? match[1] : null;
}

/**
 * Extract text from a field using primary and fallback selectors
 */
function extractFieldText(primarySelector, fallbackSelector) {
  const el = document.querySelector(primarySelector) ||
             (fallbackSelector && document.querySelector(fallbackSelector));

  if (!el) return null;

  // Get clean text content
  const text = el.textContent?.trim();
  if (!text || text === 'None' || text === '-') return null;

  return text;
}

/**
 * Extract numeric value from field
 */
function extractNumber(primarySelector, fallbackSelector) {
  const text = extractFieldText(primarySelector, fallbackSelector);
  if (!text) return null;

  const match = text.match(/[\d.]+/);
  if (match) {
    const num = parseFloat(match[0]);
    return isNaN(num) ? null : num;
  }

  return null;
}

/**
 * Extract assignee with multiple fallback strategies
 */
function extractAssignee() {
  const el = document.querySelector(DETAIL_SELECTORS.assignee) ||
             document.querySelector(FALLBACK_SELECTORS.assignee);

  if (!el) return null;

  // Try data attribute
  const dataName = el.dataset?.username || el.dataset?.name;
  if (dataName) return dataName;

  // Try aria-label (often used for user elements)
  const ariaLabel = el.getAttribute('aria-label');
  if (ariaLabel) {
    return ariaLabel.replace(/^Assignee:\s*/i, '').trim();
  }

  // Try finding name element within
  const nameEl = el.querySelector('[data-test-id*="name"], .name, .user-hover');
  if (nameEl) {
    const name = nameEl.textContent?.trim();
    if (name && name !== 'Unassigned') return name;
  }

  // Try text content
  const text = el.textContent?.trim();
  if (text && text !== 'Unassigned' && text !== 'None') {
    return text;
  }

  return null;
}

/**
 * Extract issue type
 */
function extractIssueType() {
  const el = document.querySelector(DETAIL_SELECTORS.issueType) ||
             document.querySelector(FALLBACK_SELECTORS.issueType);

  if (el) {
    // Prefer aria-label for icon-based types
    const ariaLabel = el.getAttribute('aria-label');
    if (ariaLabel) return ariaLabel;

    const title = el.getAttribute('title');
    if (title) return title;

    const text = el.textContent?.trim();
    if (text) return text;
  }

  // Try to find in breadcrumbs or type icon
  const typeIcon = document.querySelector('[data-testid*="type-icon"], .type-icon, #type-val img');
  if (typeIcon) {
    return typeIcon.getAttribute('alt') ||
           typeIcon.getAttribute('title') ||
           typeIcon.getAttribute('aria-label');
  }

  return null;
}

/**
 * Extract epic key from epic link field
 */
function extractEpicKey() {
  const el = document.querySelector(DETAIL_SELECTORS.epicLink) ||
             document.querySelector(FALLBACK_SELECTORS.epicLink);

  if (!el) return null;

  // Look for link to epic within the field
  const link = el.querySelector('a[href*="/browse/"]');
  if (link) {
    const href = link.getAttribute('href');
    const match = href?.match(/\/browse\/([A-Z][A-Z0-9]+-\d+)/);
    if (match) return match[1];

    // Try link text
    const linkText = link.textContent?.trim();
    if (linkText && /^[A-Z][A-Z0-9]+-\d+$/.test(linkText)) {
      return linkText;
    }
  }

  // Try text content for key pattern
  const text = el.textContent?.trim();
  const keyMatch = text?.match(/([A-Z][A-Z0-9]+-\d+)/);
  return keyMatch ? keyMatch[1] : null;
}

/**
 * Extract sprint name
 */
function extractSprintName() {
  const el = document.querySelector(DETAIL_SELECTORS.sprint) ||
             document.querySelector(FALLBACK_SELECTORS.sprint);

  if (!el) return null;

  let text = el.textContent?.trim();
  if (!text || text === 'None' || text === '-') return null;

  // Clean up sprint display
  // Handle comma-separated sprints (take most recent/last)
  const sprints = text.split(',').map(s => s.trim());
  text = sprints[sprints.length - 1];

  // Remove metadata like dates or state
  text = text
    .replace(/\s*\(.*\)$/, '') // Remove parenthetical info
    .replace(/\s*(active|closed|future)\s*/gi, '') // Remove state
    .trim();

  return text || null;
}

/**
 * Extract labels as array
 */
function extractLabels() {
  const el = document.querySelector(DETAIL_SELECTORS.labels) ||
             document.querySelector(FALLBACK_SELECTORS.labels);

  if (!el) return null;

  // Try to find individual label elements
  const labelElements = el.querySelectorAll('[data-test-id*="label"], .lozenge, .label');
  if (labelElements.length > 0) {
    const labels = Array.from(labelElements)
      .map(l => l.textContent?.trim())
      .filter(l => l && l !== 'None');
    return labels.length > 0 ? labels : null;
  }

  // Fallback: parse text content
  const text = el.textContent?.trim();
  if (!text || text === 'None') return null;

  const labels = text.split(/[,\s]+/).filter(l => l && l !== 'None');
  return labels.length > 0 ? labels : null;
}

/**
 * Extract description (truncated for sync)
 */
function extractDescription() {
  const el = document.querySelector(DETAIL_SELECTORS.description) ||
             document.querySelector(FALLBACK_SELECTORS.description);

  if (!el) return null;

  let text = el.textContent?.trim();
  if (!text || text === 'Click to add description') return null;

  // Truncate long descriptions (keep first 500 chars)
  if (text.length > 500) {
    text = text.substring(0, 500) + '...';
  }

  return text;
}

// Export to window for content script access
window.extractDetailIssue = extractDetailIssue;
