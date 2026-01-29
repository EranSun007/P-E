# Phase 21: AI Chat Integration - Research

**Researched:** 2026-01-29
**Domain:** AI chat enhancement with knowledge base RAG (Retrieval-Augmented Generation)
**Confidence:** HIGH

## Summary

Phase 21 enhances the existing AI chat feature by integrating it with the MCP knowledge base (Phase 19) to provide retrieval-augmented generation (RAG) capabilities. The project already has a complete AI chat infrastructure with streaming support, context management, and tool execution. The enhancement adds automatic knowledge base querying when user questions suggest code/documentation needs, plus a /search command for explicit queries, and inline display of code snippets with syntax highlighting.

The standard approach is RAG context injection: detect when user queries need code/documentation context, query the knowledge base via existing MCP API endpoints, inject results into the AI prompt context, and display search results inline in the chat UI. This follows established patterns for AI-assisted development tools like GitHub Copilot Chat and Cursor.

**Primary recommendation:** Use command detection in ChatInput, query MCP endpoints in AIContext, inject results as system messages in the AI prompt, and render code snippets using the existing react-syntax-highlighter infrastructure from Phase 20.

## Standard Stack

The project already has all required infrastructure. No new libraries needed.

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| react-syntax-highlighter | 16.1.0 | Code syntax highlighting | Already installed for Phase 20, light build pattern established |
| @radix-ui/react-collapsible | 1.1.3 | Expandable code blocks | Already installed, follows existing UI component patterns |
| lucide-react | 0.475.0 | Icons for search results | Already installed, used throughout app |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Built-in fetch | Native | HTTP requests to MCP API | Already used in apiClient.js |
| AIContext | Custom | Chat state management | Already exists at src/contexts/AIContext.jsx |
| MCPService | Custom | Knowledge base queries | Already exists at server/services/MCPService.js |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Command detection | AI-powered intent classification | Overkill - regex patterns sufficient for /search command |
| Inline rendering | Link to separate search page | Poor UX - user loses chat context |
| Markdown parser | react-markdown | Not needed - plain text + code blocks sufficient |

**Installation:**
```bash
# No new installations required
# All dependencies already present from previous phases
```

## Architecture Patterns

### Recommended Project Structure
```
src/
├── components/ai/
│   ├── AIChatPanel.jsx          # Existing - add search result rendering
│   ├── ChatMessage.jsx           # Existing - add code block rendering
│   ├── ChatInput.jsx             # Existing - add command detection
│   ├── SearchResultBlock.jsx    # NEW - inline search result display
│   └── ExpandableCodeBlock.jsx  # NEW - collapsible code snippets
├── contexts/
│   └── AIContext.jsx             # Existing - add knowledge base query functions
└── api/
    └── aiClient.js               # Existing - already has knowledge endpoints
```

### Pattern 1: Command Detection in Input
**What:** Intercept /search commands before sending to AI
**When to use:** User explicitly types /search [query]
**Example:**
```javascript
// In ChatInput.jsx handleSubmit
const handleSubmit = (e) => {
  e?.preventDefault();
  const trimmed = value.trim();

  // Detect /search command
  if (trimmed.startsWith('/search ')) {
    const query = trimmed.slice(8).trim();
    if (query) {
      onSearchCommand(query); // New prop - handled in AIContext
    }
    setValue('');
    return;
  }

  // Normal message flow
  if (trimmed && !disabled && !isLoading) {
    onSend(trimmed);
    setValue('');
  }
};
```

### Pattern 2: Automatic Context Detection
**What:** AI backend detects code/documentation questions and queries knowledge base
**When to use:** User asks code-related questions without explicit command
**Example:**
```javascript
// In server/services/AIChatService.js (backend)
async function chatWithKnowledgeContext(messages, history, pageContext) {
  const lastMessage = messages[messages.length - 1].content;

  // Detect code/documentation questions (simple heuristics)
  const needsCodeContext = /\b(how (do|to)|implement|code|function|class|API)\b/i.test(lastMessage);

  if (needsCodeContext) {
    // Query knowledge base
    const codeResults = await MCPService.searchCode({
      query: lastMessage,
      limit: 3,
      threshold: 0.6
    });

    // Inject as system context
    const enrichedMessages = [
      {
        role: 'system',
        content: `Relevant code from knowledge base:\n${formatCodeContext(codeResults)}`
      },
      ...history,
      ...messages
    ];

    return AIChatService.chat(enrichedMessages);
  }

  return AIChatService.chat([...history, ...messages]);
}
```

