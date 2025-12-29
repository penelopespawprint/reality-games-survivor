import * as Sentry from '@sentry/react';

// Add this button component to your app to test Sentry's error tracking
export function ErrorButton() {
  const handleClick = () => {
    // Create a span to measure performance
    Sentry.startSpan(
      {
        op: 'ui.click',
        name: 'Error Button Click',
      },
      (span) => {
        span.setAttribute('button.type', 'error_test');
        span.setAttribute('button.purpose', 'sentry_testing');

        const error = new Error('This is your first error!');
        // Capture exception with context
        Sentry.captureException(error, {
          tags: {
            component: 'ErrorButton',
            test: true,
          },
          extra: {
            timestamp: new Date().toISOString(),
          },
        });
        throw error;
      }
    );
  };

  return <button onClick={handleClick}>Break the world</button>;
}
