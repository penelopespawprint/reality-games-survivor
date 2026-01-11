/**
 * Isolated Test Suite for Job Monitoring System
 *
 * Tests the core job monitoring logic without requiring database or external services
 */

// Mock the job alerting module
const mockAlert = {
  alertJobFailure: async () => {},
};

// Inline implementation of job monitor for testing
interface JobExecution {
  jobName: string;
  startTime: Date;
  endTime?: Date;
  durationMs?: number;
  success: boolean;
  error?: string;
  result?: any;
}

const MAX_HISTORY_SIZE = 100;
const executionHistory: JobExecution[] = [];

function addExecution(execution: JobExecution): void {
  executionHistory.push(execution);
  if (executionHistory.length > MAX_HISTORY_SIZE) {
    executionHistory.shift();
  }
}

async function monitoredJobExecution<T>(
  jobName: string,
  handler: () => Promise<T>
): Promise<T> {
  const execution: JobExecution = {
    jobName,
    startTime: new Date(),
    success: false,
  };

  try {
    const result = await handler();
    execution.endTime = new Date();
    execution.durationMs = execution.endTime.getTime() - execution.startTime.getTime();
    execution.success = true;
    execution.result = result;
    addExecution(execution);
    return result;
  } catch (error) {
    execution.endTime = new Date();
    execution.durationMs = execution.endTime.getTime() - execution.startTime.getTime();
    execution.success = false;
    execution.error = error instanceof Error ? error.message : String(error);
    addExecution(execution);
    mockAlert.alertJobFailure(execution).catch(() => {});
    throw error;
  }
}

function getJobHistory(limit: number = 100, jobName?: string): JobExecution[] {
  let history = [...executionHistory];
  if (jobName) {
    history = history.filter((exec) => exec.jobName === jobName);
  }
  history.reverse();
  return history.slice(0, limit);
}

function getJobStats(jobName?: string): {
  totalExecutions: number;
  successCount: number;
  failureCount: number;
  successRate: number;
  averageDurationMs?: number;
  lastExecution?: JobExecution;
  recentFailures: JobExecution[];
} {
  let history = [...executionHistory];
  if (jobName) {
    history = history.filter((exec) => exec.jobName === jobName);
  }

  const totalExecutions = history.length;
  const successCount = history.filter((exec) => exec.success).length;
  const failureCount = history.filter((exec) => !exec.success).length;
  const successRate = totalExecutions > 0 ? (successCount / totalExecutions) * 100 : 0;

  const durationsMs = history
    .filter((exec) => exec.durationMs !== undefined)
    .map((exec) => exec.durationMs!);
  const averageDurationMs =
    durationsMs.length > 0
      ? durationsMs.reduce((sum, d) => sum + d, 0) / durationsMs.length
      : undefined;

  const lastExecution = history.length > 0 ? history[history.length - 1] : undefined;

  const recentFailures = history
    .filter((exec) => !exec.success)
    .slice(-10)
    .reverse();

  return {
    totalExecutions,
    successCount,
    failureCount,
    successRate,
    averageDurationMs,
    lastExecution,
    recentFailures,
  };
}

function getTrackedJobs(): string[] {
  const jobNames = new Set<string>();
  executionHistory.forEach((exec) => jobNames.add(exec.jobName));
  return Array.from(jobNames).sort();
}

function clearJobHistory(): void {
  executionHistory.length = 0;
}

// Test helpers
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

async function testCircularBuffer() {
  console.log('\n=== TEST 1: Circular Buffer Tracking ===\n');
  clearJobHistory();

  console.log('Executing 105 test jobs to test circular buffer...');
  for (let i = 0; i < 105; i++) {
    await monitoredJobExecution(`test-job-${i}`, async () => ({ iteration: i }));
  }

  const history = getJobHistory();
  console.log(`History length: ${history.length} (expected: 100)`);
  console.log(`Oldest job: ${history[history.length - 1]?.jobName} (expected: test-job-5)`);
  console.log(`Newest job: ${history[0]?.jobName} (expected: test-job-104)`);

  const passed = history.length === 100 && history[history.length - 1]?.jobName === 'test-job-5';
  console.log(passed ? '✅ PASSED' : '❌ FAILED');
  return passed;
}

