# Requirements: P&E Manager v1.5

**Defined:** 2026-01-29
**Core Value:** Single dashboard showing health and status across all team tools without switching contexts

## v1.5 Requirements

Requirements for Knowledge Base Integration & Team Status milestone. Each maps to roadmap phases.

### MCP Client Integration

- [x] **MCP-01**: Backend MCP client service with session management (Mcp-Session-Id header handling)
- [x] **MCP-02**: JSON-RPC 2.0 protocol implementation for tool calls
- [x] **MCP-03**: Support for consult_code_base tool (semantic code search)
- [x] **MCP-04**: Support for consult_documentation tool (semantic doc search)
- [x] **MCP-05**: Support for store_insight tool (persist learnings)
- [x] **MCP-06**: Support for get_repository_stats tool (knowledge base analytics)
- [x] **MCP-07**: Error handling and session recovery (timeout, reconnect)
- [x] **MCP-08**: REST API endpoints exposing MCP tools to frontend

### Knowledge Search UI

- [ ] **SEARCH-01**: Search page with query input and results display
- [ ] **SEARCH-02**: Dual-pane view showing code results and documentation side by side
- [ ] **SEARCH-03**: Syntax highlighting for code results
- [ ] **SEARCH-04**: Filter by repository, language, and artifact type
- [ ] **SEARCH-05**: Similarity score display on results
- [ ] **SEARCH-06**: Repository statistics dashboard showing indexed content breakdown

### AI Chat Integration

- [ ] **CHAT-01**: AI chat automatically queries relevant code/docs based on conversation context
- [ ] **CHAT-02**: Explicit /search command in chat to query knowledge base
- [ ] **CHAT-03**: Search results displayed inline in chat with expandable code snippets
- [ ] **CHAT-04**: AI responses enriched with knowledge base context when relevant

### Team Status Page

- [ ] **TEAM-01**: Team Status page accessible from navigation
- [ ] **TEAM-02**: Reporting team view (Metering team scaffold for future)
- [ ] **TEAM-03**: Daily summaries retrieved from MCP store_insight data
- [ ] **TEAM-04**: Dashboard cards showing progress metrics (completed items, blockers, velocity)
- [ ] **TEAM-05**: Interactive timeline view of daily summary history
- [ ] **TEAM-06**: Health indicators (red/yellow/green) per team member or workstream
- [ ] **TEAM-07**: Filtering by date range

## Future Requirements

Deferred to v1.6 or later. Tracked but not in current roadmap.

### Multi-Team Support

- **TEAM-F01**: Metering team status view (when dailies data available)
- **TEAM-F02**: Cross-team comparison dashboard
- **TEAM-F03**: Team member expertise mapping from knowledge base

### Advanced Search

- **SEARCH-F01**: Search history and saved queries
- **SEARCH-F02**: Code snippet bookmarking
- **SEARCH-F03**: Share search results via URL

### AI Enhancements

- **CHAT-F01**: Proactive suggestions based on knowledge base patterns
- **CHAT-F02**: Code generation using knowledge base examples

## Out of Scope

Explicitly excluded. Documented to prevent scope creep.

| Feature | Reason |
|---------|--------|
| Custom MCP server deployment | Using existing deployed server |
| Direct database access to knowledge base | MCP protocol only |
| Real-time SSE streaming | HTTP POST sufficient for MVP |
| Write-back to repositories | Read-only analytics |
| Custom embedding model | Using deployed server's embeddings |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| MCP-01 | Phase 19 | Complete |
| MCP-02 | Phase 19 | Complete |
| MCP-03 | Phase 19 | Complete |
| MCP-04 | Phase 19 | Complete |
| MCP-05 | Phase 19 | Complete |
| MCP-06 | Phase 19 | Complete |
| MCP-07 | Phase 19 | Complete |
| MCP-08 | Phase 19 | Complete |
| SEARCH-01 | Phase 20 | Pending |
| SEARCH-02 | Phase 20 | Pending |
| SEARCH-03 | Phase 20 | Pending |
| SEARCH-04 | Phase 20 | Pending |
| SEARCH-05 | Phase 20 | Pending |
| SEARCH-06 | Phase 20 | Pending |
| CHAT-01 | Phase 21 | Pending |
| CHAT-02 | Phase 21 | Pending |
| CHAT-03 | Phase 21 | Pending |
| CHAT-04 | Phase 21 | Pending |
| TEAM-01 | Phase 22 | Pending |
| TEAM-02 | Phase 22 | Pending |
| TEAM-03 | Phase 22 | Pending |
| TEAM-04 | Phase 22 | Pending |
| TEAM-05 | Phase 22 | Pending |
| TEAM-06 | Phase 22 | Pending |
| TEAM-07 | Phase 22 | Pending |

**Coverage:**
- v1.5 requirements: 25 total
- Mapped to phases: 25
- Unmapped: 0

---
*Requirements defined: 2026-01-29*
*Last updated: 2026-01-29 after roadmap creation*
