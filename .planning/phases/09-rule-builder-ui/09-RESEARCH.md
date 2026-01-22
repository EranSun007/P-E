# Phase 9: Rule Builder UI - Research

**Researched:** 2026-01-22
**Domain:** React form design for rule configuration, CSS selector validation, URL pattern matching
**Confidence:** HIGH

## Summary

Phase 9 creates a user-friendly interface for managing capture rules without editing code. Users need to create rules with URL patterns (wildcards), define CSS selectors with field names, test selectors against live pages, and enable/disable rules. The interface will also provide preset templates for common sites (Jenkins, Grafana, Concourse, Dynatrace).

The existing codebase provides strong patterns to follow: TaskCreationForm (complex form with metadata sections), Settings page (CRUD with Dialog modals), and the existing capture_rules API. The backend API is already complete from Phase 6, and the extension's generic-extractor.js shows exactly how selectors are used (text, html, attribute, href, src types).

**Key constraints from Phase 6/7:**
- Selectors stored as JSONB array: `[{field_name, selector, type, attribute?, required?}]`
- URL patterns use wildcards: `*.grafana.sap/*` (simple glob matching, not regex)
- Extension expects specific selector types: text, html, attribute, href, src
- Rules can be enabled/disabled without deletion (boolean flag)

**Primary recommendation:** Create a dedicated "Capture Rules" page with Dialog-based form following Settings page patterns. Use dynamic array input for selectors (similar to subtasks in TaskCreationForm). Implement client-side selector testing by querying current tab's DOM via chrome.tabs.sendMessage.

## Standard Stack

The established libraries/tools for this domain:

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| React | 18.x | UI framework | Already in use across app |
| react-hook-form | 7.54.2 | Form state management | Already installed, handles validation |
| Radix UI Dialog | Latest | Modal dialogs | Used in Settings, TaskCreationForm |
| Tailwind CSS | Latest | Styling | App-wide styling system |
| shadcn/ui | Latest | Component library | Pre-built accessible components |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| lucide-react | Latest | Icons | Plus, Trash2, TestTube, Eye icons |
| zod | Latest | Schema validation | Form validation (react-hook-form integration) |
| Chrome Extension API | MV3 | Selector testing | Query DOM from current tab |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Dialog modal | Dedicated page | Dialog keeps context, matches Settings pattern |
| Custom form | react-hook-form | react-hook-form already in package.json |
| Iframe preview | Chrome tabs API | Tabs API simpler, no CORS/sandbox issues |

**Installation:**
No new packages required - all dependencies already installed.

## Architecture Patterns

### Recommended Project Structure
```
src/
├── pages/
│   └── CaptureRules.jsx           # Main rules management page
├── components/
│   └── capture/
│       ├── RuleBuilderDialog.jsx  # Create/edit rule dialog
│       ├── RuleList.jsx            # List of rules with enable/disable
│       ├── SelectorEditor.jsx      # Dynamic selector array input
│       ├── SelectorTester.jsx      # Live selector testing component
│       └── PresetTemplates.jsx     # Template selection dropdown
└── api/
    └── entities.js                 # Add CaptureRule client (apiClient already has it)
```

### Pattern 1: Dialog-Based CRUD (from Settings.jsx)
**What:** Use Radix Dialog for create/edit forms, keep list view on main page
**When to use:** CRUD operations where context should remain visible
**Example:**
```jsx
// Source: Settings.jsx pattern
const [showDialog, setShowDialog] = useState(false);
const [editingRule, setEditingRule] = useState(null);

<Dialog open={showDialog} onOpenChange={setShowDialog}>
  <DialogContent className="max-w-4xl">
    <DialogHeader>
      <DialogTitle>{editingRule ? 'Edit Rule' : 'Create Capture Rule'}</DialogTitle>
    </DialogHeader>
    <RuleForm rule={editingRule} onSave={handleSave} />
  </DialogContent>
</Dialog>
```

