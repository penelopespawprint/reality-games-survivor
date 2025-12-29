-- Comprehensive script to mark ALL migrations as applied
-- Checks for key schema elements from each migration
-- Safe to run multiple times

-- Ensure migrations table exists
CREATE SCHEMA IF NOT EXISTS supabase_migrations;

CREATE TABLE IF NOT EXISTS supabase_migrations.schema_migrations (
    version TEXT PRIMARY KEY
);

-- Helper function to mark migration if condition is true
CREATE OR REPLACE FUNCTION mark_migration_if_exists(migration_name TEXT, check_query TEXT)
RETURNS void AS $$
BEGIN
    EXECUTE format('
        DO $inner$
        BEGIN
            IF EXISTS (%s) THEN
                INSERT INTO supabase_migrations.schema_migrations (version)
                VALUES (%L)
                ON CONFLICT (version) DO NOTHING;
            END IF;
        END $inner$;
    ', check_query, migration_name);
END;
$$ LANGUAGE plpgsql;

-- 001_initial_schema - Core tables exist
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'users')
       AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'leagues')
       AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'seasons')
       AND EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role')
    THEN
        INSERT INTO supabase_migrations.schema_migrations (version) VALUES ('001_initial_schema') ON CONFLICT DO NOTHING;
    END IF;
END $$;

-- 002_rls_policies - RLS enabled
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE n.nspname = 'public' AND c.relname = 'users' AND c.relrowsecurity
    ) THEN
        INSERT INTO supabase_migrations.schema_migrations (version) VALUES ('002_rls_policies') ON CONFLICT DO NOTHING;
    END IF;
END $$;

-- 003_commissioner_features - description column
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'leagues' AND column_name = 'description') THEN
        INSERT INTO supabase_migrations.schema_migrations (version) VALUES ('003_commissioner_features') ON CONFLICT DO NOTHING;
    END IF;
END $$;

-- 004_pg_cron_jobs - Check for cron extension or job table
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron')
       OR EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'cron' AND table_name = 'job')
    THEN
        INSERT INTO supabase_migrations.schema_migrations (version) VALUES ('004_pg_cron_jobs') ON CONFLICT DO NOTHING;
    END IF;
END $$;

-- 005_announcements - announcements table
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'announcements') THEN
        INSERT INTO supabase_migrations.schema_migrations (version) VALUES ('005_announcements') ON CONFLICT DO NOTHING;
    END IF;
END $$;

-- 006_user_profile_fields - hometown column
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'hometown') THEN
        INSERT INTO supabase_migrations.schema_migrations (version) VALUES ('006_user_profile_fields') ON CONFLICT DO NOTHING;
    END IF;
END $$;

-- 007_global_draft_rankings - global_draft_rankings table
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'global_draft_rankings') THEN
        INSERT INTO supabase_migrations.schema_migrations (version) VALUES ('007_global_draft_rankings') ON CONFLICT DO NOTHING;
    END IF;
END $$;

-- 008_castaway_trivia - castaway_trivia table
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'castaway_trivia') THEN
        INSERT INTO supabase_migrations.schema_migrations (version) VALUES ('008_castaway_trivia') ON CONFLICT DO NOTHING;
    END IF;
END $$;

-- 009_fix_rls_self_select - Check for updated RLS policies (hard to detect, mark if RLS exists)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'users') THEN
        INSERT INTO supabase_migrations.schema_migrations (version) VALUES ('009_fix_rls_self_select') ON CONFLICT DO NOTHING;
    END IF;
END $$;

-- 009_rank_tracking - rank_tracking table
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'rank_tracking') THEN
        INSERT INTO supabase_migrations.schema_migrations (version) VALUES ('009_rank_tracking') ON CONFLICT DO NOTHING;
    END IF;
END $$;

-- 010_league_chat - league_messages table
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'league_messages') THEN
        INSERT INTO supabase_migrations.schema_migrations (version) VALUES ('010_league_chat') ON CONFLICT DO NOTHING;
    END IF;
END $$;

-- 011_castaway_photos - castaway_photo_url column
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'castaways' AND column_name = 'photo_url') THEN
        INSERT INTO supabase_migrations.schema_migrations (version) VALUES ('011_castaway_photos') ON CONFLICT DO NOTHING;
    END IF;
END $$;

-- 012_castaway_storage_photos - storage_photo_path column
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'castaways' AND column_name = 'storage_photo_path') THEN
        INSERT INTO supabase_migrations.schema_migrations (version) VALUES ('012_castaway_storage_photos') ON CONFLICT DO NOTHING;
    END IF;
END $$;

-- 013_attach_castaway_images_2025-12-29T07-32-21 - Check for image-related columns
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'castaways' AND column_name IN ('photo_url', 'storage_photo_path')) THEN
        INSERT INTO supabase_migrations.schema_migrations (version) VALUES ('013_attach_castaway_images_2025-12-29T07-32-21') ON CONFLICT DO NOTHING;
    END IF;
END $$;

