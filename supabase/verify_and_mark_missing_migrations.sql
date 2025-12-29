-- Verify and mark missing migrations
-- Checks if schema elements exist for each missing migration
-- Marks as applied if elements exist, otherwise provides guidance

-- Ensure migrations table exists
CREATE SCHEMA IF NOT EXISTS supabase_migrations;
CREATE TABLE IF NOT EXISTS supabase_migrations.schema_migrations (
    version TEXT PRIMARY KEY
);

-- 003_commissioner_features - Check for description, is_closed, co_commissioners columns
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'leagues' AND column_name = 'description')
       OR EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'leagues' AND column_name = 'is_closed')
       OR EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'leagues' AND column_name = 'co_commissioners')
    THEN
        INSERT INTO supabase_migrations.schema_migrations (version) VALUES ('003_commissioner_features') ON CONFLICT DO NOTHING;
        RAISE NOTICE '003_commissioner_features: Marked as applied';
    ELSE
        RAISE NOTICE '003_commissioner_features: NOT APPLIED - Missing commissioner features columns';
    END IF;
END $$;

-- 005_announcements - Check for announcements table
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'announcements') THEN
        INSERT INTO supabase_migrations.schema_migrations (version) VALUES ('005_announcements') ON CONFLICT DO NOTHING;
        RAISE NOTICE '005_announcements: Marked as applied';
    ELSE
        RAISE NOTICE '005_announcements: NOT APPLIED - Missing announcements table';
    END IF;
END $$;

-- 006_user_profile_fields - Check for hometown column
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'hometown') THEN
        INSERT INTO supabase_migrations.schema_migrations (version) VALUES ('006_user_profile_fields') ON CONFLICT DO NOTHING;
        RAISE NOTICE '006_user_profile_fields: Marked as applied';
    ELSE
        RAISE NOTICE '006_user_profile_fields: NOT APPLIED - Missing hometown column';
    END IF;
END $$;

-- 007_global_draft_rankings - Check for global_draft_rankings table
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'global_draft_rankings') THEN
        INSERT INTO supabase_migrations.schema_migrations (version) VALUES ('007_global_draft_rankings') ON CONFLICT DO NOTHING;
        RAISE NOTICE '007_global_draft_rankings: Marked as applied';
    ELSE
        RAISE NOTICE '007_global_draft_rankings: NOT APPLIED - Missing global_draft_rankings table';
    END IF;
END $$;

-- 008_castaway_trivia - Check for castaway_trivia table
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'castaway_trivia') THEN
        INSERT INTO supabase_migrations.schema_migrations (version) VALUES ('008_castaway_trivia') ON CONFLICT DO NOTHING;
        RAISE NOTICE '008_castaway_trivia: Marked as applied';
    ELSE
        RAISE NOTICE '008_castaway_trivia: NOT APPLIED - Missing castaway_trivia table';
    END IF;
END $$;

-- 009_rank_tracking - Check for rank_tracking table
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'rank_tracking') THEN
        INSERT INTO supabase_migrations.schema_migrations (version) VALUES ('009_rank_tracking') ON CONFLICT DO NOTHING;
        RAISE NOTICE '009_rank_tracking: Marked as applied';
    ELSE
        RAISE NOTICE '009_rank_tracking: NOT APPLIED - Missing rank_tracking table';
    END IF;
END $$;

-- 012_castaway_storage_photos - Check for storage_photo_path column
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'castaways' AND column_name = 'storage_photo_path') THEN
        INSERT INTO supabase_migrations.schema_migrations (version) VALUES ('012_castaway_storage_photos') ON CONFLICT DO NOTHING;
        RAISE NOTICE '012_castaway_storage_photos: Marked as applied';
    ELSE
        RAISE NOTICE '012_castaway_storage_photos: NOT APPLIED - Missing storage_photo_path column';
    END IF;
END $$;

-- 013_verification_codes - Check for verification_codes table
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'verification_codes') THEN
        INSERT INTO supabase_migrations.schema_migrations (version) VALUES ('013_verification_codes') ON CONFLICT DO NOTHING;
        RAISE NOTICE '013_verification_codes: Marked as applied';
    ELSE
        RAISE NOTICE '013_verification_codes: NOT APPLIED - Missing verification_codes table';
    END IF;
