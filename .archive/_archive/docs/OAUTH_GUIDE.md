# OAuth Integration Guide - RGFL Survivor

## Easy OAuth Options (Plug & Play)

### 1. **Auth0** (Recommended - Universal)
**Best for:** All-in-one solution with multiple providers

**Setup Steps:**
1. Sign up at https://auth0.com (Free tier available)
2. Install: `npm install @auth0/auth0-react`
3. Create Auth0 Application (Single Page Application)
4. Configure Allowed Callbacks: `http://localhost:5173/callback`, `https://rgfl-survivor.onrender.com/callback`
5. Enable Social Connections: Google, GitHub, Facebook, etc.

**Implementation:**
```typescript
// client/src/main.tsx
import { Auth0Provider } from '@auth0/auth0-react';

<Auth0Provider
  domain="YOUR_DOMAIN.auth0.com"
  clientId="YOUR_CLIENT_ID"
  redirectUri={window.location.origin + '/callback'}
>
  <App />
</Auth0Provider>
```

**Pros:**
- Multiple OAuth providers in one
- Built-in user management
- Free tier supports 7,000 active users
- Easy migration from existing system

---

### 2. **Google OAuth** (Simplest)
**Best for:** Quick setup, most users have Google accounts

**Setup Steps:**
1. Go to https://console.cloud.google.com
2. Create new project → Enable Google+ API
3. Create OAuth 2.0 credentials
4. Install: `npm install @react-oauth/google`

**Implementation:**
```typescript
// client/src/main.tsx
import { GoogleOAuthProvider } from '@react-oauth/google';

<GoogleOAuthProvider clientId="YOUR_GOOGLE_CLIENT_ID">
  <App />
</GoogleOAuthProvider>

// In Signup.tsx
import { GoogleLogin } from '@react-oauth/google';

<GoogleLogin
  onSuccess={(credentialResponse) => {
    // Send credentialResponse.credential to your backend
    api.post('/api/auth/google', { token: credentialResponse.credential });
  }}
  onError={() => console.log('Login Failed')}
/>
```

**Backend (server/auth.ts):**
```typescript
import { OAuth2Client } from 'google-auth-library';
const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

router.post('/google', async (req, res) => {
  const { token } = req.body;
  const ticket = await client.verifyIdToken({
    idToken: token,
    audience: process.env.GOOGLE_CLIENT_ID
  });
  const payload = ticket.getPayload();

  // Find or create user with payload.email
  let user = await prisma.user.findUnique({ where: { email: payload.email }});

  if (!user) {
    user = await prisma.user.create({
      data: {
        email: payload.email,
        name: payload.name,
        username: payload.email.split('@')[0],
        password: await bcrypt.hash(crypto.randomBytes(32).toString('hex'), 10) // Random password
      }
    });
  }

  const jwtToken = jwt.sign({ id: user.id }, SECRET);
  res.json({ token: jwtToken, user });
});
```

**Pros:**
- 5-minute setup
- Everyone has Google
- No additional service fees

---

### 3. **GitHub OAuth**
**Best for:** Developer communities

**Setup Steps:**
1. Go to GitHub Settings → Developer settings → OAuth Apps
2. Create new OAuth App
3. Install: `npm install react-github-login`

**Implementation:**
```typescript
import GitHubLogin from 'react-github-login';

<GitHubLogin
  clientId="YOUR_GITHUB_CLIENT_ID"
  onSuccess={(response) => {
    api.post('/api/auth/github', { code: response.code });
  }}
  redirectUri="http://localhost:5173/callback"
/>
```

**Backend:**
```typescript
router.post('/github', async (req, res) => {
  const { code } = req.body;

  // Exchange code for access token
  const tokenRes = await fetch('https://github.com/login/oauth/access_token', {
    method: 'POST',
    headers: { 'Accept': 'application/json', 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id: process.env.GITHUB_CLIENT_ID,
      client_secret: process.env.GITHUB_CLIENT_SECRET,
      code
    })
  });

  const { access_token } = await tokenRes.json();

  // Get user data
  const userRes = await fetch('https://api.github.com/user', {
    headers: { 'Authorization': `token ${access_token}` }
  });
  const githubUser = await userRes.json();

  // Find or create user
  // ... similar to Google OAuth
});
```

