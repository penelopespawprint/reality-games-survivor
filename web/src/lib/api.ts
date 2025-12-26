// API utility with automatic retry for network errors
// Uses exponential backoff: 1s, 2s, 4s

interface FetchOptions extends RequestInit {
  maxRetries?: number;
  retryDelay?: number;
}

interface ApiResponse<T = unknown> {
  data: T | null;
  error: string | null;
  status: number;
}

// Errors that should trigger a retry
const isRetryableError = (error: unknown): boolean => {
  if (error instanceof TypeError) {
    // Network errors like "Failed to fetch"
    return true;
  }
  return false;
};

// Status codes that should trigger a retry
const isRetryableStatus = (status: number): boolean => {
  // 408 Request Timeout, 429 Too Many Requests, 502-504 Server errors
  return status === 408 || status === 429 || (status >= 502 && status <= 504);
};

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Fetch with automatic retry on network errors
 * @param url - The URL to fetch
 * @param options - Fetch options plus maxRetries and retryDelay
 * @returns Promise with the Response
 */
export async function fetchWithRetry(url: string, options: FetchOptions = {}): Promise<Response> {
  const { maxRetries = 3, retryDelay = 1000, ...fetchOptions } = options;

  let lastError: Error | null = null;
  let lastResponse: Response | null = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetch(url, fetchOptions);

      // If response is ok or a non-retryable error, return immediately
      if (response.ok || !isRetryableStatus(response.status)) {
        return response;
      }

      // Store response for potential retry
      lastResponse = response;

      // If this was the last attempt, return the error response
      if (attempt === maxRetries) {
        return response;
      }

      // Wait before retry with exponential backoff
      const delay = retryDelay * Math.pow(2, attempt);
      console.warn(
        `API request to ${url} failed with status ${response.status}, retrying in ${delay}ms...`
      );
      await sleep(delay);
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      // If it's not a retryable error or we've exhausted retries, throw
      if (!isRetryableError(error) || attempt === maxRetries) {
        throw lastError;
      }

      // Wait before retry with exponential backoff
      const delay = retryDelay * Math.pow(2, attempt);
      console.warn(`Network error on ${url}, retrying in ${delay}ms...`, error);
      await sleep(delay);
    }
  }

  // This shouldn't be reached, but handle it just in case
  if (lastResponse) return lastResponse;
  throw lastError || new Error('Unknown error');
}

/**
 * Make an API request with automatic retry and JSON parsing
 * @param url - The API endpoint (will be prefixed with /api if not already)
 * @param options - Fetch options
 * @returns Parsed response with data, error, and status
 */
export async function api<T = unknown>(
  url: string,
  options: FetchOptions = {}
): Promise<ApiResponse<T>> {
  const fullUrl = url.startsWith('/api') ? url : `/api${url}`;

  try {
    const response = await fetchWithRetry(fullUrl, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    const status = response.status;

    // Handle empty responses
    const text = await response.text();
    if (!text) {
      return {
        data: null,
        error: response.ok ? null : 'Empty response',
        status,
      };
    }

    // Parse JSON
    let data: T | null = null;
    let error: string | null = null;

    try {
      const json = JSON.parse(text);
      if (response.ok) {
        data = json;
      } else {
        error = json.error || json.message || `Request failed with status ${status}`;
      }
    } catch {
      error = text;
    }

    return { data, error, status };
  } catch (err) {
    return {
      data: null,
      error: err instanceof Error ? err.message : 'Network error',
      status: 0,
    };
  }
}

/**
 * Make an authenticated API request
 * @param url - The API endpoint
 * @param token - Bearer token for authentication
 * @param options - Fetch options
 */
export async function apiWithAuth<T = unknown>(
  url: string,
  token: string,
  options: FetchOptions = {}
): Promise<ApiResponse<T>> {
  return api<T>(url, {
    ...options,
    headers: {
      ...options.headers,
      Authorization: `Bearer ${token}`,
    },
  });
}

/**
 * Convenience methods for common HTTP methods
 */
export const apiGet = <T>(url: string, token?: string) =>
  token ? apiWithAuth<T>(url, token) : api<T>(url);

export const apiPost = <T>(url: string, body: unknown, token?: string) =>
  token
    ? apiWithAuth<T>(url, token, { method: 'POST', body: JSON.stringify(body) })
    : api<T>(url, { method: 'POST', body: JSON.stringify(body) });

export const apiPatch = <T>(url: string, body: unknown, token?: string) =>
  token
    ? apiWithAuth<T>(url, token, { method: 'PATCH', body: JSON.stringify(body) })
    : api<T>(url, { method: 'PATCH', body: JSON.stringify(body) });

export const apiDelete = <T>(url: string, token?: string) =>
  token ? apiWithAuth<T>(url, token, { method: 'DELETE' }) : api<T>(url, { method: 'DELETE' });
