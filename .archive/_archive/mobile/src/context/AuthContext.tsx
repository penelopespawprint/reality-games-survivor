/**
 * Authentication Context
 *
 * Manages user authentication state across the app using Auth0
 * Provides login, logout, and user state management
 */

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { Alert } from 'react-native';
import Auth0, { Auth0Provider as Auth0ProviderOriginal, useAuth0 } from 'react-native-auth0';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api, { setAuthToken, clearApiState, setCurrentLeagueId } from '../services/api';
import { API_CONFIG } from '../config/api.config';

// Auth0 Configuration
const AUTH0_DOMAIN = 'dev-w01qewse7es4d0ue.us.auth0.com';
const AUTH0_CLIENT_ID = 'yAEo8VblIwCANCgujhSQPqRYTCORR1H8';

// Create Auth0 instance
const auth0 = new Auth0({
  domain: AUTH0_DOMAIN,
  clientId: AUTH0_CLIENT_ID,
});

// User type (matches backend User model)
export interface User {
  id: string;
  email: string;
  name: string;
  isAdmin: boolean;
  username?: string;
  profilePicture?: string;
  hasSeenWelcome?: boolean;
}

// Auth context type
interface AuthContextType {
  user: User | null;
  loading: boolean;
  error: string | null;
  login: () => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

/**
 * Inner Auth Provider that uses Auth0 hooks
 */
function AuthProviderInner({ children }: { children: ReactNode }) {
  const {
    authorize,
    clearSession,
    user: auth0User,
    isLoading: auth0Loading,
    error: auth0Error,
    getCredentials,
  } = useAuth0();

  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  /**
   * Sync user with backend after Auth0 authentication
   */
  const syncUserWithBackend = useCallback(async () => {
    if (!auth0User?.email) {
      setUser(null);
      await setAuthToken(null);
      setLoading(false);
      return;
    }

    try {
      // Get Auth0 access token
      const credentials = await getCredentials();
      if (credentials?.accessToken) {
        await setAuthToken(credentials.accessToken);
      }

      // Sync user data with backend
      const response = await api.post(API_CONFIG.ENDPOINTS.AUTH0_SYNC || '/api/auth/auth0-sync', {
        email: auth0User.email,
        name: auth0User.name || auth0User.nickname || auth0User.email.split('@')[0],
        picture: auth0User.picture,
        sub: auth0User.sub,
      });

      setUser(response.data.user);
      console.log('✅ User synced with backend:', response.data.user.email);
    } catch (err: any) {
      console.error('Failed to sync user with backend:', err);
      setError(err.message || 'Failed to sync user');
      setUser(null);
      await setAuthToken(null);
    } finally {
      setLoading(false);
    }
  }, [auth0User, getCredentials]);

  // Sync when Auth0 auth state changes
  useEffect(() => {
    if (!auth0Loading) {
      if (auth0User) {
        syncUserWithBackend();
      } else {
        setUser(null);
        setLoading(false);
      }
    }
  }, [auth0Loading, auth0User, syncUserWithBackend]);

  // Handle Auth0 errors
  useEffect(() => {
    if (auth0Error) {
      console.error('Auth0 error:', auth0Error);
      setError(auth0Error.message);
    }
  }, [auth0Error]);

  /**
   * Login with Auth0
   */
  const login = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      console.log('🔐 Initiating Auth0 login...');

      await authorize({
        scope: 'openid profile email',
        audience: `https://${AUTH0_DOMAIN}/api/v2/`,
      });

      // User state will be updated via the useEffect when auth0User changes
      console.log('✅ Auth0 authorization initiated');
    } catch (err: any) {
      const errorMessage = err.message || 'Login failed. Please try again.';
      setError(errorMessage);
      console.error('❌ Auth0 login error:', errorMessage);
      setLoading(false);
      throw new Error(errorMessage);
    }
  }, [authorize]);

  /**
   * Logout from Auth0 and clear local state
   */
  const logout = useCallback(async () => {
    setUser(null);
    setError(null);

    try {
      // Clear backend session
      await api.post(API_CONFIG.ENDPOINTS.LOGOUT).catch(() => {});

      // Clear Auth0 session
      await clearSession();

      // Clear all API state
      await clearApiState();
      setCurrentLeagueId(null);

      console.log('✅ Logged out - all state cleared');
    } catch (err) {
      console.error('Logout error (non-critical):', err);
      // Still clear local state even if Auth0 logout fails
      await clearApiState();
    }
  }, [clearSession]);

  /**
   * Refresh user profile from backend
   */
  const refreshUser = useCallback(async () => {
    if (!auth0User) return;

    try {
      const credentials = await getCredentials();
      if (credentials?.accessToken) {
        await setAuthToken(credentials.accessToken);
      }

      const response = await api.get(API_CONFIG.ENDPOINTS.ME);
      setUser(response.data);
      console.log('✅ User profile refreshed');
    } catch (err: any) {
      console.error('Failed to refresh user profile:', err);
      if (err.response?.status === 401) {
        await logout();
      }
      throw err;
    }
  }, [auth0User, getCredentials, logout]);

  return (
    <AuthContext.Provider
      value={{
        user,
        loading: loading || auth0Loading,
        error,
        login,
        logout,
        refreshUser,
        isAuthenticated: !!user,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

/**
 * Auth Provider with Auth0 wrapper
 */
export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  return (
    <Auth0ProviderOriginal domain={AUTH0_DOMAIN} clientId={AUTH0_CLIENT_ID}>
      <AuthProviderInner>{children}</AuthProviderInner>
    </Auth0ProviderOriginal>
  );
};

/**
 * Hook to access auth context
 */
export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
