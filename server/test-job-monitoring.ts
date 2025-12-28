/**
 * Test script for Job Monitoring System
 *
 * Tests:
 * 1. Circular buffer tracking (last 100 jobs)
 * 2. Job execution history retrieval
 * 3. Failed job logging with error details
 * 4. Job statistics calculations
 * 5. Edge cases (buffer overflow, concurrent jobs)
 */

import { monitoredJobExecution, getJobHistory, getJobStats, getTrackedJobs, clearJobHistory } from './src/jobs/jobMonitor.js';

// Test helpers
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

async function testCircularBuffer() {
  console.log('\n=== TEST 1: Circular Buffer Tracking ===\n');

  clearJobHistory();

  // Execute 105 jobs to test circular buffer (should only keep last 100)
  console.log('Executing 105 test jobs...');
  for (let i = 0; i < 105; i++) {
    await monitoredJobExecution(`test-job-${i}`, async () => {
      await sleep(1); // Minimal delay
      return { iteration: i };
    });
  }

  const history = getJobHistory();
  console.log(`\nHistory length: ${history.length} (expected: 100)`);
  console.log(`Oldest job: ${history[history.length - 1]?.jobName}`);
  console.log(`Newest job: ${history[0]?.jobName}`);

  // Verify circular buffer worked correctly
  if (history.length === 100) {
    console.log('✅ Circular buffer size constraint PASSED');
  } else {
    console.log(`❌ Circular buffer size constraint FAILED (expected 100, got ${history.length})`);
  }

  // Verify oldest job is test-job-5 (jobs 0-4 should be evicted)
  if (history[history.length - 1]?.jobName === 'test-job-5') {
    console.log('✅ Circular buffer eviction order PASSED');
  } else {
    console.log(`❌ Circular buffer eviction order FAILED (expected test-job-5, got ${history[history.length - 1]?.jobName})`);
  }

  return history.length === 100;
}

async function testJobHistory() {
  console.log('\n=== TEST 2: Job History Retrieval ===\n');

  clearJobHistory();

  // Execute mix of successful and failed jobs
  await monitoredJobExecution('success-job-1', async () => ({ status: 'ok' }));
  await monitoredJobExecution('success-job-2', async () => ({ status: 'ok' }));

  try {
    await monitoredJobExecution('failed-job-1', async () => {
      throw new Error('Database connection timeout');
    });
  } catch (e) {
    // Expected failure
  }

  await monitoredJobExecution('success-job-3', async () => ({ status: 'ok' }));

  // Test full history
  const fullHistory = getJobHistory(100);
  console.log(`Full history: ${fullHistory.length} executions`);
  console.log('Job names:', fullHistory.map(e => e.jobName).join(', '));

  // Test limited history
  const limitedHistory = getJobHistory(2);
  console.log(`\nLimited history (2): ${limitedHistory.length} executions`);
  console.log('Job names:', limitedHistory.map(e => e.jobName).join(', '));

  // Test filtered history
  const successJobs = getJobHistory(100, 'success-job-1');
  console.log(`\nFiltered history (success-job-1): ${successJobs.length} executions`);

  if (fullHistory.length === 4 && limitedHistory.length === 2 && successJobs.length === 1) {
    console.log('\n✅ Job history retrieval PASSED');
    return true;
  } else {
    console.log('\n❌ Job history retrieval FAILED');
    return false;
  }
}

async function testFailedJobLogging() {
  console.log('\n=== TEST 3: Failed Job Logging ===\n');

  clearJobHistory();

  const testError = 'Simulated database connection failure: ECONNREFUSED';

  try {
    await monitoredJobExecution('critical-job-failure', async () => {
      throw new Error(testError);
    });
  } catch (e) {
    // Expected failure
  }

  const history = getJobHistory();
  const failedJob = history[0];

  console.log('Failed job details:');
  console.log(`  Job name: ${failedJob.jobName}`);
  console.log(`  Success: ${failedJob.success}`);
  console.log(`  Error: ${failedJob.error}`);
  console.log(`  Duration: ${failedJob.durationMs}ms`);
  console.log(`  Start time: ${failedJob.startTime.toISOString()}`);
  console.log(`  End time: ${failedJob.endTime?.toISOString()}`);

  // Verify error details are captured
  if (
    !failedJob.success &&
    failedJob.error === testError &&
    failedJob.durationMs !== undefined &&
    failedJob.endTime !== undefined
  ) {
    console.log('\n✅ Failed job logging PASSED');
    return true;
  } else {
    console.log('\n❌ Failed job logging FAILED');
    console.log('Expected:', { success: false, error: testError, hasDuration: true, hasEndTime: true });
    console.log('Actual:', {
      success: failedJob.success,
      error: failedJob.error,
      hasDuration: failedJob.durationMs !== undefined,
      hasEndTime: failedJob.endTime !== undefined,
    });
    return false;
  }
}

