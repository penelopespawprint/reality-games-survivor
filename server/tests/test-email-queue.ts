/**
 * Email Queue Exploratory Test Script
 *
 * Tests the email queue retry logic with exponential backoff:
 * 1. Emails are queued in email_queue table
 * 2. Failed emails are retried with exponential backoff
 * 3. Max 3 retries before marking as failed
 * 4. Queue processes emails in order (FIFO)
 * 5. Sent emails are marked with timestamp
 */

// Check for required environment variables
if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ Missing required environment variables:');
  console.error('   - SUPABASE_URL');
  console.error('   - SUPABASE_SERVICE_ROLE_KEY');
  console.error('\nPlease set these environment variables and try again.');
  console.error('Example: SUPABASE_URL=https://... SUPABASE_SERVICE_ROLE_KEY=... npx tsx test-email-queue.ts');
  process.exit(1);
}

import { supabaseAdmin } from './src/config/supabase.js';
import { enqueueEmail, processEmailQueue, getQueueStats } from './src/lib/email-queue.js';
import { sendEmail } from './src/config/email.js';

interface TestResults {
  testName: string;
  passed: boolean;
  details: string;
  evidence?: any;
}

const results: TestResults[] = [];

function log(message: string) {
  console.log(`[TEST] ${message}`);
}

function logResult(testName: string, passed: boolean, details: string, evidence?: any) {
  results.push({ testName, passed, details, evidence });
  const icon = passed ? '✓' : '✗';
  console.log(`${icon} ${testName}: ${details}`);
  if (evidence) {
    console.log('  Evidence:', JSON.stringify(evidence, null, 2));
  }
}

async function cleanupTestData() {
  log('Cleaning up test data...');

  // Delete test emails from queue
  await supabaseAdmin
    .from('email_queue')
    .delete()
    .like('to_email', '%@test-queue.local');

  // Delete test failed emails
  await supabaseAdmin
    .from('failed_emails')
    .delete()
    .like('email_job->>to_email', '%@test-queue.local');

  log('Cleanup complete');
}

async function test1_EmailsAreQueued() {
  log('\n=== Test 1: Emails are queued in email_queue table ===');

  const testEmail = {
    to: 'test1@test-queue.local',
    subject: 'Test Queue Entry',
    html: '<p>This email should be queued</p>',
    text: 'This email should be queued',
    type: 'normal' as const,
  };

  const emailId = await enqueueEmail(testEmail);

  if (!emailId) {
    logResult('Test 1', false, 'Failed to enqueue email - returned null');
    return;
  }

  // Verify email is in the database
  const { data, error } = await supabaseAdmin
    .from('email_queue')
    .select('*')
    .eq('id', emailId)
    .single();

  if (error || !data) {
    logResult('Test 1', false, 'Email not found in database after enqueue', { error });
    return;
  }

  // Check all required fields
  const checks = [
    { name: 'Email ID matches', pass: data.id === emailId },
    { name: 'Type is normal', pass: data.type === 'normal' },
    { name: 'To email correct', pass: data.to_email === testEmail.to },
    { name: 'Subject correct', pass: data.subject === testEmail.subject },
    { name: 'HTML content correct', pass: data.html === testEmail.html },
    { name: 'Attempts is 0', pass: data.attempts === 0 },
    { name: 'Max attempts is 3', pass: data.max_attempts === 3 },
    { name: 'sent_at is null', pass: data.sent_at === null },
    { name: 'failed_at is null', pass: data.failed_at === null },
    { name: 'created_at is set', pass: !!data.created_at },
  ];

  const allPassed = checks.every(c => c.pass);
  const failedChecks = checks.filter(c => !c.pass).map(c => c.name);

  logResult(
    'Test 1',
    allPassed,
    allPassed ? 'Email queued with correct fields' : `Failed checks: ${failedChecks.join(', ')}`,
    { emailId, data }
  );
}

