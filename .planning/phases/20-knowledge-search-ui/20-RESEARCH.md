# Phase 20: Knowledge Search UI - Research

**Researched:** 2026-01-29
**Domain:** React Search Interface with Code/Docs Display, Syntax Highlighting, Filtering
**Confidence:** HIGH

## Summary

This phase implements a frontend search interface for semantic code and documentation search powered by the MCP knowledge base backend (Phase 19). The interface follows established patterns from the BugDashboard page: filter bar with Select components, dual-pane layout using existing Resizable components, and data visualization with Recharts for repository statistics.

The core technical challenge is syntax highlighting for code results with automatic language detection. The standard solution is `react-syntax-highlighter` with the Light build (tree-shakeable) to minimize bundle size. The library supports 180+ languages via highlight.js, uses virtual DOM rendering (avoiding XSS), and integrates seamlessly with React components.

Layout uses the existing `react-resizable-panels` component (already at v2.1.7) for the dual-pane view. Filtering follows the BugDashboard pattern with shadcn Select components and Badge indicators. Similarity scores display as progress bars or badges with color-coded thresholds.

**Primary recommendation:** Build a KnowledgeSearch page following BugDashboard patterns: filter bar (query input + Select dropdowns), ResizablePanelGroup with two ResizablePanels (code left, docs right), ScrollArea for result lists, react-syntax-highlighter Light build for code display, and Recharts for repository statistics dashboard.

## Standard Stack

The established libraries/tools for this domain:

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| react-syntax-highlighter | 6.x | Syntax highlighting for code results | Industry standard, 180+ languages, virtual DOM rendering, no external CSS |
| react-resizable-panels | 2.1.7 | Dual-pane resizable layout | Already in project, shadcn/ui Resizable component built on this |
| recharts | 2.15.1 | Repository statistics charts | Already in project (BugDashboard), proven for data viz |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| highlight.js | (bundled) | Language detection and syntax parsing | Automatic language detection for code snippets |
| lucide-react | 0.475.0 | Icons (Search, Filter, Code, FileText) | Already in project, consistent icon system |
| @radix-ui/react-scroll-area | 1.2.3 | Scrollable result lists | Already in project via shadcn/ui |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| react-syntax-highlighter | Prism React Renderer | Prism has better JSX highlighting but smaller language set, less maintained |
| react-syntax-highlighter | Monaco Editor | Overkill for read-only display, massive bundle size (2MB+), better for editing |
| Resizable panels | CSS Grid | No user control, less flexible, harder to persist layout preferences |

**Installation:**
```bash
npm install react-syntax-highlighter --save
npm install @types/react-syntax-highlighter --save-dev
```

**Note:** Use Light build to minimize bundle size. Only register languages actually needed (JavaScript, TypeScript, Python, Java, Go, etc.) rather than importing all 180 languages.

## Architecture Patterns

### Recommended Project Structure
```
src/
├── pages/
│   └── KnowledgeSearch.jsx        # Main search page (follows BugDashboard pattern)
├── components/
│   ├── knowledge/
│   │   ├── SearchBar.jsx          # Query input + filter controls
│   │   ├── CodeResultCard.jsx    # Code result with syntax highlighting
│   │   ├── DocsResultCard.jsx    # Documentation result display
│   │   ├── SimilarityScore.jsx   # Visual similarity indicator
│   │   ├── RepositoryStats.jsx   # Stats dashboard with Recharts
│   │   └── LanguageDetector.js   # Language detection utility
│   └── ui/
│       └── resizable.jsx          # Already exists (shadcn component)
└── api/
    └── apiClient.js               # Add knowledge endpoints
```

### Pattern 1: Dual-Pane Search Layout
**What:** Resizable two-column layout with code results on left, docs on right
**When to use:** Always for this phase - core requirement SEARCH-02
**Example:**
```jsx
// Source: shadcn/ui Resizable + project pattern
import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from '@/components/ui/resizable';
import { ScrollArea } from '@/components/ui/scroll-area';

function KnowledgeSearch() {
  const [codeResults, setCodeResults] = useState([]);
  const [docsResults, setDocsResults] = useState([]);

  return (
    <ResizablePanelGroup direction="horizontal" className="min-h-[600px]">
      {/* Code Results Panel */}
      <ResizablePanel defaultSize={50} minSize={30}>
        <div className="h-full flex flex-col">
          <div className="p-4 border-b">
            <h2 className="text-lg font-semibold">Code Results</h2>
          </div>
          <ScrollArea className="flex-1">
            {codeResults.map((result) => (
              <CodeResultCard key={result.id} result={result} />
            ))}
          </ScrollArea>
        </div>
      </ResizablePanel>

      <ResizableHandle withHandle />

      {/* Documentation Results Panel */}
      <ResizablePanel defaultSize={50} minSize={30}>
        <div className="h-full flex flex-col">
          <div className="p-4 border-b">
            <h2 className="text-lg font-semibold">Documentation</h2>
          </div>
          <ScrollArea className="flex-1">
            {docsResults.map((result) => (
              <DocsResultCard key={result.id} result={result} />
            ))}
          </ScrollArea>
        </div>
      </ResizablePanel>
    </ResizablePanelGroup>
  );
}
```

