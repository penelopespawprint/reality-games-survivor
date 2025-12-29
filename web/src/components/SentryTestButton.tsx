/**
 * Sentry Test Button Component
 *
 * Add this component to your app to test Sentry's error tracking.
 * This is a development/testing tool - remove in production or gate behind admin access.
 */

import { Sentry } from '@/lib/sentry';

export function SentryTestButton() {
  const handleTestError = () => {
    if (Sentry) {
      // Send a log before throwing the error
      Sentry.logger.info('User triggered test error', {
        action: 'test_error_button_click',
      });
      // Send a test metric before throwing the error
      Sentry.metrics.count('test_counter', 1);
      throw new Error('This is your first error!');
    } else {
      console.error('Sentry not initialized');
    }
  };

  // Only show in development or if explicitly enabled
  if (import.meta.env.MODE === 'production' && !import.meta.env.VITE_ENABLE_SENTRY_TEST) {
    return null;
  }

  return (
    <button
      onClick={handleTestError}
      className="fixed bottom-4 right-4 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg shadow-lg text-sm font-semibold z-50"
      title="Test Sentry Error Tracking"
    >
      Break the world
    </button>
  );
}