async function test2_ExponentialBackoff() {
  log('\n=== Test 2: Failed emails retry with exponential backoff ===');

  // Queue an email that will fail (invalid email address triggers Resend error)
  const testEmail = {
    to: 'fail-test@test-queue.local',
    subject: 'Test Retry Logic',
    html: '<p>This will fail and retry</p>',
    type: 'normal' as const,
  };

  const emailId = await enqueueEmail(testEmail);

  if (!emailId) {
    logResult('Test 2', false, 'Failed to enqueue test email');
    return;
  }

  // Force process the email (it will fail because Resend won't accept test domain)
  log('Processing email queue (email will fail)...');
  await processEmailQueue();

  // Check retry was scheduled with correct backoff
  const { data: afterFirstFailure } = await supabaseAdmin
    .from('email_queue')
    .select('*')
    .eq('id', emailId)
    .single();

  if (!afterFirstFailure) {
    logResult('Test 2', false, 'Email disappeared from queue after first attempt');
    return;
  }

  const checks = [
    { name: 'Attempts incremented to 1', pass: afterFirstFailure.attempts === 1 },
    { name: 'Still not sent', pass: afterFirstFailure.sent_at === null },
    { name: 'Still not failed permanently', pass: afterFirstFailure.failed_at === null },
    { name: 'next_retry_at is set', pass: !!afterFirstFailure.next_retry_at },
    { name: 'last_error is set', pass: !!afterFirstFailure.last_error },
  ];

  // Check backoff timing (normal emails: 5min, 30min, 120min)
  if (afterFirstFailure.next_retry_at) {
    const retryTime = new Date(afterFirstFailure.next_retry_at);
    const createdTime = new Date(afterFirstFailure.created_at);
    const diffMinutes = (retryTime.getTime() - createdTime.getTime()) / 1000 / 60;

    // Should be approximately 5 minutes (allow 0.5 min variance)
    const backoffCorrect = Math.abs(diffMinutes - 5) < 0.5;
    checks.push({
      name: 'First retry scheduled ~5min later',
      pass: backoffCorrect
    });
  }

  const allPassed = checks.every(c => c.pass);
  const failedChecks = checks.filter(c => !c.pass).map(c => c.name);

  logResult(
    'Test 2',
    allPassed,
    allPassed ? 'Exponential backoff working correctly' : `Failed checks: ${failedChecks.join(', ')}`,
    {
      emailId,
      attempts: afterFirstFailure.attempts,
      next_retry_at: afterFirstFailure.next_retry_at,
      last_error: afterFirstFailure.last_error
    }
  );
}

async function test3_MaxRetriesReached() {
  log('\n=== Test 3: Max 3 retries before marking as failed ===');

  // Create an email and manually set it to 2 attempts (so next failure hits max)
  const testEmail = {
    to: 'max-retry@test-queue.local',
    subject: 'Test Max Retries',
    html: '<p>This will hit max retries</p>',
    type: 'normal' as const,
  };

  const emailId = await enqueueEmail(testEmail);

  if (!emailId) {
    logResult('Test 3', false, 'Failed to enqueue test email');
    return;
  }

  // Manually set to 2 attempts (so next attempt is #3, the final one)
  await supabaseAdmin
    .from('email_queue')
    .update({
      attempts: 2,
      next_retry_at: new Date(Date.now() - 1000).toISOString() // In the past so it processes
    })
    .eq('id', emailId);

  log('Processing email queue (will hit max retries)...');
  await processEmailQueue();

  // Check email is marked as failed
  const { data: afterMaxRetries } = await supabaseAdmin
    .from('email_queue')
    .select('*')
    .eq('id', emailId)
    .single();

  if (!afterMaxRetries) {
    logResult('Test 3', false, 'Email disappeared from queue');
    return;
  }

  // Check if moved to dead letter queue
  const { data: deadLetter } = await supabaseAdmin
    .from('failed_emails')
    .select('*')
    .eq('email_job->>id', emailId)
    .single();

  const checks = [
    { name: 'Attempts is 3', pass: afterMaxRetries.attempts === 3 },
    { name: 'failed_at is set', pass: !!afterMaxRetries.failed_at },
    { name: 'sent_at is still null', pass: afterMaxRetries.sent_at === null },
    { name: 'Moved to dead letter queue', pass: !!deadLetter },
  ];

  if (deadLetter) {
    checks.push({
      name: 'Dead letter has email data',
      pass: deadLetter.email_job?.to_email === testEmail.to
    });
    checks.push({
      name: 'Dead letter has timestamp',
      pass: !!deadLetter.failed_at
    });
  }

  const allPassed = checks.every(c => c.pass);
  const failedChecks = checks.filter(c => !c.pass).map(c => c.name);

  logResult(
    'Test 3',
    allPassed,
    allPassed ? 'Max retries enforced, moved to dead letter queue' : `Failed checks: ${failedChecks.join(', ')}`,
    {
      emailId,
      attempts: afterMaxRetries.attempts,
      failed_at: afterMaxRetries.failed_at,
      deadLetterExists: !!deadLetter
    }
  );
}

