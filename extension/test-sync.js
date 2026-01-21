/**
 * Test script - paste into service worker console to test sync
 *
 * To use:
 * 1. Go to chrome://extensions
 * 2. Find "P&E Manager Jira Sync" and click "service worker" link
 * 3. In the console, paste this entire file
 * 4. The test sync will execute automatically
 */

const testIssues = [
  {
    issue_key: 'TEST-1',
    summary: 'Test issue from extension',
    status: 'To Do',
    assignee_name: 'Test User',
    assignee_id: 'test-user-123',
    story_points: 3,
    priority: 'Medium',
    issue_type: 'Story',
    sprint_name: 'Sprint 1',
    epic_key: null,
    jira_url: 'https://jira.tools.sap/browse/TEST-1'
  },
  {
    issue_key: 'TEST-2',
    summary: 'Another test issue',
    status: 'In Progress',
    assignee_name: 'Test User',
    assignee_id: 'test-user-123',
    story_points: 5,
    priority: 'High',
    issue_type: 'Bug',
    sprint_name: 'Sprint 1',
    epic_key: 'TEST-100',
    jira_url: 'https://jira.tools.sap/browse/TEST-2'
  }
];

// Send test sync message
chrome.runtime.sendMessage(
  { type: 'SYNC_ISSUES', payload: testIssues },
  (response) => console.log('Sync response:', response)
);
