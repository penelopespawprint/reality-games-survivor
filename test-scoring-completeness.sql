-- Scoring Completeness Validation Test Script
-- Execute this in Supabase SQL Editor to validate the fix

-- ============================================================================
-- TEST SUITE: Scoring Completeness Validation
-- ============================================================================

-- Test Setup: Create test episode and castaways if needed
-- Note: Adjust UUIDs to match your actual test data

-- ============================================================================
-- TEST 1: Verify check_scoring_completeness() Function Exists
-- ============================================================================
SELECT
  routine_name,
  routine_type,
  data_type
FROM information_schema.routines
WHERE routine_name = 'check_scoring_completeness'
  AND routine_schema = 'public';

-- Expected: 1 row showing function exists
-- Result: _______________

-- ============================================================================
-- TEST 2: Get Active Season and Episodes
-- ============================================================================
SELECT
  s.id as season_id,
  s.name as season_name,
  s.is_active,
  COUNT(e.id) as episode_count
FROM seasons s
LEFT JOIN episodes e ON e.season_id = s.id
WHERE s.is_active = true
GROUP BY s.id, s.name, s.is_active;

-- Expected: 1 active season with episodes
-- Result: _______________

-- ============================================================================
-- TEST 3: Find Episode for Testing (preferably unfinalized)
-- ============================================================================
SELECT
  e.id,
  e.number,
  e.title,
  e.is_scored,
  e.air_date,
  COUNT(DISTINCT es.castaway_id) as scored_castaways,
  (SELECT COUNT(*) FROM castaways WHERE season_id = e.season_id AND status = 'active') as total_active_castaways
FROM episodes e
LEFT JOIN episode_scores es ON es.episode_id = e.id
WHERE e.season_id IN (SELECT id FROM seasons WHERE is_active = true)
  AND e.is_scored = false
GROUP BY e.id, e.number, e.title, e.is_scored, e.air_date
ORDER BY e.number
LIMIT 5;

-- Expected: List of unfinalized episodes with score counts
-- Result: _______________
-- Copy episode_id for testing: _______________

-- ============================================================================
-- TEST 4: Check Active Castaways for Season
-- ============================================================================
-- Replace {season_id} with actual season ID from TEST 2
SELECT
  id,
  name,
  status,
  photo_url
FROM castaways
WHERE season_id = '{season_id}'  -- REPLACE WITH ACTUAL SEASON ID
  AND status = 'active'
ORDER BY name;

-- Expected: List of active castaways (should be 18-24)
-- Result: _______________

-- ============================================================================
-- TEST 5: Test check_scoring_completeness() - Zero Scores
-- ============================================================================
-- Replace {episode_id} with episode ID from TEST 3
SELECT * FROM check_scoring_completeness('{episode_id}');  -- REPLACE WITH ACTUAL EPISODE ID

-- Expected Output:
-- is_complete: false
-- total_castaways: 18 (or actual count)
-- scored_castaways: 0
-- unscored_castaway_ids: [array of UUIDs]
-- unscored_castaway_names: [array of names]
-- Result: _______________

-- ============================================================================
-- TEST 6: Add Partial Scores (50% of castaways)
-- ============================================================================
-- This creates test scores for approximately half the castaways
-- Replace {episode_id} and {season_id} with actual values

-- First, get castaway IDs
SELECT
  id,
  name
FROM castaways
WHERE season_id = '{season_id}'  -- REPLACE WITH ACTUAL SEASON ID
  AND status = 'active'
ORDER BY name
LIMIT (SELECT COUNT(*)/2 FROM castaways WHERE season_id = '{season_id}' AND status = 'active');

-- Copy first 9 castaway IDs: _______________

-- Get a scoring rule ID (e.g., SURVIVED_EPISODE)
SELECT id, code, name, points
FROM scoring_rules
WHERE code = 'SURVIVED_EPISODE'
LIMIT 1;

-- Copy scoring_rule_id: _______________

