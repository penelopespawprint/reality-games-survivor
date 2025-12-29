/**
 * Sentry Configuration
 *
 * Error tracking and performance monitoring for the backend API.
 */

import * as Sentry from '@sentry/node';

export function initSentry() {
  const dsn =
    process.env.SENTRY_DSN ||
    'https://fb69a1d48d5e4893dd28accaaeda8527@o4510618335903744.ingest.us.sentry.io/4510618538606592';

  Sentry.init({
    dsn,
    // Setting this option to true will send default PII data to Sentry.
    // For example, automatic IP address collection on events
    sendDefaultPii: true,
  });
}

// Export Sentry for use in server code
export { Sentry };