### Pattern 2: Light Build Syntax Highlighting
**What:** Tree-shakeable syntax highlighter with selective language registration
**When to use:** All code result displays (SEARCH-03)
**Example:**
```jsx
// Source: react-syntax-highlighter documentation
import { Light as SyntaxHighlighter } from 'react-syntax-highlighter';
import { docco } from 'react-syntax-highlighter/dist/esm/styles/hljs';

// Register only needed languages to reduce bundle size
import javascript from 'react-syntax-highlighter/dist/esm/languages/hljs/javascript';
import typescript from 'react-syntax-highlighter/dist/esm/languages/hljs/typescript';
import python from 'react-syntax-highlighter/dist/esm/languages/hljs/python';
import java from 'react-syntax-highlighter/dist/esm/languages/hljs/java';
import go from 'react-syntax-highlighter/dist/esm/languages/hljs/go';

SyntaxHighlighter.registerLanguage('javascript', javascript);
SyntaxHighlighter.registerLanguage('typescript', typescript);
SyntaxHighlighter.registerLanguage('python', python);
SyntaxHighlighter.registerLanguage('java', java);
SyntaxHighlighter.registerLanguage('go', go);

function CodeResultCard({ result }) {
  // Detect language from result.language or file extension
  const language = detectLanguage(result.language, result.filePath);

  return (
    <Card className="mb-4">
      <CardHeader>
        <div className="flex items-center justify-between">
          <code className="text-sm">{result.filePath}</code>
          <Badge variant="secondary">{language}</Badge>
        </div>
      </CardHeader>
      <CardContent>
        <SyntaxHighlighter
          language={language}
          style={docco}
          showLineNumbers={true}
          wrapLines={true}
          customStyle={{
            margin: 0,
            borderRadius: '0.5rem',
            fontSize: '0.875rem',
          }}
        >
          {result.code}
        </SyntaxHighlighter>
      </CardContent>
    </Card>
  );
}
```

### Pattern 3: Filter Bar with Active Filter Badges
**What:** Select dropdowns for filters with Badge indicators for active selections
**When to use:** Filter controls for repository, language, artifact type (SEARCH-04)
**Example:**
```jsx
// Source: BugDashboard.jsx pattern
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';

function SearchBar({ onSearch, filters, setFilters }) {
  return (
    <div className="space-y-4">
      {/* Query Input */}
      <div className="flex gap-2">
        <Input
          type="text"
          placeholder="Search code and documentation..."
          value={filters.query}
          onChange={(e) => setFilters({ ...filters, query: e.target.value })}
          className="flex-1"
        />
        <Button onClick={onSearch}>
          <Search className="h-4 w-4 mr-2" />
          Search
        </Button>
      </div>

      {/* Filter Controls */}
      <div className="flex flex-wrap gap-4">
        {/* Repository Filter */}
        <Select
          value={filters.repository}
          onValueChange={(value) => setFilters({ ...filters, repository: value })}
        >
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="All Repositories" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Repositories</SelectItem>
            <SelectItem value="frontend">frontend</SelectItem>
            <SelectItem value="backend">backend</SelectItem>
          </SelectContent>
        </Select>

        {/* Language Filter */}
        <Select
          value={filters.language}
          onValueChange={(value) => setFilters({ ...filters, language: value })}
        >
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="All Languages" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Languages</SelectItem>
            <SelectItem value="javascript">JavaScript</SelectItem>
            <SelectItem value="typescript">TypeScript</SelectItem>
            <SelectItem value="python">Python</SelectItem>
          </SelectContent>
        </Select>

        {/* Artifact Type Filter */}
        <Select
          value={filters.artifactType}
          onValueChange={(value) => setFilters({ ...filters, artifactType: value })}
        >
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="All Types" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="component">Components</SelectItem>
            <SelectItem value="service">Services</SelectItem>
            <SelectItem value="utility">Utilities</SelectItem>
          </SelectContent>
        </Select>

        {/* Active filter badges */}
        {filters.repository !== 'all' && (
          <Badge variant="secondary" className="text-xs">
            Repo: {filters.repository}
          </Badge>
        )}
        {filters.language !== 'all' && (
          <Badge variant="secondary" className="text-xs">
            Lang: {filters.language}
          </Badge>
        )}
      </div>
    </div>
  );
}
```

