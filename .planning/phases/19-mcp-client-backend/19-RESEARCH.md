# Phase 19: MCP Client Backend - Research

**Researched:** 2026-01-29
**Domain:** MCP Protocol Client Implementation (HTTP/SSE, JSON-RPC 2.0)
**Confidence:** HIGH

## Summary

This phase implements a backend service that acts as an MCP (Model Context Protocol) client, communicating with an external MCP server to provide semantic search and insight storage capabilities. The MCP protocol uses JSON-RPC 2.0 over HTTP with optional SSE streaming, following the Streamable HTTP transport specification (protocol revision 2025-06-18).

The implementation follows the established service pattern in this codebase (see GitHubService, JiraService). The MCP server is already deployed at `https://knowledge-base-mcp-server.cfapps.eu01-canary.hana.ondemand.com` and provides 4 tools: `consult_code_base`, `consult_documentation`, `store_insight`, and `get_repository_stats`. Session management uses the `Mcp-Session-Id` header with 30-minute timeout and automatic reconnection on 404 responses.

**Primary recommendation:** Build a singleton MCPService class that manages session lifecycle, implements JSON-RPC 2.0 tool calls via HTTP POST, handles session expiry with automatic re-initialization, and exposes tool-specific methods consumed by REST routes.

## Standard Stack

The established libraries/tools for this domain:

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| node-fetch (native) | Node 18+ | HTTP client | Built into Node.js, no external dependency needed |
| eventsource | 3.x | SSE client (if needed) | Standard polyfill for Node.js SSE, handles reconnection |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| uuid | 9.x | Generate request IDs | Already in project for JSON-RPC request IDs |
| zod | 3.x | Response validation | Already in project, optional for strict typing |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Native fetch | axios | Axios adds dependency, fetch is sufficient for simple POST/GET |
| eventsource | EventSource polyfill | eventsource package is more mature for Node.js |
| Custom JSON-RPC | jayson | Adds dependency, protocol is simple enough to implement |

**Installation:**
```bash
# eventsource only if SSE streaming needed
npm install eventsource
```

**Note:** For MVP, HTTP POST without SSE streaming is sufficient per REQUIREMENTS.md: "Real-time SSE streaming | HTTP POST sufficient for MVP"

## Architecture Patterns

### Recommended Project Structure
```
server/
├── services/
│   └── MCPService.js           # MCP client with session management
├── routes/
│   └── knowledge.js            # REST API exposing MCP tools
└── db/
    └── migrations/
        └── XXX_add_mcp_sessions.sql  # Optional: persist session state
```

### Pattern 1: Singleton MCP Client Service
**What:** Single service class managing MCP session lifecycle and tool calls
**When to use:** Always for this phase - matches existing GitHubService pattern
**Example:**
```javascript
// Source: Codebase pattern from GitHubService.js
class MCPService {
  constructor() {
    this.baseUrl = process.env.MCP_SERVER_URL ||
      'https://knowledge-base-mcp-server.cfapps.eu01-canary.hana.ondemand.com';
    this.session = null;  // { sessionId, initializedAt }
    this.requestId = 0;
  }

  async _ensureSession() {
    if (!this.session) {
      await this._initialize();
    }
    return this.session.sessionId;
  }

  async _initialize() {
    const response = await fetch(`${this.baseUrl}/mcp`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json, text/event-stream'
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: ++this.requestId,
        method: 'initialize',
        params: {
          protocolVersion: '2025-03-26',
          capabilities: {},
          clientInfo: { name: 'pe-manager', version: '1.5.0' }
        }
      })
    });

    if (!response.ok) {
      throw new Error(`MCP initialize failed: ${response.status}`);
    }

    const sessionId = response.headers.get('Mcp-Session-Id');
    const result = await response.json();

    // Send initialized notification
    await fetch(`${this.baseUrl}/mcp`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Mcp-Session-Id': sessionId
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'notifications/initialized'
      })
    });

    this.session = { sessionId, initializedAt: Date.now() };
    return sessionId;
  }
}
```

### Pattern 2: Tool Call with Session Recovery
**What:** Automatic session re-initialization on 404 (session expired)
**When to use:** All tool calls must handle session expiry
**Example:**
```javascript
// Source: MCP Spec - Session Management
async _callTool(toolName, args, retryOnSessionExpiry = true) {
  const sessionId = await this._ensureSession();

  const response = await fetch(`${this.baseUrl}/mcp`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json, text/event-stream',
      'Mcp-Session-Id': sessionId,
      'MCP-Protocol-Version': '2025-03-26'
    },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: ++this.requestId,
      method: 'tools/call',
      params: { name: toolName, arguments: args }
    })
  });

  // Session expired - re-initialize and retry once
  if (response.status === 404 && retryOnSessionExpiry) {
    console.log('MCP session expired, re-initializing...');
    this.session = null;
    return this._callTool(toolName, args, false);
  }

  if (!response.ok) {
    throw new Error(`MCP tool call failed: ${response.status}`);
  }

  const result = await response.json();

  if (result.error) {
    throw new Error(result.error.message || 'MCP tool error');
  }

  return result.result;
}
```

