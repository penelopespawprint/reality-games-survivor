/**
 * Schedule auto-randomize rankings one-time job
 * Uses draft_order_deadline from active season in database
 */
export declare function scheduleAutoRandomizeRankings(targetDate?: Date): Promise<void>;
/**
 * Schedule the draft finalization one-time job
 * Uses draft_deadline from active season in database
 */
export declare function scheduleDraftFinalize(targetDate?: Date): Promise<void>;
/**
 * Start all scheduled jobs
 */
export declare function startScheduler(): Promise<void>;
/**
 * Stop all scheduled jobs
 */
export declare function stopScheduler(): void;
/**
 * Run a job manually by name
 */
export declare function runJob(jobName: string): Promise<any>;
/**
 * Get status of all jobs
 */
export declare function getJobStatus(): Array<{
    name: string;
    schedule: string;
    description: string;
    enabled: boolean;
    lastRun?: string;
    lastResult?: any;
}>;
declare const _default: {
    startScheduler: typeof startScheduler;
    stopScheduler: typeof stopScheduler;
    runJob: typeof runJob;
    getJobStatus: typeof getJobStatus;
    scheduleAutoRandomizeRankings: typeof scheduleAutoRandomizeRankings;
    scheduleDraftFinalize: typeof scheduleDraftFinalize;
};
export default _default;
//# sourceMappingURL=scheduler.d.ts.map