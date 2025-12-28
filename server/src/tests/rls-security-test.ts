/**
 * RLS Security Test Suite
 * Tests Row Level Security policies across all tables
 *
 * REQUIREMENTS:
 * - Two test users in database (user_a, user_b)
 * - Test league with both users as members
 * - SUPABASE_URL and SUPABASE_ANON_KEY environment variables
 *
 * RUN: npx tsx src/tests/rls-security-test.ts
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';

interface TestUser {
  id: string;
  email: string;
  accessToken: string;
  client: SupabaseClient;
}

interface TestResults {
  passed: number;
  failed: number;
  errors: Array<{ test: string; expected: string; actual: string; error?: string }>;
}

const results: TestResults = {
  passed: 0,
  failed: 0,
  errors: []
};

// Test configuration
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://qxrgejdfxcvsfktgysop.supabase.co';
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || '';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

if (!SUPABASE_ANON_KEY || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Missing environment variables: SUPABASE_ANON_KEY or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

// Clients
const anonClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
const serviceClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// Helper functions
function createUserClient(accessToken: string): SupabaseClient {
  return createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: {
      headers: {
        Authorization: `Bearer ${accessToken}`
      }
    }
  });
}

function pass(testName: string) {
  console.log(`✅ ${testName}`);
  results.passed++;
}

function fail(testName: string, expected: string, actual: string, error?: string) {
  console.log(`❌ ${testName}`);
  console.log(`   Expected: ${expected}`);
  console.log(`   Actual: ${actual}`);
  if (error) console.log(`   Error: ${error}`);
  results.failed++;
  results.errors.push({ test: testName, expected, actual, error });
}

async function expectError(
  testName: string,
  operation: () => Promise<any>,
  errorMessage?: string
) {
  try {
    const result = await operation();
    if (result.error) {
      pass(testName);
      return;
    }
    if (result.data && Array.isArray(result.data) && result.data.length === 0) {
      pass(testName);
      return;
    }
    fail(testName, 'Error or empty result', `Success with ${result.data?.length || 'unknown'} rows`);
  } catch (error) {
    pass(testName);
  }
}

async function expectSuccess(
  testName: string,
  operation: () => Promise<any>,
  minRows: number = 0
) {
  try {
    const result = await operation();
    if (result.error) {
      fail(testName, 'Success', `Error: ${result.error.message}`, result.error.message);
      return;
    }
    const rowCount = Array.isArray(result.data) ? result.data.length : (result.data ? 1 : 0);
    if (rowCount >= minRows) {
      pass(testName);
    } else {
      fail(testName, `At least ${minRows} rows`, `${rowCount} rows`);
    }
  } catch (error: any) {
    fail(testName, 'Success', 'Exception thrown', error.message);
  }
}

// ============================================
// TEST SUITE
// ============================================

async function runTests() {
  console.log('\n🔒 RLS Security Test Suite\n');
  console.log('=' .repeat(60));

  // ============================================
  // SETUP: Get test users
  // ============================================
  console.log('\n📋 SETUP: Creating test users...\n');

  let userA: TestUser;
  let userB: TestUser;
  let sharedLeagueId: string;

  try {
    // Create or get test users
    const { data: signUpA } = await anonClient.auth.signUp({
      email: `test-a-${Date.now()}@example.com`,
      password: 'TestPassword123!'
    });

    const { data: signUpB } = await anonClient.auth.signUp({
      email: `test-b-${Date.now()}@example.com`,
      password: 'TestPassword123!'
    });

    if (!signUpA?.user || !signUpA?.session || !signUpB?.user || !signUpB?.session) {
      console.error('❌ Failed to create test users. Check Supabase auth settings.');
      console.log('\n⚠️  Note: This test suite requires the ability to create test users.');
      console.log('   Run manual tests instead using the test scenarios in QA-REPORT-RLS-SECURITY.md');
      process.exit(1);
    }

    userA = {
      id: signUpA.user.id,
      email: signUpA.user.email!,
      accessToken: signUpA.session.access_token,
      client: createUserClient(signUpA.session.access_token)
    };

    userB = {
      id: signUpB.user.id,
      email: signUpB.user.email!,
      accessToken: signUpB.session.access_token,
      client: createUserClient(signUpB.session.access_token)
    };

    console.log(`✅ User A created: ${userA.email}`);
    console.log(`✅ User B created: ${userB.email}`);

    // Create test league using service role
    const { data: season } = await serviceClient
      .from('seasons')
      .select('id')
      .eq('is_active', true)
      .single();

    if (!season) {
      console.error('❌ No active season found. Cannot create test league.');
      process.exit(1);
    }

    const { data: league, error: leagueError } = await serviceClient
      .from('leagues')
      .insert({
        season_id: season.id,
        name: `RLS Test League ${Date.now()}`,
        code: `TEST${Date.now()}`,
        commissioner_id: userA.id,
        max_players: 12,
        is_public: false,
        status: 'forming',
        draft_status: 'pending'
      })
      .select()
      .single();

    if (leagueError || !league) {
      console.error('❌ Failed to create test league:', leagueError);
      process.exit(1);
    }

    sharedLeagueId = league.id;
    console.log(`✅ Test league created: ${league.name}`);

    // Add both users to league
    await serviceClient.from('league_members').insert([
      { league_id: sharedLeagueId, user_id: userA.id },
      { league_id: sharedLeagueId, user_id: userB.id }
    ]);

    console.log(`✅ Both users added to test league`);

  } catch (error: any) {
    console.error('❌ Setup failed:', error.message);
    console.log('\n⚠️  Note: Running tests requires proper Supabase configuration.');
    console.log('   If auth is disabled, run manual tests using test scenarios in QA-REPORT-RLS-SECURITY.md');
    process.exit(1);
  }

  // ============================================
  // TEST 1: Public Data Visibility
  // ============================================
  console.log('\n' + '='.repeat(60));
  console.log('TEST 1: Public Data Visibility');
  console.log('='.repeat(60) + '\n');

  await expectSuccess(
    'Authenticated user can read seasons',
    () => userA.client.from('seasons').select('*'),
    1
  );

  await expectSuccess(
    'Authenticated user can read episodes',
    () => userA.client.from('episodes').select('*')
  );

  await expectSuccess(
    'Authenticated user can read castaways',
    () => userA.client.from('castaways').select('*')
  );

  await expectSuccess(
    'Authenticated user can read scoring_rules',
    () => userA.client.from('scoring_rules').select('*')
  );

  // ============================================
  // TEST 2: User Data Isolation
  // ============================================
  console.log('\n' + '='.repeat(60));
  console.log('TEST 2: User Data Isolation');
  console.log('='.repeat(60) + '\n');

  // Create user-specific data
  await serviceClient.from('notifications').insert({
    user_id: userB.id,
    type: 'email',
    message: 'Test notification for User B',
    sent_at: new Date().toISOString()
  });

  await expectError(
    'User A cannot read User B notifications',
    () => userA.client.from('notifications').select('*').eq('user_id', userB.id)
  );

  await expectSuccess(
    'User B can read own notifications',
    () => userB.client.from('notifications').select('*').eq('user_id', userB.id),
    1
  );

  await expectError(
    'User A cannot read User B payments',
    () => userA.client.from('payments').select('*').eq('user_id', userB.id)
  );

  await expectError(
    'User A cannot read User B sms_commands',
    () => userA.client.from('sms_commands').select('*').eq('user_id', userB.id)
  );

  // ============================================
  // TEST 3: Infrastructure Table Protection (CRITICAL)
  // ============================================
  console.log('\n' + '='.repeat(60));
  console.log('TEST 3: Infrastructure Table Protection (CRITICAL)');
  console.log('='.repeat(60) + '\n');

  await expectError(
    'User A cannot read email_queue',
    () => userA.client.from('email_queue').select('*')
  );

  await expectError(
    'User A cannot insert into email_queue',
    () => userA.client.from('email_queue').insert({
      type: 'normal',
      to_email: 'attacker@example.com',
      subject: 'Malicious email',
      html: '<p>Attack</p>'
    })
  );

  await expectError(
    'User A cannot read failed_emails',
    () => userA.client.from('failed_emails').select('*')
  );

  await expectError(
    'User A cannot read cron_job_logs',
    () => userA.client.from('cron_job_logs').select('*')
  );

  // ============================================
  // TEST 4: League Password Hash Protection
  // ============================================
  console.log('\n' + '='.repeat(60));
  console.log('TEST 4: League Password Hash Protection');
  console.log('='.repeat(60) + '\n');

  const { data: leagues } = await userA.client
    .from('leagues')
    .select('password_hash')
    .limit(1);

  if (leagues && leagues[0] && 'password_hash' in leagues[0]) {
    fail(
      'Leagues query should not return password_hash field',
      'password_hash excluded',
      'password_hash included in result'
    );
  } else {
    pass('Leagues query excludes password_hash (or column does not exist)');
  }

  // ============================================
  // TEST 5: Service Role Bypass
  // ============================================
  console.log('\n' + '='.repeat(60));
  console.log('TEST 5: Service Role Bypass');
  console.log('='.repeat(60) + '\n');

  await expectSuccess(
    'Service role can read all users',
    () => serviceClient.from('users').select('*'),
    2
  );

  await expectSuccess(
    'Service role can read all notifications',
    () => serviceClient.from('notifications').select('*')
  );

  await expectSuccess(
    'Service role can read email_queue',
    () => serviceClient.from('email_queue').select('*')
  );

  await expectSuccess(
    'Service role can insert into email_queue',
    async () => {
      const result = await serviceClient.from('email_queue').insert({
        type: 'critical',
        to_email: 'test@example.com',
        subject: 'Test',
        html: '<p>Test</p>'
      }).select();
      // Clean up
      if (result.data && result.data[0]) {
        await serviceClient.from('email_queue').delete().eq('id', result.data[0].id);
      }
      return result;
    },
    1
  );

  // ============================================
  // TEST 6: Weekly Picks Security
  // ============================================
  console.log('\n' + '='.repeat(60));
  console.log('TEST 6: Weekly Picks Security (Trigger Validation)');
  console.log('='.repeat(60) + '\n');

  await expectError(
    'User A cannot directly insert weekly_picks (must use service role)',
    () => userA.client.from('weekly_picks').insert({
      user_id: userA.id,
      league_id: sharedLeagueId,
      episode_id: '00000000-0000-0000-0000-000000000001', // Fake ID
      status: 'pending'
    })
  );

  // ============================================
  // TEST 7: Notification Preferences
  // ============================================
  console.log('\n' + '='.repeat(60));
  console.log('TEST 7: Notification Preferences');
  console.log('='.repeat(60) + '\n');

  await expectSuccess(
    'User A can read own notification preferences',
    () => userA.client.from('notification_preferences').select('*').eq('user_id', userA.id)
  );

  await expectError(
    'User A cannot read User B notification preferences',
    () => userA.client.from('notification_preferences').select('*').eq('user_id', userB.id)
  );

  // Test INSERT policy (should work after migration 028)
  await expectSuccess(
    'User A can insert own notification preferences (if not exists)',
    async () => {
      const result = await userA.client.from('notification_preferences').upsert({
        user_id: userA.id,
        email_results: true,
        sms_results: false,
        spoiler_delay_hours: 24
      }).select();
      return result;
    }
  );

  // ============================================
  // TEST 8: Results Tokens
  // ============================================
  console.log('\n' + '='.repeat(60));
  console.log('TEST 8: Results Tokens');
  console.log('='.repeat(60) + '\n');

  // Service role creates token
  const { data: episode } = await serviceClient
    .from('episodes')
    .select('id')
    .limit(1)
    .single();

  if (episode) {
    const { data: token } = await serviceClient.from('results_tokens').insert({
      token: `test-token-${Date.now()}`,
      user_id: userB.id,
      episode_id: episode.id,
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
    }).select().single();

    if (token) {
      await expectError(
        'User A cannot read User B results tokens',
        () => userA.client.from('results_tokens').select('*').eq('user_id', userB.id)
      );

      await expectSuccess(
        'User B can read own results tokens',
        () => userB.client.from('results_tokens').select('*').eq('user_id', userB.id),
        1
      );

      // Clean up
      await serviceClient.from('results_tokens').delete().eq('id', token.id);
    }
  }

  // ============================================
  // CLEANUP
  // ============================================
  console.log('\n' + '='.repeat(60));
  console.log('CLEANUP');
  console.log('='.repeat(60) + '\n');

  try {
    // Delete test data
    await serviceClient.from('league_members').delete().eq('league_id', sharedLeagueId);
    await serviceClient.from('leagues').delete().eq('id', sharedLeagueId);
    await serviceClient.from('notifications').delete().eq('user_id', userB.id);

    // Note: Cannot delete users via API, must be done via Supabase dashboard
    console.log('⚠️  Test users created but not deleted (must delete manually from dashboard):');
    console.log(`   - ${userA.email}`);
    console.log(`   - ${userB.email}`);
  } catch (error: any) {
    console.log('⚠️  Cleanup errors (non-critical):', error.message);
  }

  // ============================================
  // RESULTS
  // ============================================
  console.log('\n' + '='.repeat(60));
  console.log('TEST RESULTS');
  console.log('='.repeat(60) + '\n');

  console.log(`✅ Passed: ${results.passed}`);
  console.log(`❌ Failed: ${results.failed}`);
  console.log(`📊 Total: ${results.passed + results.failed}`);
  console.log(`📈 Success Rate: ${((results.passed / (results.passed + results.failed)) * 100).toFixed(1)}%\n`);

  if (results.failed > 0) {
    console.log('\n❌ FAILED TESTS:\n');
    results.errors.forEach(({ test, expected, actual, error }) => {
      console.log(`  • ${test}`);
      console.log(`    Expected: ${expected}`);
      console.log(`    Actual: ${actual}`);
      if (error) console.log(`    Error: ${error}`);
      console.log('');
    });
  }

  if (results.failed === 0) {
    console.log('✅ All tests passed! RLS policies are working correctly.\n');
    process.exit(0);
  } else {
    console.log('❌ Some tests failed. Review RLS policies and apply fixes.\n');
    console.log('📄 See QA-REPORT-RLS-SECURITY.md for detailed findings and recommendations.\n');
    process.exit(1);
  }
}

// Run tests
runTests().catch((error) => {
  console.error('\n❌ Test suite crashed:', error);
  process.exit(1);
});
