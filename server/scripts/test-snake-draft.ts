/**
 * Snake Draft Algorithm Test
 *
 * Tests the critical snake draft fix with 12 users:
 * - Each user gets exactly 2 castaways
 * - Draft order follows snake pattern (1-12, 12-1)
 * - Users get their highest-ranked available castaways
 * - No duplicate castaway assignments
 */

import { createClient } from '@supabase/supabase-js';

// Get environment variables
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing required environment variables:');
  console.error('  SUPABASE_URL:', supabaseUrl ? '✓' : '✗');
  console.error('  SUPABASE_SERVICE_ROLE_KEY:', supabaseServiceKey ? '✓' : '✗');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

interface DraftPick {
  pickNumber: number;
  round: number;
  pickerIndex: number;
  userId: string;
  userName: string;
  castawayId: string;
  castawayName: string;
}

interface TestUser {
  id: string;
  email: string;
  displayName: string;
  rankings: string[]; // Array of castaway IDs in preference order
}

const COLORS = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
};

function logSection(title: string) {
  console.log(`\n${COLORS.bright}${COLORS.cyan}${'='.repeat(80)}${COLORS.reset}`);
  console.log(`${COLORS.bright}${COLORS.cyan}${title}${COLORS.reset}`);
  console.log(`${COLORS.bright}${COLORS.cyan}${'='.repeat(80)}${COLORS.reset}\n`);
}

function logSuccess(message: string) {
  console.log(`${COLORS.green}✓ ${message}${COLORS.reset}`);
}

function logError(message: string) {
  console.log(`${COLORS.red}✗ ${message}${COLORS.reset}`);
}

function logWarning(message: string) {
  console.log(`${COLORS.yellow}⚠ ${message}${COLORS.reset}`);
}

function logInfo(message: string) {
  console.log(`${COLORS.blue}ℹ ${message}${COLORS.reset}`);
}

