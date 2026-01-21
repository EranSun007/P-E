# Codebase Concerns

**Analysis Date:** 2026-01-21

## Tech Debt

**Hardcoded JWT Secret in Production:**
- Issue: JWT secret is hardcoded in `manifest.yml` for BTP deployment
- Files: `manifest.yml` (line 14), `server/middleware/auth.js` (line 5)
- Impact: Security vulnerability - JWT tokens can be forged if secret is exposed
- Fix approach: Move to VCAP_SERVICES user-provided service or environment-specific secrets management

**XSUAA Logout Not Implemented:**
- Issue: TODO comment for XSUAA logout implementation
- Files: `src/api/apiClient.js` (line 307)
- Impact: Users cannot properly log out in production mode, sessions remain active
- Fix approach: Implement proper XSUAA token revocation flow when switching from development to production auth

**Development Auth Bypass in Production:**
- Issue: AUTH_MODE=development enabled in production manifest
- Files: `manifest.yml` (line 13), `server/middleware/auth.js` (line 17-26)
- Impact: Authentication bypass available in production, all users get admin role
- Fix approach: Set AUTH_MODE=production and configure XSUAA service binding

**No Backend Test Coverage:**
- Issue: Zero test files found in `server/` directory
- Files: All services in `server/services/` (19 service files totaling ~8,900 lines)
- Impact: No automated testing for business logic, database queries, or API endpoints
- Fix approach: Add Vitest tests for service layer, especially multi-tenancy and SQL injection prevention

**Excessive Console.log Usage:**
- Issue: 259 console.log/console.error statements in backend code
- Files: Throughout `server/` directory
- Impact: Performance overhead, unstructured logging, no log levels or aggregation
- Fix approach: Replace with proper logging framework (Winston, Pino) with log levels and structured output

**59 SELECT * Queries:**
- Issue: Services use `SELECT *` instead of explicit column names
- Files: Throughout `server/services/` directory
- Impact: Performance overhead, breaks when schema changes, transfers unnecessary data
- Fix approach: Replace with explicit column lists in all SQL queries

**Exposed Secrets in .env Files:**
- Issue: `.env.development` and `.env.production` tracked in git with sensitive data
- Files: `.env.development` (contains SAP AI Core service key with client secret)
- Impact: Critical - Service credentials exposed in git history
- Fix approach: Remove from git, add to .gitignore, rotate all exposed credentials immediately

**Legacy localStorage Client Still Present:**
- Issue: 1,347-line localStorage client maintained alongside PostgreSQL API client
- Files: `src/api/localClient.js`, `src/api/entities.js` (switches between clients)
- Impact: Maintenance burden, confusing for developers, potential data inconsistency bugs
- Fix approach: Remove localClient.js after confirming all users migrated to PostgreSQL backend

**Large Frontend Files:**
- Issue: Multiple page components exceed 1,000 lines
- Files: `src/pages/TeamMemberProfile.jsx` (1,423 lines), `src/pages/PeerProfile.jsx` (1,371 lines), `src/pages/Team.jsx` (1,188 lines)
- Impact: Difficult to maintain, test, and review; high cognitive complexity
- Fix approach: Extract components, hooks, and business logic into smaller focused modules

**Large Backend Service Files:**
- Issue: Two services exceed 500 lines
- Files: `server/services/GitHubService.js` (539 lines), `server/ai/tools.js` (515 lines), `server/services/AIAgentService.js` (490 lines)
- Impact: High complexity, difficult to test and maintain
- Fix approach: Split into focused service classes with single responsibility

**Base44 SDK Unused Legacy Dependency:**
- Issue: @base44/sdk included but not used anywhere in codebase
- Files: `package.json` (line 36)
- Impact: 0.1.2 package version suggests abandoned/legacy integration, adds bundle size
- Fix approach: Remove dependency if confirmed unused

**No Rate Limiting or Request Throttling:**
- Issue: No rate limiting middleware detected on API endpoints
- Files: `server/index.js`
- Impact: Vulnerable to abuse, DDoS, brute force attacks on authentication
- Fix approach: Add express-rate-limit middleware on all API routes, especially auth endpoints

