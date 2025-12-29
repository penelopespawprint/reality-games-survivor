/**
 * Sentry Instrumentation
 * 
 * This file must be imported at the very top of your application
 * to enable automatic instrumentation of Node.js APIs.
 */

import * as Sentry from '@sentry/node';

// Initialize Sentry with auto-instrumentation
const dsn = process.env.SENTRY_DSN || 'https://9510dc570d99c3c8c341b7eede7cb2f2@o4510618335903744.ingest.us.sentry.io/4510620242935808';

if (!dsn) {
  console.warn('Sentry DSN not configured');
} else {
  console.log('Initializing Sentry with DSN:', dsn.substring(0, 20) + '...');

  Sentry.init({
    dsn,
    // Setting this option to true will send default PII data to Sentry.
    // For example, automatic IP address collection on events
    sendDefaultPii: true,
    // Enable debug mode to see Sentry initialization logs
    debug: process.env.NODE_ENV !== 'production' || false,
    // Performance Monitoring
    tracesSampleRate: 1.0,
  });

  console.log('Sentry initialized successfully');
}