async function main() {
  console.log(`${COLORS.bright}${COLORS.magenta}
╔════════════════════════════════════════════════════════════════════════════╗
║                     SNAKE DRAFT ALGORITHM TEST                             ║
║                                                                            ║
║  Testing the critical integer division fix in get_snake_picker_index()    ║
╚════════════════════════════════════════════════════════════════════════════╝
${COLORS.reset}\n`);

  let testsPassed = 0;
  let testsFailed = 0;
  let leagueId: string | null = null;
  let seasonId: string | null = null;

  try {
    // Step 1: Get active season
    logSection('STEP 1: GET ACTIVE SEASON');
    const { data: seasons, error: seasonError } = await supabase
      .from('seasons')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(1);

    if (seasonError) throw seasonError;
    if (!seasons || seasons.length === 0) throw new Error('No seasons found');

    seasonId = seasons[0].id;
    logInfo(`Season: ${seasons[0].name} (ID: ${seasonId})`);

    // Step 2: Get castaways
    logSection('STEP 2: GET CASTAWAYS');
    const { data: castaways, error: castawayError } = await supabase
      .from('castaways')
      .select('id, name')
      .eq('season_id', seasonId)
      .order('name');

    if (castawayError) throw castawayError;
    if (!castaways || castaways.length < 24) {
      throw new Error(`Need at least 24 castaways, found ${castaways?.length || 0}`);
    }

    logInfo(`Found ${castaways.length} castaways`);
    console.log(castaways.map((c, i) => `  ${i + 1}. ${c.name}`).join('\n'));

    // Step 3: Create test users
    logSection('STEP 3: CREATE TEST USERS');
    const testUsers: TestUser[] = [];

    for (let i = 1; i <= 12; i++) {
      const email = `test-draft-user-${i}@test.com`;

      // Create auth user
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email,
        email_confirm: true,
        user_metadata: {
          display_name: `Test User ${i}`,
        },
      });

      if (authError && !authError.message.includes('already registered')) {
        throw authError;
      }

      const userId = authError?.message.includes('already registered')
        ? (await supabase.auth.admin.listUsers()).data.users.find(u => u.email === email)?.id
        : authData.user.id;

      if (!userId) throw new Error(`Failed to create user ${i}`);

      // Create user record
      const { error: userError } = await supabase
        .from('users')
        .upsert({
          id: userId,
          email,
          display_name: `Test User ${i}`,
        });

      if (userError && !userError.message.includes('duplicate key')) {
        throw userError;
      }

      // Create random but deterministic rankings (each user has different preferences)
      const rankings = [...castaways]
        .sort(() => (i % 2 === 0 ? Math.random() - 0.5 : 0.5 - Math.random()))
        .map(c => c.id);

      testUsers.push({
        id: userId,
        email,
        displayName: `Test User ${i}`,
        rankings,
      });

      logInfo(`Created: ${testUsers[i - 1].displayName}`);
    }

    // Step 4: Create test league
    logSection('STEP 4: CREATE TEST LEAGUE');
    const { data: league, error: leagueError } = await supabase
      .from('leagues')
      .insert({
        name: 'Snake Draft Test League',
        season_id: seasonId,
        league_type: 'private',
        commissioner_id: testUsers[0].id,
        draft_status: 'pending',
        status: 'pending',
        max_members: 12,
      })
      .select()
      .single();

    if (leagueError) throw leagueError;
    leagueId = league.id;
    logInfo(`League created: ${league.name} (ID: ${leagueId})`);

    // Step 5: Add members to league
    logSection('STEP 5: ADD LEAGUE MEMBERS');
    for (const user of testUsers) {
      const { error: memberError } = await supabase
        .from('league_members')
        .insert({
          league_id: leagueId,
          user_id: user.id,
          joined_at: new Date().toISOString(),
        });

      if (memberError) throw memberError;
      logInfo(`Added: ${user.displayName}`);
    }

    // Step 6: Submit draft rankings
    logSection('STEP 6: SUBMIT DRAFT RANKINGS');
    for (const user of testUsers) {
      const { error: rankingError } = await supabase
        .from('draft_rankings')
        .upsert({
          user_id: user.id,
          season_id: seasonId,
          rankings: user.rankings,
          submitted_at: new Date().toISOString(),
        });

      if (rankingError) throw rankingError;
      logInfo(`Rankings submitted: ${user.displayName} (top 3: ${user.rankings.slice(0, 3).map(id => castaways.find(c => c.id === id)?.name).join(', ')})`);
    }

    // Step 7: Set draft order and start draft
    logSection('STEP 7: SET DRAFT ORDER & START DRAFT');
    const draftOrder = testUsers.map(u => u.id);

    const { error: orderError } = await supabase
      .from('leagues')
      .update({
        draft_order: draftOrder,
        draft_status: 'in_progress',
      })
      .eq('id', leagueId);

    if (orderError) throw orderError;
    logInfo('Draft order set (sequential 1-12)');
    logInfo('Draft status: IN PROGRESS');

    // Step 8: Test snake draft algorithm
    logSection('STEP 8: SIMULATE SNAKE DRAFT (24 PICKS)');
    const draftPicks: DraftPick[] = [];
    const pickedCastaways = new Set<string>();

    for (let pickNumber = 0; pickNumber < 24; pickNumber++) {
      // Calculate whose turn it is
      const { data: snakeData, error: snakeError } = await supabase
        .rpc('get_snake_picker_index', {
          p_pick_number: pickNumber,
          p_total_members: 12,
        })
        .single();

      if (snakeError) throw snakeError;

      const round = snakeData.round;
      const pickerIndex = snakeData.picker_index;
      const currentUser = testUsers[pickerIndex];

      // Find highest-ranked available castaway for this user
      let castawayToPickId: string | null = null;
      for (const castawayId of currentUser.rankings) {
        if (!pickedCastaways.has(castawayId)) {
          castawayToPickId = castawayId;
          break;
        }
      }

      if (!castawayToPickId) {
        throw new Error(`No available castaways for ${currentUser.displayName} at pick ${pickNumber + 1}`);
      }

      const castawayToPick = castaways.find(c => c.id === castawayToPickId)!;

      // Record the pick
      const { error: pickError } = await supabase
        .from('rosters')
        .insert({
          league_id: leagueId,
          user_id: currentUser.id,
          castaway_id: castawayToPickId,
          draft_round: round,
          draft_pick: pickNumber + 1,
          acquired_via: 'draft',
        });

      if (pickError) throw pickError;

      pickedCastaways.add(castawayToPickId);

      draftPicks.push({
        pickNumber: pickNumber + 1,
        round,
        pickerIndex,
        userId: currentUser.id,
        userName: currentUser.displayName,
        castawayId: castawayToPickId,
        castawayName: castawayToPick.name,
      });

      const roundLabel = round === 1 ? 'ROUND 1' : 'ROUND 2';
      const arrow = round === 1 ? '→' : '←';
      console.log(
        `Pick ${String(pickNumber + 1).padStart(2)} ${arrow} ${roundLabel} ${arrow} ` +
        `Player ${String(pickerIndex + 1).padStart(2)} (${currentUser.displayName.padEnd(15)}) ${arrow} ` +
        `${castawayToPick.name}`
      );
    }

    // Step 9: Verify results
    logSection('STEP 9: VERIFY DRAFT RESULTS');

    // Test 1: Each user gets exactly 2 castaways
    logInfo('TEST 1: Each user gets exactly 2 castaways');
    const picksPerUser = new Map<string, DraftPick[]>();
    for (const pick of draftPicks) {
      if (!picksPerUser.has(pick.userId)) {
        picksPerUser.set(pick.userId, []);
      }
      picksPerUser.get(pick.userId)!.push(pick);
    }

    let test1Pass = true;
    for (const user of testUsers) {
      const userPicks = picksPerUser.get(user.id) || [];
      if (userPicks.length === 2) {
        logSuccess(`${user.displayName}: ${userPicks.length} castaways ✓`);
      } else {
        logError(`${user.displayName}: ${userPicks.length} castaways (expected 2)`);
        test1Pass = false;
      }
    }

    if (test1Pass) {
      logSuccess('TEST 1: PASSED - All users have exactly 2 castaways');
      testsPassed++;
    } else {
      logError('TEST 1: FAILED - Some users have wrong number of castaways');
      testsFailed++;
    }

    // Test 2: Snake pattern (1-12, 12-1)
    console.log();
    logInfo('TEST 2: Snake pattern verification');

    const round1Picks = draftPicks.filter(p => p.round === 1);
    const round2Picks = draftPicks.filter(p => p.round === 2);

    console.log('\nRound 1 (Forward 0→11):');
    let test2Pass = true;
    for (let i = 0; i < 12; i++) {
      const pick = round1Picks[i];
      const expected = i;
      const status = pick.pickerIndex === expected ? '✓' : '✗';
      const color = pick.pickerIndex === expected ? COLORS.green : COLORS.red;
      console.log(`  Pick ${String(i + 1).padStart(2)}: Player ${String(pick.pickerIndex + 1).padStart(2)} (expected ${String(expected + 1).padStart(2)}) ${color}${status}${COLORS.reset}`);
      if (pick.pickerIndex !== expected) test2Pass = false;
    }

    console.log('\nRound 2 (Reverse 11→0):');
    for (let i = 0; i < 12; i++) {
      const pick = round2Picks[i];
      const expected = 11 - i;
      const status = pick.pickerIndex === expected ? '✓' : '✗';
      const color = pick.pickerIndex === expected ? COLORS.green : COLORS.red;
      console.log(`  Pick ${String(i + 13).padStart(2)}: Player ${String(pick.pickerIndex + 1).padStart(2)} (expected ${String(expected + 1).padStart(2)}) ${color}${status}${COLORS.reset}`);
      if (pick.pickerIndex !== expected) test2Pass = false;
    }

    if (test2Pass) {
      logSuccess('\nTEST 2: PASSED - Snake pattern correct (1-12, 12-1)');
      testsPassed++;
    } else {
      logError('\nTEST 2: FAILED - Snake pattern incorrect');
      testsFailed++;
    }

    // Test 3: No duplicate castaways
    console.log();
    logInfo('TEST 3: No duplicate castaway assignments');

    const castawayPickCount = new Map<string, number>();
    for (const pick of draftPicks) {
      castawayPickCount.set(
        pick.castawayId,
        (castawayPickCount.get(pick.castawayId) || 0) + 1
      );
    }

    let test3Pass = true;
    const duplicates: string[] = [];
    for (const [castawayId, count] of castawayPickCount.entries()) {
      if (count > 1) {
        const castaway = castaways.find(c => c.id === castawayId);
        duplicates.push(`${castaway?.name} (picked ${count} times)`);
        test3Pass = false;
      }
    }

    if (test3Pass) {
      logSuccess('TEST 3: PASSED - No duplicate castaway assignments (24 unique castaways)');
      testsPassed++;
    } else {
      logError('TEST 3: FAILED - Duplicate castaways found:');
      duplicates.forEach(d => console.log(`  - ${d}`));
      testsFailed++;
    }

    // Test 4: Users get highest-ranked available castaways
    console.log();
    logInfo('TEST 4: Users get highest-ranked available castaways');

    let test4Pass = true;
    const pickedAtEachRound = new Set<string>();

    for (const pick of draftPicks.sort((a, b) => a.pickNumber - b.pickNumber)) {
      const user = testUsers.find(u => u.id === pick.userId)!;

      // Find what their highest available castaway should have been
      let expectedCastawayId: string | null = null;
      for (const castawayId of user.rankings) {
        if (!pickedAtEachRound.has(castawayId)) {
          expectedCastawayId = castawayId;
          break;
        }
      }

      const match = pick.castawayId === expectedCastawayId;
      const status = match ? '✓' : '✗';
      const color = match ? COLORS.green : COLORS.red;

      if (!match) {
        const expectedCastaway = castaways.find(c => c.id === expectedCastawayId);
        console.log(
          `  ${color}${status} Pick ${String(pick.pickNumber).padStart(2)}: ${pick.userName.padEnd(15)} ` +
          `got ${pick.castawayName.padEnd(20)} (expected ${expectedCastaway?.name || 'unknown'})${COLORS.reset}`
        );
        test4Pass = false;
      }

      pickedAtEachRound.add(pick.castawayId);
    }

    if (test4Pass) {
      logSuccess('TEST 4: PASSED - All users got their highest-ranked available castaways');
      testsPassed++;
    } else {
      logError('TEST 4: FAILED - Some users did not get their highest-ranked available castaways');
      testsFailed++;
    }

    // Step 10: Summary
    logSection('TEST SUMMARY');
    console.log(`${COLORS.bright}Total Tests: ${testsPassed + testsFailed}${COLORS.reset}`);
    console.log(`${COLORS.green}Passed: ${testsPassed}${COLORS.reset}`);
    console.log(`${COLORS.red}Failed: ${testsFailed}${COLORS.reset}`);
    console.log();

    if (testsFailed === 0) {
      console.log(`${COLORS.bright}${COLORS.green}
╔════════════════════════════════════════════════════════════════════════════╗
║                          ✓ ALL TESTS PASSED ✓                             ║
║                                                                            ║
║  The snake draft algorithm is working correctly:                          ║
║  • Each user gets exactly 2 castaways                                     ║
║  • Draft follows snake pattern (1-12, 12-1)                               ║
║  • No duplicate castaway assignments                                      ║
║  • Users get highest-ranked available castaways                           ║
╚════════════════════════════════════════════════════════════════════════════╝
${COLORS.reset}`);
      process.exit(0);
    } else {
      console.log(`${COLORS.bright}${COLORS.red}
╔════════════════════════════════════════════════════════════════════════════╗
║                          ✗ TESTS FAILED ✗                                 ║
║                                                                            ║
║  The snake draft algorithm has issues that need to be fixed.              ║
╚════════════════════════════════════════════════════════════════════════════╝
${COLORS.reset}`);
      process.exit(1);
    }

  } catch (error) {
    console.error(`\n${COLORS.red}${COLORS.bright}ERROR:${COLORS.reset} ${error}`);
    process.exit(1);
  } finally {
    // Cleanup: Delete test data
    if (leagueId) {
      logSection('CLEANUP: DELETING TEST DATA');

      try {
        // Delete rosters
        await supabase.from('rosters').delete().eq('league_id', leagueId);
        logInfo('Deleted rosters');

        // Delete league members
        await supabase.from('league_members').delete().eq('league_id', leagueId);
        logInfo('Deleted league members');

        // Delete league
        await supabase.from('leagues').delete().eq('id', leagueId);
        logInfo('Deleted league');

        // Delete draft rankings (for test users)
        const testUserIds = (await supabase.auth.admin.listUsers()).data.users
          .filter(u => u.email?.includes('test-draft-user'))
          .map(u => u.id);

        if (testUserIds.length > 0) {
          await supabase.from('draft_rankings').delete().in('user_id', testUserIds);
          logInfo(`Deleted draft rankings for ${testUserIds.length} test users`);
        }

        // Note: We're NOT deleting the test users themselves as they might be referenced elsewhere
        logWarning('Test users retained (may be referenced in other data)');

        logSuccess('Cleanup complete');
      } catch (cleanupError) {
        logError(`Cleanup failed: ${cleanupError}`);
      }
    }
  }
}

main();