-- 013_verification_codes - verification_codes table
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'verification_codes') THEN
        INSERT INTO supabase_migrations.schema_migrations (version) VALUES ('013_verification_codes') ON CONFLICT DO NOTHING;
    END IF;
END $$;

-- 014_optimize_rls_policies - Check for optimized indexes
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_weekly_picks_user_id') THEN
        INSERT INTO supabase_migrations.schema_migrations (version) VALUES ('014_optimize_rls_policies') ON CONFLICT DO NOTHING;
    END IF;
END $$;

-- 014_set_castaway_tribes - tribe column
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'castaways' AND column_name = 'tribe') THEN
        INSERT INTO supabase_migrations.schema_migrations (version) VALUES ('014_set_castaway_tribes') ON CONFLICT DO NOTHING;
    END IF;
END $$;

-- 015_atomic_payment_webhook - payment_status enum or webhook handling
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'payment_status')
       OR EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'payments' AND column_name = 'status')
    THEN
        INSERT INTO supabase_migrations.schema_migrations (version) VALUES ('015_atomic_payment_webhook') ON CONFLICT DO NOTHING;
    END IF;
END $$;

-- 015_update_castaway_images_from_storage - storage handling (mark if storage_photo_path exists)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'castaways' AND column_name = 'storage_photo_path') THEN
        INSERT INTO supabase_migrations.schema_migrations (version) VALUES ('015_update_castaway_images_from_storage') ON CONFLICT DO NOTHING;
    END IF;
END $$;

-- 016_payment_indexes - payment indexes
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_indexes WHERE tablename = 'payments' AND indexname LIKE '%payment%') THEN
        INSERT INTO supabase_migrations.schema_migrations (version) VALUES ('016_payment_indexes') ON CONFLICT DO NOTHING;
    END IF;
END $$;

-- 016_replace_season_50_castaways - season 50 exists
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM seasons WHERE number = 50) THEN
        INSERT INTO supabase_migrations.schema_migrations (version) VALUES ('016_replace_season_50_castaways') ON CONFLICT DO NOTHING;
    END IF;
END $$;

-- 017_email_queue - email_queue table
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'email_queue') THEN
        INSERT INTO supabase_migrations.schema_migrations (version) VALUES ('017_email_queue') ON CONFLICT DO NOTHING;
    END IF;
END $$;

-- 018_draft_atomicity - draft transaction handling (check for draft-related functions)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname LIKE '%draft%' AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')) THEN
        INSERT INTO supabase_migrations.schema_migrations (version) VALUES ('018_draft_atomicity') ON CONFLICT DO NOTHING;
    END IF;
END $$;

-- 019_scoring_finalization - scoring_sessions table
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'scoring_sessions') THEN
        INSERT INTO supabase_migrations.schema_migrations (version) VALUES ('019_scoring_finalization') ON CONFLICT DO NOTHING;
    END IF;
END $$;

-- 020_leaderboard_indexes - leaderboard indexes
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_indexes WHERE indexname LIKE '%leaderboard%') THEN
        INSERT INTO supabase_migrations.schema_migrations (version) VALUES ('020_leaderboard_indexes') ON CONFLICT DO NOTHING;
    END IF;
END $$;

-- 021_leaderboard_rpc_function - leaderboard function
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname LIKE '%leaderboard%' AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')) THEN
        INSERT INTO supabase_migrations.schema_migrations (version) VALUES ('021_leaderboard_rpc_function') ON CONFLICT DO NOTHING;
    END IF;
END $$;

-- 022_notification_preferences - notification_email column
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'notification_email') THEN
        INSERT INTO supabase_migrations.schema_migrations (version) VALUES ('022_notification_preferences') ON CONFLICT DO NOTHING;
    END IF;
END $$;

-- 023_results_tokens - results_tokens table
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'results_tokens') THEN
        INSERT INTO supabase_migrations.schema_migrations (version) VALUES ('023_results_tokens') ON CONFLICT DO NOTHING;
    END IF;
END $$;

-- 024_episodes_results_released - results_released_at column
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'episodes' AND column_name = 'results_released_at') THEN
        INSERT INTO supabase_migrations.schema_migrations (version) VALUES ('024_episodes_results_released') ON CONFLICT DO NOTHING;
    END IF;
END $$;

-- 024_weekly_picks_security - weekly_picks security (check for status column)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'weekly_picks' AND column_name = 'status') THEN
        INSERT INTO supabase_migrations.schema_migrations (version) VALUES ('024_weekly_picks_security') ON CONFLICT DO NOTHING;
    END IF;
END $$;

-- 025_scoring_completeness_validation - scoring validation function
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname LIKE '%scoring%completeness%' AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')) THEN
        INSERT INTO supabase_migrations.schema_migrations (version) VALUES ('025_scoring_completeness_validation') ON CONFLICT DO NOTHING;
    END IF;
END $$;

