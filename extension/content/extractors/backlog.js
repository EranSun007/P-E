/**
 * Backlog View Extractor
 * Extracts issues from Jira backlog planning view
 *
 * The backlog view shows issues organized by sprints and a backlog section.
 * Each issue appears as a row with key, summary, and optional fields.
 *
 * SELECTORS NOTE: These selectors are educated guesses. Live inspection needed.
 */

// Primary selectors - Modern Jira backlog
const BACKLOG_SELECTORS = {
  // Sprint container
  sprintContainer: '[data-test-id*="sprint-container"], [data-testid*="sprint"], .js-sprint',
  // Sprint header
  sprintHeader: '[data-test-id*="sprint-header"], [data-testid*="sprint-name"], .ghx-sprint-header',
  // Issue row in backlog
  issueRow: '[data-test-id*="issue-row"], [data-testid*="backlog-issue"], [data-rbd-draggable-id]',
  // Issue key
  issueKey: '[data-test-id*="issue-key"], [data-testid*="key"], a[href*="/browse/"]',
  // Issue summary
  summary: '[data-test-id*="issue-summary"], [data-testid*="summary"]',
  // Status badge
  status: '[data-test-id*="status"], [data-testid*="status"]',
  // Story points
  storyPoints: '[data-test-id*="estimate"], [data-testid*="story-point"]',
  // Assignee
  assignee: '[data-test-id*="assignee"], [data-testid*="avatar"]',
  // Backlog section (unassigned to sprint)
  backlogSection: '[data-test-id*="backlog-content"], [data-testid*="backlog"], .ghx-backlog'
};

// Fallback selectors - Classic Jira backlog
const FALLBACK_SELECTORS = {
  sprintContainer: '.ghx-sprint-group, .js-sprint-container',
  sprintHeader: '.ghx-sprint-header, .ghx-sprint-name',
  issueRow: '.ghx-issue-content, .ghx-backlog-issue, .js-issue',
  issueKey: '.ghx-key, .ghx-key a',
  summary: '.ghx-summary',
  status: '.ghx-status, .aui-lozenge',
  storyPoints: '.ghx-estimate, .ghx-statistic-badge',
  assignee: '.ghx-avatar',
  backlogSection: '.ghx-backlog-container, #ghx-backlog'
};

/**
 * Extract issues from backlog view
 * @returns {Array} Array of issue objects with sprint assignment
 */
function extractBacklogIssues() {
  console.log('[PE-Jira] Extracting backlog issues');
  const issues = [];

  // Extract issues from each sprint section
  const sprintContainers = findElements([
    BACKLOG_SELECTORS.sprintContainer,
    FALLBACK_SELECTORS.sprintContainer
  ]);

  console.log(`[PE-Jira] Found ${sprintContainers.length} sprint containers`);

  sprintContainers.forEach((container, sprintIndex) => {
    const sprintName = extractSprintName(container);
    console.log(`[PE-Jira] Processing sprint: ${sprintName || 'Unknown'}`);

    const sprintIssues = extractIssuesFromContainer(container, sprintName);
    issues.push(...sprintIssues);
  });

  // Extract from unassigned backlog section
  const backlogSection = document.querySelector(BACKLOG_SELECTORS.backlogSection) ||
                        document.querySelector(FALLBACK_SELECTORS.backlogSection);

  if (backlogSection) {
    console.log('[PE-Jira] Processing backlog section');
    const backlogIssues = extractIssuesFromContainer(backlogSection, null);
    issues.push(...backlogIssues);
  }

  console.log(`[PE-Jira] Successfully extracted ${issues.length} issues from backlog`);
  return issues;
}

/**
 * Extract sprint name from container header
 */
function extractSprintName(container) {
  const header = container.querySelector(BACKLOG_SELECTORS.sprintHeader) ||
                 container.querySelector(FALLBACK_SELECTORS.sprintHeader);

  if (!header) return null;

  let name = header.textContent?.trim();
  if (!name) return null;

  // Clean up sprint name (remove issue counts, dates, etc.)
  // "Sprint 42 (5 issues)" -> "Sprint 42"
  // "Sprint 42 Jan 1 - Jan 14" -> "Sprint 42"
  name = name
    .replace(/\s*\(\d+\s*(issues?|stories?|items?)?\)/gi, '')
    .replace(/\s+\d{1,2}\s+\w+\s+-\s+\d{1,2}\s+\w+/g, '')
    .replace(/\s+/g, ' ')
    .trim();

  return name || null;
}

/**
 * Extract issues from a sprint/backlog container
 */
function extractIssuesFromContainer(container, sprintName) {
  const issues = [];

  // Find issue rows within this container
  const rows = container.querySelectorAll(BACKLOG_SELECTORS.issueRow) ||
               container.querySelectorAll(FALLBACK_SELECTORS.issueRow);

  // If direct query found nothing, try fallback
  let issueRows = Array.from(rows);
  if (issueRows.length === 0) {
    issueRows = Array.from(container.querySelectorAll(FALLBACK_SELECTORS.issueRow));
  }

  issueRows.forEach((row, index) => {
    try {
      const issue = extractIssueFromRow(row, sprintName, index);
      if (issue && issue.issue_key) {
        issues.push(issue);
      }
    } catch (error) {
      console.warn(`[PE-Jira] Failed to extract backlog row:`, error.message);
    }
  });

  return issues;
}

/**
 * Extract issue data from backlog row
 */