### Pattern 3: REST Route Pattern (per existing codebase)
**What:** Thin route handlers delegating to service
**When to use:** All knowledge API endpoints
**Example:**
```javascript
// Source: Codebase pattern from github.js routes
import express from 'express';
import MCPService from '../services/MCPService.js';
import { authMiddleware } from '../middleware/auth.js';

const router = express.Router();
router.use(authMiddleware);

// Search code
router.post('/search/code', async (req, res) => {
  try {
    const { query, limit = 10, threshold, repoName, language, artifactType } = req.body;

    if (!query) {
      return res.status(400).json({ error: 'Query is required' });
    }

    const results = await MCPService.searchCode({
      query, limit, threshold, repoName, language, artifactType
    });
    res.json(results);
  } catch (error) {
    console.error('POST /api/knowledge/search/code error:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
```

### Anti-Patterns to Avoid
- **Creating new sessions per request:** Session initialization is expensive; reuse session across requests
- **Ignoring 404 response:** 404 means session expired, must re-initialize
- **Hardcoding session timeout:** Use 404 detection rather than client-side timeout guessing
- **Blocking on SSE:** For MVP, use HTTP POST response mode, not SSE streaming

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| JSON-RPC message format | Custom format builder | Simple object literal | Protocol is well-defined, no abstraction needed |
| Session storage | Database table | In-memory singleton | Session is server-scoped, not user-scoped |
| HTTP client wrapper | Custom retry logic | Native fetch + 404 handling | Protocol specifies exact recovery behavior |
| Request ID generation | Custom counter | Simple incrementing integer | JSON-RPC only needs unique IDs within connection |

**Key insight:** The MCP protocol is well-specified with clear error codes. Follow the spec exactly rather than over-engineering abstractions.

## Common Pitfalls

### Pitfall 1: Session Per User
**What goes wrong:** Creating separate MCP sessions for each API user
**Why it happens:** Assuming MCP session maps to user authentication
**How to avoid:** MCP session is server-to-server; share one session across all API requests
**Warning signs:** High latency from repeated initialization, session limit errors

### Pitfall 2: Not Handling 404 for Session Expiry
**What goes wrong:** Returning error to frontend instead of re-initializing
**Why it happens:** Treating 404 as "not found" rather than "session expired"
**How to avoid:** Check for 404 status, clear session, retry once
**Warning signs:** Intermittent errors after 30 minutes of inactivity

### Pitfall 3: Incorrect Accept Header
**What goes wrong:** Server returns error or unexpected format
**Why it happens:** Missing `text/event-stream` in Accept header
**How to avoid:** Always include both `application/json` and `text/event-stream`
**Warning signs:** Response parsing errors, unexpected content type

### Pitfall 4: Missing initialized Notification
**What goes wrong:** Server rejects subsequent requests
**Why it happens:** Skipping the `notifications/initialized` message after initialize
**How to avoid:** Always send initialized notification after successful initialize response
**Warning signs:** First tool call after initialization fails

### Pitfall 5: Parsing Tool Results
**What goes wrong:** Expecting direct JSON, getting content array with text
**Why it happens:** MCP tools return `{ content: [{ type: 'text', text: '...' }] }`
**How to avoid:** Parse the text field as JSON, handle multiple content items
**Warning signs:** Results appear as stringified JSON

## Code Examples

Verified patterns from official sources:

### MCP Initialize Request
```javascript
// Source: https://modelcontextprotocol.io/specification/2025-03-26/basic/lifecycle
const initRequest = {
  jsonrpc: '2.0',
  id: 1,
  method: 'initialize',
  params: {
    protocolVersion: '2025-03-26',
    capabilities: {},
    clientInfo: {
      name: 'pe-manager',
      version: '1.5.0'
    }
  }
};
```

### MCP Tool Call Request
```javascript
// Source: https://modelcontextprotocol.io/specification/2025-03-26/server/tools
const toolCallRequest = {
  jsonrpc: '2.0',
  id: 2,
  method: 'tools/call',
  params: {
    name: 'consult_code_base',
    arguments: {
      query: 'authentication middleware',
      limit: 10,
      threshold: 0.7
    }
  }
};
```

