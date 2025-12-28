/**
 * API Service - Axios HTTP Client
 *
 * Handles all HTTP requests to the RGFL backend API
 * Features:
 * - JWT token management (secure storage)
 * - Request/response interceptors
 * - Error handling
 * - Automatic token refresh (future)
 */

import axios, { AxiosInstance, AxiosError, InternalAxiosRequestConfig, AxiosResponse } from 'axios';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import { API_CONFIG } from '../config/api.config';

// Storage key for JWT token
export const AUTH_STORAGE_KEY = 'rgfl_auth_token';

// Callback for handling unauthorized (401) responses
let onUnauthorizedCallback: (() => void) | null = null;

/**
 * Set callback for unauthorized responses
 * Called from AuthContext to trigger logout
 */
export const setOnUnauthorized = (callback: (() => void) | null): void => {
  onUnauthorizedCallback = callback;
};

// Alias for backward compatibility
export const setOnUnauthorizedCallback = setOnUnauthorized;

// Current league context
let currentLeagueId: string | null = null;

/**
 * Set current league ID for API requests
 */
export const setCurrentLeagueId = (leagueId: string | null): void => {
  currentLeagueId = leagueId;
};

/**
 * Clear all API state (tokens, league context)
 */
export const clearApiState = async (): Promise<void> => {
  await setAuthToken(null);
  currentLeagueId = null;
};

/**
 * Secure storage wrapper
 * Uses SecureStore on native, falls back to memory on web
 */
let webTokenCache: string | null = null;

const secureStorage = {
  async getItem(key: string): Promise<string | null> {
    if (Platform.OS === 'web') {
      return webTokenCache;
    }
    return await SecureStore.getItemAsync(key);
  },
  async setItem(key: string, value: string): Promise<void> {
    if (Platform.OS === 'web') {
      webTokenCache = value;
      return;
    }
    await SecureStore.setItemAsync(key, value);
  },
  async removeItem(key: string): Promise<void> {
    if (Platform.OS === 'web') {
      webTokenCache = null;
      return;
    }
    await SecureStore.deleteItemAsync(key);
  },
};

/**
 * Create Axios instance with default configuration
 */
const api: AxiosInstance = axios.create({
  baseURL: API_CONFIG.BASE_URL,
  timeout: API_CONFIG.TIMEOUT,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Debug: Log the base URL and test connectivity
if (__DEV__) {
  console.log('🌐 API BASE URL:', API_CONFIG.BASE_URL);

  // Test network connectivity on startup with visible alert
  fetch(`${API_CONFIG.BASE_URL}/health`)
    .then(res => res.json())
    .then(data => {
      console.log('✅ Network test passed:', data);
      // Show success alert
      setTimeout(() => {
        const { Alert } = require('react-native');
        Alert.alert('Network OK', `Connected to:\n${API_CONFIG.BASE_URL}`);
      }, 1000);
    })
    .catch(err => {
      console.error('❌ Network test FAILED:', err.message, err);
      // Show error alert
      setTimeout(() => {
        const { Alert } = require('react-native');
        Alert.alert('Network FAILED', `URL: ${API_CONFIG.BASE_URL}\n\nError: ${err.message}`);
      }, 1000);
    });
}

/**
 * Request Interceptor
 * Adds JWT token to all requests if available
 */
api.interceptors.request.use(
  async (config: InternalAxiosRequestConfig) => {
    try {
      const token = await secureStorage.getItem(AUTH_STORAGE_KEY);

      if (token && config.headers) {
        config.headers.Authorization = `Bearer ${token}`;
      }

      // Log request in development
      if (__DEV__) {
        console.log(`🚀 ${config.method?.toUpperCase()} ${config.url}`);
      }

      return config;
    } catch (error) {
      if (__DEV__) console.error('Error reading auth token:', error);
      return config;
    }
  },
  (error: AxiosError) => {
    if (__DEV__) console.error('Request interceptor error:', error);
    return Promise.reject(error);
  }
);

/**
 * Response Interceptor
 * Handles errors and logs responses in development
 */
api.interceptors.response.use(
  (response: AxiosResponse) => {
    // Log successful responses in development
    if (__DEV__) {
      console.log(`✅ ${response.config.method?.toUpperCase()} ${response.config.url} - ${response.status}`);
    }
    return response;
  },
  async (error: AxiosError) => {
    // Log errors in development with full detail
    if (__DEV__) {
      const method = error.config?.method?.toUpperCase() ?? 'UNKNOWN';
      const url = error.config?.url ?? 'unknown';
      const fullUrl = error.config?.baseURL ? `${error.config.baseURL}${url}` : url;
      console.error(`❌ NETWORK ERROR: ${method} ${fullUrl}`, {
        status: error.response?.status,
        message: error.message,
        code: error.code,
        isAxiosError: error.isAxiosError,
        responseData: error.response?.data,
        baseURL: error.config?.baseURL,
      });
    }

    // Handle 401 Unauthorized - clear token and trigger logout
    if (error.response?.status === 401) {
      // Don't logout for login/auth check requests
      const isAuthRequest = error.config?.url?.includes('/api/auth/');
      if (!isAuthRequest) {
        await secureStorage.removeItem(AUTH_STORAGE_KEY);
        delete api.defaults.headers.common.Authorization;
        if (__DEV__) console.log('⚠️ Token expired - logging out');
        onUnauthorizedCallback?.();
      }
    }

    return Promise.reject(error);
  }
);

/**
 * Store authentication token
 */
export const setAuthToken = async (token: string | null): Promise<void> => {
  try {
    if (token) {
      await secureStorage.setItem(AUTH_STORAGE_KEY, token);
      api.defaults.headers.common.Authorization = `Bearer ${token}`;
      if (__DEV__) console.log('✅ Auth token stored securely');
    } else {
      await secureStorage.removeItem(AUTH_STORAGE_KEY);
      delete api.defaults.headers.common.Authorization;
      if (__DEV__) console.log('✅ Auth token removed');
    }
  } catch (error) {
    if (__DEV__) console.error('Error storing auth token:', error);
  }
};

/**
 * Get current authentication token
 */
export const getAuthToken = async (): Promise<string | null> => {
  try {
    return await secureStorage.getItem(AUTH_STORAGE_KEY);
  } catch (error) {
    if (__DEV__) console.error('Error reading auth token:', error);
    return null;
  }
};

/**
 * Initialize API client
 * Call this on app startup to restore auth token from storage
 */
export const initializeApi = async (): Promise<void> => {
  try {
    const token = await secureStorage.getItem(AUTH_STORAGE_KEY);
    if (token) {
      api.defaults.headers.common.Authorization = `Bearer ${token}`;
      if (__DEV__) console.log('✅ API initialized with secure token');
    } else {
      if (__DEV__) console.log('ℹ️ No stored token found');
    }
  } catch (error) {
    if (__DEV__) console.error('Error initializing API:', error);
  }
};

export default api;
