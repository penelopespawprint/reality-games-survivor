# Railway Deployment Setup Guide

## Critical Configuration Required

Railway needs to be configured with the correct **Service Root Directory**. The service must be set to use `/server` as the root directory.

## How to Configure Railway Service Root Directory

1. Go to Railway Dashboard: https://railway.com/project/8ef4265a-363c-497d-878d-859de8b4b25a
2. Click on your service: `rgfl-survivor`
3. Go to **Settings** tab
4. Find **Root Directory** setting
5. Set it to: `/server`
6. Save changes
7. Redeploy the service

## Alternative: Use Railway CLI

If you have Railway CLI configured, you can check the current root directory:

```bash
railway service
```

However, setting the root directory via CLI might not be directly supported. The dashboard is the most reliable method.

## What the nixpacks.toml Does

The `nixpacks.toml` file at the repo root handles:
- Installing Node.js 20
- Installing dependencies (including dev dependencies for TypeScript)
- Building TypeScript code (`npm run build`)
- Verifying the build succeeded
- Starting the server from `/app/server`

## Current Issue

The error `Cannot find module '/app/server/dist/server.js'` indicates:
1. Either the build phase isn't running
2. Or the service root directory isn't set to `/server`

## Solution

**Set the Service Root Directory to `/server` in Railway dashboard**, then redeploy.

## Verification

After setting the root directory and redeploying, check:
1. Build logs show TypeScript compilation
2. Build logs show "✓ Build successful: dist/server.js exists"
3. Health endpoint returns 200: `curl https://rgfl-survivor-production.up.railway.app/health`
