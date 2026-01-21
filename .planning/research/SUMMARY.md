# Research Summary: Browser Extension + Backend Sync Architecture

**Domain:** Chrome Extension with Backend Integration for Jira Ticket Sync
**Researched:** 2026-01-21
**Overall confidence:** HIGH

## Executive Summary

The browser extension + backend sync architecture for P&E Manager's Jira integration follows a proven multi-layer pattern already successfully implemented in the codebase through the GitHub integration. The architecture separates concerns across four layers:

1. **Content Script Layer** - DOM observation and data extraction from Jira web pages
2. **Extension Runtime Layer** - Message routing, storage management, and background sync coordination via Service Worker (Manifest V3)
3. **Backend API Layer** - Express.js REST endpoints with authentication and multi-tenancy enforcement
4. **Database Layer** - PostgreSQL with user_id isolation, following the established schema patterns

The architecture is battle-tested: the GitHub integration demonstrates the exact same pattern (token storage → service worker → backend API → PostgreSQL), providing a clear blueprint to follow. The extension will capture Jira ticket data from DOM, queue it in chrome.storage.local, batch sync to the Express.js backend, and persist in PostgreSQL with strict user_id filtering for multi-tenancy.

Key architectural insight: Extension service workers are ephemeral (Manifest V3), so all state must persist in chrome.storage. Backend handles authentication via JWT tokens (same as web app), enforces multi-tenancy at the service layer, and uses UPSERT operations for idempotent syncing.

## Key Findings

**Stack:** Chrome Extension (Manifest V3) + Express.js + PostgreSQL, mirroring GitHub integration pattern
**Architecture:** Four-layer separation: Content Script → Service Worker → Backend API → Database
**Critical insight:** Service workers terminate when idle - all state must persist in chrome.storage, not variables

## Implications for Roadmap

Based on research, suggested phase structure:

1. **Backend Foundation** (Database + Service + Routes)
   - Addresses: Multi-tenancy, data persistence, authentication
   - Avoids: Building extension before backend exists (no API to call)
   - Rationale: Mirrors GitHub integration, can test with curl before extension complexity
   - Dependencies: None (uses existing auth middleware, database connection)

2. **Extension Core** (Service Worker + Storage)
   - Addresses: Message routing, backend API integration, storage management
   - Avoids: UI complexity before data flow works
   - Rationale: Service worker is the hub - must work before content script/UI can function
   - Dependencies: Backend API must exist

3. **Content Script** (DOM Scraping)
   - Addresses: Jira ticket data extraction, page observation
   - Avoids: Fragile selectors, DOM structure changes
   - Rationale: Needs service worker to send extracted data to
   - Dependencies: Service worker must handle messages

4. **Extension UI** (Popup + Options)
   - Addresses: Manual sync triggers, configuration, status display
   - Avoids: Building UI before data flow works
   - Rationale: User interface is last - depends on working backend and service worker
   - Dependencies: Service worker, backend API

5. **Web App Integration** (Frontend Components)
   - Addresses: Viewing synced tickets in P&E Manager, settings management
   - Avoids: Tight coupling (extension works standalone first)
   - Rationale: Extension can function independently, web app enhancement is separate concern
   - Dependencies: Backend API (not extension itself)

**Phase ordering rationale:**
- Backend-first enables testing without extension complexity (curl/Postman)
- Service worker must exist before content script has anywhere to send data
- Content script must extract data before UI can trigger syncs
- UI depends on working data flow
- Web app integration is independent of extension (both consume same backend API)

**Sequential dependencies prevent parallelization:**
- Phase 2 depends on Phase 1 (backend must exist)
- Phase 3 depends on Phase 2 (service worker must receive messages)
- Phase 4 depends on Phase 2 (service worker handles UI requests)
- Phase 5 depends on Phase 1 only (backend API)

**Can parallelize:**
- Phase 4 + Phase 5 (UI and web app both depend on Phase 2/1, but not each other)

**Research flags for phases:**
- Phase 3: Likely needs deeper research (Jira DOM selectors change frequently, requires live testing)
- Phase 1, 2, 4, 5: Standard patterns, unlikely to need additional research (follow GitHub integration exactly)

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Architecture | HIGH | Direct copy of GitHub integration pattern (already in production) |
| Backend patterns | HIGH | Express + PostgreSQL patterns proven in codebase |
| Extension structure | HIGH | Manifest V3 architecture is standard, well-documented |
| DOM scraping | MEDIUM | Jira selectors will require live testing, structure changes over time |
| Multi-tenancy | HIGH | Pattern established across all 11 entities + GitHub integration |
| Authentication | HIGH | JWT pattern already working for GitHub, reuse for Jira |

## Gaps to Address

**Phase-Specific Research Needed:**

1. **Phase 3 (Content Script):**
   - Jira DOM structure inspection (requires live Jira access)
   - Selector identification for ticket fields (key, summary, status, assignee, etc.)
   - MutationObserver configuration for dynamic content
   - Handling Jira's React-based DOM (data-testid attributes vs CSS classes)

2. **Phase 4 (Extension UI):**
   - Icon design (16px, 48px, 128px)
   - UX flow for initial setup (how user provides auth token)
   - Error messaging for sync failures

**No Additional Research Needed:**
- Backend implementation (follow GitHubService.js exactly)
- Service worker patterns (standard Manifest V3)
- Database schema (follows established conventions)
- Authentication flow (reuse existing JWT middleware)
- Frontend integration (follows existing API client patterns)

**Topics Deferred to Implementation:**
- Specific Jira DOM selectors (cannot research without live access)
- Extension icons/branding (design decision, not architecture)
- Sync frequency tuning (requires usage data)
- Performance optimization specifics (requires load testing)

## Ready for Roadmap

Research complete. Architecture document provides:
- Clear component boundaries and responsibilities
- Data flow patterns for all sync scenarios
- Build order with dependency chains
- Patterns to follow (multi-tenancy, idempotent sync, service worker lifecycle)
- Anti-patterns to avoid (token storage, long-running tasks, DOM access)
- Database schema matching GitHub integration style
- Error handling and retry strategies
- Security considerations
- Testing approach

**Recommended next step:** Create milestone roadmap with 5 phases listed above, using ARCHITECTURE.md to structure tasks within each phase.

**Key insight for roadmap creator:** Backend-first approach de-risks extension development. Backend can be tested independently, and the GitHub integration already proves the pattern works. Extension complexity (service worker termination, content script isolation, message passing) is isolated to Phases 2-4, which build on proven backend foundation.