### Parsing Tool Response
```javascript
// Source: MCP Spec - Tool Result format
function parseToolResult(response) {
  if (response.error) {
    throw new Error(response.error.message);
  }

  const { content, isError } = response.result;

  if (isError) {
    const errorText = content.find(c => c.type === 'text')?.text || 'Unknown error';
    throw new Error(errorText);
  }

  // Content is array of { type, text/data }
  const textContent = content.find(c => c.type === 'text');
  if (textContent) {
    // Tool results are JSON stringified in text field
    return JSON.parse(textContent.text);
  }

  return content;
}
```

### Complete MCPService Implementation Skeleton
```javascript
// Source: Combining MCP spec with codebase patterns
class MCPService {
  constructor() {
    this.baseUrl = process.env.MCP_SERVER_URL ||
      'https://knowledge-base-mcp-server.cfapps.eu01-canary.hana.ondemand.com';
    this.session = null;
    this.requestId = 0;
  }

  // Session management
  async _ensureSession() { /* ... */ }
  async _initialize() { /* ... */ }
  async _callTool(name, args, retry = true) { /* ... */ }

  // Public tool methods
  async searchCode(options) {
    const result = await this._callTool('consult_code_base', {
      query: options.query,
      limit: options.limit || 10,
      threshold: options.threshold,
      repoName: options.repoName,
      language: options.language,
      artifactType: options.artifactType,
      ownership: options.ownership
    });
    return this._parseToolResult(result);
  }

  async searchDocs(options) {
    const result = await this._callTool('consult_documentation', {
      query: options.query,
      limit: options.limit || 10,
      threshold: options.threshold,
      domain: options.domain,
      category: options.category
    });
    return this._parseToolResult(result);
  }

  async storeInsight(options) {
    const result = await this._callTool('store_insight', {
      insight: options.insight,
      category: options.category,
      tags: options.tags,
      relatedFiles: options.relatedFiles
    });
    return this._parseToolResult(result);
  }

  async getStats(options = {}) {
    const result = await this._callTool('get_repository_stats', {
      repoName: options.repoName,
      statsType: options.statsType || 'overall'
    });
    return this._parseToolResult(result);
  }

  _parseToolResult(result) {
    const { content, isError } = result;
    if (isError) {
      const errorText = content?.find(c => c.type === 'text')?.text || 'Tool error';
      throw new Error(errorText);
    }
    const textContent = content?.find(c => c.type === 'text');
    if (textContent?.text) {
      try {
        return JSON.parse(textContent.text);
      } catch {
        return textContent.text;
      }
    }
    return content;
  }
}

export default new MCPService();
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| HTTP+SSE (2024-11-05) | Streamable HTTP (2025-06-18) | June 2025 | New protocol unifies POST/GET on single endpoint |
| Separate SSE endpoint | Single MCP endpoint | June 2025 | Simpler implementation, backwards compatible |
| Client-side session timeout | Server 404 for expired session | MCP spec | No guessing, react to actual server state |

**Deprecated/outdated:**
- HTTP+SSE transport (protocol version 2024-11-05): Replaced by Streamable HTTP in protocol revision 2025-06-18. The new approach uses a single endpoint for both POST and GET.

## Open Questions

Things that couldn't be fully resolved:

1. **Exact session timeout on target server**
   - What we know: Spec mentions 30 minutes, PROJECT.md confirms 30 minute timeout
   - What's unclear: Server may have different configuration
   - Recommendation: Rely on 404 detection rather than client-side timeout

2. **SSE streaming necessity**
   - What we know: MVP explicitly marks SSE as out of scope
   - What's unclear: If long-running queries need SSE for progress
   - Recommendation: Start with HTTP POST, add SSE if needed later

3. **Health check endpoint**
   - What we know: PROJECT.md mentions GET /health returns 200 OK
   - What's unclear: If this should be used for connection health monitoring
   - Recommendation: Use /health for initial connectivity check, not session health

## Sources

### Primary (HIGH confidence)
- https://modelcontextprotocol.io/docs/concepts/transports - Streamable HTTP transport specification
- https://modelcontextprotocol.io/specification/2025-03-26/basic/lifecycle - MCP lifecycle and initialization
- https://modelcontextprotocol.io/specification/2025-03-26/server/tools - Tool call format and responses
- GitHubService.js - Existing codebase pattern for external API integration
- github.js routes - Existing codebase pattern for REST API routes

### Secondary (MEDIUM confidence)
- https://github.com/modelcontextprotocol/typescript-sdk - SDK structure and patterns (v2 pre-alpha)
- MDN EventSource API - SSE client behavior and reconnection

### Tertiary (LOW confidence)
- npm eventsource package - Assumed current for Node.js SSE (npm fetch blocked)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Using native fetch and existing codebase patterns
- Architecture: HIGH - MCP spec is comprehensive, codebase patterns are proven
- Pitfalls: MEDIUM - Based on spec analysis, not real-world implementation experience

**Research date:** 2026-01-29
**Valid until:** 2026-02-28 (30 days - protocol is stable)
