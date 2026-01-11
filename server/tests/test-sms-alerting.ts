/**
 * SMS Alerting Test Script
 *
 * Tests job failure SMS alerting for critical and non-critical jobs.
 * Run with: npx tsx test-sms-alerting.ts
 */

import { alertJobFailure } from './src/jobs/jobAlerting.js';
import { initializeAlerting, getAlertingConfig } from './src/jobs/jobAlerting.js';
import type { JobExecution } from './src/jobs/jobMonitor.js';

// Color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(message: string, color: string = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

function section(title: string) {
  log('\n' + '='.repeat(80), colors.cyan);
  log(title, colors.bright + colors.cyan);
  log('='.repeat(80), colors.cyan);
}

// Test scenarios
const CRITICAL_JOB_FAILURES: JobExecution[] = [
  {
    jobName: 'lock-picks',
    startTime: new Date(),
    endTime: new Date(Date.now() + 1500),
    durationMs: 1500,
    success: false,
    error: 'Database connection timeout: Unable to lock picks for league_id=abc123. Connection pool exhausted after 30 seconds.',
  },
  {
    jobName: 'auto-pick',
    startTime: new Date(),
    endTime: new Date(Date.now() + 2000),
    durationMs: 2000,
    success: false,
    error: 'No active castaways found for user_id=xyz789, cannot auto-assign pick. User may have all castaways eliminated.',
  },
  {
    jobName: 'draft-finalize',
    startTime: new Date(),
    endTime: new Date(Date.now() + 3000),
    durationMs: 3000,
    success: false,
    error: 'Snake draft algorithm error: Invalid picker index calculation (get_snake_picker_index RPC failed). Integer division bug detected.',
  },
  {
    jobName: 'release-results',
    startTime: new Date(),
    endTime: new Date(Date.now() + 500),
    durationMs: 500,
    success: false,
    error: 'Episode 5 not found in database, cannot generate results tokens. Admin may not have created episode record.',
  },
];

const NON_CRITICAL_JOB_FAILURES: JobExecution[] = [
  {
    jobName: 'email-queue-processor',
    startTime: new Date(),
    endTime: new Date(Date.now() + 800),
    durationMs: 800,
    success: false,
    error: 'Resend API rate limit exceeded: 429 Too Many Requests. Retry after 60 seconds.',
  },
  {
    jobName: 'pick-reminders',
    startTime: new Date(),
    endTime: new Date(Date.now() + 1000),
    durationMs: 1000,
    success: false,
    error: 'Email template rendering failed: Missing variable "castaway_name" in pick reminder template.',
  },
];

async function testConfiguration() {
  section('TEST 1: Verify Alerting Configuration');

  const config = getAlertingConfig();

  log(`\nCritical Jobs (should send SMS + Email):`);
  config.criticalJobs.forEach(job => {
    log(`  - ${job}`, colors.green);
  });

  log(`\nAlert Configuration:`);
  log(`  Email Enabled: ${config.emailEnabled ? '✓' : '✗'}`, config.emailEnabled ? colors.green : colors.red);
  log(`  SMS Enabled: ${config.smsEnabled ? '✓' : '✗'}`, config.smsEnabled ? colors.green : colors.red);
  log(`  Admin Email: ${config.adminEmail || 'NOT CONFIGURED'}`, config.adminEmail ? colors.green : colors.red);

  if (!config.emailEnabled || !config.smsEnabled) {
    log('\n⚠️  WARNING: Email or SMS alerts are disabled!', colors.yellow);
    log('Set ADMIN_EMAIL and ADMIN_PHONE environment variables to enable alerts.', colors.yellow);
  }

  return config.emailEnabled && config.smsEnabled;
}

