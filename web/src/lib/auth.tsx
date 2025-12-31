import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { User, Session } from '@supabase/supabase-js';
import { supabase } from './supabase';
import { metrics } from './sentry';

interface SignUpOptions {
  phone?: string;
  hometown?: string;
  favorite_castaway?: string;
}

interface UserProfile {
  id: string;
  email: string;
  display_name: string;
  role: 'player' | 'commissioner' | 'admin';
  phone?: string;
  phone_verified?: boolean;
  avatar_url?: string;
  profile_setup_complete?: boolean;
}

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  session: Session | null;
  loading: boolean;
  isAdmin: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (
    email: string,
    password: string,
    displayName: string,
    options?: SignUpOptions
  ) => Promise<void>;
  signInWithMagicLink: (email: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = async (userId: string, retries = 2): Promise<UserProfile | null> => {
    for (let attempt = 0; attempt < retries; attempt++) {
      const { data, error } = await supabase
        .from('users')
        .select(
          'id, email, display_name, role, phone, phone_verified, avatar_url, profile_setup_complete'
        )
        .eq('id', userId)
        .single();

      if (!error && data) {
        return data as UserProfile;
      }

      // If profile doesn't exist yet (new user), wait a bit and retry
      // Handle both PGRST116 (PostgREST "no rows") and 406 status
      const isNotFound = error?.code === 'PGRST116' || (error as any)?.status === 406;
      if (isNotFound && attempt < retries - 1) {
        // Progressive delay - longer waits for later attempts
        // First retry: 150ms, second: 300ms, third: 500ms, etc.
        const delay = Math.min(150 * (attempt + 1), 500);
        await new Promise((resolve) => setTimeout(resolve, delay));
        continue;
      }

      // Only log error if it's not a "not found" case (which is expected for new users)
      if (!isNotFound) {
        console.error('Error fetching profile:', error);
      }
      return null;
    }
    return null;
  };

  const refreshProfile = async () => {
    if (user?.id) {
      const profileData = await fetchProfile(user.id);
      setProfile(profileData);
    }
  };

  useEffect(() => {
    // Function to initialize auth state
    const initializeAuth = async () => {
      try {
        // Get session once - Supabase handles URL hash extraction automatically
        // Add timeout to prevent hanging on invalid/expired tokens
        const sessionPromise = supabase.auth.getSession();
        const timeoutPromise = new Promise<{ data: { session: null }; error: null }>((resolve) =>
          setTimeout(() => resolve({ data: { session: null }, error: null }), 5000)
        );

        const {
          data: { session: currentSession },
        } = await Promise.race([sessionPromise, timeoutPromise]);

        // Supabase automatically restores session from localStorage if persistSession is true
        // No need to manually refresh - getSession() handles it

        // Clear the URL hash after extracting session (if present)
        if (window.location.hash.includes('access_token')) {
          window.history.replaceState(null, '', window.location.pathname + window.location.search);
        }

        if (currentSession) {
          // Verify the session is actually valid by checking the user
          // This catches cases where localStorage has an expired/invalid token
          const {
            data: { user: verifiedUser },
            error: userError,
          } = await supabase.auth.getUser();

          if (userError || !verifiedUser) {
            // Session is invalid - clear it and redirect to login
            console.warn('Session invalid, clearing auth state:', userError?.message);
            await supabase.auth.signOut();
            setSession(null);
            setUser(null);
            setProfile(null);
            setLoading(false);
            return;
          }

          setSession(currentSession);
          setUser(currentSession.user ?? null);

          // Wait for profile to load before transitioning from loading state
          // This prevents empty states when returning to the site
          // Use more retries if coming from magic link (has hash in URL)
          if (currentSession.user) {
            try {
              const isFromMagicLink = window.location.hash.includes('access_token');
              const retries = isFromMagicLink ? 5 : 2;
              const profileData = await fetchProfile(currentSession.user.id, retries);
              setProfile(profileData);
            } catch (error) {
              console.error('Failed to fetch profile:', error);
              // Still allow the app to load even if profile fetch fails
            }
          }
        } else {
          // No session found - ensure state is cleared
          setSession(null);
          setUser(null);
          setProfile(null);
        }

        setLoading(false);
      } catch (error) {
        console.error('Failed to initialize auth:', error);
        // Clear auth state on error to prevent stuck loading
        setSession(null);
        setUser(null);
        setProfile(null);
        setLoading(false);
      }
    };

    // Initialize auth state
    initializeAuth();

    // Listen for auth changes (including URL hash extraction)
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      // Clear URL hash if we just got a session from URL
      if (event === 'SIGNED_IN' && window.location.hash.includes('access_token')) {
        window.history.replaceState(null, '', window.location.pathname + window.location.search);
      }

      setSession(session);
      setUser(session?.user ?? null);

      // Update profile when auth state changes
      // Use more retries for SIGNED_IN events (magic link, OAuth) to wait for profile creation
      if (session?.user) {
        const isSignInEvent = event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED';
        const retries = isSignInEvent ? 5 : 2; // More retries for sign-in events
        const profileData = await fetchProfile(session.user.id, retries);
        setProfile(profileData);
      } else {
        setProfile(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // Handle browser back/forward navigation - restore auth state
  useEffect(() => {
    const handlePopState = async () => {
      // When navigating back/forward, check session again
      const {
        data: { session: currentSession },
      } = await supabase.auth.getSession();

      if (currentSession) {
        setSession(currentSession);
        setUser(currentSession.user ?? null);
        if (currentSession.user) {
          const profileData = await fetchProfile(currentSession.user.id);
          setProfile(profileData);
        }
      } else {
        setSession(null);
        setUser(null);
        setProfile(null);
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const signIn = async (email: string, password: string) => {
    const startTime = performance.now();
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        metrics.count('auth_signin', 1, { method: 'password', status: 'error' });
        throw error;
      }
      metrics.count('auth_signin', 1, { method: 'password', status: 'success' });
      metrics.distribution('auth_signin_time', performance.now() - startTime, {
        method: 'password',
      });
    } catch (error) {
      metrics.count('auth_signin', 1, { method: 'password', status: 'error' });
      throw error;
    }
  };

  const signUp = async (
    email: string,
    password: string,
    displayName: string,
    options?: SignUpOptions
  ) => {
    const startTime = performance.now();
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            display_name: displayName,
            phone: options?.phone,
            hometown: options?.hometown,
            favorite_castaway: options?.favorite_castaway,
          },
        },
      });
      if (error) {
        metrics.count('auth_signup', 1, { status: 'error' });
        throw error;
      }

      // If we have additional profile fields and the user was created, update the users table
      if (data.user && (options?.phone || options?.hometown || options?.favorite_castaway)) {
        const updates: Record<string, string> = {};
        if (options?.phone) updates.phone = options.phone;
        if (options?.hometown) updates.hometown = options.hometown;
        if (options?.favorite_castaway) updates.favorite_castaway = options.favorite_castaway;

        await supabase.from('users').update(updates).eq('id', data.user.id);
      }

      metrics.count('auth_signup', 1, { status: 'success' });
      metrics.distribution('auth_signup_time', performance.now() - startTime);
    } catch (error) {
      metrics.count('auth_signup', 1, { status: 'error' });
      throw error;
    }
  };

  const signInWithMagicLink = async (email: string) => {
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: `${window.location.origin}/profile/setup`,
        },
      });
      if (error) {
        metrics.count('auth_signin', 1, { method: 'magic_link', status: 'error' });
        throw error;
      }
      metrics.count('auth_signin', 1, { method: 'magic_link', status: 'success' });
    } catch (error) {
      metrics.count('auth_signin', 1, { method: 'magic_link', status: 'error' });
      throw error;
    }
  };

  const signInWithGoogle = async () => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/profile/setup`,
        },
      });
      if (error) {
        metrics.count('auth_signin', 1, { method: 'google', status: 'error' });
        throw error;
      }
      metrics.count('auth_signin', 1, { method: 'google', status: 'initiated' });
    } catch (error) {
      metrics.count('auth_signin', 1, { method: 'google', status: 'error' });
      throw error;
    }
  };

  const signOut = async () => {
    // Clear local state first for better UX
    setUser(null);
    setProfile(null);
    setSession(null);

    // Then call Supabase signOut
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error('Supabase signOut error:', error);
      metrics.count('auth_signout', 1, { status: 'error' });
      // Don't throw - we've already cleared local state
    } else {
      metrics.count('auth_signout', 1, { status: 'success' });
    }
  };

  const isAdmin = profile?.role === 'admin';

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        session,
        loading,
        isAdmin,
        signIn,
        signUp,
        signInWithMagicLink,
        signInWithGoogle,
        signOut,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
