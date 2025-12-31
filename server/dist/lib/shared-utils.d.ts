/**
 * Shared Utilities
 *
 * Common patterns extracted from routes, jobs, and services to reduce duplication.
 * These functions handle common database queries and calculations used throughout
 * the codebase.
 */
import { DateTime } from 'luxon';
/**
 * Format a time difference as a human-readable string
 * Examples: "in 3 days", "in 5 hours", "in 30 minutes"
 */
export declare function formatTimeUntil(targetDate: DateTime, fromDate?: DateTime): string;
/**
 * Format a time difference as a short string (for UI badges)
 * Examples: "3d", "5h", "30m"
 */
export declare function formatTimeUntilShort(targetDate: DateTime, fromDate?: DateTime): string;
export interface Season {
    id: string;
    name: string;
    number: number;
    is_active: boolean;
    draft_deadline?: string;
    draft_order_deadline?: string;
    registration_close?: string;
}
export interface League {
    id: string;
    name: string;
    status: string;
    commissioner_id: string;
    co_commissioners?: string[];
    draft_status?: string;
    season_id: string;
}
export interface Episode {
    id: string;
    number: number;
    week_number?: number;
    air_date: string;
    picks_lock_at?: string;
    season_id: string;
    is_scored?: boolean;
    results_released_at?: string;
}
/**
 * Get the currently active season
 */
export declare function getActiveSeason(): Promise<Season | null>;
/**
 * Get all active leagues for a season
 */
export declare function getActiveLeagues(seasonId: string): Promise<League[]>;
/**
 * Get the current/next episode that hasn't had picks locked yet
 */
export declare function getCurrentEpisode(seasonId: string): Promise<Episode | null>;
/**
 * Get the most recent episode that has been scored
 */
export declare function getLastScoredEpisode(seasonId: string): Promise<Episode | null>;
/**
 * Check if a user is a commissioner (or co-commissioner) of a league
 */
export declare function isLeagueCommissioner(leagueId: string, userId: string): Promise<boolean>;
/**
 * Get league with commissioner check (returns league and authorization status)
 */
export declare function getLeagueWithAuth(leagueId: string, userId: string): Promise<{
    league: League | null;
    isCommissioner: boolean;
}>;
export interface LeagueMemberUser {
    id: string;
    display_name: string;
    email: string;
    notification_email?: string;
    phone?: string;
}
export interface LeagueMember {
    user_id: string;
    league_id: string;
    total_points?: number;
    rank?: number;
    users?: LeagueMemberUser | LeagueMemberUser[];
}
/**
 * Get league members with user details
 */
export declare function getLeagueMembers(leagueId: string): Promise<LeagueMember[]>;
/**
 * Get users who have submitted picks for an episode
 */
export declare function getUsersWithPicks(leagueId: string, episodeId: string): Promise<string[]>;
/**
 * Measure database latency
 */
export declare function measureDbLatency(): Promise<number>;
//# sourceMappingURL=shared-utils.d.ts.map