async function testJobStats() {
  console.log('\n=== TEST 4: Job Statistics Calculations ===\n');

  clearJobHistory();

  // Execute multiple jobs with known success/failure pattern
  // 7 successes, 3 failures = 70% success rate
  for (let i = 0; i < 7; i++) {
    await monitoredJobExecution('stats-test-job', async () => {
      await sleep(10 + i); // Variable duration
      return { iteration: i };
    });
  }

  for (let i = 0; i < 3; i++) {
    try {
      await monitoredJobExecution('stats-test-job', async () => {
        await sleep(5);
        throw new Error(`Failure ${i}`);
      });
    } catch (e) {
      // Expected
    }
  }

  const stats = getJobStats('stats-test-job');

  console.log('Job statistics:');
  console.log(`  Total executions: ${stats.totalExecutions}`);
  console.log(`  Success count: ${stats.successCount}`);
  console.log(`  Failure count: ${stats.failureCount}`);
  console.log(`  Success rate: ${stats.successRate.toFixed(1)}%`);
  console.log(`  Average duration: ${stats.averageDurationMs?.toFixed(2)}ms`);
  console.log(`  Last execution: ${stats.lastExecution?.jobName} (${stats.lastExecution?.success ? 'success' : 'failed'})`);
  console.log(`  Recent failures: ${stats.recentFailures.length} failures`);

  // Verify calculations
  const expectedSuccessRate = 70.0;
  const successRateCorrect = Math.abs(stats.successRate - expectedSuccessRate) < 0.1;

  if (
    stats.totalExecutions === 10 &&
    stats.successCount === 7 &&
    stats.failureCount === 3 &&
    successRateCorrect &&
    stats.averageDurationMs !== undefined &&
    stats.lastExecution !== undefined &&
    stats.recentFailures.length === 3
  ) {
    console.log('\n✅ Job statistics calculations PASSED');
    return true;
  } else {
    console.log('\n❌ Job statistics calculations FAILED');
    return false;
  }
}

async function testTrackedJobs() {
  console.log('\n=== TEST 5: Tracked Jobs Listing ===\n');

  clearJobHistory();

  // Execute different job types
  await monitoredJobExecution('lock-picks', async () => ({ locked: 10 }));
  await monitoredJobExecution('auto-pick', async () => ({ autoPicked: 5 }));
  await monitoredJobExecution('email-queue-processor', async () => ({ sent: 20 }));
  await monitoredJobExecution('lock-picks', async () => ({ locked: 12 }));

  const trackedJobs = getTrackedJobs();

  console.log('Tracked jobs:', trackedJobs);
  console.log(`Total unique jobs: ${trackedJobs.length}`);

  // Should have 3 unique job names, sorted alphabetically
  const expectedJobs = ['auto-pick', 'email-queue-processor', 'lock-picks'];
  const jobsMatch = JSON.stringify(trackedJobs) === JSON.stringify(expectedJobs);

  if (trackedJobs.length === 3 && jobsMatch) {
    console.log('✅ Tracked jobs listing PASSED');
    return true;
  } else {
    console.log(`❌ Tracked jobs listing FAILED (expected ${expectedJobs}, got ${trackedJobs})`);
    return false;
  }
}

async function testConcurrentJobs() {
  console.log('\n=== TEST 6: Concurrent Job Execution ===\n');

  clearJobHistory();

  // Execute 5 jobs concurrently
  console.log('Starting 5 concurrent jobs...');
  const startTime = Date.now();

  await Promise.all([
    monitoredJobExecution('concurrent-1', async () => {
      await sleep(50);
      return { id: 1 };
    }),
    monitoredJobExecution('concurrent-2', async () => {
      await sleep(30);
      return { id: 2 };
    }),
    monitoredJobExecution('concurrent-3', async () => {
      await sleep(40);
      return { id: 3 };
    }),
    monitoredJobExecution('concurrent-4', async () => {
      await sleep(20);
      throw new Error('Concurrent failure');
    }),
    monitoredJobExecution('concurrent-5', async () => {
      await sleep(60);
      return { id: 5 };
    }),
  ].map(p => p.catch(() => {}))); // Catch expected failure

  const totalTime = Date.now() - startTime;
  const history = getJobHistory();

  console.log(`Completed in ${totalTime}ms (expected ~60ms for concurrent execution)`);
  console.log(`History length: ${history.length}`);
  console.log('Jobs executed:', history.map(e => `${e.jobName} (${e.success ? 'success' : 'failed'})`).join(', '));

  // Verify all 5 jobs were tracked
  // Verify they ran concurrently (total time ~60ms, not 200ms sequential)
  if (history.length === 5 && totalTime < 100) {
    console.log('✅ Concurrent job execution PASSED');
    return true;
  } else {
    console.log('❌ Concurrent job execution FAILED');
    return false;
  }
}