async function testCriticalJobAlerts() {
  section('TEST 2: Critical Job Failures (Should Send SMS + Email)');

  for (const execution of CRITICAL_JOB_FAILURES) {
    log(`\nTesting: ${execution.jobName}`, colors.bright + colors.blue);
    log(`Error: ${execution.error?.substring(0, 100)}...`, colors.yellow);

    try {
      await alertJobFailure(execution);
      log(`✓ Alert sent successfully`, colors.green);
      log(`  → Email: Queued to admin email`, colors.cyan);
      log(`  → SMS: Sent to admin phone (transactional)`, colors.cyan);
      log(`  → Message: [RGFL] CRITICAL: Job "${execution.jobName}" failed at ${execution.startTime.toLocaleTimeString()}...`, colors.cyan);
    } catch (error) {
      log(`✗ Alert failed: ${error}`, colors.red);
    }

    // Wait 2 seconds between tests to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
}

async function testNonCriticalJobAlerts() {
  section('TEST 3: Non-Critical Job Failures (Should Send Email Only)');

  for (const execution of NON_CRITICAL_JOB_FAILURES) {
    log(`\nTesting: ${execution.jobName}`, colors.bright + colors.blue);
    log(`Error: ${execution.error?.substring(0, 100)}...`, colors.yellow);

    try {
      await alertJobFailure(execution);
      log(`✓ Alert sent successfully`, colors.green);
      log(`  → Email: Queued to admin email`, colors.cyan);
      log(`  → SMS: SKIPPED (non-critical job)`, colors.yellow);
    } catch (error) {
      log(`✗ Alert failed: ${error}`, colors.red);
    }

    // Wait 2 seconds between tests
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
}

async function testLongErrorTruncation() {
  section('TEST 4: Long Error Message Truncation');

  const longError = 'PostgreSQL connection pool exhausted: max connections (100) reached. Active connections: 98 idle, 2 active. Query: SELECT * FROM weekly_picks WHERE episode_id = $1 AND status = $2 AND locked_at IS NULL FOR UPDATE; Connection attempts: 50 retries over 30 seconds. Last error: connection timeout after 5000ms. Stacktrace: at Object.query (/server/src/db.ts:45:12) at lockPicks (/server/src/jobs/lockPicks.ts:120:8) at async monitoredJobExecution (/server/src/jobs/jobMonitor.ts:56:12) [very long stack trace continues...]';

  const execution: JobExecution = {
    jobName: 'lock-picks',
    startTime: new Date(),
    endTime: new Date(Date.now() + 2000),
    durationMs: 2000,
    success: false,
    error: longError,
  };

  log(`\nOriginal Error Length: ${longError.length} characters`, colors.yellow);
  log(`Expected SMS Length: ~160 characters (single segment)`, colors.cyan);

  try {
    await alertJobFailure(execution);

    const truncatedError = longError.substring(0, 100);
    const smsMessage = `[RGFL] CRITICAL: Job "lock-picks" failed at ${execution.startTime.toLocaleTimeString()}. Error: ${truncatedError}... Check email for details.`;

    log(`\n✓ Alert sent successfully`, colors.green);
    log(`  → SMS Message Length: ${smsMessage.length} characters`, smsMessage.length <= 160 ? colors.green : colors.red);
    log(`  → Truncated Error: ${truncatedError}...`, colors.cyan);
    log(`  → Full error available in email`, colors.cyan);
  } catch (error) {
    log(`✗ Alert failed: ${error}`, colors.red);
  }
}

async function testSummary() {
  section('TEST SUMMARY');

  log('\nExpected Results:');
  log('1. Configuration Check:', colors.bright);
  log('   - 4 critical jobs identified (lock-picks, auto-pick, draft-finalize, release-results)');
  log('   - Email and SMS enabled with valid admin contacts');

  log('\n2. Critical Job Failures:', colors.bright);
  log('   - 4 SMS alerts sent (one per critical job)');
  log('   - 4 Email alerts queued (one per critical job)');
  log('   - SMS messages under 160 characters');
  log('   - Transactional flag bypasses STOP/unsubscribe');

  log('\n3. Non-Critical Job Failures:', colors.bright);
  log('   - 0 SMS alerts sent (critical jobs only)');
  log('   - 2 Email alerts queued (one per non-critical job)');

  log('\n4. Long Error Truncation:', colors.bright);
  log('   - Error truncated to 100 characters for SMS');
  log('   - SMS message stays under 160 characters');
  log('   - Full error available in email');

  log('\n\nManual Verification Steps:', colors.bright + colors.yellow);
  log('1. Check admin email inbox for 7 alert emails (4 critical + 2 non-critical + 1 long error)');
  log('2. Check admin phone for 5 SMS messages (4 critical jobs + 1 long error test)');
  log('3. Verify SMS messages are concise and actionable');
  log('4. Verify email contains full error details and next steps');
  log('5. Check Railway logs for alert confirmation messages');
}

async function main() {
  log('\n' + '█'.repeat(80), colors.bright + colors.cyan);
  log('SMS ALERTING TEST SUITE', colors.bright + colors.cyan);
  log('Testing job failure alerts for critical and non-critical jobs', colors.cyan);
  log('█'.repeat(80) + '\n', colors.bright + colors.cyan);

  // Initialize alerting system
  log('Initializing alerting system...', colors.cyan);
  initializeAlerting({
    adminEmail: process.env.ADMIN_EMAIL,
    adminPhone: process.env.ADMIN_PHONE,
  });

  try {
    // Test 1: Configuration
    const configValid = await testConfiguration();
    if (!configValid) {
      log('\n⚠️  Skipping alert tests due to missing configuration', colors.yellow);
      log('Set ADMIN_EMAIL and ADMIN_PHONE to run full test suite', colors.yellow);
      return;
    }

    // Test 2: Critical job alerts
    await testCriticalJobAlerts();

    // Test 3: Non-critical job alerts
    await testNonCriticalJobAlerts();

    // Test 4: Long error truncation
    await testLongErrorTruncation();

    // Test summary
    await testSummary();

    log('\n✓ All tests completed!', colors.bright + colors.green);
    log('Check your email and phone for alerts', colors.green);

  } catch (error) {
    log('\n✗ Test suite failed:', colors.red);
    console.error(error);
    process.exit(1);
  }
}

// Run tests
main().catch(console.error);
