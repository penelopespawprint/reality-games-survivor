import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { useAuth0 } from "@auth0/auth0-react";
import { User, AuthContextType } from "../shared/types";
import api, { AUTH_STORAGE_KEY, setAuthToken } from "@/lib/api";

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const {
    isAuthenticated,
    isLoading: auth0Loading,
    user: auth0User,
    getAccessTokenSilently,
    loginWithRedirect,
    logout: auth0Logout
  } = useAuth0();

  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Sync user with backend after Auth0 authentication
  const syncUserWithBackend = useCallback(async () => {
    if (!isAuthenticated || !auth0User?.email) {
      setUser(null);
      setAuthToken(null);
      setLoading(false);
      return;
    }

    try {
      // Get Auth0 access token
      const token = await getAccessTokenSilently();
      setAuthToken(token);

      // Sync user data with backend
      const res = await api.post("/api/auth/auth0-sync", {
        email: auth0User.email,
        name: auth0User.name || auth0User.nickname,
        picture: auth0User.picture,
        sub: auth0User.sub
      });

      setUser(res.data.user);
    } catch (error) {
      console.error("Failed to sync user with backend:", error);
      // If sync fails, clear auth state
      setUser(null);
      setAuthToken(null);
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, auth0User, getAccessTokenSilently]);

  // Sync when Auth0 auth state changes
  useEffect(() => {
    if (!auth0Loading) {
      syncUserWithBackend();
    }
  }, [auth0Loading, isAuthenticated, syncUserWithBackend]);

  // Login redirects to Auth0
  const login = useCallback(async (_email?: string, _password?: string) => {
    // Parameters ignored - Auth0 handles credentials
    await loginWithRedirect({
      appState: { returnTo: window.location.pathname }
    });
  }, [loginWithRedirect]);

  // Logout from both Auth0 and backend
  const logout = useCallback(() => {
    // Clear local state first
    setUser(null);
    setAuthToken(null);

    // Clear backend session
    api.post("/api/auth/logout").catch(console.error);

    // Logout from Auth0
    auth0Logout({
      logoutParams: {
        returnTo: window.location.origin
      }
    });
  }, [auth0Logout]);

  // Refresh user data from backend
  const refreshUser = useCallback(async () => {
    if (!isAuthenticated) return;

    try {
      const token = await getAccessTokenSilently();
      setAuthToken(token);

      const res = await api.get("/api/users/me");
      if (res.data) {
        setUser(res.data);
      }
    } catch (error) {
      console.error("Failed to refresh user:", error);
      // If refresh fails with 401, trigger re-sync
      if ((error as any)?.response?.status === 401) {
        await syncUserWithBackend();
      }
    }
  }, [isAuthenticated, getAccessTokenSilently, syncUserWithBackend]);

  return (
    <AuthContext.Provider value={{
      user,
      setUser,
      loading: loading || auth0Loading,
      login,
      logout,
      refreshUser,
      isAuthenticated // Pass through Auth0's isAuthenticated
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    console.error("useAuth must be used within AuthProvider");
    return {
      user: null,
      setUser: () => {},
      loading: true,
      login: async () => {},
      logout: () => {},
      refreshUser: async () => {},
      isAuthenticated: false
    };
  }
  return ctx;
};
