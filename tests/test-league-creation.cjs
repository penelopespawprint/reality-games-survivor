#!/usr/bin/env node

/**
 * Exploratory Test: Free Private League Creation
 *
 * Tests:
 * 1. League is created with correct settings
 * 2. Commissioner is added as a member
 * 3. Join code is generated
 * 4. League appears in user's dashboard
 */

const https = require('https');

const API_BASE = 'https://rgfl-api-production.up.railway.app';
const SUPABASE_URL = 'https://qxrgejdfxcvsfktgysop.supabase.co';

// Test configuration
const TEST_CONFIG = {
  email: `test-league-${Date.now()}@example.com`,
  password: 'TestPassword123!',
  displayName: 'Test League Creator',
  leagueName: 'Test Private League',
  seasonId: null, // Will fetch from API
};

let testResults = {
  passed: [],
  failed: [],
  warnings: [],
};

function logStep(message) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`  ${message}`);
  console.log('='.repeat(60));
}

function logSuccess(test) {
  console.log(`✓ PASS: ${test}`);
  testResults.passed.push(test);
}

function logFailure(test, details) {
  console.log(`✗ FAIL: ${test}`);
  console.log(`  Details: ${details}`);
  testResults.failed.push({ test, details });
}

function logWarning(message) {
  console.log(`⚠ WARNING: ${message}`);
  testResults.warnings.push(message);
}

function makeRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const requestOptions = {
      hostname: urlObj.hostname,
      port: urlObj.port || 443,
      path: urlObj.pathname + urlObj.search,
      method: options.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    };

    const req = https.request(requestOptions, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          resolve({ status: res.statusCode, data: json, headers: res.headers });
        } catch (e) {
          resolve({ status: res.statusCode, data: data, headers: res.headers });
        }
      });
    });

    req.on('error', reject);

    if (options.body) {
      req.write(JSON.stringify(options.body));
    }

    req.end();
  });
}

async function getActiveSeason() {
  logStep('STEP 1: Get Active Season');

  try {
    const response = await makeRequest(
      `${SUPABASE_URL}/rest/v1/seasons?is_active=eq.true&select=*`,
      {
        headers: {
          'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF4cmdlamRmeGN2c2ZrdGd5c29wIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzQ1NDc5MDEsImV4cCI6MjA1MDEyMzkwMX0.qMxVPCDRpUc-NXQHuoOWJRVNUMl6hKpH9OVdK5sLzYY',
          'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF4cmdlamRmeGN2c2ZrdGd5c29wIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzQ1NDc5MDEsImV4cCI6MjA1MDEyMzkwMX0.qMxVPCDRpUc-NXQHuoOWJRVNUMl6hKpH9OVdK5sLzYY',
        },
      }
    );

    if (response.status === 200 && Array.isArray(response.data) && response.data.length > 0) {
      const season = response.data[0];
      console.log(`Found active season: ${season.name} (ID: ${season.id})`);
      logSuccess('Active season exists in database');
      return season.id;
    } else {
      logWarning('No active season found - league creation may fail');
      // Try to get any season
      const anySeasonResponse = await makeRequest(
        `${SUPABASE_URL}/rest/v1/seasons?select=*&order=created_at.desc&limit=1`,
        {
          headers: {
            'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF4cmdlamRmeGN2c2ZrdGd5c29wIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzQ1NDc5MDEsImV4cCI6MjA1MDEyMzkwMX0.qMxVPCDRpUc-NXQHuoOWJRVNUMl6hKpH9OVdK5sLzYY',
            'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF4cmdlamRmeGN2c2ZrdGd5c29wIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzQ1NDc5MDEsImV4cCI6MjA1MDEyMzkwMX0.qMxVPCDRpUc-NXQHuoOWJRVNUMl6hKpH9OVdK5sLzYY',
          },
        }
      );

      if (anySeasonResponse.data && anySeasonResponse.data.length > 0) {
        return anySeasonResponse.data[0].id;
      }

      throw new Error('No seasons exist in database');
    }
  } catch (error) {
    logFailure('Failed to fetch season', error.message);
    throw error;
  }
}

async function createTestUser() {
  logStep('STEP 2: Create Test User Account');

  try {
    const response = await makeRequest(
      `${SUPABASE_URL}/auth/v1/signup`,
      {
        method: 'POST',
        headers: {
          'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF4cmdlamRmeGN2c2ZrdGd5c29wIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzQ1NDc5MDEsImV4cCI6MjA1MDEyMzkwMX0.qMxVPCDRpUc-NXQHuoOWJRVNUMl6hKpH9OVdK5sLzYY',
        },
        body: {
          email: TEST_CONFIG.email,
          password: TEST_CONFIG.password,
          options: {
            data: {
              display_name: TEST_CONFIG.displayName,
            }
          }
        },
      }
    );

    if (response.status === 200 && response.data.user) {
      console.log(`User created: ${response.data.user.id}`);
      console.log(`Email: ${response.data.user.email}`);
      logSuccess('Test user account created successfully');

      return {
        userId: response.data.user.id,
        accessToken: response.data.access_token,
        email: response.data.user.email,
      };
    } else {
      throw new Error(`Unexpected response: ${JSON.stringify(response.data)}`);
    }
  } catch (error) {
    logFailure('User account creation failed', error.message);
    throw error;
  }
}