### Pattern 3: Inline Search Result Rendering
**What:** Display search results as special message types in chat
**When to use:** After /search command or automatic query
**Example:**
```jsx
// In ChatMessage.jsx
export function ChatMessage({ message, isStreaming, isProductMode }) {
  // Handle special message types
  if (message.type === 'search_result') {
    return (
      <SearchResultBlock
        query={message.query}
        codeResults={message.codeResults}
        docsResults={message.docsResults}
        isProductMode={isProductMode}
      />
    );
  }

  // Regular message rendering...
}
```

### Pattern 4: RAG Context Injection
**What:** Inject knowledge base results as system context before AI generation
**When to use:** Always when knowledge base queries return results
**Example:**
```javascript
// Backend - format knowledge base results for AI context
function formatCodeContext(codeResults) {
  return codeResults.map((result, idx) =>
    `[${idx + 1}] ${result.filePath}:\n\`\`\`${result.language}\n${result.code}\n\`\`\``
  ).join('\n\n');
}

// Inject into prompt
const systemMessage = {
  role: 'system',
  content: `You are an AI assistant with access to this codebase.
Use the following code snippets to inform your response:\n\n${formatCodeContext(results)}`
};
```

### Anti-Patterns to Avoid
- **Querying knowledge base for every message:** Expensive and slow - use detection heuristics
- **Displaying full search results in AI response:** Clutters chat - show results separately inline
- **Blocking chat input during search:** Poor UX - allow concurrent queries with loading indicators
- **Not caching knowledge base session:** MCP requires session management - reuse sessions

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Markdown/code rendering | Custom parser | react-syntax-highlighter (already installed) | Supports all languages, proper escaping, theme support |
| Collapsible UI | Custom accordion | @radix-ui/react-collapsible (already installed) | Accessibility built-in, keyboard navigation, proper ARIA |
| Command parsing | Regex in multiple places | Centralized command detector utility | Single source of truth, easier to extend with more commands |
| Session management | Custom session storage | Existing MCPService session handling | Already handles 404 retry, session expiry, re-initialization |
| Syntax highlighting language detection | Manual file extension mapping | Existing LanguageDetector.js from Phase 20 | Already handles server language + extension fallback |

**Key insight:** Phase 19 and Phase 20 provide all the backend infrastructure (MCP API) and frontend components (syntax highlighting, language detection). Phase 21 is primarily integration work - connecting existing pieces with smart orchestration logic.

## Common Pitfalls

### Pitfall 1: Knowledge Base Query Performance
**What goes wrong:** Querying knowledge base on every message causes 2-5 second delays
**Why it happens:** MCP semantic search requires vector similarity computation
**How to avoid:** Only query when message content suggests need (heuristics: mentions code, how-to, implementation questions)
**Warning signs:** Chat feels sluggish, users complain about delays, backend timeout errors

### Pitfall 2: Context Window Overflow
**What goes wrong:** Injecting too many code snippets exceeds AI model's context limit
**Why it happens:** Large code files or many results quickly fill token budget
**How to avoid:**
- Limit results to 3-5 most relevant snippets
- Truncate code to relevant sections (MCP already does this)
- Monitor total token count before sending to AI
**Warning signs:** AI responses get truncated, "context too long" errors, degraded response quality

### Pitfall 3: Mixing Search UI with Chat UI
**What goes wrong:** Search results look cluttered or don't match chat aesthetics
**Why it happens:** Copying KnowledgeSearch.jsx dual-pane layout into narrow chat panel
**How to avoid:**
- Use compact card layout (not full CodeResultCard)
- Show 1-2 results initially, "Show more" button
- Collapsible code blocks (collapsed by default)
- Match chat panel's dark/light mode theming
**Warning signs:** Horizontal scrolling in chat, results overlap, users can't see conversation

### Pitfall 4: Command Detection False Positives
**What goes wrong:** Regular messages starting with "/" get misinterpreted as commands
**Why it happens:** Simple prefix matching without whitelist
**How to avoid:**
- Whitelist known commands (/search, future: /summarize, /explain)
- Require space after command: `/search query` not `/searchquery`
- Show error for unknown commands
- Allow escaping: `\/search` to send literal text
**Warning signs:** Users complain messages disappear, support tickets about broken chat

### Pitfall 5: Session Expiry During Long Chats
**What goes wrong:** Knowledge base queries fail mid-conversation with 404 errors
**Why it happens:** MCP server expires sessions after inactivity (typically 30 minutes)
**How to avoid:** MCPService already handles this with automatic re-initialization on 404
**Warning signs:** "Session not found" errors in backend logs, intermittent search failures

## Code Examples

Verified patterns from official sources and project codebase:

### Command Detection with Whitelist
```javascript
// src/components/ai/ChatInput.jsx
const KNOWN_COMMANDS = {
  '/search': true,
  '/help': true,
};

