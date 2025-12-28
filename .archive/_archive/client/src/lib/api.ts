import axios, { AxiosError, InternalAxiosRequestConfig } from "axios";

const api = axios.create({
  baseURL: "/",
  withCredentials: true,
  timeout: 15000 // 15 second default timeout
});

export const AUTH_STORAGE_KEY = "rgfl_auth_token";
const CSRF_COOKIE_NAME = "csrf_token";
const CSRF_HEADER_NAME = "X-CSRF-Token";

/**
 * Read CSRF token from cookies
 */
function getCsrfToken(): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(new RegExp(`(^| )${CSRF_COOKIE_NAME}=([^;]+)`));
  return match ? match[2] : null;
}

export function setAuthToken(token: string | null) {
  if (token) {
    api.defaults.headers.common.Authorization = `Bearer ${token}`;
    if (typeof window !== "undefined") {
      window.localStorage.setItem(AUTH_STORAGE_KEY, token);
    }
  } else {
    delete api.defaults.headers.common.Authorization;
    if (typeof window !== "undefined") {
      window.localStorage.removeItem(AUTH_STORAGE_KEY);
    }
  }
}

if (typeof window !== "undefined") {
  const storedToken = window.localStorage.getItem(AUTH_STORAGE_KEY);
  if (storedToken) {
    api.defaults.headers.common.Authorization = `Bearer ${storedToken}`;
  }
}

// Add request interceptor for CSRF token and debugging
api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    // Add CSRF token for state-changing requests
    const method = config.method?.toUpperCase();
    if (method && ["POST", "PUT", "PATCH", "DELETE"].includes(method)) {
      const csrfToken = getCsrfToken();
      if (csrfToken) {
        config.headers.set(CSRF_HEADER_NAME, csrfToken);
      }
    }
    return config;
  },
  (error: AxiosError) => {
    return Promise.reject(error);
  }
);

// Add response interceptor for error handling and retries
api.interceptors.response.use(
  (response) => {
    return response;
  },
  async (error: AxiosError) => {
    const config = error.config as InternalAxiosRequestConfig & { _retry?: boolean; _retryCount?: number };

    // Don't retry if already retried multiple times
    if (config && !config._retry && config._retryCount !== undefined && config._retryCount >= 2) {
      return Promise.reject(error);
    }

    // Retry on network errors or 5xx errors (except for POST/PUT/DELETE to avoid duplicate actions)
    const shouldRetry = (
      error.code === 'ECONNABORTED' || // Timeout
      error.code === 'ERR_NETWORK' || // Network error
      (error.response?.status && error.response.status >= 500)
    );

    if (config && shouldRetry && (!config.method || ['get', 'head', 'options'].includes(config.method.toLowerCase()))) {
      config._retry = true;
      config._retryCount = (config._retryCount || 0) + 1;

      // Exponential backoff: 1s, 2s, 4s
      const delay = Math.min(1000 * Math.pow(2, config._retryCount - 1), 4000);

      await new Promise(resolve => setTimeout(resolve, delay));

      return api.request(config);
    }

    // Handle 401 unauthorized - clear auth token
    if (error.response?.status === 401) {
      const currentPath = typeof window !== 'undefined' ? window.location.pathname : '';
      // Don't clear token on login/signup pages
      if (!currentPath.includes('/login') && !currentPath.includes('/signup')) {
        setAuthToken(null);
      }
    }

    return Promise.reject(error);
  }
);

export default api;
