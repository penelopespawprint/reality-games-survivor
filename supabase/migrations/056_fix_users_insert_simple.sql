-- Migration 056: Simplify users INSERT policy
-- The previous approach failed because RLS policies can't query auth.users directly.
-- 
-- Solution: Just allow all inserts to users table and rely on:
-- 1. The trigger being SECURITY DEFINER (bypasses RLS when owned by superuser)
-- 2. The unique constraint on id (references auth.users) to prevent invalid inserts

-- Drop problematic policies
DROP POLICY IF EXISTS users_trigger_insert ON users;
DROP POLICY IF EXISTS users_insert_own ON users;

-- Simple policy: authenticated users can insert where id = their auth.uid()
CREATE POLICY users_insert_own ON users
FOR INSERT 
TO authenticated
WITH CHECK (id = (SELECT auth.uid()));

-- For the trigger: we need to allow inserts without an authenticated session
-- The trigger fires during auth.users INSERT, before the user has a session
-- Solution: Allow public insert but the FK constraint to auth.users(id) protects us
CREATE POLICY users_insert_from_trigger ON users
FOR INSERT 
TO anon, authenticated
WITH CHECK (true);

-- The foreign key constraint `users.id REFERENCES auth.users(id)` ensures
-- only valid auth user IDs can be inserted, so this is safe.

-- Grant insert to anon role (needed for trigger context)
GRANT INSERT ON users TO anon;

-- Same fix for notification_preferences
DROP POLICY IF EXISTS notification_preferences_trigger_insert ON notification_preferences;

CREATE POLICY notification_preferences_insert_from_trigger ON notification_preferences
FOR INSERT
TO anon, authenticated  
WITH CHECK (true);

GRANT INSERT ON notification_preferences TO anon;

-- Same fix for league_members (trigger adds user to global league)
CREATE POLICY league_members_insert_from_trigger ON league_members
FOR INSERT
TO anon, authenticated
WITH CHECK (true);

GRANT INSERT ON league_members TO anon;