**16 Database Migrations in Separate Files:**
- Issue: Migrations scattered across 16 SQL files vs. schema.sql
- Files: `server/db/002_work_items.sql` through `server/db/016_github_integration.sql`
- Impact: Difficult to understand current schema, must read 17 files to see full structure
- Fix approach: Create canonical schema documentation or tool to generate current schema from migrations

## Known Bugs

**SSL Certificate Validation Disabled:**
- Symptoms: PostgreSQL connections use `rejectUnauthorized: false`
- Files: `server/db/connection.js` (lines 34, 50, 66)
- Trigger: All database connections on SAP BTP
- Workaround: Currently accepting invalid/self-signed certificates

**CORS Preflight Handling Duplication:**
- Symptoms: OPTIONS requests handled both explicitly and via middleware
- Files: `server/index.js` (lines 52-62 and 65-72)
- Trigger: All cross-origin requests
- Workaround: Explicit OPTIONS handler runs first, middleware is redundant

**Frontend Bundle Size Warnings:**
- Symptoms: Vite warns about chunks exceeding 400 KB limit
- Files: `vite.config.js` (line 94), Large Radix UI component chunks
- Trigger: Production builds
- Workaround: Manual chunk splitting in place but some pages still large

## Security Considerations

**SQL Injection Prevention Not Enforced:**
- Risk: No automated checks prevent developers from using string concatenation in SQL
- Files: All service files in `server/services/`
- Current mitigation: Code review, parameterized queries used manually
- Recommendations: Add ESLint rule to detect SQL string concatenation, add SQL injection tests

**No Input Validation on API Layer:**
- Risk: Service layer assumes valid input, no schema validation at route level
- Files: All route files in `server/routes/`
- Current mitigation: Basic sanitization in localClient only (not used for API)
- Recommendations: Add Zod schema validation middleware on all POST/PUT endpoints

**JWT Secret Defaults to Weak Value:**
- Risk: Fallback JWT secret in code is predictable
- Files: `server/middleware/auth.js` (line 5)
- Current mitigation: Environment variable should override
- Recommendations: Fail to start if JWT_SECRET not provided, remove default entirely

**No CSRF Protection:**
- Risk: Cross-site request forgery possible on state-changing endpoints
- Files: `server/index.js` (no CSRF middleware)
- Current mitigation: None
- Recommendations: Add csurf middleware or rely on SameSite cookie attributes

**User-Provided GitHub Tokens Stored in Database:**
- Risk: Personal Access Tokens stored in `user_settings` table
- Files: `server/services/UserSettingsService.js`, `server/db/016_github_integration.sql`
- Current mitigation: Database encryption at rest (BTP managed)
- Recommendations: Consider encrypted column or external secrets manager, add token rotation flow

**SAP AI Core Credentials in Environment Variables:**
- Risk: Service key with client secret stored in plain text env vars
- Files: `.env.development` (line 31 - full service key JSON with clientsecret)
- Current mitigation: Relies on file system permissions
- Recommendations: Use VCAP_SERVICES binding instead, never commit service keys to git

**No Request Size Limits by Route:**
- Risk: 10 MB body parser limit applies to all routes equally
- Files: `server/index.js` (line 74)
- Current mitigation: Global 10 MB limit
- Recommendations: Apply smaller limits per route, especially on authentication endpoints

**Admin Endpoint Exposed Without Protection:**
- Risk: `/api/admin/migrate` runs migrations via HTTP POST with no authentication
- Files: `server/index.js` (line 97)
- Current mitigation: None - endpoint publicly accessible
- Recommendations: Add requireAdmin middleware or remove endpoint entirely

## Performance Bottlenecks

**No Database Query Caching:**
- Problem: Every request hits PostgreSQL, even for static reference data
- Files: All services make synchronous DB calls
- Cause: No caching layer between application and database
- Improvement path: Add Redis cache for frequent read queries (team members, projects list)

