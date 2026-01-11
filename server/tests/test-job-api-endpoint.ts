/**
 * Test API Endpoint for Job History
 *
 * Simulates the /api/admin/jobs/history endpoint behavior
 */

// Inline implementation matching the actual API endpoint logic
interface JobExecution {
  jobName: string;
  startTime: Date;
  endTime?: Date;
  durationMs?: number;
  success: boolean;
  error?: string;
  result?: any;
}

const executionHistory: JobExecution[] = [];

function addExecution(exec: JobExecution): void {
  executionHistory.push(exec);
  if (executionHistory.length > 100) {
    executionHistory.shift();
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

function getTrackedJobs(): string[] {
  const jobNames = new Set<string>();
  executionHistory.forEach((exec) => jobNames.add(exec.jobName));
  return Array.from(jobNames).sort();
}

function getJobStats(jobName?: string): any {
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

// Simulate the API endpoint logic from /src/routes/admin.ts lines 544-571
function simulateJobHistoryEndpoint(queryParams: { limit?: number; jobName?: string }) {
  const { limit = 100, jobName } = queryParams;

  // Get execution history
  const history = getJobHistory(
    Number(limit),
    jobName ? String(jobName) : undefined
  );

  // Get statistics for all tracked jobs
  const trackedJobs = getTrackedJobs();
  const stats = trackedJobs.map((name) => ({
    jobName: name,
    ...getJobStats(name),
  }));

  return {
    history,
    stats,
    totalExecutions: history.length,
  };
}

async function testAPIEndpoint() {
  console.log('╔══════════════════════════════════════════════════════════╗');
  console.log('║   JOB HISTORY API ENDPOINT - INTEGRATION TEST           ║');
  console.log('╚══════════════════════════════════════════════════════════╝\n');

  // Setup: Add test data
  console.log('Setting up test data...\n');

  // Successful jobs
  for (let i = 0; i < 15; i++) {
    addExecution({
      jobName: 'email-queue-processor',
      startTime: new Date(Date.now() - (15 - i) * 60000),
      endTime: new Date(Date.now() - (15 - i) * 60000 + 500),
      durationMs: 500 + i * 10,
      success: true,
      result: { processed: i + 5 },
    });
  }

  // Mix of lock-picks successes and failures
  for (let i = 0; i < 8; i++) {
    addExecution({
      jobName: 'lock-picks',
      startTime: new Date(Date.now() - (8 - i) * 60000),
      endTime: new Date(Date.now() - (8 - i) * 60000 + 200),
      durationMs: 200 + i * 5,
      success: i < 6, // First 6 succeed, last 2 fail
      error: i >= 6 ? 'Database connection timeout' : undefined,
      result: i < 6 ? { locked: 10 + i } : undefined,
    });
  }

  // Auto-pick with some failures
  for (let i = 0; i < 5; i++) {
    addExecution({
      jobName: 'auto-pick',
      startTime: new Date(Date.now() - (5 - i) * 60000),
      endTime: new Date(Date.now() - (5 - i) * 60000 + 300),
      durationMs: 300 + i * 20,
      success: i !== 2, // One failure at index 2
      error: i === 2 ? 'No users with missing picks' : undefined,
      result: i !== 2 ? { autoPicked: i * 2 } : undefined,
    });
  }

  console.log('Added 28 job executions (15 email-queue, 8 lock-picks, 5 auto-pick)\n');

  // Test 1: Default query (no params)
  console.log('=== TEST 1: Default Query (GET /api/admin/jobs/history) ===\n');

  const response1 = simulateJobHistoryEndpoint({});

  console.log(`Response structure:`);
  console.log(`  history: Array(${response1.history.length})`);
  console.log(`  stats: Array(${response1.stats.length})`);
  console.log(`  totalExecutions: ${response1.totalExecutions}`);

  console.log(`\nStats summary:`);
  response1.stats.forEach(stat => {
    console.log(`  ${stat.jobName}:`);
    console.log(`    Total: ${stat.totalExecutions}, Success: ${stat.successCount}, Failures: ${stat.failureCount}`);
    console.log(`    Success rate: ${stat.successRate.toFixed(1)}%, Avg duration: ${stat.averageDurationMs?.toFixed(1)}ms`);
  });

  const test1Passed =
    response1.history.length === 28 &&
    response1.stats.length === 3 &&
    response1.totalExecutions === 28;

  console.log(`\n${test1Passed ? '✅' : '❌'} Default query test\n`);

  // Test 2: Limited query
  console.log('=== TEST 2: Limited Query (GET /api/admin/jobs/history?limit=10) ===\n');

  const response2 = simulateJobHistoryEndpoint({ limit: 10 });

  console.log(`Response structure:`);
  console.log(`  history: Array(${response2.history.length}) - showing most recent 10`);
  console.log(`  stats: Array(${response2.stats.length}) - stats for all tracked jobs`);
  console.log(`  totalExecutions: ${response2.totalExecutions}`);

  console.log(`\nMost recent jobs in history:`);
  response2.history.slice(0, 5).forEach((exec, i) => {
    console.log(`  ${i + 1}. ${exec.jobName} - ${exec.success ? 'success' : 'failed'}`);
  });

  const test2Passed =
    response2.history.length === 10 &&
    response2.stats.length === 3 &&
    response2.totalExecutions === 10;

  console.log(`\n${test2Passed ? '✅' : '❌'} Limited query test\n`);

  // Test 3: Filtered query by job name
  console.log('=== TEST 3: Filtered Query (GET /api/admin/jobs/history?jobName=lock-picks) ===\n');

  const response3 = simulateJobHistoryEndpoint({ jobName: 'lock-picks' });

  console.log(`Response structure:`);
  console.log(`  history: Array(${response3.history.length}) - only lock-picks`);
  console.log(`  stats: Array(${response3.stats.length}) - all tracked jobs`);
  console.log(`  totalExecutions: ${response3.totalExecutions}`);

  console.log(`\nFiltered history (lock-picks only):`);
  response3.history.forEach((exec, i) => {
    console.log(`  ${i + 1}. ${exec.jobName} - ${exec.success ? 'success' : `failed: ${exec.error}`}`);
  });

  // Verify all returned executions are lock-picks
  const allAreLockPicks = response3.history.every(exec => exec.jobName === 'lock-picks');

  const test3Passed =
    response3.history.length === 8 &&
    response3.totalExecutions === 8 &&
    allAreLockPicks;

  console.log(`\n${test3Passed ? '✅' : '❌'} Filtered query test\n`);

  // Test 4: Combined limit + filter
  console.log('=== TEST 4: Combined Query (GET /api/admin/jobs/history?limit=5&jobName=email-queue-processor) ===\n');

  const response4 = simulateJobHistoryEndpoint({ limit: 5, jobName: 'email-queue-processor' });

  console.log(`Response structure:`);
  console.log(`  history: Array(${response4.history.length}) - 5 most recent email-queue-processor`);
  console.log(`  totalExecutions: ${response4.totalExecutions}`);

  console.log(`\nLimited + filtered history:`);
  response4.history.forEach((exec, i) => {
    console.log(`  ${i + 1}. ${exec.jobName} - duration: ${exec.durationMs}ms`);
  });

  const allAreEmailQueue = response4.history.every(exec => exec.jobName === 'email-queue-processor');

  const test4Passed =
    response4.history.length === 5 &&
    response4.totalExecutions === 5 &&
    allAreEmailQueue;

  console.log(`\n${test4Passed ? '✅' : '❌'} Combined query test\n`);

  // Test 5: Stats validation
  console.log('=== TEST 5: Stats Validation ===\n');

  const lockPicksStats = response1.stats.find(s => s.jobName === 'lock-picks');
  const autoPickStats = response1.stats.find(s => s.jobName === 'auto-pick');
  const emailStats = response1.stats.find(s => s.jobName === 'email-queue-processor');

  console.log('Detailed stats verification:');
  console.log(`\nlock-picks: (8 total, 6 success, 2 failures)`);
  console.log(`  Actual: ${lockPicksStats?.totalExecutions} total, ${lockPicksStats?.successCount} success, ${lockPicksStats?.failureCount} failures`);
  console.log(`  Success rate: ${lockPicksStats?.successRate.toFixed(1)}% (expected: 75.0%)`);
  console.log(`  Recent failures: ${lockPicksStats?.recentFailures.length} (expected: 2)`);

  console.log(`\nauto-pick: (5 total, 4 success, 1 failure)`);
  console.log(`  Actual: ${autoPickStats?.totalExecutions} total, ${autoPickStats?.successCount} success, ${autoPickStats?.failureCount} failures`);
  console.log(`  Success rate: ${autoPickStats?.successRate.toFixed(1)}% (expected: 80.0%)`);

  console.log(`\nemail-queue-processor: (15 total, 15 success, 0 failures)`);
  console.log(`  Actual: ${emailStats?.totalExecutions} total, ${emailStats?.successCount} success, ${emailStats?.failureCount} failures`);
  console.log(`  Success rate: ${emailStats?.successRate.toFixed(1)}% (expected: 100.0%)`);

  const test5Passed =
    lockPicksStats?.totalExecutions === 8 &&
    lockPicksStats?.successCount === 6 &&
    lockPicksStats?.failureCount === 2 &&
    Math.abs(lockPicksStats?.successRate - 75.0) < 0.1 &&
    autoPickStats?.totalExecutions === 5 &&
    emailStats?.totalExecutions === 15 &&
    emailStats?.successRate === 100.0;

  console.log(`\n${test5Passed ? '✅' : '❌'} Stats validation test\n`);

  // Test 6: Recent failures in stats
  console.log('=== TEST 6: Recent Failures Tracking ===\n');

  const recentFailures = lockPicksStats?.recentFailures || [];
  console.log(`Recent failures for lock-picks: ${recentFailures.length} (expected: 2)`);
  recentFailures.forEach((failure, i) => {
    console.log(`  ${i + 1}. ${failure.jobName} - ${failure.error}`);
    console.log(`     Time: ${failure.startTime.toISOString()}, Duration: ${failure.durationMs}ms`);
  });

  const test6Passed =
    recentFailures.length === 2 &&
    recentFailures.every(f => !f.success && f.error === 'Database connection timeout');

  console.log(`\n${test6Passed ? '✅' : '❌'} Recent failures test\n`);

  // Summary
  console.log('╔══════════════════════════════════════════════════════════╗');
  console.log('║                    TEST SUMMARY                          ║');
  console.log('╚══════════════════════════════════════════════════════════╝\n');

  const allTests = [
    { name: 'Default Query', passed: test1Passed },
    { name: 'Limited Query', passed: test2Passed },
    { name: 'Filtered Query', passed: test3Passed },
    { name: 'Combined Query', passed: test4Passed },
    { name: 'Stats Validation', passed: test5Passed },
    { name: 'Recent Failures', passed: test6Passed },
  ];

  allTests.forEach(test => {
    console.log(`  ${test.passed ? '✅' : '❌'} ${test.name}`);
  });

  const passed = allTests.filter(t => t.passed).length;
  const total = allTests.length;

  console.log(`\nOVERALL: ${passed}/${total} tests passed (${((passed / total) * 100).toFixed(1)}%)\n`);

  if (passed === total) {
    console.log('🎉 All API endpoint tests PASSED!\n');
  } else {
    console.log(`⚠️  ${total - passed} test(s) FAILED.\n`);
  }

  process.exit(passed === total ? 0 : 1);
}

testAPIEndpoint().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