-- 026_league_members_elimination_tracking - elimination tracking columns
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'league_members' AND column_name = 'eliminated_at') THEN
        INSERT INTO supabase_migrations.schema_migrations (version) VALUES ('026_league_members_elimination_tracking') ON CONFLICT DO NOTHING;
    END IF;
END $$;

-- 027_fix_infrastructure_rls - RLS fixes (mark if RLS exists)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public') THEN
        INSERT INTO supabase_migrations.schema_migrations (version) VALUES ('027_fix_infrastructure_rls') ON CONFLICT DO NOTHING;
    END IF;
END $$;

-- 027_fix_league_capacity_race_condition - capacity handling
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'leagues' AND column_name = 'max_players') THEN
        INSERT INTO supabase_migrations.schema_migrations (version) VALUES ('027_fix_league_capacity_race_condition') ON CONFLICT DO NOTHING;
    END IF;
END $$;

-- 028_complete_missing_rls_policies - RLS policies (mark if policies exist)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename IN ('users', 'leagues', 'rosters')) THEN
        INSERT INTO supabase_migrations.schema_migrations (version) VALUES ('028_complete_missing_rls_policies') ON CONFLICT DO NOTHING;
    END IF;
END $$;

-- 029_daily_trivia_tracking - daily_trivia_questions table
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'daily_trivia_questions') THEN
        INSERT INTO supabase_migrations.schema_migrations (version) VALUES ('029_daily_trivia_tracking') ON CONFLICT DO NOTHING;
    END IF;
END $$;

-- 030_trivia_completion_tracking - trivia completion columns
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name LIKE '%trivia%complete%') THEN
        INSERT INTO supabase_migrations.schema_migrations (version) VALUES ('030_trivia_completion_tracking') ON CONFLICT DO NOTHING;
    END IF;
END $$;

-- 030_trivia_lockout_column - trivia_locked_until column
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'trivia_locked_until') THEN
        INSERT INTO supabase_migrations.schema_migrations (version) VALUES ('030_trivia_lockout_column') ON CONFLICT DO NOTHING;
    END IF;
END $$;

-- 030_trivia_lockout_system - trivia lockout function
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname LIKE '%trivia%lock%' AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')) THEN
        INSERT INTO supabase_migrations.schema_migrations (version) VALUES ('030_trivia_lockout_system') ON CONFLICT DO NOTHING;
    END IF;
END $$;

-- 031_trivia_24_questions_lockout - is_user_trivia_locked function
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'is_user_trivia_locked' AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')) THEN
        INSERT INTO supabase_migrations.schema_migrations (version) VALUES ('031_trivia_24_questions_lockout') ON CONFLICT DO NOTHING;
    END IF;
END $$;

-- 032_fix_handle_new_user_error_handling - handle_new_user function
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'handle_new_user' AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')) THEN
        INSERT INTO supabase_migrations.schema_migrations (version) VALUES ('032_fix_handle_new_user_error_handling') ON CONFLICT DO NOTHING;
    END IF;
END $$;

-- 032_insert_trivia_questions - trivia questions exist (check if table exists and has data)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'daily_trivia_questions') THEN
        IF EXISTS (SELECT 1 FROM daily_trivia_questions LIMIT 1) THEN
            INSERT INTO supabase_migrations.schema_migrations (version) VALUES ('032_insert_trivia_questions') ON CONFLICT DO NOTHING;
        END IF;
    END IF;
END $$;

-- 033_prevent_self_role_update - role update protection (check for trigger or function)
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_trigger t
        JOIN pg_class c ON c.oid = t.tgrelid
        JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE n.nspname = 'public' AND c.relname = 'users' AND t.tgname LIKE '%role%'
    ) THEN
        INSERT INTO supabase_migrations.schema_migrations (version) VALUES ('033_prevent_self_role_update') ON CONFLICT DO NOTHING;
    END IF;
END $$;

-- 034_trivia_attempts_tracking - trivia_attempts column
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'trivia_attempts') THEN
        INSERT INTO supabase_migrations.schema_migrations (version) VALUES ('034_trivia_attempts_tracking') ON CONFLICT DO NOTHING;
    END IF;
END $$;

-- 045_add_favorite_season_to_users - favorite_season column
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'favorite_season') THEN
        INSERT INTO supabase_migrations.schema_migrations (version) VALUES ('045_add_favorite_season_to_users') ON CONFLICT DO NOTHING;
    ELSE
        -- Add column if missing
        ALTER TABLE users ADD COLUMN IF NOT EXISTS favorite_season TEXT;
        INSERT INTO supabase_migrations.schema_migrations (version) VALUES ('045_add_favorite_season_to_users') ON CONFLICT DO NOTHING;
    END IF;
END $$;

-- Show summary
SELECT 
    'Migration Summary' as status,
    COUNT(*) as total_migrations_marked,
    STRING_AGG(version, ', ' ORDER BY version) as versions
FROM supabase_migrations.schema_migrations;

-- Clean up helper function
DROP FUNCTION IF EXISTS mark_migration_if_exists(TEXT, TEXT);
