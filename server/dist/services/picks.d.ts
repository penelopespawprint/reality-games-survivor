/**
 * Picks Service
 *
 * Business logic for weekly pick operations.
 * Routes handle HTTP concerns; this service handles domain logic.
 */
export interface CurrentPickStatus {
    episode: {
        id: string;
        number: number;
        title: string;
        air_date: string;
        picks_lock_at: string;
    } | null;
    my_pick: {
        castaway: any;
        status: string;
        picked_at: string;
    } | null;
    deadline: string | null;
    roster: Array<{
        castaway: any;
        canPick: boolean;
    }>;
}
export interface LockPicksResult {
    locked: number;
    episodes: string[];
}
export interface AutoPickResult {
    user_id: string;
    episode_id: string;
    league_id: string;
    castaway_id: string;
}
export interface AutoFillResult {
    auto_picked: number;
    users: string[];
}
/**
 * Submit a weekly pick
 */
export declare function submitPick(leagueId: string, userId: string, castawayId: string, episodeId: string): Promise<{
    data?: {
        pick: any;
    };
    error?: string;
    status?: number;
}>;
/**
 * Get current week pick status
 */
export declare function getCurrentPickStatus(leagueId: string, userId: string): Promise<{
    data?: CurrentPickStatus;
    error?: string;
    status?: number;
}>;
/**
 * Lock all picks for past-due episodes
 */
export declare function lockPicks(): Promise<{
    data?: LockPicksResult;
    error?: string;
    status?: number;
}>;
/**
 * Auto-fill picks for users who didn't submit
 */
export declare function autoFillPicks(): Promise<{
    data?: AutoFillResult;
    error?: string;
    status?: number;
}>;
//# sourceMappingURL=picks.d.ts.map