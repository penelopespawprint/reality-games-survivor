# Auth0 Configuration Guide

## Issue
Auth0 error: "initiate_login_uri must be a valid uri" when accessing test environment.

## Root Cause
Auth0 application settings need to include all domains (test, production, localhost) in the allowed URLs.

## Solution

### 1. Update Auth0 Application Settings

Go to your Auth0 Dashboard (https://manage.auth0.com/) and update your application with these settings:

#### Allowed Callback URLs
Add all these URLs (comma-separated):
```
http://localhost:5001/callback,
http://localhost:5000/callback,
https://test.realitygamesfantasyleague.com/callback,
https://www.realitygamesfantasyleague.com/callback,
https://realitygamesfantasyleague.com/callback
```

#### Allowed Logout URLs
Add all these URLs (comma-separated):
```
http://localhost:5001,
http://localhost:5000,
https://test.realitygamesfantasyleague.com,
https://www.realitygamesfantasyleague.com,
https://realitygamesfantasyleague.com
```

#### Allowed Web Origins
Add all these URLs (comma-separated):
```
http://localhost:5001,
http://localhost:5000,
https://test.realitygamesfantasyleague.com,
https://www.realitygamesfantasyleague.com,
https://realitygamesfantasyleague.com
```

#### Allowed Origins (CORS)
Add all these URLs (comma-separated):
```
http://localhost:5001,
http://localhost:5000,
https://test.realitygamesfantasyleague.com,
https://www.realitygamesfantasyleague.com,
https://realitygamesfantasyleague.com
```

### 2. Application Settings

Make sure these are set:

- **Application Type**: Single Page Application
- **Token Endpoint Authentication Method**: None
- **Initiate Login URI**: `https://www.realitygamesfantasyleague.com` (your primary domain)

### 3. Code Changes (Already Applied)

The `.env` file has been updated to auto-detect the callback URL based on the current domain:

```bash
# VITE_AUTH0_CALLBACK_URL is commented out to enable auto-detection
# The code will use: window.location.origin + '/callback'
```

This means:
- On `localhost:5001` → callback to `http://localhost:5001/callback`
- On `test.realitygamesfantasyleague.com` → callback to `https://test.realitygamesfantasyleague.com/callback`
- On `www.realitygamesfantasyleague.com` → callback to `https://www.realitygamesfantasyleague.com/callback`

### 4. Deploy Changes

After updating Auth0 settings:

1. Commit and push the `.env` change:
   ```bash
   git add .env
   git commit -m "Enable Auth0 callback URL auto-detection for multi-environment support"
   git push origin main
   ```

2. Rebuild on Render (it should auto-deploy)

3. Test on all environments:
   - http://localhost:5001
   - https://test.realitygamesfantasyleague.com
   - https://www.realitygamesfantasyleague.com

### 5. Verify Auth0 Configuration

In Auth0 Dashboard:
1. Go to Applications → Your App → Settings
2. Scroll down to "Application URIs"
3. Ensure all callback URLs are listed
4. Click "Save Changes"

## Testing

After configuration:

1. **Test environment**: Visit https://test.realitygamesfantasyleague.com and try to log in
2. **Production**: Visit https://www.realitygamesfantasyleague.com and try to log in
3. **Local**: Visit http://localhost:5001 and try to log in

All should now redirect properly to Auth0 and back without "initiate_login_uri" errors.

## Notes

- The auto-detection approach is more flexible for multi-environment deployments
- No hardcoded production URLs in environment variables
- Each environment automatically uses its own domain for callbacks
- Auth0 must have all domains pre-approved in the dashboard