-- Insert test scores for half the castaways
-- IMPORTANT: Replace {episode_id}, {castaway_id}, {scoring_rule_id}, {user_id}
/*
INSERT INTO episode_scores (episode_id, castaway_id, scoring_rule_id, quantity, points, entered_by)
VALUES
  ('{episode_id}', '{castaway_id_1}', '{scoring_rule_id}', 1, 10, '{admin_user_id}'),
  ('{episode_id}', '{castaway_id_2}', '{scoring_rule_id}', 1, 10, '{admin_user_id}'),
  ('{episode_id}', '{castaway_id_3}', '{scoring_rule_id}', 1, 10, '{admin_user_id}'),
  ('{episode_id}', '{castaway_id_4}', '{scoring_rule_id}', 1, 10, '{admin_user_id}'),
  ('{episode_id}', '{castaway_id_5}', '{scoring_rule_id}', 1, 10, '{admin_user_id}'),
  ('{episode_id}', '{castaway_id_6}', '{scoring_rule_id}', 1, 10, '{admin_user_id}'),
  ('{episode_id}', '{castaway_id_7}', '{scoring_rule_id}', 1, 10, '{admin_user_id}'),
  ('{episode_id}', '{castaway_id_8}', '{scoring_rule_id}', 1, 10, '{admin_user_id}'),
  ('{episode_id}', '{castaway_id_9}', '{scoring_rule_id}', 1, 10, '{admin_user_id}');
*/

-- ============================================================================
-- TEST 7: Test check_scoring_completeness() - Partial Scores (50%)
-- ============================================================================
SELECT * FROM check_scoring_completeness('{episode_id}');  -- REPLACE WITH ACTUAL EPISODE ID

-- Expected Output:
-- is_complete: false
-- total_castaways: 18
-- scored_castaways: 9
-- unscored_castaway_ids: [array with 9 UUIDs]
-- unscored_castaway_names: [array with 9 names]
-- Result: _______________

-- ============================================================================
-- TEST 8: Verify Unscored Castaway Names Match Reality
-- ============================================================================
-- This query shows which castaways are scored vs unscored
SELECT
  c.id,
  c.name,
  CASE
    WHEN es.castaway_id IS NOT NULL THEN 'SCORED'
    ELSE 'UNSCORED'
  END as status,
  COUNT(es.id) as score_count
FROM castaways c
LEFT JOIN episode_scores es ON es.castaway_id = c.id AND es.episode_id = '{episode_id}'
WHERE c.season_id = '{season_id}'
  AND c.status = 'active'
GROUP BY c.id, c.name, es.castaway_id
ORDER BY status DESC, c.name;

-- Expected: Half marked SCORED, half marked UNSCORED
-- Result: _______________

-- ============================================================================
-- TEST 9: Attempt to Finalize with Incomplete Scoring
-- ============================================================================
-- This should FAIL with error_code = 'SCORING_INCOMPLETE'
SELECT * FROM finalize_episode_scoring(
  '{episode_id}',  -- REPLACE WITH ACTUAL EPISODE ID
  '{admin_user_id}'  -- REPLACE WITH ACTUAL ADMIN USER ID
);

-- Expected Output:
-- finalized: false
-- eliminated_castaway_ids: {}
-- standings_updated: false
-- error_code: 'SCORING_INCOMPLETE'
-- error_message: 'Scoring incomplete: 9 of 18 castaways scored. Missing: [names]'
-- Result: _______________

-- ============================================================================
-- TEST 10: Complete Remaining Scores (100% scored)
-- ============================================================================
-- Get remaining unscored castaways
SELECT
  c.id,
  c.name
FROM castaways c
LEFT JOIN episode_scores es ON es.castaway_id = c.id AND es.episode_id = '{episode_id}'
WHERE c.season_id = '{season_id}'
  AND c.status = 'active'
  AND es.id IS NULL
ORDER BY c.name;

-- Copy remaining castaway IDs: _______________

-- Insert scores for remaining castaways
/*
INSERT INTO episode_scores (episode_id, castaway_id, scoring_rule_id, quantity, points, entered_by)
VALUES
  ('{episode_id}', '{castaway_id_10}', '{scoring_rule_id}', 1, 10, '{admin_user_id}'),
  ('{episode_id}', '{castaway_id_11}', '{scoring_rule_id}', 1, 10, '{admin_user_id}'),
  ('{episode_id}', '{castaway_id_12}', '{scoring_rule_id}', 1, 10, '{admin_user_id}'),
  ('{episode_id}', '{castaway_id_13}', '{scoring_rule_id}', 1, 10, '{admin_user_id}'),
  ('{episode_id}', '{castaway_id_14}', '{scoring_rule_id}', 1, 10, '{admin_user_id}'),
  ('{episode_id}', '{castaway_id_15}', '{scoring_rule_id}', 1, 10, '{admin_user_id}'),
  ('{episode_id}', '{castaway_id_16}', '{scoring_rule_id}', 1, 10, '{admin_user_id}'),
  ('{episode_id}', '{castaway_id_17}', '{scoring_rule_id}', 1, 10, '{admin_user_id}'),
  ('{episode_id}', '{castaway_id_18}', '{scoring_rule_id}', 1, 10, '{admin_user_id}');
*/

