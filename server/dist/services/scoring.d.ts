/**
 * Scoring Service
 *
 * Business logic for scoring operations.
 * Routes handle HTTP concerns; this service handles domain logic.
 */
export interface ScoringSession {
    id: string;
    episode_id: string;
    status: string;
    created_at: string;
}
export interface StartSessionResult {
    session: ScoringSession;
    castaways: any[];
    rules: any[];
    scores: any[];
}
export interface SaveScoresInput {
    castaway_id: string;
    scoring_rule_id: string;
    quantity: number;
}
export interface ScoringStatus {
    is_complete: boolean;
    total_castaways: number;
    scored_castaways: number;
    unscored_castaway_ids: string[];
    unscored_castaway_names: string[];
    is_finalized: boolean;
}
export interface FinalizeResult {
    finalized: boolean;
    eliminated: string[];
    standings_updated: boolean;
}
export interface EpisodeScores {
    scores: any[];
    totals: Record<string, number>;
}
export interface CastawayScores {
    castaway: any;
    scores: any[];
    total: number;
}
export interface RecalculateResult {
    recalculated_leagues: number;
}
/**
 * Start or resume a scoring session
 */
export declare function startScoringSession(episodeId: string): Promise<{
    data?: StartSessionResult;
    error?: string;
    status?: number;
}>;
/**
 * Save scoring progress
 * Supports both individual score updates and bulk saves for a castaway.
 * Auto-creates scoring session if needed.
 */
export declare function saveScores(episodeId: string, userId: string, scores: SaveScoresInput[]): Promise<{
    data?: {
        saved: number;
    };
    error?: string;
    status?: number;
}>;
/**
 * Get scoring completeness status
 */
export declare function getScoringStatus(episodeId: string): Promise<{
    data?: ScoringStatus;
    error?: string;
    status?: number;
}>;
/**
 * Finalize scoring for an episode
 */
export declare function finalizeScoring(episodeId: string, userId: string): Promise<{
    data?: FinalizeResult;
    error?: string;
    status?: number;
}>;
/**
 * Get all scores for an episode
 */
export declare function getEpisodeScores(episodeId: string): Promise<{
    data?: EpisodeScores;
    error?: string;
    status?: number;
}>;
/**
 * Get a castaway's scores for an episode
 */
export declare function getCastawayScores(episodeId: string, castawayId: string): Promise<{
    data?: CastawayScores;
    error?: string;
    status?: number;
}>;
/**
 * Recalculate all standings for a season
 */
export declare function recalculateStandings(seasonId: string): Promise<{
    data?: RecalculateResult;
    error?: string;
    status?: number;
}>;
//# sourceMappingURL=scoring.d.ts.map