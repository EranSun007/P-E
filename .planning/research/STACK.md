# Technology Stack: Configurable Web Capture Framework (v1.1)

**Project:** P&E Manager - Configurable Extraction Rules
**Researched:** 2026-01-22
**Context:** Adding configurable extraction to existing Chrome Extension + Express/PostgreSQL backend
**Supersedes:** v1.0 Jira Extension Stack (now implemented and working)

## Executive Summary

The configurable web capture framework requires **minimal stack additions**. The existing stack (Express/PostgreSQL/React/Zod) provides everything needed. The key insight: **this is a schema design problem, not a library problem**.

**Recommendation:** Store extraction rules as JSONB in PostgreSQL, validate with Zod on both frontend and backend, use react-hook-form's `useFieldArray` for the rule builder UI. No new runtime dependencies required.

## Existing Stack (v1.0 - Already Implemented)

The following are already in place and working:

| Component | Version | Status |
|-----------|---------|--------|
| Chrome Extension (MV3) | 1.0.0 | Working - hardcoded Jira extractors |
| Service Worker | - | Working - message passing, sync |
| Content Scripts | - | Working - DOM scraping, MutationObserver |
| Express.js Backend | 4.18.2 | Working - /api/jira-issues endpoints |
| PostgreSQL | pg 8.11.3 | Working - jira_issues, jira_team_mappings tables |
| React Frontend | 18.2.0 | Working - shadcn/ui components |
| Zod | 3.25.76 | Working - schema validation |
| react-hook-form | 7.60.0 | Working - form state management |

**Key Files Already Implemented:**
- `extension/manifest.json` - MV3 extension config
- `extension/content/extractors/*.js` - Hardcoded Jira extractors (to be replaced)
- `server/services/JiraService.js` - Backend sync service
- `server/db/017_jira_integration.sql` - Issue storage schema

---

## Stack Additions for v1.1 (Configurable Rules)

### Database Layer

| Component | Addition | Version | Purpose | Rationale |
|-----------|----------|---------|---------|-----------|
| PostgreSQL JSONB | **Already have** | N/A | Store extraction rules as structured JSON | Native PostgreSQL feature, indexed, queryable |
| New tables | **Schema only** | - | capture_sources, captured_items | No new libraries |

**Why JSONB over separate tables for rules:**
- Extraction rules are read together, rarely updated individually
- Rule structure may evolve; JSONB is schema-flexible
- Single query fetches complete rule set for a site
- PostgreSQL can index and query inside JSONB fields when needed

**Why NOT a NoSQL database:**
- Already have PostgreSQL
- JSONB provides JSON flexibility with SQL queryability
- No operational overhead of additional database

### Validation Layer

| Component | Status | Version | Purpose | Rationale |
|-----------|--------|---------|---------|-----------|
| Zod | **Already installed** | 3.25.76 | Schema validation for rules | Already used throughout codebase |
| @hookform/resolvers | **Already installed** | 4.1.3 | Zod integration with react-hook-form | Already configured |

**No new validation libraries needed.** Zod handles:
- Rule structure validation on save
- CSS selector format validation (basic string validation)
- Field mapping validation
- Runtime type checking for rule execution

### Frontend UI Layer

| Component | Status | Version | Purpose | Rationale |
|-----------|--------|---------|---------|-----------|
| react-hook-form | **Already installed** | 7.60.0 | Dynamic rule builder forms | `useFieldArray` perfect for variable-length rule lists |
| shadcn/ui components | **Already installed** | Latest | Form inputs, cards, dialogs | Comprehensive UI component library in place |

**Why no dedicated rule-builder library:**
- Rule structure is simple (selector + field mapping)
- react-hook-form's `useFieldArray` handles dynamic fields perfectly
- Existing shadcn/ui components (Input, Select, Card) provide all needed UI
- Custom rule-builder libraries add complexity without benefit for this use case

### Extension Layer

| Component | Status | Version | Purpose | Rationale |
|-----------|--------|---------|---------|-----------|
| Manifest V3 | **Already using** | 3 | Chrome extension format | Current extension already uses MV3 |
| chrome.storage | **Already using** | - | Cache rules locally | Existing pattern for settings storage |

**Extension changes are architectural, not library-based:**
- Replace hardcoded extractors with generic rule executor
- Fetch rules from backend API
- Cache rules in chrome.storage with TTL

---

## Stack Additions NOT Recommended

