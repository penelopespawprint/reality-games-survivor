/**
 * Job Monitoring System
 *
 * Tracks execution history for all scheduled jobs in a circular buffer.
 * Provides observability into job success/failure rates, execution times,
 * and error patterns without relying on external logging infrastructure.
 * Also persists to job_runs database table for long-term analytics.
 */
export interface JobExecution {
    jobName: string;
    startTime: Date;
    endTime?: Date;
    durationMs?: number;
    success: boolean;
    error?: string;
    result?: any;
}
/**
 * Wrapper function that monitors job execution
 * Tracks start time, end time, success/failure, and errors
 *
 * @param jobName - Name of the job being executed
 * @param handler - Async function to execute and monitor
 * @returns Promise with the handler's result
 */
export declare function monitoredJobExecution<T>(jobName: string, handler: () => Promise<T>): Promise<T>;
/**
 * Get recent job execution history
 *
 * @param limit - Maximum number of executions to return (default: 100)
 * @param jobName - Optional filter by job name
 * @returns Array of job executions, most recent first
 */
export declare function getJobHistory(limit?: number, jobName?: string): JobExecution[];
/**
 * Get job execution statistics
 *
 * @param jobName - Optional filter by job name
 * @returns Statistics about job executions
 */
export declare function getJobStats(jobName?: string): {
    totalExecutions: number;
    successCount: number;
    failureCount: number;
    successRate: number;
    averageDurationMs?: number;
    lastExecution?: JobExecution;
    recentFailures: JobExecution[];
};
/**
 * Clear execution history
 * Useful for testing or manual resets
 */
export declare function clearJobHistory(): void;
/**
 * Get all unique job names in history
 */
export declare function getTrackedJobs(): string[];
//# sourceMappingURL=jobMonitor.d.ts.map