interface WeeklyStats {
    totalUsers: number;
    newUsersThisWeek: number;
    activeUsersThisWeek: number;
    profilesComplete: number;
    totalLeagues: number;
    activeLeagues: number;
    newLeaguesThisWeek: number;
    totalLeagueMembers: number;
    avgMembersPerLeague: number;
    totalPicks: number;
    picksThisWeek: number;
    pickCompletionRate: number;
    triviaCompleted: number;
    triviaCompletedThisWeek: number;
    avgTriviaScore: number;
    totalPayments: number;
    paymentsThisWeek: number;
    revenueThisWeek: number;
    emailsSentThisWeek: number;
    emailOpenRate: number;
    emailClickRate: number;
    jobsRun: number;
    jobFailures: number;
}
/**
 * Send weekly system report with comprehensive stats to admin
 * Runs: Sunday at noon PST
 */
export declare function sendWeeklySystemReport(): Promise<{
    sent: boolean;
    stats: WeeklyStats;
}>;
export default sendWeeklySystemReport;
//# sourceMappingURL=weeklySystemReport.d.ts.map