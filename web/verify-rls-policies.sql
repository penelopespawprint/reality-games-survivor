-- Quick Verification Script: Weekly Picks RLS Policies
-- Run this to verify policies are in place and working

\echo '========================================='
\echo 'WEEKLY PICKS RLS POLICY VERIFICATION'
\echo '========================================='
\echo ''

-- 1. Check RLS is enabled
\echo '1. Checking RLS status on weekly_picks table...'
SELECT
  tablename,
  CASE
    WHEN rowsecurity THEN '✓ RLS ENABLED'
    ELSE '✗ RLS DISABLED (PROBLEM!)'
  END as status
FROM pg_tables
WHERE tablename = 'weekly_picks';

\echo ''
\echo '2. Listing all policies on weekly_picks...'
SELECT
  policyname as policy_name,
  CASE cmd
    WHEN 'ALL' THEN 'ALL'
    WHEN 'SELECT' THEN 'SELECT'
    WHEN 'INSERT' THEN 'INSERT'
    WHEN 'UPDATE' THEN 'UPDATE'
    WHEN 'DELETE' THEN 'DELETE'
  END as command,
  CASE
    WHEN policyname LIKE '%validated%' THEN '✓ NEW VALIDATION POLICY'
    WHEN policyname LIKE '%bypass%' THEN 'Service Role Bypass'
    WHEN policyname LIKE '%admin%' THEN 'Admin Bypass'
    ELSE 'Existing Policy'
  END as notes
FROM pg_policies
WHERE tablename = 'weekly_picks'
ORDER BY
  CASE cmd
    WHEN 'ALL' THEN 1
    WHEN 'SELECT' THEN 2
    WHEN 'INSERT' THEN 3
    WHEN 'UPDATE' THEN 4
    WHEN 'DELETE' THEN 5
  END,
  policyname;

\echo ''
\echo '3. Checking for new validation policies specifically...'
SELECT
  COUNT(*) as count,
  CASE
    WHEN COUNT(*) = 2 THEN '✓ BOTH VALIDATION POLICIES EXIST'
    WHEN COUNT(*) = 1 THEN '⚠ ONLY ONE VALIDATION POLICY FOUND'
    ELSE '✗ NO VALIDATION POLICIES FOUND'
  END as status
FROM pg_policies
WHERE tablename = 'weekly_picks'
  AND policyname IN ('weekly_picks_insert_validated', 'weekly_picks_update_validated');

\echo ''
\echo '4. Verifying policy descriptions...'
SELECT
  p.polname as policy_name,
  COALESCE(obj_description(p.oid, 'pg_policy'), 'No description') as description
FROM pg_policy p
JOIN pg_class c ON c.oid = p.polrelid
WHERE c.relname = 'weekly_picks'
  AND p.polname IN ('weekly_picks_insert_validated', 'weekly_picks_update_validated')
ORDER BY p.polname;

\echo ''
\echo '5. Checking that old policies were removed...'
SELECT
  CASE
    WHEN COUNT(*) = 0 THEN '✓ OLD POLICIES SUCCESSFULLY REMOVED'
    ELSE '⚠ OLD POLICIES STILL EXIST (' || COUNT(*) || ' found)'
  END as status
FROM pg_policies
WHERE tablename = 'weekly_picks'
  AND policyname IN ('weekly_picks_insert_own', 'weekly_picks_update_own');

\echo ''
\echo '6. Database data integrity check...'
-- This checks if any existing picks violate the new rules
-- (Should be empty unless there was existing bad data)

\echo '   a) Checking for picks with castaway not on roster...'
SELECT
  COUNT(*) as violations,
  CASE
    WHEN COUNT(*) = 0 THEN '✓ No violations found'
    ELSE '⚠ ' || COUNT(*) || ' picks found with castaway not on roster'
  END as status
FROM weekly_picks wp
WHERE wp.castaway_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM rosters r
    WHERE r.user_id = wp.user_id
      AND r.league_id = wp.league_id
      AND r.castaway_id = wp.castaway_id
      AND r.dropped_at IS NULL
  );

\echo '   b) Checking for picks with eliminated castaway...'
SELECT
  COUNT(*) as violations,
  CASE
    WHEN COUNT(*) = 0 THEN '✓ No violations found'
    ELSE '⚠ ' || COUNT(*) || ' picks found with eliminated castaway'
  END as status
FROM weekly_picks wp
JOIN castaways c ON c.id = wp.castaway_id
WHERE c.status != 'active';

\echo ''
\echo '========================================='
\echo 'VERIFICATION COMPLETE'
\echo '========================================='
\echo ''
\echo 'Expected results:'
\echo '  1. RLS ENABLED'
\echo '  2. 7 total policies (2 bypass + 3 select + 2 validated)'
\echo '  3. BOTH VALIDATION POLICIES EXIST'
\echo '  4. Descriptions present for both policies'
\echo '  5. OLD POLICIES SUCCESSFULLY REMOVED'
\echo '  6. No data integrity violations'
\echo ''