const parseCommand = (text) => {
  const match = text.match(/^(\/\w+)\s+(.*)$/);
  if (!match) return null;

  const [, command, args] = match;
  if (!KNOWN_COMMANDS[command]) {
    return { error: `Unknown command: ${command}` };
  }

  return { command, args: args.trim() };
};
```

### Knowledge Base Query in AIContext
```javascript
// src/contexts/AIContext.jsx
const searchKnowledgeBase = useCallback(async (query) => {
  setIsLoading(true);

  // Add user message for /search command
  const searchMessage = {
    role: 'user',
    content: `/search ${query}`,
    type: 'command'
  };
  setMessages(prev => [...prev, searchMessage]);

  try {
    // Query knowledge base
    const [codeResults, docsResults] = await Promise.all([
      apiClient.knowledge.searchCode({ query, limit: 3, threshold: 0.6 }),
      apiClient.knowledge.searchDocs({ query, limit: 3, threshold: 0.6 })
    ]);

    // Add search result message
    const resultMessage = {
      role: 'assistant',
      type: 'search_result',
      query,
      codeResults: codeResults.results || [],
      docsResults: docsResults.results || []
    };
    setMessages(prev => [...prev, resultMessage]);

  } catch (err) {
    console.error('Knowledge base search failed:', err);
    setError(err.message);
  } finally {
    setIsLoading(false);
  }
}, []);
```

### Expandable Code Block Component
```jsx
// src/components/ai/ExpandableCodeBlock.jsx
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Light as SyntaxHighlighter } from 'react-syntax-highlighter';
import { docco } from 'react-syntax-highlighter/dist/esm/styles/hljs';
import { ChevronDown, ChevronRight, Copy } from 'lucide-react';
import { useState } from 'react';

export function ExpandableCodeBlock({ code, language, filePath, defaultOpen = false }) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <div className="border rounded-lg overflow-hidden">
        <CollapsibleTrigger className="w-full">
          <div className="flex items-center justify-between p-2 bg-muted/30 hover:bg-muted/50">
            <div className="flex items-center gap-2">
              {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
              <code className="text-xs">{filePath}</code>
              <span className="text-xs text-muted-foreground">{language}</span>
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleCopy();
              }}
              className="p-1 hover:bg-background rounded"
            >
              <Copy className="h-3 w-3" />
            </button>
          </div>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <SyntaxHighlighter
            language={language}
            style={docco}
            showLineNumbers={true}
            customStyle={{
              margin: 0,
              fontSize: '0.7rem',
              maxHeight: '200px',
              overflow: 'auto'
            }}
          >
            {code}
          </SyntaxHighlighter>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}
```

### Backend Automatic Context Detection
```javascript
// server/services/AIChatService.js - NEW method
async function detectCodeQuestion(message) {
  // Simple heuristics - can be enhanced with AI classification later
  const codeKeywords = [
    /how (do|does|to|can) (i|we|you)/i,
    /implement(ing|ation)?/i,
    /write|create|build|make|develop/i,
    /code|function|class|method|component/i,
    /API|endpoint|route|handler/i,
    /error|bug|issue|problem|fix/i,
    /\b(js|jsx|ts|tsx|python|java|go|rust)\b/i
  ];

  return codeKeywords.some(regex => regex.test(message));
}

