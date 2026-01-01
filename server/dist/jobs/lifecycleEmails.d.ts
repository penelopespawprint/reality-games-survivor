/**
 * Lifecycle Email Jobs
 * Scheduled jobs that send emails based on user lifecycle stage
 *
 * RATE LIMITING:
 * - Max 2 lifecycle (non-transactional) emails per user per week
 * - Same email type cannot be sent twice within 3 days
 * - Skip users who have already completed the action the email is nudging them to do
 */
export interface LifecycleResult {
    success: boolean;
    emailsSent: number;
    skippedRateLimit: number;
    skippedAlreadyActioned: number;
    errors: string[];
}
/**
 * Send join league nudge emails
 * Target: Users who signed up 3+ days ago but haven't joined any non-global league
 * Skip: Users who have already joined a league, made picks, or completed draft rankings
 */
export declare function sendJoinLeagueNudges(): Promise<LifecycleResult>;
/**
 * Send pre-season hype emails
 * Target: Users at specific intervals before premiere (14, 7, 3, 1 days)
 * Skip: Users who have already completed their draft rankings for this season
 */
export declare function sendPreSeasonHype(): Promise<LifecycleResult>;
/**
 * Send inactivity reminder emails
 * Target: Users who haven't made a pick in 7+ days during active season
 * Skip: Users who have made a pick for the current/upcoming episode
 */
export declare function sendInactivityReminders(): Promise<LifecycleResult>;
/**
 * Send trivia progress emails
 * Target: Users who started trivia but didn't finish (50%+ progress, not completed)
 * Skip: Users who have completed trivia or joined a league (trivia is mainly for acquisition)
 */
export declare function sendTriviaProgressEmails(): Promise<LifecycleResult>;
//# sourceMappingURL=lifecycleEmails.d.ts.map