async function testEdgeCases() {
  console.log('\n=== TEST 7: Edge Cases ===\n');

  clearJobHistory();

  // Test 1: Job with no duration (instant completion)
  await monitoredJobExecution('instant-job', async () => {
    return { instant: true };
  });

  // Test 2: Job with very long execution (simulate)
  await monitoredJobExecution('long-job', async () => {
    await sleep(100);
    return { longRunning: true };
  });

  // Test 3: Job that throws non-Error object
  try {
    await monitoredJobExecution('non-error-failure', async () => {
      throw 'String error instead of Error object';
    });
  } catch (e) {
    // Expected
  }

  // Test 4: Job with undefined result
  await monitoredJobExecution('undefined-result', async () => {
    return undefined;
  });

  const history = getJobHistory();

  console.log('Edge case results:');
  history.forEach((exec, i) => {
    console.log(`  ${i + 1}. ${exec.jobName}: ${exec.success ? 'success' : 'failed'} (${exec.durationMs}ms)`);
    if (exec.error) {
      console.log(`     Error: ${exec.error}`);
    }
  });

  const instantJob = history.find(e => e.jobName === 'instant-job');
  const longJob = history.find(e => e.jobName === 'long-job');
  const nonErrorJob = history.find(e => e.jobName === 'non-error-failure');
  const undefinedJob = history.find(e => e.jobName === 'undefined-result');

  // Verify edge cases handled correctly
  if (
    instantJob?.success && instantJob.durationMs !== undefined && instantJob.durationMs >= 0 &&
    longJob?.success && longJob.durationMs !== undefined && longJob.durationMs >= 100 &&
    !nonErrorJob?.success && nonErrorJob?.error === 'String error instead of Error object' &&
    undefinedJob?.success && undefinedJob.result === undefined
  ) {
    console.log('\n✅ Edge cases PASSED');
    return true;
  } else {
    console.log('\n❌ Edge cases FAILED');
    return false;
  }
}

// Run all tests
async function runAllTests() {
  console.log('╔══════════════════════════════════════════════════════════╗');
  console.log('║       JOB MONITORING SYSTEM - TEST SUITE                ║');
  console.log('╚══════════════════════════════════════════════════════════╝');

  const results: { [key: string]: boolean } = {};

  results['Circular Buffer'] = await testCircularBuffer();
  results['Job History'] = await testJobHistory();
  results['Failed Job Logging'] = await testFailedJobLogging();
  results['Job Statistics'] = await testJobStats();
  results['Tracked Jobs'] = await testTrackedJobs();
  results['Concurrent Jobs'] = await testConcurrentJobs();
  results['Edge Cases'] = await testEdgeCases();

  console.log('\n');
  console.log('╔══════════════════════════════════════════════════════════╗');
  console.log('║                    TEST SUMMARY                          ║');
  console.log('╚══════════════════════════════════════════════════════════╝');
  console.log('');

  const passed = Object.values(results).filter(r => r).length;
  const total = Object.values(results).length;

  Object.entries(results).forEach(([test, result]) => {
    console.log(`  ${result ? '✅' : '❌'} ${test}`);
  });

  console.log('');
  console.log(`OVERALL: ${passed}/${total} tests passed (${((passed / total) * 100).toFixed(1)}%)`);
  console.log('');

  if (passed === total) {
    console.log('🎉 All tests PASSED! Job monitoring system is working correctly.');
  } else {
    console.log(`⚠️  ${total - passed} test(s) FAILED. Review output above for details.`);
  }

  process.exit(passed === total ? 0 : 1);
}

runAllTests().catch(err => {
  console.error('Fatal error running tests:', err);
  process.exit(1);
});