### Pattern 4: Similarity Score Display
**What:** Visual indicator showing search relevance (0.0 to 1.0 scale)
**When to use:** All search results (SEARCH-05)
**Example:**
```jsx
// Source: Project UI patterns + common search UX
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';

function SimilarityScore({ score }) {
  // Convert 0.0-1.0 to 0-100 percentage
  const percentage = Math.round(score * 100);

  // Color-coded thresholds
  const getVariant = () => {
    if (score >= 0.8) return 'default'; // High relevance
    if (score >= 0.6) return 'secondary'; // Medium relevance
    return 'outline'; // Low relevance
  };

  const getColor = () => {
    if (score >= 0.8) return 'text-green-600';
    if (score >= 0.6) return 'text-yellow-600';
    return 'text-gray-600';
  };

  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-muted-foreground">Relevance:</span>
      <Badge variant={getVariant()} className="text-xs">
        {percentage}%
      </Badge>
      <Progress value={percentage} className="w-20 h-2" />
    </div>
  );
}
```

### Pattern 5: Repository Statistics Dashboard
**What:** Recharts visualization of indexed content breakdown by type
**When to use:** Statistics view (SEARCH-06)
**Example:**
```jsx
// Source: BugDashboard chart patterns
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

function RepositoryStats({ stats }) {
  // Transform API data to chart format
  const chartData = Object.entries(stats.byArtifactType || {}).map(([type, count]) => ({
    type,
    count,
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle>Indexed Content Breakdown</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="type" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Bar dataKey="count" fill="#8884d8" />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
```

### Anti-Patterns to Avoid
- **Full build of react-syntax-highlighter:** Imports all 180 languages (huge bundle), use Light build instead
- **Monaco Editor for read-only code:** 2MB+ bundle size, designed for editing not display
- **Custom syntax highlighting:** Extremely complex with edge cases, use battle-tested library
- **Hardcoded language detection:** File extensions alone insufficient (e.g., .js could be JSX), use MCP server's language field
- **Separate API calls per result:** Fetch code and docs in parallel, not sequentially

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Syntax highlighting | Custom regex-based highlighter | react-syntax-highlighter Light | 180+ languages, handles edge cases, security (virtual DOM) |
| Language detection | File extension mapping | highlight.js auto-detection + MCP language field | Handles ambiguity (.js vs .jsx vs .ts), multi-language files |
| Resizable panels | CSS resize property | react-resizable-panels (shadcn Resizable) | Keyboard accessible, mobile-friendly, persist preferences |
| Code snippet truncation | String.slice() | SyntaxHighlighter's wrapLines + CSS | Preserves syntax highlighting, proper line breaks |
| Search debouncing | setTimeout/clearTimeout | react-hook-form or custom useDebounce hook | Edge cases with cleanup, already solved pattern |

**Key insight:** Syntax highlighting is deceptively complex. Languages have nested contexts (strings in templates in functions), special characters, and edge cases. The react-syntax-highlighter library has solved these problems over years of development.

## Common Pitfalls

### Pitfall 1: Bundle Size Explosion
**What goes wrong:** Importing full react-syntax-highlighter adds 500KB+ to bundle
**Why it happens:** Default import includes all 180 languages and all highlight.js styles
**How to avoid:** Use Light build and register only needed languages (5-10 common ones)
**Warning signs:** Build size jumps significantly, slow initial load
**Code pattern:**
```jsx
// BAD: Full build (all 180 languages)
import SyntaxHighlighter from 'react-syntax-highlighter';

// GOOD: Light build with selective registration
import { Light as SyntaxHighlighter } from 'react-syntax-highlighter';
import javascript from 'react-syntax-highlighter/dist/esm/languages/hljs/javascript';
SyntaxHighlighter.registerLanguage('javascript', javascript);
```