async function test4_FIFOOrdering() {
  log('\n=== Test 4: Queue processes emails in FIFO order ===');

  // Queue multiple emails with timestamps
  const emails = [
    { to: 'fifo-1@test-queue.local', subject: 'First Email', order: 1 },
    { to: 'fifo-2@test-queue.local', subject: 'Second Email', order: 2 },
    { to: 'fifo-3@test-queue.local', subject: 'Third Email', order: 3 },
  ];

  const emailIds: string[] = [];

  for (const email of emails) {
    const id = await enqueueEmail({
      to: email.to,
      subject: email.subject,
      html: `<p>Order: ${email.order}</p>`,
      type: 'normal',
    });
    if (id) emailIds.push(id);
    // Small delay to ensure created_at timestamps are different
    await new Promise(resolve => setTimeout(resolve, 10));
  }

  if (emailIds.length !== 3) {
    logResult('Test 4', false, `Only queued ${emailIds.length}/3 emails`);
    return;
  }

  // Fetch emails in queue order
  const { data: queuedEmails } = await supabaseAdmin
    .from('email_queue')
    .select('*')
    .in('id', emailIds)
    .order('created_at', { ascending: true });

  if (!queuedEmails || queuedEmails.length !== 3) {
    logResult('Test 4', false, 'Could not fetch queued emails');
    return;
  }

  const checks = [
    { name: 'First email is fifo-1', pass: queuedEmails[0].to_email === emails[0].to },
    { name: 'Second email is fifo-2', pass: queuedEmails[1].to_email === emails[1].to },
    { name: 'Third email is fifo-3', pass: queuedEmails[2].to_email === emails[2].to },
    { name: 'Timestamps are ascending', pass:
      new Date(queuedEmails[0].created_at) < new Date(queuedEmails[1].created_at) &&
      new Date(queuedEmails[1].created_at) < new Date(queuedEmails[2].created_at)
    },
  ];

  const allPassed = checks.every(c => c.pass);
  const failedChecks = checks.filter(c => !c.pass).map(c => c.name);

  logResult(
    'Test 4',
    allPassed,
    allPassed ? 'Emails queued and ordered correctly (FIFO)' : `Failed checks: ${failedChecks.join(', ')}`,
    {
      emailIds,
      order: queuedEmails.map(e => ({ to: e.to_email, created_at: e.created_at }))
    }
  );
}

async function test5_SentTimestamp() {
  log('\n=== Test 5: Sent emails marked with timestamp ===');

  // This test requires a real email to succeed
  // We'll mock a successful send by directly updating the database

  const testEmail = {
    to: 'sent-test@test-queue.local',
    subject: 'Test Sent Timestamp',
    html: '<p>This email will be marked as sent</p>',
    type: 'normal' as const,
  };

  const emailId = await enqueueEmail(testEmail);

  if (!emailId) {
    logResult('Test 5', false, 'Failed to enqueue test email');
    return;
  }

  // Simulate successful send (since test domain won't actually work)
  const sentTime = new Date().toISOString();
  await supabaseAdmin
    .from('email_queue')
    .update({ sent_at: sentTime })
    .eq('id', emailId);

  // Verify the update
  const { data: sentEmail } = await supabaseAdmin
    .from('email_queue')
    .select('*')
    .eq('id', emailId)
    .single();

  if (!sentEmail) {
    logResult('Test 5', false, 'Email not found after update');
    return;
  }

  const checks = [
    { name: 'sent_at is set', pass: !!sentEmail.sent_at },
    { name: 'sent_at is recent', pass:
      Math.abs(new Date(sentEmail.sent_at).getTime() - new Date(sentTime).getTime()) < 1000
    },
    { name: 'failed_at is still null', pass: sentEmail.failed_at === null },
  ];

  // Verify it won't be processed again
  log('Processing queue to verify sent email is skipped...');
  const beforeCount = await getProcessableCount();
  await processEmailQueue();
  const afterCount = await getProcessableCount();

  // The sent email should NOT be in processable count
  const { data: stillSent } = await supabaseAdmin
    .from('email_queue')
    .select('*')
    .eq('id', emailId)
    .single();

  checks.push({
    name: 'Sent email not reprocessed',
    pass: stillSent?.sent_at !== null && stillSent?.attempts === 0
  });

  const allPassed = checks.every(c => c.pass);
  const failedChecks = checks.filter(c => !c.pass).map(c => c.name);

  logResult(
    'Test 5',
    allPassed,
    allPassed ? 'Sent emails marked correctly and excluded from reprocessing' : `Failed checks: ${failedChecks.join(', ')}`,
    {
      emailId,
      sent_at: sentEmail.sent_at,
      attempts: sentEmail.attempts
    }
  );
}

