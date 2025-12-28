# Railway Frontend Service 502 Error - Critical Fix

## Problem Summary
The frontend service at https://survivor.realitygamesfantasyleague.com is returning 502 Bad Gateway because Railway is trying to execute the **backend** server code instead of serving the **frontend** static files.

## Root Cause
Railway's `rgfl-frontend` service is **not** configured with the correct root directory. It's building from the repository root (`/`) instead of the `/web` subdirectory, causing it to look for `/app/server/dist/server.js` instead of serving the built React app.

## Error in Logs
```
Error: Cannot find module '/app/server/dist/server.js'
    at Module._resolveFilename (node:internal/modules/cjs/loader:1207:15)
```

This confirms Railway is trying to run the backend server code.

## Solution: Fix Railway Service Configuration

### Option 1: Railway Dashboard (RECOMMENDED - Immediate Fix)

1. **Go to Railway Dashboard**: https://railway.app
2. **Navigate to**: `rgfl-survivor` project → `rgfl-frontend` service
3. **Click Settings tab**
4. **Find "Root Directory" setting**
5. **Set Root Directory to**: `web` (or `/web`)
6. **Save changes**
7. **Trigger manual redeploy** from Deployments tab

### Option 2: Via railway.toml (Already Created)

A `railway.toml` file has been created at `/web/railway.toml`:

```toml
[build]
builder = "nixpacks"

[deploy]
startCommand = "npx serve dist -s -l ${PORT:-3000}"
restartPolicyType = "on-failure"
restartPolicyMaxRetries = 10
```

However, this file alone **won't fix the root directory issue**. You must still set the root directory in Railway Dashboard.

### Option 3: Recreate Service with Correct Settings

If the above doesn't work:

1. Create a new service in Railway
2. Connect to GitHub repo: `penelopespawprint/reality-games-survivor`
3. Set **Root Directory**: `web`
4. Set **Build Command**: `npm ci && npm run build`
5. Set **Start Command**: `npx serve dist -s -l ${PORT:-3000}`
6. Copy environment variables from old service:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
   - `VITE_API_URL`
7. Add domain: `survivor.realitygamesfantasyleague.com`
8. Delete old `rgfl-frontend` service

## Environment Variables (Already Set)
✅ `VITE_SUPABASE_URL`: https://qxrgejdfxcvsfktgysop.supabase.co
✅ `VITE_SUPABASE_ANON_KEY`: [Set]
✅ `VITE_API_URL`: https://rgfl-api-production.up.railway.app

## Build Configuration (Already Working)

The `nixpacks.toml` in `/web` directory is correctly configured:

```toml
[phases.setup]
nixPkgs = ["nodejs_20"]

[phases.install]
cmds = ["npm ci"]

[phases.build]
cmds = ["npm run build"]

[start]
cmd = "npx serve dist -s -l ${PORT:-3000}"
```

## Verification Steps

After fixing:

1. Check Railway logs show successful build:
   ```
   ✓ built in X.XXs
   ```

2. Verify frontend responds:
   ```bash
   curl -I https://survivor.realitygamesfantasyleague.com
   ```
   Should return `HTTP/2 200` instead of `502`

3. Test in browser:
   - Navigate to https://survivor.realitygamesfantasyleague.com
   - Should see login page
   - Should load CSS and JavaScript

## Why This Happened

Railway likely defaulted to the repository root because:
1. No root directory was explicitly set when creating the service
2. The service was created before the `/web` directory structure was finalized
3. Railway detected a Dockerfile in the root (for the backend) and used it

## Next Steps

**IMMEDIATE ACTION REQUIRED:**
1. Go to Railway Dashboard
2. Set root directory to `web` in `rgfl-frontend` service settings
3. Trigger redeploy
4. Verify site loads

**NO CODE CHANGES NEEDED** - This is purely a Railway configuration issue.