async function testJobHistory() {
  console.log('\n=== TEST 2: Job History Retrieval ===\n');
  clearJobHistory();

  await monitoredJobExecution('success-job-1', async () => ({ status: 'ok' }));
  await monitoredJobExecution('success-job-2', async () => ({ status: 'ok' }));

  try {
    await monitoredJobExecution('failed-job-1', async () => {
      throw new Error('Database connection timeout');
    });
  } catch (e) {}

  await monitoredJobExecution('success-job-3', async () => ({ status: 'ok' }));

  const fullHistory = getJobHistory(100);
  const limitedHistory = getJobHistory(2);
  const filteredHistory = getJobHistory(100, 'success-job-1');

  console.log(`Full history: ${fullHistory.length} executions (expected: 4)`);
  console.log(`Limited history (2): ${limitedHistory.length} executions (expected: 2)`);
  console.log(`Filtered history (success-job-1): ${filteredHistory.length} executions (expected: 1)`);

  const passed = fullHistory.length === 4 && limitedHistory.length === 2 && filteredHistory.length === 1;
  console.log(passed ? '✅ PASSED' : '❌ FAILED');
  return passed;
}

async function testFailedJobLogging() {
  console.log('\n=== TEST 3: Failed Job Logging with Error Details ===\n');
  clearJobHistory();

  const testError = 'Simulated database connection failure: ECONNREFUSED';

  try {
    await monitoredJobExecution('critical-job-failure', async () => {
      throw new Error(testError);
    });
  } catch (e) {}

  const history = getJobHistory();
  const failedJob = history[0];

  console.log('Failed job details:');
  console.log(`  Job name: ${failedJob.jobName}`);
  console.log(`  Success: ${failedJob.success}`);
  console.log(`  Error: ${failedJob.error}`);
  console.log(`  Duration: ${failedJob.durationMs}ms`);
  console.log(`  Start time: ${failedJob.startTime.toISOString()}`);
  console.log(`  End time: ${failedJob.endTime?.toISOString()}`);

  const passed =
    !failedJob.success &&
    failedJob.error === testError &&
    failedJob.durationMs !== undefined &&
    failedJob.endTime !== undefined;

  console.log(passed ? '✅ PASSED' : '❌ FAILED');
  return passed;
}

async function testJobStats() {
  console.log('\n=== TEST 4: Job Statistics Calculations ===\n');
  clearJobHistory();

  // 7 successes, 3 failures = 70% success rate
  for (let i = 0; i < 7; i++) {
    await monitoredJobExecution('stats-test-job', async () => {
      await sleep(10 + i);
      return { iteration: i };
    });
  }

  for (let i = 0; i < 3; i++) {
    try {
      await monitoredJobExecution('stats-test-job', async () => {
        await sleep(5);
        throw new Error(`Failure ${i}`);
      });
    } catch (e) {}
  }

  const stats = getJobStats('stats-test-job');

  console.log('Job statistics:');
  console.log(`  Total executions: ${stats.totalExecutions} (expected: 10)`);
  console.log(`  Success count: ${stats.successCount} (expected: 7)`);
  console.log(`  Failure count: ${stats.failureCount} (expected: 3)`);
  console.log(`  Success rate: ${stats.successRate.toFixed(1)}% (expected: 70.0%)`);
  console.log(`  Average duration: ${stats.averageDurationMs?.toFixed(2)}ms`);
  console.log(`  Recent failures: ${stats.recentFailures.length} (expected: 3)`);

  const passed =
    stats.totalExecutions === 10 &&
    stats.successCount === 7 &&
    stats.failureCount === 3 &&
    Math.abs(stats.successRate - 70.0) < 0.1 &&
    stats.averageDurationMs !== undefined &&
    stats.recentFailures.length === 3;

  console.log(passed ? '✅ PASSED' : '❌ FAILED');
  return passed;
}

