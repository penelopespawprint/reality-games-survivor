import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import { ErrorBoundary } from './components/ErrorBoundary';
import { initSentry } from './lib/sentry';
import './index.css';

// Initialize Sentry before anything else
initSentry();

// Retry logic for network errors
const shouldRetry = (failureCount: number, error: unknown): boolean => {
  // Don't retry more than 3 times
  if (failureCount >= 3) return false;

  // Retry on network errors
  if (error instanceof TypeError && error.message.includes('fetch')) {
    return true;
  }

  // Retry on specific status codes
  if (error instanceof Error) {
    const message = error.message.toLowerCase();
    if (
      message.includes('network') ||
      message.includes('timeout') ||
      message.includes('503') ||
      message.includes('502') ||
      message.includes('504')
    ) {
      return true;
    }
  }

  return false;
};

// Exponential backoff: 1s, 2s, 4s
const retryDelay = (attemptIndex: number): number => {
  return Math.min(1000 * Math.pow(2, attemptIndex), 8000);
};

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60, // 1 minute
      retry: shouldRetry,
      retryDelay,
    },
    mutations: {
      retry: shouldRetry,
      retryDelay,
    },
  },
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </QueryClientProvider>
    </ErrorBoundary>
  </StrictMode>
);