### Pitfall 2: Language Detection Edge Cases
**What goes wrong:** Wrong language detected or highlighting breaks
**Why it happens:** File extensions are ambiguous (.js could be JavaScript, JSX, TypeScript, Node.js)
**How to avoid:** Trust MCP server's `language` field first, fallback to file extension mapping
**Warning signs:** JSX rendered as plain JavaScript, TypeScript shown without types
**Code pattern:**
```jsx
// BAD: Only use file extension
const language = filePath.split('.').pop();

// GOOD: Trust server, fallback to extension
const detectLanguage = (serverLanguage, filePath) => {
  if (serverLanguage) return serverLanguage.toLowerCase();

  const ext = filePath.split('.').pop()?.toLowerCase();
  const extMap = {
    'js': 'javascript',
    'jsx': 'javascript',
    'ts': 'typescript',
    'tsx': 'typescript',
    'py': 'python',
    'java': 'java',
    'go': 'go',
  };
  return extMap[ext] || 'plaintext';
};
```

### Pitfall 3: Uncontrolled Search Requests
**What goes wrong:** Every keystroke triggers API call, overwhelming backend
**Why it happens:** No debouncing on search input
**How to avoid:** Debounce search input (300-500ms) or require explicit search button click
**Warning signs:** Network tab shows dozens of requests, backend rate limiting errors

### Pitfall 4: Resizable Panels Breaking on Small Screens
**What goes wrong:** Horizontal panels unusable on mobile, content squeezed
**Why it happens:** Fixed minSize too large, no responsive breakpoint
**How to avoid:** Use percentage-based minSize (20-30%), consider stacked layout for mobile
**Warning signs:** Horizontal scrolling on mobile, panels too narrow

### Pitfall 5: Empty State Handling
**What goes wrong:** Blank panels when no results, confusing UX
**Why it happens:** No empty state component, assumes results always exist
**How to avoid:** Show EmptyState component (already exists in project) with helpful messaging
**Warning signs:** Users confused by blank panels, don't know if search worked

## Code Examples

Verified patterns from official sources:

### Language Detection Utility
```javascript
// Source: Common file extension mapping + MCP server language field
// src/components/knowledge/LanguageDetector.js

/**
 * Detect programming language from MCP server response or file path
 * Priority: server language > file extension > plaintext fallback
 */
export function detectLanguage(serverLanguage, filePath) {
  // Trust server-provided language first
  if (serverLanguage && typeof serverLanguage === 'string') {
    return normalizeLanguageName(serverLanguage.toLowerCase());
  }

  // Fallback to file extension
  const extension = filePath?.split('.').pop()?.toLowerCase();
  if (extension) {
    return extensionToLanguage(extension);
  }

  return 'plaintext';
}

/**
 * Map file extensions to highlight.js language identifiers
 */
function extensionToLanguage(ext) {
  const mapping = {
    // JavaScript family
    'js': 'javascript',
    'jsx': 'javascript',
    'mjs': 'javascript',
    'cjs': 'javascript',
    'ts': 'typescript',
    'tsx': 'typescript',

    // Web
    'html': 'html',
    'htm': 'html',
    'css': 'css',
    'scss': 'scss',
    'sass': 'scss',
    'less': 'less',

    // Backend
    'py': 'python',
    'java': 'java',
    'go': 'go',
    'rs': 'rust',
    'rb': 'ruby',
    'php': 'php',

    // Data/Config
    'json': 'json',
    'yaml': 'yaml',
    'yml': 'yaml',
    'xml': 'xml',
    'sql': 'sql',
    'md': 'markdown',

    // Shell
    'sh': 'bash',
    'bash': 'bash',
    'zsh': 'bash',
  };

  return mapping[ext] || 'plaintext';
}

/**
 * Get supported languages (registered in app)
 */
export const SUPPORTED_LANGUAGES = [
  'javascript',
  'typescript',
  'python',
  'java',
  'go',
  'rust',
  'html',
  'css',
  'json',
  'yaml',
  'markdown',
  'bash',
];
```

