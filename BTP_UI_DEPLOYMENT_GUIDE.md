# SAP BTP Cockpit UI Deployment Guide - P&E Manager

This guide walks you through deploying P&E Manager to SAP BTP using the Cockpit UI (web interface).

---

## ✅ Pre-Deployment Checklist

- [x] Frontend built successfully (`dist/` folder ready)
- [x] Backend code ready (`server/` folder)
- [x] Configuration files present:
  - [x] `xs-security.json` (XSUAA configuration)
  - [x] `manifest.yml` (Cloud Foundry manifest)
  - [x] `.cfignore` (deployment exclusions)
  - [x] `Staticfile` (nginx configuration for frontend)

---

## Step 1: Access SAP BTP Cockpit

1. **Open your browser** and go to: https://cockpit.btp.cloud.sap/
2. **Login** with your SAP credentials
3. **Navigate** to your subaccount: `Demo Industries Ltd_cursor-dev-400d7dr4`
4. **Select** your space: `finops_dev`

---

## Step 2: Create PostgreSQL Service Instance

### Via Cockpit UI:

1. **Navigate**: Subaccount → Spaces → `finops_dev` → **Service Marketplace**
2. **Search**: Type "postgresql" in the search box
3. **Select**: Click on "PostgreSQL on SAP BTP, hyperscaler option" (or "PostgreSQL Database")
4. **Create Instance**:
   - Click **"Create"** button
   - **Service**: PostgreSQL on SAP BTP
   - **Plan**: Select `trial` (free tier) or `standard` (production)
   - **Instance Name**: `pe-manager-db`
   - **Parameters**: Leave default (or use custom JSON if needed)
   - Click **"Create"**

5. **Wait**: Service creation takes 5-10 minutes
6. **Verify**: Go to **Service Instances** → Status should show "Created"

### Alternative: Using Service Manager

1. **Navigate**: Subaccount → **Services** → **Service Instances**
2. Click **"Create"**
3. Fill in details as above

**Service Details:**
```
Service Name: pe-manager-db
Service: postgresql-db
Plan: trial (or standard)
```

---

## Step 3: Create XSUAA Service Instance

### Via Cockpit UI:

1. **Navigate**: Subaccount → Spaces → `finops_dev` → **Service Marketplace**
2. **Search**: Type "xsuaa" in the search box
3. **Select**: Click on "Authorization & Trust Management" (XSUAA)
4. **Create Instance**:
   - Click **"Create"** button
   - **Service**: Authorization & Trust Management
   - **Plan**: `application`
   - **Instance Name**: `pe-manager-xsuaa`
   - **Parameters**: Click **"Upload"** and select `xs-security.json` from your project root
     - OR paste the JSON content manually:

```json
{
  "xsappname": "pe-manager",
  "tenant-mode": "dedicated",
  "description": "Security configuration for P&E Manager application",
  "scopes": [
    {
      "name": "$XSAPPNAME.User",
      "description": "Standard user access to P&E Manager"
    },
    {
      "name": "$XSAPPNAME.Admin",
      "description": "Administrator access with full permissions"
    }
  ],
  "role-templates": [
    {
      "name": "User",
      "description": "P&E Manager User",
      "scope-references": ["$XSAPPNAME.User"]
    },
    {
      "name": "Admin",
      "description": "P&E Manager Administrator",
      "scope-references": ["$XSAPPNAME.User", "$XSAPPNAME.Admin"]
    }
  ],
  "role-collections": [
    {
      "name": "PE_Manager_User",
      "description": "P&E Manager User Role Collection",
      "role-template-references": ["$XSAPPNAME.User"]
    },
    {
      "name": "PE_Manager_Admin",
      "description": "P&E Manager Administrator Role Collection",
      "role-template-references": ["$XSAPPNAME.Admin"]
    }
  ],
  "oauth2-configuration": {
    "redirect-uris": [
      "https://*.cfapps.sap.hana.ondemand.com/**",
      "https://*.hana.ondemand.com/**"
    ]
  }
}
```

   - Click **"Create"**

5. **Verify**: Go to **Service Instances** → Status should show "Created"

**Service Details:**
```
Service Name: pe-manager-xsuaa
Service: xsuaa
Plan: application
Configuration: xs-security.json
```

---

## Step 4: Deploy Backend Application

### Method 1: Via Cockpit UI (Recommended)

Unfortunately, SAP BTP Cockpit UI doesn't support direct application deployment. You'll need to use the **cf CLI** for application deployment, but we can configure everything else via UI!

### Method 2: Via cf CLI (Required for Apps)

Since you're already familiar with cf CLI, let's use it just for the deployment part:

```bash
# 1. Login with SSO
cf login --sso -a https://api.cf.sap.hana.ondemand.com

# 2. Select your org and space
# Org: Demo Industries Ltd_cursor-dev-400d7dr4
# Space: finops_dev

# 3. Deploy backend
cf push pe-manager-backend

# 4. Verify deployment
cf app pe-manager-backend
```

The `manifest.yml` will automatically:
- Deploy the backend application
- Bind to `pe-manager-db` service
- Bind to `pe-manager-xsuaa` service
- Set environment variables

**Expected Result:**
```
name:              pe-manager-backend
requested state:   started
routes:            pe-manager-backend.cfapps.sap.hana.ondemand.com
instances:         1/1
memory:            512M
```

---

## Step 5: Run Database Migrations

After backend is deployed, run migrations:

```bash
# Run migration task
cf run-task pe-manager-backend "npm run migrate" --name migrate-db

# Check task status
cf tasks pe-manager-backend

# View logs if needed
cf logs pe-manager-backend --recent | grep migrate
```

**Expected Output:**
```
Task migrate-db has succeeded
```

---

## Step 6: Deploy Frontend Application

```bash
# Deploy frontend
cf push pe-manager-frontend

# Verify deployment
cf app pe-manager-frontend
```

**Expected Result:**
```
name:              pe-manager-frontend
requested state:   started
routes:            pe-manager.cfapps.sap.hana.ondemand.com
instances:         1/1
memory:            128M
buildpack:         staticfile_buildpack
```

---

## Step 7: Configure Environment Variables

### Via Cockpit UI:

1. **Navigate**: Spaces → `finops_dev` → **Applications**
2. **Select**: `pe-manager-backend`
3. **Click**: **Environment Variables** tab
4. **Add Variables**:

**Backend Variables:**
```
FRONTEND_URL = https://pe-manager.cfapps.sap.hana.ondemand.com
NODE_ENV = production
AUTH_MODE = xsuaa
```

5. **Select**: `pe-manager-frontend`
6. **Add Variables**:

**Frontend Variables:**
```
VITE_BACKEND_URL = https://pe-manager-backend.cfapps.sap.hana.ondemand.com
VITE_AUTH_MODE = xsuaa
FORCE_HTTPS = true
```

7. **Restart Apps**: Click **"Restart"** button for both apps to apply changes

### Via cf CLI:

```bash
# Backend environment
cf set-env pe-manager-backend FRONTEND_URL "https://pe-manager.cfapps.sap.hana.ondemand.com"
cf restage pe-manager-backend

# Frontend environment
cf set-env pe-manager-frontend VITE_BACKEND_URL "https://pe-manager-backend.cfapps.sap.hana.ondemand.com"
cf set-env pe-manager-frontend VITE_AUTH_MODE "xsuaa"
cf restage pe-manager-frontend
```

---

## Step 8: Assign User Roles

### Via Cockpit UI:

1. **Navigate**: Subaccount → **Security** → **Role Collections**
2. **Find**: `PE_Manager_User` role collection
3. **Click** on it to edit
4. **Add Users**:
   - Click **"Edit"**
   - In the **Users** section, click **"+"**
   - Enter user email: `eran.lahav@sap.com`
   - Select identity provider (default)
   - Click **"Save"**

5. **Repeat** for `PE_Manager_Admin` if needed (for admin access)

**Role Collections:**
- `PE_Manager_User` - Standard user access
- `PE_Manager_Admin` - Administrator access (full permissions)

---

## Step 9: Verify Deployment

### 1. Check Application Status

**Via Cockpit UI:**
- Navigate to **Applications**
- Both apps should show "Started" status
- Green indicator means healthy

**Via cf CLI:**
```bash
cf apps

# Should show:
# pe-manager-backend    started  1/1  512M
# pe-manager-frontend   started  1/1  128M
```

### 2. Test Backend API

```bash
# Health check
curl https://pe-manager-backend.cfapps.sap.hana.ondemand.com/api/health

# Expected response:
# {"status":"ok","timestamp":"...","environment":"production"}
```

### 3. Test Frontend

Open in browser:
```
https://pe-manager.cfapps.sap.hana.ondemand.com
```

**Expected Behavior:**
1. You'll be redirected to SAP BTP login page
2. Login with your credentials
3. After authentication, you'll see the P&E Manager app
4. Try creating a task or team member to verify database connectivity

---

## Step 10: Monitor Applications

### Via Cockpit UI:

1. **Navigate**: Spaces → `finops_dev` → **Applications** → Select app
2. **Tabs Available**:
   - **Overview** - App status, instances, memory
   - **Logs** - Application logs (last 1000 lines)
   - **Events** - Deployment events
   - **Service Bindings** - Connected services
   - **Environment Variables** - Configuration
   - **Routes** - Application URLs

### View Logs:

**Via Cockpit UI:**
- Applications → Select app → **Logs** tab
- Use filters to search logs

**Via cf CLI:**
```bash
# Stream logs (real-time)
cf logs pe-manager-backend

# View recent logs
cf logs pe-manager-backend --recent

# Filter logs
cf logs pe-manager-backend --recent | grep ERROR
```

---

## Troubleshooting

### Issue: Backend Fails to Start

**Check:**
1. Service bindings are correct
2. Environment variables are set
3. Database migration succeeded

**Via UI:**
- Applications → `pe-manager-backend` → **Logs** tab
- Look for errors in startup

**Via CLI:**
```bash
cf logs pe-manager-backend --recent | tail -50
```

### Issue: Frontend Can't Reach Backend

**Check:**
1. `VITE_BACKEND_URL` is set correctly
2. CORS is configured (FRONTEND_URL on backend)
3. Both apps are running

**Fix:**
```bash
# Verify backend URL
cf env pe-manager-frontend | grep VITE_BACKEND_URL

# Verify frontend URL on backend
cf env pe-manager-backend | grep FRONTEND_URL
```

### Issue: Authentication Errors

**Check:**
1. XSUAA service is bound
2. Role collections are assigned
3. xs-security.json was used correctly

**Verify:**
- Service Instances → `pe-manager-xsuaa` → Check status
- Security → Role Collections → Verify user assignments

### Issue: Database Connection Fails

**Check:**
1. PostgreSQL service is running
2. Migration task completed
3. Service binding exists

**Verify:**
```bash
# Check service status
cf service pe-manager-db

# Check if bound to app
cf env pe-manager-backend | grep postgres
```

---

## Post-Deployment Tasks

### 1. Test All Features

- [ ] User can login
- [ ] Create/edit/delete tasks
- [ ] Create/edit/delete projects
- [ ] Create/edit/delete team members
- [ ] Create/edit/delete stakeholders
- [ ] Calendar functionality
- [ ] Metrics page loads

### 2. Set Up Monitoring

**Via Cockpit:**
- Navigate to **Monitoring** in your subaccount
- Configure alerts for:
  - Application crashes
  - Memory usage > 80%
  - Response time > 2s

### 3. Document URLs

**Application URLs:**
```
Frontend: https://pe-manager.cfapps.sap.hana.ondemand.com
Backend:  https://pe-manager-backend.cfapps.sap.hana.ondemand.com
Health:   https://pe-manager-backend.cfapps.sap.hana.ondemand.com/api/health
```

### 4. Backup Strategy

- Database backups via SAP BTP PostgreSQL service (automatic)
- Application code in Git repository
- Configuration in `xs-security.json` and `manifest.yml`

---

## Quick Command Reference

```bash
# Login
cf login --sso -a https://api.cf.sap.hana.ondemand.com

# Deploy apps
cf push pe-manager-backend
cf push pe-manager-frontend

# Run migrations
cf run-task pe-manager-backend "npm run migrate" --name migrate-db

# Check status
cf apps
cf app pe-manager-backend

# View logs
cf logs pe-manager-backend --recent
cf logs pe-manager-frontend --recent

# Restart apps
cf restart pe-manager-backend
cf restart pe-manager-frontend

# Scale apps
cf scale pe-manager-backend -i 2 -m 1G
cf scale pe-manager-frontend -i 2

# Set environment variables
cf set-env pe-manager-backend KEY "value"
cf restage pe-manager-backend
```

---

## Success Criteria ✅

Your deployment is successful when:

- [x] Both applications show "Started" status in Cockpit
- [x] Health endpoint returns {"status":"ok"}
- [x] Frontend URL opens and redirects to login
- [x] You can login with your SAP credentials
- [x] You can create and view data (tasks, projects, etc.)
- [x] No errors in application logs
- [x] Service bindings are active
- [x] Environment variables are configured

---

## Next Steps

1. **Add More Users**: Assign role collections to team members
2. **Set Up CI/CD**: Automate deployments with GitHub Actions
3. **Enable Monitoring**: Configure alerts in BTP Cockpit
4. **Performance Tuning**: Monitor and scale as needed
5. **Data Migration**: If you have existing data, plan migration from localStorage

---

## Support Resources

- **SAP BTP Documentation**: https://help.sap.com/docs/btp
- **Cloud Foundry Docs**: https://docs.cloudfoundry.org/
- **XSUAA Guide**: https://help.sap.com/docs/BTP/65de2977205c403bbc107264b8eccf4b/6373bb7c0ee94c3192ba69e58e999b00.html
- **PostgreSQL on BTP**: https://help.sap.com/docs/postgresql-hyperscaler-option

---

**Deployment Status: Ready to Deploy** ✅

All files are prepared and ready for SAP BTP deployment via Cockpit UI!