END $$;

-- 014_set_castaway_tribes - Check for tribe column
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'castaways' AND column_name = 'tribe') THEN
        INSERT INTO supabase_migrations.schema_migrations (version) VALUES ('014_set_castaway_tribes') ON CONFLICT DO NOTHING;
        RAISE NOTICE '014_set_castaway_tribes: Marked as applied';
    ELSE
        RAISE NOTICE '014_set_castaway_tribes: NOT APPLIED - Missing tribe column';
    END IF;
END $$;

-- 015_update_castaway_images_from_storage - Check for storage handling (mark if storage_photo_path exists)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'castaways' AND column_name = 'storage_photo_path') THEN
        INSERT INTO supabase_migrations.schema_migrations (version) VALUES ('015_update_castaway_images_from_storage') ON CONFLICT DO NOTHING;
        RAISE NOTICE '015_update_castaway_images_from_storage: Marked as applied';
    ELSE
        RAISE NOTICE '015_update_castaway_images_from_storage: NOT APPLIED - Missing storage_photo_path column';
    END IF;
END $$;

-- 020_leaderboard_indexes - Check for leaderboard-related indexes
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE schemaname = 'public' 
        AND (indexname LIKE '%leaderboard%' OR tablename LIKE '%leaderboard%')
    ) THEN
        INSERT INTO supabase_migrations.schema_migrations (version) VALUES ('020_leaderboard_indexes') ON CONFLICT DO NOTHING;
        RAISE NOTICE '020_leaderboard_indexes: Marked as applied';
    ELSE
        RAISE NOTICE '020_leaderboard_indexes: NOT APPLIED - Missing leaderboard indexes';
    END IF;
END $$;

-- 029_daily_trivia_tracking - Check for daily_trivia_questions table
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'daily_trivia_questions') THEN
        INSERT INTO supabase_migrations.schema_migrations (version) VALUES ('029_daily_trivia_tracking') ON CONFLICT DO NOTHING;
        RAISE NOTICE '029_daily_trivia_tracking: Marked as applied';
    ELSE
        RAISE NOTICE '029_daily_trivia_tracking: NOT APPLIED - Missing daily_trivia_questions table';
    END IF;
END $$;

-- 030_trivia_completion_tracking - Check for trivia completion columns
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'users' 
        AND (column_name LIKE '%trivia%complete%' OR column_name = 'trivia_completed_at' OR column_name = 'trivia_completed')
    ) THEN
        INSERT INTO supabase_migrations.schema_migrations (version) VALUES ('030_trivia_completion_tracking') ON CONFLICT DO NOTHING;
        RAISE NOTICE '030_trivia_completion_tracking: Marked as applied';
    ELSE
        RAISE NOTICE '030_trivia_completion_tracking: NOT APPLIED - Missing trivia completion columns';
    END IF;
END $$;

-- 030_trivia_lockout_column - Check for trivia_locked_until column
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'trivia_locked_until') THEN
        INSERT INTO supabase_migrations.schema_migrations (version) VALUES ('030_trivia_lockout_column') ON CONFLICT DO NOTHING;
        RAISE NOTICE '030_trivia_lockout_column: Marked as applied';
    ELSE
        RAISE NOTICE '030_trivia_lockout_column: NOT APPLIED - Missing trivia_locked_until column';
    END IF;
END $$;

-- 030_trivia_lockout_system - Check for trivia lockout function
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_proc p
        JOIN pg_namespace n ON n.oid = p.pronamespace
        WHERE n.nspname = 'public' 
        AND (p.proname LIKE '%trivia%lock%' OR p.proname = 'check_trivia_lockout')
    ) THEN
        INSERT INTO supabase_migrations.schema_migrations (version) VALUES ('030_trivia_lockout_system') ON CONFLICT DO NOTHING;
        RAISE NOTICE '030_trivia_lockout_system: Marked as applied';
    ELSE
        RAISE NOTICE '030_trivia_lockout_system: NOT APPLIED - Missing trivia lockout function';
    END IF;