**N+1 Query Potential in AI Agent Service:**
- Problem: Tool execution loops may trigger multiple sequential DB queries
- Files: `server/services/AIAgentService.js` (lines 21-50 switch statement)
- Cause: Each tool call executes independently without batching
- Improvement path: Implement query batching or DataLoader pattern for bulk operations

**Frontend Loads All Entities on Mount:**
- Problem: AppContext loads all 11 entity types on initial page load
- Files: `src/contexts/AppContext.jsx` (referenced in CLAUDE.md line 217)
- Cause: Eager loading strategy vs. on-demand loading
- Improvement path: Lazy load entities only when pages need them, implement pagination

**No Database Connection Pooling Limits by User:**
- Problem: Single user can exhaust all 20 pool connections
- Files: `server/db/connection.js` (line 37)
- Cause: No per-user or per-request connection limits
- Improvement path: Add connection queuing or per-tenant connection limits

**Large Bundle Sizes:**
- Problem: Initial JavaScript bundle likely large with 90,615 lines of JSX
- Files: Total frontend codebase (all pages and components)
- Cause: Code splitting may be insufficient, large page components
- Improvement path: Implement route-based code splitting, lazy load modals/dialogs

## Fragile Areas

**Multi-Tenancy Enforcement:**
- Files: All service files in `server/services/`
- Why fragile: Every SQL query must include user_id filter, easy to forget
- Safe modification: Always use parameterized queries with userId as first parameter
- Test coverage: No automated tests verify user isolation

**Database Migration System:**
- Files: `server/db/migrate.js`, `server/db/*.sql`
- Why fragile: Manual version tracking in array, no rollback mechanism, no transaction safety
- Safe modification: Never modify existing migrations, always add new numbered files
- Test coverage: No migration tests, manual verification only

**Authentication Context Provider:**
- Files: `src/contexts/AuthContext.jsx`, referenced throughout frontend
- Why fragile: Must wrap entire app, missing provider causes runtime crashes
- Safe modification: Test all routes when changing AuthProvider implementation
- Test coverage: Auth error handling tests exist (`src/components/auth/__tests__/AuthErrorHandling.test.jsx`)

**CORS Configuration:**
- Files: `server/index.js` (lines 38-72)
- Why fragile: Duplicate logic for OPTIONS and middleware, exact origin matching required
- Safe modification: Test with actual frontend domain after any changes
- Test coverage: None - CORS issues only appear in deployed environment

**Calendar Services with Complex Dependencies:**
- Files: `src/services/calendarSynchronizationService.js` (1,028 lines), `src/utils/calendarService.js` (1,150 lines)
- Why fragile: Multiple interdependent services for calendar operations, synchronization state
- Safe modification: Review all calendar tests before changes (905 line test file exists)
- Test coverage: Comprehensive test suite exists

**VCAP_SERVICES Parsing:**
- Files: `server/db/connection.js` (lines 14-44), `server/services/AIConnectionService.js` (lines 27-50)
- Why fragile: JSON parsing with fallback logic, breaks if BTP service names change
- Safe modification: Test locally with mocked VCAP_SERVICES before deploying
- Test coverage: None - only tested in actual BTP environment

## Scaling Limits

**PostgreSQL Connection Pool:**
- Current capacity: 20 max connections
- Limit: ~20 concurrent users before connection exhaustion
- Scaling path: Increase pool size, implement connection queuing, add read replicas

**Single Instance Deployment:**
- Current capacity: 1 backend instance, 1 frontend instance (manifest.yml)
- Limit: All traffic to single container, no redundancy
- Scaling path: Increase instances in manifest.yml, add load balancer

**No Caching Strategy:**
- Current capacity: Every request hits database
- Limit: PostgreSQL query throughput (~1,000 queries/sec for simple reads)
- Scaling path: Add Redis for session/entity caching, implement HTTP caching headers

**In-Memory Session Management:**
- Current capacity: JWT tokens stateless, but no session store
- Limit: Cannot revoke tokens before expiry
- Scaling path: Add token blacklist in Redis, implement refresh tokens

**No Background Job Processing:**
- Current capacity: All operations synchronous in HTTP request/response cycle
- Limit: Long-running operations timeout, no retry mechanism
- Scaling path: Add job queue (Bull/BullMQ) for async operations