### Puppeteer/Playwright
**Do not add.** The extension runs in user's browser - already has DOM access. Headless browsers are for server-side scraping.

### Cheerio
**Do not add.** Cheerio parses HTML strings. Extension has live DOM - use native `querySelector`.

### JSONPath/JMESPath
**Do not add.** Extraction rules operate on DOM, not JSON. Simple field mapping is sufficient.

### Dedicated Rule Engine (json-rules-engine, etc.)
**Do not add.** Extraction rules are not business rules. They're simple "selector -> field" mappings. A switch statement suffices.

### GraphQL
**Do not add.** REST API is working well. Rules API is simple CRUD - no benefit from GraphQL complexity.

### Redis/Message Queue
**Do not add.** Expected volume (<1000 captures/day per user) doesn't justify operational complexity. PostgreSQL polling with `SKIP LOCKED` handles concurrent processing.

### WebSocket/SSE
**Do not add.** No real-time requirement for rule updates. Extension polls backend periodically - existing pattern works.

---

## Detailed Component Designs

### 1. Extraction Rule Schema

New PostgreSQL table using JSONB:

```sql
-- New migration: 018_capture_sources.sql
CREATE TABLE capture_sources (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id VARCHAR(100) NOT NULL,
  name VARCHAR(255) NOT NULL,           -- "Grafana Dashboards", "Jenkins Builds"
  url_pattern VARCHAR(1024) NOT NULL,   -- RegExp pattern to match URLs
  site_type VARCHAR(100),               -- 'grafana', 'jenkins', 'concourse', etc.
  is_active BOOLEAN DEFAULT true,
  rules JSONB NOT NULL,                 -- Extraction rules (see below)
  field_mappings JSONB,                 -- How to map extracted fields to entities
  created_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, name)
);

CREATE INDEX idx_capture_sources_user ON capture_sources(user_id);
CREATE INDEX idx_capture_sources_active ON capture_sources(user_id, is_active);
```

**Rules JSONB structure:**
```typescript
// Validated with Zod on both frontend and backend
interface ExtractionRules {
  version: number;                      // Schema version for migrations
  pageDetection: {
    urlPattern: string;                 // RegExp to match URL
    requiredElements?: string[];        // CSS selectors that must exist
  };
  container?: {
    selector: string;                   // Container for list items
    itemSelector: string;               // Individual item within container
  };
  fields: {
    [fieldName: string]: {
      selector: string;                 // CSS selector
      attribute?: string;               // 'textContent' (default), 'href', 'data-*', etc.
      transform?: 'number' | 'date' | 'trim' | 'regex';
      transformArg?: string;            // For regex: capture group pattern
      fallbackSelector?: string;        // Backup selector if primary fails
    };
  };
}
```

### 2. Data Staging (Inbox) Table

```sql
-- New migration: 019_captured_items.sql
CREATE TABLE captured_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id VARCHAR(100) NOT NULL,
  source_id UUID REFERENCES capture_sources(id),
  source_type VARCHAR(100) NOT NULL,    -- 'grafana', 'jenkins', etc.
  source_url VARCHAR(2048),             -- Original page URL
  external_id VARCHAR(255),             -- ID from source system if available
  raw_data JSONB NOT NULL,              -- Extracted fields
  status VARCHAR(50) DEFAULT 'pending', -- pending, mapped, processed, error
  mapped_entity_type VARCHAR(100),      -- 'task', 'metric', etc.
  mapped_entity_id UUID,                -- ID of created/updated entity
  error_message TEXT,
  captured_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  processed_at TIMESTAMP,
  created_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_captured_items_user_status ON captured_items(user_id, status);
CREATE INDEX idx_captured_items_source ON captured_items(source_id);
CREATE INDEX idx_captured_items_pending ON captured_items(user_id)
  WHERE status = 'pending';
```

**Inbox Processing Pattern:**
```javascript
// Background job polls for pending items (no message queue needed)
async function processInbox(userId) {
  // Atomic claim with SKIP LOCKED prevents double-processing
  const sql = `
    UPDATE captured_items
    SET status = 'processing'
    WHERE id IN (
      SELECT id FROM captured_items
      WHERE user_id = $1 AND status = 'pending'
      ORDER BY captured_at
      LIMIT 10
      FOR UPDATE SKIP LOCKED
    )
    RETURNING *
  `;
  const items = await query(sql, [userId]);
  // Process each item...
}
```

### 3. Frontend Rule Builder

Use existing react-hook-form with useFieldArray:

