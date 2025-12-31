/**
 * Auto-generate random rankings for users who haven't submitted by deadline
 * This ensures every user has rankings before the draft begins
 * Runs: After draft_order_deadline passes (Jan 5, 2026 12:00 PM PST)
 */
export declare function autoRandomizeRankings(): Promise<{
    usersProcessed: number;
    skipped: number;
}>;
export default autoRandomizeRankings;
//# sourceMappingURL=autoRandomizeRankings.d.ts.map