### Pattern 2: Dynamic Selector Array (from TaskCreationForm subtasks)
**What:** Add/remove selector entries, each with field_name, selector, type
**When to use:** Variable-length arrays in forms
**Example:**
```jsx
// Source: TaskCreationForm.jsx subtasks pattern (lines 403-439)
const [selectors, setSelectors] = useState([]);
const [newSelector, setNewSelector] = useState({
  field_name: '',
  selector: '',
  type: 'text'
});

const addSelector = () => {
  setSelectors([...selectors, { ...newSelector }]);
  setNewSelector({ field_name: '', selector: '', type: 'text' });
};

const removeSelector = (index) => {
  setSelectors(selectors.filter((_, i) => i !== index));
};

// Render:
{selectors.map((sel, idx) => (
  <div key={idx} className="flex gap-2 bg-gray-50 p-2 rounded">
    <Input value={sel.field_name} disabled />
    <Input value={sel.selector} disabled />
    <Badge>{sel.type}</Badge>
    <Button onClick={() => removeSelector(idx)}>
      <Trash2 className="h-4 w-4" />
    </Button>
  </div>
))}
```

### Pattern 3: Selector Testing via Chrome API
**What:** Query current tab's DOM to test selectors before saving rule
**When to use:** User needs to validate selectors against live page
**Example:**
```jsx
// Source: extension/content/generic-extractor.js extractBySelectors() logic
async function testSelectors(selectors) {
  // Get active tab
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

  // Send message to content script to extract data
  const response = await chrome.tabs.sendMessage(tab.id, {
    type: 'TEST_SELECTORS',
    selectors: selectors
  });

  return response.results; // {field_name: value} pairs
}

// In UI:
const [testResults, setTestResults] = useState(null);
const handleTest = async () => {
  const results = await testSelectors(selectors);
  setTestResults(results);
};
```

### Pattern 4: Preset Templates
**What:** Pre-configured rules for common sites (Jenkins, Grafana, etc.)
**When to use:** Jump-start rule creation for known site types
**Example:**
```jsx
// Preset templates as constants
const PRESET_TEMPLATES = {
  jenkins: {
    name: 'Jenkins Build Status',
    url_pattern: '*jenkins*',
    selectors: [
      { field_name: 'build_status', selector: '#buildHistory .build-row .status', type: 'text' },
      { field_name: 'build_number', selector: '#buildHistory .build-row .build-link', type: 'text' },
      { field_name: 'job_name', selector: '#main-panel h1', type: 'text' }
    ]
  },
  grafana: {
    name: 'Grafana Dashboard',
    url_pattern: '*.grafana.sap/*',
    selectors: [
      { field_name: 'dashboard_title', selector: '.navbar-page-btn', type: 'text' },
      { field_name: 'panel_status', selector: '.panel-container .graph-panel-title', type: 'text' }
    ]
  }
  // ... more presets
};

// In UI:
<Select onValueChange={(key) => applyTemplate(PRESET_TEMPLATES[key])}>
  <SelectItem value="jenkins">Jenkins Build Status</SelectItem>
  <SelectItem value="grafana">Grafana Dashboard</SelectItem>
</Select>
```

### Anti-Patterns to Avoid
- **Direct DOM manipulation from web app:** Web app cannot access current page's DOM directly (Chrome extension sandbox). Must use chrome.tabs.sendMessage.
- **Complex regex in URL patterns:** Extension uses simple glob matching (*), not full regex. Keep patterns simple.
- **Inline CSS selector validation:** CSS selectors can be complex and tricky to validate client-side. Better to test against live page.
- **Storing full HTML in captured_data:** Extension extracts text/attributes by default (from generic-extractor.js). Only use 'html' type when necessary.

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Form validation | Custom validators | zod + react-hook-form | Already in codebase, handles async validation |
| Modal dialogs | Custom overlay | Radix UI Dialog | Accessible, keyboard nav, focus trap |
| Dynamic arrays | Manual state | Array methods + React state | Settings page shows working pattern |
| URL pattern validation | Regex parser | Simple string checks | Extension uses minimatch-style globs, not full regex |
| CSS selector validation | CSS parser | Test against live DOM | Selectors are too complex to validate statically |

**Key insight:** Selector validation is nearly impossible client-side (pseudo-selectors, browser-specific quirks). The only reliable validation is testing against a real page's DOM.