```jsx
// Example component structure (no new dependencies)
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';

const fieldRuleSchema = z.object({
  name: z.string().min(1, 'Field name required'),
  selector: z.string().min(1, 'CSS selector required'),
  attribute: z.string().optional(),
  transform: z.enum(['none', 'number', 'date', 'trim', 'regex']).optional(),
});

const ruleSchema = z.object({
  name: z.string().min(1),
  urlPattern: z.string().min(1),
  containerSelector: z.string().optional(),
  itemSelector: z.string().optional(),
  fields: z.array(fieldRuleSchema).min(1, 'At least one field required'),
});

function RuleBuilder({ onSave }) {
  const form = useForm({
    resolver: zodResolver(ruleSchema),
    defaultValues: {
      name: '',
      urlPattern: '',
      fields: [{ name: '', selector: '', attribute: 'textContent' }]
    }
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'fields'
  });

  return (
    <form onSubmit={form.handleSubmit(onSave)}>
      {/* Name and URL pattern inputs */}
      {/* Dynamic field list using existing shadcn/ui components */}
      {fields.map((field, index) => (
        <Card key={field.id}>
          <Input {...form.register(`fields.${index}.name`)} placeholder="Field name" />
          <Input {...form.register(`fields.${index}.selector`)} placeholder="CSS selector" />
          <Select {...form.register(`fields.${index}.attribute`)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="textContent">Text Content</SelectItem>
              <SelectItem value="href">Link (href)</SelectItem>
              <SelectItem value="src">Image (src)</SelectItem>
            </SelectContent>
          </Select>
          <Button type="button" onClick={() => remove(index)}>Remove</Button>
        </Card>
      ))}
      <Button type="button" onClick={() => append({ name: '', selector: '' })}>
        Add Field
      </Button>
      <Button type="submit">Save Rule</Button>
    </form>
  );
}
```

### 4. Generic Extractor in Extension

Pure JavaScript - no new dependencies:

```javascript
// extension/content/genericExtractor.js
// Replaces hardcoded extractors (board.js, backlog.js, detail.js)

class GenericExtractor {
  constructor(rules) {
    this.rules = rules;
  }

  /**
   * Check if current page matches this rule's URL pattern
   */
  matchesPage(url) {
    try {
      const pattern = new RegExp(this.rules.pageDetection.urlPattern);
      return pattern.test(url);
    } catch {
      return false;
    }
  }

  /**
   * Extract data from the page using configured rules
   */
  extract() {
    const items = [];

    // List extraction (multiple items)
    if (this.rules.container) {
      const container = document.querySelector(this.rules.container.selector);
      if (!container) return [];

      const elements = container.querySelectorAll(this.rules.container.itemSelector);
      for (const el of elements) {
        const item = this.extractItem(el);
        if (item && Object.keys(item).length > 0) {
          items.push(item);
        }
      }
    } else {
      // Single item extraction (detail page)
      const item = this.extractItem(document);
      if (item && Object.keys(item).length > 0) {
        items.push(item);
      }
    }

    return items;
  }

  /**
   * Extract fields from a single element
   */
  extractItem(context) {
    const item = {};

    for (const [fieldName, config] of Object.entries(this.rules.fields)) {
      let value = this.extractField(context, config);

      // Apply transform
      if (value && config.transform) {
        value = this.applyTransform(value, config.transform, config.transformArg);
      }

      if (value !== null && value !== undefined) {
        item[fieldName] = value;
      }
    }

    return item;
  }

  /**
   * Extract a single field value
   */
  extractField(context, config) {
    let el = context.querySelector(config.selector);

    // Try fallback
    if (!el && config.fallbackSelector) {
      el = context.querySelector(config.fallbackSelector);
    }

    if (!el) return null;

    // Get value based on attribute
    const attr = config.attribute || 'textContent';

    if (attr === 'textContent') {
      return el.textContent?.trim() || null;
    } else if (attr === 'href') {
      return el.href || el.getAttribute('href');
    } else if (attr === 'src') {
      return el.src || el.getAttribute('src');
    } else if (attr.startsWith('data-')) {
      return el.dataset[attr.slice(5)];
    } else {
      return el.getAttribute(attr);
    }
  }

  /**
   * Apply transformation to extracted value
   */
  applyTransform(value, transform, arg) {
    switch (transform) {
      case 'number':
        const num = parseFloat(value);
        return isNaN(num) ? null : num;

      case 'trim':
        return value?.trim();

      case 'date':
        const date = new Date(value);
        return isNaN(date.getTime()) ? null : date.toISOString();

      case 'regex':
        if (!arg) return value;
        const match = value.match(new RegExp(arg));
        return match ? (match[1] || match[0]) : null;

      default:
        return value;
    }
  }
}

// Export for use in content script
window.GenericExtractor = GenericExtractor;
```

