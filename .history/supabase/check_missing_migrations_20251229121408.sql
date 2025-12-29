-- Check which migrations are missing from the applied list
-- Compare detected migrations vs all migration files

-- Show currently applied migrations
SELECT 
    'Applied Migrations' as status,
    COUNT(*) as count,
    STRING_AGG(version, ', ' ORDER BY version) as versions
FROM supabase_migrations.schema_migrations;

-- Show expected migrations (based on migration files)
-- Note: This is a manual list - update if you add/remove migration files
WITH expected_migrations AS (
    SELECT unnest(ARRAY[
        '001_initial_schema',
        '002_rls_policies',
        '003_commissioner_features',
        '004_pg_cron_jobs',
        '005_announcements',
        '006_user_profile_fields',
        '007_global_draft_rankings',
        '008_castaway_trivia',
        '009_fix_rls_self_select',
        '009_rank_tracking',
        '010_league_chat',
        '011_castaway_photos',
        '012_castaway_storage_photos',
        '013_attach_castaway_images_2025-12-29T07-32-21',
        '013_verification_codes',
        '014_optimize_rls_policies',
        '014_set_castaway_tribes',
        '015_atomic_payment_webhook',
        '015_update_castaway_images_from_storage',
        '016_payment_indexes',
        '016_replace_season_50_castaways',
        '017_email_queue',
        '018_draft_atomicity',
        '019_scoring_finalization',
        '020_leaderboard_indexes',
        '021_leaderboard_rpc_function',
        '022_notification_preferences',
        '023_results_tokens',
        '024_episodes_results_released',
        '024_weekly_picks_security',
        '025_scoring_completeness_validation',
        '026_league_members_elimination_tracking',
        '027_fix_infrastructure_rls',
        '027_fix_league_capacity_race_condition',
        '028_complete_missing_rls_policies',
        '029_daily_trivia_tracking',
        '030_trivia_completion_tracking',
        '030_trivia_lockout_column',
        '030_trivia_lockout_system',
        '031_trivia_24_questions_lockout',
        '032_fix_handle_new_user_error_handling',
        '032_insert_trivia_questions',
        '033_prevent_self_role_update',
        '034_trivia_attempts_tracking',
        '045_add_favorite_season_to_users'
    ]) as version
)
SELECT 
    'Missing Migrations' as status,
    COUNT(*) as count,
    STRING_AGG(em.version, ', ' ORDER BY em.version) as versions
FROM expected_migrations em
LEFT JOIN supabase_migrations.schema_migrations sm ON em.version = sm.version
WHERE sm.version IS NULL;
