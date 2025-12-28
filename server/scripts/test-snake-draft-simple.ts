/**
 * Snake Draft Algorithm Test (Simple Version)
 *
 * Tests the critical snake draft fix with SQL simulation:
 * - Tests get_snake_picker_index() function directly
 * - Verifies snake pattern for 12 users, 24 picks
 * - No database modifications, pure function testing
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

function logInfo(message: string) {
  console.log(`${COLORS.blue}ℹ ${message}${COLORS.reset}`);
}

async function main() {
  console.log(`${COLORS.bright}${COLORS.magenta}
╔════════════════════════════════════════════════════════════════════════════╗
║                     SNAKE DRAFT ALGORITHM TEST                             ║
║                                                                            ║
║  Testing the critical integer division fix in get_snake_picker_index()    ║
║                                                                            ║
║  Scenario: 12 players, 2 rounds (24 total picks)                          ║
╚════════════════════════════════════════════════════════════════════════════╝
${COLORS.reset}\n`);

  let testsPassed = 0;
  let testsFailed = 0;

  try {
    // Step 1: Verify function exists
    logSection('STEP 1: VERIFY SNAKE DRAFT FUNCTION EXISTS');

    const { data: functionData, error: functionError } = await supabase
      .rpc('get_snake_picker_index', {
        p_pick_number: 0,
        p_total_members: 12,
      });

    if (functionError) {
      logError(`Function not found or error: ${functionError.message}`);
      process.exit(1);
    }

    logSuccess('Function get_snake_picker_index() exists and is callable');

    // Step 2: Test all 24 picks
    logSection('STEP 2: SIMULATE 24 DRAFT PICKS');

    interface PickResult {
      pickNumber: number;
      round: number;
      pickerIndex: number;
    }

    const picks: PickResult[] = [];

    for (let pickNumber = 0; pickNumber < 24; pickNumber++) {
      const { data, error } = await supabase
        .rpc('get_snake_picker_index', {
          p_pick_number: pickNumber,
          p_total_members: 12,
        })
        .single();

      if (error) {
        logError(`Failed at pick ${pickNumber + 1}: ${error.message}`);
        process.exit(1);
      }

      picks.push({
        pickNumber: pickNumber + 1,
        round: data.round,
        pickerIndex: data.picker_index,
      });

      const roundLabel = `ROUND ${data.round}`;
      const arrow = data.round === 1 ? '→' : '←';
      console.log(
        `Pick ${String(pickNumber + 1).padStart(2)} ${arrow} ${roundLabel.padEnd(7)} ${arrow} ` +
        `Player ${String(data.picker_index + 1).padStart(2)} (index ${data.picker_index})`
      );
    }

    // Step 3: Verify Results
    logSection('STEP 3: VERIFY DRAFT RESULTS');

    // Test 1: Each player gets exactly 2 picks
    logInfo('TEST 1: Each player gets exactly 2 picks');
    const picksPerPlayer = new Map<number, number>();
    for (const pick of picks) {
      picksPerPlayer.set(
        pick.pickerIndex,
        (picksPerPlayer.get(pick.pickerIndex) || 0) + 1
      );
    }

    let test1Pass = true;
    for (let playerIndex = 0; playerIndex < 12; playerIndex++) {
      const count = picksPerPlayer.get(playerIndex) || 0;
      if (count === 2) {
        logSuccess(`Player ${playerIndex + 1}: ${count} picks ✓`);
      } else {
        logError(`Player ${playerIndex + 1}: ${count} picks (expected 2)`);
        test1Pass = false;
      }
    }

    if (test1Pass) {
      logSuccess('\nTEST 1: PASSED - All players get exactly 2 picks');
      testsPassed++;
    } else {
      logError('\nTEST 1: FAILED - Some players have wrong number of picks');
      testsFailed++;
    }

    // Test 2: Round assignment
    console.log();
    logInfo('TEST 2: Round assignment');
    const round1Picks = picks.filter(p => p.round === 1);
    const round2Picks = picks.filter(p => p.round === 2);

    const round1Count = round1Picks.length;
    const round2Count = round2Picks.length;

    console.log(`  Round 1: ${round1Count} picks (expected 12)`);
    console.log(`  Round 2: ${round2Count} picks (expected 12)`);

    if (round1Count === 12 && round2Count === 12) {
      logSuccess('TEST 2: PASSED - Correct round assignment (12 picks per round)');
      testsPassed++;
    } else {
      logError('TEST 2: FAILED - Incorrect round assignment');
      testsFailed++;
    }

    // Test 3: Snake pattern verification
    console.log();
    logInfo('TEST 3: Snake pattern verification');

    console.log('\nRound 1 (Forward 0→11):');
    let test3Pass = true;
    for (let i = 0; i < 12; i++) {
      const pick = round1Picks[i];
      const expected = i;
      const match = pick.pickerIndex === expected;
      const status = match ? '✓' : '✗';
      const color = match ? COLORS.green : COLORS.red;
      console.log(
        `  Pick ${String(i + 1).padStart(2)}: Player ${String(pick.pickerIndex + 1).padStart(2)} ` +
        `(expected ${String(expected + 1).padStart(2)}) ${color}${status}${COLORS.reset}`
      );
      if (!match) test3Pass = false;
    }

    console.log('\nRound 2 (Reverse 11→0):');
    for (let i = 0; i < 12; i++) {
      const pick = round2Picks[i];
      const expected = 11 - i;
      const match = pick.pickerIndex === expected;
      const status = match ? '✓' : '✗';
      const color = match ? COLORS.green : COLORS.red;
      console.log(
        `  Pick ${String(i + 13).padStart(2)}: Player ${String(pick.pickerIndex + 1).padStart(2)} ` +
        `(expected ${String(expected + 1).padStart(2)}) ${color}${status}${COLORS.reset}`
      );
      if (!match) test3Pass = false;
    }

    if (test3Pass) {
      logSuccess('\nTEST 3: PASSED - Snake pattern correct (1-12, 12-1)');
      testsPassed++;
    } else {
      logError('\nTEST 3: FAILED - Snake pattern incorrect');
      testsFailed++;
    }

    // Test 4: Pick distribution per player
    console.log();
    logInfo('TEST 4: Pick distribution per player');

    const playerPicks = new Map<number, number[]>();
    for (const pick of picks) {
      if (!playerPicks.has(pick.pickerIndex)) {
        playerPicks.set(pick.pickerIndex, []);
      }
      playerPicks.get(pick.pickerIndex)!.push(pick.pickNumber);
    }

    let test4Pass = true;
    console.log();
    for (let playerIndex = 0; playerIndex < 12; playerIndex++) {
      const pickNumbers = playerPicks.get(playerIndex) || [];
      const rounds = pickNumbers.map(pn => picks.find(p => p.pickNumber === pn)!.round);

      const expectedPick1 = playerIndex + 1;
      const expectedPick2 = 24 - playerIndex;

      const actualPick1 = pickNumbers[0];
      const actualPick2 = pickNumbers[1];

      const match = actualPick1 === expectedPick1 && actualPick2 === expectedPick2;
      const status = match ? '✓' : '✗';
      const color = match ? COLORS.green : COLORS.red;

      console.log(
        `  ${color}Player ${String(playerIndex + 1).padStart(2)}: ` +
        `Picks [${String(actualPick1).padStart(2)}, ${String(actualPick2).padStart(2)}] ` +
        `(expected [${String(expectedPick1).padStart(2)}, ${String(expectedPick2).padStart(2)}]) ` +
        `Rounds [${rounds.join(', ')}] ${status}${COLORS.reset}`
      );

      if (!match) test4Pass = false;
    }

    if (test4Pass) {
      logSuccess('\nTEST 4: PASSED - Correct pick distribution per player');
      testsPassed++;
    } else {
      logError('\nTEST 4: FAILED - Incorrect pick distribution');
      testsFailed++;
    }

    // Step 4: Summary
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
║  • Each player gets exactly 2 picks                                       ║
║  • Draft follows snake pattern (1-12, 12-1)                               ║
║  • Round assignment is correct (12 picks per round)                       ║
║  • Pick distribution matches expected pattern                             ║
║                                                                            ║
║  The integer division fix is working as expected!                         ║
╚════════════════════════════════════════════════════════════════════════════╝
${COLORS.reset}`);
      process.exit(0);
    } else {
      console.log(`${COLORS.bright}${COLORS.red}
╔════════════════════════════════════════════════════════════════════════════╗
║                          ✗ TESTS FAILED ✗                                 ║
║                                                                            ║
║  The snake draft algorithm has issues that need to be fixed.              ║
║  This likely means the integer division bug is still present.             ║
╚════════════════════════════════════════════════════════════════════════════╝
${COLORS.reset}`);
      process.exit(1);
    }

  } catch (error) {
    console.error(`\n${COLORS.red}${COLORS.bright}ERROR:${COLORS.reset} ${error}`);
    console.error(error);
    process.exit(1);
  }
}

main();