---

## API Endpoints (New Routes)

Following existing pattern in `server/routes/`:

```javascript
// server/routes/captureSources.js
// GET    /api/capture-sources          - List all sources for user
// POST   /api/capture-sources          - Create new source
// PUT    /api/capture-sources/:id      - Update source
// DELETE /api/capture-sources/:id      - Delete source
// GET    /api/capture-sources/active   - List active sources (for extension)

// server/routes/capturedItems.js
// GET    /api/captured-items           - List captured items (with filters)
// POST   /api/captured-items           - Create captured item (from extension)
// POST   /api/captured-items/:id/map   - Map item to entity
// DELETE /api/captured-items/:id       - Delete captured item
```

---

## Integration Architecture

### Extension Rule Fetching
```
Extension                    Backend
    │                           │
    ├─ GET /capture-sources/active ──┼── CaptureSourceService.listActive()
    │                           │
    │   [Cache rules in         │
    │    chrome.storage.local   │
    │    with 1hr TTL]          │
    │                           │
```

### Data Capture Flow
```
Extension                    Backend                      Frontend
    │                           │                            │
    │   [User visits Grafana]   │                            │
    │                           │                            │
    │   [GenericExtractor runs] │                            │
    │                           │                            │
    ├─ POST /captured-items ────┼── CapturedItemService.create()
    │                           │                            │
    │                           │                 [Inbox shows new items]
    │                           │                            │
    │                           ├── User clicks "Map to Task"
    │                           │                            │
    │                           ├── POST /captured-items/:id/map
    │                           │                            │
```

---

## Version Summary

| Component | Current | Required Action |
|-----------|---------|----------------|
| PostgreSQL | pg 8.11.3 | No change - add migrations only |
| Express | 4.18.2 | No change - add routes only |
| React | 18.2.0 | No change |
| react-hook-form | 7.60.0 | No change (useFieldArray available) |
| Zod | 3.25.76 | No change |
| @hookform/resolvers | 4.1.3 | No change |
| Chrome Extension MV3 | 3 | Refactor extractors (no new deps) |

---

## Installation

**No new npm packages required.** All additions are:
1. New database migrations (SQL files)
2. New service classes (following existing patterns)
3. New routes (following existing patterns)
4. New React components (using existing UI components)
5. Extension refactoring (pure JavaScript)

```bash
# No npm install needed!
# Just run migrations after adding new SQL files
npm run migrate
```

---

## Confidence Assessment

| Area | Confidence | Reason |
|------|------------|--------|
| Database schema | HIGH | JSONB pattern proven in existing codebase (jira_issues) |
| Validation | HIGH | Zod already integrated and working |
| Frontend | HIGH | All components already available (verified react-hook-form 7.60.0) |
| Extension | HIGH | Current patterns directly applicable |
| No new deps | HIGH | Verified all needed features exist in current stack |

**Overall Confidence: HIGH**

All recommendations verified against existing codebase at `/Users/i306072/Documents/GitHub/P-E`.

---

## Sources

- Existing codebase analysis:
  - `extension/manifest.json` - MV3 patterns
  - `extension/content/extractors/detail.js` - Current extraction pattern
  - `server/services/JiraService.js` - Service layer pattern
  - `server/db/017_jira_integration.sql` - JSONB and schema patterns
  - `src/components/ui/form.jsx` - react-hook-form integration
  - `package.json` - Current versions verified

- npm registry (version checks):
  - react-hook-form: 7.60.0 installed (7.71.1 latest)
  - zod: 3.25.76 installed (4.3.5 latest)
  - pg: 8.11.3 installed

---

## Key Decisions Summary

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Rule storage | PostgreSQL JSONB | Already have PG, JSONB handles nested structure |
| Rule validation | Zod | Already in use, works frontend + backend |
| Rule builder UI | react-hook-form useFieldArray | Already installed, perfect for dynamic fields |
| Data staging | PostgreSQL table | Simpler than message queue at this scale |
| Extension rules | Generic extractor class | Pure JS, replaces hardcoded extractors |
| New dependencies | None | Existing stack sufficient |
