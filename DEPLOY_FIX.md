# Railway Deployment Fix - CRITICAL STEP REQUIRED

## The Problem
Railway cannot find `/app/server/dist/server.js` because the service root directory is not configured correctly.

## The Solution (REQUIRED)

**You MUST configure Railway's Service Root Directory:**

1. Go to: https://railway.com/project/8ef4265a-363c-497d-878d-859de8b4b25a/service/24df0070-1606-4993-89aa-9da987f2643a
2. Click **Settings** tab
3. Scroll to **Root Directory** section
4. Set it to: `server` (without the leading slash)
5. Click **Save**
6. Railway will automatically redeploy

## Why This Is Needed

Railway builds from the repository root by default. Since your server code is in the `/server` subdirectory, Railway needs to know to:
- Look for `package.json` in `/server`
- Run build commands from `/server`
- Execute the start command from `/server`

## Alternative: Use Railway CLI

If you have Railway CLI installed and authenticated:

```bash
cd /workspace
railway link  # Link to your project if not already linked
railway service  # Select the service
# Then set root directory in dashboard (CLI doesn't support this setting directly)
```

## Verification

After setting the root directory:
1. Railway will automatically redeploy
2. Check build logs - you should see TypeScript compilation
3. Check that `dist/server.js` exists in the build
4. Health endpoint should work: `curl https://rgfl-survivor-production.up.railway.app/health`

## Files Created

- `/nixpacks.toml` - Root level config (backup, Railway prefers server-level)
- `/server/nixpacks.toml` - Server-specific config (Railway will use this when root is set)
- `/Procfile` - Alternative start command (Railway will use nixpacks.toml if present)
