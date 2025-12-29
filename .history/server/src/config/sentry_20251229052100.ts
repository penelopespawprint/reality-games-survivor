/**
 * Sentry Configuration
 *
 * Error tracking and performance monitoring for the backend API.
 */

import * as Sentry from '@sentry/node';
import { nodeProfilingIntegration } from '@sentry/profiling-node';

export function initSentry() {
  const dsn = process.env.SENTRY_DSN;
  
  if (!dsn) {
    console.warn('Sentry DSN not configured. Error tracking disabled.');
    return;
  }

  Sentry.init({
    dsn,
    environment: process.env.NODE_ENV || 'development',
    integrations: [
      nodeProfilingIntegration(),
    ],
    // Performance Monitoring
    tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
    // Profiling
    profilesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
    // Release tracking
    release: process.env.RAILWAY_GIT_COMMIT_SHA || process.env.VERSION || undefined,
    // Filter out common noise
    ignoreErrors: [
      // Validation errors that are handled
      'ValidationError',
      'ZodError',
      // Rate limiting
      'TooManyRequests',
      // Network errors
      'ECONNREFUSED',
      'ETIMEDOUT',
    ],
    beforeSend(event, _hint) {
      // Don't send errors in development unless they're critical
      if (process.env.NODE_ENV === 'development') {
        console.error('Sentry would capture:', event);
        return null; // Don't send in dev
      }
      return event;
    },
  });
}

// Export Sentry for use in server code
export { Sentry };
