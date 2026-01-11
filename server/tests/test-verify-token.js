/**
 * Test script for /api/results/verify-token endpoint
 *
 * Tests:
 * 1. Valid token returns success
 * 2. Invalid token returns error
 * 3. Expired token returns error
 * 4. Token usage tracking
 * 5. Missing token parameter
 */

import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

// Use hardcoded values for testing (production values from Railway)
const SUPABASE_URL = 'https://qxrgejdfxcvsfktgysop.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

if (!SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ SUPABASE_SERVICE_ROLE_KEY environment variable is required');
  console.error('Run: export SUPABASE_SERVICE_ROLE_KEY="your_key_here"');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
const API_URL = 'https://rgfl-api-production.up.railway.app';

// Test utilities
function log(section, message) {
  console.log(`\n[${section}] ${message}`);
}

function logSuccess(message) {
  console.log(`✅ ${message}`);
}

function logError(message) {
  console.log(`❌ ${message}`);
}

function logInfo(message) {
  console.log(`ℹ️  ${message}`);
}

// Clean up test data
async function cleanup() {
  log('CLEANUP', 'Removing test data...');

  // Delete test tokens
  await supabase.from('results_tokens').delete().ilike('token', 'test_%');

  logSuccess('Cleanup complete');
}

// Create test data
async function setupTestData() {
  log('SETUP', 'Creating test data...');

  // Get a real user
  const { data: users, error: userError } = await supabase
    .from('users')
    .select('id, email')
    .limit(1);

  if (userError || !users || users.length === 0) {
    logError('No users found in database. Cannot run tests.');
    process.exit(1);
  }

  const testUser = users[0];
  logInfo(`Using test user: ${testUser.email} (${testUser.id})`);

  // Get a real episode
  const { data: episodes, error: episodeError } = await supabase
    .from('episodes')
    .select('id, number, season_id')
    .limit(1);

  if (episodeError || !episodes || episodes.length === 0) {
    logError('No episodes found in database. Cannot run tests.');
    process.exit(1);
  }

  const testEpisode = episodes[0];
  logInfo(`Using test episode: Episode ${testEpisode.number} (${testEpisode.id})`);

  // Create valid token
  const validToken = 'test_valid_' + crypto.randomBytes(28).toString('hex');
  const validExpiresAt = new Date();
  validExpiresAt.setDate(validExpiresAt.getDate() + 7); // 7 days from now

  const { error: validTokenError } = await supabase
    .from('results_tokens')
    .insert({
      token: validToken,
      user_id: testUser.id,
      episode_id: testEpisode.id,
      expires_at: validExpiresAt.toISOString(),
    });

  if (validTokenError) {
    logError(`Failed to create valid token: ${validTokenError.message}`);
    process.exit(1);
  }

  logSuccess('Created valid token');

  // Create expired token
  const expiredToken = 'test_expired_' + crypto.randomBytes(26).toString('hex');
  const expiredExpiresAt = new Date();
  expiredExpiresAt.setDate(expiredExpiresAt.getDate() - 8); // 8 days ago (expired)

  const { error: expiredTokenError } = await supabase
    .from('results_tokens')
    .insert({
      token: expiredToken,
      user_id: testUser.id,
      episode_id: testEpisode.id,
      expires_at: expiredExpiresAt.toISOString(),
    });

  if (expiredTokenError) {
    logError(`Failed to create expired token: ${expiredTokenError.message}`);
    process.exit(1);
  }

  logSuccess('Created expired token');

  return {
    user: testUser,
    episode: testEpisode,
    validToken,
    expiredToken,
  };
}

// Test 1: Valid token
async function testValidToken(token, user, episode) {
  log('TEST 1', 'Testing valid token returns success with user and episode data');

  try {
    const response = await fetch(`${API_URL}/api/results/verify-token?token=${token}`);
    const data = await response.json();

    if (response.status !== 200) {
      logError(`Expected status 200, got ${response.status}`);
      console.log('Response:', data);
      return false;
    }

    if (!data.valid) {
      logError('Expected valid: true');
      console.log('Response:', data);
      return false;
    }

    if (data.userId !== user.id) {
      logError(`Expected userId: ${user.id}, got ${data.userId}`);
      return false;
    }

    if (data.episodeId !== episode.id) {
      logError(`Expected episodeId: ${episode.id}, got ${data.episodeId}`);
      return false;
    }

    logSuccess('Valid token returns correct data');
    logInfo(`Response: ${JSON.stringify(data, null, 2)}`);
    return true;
  } catch (error) {
    logError(`Request failed: ${error.message}`);
    return false;
  }
}

// Test 2: Invalid token
async function testInvalidToken() {
  log('TEST 2', 'Testing invalid token returns error');

  const invalidToken = 'test_invalid_' + crypto.randomBytes(28).toString('hex');

  try {
    const response = await fetch(`${API_URL}/api/results/verify-token?token=${invalidToken}`);
    const data = await response.json();

    if (response.status !== 200) {
      logError(`Expected status 200, got ${response.status}`);
      console.log('Response:', data);
      return false;
    }

    if (data.valid !== false) {
      logError('Expected valid: false');
      console.log('Response:', data);
      return false;
    }

    if (data.userId || data.episodeId) {
      logError('Expected no userId/episodeId for invalid token');
      console.log('Response:', data);
      return false;
    }

    logSuccess('Invalid token returns valid: false');
    logInfo(`Response: ${JSON.stringify(data, null, 2)}`);
    return true;
  } catch (error) {
    logError(`Request failed: ${error.message}`);
    return false;
  }
}

// Test 3: Expired token
async function testExpiredToken(token) {
  log('TEST 3', 'Testing expired token (>7 days) returns error');

  try {
    const response = await fetch(`${API_URL}/api/results/verify-token?token=${token}`);
    const data = await response.json();

    if (response.status !== 200) {
      logError(`Expected status 200, got ${response.status}`);
      console.log('Response:', data);
      return false;
    }

    if (data.valid !== false) {
      logError('Expected valid: false for expired token');
      console.log('Response:', data);
      return false;
    }

    if (data.userId || data.episodeId) {
      logError('Expected no userId/episodeId for expired token');
      console.log('Response:', data);
      return false;
    }

    logSuccess('Expired token returns valid: false');
    logInfo(`Response: ${JSON.stringify(data, null, 2)}`);
    return true;
  } catch (error) {
    logError(`Request failed: ${error.message}`);
    return false;
  }
}

// Test 4: Token usage tracking
async function testTokenUsageTracking(token) {
  log('TEST 4', 'Testing token usage is tracked in results_tokens table');

  try {
    // First, verify token has no used_at
    const { data: beforeData } = await supabase
      .from('results_tokens')
      .select('used_at')
      .eq('token', token)
      .single();

    if (beforeData?.used_at) {
      logError('Token already marked as used before test');
      return false;
    }

    logInfo('Token not yet used (used_at is null)');

    // Make request to verify token
    const response = await fetch(`${API_URL}/api/results/verify-token?token=${token}`);
    const data = await response.json();

    if (!data.valid) {
      logError('Token verification failed');
      console.log('Response:', data);
      return false;
    }

    logInfo('Token verified successfully');

    // Wait a moment for database update
    await new Promise(resolve => setTimeout(resolve, 500));

    // Check if used_at was set
    const { data: afterData } = await supabase
      .from('results_tokens')
      .select('used_at')
      .eq('token', token)
      .single();

    if (!afterData?.used_at) {
      logError('used_at was not set after verification');
      console.log('Token data:', afterData);
      return false;
    }

    logSuccess('Token usage tracked (used_at set)');
    logInfo(`used_at: ${afterData.used_at}`);

    // Verify subsequent requests don't change used_at
    const firstUsedAt = afterData.used_at;

    await new Promise(resolve => setTimeout(resolve, 500));

    const response2 = await fetch(`${API_URL}/api/results/verify-token?token=${token}`);
    await response2.json();

    await new Promise(resolve => setTimeout(resolve, 500));

    const { data: finalData } = await supabase
      .from('results_tokens')
      .select('used_at')
      .eq('token', token)
      .single();

    if (finalData.used_at !== firstUsedAt) {
      logError('used_at changed on second verification (should remain same)');
      return false;
    }

    logSuccess('used_at remains unchanged on subsequent verifications');
    return true;
  } catch (error) {
    logError(`Test failed: ${error.message}`);
    return false;
  }
}

// Test 5: Missing token parameter
async function testMissingToken() {
  log('TEST 5', 'Testing missing token parameter returns 400');

  try {
    const response = await fetch(`${API_URL}/api/results/verify-token`);
    const data = await response.json();

    if (response.status !== 400) {
      logError(`Expected status 400, got ${response.status}`);
      console.log('Response:', data);
      return false;
    }

    if (!data.error) {
      logError('Expected error message in response');
      console.log('Response:', data);
      return false;
    }

    if (data.error !== 'Token required') {
      logError(`Expected error: "Token required", got "${data.error}"`);
      return false;
    }

    logSuccess('Missing token returns 400 with error message');
    logInfo(`Response: ${JSON.stringify(data, null, 2)}`);
    return true;
  } catch (error) {
    logError(`Request failed: ${error.message}`);
    return false;
  }
}

// Run all tests
async function runTests() {
  console.log('='.repeat(80));
  console.log('RESULTS TOKEN VERIFICATION ENDPOINT TEST SUITE');
  console.log('='.repeat(80));

  let testData;

  try {
    // Setup
    await cleanup();
    testData = await setupTestData();

    // Run tests
    const results = {
      test1: await testValidToken(testData.validToken, testData.user, testData.episode),
      test2: await testInvalidToken(),
      test3: await testExpiredToken(testData.expiredToken),
      test4: await testTokenUsageTracking(testData.validToken),
      test5: await testMissingToken(),
    };

    // Summary
    console.log('\n' + '='.repeat(80));
    console.log('TEST SUMMARY');
    console.log('='.repeat(80));

    const passed = Object.values(results).filter(r => r).length;
    const total = Object.keys(results).length;

    Object.entries(results).forEach(([test, passed], index) => {
      const icon = passed ? '✅' : '❌';
      const status = passed ? 'PASS' : 'FAIL';
      console.log(`${icon} Test ${index + 1}: ${status}`);
    });

    console.log('\n' + '-'.repeat(80));
    console.log(`TOTAL: ${passed}/${total} tests passed`);
    console.log('='.repeat(80));

    // Cleanup
    await cleanup();

    process.exit(passed === total ? 0 : 1);
  } catch (error) {
    console.error('\n❌ Fatal error:', error);
    if (testData) {
      await cleanup();
    }
    process.exit(1);
  }
}

runTests();
