import { Component, type ErrorInfo, type ReactNode } from 'react';
import { AlertTriangle, RefreshCw, ArrowLeft } from 'lucide-react';
import { Navigation } from './Navigation';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class AdminErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  override componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({ errorInfo });
    console.error('Admin Error Boundary caught error:', error, errorInfo);
  }

  handleReload = () => {
    window.location.reload();
  };

  handleGoBack = () => {
    window.location.href = '/admin';
  };

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  override render() {
    if (this.state.hasError) {
      return (
        <>
          <Navigation />
          <div className="min-h-screen bg-gradient-to-b from-cream-100 to-cream-200 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-elevated p-8 max-w-lg w-full border border-cream-200">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <AlertTriangle className="h-8 w-8 text-red-500" />
              </div>

              <h1 className="text-2xl font-display font-bold text-neutral-800 mb-2 text-center">
                Admin Error
              </h1>

              <p className="text-neutral-500 mb-6 text-center">
                Something went wrong while loading this admin page. This error has been logged for
                review.
              </p>

              {process.env.NODE_ENV !== 'production' && this.state.error && (
                <div className="bg-red-50 rounded-xl p-4 mb-6 overflow-auto max-h-48">
                  <p className="text-red-700 font-mono text-sm font-medium mb-2">
                    {this.state.error.name}: {this.state.error.message}
                  </p>
                  {this.state.errorInfo && (
                    <pre className="text-red-600 font-mono text-xs whitespace-pre-wrap">
                      {this.state.errorInfo.componentStack}
                    </pre>
                  )}
                </div>
              )}

              <div className="flex flex-col gap-3">
                <button
                  onClick={this.handleReset}
                  className="btn btn-primary w-full flex items-center justify-center gap-2"
                >
                  <RefreshCw className="h-4 w-4" />
                  Try Again
                </button>
                <button
                  onClick={this.handleGoBack}
                  className="btn btn-secondary w-full flex items-center justify-center gap-2"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Back to Admin Dashboard
                </button>
              </div>
            </div>
          </div>
        </>
      );
    }

    return this.props.children;
  }
}

export default AdminErrorBoundary;
