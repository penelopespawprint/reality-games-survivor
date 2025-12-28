/**
 * ErrorState Component
 *
 * User-friendly error display with recovery options.
 * Converts technical errors into actionable guidance.
 */

import React from 'react';

interface ErrorStateProps {
  title?: string;
  message?: string;
  error?: Error | string | null;
  onRetry?: () => void;
  onGoBack?: () => void;
  onGoHome?: () => void;
  showDetails?: boolean;
  className?: string;
}

export const ErrorState: React.FC<ErrorStateProps> = ({
  title = 'Something went wrong',
  message,
  error,
  onRetry,
  onGoBack,
  onGoHome,
  showDetails = false,
  className = '',
}) => {
  const errorMessage = error instanceof Error ? error.message : error;
  const displayMessage = message || 'We encountered an unexpected error. Please try again.';

  return (
    <div
      className={`flex flex-col items-center justify-center py-12 px-4 text-center ${className}`}
      role="alert"
      aria-live="polite"
    >
      {/* Error Icon */}
      <div className="mb-4 text-red-500" aria-hidden="true">
        <svg
          className="w-16 h-16"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
          />
        </svg>
      </div>

      <h3 className="text-lg font-semibold text-gray-900 mb-2">{title}</h3>
      <p className="text-gray-600 max-w-md mb-6">{displayMessage}</p>

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row gap-3">
        {onRetry && (
          <button
            onClick={onRetry}
            className="px-6 py-2 bg-orange-500 text-white font-medium rounded-lg hover:bg-orange-600 transition-colors focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2"
          >
            Try Again
          </button>
        )}
        {onGoBack && (
          <button
            onClick={onGoBack}
            className="px-6 py-2 bg-white text-gray-700 font-medium rounded-lg border border-gray-300 hover:bg-gray-50 transition-colors focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
          >
            Go Back
          </button>
        )}
        {onGoHome && (
          <button
            onClick={onGoHome}
            className="px-6 py-2 bg-white text-gray-700 font-medium rounded-lg border border-gray-300 hover:bg-gray-50 transition-colors focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
          >
            Go to Dashboard
          </button>
        )}
      </div>

      {/* Technical Details (collapsible) */}
      {showDetails && errorMessage && (
        <details className="mt-6 text-left max-w-md w-full">
          <summary className="cursor-pointer text-sm text-gray-500 hover:text-gray-700">
            Technical details
          </summary>
          <pre className="mt-2 p-3 bg-gray-100 rounded-lg text-xs text-gray-700 overflow-auto">
            {errorMessage}
          </pre>
        </details>
      )}
    </div>
  );
};

/**
 * Pre-built error states for common scenarios
 */

export const NetworkError: React.FC<{
  onRetry?: () => void;
}> = ({ onRetry }) => (
  <ErrorState
    title="Connection Problem"
    message="We couldn't connect to the server. Please check your internet connection and try again."
    onRetry={onRetry}
  />
);

export const NotFoundError: React.FC<{
  resource?: string;
  onGoBack?: () => void;
  onGoHome?: () => void;
}> = ({ resource = 'page', onGoBack, onGoHome }) => (
  <ErrorState
    title={`${resource.charAt(0).toUpperCase() + resource.slice(1)} Not Found`}
    message={`The ${resource} you're looking for doesn't exist or has been removed.`}
    onGoBack={onGoBack}
    onGoHome={onGoHome}
  />
);

export const UnauthorizedError: React.FC<{
  onLogin?: () => void;
}> = ({ onLogin }) => (
  <ErrorState
    title="Access Denied"
    message="You don't have permission to view this content. Please log in or contact an administrator."
    onRetry={onLogin}
  />
);

export const ServerError: React.FC<{
  onRetry?: () => void;
  error?: Error | string | null;
}> = ({ onRetry, error }) => (
  <ErrorState
    title="Server Error"
    message="Our servers are having trouble right now. Please try again in a few moments."
    error={error}
    onRetry={onRetry}
    showDetails={process.env.NODE_ENV === 'development'}
  />
);

export const LoadingError: React.FC<{
  resource?: string;
  onRetry?: () => void;
  error?: Error | string | null;
}> = ({ resource = 'data', onRetry, error }) => (
  <ErrorState
    title={`Failed to Load ${resource.charAt(0).toUpperCase() + resource.slice(1)}`}
    message={`We couldn't load the ${resource}. Please try again.`}
    error={error}
    onRetry={onRetry}
    showDetails={process.env.NODE_ENV === 'development'}
  />
);

export const SubmissionError: React.FC<{
  onRetry?: () => void;
  error?: Error | string | null;
}> = ({ onRetry, error }) => (
  <ErrorState
    title="Submission Failed"
    message="We couldn't save your changes. Please try again."
    error={error}
    onRetry={onRetry}
    showDetails={process.env.NODE_ENV === 'development'}
  />
);

/**
 * Error Boundary Component for catching React errors
 */
interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    this.props.onError?.(error, errorInfo);
    // Log to error tracking service (Sentry, etc.)
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <ErrorState
          title="Something went wrong"
          message="This part of the app crashed. Try refreshing the page."
          error={this.state.error}
          onRetry={this.handleRetry}
          showDetails={process.env.NODE_ENV === 'development'}
        />
      );
    }

    return this.props.children;
  }
}

export default ErrorState;
