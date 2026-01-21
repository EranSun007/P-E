# External Integrations

**Analysis Date:** 2026-01-21

## APIs & External Services

**SAP AI Core (Generative AI):**
- SAP AI Core orchestration service - LLM chat completions with tool calling
  - SDK/Client: @sap-ai-sdk/orchestration 2.5.0
  - Auth: AICORE_SERVICE_KEY (OAuth2 client credentials in JSON format)
  - Deployment: AI_DEPLOYMENT_ID=d51b8803aa4b9a04
  - Resource Group: default
  - Model: anthropic--claude-3.5-sonnet (Claude 3.5 Sonnet via SAP AI Core)
  - Endpoint: https://api.ai.intprod-eu12.eu-central-1.aws.ml.hana.ondemand.com
  - Implementation: `server/services/AIChatService.js` (orchestration wrapper), `server/services/AIAgentService.js` (tool execution)
  - Features: Chat completions, streaming responses, tool calling for CRUD operations, page context injection

**GitHub API:**
- GitHub REST API v3 (public and enterprise) - Repository data synchronization
  - Implementation: `server/services/GitHubService.js`
  - Auth: Personal Access Token stored in user settings (github_token)
  - Supports: Public GitHub (api.github.com) and SAP GitHub Enterprise (github.tools.sap/api/v3)
  - Features: Repository tracking, PR/issue/commit sync, metrics aggregation
  - Database: `github_repos`, `github_pull_requests`, `github_issues`, `github_commits` tables

## Data Storage

**Databases:**
- PostgreSQL 12+
  - Connection: VCAP_SERVICES (BTP) or DB_HOST/DB_PORT/DB_NAME/DB_USER/DB_PASSWORD (local)
  - Client: pg 8.11.3 with connection pooling (20 max connections)
  - Implementation: `server/db/connection.js`
  - SSL: Required on BTP with `rejectUnauthorized: false`
  - Schema: 25+ tables (tasks, projects, team_members, github_repos, etc.)
  - Migrations: Version-tracked system in `server/db/migrate.js` (16 migration files)

**File Storage:**
- Local filesystem only (no cloud storage integration)

**Caching:**
- None (no Redis or caching layer)

## Authentication & Identity

**Auth Provider:**
- Custom JWT authentication (currently active)
  - Implementation: `server/middleware/auth.js`
  - Token generation: jsonwebtoken 9.0.3
  - Password hashing: bcrypt 6.0.0
  - User database: `users` table with username/password/role
  - Token storage: localStorage (frontend)
  - Development bypass: DEV_SKIP_AUTH=true mode with mock user (dev-user-001)

**SAP XSUAA (prepared but inactive):**
- @sap/xssec 3.6.1 - SAP BTP authentication library
  - Config: `xs-security.json` (scopes, roles, OAuth2 redirect URIs)
  - Scopes: User, Admin
  - Role Collections: PE_Manager_User, PE_Manager_Admin
  - Status: Not currently implemented in auth middleware

## Monitoring & Observability

**Error Tracking:**
- None (no Sentry, Rollbar, etc.)

**Logs:**
- Console logging with custom logger utility (`src/utils/logger.js`)
- Levels: DEBUG, INFO, WARN, ERROR
- Error storage: localStorage (frontend error log)
- Backend: Request logging middleware with duration tracking
- SQL query logging in development mode

## CI/CD & Deployment

**Hosting:**
- SAP BTP Cloud Foundry
  - Backend: https://pe-manager-backend.cfapps.eu01-canary.hana.ondemand.com
  - Frontend: https://pe-manager-frontend.cfapps.eu01-canary.hana.ondemand.com
  - Region: eu01-canary (Europe 1 Canary)

**CI Pipeline:**
- None (manual deployment via Cloud Foundry CLI)

**Deployment Process:**
```bash
# Build frontend
npm run build:client

# Package backend
zip -r pe-manager-backend.zip server/ package.json package-lock.json manifest-simple.yml .cfignore

# Package frontend
cp manifest-frontend.yml Staticfile dist/
cd dist && zip -r ../pe-manager-frontend.zip .

# Deploy
cf push pe-manager-backend -p pe-manager-backend.zip
cf push pe-manager-frontend -p pe-manager-frontend.zip

# Run migrations
cf run-task pe-manager-backend "npm run migrate"
```

## Environment Configuration

**Required env vars (Backend):**
- NODE_ENV - Environment mode (development/production)
- PORT - Server port (default 3001)
- AUTH_MODE - Authentication mode (development/production)
- DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD - PostgreSQL connection
- JWT_SECRET - Secret key for JWT token signing
- AICORE_SERVICE_KEY - SAP AI Core OAuth2 credentials (JSON)
- AI_DEPLOYMENT_ID - AI Core deployment ID
- FRONTEND_URL - Frontend URL for CORS configuration

**Required env vars (Frontend):**
- VITE_API_URL - Backend API URL (/api for dev proxy, full URL for production)
- VITE_AUTH_MODE - Authentication mode (development/production)
- VITE_BACKEND_URL - Backend server URL

**Secrets location:**
- Development: `.env.development` (gitignored)
- Production: SAP BTP environment variables in manifest-simple.yml
- Database credentials: VCAP_SERVICES service binding (auto-injected by BTP)

## Webhooks & Callbacks

**Incoming:**
- None (no webhook endpoints)

**Outgoing:**
- None (no webhook integrations)

## Cross-Origin Resource Sharing (CORS)

**Configuration:**
- Explicit origin whitelist in `server/index.js`
- Development: http://localhost:5173, http://localhost:3000
- Production: https://pe-manager-frontend.cfapps.eu01-canary.hana.ondemand.com, process.env.FRONTEND_URL
- Methods: GET, POST, PUT, DELETE, OPTIONS
- Headers: Content-Type, Authorization
- Credentials: true (allows cookies/auth headers)
- Preflight caching: 86400 seconds (24 hours)

## Development Proxy

**Vite Proxy (Development Only):**
- Routes `/api` requests to backend (http://localhost:3001)
- Configured in `vite.config.js`
- Eliminates CORS issues during development
- Not used in production (frontend makes direct requests to backend URL)

## Multi-Tenancy

**Implementation:**
- Row-level security via user_id filtering
- All queries filtered by authenticated user's ID at service layer
- No cross-tenant data access
- Single database, logical separation by user_id column

---

*Integration audit: 2026-01-21*