## Common Pitfalls

### Pitfall 1: Assuming Web App Can Access Current Tab's DOM
**What goes wrong:** Developer tries to use `document.querySelector()` in the web app to test selectors
**Why it happens:** Confusion between web app context and extension content script context
**How to avoid:**
- Web app cannot access browser tabs - only extension can
- For testing UI in web app: Either mock results, or provide iframe preview (complex)
- For testing in extension popup: Use chrome.tabs.sendMessage to content script
**Warning signs:** CORS errors, undefined chrome.tabs, selectors return null

### Pitfall 2: Complex URL Pattern Validation
**What goes wrong:** Trying to parse complex regex patterns or validate URL matching logic
**Why it happens:** Assumption that URL patterns use full regex syntax
**How to avoid:**
- Extension uses simple glob matching: `*` = wildcard, not regex
- Validate that pattern contains at least one domain component
- Test example: `*.grafana.sap/*` matches `https://monitoring.grafana.sap/dashboard`
**Warning signs:** Users confused by pattern syntax, patterns don't match expected URLs

### Pitfall 3: Forgetting Selector Type Field
**What goes wrong:** UI only allows CSS selector input, forgets to specify extraction type
**Why it happens:** Missing that generic-extractor.js needs to know HOW to extract (text vs attribute vs href)
**How to avoid:**
- Always include type dropdown: text, html, attribute, href, src
- For 'attribute' type, require additional 'attribute' field (e.g., 'data-status')
- Default to 'text' (most common)
**Warning signs:** Extension extracts wrong data (innerHTML when user wanted textContent)

### Pitfall 4: Not Handling Rule Enable/Disable
**What goes wrong:** UI only allows delete, no way to temporarily disable rules
**Why it happens:** CRUD pattern defaults to create/delete
**How to avoid:**
- Add toggle switch in rule list (enabled boolean)
- PUT request to update just {enabled: false} without deleting rule
- Extension filters by enabled: true when fetching rules
**Warning signs:** Users delete rules they want to temporarily disable, lose configuration

### Pitfall 5: No Visual Feedback for Selector Testing
**What goes wrong:** User clicks "Test" button, nothing visible happens (async operation)
**Why it happens:** Forgot to show loading state and results
**How to avoid:**
- Show loading spinner during test
- Display results in table: field_name → extracted value
- Show errors clearly if selector doesn't match anything
- Indicate if selector is "required" but returned null
**Warning signs:** Users click Test multiple times, think feature is broken

## Code Examples

Verified patterns from official sources:

### API Client for CaptureRule
```javascript
// Source: src/api/apiClient.js (lines 332-389)
// Already exists in apiClient.entities, just need to export

// In src/api/entities.js - add to exports
export const CaptureRule = createEntityClient('/capture-rules');

// Usage in component:
import { CaptureRule } from '@/api/entities';

const rules = await CaptureRule.list();
const rule = await CaptureRule.create({
  name: 'Jenkins Builds',
  url_pattern: '*jenkins*',
  selectors: [{
    field_name: 'status',
    selector: '.build-status',
    type: 'text',
    required: true
  }],
  enabled: true
});
```

### Dialog Form Pattern
```jsx
// Source: Settings.jsx (lines 55-82)
const [showDialog, setShowDialog] = useState(false);
const [editingRule, setEditingRule] = useState(null);
const [formData, setFormData] = useState({
  name: '',
  url_pattern: '',
  enabled: true,
  selectors: []
});

const handleCreate = () => {
  setEditingRule(null);
  setFormData({ name: '', url_pattern: '', enabled: true, selectors: [] });
  setShowDialog(true);
};

const handleEdit = (rule) => {
  setEditingRule(rule);
  setFormData({ ...rule });
  setShowDialog(true);
};

const handleSave = async () => {
  if (editingRule) {
    await CaptureRule.update(editingRule.id, formData);
  } else {
    await CaptureRule.create(formData);
  }
  setShowDialog(false);
  loadRules();
};
```

