/**
 * League Join Testing Script
 *
 * Tests the league joining functionality including:
 * 1. Successful join with valid code
 * 2. Database updates (league_members table)
 * 3. League capacity validation (12 player max)
 * 4. Edge cases (duplicate joins, invalid codes, etc.)
 */

import { createClient } from '@supabase/supabase-js';

// Configuration
const API_BASE = process.env.API_BASE || 'https://rgfl-api-production.up.railway.app/api';
const SUPABASE_URL = 'https://qxrgejdfxcvsfktgysop.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

if (!SUPABASE_SERVICE_KEY) {
  console.error('ERROR: SUPABASE_SERVICE_ROLE_KEY environment variable is required');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// Test utilities
const testResults = [];
let testCounter = 0;

function logTest(name, status, details = '') {
  testCounter++;
  const result = {
    id: testCounter,
    name,
    status,
    details,
    timestamp: new Date().toISOString()
  };
  testResults.push(result);

  const emoji = status === 'PASS' ? '✅' : status === 'FAIL' ? '❌' : '⚠️';
  console.log(`${emoji} Test ${testCounter}: ${name}`);
  if (details) console.log(`   ${details}`);
}

// Cleanup function
async function cleanupTestData(testUserId, testLeagueId) {
  console.log('\n🧹 Cleaning up test data...');

  if (testUserId) {
    await supabase.from('league_members').delete().eq('user_id', testUserId);
    await supabase.from('users').delete().eq('id', testUserId);
  }

  if (testLeagueId) {
    await supabase.from('league_members').delete().eq('league_id', testLeagueId);
    await supabase.from('leagues').delete().eq('id', testLeagueId);
  }
}

// Main test suite
async function runTests() {
  console.log('🎯 Starting League Join Test Suite\n');
  console.log('=' .repeat(60));

  let testUserId = null;
  let testLeagueId = null;
  let testLeagueCode = null;
  let testUserToken = null;
  let activeSeason = null;

  try {
    // SETUP: Get active season
    console.log('\n📋 SETUP: Fetching active season...');
    const { data: seasons } = await supabase
      .from('seasons')
      .select('*')
      .eq('is_active', true)
      .single();

    activeSeason = seasons;

    if (!activeSeason) {
      logTest('Active season exists', 'FAIL', 'No active season found');
      return;
    }
    logTest('Active season exists', 'PASS', `Season ${activeSeason.number}: ${activeSeason.name}`);

    // SETUP: Create test user
    console.log('\n📋 SETUP: Creating test user...');
    const testEmail = `test-join-${Date.now()}@example.com`;
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: testEmail,
      password: 'TestPassword123!',
      email_confirm: true,
    });

    if (authError || !authData.user) {
      logTest('Create test user', 'FAIL', authError?.message || 'No user returned');
      return;
    }

    testUserId = authData.user.id;
    logTest('Create test user', 'PASS', `User ID: ${testUserId}`);

    // Create user profile
    const { error: profileError } = await supabase.from('users').insert({
      id: testUserId,
      email: testEmail,
      display_name: 'Test Join User',
    });

    if (profileError) {
      logTest('Create user profile', 'FAIL', profileError.message);
      return;
    }
    logTest('Create user profile', 'PASS');

    // Get auth token for API calls
    const { data: sessionData } = await supabase.auth.signInWithPassword({
      email: testEmail,
      password: 'TestPassword123!',
    });

    if (!sessionData.session) {
      logTest('Get auth token', 'FAIL', 'No session returned');
      return;
    }

    testUserToken = sessionData.session.access_token;
    logTest('Get auth token', 'PASS');

    // SETUP: Create test league
    console.log('\n📋 SETUP: Creating test league...');
    const { data: league, error: leagueError } = await supabase
      .from('leagues')
      .insert({
        name: `Test League ${Date.now()}`,
        season_id: activeSeason.id,
        commissioner_id: testUserId,
        max_players: 12,
        require_donation: false,
        is_public: true,
      })
      .select()
      .single();

    if (leagueError || !league) {
      logTest('Create test league', 'FAIL', leagueError?.message || 'No league returned');
      return;
    }

    testLeagueId = league.id;
    testLeagueCode = league.code;
    logTest('Create test league', 'PASS', `League code: ${testLeagueCode}`);

    // TEST 1: Get league by code (public endpoint)
    console.log('\n🧪 TEST 1: Get League By Code (Public)');
    const codeResponse = await fetch(`${API_BASE}/leagues/code/${testLeagueCode}`);
    const codeData = await codeResponse.json();

    if (codeResponse.ok && codeData.league) {
      logTest('Get league by code', 'PASS', `Found league: ${codeData.league.name}`);
      logTest('Member count is 0', codeData.league.member_count === 0 ? 'PASS' : 'FAIL',
        `Count: ${codeData.league.member_count}`);
    } else {
      logTest('Get league by code', 'FAIL', codeData.error || 'Unknown error');
    }

    // TEST 2: Create second user to test join
    console.log('\n🧪 TEST 2: Create Second User for Join Test');
    const testEmail2 = `test-joiner-${Date.now()}@example.com`;
    const { data: authData2, error: authError2 } = await supabase.auth.admin.createUser({
      email: testEmail2,
      password: 'TestPassword123!',
      email_confirm: true,
    });

    let testUser2Id = null;
    let testUser2Token = null;

    if (authError2 || !authData2.user) {
      logTest('Create second test user', 'FAIL', authError2?.message);
    } else {
      testUser2Id = authData2.user.id;

      await supabase.from('users').insert({
        id: testUser2Id,
        email: testEmail2,
        display_name: 'Test Joiner',
      });

      const { data: session2 } = await supabase.auth.signInWithPassword({
        email: testEmail2,
        password: 'TestPassword123!',
      });

      testUser2Token = session2?.session?.access_token;
      logTest('Create second test user', 'PASS', `User ID: ${testUser2Id}`);
    }

    // TEST 3: Join league successfully
    if (testUser2Token) {
      console.log('\n🧪 TEST 3: Join League Successfully');
      const joinResponse = await fetch(`${API_BASE}/leagues/${testLeagueId}/join`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${testUser2Token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({}),
      });

      const joinData = await joinResponse.json();

      if (joinResponse.ok && joinData.membership) {
        logTest('Join league API call', 'PASS', 'Membership created');

        // Verify database update
        const { data: member, error: memberError } = await supabase
          .from('league_members')
          .select('*')
          .eq('league_id', testLeagueId)
          .eq('user_id', testUser2Id)
          .single();

        if (member && !memberError) {
          logTest('Verify league_members record', 'PASS', `Member ID: ${member.id}`);
          logTest('Verify joined_at timestamp', member.joined_at ? 'PASS' : 'FAIL');
          logTest('Verify initial total_points is 0', member.total_points === 0 ? 'PASS' : 'FAIL');
        } else {
          logTest('Verify league_members record', 'FAIL', memberError?.message || 'Member not found');
        }

        // Verify member count updated
        const codeCheck = await fetch(`${API_BASE}/leagues/code/${testLeagueCode}`);
        const codeCheckData = await codeCheck.json();

        if (codeCheck.ok && codeCheckData.league.member_count === 1) {
          logTest('Verify member count updated', 'PASS', 'Count is now 1');
        } else {
          logTest('Verify member count updated', 'FAIL',
            `Expected 1, got ${codeCheckData.league?.member_count}`);
        }
      } else {
        logTest('Join league API call', 'FAIL', joinData.error || 'Unknown error');
      }
    }

    // TEST 4: Duplicate join prevention
    if (testUser2Token) {
      console.log('\n🧪 TEST 4: Prevent Duplicate Join');
      const dupResponse = await fetch(`${API_BASE}/leagues/${testLeagueId}/join`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${testUser2Token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({}),
      });

      const dupData = await dupResponse.json();

      if (dupResponse.status === 400 && dupData.error?.includes('Already a member')) {
        logTest('Prevent duplicate join', 'PASS', 'Correctly rejected duplicate');
      } else {
        logTest('Prevent duplicate join', 'FAIL',
          `Expected 400 with error, got ${dupResponse.status}: ${dupData.error}`);
      }
    }

    // TEST 5: Invalid code
    console.log('\n🧪 TEST 5: Invalid Code Handling');
    const invalidResponse = await fetch(`${API_BASE}/leagues/code/INVALID999`);
    const invalidData = await invalidResponse.json();

    if (invalidResponse.status === 404) {
      logTest('Invalid code returns 404', 'PASS');
    } else {
      logTest('Invalid code returns 404', 'FAIL',
        `Expected 404, got ${invalidResponse.status}`);
    }

    // TEST 6: League capacity limit (12 players)
    console.log('\n🧪 TEST 6: League Capacity Limit (12 Players)');

    // Create 11 more users to fill league to capacity
    const fillUsers = [];
    for (let i = 0; i < 11; i++) {
      const fillEmail = `fill-${i}-${Date.now()}@example.com`;
      const { data: fillAuth } = await supabase.auth.admin.createUser({
        email: fillEmail,
        password: 'TestPassword123!',
        email_confirm: true,
      });

      if (fillAuth.user) {
        await supabase.from('users').insert({
          id: fillAuth.user.id,
          email: fillEmail,
          display_name: `Fill User ${i}`,
        });

        // Add to league directly via database
        await supabase.from('league_members').insert({
          league_id: testLeagueId,
          user_id: fillAuth.user.id,
        });

        fillUsers.push(fillAuth.user.id);
      }
    }

    logTest('Create 11 fill users', fillUsers.length === 11 ? 'PASS' : 'FAIL',
      `Created ${fillUsers.length}/11 users`);

    // Verify member count is now 12 (1 from earlier test + 11 fill users)
    const { count: memberCount } = await supabase
      .from('league_members')
      .select('*', { count: 'exact', head: true })
      .eq('league_id', testLeagueId);

    logTest('League has 12 members', memberCount === 12 ? 'PASS' : 'FAIL',
      `Count: ${memberCount}/12`);

    // Create 13th user and try to join
    const overflow13Email = `overflow-${Date.now()}@example.com`;
    const { data: overflow13Auth } = await supabase.auth.admin.createUser({
      email: overflow13Email,
      password: 'TestPassword123!',
      email_confirm: true,
    });

    if (overflow13Auth.user) {
      await supabase.from('users').insert({
        id: overflow13Auth.user.id,
        email: overflow13Email,
        display_name: 'Overflow User',
      });

      const { data: overflow13Session } = await supabase.auth.signInWithPassword({
        email: overflow13Email,
        password: 'TestPassword123!',
      });

      const overflowResponse = await fetch(`${API_BASE}/leagues/${testLeagueId}/join`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${overflow13Session.session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({}),
      });

      const overflowData = await overflowResponse.json();

      if (overflowResponse.status === 400 && overflowData.error?.includes('full')) {
        logTest('Reject 13th player', 'PASS', 'League full error returned');
      } else {
        logTest('Reject 13th player', 'FAIL',
          `Expected 400 'full' error, got ${overflowResponse.status}: ${overflowData.error}`);
      }

      // Cleanup overflow user
      await supabase.from('users').delete().eq('id', overflow13Auth.user.id);
    }

    // Cleanup fill users
    for (const userId of fillUsers) {
      await supabase.from('league_members').delete().eq('user_id', userId);
      await supabase.from('users').delete().eq('id', userId);
    }

    // TEST 7: Closed league prevention
    console.log('\n🧪 TEST 7: Closed League Prevention');

    // Update league to be closed
    await supabase
      .from('leagues')
      .update({ is_closed: true })
      .eq('id', testLeagueId);

    const closedEmail = `closed-test-${Date.now()}@example.com`;
    const { data: closedAuth } = await supabase.auth.admin.createUser({
      email: closedEmail,
      password: 'TestPassword123!',
      email_confirm: true,
    });

    if (closedAuth.user) {
      await supabase.from('users').insert({
        id: closedAuth.user.id,
        email: closedEmail,
        display_name: 'Closed Test User',
      });

      const { data: closedSession } = await supabase.auth.signInWithPassword({
        email: closedEmail,
        password: 'TestPassword123!',
      });

      // First clear existing members to make room
      await supabase
        .from('league_members')
        .delete()
        .eq('league_id', testLeagueId)
        .neq('user_id', testUserId);

      const closedResponse = await fetch(`${API_BASE}/leagues/${testLeagueId}/join`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${closedSession.session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({}),
      });

      const closedData = await closedResponse.json();

      if (closedResponse.status === 403 && closedData.error?.includes('closed')) {
        logTest('Reject join to closed league', 'PASS');
      } else {
        logTest('Reject join to closed league', 'FAIL',
          `Expected 403 'closed' error, got ${closedResponse.status}: ${closedData.error}`);
      }

      // Cleanup closed test user
      await supabase.from('users').delete().eq('id', closedAuth.user.id);
    }

    // Cleanup second test user
    if (testUser2Id) {
      await supabase.from('league_members').delete().eq('user_id', testUser2Id);
      await supabase.from('users').delete().eq('id', testUser2Id);
    }

  } catch (error) {
    console.error('\n❌ Test suite error:', error);
    logTest('Test suite execution', 'FAIL', error.message);
  } finally {
    // Cleanup
    await cleanupTestData(testUserId, testLeagueId);
  }

  // Print summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 TEST SUMMARY\n');

  const passed = testResults.filter(r => r.status === 'PASS').length;
  const failed = testResults.filter(r => r.status === 'FAIL').length;
  const warnings = testResults.filter(r => r.status === 'WARN').length;

  console.log(`Total Tests: ${testResults.length}`);
  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`⚠️  Warnings: ${warnings}`);
  console.log(`\nSuccess Rate: ${((passed / testResults.length) * 100).toFixed(1)}%`);

  if (failed > 0) {
    console.log('\n❌ FAILED TESTS:');
    testResults
      .filter(r => r.status === 'FAIL')
      .forEach(r => console.log(`  - ${r.name}: ${r.details}`));
  }

  process.exit(failed > 0 ? 1 : 0);
}

// Run tests
runTests().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
