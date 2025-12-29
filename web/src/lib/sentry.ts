/**
 * Sentry Configuration
 *
 * Error tracking, performance monitoring, metrics, and logging for the frontend.
 *
 * Usage:
 * - Error tracking: Sentry.captureException(error)
 * - Tracing: Sentry.startSpan({ op: "ui.click", name: "Button Click" }, () => { ... })
 * - Logging: Sentry.logger.info("Message", { context })
 * - Metrics: metrics.count('button_click'), metrics.gauge('value', 100), metrics.distribution('time', 200)
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
    // Enable logging
    enableLogs: true,
    // Integrations
    integrations: [
      Sentry.browserTracingIntegration(),
      Sentry.replayIntegration({
        maskAllText: false,
        blockAllMedia: false,
      }),
      // Send console.log, console.error, and console.warn calls as logs to Sentry
      Sentry.consoleLoggingIntegration({ levels: ['log', 'error', 'warn'] }),
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

/**
 * Metrics helper for tracking custom metrics in Sentry
 * 
 * Usage:
 * - metrics.count('button_click', 1) - Count occurrences
 * - metrics.gauge('active_users', 42) - Track current values
 * - metrics.distribution('api_response_time', 150) - Track distributions
 * - metrics.set('unique_users', 'user-123') - Track unique values
 */
export const metrics = {
  /**
   * Count metric - tracks occurrences of an event
   * @example metrics.count('draft_save', 1)
   * @example metrics.count('league_join', 1, { league_type: 'public' })
   */
  count: (name: string, value: number = 1, tags?: Record<string, string>) => {
    if (Sentry.metrics) {
      Sentry.metrics.increment(name, value, { tags });
    }
  },

  /**
   * Gauge metric - tracks a value at a point in time
   * @example metrics.gauge('active_leagues', 42)
   * @example metrics.gauge('queue_size', 15, { queue: 'email' })
   */
  gauge: (name: string, value: number, tags?: Record<string, string>) => {
    if (Sentry.metrics) {
      Sentry.metrics.gauge(name, value, { tags });
    }
  },

  /**
   * Distribution metric - tracks the distribution of values
   * @example metrics.distribution('page_load_time', 1500)
   * @example metrics.distribution('api_response_time', 200, { endpoint: '/api/leagues' })
   */
  distribution: (name: string, value: number, tags?: Record<string, string>) => {
    if (Sentry.metrics) {
      Sentry.metrics.distribution(name, value, { tags });
    }
  },

  /**
   * Set metric - tracks unique values
   * @example metrics.set('unique_users', 'user-123')
   * @example metrics.set('unique_leagues', 'league-abc', { season: '50' })
   */
  set: (name: string, value: string | number, tags?: Record<string, string>) => {
    if (Sentry.metrics) {
      Sentry.metrics.set(name, value, { tags });
    }
  },

  /**
   * Time a function and report as distribution
   * @example const result = await metrics.timing('api_call', async () => fetch('/api/data'))
   */
  timing: async <T>(name: string, fn: () => Promise<T>, tags?: Record<string, string>): Promise<T> => {
    const start = performance.now();
    try {
      const result = await fn();
      const duration = performance.now() - start;
      if (Sentry.metrics) {
        Sentry.metrics.distribution(name, duration, { tags: { ...tags, status: 'success' } });
      }
      return result;
    } catch (error) {
      const duration = performance.now() - start;
      if (Sentry.metrics) {
        Sentry.metrics.distribution(name, duration, { tags: { ...tags, status: 'error' } });
      }
      throw error;
    }
  },
};

/**
 * Track page load time - call this in your main App component
 */
export function trackPageLoad() {
  if (typeof window !== 'undefined' && window.performance) {
    const timing = window.performance.timing;
    const pageLoadTime = timing.loadEventEnd - timing.navigationStart;
    
    if (pageLoadTime > 0) {
      metrics.distribution('page_load_time', pageLoadTime);
    }
  }
}