END $$;

-- 031_trivia_24_questions_lockout - Check for is_user_trivia_locked function
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_proc p
        JOIN pg_namespace n ON n.oid = p.pronamespace
        WHERE n.nspname = 'public' AND p.proname = 'is_user_trivia_locked'
    ) THEN
        INSERT INTO supabase_migrations.schema_migrations (version) VALUES ('031_trivia_24_questions_lockout') ON CONFLICT DO NOTHING;
        RAISE NOTICE '031_trivia_24_questions_lockout: Marked as applied';
    ELSE
        RAISE NOTICE '031_trivia_24_questions_lockout: NOT APPLIED - Missing is_user_trivia_locked function';
    END IF;
END $$;

-- 032_insert_trivia_questions - Check if trivia questions exist (data migration)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'daily_trivia_questions') THEN
        IF EXISTS (SELECT 1 FROM daily_trivia_questions LIMIT 1) THEN
            INSERT INTO supabase_migrations.schema_migrations (version) VALUES ('032_insert_trivia_questions') ON CONFLICT DO NOTHING;
            RAISE NOTICE '032_insert_trivia_questions: Marked as applied (has data)';
        ELSE
            RAISE NOTICE '032_insert_trivia_questions: NOT APPLIED - Table exists but no data';
        END IF;
    ELSE
        RAISE NOTICE '032_insert_trivia_questions: NOT APPLIED - Table does not exist';
    END IF;
END $$;

-- 033_prevent_self_role_update - Check for role update trigger
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_trigger t
        JOIN pg_class c ON c.oid = t.tgrelid
        JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE n.nspname = 'public' AND c.relname = 'users' AND t.tgname LIKE '%role%'
    ) THEN
        INSERT INTO supabase_migrations.schema_migrations (version) VALUES ('033_prevent_self_role_update') ON CONFLICT DO NOTHING;
        RAISE NOTICE '033_prevent_self_role_update: Marked as applied';
    ELSE
        RAISE NOTICE '033_prevent_self_role_update: NOT APPLIED - Missing role update trigger';
    END IF;
END $$;

-- 034_trivia_attempts_tracking - Check for trivia_attempts column
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'trivia_attempts') THEN
        INSERT INTO supabase_migrations.schema_migrations (version) VALUES ('034_trivia_attempts_tracking') ON CONFLICT DO NOTHING;
        RAISE NOTICE '034_trivia_attempts_tracking: Marked as applied';
    ELSE
        RAISE NOTICE '034_trivia_attempts_tracking: NOT APPLIED - Missing trivia_attempts column';
    END IF;
END $$;

-- Summary
SELECT 
    'Final Status' as status,
    COUNT(*) as total_migrations,
    STRING_AGG(version, ', ' ORDER BY version) as all_versions
FROM supabase_migrations.schema_migrations;

-- Show still missing migrations
WITH expected_missing AS (
    SELECT unnest(ARRAY[
        '003_commissioner_features',
        '005_announcements',
        '006_user_profile_fields',
        '007_global_draft_rankings',
        '008_castaway_trivia',
        '009_rank_tracking',
        '012_castaway_storage_photos',
        '013_verification_codes',
        '014_set_castaway_tribes',
        '015_update_castaway_images_from_storage',
        '020_leaderboard_indexes',
        '029_daily_trivia_tracking',
        '030_trivia_completion_tracking',
        '030_trivia_lockout_column',
        '030_trivia_lockout_system',
        '031_trivia_24_questions_lockout',
        '032_insert_trivia_questions',
        '033_prevent_self_role_update',
        '034_trivia_attempts_tracking'
    ]) as version
)
SELECT 
    'Still Missing' as status,
    COUNT(*) as count,
    STRING_AGG(em.version, ', ' ORDER BY em.version) as versions
FROM expected_missing em
LEFT JOIN supabase_migrations.schema_migrations sm ON em.version = sm.version
WHERE sm.version IS NULL;
