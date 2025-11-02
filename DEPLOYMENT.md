# Deployment Guide - SAP BTP Cloud Foundry

This document explains how to deploy the P&E Manager application to SAP BTP Cloud Foundry.

## 🤖 Automated Deployment

### GitHub Actions CI/CD Pipeline

The application includes an automated CI/CD pipeline that:

1. **Builds** the application on every push
2. **Runs tests** to ensure quality
3. **Deploys** automatically to Cloud Foundry (configurable)

#### Setup GitHub Secrets

To enable automated deployment, add these secrets to your GitHub repository:

1. Go to **Settings** → **Secrets and variables** → **Actions**
2. Add the following secrets:

| Secret Name | Description | Example |
|------------|-------------|---------|
| `CF_API_ENDPOINT` | Cloud Foundry API endpoint | `https://api.cf.sap.hana.ondemand.com` |
| `CF_USERNAME` | Your SAP BTP username | `your.email@company.com` |
| `CF_PASSWORD` | Your SAP BTP password | `your-password` |
| `CF_ORG` | Your Cloud Foundry organization | `your-org-name` |
| `CF_SPACE` | Your Cloud Foundry space | `dev` or `production` |

#### Workflow Triggers

The pipeline runs automatically on:
- Push to `main` branch → Deploys to production
- Push to `employee-goals-persistence` branch → Deploys to staging
- Pull requests → Builds and tests only (no deployment)

## 📦 Manual Deployment

### Prerequisites

1. **Install Cloud Foundry CLI**:
   ```bash
   # macOS
   brew install cloudfoundry/tap/cf-cli@8
   
   # Linux
   wget -q -O - https://packages.cloudfoundry.org/debian/cli.cloudfoundry.org.key | sudo apt-key add -
   echo "deb https://packages.cloudfoundry.org/debian stable main" | sudo tee /etc/apt/sources.list.d/cloudfoundry-cli.list
   sudo apt-get update
   sudo apt-get install cf8-cli
   ```

2. **Login to Cloud Foundry**:
   ```bash
   cf api https://api.cf.sap.hana.ondemand.com
   cf login
   # Enter your username and password
   cf target -o YOUR_ORG -s YOUR_SPACE
   ```

### Deployment Steps

1. **Build the application**:
   ```bash
   npm run build
   ```

2. **Deploy to Cloud Foundry**:
   ```bash
   npm run deploy
   ```

3. **Verify deployment**:
   ```bash
   npm run deploy:check
   ```

4. **View logs** (if needed):
   ```bash
   npm run deploy:logs
   ```

## 🔧 Configuration Files

### manifest.yml

Cloud Foundry deployment manifest. Key settings:

```yaml
applications:
  - name: pe-manager
    memory: 256M              # Memory allocation
    disk_quota: 512M          # Disk space
    instances: 1              # Number of instances
    buildpacks:
      - staticfile_buildpack  # Use static file buildpack
    path: dist                # Deploy from dist/ folder
    env:
      FORCE_HTTPS: true       # Force HTTPS redirects
```

**To customize**:
- Update `routes` to match your actual domain
- Adjust `memory` and `instances` based on load
- Add environment variables under `env`

### staticfile.yml

Configuration for the static file buildpack:

- **SPA routing**: Enables pushstate for React Router
- **HTTPS redirect**: Forces secure connections
- **Nginx config**: Custom location rules for index.html fallback

### .cfignore

Excludes unnecessary files from deployment:
- Source files (src/)
- Tests
- Documentation
- Development files
- node_modules (not needed for static deployment)

## 🚀 Deployment Workflow

### After Each Commit

1. **Commit your changes**:
   ```bash
   git add .
   git commit -m "feat: your feature description"
   git push
   ```

2. **GitHub Actions automatically**:
   - ✅ Runs `npm ci` to install dependencies
   - ✅ Runs `npm test` to verify tests pass
   - ✅ Runs `npm run build` to create production build
   - ✅ Deploys to Cloud Foundry (if on main/staging branch)
   - ✅ Verifies deployment success

3. **Monitor deployment**:
   - View progress in GitHub Actions tab
   - Check deployment logs in Cloud Foundry

## 🎯 Quick Commands Reference

```bash
# Build only
npm run build

# Deploy (builds automatically)
npm run deploy

# Check deployment status
npm run deploy:check

# View recent logs
npm run deploy:logs

# Cloud Foundry commands
cf apps                    # List all applications
cf app pe-manager          # Show app details
cf logs pe-manager         # Stream logs
cf restart pe-manager      # Restart application
cf scale pe-manager -i 2   # Scale to 2 instances
```

## 🔍 Troubleshooting

### Build Fails

```bash
# Check build locally
npm run build

# Check for errors
npm test
```

### Deployment Fails

```bash
# View detailed logs
cf logs pe-manager --recent

# Check app status
cf app pe-manager

# Restart app
cf restart pe-manager
```

### Application Not Responding

```bash
# Check if app is running
cf apps

# View logs for errors
cf logs pe-manager --recent

# Restart if needed
cf restart pe-manager
```

## 📊 Monitoring

### View Application Status

```bash
# Quick status check
npm run deploy:check

# Detailed information
cf app pe-manager

# View events
cf events pe-manager
```

### View Logs

```bash
# Recent logs
npm run deploy:logs

# Stream live logs
cf logs pe-manager

# Filter for errors only
cf logs pe-manager --recent | grep ERROR
```

## 🔐 Security Notes

1. **Never commit secrets** to the repository
2. Use **GitHub Secrets** for CI/CD credentials
3. Enable **FORCE_HTTPS** in production
4. Use **environment-specific** spaces (dev, staging, prod)
5. Rotate **passwords regularly**

## 📝 Environment-Specific Deployments

### Development
```bash
cf target -s dev
npm run deploy
```

### Staging
```bash
cf target -s staging
npm run deploy
```

### Production
```bash
cf target -s production
npm run deploy
```

## 🎉 Post-Deployment

After successful deployment:

1. Visit your application URL
2. Verify all features work correctly
3. Check browser console for errors
4. Test critical user flows

---

**Note**: The GitHub Actions workflow is configured to deploy automatically on push to main and employee-goals-persistence branches. You can disable auto-deploy by commenting out the `deploy` job in `.github/workflows/build-and-deploy.yml`.
