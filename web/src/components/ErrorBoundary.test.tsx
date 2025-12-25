import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { ErrorBoundary, QueryError, LoadingSkeleton, EmptyState } from './ErrorBoundary';

// Wrapper for components that need router context
function RouterWrapper({ children }: { children: React.ReactNode }) {
  return <BrowserRouter>{children}</BrowserRouter>;
}

describe('ErrorBoundary', () => {
  it('renders children when there is no error', () => {
    render(
      <RouterWrapper>
        <ErrorBoundary>
          <div>Test Content</div>
        </ErrorBoundary>
      </RouterWrapper>
    );

    expect(screen.getByText('Test Content')).toBeInTheDocument();
  });

  it('renders fallback when there is an error', () => {
    // Suppress console.error for this test
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const ThrowError = () => {
      throw new Error('Test error');
    };

    render(
      <RouterWrapper>
        <ErrorBoundary>
          <ThrowError />
        </ErrorBoundary>
      </RouterWrapper>
    );

    expect(screen.getByText('Something went wrong')).toBeInTheDocument();

    consoleSpy.mockRestore();
  });

  it('renders custom fallback when provided', () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const ThrowError = () => {
      throw new Error('Test error');
    };

    render(
      <RouterWrapper>
        <ErrorBoundary fallback={<div>Custom Fallback</div>}>
          <ThrowError />
        </ErrorBoundary>
      </RouterWrapper>
    );

    expect(screen.getByText('Custom Fallback')).toBeInTheDocument();

    consoleSpy.mockRestore();
  });
});

describe('QueryError', () => {
  it('renders error message', () => {
    const error = new Error('Failed to fetch data');

    render(<QueryError error={error} />);

    expect(screen.getByText('Failed to fetch data')).toBeInTheDocument();
  });

  it('renders retry button when resetErrorBoundary is provided', () => {
    const error = new Error('Test error');
    const reset = vi.fn();

    render(<QueryError error={error} resetErrorBoundary={reset} />);

    const retryButton = screen.getByText('Try Again');
    expect(retryButton).toBeInTheDocument();

    fireEvent.click(retryButton);
    expect(reset).toHaveBeenCalled();
  });

  it('renders compact version', () => {
    const error = new Error('Test error');

    render(<QueryError error={error} compact />);

    expect(screen.getByText('Test error')).toBeInTheDocument();
  });

  it('shows default message when error is null', () => {
    render(<QueryError error={null} />);

    expect(screen.getByText('Something went wrong while loading the data.')).toBeInTheDocument();
  });
});

describe('LoadingSkeleton', () => {
  it('renders card skeleton by default', () => {
    const { container } = render(<LoadingSkeleton />);

    expect(container.querySelector('.animate-pulse')).toBeInTheDocument();
  });

  it('renders multiple skeletons based on count', () => {
    const { container } = render(<LoadingSkeleton count={3} />);

    // The animate-pulse parent should contain 3 children
    const skeleton = container.querySelector('.animate-pulse');
    expect(skeleton?.children.length).toBe(3);
  });

  it('renders page skeleton', () => {
    const { container } = render(<LoadingSkeleton type="page" />);

    expect(container.querySelector('.animate-pulse')).toBeInTheDocument();
  });

  it('renders list skeleton', () => {
    const { container } = render(<LoadingSkeleton type="list" count={2} />);

    expect(container.querySelector('.animate-pulse')).toBeInTheDocument();
  });
});

describe('EmptyState', () => {
  it('renders title', () => {
    render(<EmptyState title="No results found" />);

    expect(screen.getByText('No results found')).toBeInTheDocument();
  });

  it('renders description when provided', () => {
    render(
      <EmptyState title="No results" description="Try adjusting your search" />
    );

    expect(screen.getByText('Try adjusting your search')).toBeInTheDocument();
  });

  it('renders action when provided', () => {
    render(
      <EmptyState
        title="No items"
        action={<button>Add Item</button>}
      />
    );

    expect(screen.getByText('Add Item')).toBeInTheDocument();
  });
});