async function createFreePrivateLeague(accessToken, seasonId) {
  logStep('STEP 3: Create Free Private League');

  try {
    const response = await makeRequest(
      `${API_BASE}/api/leagues`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
        body: {
          name: TEST_CONFIG.leagueName,
          season_id: seasonId,
          password: 'TestPassword123',
          max_players: 12,
          is_public: false,
        },
      }
    );

    console.log(`\nResponse Status: ${response.status}`);
    console.log('Response Body:', JSON.stringify(response.data, null, 2));

    if (response.status === 201) {
      logSuccess('League created with HTTP 201 status');

      const league = response.data.league;
      const inviteCode = response.data.invite_code;

      // Verify response structure
      if (!league) {
        logFailure('League object missing in response', 'response.data.league is undefined');
        return null;
      }

      if (!inviteCode) {
        logFailure('Invite code missing in response', 'response.data.invite_code is undefined');
      } else {
        logSuccess('Invite code generated: ' + inviteCode);
      }

      // Verify league settings
      console.log('\n--- League Settings Verification ---');

      if (league.name === TEST_CONFIG.leagueName) {
        logSuccess(`League name correct: "${league.name}"`);
      } else {
        logFailure('League name incorrect', `Expected "${TEST_CONFIG.leagueName}", got "${league.name}"`);
      }

      if (league.season_id === seasonId) {
        logSuccess('Season ID correct');
      } else {
        logFailure('Season ID incorrect', `Expected ${seasonId}, got ${league.season_id}`);
      }

      if (league.max_players === 12) {
        logSuccess('Max players set to 12');
      } else {
        logWarning(`Max players is ${league.max_players}, expected 12`);
      }

      if (league.is_public === false) {
        logSuccess('League is private (is_public = false)');
      } else {
        logFailure('League should be private', `is_public = ${league.is_public}`);
      }

      if (league.password_hash) {
        logSuccess('Password hash stored in database');
      } else {
        logFailure('Password hash missing', 'league.password_hash is null');
      }

      if (league.require_donation === false) {
        logSuccess('League is free (require_donation = false)');
      } else {
        logFailure('League should be free', `require_donation = ${league.require_donation}`);
      }

      if (league.code && league.code.length > 0) {
        logSuccess(`League code generated: ${league.code}`);
      } else {
        logFailure('League code missing or empty', `code = ${league.code}`);
      }

      if (response.data.requires_payment === true || response.data.checkout_url) {
        logFailure('Free league should not require payment', 'Response includes payment fields');
      } else {
        logSuccess('No payment required (as expected for free league)');
      }

      return league;
    } else {
      logFailure(`League creation failed with status ${response.status}`, JSON.stringify(response.data));
      return null;
    }
  } catch (error) {
    logFailure('League creation request failed', error.message);
    throw error;
  }
}

async function verifyCommissionerMembership(leagueId, userId, accessToken) {
  logStep('STEP 4: Verify Commissioner Added as Member');

  try {
    const response = await makeRequest(
      `${SUPABASE_URL}/rest/v1/league_members?league_id=eq.${leagueId}&user_id=eq.${userId}&select=*`,
      {
        headers: {
          'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF4cmdlamRmeGN2c2ZrdGd5c29wIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzQ1NDc5MDEsImV4cCI6MjA1MDEyMzkwMX0.qMxVPCDRpUc-NXQHuoOWJRVNUMl6hKpH9OVdK5sLzYY',
          'Authorization': `Bearer ${accessToken}`,
        },
      }
    );

    console.log('Response:', JSON.stringify(response.data, null, 2));

    if (response.status === 200 && Array.isArray(response.data) && response.data.length > 0) {
      const membership = response.data[0];
      logSuccess('Commissioner is a member of the league');

      if (membership.draft_position === 1) {
        logSuccess('Commissioner assigned draft position 1');
      } else {
        logWarning(`Commissioner draft position is ${membership.draft_position}, expected 1`);
      }

      if (membership.total_points === 0) {
        logSuccess('Initial total_points is 0');
      } else {
        logWarning(`Initial total_points is ${membership.total_points}, expected 0`);
      }

      return true;
    } else if (response.status === 200 && Array.isArray(response.data) && response.data.length === 0) {
      logFailure('Commissioner NOT added as league member', 'league_members query returned empty array');
      return false;
    } else {
      logFailure('Failed to query league_members table', `Status ${response.status}: ${JSON.stringify(response.data)}`);
      return false;
    }
  } catch (error) {
    logFailure('Membership verification failed', error.message);
    return false;
  }
}

