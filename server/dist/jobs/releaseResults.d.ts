/**
 * Results Release Job
 *
 * Runs every Friday at 2:00 PM PST
 * Sends spoiler-safe notifications for the latest finalized episode
 */
interface Episode {
    id: string;
    number: number;
    week_number: number;
    season_id: string;
    scoring_finalized_at: string;
    results_locked_at: string | null;
    results_released_at: string | null;
}
/**
 * Main job: Release weekly results
 */
export declare function releaseWeeklyResults(): Promise<{
    episode: Episode | null;
    notificationsSent: number;
    errors: number;
}>;
export {};
//# sourceMappingURL=releaseResults.d.ts.map