## Dependencies at Risk

**axios:**
- Risk: Recently upgraded, version changes visible in git status
- Impact: HTTP client used throughout frontend
- Migration plan: Already using native fetch in apiClient, can remove axios if unused

**form-data:**
- Risk: README.md.bak suggests recent changes or package issues
- Impact: Used for multipart form uploads
- Migration plan: Check if actually needed, modern fetch() supports FormData natively

**@sap/xssec:**
- Risk: SAP-specific auth library, version 3.6.1
- Impact: XSUAA authentication not yet active but prepared
- Migration plan: Keep until production auth implemented, then ensure compatibility

**jsonwebtoken:**
- Risk: JWT library, alternatives exist (jose, jwt-simple)
- Impact: Core authentication mechanism
- Migration plan: No immediate concern but consider modern alternatives for future

**react-router-dom:**
- Risk: Version 7.2.0 - major version upgrade from v6
- Impact: Routing throughout application
- Migration plan: Monitor for breaking changes, API may have changed

## Missing Critical Features

**No Database Backup Automation:**
- Problem: Manual backup via `/api/backup/export` endpoint only
- Blocks: Disaster recovery, point-in-time restore
- Priority: High

**No Logging Aggregation:**
- Problem: Logs only viewable via `cf logs` command, no persistence
- Blocks: Debugging production issues, audit trails
- Priority: High

**No Monitoring or Alerting:**
- Problem: No metrics on error rates, response times, or resource usage
- Blocks: Proactive issue detection, capacity planning
- Priority: Medium

**No API Documentation:**
- Problem: No OpenAPI/Swagger spec for REST API
- Blocks: Frontend-backend contract validation, third-party integrations
- Priority: Medium

**No User Management UI:**
- Problem: Users table exists but no admin interface to manage users
- Blocks: Adding/removing team members, role management
- Priority: Medium

**No Soft Delete:**
- Problem: All deletes are hard deletes with CASCADE
- Blocks: Data recovery, audit trails of deleted records
- Priority: Low

**No Data Export Formats:**
- Problem: Backup export is JSON only
- Blocks: Integration with other tools, reporting
- Priority: Low

## Test Coverage Gaps

**Backend Services Untested:**
- What's not tested: All 19 service classes in `server/services/`
- Files: TaskService, ProjectService, GitHubService, AIAgentService, etc.
- Risk: SQL injection, multi-tenancy violations, business logic bugs in production
- Priority: Critical

**API Routes Untested:**
- What's not tested: All REST endpoints in `server/routes/`
- Files: 15+ route files (auth, tasks, projects, ai, github, etc.)
- Risk: HTTP status codes, error handling, authentication/authorization bypasses
- Priority: High

**Database Migrations Untested:**
- What's not tested: Migration execution, rollback, idempotency
- Files: `server/db/migrate.js`, all 16 migration SQL files
- Risk: Failed deployments, data corruption, schema inconsistencies
- Priority: High

**CORS Configuration Untested:**
- What's not tested: Cross-origin requests, preflight handling
- Files: `server/index.js` CORS middleware
- Risk: Production deployment failures, security misconfigurations
- Priority: High

**Multi-Tenancy Isolation Untested:**
- What's not tested: User data isolation, user_id filtering in all queries
- Files: All service files with SQL queries
- Risk: Critical security vulnerability - data leaks between users
- Priority: Critical

**Large Page Components Partially Tested:**
- What's not tested: TeamMemberProfile, PeerProfile, Team pages (1,200+ lines each)
- Files: `src/pages/TeamMemberProfile.jsx`, `src/pages/PeerProfile.jsx`, `src/pages/Team.jsx`
- Risk: Regressions in core user workflows, UI bugs in production
- Priority: Medium

**Environment Variable Handling Untested:**
- What's not tested: VCAP_SERVICES parsing, fallback behavior, missing env vars
- Files: `server/db/connection.js`, `server/services/AIConnectionService.js`
- Risk: Deployment failures on BTP with no clear error messages
- Priority: Medium

---

*Concerns audit: 2026-01-21*