function extractIssueFromRow(row, sprintName, rank) {
  // Issue key - multiple extraction methods
  const issueKey = extractIssueKey(row);

  if (!issueKey) return null;

  // Summary
  const summary = extractSummary(row);

  // Status
  const status = extractStatus(row);

  // Story points
  const storyPoints = extractStoryPoints(row);

  // Assignee
  const assigneeName = extractAssignee(row);

  // Issue type
  const issueType = extractIssueType(row);

  // Priority
  const priority = extractPriority(row);

  return {
    issue_key: issueKey,
    summary: summary,
    status: status,
    assignee_name: assigneeName,
    story_points: storyPoints,
    issue_type: issueType,
    priority: priority,
    sprint_name: sprintName,
    backlog_rank: rank,
    jira_url: buildJiraUrl(issueKey)
  };
}

/**
 * Extract issue key from row
 */
function extractIssueKey(row) {
  // Method 1: Data attribute
  const dataKey = row.dataset?.issueKey ||
                  row.dataset?.key ||
                  row.getAttribute('data-issue-key');
  if (dataKey && isValidIssueKey(dataKey)) {
    return dataKey;
  }

  // Method 2: Key element
  const keyEl = row.querySelector(BACKLOG_SELECTORS.issueKey) ||
                row.querySelector(FALLBACK_SELECTORS.issueKey);
  const keyText = keyEl?.textContent?.trim();
  if (keyText && isValidIssueKey(keyText)) {
    return keyText;
  }

  // Method 3: Extract from href
  const linkEl = row.querySelector('a[href*="/browse/"]');
  return extractKeyFromHref(linkEl);
}

/**
 * Extract summary from row
 */
function extractSummary(row) {
  const summaryEl = row.querySelector(BACKLOG_SELECTORS.summary) ||
                    row.querySelector(FALLBACK_SELECTORS.summary);

  if (summaryEl) {
    return summaryEl.textContent?.trim() || 'Untitled';
  }

  // Fallback: Find text that looks like a summary
  const textElements = row.querySelectorAll('span, div');
  for (const el of textElements) {
    const text = el.textContent?.trim();
    if (text && text.length > 10 && !isValidIssueKey(text)) {
      return text;
    }
  }

  return 'Untitled';
}

/**
 * Extract status from row
 */
function extractStatus(row) {
  const statusEl = row.querySelector(BACKLOG_SELECTORS.status) ||
                   row.querySelector(FALLBACK_SELECTORS.status);

  if (statusEl) {
    return statusEl.textContent?.trim() || 'To Do';
  }

  // Check for status data attribute
  const dataStatus = row.dataset?.status || row.getAttribute('data-status');
  if (dataStatus) {
    return dataStatus.replace(/_/g, ' ').trim();
  }

  return 'To Do';
}

/**
 * Extract story points from row
 */
function extractStoryPoints(row) {
  const pointsEl = row.querySelector(BACKLOG_SELECTORS.storyPoints) ||
                   row.querySelector(FALLBACK_SELECTORS.storyPoints);

  if (!pointsEl) return null;

  const text = pointsEl.textContent?.trim();
  if (!text) return null;

  const match = text.match(/[\d.]+/);
  if (match) {
    const num = parseFloat(match[0]);
    return isNaN(num) ? null : num;
  }

  return null;
}

/**
 * Extract assignee from row
 */
function extractAssignee(row) {
  const assigneeEl = row.querySelector(BACKLOG_SELECTORS.assignee) ||
                     row.querySelector(FALLBACK_SELECTORS.assignee);

  if (!assigneeEl) return null;

  // Try aria-label
  const ariaLabel = assigneeEl.getAttribute('aria-label');
  if (ariaLabel) {
    return ariaLabel.replace(/^Assignee:\s*/i, '').trim();
  }

  // Try title
  const title = assigneeEl.getAttribute('title');
  if (title) {
    return title.replace(/^Assignee:\s*/i, '').trim();
  }

  // Try img alt
  const img = assigneeEl.querySelector('img');
  if (img?.alt) {
    return img.alt;
  }

  return null;
}

/**
 * Extract issue type from row
 */
function extractIssueType(row) {
  const typeEl = row.querySelector('[data-test-id*="issue-type"], [data-testid*="type"], .ghx-type');

  if (typeEl) {
    return typeEl.getAttribute('aria-label') ||
           typeEl.getAttribute('title') ||
           typeEl.textContent?.trim() ||
           null;
  }

  return null;
}

/**
 * Extract priority from row
 */
function extractPriority(row) {
  const priorityEl = row.querySelector('[data-test-id*="priority"], [data-testid*="priority"], .ghx-priority');

  if (priorityEl) {
    return priorityEl.getAttribute('aria-label') ||
           priorityEl.getAttribute('title') ||
           priorityEl.textContent?.trim() ||
           null;
  }

  return null;
}

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Find elements using multiple selectors
 */
function findElements(selectors) {
  for (const selector of selectors) {
    const elements = document.querySelectorAll(selector);
    if (elements.length > 0) {
      return Array.from(elements);
    }
  }
  return [];
}

/**
 * Extract issue key from href
 */
function extractKeyFromHref(el) {
  if (!el) return null;
  const href = el.getAttribute('href');
  if (!href) return null;

  const browseMatch = href.match(/\/browse\/([A-Z][A-Z0-9]+-\d+)/);
  if (browseMatch) return browseMatch[1];

  const paramMatch = href.match(/[?&]selectedIssue=([A-Z][A-Z0-9]+-\d+)/);
  if (paramMatch) return paramMatch[1];

  return null;
}

/**
 * Validate issue key format
 */
function isValidIssueKey(str) {
  if (!str) return false;
  return /^[A-Z][A-Z0-9]+-\d+$/.test(str.trim());
}

/**
 * Build Jira URL for an issue
 */
function buildJiraUrl(issueKey) {
  const baseUrl = window.location.origin;
  return `${baseUrl}/browse/${issueKey}`;
}

// Export to window for content script access
window.extractBacklogIssues = extractBacklogIssues;
