import { Component, type ErrorInfo, type ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';
import { Sentry } from '@/lib/sentry';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  override componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({ errorInfo });

    // Log error to console
    console.error('Error Boundary caught error:', error, errorInfo);

    // Send to Sentry
    if (Sentry) {
      Sentry.captureException(error, {
        contexts: {
          react: {
            componentStack: errorInfo.componentStack,
          },
        },
        extra: {
          errorInfo: errorInfo.componentStack,
        },
      });
    }
  }

  handleReload = () => {
    window.location.reload();
  };

  handleGoHome = () => {
    window.location.href = '/';
  };

  override render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen bg-gradient-to-b from-cream-100 to-cream-200 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-elevated p-8 max-w-md w-full text-center border border-cream-200">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <AlertTriangle className="h-8 w-8 text-red-500" />
            </div>

            <h1 className="text-2xl font-display font-bold text-neutral-800 mb-2">
              Something went wrong
            </h1>

            <p className="text-neutral-500 mb-6">
              We're sorry, but something unexpected happened. Please try refreshing the page or
              going back to the home page.
            </p>

            {process.env.NODE_ENV !== 'production' && this.state.error && (
              <div className="bg-red-50 rounded-xl p-4 mb-6 text-left overflow-auto max-h-40">
                <p className="text-red-700 font-mono text-sm">{this.state.error.toString()}</p>
                {this.state.errorInfo && (
                  <pre className="text-red-600 font-mono text-xs mt-2 whitespace-pre-wrap">
                    {this.state.errorInfo.componentStack}
                  </pre>
                )}
              </div>
            )}

            <div className="flex gap-3 justify-center">
              <button
                onClick={this.handleReload}
                className="btn btn-secondary flex items-center gap-2"
              >
                <RefreshCw className="h-4 w-4" />
                Refresh Page
              </button>
              <button
                onClick={this.handleGoHome}
                className="btn btn-primary flex items-center gap-2"
              >
                <Home className="h-4 w-4" />
                Go Home
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