-- ============================================================================
-- TEST 11: Test check_scoring_completeness() - All Scored (100%)
-- ============================================================================
SELECT * FROM check_scoring_completeness('{episode_id}');

-- Expected Output:
-- is_complete: true
-- total_castaways: 18
-- scored_castaways: 18
-- unscored_castaway_ids: []
-- unscored_castaway_names: []
-- Result: _______________

-- ============================================================================
-- TEST 12: Finalize with Complete Scoring (Should Succeed)
-- ============================================================================
SELECT * FROM finalize_episode_scoring(
  '{episode_id}',
  '{admin_user_id}'
);

-- Expected Output:
-- finalized: true
-- eliminated_castaway_ids: [array - depends on ELIM scores]
-- standings_updated: true
-- error_code: NULL
-- error_message: NULL
-- Result: _______________

-- ============================================================================
-- TEST 13: Verify Episode Marked as Finalized
-- ============================================================================
SELECT
  id,
  number,
  title,
  is_scored,
  air_date
FROM episodes
WHERE id = '{episode_id}';

-- Expected: is_scored = true
-- Result: _______________

-- ============================================================================
-- TEST 14: Verify Scoring Session Finalized
-- ============================================================================
SELECT
  id,
  episode_id,
  status,
  finalized_at,
  finalized_by
FROM scoring_sessions
WHERE episode_id = '{episode_id}';

-- Expected: status = 'finalized', finalized_at is set
-- Result: _______________

-- ============================================================================
-- TEST 15: Test Idempotency - Finalize Again
-- ============================================================================
-- Should succeed without error (idempotent operation)
SELECT * FROM finalize_episode_scoring(
  '{episode_id}',
  '{admin_user_id}'
);

-- Expected Output:
-- finalized: true
-- eliminated_castaway_ids: {}
-- standings_updated: true
-- error_code: NULL
-- error_message: NULL
-- Result: _______________

-- ============================================================================
-- TEST 16: Edge Case - Episode with All Eliminated Castaways
-- ============================================================================
-- Create test scenario: episode where all castaways are eliminated
-- This should still return is_complete = true with total_castaways = 0

-- First, create a test episode far in future
/*
INSERT INTO episodes (season_id, number, title, air_date, is_scored)
VALUES (
  '{season_id}',
  99,
  'Test Episode - All Eliminated',
  '2026-12-31',
  false
)
RETURNING id;
*/

-- Copy new episode_id: _______________

-- Test with no active castaways (all eliminated)
SELECT * FROM check_scoring_completeness('{test_episode_id}');

-- Expected Output:
-- is_complete: true (edge case - 0 >= 0)
-- total_castaways: 0
-- scored_castaways: 0
-- unscored_castaway_ids: []
-- unscored_castaway_names: []
-- Result: _______________

-- ============================================================================
-- CLEANUP (OPTIONAL)
-- ============================================================================
-- Remove test scores if needed
/*
DELETE FROM episode_scores WHERE episode_id = '{episode_id}';
DELETE FROM scoring_sessions WHERE episode_id = '{episode_id}';
UPDATE episodes SET is_scored = false WHERE id = '{episode_id}';
*/

-- ============================================================================
-- TEST SUMMARY
-- ============================================================================
-- Record your results here:

/*
TEST RESULTS SUMMARY:

Test 1 - Function Exists: _______________
Test 2 - Active Season: _______________
Test 3 - Test Episode Found: _______________
Test 4 - Active Castaways: _______________
Test 5 - Zero Scores Check: _______________
Test 6 - Partial Scores Added: _______________
Test 7 - Partial Completeness Check: _______________
Test 8 - Unscored Names Match: _______________
Test 9 - Finalize Rejected (Incomplete): _______________
Test 10 - Complete Scores Added: _______________
Test 11 - Full Completeness Check: _______________
Test 12 - Finalize Succeeded (Complete): _______________
Test 13 - Episode Marked Finalized: _______________
Test 14 - Session Finalized: _______________
Test 15 - Idempotency Test: _______________
Test 16 - Edge Case (Zero Active): _______________

OVERALL STATUS: _______________
ISSUES FOUND: _______________
NEXT STEPS: _______________
*/
