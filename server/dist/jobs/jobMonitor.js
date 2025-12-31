/**
 * Job Monitoring System
 *
 * Tracks execution history for all scheduled jobs in a circular buffer.
 * Provides observability into job success/failure rates, execution times,
 * and error patterns without relying on external logging infrastructure.
 */
import { alertJobFailure } from './jobAlerting.js';
// Circular buffer for last 100 job executions
const MAX_HISTORY_SIZE = 100;
const executionHistory = [];
/**
 * Add execution record to circular buffer
 */
function addExecution(execution) {
    executionHistory.push(execution);
    // Trim to max size (circular buffer behavior)
    if (executionHistory.length > MAX_HISTORY_SIZE) {
        executionHistory.shift();
    }
}
/**
 * Wrapper function that monitors job execution
 * Tracks start time, end time, success/failure, and errors
 *
 * @param jobName - Name of the job being executed
 * @param handler - Async function to execute and monitor
 * @returns Promise with the handler's result
 */
export async function monitoredJobExecution(jobName, handler) {
    const execution = {
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
    }
    catch (error) {
        execution.endTime = new Date();
        execution.durationMs = execution.endTime.getTime() - execution.startTime.getTime();
        execution.success = false;
        execution.error = error instanceof Error ? error.message : String(error);
        addExecution(execution);
        // Send alert for job failure (async, don't await to avoid blocking)
        alertJobFailure(execution).catch((alertError) => {
            console.error('Failed to send job failure alert:', alertError);
        });
        // Re-throw to preserve existing error handling
        throw error;
    }
}
/**
 * Get recent job execution history
 *
 * @param limit - Maximum number of executions to return (default: 100)
 * @param jobName - Optional filter by job name
 * @returns Array of job executions, most recent first
 */
export function getJobHistory(limit = 100, jobName) {
    let history = [...executionHistory];
    // Filter by job name if provided
    if (jobName) {
        history = history.filter((exec) => exec.jobName === jobName);
    }
    // Return most recent first
    history.reverse();
    // Apply limit
    return history.slice(0, limit);
}
/**
 * Get job execution statistics
 *
 * @param jobName - Optional filter by job name
 * @returns Statistics about job executions
 */
export function getJobStats(jobName) {
    let history = [...executionHistory];
    if (jobName) {
        history = history.filter((exec) => exec.jobName === jobName);
    }
    const totalExecutions = history.length;
    const successCount = history.filter((exec) => exec.success).length;
    const failureCount = history.filter((exec) => !exec.success).length;
    const successRate = totalExecutions > 0 ? (successCount / totalExecutions) * 100 : 0;
    // Calculate average duration (only for completed jobs with duration)
    const durationsMs = history
        .filter((exec) => exec.durationMs !== undefined)
        .map((exec) => exec.durationMs);
    const averageDurationMs = durationsMs.length > 0
        ? durationsMs.reduce((sum, d) => sum + d, 0) / durationsMs.length
        : undefined;
    // Get last execution (most recent)
    const lastExecution = history.length > 0 ? history[history.length - 1] : undefined;
    // Get recent failures (last 10 failures)
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
/**
 * Clear execution history
 * Useful for testing or manual resets
 */
export function clearJobHistory() {
    executionHistory.length = 0;
}
/**
 * Get all unique job names in history
 */
export function getTrackedJobs() {
    const jobNames = new Set();
    executionHistory.forEach((exec) => jobNames.add(exec.jobName));
    return Array.from(jobNames).sort();
}
//# sourceMappingURL=jobMonitor.js.map