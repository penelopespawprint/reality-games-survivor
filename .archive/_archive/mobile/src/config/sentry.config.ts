/**
 * Sentry Error Tracking Configuration
 *
 * Monitors crashes, errors, and performance in production
 * Skills: 16 (Error tracking), 18 (Mobile performance)
 */

import * as Sentry from '@sentry/react-native';

// Sentry DSN - replace with your actual DSN from sentry.io
// Get this from: https://sentry.io/settings/[org]/projects/[project]/keys/
const SENTRY_DSN = process.env.EXPO_PUBLIC_SENTRY_DSN || '';

/**
 * Initialize Sentry error tracking
 * Call this in App.tsx before rendering
 */
export const initSentry = () => {
  if (!SENTRY_DSN) {
    if (__DEV__) {
      console.log('ℹ️ Sentry DSN not configured - error tracking disabled');
    }
    return;
  }

  Sentry.init({
    dsn: SENTRY_DSN,

    // Enable in production only (or set to true for testing)
    enabled: !__DEV__,

    // Performance monitoring
    tracesSampleRate: 0.2, // 20% of transactions

    // Release tracking
    release: `rgfl-mobile@1.0.0`,

    // Environment
    environment: __DEV__ ? 'development' : 'production',

    // Attach user context on errors
    beforeSend(event) {
      // Optionally filter or modify events before sending
      return event;
    },

    // Enable native crash reporting
    enableNativeCrashHandling: true,

    // Auto session tracking
    enableAutoSessionTracking: true,
  });

  console.log('✅ Sentry initialized');
};

/**
 * Set user context for error tracking
 * Call after successful login
 */
export const setSentryUser = (user: { id: string; email: string; name: string } | null) => {
  if (user) {
    Sentry.setUser({
      id: user.id,
      email: user.email,
      username: user.name,
    });
  } else {
    Sentry.setUser(null);
  }
};

/**
 * Log a breadcrumb for debugging
 */
export const addBreadcrumb = (message: string, category: string = 'app', data?: Record<string, any>) => {
  Sentry.addBreadcrumb({
    message,
    category,
    data,
    level: 'info',
  });
};

/**
 * Capture an exception manually
 */
export const captureException = (error: Error, context?: Record<string, any>) => {
  Sentry.captureException(error, {
    extra: context,
  });
};

/**
 * Capture a message
 */
export const captureMessage = (message: string, level: Sentry.SeverityLevel = 'info') => {
  Sentry.captureMessage(message, level);
};

export default Sentry;
