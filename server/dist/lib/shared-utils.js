/**
 * Shared Utilities
 *
 * Common patterns extracted from routes, jobs, and services to reduce duplication.
 * These functions handle common database queries and calculations used throughout
 * the codebase.
 */
import { supabaseAdmin } from '../config/supabase.js';
import { DateTime } from 'luxon';
// ============================================================================
// Time Formatting Utilities
// ============================================================================
/**
 * Format a time difference as a human-readable string
 * Examples: "in 3 days", "in 5 hours", "in 30 minutes"
 */
export function formatTimeUntil(targetDate, fromDate) {
    const now = fromDate ?? DateTime.now().setZone('America/Los_Angeles');
    const diff = targetDate.diff(now, ['days', 'hours', 'minutes']).toObject();
    if (diff.days >= 1) {
        return `in ${Math.floor(diff.days)} day${Math.floor(diff.days) !== 1 ? 's' : ''}`;
    }
    else if (diff.hours >= 1) {
        return `in ${Math.floor(diff.hours)} hour${Math.floor(diff.hours) !== 1 ? 's' : ''}`;
    }
    else {
        return `in ${Math.floor(diff.minutes)} minute${Math.floor(diff.minutes) !== 1 ? 's' : ''}`;
    }
}
/**
 * Format a time difference as a short string (for UI badges)
 * Examples: "3d", "5h", "30m"
 */
export function formatTimeUntilShort(targetDate, fromDate) {
    const now = fromDate ?? DateTime.now().setZone('America/Los_Angeles');
    const diff = targetDate.diff(now, ['days', 'hours', 'minutes']).toObject();
    if (diff.days >= 1) {
        return `${Math.floor(diff.days)}d`;
    }
    else if (diff.hours >= 1) {
        return `${Math.floor(diff.hours)}h`;
    }
    else {
        return `${Math.floor(diff.minutes)}m`;
    }
}
/**
 * Get the currently active season
 */
export async function getActiveSeason() {
    const { data, error } = await supabaseAdmin
        .from('seasons')
        .select('id, name, number, is_active, draft_deadline, draft_order_deadline, registration_close')
        .eq('is_active', true)
        .single();
    if (error || !data) {
        return null;
    }
    return data;
}
/**
 * Get all active leagues for a season
 */
export async function getActiveLeagues(seasonId) {
    const { data, error } = await supabaseAdmin
        .from('leagues')
        .select('id, name, status, commissioner_id, co_commissioners, draft_status, season_id')
        .eq('season_id', seasonId)
        .eq('status', 'active');
    if (error || !data) {
        return [];
    }
    return data;
}
/**
 * Get the current/next episode that hasn't had picks locked yet
 */
export async function getCurrentEpisode(seasonId) {
    const now = DateTime.now().setZone('America/Los_Angeles').toISO();
    const { data, error } = await supabaseAdmin
        .from('episodes')
        .select('id, number, week_number, air_date, picks_lock_at, season_id, is_scored, results_released_at')
        .eq('season_id', seasonId)
        .gte('picks_lock_at', now)
        .order('picks_lock_at', { ascending: true })
        .limit(1)
        .single();
    if (error || !data) {
        return null;
    }
    return data;
}
/**
 * Get the most recent episode that has been scored
 */
export async function getLastScoredEpisode(seasonId) {
    const { data, error } = await supabaseAdmin
        .from('episodes')
        .select('id, number, week_number, air_date, picks_lock_at, season_id, is_scored, results_released_at')
        .eq('season_id', seasonId)
        .eq('is_scored', true)
        .order('air_date', { ascending: false })
        .limit(1)
        .single();
    if (error || !data) {
        return null;
    }
    return data;
}
// ============================================================================
// Authorization Utilities
// ============================================================================
/**
 * Check if a user is a commissioner (or co-commissioner) of a league
 */
export async function isLeagueCommissioner(leagueId, userId) {
    const { data: league, error } = await supabaseAdmin
        .from('leagues')
        .select('commissioner_id, co_commissioners')
        .eq('id', leagueId)
        .single();
    if (error || !league) {
        return false;
    }
    return (league.commissioner_id === userId ||
        (league.co_commissioners || []).includes(userId));
}
/**
 * Get league with commissioner check (returns league and authorization status)
 */
export async function getLeagueWithAuth(leagueId, userId) {
    const { data: league, error } = await supabaseAdmin
        .from('leagues')
        .select('id, name, status, commissioner_id, co_commissioners, draft_status, season_id')
        .eq('id', leagueId)
        .single();
    if (error || !league) {
        return { league: null, isCommissioner: false };
    }
    const isCommissioner = league.commissioner_id === userId ||
        (league.co_commissioners || []).includes(userId);
    return { league: league, isCommissioner };
}
/**
 * Get league members with user details
 */
export async function getLeagueMembers(leagueId) {
    const { data, error } = await supabaseAdmin
        .from('league_members')
        .select(`
      user_id,
      league_id,
      total_points,
      rank,
      users(id, display_name, email, notification_email, phone)
    `)
        .eq('league_id', leagueId);
    if (error || !data) {
        return [];
    }
    // Normalize the users field (Supabase may return array or object)
    return data.map((member) => ({
        ...member,
        users: Array.isArray(member.users) ? member.users[0] : member.users,
    }));
}
/**
 * Get users who have submitted picks for an episode
 */
export async function getUsersWithPicks(leagueId, episodeId) {
    const { data, error } = await supabaseAdmin
        .from('weekly_picks')
        .select('user_id')
        .eq('league_id', leagueId)
        .eq('episode_id', episodeId);
    if (error || !data) {
        return [];
    }
    return data.map((pick) => pick.user_id);
}
// ============================================================================
// Health Check Utilities
// ============================================================================
/**
 * Measure database latency
 */
export async function measureDbLatency() {
    const startTime = Date.now();
    await supabaseAdmin.from('users').select('id').limit(1);
    return Date.now() - startTime;
}
//# sourceMappingURL=shared-utils.js.map