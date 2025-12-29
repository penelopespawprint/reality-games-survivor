-- Database Verification Script
-- Run this in Supabase SQL Editor to verify your database schema matches expectations

-- ============================================================================
-- 1. CHECK APPLIED MIGRATIONS
-- ============================================================================
SELECT 
    'Applied Migrations' as check_type,
    COUNT(*) as count,
    STRING_AGG(version, ', ' ORDER BY version) as details
FROM supabase_migrations.schema_migrations
UNION ALL
SELECT 
    'Expected Migrations' as check_type,
    COUNT(*) as count,
    'Check migration files in supabase/migrations/' as details;

-- ============================================================================
-- 2. VERIFY CRITICAL TABLES EXIST
-- ============================================================================
SELECT 
    'Critical Tables' as check_type,
    table_name,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.tables 
            WHERE table_schema = 'public' AND table_name = t.table_name
        ) THEN '✓ EXISTS'
        ELSE '✗ MISSING'
    END as status
FROM (VALUES 
    ('users'),
    ('seasons'),
    ('episodes'),
    ('castaways'),
    ('leagues'),
    ('league_members'),
    ('rosters'),
    ('weekly_picks'),
    ('episode_scores'),
    ('scoring_rules'),
    ('daily_trivia_questions'),
    ('daily_trivia_answers'),
    ('payments'),
    ('notifications')
) AS t(table_name);

-- ============================================================================
-- 3. VERIFY CRITICAL COLUMNS IN USERS TABLE
-- ============================================================================
SELECT 
    'Users Table Columns' as check_type,
    column_name,
    data_type,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'users' 
            AND column_name = c.column_name
        ) THEN '✓ EXISTS'
        ELSE '✗ MISSING'
    END as status
FROM (VALUES 
    ('id', 'uuid'),
    ('email', 'text'),
    ('display_name', 'text'),
    ('phone', 'text'),
    ('phone_verified', 'boolean'),
    ('notification_email', 'boolean'),
    ('notification_sms', 'boolean'),
    ('notification_push', 'boolean'),
    ('timezone', 'text'),
    ('role', 'user_role'),
    ('favorite_season', 'text'),
    ('trivia_locked_until', 'timestamp with time zone'),
    ('trivia_attempts', 'integer'),
    ('trivia_questions_answered', 'integer'),
    ('trivia_questions_correct', 'integer')
) AS c(column_name, data_type);

-- ============================================================================
-- 4. VERIFY CRITICAL ENUMS EXIST
-- ============================================================================
SELECT 
    'Enums' as check_type,
    type_name,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM pg_type 
            WHERE typname = e.type_name
        ) THEN '✓ EXISTS'
        ELSE '✗ MISSING'
    END as status
FROM (VALUES 
    ('user_role'),
    ('league_status'),
    ('draft_status'),
    ('pick_status'),
    ('castaway_status'),
    ('payment_status'),
    ('notification_type')
) AS e(type_name);

-- ============================================================================
-- 5. VERIFY CRITICAL INDEXES EXIST
-- ============================================================================
SELECT 
    'Critical Indexes' as check_type,
    index_name,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM pg_indexes 
            WHERE schemaname = 'public' AND indexname = i.index_name
        ) THEN '✓ EXISTS'
        ELSE '✗ MISSING'
    END as status
FROM (VALUES 
    ('idx_users_email'),
    ('idx_users_phone'),
    ('idx_league_members_user'),
    ('idx_league_members_league'),
    ('idx_rosters_league_user'),
    ('idx_weekly_picks_league_episode'),
    ('idx_payments_user'),
    ('idx_payments_league')
) AS i(index_name);

-- ============================================================================
-- 6. CHECK FOR DATA INTEGRITY ISSUES
-- ============================================================================
SELECT 
    'Data Integrity' as check_type,
    check_name,
    CASE 
        WHEN check_result THEN '✓ PASS'
        ELSE '✗ FAIL'
    END as status,
    details
FROM (
    SELECT 
        'Users without display_name' as check_name,
        COUNT(*) = 0 as check_result,
        COUNT(*)::text || ' users missing display_name' as details
    FROM users WHERE display_name IS NULL OR display_name = ''
    UNION ALL
    SELECT 
        'Leagues without commissioner' as check_name,
        COUNT(*) = 0 as check_result,
        COUNT(*)::text || ' leagues missing commissioner' as details
    FROM leagues l
    LEFT JOIN users u ON l.commissioner_id = u.id
    WHERE u.id IS NULL
    UNION ALL
    SELECT 
        'Rosters with invalid castaway' as check_name,
        COUNT(*) = 0 as check_result,
        COUNT(*)::text || ' roster entries with invalid castaway' as details
    FROM rosters r
    LEFT JOIN castaways c ON r.castaway_id = c.id
    WHERE c.id IS NULL AND r.dropped_at IS NULL
    UNION ALL
    SELECT 
        'Weekly picks with invalid castaway' as check_name,
        COUNT(*) = 0 as check_result,
        COUNT(*)::text || ' picks with invalid castaway' as details
    FROM weekly_picks wp
    LEFT JOIN rosters r ON wp.roster_id = r.id
    WHERE r.id IS NULL
) AS checks;

-- ============================================================================
-- 7. VERIFY RLS POLICIES ARE ENABLED
-- ============================================================================
SELECT 
    'RLS Status' as check_type,
    table_name,
    CASE 
        WHEN relrowsecurity THEN '✓ ENABLED'
        ELSE '✗ DISABLED'
    END as rls_status
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public'
AND c.relkind = 'r'
AND table_name IN (
    'users', 'leagues', 'league_members', 'rosters', 
    'weekly_picks', 'episode_scores', 'payments'
)
ORDER BY table_name;

-- ============================================================================
-- 8. SUMMARY REPORT
-- ============================================================================
SELECT 
    'SUMMARY' as check_type,
    'Total Tables' as metric,
    COUNT(*)::text as value
FROM information_schema.tables 
WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
UNION ALL
SELECT 
    'SUMMARY' as check_type,
    'Applied Migrations' as metric,
    COALESCE(COUNT(*)::text, '0') as value
FROM supabase_migrations.schema_migrations
UNION ALL
SELECT 
    'SUMMARY' as check_type,
    'Total Users' as metric,
    COUNT(*)::text as value
FROM users
UNION ALL
SELECT 
    'SUMMARY' as check_type,
    'Total Leagues' as metric,
    COUNT(*)::text as value
FROM leagues
UNION ALL
SELECT 
    'SUMMARY' as check_type,
    'Active Season' as metric,
    COUNT(*)::text as value
FROM seasons WHERE is_active = true;
