/**
 * Sentry Configuration
 *
 * Error tracking and performance monitoring for the backend API.
 * Note: Sentry is initialized in instrument.js which is imported at the top of server.ts
 */
import * as Sentry from '@sentry/node';
// Export Sentry for use in server code
export { Sentry };
//# sourceMappingURL=sentry.js.map