/**
 * Job Monitoring System
 *
 * Tracks job execution history and failures for health checks.
 * This is a placeholder interface that will be implemented by another agent.
 */
export interface JobFailure {
    timestamp: Date;
    job: string;
    error: string;
}
/**
 * Get recent job failures within a time window
 * @param hoursBack Number of hours to look back
 * @returns Array of job failures
 */
export declare function getRecentJobFailures(hoursBack?: number): Promise<JobFailure[]>;
/**
 * Record a job failure for monitoring
 * @param job Job name
 * @param error Error message or object
 */
export declare function recordJobFailure(job: string, error: Error | string): Promise<void>;
//# sourceMappingURL=job-monitoring.d.ts.map