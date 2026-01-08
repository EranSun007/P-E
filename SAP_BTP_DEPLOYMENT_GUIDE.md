# SAP BTP Deployment Guide - P&E Manager

This guide walks you through deploying the P&E Manager application to SAP BTP Cloud Foundry.

---

## Prerequisites

### Required Tools
- **Cloud Foundry CLI** - [Install cf CLI](https://docs.cloudfoundry.org/cf-cli/install-go-cli.html)
- **Node.js** (v18+) and npm
- **SAP BTP Account** with Cloud Foundry environment enabled

### Verify Installation
```bash
cf --version        # Should show cf version 8.x.x or higher
node --version      # Should show v18.x.x or higher
npm --version       # Should show 9.x.x or higher
```

---

## Phase 1: SAP BTP Setup

### Step 1: Login to SAP BTP
```bash
# Login to Cloud Foundry
cf login -a https://api.cf.sap.hana.ondemand.com

# Enter your credentials when prompted
# Select your organization and space
```

### Step 2: Create PostgreSQL Service
```bash
# Check available PostgreSQL service plans
cf marketplace -e postgresql-db

# Create PostgreSQL service instance
cf create-service postgresql-db trial pe-manager-db

# Wait for service creation (can take 5-10 minutes)
cf service pe-manager-db
# Status should show "create succeeded"
```

**Service Name:** `pe-manager-db`
**Plan:** `trial` (or `standard` for production)

### Step 3: Create XSUAA Service
```bash
# Create XSUAA service instance using xs-security.json
cf create-service xsuaa application pe-manager-xsuaa -c xs-security.json

# Check service status
cf service pe-manager-xsuaa
# Status should show "create succeeded"
```

**Service Name:** `pe-manager-xsuaa`
**Configuration:** Uses `xs-security.json` for OAuth2 scopes and roles

### Step 4: Verify Services
```bash
# List all services in your space
cf services

# You should see:
# pe-manager-db       postgresql-db   trial      create succeeded
# pe-manager-xsuaa    xsuaa          application create succeeded
```

---

## Phase 2: Build Application

### Step 1: Install Dependencies
```bash
# Clean install all dependencies
npm ci
```

### Step 2: Build Frontend
```bash
# Build React app for production
npm run build:client

# Verify dist/ folder was created
ls -la dist/

# Should contain:
# - index.html
# - assets/ (JS and CSS bundles)
```

### Step 3: Verify Backend Configuration
```bash
# Check that backend will use XSUAA in production
cat server/middleware/auth.js | grep -A5 "AUTH_MODE"

# Check database connection supports VCAP_SERVICES
cat server/db/connection.js | grep -A10 "VCAP_SERVICES"
```

---

## Phase 3: Deploy Applications

### Step 1: Deploy Backend
```bash
# Deploy backend application
cf push pe-manager-backend

# This will:
# - Upload application files (excluding .cfignore)
# - Bind to pe-manager-db and pe-manager-xsuaa services
# - Run npm install (in production mode)
# - Start server with: npm start

# Wait for deployment to complete (2-3 minutes)
```

**Expected Output:**
```
Waiting for app pe-manager-backend to start...
name:              pe-manager-backend
requested state:   started
routes:            pe-manager-backend.cfapps.sap.hana.ondemand.com
last uploaded:     [timestamp]
stack:             cflinuxfs4
buildpacks:
  name             version   detect output   buildpack name
  nodejs_buildpack 1.8.x     nodejs          nodejs

type:           web
sidecars:
instances:      1/1
memory usage:   512M
start command:  npm start
     state     since                  cpu    memory        disk          logging
#0   running   [timestamp]            0.0%   50M of 512M   150M of 1G   0B/s of 0B/s
```

### Step 2: Run Database Migrations
```bash
# Run migrations on SAP BTP database
cf run-task pe-manager-backend "npm run migrate" --name migrate-db

# Monitor task execution
cf tasks pe-manager-backend

# Check logs if needed
cf logs pe-manager-backend --recent
```

**Expected Output:**
```
Task migrate-db has succeeded
```

### Step 3: Deploy Frontend
```bash
# Deploy frontend application
cf push pe-manager-frontend

# This will:
# - Upload dist/ folder contents
# - Use staticfile buildpack (nginx)
# - Serve React app with HTTPS redirect

# Wait for deployment to complete (1-2 minutes)
```

**Expected Output:**
```
name:              pe-manager-frontend
requested state:   started
routes:            pe-manager.cfapps.sap.hana.ondemand.com
buildpacks:
  name                  version
  staticfile_buildpack  1.6.x

type:           web
instances:      1/1
memory usage:   128M
```

---

## Phase 4: Configure Environment Variables

### Step 1: Set Frontend Backend URL
```bash
# Set backend URL for frontend API calls
cf set-env pe-manager-frontend VITE_BACKEND_URL "https://pe-manager-backend.cfapps.sap.hana.ondemand.com"
cf set-env pe-manager-frontend VITE_AUTH_MODE "xsuaa"

# Restage frontend to apply changes
cf restage pe-manager-frontend
```

### Step 2: Set Backend CORS Origin
```bash
# Set frontend URL for CORS
cf set-env pe-manager-backend FRONTEND_URL "https://pe-manager.cfapps.sap.hana.ondemand.com"

# Restage backend to apply changes
cf restage pe-manager-backend
```

### Step 3: Verify Environment Variables
```bash
# Check backend environment
cf env pe-manager-backend | grep -A20 "User-Provided"

# Check frontend environment
cf env pe-manager-frontend | grep -A10 "User-Provided"
```

---

## Phase 5: Configure User Roles

### Step 1: Access BTP Cockpit
1. Go to https://cockpit.btp.cloud.sap/
2. Navigate to your subaccount
3. Go to **Security** → **Role Collections**

### Step 2: Assign Role Collections
1. Find **PE_Manager_User** role collection
2. Click **Edit**
3. Add users who should have access
4. Click **Save**

Repeat for **PE_Manager_Admin** for administrator users.

### Step 3: Test Authentication
```bash
# Get frontend URL
cf app pe-manager-frontend | grep routes

# Open in browser
# You should be redirected to SAP BTP login
# After login, you'll access the application
```

---

## Phase 6: Verification

### Step 1: Check Application Status
```bash
# Check both apps are running
cf apps

# Should show:
# pe-manager-backend    started  1/1  512M
# pe-manager-frontend   started  1/1  128M
```

### Step 2: Test Backend Health
```bash
# Test backend API health endpoint
curl https://pe-manager-backend.cfapps.sap.hana.ondemand.com/api/health

# Expected response:
# {"status":"ok","timestamp":"2026-01-08T...","environment":"production"}
```

### Step 3: Test Frontend
```bash
# Open frontend in browser
open https://pe-manager.cfapps.sap.hana.ondemand.com

# Or use curl to verify it's serving
curl -I https://pe-manager.cfapps.sap.hana.ondemand.com
# Should return: HTTP/2 200
```

### Step 4: Verify Database Connection
```bash
# Check backend logs for database connection
cf logs pe-manager-backend --recent | grep -i database

# Should show successful PostgreSQL connection
```

### Step 5: Test API Endpoints
```bash
# Get XSUAA token (or use browser authenticated session)
# Test creating a task
curl -X POST https://pe-manager-backend.cfapps.sap.hana.ondemand.com/api/tasks \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"title":"BTP Test Task","status":"todo"}'

# Should return created task with 201 status
```

---

## Phase 7: Monitoring and Troubleshooting

### View Application Logs
```bash
# Stream backend logs
cf logs pe-manager-backend

# View recent backend logs
cf logs pe-manager-backend --recent

# Stream frontend logs
cf logs pe-manager-frontend

# View recent frontend logs
cf logs pe-manager-frontend --recent
```

### Check Application Health
```bash
# Get backend app details
cf app pe-manager-backend

# Get frontend app details
cf app pe-manager-frontend

# Restart if needed
cf restart pe-manager-backend
cf restart pe-manager-frontend
```

### Database Access
```bash
# Get database credentials
cf env pe-manager-backend | grep -A20 "postgresql-db"

# Use credentials to connect via psql if needed
# (requires cf ssh or service key)
```

### Common Issues

#### Issue: Backend fails to start
```bash
# Check logs
cf logs pe-manager-backend --recent

# Common causes:
# - Missing service bindings
# - Migration not run
# - Invalid XSUAA configuration

# Solution:
cf logs pe-manager-backend --recent | tail -50
```

#### Issue: Frontend can't reach backend
```bash
# Verify CORS configuration
cf env pe-manager-backend | grep FRONTEND_URL

# Verify backend URL in frontend
cf env pe-manager-frontend | grep VITE_BACKEND_URL

# Update if needed
cf set-env pe-manager-backend FRONTEND_URL "https://pe-manager.cfapps.sap.hana.ondemand.com"
cf restage pe-manager-backend
```

#### Issue: Authentication errors
```bash
# Verify XSUAA service binding
cf services | grep xsuaa

# Check xs-security.json was applied
cf service pe-manager-xsuaa

# Re-create XSUAA service if needed
cf delete-service pe-manager-xsuaa
cf create-service xsuaa application pe-manager-xsuaa -c xs-security.json
```

#### Issue: Database connection fails
```bash
# Check PostgreSQL service status
cf service pe-manager-db

# Verify service binding
cf env pe-manager-backend | grep postgresql

# Restart backend
cf restart pe-manager-backend
```

---

## Phase 8: Scaling and Performance

### Scale Applications
```bash
# Scale backend instances
cf scale pe-manager-backend -i 2

# Scale backend memory
cf scale pe-manager-backend -m 1G

# Scale frontend instances
cf scale pe-manager-frontend -i 2
```

### Monitor Resource Usage
```bash
# Check app statistics
cf app pe-manager-backend

# Monitor memory usage
watch -n 5 'cf app pe-manager-backend | grep -A5 "instances"'
```

---

## Phase 9: Updates and Maintenance

### Deploy Application Updates
```bash
# 1. Build new frontend version
npm run build:client

# 2. Push backend update (zero-downtime)
cf push pe-manager-backend --strategy rolling

# 3. Push frontend update
cf push pe-manager-frontend --strategy rolling

# 4. Run new migrations if needed
cf run-task pe-manager-backend "npm run migrate" --name migrate-latest
```

### Rollback Deployment
```bash
# Rollback to previous version
cf rollback pe-manager-backend

# Or redeploy specific version
cf push pe-manager-backend --docker-image <previous-image>
```

---

## Configuration Reference

### Environment Variables

#### Backend (pe-manager-backend)
| Variable | Value | Description |
|----------|-------|-------------|
| NODE_ENV | production | Node environment |
| AUTH_MODE | xsuaa | Authentication mode |
| PORT | 8080 | Server port (CF default) |
| FRONTEND_URL | https://pe-manager.cfapps.sap.hana.ondemand.com | CORS origin |

#### Frontend (pe-manager-frontend)
| Variable | Value | Description |
|----------|-------|-------------|
| VITE_BACKEND_URL | https://pe-manager-backend.cfapps.sap.hana.ondemand.com | Backend API URL |
| VITE_AUTH_MODE | xsuaa | Authentication mode |
| FORCE_HTTPS | true | Redirect HTTP to HTTPS |

### Service Bindings

#### pe-manager-db (PostgreSQL)
- **Service:** postgresql-db
- **Plan:** trial (or standard)
- **Credentials:** Auto-injected via VCAP_SERVICES

#### pe-manager-xsuaa (Authentication)
- **Service:** xsuaa
- **Plan:** application
- **Config:** xs-security.json
- **Credentials:** Auto-injected via VCAP_SERVICES

---

## Security Best Practices

### 1. Use HTTPS Everywhere
- Frontend redirects HTTP to HTTPS (via Staticfile config)
- Backend validates XSUAA tokens
- Secure cookies for session management

### 2. Role-Based Access Control
- Users assigned to role collections in BTP Cockpit
- Backend validates scopes from XSUAA token
- Multi-tenancy enforced via user_id

### 3. Database Security
- PostgreSQL credentials via VCAP_SERVICES (not in code)
- Parameterized SQL queries (prevent injection)
- SSL/TLS for database connections

### 4. API Security
- CORS restricted to frontend URL
- XSUAA token validation on all API routes
- Rate limiting (consider adding)

---

## Cost Optimization

### Development/Test Environment
- Use **trial** tier for PostgreSQL (free)
- Use **application** tier for XSUAA (free)
- Scale to 1 instance (minimum cost)
- Stop apps when not in use: `cf stop pe-manager-backend`

### Production Environment
- Use **standard** tier for PostgreSQL (paid)
- Scale horizontally (2+ instances)
- Enable auto-scaling based on CPU/memory
- Monitor usage in BTP Cockpit

---

## Backup and Recovery

### Database Backup
```bash
# Create service key for direct access
cf create-service-key pe-manager-db pe-manager-db-key

# Get credentials
cf service-key pe-manager-db pe-manager-db-key

# Use pg_dump with credentials
pg_dump -h <hostname> -U <username> -d <database> > backup.sql

# Restore if needed
psql -h <hostname> -U <username> -d <database> < backup.sql
```

### Application Backup
- Code versioned in Git
- Configuration in xs-security.json and manifest.yml
- Environment variables documented in this guide

---

## Next Steps After Deployment

1. ✅ **Test all features** - Create tasks, projects, stakeholders
2. ✅ **Assign users** - Add team members to role collections
3. ✅ **Monitor logs** - Watch for errors or performance issues
4. ✅ **Set up alerts** - Configure BTP alerts for app crashes
5. ✅ **Document URLs** - Share frontend URL with users
6. ✅ **Plan maintenance** - Schedule update windows

---

## Support and Resources

### SAP BTP Documentation
- [Cloud Foundry CLI Reference](https://docs.cloudfoundry.org/cf-cli/)
- [SAP BTP PostgreSQL](https://help.sap.com/docs/postgresql-hyperscaler-option)
- [XSUAA Service](https://help.sap.com/docs/BTP/65de2977205c403bbc107264b8eccf4b/6373bb7c0ee94c3192ba69e58e999b00.html)

### Application Documentation
- **CLAUDE.md** - Architecture and development guide
- **MIGRATION_PROGRESS.md** - Migration status and history
- **README.md** - Project overview

### Contact
For issues or questions, check the project repository's issue tracker.

---

## Quick Reference Commands

```bash
# Login
cf login -a https://api.cf.sap.hana.ondemand.com

# Create services
cf create-service postgresql-db trial pe-manager-db
cf create-service xsuaa application pe-manager-xsuaa -c xs-security.json

# Deploy
npm run build:client
cf push pe-manager-backend
cf run-task pe-manager-backend "npm run migrate" --name migrate-db
cf push pe-manager-frontend

# Configure
cf set-env pe-manager-frontend VITE_BACKEND_URL "https://pe-manager-backend.cfapps.sap.hana.ondemand.com"
cf set-env pe-manager-backend FRONTEND_URL "https://pe-manager.cfapps.sap.hana.ondemand.com"
cf restage pe-manager-frontend
cf restage pe-manager-backend

# Monitor
cf apps
cf logs pe-manager-backend --recent
cf logs pe-manager-frontend --recent

# Troubleshoot
cf env pe-manager-backend
cf restart pe-manager-backend
cf ssh pe-manager-backend
```

---

**Deployment Checklist:**
- [ ] cf CLI installed and logged in
- [ ] PostgreSQL service created (pe-manager-db)
- [ ] XSUAA service created (pe-manager-xsuaa)
- [ ] Frontend built (npm run build:client)
- [ ] Backend deployed (cf push pe-manager-backend)
- [ ] Database migrations run (cf run-task)
- [ ] Frontend deployed (cf push pe-manager-frontend)
- [ ] Environment variables configured
- [ ] User roles assigned in BTP Cockpit
- [ ] Application tested and verified
- [ ] URLs documented and shared

**Status:** Ready for SAP BTP Deployment ✅