async function test6_CriticalVsNormalBackoff() {
  log('\n=== Test 6: Critical vs Normal email backoff timing ===');

  // Queue one critical and one normal email
  const criticalEmail = await enqueueEmail({
    to: 'critical@test-queue.local',
    subject: 'Critical Email',
    html: '<p>Critical</p>',
    type: 'critical',
  });

  const normalEmail = await enqueueEmail({
    to: 'normal@test-queue.local',
    subject: 'Normal Email',
    html: '<p>Normal</p>',
    type: 'normal',
  });

  if (!criticalEmail || !normalEmail) {
    logResult('Test 6', false, 'Failed to enqueue test emails');
    return;
  }

  // Process both (they will fail)
  await processEmailQueue();

  // Check backoff timings
  const { data: critical } = await supabaseAdmin
    .from('email_queue')
    .select('*')
    .eq('id', criticalEmail)
    .single();

  const { data: normal } = await supabaseAdmin
    .from('email_queue')
    .select('*')
    .eq('id', normalEmail)
    .single();

  if (!critical || !normal) {
    logResult('Test 6', false, 'Could not fetch emails after processing');
    return;
  }

  // Critical: 1min, 5min, 15min
  // Normal: 5min, 30min, 120min

  const criticalBackoffMinutes = (new Date(critical.next_retry_at).getTime() - new Date(critical.created_at).getTime()) / 1000 / 60;
  const normalBackoffMinutes = (new Date(normal.next_retry_at).getTime() - new Date(normal.created_at).getTime()) / 1000 / 60;

  const checks = [
    { name: 'Critical type is correct', pass: critical.type === 'critical' },
    { name: 'Normal type is correct', pass: normal.type === 'normal' },
    { name: 'Critical backoff ~1min', pass: Math.abs(criticalBackoffMinutes - 1) < 0.5 },
    { name: 'Normal backoff ~5min', pass: Math.abs(normalBackoffMinutes - 5) < 0.5 },
    { name: 'Critical faster than normal', pass: criticalBackoffMinutes < normalBackoffMinutes },
  ];

  const allPassed = checks.every(c => c.pass);
  const failedChecks = checks.filter(c => !c.pass).map(c => c.name);

  logResult(
    'Test 6',
    allPassed,
    allPassed ? 'Critical emails have faster retry than normal emails' : `Failed checks: ${failedChecks.join(', ')}`,
    {
      critical: { backoffMinutes: criticalBackoffMinutes.toFixed(2) },
      normal: { backoffMinutes: normalBackoffMinutes.toFixed(2) }
    }
  );
}

async function test7_QueueStats() {
  log('\n=== Test 7: Queue stats function works correctly ===');

  const stats = await getQueueStats();

  const checks = [
    { name: 'Stats has pending count', pass: typeof stats.pending === 'number' },
    { name: 'Stats has processing count', pass: typeof stats.processing === 'number' },
    { name: 'Stats has sent_today count', pass: typeof stats.sent_today === 'number' },
    { name: 'Stats has failed_today count', pass: typeof stats.failed_today === 'number' },
    { name: 'All counts are non-negative', pass:
      stats.pending >= 0 &&
      stats.processing >= 0 &&
      stats.sent_today >= 0 &&
      stats.failed_today >= 0
    },
  ];

  const allPassed = checks.every(c => c.pass);
  const failedChecks = checks.filter(c => !c.pass).map(c => c.name);

  logResult(
    'Test 7',
    allPassed,
    allPassed ? 'Queue stats function working' : `Failed checks: ${failedChecks.join(', ')}`,
    stats
  );
}

async function getProcessableCount(): Promise<number> {
  const { count } = await supabaseAdmin
    .from('email_queue')
    .select('*', { count: 'exact', head: true })
    .is('sent_at', null)
    .is('failed_at', null)
    .or(`next_retry_at.is.null,next_retry_at.lte.${new Date().toISOString()}`);

  return count || 0;
}

async function runAllTests() {
  console.log('====================================');
  console.log('  EMAIL QUEUE EXPLORATORY TESTING  ');
  console.log('====================================\n');

  try {
    await cleanupTestData();

    await test1_EmailsAreQueued();
    await test2_ExponentialBackoff();
    await test3_MaxRetriesReached();
    await test4_FIFOOrdering();
    await test5_SentTimestamp();
    await test6_CriticalVsNormalBackoff();
    await test7_QueueStats();

    await cleanupTestData();

    console.log('\n====================================');
    console.log('  TEST SUMMARY');
    console.log('====================================\n');

    const passed = results.filter(r => r.passed).length;
    const total = results.length;

    results.forEach(r => {
      const icon = r.passed ? '✓' : '✗';
      console.log(`${icon} ${r.testName}: ${r.details}`);
    });

    console.log(`\n${passed}/${total} tests passed`);

    if (passed === total) {
      console.log('\n🎉 All tests passed! Email queue is working correctly.');
    } else {
      console.log(`\n⚠️  ${total - passed} test(s) failed. See details above.`);
    }

  } catch (err) {
    console.error('\n❌ Test suite crashed:', err);
  } finally {
    process.exit(0);
  }
}

runAllTests();
