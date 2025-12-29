/**
 * Sentry Configuration
 *
 * Error tracking and performance monitoring for the frontend.
 */

import * as Sentry from '@sentry/react';

export function initSentry() {
  const dsn = import.meta.env.VITE_SENTRY_DSN;
  
  if (!dsn) {
    console.warn('Sentry DSN not configured. Error tracking disabled.');
    return;
  }

  Sentry.init({
    dsn,
    environment: import.meta.env.MODE || 'development',
    integrations: [
      Sentry.browserTracingIntegration(),
      Sentry.replayIntegration({
        maskAllText: true,
        blockAllMedia: true,
      }),
    ],
    // Performance Monitoring
    tracesSampleRate: import.meta.env.MODE === 'production' ? 0.1 : 1.0,
    // Session Replay
    replaysSessionSampleRate: import.meta.env.MODE === 'production' ? 0.1 : 1.0,
    replaysOnErrorSampleRate: 1.0,
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
