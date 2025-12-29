/**
 * Sentry Configuration
 *
 * Error tracking and performance monitoring for the frontend.
 */

import * as Sentry from '@sentry/react';

export function initSentry() {
  const dsn =
    import.meta.env.VITE_SENTRY_DSN ||
    'https://9510dc570d99c3c8c341b7eede7cb2f2@o4510618335903744.ingest.us.sentry.io/4510620242935808';

  if (!dsn) {
    console.warn('Sentry DSN not configured');
    return;
  }

  console.log('Initializing Sentry with DSN:', dsn.substring(0, 20) + '...');

  Sentry.init({
    dsn,
    // Setting this option to true will send default PII data to Sentry.
    // For example, automatic IP address collection on events
    sendDefaultPii: true,
    // Enable debug mode to see Sentry initialization logs
    debug: import.meta.env.DEV || false,
    // Enable React integration for better error tracking
    integrations: [
      Sentry.browserTracingIntegration(),
      Sentry.replayIntegration({
        maskAllText: false,
        blockAllMedia: false,
      }),
    ],
    // Performance Monitoring
    tracesSampleRate: 1.0,
    // Session Replay
    replaysSessionSampleRate: 0.1,
    replaysOnErrorSampleRate: 1.0,
  });

  console.log('Sentry initialized successfully');
}

// Export Sentry for use in components
export { Sentry };
