-- Script to mark migrations as applied based on schema checks
-- Only marks migrations if the expected schema elements exist
-- Safe to run multiple times

-- Ensure migrations table exists
CREATE SCHEMA IF NOT EXISTS supabase_migrations;

CREATE TABLE IF NOT EXISTS supabase_migrations.schema_migrations (
    version TEXT PRIMARY KEY
);

-- Mark migrations as applied based on schema checks
-- This checks if key elements from each migration exist

-- 001_initial_schema.sql - Check for core tables
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'users')
       AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'leagues')
       AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'seasons')
       AND EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role')
    THEN
        INSERT INTO supabase_migrations.schema_migrations (version)
        VALUES ('001_initial_schema')
        ON CONFLICT (version) DO NOTHING;
    END IF;
END $$;

-- 002_rls_policies.sql - Check if RLS is enabled on users table
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_class c
        JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE n.nspname = 'public' AND c.relname = 'users' AND c.relrowsecurity
    )
    THEN
        INSERT INTO supabase_migrations.schema_migrations (version)
        VALUES ('002_rls_policies')
        ON CONFLICT (version) DO NOTHING;
    END IF;
END $$;

-- 006_user_profile_fields.sql - Check for hometown column
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name = 'hometown'
    )
    THEN
        INSERT INTO supabase_migrations.schema_migrations (version)
        VALUES ('006_user_profile_fields')
        ON CONFLICT (version) DO NOTHING;
    END IF;
END $$;

-- 013_verification_codes.sql - Check for verification_codes table
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'verification_codes')
    THEN
        INSERT INTO supabase_migrations.schema_migrations (version)
        VALUES ('013_verification_codes')
        ON CONFLICT (version) DO NOTHING;
    END IF;
END $$;

-- 022_notification_preferences.sql - Check for notification columns
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name = 'notification_email'
    )
    THEN
        INSERT INTO supabase_migrations.schema_migrations (version)
        VALUES ('022_notification_preferences')
        ON CONFLICT (version) DO NOTHING;
    END IF;
END $$;

-- 029_daily_trivia_tracking.sql - Check for trivia tables
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'daily_trivia_questions')
       AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'daily_trivia_answers')
    THEN
        INSERT INTO supabase_migrations.schema_migrations (version)
        VALUES ('029_daily_trivia_tracking')
        ON CONFLICT (version) DO NOTHING;
    END IF;
END $$;

-- 030_trivia_lockout_column.sql - Check for trivia_locked_until column
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name = 'trivia_locked_until'
    )
    THEN
        INSERT INTO supabase_migrations.schema_migrations (version)
        VALUES ('030_trivia_lockout_column')
        ON CONFLICT (version) DO NOTHING;
    END IF;
END $$;

-- 031_trivia_24_questions_lockout.sql - Check for trivia functions
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_proc p
        JOIN pg_namespace n ON n.oid = p.pronamespace
        WHERE n.nspname = 'public' AND p.proname = 'is_user_trivia_locked'
    )
    THEN
        INSERT INTO supabase_migrations.schema_migrations (version)
        VALUES ('031_trivia_24_questions_lockout')
        ON CONFLICT (version) DO NOTHING;
    END IF;
END $$;

-- 034_trivia_attempts_tracking.sql - Check for trivia_attempts column
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name = 'trivia_attempts'
    )
    THEN
        INSERT INTO supabase_migrations.schema_migrations (version)
        VALUES ('034_trivia_attempts_tracking')
        ON CONFLICT (version) DO NOTHING;
    END IF;
END $$;

-- 045_add_favorite_season_to_users.sql - Check for favorite_season column
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name = 'favorite_season'
    )
    THEN
        INSERT INTO supabase_migrations.schema_migrations (version)
        VALUES ('045_add_favorite_season_to_users')
        ON CONFLICT (version) DO NOTHING;
    ELSE
        -- Column doesn't exist, add it
        ALTER TABLE users ADD COLUMN IF NOT EXISTS favorite_season TEXT;
        -- Then mark migration as applied
        INSERT INTO supabase_migrations.schema_migrations (version)
        VALUES ('045_add_favorite_season_to_users')
        ON CONFLICT (version) DO NOTHING;
    END IF;
END $$;

-- Show what was marked
SELECT 
    'Migrations Marked' as status,
    COUNT(*) as count,
    STRING_AGG(version, ', ' ORDER BY version) as versions
FROM supabase_migrations.schema_migrations;