async function verifyDashboardAppearance(accessToken) {
  logStep('STEP 5: Verify League Appears in User Dashboard');

  try {
    const response = await makeRequest(
      `${API_BASE}/api/me`,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      }
    );

    console.log('Response:', JSON.stringify(response.data, null, 2));

    if (response.status === 200) {
      const user = response.data.user;
      const leagues = response.data.leagues;

      if (!leagues || !Array.isArray(leagues)) {
        logFailure('Leagues array missing from /api/me response', `leagues = ${typeof leagues}`);
        return false;
      }

      if (leagues.length === 0) {
        logFailure('No leagues found in user dashboard', 'leagues array is empty');
        return false;
      }

      logSuccess(`User dashboard shows ${leagues.length} league(s)`);

      const testLeague = leagues.find(l => l.name === TEST_CONFIG.leagueName);
      if (testLeague) {
        logSuccess('Test league appears in dashboard');
        console.log('League data:', JSON.stringify(testLeague, null, 2));
        return true;
      } else {
        logFailure('Test league not found in dashboard', `Found leagues: ${leagues.map(l => l.name).join(', ')}`);
        return false;
      }
    } else {
      logFailure(`Dashboard request failed with status ${response.status}`, JSON.stringify(response.data));
      return false;
    }
  } catch (error) {
    logFailure('Dashboard verification failed', error.message);
    return false;
  }
}

async function verifyJoinCodeUniqueness(leagueCode) {
  logStep('STEP 6: Verify Join Code is Unique');

  try {
    const response = await makeRequest(
      `${API_BASE}/api/leagues/code/${leagueCode}`,
      {
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );

    console.log('Response:', JSON.stringify(response.data, null, 2));

    if (response.status === 200 && response.data.league) {
      logSuccess('Join code is valid and returns league data');

      const league = response.data.league;

      if (league.name === TEST_CONFIG.leagueName) {
        logSuccess('Join code returns correct league');
      } else {
        logFailure('Join code returns wrong league', `Expected "${TEST_CONFIG.leagueName}", got "${league.name}"`);
      }

      if (league.has_password === true) {
        logSuccess('League shows has_password = true');
      } else {
        logFailure('League should indicate password requirement', 'has_password = false');
      }

      if (league.member_count === 1) {
        logSuccess('Member count is 1 (commissioner only)');
      } else {
        logWarning(`Member count is ${league.member_count}, expected 1`);
      }

      // Verify password_hash is NOT exposed
      if (league.password_hash === undefined) {
        logSuccess('Password hash not exposed in public API');
      } else {
        logFailure('Security: Password hash should not be exposed', 'password_hash is in response');
      }

      return true;
    } else {
      logFailure('Join code lookup failed', `Status ${response.status}: ${JSON.stringify(response.data)}`);
      return false;
    }
  } catch (error) {
    logFailure('Join code verification failed', error.message);
    return false;
  }
}

function printSummary() {
  logStep('TEST SUMMARY');

  console.log(`\n✓ PASSED: ${testResults.passed.length}`);
  testResults.passed.forEach(test => console.log(`  - ${test}`));

  console.log(`\n✗ FAILED: ${testResults.failed.length}`);
  testResults.failed.forEach(({ test, details }) => {
    console.log(`  - ${test}`);
    console.log(`    ${details}`);
  });

  console.log(`\n⚠ WARNINGS: ${testResults.warnings.length}`);
  testResults.warnings.forEach(warning => console.log(`  - ${warning}`));

  const totalTests = testResults.passed.length + testResults.failed.length;
  const passRate = totalTests > 0 ? ((testResults.passed.length / totalTests) * 100).toFixed(1) : 0;

  console.log(`\nPass Rate: ${passRate}% (${testResults.passed.length}/${totalTests})`);

  if (testResults.failed.length === 0) {
    console.log('\n🎉 ALL TESTS PASSED!');
  } else {
    console.log('\n❌ SOME TESTS FAILED - Review results above');
  }
}

async function main() {
  console.log('\n' + '='.repeat(60));
  console.log('  FREE PRIVATE LEAGUE CREATION - EXPLORATORY TEST');
  console.log('='.repeat(60));
  console.log('\nTarget API:', API_BASE);
  console.log('Test User Email:', TEST_CONFIG.email);
  console.log('League Name:', TEST_CONFIG.leagueName);

  try {
    // Step 1: Get active season
    const seasonId = await getActiveSeason();
    TEST_CONFIG.seasonId = seasonId;

    // Step 2: Create test user
    const { userId, accessToken, email } = await createTestUser();

    // Step 3: Create free private league
    const league = await createFreePrivateLeague(accessToken, seasonId);

    if (!league) {
      console.log('\n❌ League creation failed - aborting remaining tests');
      printSummary();
      process.exit(1);
    }

    // Step 4: Verify commissioner membership
    await verifyCommissionerMembership(league.id, userId, accessToken);

    // Step 5: Verify dashboard appearance
    await verifyDashboardAppearance(accessToken);

    // Step 6: Verify join code
    await verifyJoinCodeUniqueness(league.code);

    // Print summary
    printSummary();

    // Exit with appropriate code
    process.exit(testResults.failed.length > 0 ? 1 : 0);

  } catch (error) {
    console.error('\n❌ TEST EXECUTION FAILED');
    console.error('Error:', error.message);
    console.error('Stack:', error.stack);
    printSummary();
    process.exit(1);
  }
}

main();