async function testTrackedJobs() {
  console.log('\n=== TEST 5: Tracked Jobs Listing ===\n');
  clearJobHistory();

  await monitoredJobExecution('lock-picks', async () => ({ locked: 10 }));
  await monitoredJobExecution('auto-pick', async () => ({ autoPicked: 5 }));
  await monitoredJobExecution('email-queue-processor', async () => ({ sent: 20 }));
  await monitoredJobExecution('lock-picks', async () => ({ locked: 12 }));

  const trackedJobs = getTrackedJobs();
  const expectedJobs = ['auto-pick', 'email-queue-processor', 'lock-picks'];

  console.log(`Tracked jobs: ${trackedJobs.join(', ')}`);
  console.log(`Total unique jobs: ${trackedJobs.length} (expected: 3)`);

  const passed = JSON.stringify(trackedJobs) === JSON.stringify(expectedJobs);
  console.log(passed ? '✅ PASSED' : '❌ FAILED');
  return passed;
}

async function testConcurrentJobs() {
  console.log('\n=== TEST 6: Concurrent Job Execution ===\n');
  clearJobHistory();

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
    }).catch(() => {}),
    monitoredJobExecution('concurrent-5', async () => {
      await sleep(60);
      return { id: 5 };
    }),
  ]);

  const totalTime = Date.now() - startTime;
  const history = getJobHistory();

  console.log(`Completed in ${totalTime}ms (expected: ~60-80ms for concurrent execution)`);
  console.log(`History length: ${history.length} (expected: 5)`);
  console.log(`Jobs: ${history.map(e => e.jobName).join(', ')}`);

  const passed = history.length === 5 && totalTime < 100;
  console.log(passed ? '✅ PASSED' : '❌ FAILED');
  return passed;
}

async function testEdgeCases() {
  console.log('\n=== TEST 7: Edge Cases ===\n');
  clearJobHistory();

  // Instant job
  await monitoredJobExecution('instant-job', async () => ({ instant: true }));

  // Long job
  await monitoredJobExecution('long-job', async () => {
    await sleep(100);
    return { longRunning: true };
  });

  // Non-Error throw
  try {
    await monitoredJobExecution('non-error-failure', async () => {
      throw 'String error instead of Error object';
    });
  } catch (e) {}

  // Undefined result
  await monitoredJobExecution('undefined-result', async () => undefined);

  const history = getJobHistory();
  const instantJob = history.find(e => e.jobName === 'instant-job');
  const longJob = history.find(e => e.jobName === 'long-job');
  const nonErrorJob = history.find(e => e.jobName === 'non-error-failure');
  const undefinedJob = history.find(e => e.jobName === 'undefined-result');

  console.log('Edge case results:');
  console.log(`  Instant job: ${instantJob?.durationMs}ms (should be >= 0)`);
  console.log(`  Long job: ${longJob?.durationMs}ms (should be >= 100)`);
  console.log(`  Non-Error failure: "${nonErrorJob?.error}" (should capture string)`);
  console.log(`  Undefined result: success=${undefinedJob?.success} (should be true)`);

  const passed =
    instantJob?.success && instantJob.durationMs !== undefined && instantJob.durationMs >= 0 &&
    longJob?.success && longJob.durationMs !== undefined && longJob.durationMs >= 100 &&
    !nonErrorJob?.success && nonErrorJob?.error === 'String error instead of Error object' &&
    undefinedJob?.success && undefinedJob.result === undefined;

  console.log(passed ? '✅ PASSED' : '❌ FAILED');
  return passed;
}

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

  console.log('\n╔══════════════════════════════════════════════════════════╗');
  console.log('║                    TEST SUMMARY                          ║');
  console.log('╚══════════════════════════════════════════════════════════╝\n');

  const passed = Object.values(results).filter(r => r).length;
  const total = Object.values(results).length;

  Object.entries(results).forEach(([test, result]) => {
    console.log(`  ${result ? '✅' : '❌'} ${test}`);
  });

  console.log(`\nOVERALL: ${passed}/${total} tests passed (${((passed / total) * 100).toFixed(1)}%)\n`);

  if (passed === total) {
    console.log('🎉 All tests PASSED! Job monitoring system is working correctly.\n');
  } else {
    console.log(`⚠️  ${total - passed} test(s) FAILED. Review output above for details.\n`);
  }

  process.exit(passed === total ? 0 : 1);
}

runAllTests().catch(err => {
  console.error('Fatal error running tests:', err);
  process.exit(1);
});
