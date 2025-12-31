/**
 * Job Monitoring System Demo
 *
 * This example demonstrates how to use the job monitoring system
 * to track job executions, view statistics, and analyze failures.
 *
 * Run: npx tsx src/examples/job-monitoring-demo.ts
 */
import { monitoredJobExecution, getJobHistory, getJobStats, getTrackedJobs, clearJobHistory, } from '../jobs/jobMonitor.js';
// Example job handlers
async function emailQueueProcessor() {
    await new Promise((resolve) => setTimeout(resolve, 100)); // Simulate work
    return { processed: 5, failed: 0 };
}
async function lockPicks() {
    await new Promise((resolve) => setTimeout(resolve, 50));
    return { picksLocked: 12 };
}
async function failingJob() {
    await new Promise((resolve) => setTimeout(resolve, 30));
    throw new Error('Database connection timeout');
}
async function demo() {
    console.log('=== Job Monitoring System Demo ===\n');
    // Clear history from previous runs
    clearJobHistory();
    // 1. Run some successful jobs
    console.log('1. Running successful jobs...');
    await monitoredJobExecution('email-queue-processor', emailQueueProcessor);
    await monitoredJobExecution('email-queue-processor', emailQueueProcessor);
    await monitoredJobExecution('lock-picks', lockPicks);
    console.log('   ✓ Completed 3 successful job executions\n');
    // 2. Run a failing job (catch error to continue demo)
    console.log('2. Running a failing job...');
    try {
        await monitoredJobExecution('auto-pick', failingJob);
    }
    catch (err) {
        console.log('   ✓ Job failed as expected (error captured)\n');
    }
    // 3. Run more jobs to build history
    console.log('3. Building execution history...');
    for (let i = 0; i < 5; i++) {
        await monitoredJobExecution('email-queue-processor', emailQueueProcessor);
    }
    console.log('   ✓ Added 5 more email-queue-processor executions\n');
    // 4. View execution history
    console.log('4. Viewing execution history (last 10):');
    const history = getJobHistory(10);
    history.forEach((exec, idx) => {
        const status = exec.success ? '✓' : '✗';
        const duration = exec.durationMs ? `${exec.durationMs}ms` : 'N/A';
        console.log(`   ${status} ${exec.jobName.padEnd(25)} ${duration.padEnd(8)} ${exec.startTime.toISOString()}`);
    });
    console.log();
    // 5. View job statistics
    console.log('5. Job statistics:');
    const trackedJobs = getTrackedJobs();
    trackedJobs.forEach((jobName) => {
        const stats = getJobStats(jobName);
        console.log(`\n   ${jobName}:`);
        console.log(`     Total executions: ${stats.totalExecutions}`);
        console.log(`     Success: ${stats.successCount} | Failures: ${stats.failureCount}`);
        console.log(`     Success rate: ${stats.successRate.toFixed(2)}%`);
        if (stats.averageDurationMs) {
            console.log(`     Avg duration: ${stats.averageDurationMs.toFixed(2)}ms`);
        }
        if (stats.recentFailures.length > 0) {
            console.log(`     Recent failures: ${stats.recentFailures.length}`);
            stats.recentFailures.forEach((failure) => {
                console.log(`       - ${failure.error} (${failure.startTime.toISOString()})`);
            });
        }
    });
    console.log();
    // 6. Filter history by job name
    console.log('6. Email queue processor history only:');
    const emailHistory = getJobHistory(5, 'email-queue-processor');
    console.log(`   Found ${emailHistory.length} executions`);
    emailHistory.forEach((exec) => {
        console.log(`     - ${exec.startTime.toISOString()} - ${exec.durationMs}ms - Success: ${exec.success}`);
    });
    console.log();
    // 7. Demonstrate alert pattern
    console.log('7. Alert pattern example:');
    const autoPickStats = getJobStats('auto-pick');
    if (autoPickStats.failureCount > 0 && autoPickStats.successRate < 50) {
        console.log(`   ⚠️  ALERT: auto-pick job has ${autoPickStats.failureCount} failures!`);
        console.log(`   Success rate: ${autoPickStats.successRate.toFixed(2)}%`);
        console.log('   Recent errors:');
        autoPickStats.recentFailures.forEach((failure) => {
            console.log(`     - ${failure.error}`);
        });
    }
    else {
        console.log('   ✓ All jobs healthy');
    }
    console.log();
    // 8. Performance degradation detection
    console.log('8. Performance monitoring:');
    const emailStats = getJobStats('email-queue-processor');
    if (emailStats.averageDurationMs) {
        console.log(`   Average duration: ${emailStats.averageDurationMs.toFixed(2)}ms`);
        // Check if recent executions are slower
        const recent = getJobHistory(3, 'email-queue-processor');
        const recentAvg = recent.reduce((sum, e) => sum + (e.durationMs || 0), 0) / recent.length;
        const threshold = emailStats.averageDurationMs * 2;
        if (recentAvg > threshold) {
            console.log(`   ⚠️  WARNING: Recent executions (${recentAvg.toFixed(2)}ms) are 2x slower than average`);
        }
        else {
            console.log(`   ✓ Performance within normal range`);
        }
    }
    console.log();
    console.log('=== Demo Complete ===');
    console.log('\nIn production, you would:');
    console.log('1. Access this data via: GET /api/admin/jobs/history');
    console.log('2. Set up automated alerts for repeated failures');
    console.log('3. Monitor performance trends over time');
    console.log('4. Build dashboards showing job health');
}
// Run demo
demo().catch(console.error);
//# sourceMappingURL=job-monitoring-demo.js.map