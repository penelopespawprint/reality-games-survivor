/**
 * Sentry Configuration
 *
 * Error tracking and performance monitoring for the frontend.
 */

import * as Sentry from '@sentry/react';

export function initSentry() {
  // Use provided DSN or fall back to environment variable
  const dsn =
    import.meta.env.VITE_SENTRY_DSN ||
    'https://60ede8b927dfe100fbda00b199b28307@o4510618335903744.ingest.us.sentry.io/4510618379091968';

  if (!dsn) {
    console.warn('Sentry DSN not configured. Error tracking disabled.');
    return;
  }

  // Get API URL for trace propagation
  const apiUrl = import.meta.env.VITE_API_URL || 'https://rgfl-api-production.up.railway.app';

  Sentry.init({
    dsn,
    // Setting this option to true will send default PII data to Sentry.
    // For example, automatic IP address collection on events
    sendDefaultPii: true,
    environment: import.meta.env.MODE || 'development',
    integrations: [Sentry.browserTracingIntegration(), Sentry.replayIntegration()],
    // Tracing - Capture 100% of transactions in development, 10% in production
    tracesSampleRate: import.meta.env.MODE === 'production' ? 0.1 : 1.0,
    // Set 'tracePropagationTargets' to control for which URLs distributed tracing should be enabled
    tracePropagationTargets: [
      'localhost',
      /^https:\/\/rgfl-api-production\.up\.railway\.app\/api/,
      new RegExp(`^${apiUrl.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}/api`),
    ],
    // Session Replay
    // This sets the sample rate at 10%. You may want to change it to 100% while in development
    // and then sample at a lower rate in production.
    replaysSessionSampleRate: import.meta.env.MODE === 'production' ? 0.1 : 1.0,
    // If you're not already sampling the entire session, change the sample rate to 100%
    // when sampling sessions where errors occur.
    replaysOnErrorSampleRate: 1.0,
    // Enable logs to be sent to Sentry
    enableLogs: true,
    // Release tracking
    release: import.meta.env.VITE_APP_VERSION || undefined,
    // Filter out common noise
    ignoreErrors: [
      // Browser extensions
      'top.GLOBALS',
      'originalCreateNotification',
      'canvas.contentDocument',
      'MyApp_RemoveAllHighlights',
      'atomicFindClose',
      // Network errors that are handled
      'NetworkError',
      'Failed to fetch',
      // React Query errors that are handled
      'QueryError',
    ],
    beforeSend(event, _hint) {
      // Don't send errors in development unless they're critical
      if (import.meta.env.MODE === 'development') {
        console.error('Sentry would capture:', event);
        return null; // Don't send in dev
      }
      return event;
    },
  });
}

// Export Sentry for use in components
export { Sentry };