### Enable/Disable Toggle
```jsx
// Source: TaskCreationForm.jsx strategic toggle pattern (lines 659-668)
const handleToggleEnabled = async (rule) => {
  const updated = await CaptureRule.update(rule.id, {
    enabled: !rule.enabled
  });
  // Update local state
  setRules(rules.map(r => r.id === rule.id ? updated : r));
};

// In list:
<Button
  variant={rule.enabled ? "default" : "outline"}
  onClick={() => handleToggleEnabled(rule)}
>
  {rule.enabled ? "Enabled" : "Disabled"}
</Button>
```

### Selector Type Dropdown
```jsx
// Source: TaskCreationForm.jsx Select pattern (lines 516-530)
<Select
  value={selector.type}
  onValueChange={(value) => updateSelector(index, 'type', value)}
>
  <SelectTrigger>
    <SelectValue placeholder="Select extraction type" />
  </SelectTrigger>
  <SelectContent>
    <SelectItem value="text">Text Content</SelectItem>
    <SelectItem value="html">HTML</SelectItem>
    <SelectItem value="attribute">Attribute</SelectItem>
    <SelectItem value="href">Link (href)</SelectItem>
    <SelectItem value="src">Source (src)</SelectItem>
  </SelectContent>
</Select>
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Hardcoded extractors | Generic rule-based extraction | Phase 7 (Jan 2026) | No code changes for new sites |
| localStorage rules | PostgreSQL backend | Phase 6 (Jan 2026) | Multi-user, persistent rules |
| Manual coding | User-friendly UI builder | Phase 9 (this phase) | Non-technical users can create rules |

**Deprecated/outdated:**
- Jira-specific extraction: Replaced by generic selector-based approach
- Single-user extension: Now multi-tenant with backend storage

## Open Questions

Things that couldn't be fully resolved:

1. **Should the web app include selector testing, or only the extension popup?**
   - What we know: Web app cannot access current tab's DOM directly
   - What's unclear: Whether to build testing UI in web app (requires iframe) or extension popup (simpler)
   - Recommendation: Start with "Test" button that instructs user to open extension popup on target page. Phase 10 can add iframe preview if needed.

2. **How to handle selector fallback chains (try A, then B, then C)?**
   - What we know: Extension currently tries one selector per field
   - What's unclear: Whether v1.1 needs fallback support (marked as v2-02 in REQUIREMENTS.md)
   - Recommendation: Single selector per field for v1.1. Fallbacks are future enhancement.

3. **Should preset templates be editable or just starting points?**
   - What we know: Templates should "jump-start" configuration
   - What's unclear: Whether to store templates as saved rules or just populate form
   - Recommendation: Templates populate form fields (not saved), user must save explicitly. Allows customization.

4. **How to validate URL patterns without false positives?**
   - What we know: Extension uses minimatch-style globbing (*, ? wildcards)
   - What's unclear: How strict to be (e.g., require https://, domain components)
   - Recommendation: Minimal validation - just ensure non-empty and contains alphanumeric. Extension will handle matching.

## Sources

### Primary (HIGH confidence)
- **Codebase inspection**: src/components/task/TaskCreationForm.jsx - Dynamic array pattern (subtasks)
- **Codebase inspection**: src/pages/Settings.jsx - Dialog-based CRUD pattern
- **Codebase inspection**: extension/content/generic-extractor.js - Selector extraction logic (types, required fields)
- **Codebase inspection**: server/db/018_capture_framework.sql - Database schema (JSONB selectors)
- **Codebase inspection**: server/routes/captureRules.js - Existing API endpoints

### Secondary (MEDIUM confidence)
- **Existing patterns**: react-hook-form usage in package.json (version 7.54.2)
- **Existing patterns**: Radix UI Dialog usage across codebase

### Tertiary (LOW confidence)
- None - all research based on existing codebase patterns

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - All dependencies already installed and in use
- Architecture: HIGH - Strong existing patterns from Settings and TaskCreationForm
- Pitfalls: MEDIUM - Some edge cases discovered during extension development (Phase 7 research)

**Research date:** 2026-01-22
**Valid until:** 30 days (stable React patterns, no major version changes expected)
