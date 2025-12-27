# Railway Deployment - Complete Guide

## Current Status
✅ Multiple deployment configurations created:
- `/server/Dockerfile` - Docker-based deployment (Railway will use this if detected)
- `/server/nixpacks.toml` - Nixpacks config (used when root directory = "server")
- `/nixpacks.toml` - Root-level backup config
- `/Procfile` - Alternative start method

## Required Configuration

### Option 1: Set Root Directory (RECOMMENDED)

1. Go to Railway Dashboard:
   https://railway.com/project/8ef4265a-363c-497d-878d-859de8b4b25a/service/24df0070-1606-4993-89aa-9da987f2643a

2. Click **Settings** tab

3. Find **Root Directory** setting

4. Set to: `server` (no leading slash)

5. Click **Save**

6. Railway will auto-redeploy

### Option 2: Use Dockerfile (AUTOMATIC)

If Railway detects `/server/Dockerfile`, it will use Docker instead of Nixpacks.

The Dockerfile:
- Installs Node.js 20
- Installs ALL dependencies (including dev deps for TypeScript)
- Builds TypeScript to `dist/`
- Verifies build succeeded
- Starts with `node dist/server.js`

## Build Process

1. **Install**: `npm ci --include=dev` (ensures TypeScript is installed)
2. **Build**: `npm run build` (compiles TypeScript)
3. **Verify**: Checks that `dist/server.js` exists
4. **Start**: `node dist/server.js`

## Troubleshooting

### Error: "Cannot find module '/app/server/dist/server.js'"

**Causes:**
- Root directory not set to "server"
- Build phase failed (check logs)
- TypeScript not installed (should be fixed now)

**Solutions:**
1. Set root directory to "server" in Railway dashboard
2. Check build logs for TypeScript compilation errors
3. Verify `dist/server.js` exists in build logs

### Error: "tsc: not found"

**Cause:** TypeScript not installed (dev dependency)

**Solution:** The updated configs now explicitly install TypeScript:
- Dockerfile: `npm ci --include=dev`
- nixpacks.toml: `npm ci --include=dev` + fallback install

### Build Succeeds but Server Won't Start

**Check:**
1. Environment variables are set correctly
2. PORT is configured (Railway sets this automatically)
3. Database connection strings are correct
4. Check Railway logs for runtime errors

## Verification

After deployment:

```bash
# Check health endpoint
curl https://rgfl-survivor-production.up.railway.app/health

# Should return:
# {"status":"ok","timestamp":"...","checks":{...}}
```

## Files Reference

- `/server/Dockerfile` - Docker build instructions
- `/server/nixpacks.toml` - Nixpacks config (when root = "server")
- `/nixpacks.toml` - Root-level backup
- `/server/.dockerignore` - Files to exclude from Docker build
- `/Procfile` - Alternative start command

## Next Steps

1. **Set root directory to "server"** (if not already set)
2. Railway will auto-deploy from latest push
3. Monitor build logs for success
4. Test health endpoint
