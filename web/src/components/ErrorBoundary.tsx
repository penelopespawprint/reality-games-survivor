import { Component, type ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';
import { Link } from 'react-router-dom';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Log error to console in development, could send to error tracking service in production
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen bg-cream-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-elevated p-8 max-w-md w-full text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <AlertTriangle className="h-8 w-8 text-red-500" />
            </div>
            <h1 className="text-2xl font-display font-bold text-neutral-800 mb-2">
              Something went wrong
            </h1>
            <p className="text-neutral-500 mb-6">
              We encountered an unexpected error. Please try again or return to the dashboard.
            </p>
            {process.env.NODE_ENV === 'development' && this.state.error && (
              <div className="bg-neutral-100 rounded-lg p-4 mb-6 text-left">
                <p className="text-sm font-mono text-red-600 break-all">
                  {this.state.error.message}
                </p>
              </div>
            )}
            <div className="flex gap-3 justify-center">
              <button
                onClick={this.handleReset}
                className="btn btn-secondary flex items-center gap-2"
              >
                <RefreshCw className="h-4 w-4" />
                Try Again
              </button>
              <Link to="/dashboard" className="btn btn-primary flex items-center gap-2">
                <Home className="h-4 w-4" />
                Dashboard
              </Link>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// Hook-friendly error fallback component for use with React Query
interface QueryErrorProps {
  error: Error | null;
  resetErrorBoundary?: () => void;
  compact?: boolean;
}

export function QueryError({ error, resetErrorBoundary, compact = false }: QueryErrorProps) {
  if (compact) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-3">
        <AlertTriangle className="h-5 w-5 text-red-500 flex-shrink-0" />
        <div className="flex-1">
          <p className="text-sm text-red-700">
            {error?.message || 'Failed to load data'}
          </p>
        </div>
        {resetErrorBoundary && (
          <button
            onClick={resetErrorBoundary}
            className="text-red-600 hover:text-red-700 text-sm font-medium"
          >
            Retry
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl shadow-card p-8 text-center border border-cream-200">
      <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
        <AlertTriangle className="h-6 w-6 text-red-500" />
      </div>
      <h3 className="font-semibold text-neutral-800 mb-2">Failed to load</h3>
      <p className="text-neutral-500 mb-4 text-sm">
        {error?.message || 'Something went wrong while loading the data.'}
      </p>
      {resetErrorBoundary && (
        <button
          onClick={resetErrorBoundary}
          className="btn btn-secondary btn-sm flex items-center gap-2 mx-auto"
        >
          <RefreshCw className="h-4 w-4" />
          Try Again
        </button>
      )}
    </div>
  );
}

// Loading skeleton component for consistent loading states
interface LoadingSkeletonProps {
  type?: 'card' | 'list' | 'page';
  count?: number;
}

export function LoadingSkeleton({ type = 'card', count = 1 }: LoadingSkeletonProps) {
  const items = Array.from({ length: count }, (_, i) => i);

  if (type === 'page') {
    return (
      <div className="animate-pulse space-y-6">
        <div className="h-8 bg-neutral-200 rounded w-1/3" />
        <div className="h-4 bg-neutral-200 rounded w-1/2" />
        <div className="space-y-4">
          {items.map((i) => (
            <div key={i} className="bg-white rounded-2xl p-6 space-y-4">
              <div className="h-6 bg-neutral-200 rounded w-2/3" />
              <div className="h-4 bg-neutral-200 rounded w-full" />
              <div className="h-4 bg-neutral-200 rounded w-3/4" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (type === 'list') {
    return (
      <div className="animate-pulse space-y-3">
        {items.map((i) => (
          <div key={i} className="flex items-center gap-4 p-4 bg-white rounded-xl">
            <div className="w-10 h-10 bg-neutral-200 rounded-full" />
            <div className="flex-1 space-y-2">
              <div className="h-4 bg-neutral-200 rounded w-1/3" />
              <div className="h-3 bg-neutral-200 rounded w-1/2" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="animate-pulse">
      {items.map((i) => (
        <div key={i} className="bg-white rounded-2xl p-6 space-y-4 mb-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-neutral-200 rounded-xl" />
            <div className="flex-1 space-y-2">
              <div className="h-5 bg-neutral-200 rounded w-1/3" />
              <div className="h-3 bg-neutral-200 rounded w-1/4" />
            </div>
          </div>
          <div className="h-4 bg-neutral-200 rounded w-full" />
          <div className="h-4 bg-neutral-200 rounded w-2/3" />
        </div>
      ))}
    </div>
  );
}

// Empty state component for consistent empty states
interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="bg-white rounded-2xl shadow-card p-12 text-center border border-cream-200">
      {icon && (
        <div className="w-16 h-16 bg-cream-100 rounded-full flex items-center justify-center mx-auto mb-4">
          {icon}
        </div>
      )}
      <h3 className="font-semibold text-neutral-800 mb-2">{title}</h3>
      {description && <p className="text-neutral-500 mb-6">{description}</p>}
      {action}
    </div>
  );
}
