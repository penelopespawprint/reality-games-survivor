import { createClient } from '@supabase/supabase-js';
// Get environment variables
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
// Validate ALL required environment variables
if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceKey) {
    const missing = [
        !supabaseUrl && 'SUPABASE_URL',
        !supabaseAnonKey && 'SUPABASE_ANON_KEY',
        !supabaseServiceKey && 'SUPABASE_SERVICE_ROLE_KEY',
    ].filter(Boolean);
    throw new Error(`Missing required Supabase environment variables: ${missing.join(', ')}`);
}
// Type assertions are safe here because we've validated above
const SUPABASE_URL = supabaseUrl;
const SUPABASE_ANON_KEY = supabaseAnonKey;
const SUPABASE_SERVICE_KEY = supabaseServiceKey;
// Client for authenticated user requests (respects RLS)
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
// Admin client for server-side operations (bypasses RLS)
export const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
// Create a client with user's auth token
export function createUserClient(accessToken) {
    return createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
        global: {
            headers: {
                Authorization: `Bearer ${accessToken}`,
            },
        },
    });
}
//# sourceMappingURL=supabase.js.map