---

### 4. **NextAuth.js** (Most Comprehensive)
**Best for:** Multiple providers with one library

**Setup Steps:**
1. Install: `npm install next-auth` (works with Express too)
2. Create `server/auth-providers.ts`
3. Configure providers

**Implementation:**
```typescript
// server/auth-providers.ts
import GoogleProvider from 'next-auth/providers/google';
import GitHubProvider from 'next-auth/providers/github';

export const authOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET
    }),
    GitHubProvider({
      clientId: process.env.GITHUB_CLIENT_ID,
      clientSecret: process.env.GITHUB_CLIENT_SECRET
    })
  ]
};
```

**Pros:**
- One library, many providers
- Built-in session management
- Works with JWT or database sessions

---

## Recommended Implementation Order

### Phase 1: Add Google OAuth (1 hour)
1. Set up Google Cloud Console
2. Install `@react-oauth/google`
3. Add Google button to signup page
4. Create `/api/auth/google` endpoint
5. Test login flow

### Phase 2: (Optional) Add More Providers
- GitHub (30 min)
- Auth0 for universal access (1 hour)

---

## Environment Variables Needed

Add to `.env`:
```bash
# Google OAuth
GOOGLE_CLIENT_ID=your_client_id_here
GOOGLE_CLIENT_SECRET=your_client_secret_here

# GitHub OAuth (optional)
GITHUB_CLIENT_ID=your_github_client_id
GITHUB_CLIENT_SECRET=your_github_client_secret

# Auth0 (optional)
AUTH0_DOMAIN=your_domain.auth0.com
AUTH0_CLIENT_ID=your_auth0_client_id
AUTH0_CLIENT_SECRET=your_auth0_client_secret
```

---

## Security Considerations

1. **Always verify tokens on the backend** - Never trust frontend
2. **Use HTTPS in production** - OAuth requires secure connections
3. **Store client secrets in environment variables** - Never commit to git
4. **Set proper redirect URIs** - Match exactly what's in OAuth console
5. **Handle existing accounts** - Check if email exists before creating new user

---

## Migration from Current System

Users can still use email/password. OAuth adds alternative login:

```typescript
// Keep existing /api/auth/login for email/password
// Add /api/auth/google for OAuth

// On login page:
<GoogleLogin ... />
<div>OR</div>
<form> {/* Existing email/password form */} </form>
```

---

## Cost Breakdown

| Service | Free Tier | Paid Plans |
|---------|-----------|------------|
| Auth0 | 7,000 active users | $23/month for 500 external users |
| Google OAuth | Unlimited | Free |
| GitHub OAuth | Unlimited | Free |
| NextAuth.js | Free (open source) | Free |

**Recommendation:** Start with **Google OAuth** (free, easy). Add Auth0 later if you need multiple providers.

---

## Example: Adding Google OAuth Button to Signup

```typescript
// client/src/pages/Signup.tsx

import { GoogleLogin } from '@react-oauth/google';

// In the form, after the "Create account" button:

<div style={{
  display: "flex",
  alignItems: "center",
  gap: "1rem",
  margin: "1.5rem 0"
}}>
  <div style={{ flex: 1, height: "1px", background: "#e5e5e5" }} />
  <span style={{ color: "#666", fontSize: "0.9rem" }}>OR</span>
  <div style={{ flex: 1, height: "1px", background: "#e5e5e5" }} />
</div>

<GoogleLogin
  onSuccess={async (credentialResponse) => {
    try {
      const res = await api.post('/api/auth/google', {
        token: credentialResponse.credential
      });
      setUser(res.data.user);
      navigate(routes.preseasonRank);
    } catch (error) {
      setErr("Google login failed");
    }
  }}
  onError={() => setErr("Google login failed")}
  theme="outline"
  size="large"
  text="continue_with"
/>
```

---

## Next Steps

1. **Choose OAuth provider** (Google recommended)
2. **Set up credentials** in provider console
3. **Install npm package**
4. **Add button to signup page**
5. **Create backend endpoint**
6. **Test locally**
7. **Deploy with environment variables**

**Total setup time: ~1-2 hours for basic Google OAuth**
