/**
 * Weighted Rankings Service
 *
 * Implements Bayesian-weighted average ranking for cross-league leaderboards.
 * Players in multiple leagues get more confident scores; those in fewer leagues
 * are regressed toward the global mean.
 *
 * Formula: weightedScore = (rawAverage * confidence) + (globalMean * (1 - confidence))
 */
export interface WeightedRanking {
    userId: string;
    displayName: string;
    avatarUrl: string | null;
    leagueCount: number;
    rawAverage: number;
    confidence: number;
    weightedScore: number;
    scores: number[];
    totalPoints: number;
}
/**
 * Get weighted rankings for a specific season
 */
export declare function getWeightedRankings(seasonId: string): Promise<WeightedRanking[]>;
/**
 * Get confidence indicator string for display
 */
export declare function getConfidenceIndicator(leagueCount: number): string;
//# sourceMappingURL=weightedRankings.d.ts.map