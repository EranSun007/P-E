/**
 * Backlog View Extractor
 * Extracts issues from Jira backlog planning view
 *
 * The backlog view shows issues organized by sprints and a backlog section.
 * Each issue appears as a row with key, summary, and optional fields.
 *
 * SELECTORS NOTE: These selectors are educated guesses. Live inspection needed.
 */

// Primary selectors - SAP Jira (Classic GHX-based)
// These selectors are based on live DOM inspection of jira.tools.sap
const BACKLOG_SELECTORS = {
  // Sprint container - contains issues for a sprint (has data-sprint-id)
  sprintContainer: '.js-sprint-container[data-sprint-id], .ghx-backlog-container[data-sprint-id]',
  // Sprint header - contains sprint name
  sprintHeader: '.js-sprint-header, .ghx-backlog-header',
  // Issue row in backlog - each issue item is a .ghx-row
  issueRow: '.ghx-row',
  // Issue key - link to issue
  issueKey: '.ghx-key a, a.js-key-link',
  // Issue summary
  summary: '.ghx-summary .ghx-inner, .ghx-summary',
  // Status badge (may not be visible in backlog compact view)
  status: '.ghx-status .aui-lozenge, .ghx-status',
  // Story points - in the ghx-end section
  storyPoints: '.ghx-end .ghx-statistic-badge, .ghx-estimate',
  // Assignee avatar
  assignee: '.ghx-avatar-img, .ghx-avatar img',
  // Issue type
  issueType: '.ghx-type[title], .ghx-type img[alt]',
  // Priority
  priority: '.ghx-priority[title], .ghx-priority img[alt]',
  // Epic label
  epicLabel: '.ghx-label[data-epickey]',
  // Backlog section (unassigned to sprint)
  backlogSection: '.ghx-backlog, .ghx-backlog-container:not([data-sprint-id])'
};

// Fallback selectors - Additional patterns
const FALLBACK_SELECTORS = {
  sprintContainer: '.ghx-sprint-group > div[data-sprint-id]',
  sprintHeader: '.ghx-sprint-info, .sprint-lozenge',
  issueRow: '.ghx-issues .ghx-row, [class*="ghx-row"]',
  issueKey: 'a[href*="/browse/"]',
  summary: '[title]:not(.ghx-type):not(.ghx-priority)',
  status: '.aui-lozenge',
  storyPoints: '.ghx-stat-1, [class*="estimate"]',
  assignee: 'img[class*="avatar"]',
  issueType: 'img[alt*="Issue Type"]',
  priority: 'img[alt*="Priority"]',
  epicLabel: '[data-epickey]',
  backlogSection: '#ghx-backlog, .ghx-backlog-group'
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
 * SAP Jira header contains sprint name in .ghx-sprint-info or sprint-lozenge
 */
function extractSprintName(container) {
  // Try sprint info element first
  const infoEl = container.querySelector('.ghx-sprint-info');
  if (infoEl) {
    // Sprint info might have multiple children, get the name part
    const nameEl = infoEl.querySelector('.ghx-name, .sprint-lozenge, span');
    if (nameEl) {
      let name = nameEl.textContent?.trim();
      if (name) return cleanSprintName(name);
    }
  }

  // Try header element
  const header = container.querySelector(BACKLOG_SELECTORS.sprintHeader) ||
                 container.querySelector(FALLBACK_SELECTORS.sprintHeader);

  if (!header) return null;

  // Try to find sprint name within header
  const lozenge = header.querySelector('.sprint-lozenge');
  if (lozenge) {
    return cleanSprintName(lozenge.textContent?.trim());
  }

  // Fallback to full header text
  let name = header.textContent?.trim();
  if (!name) return null;

  return cleanSprintName(name);
}

/**
 * Clean sprint name by removing extra info
 */
function cleanSprintName(name) {
  if (!name) return null;

  // Remove issue counts: "Sprint 42 (5 issues)" -> "Sprint 42"
  // Remove dates: "Sprint 42 Jan 1 - Jan 14" -> "Sprint 42"
  // Remove status indicators
  name = name
    .replace(/\s*\(\d+\s*(issues?|stories?|items?|pts?)?\)/gi, '')
    .replace(/\s+\d{1,2}\s+\w{3,9}\s*-\s*\d{1,2}\s+\w{3,9}/gi, '')
    .replace(/\s*(active|closed|future|planned)\s*/gi, '')
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

  // Status (may not be visible in compact backlog view)
  const status = extractStatus(row);

  // Story points
  const storyPoints = extractStoryPoints(row);

  // Assignee
  const assigneeName = extractAssignee(row);

  // Issue type - from .ghx-type title or img alt
  const issueType = extractIssueType(row);

  // Priority - from .ghx-priority title or img alt
  const priority = extractPriority(row);

  // Epic key - from data-epickey attribute
  const epicKey = extractEpicKey(row);

  return {
    issue_key: issueKey,
    summary: summary,
    status: status || 'To Do', // Default if not visible
    assignee_name: assigneeName,
    story_points: storyPoints,
    issue_type: issueType,
    priority: priority,
    epic_key: epicKey,
    sprint_name: sprintName,
    backlog_rank: rank,
    jira_url: buildJiraUrl(issueKey)
  };
}

/**
 * Extract epic key from row
 */
function extractEpicKey(row) {
  const epicEl = row.querySelector(BACKLOG_SELECTORS.epicLabel) ||
                 row.querySelector(FALLBACK_SELECTORS.epicLabel);
  return epicEl?.dataset?.epickey || null;
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
 * SAP Jira: <span class="ghx-type" title="Activity"><img alt="Issue Type: Activity"...>
 */
function extractIssueType(row) {
  // Try ghx-type element with title attribute
  const typeEl = row.querySelector('.ghx-type[title]');
  if (typeEl) {
    return typeEl.getAttribute('title');
  }

  // Try img alt text inside ghx-type
  const typeImg = row.querySelector('.ghx-type img[alt]');
  if (typeImg) {
    const alt = typeImg.getAttribute('alt');
    // Extract type from "Issue Type: Activity" -> "Activity"
    const match = alt?.match(/Issue Type:\s*(.+)/i);
    return match ? match[1] : alt;
  }

  return null;
}

/**
 * Extract priority from row
 * SAP Jira: <span class="ghx-priority" title="Very High"><img alt="Priority: Very High"...>
 */
function extractPriority(row) {
  // Try ghx-priority element with title attribute
  const priorityEl = row.querySelector('.ghx-priority[title]');
  if (priorityEl) {
    return priorityEl.getAttribute('title');
  }

  // Try img alt text inside ghx-priority
  const priorityImg = row.querySelector('.ghx-priority img[alt]');
  if (priorityImg) {
    const alt = priorityImg.getAttribute('alt');
    // Extract priority from "Priority: Very High" -> "Very High"
    const match = alt?.match(/Priority:\s*(.+)/i);
    return match ? match[1] : alt;
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

// Export to window for page context
window.extractBacklogIssues = extractBacklogIssues;

// Also dispatch result via CustomEvent for content script (isolated world)
// Content script can't access window.extractBacklogIssues directly
window.addEventListener('PE_JIRA_EXTRACT_REQUEST', () => {
  console.log('[PE-Jira] Extraction request received in page context');
  const issues = extractBacklogIssues();
  window.dispatchEvent(new CustomEvent('PE_JIRA_EXTRACT_RESULT', {
    detail: { issues: issues, pageType: 'backlog' }
  }));
});

// Signal that extractor is ready
window.dispatchEvent(new CustomEvent('PE_JIRA_EXTRACTOR_READY', {
  detail: { pageType: 'backlog' }
}));
