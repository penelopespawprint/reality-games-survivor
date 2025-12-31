import { createClient } from '@supabase/supabase-js';
import type { Database } from './database.types';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

const STORAGE_KEY = 'rgfl-auth-token';

/**
 * Validates that a stored token has the correct structure.
 * A valid Supabase auth token should be a JSON object with access_token and refresh_token.
 */
function isValidTokenStructure(value: string | null): boolean {
  if (!value) return false;
  try {
    const parsed = JSON.parse(value);
    // Must have access_token that looks like a JWT (3 dot-separated parts)
    if (!parsed.access_token || typeof parsed.access_token !== 'string') {
      return false;
    }
    const jwtParts = parsed.access_token.split('.');
    if (jwtParts.length !== 3) {
      console.warn('Invalid JWT format in stored token - clearing');
      return false;
    }
    return true;
  } catch {
    console.warn('Failed to parse stored token - clearing');
    return false;
  }
}

/**
 * Custom storage wrapper that validates tokens before returning them.
 * This prevents "token is malformed" errors from corrupted localStorage data.
 */
const safeStorage = {
  getItem: (key: string): string | null => {
    const value = window.localStorage.getItem(key);
    if (key === STORAGE_KEY && !isValidTokenStructure(value)) {
      // Clear corrupted token
      window.localStorage.removeItem(key);
      return null;
    }
    return value;
  },
  setItem: (key: string, value: string): void => {
    window.localStorage.setItem(key, value);
  },
  removeItem: (key: string): void => {
    window.localStorage.removeItem(key);
  },
};

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    storageKey: STORAGE_KEY,
    storage: safeStorage,
  },
});