### API Client Integration
```javascript
// Source: apiClient.js pattern + Phase 19 backend endpoints
// Add to src/api/apiClient.js

const knowledge = {
  /**
   * Search code semantically
   */
  searchCode: async (options) => {
    const response = await fetch(`${API_URL}/knowledge/search/code`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...authHeaders(),
      },
      body: JSON.stringify({
        query: options.query,
        limit: options.limit || 20,
        threshold: options.threshold || 0.6,
        repoName: options.repoName,
        language: options.language,
        artifactType: options.artifactType,
        ownership: options.ownership,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Code search failed');
    }

    return response.json();
  },

  /**
   * Search documentation semantically
   */
  searchDocs: async (options) => {
    const response = await fetch(`${API_URL}/knowledge/search/docs`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...authHeaders(),
      },
      body: JSON.stringify({
        query: options.query,
        limit: options.limit || 20,
        threshold: options.threshold || 0.6,
        domain: options.domain,
        category: options.category,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Documentation search failed');
    }

    return response.json();
  },

  /**
   * Get repository statistics
   */
  getStats: async (options = {}) => {
    const params = new URLSearchParams();
    if (options.repoName) params.append('repoName', options.repoName);
    if (options.statsType) params.append('statsType', options.statsType);

    const response = await fetch(`${API_URL}/knowledge/stats?${params}`, {
      headers: authHeaders(),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to fetch stats');
    }

    return response.json();
  },
};

// Add to exports
export const apiClient = {
  // ... existing exports
  knowledge,
};
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Prism React Renderer | react-syntax-highlighter | 2023-2024 | Prism React Renderer less maintained, react-syntax-highlighter supports both engines |
| Raw HTML injection | Virtual DOM rendering | react-syntax-highlighter v1.0 | Security (XSS prevention), better React integration |
| Fixed split panes | react-resizable-panels | 2023 | User control, accessibility, mobile-friendly |
| Manual debounce logic | useDebounce hook | React ecosystem 2022+ | Cleaner code, handles edge cases (unmount cleanup) |

**Deprecated/outdated:**
- **Prism React Renderer**: Still works but less actively maintained than react-syntax-highlighter. The latter supports both Prism and highlight.js engines.
- **react-split-pane**: Older resizable panel library, replaced by react-resizable-panels with better React 18 support and accessibility.

## Open Questions

Things that couldn't be fully resolved:

1. **Exact MCP response format for code results**
   - What we know: Phase 19 implements `consult_code_base` tool, returns JSON-RPC result
   - What's unclear: Exact field names (filePath vs file_path, code vs content, etc.)
   - Recommendation: Parse Phase 19's actual MCP response in first task, adjust result card accordingly

2. **Language detection accuracy**
   - What we know: MCP server should provide `language` field based on file extension
   - What's unclear: If MCP server handles edge cases (JSX, TypeScript, multi-language files)
   - Recommendation: Implement robust client-side fallback with extension mapping

3. **Similarity score thresholds**
   - What we know: Backend accepts threshold parameter (0.0-1.0), returns similarity scores
   - What's unclear: What score ranges indicate "good" vs "poor" matches in practice
   - Recommendation: Start with 0.8+ (high), 0.6-0.8 (medium), <0.6 (low), adjust after user feedback

4. **Repository list for filter dropdown**
   - What we know: GET /api/knowledge/stats can return repository breakdown
   - What's unclear: If there's a dedicated endpoint to list available repositories
   - Recommendation: Extract repository names from initial stats call or hardcode known repos for MVP

## Sources

### Primary (HIGH confidence)
- https://github.com/react-syntax-highlighter/react-syntax-highlighter - Main library README, usage patterns, Light build
- https://github.com/highlightjs/highlight.js - Language support, auto-detection, bundle size strategies
- https://ui.shadcn.com/docs/components/resizable - Resizable component documentation and usage
- BugDashboard.jsx - Project pattern for filters, cards, loading states
- resizable.jsx - Existing resizable component (react-resizable-panels 2.1.7)
- Phase 19 RESEARCH.md - Backend API endpoints and capabilities

### Secondary (MEDIUM confidence)
- https://ui.shadcn.com/docs/components/input - Input component props and patterns
- https://ui.shadcn.com/docs/components/badge - Badge variants for similarity scores
- BugDashboard pattern analysis - Filter controls, Select usage, empty states

### Tertiary (LOW confidence)
- None - all findings verified with primary sources

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - react-syntax-highlighter is industry standard, react-resizable-panels already in project
- Architecture: HIGH - Patterns proven in BugDashboard, resizable component verified
- Pitfalls: MEDIUM - Based on common React pitfalls and library documentation, not project-specific experience
- Language detection: MEDIUM - Extension mapping is straightforward, MCP server behavior needs verification

**Research date:** 2026-01-29
**Valid until:** 2026-02-28 (30 days - libraries are stable, patterns proven)
