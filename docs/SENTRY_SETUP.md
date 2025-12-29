# Sentry Integration Setup

Sentry has been integrated into both the frontend and backend for error tracking and performance monitoring.

## Getting Your Sentry DSN

1. Go to [Sentry Dashboard](https://sentry.io)
2. Navigate to your project: **follow-the-unicorn-productions**
3. Go to **Settings** → **Projects** → Select your project
4. Go to **Client Keys (DSN)**
5. Copy the **DSN** (it looks like: `https://xxxxx@xxxxx.ingest.sentry.io/xxxxx`)

## Environment Variables

### Frontend (Web)

Add to Railway service environment variables or `.env` file:

```bash
VITE_SENTRY_DSN=https://xxxxx@xxxxx.ingest.sentry.io/xxxxx
```

### Backend (API)

Add to Railway service environment variables or `.env` file:

```bash
SENTRY_DSN=https://xxxxx@xxxxx.ingest.sentry.io/xxxxx
```

## What's Tracked

### Frontend
- React component errors (via ErrorBoundary)
- Unhandled JavaScript errors
- Performance metrics (page loads, API calls)
- Session replay (on errors and 10% of sessions)
- User context (user ID, email when available)

### Backend
- Unhandled exceptions
- Unhandled promise rejections
- Express route errors
- Performance monitoring (API response times)
- Profiling (10% of requests in production)

## Configuration

- **Development**: Errors are logged to console but NOT sent to Sentry
- **Production**: Errors are sent to Sentry with full context
- **Sample Rates**: 
  - Performance traces: 10% in production, 100% in development
  - Session replay: 10% in production, 100% in development

## Testing

To test Sentry is working:

1. Set the DSN environment variables
2. Deploy to production
3. Trigger a test error (e.g., visit a non-existent route)
4. Check your Sentry dashboard for the error

## Sentry Token

Your Sentry auth token (for CLI/API access):
```
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
```

This token can be used with the Sentry CLI for releases and source maps.
