/**
 * DEBUG HELPER: Run this in Chrome DevTools Console on a Jira page
 * to identify the correct DOM selectors for the P&E Manager extension.
 *
 * Copy and paste the entire contents into the Console tab.
 */

(function() {
  console.log('=== P&E Jira DOM Inspector ===\n');

  // Detect page type
  const url = window.location.href;
  let pageType = 'UNKNOWN';

  if (url.includes('RapidBoard.jspa') && url.includes('view=planning')) {
    pageType = 'BACKLOG';
  } else if (url.includes('RapidBoard.jspa') && !url.includes('view=')) {
    pageType = 'BOARD';
  } else if (url.includes('/browse/')) {
    pageType = 'DETAIL';
  }

  console.log(`Page Type: ${pageType}`);
  console.log(`URL: ${url}\n`);

  // Helper to find elements
  function findElements(selectors, name) {
    console.log(`--- ${name} ---`);
    for (const sel of selectors) {
      const els = document.querySelectorAll(sel);
      if (els.length > 0) {
        console.log(`✓ Found ${els.length} with: ${sel}`);
        console.log('  First element:', els[0]);
        console.log('  Classes:', els[0].className);
        console.log('  Data attrs:', Object.keys(els[0].dataset));
        return els;
      }
    }
    console.log('✗ None found with standard selectors');
    return null;
  }

  // Search for common patterns
  console.log('\n=== SEARCHING FOR ELEMENTS ===\n');

  // Sprint containers
  findElements([
    '[data-test-id*="sprint"]',
    '[data-testid*="sprint"]',
    '.ghx-sprint',
    '.js-sprint-container',
    '.ghx-sprint-group',
    '[class*="Sprint"]',
    '[class*="sprint"]'
  ], 'Sprint Containers');

  // Issue rows
  findElements([
    '[data-test-id*="issue"]',
    '[data-testid*="issue"]',
    '.ghx-issue',
    '.ghx-backlog-issue',
    '[data-rbd-draggable-id]',
    '[class*="Issue"]',
    '[data-issue-key]'
  ], 'Issue Rows');

  // Issue keys (like METERING-1557)
  findElements([
    '[data-test-id*="key"]',
    '[data-testid*="key"]',
    '.ghx-key',
    '#key-val',
    'a[href*="/browse/"]'
  ], 'Issue Keys');

  // Backlog container
  findElements([
    '[data-test-id*="backlog"]',
    '[data-testid*="backlog"]',
    '#ghx-backlog',
    '.ghx-backlog',
    '[id*="backlog"]',
    '[class*="backlog"]'
  ], 'Backlog Container');

  // Board container
  findElements([
    '[data-test-id*="board"]',
    '[data-testid*="board"]',
    '#ghx-pool',
    '.ghx-pool',
    '#ghx-board',
    '[id*="board"]',
    '[class*="board"]'
  ], 'Board Container');

  // Summary elements
  findElements([
    '[data-test-id*="summary"]',
    '[data-testid*="summary"]',
    '.ghx-summary',
    '#summary-val',
    'h1'
  ], 'Summary Elements');

  // Dump unique class names containing key terms
  console.log('\n=== CLASS NAME ANALYSIS ===\n');

  const allClasses = new Set();
  document.querySelectorAll('*').forEach(el => {
    el.classList.forEach(cls => allClasses.add(cls));
  });

  const keyTerms = ['sprint', 'issue', 'backlog', 'board', 'card', 'item', 'ghx', 'jira'];
  keyTerms.forEach(term => {
    const matches = Array.from(allClasses).filter(c => c.toLowerCase().includes(term));
    if (matches.length > 0) {
      console.log(`Classes with "${term}":`, matches.slice(0, 10));
    }
  });

  // Dump data attributes
  console.log('\n=== DATA ATTRIBUTE ANALYSIS ===\n');

  const dataAttrs = new Set();
  document.querySelectorAll('*').forEach(el => {
    Object.keys(el.dataset).forEach(key => dataAttrs.add(key));
  });

  const relevantAttrs = Array.from(dataAttrs).filter(attr => {
    const lower = attr.toLowerCase();
    return keyTerms.some(t => lower.includes(t)) ||
           lower.includes('test') ||
           lower.includes('rbd');
  });
  console.log('Relevant data-* attributes:', relevantAttrs);

  console.log('\n=== INSTRUCTIONS ===');
  console.log('1. Look for ✓ markers above to see which selectors work');
  console.log('2. Right-click an issue row and Inspect to see its structure');
  console.log('3. Copy class names or data attributes to update the extension');
  console.log('4. Share the console output with Claude to fix the selectors');
})();