// Enhanced chat method
async chatWithKnowledgeContext(messages, options = {}) {
  const lastUserMessage = messages[messages.length - 1].content;

  // Check if message needs code context
  if (await this.detectCodeQuestion(lastUserMessage)) {
    try {
      // Query knowledge base
      const codeResults = await MCPService.searchCode({
        query: lastUserMessage,
        limit: 3,
        threshold: 0.6
      });

      // Only inject if we got good results
      if (codeResults.results && codeResults.results.length > 0) {
        const contextMessage = {
          role: 'system',
          content: this.formatKnowledgeContext(codeResults.results)
        };

        messages = [contextMessage, ...messages];
      }
    } catch (error) {
      console.error('Knowledge context injection failed:', error);
      // Continue without context rather than failing
    }
  }

  return this.chat(messages, options);
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Static AI responses | RAG with knowledge base | 2024-2025 | AI can reference actual codebase, fewer hallucinations |
| Separate search page | Inline search in chat | 2024-2025 | Better UX, maintain context |
| Manual /search commands only | Automatic context detection | 2025 | Seamless experience, AI proactively uses knowledge |
| Full-featured markdown | Code blocks only | Current best practice | Faster rendering, less complexity |

**Deprecated/outdated:**
- **Streaming search results:** Semantic search is not token-by-token, return all results at once
- **Separate knowledge base UI tab:** Modern tools integrate search into chat
- **AI-powered intent classification:** Overkill - regex heuristics work well and are instant

## Open Questions

Things that couldn't be fully resolved:

1. **Optimal result count for context injection**
   - What we know: More results = better context but larger token budget
   - What's unclear: Best balance between 2-5 results
   - Recommendation: Start with 3 results (limit: 3), monitor AI response quality and adjust

2. **When to show automatic vs. explicit search results**
   - What we know: Automatic queries happen silently, explicit /search shows results inline
   - What's unclear: Should automatic queries also show inline results?
   - Recommendation: Automatic = inject context only (silent), /search = show results inline. Test with users.

3. **Code snippet truncation strategy**
   - What we know: MCP server returns code snippets, but size varies
   - What's unclear: Truncate to fixed line count or by token budget?
   - Recommendation: Use MCP's existing truncation (already optimized), add maxHeight CSS for UI

4. **Multiple /search commands in single message**
   - What we know: Users might type "/search auth /search database"
   - What's unclear: Parse first only, or all commands?
   - Recommendation: Parse first command only, warn user about multiple commands

## Sources

### Primary (HIGH confidence)
- Project codebase at /Users/i306072/Documents/GitHub/P-E:
  - src/contexts/AIContext.jsx - existing AI chat infrastructure
  - src/components/ai/ - chat UI components with streaming support
  - server/services/MCPService.js - MCP protocol client with session management
  - server/routes/knowledge.js - REST API endpoints for knowledge base
  - src/api/apiClient.js - frontend API client with knowledge methods
  - .planning/phases/20-knowledge-search-ui/20-01-PLAN.md - syntax highlighting patterns
- package.json - react-syntax-highlighter 16.1.0, @radix-ui/react-collapsible 1.1.3 already installed

### Secondary (MEDIUM confidence)
- RAG architecture patterns: Industry standard approach (retrieval before generation)
- Command parsing patterns: Common in CLI-style chat interfaces (Slack, Discord)
- Semantic search integration: Standard in AI coding assistants (GitHub Copilot, Cursor)

### Tertiary (LOW confidence)
- Optimal result count (3-5): Based on common practice, needs validation for this use case
- Automatic detection heuristics: Simple regex approach may need refinement with user feedback

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - All libraries already installed, infrastructure exists
- Architecture: HIGH - Clear patterns from existing codebase and Phase 19/20 implementations
- Pitfalls: HIGH - Based on actual MCP session management code and known RAG challenges

**Research date:** 2026-01-29
**Valid until:** 2026-02-28 (30 days - stable patterns, existing infrastructure)
